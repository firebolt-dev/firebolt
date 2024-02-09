import { hydrateRoot } from 'react-dom/client'
import { RuntimeProvider, Router } from 'firebolt'

import { Document } from '../../../document.js'

import { matcher } from './matcher.js'

const match = matcher()

const createRuntime = ({ ssr, routes, stack }) => {
  let headTags = []
  const headListeners = new Set()

  const api = {
    ssr,
    routes,
    push,
    registerPage,
    loadRoute,
    loadRouteByUrl,
    resolveRoute,
    getHeadTags,
    insertHeadTags,
    onHeadTags,
    callRouteFn,
    getLoader,
    getResource,
    setResource,
    setResourceData,
  }

  function push(action, ...args) {
    api[action](...args)
  }

  function registerPage(routeId, Page) {
    const route = routes.find(route => route.id === routeId)
    route.Page = Page
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

  async function callRouteFn(routeId, fnName, args) {
    const resp = await fetch('/_firebolt_fn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routeId,
        fnName,
        args,
      }),
    })
    const result = await resp.json()
    return result
  }

  const loaders = {} // [key]: loader

  function getLoader(routeId, fnName, args) {
    // IMPORTANT: mirrored in SSR runtime
    const key = `${routeId}|${fnName}|${args.join('|')}`
    console.log('getLoader', key, !!loaders[key])
    if (loaders[key]) return loaders[key]
    const loader = {
      key,
      get() {
        let resource = getResource(key)
        if (!resource) {
          const resolve = async () => {
            const data = await callRouteFn(routeId, fnName, args)
            return data
          }
          resource = createResource(resolve())
          setResource(key, resource)
        }
        return resource().data
      },
    }
    loaders[key] = loader
    return loader
  }

  const resources = {} // [key]: resource

  function getResource(key) {
    console.log('getResource', key, resources[key])
    return resources[key]
  }

  function setResource(key, resource) {
    console.log('setResource', key, resource)
    resources[key] = resource
  }

  function setResourceData(key, data) {
    console.log('setResourceData', key, data)
    resources[key] = () => data
  }

  function createResource(promise) {
    let status = 'pending'
    let value
    promise = promise.then(
      resp => {
        status = 'success'
        value = resp
      },
      err => {
        status = 'error'
        value = err
      }
    )
    return () => {
      if (status === 'success') return value
      if (status === 'pending') throw promise
      if (status === 'error') throw value
    }
  }

  for (const item of stack) {
    push(item.action, ...item.args)
  }

  return api
}

globalThis.$firebolt = createRuntime(globalThis.$firebolt)

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
