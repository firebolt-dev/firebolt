import { cookieToExpressOptions } from './cookies'

export class Request {
  constructor(req) {
    this.url = req.url
    this.cookies = new Cookies(req)
    this._redirect = null
    this._expire = null
  }

  expire(amount, unit = 'seconds') {
    if (!unitToSeconds[unit]) {
      throw new Error(`Invalid expire unit: ${unit}`)
    }
    this._expire = unitToSeconds[unit](amount)
  }

  redirect(url, type = 'push') {
    this._redirect = { url, type }
    throw this
  }

  error(data) {
    this._error = data
    throw this
  }

  applyRedirectToExpressResponse(res) {
    if (this._redirect) {
      // during ssr if we need to redirect, we have to do it using a script
      // because the response is already streaming :)
      //
      // NOTE: we write directly to the response and flush it so that we don't get a flash
      // of the rendering before it redirects.
      if (this._redirect.type === 'replace') {
        res.write(`
          <script>window.location.replace('${this._redirect.url}')</script>
        `)
        res.flush()
        return true
      }
      if (this._redirect.type === 'push') {
        // note: it appears that this does not push a new route to the history and instead replaces it.
        // this is likely because the location changes BEFORE the html document has finished streaming.
        res.write(`
          <script>window.location.href = '${this._redirect.url}'</script>
        `)
        res.flush()
        return true
      }
    }
  }
}

class Cookies {
  constructor(req) {
    this._values = req.cookies
    this._changes = []
  }

  set(key, value, options = defaultCookieOptions) {
    // console.log('setCookie', { key, value, options })
    if (value === null || value === undefined || value === '') {
      this._values[key] = null
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
      this._values[key] = value
      this._changes.push({
        type: 'set',
        key,
        data,
        options,
      })
    }
  }

  get(key) {
    let data = this._values[key]
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
    // console.log('getCookie', { key, value })
    return value
  }

  getChangedKeys() {
    const keys = []
    for (const change of this._changes) {
      if (!keys.includes(change.key)) {
        keys.push(change.key)
      }
    }
    return keys
  }

  applyToExpressResponse(res) {
    for (const change of this._changes) {
      if (change.type === 'set') {
        let { key, data, options } = change
        options = cookieToExpressOptions(options)
        res.cookie(key, data, options)
      }
      if (change.type === 'remove') {
        let { key } = change
        res.clearCookie(key)
      }
    }
    this._changes.length = 0
  }

  applyToStream(inserts) {
    for (const change of this._changes) {
      if (change.type === 'set') {
        let { key, data, options } = change
        options = JSON.stringify(cookieToExpressOptions(options))
        inserts.write(`
          <script>globalThis.$firebolt.push('setCookie', '${key}', ${data}, ${options})</script>
        `)
      }
      if (change.type === 'remove') {
        let { key } = change
        inserts.write(`
          <script>globalThis.$firebolt.push('setCookie', '${key}', null)</script>
        `)
      }
    }
    this._changes.length = 0
  }
}

const defaultCookieOptions = {
  // ...
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
