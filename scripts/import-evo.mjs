// EVOBC 字形演变图版导入脚本
// 范围：本地 69 字（简->正映射取完整三阶段）+ HUST 已释类别（localGlyphId / 释读标签精确匹配）。
// 原始 5GB zip 不整体落盘：读取官方元数据 + zip 中央目录，仅按需下载目标图片字节并规范化。
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')
const PROJECT_ROOT = path.resolve(ROOT, '..')
const DATASET_ROOT = path.join(PROJECT_ROOT, 'oracle_app', 'datasets', 'EVOBC')
const META_DIR = path.join(DATASET_ROOT, 'metadata')
const CENTRAL_FILE = path.join(META_DIR, 'Data-EN-central.bin')
const RAW_CACHE = path.join(DATASET_ROOT, 'raw-select')

const GLYPHS_FILE = path.join(ROOT, 'src', 'data', 'glyphs.json')
const HUST_FILE = path.join(ROOT, 'src', 'data', 'hust', 'index.json')
const OUT_JSON = path.join(ROOT, 'src', 'data', 'evolution.json')
const OUT_PUBLIC = path.join(ROOT, 'public', 'evo')

const RAW_BASE = 'https://raw.githubusercontent.com/RomanticGodVAN/character-Evolution-Dataset/main'
const DATA_URL =
  process.env.EVOBC_DATA_URL ||
  'https://hf-mirror.com/datasets/HaisuGuan/EVOBC/resolve/main/Data-EN.zip'

const KV_FILE = path.join(META_DIR, 'Key_Value.json')
const LIST_FILE = path.join(META_DIR, 'List_of_EVOBC.json')

const args = process.argv.slice(2)
const PREFLIGHT = args.includes('--preflight')
const CENTRAL_OVERRIDE = args.find((a) => a.startsWith('--central='))?.split('=')[1]
const LOCAL_MAX = Number(args.find((a) => a.startsWith('--local-max='))?.split('=')[1] || 2)
const HUST_MAX = Number(args.find((a) => a.startsWith('--hust-max='))?.split('=')[1] || 1)
const LOCAL_SIDE = Number(args.find((a) => a.startsWith('--local-side='))?.split('=')[1] || 512)
const HUST_SIDE = Number(args.find((a) => a.startsWith('--hust-side='))?.split('=')[1] || 384)

// EVOBC 时期：OBC=0 BI=1 SS=2 SAC=3 WSC=4 CS=5
const STAGE_ERAS = {
  jinwen: 1,
  xiaozhuan: 2,
  lishu: 5
}
const STAGE_ERA_LABEL = { jinwen: 'BI', xiaozhuan: 'SS', lishu: 'CS' }
const STAGE_CN = { jinwen: '金文', xiaozhuan: '篆书（小篆系）', lishu: '隶书' }

