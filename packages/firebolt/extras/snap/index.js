import fs from 'fs-extra'
import puppeteer from 'puppeteer'
import { renderToString } from 'react-dom/server'

import { hashString } from '../hashString'

const oneYear = 365 * 24 * 60 * 60

export default async function snap(
  content,
  { width = 1200, height = 630, expires = oneYear } = {}
) {
  const html = renderToString(content)
  const key = hashString(html)
  const file = `.firebolt/snap/${key}.png`
  const cached = await fs.exists(file)

  if (!cached) {
    const browser = await puppeteer.launch()
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
      'Cache-Control': `public, immutable, no-transform, max-age=${expires}`,
    },
  })
}
