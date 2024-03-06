import { produce } from 'immer'
import cookiejs from 'cookiejs'

import { matcher } from './matcher.js'

const match = matcher()

const tempBase = 'https://example.com'

export function createRuntime(stack) {
  let ssr
  let pages
  let defaultCookieOptions
  let notFoundPage

  const runtime = {
    ssr,
    call,
    init,
    registerPage,
    resolvePageAndParams,
    resolveRoute,
    loadPage,
    loadPageByUrl,
    callFunction,
    applyRedirect,
    getLoader,
    setLoaderData,
    getLoaderData,
    getAction,
    getCache,
    getCookie,
    setCookie,
    observeCookie,
  }

  function call(action, ...args) {
    runtime[action](...args)
  }

  function init(opts) {
    ssr = runtime.ssr = opts.ssr
    pages = opts.pages
    defaultCookieOptions = opts.defaultCookieOptions
    notFoundPage = pages.find(p => p.pattern === '/not-found')
  }

  function registerPage(pageId, content) {
    const page = pages.find(page => page.id === pageId)
    page.content = content
  }

  function resolvePageAndParams(url) {
    if (!url) {
      return [null, {}]
    }
    for (const page of pages) {
      const [hit, params] = match(page.pattern, url)
      if (hit) return [page, params]
    }
    return [null, {}]
  }

  function resolveRoute(url) {
    const info = new URL(url, tempBase)
    const pathname = info.pathname
    const hash = info.hash
    let [page, params] = resolvePageAndParams(pathname)
    if (!page) page = notFoundPage
    info.searchParams.forEach((value, key) => {
      if (!params.hasOwnProperty(key)) {
        params[key] = value
      }
    })
    const route = {
      url,
      pathname,
      hash,
      params,
      page,
      search(key, value) {
        const searchParams = info.searchParams
        if (value && typeof value === 'string') {
          searchParams.set(key, value)
        } else {
          searchParams.delete(key)
        }
        const query = searchParams.size ? `?${searchParams.toString()}` : ''
        const href = pathname + query + hash
        history.replaceState(null, '', href)
      },
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
    return route
  }

  async function loadPage(page) {
    if (!page) return
    if (page.content) return
    if (!page.loader) {
      page.loader = import(page.file)
    }
    return await page.loader
  }

  function loadPageByUrl(url) {
    const [page] = resolvePageAndParams(url)
    return loadPage(page)
  }

  async function callFunction(type, id, args) {
    let result
    const res = await fetch('/_firebolt_fn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        id,
        args,
      }),
    })
    result = await res.json()
    return result
  }

  function applyRedirect(redirect) {
    if (redirect.mode === 'push') {
      history.pushState(null, '', redirect.url)
    }
    if (redirect.mode === 'replace') {
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
        expiresAt = isNumber(data.expire) ? new Date().getTime() + data.expire * 1000 : null // prettier-ignore
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
      observers: new Set(),
      fetching: status === 'pending',
      stale: false,
      async fetch() {
        let result
        if (ssr) {
          result = await ssr.callFunction('loader', id, args)
          ssr.inserts.write(`
            <script>
              globalThis.$firebolt('setLoaderData', '${key}', ${JSON.stringify(result)})
            </script>
          `)
        } else {
          result = await callFunction('loader', id, args)
        }
        invalidateCookies(result.cookies)
        return result
      },

      read() {
        // background fetch if stale
        if (loader.stale && !loader.fetching) {
          loader.fetching = true
          loader.fetch().then(data => {
            if (data.redirect) {
              // maintain pending state for a blip while we redirect then clear the promise
              return new Promise(() => {
                applyRedirect(data.redirect)
                promise = null
                loader.fetching = false
                loader.stale = false
              })
            }
            setData(data)
            loader.fetching = false
            loader.stale = false
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
      // get() {
      //   return value
      // },
      edit(fnOrValue) {
        if (typeof fnOrValue === 'function') {
          const newValue = produce(value, draft => {
            fn(draft)
          })
          setData({ value: newValue })
        } else {
          setData({ value })
        }
        loader.notify()
      },
      async invalidate() {
        if (loader.observers.size) {
          // if there are observers we background refresh
          loader.stale = true
          loader.notify()
        } else {
          // otherwise do a hard reset
          setData(null)
          promise = null
        }
      },
      observe(callback) {
        loader.observers.add(callback)
        return () => {
          loader.observers.delete(callback)

          // check expiry after no observers
          if (!loader.observers.size && expiresAt !== null) {
            const now = new Date().getTime()
            const expired = now > expiresAt
            if (expired) {
              setData(null)
              promise = null
            }
          }
        }
      },
      notify() {
        for (const notify of loader.observers) {
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
      // serialize FormData if used
      if (args[0] instanceof FormData) {
        const form = args[0]
        const data = { $form: true }
        for (const key of form.keys()) {
          data[key] = form.get(key)
        }
        args[0] = data
      }

      let promise
      if (ssr) {
        promise = ssr.callFunction('action', id, args)
      } else {
        promise = callFunction('action', id, args)
      }
      return promise.then(data => {
        invalidateCookies(data.cookies)
        invalidateData(data.invalidations)
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
      // invalidate all
      if (!args[0]) {
        for (const key in loaders) {
          const loader = loaders[key]
          loader.invalidate()
        }
        return
      }
      // invalidate all by args
      for (const key in loaders) {
        const loader = loaders[key]
        let match = true
        for (const arg of args) {
          if (!loader.args.includes(arg)) {
            match = false
            break
          }
        }
        if (match) loader.invalidate()
      }
    },
    find(...args) {
      for (const key in loaders) {
        const loader = loaders[key]
        let match = true
        for (const arg of args) {
          if (!loader.args.includes(arg)) {
            match = false
            break
          }
        }
        if (match) return loader
      }
    },
    findAll(...args) {
      const matches = []
      for (const key in loaders) {
        const loader = loaders[key]
        let match = true
        for (const arg of args) {
          if (!loader.args.includes(arg)) {
            match = false
            break
          }
        }
        if (match) matches.push(loader)
      }
      return matches
    },
  }

  function invalidateData(items) {
    if (!items) return
    for (const args of items) {
      cache.invalidate(...args)
    }
  }

  function getCache() {
    return cache
  }

  const cookieObservers = {} // [key]: Set

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
    const observers = cookieObservers[key]
    if (observers) {
      for (const callback of observers) {
        callback(data)
      }
    }
  }

  function observeCookie(key, callback) {
    let observers = cookieObservers[key]
    if (!observers) {
      cookieObservers[key] = new Set()
      observers = cookieObservers[key]
    }
    observers.add(callback)
    return () => observers.delete(callback)
  }

  function invalidateCookies(keys) {
    if (!keys) return
    for (const key of keys) {
      const data = getCookie(key)
      const observers = cookieObservers[key]
      if (!observers) continue
      for (const callback of observers) {
        callback(data)
      }
    }
  }

  for (const args of stack) {
    call(...args)
  }

  return runtime
}

function isNumber(val) {
  return typeof val === 'number' && !isNaN(val)
}
