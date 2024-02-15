import { Head, Style, css } from 'firebolt'

export function Document({ children }) {
  return (
    <html lang='en'>
      <Head>
        <title key='title'>__projectName__</title>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' sizes='32x32' />
        <link rel='icon' href='/icon.svg' type='image/svg+xml' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        <link rel='manifest' href='/manifest.webmanifest' />
        <Style>{styles}</Style>
      </Head>
      <body>{children}</body>
    </html>
  )
}

const styles = css`
  html {
    border: 5px solid red;
  }
`
