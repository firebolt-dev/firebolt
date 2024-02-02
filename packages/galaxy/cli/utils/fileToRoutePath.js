// see: https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes
// see: https://github.com/molefrog/wouter/blob/main/matcher.js
// see: https://www.npmjs.com/package/path-to-regexp

export function fileToRoutePath(filePath) {
  // remove extension
  filePath = filePath.split('.')
  filePath.pop()
  // join back with . to /
  filePath = filePath.join('/')
  // now split by /
  filePath = filePath.split('/')
  // conversion
  const routePath = filePath
    .map(segment => {
      // index -> /
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
    .join('/')
  return routePath
}
