/**
 * Firebolt cookie options:
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

export function cookieToExpressOptions(opts) {
  // convert firebolt cookie options to express cookie options
  let expires = opts.expire
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

export function cookieToCookieJSOptions(options) {
  // convert firebolt cookie options to cookiejs options
  // note: these are the same for now
  return options
}
