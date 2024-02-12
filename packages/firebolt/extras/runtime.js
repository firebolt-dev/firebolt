import { produce } from 'immer'

import { matcher } from './matcher.js'

const match = matcher()

export function createRuntime({ ssr, routes, stack = [] }) {
  let docHead
  let pageHeads = []
  const headWatchers = new Set()

  const methods = {
    ssr,
    routes,
    push,
    registerPage,
    loadRoute,
    loadRouteByUrl,
    resolveRoute,
    resolveRouteWithParams,
    insertDocHead,
    insertPageHead,
    getPageHeads,
    getDocHead,
    watchPageHeads,
    callRouteFn,
    getLoader,
    getResource,
    setResource,
    setResourceResult,
    getAction,
    getCache,
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

  function resolveRouteWithParams(url) {
    if (!url) return []
    for (const route of routes) {
      const [hit, params] = match(route.pattern, url)
      if (hit) return [route, params]
    }
    return []
  }

  // ssr
  function insertDocHead(children) {
    docHead = children
  }

  function getDocHead() {
    return docHead
  }

  function insertPageHead(children) {
    pageHeads = [...pageHeads, children]
    for (const callback of headWatchers) {
      callback(pageHeads)
    }
    return () => {
      pageHeads = pageHeads.filter(t => t !== children)
      for (const callback of headWatchers) {
        callback(pageHeads)
      }
    }
  }

  function getPageHeads() {
    return pageHeads
  }

  function watchPageHeads(callback) {
    headWatchers.add(callback)
    return () => headWatchers.delete(callback)
  }

  async function callRouteFn(routeId, fnName, args) {
    let result
    if (ssr) {
      result = await ssr.callRouteFn(routeId, fnName, args)
    } else {
      const res = await fetch('/_firebolt_fn', {
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
      result = await res.json()
    }
    return result
  }

  const loaders = {} // [key]: loader

  function getLoader(routeId, args) {
    const key = `${routeId}|${args.join('|')}`
    const fnName = args[0]
    const fnArgs = args.slice(1)
    if (loaders[key]) return loaders[key]
    let resource = getResource(key)
    const loader = {
      key,
      args,
      watchers: new Set(),
      fetching: resource?.pending() || false,
      invalidated: false,
      async fetch() {
        let result
        if (ssr) {
          result = await ssr.callRouteFn(routeId, fnName, fnArgs)
          ssr.inserts.write(`
            <script>
              globalThis.$firebolt.push('setResourceResult', '${key}', ${JSON.stringify(result)})
            </script>
          `)
        } else {
          result = await callRouteFn(routeId, fnName, fnArgs)
        }
        return result
      },
      get() {
        let resource = getResource(key)
        if (!resource) {
          resource = createResource(loader.fetch())
          setResource(key, resource)
        }
        if (resource.expired()) {
          loader.invalidated = true
        }
        if (loader.invalidated && !loader.fetching) {
          loader.fetching = true
          loader.fetch().then(result => {
            resource.write(result)
            loader.fetching = false
            loader.invalidated = false
            loader.notify()
          })
        }
        return resource.read()
      },
      set(value) {
        const resource = getResource(key)
        resource.write({ value }) // todo: set expire?
        loader.notify()
      },
      edit(fn) {
        const resource = getResource(key)
        const value = resource.read(false)
        const newValue = produce(value, draft => {
          return fn(draft)
        })
        resource.write({ value: newValue })
        loader.notify()
      },
      async invalidate() {
        loader.invalidated = true
        loader.notify()
      },
      notify() {
        for (const notify of loader.watchers) {
          notify()
        }
      },
      watch(callback) {
        loader.watchers.add(callback)
        return () => loader.watchers.delete(callback)
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

  function setResourceResult(key, result) {
    let resource = getResource(key)
    if (resource) {
      resource.write(result)
    } else {
      resource = createResource(result)
      setResource(key, resource)
    }
  }

  function createResource(resultOrPromise) {
    let status
    let value
    let promise
    let expiresAt = null
    const set = resultOrPromise => {
      if (resultOrPromise instanceof Promise) {
        status = 'pending'
        promise = resultOrPromise.then(
          result => {
            status = 'ready'
            value = result.value
            expiresAt = result.expire ? new Date().getTime() + result.expire * 1000 : null // prettier-ignore
          },
          err => {
            status = 'error'
            value = err
            expiresAt = null
          }
        )
      } else {
        const result = resultOrPromise
        status = 'ready'
        value = result.value
        expiresAt = result.expire ? new Date().getTime() + result.expire * 1000 : null // prettier-ignore
      }
    }
    set(resultOrPromise)
    return {
      read(suspend = true) {
        if (!suspend) return value
        if (status === 'ready') return value
        if (status === 'pending') throw promise
        if (status === 'error') throw value
      },
      write(resultOrPromise) {
        set(resultOrPromise)
      },
      pending() {
        return status === 'pending'
      },
      expired() {
        if (expiresAt === null) return false
        const now = new Date().getTime()
        return now > expiresAt
      },
    }
  }

  const actions = {} // [key]: action

  function getAction(routeId, fnName) {
    const key = `${routeId}|${fnName}`
    if (!actions[key]) {
      actions[key] = async function (...fnArgs) {
        if (ssr) {
          return await ssr.callRouteFn(routeId, fnName, fnArgs)
        }
        return await callRouteFn(routeId, fnName, fnArgs)
      }
    }
    return actions[key]
  }

  const cache = {
    invalidate(...args) {
      // invalidate everything
      if (!args[0]) {
        for (const key in loaders) {
          const loader = loaders[key]
          loader.invalidate()
        }
        return
      }
      // invalidate via predicate
      if (typeof args[0] === 'function') {
        const check = args[0]
        for (const key in loaders) {
          const loader = loaders[key]
          const shouldInvalidate = check(loader.args)
          if (shouldInvalidate) {
            loader.invalidate()
          }
        }
        return
      }
      // invalidate via matching
      for (const key in loaders) {
        const loader = loaders[key]
        let match = true
        for (let i = 0; i < args.length; i++) {
          if (loader.args[i] !== args[i]) {
            match = false
            break
          }
        }
        if (match) {
          loader.invalidate()
        }
      }
    },
  }

  function getCache() {
    return cache
  }

  for (const item of stack) {
    push(item.action, ...item.args)
  }

  return methods
}
