import {
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  cloneElement,
  useRef,
  useInsertionEffect,
} from 'react'
export { css } from '@emotion/react'

const g = () => window.$galaxy

export function Link(props) {
  const { to, href = to, replace, onClick, children } = props

  const jsx = isValidElement(children) ? children : <a {...props} />

  const handleClick = useEvent(event => {
    // ignores the navigation when clicked using right mouse button or
    // by holding a special modifier key: ctrl, command, win, alt, shift
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return

    onClick?.(event)
    if (!event.defaultPrevented) {
      event.preventDefault()
      console.log('to', to)
      if (replace) {
        history.replaceState(null, '', href)
      } else {
        history.pushState(null, '', href)
      }
    }
  })

  const extraProps = {
    to: null,
    onClick: handleClick,
  }

  useEffect(() => {
    g().loadRouteByPath(to)
  }, [])

  return cloneElement(jsx, extraProps)
}

const MetaContext = createContext()

export function Meta() {
  const ctx = useContext(MetaContext)
  const [metadata, setMetadata] = useState(() => {
    // server provides metadata via context
    // client must source it from the store
    return ctx || g().getMetadata(location.pathname, true)
  })

  useEffect(() => {
    // subscribe to metadata changes
    return g().onMeta(metadata => {
      setMetadata(metadata)
    })
  }, [])

  console.log('<Meta>', metadata)

  return (
    <>
      {metadata?.title && <title>{metadata.title}</title>}
      {metadata?.meta?.map((item, idx) => (
        <meta
          key={item.key || idx}
          name={item.name}
          property={item.property}
          content={item.content}
        />
      ))}
    </>
  )
}

export function MetaProvider({ metadata, children }) {
  return (
    <MetaContext.Provider value={metadata}>{children}</MetaContext.Provider>
  )
}

// Userland polyfill while we wait for the forthcoming
// https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md
// Note: "A high-fidelity polyfill for useEvent is not possible because
// there is no lifecycle or Hook in React that we can use to switch
// .current at the right timing."
// So we will have to make do with this "close enough" approach for now.
// ---
// Per Dan Abramov: useInsertionEffect executes marginally closer to the
// correct timing for ref synchronization than useLayoutEffect on React 18.
// See: https://github.com/facebook/react/pull/25881#issuecomment-1356244360
// ---
// Borrowed from wouter: https://github.com/molefrog/wouter/blob/main/react-deps.js
const useEvent = fn => {
  const ref = useRef([fn, (...args) => ref[0](...args)]).current
  useInsertionEffect(() => {
    ref[0] = fn
  })
  return ref[1]
}

// export function useLocation() {
//   return useContext(g().LocationContext)
// }
