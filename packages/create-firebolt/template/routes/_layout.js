import { css } from 'firebolt'

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' sizes='32x32' />
        <link rel='icon' href='/icon.svg' type='image/svg+xml' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        <link rel='manifest' href='/manifest.webmanifest' />
        <style
          global={css`
            :root {
              background-color: blue; // todo
            }
          `}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
