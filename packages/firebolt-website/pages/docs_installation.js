import markdown from '../markdown/1-installation.md'

import { DocsPage } from '../components/DocsPage'

export default function Installation() {
  return (
    <DocsPage
      title='Installation'
      description='TODO: add a desc about this docs page'
      markdown={markdown}
    >
      <div>Yup</div>
      <div>{`
        import foor from 'color'
      `}</div>
    </DocsPage>
  )
}
