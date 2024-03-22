import { useState } from 'react'
import { Link, css } from 'firebolt'
import {
  Check,
  ChevronRight,
  Copy,
  ArrowUpRightFromSquare,
  PlugZap,
  Zap,
  ArrowDownWideNarrow,
  Cpu,
  Palette,
  Cookie,
  Split,
  Signpost,
  Milestone,
  Shuffle,
  Component,
} from 'lucide-react'

import { Page } from '@/components/Page'
import { Meta } from '@/components/Meta'

export default function Home() {
  return (
    <Page>
      <Meta
        title='Firebolt'
        description='The Effortless React Framework.'
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
            margin: 0 0 12px;
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
          .home-stackblitz {
            font-size: 14px;
            text-align: center;
            margin: 0 0 120px;
            a {
              color: var(--primary-color);
            }
            svg {
              transform: translateY(1px);
            }
          }
          .home-features {
            display: flex;
            flex-wrap: wrap;
            margin: -16px -16px 80px;
          }
          .home-feature {
            display: flex;
            align-items: stretch;
            flex-basis: 33.333%;
            padding: 16px;
          }
          .home-feature-inner {
            border: 1px solid var(--line-color);
            background: var(--bg2-color);
            border-radius: 8px;
            padding: 20px;
            h1 {
              font-size: 22px;
              font-weight: 700;
              margin: 0 0 16px;
            }
            p {
              line-height: 1.4;
              color: var(--text-color-dim);
            }
            svg {
              margin-right: 12px;
              transform: translateY(5px);
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
          The <span>Productive</span> React Framework
        </h1>
        <p className='home-tag'>
          Quickly build high performance, efficient, full-stack apps on the web.
        </p>
        <Link href='/docs' className='home-cta'>
          <span>Get Started</span>
        </Link>
        <div className='home-install'>
          <ChevronRight className='home-install-chevron' size={20} />
          <span className='home-install-text'>npm create firebolt</span>
          <CopyButton />
        </div>
        <div className='home-stackblitz'>
          <span>or try it on </span>
          <Link href='https://stackblitz.com/edit/firebolt?file=routes%2Findex.js'>
            <span>
              StackBlitz <ArrowUpRightFromSquare size={12} />
            </span>
          </Link>
        </div>
        <div className='home-features'>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>
                <PlugZap />
                <span>Powerful Simplicity</span>
              </h1>
              <p>
                Powerful features crafted into a tiny framework designed to help
                you build faster and deliver more value.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>
                <Zap />
                <span>Ultra Speed</span>
              </h1>
              <p>
                Our 10 KB runtime with parallel server-side streaming ensures
                your pages load faster than ever before.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>
                <Shuffle />
                <span>Unified Routing</span>
              </h1>
              <p>
                A single intuitive directory for everything accessed by a URL:
                Pages, assets, virtual files, APIs and more.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>
                <Component />
                <span>True Composability</span>
              </h1>
              <p>
                Fetch and interact with your database from inside any component.
                Build entire platforms by creating components and composing them
                together.
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>
                <Palette />
                <span>CSS-in-JS</span>
              </h1>
              <p>
                First class, high performance CSS-in-JS to help keep your
                components isolated and composable. Ready to go!
              </p>
            </div>
          </div>
          <div className='home-feature'>
            <div className='home-feature-inner'>
              <h1>
                <Cookie />
                <span>Cookies, Baked.</span>
              </h1>
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
