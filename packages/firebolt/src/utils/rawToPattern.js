// see: https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes
// see: https://github.com/molefrog/wouter/blob/main/matcher.js
// see: https://www.npmjs.com/package/path-to-regexp

export function rawToPattern(rawPattern) {
  const segments = rawPattern.split('/')
  const pattern = segments
    .map(segment => {
      // ''
      if (segment === '') {
        return ''
      }
      // index
      if (segment === 'index') {
        return ''
      }
      // dynamic
      if (segment.startsWith('$')) {
        segment = segment.slice(1)
        segment = ':' + segment
      }
      // one or more
      if (segment.endsWith('+')) {
        // ...
      }
      // zero or more
      if (segment.endsWith('-')) {
        segment = segment.slice(0, -1)
        segment = segment + '*'
      }
      return segment
    })
    .filter(v => !!v)
    .join('/')
  return '/' + pattern
}
