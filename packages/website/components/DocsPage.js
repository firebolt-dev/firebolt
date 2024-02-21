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
          max-width: 1032px;
          /* margin: 0 auto; */
          display: flex;
          align-items: flex-start;
          .docs-nav {
            width: 240px;
          }
          .docs-nav-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 12px;
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
          }
        `}
      >
        <div className='docs-nav'>
          <div className='docs-nav-title'>Getting started</div>
          <NavLink label='Introduction' to='/docs' />
          <NavLink label='Installation' to='/docs/installation' />
          <NavLink label='Document' to='/docs/document' />
          <NavLink label='Pages' to='/docs/pages' />
          <NavLink label='Styles' to='/docs/styles' />
          <NavLink label='Metadata' to='/docs/metadata' />
          <NavLink label='Loaders' to='/docs/loaders' />
          <NavLink label='Actions' to='/docs/actions' />
          <NavLink label='Cookies' to='/docs/cookies' />
          <NavLink label='Markdown' to='/docs/markdown' />
          <NavLink label='API Routes' to='/docs/api' />
          <NavLink label='Public Files' to='/docs/public-files' />
          <NavLink label='Deployment' to='/docs/deployment' />
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
