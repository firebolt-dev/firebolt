import { createCookies } from './cookies'

export function createContext({ expReq, expRes, defaultCookieOptions, base }) {
  const ctx = {}

  decorate(ctx, base)

  ctx.isContext = true

  ctx.type = null

  ctx.req = Request.fromExpress(expReq)

  ctx.expRes = expRes

  ctx.cookies = createCookies(ctx.req, defaultCookieOptions)

  // type: handler
  ctx.params = null

  // type: action
  ctx.$invalidations = []
  ctx.invalidate = (...args) => {
    ctx.$invalidations.push(args)
  }

  // type: loader, action
  ctx.error = code => {
    ctx.$errorCode = code
    throw ctx
  }

  // type: middleware
  ctx.headers = new Headers()

  // type: loader, action
  ctx.redirect = (url, mode = 'push') => {
    ctx.$redirect = { url, mode }
    throw ctx
  }
  ctx.$applyRedirectToExpressResponse = () => {
    if (!ctx.$redirect) return
    /**
     * during ssr if we need to redirect, we have to do it using a script
     * because the response is already streaming :)
     *
     * NOTE: we write directly to the response and flush it so that we don't get a flash
     * of the rendering before it redirects.
     */
    if (ctx.$redirect.mode === 'replace') {
      expRes.write(`
              <script>window.location.replace('${ctx.$redirect.url}')</script>
            `)
      expRes.flush()
    }
    if (ctx.$redirect.mode === 'push') {
      /**
       * NOTE: it appears that this does not push a new route to the history and instead replaces it.
       * this is likely because the location changes BEFORE the html document has finished streaming.
       */
      expRes.write(`
              <script>window.location.href = '${ctx.$redirect.url}'</script>
            `)
      expRes.flush()
    }
  }

  // type: loader
  ctx.$expire = null
  ctx.expire = (amount, unit = 'seconds') => {
    ctx.$expire = parseExpiry(amount, unit)
  }

  ctx.send = async res => {
    // apply headers from along the way
    ctx.headers.forEach((value, key) => {
      expRes.setHeader(key, value)
    })
    // apply headers from response
    res.headers.forEach((value, key) => {
      expRes.setHeader(key, value)
    })
    // apply cookie changes
    ctx.cookies.$pushChangesToExpressResponse(expRes)
    // apply status
    expRes.status(res.status)
    // apply body
    const body = res.body
    if (body == null) {
      expRes.end()
      return
    }
    // expRes?.socket?.setTimeout?.(0)
    // expRes?.socket?.setNoDelay?.(true)
    // expRes?.socket?.setKeepAlive?.(true)
    const isReadable = !!body.read
    if (isReadable) {
      expRes.once('close', () => {
        body.destroy()
      })
      body.pipe(expRes)
      return
    }
    const isAsyncIterable =
      !!body &&
      typeof body === 'object' &&
      typeof body[Symbol.asyncIterator] === 'function'
    if (isAsyncIterable) {
      for await (const chunk of body) {
        if (!expRes.write(chunk)) {
          break
        }
      }
      expRes.end()
    }
    // apply body
    // if (res.body) {
    //   Readable.fromWeb(res.body).pipe(expRes)
    // } else {
    //   expRes.end()
    // }
  }

  ctx.sendFile = path => {
    // apply headers from along the way
    ctx.headers.forEach((value, key) => {
      expRes.setHeader(key, value)
    })
    // send file
    expRes.sendFile(path)
  }

  ctx.new = () => {
    // fresh cookies and headers
    return createContext({
      expReq,
      expRes,
      defaultCookieOptions,
      base,
    })
  }

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
