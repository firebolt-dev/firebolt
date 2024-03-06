import remarkGFM from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'

export default function config() {
  return {
    productionBrowserSourceMaps: true,
    context: {
      foo: 'haha',
    },
    middleware: [
      // (req, ctx) => {
      //   console.log('mw1')
      //   ctx.headers['Foo'] = 'Boooo!'
      //   // ctx.cookies.set('theme', 'light')
      // },
      // (req, ctx) => {
      //   console.log('middle 1')
      //   console.log('req', req)
      //   console.log('ctx', ctx)
      //   console.log(req.pathname)
      //   ctx.headers['Bar'] = 'BAHHHH'
      //   return new Response('HAHA', {
      //     status: 201,
      //     headers: {
      //       'Content-Type': 'text/plain',
      //     },
      //   })
      // },
    ],
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
