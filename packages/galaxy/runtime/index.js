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

  for (const item of stack) {
    push(item.action, ...item.args)
  }

  return api
}

globalThis.$galaxy = initRuntime(globalThis.$galaxy)

// const runtime = stack => {
//   let hasInit

//   const routes = []
//   const routesById = {}
//   const pageDataByUrl = {} // [url]: Object
//   const pageDataLoaders = {} // [url]: Promise

//   const actions = {
//     routes,
//     pageDataByUrl,
//     init,
//     initPageData,
//     registerPage,
//     call,
//     getPage,
//     getPageData,
//     resolveRoute,
//     resolveRouteAndParams,
//     loadRoute,
//     loadRouteById,
//     loadRouteByUrl,
//     loadPageData,
//     onMeta,
//     notifyMeta,
//   }

//   function init({ routes: routes_, url, pageData }) {
//     console.log('init')
//     if (hasInit) throw new Error('already initialized')
//     routes.push(...routes_)
//     for (const route of routes) {
//       routesById[route.id] = route
//     }
//     setPageData(url, pageData)
//     hasInit = true
//   }

//   function initPageData(url, pageData) {
//     setPageData(url, pageData)
//     console.log('initPageData', url, pageData)
//   }

//   function registerPage(routeId, Page, Loading) {
//     const route = routesById[routeId]
//     if (!route) return console.error('TODO: handle')
//     route.Page = Page
//     route.Loading = Loading
//   }

//   function call(action, ...args) {
//     actions[action](...args)
//   }

//   for (const item of stack) {
//     call(item.action, ...item.args)
//   }

//   function getPage(routeId) {
//     return routesById[routeId].Page
//   }

//   function setPageData(url, pageData) {
//     console.log('setPageData', url, pageData)
//     if (pageData) {
//       if (pageData.expire === 0) {
//         // expire immediately
//         pageData.expireImmediately = true
//       } else if (pageData.expire > 0) {
//         // expire in X seconds
//         pageData.expireAt = new Date().getTime() + pageData.expire * 1000
//       } else {
//         // never expire
//         pageData.expireNever = true
//       }
//     }
//     pageDataByUrl[url] = pageData
//   }

//   function getPageData(url, ignoreExpire) {
//     let pageData = pageDataByUrl[url]
//     if (!pageData) return null
//     if (ignoreExpire) return pageData
//     if (pageData.expireNever) {
//       return pageData
//     } else if (pageData.expireImmediately) {
//       delete pageDataByUrl[url]
//       return null
//     } else {
//       const expired = new Date().getTime() >= pageData.expireAt
//       if (expired) {
//         delete pageDataByUrl[url]
//         return null
//       }
//       return pageData
//     }
//   }

//   function resolveRoute(url) {
//     return routes.find(route => match(route.pattern, url)[0])
//   }

//   function resolveRouteAndParams(url) {
//     for (const route of routes) {
//       const [hit, params] = match(route.pattern, url)
//       if (hit) return [route, params]
//     }
//     return []
//   }

//   async function loadRoute(route) {
//     if (!route) return
//     if (route.Page) return
//     if (route.loader) return route.loader
//     route.loader = import(route.file)
//     await route.loader
//   }

//   function loadRouteById(routeId) {
//     const route = routesById[routeId]
//     return loadRoute(route)
//   }

//   function loadRouteByUrl(url) {
//     const route = resolveRoute(url)
//     return loadRoute(route)
//   }

// function loadPageData(url) {
//   if (pageDataLoaders[url]) return pageDataLoaders[url]
//   const promise = new Promise(async resolve => {
//     // if route has no getPageData() then resolve with empty pageData
//     const route = resolveRoute(url)
//     if (!route.hasPageData) return resolve({})
//     // otherwise fetch it
//     const resp = await fetch(`/_galaxy/pageData?url=${url}`)
//     const pageData = await resp.json()
//     setPageData(url, pageData)
//     resolve(pageData)
//     delete pageDataLoaders[url]
//   })
//   pageDataLoaders[url] = promise
//   return promise
// }

//   let metaListeners = new Set()
//   function onMeta(callback) {
//     metaListeners.add(callback)
//     return () => metaListeners.delete(callback)
//   }

//   function notifyMeta(pageData) {
//     for (const callback of metaListeners) {
//       callback(pageData)
//     }
//   }

//   return actions
// }

// globalThis.$galaxy = runtime(globalThis.$galaxy.stack)

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
