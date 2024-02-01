import {
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  cloneElement,
  useRef,
  useInsertionEffect,
  useMemo,
} from 'react'
export { css } from '@emotion/react'

const getRuntime = () => globalThis.$galaxy

export function Link(props) {
  const { to, href = to, replace, onClick, children } = props

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
    // prefetch
    getRuntime().loadRouteByPath(to)
  }, [])

  return cloneElement(jsx, extraProps)
}

const SSRContext = createContext()

export function Meta() {
  const ssr = useContext(SSRContext)
  const [pageData, setPageData] = useState(() => {
    // server provides initial pageData via context
    if (ssr) return ssr.pageData
    // client sources initial pageData from runtime
    return getRuntime().getPageData(location.pathname, true)
  })

  useEffect(() => {
    // subscribe to pageData changes
    return getRuntime().onMeta(pageData => {
      setPageData(pageData)
    })
  }, [])

  return (
    <>
      {pageData?.title && <title>{pageData.title}</title>}
      {pageData?.meta?.map((meta, idx) => (
        <meta
          key={meta.key || idx}
          name={meta.name}
          property={meta.property}
          content={meta.content}
        />
      ))}
    </>
  )
}

export function SSRProvider({ value, children }) {
  return <SSRContext.Provider value={value}>{children}</SSRContext.Provider>
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

export function Router() {
  const ssr = useContext(SSRContext)
  if (ssr) {
    return <RouterServer ssr={ssr} />
  }
  return <RouterClient />
}

export function RouterServer({ ssr }) {
  const { Page, props, location } = ssr
  return (
    <LocationProvider value={location}>
      <Page {...props} />
    </LocationProvider>
  )
}

export function RouterClient() {
  const [browserPath, setBrowserPath] = useState(globalThis.location.pathname)
  const [virtualPath, setVirtualPath] = useState(browserPath)
  const [route, params] = getRuntime().resolveRouteAndParams(virtualPath)
  const { Page, Shell } = route
  const [pageData, setPageData] = useState(() => {
    return getRuntime().getPageData(virtualPath, true)
  })

  useEffect(() => {
    function onChange(e) {
      setBrowserPath(globalThis.location.pathname)
    }
    const events = ['popstate', 'pushState', 'replaceState', 'hashchange']
    for (const event of events) {
      addEventListener(event, onChange)
    }
    return () => {
      for (const event of events) {
        removeEventListener(event, onChange)
      }
    }
  }, [])

  useEffect(() => {
    if (browserPath === virtualPath) return
    let cancelled
    const exec = async () => {
      // console.log('exec...')
      const path = browserPath
      const route = getRuntime().resolveRoute(path)
      // console.log(path, route)
      if (!route.Page) {
        // console.log('missing Page, loading it')
        await getRuntime().loadRoute(route)
      }
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      let pageData = getRuntime().getPageData(path)
      if (pageData) {
        // console.log('have pageData, setPageData + setVirtualPath')
        setPageData(pageData)
        getRuntime().notifyMeta(pageData)
        setVirtualPath(path)
        return
      }
      if (route.Shell) {
        // console.log('route has shell, setVirtualPath')
        setPageData(null)
        setVirtualPath(path)
      }
      // console.log('loading pageData')
      pageData = await getRuntime().loadPageData(path)
      // console.log('pageData', pageData)
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      // console.log('setPageData')
      setPageData(pageData)
      getRuntime().notifyMeta(pageData)
      if (!route.Shell) {
        // console.log('route has no Shell, setVirtualPath')
        setVirtualPath(path)
      }
    }
    exec()
    return () => {
      cancelled = true
    }
  }, [browserPath])

  let showShell = Shell && !pageData

  const location = useMemo(() => {
    return {
      pathname: virtualPath,
      params,
    }
  }, [virtualPath, pageData])

  // console.log('---')
  // console.log('browser', browserPath)
  // console.log('virtual', virtualPath)
  // console.log('route', route)
  // console.log('pageData', pageData)
  // console.log('shell', !!Shell)

  return (
    <LocationProvider value={location}>
      {showShell ? <Shell /> : <Page {...pageData.props} />}
    </LocationProvider>
  )
}
