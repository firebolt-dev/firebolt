import { css } from 'firebolt'

export function Footer() {
  return (
    <div
      className='footer'
      css={css`
        border-top: 1px solid var(--line-color);
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        .footer-copyright {
          color: var(--text-color-dim);
        }
      `}
    >
      {/* <div className='footer-copyright'>© 2024 Firebolt</div> */}
    </div>
  )
}