// 简体现代字 -> EVOBC 历史字形主目标（简体条目往往缺金文/战国等阶段）。
const LOCAL_ALIASES = {
  云: '雲',
  电: '電',
  马: '馬',
  鱼: '魚',
  鸟: '鳥',
  龙: '龍',
  龟: '龜',
  贝: '貝',
  车: '車',
  门: '門'
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function log(...rest) {
  console.log(...rest)
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`)
  return res.json()
}

function hasEra(record, era) {
  return Boolean(record && (record.images || []).some((i) => i.era === era))
}

function fullStages(record) {
  return Object.values(STAGE_ERAS).every((era) => hasEra(record, era))
}

function localTargets(glyphs, byChar) {
  const targets = []
  for (const glyph of glyphs) {
    const exact = byChar.get(glyph.modern)
    const alias = LOCAL_ALIASES[glyph.modern] ? byChar.get(LOCAL_ALIASES[glyph.modern]) : undefined
    let rec
    let match = 'exact'
    if (exact && fullStages(exact)) rec = exact
    else if (alias && fullStages(alias)) {
      rec = alias
      match = 'alias'
    } else if (exact) rec = exact
    else if (alias) {
      rec = alias
      match = 'alias'
    }
    targets.push({ modern: glyph.modern, id: glyph.id, rec, match })
  }
  return targets
}

function collectHust(decEntries, glyphs, byChar, localMap) {
  const modernById = new Map(glyphs.map((g) => [g.id, g.modern]))
  const modernId = new Map(glyphs.map((g) => [g.modern, g.id]))
  const linked = []
  for (const entry of decEntries) {
    const localModern = entry.localGlyphId
      ? modernById.get(entry.localGlyphId)
      : modernId.has(entry.label)
        ? entry.label
        : undefined
    const labelPool = [...(entry.labels && entry.labels.length ? entry.labels : []), entry.label].filter(
      Boolean
    )
    let hit
    if (localModern && localMap.has(localModern)) {
      hit = { joinLabel: localModern, rec: localMap.get(localModern).rec, match: 'local' }
    }
    if (!hit) {
      for (const label of labelPool) {
        const rec = byChar.get(label)
        if (rec && Object.values(STAGE_ERAS).some((era) => hasEra(rec, era))) {
          hit = { joinLabel: label, rec, match: 'label' }
          break
        }
      }
    }
    if (hit) linked.push({ entryId: entry.categoryId || entry.id, ...hit })
  }
  return linked
}

function pickFiles(record, era, max) {
  if (!record) return []
  const images = (record.images || []).filter((i) => i.era === era)
  const sourceRank = (file) => {
    const m = /_(Book|Web)_/.exec(file || '')
    if (!m) return 2
    return m[1] === 'Book' ? 0 : 1
  }
  return images
    .map((img, index) => ({ img, index }))
    .sort((a, b) => {
      const r = sourceRank(a.img.file) - sourceRank(b.img.file)
      if (r !== 0) return r
      const num = (s) => Number(/(\d+)(?=\.\w+$)/.exec(s.img.file)?.[1] || 0)
      const d = num(a) - num(b)
      if (d !== 0) return d
      return a.img.file.localeCompare(b.img.file)
    })
    .slice(0, max)
    .map((x) => x.img)
}

function parseCentral(buf) {
  const entries = new Map()
  let p = 0
  let records = 0
  while (p + 46 <= buf.length) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compSize32 = buf.readUInt32LE(p + 20)
    const uncompSize32 = buf.readUInt32LE(p + 24)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const offset32 = buf.readUInt32LE(p + 42)
    const nameStart = p + 46
    const extra = buf.subarray(nameStart + nameLen, nameStart + nameLen + extraLen)
    let offset = offset32
    let compSize = compSize32
    let uncompSize = uncompSize32
    if (extra.length) {
      let q = 0
      while (q + 4 <= extra.length) {
        const id = extra.readUInt16LE(q)
        const size = extra.readUInt16LE(q + 2)
        const body = extra.subarray(q + 4, q + 4 + size)
        if (id === 0x0001) {
          let b = 0
          const take64 = () => {
            const v = body.readBigUInt64LE(b)
            b += 8
            return v
          }
          if (uncompSize === 0xffffffff) uncompSize = Number(take64())
          if (compSize === 0xffffffff) compSize = Number(take64())
          if (offset === 0xffffffff) offset = Number(take64())
        }
        q += 4 + size
      }
    }
    const name = buf.subarray(nameStart, nameStart + nameLen).toString('utf8')
    const base = name.split('/').pop()
    if (base) {
      const item = {
        path: name,
        base,
        method,
        offset,
        compSize,
        uncompSize
      }
      if (!entries.has(base)) entries.set(base, [])
      entries.get(base).push(item)
    }
    p = nameStart + nameLen + extraLen + commentLen
    records++
  }
  return { entries, records }
}

function resolveCentralEntry(entriesMap, base) {
  const list = entriesMap.get(base)
  if (!list || !list.length) return undefined
  // Data-EN.zip 同时按“来源_时期”与“EVOBC/类别号”两套目录组织；
  // 优先官方清单对应的 EVOBC/ID 路径，避免重复条目歧义。
  return list.find((e) => /\/EVOBC\/[^/]+\/[^/]+$/.test(e.path)) || list[0]
}

async function fetchRange(url, start, end, tries = 3) {
  for (let t = 1; t <= tries; t++) {
    try {
      const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } })
      if (res.status !== 206 && res.status !== 200) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < end - start + 1) throw new Error(`short body ${buf.length}`)
      return buf
    } catch (err) {
      if (t === tries) throw err
      await sleep(400 * t)
    }
  }
  throw new Error('unreachable')
}

async function downloadCentral(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  log(`[1/5] 下载 Data-EN.zip 中央目录（约 57MB）到 ${dest}`)
  const head = await fetchRange(url, 0, 0)
  void head
  // 中央目录偏移 / 大小由 ZIP64 EOCD 决定：分两次取尾部即可。
  const res = await fetch(url, { headers: { Range: 'bytes=-1048576' } })
  if (!res.ok) throw new Error(`tail HTTP ${res.status}`)
  const tail = Buffer.from(await res.arrayBuffer())
  const endPos = Number(res.headers.get('content-range').split('/')[1])
  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0 || tail.readUInt32LE(eocd - 20) !== 0x07064b50) throw new Error('ZIP64 locator missing')
  const zip64Off = Number(tail.readBigUInt64LE(eocd - 12))
  const idx = Number(zip64Off - (BigInt(endPos) - BigInt(tail.length)))
  if (tail.readUInt32LE(idx) !== 0x06064b50) throw new Error('ZIP64 EOCD missing')
  const cdSize = Number(tail.readBigUInt64LE(idx + 40))
  const cdOff = Number(tail.readBigUInt64LE(idx + 48))
  const out = fs.createWriteStream(dest)
  const req = await fetch(url, { headers: { Range: `bytes=${cdOff}-${cdOff + cdSize - 1}` } })
  if (!req.ok || !req.body) throw new Error(`central HTTP ${req.status}`)
  for await (const chunk of req.body) out.write(chunk)
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())))
  log(`[1/5] 中央目录就绪：${cdSize} bytes`)
}

async function fetchImage(entry, url) {
  // 单次 Range 覆盖“本地文件头 + 压缩数据”；头长度通常 <100 字节，预留 8KB。
  const span = entry.compSize + 8192
  const buf = await fetchRange(url, entry.offset, entry.offset + span - 1)
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error(`local header missing at ${entry.offset}`)
  const nameLen = buf.readUInt16LE(26)
  const extraLen = buf.readUInt16LE(28)
  const dataStart = 30 + nameLen + extraLen
  const compressed = buf.subarray(dataStart, dataStart + entry.compSize)
  if (compressed.length !== entry.compSize) {
    throw new Error(`compressed bytes mismatch ${compressed.length}/${entry.compSize}`)
  }
  let raw
  if (entry.method === 0) raw = compressed
  else if (entry.method === 8) raw = zlib.inflateRawSync(compressed)
  else throw new Error(`unsupported method ${entry.method}`)
  if (raw.length !== entry.uncompSize) throw new Error(`size mismatch ${raw.length}/${entry.uncompSize}`)
  return raw
}

async function normalizeGlyph(buf, maxSide) {
  const meta = await sharp(buf).metadata()
  const transparent = Boolean(meta.hasAlpha)
  const trimOpt = transparent ? {} : { background: '#ffffff', threshold: 12 }
  const trimmed = await sharp(buf).trim(trimOpt).png().toBuffer()
  const bg = transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 }
  const out = await sharp(trimmed)
    .resize({ width: maxSide, height: maxSide, fit: 'contain', background: bg, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer()
  return out
}

async function runMap(items, limit, worker) {
  const queue = [...items]
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < queue.length) {
      const i = cursor++
      await worker(queue[i], i)
    }
  })
  await Promise.all(runners)
}

function printPreflight(localTargets, hustLinked, byChar) {
  log('== EVOBC 覆盖率预检 ==')
  log(`本地目标 69；HUST 已释条目 ${hustLinked.length} 条可联动（含 localGlyphId / 释读标签）`)
  const localFull = localTargets.filter((t) => t.rec && fullStages(t.rec)).length
  const localAny = localTargets.filter((t) => t.rec).length
  log(`本地字中：三阶段齐全 ${localFull}，有任一字形 ${localAny}，完全无匹配 ${69 - localAny}`)
  const rows = []
  for (const t of localTargets) {
    const missing = []
    for (const [stage, era] of Object.entries(STAGE_ERAS)) {
      if (!hasEra(t.rec, era)) missing.push(stage)
    }
    if (missing.length) rows.push(`${t.modern}(${t.id}) ${t.match}: ${missing.join(',')}`)
  }
  if (rows.length) {
    log('本地字缺阶段明细：')
    rows.forEach((r) => log(` - ${r}`))
  } else {
    log('本地 69 字三阶段无缺。')
  }
  const byStage = { jinwen: 0, xiaozhuan: 0, lishu: 0 }
  for (const item of hustLinked) {
    for (const [stage, era] of Object.entries(STAGE_ERAS)) if (hasEra(item.rec, era)) byStage[stage]++
  }
  log(`HUST 联动条目阶段覆盖：${JSON.stringify(byStage)}`)
  void byChar
}

async function main() {
  const start = Date.now()
  fs.mkdirSync(META_DIR, { recursive: true })
  fs.mkdirSync(OUT_PUBLIC, { recursive: true })
  fs.mkdirSync(RAW_CACHE, { recursive: true })
  if (!fs.existsSync(KV_FILE) || !fs.existsSync(LIST_FILE)) {
    throw new Error(`元数据缺失：请先放置 ${KV_FILE} 与 ${LIST_FILE}`)
  }
  const keyValue = readJson(KV_FILE)
  const list = readJson(LIST_FILE)
  const byChar = new Map(list.map((r) => [r.Character, r]))
  const glyphs = readJson(GLYPHS_FILE).glyphs
  const hust = readJson(HUST_FILE)
  const decEntries = Object.values(hust.entries).filter((e) => e.corpus === 'hust-dec')

  const localT = localTargets(glyphs, byChar)
  const localMap = new Map(
    localT.filter((t) => t.rec).map((t) => [t.modern, t])
  )
  const hustLinked = collectHust(decEntries, glyphs, byChar, localMap)

  log(
    `EVOBC 元数据：${Object.keys(keyValue).length} 字类；本字库 69 字目标；HUST 已释 ${decEntries.length} 类。`
  )
  printPreflight(localT, hustLinked, byChar)
  if (PREFLIGHT) {
    log('预检完成（未下载图片）。使用 `npm run data:import-evo` 生成正式数据。')
    return
  }

  const centralPath = CENTRAL_OVERRIDE || CENTRAL_FILE
  if (!fs.existsSync(centralPath)) {
    await downloadCentral(DATA_URL, centralPath)
  }
  log(`[2/5] 读取中央目录 ${centralPath}`)
  const { entries: cd } = parseCentral(fs.readFileSync(centralPath))
  log(`[2/5] 中央目录索引 ${cd.size} 个文件名`)

  // 汇总每个 (joinLabel -> 目标) 与每个阶段实际抽选文件
  const labelTargets = new Map()
  for (const t of localT) {
    if (!t.rec) continue
    labelTargets.set(t.modern, {
      joinLabel: t.modern,
      rec: t.rec,
      match: t.match,
      kind: 'local'
    })
  }
  for (const item of hustLinked) {
    const prior = labelTargets.get(item.joinLabel)
    if (!prior) {
      labelTargets.set(item.joinLabel, {
        joinLabel: item.joinLabel,
        rec: item.rec,
        match: item.match,
        kind: item.match === 'local' ? 'local' : 'hust'
      })
    }
  }

  log(`[3/5] 需要生成的字形演变标签条目：${labelTargets.size}`)
  const jobs = []
  const outputJobs = new Map()
  for (const target of labelTargets.values()) {
    const max = target.kind === 'local' ? LOCAL_MAX : HUST_MAX
    for (const [stageKey, era] of Object.entries(STAGE_ERAS)) {
      const picked = pickFiles(target.rec, era, max)
      picked.forEach((img, idx) => {
        const categoryId = target.rec.ID
        const outName = `${categoryId}_${idx + 1}.png`
        const outRel = `/evo/${stageKey}/${outName}`
        const outAbs = path.join(OUT_PUBLIC, stageKey, outName)
        const imageKey = img.file
        const jobKey = `${stageKey}:${categoryId}:${idx + 1}`
        const existing = outputJobs.get(jobKey)
        if (existing && existing.imageKey !== imageKey) {
          throw new Error(`输出冲突 ${jobKey}: ${existing.imageKey} vs ${imageKey}`)
        }
        if (!existing) {
          const job = {
            stageKey,
            categoryId,
            outRel,
            outAbs,
            imageKey,
            local: target.kind === 'local',
            maxSide: target.kind === 'local' ? LOCAL_SIDE : HUST_SIDE
          }
          outputJobs.set(jobKey, job)
          jobs.push(job)
        }
      })
    }
  }

  log(`[3/5] 去重后需提取图版文件：${jobs.length}`)
  const missingFiles = []
  const byName = new Map()
  for (const job of jobs) {
    const entry = resolveCentralEntry(cd, job.imageKey)
    if (!entry) {
      missingFiles.push(job.imageKey)
      continue
    }
    byName.set(job.imageKey, entry)
  }
  if (missingFiles.length) log(`警告：中央目录未找到 ${missingFiles.length} 个文件，如 ${missingFiles.slice(0, 8).join(', ')}`)
  const fetchable = [...byName.entries()]

  log('[4/5] 按需下载/校验图片字节（多线程 Range 请求，已缓存文件自动跳过）…')
  let done = 0
  const total = fetchable.length
  await runMap(fetchable, 12, async ([name, entry]) => {
    const cacheFile = path.join(RAW_CACHE, name.replace(/[^A-Za-z0-9_.-]/g, '_'))
    if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size === entry.uncompSize) {
      done++
      if (done % 300 === 0 || done === total) log(`  已就绪 ${done}/${total}`)
      return
    }
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const raw = await fetchImage(entry, DATA_URL)
        fs.writeFileSync(cacheFile, raw)
        done++
        if (done % 300 === 0 || done === total) log(`  已下载 ${done}/${total}`)
        return
      } catch (err) {
        if (attempt === 6) throw err
        log(`  retry ${name}: ${err?.cause?.code || err.message}（第 ${attempt} 次）`)
        await sleep(1200 * attempt)
      }
    }
  })

  log('[5/5] 规范化 PNG 并写 evolution.json …')
  const stageFileCount = { jinwen: 0, xiaozhuan: 0, lishu: 0 }
  let totalBytes = 0
  let writtenFiles = 0
  const entries = {}
  const linkMap = new Map() // stageKey -> categoryId -> files[]

  for (let ji = 0; ji < jobs.length; ji++) {
    const job = jobs[ji]
    const cacheFile = path.join(RAW_CACHE, job.imageKey.replace(/[^A-Za-z0-9_.-]/g, '_'))
    if (!fs.existsSync(cacheFile)) continue
    const raw = fs.readFileSync(cacheFile)
    fs.mkdirSync(path.dirname(job.outAbs), { recursive: true })
    const png = await normalizeGlyph(raw, job.maxSide)
    fs.writeFileSync(job.outAbs, png)
    totalBytes += png.length
    stageFileCount[job.stageKey]++
    writtenFiles++
    if (!linkMap.has(job.stageKey)) linkMap.set(job.stageKey, new Map())
    if (!linkMap.get(job.stageKey).has(job.categoryId)) {
      linkMap.get(job.stageKey).set(job.categoryId, [])
    }
    linkMap
      .get(job.stageKey)
      .get(job.categoryId)
      .push({ src: job.outRel, categoryId: job.categoryId })
    if ((ji + 1) % 300 === 0 || ji + 1 === jobs.length) {
      log(`  已规范化 ${ji + 1}/${jobs.length}`)
    }
  }

  const entryKeys = Object.keys(entries)
  for (const target of labelTargets.values()) {
    const stageObj = {}
    for (const [stageKey] of Object.entries(STAGE_ERAS)) {
      const files = linkMap.get(stageKey)?.get(target.rec.ID) || []
      if (files.length) {
        stageObj[stageKey] = {
          files: files.map((f) => ({
            src: f.src,
            categoryId: f.categoryId,
            sourceLabel: target.rec.Character,
            note: `EVOBC ${STAGE_ERA_LABEL[stageKey]} · ${STAGE_CN[stageKey]}`
          }))
        }
      }
    }
    entries[target.joinLabel] = {
      categoryIds: [target.rec.ID],
      evobcLabels: [target.rec.Character],
      match: target.match,
      stages: stageObj
    }
    entryKeys.push(target.joinLabel)
  }

  const localFull = localT.filter((t) => t.rec && fullStages(t.rec)).length
  const localAny = localT.filter((t) => t.rec).length
  const directHustLabels = [...labelTargets.values()].filter((t) => t.kind === 'hust').length
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: [
      {
        key: 'EVOBC',
        title: 'An open dataset for the evolution of oracle bone characters: EVOBC',
        authors:
          'Haisu Guan, Jinpeng Wan, Yuliang Liu, Pengjie Wang, Kaile Zhang, Zhebin Kuang, Xinyu Wang, Xiang Bai, Lianwen Jin',
        year: 2024,
        arxiv: '2401.12467',
        doi: '10.48550/arXiv.2401.12467',
        repo: 'https://github.com/RomanticGodVAN/character-Evolution-Dataset',
        download: 'https://huggingface.co/datasets/HaisuGuan/EVOBC',
        license: 'CC BY-NC-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        note: '字形图版来自 EVOBC 公开数据集按需提取子集（BI/SS/CS），按来源原样整理，非专家逐字复核。'
      }
    ],
    stats: {
      entryCount: entryKeys.length,
      localLabels: 69,
      localFullStages: localFull,
      localPartial: localAny - localFull,
      hustLinkedEntries: hustLinked.length,
      hustDirectLabels: directHustLabels,
      stageImages: stageFileCount,
      totalFiles: writtenFiles,
      totalBytes,
      generatedMs: Date.now() - start
    },
    entries
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), 'utf8')
  log(
    `完成：${Object.keys(entries).length} 条目 / ${writtenFiles} 文件 / ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
  )
  log(`输出：${OUT_JSON}`)

  // 数据集 README 记录来源与许可（原始 zip 不落盘）。
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(centralPath)).digest('hex')
  const readme = [
    'EVOBC 数据说明（只读来源，不随网页提交）',
    '============================',
    `来源仓库: https://github.com/RomanticGodVAN/character-Evolution-Dataset`,
    `原始数据: https://huggingface.co/datasets/HaisuGuan/EVOBC (Data-EN.zip, 通过 hf-mirror 访问)`,
    `元数据: Key&Value.json / List_of_EVOBC.json（官方仓库 main 分支，${new Date().toISOString()} 获取）`,
    `许可: CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)`,
    `论文: arXiv:2401.12467 (doi:10.48550/arXiv.2401.12467)`,
    `用途: 本项目仅按需提取本地 69 字与 HUST 已释联动标签的 BI/SS/CS 图版，生成离线网页资源。`,
    `中央目录校验(Data-EN-central.bin): sha256 ${sha256}`,
    `生成: ${out.generatedAt}`
  ].join('\n')
  fs.writeFileSync(path.join(DATASET_ROOT, 'README.txt'), readme, 'utf8')
}

main().catch((err) => {
  console.error('导入失败：', err)
  process.exitCode = 1
})
