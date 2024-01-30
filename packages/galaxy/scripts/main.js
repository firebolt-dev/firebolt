import { hydrateRoot } from 'react-dom/client'
import { Suspense, lazy, useState, useEffect, use } from 'react'
import { Router, Route, Switch, useParams, useRouter } from 'galaxy'

import { Document } from '../document.js'

const ctx = window.$galaxy
const root = hydrateRoot(document, <App />)

function App() {
  return (
    <Document {...ctx.initial.metadata}>
      <Router>
        <Switch>
          {ctx.routes.map(route => (
            <Route key={route.id} path={route.path}>
              <RouteMounter id={route.id} path={route.path} file={route.file} />
            </Route>
          ))}
        </Switch>
      </Router>
    </Document>
  )
}

function RouteMounter({ id, path, file }) {
  const route = ctx.getRoute(id)
  const Component = route.Component
  const params = useParams()
  console.log('p', params)

  const props = ctx.getProps(path)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (Component) return
  }, [Component])
  console.log('RR', { route, Component, props })
  return <Component {...props} />

  // const [n, setN] = useState(0)
  // useEffect(() => {
  //   // if (page)
  // }, [])
  // const Component = use(ctx.get(id))
  // // const Component = registry[path]
  // // const [active, setActive] = useState(!!Component)

  // // useEffect(() => {
  // //   if (Component) return
  // //   console.log(file)
  // //   import(file).then(() => {
  // //     setActive(true)
  // //   })
  // // }, [])
  // if (!Component) return null
  // return <Component {...props} />
}
