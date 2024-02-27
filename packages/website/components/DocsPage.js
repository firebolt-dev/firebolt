import { MDXProvider, Link, useLocation, css, cls } from 'firebolt'

import { Page } from './Page'
import { components } from './docs-components'

export function DocsPage({ title, description, children }) {
  return (
    <Page title={title} description={description}>
      <div
        className='docs'
        css={css`
          padding-top: 32px;
          /* max-width: 1032px; */
          /* margin: 0 auto; */
          display: flex;
          align-items: flex-start;
          .docs-nav {
            position: sticky;
            top: 102px;
            height: calc(100vh - 102px);
            width: 270px;
            overflow-y: auto;
            margin: 0 0 24px;
            padding: 0 32px 24px 0;
            margin-bottom: 24px;
            padding-bottom: 24px;
          }
          .docs-section {
            font-size: 18px;
            font-weight: 700;
            margin: 32px 0 12px;
            padding-left: 12px;
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
          .docs-content {
            flex: 1;
            padding: 0 0 100px 32px;
          }
        `}
      >
        <div className='docs-nav'>
          <div className='docs-section'>Getting Started</div>
          <NavLink label='Introduction' href='/docs' />
          <NavLink label='Quick Start' href='/docs/quick-start' />
          <NavLink label='Document' href='/docs/document' />
          <NavLink label='Pages' href='/docs/pages' />
          <NavLink label='Styles' href='/docs/styles' />
          <NavLink label='Metadata' href='/docs/metadata' />
          <NavLink label='Loaders' href='/docs/loaders' />
          <NavLink label='Actions' href='/docs/actions' />
          <NavLink label='Cookies' href='/docs/cookies' />
          <NavLink label='Deployment' href='/docs/deployment' />

          <div className='docs-section'>Reference</div>
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

          <div className='docs-section'>Guides</div>
          <NavLink label='Theme toggles' href='/docs/guides/theme-toggles' />
          <NavLink label='Deploy to fly.io' href='/docs/guides/deploy-to-fly' />
        </div>
        <div className='docs-content'>
          <MDXProvider components={components}>{children}</MDXProvider>
        </div>
      </div>
    </Page>
  )
}

function NavLink({ label, href }) {
  const location = useLocation()
  return (
    <Link href={href}>
      <a
        className={cls('docs-nav-link', {
          active: location.pathname === href,
        })}
      >
        <span>{label}</span>
      </a>
    </Link>
  )
}
