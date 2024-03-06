import { Readable } from 'stream'

export function webToExpressResponse(webRes, expRes) {
  webRes.headers.forEach((value, key) => {
    expRes.setHeader(key, value)
  })
  expRes.status(webRes.status)
  if (webRes.body) {
    Readable.fromWeb(webRes.body).pipe(expRes)
  } else {
    expRes.end()
  }
}

export function expressToWebRequest(req) {
  const pathname = req.originalUrl
  const url = 'http://firebolt' + pathname
  const method = req.method
  const headers = req.headers
  let body
  if (method !== 'GET' && method !== 'HEAD') {
    body = Readable.toWeb(req)
  }
  const request = new Request(url, {
    method,
    headers,
    body,
  })
  request.pathname = pathname // helper
  return request
}

class FireboltRequest extends Request {}
