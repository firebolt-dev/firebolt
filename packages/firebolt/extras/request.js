export class Request {
  constructor(req) {
    this.url = req.url
    this.cookies = new Cookies(req)
    this._redirect = null
    this._expire = null
  }

  error(data) {
    this._error = data
    throw this
  }

  redirect(url, status = 303) {
    this._redirect = { url, status }
    throw this
  }

  expire(amount, unit = 'seconds') {
    if (!unitToSeconds[unit]) {
      throw new Error(`Invalid expire unit: ${unit}`)
    }
    this._expire = unitToSeconds[unit](amount)
  }
}

class Cookies {
  constructor(req) {
    this._values = req.cookies
    this._changes = []
  }

  set(key, value, options = defaultCookieOptions) {
    try {
      value = JSON.stringify(value)
    } catch (err) {
      // ...
    }
    this._values[key] = value
    this._changes.push({
      type: 'set',
      key,
      value,
      options,
    })
  }

  get(key) {
    let value = this._values[key]
    try {
      value = JSON.parse(value)
    } catch (err) {
      // ...
    }
    return value
  }

  remove(key) {
    delete this._values[key]
    this._changes.push({ type: 'remove', key })
  }

  _apply(res) {
    for (const change of this._changes) {
      if (change.type === 'set') {
        res.cookie(change.key, change.value, change.options)
      }
      if (change.type === 'remove') {
        res.clearCookie(change.key)
      }
    }
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
