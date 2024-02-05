import { hydrateRoot } from 'react-dom/client'
import { RuntimeProvider } from 'galaxy'

import { Document } from '../../document.js'

import { matcher } from './matcher.js'

const match = matcher()

const initRuntime = ({ routes, stack }) => {
  const pageDataByUrl = {} // [url]: Object
  const pageDataLoaders = {} // [url]: Promise

  const api = {
    ssr: null,
    routes,
    push,
    registerPage,
    setPageData,
    getPageData,
    loadRoute,
    loadRouteByUrl,
    resolveRoute,
    fetchPageData,
    emitMeta,
    onMeta,
  }

  function push(action, ...args) {
    api[action](...args)
  }

  function registerPage(routeId, Page, Loading) {
    const route = routes.find(route => route.id === routeId)
    route.Page = Page
    route.Loading = Loading
  }

  function setPageData(url, pageData) {
    if (pageData) {
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
    }
    pageDataByUrl[url] = pageData
  }

  function getPageData(url, skipExpire) {
    let pageData = pageDataByUrl[url]
    if (!pageData) return null
    if (pageData.expireNever) {
      pageData.shouldExpire = false
    } else if (pageData.expireImmediately) {
      pageData.shouldExpire = true
    } else {
      pageData.shouldExpire = new Date().getTime() >= pageData.expireAt
    }
    if (pageData.shouldExpire && !skipExpire) {
      delete pageDataByUrl[url]
    }
    return pageData
  }

  async function loadRoute(route) {
    if (!route) return
    if (route.Page) return
    if (route.loader) return await route.loader
    route.loader = import(route.file)
    await route.loader
  }

  function loadRouteByUrl(url) {
    const route = resolveRoute(url)
    return loadRoute(route)
  }

  function resolveRoute(url) {
    return routes.find(route => match(route.pattern, url)[0])
  }

  function fetchPageData(url) {
    if (pageDataLoaders[url]) return pageDataLoaders[url]
    const promise = new Promise(async resolve => {
      // if route has no getPageData() then resolve with empty pageData
      const route = resolveRoute(url)
      let pageData = null
      if (route.hasPageData) {
        const resp = await fetch(`/_galaxy/pageData?url=${url}`)
        pageData = await resp.json()
        setPageData(url, pageData)
      }
      delete pageDataLoaders[url]
      resolve(pageData)
    })
    pageDataLoaders[url] = promise
    return promise
  }

  const metaListeners = new Set()

  function emitMeta(pageData) {
    for (const listener of metaListeners) {
      listener(pageData)
    }
  }

  function onMeta(listener) {
    metaListeners.add(listener)
    return () => metaListeners.delete(listener)
  }

  for (const item of stack) {
    push(item.action, ...item.args)
  }

  return api
}

globalThis.$galaxy = initRuntime(globalThis.$galaxy)

hydrateRoot(
  document,
  <RuntimeProvider data={globalThis.$galaxy}>
    <Document />
  </RuntimeProvider>,
  {
    onRecoverableError(err) {
      console.log(document.documentElement.outerHTML)
    },
  }
)
