import { css } from 'firebolt'

export default function NotFound() {
  return (
    <>
      <title>Not Found</title>
      <div
        css={css`
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          h1 {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 12px;
          }
          p {
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            padding: 12px 0 0;
          }
        `}
      >
        <h1>404</h1>
        <p>Page not found</p>
      </div>
    </>
  )
}
