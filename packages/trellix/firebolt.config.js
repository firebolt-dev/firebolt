import icons from '@firebolt-dev/icons'

import { db } from './db'
import { uuid } from './uuid'

export const config = {
  plugins: [icons()],
  productionBrowserSourceMaps: true,
  context: {
    uuid,
    db,
  },
}
