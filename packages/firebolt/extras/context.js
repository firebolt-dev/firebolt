import send from 'send'
import { Readable } from 'stream'

import { createCookies } from './cookies'

export function createContext({ expReq, expRes, defaultCookieOptions, base }) {
  const ctx = {}

  decorate(ctx, base)

  ctx.isContext = true

  ctx.type = null // middleware, handler, loader, action

  ctx.req = Request.fromExpress(expReq)

  ctx.expReq = expReq
  ctx.expRes = expRes

  ctx.cookies = createCookies(ctx.req, defaultCookieOptions)

  // type: middleware
  ctx.headers = new Headers()

  // type: handler
  ctx.params = null

  // type: action
  ctx.$invalidations = []
  ctx.invalidate = (...args) => {
    if (!['action'].includes(ctx.type)) {
      throw new Error('ctx.invalidate() can only be used inside an action')
    }
    ctx.$invalidations.push(args)
  }

  // type: loader, action
  ctx.error = code => {
    if (!['loader', 'action'].includes(ctx.type)) {
      throw new Error('ctx.error() can only be used inside an action or loader')
    }
    throw new ContextError(code, `An error occurred in a ${ctx.type}`)
  }

  // type: loader, action
  ctx.redirect = (url, mode) => {
    if (!['loader', 'action'].includes(ctx.type)) {
      throw new Error(
        'ctx.redirect() can only be used inside an action or loader'
      )
    }
    throw new ContextRedirect(url, mode)
  }

  // type: loader
  ctx.$expire = null
  ctx.expire = (amount, unit = 'seconds') => {
    if (!['loader'].includes(ctx.type)) {
      throw new Error('ctx.expire() can only be used inside a loader')
    }
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
    let body = res.body
    if (!body) {
      expRes.end()
      return
    }
    // expRes?.socket?.setTimeout?.(0)
    // expRes?.socket?.setNoDelay?.(true)
    // expRes?.socket?.setKeepAlive?.(true)
    if (body instanceof ReadableStream) {
      body = Readable.fromWeb(body)
    }
    const isReadable = body instanceof Readable
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
  }

  ctx.sendFile = path => {
    // apply headers from along the way
    ctx.headers.forEach((value, key) => {
      expRes.setHeader(key, value)
    })
    // send file
    const opts = {
      lastModified: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    }
    const stream = send(expReq, path, opts)
    stream.pipe(expRes)
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

export class ContextRedirect {
  constructor(url, mode = 'push') {
    this.url = url
    this.mode = mode
  }

  applyToExpressResponse(expRes) {
    /**
     * during ssr if we need to redirect, we have to do it using a script
     * because the response is already streaming :)
     *
     * NOTE: we write directly to the response and flush it so that we don't get a flash
     * of the rendering before it redirects.
     */
    if (this.mode === 'replace') {
      expRes.write(`
        <script>window.location.replace('${this.url}')</script>
      `)
      expRes.flush()
    }
    if (this.mode === 'push') {
      /**
       * NOTE: it appears that this does not push a new route to the history and instead replaces it.
       * this is likely because the location changes BEFORE the html document has finished streaming.
       */
      expRes.write(`
        <script>window.location.href = '${this.url}'</script>
      `)
      expRes.flush()
    }
  }
}

export class ContextError extends Error {
  constructor(code, message) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}
