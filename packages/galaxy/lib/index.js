import React, {
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
import { css } from '@emotion/react'

export { css }

export function Style(props) {
  return <style>{props.children.styles}</style>
}

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
    getRuntime().loadRouteByUrl(to)
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
    return getRuntime().getPageData(location.pathname + location.search, true)
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

const historyEvents = ['popstate', 'pushState', 'replaceState', 'hashchange']
export function RouterClient() {
  const [browserUrl, setBrowserUrl] = useState(globalThis.location.pathname + globalThis.location.search) // prettier-ignore
  const [virtualUrl, setVirtualUrl] = useState(browserUrl)
  const [route, params] = getRuntime().resolveRouteAndParams(virtualUrl)
  const { Page, Loading } = route
  const [pageData, setPageData] = useState(() => {
    return getRuntime().getPageData(virtualUrl, true)
  })

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
    if (browserUrl === virtualUrl) return
    let cancelled
    const exec = async () => {
      // console.log('exec...')
      const url = browserUrl
      const route = getRuntime().resolveRoute(url)
      // console.log(url, route)
      if (!route.Page) {
        // console.log('missing Page, loading it')
        await getRuntime().loadRoute(route)
      }
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      let pageData = getRuntime().getPageData(url)
      if (pageData) {
        // console.log('have pageData, setPageData + setVirtualUrl')
        setPageData(pageData)
        getRuntime().notifyMeta(pageData)
        setVirtualUrl(url)
        return
      }
      if (route.Loading) {
        // console.log('route has loading component, setVirtualUrl')
        setPageData(null)
        setVirtualUrl(url)
      }
      // console.log('loading pageData')
      pageData = await getRuntime().loadPageData(url)
      // console.log('pageData', pageData)
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      // console.log('setPageData')
      setPageData(pageData)
      getRuntime().notifyMeta(pageData)
      if (!route.Loading) {
        // console.log('route has no loading component, setVirtualUrl')
        setVirtualUrl(url)
      }
    }
    exec()
    return () => {
      cancelled = true
    }
  }, [browserUrl])

  let showLoading = Loading && !pageData

  const location = useMemo(() => {
    return {
      url: virtualUrl,
      params: params,
    }
  }, [virtualUrl, pageData])

  // console.log('---')
  // console.log('browser', browserUrl)
  // console.log('virtual', virtualUrl)
  // console.log('route', route)
  // console.log('pageData', pageData)
  // console.log('loading', !!Loading)

  return (
    <LocationProvider value={location}>
      {showLoading ? <Loading /> : <Page {...pageData.props} />}
    </LocationProvider>
  )
}
