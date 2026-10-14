// 一次性把公开 HUST-OBC 原始目录整理为「殷契拾文」网页数据：
//   src/data/hust/index.json  全量目录与统计（不含原始大图）
//   public/hust/...           已释类精选示例图
//   public/hust/templates.bin 1588 类 128×128 距离变换模板索引
//
// 运行前提：HUST-OBC.zip 已解压到 ../oracle_app/datasets/HUST-OBC（只读源）。
// 数据许可：CC BY-NC 4.0；本脚本不修改源目录。
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..')
const defaultSource = path.resolve(projectRoot, '..', 'oracle_app', 'datasets', 'HUST-OBC')

const args = process.argv.slice(2)
const sourceArg = args.find((a) => a.startsWith('--source='))
const sourceRoot = sourceArg ? sourceArg.slice('--source='.length) : defaultSource
const withUndec = args.includes('--with-undeciphered-images')
const withGxd = args.includes('--with-gxd-images')
const maxSamples = Number(args.find((a) => a.startsWith('--samples='))?.split('=')[1] || 4)

const MASK_SIZE = 128
const IMG_RE = /\.(png|jpe?g|webp|bmp)$/i
const SOURCE_ORDER = ['H', 'Y', 'L', 'X', 'G']
const SOURCE_LABEL = {
  H: 'HWOBC 数据库',
  Y: '殷契文渊',
  L: '甲骨文六位数字编码',
  X: '新甲骨文编',
  G: '国学大师网站'
}

function assertDir(p, label) {
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    throw new Error(`找不到 ${label}：${p}\n请先下载并解压 HUST-OBC.zip 到该目录。`)
  }
}

function walkImages(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkImages(p, out)
    else if (IMG_RE.test(ent.name)) out.push({ file: p, name: ent.name })
  }
  return out
}

function sourceOf(name) {
  const first = String(name || '').trim().charAt(0).toUpperCase()
  return SOURCE_ORDER.includes(first) ? first : '?'
}

function collectSourceMix(images) {
  const mix = {}
  for (const im of images) {
    const s = sourceOf(im.name)
    mix[s] = (mix[s] || 0) + 1
  }
  return Object.fromEntries(Object.entries(mix).sort((a, b) => a[0].localeCompare(b[0])))
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function grayscaleToMask(gray, w, h) {
  const hist = new Uint32Array(256)
  let amin = 255
  let amax = 0
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i]
    hist[v]++
    if (v < amin) amin = v
    if (v > amax) amax = v
  }
  let bg = 0
  let bgCount = -1
  for (let v = 0; v < 256; v++) {
    if (hist[v] > bgCount) {
      bgCount = hist[v]
      bg = v
    }
  }
  let t
  if (bg >= 128) {
    const span = bg - amin
    t = span < 15 ? 128 : Math.round(bg - span * 0.4)
  } else {
    const span = amax - bg
    t = span < 15 ? 128 : Math.round(bg + span * 0.4)
  }
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < gray.length; i++) {
    if (bg >= 128 ? gray[i] < t : gray[i] > t) mask[i] = 1
  }
  return mask
}

function connectedComponents(mask, w, h) {
  const seen = new Uint8Array(w * h)
  const comps = []
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue
    seen[i] = 1
    const stack = [i]
    let n = 0
    let minX = w
    let maxX = -1
    let minY = h
    let maxY = -1
    while (stack.length) {
      const p = stack.pop()
      n++
      const x = p % w
      const y = (p - x) / w
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      const ns = []
      if (x > 0) ns.push(p - 1)
      if (x < w - 1) ns.push(p + 1)
      if (y > 0) ns.push(p - w)
      if (y < h - 1) ns.push(p + w)
      for (const nxt of ns) if (mask[nxt] && !seen[nxt]) {
        seen[nxt] = 1
        stack.push(nxt)
      }
    }
    comps.push({ n, minX, maxX, minY, maxY })
  }
  return comps
}

function dilate(src, w, h) {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!src[i]) continue
      out[i] = 1
      if (x > 0) out[i - 1] = 1
      if (x < w - 1) out[i + 1] = 1
      if (y > 0) out[i - w] = 1
      if (y < h - 1) out[i + w] = 1
    }
  }
  return out
}

