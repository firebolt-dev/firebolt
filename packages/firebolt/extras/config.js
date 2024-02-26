import getConfig from '../firebolt.config.js'

const config = getConfig()

if (process.env.PORT) config.port = process.env.PORT
if (!config.port) config.port = 3000

if (
  config.productionBrowserSourceMaps !== true &&
  config.productionBrowserSourceMaps !== false
) {
  config.productionBrowserSourceMaps = false
}

if (!config.middleware) config.middleware = () => {}

if (!config.mdx) config.mdx = {}
if (!config.mdx.remarkPlugins) config.mdx.remarkPlugins = []
if (!config.mdx.rehypePlugins) config.mdx.rehypePlugins = []

if (!config.publicEnvPrefix) config.publicEnvPrefix = 'PUBLIC_'

export { config }
