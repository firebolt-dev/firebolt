import { Icons } from '@firebolt-dev/icons'

import { Styles } from '@/components/Styles'
import { Analytics } from '@/components/Analytics'

export default function Document({ children }) {
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
          crossOrigin='true'
        />
        <link
          rel='preload'
          href='/roboto-mono.woff2'
          as='font'
          type='font/woff2'
          crossOrigin='true'
        />
        <Icons />
        <Styles />
        <Analytics />
      </head>
      <body>{children}</body>
    </html>
  )
}
