export default function config() {
  return {
    port: 3000,
    productionBrowserSourceMaps: true,
    async middleware(req) {
      // ...
    },
  }
}
