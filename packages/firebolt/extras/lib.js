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
export { css } from '@firebolt/css'

import { Document } from '../components/Document.js'

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
  const elem = isValidElement(children) ? (
    children
  ) : (
    <a href={href} children={children} {...rest} />
  )

  const handleClick = useEvent(e => {
    // ignore modifier clicks
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
      return
    }
    if (e.defaultPrevented) return
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
    runtime.loadRouteByUrl(href)
  }, [prefetch])

  // return children
  return cloneElement(elem, { href, onClick: handleClick })
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

function getBrowserUrl() {
  const location = globalThis.location
  return location.pathname + location.search + location.hash
}

export function Router() {
  const runtime = useRuntime()
  const [previousLocation, setPreviousLocation] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(() => runtime.resolveLocation(runtime.ssr?.url || getBrowserUrl())) // prettier-ignore

  useEffect(() => {
    function onChange(e) {
      const browserUrl = getBrowserUrl() // prettier-ignore
      if (browserUrl === currentLocation.url) return
      let cancelled
      const exec = async () => {
        const location = runtime.resolveLocation(browserUrl)
        if (!location.route.content) {
          await runtime.loadRoute(location.route)
        }
        if (cancelled) return
        setPreviousLocation(currentLocation)
        setCurrentLocation(location)
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
  }, [currentLocation.url])

  // we work some magic here because if the new route doesn't have its own
  // suspense, we want to continue showing the previous route until its ready
  let fallback
  if (previousLocation) {
    fallback = <Route location={previousLocation} />
  }

  return (
    <Suspense fallback={fallback}>
      <Route location={currentLocation} />
    </Suspense>
  )
}

function Route({ location }) {
  return (
    <LocationProvider value={location}>
      {location.route.content}
    </LocationProvider>
  )
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
  const [value, setValue] = useState(() => {
    return runtime.getCookie(key) ?? defaultValue
  })
  const update = useMemo(() => {
    return (value, options) => {
      return runtime.setCookie(key, value, options, defaultValue)
    }
  })
  useEffect(() => {
    return runtime.watchCookie(key, setValue)
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
