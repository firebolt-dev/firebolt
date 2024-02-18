import { Footer } from './Footer'
import { Header } from './Header'

export function Page({ title, children }) {
  return (
    <>
      <title>{title ? `${title} | Firebolt` : `Firebolt`}</title>
      <Header />
      {children}
      <Footer />
    </>
  )
}
