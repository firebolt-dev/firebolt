import { produce } from 'immer'

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
    resolveRouteWithParams,
    getHeadMain,
    insertHeadMain,
    getHeadTags,
    insertHeadTags,
    onHeadTags,
    callRouteFn,
    getLoader,
    watchLoader,
    getResource,
    setResource,
    setResourceValue,
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
    for (const route of routes) {
      const [hit, params] = match(route.pattern, url)
      if (hit) return [route, params]
    }
    return []
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
        let value
        if (ssr) {
          value = await ssr.callRouteFn(routeId, fnName, fnArgs)
          ssr.inserts.write(`
            <script>
              globalThis.$firebolt.push('setResourceValue', '${key}', ${JSON.stringify(value)})
            </script>
          `)
        } else {
          value = await callRouteFn(routeId, fnName, fnArgs)
        }
        return value
      },
      get() {
        let resource = getResource(key)
        if (!resource) {
          resource = createResource(loader.fetch())
          setResource(key, resource)
        }
        if (loader.invalidated) {
          loader.invalidated = false
          loader.fetching = true
          loader.fetch().then(newValue => {
            resource.write(newValue)
            loader.fetching = false
            loader.notify()
          })
        }
        return resource.read()
      },
      set(data) {
        const resource = getResource(key)
        resource.write(data)
        loader.notify()
      },
      edit(fn) {
        const resource = getResource(key)
        const value = resource.read(false)
        const newValue = produce(value, draft => {
          fn(draft)
        })
        resource.write(newValue)
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
    }
    loaders[key] = loader
    return loader
  }

  function watchLoader(loader, onChange) {
    loader.watchers.add(onChange)
    return () => loader.watchers.delete(onChange)
  }

  const resources = {} // [key]: resource

  function getResource(key) {
    return resources[key]
  }

  function setResource(key, resource) {
    resources[key] = resource
  }

  function setResourceValue(key, value) {
    let resource = getResource(key)
    if (resource) {
      resource.write(value)
    } else {
      resource = createResource(value)
      setResource(key, resource)
    }
  }

  function createResource(valueOrPromise) {
    let status
    let value
    let promise
    const set = valueOrPromise => {
      if (valueOrPromise instanceof Promise) {
        status = 'pending'
        promise = valueOrPromise.then(
          resp => {
            status = 'ready'
            value = resp
          },
          err => {
            status = 'error'
            value = err
          }
        )
      } else {
        status = 'ready'
        value = valueOrPromise
      }
    }
    set(valueOrPromise)
    return {
      read(suspend = true) {
        if (!suspend) return value
        if (status === 'ready') return value
        if (status === 'pending') throw promise
        if (status === 'error') throw value
      },
      write(valueOrPromise) {
        set(valueOrPromise)
      },
      pending() {
        return status === 'pending'
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
