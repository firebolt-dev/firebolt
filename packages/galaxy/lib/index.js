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
    getRuntime().loadRouteByUrl(href)
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

export function Router__old() {
  const ssr = useContext(RuntimeContext)
  if (ssr) {
    return <RouterServer ssr={ssr} />
  }
  return <RouterClient />
}

export function RouterServer__old({ ssr }) {
  const { Page, Loading, pageData, getPageData, location } = ssr
  if (pageData) {
    return (
      <LocationProvider value={location}>
        <Page {...pageData.props} />
      </LocationProvider>
    )
  }
  const result = use(getPageData())
  return (
    <LocationProvider value={location}>
      <Suspense fallback={<Loading />}>
        <SuspendedPage Page={Page} result={result} location={location} />
      </Suspense>
    </LocationProvider>
  )
}

function SuspendedPage({ Page, result, location }) {
  const pageData = result.read()
  const __html = `
    globalThis.$galaxy.call('initPageData', '${location.url}', ${JSON.stringify(pageData)})
  `
  return (
    <>
      {/* <script dangerouslySetInnerHTML={{ __html }} /> */}
      <Page {...pageData.props} />
    </>
  )
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

  console.log('runtime', runtime)
  console.log('route', route, params)

  const { Page, Loading, getPageData } = route

  const data = useMemo(() => {
    if (runtime.ssr && getPageData) {
      return use(getPageData())
    }
  }, [])

  return (
    <Suspense fallback={Loading && <Loading />}>
      <Route Page={Page} data={data} ssr={runtime.ssr} url={virtualUrl} />
    </Suspense>
  )
}

function Route({ Page, data, ssr, url }) {
  if (ssr) {
    const pageData = data?.()
    ssr.inserts.write(`
      <script>
        globalThis.$runtime.setPageData('${url}', ${JSON.stringify(pageData)})
      </script>
    `)
    const props = pageData?.props || {}
    return <Page {...props} />
  }
  const pageData = globalThis.$runtime.getPageData(url)
  const props = pageData?.props || {}
  return <Page {...props} />
}

//   return <Page />

//   return <div>Mellow</div>
//   // const { Page, Loading } = route
//   const [pageData, setPageData] = useState(() => {
//     return getRuntime().getPageData(virtualUrl, true)
//   })

//   useEffect(() => {
//     function onChange(e) {
//       setBrowserUrl(globalThis.location.pathname + globalThis.location.search)
//     }
//     for (const event of historyEvents) {
//       addEventListener(event, onChange)
//     }
//     return () => {
//       for (const event of historyEvents) {
//         removeEventListener(event, onChange)
//       }
//     }
//   }, [])

//   useEffect(() => {
//     if (browserUrl === virtualUrl) return
//     let cancelled
//     const exec = async () => {
//       // console.log('exec...')
//       const url = browserUrl
//       const route = getRuntime().resolveRoute(url)
//       // console.log(url, route)
//       if (!route.Page) {
//         // console.log('missing Page, loading it')
//         await getRuntime().loadRoute(route)
//       }
//       if (cancelled) {
//         // console.log('cancelled')
//         return
//       }
//       let pageData = getRuntime().getPageData(url)
//       if (pageData) {
//         // console.log('have pageData, setPageData + setVirtualUrl')
//         setPageData(pageData)
//         getRuntime().notifyMeta(pageData)
//         setVirtualUrl(url)
//         return
//       }
//       if (route.Loading) {
//         // console.log('route has loading component, setVirtualUrl')
//         setPageData(null)
//         setVirtualUrl(url)
//       }
//       // console.log('loading pageData')
//       pageData = await getRuntime().loadPageData(url)
//       // console.log('pageData', pageData)
//       if (cancelled) {
//         // console.log('cancelled')
//         return
//       }
//       // console.log('setPageData')
//       setPageData(pageData)
//       getRuntime().notifyMeta(pageData)
//       if (!route.Loading) {
//         // console.log('route has no loading component, setVirtualUrl')
//         setVirtualUrl(url)
//       }
//     }
//     exec()
//     return () => {
//       cancelled = true
//     }
//   }, [browserUrl])

//   let showLoading = Loading && !pageData

//   const location = useMemo(() => {
//     return {
//       url: virtualUrl,
//       params: params,
//     }
//   }, [virtualUrl, pageData])

//   console.log('---')
//   console.log('browser', browserUrl)
//   console.log('virtual', virtualUrl)
//   console.log('route', route)
//   console.log('pageData', pageData)
//   console.log('loading', !!Loading)

//   return (
//     <LocationProvider value={location}>
//       {showLoading ? <Loading /> : <Page {...pageData.props} />}
//     </LocationProvider>
//   )
// }

function use(promise) {
  let status = 'pending'
  let response
  const suspender = promise.then(
    res => {
      status = 'success'
      response = res
    },
    err => {
      status = 'error'
      response = err
    }
  )
  return () => {
    switch (status) {
      case 'pending':
        throw suspender
      case 'error':
        throw response
      default:
        return response
    }
  }
}
