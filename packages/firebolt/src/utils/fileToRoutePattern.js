// see: https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes
// see: https://github.com/molefrog/wouter/blob/main/matcher.js
// see: https://www.npmjs.com/package/path-to-regexp

export function fileToRoutePattern(filePath) {
  // remove extension
  filePath = filePath.split('.')
  filePath.pop()
  filePath = filePath.join('')
  // split by _ and trim empties
  filePath = filePath.split('_').filter(seg => !!seg)
  // conversion
  const pattern = filePath
    .map(segment => {
      // /index -> /
      if (segment.endsWith('/index')) {
        segment = segment.replace('/index', '')
        return segment
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
    .join('/')
  return pattern
}