function fitSquare(src, w, h, size) {
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (src[y * w + x]) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const out = new Uint8Array(size * size)
  if (maxX < 0) return out
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  const pad = Math.max(3, Math.round(0.05 * Math.max(cropW, cropH)))
  const x0 = Math.max(0, minX - pad)
  const y0 = Math.max(0, minY - pad)
  const x1 = Math.min(w - 1, maxX + pad)
  const y1 = Math.min(h - 1, maxY + pad)
  const cw = x1 - x0 + 1
  const ch = y1 - y0 + 1
  const scale = size / Math.max(cw, ch)
  const nw = Math.max(1, Math.round(cw * scale))
  const nh = Math.max(1, Math.round(ch * scale))
  const ox = Math.floor((size - nw) / 2)
  const oy = Math.floor((size - nh) / 2)
  for (let y = 0; y < nh; y++) {
    const sy = y0 + Math.min(ch - 1, Math.floor((y + 0.5) * (ch / nh)))
    for (let x = 0; x < nw; x++) {
      const sx = x0 + Math.min(cw - 1, Math.floor((x + 0.5) * (cw / nw)))
      if (src[sy * w + sx]) out[(oy + y) * size + (ox + x)] = 1
    }
  }
  return dilate(out, size, size)
}

function normalizeTo128(raw, w, h) {
  const comps = connectedComponents(raw, w, h)
  if (!comps.length) return new Uint8Array(MASK_SIZE * MASK_SIZE)
  let total = 0
  for (const c of comps) total += c.n
  const thr = Math.max(8, Math.round(total * 0.005))
  const cleaned = rebuildKept(raw, w, h, comps, thr)
  return fitSquare(cleaned, w, h, MASK_SIZE)
}

function rebuildKept(raw, w, h, comps, thr) {
  const keptSet = new Set()
  let any = false
  for (let i = 0; i < comps.length; i++) {
    if (comps[i].n >= thr) {
      keptSet.add(i)
      any = true
    }
  }
  const cleaned = new Uint8Array(w * h)
  const seen = new Uint8Array(w * h)
  let compIndex = 0
  for (let start = 0; start < w * h; start++) {
    if (!raw[start] || seen[start]) continue
    const currentIndex = compIndex
    compIndex++
    seen[start] = 1
    const stack = [start]
    if (!keptSet.has(currentIndex)) continue
    while (stack.length) {
      const p = stack.pop()
      cleaned[p] = 1
      const x = p % w
      const y = (p - x) / w
      const ns = []
      if (x > 0) ns.push(p - 1)
      if (x < w - 1) ns.push(p + 1)
      if (y > 0) ns.push(p - w)
      if (y < h - 1) ns.push(p + w)
      for (const nxt of ns) if (raw[nxt] && !seen[nxt]) {
        seen[nxt] = 1
        stack.push(nxt)
      }
    }
  }
  return cleaned
}

async function decodeMask(file) {
  const { data, info } = await sharp(file)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return normalizeTo128(data, info.width, info.height)
}

function distanceTransform(mask, size) {
  const dist = new Uint8Array(size * size).fill(255)
  const queue = []
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      dist[i] = 0
      queue.push(i)
    }
  }
  let head = 0
  while (head < queue.length) {
    const p = queue[head++]
    const nd = dist[p] + 1
    const x = p % size
    const ns = []
    if (p - size >= 0) ns.push(p - size)
    if (p + size < size * size) ns.push(p + size)
    if (x > 0) ns.push(p - 1)
    if (x < size - 1) ns.push(p + 1)
    for (const n of ns) {
      if (dist[n] > nd) {
        dist[n] = nd
        queue.push(n)
      }
    }
  }
  return dist
}

function maskFeatures(mask, size) {
  let ink = 0
  let minX = size
  let minY = size
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mask[y * size + x]) {
        ink++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const components = connectedComponents(mask, size, size).length
  const density = ink / (size * size)
  const cw = Math.max(1, maxX - minX + 1)
  const ch = Math.max(1, maxY - minY + 1)
  return { ink, density, aspect: cw / ch, components, bboxArea: cw * ch }
}

function sourceRank(s) {
  const i = SOURCE_ORDER.indexOf(s)
  return i < 0 ? 99 : i
}

function qualityScore(feats, src) {
  if (feats.density < 0.03 || feats.density > 0.85) return -1
  if (feats.aspect < 0.25 || feats.aspect > 4.2) return -1
  if (feats.components > 40) return -1
  return (
    10_000
    - sourceRank(src) * 900
    - Math.abs(feats.density - 0.28) * 5_000
    - Math.abs(Math.log2(feats.aspect)) * 800
    - feats.components * 6
  )
}

