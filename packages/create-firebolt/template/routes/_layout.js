import { css } from 'firebolt'

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' />
        <style
          global={css`
            :root {
              font-family: sans-serif;
            }
          `}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
