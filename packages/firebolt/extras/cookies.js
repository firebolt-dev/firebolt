import cookie from 'cookie'

/**
 * Cookie options in firebolt are the same as cookiejs in the browser.
 * When working with cookies on the server, we need to convert the options
 * to work with express response api.
 *
 * expires: Number|Date
 * - default null (session storage)
 * - if set to a number the cookie will expire in that many days
 * - if set to a date the cookie will expire at that date
 *
 * path: String
 * - defaults to '/'
 *
 * domain: String
 * - default null
 *
 * secure: Boolean
 * - default false
 *
 * sameSite: String
 * - default 'lax'
 * - can be 'lax', 'strict', 'none'
 *
 *
 */

export function cookieOptionsToExpress(opts) {
  if (!opts) return opts
  // convert firebolt cookie options to express cookie options
  let expires = opts.expires
  if (typeof expires === 'number') {
    const date = new Date()
    date.setDate(date.getDate() + expires) // add days
    expires = date
  }
  return {
    expires,
    path: opts.path,
    domain: opts.domain,
    secure: opts.secure,
    sameSite: opts.sameSite,
  }
}

export function createCookies(req, defaultCookieOptions) {
  const cookies = cookie.parse(req.headers.get('Cookie') || '')
  const changes = []
  return {
    get(key) {
      let data = cookies[key]
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
        cookies[key] = null
        changes.push({
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
        cookies[key] = data
        changes.push({
          type: 'set',
          key,
          data,
          options: options || defaultCookieOptions,
        })
      }
    },
    // TODO: rename .getChangedKeys()
    $getChanged() {
      const keys = []
      for (const change of changes) {
        if (!keys.includes(change.key)) {
          keys.push(change.key)
        }
      }
      return keys
    },
    // TODO: rename no $
    $pushChangesToExpressResponse(res) {
      for (const change of changes) {
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
      changes.length = 0
    },
    // TODO: rename no $
    $pushChangesToStream(inserts) {
      for (const change of changes) {
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
      changes.length = 0
    },
  }
}
