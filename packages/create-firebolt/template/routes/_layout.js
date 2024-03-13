import { css } from 'firebolt'
import { Icons } from '@firebolt-dev/icons'

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <style
          global={css`
            :root {
              font-family: sans-serif;
            }
          `}
        />
        <Icons />
      </head>
      <body>{children}</body>
    </html>
  )
}
