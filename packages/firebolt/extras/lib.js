import React, {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  useRef,
  useInsertionEffect,
  useMemo,
  Suspense,
  useLayoutEffect,
} from 'react'
import { css } from '@emotion/react'

export { css }

export const mergeHeadGroups = (...groups) => {
  const flattened = []
  for (const children of groups) {
    flattened.push(...Children.toArray(children))
  }
  const merged = []
  flattened.forEach(child => {
    if (child.key && child.key.startsWith('.$')) {
      const idx = merged.findIndex(c => c.key === child.key)
      if (idx !== -1) {
        merged[idx] = child
      } else {
        merged.push(child)
      }
    } else {
      merged.push(child)
    }
  })
  return merged.map((child, idx) => cloneElement(child, { key: `.$fb${idx}` }))
}

export function Style(props) {
  return <style>{props.children.styles}</style>
}

export function Link(props) {
  const { to, href = to, replace, onClick, children } = props

  const runtime = useContext(RuntimeContext)

  const jsx = isValidElement(children) ? children : <a {...props} />

  const handleClick = useEvent(e => {
    // ignore modifier clicks
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
      return
    }
    onClick?.(e)
    if (e.defaultPrevented) return
    e.preventDefault()
    if (replace) {
      history.replaceState(null, '', href)
    } else {
      history.pushState(null, '', href)
    }
  })

  const extraProps = {
    to: null,
    onClick: handleClick,
  }

  useEffect(() => {
    // prefetch routes
    runtime.loadRouteByUrl(href)
  }, [])

  return cloneElement(jsx, extraProps)
}

const RuntimeContext = createContext()

export function Head({ children }) {
  const location = useLocation()
  // if location is defined then we are a child of the router
  if (location) return <PageHead>{children}</PageHead>
  // otherwise we must be the document head
  return <DocHead>{children}</DocHead>
}

function DocHead({ children }) {
  const runtime = useContext(RuntimeContext)
  // server renders empty head and registers children to be inserted on first flush
  if (runtime.ssr) {
    runtime.insertDocHead(children)
    return <head />
  }
  // client first renders server provided head to match and then subscribes to changes
  const [pageHeads, setPageHeads] = useState(() => runtime.getPageHeads())
  useEffect(() => {
    return runtime.watchPageHeads(pageHeads => {
      setPageHeads(pageHeads)
    })
  }, [])
  if (!globalThis.__fireboldHeadHydrated) {
    globalThis.__fireboldHeadHydrated = true
    return (
      <head dangerouslySetInnerHTML={{ __html: document.head.innerHTML }} />
    )
  }
  const tags = mergeHeadGroups(children, ...pageHeads)
  return <head>{tags}</head>
}

function PageHead({ children }) {
  const runtime = useContext(RuntimeContext)
  // server inserts immediately for injection
  if (runtime.ssr) {
    runtime.insertPageHead(children)
  }
  // client inserts on mount (post hydration)
  useLayoutEffect(() => {
    return runtime.insertPageHead(children)
  }, [children])
}

export function RuntimeProvider({ data, children }) {
  return (
    <RuntimeContext.Provider value={data}>{children}</RuntimeContext.Provider>
  )
}

// ponyfill until react releases this
// borrowed from https://github.com/molefrog/wouter/blob/main/react-deps.js
const useEvent = fn => {
  const ref = useRef([fn, (...args) => ref[0](...args)]).current
  useInsertionEffect(() => {
    ref[0] = fn
  })
  return ref[1]
}

// monkey patch history push/replace to dispatch events!
if (globalThis.history) {
  for (const type of ['pushState', 'replaceState']) {
    const original = history[type]
    history[type] = function () {
      const result = original.apply(this, arguments)
      const event = new Event(type)
      event.arguments = arguments
      dispatchEvent(event)
      return result
    }
  }
}

const LocationContext = createContext()

function LocationProvider({ value, children }) {
  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  return useContext(LocationContext)
}

const historyEvents = ['popstate', 'pushState', 'replaceState', 'hashchange']

