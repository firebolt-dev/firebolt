import { Meta, Router, Style, css } from 'firebolt'

export function Document() {
  return (
    <html lang='en'>
      <head>
        <Meta />
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Style>{styles}</Style>
      </head>
      <body>
        <Router />
      </body>
    </html>
  )
}

const styles = css`
  html {
    border: 5px solid red;
  }
`
