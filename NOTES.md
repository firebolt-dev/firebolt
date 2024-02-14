# Firebolt

A lightweight react framework with all the essentials and simple documentation.

## Features

- File Based Router & API
- Server Side Rendering
- Hot Module Replacement

## Flow

### npm run dev

- if server.js exists, esbuild this file and then run it, otherwise run our default server.js
- handle api routes
  - get list of api files
  - generate js necessary to import all api routes, esbuild it, and import() it
  - watch if any api routes change, re-generate the js, delete the require.cache and import() it again so we have clean refs
- handle client routes
  - get list of pages files
  - client bundle
    - generate a core js file that
      - creates a root <App/> that includes wouter with all pages and runs hydrateRoot(document, <App/>)
      -
  - server bundle
    - generate js necessary to import all pages files, esbuild it and import() it
    - watch for file changes, regenerate the js, purge cache and re-import() for clean refs
      - TODO: hmr/fast-refresh
    - when a request comes in for a page
      - if it has getServerProps() then load it and inject into...
      - render the component
      - pipe to response
      - inject current page js, the core js, and the shared js
- listen on port, when request comes in

  - handle public, api or page!

- <Link> will preload any page js that hasn't yet been loaded

- esbuild our client page bundles, multiple entry points in pages/\*, this also gives us a shared bundle
- build

- esbuild all pages/\* as multiple entry points, this also gives us
- start express server and begin listening
- watch files
  - if pages/\* changes
    - invalidate the page so it builds next time its requested
    - fast refresh / hmd reload somehow
  - if api/\* changes
    - invalidate the endpoint so it builds next time its requested
  - if public/\* changes
    - ???
- on request
  - if public file exists return that
  - if api route, build or use cached version, execute and return response
  - if page
    - build or use cached version
    - fetch any page data
    - render it and pipe to client, injecting

### Route Changes

- initial
  - request route from server
  - server loads any require data (getData)
  - server renders and streams to client
  - client hydrates
- Link (on mount)
  - preload any route file so that its ready to go
- Link (on click)
  - prevent default
  - load route file if we don't have it
  - if we already have not-expired data, go there immediately, stop here
  - if route has a loading component, go there immediately
  - request data and broadcast (for any listening loading component)
  - if route didnt have a loading component, go there now

### Expire

Your `getMetadata()` can return an `expire` key which determines how long (in seconds) the metadata is valid for.

1. If not set (undefined or null) the data never expires. Data will be loaded/fetched once and used forever.
2. If set to 0, data expires immediately and will be re-fetched when coming back to that page
3. If set to >0, data is cached for that number of seconds. After that time, it will be re-fetched and cached again.

### Routing

We use a custom router because we need to disconnect ACTUAL browser location from routes being rendered.

- hydrate
  - browser path and virtual path are the same (use browser path)
- mount link
  - resolve route
  - load route file if its missing
- click link
  - prevent default
  - set browser path
- router
  - when browser path changes (virtual path hasnt)
    - resolve route
    - load route file if its missing
    - if metadata is still valid (not expired) set virtual path to match and stop here
    - if route has a loading component, set virtual path to match
    - fetch metadata for new route and update (broadcast? or maybe its all just here now)
    - if route didnt have a loading component, update virtual path now

### Todos

- handle calling a route fn that doesn't exist
- const cookies = useCookies()
  - cookies.set(key, value, options)
  - cookies.get(key)
  - cookies.remove(key)
- remove middleware and just have a setup() and intercept(req) in firebolt.config.js
- expire useSuspense data somehow?
- on server route `fetch('/api/*')` to api routes
- middleware.js to receive req,res and do things like insert db
- drop support for nested page folders? they shouldnt be used
- [done] .firebolt structure
  - instead of public, use a public prefix like /\_firebolt/\* for client bundles
- [done] global styles in Document
- [done] rename Shell to Loading
- [done] use a flat pages folder with files like blog.$postId+.js etc

  - exact: about.js
  - dynamic: blog.$postId.js
  - 1ormore: parks.$tags+.js
  - 0ormore: parks.$tags-.js

- [done] include ?foo=bar etc in params (like nextjs)
- [done] make sure you can import and use 'react' stuff in Document?
- [done] getMetadata simple returns
  - can use this for instant/static metadata OR fetch stuff
    {
    title
    description
    ...etc
    props
    }
- [done] full renders for bots
- api routes
- calling api routes from getMetadata ?
- custom server.js
- server.js inject db into requests?
- in dev, watch files, rebuild and reload page via websocket signals (or re-hydrate root with new data?)
- useLocation() -> { pathname, params{}, query{}, push, replace, prefetch, back, forward, reload }
- navigation scroll to top and restoration
- render 500.js if getMetadata or render throws (500 status???)
- render 404.js if cant find page (404 status)
- if render itself crashes, server should try pages/500.js but if that also crashes send a fallback 500 page
- pass a request object into getMetadata with path, params and queries, and allow custom server.js to do things like inject a db into this request object
  - https://developer.mozilla.org/en-US/docs/Web/API/Request
- should everything be /app ?

### Neat Ideas

- nextjs wraps fetch and memoizes requests. eg 2 components can fetch('/user') for account details and it will only make one request and the other one will piggyback off it
  - https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#fetching-data-where-its-needed
- looks like nextjs wraps pages with <Suspense> and if the page returns a promise it throws so it can stream it down later
- looks like nextjs wraps pages with <Suspense> and monitors fetch for requests. if the page makes a request it

### Architecture

- build (and watch)
  - build the `firebolt` lib (used by both server and client)
  - build the cli (firebolt dev, firebolt build, firebolt start)
  - build the bootstrapper (runtime + hydrate)
- server
  - builds lib
  - exports
    - all from app/pages/\*
    - Document from app/document.js
    - - as firebolt (aliased bui)

### Loading (SSR)

- if there is no Loading component, wait for getMetadata (if any) first, then stream
- if there is a Loading component, inject getMetadata and then stream suspending

### Links

- google rich results ssr link tester
  - https://search.google.com/test/rich-results/result?id=pvSASzePp3ThAGCw9W9A_A

### Push route

- issue is that the new page may or may not have its own suspense/loading ui
- if it doesnt, we probably want to stay on the current
- SCAP isnt this fine?

### Component Loaders & Actions

Any of your app files can use loaders and actions which means you can co-locate your data needs directly within your pages and components.
If a page uses the same component multiple times and the component uses a loader, the data will only be loaded once.
You can also share loaders across different components and they will also only load data once.

- example: pages/components using local loaders
  useData(myFunction)
  export async function myFunction(req)
- example: pages/components using imported loaders
  import { myFunction } from '../loaders'
  useData(myFunction)
- imp
  - check if useData is used in the file, if not stop here
  - regex to find function name used in useData, eg "myFunction"
  - determine if function is exported from this file or imported from another file
  - if function is local, change useData(myFunction) -> useData('<pathToThisFile>/myFunction')
  - if function is external, change useData(myFunction) -> useData('<pathToExternalFile>/myFunction')
  - add path and function name to registry so we can build a shim for the server with direct access call these functions as needed
- imp client
  - generate key-path pairs for all useData/useAction functions
  - replace the function arg with a key string
  - keep a list of key-path pairs for `imp server`
- imp server
  - generate a file that exports all these functions by their key

<!-- - we currently generate page shims for the client that register the page component with that particular page route
- on server we need to do similar
  - pages need to register their loader/action functions
  - all files that each page imports (and their imports recursively) (excludes node_modules) also need to register their loader/action functions
  -
- on client
  - when calling useData
 -->
