import { MDXProvider, useLocation, css } from 'firebolt'

import { Page } from '../components/Page'
import { components } from '../components/md'

export default function BlogLayout({ children }) {
  const location = useLocation()
  const home = location.pathname === '/blog'
  if (home) {
    return children
  }
  return (
    <Page width={700}>
      <div
        css={css`
          padding: 50px 0 150px;
        `}
      >
        <MDXProvider components={components}>{children}</MDXProvider>
      </div>
    </Page>
  )
}
