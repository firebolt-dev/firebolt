import { css } from 'firebolt'

export function Heading1({ children }) {
  return (
    <h1
      css={css`
        font-size: 48px;
        font-weight: 700;
        margin-bottom: 32px;
      `}
    >
      {children}
    </h1>
  )
}

export function Heading2({ children }) {
  return (
    <h2
      css={css`
        font-size: 24px;
        font-weight: 700;
        margin-top: 32px;
        margin-bottom: 16px;
      `}
    >
      {children}
    </h2>
  )
}

export function Heading3({ children }) {
  return (
    <h3
      css={css`
        font-size: 20px;
        font-weight: 700;
        margin-top: 32px;
        margin-bottom: 16px;
      `}
    >
      {children}
    </h3>
  )
}

export function Paragraph({ children }) {
  return (
    <p
      css={css`
        margin: 0 0 16px;
      `}
    >
      {children}
    </p>
  )
}

export function Code({ children }) {
  return (
    <div
      css={css`
        border: 1px solid var(--line-color);
        margin: 16px 0;
        padding: 16px;
        border-radius: 8px;
      `}
    >
      {children}
    </div>
  )
}
