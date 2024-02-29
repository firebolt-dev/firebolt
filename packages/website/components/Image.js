import { css } from 'firebolt'

export function Image({ ratio = 1, ...props }) {
  return (
    <div
      css={css`
        position: relative;
        padding-bottom: ${ratio * 100}%;
        border-radius: 10px;
        overflow: hidden;
        img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
      `}
    >
      <img {...props} />
    </div>
  )
}
