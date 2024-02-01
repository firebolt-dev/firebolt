import { hydrateRoot } from 'react-dom/client'

import { Document } from '../../document.js'

import { matcher } from './matcher.js'

const match = matcher()

const runtime = stack => {
  let hasInit

  const routes = []
  const routesById = {}
  const pageDataByPath = {} // [path]: Object
  const pageDataLoaders = {} // [path]: Promise

  const actions = {
    routes,
    pageDataByPath,
    init,
    registerPage,
    call,
    getPage,
    getPageData,
    resolveRoute,
    resolveRouteAndParams,
    loadRoute,
    loadRouteById,
    loadRouteByPath,
    loadPageData,
    onMeta,
    notifyMeta,
  }

  function init({ routes: _routes, path, pageData }) {
    if (hasInit) throw new Error('already initialized')
    routes.push(..._routes)
    for (const route of routes) {
      routesById[route.id] = route
    }
    setPageData(path, pageData)
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

  function setPageData(path, pageData) {
    if (pageData.expire === 0) {
      // expire immediately
      pageData.expireImmediately = true
    } else if (pageData.expire > 0) {
      // expire in X seconds
      pageData.expireAt = new Date().getTime() + pageData.expire * 1000
    } else {
      // never expire
      pageData.expireNever = true
    }
    pageDataByPath[path] = pageData
  }

  function getPageData(path, ignoreExpire) {
    let pageData = pageDataByPath[path]
    if (!pageData) return null
    if (ignoreExpire) return pageData
    if (pageData.expireNever) {
      return pageData
    } else if (pageData.expireImmediately) {
      delete pageDataByPath[path]
      return null
    } else {
      const expired = new Date().getTime() >= pageData.expireAt
      if (expired) {
        delete pageDataByPath[path]
        return null
      }
      return pageData
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

  function loadPageData(path) {
    if (pageDataLoaders[path]) return pageDataLoaders[path]
    const promise = new Promise(async resolve => {
      // if route has no getPageData() then resolve with empty pageData
      const route = resolveRoute(path)
      if (!route.hasPageData) return resolve({})
      // otherwise fetch it
      const resp = await fetch(`/_galaxy/pageData?path=${path}`)
      const pageData = await resp.json()
      setPageData(path, pageData)
      resolve(pageData)
      delete pageDataLoaders[path]
    })
    pageDataLoaders[path] = promise
    return promise
  }

  let metaListeners = new Set()
  function onMeta(callback) {
    metaListeners.add(callback)
    return () => metaListeners.delete(callback)
  }

  function notifyMeta(pageData) {
    for (const callback of metaListeners) {
      callback(pageData)
    }
  }

  return actions
}

globalThis.$galaxy = runtime(globalThis.$galaxy.stack)

hydrateRoot(document, <Document />)
