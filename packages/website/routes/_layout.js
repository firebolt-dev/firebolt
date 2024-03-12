import { Icons } from '@firebolt-dev/icons'

import { GlobalStyles } from '@/components/GlobalStyles'
import { Analytics } from '@/components/Analytics'

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link
          rel='preload'
          href='/roboto-flex.woff2'
          as='font'
          type='font/woff2'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          href='/roboto-mono.woff2'
          as='font'
          type='font/woff2'
          crossOrigin='anonymous'
        />
        <GlobalStyles />
        <Analytics />
        <Icons />
      </head>
      <body>{children}</body>
    </html>
  )
}
