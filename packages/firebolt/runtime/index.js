import { hydrateRoot } from 'react-dom/client'
import { RuntimeProvider, Router } from 'firebolt'

import { Document } from '../../../document.js'

import { matcher } from './matcher.js'

const match = matcher()

const initRuntime = ({ routes, stack }) => {
  const metadataByUrl = {} // [url]: Object
  const metadataLoaders = {} // [url]: Promise
  let headTags = []
  const headListeners = new Set()

  const api = {
    ssr: null,
    routes,
    push,
    registerPage,
    setMetadata,
    getMetadata,
    loadRoute,
    loadRouteByUrl,
    resolveRoute,
    fetchMetadata,
    getHeadTags,
    insertHeadTags,
    onHeadTags,
    getResource,
    setResource,
    setResourceData,
  }

  function push(action, ...args) {
    api[action](...args)
  }

  function registerPage(routeId, Page, Loading) {
    const route = routes.find(route => route.id === routeId)
    route.Page = Page
    route.Loading = Loading
  }

  function setMetadata(url, metadata) {
    if (metadata) {
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
    }
    metadataByUrl[url] = metadata
  }

  function getMetadata(url, skipExpire) {
    let metadata = metadataByUrl[url]
    if (!metadata) return null
    if (metadata.expireNever) {
      metadata.shouldExpire = false
    } else if (metadata.expireImmediately) {
      metadata.shouldExpire = true
    } else {
      metadata.shouldExpire = new Date().getTime() >= metadata.expireAt
    }
    if (metadata.shouldExpire && !skipExpire) {
      delete metadataByUrl[url]
    }
    return metadata
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

  function fetchMetadata(url) {
    if (metadataLoaders[url]) return metadataLoaders[url]
    const promise = new Promise(async resolve => {
      // if route has no getMetadata() then resolve with empty metadata
      const route = resolveRoute(url)
      let metadata = null
      if (route.hasMetadata) {
        const resp = await fetch(`/_firebolt_metadata?url=${url}`)
        metadata = await resp.json()
        setMetadata(url, metadata)
      }
      delete metadataLoaders[url]
      resolve(metadata)
    })
    metadataLoaders[url] = promise
    return promise
  }

  function getHeadTags() {
    return headTags
  }

  function insertHeadTags(tags) {
    headTags = [...headTags, tags]
    for (const callback of headListeners) {
      callback(headTags)
    }
    return () => {
      headTags = headTags.filter(t => t !== tags)
      for (const callback of headListeners) {
        callback(headTags)
      }
    }
  }

  function onHeadTags(callback) {
    headListeners.add(callback)
    return () => headListeners.delete(callback)
  }

  const resources = {}

  function getResource(key) {
    return resources[key]
  }

  function setResource(key, resource) {
    resources[key] = resource
  }

  function setResourceData(key, data) {
    resources[key] = () => data
  }

  for (const item of stack) {
    push(item.action, ...item.args)
  }

  return api
}

globalThis.$firebolt = initRuntime(globalThis.$firebolt)

hydrateRoot(
  document,
  <RuntimeProvider data={globalThis.$firebolt}>
    <Document>
      <Router />
    </Document>
  </RuntimeProvider>,
  {
    // onRecoverableError(err) {
    //   console.log(document.documentElement.outerHTML)
    // },
  }
)
