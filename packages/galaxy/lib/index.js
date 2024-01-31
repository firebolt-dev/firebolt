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

const g = () => window.$galaxy

export function Link(props) {
  const { to, href = to, replace, onClick, children } = props

  const jsx = isValidElement(children) ? children : <a {...props} />

  const handleClick = useEvent(event => {
    // ignores the navigation when clicked using right mouse button or
    // by holding a special modifier key: ctrl, command, win, alt, shift
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return

    onClick?.(event)
    if (!event.defaultPrevented) {
      event.preventDefault()
      console.log('to', to)
      if (replace) {
        history.replaceState(null, '', href)
      } else {
        history.pushState(null, '', href)
      }
    }
  })

  const extraProps = {
    to: null,
    onClick: handleClick,
  }

  useEffect(() => {
    g().loadRouteByPath(to)
  }, [])

  return cloneElement(jsx, extraProps)
}

const SSRContext = createContext()

export function Meta() {
  const ssr = useContext(SSRContext)
  const [metadata, setMetadata] = useState(() => {
    // server provides metadata via context
    if (ssr) return ssr.metadata
    // client must source it from the store
    return g().getMetadata(location.pathname, true)
  })

  useEffect(() => {
    // subscribe to metadata changes
    return g().onMeta(metadata => {
      setMetadata(metadata)
    })
  }, [])

  console.log('<Meta>', metadata)

  return (
    <>
      {metadata?.title && <title>{metadata.title}</title>}
      {metadata?.meta?.map((item, idx) => (
        <meta
          key={item.key || idx}
          name={item.name}
          property={item.property}
          content={item.content}
        />
      ))}
    </>
  )
}

export function SSRProvider({ value, children }) {
  return <SSRContext.Provider value={value}>{children}</SSRContext.Provider>
}

// Userland polyfill while we wait for the forthcoming
// https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md
// Note: "A high-fidelity polyfill for useEvent is not possible because
// there is no lifecycle or Hook in React that we can use to switch
// .current at the right timing."
// So we will have to make do with this "close enough" approach for now.
// ---
// Per Dan Abramov: useInsertionEffect executes marginally closer to the
// correct timing for ref synchronization than useLayoutEffect on React 18.
// See: https://github.com/facebook/react/pull/25881#issuecomment-1356244360
// ---
// Borrowed from wouter: https://github.com/molefrog/wouter/blob/main/react-deps.js
const useEvent = fn => {
  const ref = useRef([fn, (...args) => ref[0](...args)]).current
  useInsertionEffect(() => {
    ref[0] = fn
  })
  return ref[1]
}

// monkey-patch history push/replace to dispatch events!
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
  const [browserPath, setBrowserPath] = useState(location.pathname)
  const [virtualPath, setVirtualPath] = useState(browserPath)
  const [route, params] = g().resolveRouteAndParams(virtualPath)
  const { Page, Shell } = route
  const [metadata, setMetadata] = useState(() => g().getMetadata(virtualPath))

  useEffect(() => {
    function onChange(e) {
      setBrowserPath(location.pathname)
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
      const route = g().resolveRoute(path)
      // console.log(path, route)
      if (!route.Page) {
        // console.log('missing Page, loading it')
        await g().loadRoute(route)
      }
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      let metadata = g().getMetadata(path)
      if (metadata) {
        // console.log('have metadata, setMetadata + setVirtualPath')
        setMetadata(metadata)
        g().notifyMeta(metadata)
        setVirtualPath(path)
        return
      }
      if (route.Shell) {
        // console.log('route has shell, setVirtualPath')
        setMetadata(null)
        setVirtualPath(path)
      }
      // console.log('loading metadata')
      metadata = await g().loadMetadata(path)
      // console.log('metadata', metadata)
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      // console.log('setMetadata')
      setMetadata(metadata)
      g().notifyMeta(metadata)
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

  let showShell = Shell && !metadata

  // wtf
  const locationApi = useMemo(() => {
    return {
      pathname: virtualPath,
      params,
    }
  }, [virtualPath, metadata])

  console.log('---')
  console.log('browser', browserPath)
  console.log('virtual', virtualPath)
  console.log('route', route)
  console.log('metadata', metadata)
  console.log('shell', !!Shell)

  return (
    <LocationProvider value={locationApi}>
      {showShell ? <Shell /> : <Page {...metadata.props} />}
    </LocationProvider>
  )
}
