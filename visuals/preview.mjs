import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const types = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.mp4': 'video/mp4' }

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      response.writeHead(404).end()
      return
    }
    const data = await readFile(file)
    const headers = { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' }
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
    if (range) {
      const start = Number(range[1])
      const end = Math.min(range[2] ? Number(range[2]) : data.length - 1, data.length - 1)
      if (start > end) {
        response.writeHead(416, { 'Content-Range': `bytes */${data.length}` }).end()
        return
      }
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 }).end(data.subarray(start, end + 1))
      return
    }
    response.writeHead(200, { ...headers, 'Content-Length': data.length }).end(data)
  } catch {
    response.writeHead(404).end()
  }
}).listen(8766, '127.0.0.1', () => {
  console.log('Visual gallery: http://127.0.0.1:8766 — Ctrl+C to stop.')
})
