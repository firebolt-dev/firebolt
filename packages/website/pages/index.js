import { Link, useCookie, css } from 'firebolt'

import { Page } from '../components/Page'
import { ChevronRight, Copy } from 'lucide-react'

export default function Home() {
  const [theme, setTheme] = useCookie('theme', 'system')
  return (
    <Page>
      <div
        className='home'
        css={css`
          display: flex;
          flex-direction: column;
          align-items: stretch;
          .home-title {
            margin: 150px 0 60px;
            max-width: 1016px;
            align-self: center;
            font-size: 80px;
            font-weight: 700;
            text-align: center;
            line-height: 1.1;
          }
          .home-tag {
            text-align: center;
            font-size: 21px;
            margin: 0 0 60px;
          }
          .home-cta {
            align-self: center;
            height: 50px;
            width: 300px;
            border-radius: 8px;
            background-color: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 0 12px;
            span {
              color: white;
              font-weight: 700;
            }
          }
          .home-install {
            padding: 0 8px;
            margin: 0 0 120px;
            align-self: center;
            width: 300px;
            height: 34px;
            border: 1px solid var(--line-color);
            border-radius: 8px;
            display: flex;
            align-items: center;
          }
          .home-install-chevron {
            // ..
          }
          .home-install-text {
            flex: 1;
            font-size: 14px;
            font-family: 'Roboto Mono', monospace;
            font-weight: 400;
            line-height: 1;
            text-align: center;
          }
          .home-install-copy {
            color: var(--icon-color-dim);
          }
        `}
      >
        <h1 className='home-title'>
          The React Framework for getting things done
        </h1>
        <p className='home-tag'>
          Build anything for the web, easily, without any fuss.
        </p>
        <Link to='/docs'>
          <a className='home-cta'>
            <span>Get Started</span>
          </a>
        </Link>
        <div className='home-install'>
          <ChevronRight className='home-install-chevron' size={20} />
          <span className='home-install-text'>npx create-firebolt</span>
          <Copy className='home-install-copy' size={16} />
        </div>
      </div>
    </Page>
  )
}