async function pickSamples(images, limit) {
  const bySource = new Map()
  for (const im of images) {
    const s = sourceOf(im.name)
    if (!bySource.has(s)) bySource.set(s, [])
    bySource.get(s).push(im)
  }
  for (const list of bySource.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))
  }
  const ordered = []
  const keys = [...bySource.keys()].sort((a, b) => sourceRank(a) - sourceRank(b))
  let i = 0
  while (ordered.length < limit) {
    let added = false
    for (const k of keys) {
      if (i < bySource.get(k).length) {
        ordered.push(bySource.get(k)[i])
        added = true
      }
    }
    if (!added) break
    i++
  }
  const candidates = ordered.slice(0, limit)
  const scored = []
  for (const cand of candidates) {
    try {
      const mask = await decodeMask(cand.file)
      const feats = maskFeatures(mask, MASK_SIZE)
      const q = qualityScore(feats, sourceOf(cand.name))
      scored.push({ cand, mask, feats, q })
    } catch {
      scored.push({ cand, mask: null, feats: null, q: -2 })
    }
  }
  let best = scored[0]
  for (const s of scored) if (s.q > best.q) best = s
  if (!best) throw new Error(`类别无候选图像`)
  // 展示样例仍从排序候选中取（主模板优先 + 至多 limit 张）
  const display = []
  const primary = best.cand
  display.push(primary)
  for (const s of scored) {
    if (display.length >= limit) break
    if (s.cand.file !== primary.file) display.push(s.cand)
  }
  return {
    primary: { ...best, estimated: best.q < 0 },
    display,
    scored
  }
}

async function decodeBestOf(images, limit) {
  // 快速路径：最多解码 limit 个候选，不需要提前复制
  return pickSamples(images, Math.max(2, Math.min(limit, images.length)))
}

function naturalName(a, b) {
  return a.localeCompare(b, 'en', { numeric: true })
}

function uint16Buf(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}

function uint32Buf(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}

function writeUtf8(buf, s) {
  const b = Buffer.from(s, 'utf8')
  return Buffer.concat([uint16Buf(b.length), b])
}

