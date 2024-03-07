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
export { css } from '@firebolt-dev/css'

import Document from '../routes/_layout.js'

const externalUrlRegex = new RegExp('^(?:[a-z]+:)?//', 'i')

export function Link({
  href,
  replace,
  scroll = true,
  prefetch = true,
  onClick,
  children,
  ...rest
}) {
  const runtime = useRuntime()

  const handleClick = useEvent(e => {
    // ignore modifier clicks
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
      return
    }

    onClick?.(e)
    if (e.defaultPrevented) return
    e.preventDefault()
    const isExternal = externalUrlRegex.test(href)
    if (isExternal) return window.open(href)
    if (replace) {
      history.replaceState(null, '', href)
    } else {
      history.pushState(null, '', href)
    }
    if (scroll) {
      window.scrollTo(0, 0)
    }
  })

  useEffect(() => {
    if (!href) return
    if (!prefetch) return
    runtime.loadPageByUrl(href)
  }, [prefetch])

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
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

const RouteContext = createContext()

function RouteProvider({ value, children }) {
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
}

export function useRoute() {
  const route = useContext(RouteContext)
  return route
}

const historyEvents = ['popstate', 'pushState', 'replaceState', 'hashchange']

function getBrowserUrl() {
  const location = globalThis.location
  return location.pathname + location.search + location.hash
}

export function Router() {
  const runtime = useRuntime()
  const [previousRoute, setPreviousRoute] = useState(null)
  const [currentRoute, setCurrentRoute] = useState(() => runtime.resolveRoute(runtime.ssr?.url || getBrowserUrl())) // prettier-ignore

  useEffect(() => {
    function onChange(e) {
      const browserUrl = getBrowserUrl() // prettier-ignore
      if (browserUrl === currentRoute.url) return
      let cancelled
      const exec = async () => {
        const route = runtime.resolveRoute(browserUrl)
        if (!route.page.content) {
          try {
            await runtime.loadPage(route.page)
          } catch (err) {
            // if loadPage fails to import a page module
            // its likely that there is a new build/version of that page.
            // in this case, we do a full page redirect to the new url.
            window.location.href = browserUrl
            return
          }
        }
        if (cancelled) return
        setPreviousRoute(currentRoute)
        setCurrentRoute(route)
      }
      exec()
      return () => {
        cancelled = true
      }
    }
    for (const event of historyEvents) {
      addEventListener(event, onChange)
    }
    return () => {
      for (const event of historyEvents) {
        removeEventListener(event, onChange)
      }
    }
  }, [currentRoute.url])

  // we work some magic here because if the new route doesn't have its own
  // suspense, we want to continue showing the previous route until its ready
  let fallback
  if (previousRoute) {
    fallback = <Route route={previousRoute} />
  }

  return (
    <Suspense fallback={fallback}>
      <Route route={currentRoute} />
    </Suspense>
  )
}

function Route({ route }) {
  // NOTE:
  // - pathname is used as a key for the page, and not layouts.
  // - keys ensure that eg going from /foo/1 to /foo/2 fully re-mounts the page.
  // - search params are excluded from the key to allow soft updates (no re-mounts).
  const key = route.pathname
  return <RouteProvider value={route}>{route.page.content(key)}</RouteProvider>
}

function useForceUpdate() {
  const [n, setN] = useState(0)
  return useMemo(() => {
    return () => setN(n => n + 1)
  }, [])
}

export function useLoader(id, ...args) {
  const forceUpdate = useForceUpdate()
  const runtime = useRuntime()
  const loader = runtime.getLoader(id, args)
  useEffect(() => {
    return loader.observe(forceUpdate)
  }, [])
  return loader
}

export function useAction(id, ...primedArgs) {
  const runtime = useRuntime()
  const action = runtime.getAction(id)
  return (...args) => action(...primedArgs, ...args)
}

export function useCache() {
  const runtime = useRuntime()
  return runtime.getCache()
}

export function useCookie(key, defaultValue = null) {
  const runtime = useRuntime()
  const [value, setValue] = useState(() => {
    return runtime.getCookie(key) ?? defaultValue
  })
  const update = useMemo(() => {
    return (value, options) => {
      return runtime.setCookie(key, value, options, defaultValue)
    }
  })
  useEffect(() => {
    return runtime.observeCookie(key, setValue)
  }, [])
  return [value ?? defaultValue, update]
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, errorInfo) {
    // console.log({ error, errorInfo })
  }
  render() {
    if (this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error)
      }
      if (isValidElement(this.props.fallback)) {
        return cloneElement(this.props.fallback, this.state.error)
      }
      return this.props.fallback
    }
    return this.props.children
  }
}

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

const MDXContext = createContext()

export function MDXProvider({ components, children }) {
  return (
    <MDXContext.Provider value={components}>{children}</MDXContext.Provider>
  )
}

export function useMDXComponents() {
  return useContext(MDXContext)
}

export function MDXWrapper({ component: Component }) {
  const components = useMDXComponents()
  return <Component components={components} />
}