function useRouteWithParams(url) {
  const runtime = useContext(RuntimeContext)
  return useMemo(() => runtime.resolveRouteWithParams(url), [url])
}

export function Router() {
  const runtime = useContext(RuntimeContext)
  // const [browserUrl, setBrowserUrl] = useState(runtime.ssr?.url || globalThis.location.pathname + globalThis.location.search) // prettier-ignore
  const [prevUrl, setPrevUrl] = useState(null)
  const [currUrl, setCurrUrl] = useState(() => runtime.ssr?.url || globalThis.location.pathname + globalThis.location.search) // prettier-ignore
  const [currRoute, currParams] = useRouteWithParams(currUrl)
  const [prevRoute, prevParams] = useRouteWithParams(prevUrl)

  useEffect(() => {
    function onChange(e) {
      const browserUrl = globalThis.location.pathname + globalThis.location.search // prettier-ignore
      if (browserUrl === currUrl) return
      let cancelled
      const exec = async () => {
        const url = browserUrl
        // console.log('browserUrl changed:', url)
        const route = runtime.resolveRoute(url)
        // console.log('route', route)
        if (!route.Page) {
          // console.log('missing Page, loading it')
          await runtime.loadRoute(route)
        }
        if (cancelled) {
          // console.log('cancelled')
          return
        }
        setPrevUrl(currUrl)
        setCurrUrl(url)
      }
      exec()
      return () => {
        cancelled = true
      }
      // setBrowserUrl(globalThis.location.pathname + globalThis.location.search)
    }
    for (const event of historyEvents) {
      addEventListener(event, onChange)
    }
    return () => {
      for (const event of historyEvents) {
        removeEventListener(event, onChange)
      }
    }
  }, [currUrl])

  // we work some magic here because if the new route doesn't have its own
  // suspense, we want to continue showing the previous route until its ready
  let fallback
  if (prevUrl) {
    fallback = (
      <Route
        key={prevUrl}
        url={prevUrl}
        route={prevRoute}
        params={prevParams}
      />
    )
  }

  return (
    <Suspense fallback={fallback}>
      <Route
        key={currUrl}
        url={currUrl}
        route={currRoute}
        params={currParams}
      />
    </Suspense>
  )
}

function Route({ url, route, params }) {
  const { Page } = route
  const location = useMemo(() => {
    return {
      routeId: route.id,
      url,
      params,
      push(href) {
        history.pushState(null, '', href)
      },
      replace(href) {
        history.replaceState(null, '', href)
      },
    }
  }, [])
  return (
    <LocationProvider value={location}>
      <Page />
    </LocationProvider>
  )
}

function useForceUpdate() {
  const [n, setN] = useState(0)
  return useMemo(() => {
    return () => setN(n => n + 1)
  }, [])
}

export function useData(...args) {
  const forceUpdate = useForceUpdate()
  const location = useLocation()
  const runtime = useContext(RuntimeContext)
  const loader = runtime.getLoader(location.routeId, args)
  useEffect(() => {
    return loader.watch(forceUpdate)
  }, [])
  return loader
}

export function useAction(fnName) {
  const location = useLocation()
  const runtime = useContext(RuntimeContext)
  const action = runtime.getAction(location.routeId, fnName)
  return action
}

export function useCache() {
  const runtime = useContext(RuntimeContext)
  return runtime.getCache()
}

// export function ErrorBoundary() {

// }
// export class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false };
//   }

//   static getDerivedStateFromError(error) {
//     // Update state so the next render will show the fallback UI.
//     return { hasError: true };
//   }

//   componentDidCatch(error, info) {
//     // Example "componentStack":
//     //   in ComponentThatThrows (created by App)
//     //   in ErrorBoundary (created by App)
//     //   in div (created by App)
//     //   in App
//     logErrorToMyService(error, info.componentStack);
//   }

//   render() {
//     if (this.state.hasError) {
//       // You can render any custom fallback UI
//       return this.props.fallback;
//     }

//     return this.props.children;
//   }
// }
