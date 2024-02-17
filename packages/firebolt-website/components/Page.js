import { Head } from 'firebolt'

import { Footer } from './Footer'
import { Header } from './Header'

export function Page({ title, children }) {
  return (
    <>
      <Head>
        <title key='title'>{title ? `${title} | Firebolt` : `Firebolt`}</title>
      </Head>
      <Header />
      {children}
      <Footer />
    </>
  )
}
