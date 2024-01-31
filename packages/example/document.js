import { Meta } from 'galaxy'

export function Document({ children }) {
  return (
    <html lang='en'>
      <head>
        <Meta />
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
      </head>
      <body>{children}</body>
    </html>
  )
}
