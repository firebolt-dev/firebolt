import { hydrateRoot } from 'react-dom/client'
import {
  useState,
  useEffect,
  useLayoutEffect,
  createContext,
  useMemo,
} from 'react'

import { Document } from '../document.js'

import makeMatcher from './matcher.js'

const galaxy = stack => {
  const match = makeMatcher()
  const routes = []
  const routesById = {}
  const metadataByPath = {}
  const metadataLoaders = {} // [path]: Promise
  function init({ routes: _routes, path, metadata }) {
    routes.length = 0
    routes.push(..._routes)
    for (const route of routes) {
      routesById[route.id] = route
    }
    setMetadata(path, metadata, true)
  }
  function registerPage(routeId, Page) {
    const route = routesById[routeId]
    if (!route) return console.error('TODO: handle')
    route.Page = Page
  }
  function registerShell(routeId, Shell) {
    const route = routesById[routeId]
    if (!route) return console.error('TODO: handle')
    route.Shell = Shell
  }
  const actions = {
    init,
    registerPage,
    registerShell,
  }
  function call(action, ...args) {
    actions[action](...args)
  }
  for (const item of stack) {
    call(item.action, ...item.args)
  }
  function getPage(routeId) {
    return routesById[routeId].Page
  }
  function setMetadata(path, metadata, force) {
    if (metadata.expire === 0 && !force) {
      // expire immediately (dont store it)
      return
    } else if (metadata.expire > 0) {
      // expire in X seconds
      metadata.expireTime = new Date().getTime() + metadata.expire * 1000
    } else {
      // never expire
      metadata.expireTime = 'never'
    }
    // console.log('setMetadata', metadata)
    metadataByPath[path] = metadata
  }
  function getMetadata(path, skipExpiry) {
    let metadata = metadataByPath[path]
    if (!metadata) return null
    if (skipExpiry) return metadata
    if (metadata.expireTime === 'never') {
      return metadata
    } else if (metadata.expireTime === 'once') {
      delete metadataByPath[path]
      return metadata
    } else {
      const expired = new Date().getTime() >= metadata.expireTime
      if (expired) {
        delete metadataByPath[path]
        return null
      }
      return metadata
    }
  }
  function resolveRoute(path) {
    return routes.find(route => match(route.path, path)[0])
  }
  function resolveRouteAndParams(path) {
    for (const route of routes) {
      const [hit, params] = match(route.path, path)
      if (hit) return [route, params]
    }
    return []
  }

  async function loadRoute(route) {
    if (!route) return
    if (route.Page) return
    if (route.loader) return route.loader
    route.loader = import(route.file)
    await route.loader
  }
  function loadRouteById(routeId) {
    const route = routesById[routeId]
    return loadRoute(route)
  }
  function loadRouteByPath(path) {
    const route = resolveRoute(path)
    return loadRoute(route)
  }
  function loadMetadata(path) {
    if (metadataLoaders[path]) return metadataLoaders[path]
    const promise = new Promise(async resolve => {
      // if route has no getMetadata() then resolve with empty metadata
      const route = resolveRoute(path)
      if (!route.hasMetadata) return resolve({})
      // otherwise fetch it
      const resp = await fetch(`/_galaxy/metadata?path=${path}`)
      const metadata = await resp.json()
      setMetadata(path, metadata)
      resolve(metadata)
      delete metadataLoaders[path]
    })
    metadataLoaders[path] = promise
    return promise
  }
  let metaListeners = new Set()
  function onMeta(callback) {
    metaListeners.add(callback)
    return () => metaListeners.delete(callback)
  }
  function notifyMeta(metadata) {
    for (const callback of metaListeners) {
      callback(metadata)
    }
  }
  return {
    call,
    getPage,
    getMetadata,
    routes,
    resolveRoute,
    resolveRouteAndParams,
    loadRoute,
    loadRouteById,
    loadRouteByPath,
    loadMetadata,
    onMeta,
    notifyMeta,
  }
}
const g = galaxy(window.$galaxy.stack)
window.$galaxy = g

const root = hydrateRoot(document, <Root />)

function Root() {
  return (
    <Document>
      <Router />
    </Document>
  )
}

// monkey-patch history push/replace to dispatch events!
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

// const LocationContext = createContext()
// g.LocationContext = LocationContext

// function LocationProvider({ value, children }) {
//   return (
//     <LocationContext.Provider value={value}>
//       {children}
//     </LocationContext.Provider>
//   )
// }

function Router() {
  const [browserPath, setBrowserPath] = useState(location.pathname)
  const [virtualPath, setVirtualPath] = useState(browserPath)
  const [route, params] = g.resolveRouteAndParams(virtualPath)
  const { Page, Shell } = route
  const [metadata, setMetadata] = useState(() => g.getMetadata(virtualPath))

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
      const route = g.resolveRoute(path)
      // console.log(path, route)
      if (!route.Page) {
        // console.log('missing Page, loading it')
        await g.loadRoute(route)
      }
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      let metadata = g.getMetadata(path)
      if (metadata) {
        // console.log('have metadata, setMetadata + setVirtualPath')
        setMetadata(metadata)
        g.notifyMeta(metadata)
        setVirtualPath(path)
        return
      }
      if (route.Shell) {
        // console.log('route has shell, setVirtualPath')
        setMetadata(null)
        setVirtualPath(path)
      }
      // console.log('loading metadata')
      metadata = await g.loadMetadata(path)
      // console.log('metadata', metadata)
      if (cancelled) {
        // console.log('cancelled')
        return
      }
      // console.log('setMetadata')
      setMetadata(metadata)
      g.notifyMeta(metadata)
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
  // const locationApi = useMemo(() => {
  //   return {
  //     pathname: virtualPath,
  //     params,
  //   }
  // }, [virtualPath, metadata])

  console.log('---')
  console.log('browser', browserPath)
  console.log('virtual', virtualPath)
  console.log('route', route)
  console.log('metadata', metadata)
  console.log('shell', !!Shell)

  return (
    <>
      {/* <LocationProvider value={locationApi}> */}
      {showShell ? <Shell /> : <Page {...metadata.props} />}
      {/* </LocationProvider> */}
    </>
  )
}
