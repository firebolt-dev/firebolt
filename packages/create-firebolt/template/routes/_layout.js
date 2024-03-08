import { css } from 'firebolt'
import { Icons } from 'firebolt/icons'

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Icons />
        <style
          global={css`
            :root {
              // ...
            }
          `}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
