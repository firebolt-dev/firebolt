/**
 * Cookie options in firebolt are the same as cookiejs in the browser.
 * When working with cookies on the server, we need to convert the options
 * to work with express response api.
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

export function cookieOptionsToExpress(opts) {
  if (!opts) return opts
  // convert firebolt cookie options to express cookie options
  let expires = opts.expires
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
