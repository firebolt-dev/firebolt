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
          .home-features {
            display: flex;
            flex-wrap: wrap;
            margin: -8px -8px 0;
          }
          .home-feature {
            flex-basis: 33.333%;
            padding: 8px;
          }
          .home-feature-inner {
            border: 1px solid var(--line-color);
            border-radius: 8px;
            padding: 20px;
            h1 {
              font-size: 22px;
              font-weight: 700;
              margin: 0 0 16px;
            }
            p {
              // ...
            }
          }
        `}
      >
        <h1 className='home-title'>The Simple React Framework</h1>
        <p className='home-tag'>
          Everything you need to rapidly build full-stack apps for the web, with
          ease.
        </p>
        <Link href='/docs' className='home-cta'>
          <span>Get Started</span>
        </Link>
        <div className='home-install'>
          <ChevronRight className='home-install-chevron' size={20} />
          <span className='home-install-text'>npm create firebolt</span>
          <Copy className='home-install-copy' size={16} />
        </div>
        <div className='home-features'>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>Powerful Simplicity</h1>
              <p>
                All the power of a super framework with none of the overwhelming
                complexity. It's just React!
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>Micro Runtime</h1>
              <p>
                Firebolt's ultra-compact 10 KB runtime ensures your app has the
                smallest overhead of any framework.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>Parallel Streaming</h1>
              <p>
                Full Server-side rendering and parallel streaming means your
                pages load fast and your SEO skyrockets!
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>Actions & Loaders</h1>
              <p>
                Interact with your database directly inside your components.
                Forget about building APIs.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>CSS-in-JS</h1>
              <p>
                Ready to go, first class support for CSS-in-JS that works
                flawlessly with SSR and Streaming.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>Cookies, Baked.</h1>
              <p>
                Next level, bi-directional cookie synchronization that keeps
                your code clean and simple.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
