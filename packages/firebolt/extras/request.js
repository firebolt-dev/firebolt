import { cookieOptionsToExpress } from './cookies'

export class FireboltRequest extends Request {
  constructor({ ctx, xReq, defaultCookieOptions, params }) {
    const url = `${xReq.protocol}://${xReq.get('host')}${xReq.originalUrl}`

    const options = {
      method: xReq.method,
      headers: xReq.headers,
      body: ['POST', 'PUT', 'PATCH'].includes(xReq.method)
        ? xReq.body
        : undefined,
    }

    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body)
      options.headers['Content-Type'] = 'application/json'
    }

    super(url, options)

    this._ctx = ctx
    this._xReq = xReq
    this._invalidations = []

    this.params = params
    this.cookies = new Cookies(xReq, defaultCookieOptions)
  }

  invalidate(...args) {
    this._invalidations.push(args)
  }

  error(data, message) {
    if (this._ctx === 'api') {
      return console.error('API Routes do not support req.error()')
    }
    this._errorInfo = { name: 'RequestError', data, message }
    throw this
  }

  redirect(url, type = 'push') {
    if (this._ctx === 'api') {
      return console.error('API Routes do not support req.redirect()')
    }
    this._redirectInfo = { url, type }
    throw this
  }

  expire(amount, unit = 'seconds') {
    // todo: warn if not loader
    this._expire = unitToSeconds[unit](amount)
  }

  _applyRedirectToExpressResponse(res) {
    if (!this._redirectInfo) return
    /**
     * during ssr if we need to redirect, we have to do it using a script
     * because the response is already streaming :)
     *
     * NOTE: we write directly to the response and flush it so that we don't get a flash
     * of the rendering before it redirects.
     */
    if (this._redirectInfo.type === 'replace') {
      res.write(`
            <script>window.location.replace('${this._redirectInfo.url}')</script>
          `)
      res.flush()
    }
    if (this._redirectInfo.type === 'push') {
      /**
       * NOTE: it appears that this does not push a new route to the history and instead replaces it.
       * this is likely because the location changes BEFORE the html document has finished streaming.
       */
      res.write(`
            <script>window.location.href = '${this._redirectInfo.url}'</script>
          `)
      res.flush()
    }
  }
}

class Cookies {
  constructor(xReq, defaultCookieOptions) {
    this._xReq = xReq
    this._defaultCookieOptions = defaultCookieOptions
    this._changes = []
  }

  set(key, value, options) {
    if (value === null || value === undefined || value === '') {
      this._xReq.cookies[key] = null
      this._changes.push({
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
      this._xReq.cookies[key] = data
      this._changes.push({
        type: 'set',
        key,
        data,
        options: options || this._defaultCookieOptions,
      })
    }
  }

  get(key) {
    let data = this._xReq.cookies[key]
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
  }

  _getChanged() {
    const keys = []
    for (const change of this._changes) {
      if (!keys.includes(change.key)) {
        keys.push(change.key)
      }
    }
    return keys
  }

  _pushChangesToExpressResponse(res) {
    for (const change of this._changes) {
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
    this._changes.length = 0
  }

  _pushChangesToStream(inserts) {
    for (const change of this._changes) {
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
    this._changes.length = 0
  }
}

export class FireboltResponse extends Response {
  constructor(body, options) {
    super(body, options)
    this.foo = true
  }

  applyToExpressResponse(res) {
    this.headers.forEach((value, name) => {
      res.setHeader(name, value)
    })
    res.status(this.status)
    this.body.pipe(res)
  }
}

const unitToSeconds = {
  ms(amount) {
    return amount / 1000
  },
  s(amount) {
    return amount
  },
  d(amount) {
    return amount * 24 * 60 * 60
  },
  w(amount) {
    return amount * 7 * 24 * 60 * 60
  },
  milliseconds(amount) {
    return amount / 1000
  },
  seconds(amount) {
    return amount
  },
  days(amount) {
    return amount * 24 * 60 * 60
  },
  weeks(amount) {
    return amount * 7 * 24 * 60 * 60
  },
}
