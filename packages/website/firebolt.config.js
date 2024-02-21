import rehypeShiki from '@shikijs/rehype'

export default function config() {
  return {
    port: 3000,
    productionBrowserSourceMaps: true,
    async middleware(req) {
      // ...
    },
    mdx: {
      rehypePlugins: [
        [
          rehypeShiki,
          {
            themes: {
              light: 'github-light',
              dark: 'github-dark',
            },
            defaultColor: false,
            // cssVariablePrefix: '--shiki-x-',
            parseMetaString(str) {
              const meta = {}
              const tokens = str.match(/(?:[^\s"]+|"[^"]*")+/g)
              tokens?.forEach(token => {
                if (token.includes('=')) {
                  const [key, value] = token.split('=')
                  meta[key] = value.replace(/^"|"$/g, '')
                } else {
                  meta[token] = true
                }
              })
              return meta
            },
          },
        ],
      ],
    },
  }
}
