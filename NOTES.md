# Galaxy

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
