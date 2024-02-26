import { produce } from 'immer'
import cookiejs from 'cookiejs'

import { matcher } from './matcher.js'

const match = matcher()

const tempBase = 'https://example.com'

export function createRuntime(stack) {
  let ssr
  let routes
  let defaultCookieOptions
  let notFoundRoute

  const runtime = {
    ssr,
    call,
    init,
    registerPage,
    resolveRouteAndParams,
    resolveLocation,
    loadRoute,
    loadRouteByUrl,
    callFunction,
    applyRedirect,
    getLoader,
    setLoaderData,
    getLoaderData,
    getAction,
    getCache,
    getCookie,
    setCookie,
    watchCookie,
  }

  function call(action, ...args) {
    runtime[action](...args)
  }

  function init(opts) {
    ssr = runtime.ssr = opts.ssr
    routes = opts.routes
    defaultCookieOptions = opts.defaultCookieOptions
    notFoundRoute = routes.find(r => r.pattern === '/not-found')
  }

  function registerPage(routeId, content) {
    const route = routes.find(route => route.id === routeId)
    route.content = content
  }

  function resolveRouteAndParams(url) {
    if (!url) {
      return [null, {}]
    }
    for (const route of routes) {
      const [hit, params] = match(route.pattern, url)
      if (hit) return [route, params]
    }
    return [null, {}]
  }

  function resolveLocation(url) {
    const info = new URL(url, tempBase)
    const pathname = info.pathname
    const hash = info.hash
    let [route, params] = resolveRouteAndParams(pathname)
    if (!route) route = notFoundRoute
    info.searchParams.forEach((value, key) => {
      if (!params.hasOwnProperty(key)) {
        params[key] = value
      }
    })
    const location = {
      url,
      pathname,
      hash,
      params,
      route,
      push(href) {
        history.pushState(null, '', href)
      },
      replace(href) {
        history.replaceState(null, '', href)
      },
      back() {
        history.back()
      },
      forward() {
        history.forward()
      },
    }
    return location
  }

  async function loadRoute(route) {
    if (!route) return
    if (route.content) return
    if (!route.loader) {
      route.loader = import(route.file)
    }
    return await route.loader
  }

  function loadRouteByUrl(url) {
    const [route] = resolveRouteAndParams(url)
    return loadRoute(route)
  }

  async function callFunction(id, args) {
    let result
    // if (ssr) {
    //   console.log('TODO: this shouldnt happen yeah?')
    //   result = await ssr.callFunction(id, args)
    // } else {
    const res = await fetch('/_firebolt_fn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        args, // todo: rename fnArgs
      }),
    })
    result = await res.json()
    // }
    return result
  }

  function applyRedirect(redirect) {
    if (redirect.type === 'push') {
      history.pushState(null, '', redirect.url)
    }
    if (redirect.type === 'replace') {
      history.replaceState(null, '', redirect.url)
    }
  }

  const loaders = {} // [key]: loader

  function getLoader(id, args) {
    const key = `${id}|${args.join('|')}`
    if (loaders[key]) return loaders[key]
    let status = 'pending'
    let promise
    let value
    let expiresAt
    const setData = data => {
      if (data?.error) {
        status = 'error'
        value = data.error
        expiresAt = null
      } else if (data) {
        status = 'ready'
        value = data.value
        expiresAt = data.expire ? new Date().getTime() + data.expire * 1000 : null // prettier-ignore
      } else {
        status = 'pending'
        value = null
        expiresAt = null
      }
    }
    setData(getLoaderData(key))
    const loader = {
      key,
      args,
      watchers: new Set(),
      fetching: status === 'pending',
      invalidated: false,
      async fetch() {
        let result
        if (ssr) {
          result = await ssr.callFunction(id, args)
          ssr.inserts.write(`
            <script>
              globalThis.$firebolt('setLoaderData', '${key}', ${JSON.stringify(result)})
            </script>
          `)
        } else {
          result = await callFunction(id, args)
        }
        invalidateCookies(result.cookies)
        return result
      },

      read() {
        // invalidate if expired
        if (expiresAt !== null) {
          const now = new Date().getTime()
          const expired = now > expiresAt
          if (expired) {
            loader.invalidated = true
          }
        }
        // background fetch if invalidated
        if (loader.invalidated && !loader.fetching) {
          loader.fetching = true
          loader.fetch().then(data => {
            if (data.redirect) {
              // maintain pending state for a blip while we redirect then clear the promise
              return new Promise(() => {
                applyRedirect(data.redirect)
                promise = null
                loader.fetching = false
                loader.invalidated = false
              })
            }
            setData(data)
            loader.fetching = false
            loader.invalidated = false
            loader.notify()
          })
        }
        // read from status
        if (status === 'ready') {
          return value
        }
        if (status === 'pending') {
          if (!promise) {
            promise = loader.fetch().then(data => {
              if (data.redirect) {
                // maintain pending state for a blip while we redirect then clear the promise
                return new Promise(() => {
                  applyRedirect(data.redirect)
                  promise = null
                  loader.fetching = false
                })
              }
              setData(data)
              loader.fetching = false
            })
          }
          throw promise
        }
        if (status === 'error') {
          throw value
        }
      },
      get() {
        return value
      },
      set(value) {
        setData({ value })
        loader.notify()
      },
      edit(fn) {
        const newValue = produce(value, draft => {
          fn(draft)
        })
        setData({ value: newValue })
        loader.notify()
      },
      async invalidate() {
        loader.invalidated = true
        loader.notify()
      },
      watch(callback) {
        loader.watchers.add(callback)
        return () => loader.watchers.delete(callback)
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

  const loaderData = {} // [key]: data

  function setLoaderData(key, data) {
    loaderData[key] = data
  }

  function getLoaderData(key) {
    return loaderData[key]
  }

  const actions = {} // [key]: action

  function getAction(id) {
    const key = `${id}`
    if (actions[key]) return actions[key]
    const action = function (...args) {
      let promise
      if (ssr) {
        promise = ssr.callFunction(id, args)
      } else {
        promise = callFunction(id, args)
      }
      return promise.then(data => {
        invalidateCookies(data.cookies)
        if (data.error) {
          throw data.error
        }
        if (data.redirect) {
          // cancel action call stack and redirect
          return new Promise(() => {
            applyRedirect(data.redirect)
          })
        }
        return data.value
      })
    }
    actions[key] = action
    return action
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

  const cookieWatchers = {} // [key]: Set

  function getCookie(key) {
    let value
    if (ssr) {
      value = ssr.cookies.get(key)
    } else {
      value = cookiejs.get(key)
      // cookiejs returns false if cookie doesn't exist
      if (value === false) value = null
    }
    if (value === null || value === undefined) return null
    let data
    try {
      data = JSON.parse(value)
    } catch (err) {
      console.error(`could not deserialize cookie ${key} with value:`, value)
      console.log({ value })
      return null
    }
    // console.log('getCookie', { key, data })
    return data
  }

  function setCookie(key, data, options, defaultValue) {
    if (typeof data === 'function') {
      const prevData = getCookie(key)
      data = data(prevData || defaultValue)
    }
    options = options || defaultCookieOptions
    // console.log('setCookie', { key, data, options })
    if (data === null || data === undefined || data === '') {
      if (ssr) {
        ssr.cookies.remove(key)
      } else {
        cookiejs.remove(key)
      }
      data = null
    } else {
      let value
      try {
        value = JSON.stringify(data)
      } catch (err) {
        return console.error(
          `could not serialize cookie ${key} with data:`,
          data
        )
      }
      if (ssr) {
        ssr.cookies.set(key, value, options)
      } else {
        cookiejs.set(key, value, options)
      }
    }
    const watchers = cookieWatchers[key]
    if (watchers) {
      for (const callback of watchers) {
        callback(data)
      }
    }
  }

  function watchCookie(key, callback) {
    let watchers = cookieWatchers[key]
    if (!watchers) {
      cookieWatchers[key] = new Set()
      watchers = cookieWatchers[key]
    }
    watchers.add(callback)
    return () => watchers.delete(callback)
  }

  function invalidateCookies(keys) {
    if (!keys) return
    for (const key of keys) {
      const data = getCookie(key)
      const watchers = cookieWatchers[key]
      if (!watchers) continue
      for (const callback of watchers) {
        callback(data)
      }
    }
  }

  for (const args of stack) {
    call(...args)
  }

  return runtime
}
