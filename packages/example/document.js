import { Meta, Router } from 'galaxy'

export function Document() {
  return (
    <html lang='en'>
      <head>
        <Meta />
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
      </head>
      <body>
        <Router />
      </body>
    </html>
  )
}
