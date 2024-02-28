import { useState } from 'react'
import { MDXProvider, Link, useLocation, css, cls } from 'firebolt'

import { Page } from '../components/Page'
import { components } from '../components/docs-components'
import { ChevronDown, ChevronLeft, ChevronRight, List } from 'lucide-react'

export default function DocsLayout({ children }) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(!open)
  const close = () => open && setOpen(false)
  return (
    <Page>
      <div
        className='docs'
        css={css`
          padding-top: 32px;
          /* max-width: 1300px;
          width: 100%;
          margin: 0 auto; */
          display: flex;
          align-items: flex-start;
          .docs-nav {
            position: sticky;
            top: 102px;
            height: calc(100vh - 102px);
            width: 300px;
            margin: 0 0 24px -12px;
            display: flex;
            flex-direction: column;
          }
          .docs-nav-content {
            flex: 1;
            overflow-y: auto;
            padding: 0 32px 24px 0;
          }
          .docs-nav-toggle {
            display: none;
          }
          .docs-nav-section {
            font-size: 18px;
            font-weight: 700;
            margin: 32px 0 12px;
            padding-left: 12px;
            &:first-child {
              margin-top: 0;
            }
          }
          .docs-nav-link {
            display: flex;
            align-items: center;
            padding: 0 12px;
            height: 40px;
            border-radius: 8px;
            color: var(--text-color-dim);
            &.active {
              background: var(--primary-color);
              color: white;
            }
          }

          .docs-main {
            max-width: 800px;
            flex: 1;
            padding: 0 0 100px 32px;
          }

          @media all and (max-width: 915px) {
            .docs-nav {
              position: fixed;
              top: 70px;
              left: 0;
              right: 0;
              background-color: var(--header-bg);
              backdrop-filter: blur(8px);
              border-bottom: 1px solid var(--line-color);
              border-top: 1px solid var(--line-color);
              z-index: 80;
              width: inherit;
              height: inherit;
              margin: 0;
              padding: 0;
            }
            .docs-nav-toggle {
              display: flex;
              align-items: center;
              padding: 0 30px;
              height: 44px;
              flex-shrink: 0;
              /* justify-content: center; */
              > svg {
                color: var(--icon-color);
                margin-right: 4px;
              }
              > span {
                color: var(--text-color-dim);
              }
            }
            .docs-nav-content {
              display: none;
            }
            .docs-main {
              padding-left: 0;
              padding-top: 32px;
            }
            .docs-nav.open {
              max-height: calc(100vh - 70px);

              .docs-nav-content {
                display: block;
                border-top: 1px solid var(--line-color);
                padding: 20px;
              }
            }
          }
        `}
      >
        <div className={cls('docs-nav', { open })}>
          <div className='docs-nav-toggle' onClick={toggle}>
            {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            {/* <List size={18} /> */}
            <span>Documentation</span>
          </div>
          <div className='docs-nav-content' onClick={close}>
            <div className='docs-nav-section'>Getting Started</div>
            <NavLink label='Introduction' href='/docs' />
            <NavLink label='Installation' href='/docs/installation' />
            <NavLink label='Document' href='/docs/document' />
            <NavLink label='Pages' href='/docs/pages' />
            <NavLink label='Styles' href='/docs/styles' />
            <NavLink label='Metadata' href='/docs/metadata' />
            <NavLink label='Loaders' href='/docs/loaders' />
            <NavLink label='Actions' href='/docs/actions' />
            <NavLink label='Cookies' href='/docs/cookies' />
            <NavLink label='Deployment' href='/docs/deployment' />

            <div className='docs-nav-section'>Reference</div>
            <NavLink label='Document.js' href='/docs/ref/document' />
            <NavLink label='firebolt.config.js' href='/docs/ref/config' />
            <NavLink label='[page].js' href='/docs/ref/page-js' />
            <NavLink label='[page].mdx' href='/docs/ref/page-mdx' />
            <NavLink label='[api].js' href='/docs/ref/api-js' />
            <NavLink label='useLocation' href='/docs/ref/useLocation' />
            <NavLink label='useCookie' href='/docs/ref/useCookie' />
            <NavLink label='useLoader' href='/docs/ref/useLoader' />
            <NavLink label='useAction' href='/docs/ref/useAction' />
            <NavLink label='useCache' href='/docs/ref/useCache' />
            <NavLink label='<Link>' href='/docs/ref/link' />
            <NavLink label='<ErrorBoundary>' href='/docs/ref/error-boundary' />
            <NavLink label='Request' href='/docs/ref/request' />
            <NavLink label='css' href='/docs/ref/css' />
            <NavLink label='cls' href='/docs/ref/cls' />
            <NavLink label='.env' href='/docs/ref/env' />

            <div className='docs-nav-section'>Guides</div>
            <NavLink label='Theme toggles' href='/docs/guides/theme-toggles' />
            <NavLink
              label='Deploy to fly.io'
              href='/docs/guides/deploy-to-fly'
            />
          </div>
        </div>
        <div className='docs-main'>
          <MDXProvider components={components}>{children}</MDXProvider>
        </div>
      </div>
    </Page>
  )
}

function NavLink({ label, href }) {
  const location = useLocation()
  return (
    <Link
      href={href}
      className={cls('docs-nav-link', {
        active: location.pathname === href,
      })}
    >
      <span>{label}</span>
    </Link>
  )
}
