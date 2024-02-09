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
  useId,
} from 'react'
import { css } from '@emotion/react'
import { matcher } from './matcher'

export { css }

export const mergeChildSets = sets => {
  const flattened = []
  for (const set of sets) {
    flattened.push(...Children.toArray(set))
  }
  const merged = []
  flattened.forEach(elem => {
    if (elem.key && elem.key.startsWith('.$')) {
      const idx = merged.findIndex(c => c.key === elem.key)
      if (idx !== -1) {
        merged[idx] = elem
      } else {
        merged.push(elem)
      }
    } else {
      merged.push(elem)
    }
  })
  return merged
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
  const runtime = useContext(RuntimeContext)
  // server renders empty head and registers children to be inserted on first flush
  if (runtime.ssr) {
    runtime.insertHeadMain(children)
    return <head />
  }
  // client first renders server provided head to match and then subscribes to changes
  const [tags, setTags] = useState(() => runtime.getHeadTags())
  useEffect(() => {
    return runtime.onHeadTags(tags => {
      setTags(tags)
    })
  }, [])
  if (!globalThis.__fireboldHeadHydrated) {
    globalThis.__fireboldHeadHydrated = true
    return (
      <head dangerouslySetInnerHTML={{ __html: document.head.innerHTML }} />
    )
  }
  return (
    <head>
      {mergeChildSets(tags)}
      {children}
    </head>
  )
}

export function Meta({ children }) {
  const runtime = useContext(RuntimeContext)
  // server inserts immediately for injection
  if (runtime.ssr) {
    runtime.insertHeadTags(children)
  }
  // client inserts on mount (post hydration)
  useLayoutEffect(() => {
    return runtime.insertHeadTags(children)
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

const match = matcher()

function resolveRouteAndParams(routes, url) {
  for (const route of routes) {
    const [hit, params] = match(route.pattern, url)
    if (hit) return [route, params]
  }
}

export function Router() {
  const runtime = useContext(RuntimeContext)
  const [browserUrl, setBrowserUrl] = useState(runtime.ssr?.url || globalThis.location.pathname + globalThis.location.search) // prettier-ignore
  const [currentUrl, setCurrentUrl] = useState(browserUrl)
  const [route, params] = resolveRouteAndParams(runtime.routes, currentUrl)
  const { Page } = route

  useEffect(() => {
    function onChange(e) {
      setBrowserUrl(globalThis.location.pathname + globalThis.location.search)
    }
    for (const event of historyEvents) {
      addEventListener(event, onChange)
    }
    return () => {
      for (const event of historyEvents) {
        removeEventListener(event, onChange)
      }
    }
  }, [])

  useEffect(() => {
    if (browserUrl === currentUrl) return
    let cancelled
    const exec = async () => {
      const url = browserUrl
      console.log('browserUrl changed:', url)
      const route = runtime.resolveRoute(url)
      console.log('route', route)
      if (!route.Page) {
        console.log('missing Page, loading it')
        await runtime.loadRoute(route)
      }
      if (cancelled) {
        console.log('cancelled')
        return
      }
      setCurrentUrl(url)
    }
    exec()
    return () => {
      cancelled = true
    }
  }, [browserUrl])

  const location = useMemo(() => {
    return {
      routeId: route.id,
      url: currentUrl,
      params,
    }
  }, [currentUrl])

  // console.log('-')
  // console.log('browserUrl', browserUrl)
  // console.log('currentUrl', currentUrl)
  // console.log('runtime', runtime)
  // console.log('route', route, params)
  // console.log('-')

  // todo: remove Loading components now

  return (
    <LocationProvider value={location}>
      <Suspense /*fallback={<div>Loading temp...</div>}*/>
        <Page />
      </Suspense>
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
  const { routeId } = useLocation()
  const forceUpdate = useForceUpdate()
  const runtime = useContext(RuntimeContext)
  const loader = runtime.getLoader(routeId, args)
  useEffect(() => {
    return runtime.watchLoader(loader, forceUpdate)
  }, [])
  return loader
}

export function useAction(fnName) {
  const { routeId } = useLocation()
  const runtime = useContext(RuntimeContext)
  const action = runtime.getAction(routeId, fnName)
  return action
}

export function useCache() {
  const runtime = useContext(RuntimeContext)
  return runtime.getCache()
}
