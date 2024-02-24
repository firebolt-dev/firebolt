import { Link, useLocation, css, cls } from 'firebolt'

import { Page } from './Page'

export function DocsPage({ title, description, children }) {
  const location = useLocation()
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
            width: 240px;
          }
          .docs-section {
            font-size: 18px;
            font-weight: 700;
            margin: 32px 0 12px;
          }
          .docs-nav-link {
            margin-left: -12px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            height: 40px;
            border-radius: 8px;
            &.active {
              background: var(--primary-color);
              color: white;
            }
          }
          .docs-content {
            flex: 1;
            padding-left: 64px;
            padding-bottom: 100px;
          }
        `}
      >
        <div className='docs-nav'>
          <NavLink label='Introduction' to='/docs' />
          <NavLink label='Quick Start' to='/docs/quick-start' />
          <NavLink label='Document' to='/docs/document' />
          <NavLink label='Pages' to='/docs/pages' />
          <NavLink label='Styles' to='/docs/styles' />
          <NavLink label='Metadata' to='/docs/metadata' />
          <NavLink label='Loaders' to='/docs/loaders' />
          <NavLink label='Actions' to='/docs/actions' />
          <NavLink label='Cookies' to='/docs/cookies' />
          <NavLink label='Deployment' to='/docs/deployment' />

          <div className='docs-section'>Reference</div>
          <NavLink label='Document.js' to='/docs/ref/document' />
          <NavLink label='firebolt.config.js' to='/docs/ref/config' />
          <NavLink label='[page].js' to='/docs/ref/page-js' />
          <NavLink label='[page].mdx' to='/docs/ref/page-mdx' />
          <NavLink label='[api].js' to='/docs/ref/api-js' />
          <NavLink label='useLocation' to='/docs/ref/useLocation' />
          <NavLink label='useCookie' to='/docs/ref/useCookie' />
          <NavLink label='useData' to='/docs/ref/useData' />
          <NavLink label='useAction' to='/docs/ref/useAction' />
          <NavLink label='useCache' to='/docs/ref/useCache' />
          <NavLink label='<Link>' to='/docs/ref/link' />
          <NavLink label='<ErrorBoundary>' to='/docs/ref/error-boundary' />
          <NavLink label='Request' to='/docs/ref/request' />
          <NavLink label='css' to='/docs/ref/css' />
          <NavLink label='cls' to='/docs/ref/cls' />

          <div className='docs-section'>Guides</div>
          <NavLink label='Theme toggles' to='/docs/guides/theme-toggles' />
          <NavLink label='Deploy to fly.io' to='/docs/guides/deploy-to-fly' />
        </div>
        <div className='docs-content'>{children}</div>
      </div>
    </Page>
  )
}

function NavLink({ label, to }) {
  const location = useLocation()
  return (
    <Link to={to}>
      <a
        className={cls('docs-nav-link', {
          active: location.url === to,
        })}
      >
        <span>{label}</span>
      </a>
    </Link>
  )
}
