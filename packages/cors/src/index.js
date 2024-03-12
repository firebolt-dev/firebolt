// a modified version of CORS from hono
// see: https://github.com/honojs/hono/blob/main/src/middleware/cors/index.ts

export default function cors(options) {
  const middleware = createMiddleware(options)
  return config => {
    return {
      ...config,
      middleware: [middleware, ...config.middleware],
    }
  }
}

function createMiddleware(options) {
  const defaults = {
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
    allowHeaders: [],
    exposeHeaders: [],
  }
  const opts = {
    ...defaults,
    ...options,
  }

  const findAllowOrigin = (optsOrigin => {
    if (typeof optsOrigin === 'string') {
      return () => optsOrigin
    } else if (typeof optsOrigin === 'function') {
      return optsOrigin
    } else {
      return origin => (optsOrigin.includes(origin) ? origin : optsOrigin[0])
    }
  })(opts.origin)

  return async function cors(req, ctx) {
    function set(key, value) {
      ctx.headers.set(key, value)
    }

    const allowOrigin = findAllowOrigin(req.headers.get('Origin') || '')
    if (allowOrigin) {
      set('Access-Control-Allow-Origin', allowOrigin)
    }

    // Suppose the server sends a response with an Access-Control-Allow-Origin value with an explicit origin (rather than the "*" wildcard).
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    if (opts.origin !== '*') {
      set('Vary', 'Origin')
    }

    if (opts.credentials) {
      set('Access-Control-Allow-Credentials', 'true')
    }

    if (opts.exposeHeaders?.length) {
      set('Access-Control-Expose-Headers', opts.exposeHeaders.join(','))
    }

    if (req.method === 'OPTIONS') {
      if (opts.maxAge != null) {
        set('Access-Control-Max-Age', opts.maxAge.toString())
      }

      if (opts.allowMethods?.length) {
        set('Access-Control-Allow-Methods', opts.allowMethods.join(','))
      }

      let headers = opts.allowHeaders
      if (!headers?.length) {
        const requestHeaders = req.headers.get('Access-Control-Request-Headers')
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/)
        }
      }
      if (headers?.length) {
        set('Access-Control-Allow-Headers', headers.join(','))
        ctx.headers.append('Vary', 'Access-Control-Request-Headers')
      }

      ctx.headers.delete('Content-Length')
      ctx.headers.delete('Content-Type')

      return new Response(null, {
        headers: ctx.headers,
        status: 204,
        statusText: 'No Content',
      })
    }
  }
}
