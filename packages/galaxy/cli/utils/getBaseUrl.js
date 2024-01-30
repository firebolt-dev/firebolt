export function getBaseUrl(filePath) {
  let baseUrl = filePath.split('.').slice(0, -1).join('')
  if (baseUrl.endsWith('/index')) {
    baseUrl = baseUrl.slice(0, -6)
  }
  if (baseUrl === '') {
    baseUrl = '/'
  }
  return baseUrl
}
