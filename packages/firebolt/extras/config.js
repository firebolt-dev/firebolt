import { config as initial } from '../firebolt.config.js'

let config = initial

if (process.env.PORT) config.port = process.env.PORT
if (!config.port) config.port = 3000

if (!config.setup) config.setup = async () => {}

if (
  config.productionBrowserSourceMaps !== true &&
  config.productionBrowserSourceMaps !== false
) {
  config.productionBrowserSourceMaps = false
}

if (!config.req) config.req = {}

if (!config.middleware) config.middleware = []

if (!config.mdx) config.mdx = {}
if (!config.mdx.remarkPlugins) config.mdx.remarkPlugins = []
if (!config.mdx.rehypePlugins) config.mdx.rehypePlugins = []

if (!config.publicEnvPrefix) config.publicEnvPrefix = 'PUBLIC_'

if (!config.plugins) config.plugins = []

for (const plugin of config.plugins) {
  config = plugin(config)
}

export { config }
