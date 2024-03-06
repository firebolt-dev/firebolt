import { cookieOptionsToExpress } from './cookies'

export function createContext({
  type,
  req,
  defaultCookieOptions,
  params,
  base,
}) {
  const ctx = {}

  decorate(ctx, base)

  // params
  if (type === 'handler') {
    ctx.params = params || {}
  }

  // invalidate
  if (type === 'action') {
    ctx.$invalidations = []
    ctx.invalidate = (...args) => {
      ctx.$invalidations.push(args)
    }
  }

  // error
  if (type === 'loader' || type === 'action') {
    ctx.error = code => {
      ctx.$errorCode = code
      throw ctx
    }
  }

  // headers
  if (type === 'middleware') {
    ctx.headers = {}
  }

  // redirect
  if (type === 'action' || type === 'loader') {
    ctx.redirect = (url, mode = 'push') => {
      ctx.$redirect = { url, mode }
      throw ctx
    }
    ctx.$applyRedirectToExpressResponse = res => {
      if (!ctx.$redirect) return
      /**
       * during ssr if we need to redirect, we have to do it using a script
       * because the response is already streaming :)
       *
       * NOTE: we write directly to the response and flush it so that we don't get a flash
       * of the rendering before it redirects.
       */
      if (ctx.$redirect.mode === 'replace') {
        res.write(`
              <script>window.location.replace('${ctx.$redirect.url}')</script>
            `)
        res.flush()
      }
      if (ctx.$redirect.mode === 'push') {
        /**
         * NOTE: it appears that this does not push a new route to the history and instead replaces it.
         * this is likely because the location changes BEFORE the html document has finished streaming.
         */
        res.write(`
              <script>window.location.href = '${ctx.$redirect.url}'</script>
            `)
        res.flush()
      }
    }
  }

  // expire
  if (type === 'loader') {
    ctx.$expire = null
    ctx.expire = (amount, unit = 'seconds') => {
      ctx.$expire = parseExpiry(amount, unit)
    }
  }

  // cookies
  ctx.cookies = {
    get(key) {
      let data = req.cookies[key]
      if (data === null || data === undefined || data === '') {
        return null
      }
      let value
      try {
        value = JSON.parse(data)
      } catch (err) {
        console.error(`could not deserialize cookie ${key} with value:`, data)
        return null
      }
      return value
    },
    set(key, value, options) {
      if (value === null || value === undefined || value === '') {
        req.cookies[key] = null
        ctx.cookies.$changes.push({
          type: 'remove',
          key,
        })
      } else {
        let data
        try {
          data = JSON.stringify(value)
        } catch (err) {
          return console.error(
            `could not serialize cookie ${key} with value:`,
            value
          )
        }
        req.cookies[key] = data
        ctx.cookies.$changes.push({
          type: 'set',
          key,
          data,
          options: options || defaultCookieOptions,
        })
      }
    },
    $changes: [],
    $getChanged() {
      const keys = []
      for (const change of ctx.cookies.$changes) {
        if (!keys.includes(change.key)) {
          keys.push(change.key)
        }
      }
      return keys
    },
    $pushChangesToExpressResponse(res) {
      for (const change of ctx.cookies.$changes) {
        if (change.type === 'set') {
          let { key, data, options } = change
          options = cookieOptionsToExpress(options)
          res.cookie(key, data, options)
        }
        if (change.type === 'remove') {
          let { key } = change
          res.clearCookie(key)
        }
      }
      ctx.cookies.$changes.length = 0
    },
    $pushChangesToStream(inserts) {
      for (const change of ctx.cookies.$changes) {
        if (change.type === 'set') {
          let { key, data, options } = change
          options = JSON.stringify(options)
          inserts.write(`
            <script>globalThis.$firebolt('setCookie', '${key}', ${data}, ${options})</script>
          `)
        }
        if (change.type === 'remove') {
          let { key } = change
          inserts.write(`
            <script>globalThis.$firebolt('setCookie', '${key}', null)</script>
          `)
        }
      }
      ctx.cookies.$changes.length = 0
    },
  }

  ctx.isContext = true

  return ctx
}

function parseExpiry(amount, unit) {
  switch (unit) {
    case 'ms':
    case 'millisecond':
    case 'milliseconds':
      return amount / 1000
    case 's':
    case 'sec':
    case 'second':
    case 'seconds':
      return amount
    case 'd':
    case 'day':
    case 'days':
      return amount * 24 * 60 * 60
    case 'w':
    case 'week':
    case 'weeks':
      return amount * 7 * 24 * 60 * 60
  }
}

function decorate(obj, extras) {
  if (!extras) return
  Object.keys(extras).forEach(key => {
    obj[key] = extras[key]
  })
}
