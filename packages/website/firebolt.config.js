import remarkGFM from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'
import icons from '@firebolt-dev/icons'

export const config = {
  plugins: [icons()],
  productionBrowserSourceMaps: true,
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
