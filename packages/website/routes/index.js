import { useState } from 'react'
import { Link, useCookie, css } from 'firebolt'
import { Check, ChevronRight, Copy } from 'lucide-react'

import { Page } from '@/components/Page'
import { Meta } from '@/components/Meta'

export default function Home() {
  const [theme, setTheme] = useCookie('theme', 'system')
  return (
    <Page>
      <Meta
        title='Firebolt'
        description='The Simple React Framework.'
        image='/og-default.png'
        root
      />
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
            > span {
              color: var(--primary-color);
              /* font-style: italic; */
            }
          }
          .home-tag {
            text-align: center;
            font-size: 21px;
            margin: 0 0 60px;
            line-height: 1.5;
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
            &:hover {
              color: var(--icon-color);
              cursor: pointer;
            }
          }
          .home-install-copied {
            color: var(--icon-color-dim);
          }
          .home-features {
            display: flex;
            flex-wrap: wrap;
            margin: -8px -8px 80px;
          }
          .home-feature {
            display: flex;
            align-items: stretch;
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
              line-height: 1.4;
              // ...
            }
          }
          @media all and (max-width: 930px) {
            .home-feature {
              flex-basis: 50%;
            }
          }
          @media all and (max-width: 760px) {
            .home-title {
              font-size: 70px;
            }
          }
          @media all and (max-width: 630px) {
            .home-title {
              font-size: 60px;
              margin-top: 100px;
            }
          }
          @media all and (max-width: 540px) {
            .home-feature {
              flex-basis: 100%;
            }
            .home-title {
              font-size: 50px;
              margin-top: 80px;
            }
          }
        `}
      >
        <h1 className='home-title'>
          The <span>Simple</span> React Framework
        </h1>
        <p className='home-tag'>
          Build full-stack apps for the web, with all of the features and none
          of the complexity.
        </p>
        <Link href='/docs' className='home-cta'>
          <span>Get Started</span>
        </Link>
        <div className='home-install'>
          <ChevronRight className='home-install-chevron' size={20} />
          <span className='home-install-text'>npm create firebolt</span>
          <CopyButton />
        </div>
        <div className='home-features'>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>Powerful Simplicity</h1>
              <p>
                All the power of a super framework without any of the
                overwhelming complexity. It's just React.
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
                Parallel server-side streaming means your pages load faster than
                ever and your SEO skyrockets!
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>Actions & Loaders</h1>
              <p>
                Interact with your database directly inside your components.
                Forget about building an API.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>CSS-in-JS</h1>
              <p>
                Ready to go, first class support for CSS-in-JS that works
                flawlessly with server streaming.
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

function CopyButton() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText('npm create firebolt@latest')
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }
  if (copied) {
    return <Check className='home-install-copied' size={16} />
  }
  return <Copy className='home-install-copy' size={16} onClick={copy} />
}
