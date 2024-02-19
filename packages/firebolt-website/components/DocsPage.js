import { css } from 'firebolt'

import { Page } from './Page'
import { Markdown } from './Markdown'
import * as DocsMarkdown from './DocsMarkdown'

export function DocsPage({ title, description, markdown, children }) {
  return (
    <Page title={title} description={description}>
      <div
        className='docs'
        css={css`
          max-width: 1032px;
          margin: 0 auto;
          display: flex;
          align-items: flex-start;
          .docs-nav {
            width: 270px;
          }
          .docs-content {
            flex: 1;
            padding-left: 32px;
          }
        `}
      >
        <div className='docs-nav'>
          <div>Sidebar</div>
        </div>
        <div className='docs-content'>
          <Markdown components={DocsMarkdown}>{markdown}</Markdown>
          {children}
        </div>
      </div>
    </Page>
  )
}
