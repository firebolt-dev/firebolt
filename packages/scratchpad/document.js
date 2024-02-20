import { css } from 'firebolt'

export function Document({ children }) {
  return (
    <html lang='en'>
      <title key='title'>Firebolt</title>
      <meta charSet='utf-8' />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      {/* <Style>{styles}</Style> */}
      <body>{children}</body>
    </html>
  )
}

const styles = css`
  html {
    border: 5px solid red;
  }
`
