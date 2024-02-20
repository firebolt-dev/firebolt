import React, {
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
} from 'react'
export { css } from 'firebolt-css'

import { Document } from '../document.js'

export function Link({ to, replace, onClick, children, ...rest }) {
  const runtime = useRuntime()
  const elem = isValidElement(children) ? (
    children
  ) : (
    <a href={to} children={children} {...rest} />
  )
  const handleClick = useEvent(e => {
    // ignore modifier clicks
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
      return
    }
    onClick?.(e)
    if (e.defaultPrevented) return
    e.preventDefault()
    if (replace) {
      history.replaceState(null, '', to)
    } else {
      history.pushState(null, '', to)
    }
  })
  useEffect(() => {
    if (!to) return
    // prefetch routes
    runtime.loadRouteByUrl(to)
  }, [])
  // return children
  return cloneElement(elem, { href: to, onClick: handleClick })
}

const RuntimeContext = createContext()

function useRuntime() {
  const runtime = useContext(RuntimeContext)
  return runtime
}

export function RuntimeProvider({ runtime, children }) {
  return (
    <RuntimeContext.Provider value={runtime}>
      {children}
    </RuntimeContext.Provider>
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
  const location = useContext(LocationContext)
  return location
}

const historyEvents = ['popstate', 'pushState', 'replaceState', 'hashchange']

function useRouteWithParams(url) {
  const runtime = useRuntime()
  return useMemo(() => runtime.resolveRouteWithParams(url), [url])
}

export function Router() {
  const runtime = useRuntime()
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

export function useData(id, ...args) {
  const forceUpdate = useForceUpdate()
  const runtime = useRuntime()
  const loader = runtime.getLoader(id, args)
  useEffect(() => {
    return loader.watch(forceUpdate)
  }, [])
  return loader
}

export function useAction(id) {
  const runtime = useRuntime()
  const action = runtime.getAction(id)
  return action
}

export function useCache() {
  const runtime = useRuntime()
  return runtime.getCache()
}

export function useCookie(key, defaultValue = null) {
  const runtime = useRuntime()
  const [value, setValue] = useState(() => runtime.getCookie(key))
  const update = useMemo(() => {
    return (value, options) => runtime.setCookie(key, value, options)
  })
  useEffect(() => {
    return runtime.watchCookie(key, setValue)
  }, [])
  return [value || defaultValue, update]
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

export function Root({ runtime }) {
  return (
    <RuntimeProvider runtime={runtime}>
      <Document>
        <Router />
      </Document>
    </RuntimeProvider>
  )
}

export function cls(...args) {
  let str = ''
  for (const arg of args) {
    if (typeof arg === 'string') {
      str += ' ' + arg
    } else if (typeof arg === 'object') {
      for (const key in arg) {
        const value = arg[key]
        if (value) str += ' ' + key
      }
    }
  }
  return str
}
