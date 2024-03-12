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

globalThis.Request = FireboltRequest
