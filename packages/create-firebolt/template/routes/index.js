import { css } from 'firebolt'

export default function Home() {
  return (
    <div
      css={css`
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        img {
          width: 180px;
          height: auto;
        }
        p {
          margin: 40px 0;
        }
        code {
          border-radius: 6px;
          padding: 4px 6px;
          background: rgba(0, 0, 0, 0.05);
        }
      `}
    >
      <title>Firebolt App</title>
      <img src='logo.svg' />
      <p>
        Edit <code>routes/index.js</code> to get started.
      </p>
    </div>
  )
}
