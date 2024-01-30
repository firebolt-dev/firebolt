import { hydrateRoot } from 'react-dom/client'
import {
  Suspense,
  lazy,
  useState,
  useEffect,
  use,
  useRef,
  useContext,
  createContext,
} from 'react'
import { Router, Route, Switch, useParams, useRouter } from 'galaxy'
import makeMatcher from 'wouter/matcher'

import { Document } from '../document.js'

const galaxy = stack => {
  const match = makeMatcher()
  const routes = []
  const routesById = {}
  const metadataByPath = {}
  const metadataListeners = {} // [path]: [...callback]
  function init({ routes: _routes, path, metadata }) {
    routes.length = 0
    routes.push(..._routes)
    for (const route of routes) {
      routesById[route.id] = route
    }
    setMetadata(path, metadata)
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
  function setMetadata(path, metadata) {
    if (metadata.expire === 0) {
      // expire after one use
      metadata.expireTime = 'once'
    } else if (metadata.expire > 0) {
      // expire in X seconds
      metadata.expireTime = new Date().getTime() + metadata.expire * 1000
    } else {
      // never expire
      metadata.expireTime = 'never'
    }
    console.log('setMetadata', metadata)
    metadataByPath[path] = metadata
    const listeners = metadataListeners[path]
    if (!listeners) return
    for (const callback of listeners) {
      callback()
    }
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
  async function loadMetadata(path) {
    console.log('loadMetadata', path)
    const resp = await fetch(`/_galaxy/metadata?path=${path}`)
    const metadata = await resp.json()
    setMetadata(path, metadata)
  }
  function subscribeToMetadata(path, callback) {
    console.log('subscribeToMetadata', path, callback)
    if (!metadataListeners[path]) {
      metadataListeners[path] = new Set()
    }
    metadataListeners[path].add(callback)
    return () => {
      metadataListeners[path].delete(callback)
    }
  }
  return {
    call,
    getPage,
    getMetadata,
    routes,
    resolveRoute,
    loadRouteById,
    loadRouteByPath,
    loadMetadata,
    subscribeToMetadata,
  }
}
const g = galaxy(window.$galaxy.stack)
window.$galaxy = g

const root = hydrateRoot(document, <App />)

function App() {
  const metadata = g.getMetadata(window.location.pathname, true)
  return (
    <Document {...metadata}>
      <Router>
        <Switch>
          {g.routes.map(route => (
            <Route key={route.id} path={route.path}>
              <PageMounter route={route} />
            </Route>
          ))}
        </Switch>
      </Router>
    </Document>
  )
}

function PageMounter({ route }) {
  const { Page, Shell } = route
  const path = window.location.pathname
  const metadata = g.getMetadata(path)
  const props = metadata?.props
  const params = useParams()
  const refresh = useRefresh()

  console.log('metadata', metadata)

  useEffect(() => {
    if (Shell && !metadata) {
      g.loadMetadata(path)
    }
  }, [])

  useEffect(() => {
    if (metadata) return
    return g.subscribeToMetadata(path, refresh)
  }, [])

  useEffect(() => {
    if (Page) return
    g.loadRouteById(route.id).then(() => {
      refresh()
    })
  }, [Page])

  if (!Page) {
    return null
  }

  if (Shell && !metadata) {
    return <Shell />
  }

  return <Page {...props} />
}

function useRefresh() {
  const [n, setN] = useState(0)
  return () => setN(n => n + 1)
}
