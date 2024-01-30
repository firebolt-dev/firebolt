import { useEffect, useState } from 'react'
export { css } from '@emotion/react'
// import { Router, Route, Switch } from 'wouter'
import { Link as WLink, useLocation } from 'wouter'
export { Router, Route, Switch, useParams, useRouter } from 'wouter'

// export function Router() {
//   const [foo, setFoo] = useState(false)
//   return <div onClick={() => setFoo(!foo)}>ROUTER !!! {foo ? 'YES' : 'NO'}</div>
// }

// const browser = typeof window !== 'undefined'
// const g = browser ? window.$galaxy : null

const g = () => window.$galaxy

export function Link({ href, onClick, children, ...props }) {
  const [location, setLocation] = useLocation()
  const handleClick = async e => {
    onClick?.(e)
    if (e.defaultPrevented) return
    const route = g().resolveRoute(href)
    if (!route) return
    e.preventDefault()
    if (!route.Page) await g().loadRouteByPath(href)
    const metadata = g().getMetadata(href, true)
    if (metadata) return setLocation(href)
    if (route.Shell) return setLocation(href)
    await g().loadMetadata(href)
    setLocation(href)
  }
  useEffect(() => {
    g().loadRouteByPath(href)
  }, [])
  return (
    <WLink href={href} {...props} onClick={handleClick}>
      {children}
    </WLink>
  )
}
