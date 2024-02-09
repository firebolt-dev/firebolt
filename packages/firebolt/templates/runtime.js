import { matcher } from './matcher.js'

const match = matcher()

export function createRuntime({ ssr, routes, stack = [] }) {
  let headMain
  let headTags = []
  const headListeners = new Set()

  const methods = {
    ssr,
    routes,
    push,
    registerPage,
    loadRoute,
    loadRouteByUrl,
    resolveRoute,
    getHeadMain,
    insertHeadMain,
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
    methods[action](...args)
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

  function getHeadMain() {
    // ssr
    return headMain
  }

  function insertHeadMain(children) {
    // ssr
    headMain = children
  }

  function getHeadTags() {
    return headTags
  }

  function insertHeadTags(children) {
    headTags = [...headTags, children]
    for (const callback of headListeners) {
      callback(headTags)
    }
    return () => {
      headTags = headTags.filter(t => t !== children)
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
    let result
    if (ssr) {
      result = await ssr.callRouteFn(routeId, fnName, args)
    } else {
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
      result = await resp.json()
    }
    return result
  }

  const loaders = {} // [key]: loader

  function getLoader(routeId, fnName, args) {
    const key = `${routeId}|${fnName}|${args.join('|')}`
    if (loaders[key]) return loaders[key]
    const loader = {
      key,
      get() {
        let resource = getResource(key)
        if (!resource) {
          const resolve = async () => {
            let data
            if (ssr) {
              data = await ssr.callRouteFn(routeId, fnName, args)
              ssr.inserts.write(`
                <script>
                  globalThis.$firebolt.setResourceData('${key}', ${JSON.stringify(data)})
                </script>
              `)
            } else {
              data = await callRouteFn(routeId, fnName, args)
            }
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
    return resources[key]
  }

  function setResource(key, resource) {
    resources[key] = resource
  }

  function setResourceData(key, data) {
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

  return methods
}
