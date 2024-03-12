import { ReadStream } from 'fs'
import { Readable } from 'stream'

class FireboltRequest extends Request {
  constructor(input, options) {
    super(input, options)
    this.isFirebolt = true
  }

  static fromExpress(expReq) {
    const protocol = 'http'
    const host = expReq.headers['host'] || 'firebolt'
    const url = new URL(`${protocol}://${host}${expReq.originalUrl}`)
    const pathname = url.pathname
    const href = `${url.pathname}${url.search}`
    const method = expReq.method
    const headers = expReq.headers
    const controller = new AbortController()
    const signal = controller.signal
    if (method === 'GET' || method === 'HEAD') {
      const req = new FireboltRequest(url, {
        method,
        headers,
        signal,
      })
      req.pathname = pathname
      req.href = href
      return req
    }
    const req = new FireboltRequest(url, {
      method,
      headers,
      body: expReq,
      duplex: 'half',
      signal,
    })
    req.pathname = url.pathname
    req.href = href
    return req
  }
}

class FireboltResponse extends Response {
  constructor(body, options) {
    if (body instanceof ReadStream) {
      // converts fs.createReadStream(file) to web ReadableStream
      body = Readable.toWeb(body)
    }
    super(body, options)
  }

  static notFound() {
    return new FireboltResponse('Not found', {
      status: 404,
    })
  }
}

globalThis.Request = FireboltRequest
globalThis.Response = FireboltResponse
