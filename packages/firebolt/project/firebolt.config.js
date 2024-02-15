export default function config() {
  return {
    port: 3000,
    external: [],
    productionBrowserSourceMaps: true,
    async middleware(req) {
      // ...
    },
  }
}
