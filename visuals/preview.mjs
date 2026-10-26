import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const types = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' }

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      response.writeHead(404).end()
      return
    }
    const data = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache' }).end(data)
  } catch {
    response.writeHead(404).end()
  }
}).listen(8766, '127.0.0.1', () => {
  console.log('Visual gallery: http://127.0.0.1:8766 — Ctrl+C to stop.')
})
