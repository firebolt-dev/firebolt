import { css } from 'firebolt'

import { Header } from './Header'

export function Page({ children }) {
  return (
    <div
      className='page'
      css={css`
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        .page-mid {
          padding: 70px 20px 0;
          flex: 1;
        }
        .page-footer {
          border-top: 1px solid var(--line-color);
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .page-footer-copyright {
          font-size: 14px;
          color: var(--text-color-dim);
        }
      `}
    >
      <Header />
      <div className='page-mid'>
        <div
          css={css`
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
          `}
        >
          {children}
        </div>
      </div>
      <div className='page-footer'>
        <div className='page-footer-copyright'>© 2024 Firebolt</div>
      </div>
    </div>
  )
}
