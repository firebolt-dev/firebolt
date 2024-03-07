import remarkGFM from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'
import { iconsSetup, iconsMiddleware } from '@firebolt-dev/icons'

export default function config() {
  return {
    productionBrowserSourceMaps: true,
    context: {
      foo: 'haha',
    },
    async setup() {
      await iconsSetup()
    },
    middleware: [iconsMiddleware],
    mdx: {
      remarkPlugins: [remarkGFM],
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
              const tokens = str.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)
              tokens?.forEach(token => {
                if (token.includes('=')) {
                  const [key, value] = token.split('=')
                  meta[key] = value.replace(/^["']|["']$/g, '')
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
