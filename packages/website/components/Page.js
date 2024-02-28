import { Link, css } from 'firebolt'

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
          padding: 70px 30px 0;
          flex: 1;
        }
        .page-footer {
          border-top: 1px solid var(--line-color);
          height: 50px;
          /* margin-bottom: 50px; */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 30px;
        }
        .page-footer-inner {
          display: flex;
          max-width: 1300px;
          width: 100%;
          align-items: center;
        }
        .page-footer-txt {
          font-size: 14px;
          color: var(--text-color-dim);
        }
        .page-footer-gap {
          flex: 1;
        }
      `}
    >
      <Header />
      <div className='page-mid'>
        <div
          css={css`
            width: 100%;
            max-width: 1300px;
            margin: 0 auto;
          `}
        >
          {children}
        </div>
      </div>
      <div className='page-footer'>
        <div className='page-footer-inner'>
          <div className='page-footer-txt'>© 2024</div>
          <div className='page-footer-gap' />
          <div className='page-footer-txt'>
            Created by{' '}
            <Link
              href='https://x.com/ashconnell'
              css='color: var(--primary-color)'
              aria-label='Follow @ashconnell on X'
            >
              @ashconnell
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
