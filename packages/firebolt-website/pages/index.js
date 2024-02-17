import { useCookie, css } from 'firebolt'

import { Page } from '../components/Page'

export default function Home() {
  const [theme, setTheme] = useCookie('theme', 'system')
  return (
    <Page>
      <div>{theme}</div>
      <div onClick={() => setTheme('dark')}>Go Dark</div>
      <div onClick={() => setTheme('light')}>Go Light</div>
      <div onClick={() => setTheme(null)}>Go System</div>
      <div>Home</div>
      <div
        css={css`
          font-weight: 500;
        `}
      >
        Font Weight 500
      </div>
      <div
        css={css`
          font-weight: 600;
        `}
      >
        Font Weight 600
      </div>
      <div
        css={css`
          font-weight: 700;
        `}
      >
        Font Weight 700
      </div>
      <div
        css={css`
          font-size: 16px;
        `}
      >
        Font Size 16px
      </div>
    </Page>
  )
}
