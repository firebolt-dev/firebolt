import { hydrateRoot } from 'react-dom/client'

import { Document } from '../../document.js'

import { matcher } from './matcher.js'

const match = matcher()

const runtime = stack => {
  let hasInit

  const routes = []
  const routesById = {}
  const metadataByPath = {}
  const metadataLoaders = {} // [path]: Promise

  const actions = {
    routes,
    metadataByPath,
    init,
    registerPage,
    call,
    getPage,
    getMetadata,
    resolveRoute,
    resolveRouteAndParams,
    loadRoute,
    loadRouteById,
    loadRouteByPath,
    loadMetadata,
    onMeta,
    notifyMeta,
  }

  function init({ routes: _routes, path, metadata }) {
    if (hasInit) throw new Error('already initialized')
    routes.push(..._routes)
    for (const route of routes) {
      routesById[route.id] = route
    }
    setMetadata(path, metadata)
    hasInit = true
  }

  function registerPage(routeId, Page, Shell) {
    const route = routesById[routeId]
    if (!route) return console.error('TODO: handle')
    route.Page = Page
    route.Shell = Shell
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
      // expire immediately
      metadata.expireImmediately = true
    } else if (metadata.expire > 0) {
      // expire in X seconds
      metadata.expireAt = new Date().getTime() + metadata.expire * 1000
    } else {
      // never expire
      metadata.expireNever = true
    }
    metadataByPath[path] = metadata
    console.log('setMetadata', metadata)
  }

  function getMetadata(path, ignoreExpire) {
    let metadata = metadataByPath[path]
    if (!metadata) return null
    if (ignoreExpire) return metadata
    if (metadata.expireNever) {
      return metadata
    } else if (metadata.expireImmediately) {
      delete metadataByPath[path]
      return null
    } else {
      const expired = new Date().getTime() >= metadata.expireAt
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

  return actions
}

globalThis.$galaxy = runtime(globalThis.$galaxy.stack)

hydrateRoot(document, <Document />)
