// see: https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes
// see: https://github.com/molefrog/wouter/blob/main/matcher.js
// see: https://www.npmjs.com/package/path-to-regexp

export function fileToRoutePath(filePath) {
  // remove extension
  filePath = filePath.split('.').slice(0, -1).join('')
  // split by /
  filePath = filePath.split('/')
  // conversion
  const routePath = filePath
    .map(segment => {
      // index -> /
      if (segment === 'index') {
        return ''
      }
      // Optional Catch-all (zero more more)
      // converts [[...segment]] into :segment*
      if (segment.startsWith('[[...') && segment.endsWith(']]')) {
        segment = segment.slice(5)
        segment = segment.slice(0, -2)
        return `:${segment}*`
      }
      // Catch-all (one or more)
      // converts [...segment] into :segment+
      if (segment.startsWith('[...') && segment.endsWith(']')) {
        segment = segment.slice(4)
        segment = segment.slice(0, -1)
        return `:${segment}+`
      }
      // Match
      if (segment.startsWith('[') && segment.endsWith(']')) {
        segment = segment.slice(1)
        segment = segment.slice(0, -1)
        return `:${segment}`
      }
      return segment
    })
    .join('/')
  return routePath
}
