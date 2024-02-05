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
  Suspense,
} from 'react'
import { css } from '@emotion/react'
import { matcher } from './matcher'

export { css }

export function Style(props) {
  return <style>{props.children.styles}</style>
}

const getRuntime = () => globalThis.$galaxy

export function Link(props) {
  const runtime = useContext(RuntimeContext)
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
    runtime.loadRouteByUrl(href)
  }, [])

  return cloneElement(jsx, extraProps)
}

const RuntimeContext = createContext()

export function Meta() {
  const runtime = useContext(RuntimeContext)
  const [pageData, setPageData] = useState(() => {
    // TODO: work with runtime
    return {}
    // server provides initial pageData via context
    if (runtime.ssr) runtime.ssr.pageData
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
  const [virtualUrl, setVirtualUrl] = useState(browserUrl)
  const [route, params] = resolveRouteAndParams(runtime.routes, virtualUrl)
  const { Page, Loading, getPageData } = route

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
      // console.log('browserUrl changed:', url)
      const url = browserUrl
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
      let pageData = runtime.getPageData(url, true)
      const noPageData = !pageData || pageData.shouldExpire
      if (!route.Loading && noPageData) {
        // console.log('no Loading or pageData... prefetching pageData')
        pageData = await runtime.fetchPageData(url)
        // console.log('prefetched', pageData)
      }
      setVirtualUrl(url)
    }
    exec()
    return () => {
      cancelled = true
    }
  }, [browserUrl])

  const data = useMemo(() => {
    if (runtime.ssr) {
      if (getPageData) {
        return resource(getPageData())
      } else {
        return resource({})
      }
    } else {
      const data = runtime.getPageData(virtualUrl)
      console.log('data', data)
      if (data) {
        return resource(data)
      } else {
        return resource(runtime.fetchPageData(virtualUrl))
      }
    }
  }, [virtualUrl])

  const location = useMemo(() => {
    return {
      url: virtualUrl,
      params,
    }
  }, [virtualUrl, params])

  // console.log('-')
  // console.log('browserUrl', browserUrl)
  // console.log('virtualUrl', virtualUrl)
  // console.log('runtime', runtime)
  // console.log('route', route, params)
  // console.log('-')

  return (
    <LocationProvider value={location}>
      <Suspense fallback={Loading && <Loading />}>
        <Route Page={Page} data={data} ssr={runtime.ssr} url={virtualUrl} />
      </Suspense>
    </LocationProvider>
  )
}

function Route({ Page, data, ssr, url }) {
  const pageData = data?.()
  // console.log('pageData', pageData)
  if (ssr) {
    ssr.inserts.write(`
      <script>
        globalThis.$galaxy.push('setPageData', '${url}', ${JSON.stringify(pageData)})
      </script>
    `)
  }
  return <Page {...pageData.props} />
}

function resource(dataOrPromise) {
  let value
  let status
  let promise
  if (dataOrPromise instanceof Promise) {
    value = null
    status = 'pending'
    promise = dataOrPromise.then(
      resp => {
        status = 'success'
        value = resp
      },
      err => {
        status = 'error'
        value = err
      }
    )
  } else {
    value = dataOrPromise
    status = 'success'
    promise = null
  }
  return () => {
    if (status === 'success') return value
    if (status === 'pending') throw promise
    if (status === 'error') throw value
  }
}
