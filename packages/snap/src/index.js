import fs from 'fs-extra'
import path from 'path'
import puppeteer from 'puppeteer'
import { renderToString } from 'react-dom/server'

import { hashString } from './hashString'

const oneYear = 365 * 24 * 60 * 60 // seconds
const outputDir = '.firebolt/snap'

export default async function snap(
  content,
  { width = 1200, height = 630 } = {}
) {
  const html = renderToString(content)
  const key = hashString(html)
  const file = path.join(outputDir, `${key}.png`)
  const cached = await fs.exists(file)

  await fs.ensureDir(outputDir)

  if (!cached) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    await page.setContent(html)
    await page.screenshot({ path: file })
    await browser.close()
  }

  const stream = fs.createReadStream(file)

  return new Response(stream, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': `public, immutable, no-transform, max-age=${oneYear}`,
    },
  })
}
