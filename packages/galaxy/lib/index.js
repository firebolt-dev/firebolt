import { useState } from 'react'
export { css } from '@emotion/react'
// import { Router, Route, Switch } from 'wouter'
import { Link as WLink } from 'wouter'
export { Router, Route, Switch, useParams, useRouter } from 'wouter'

// export function Router() {
//   const [foo, setFoo] = useState(false)
//   return <div onClick={() => setFoo(!foo)}>ROUTER !!! {foo ? 'YES' : 'NO'}</div>
// }

export function Link({ children, ...props }) {
  //   return <a>{children}</a>
  return (
    <WLink
      {...props}
      onClick={e => {
        console.log('ON CLICK')
        /**
         * todo
         * - check if this is a page
         * - preload script if not already
         * - on click
         *   - prevent default
         *   - if we dont have the page script, load it + register
         *   - fetch metadata
         *   - now we can route there, with the metadata+props
         */
        // e.preventDefault()
      }}
    >
      {children}
    </WLink>
  )
}