async function main() {
  const t0 = Date.now()
  const decRoot = path.join(sourceRoot, 'deciphered')
  const undecRoot = path.join(sourceRoot, 'undeciphered')
  const gxdRoot = path.join(sourceRoot, 'GuoXueDaShi_1390')
  assertDir(decRoot, 'deciphered')
  assertDir(undecRoot, 'undeciphered')
  assertDir(gxdRoot, 'GuoXueDaShi_1390')

  const outPub = path.join(projectRoot, 'public', 'hust')
  const outData = path.join(projectRoot, 'src', 'data', 'hust')
  fs.rmSync(outPub, { recursive: true, force: true })
  fs.rmSync(outData, { recursive: true, force: true })
  fs.mkdirSync(outPub, { recursive: true })
  fs.mkdirSync(outData, { recursive: true })

  const decMap = readJson(path.join(decRoot, 'ID_to_chinese.json'))
  const gxdMap = readJson(path.join(gxdRoot, 'ID_to_chinese.json'))
  console.log(`[1/4] 扫描 deciphered（${Object.keys(decMap).length} 个来源标签）…`)
  const decCategories = fs.readdirSync(decRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(naturalName)

  const entries = []
  const decImports = []
  const templateParts = []

  async function processDec(categoryName) {
    const dir = path.join(decRoot, categoryName)
    const images = walkImages(dir)
    const sourceMix = collectSourceMix(images)
    const tokenIds = categoryName.split('_')
    const labels = tokenIds.map((t) => decMap[t]).filter((v) => v && v.trim())
    const labelPrimary = labels[0] || ''
    const picked = await decodeBestOf(images, maxSamples)
    const primary = picked.primary
    const feats = primary.feats || { density: 0, aspect: 1, components: 0 }
    const entry = {
      id: categoryName,
      corpus: 'hust-dec',
      categoryId: categoryName,
      label: labelPrimary,
      labels,
      localGlyphId: '',
      deciphered: true,
      imageCount: images.length,
      sampleCount: picked.display.length,
      samples: [],
      sourceMix,
      templateQuality: primary.q >= 0 ? 'selected' : 'estimated',
      template: {
        density: Number(feats.density.toFixed(4)),
        aspect: Number(feats.aspect.toFixed(3)),
        components: feats.components,
        source: sourceOf(primary.cand.name)
      }
    }
    const outDir = path.join(outPub, 'deciphered', categoryName)
    fs.mkdirSync(outDir, { recursive: true })
    picked.display.forEach((cand, idx) => {
      if (!cand || !cand.file) {
        console.error('BAD sample', categoryName, idx, cand)
        throw new Error(`类别 ${categoryName} 选中了无效示例`)
      }
      const ext = path.extname(cand.file).toLowerCase() || '.png'
      const outName = `s${idx}${ext}`
      fs.copyFileSync(cand.file, path.join(outDir, outName))
      entry.samples.push({
        id: outName,
        file: `/hust/deciphered/${categoryName}/${outName}`,
        source: sourceOf(cand.name)
      })
    })
    if (!primary.mask) throw new Error(`${categoryName} 主模板解码失败`)
    const dist = distanceTransform(primary.mask, MASK_SIZE)
    const parts = [
      writeUtf8(Buffer.alloc(0), categoryName),
      writeUtf8(Buffer.alloc(0), labelPrimary),
      dist
    ]
    entries.push(entry)
    decImports.push(parts)
    return entry
  }

  const decPromise = (async () => {
    let inflight = 0
    const pending = []
    for (const name of decCategories) {
      if (inflight >= 24) {
        await Promise.race(pending)
      }
      const p = processDec(name).then(
        () => { inflight--; return true },
        (e) => { inflight--; e.message = `deciphered/${name}: ${e.message}`; throw e }
      )
      pending.push(p)
      inflight++
      if (decImports.length % 200 === 0 && decImports.length > 0) {
        console.log(`  …已处理 ${decImports.length}/${decCategories.length}`)
      }
    }
    await Promise.all(pending)
  })()
  await decPromise
  console.log(`[2/4] 已释类完成：${entries.length} 类 / ${entries.reduce((a, e) => a + e.imageCount, 0)} 张源图，正在写模板索引…`)

  const header = Buffer.concat([
    Buffer.from('YQOB', 'ascii'),
    uint16Buf(1),
    Buffer.from([MASK_SIZE]),
    uint32Buf(entries.length)
  ])
  const chunks = decImports
  for (const c of chunks) {
    const row = Buffer.concat([c[0], c[1], Buffer.from(c[2])])
    templateParts.push(row)
  }
  const templateBuf = Buffer.concat([header, ...templateParts])
  fs.writeFileSync(path.join(outPub, 'templates.bin'), templateBuf)

  console.log(`[3/4] 扫描 undeciphered / GuoXueDaShi_1390…`)
  const undecEntries = []
  function collectLeaves(dir, prefix, entriesOut) {
    let files = []
    let dirs = []
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) dirs.push(ent.name)
      else if (IMG_RE.test(ent.name)) files.push(ent.name)
    }
    if (files.length) {
      const sourceMix = collectSourceMix(files)
      const sourceKey = sourceMix && sourceMix['?'] === files.length ? '?' : prefix
      entriesOut.push({
        id: `${prefix}:${path.basename(dir)}`,
        corpus: 'hust-undec',
        categoryId: path.basename(dir),
        sourceGroup: prefix,
        label: '',
        labels: [],
        localGlyphId: '',
        deciphered: false,
        imageCount: files.length,
        sampleCount: 0,
        samples: [],
        sourceMix,
        templateQuality: null,
        template: null
      })
      if (withUndec) {
        const outDir = path.join(outPub, 'undec', prefix, path.basename(dir))
        fs.mkdirSync(outDir, { recursive: true })
        files.sort(naturalName).slice(0, 1).forEach((f, idx) => {
          const ext = path.extname(f).toLowerCase() || '.png'
          fs.copyFileSync(path.join(dir, f), path.join(outDir, `s${idx}${ext}`))
        })
      }
      return
    }
    for (const d of dirs) {
      if (d === '.') continue
      collectLeaves(path.join(dir, d), prefix, entriesOut)
    }
  }

  for (const sub of fs.readdirSync(undecRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    collectLeaves(path.join(undecRoot, sub.name), sub.name, undecEntries)
  }
  undecEntries.sort((a, b) => naturalName(a.id, b.id))

  const gxdEntries = []
  for (const name of fs.readdirSync(gxdRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort(naturalName)) {
    const dir = path.join(gxdRoot, name)
    const images = walkImages(dir)
    const label = gxdMap[name] || ''
    const entry = {
      id: name,
      corpus: 'hust-gxd',
      categoryId: name,
      label,
      labels: label ? [label] : [],
      localGlyphId: '',
      deciphered: false,
      reliable: false,
      imageCount: images.length,
      sampleCount: 0,
      samples: [],
      sourceMix: collectSourceMix(images),
      templateQuality: null,
      template: null
    }
    if (withGxd) {
      const outDir = path.join(outPub, 'gxd', name)
      fs.mkdirSync(outDir, { recursive: true })
      images.sort((a, b) => naturalName(a.name, b.name)).slice(0, 1).forEach((f, idx) => {
        const ext = path.extname(f.file).toLowerCase() || '.png'
        fs.copyFileSync(f.file, path.join(outDir, `s${idx}${ext}`))
      })
      entry.sampleCount = 1
    }
    gxdEntries.push(entry)
  }

  const decImages = entries.reduce((a, e) => a + e.imageCount, 0)
  const undecImages = undecEntries.reduce((a, e) => a + e.imageCount, 0)
  const gxdImages = gxdEntries.reduce((a, e) => a + e.imageCount, 0)

  const localByModern = {}
  const localData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'data', 'glyphs.json'), 'utf8'))
  for (const g of localData.glyphs) localByModern[g.modern] = g.id
  const usedLocal = new Set()
  for (const e of entries) {
    for (const label of e.labels) {
      if (localByModern[label]) {
        e.localGlyphId = localByModern[label]
        usedLocal.add(e.localGlyphId)
      }
    }
  }

  const index = {
    corpus: 'HUST-OBC',
    version: 1,
    title: 'An open dataset for oracle bone character recognition and decipherment',
    license: 'CC BY-NC 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    attribution: {
      authors: 'Pengjie Wang, Kaile Zhang, Xinyu Wang, Shengwei Han, Yongge Liu, Jinpeng Wan, Haisu Guan, Zhebin Kuang, Lianwen Jin, Xiang Bai, Yuliang Liu',
      venue: 'Scientific Data 11:976 (2024)',
      doi: '10.1038/s41597-024-03807-x',
      repo: 'https://github.com/Pengjie-W/HUST-OBC',
      figshare: 'https://figshare.com/articles/dataset/HUST-OBS/25040543'
    },
    generatedAt: new Date().toISOString(),
    sourceRoot: path.relative(path.resolve(projectRoot, '..'), sourceRoot),
    stats: {
      deciphered: { rootCategories: entries.length, labels: Object.keys(decMap).length, imageFiles: decImages },
      undeciphered: { leafCategories: undecEntries.length, imageFiles: undecImages, sourceGroups: Object.keys(undecEntries.reduce((a, e) => ((a[e.sourceGroup] = 1), a), {})) },
      gxd1390: { categories: gxdEntries.length, imageFiles: gxdImages },
      localMapped: usedLocal.size
    },
    template: {
      size: MASK_SIZE,
      file: '/hust/templates.bin',
      entries: entries.map((e) => ({ id: e.id, label: e.label, distOffset: 0 }))
    },
    entries: [...entries, ...undecEntries, ...gxdEntries]
  }
  fs.writeFileSync(path.join(outData, 'index.json'), JSON.stringify(index, null, 1), 'utf8')

  const readme = `# HUST-OBC 学术字形数据（导入产物）

本目录与 \`public/hust/\` 是 \`npm run data:import-obc\` 的生成物，不要手工编辑。

- 源数据：HUST-OBC（华中科技大学 VLRLab 等），CC BY-NC 4.0
- 引用：Pengjie Wang 等，Scientific Data 11:976 (2024)，DOI 10.1038/s41597-024-03807-x
- 已释根类：${entries.length}（源图像 ${decImages} 张，来源标签 ${Object.keys(decMap).length} 个）
- 未释类别：${undecEntries.length}（源图像 ${undecImages} 张）
- 待复核 GuoXueDaShi 类：${gxdEntries.length}（源图像 ${gxdImages} 张，仅目录）
- 生成时间：${index.generatedAt}

识别模板 \`/hust/templates.bin\` 保存 ${MASK_SIZE}×${MASK_SIZE} 距离变换；
仅用于浏览器本地字形匹配，不包含任何深度学习模型参数。
`
  fs.writeFileSync(path.join(outData, 'README.md'), readme, 'utf8')
  fs.writeFileSync(
    path.join(sourceRoot, '..', 'HUST-OBC-README.txt'),
    `HUST-OBC 原始数据（下载于 ModelScope，HUST-OBC.zip 579.77MB / 607,933,810 字节）\n${readme}\n`,
    'utf8'
  )
  console.log(`[4/4] 完成：${entries.length} 已释类、${undecEntries.length} 未释类、${gxdEntries.length} 待复核类，用时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`  → src/data/hust/index.json (${Math.round(fs.statSync(path.join(outData, 'index.json')).size / 1024)} KB)`)
  console.log(`  → public/hust/templates.bin (${Math.round(templateBuf.length / 1024 / 1024 * 10) / 10} MB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
