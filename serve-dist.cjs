// 零依赖离线静态服务器：仅使用 Node 内置模块托管 dist/，供无 node_modules 环境直接演示。
// 用法：node serve-dist.cjs [端口]
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, 'dist')
const PORT = Number(process.argv[2] || process.env.PORT || 4173)
const HOST = process.env.HOST || '127.0.0.1'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  let rel = decodeURIComponent(url.pathname)
  if (rel === '/' || !rel.startsWith('/')) rel = '/index.html'
  const filePath = path.normalize(path.join(ROOT, rel))
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && stat.isFile()) {
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      })
      fs.createReadStream(filePath).pipe(res)
      return
    }
    // SPA 回退：非静态文件路径交给 React Router。
    const fallback = path.join(ROOT, 'index.html')
    fs.stat(fallback, (err2) => {
      if (err2) {
        res.writeHead(404)
        res.end('Not Found')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      fs.createReadStream(fallback).pipe(res)
    })
  })
})

server.listen(PORT, HOST, () => {
  console.log(`「殷契拾文」离线成品已启动：http://localhost:${PORT}/`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请关闭占用程序或改用：node serve-dist.cjs 4180`)
  } else {
    console.error(err)
  }
  process.exitCode = 1
})
