import fs from 'fs-extra'
import path from 'path'
import { Readable } from 'stream'
import sharp from 'sharp'
import ico from 'sharp-ico'

export { Icons } from './Icons'

const svg = 'routes/icon.svg'
const outputDir = '.firebolt/icons'
const items = [
  {
    file: path.join(outputDir, 'favicon.ico'),
    pathname: '/favicon.ico',
    mime: 'image/x-icon',
    ico: {
      size: 32,
    },
  },
  {
    file: path.join(outputDir, 'apple-touch-icon.png'),
    pathname: '/apple-touch-icon.png',
    mime: 'image/png',
    png: {
      size: 180,
    },
  },
  {
    file: path.join(outputDir, 'icon-192.png'),
    pathname: '/icon-192.png',
    mime: 'image/png',
    png: {
      size: 192,
    },
  },
  {
    file: path.join(outputDir, 'icon-512.png'),
    pathname: '/icon-512.png',
    mime: 'image/png',
    png: {
      size: 512,
    },
  },
  {
    file: path.join(outputDir, 'manifest.json'),
    pathname: '/manifest.json',
    mime: 'application/json',
    manifest: {
      icons: [
        { src: '/icon-192.png', type: 'image/png', sizes: '192x192' },
        { src: '/icon-512.png', type: 'image/png', sizes: '512x512' },
      ],
    },
  },
]

export const iconsSetup = async () => {
  const exists = await fs.exists(svg)
  if (!exists) throw new Error('[icon] svg icon not found')
  await fs.ensureDir(outputDir)
  for (const item of items) {
    if (item.png) {
      await sharp(svg)
        .resize(item.png.size, item.png.size)
        .toFormat('png')
        .toFile(item.file)
    }
    if (item.ico) {
      await ico.sharpsToIco(
        [sharp(svg).resize(item.ico.size, item.ico.size)],
        item.file
      )
    }
    if (item.manifest) {
      await fs.outputFile(item.file, JSON.stringify(item.manifest, null, 2))
    }
  }
}

export const iconsMiddleware = (req, ctx) => {
  for (const item of items) {
    if (req.pathname === item.pathname) {
      const stream = fs.createReadStream(item.file)
      const webStream = Readable.toWeb(stream)
      return new Response(webStream, {
        headers: {
          'Content-Type': item.mime,
        },
      })
    }
  }
}
