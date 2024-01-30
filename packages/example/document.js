// import { Router } from 'galaxy'

export function Document({ title, description, children }) {
  return (
    <html>
      <head>
        <title>{title || 'My App'}</title>
        <meta name='description' content={description} />
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        {/* <link rel='stylesheet' href='/styles.css'></link> */}
      </head>
      <body>{children}</body>
      {/* <body>
        <Router />
      </body> */}
    </html>
  )
}
