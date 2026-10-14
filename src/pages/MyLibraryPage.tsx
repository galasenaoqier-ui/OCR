import {
  Database,
  FileQuestion,
  ImagePlus,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyNote, PageShell, Panel, Tag } from '../components/ui'
import { fileToThumbBlob } from '../lib/imageUtils'
import {
  addUploads,
  clearUploads,
  deleteUpload,
  listUploads,
  updateUpload,
  type UploadRecord
} from '../lib/uploadDB'

const ACCEPT = '.png,.jpg,.jpeg,.webp,.bmp,image/*'
const MAX_FILE = 25 * 1024 * 1024

const ALLOWED = ['png', 'jpg', 'jpeg', 'webp', 'bmp']

function isImageLike(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return file.type.startsWith('image/') || ALLOWED.includes(ext)
}

export default function MyLibraryPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string[]>([])
  const selectedUrlRef = useRef('')
  const [records, setRecords] = useState<UploadRecord[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [drag, setDrag] = useState(false)
  const [selected, setSelected] = useState<UploadRecord | null>(null)
  const [selectedUrl, setSelectedUrl] = useState('')
  const [draft, setDraft] = useState({ number: '', modern: '', source: '', note: '' })
  const [saving, setSaving] = useState(false)

  const releaseUrls = useCallback(() => {
    urlRef.current.forEach((u) => URL.revokeObjectURL(u))
    urlRef.current = []
    setUrls({})
  }, [])

  const load = useCallback(async () => {
    try {
      const rows = await listUploads()
      releaseUrls()
      const next: Record<string, string> = {}
      urlRef.current = rows.map((r) => {
        const blob = r.thumb || r.original
        const u = URL.createObjectURL(blob)
        next[r.id] = u
        return u
      })
      setUrls(next)
      setRecords(rows)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取本地数据库失败')
    } finally {
      setLoading(false)
    }
  }, [releaseUrls])

  useEffect(() => {
    void load()
    return () => {
      releaseUrls()
      if (selectedUrlRef.current) URL.revokeObjectURL(selectedUrlRef.current)
      selectedUrlRef.current = ''
      setSelectedUrl('')
    }
  }, [load, releaseUrls])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) =>
      [r.fileName, r.number, r.modern, r.source, r.note].join(' ').toLowerCase().includes(q)
    )
  }, [records, query])

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (!list.length) return
    const accepted: File[] = []
    let skipped = 0
    for (const f of list) {
      if (!isImageLike(f)) {
        skipped++
        continue
      }
      if (f.size > MAX_FILE) {
        skipped++
        setMessage(`已跳过超大文件：${f.name}（单文件上限 25MB）`)
        continue
      }
      accepted.push(f)
    }
    if (!accepted.length) {
      setMessage('没有可导入的图片：仅支持 PNG/JPG/JPEG/WEBP/BMP，单文件 ≤25MB')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const items = await Promise.all(
        accepted.map(async (f) => ({ file: f, thumb: await fileToThumbBlob(f) }))
      )
      await addUploads(items)
      setMessage(`已导入 ${accepted.length} 张图片${skipped ? `，跳过 ${skipped} 张` : ''}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存到本地数据库失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function openDetail(record: UploadRecord) {
    if (selectedUrlRef.current) URL.revokeObjectURL(selectedUrlRef.current)
    selectedUrlRef.current = URL.createObjectURL(record.original)
    setSelectedUrl(selectedUrlRef.current)
    setSelected(record)
    setDraft({
      number: record.number,
      modern: record.modern,
      source: record.source,
      note: record.note
    })
  }

  function closeDetail() {
    setSelected(null)
    if (selectedUrlRef.current) URL.revokeObjectURL(selectedUrlRef.current)
    selectedUrlRef.current = ''
    setSelectedUrl('')
  }

  async function saveDetail() {
    if (!selected) return
    setSaving(true)
    try {
      const next = await updateUpload(selected.id, {
        number: draft.number.trim(),
        modern: draft.modern.trim(),
        source: draft.source.trim(),
        note: draft.note.trim()
      })
      setSelected(next)
      setMessage('字段已保存')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function removeOne() {
    if (!selected) return
    if (!window.confirm(`确定删除“${selected.fileName}”吗？删除后不可恢复。`)) return
    try {
      await deleteUpload(selected.id)
      closeDetail()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function removeAll() {
    if (!records.length) return
    if (!window.confirm(`确定清空“我的甲骨库”全部 ${records.length} 条记录吗？删除后不可恢复。`)) return
    try {
      await clearUploads()
      closeDetail()
      await load()
      setMessage('已清空全部个人上传')
    } catch (e) {
      setError(e instanceof Error ? e.message : '清空失败')
    }
  }

  return (
    <PageShell
      eyebrow="个人上传数据库 · 仅本机保存"
      title="我的甲骨库"
      lead="在浏览器本地建立一个专属甲骨文图片库：图片与编号/现代字/来源/备注保存在 IndexedDB，不联网、不上传；可以搜索管理，并可一键送 AI 识甲。"
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-amber/40 bg-amber/5 px-4 py-3 text-xs leading-6 text-[#6B4A28]">
          {error}
        </p>
      ) : null}

      <Panel className="p-5 md:p-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            void handleFiles(e.dataTransfer.files)
          }}
          className={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center transition ${
            drag ? 'border-gold bg-gold/10' : 'border-bronze/45 bg-bone/40 hover:bg-bone'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files)
            }}
          />
          {busy ? (
            <Loader2 className="h-9 w-9 animate-spin text-bronze" />
          ) : (
            <UploadCloud className="h-9 w-9 text-bronze" />
          )}
          <div>
            <div className="text-sm text-ink">{busy ? '正在写入本地数据库…' : '点击或拖拽图片到这里批量上传'}</div>
            <div className="mt-1 text-[11px] text-muted">PNG / JPG / JPEG / WEBP / BMP · 单文件 ≤ 25MB · 多文件可选</div>
          </div>
        </div>
        {message ? <p className="mt-3 text-xs text-green">{message}</p> : null}
      </Panel>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bronze" />
          <input
            className="input-base !pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索编号 / 现代字 / 来源 / 备注 / 文件名"
            aria-label="搜索我的甲骨库"
          />
        </div>
        <Tag tone="neutral">{filtered.length.toLocaleString()} 条</Tag>
        <button type="button" className="chip !border-amber/40 !text-amber hover:!bg-amber/10" onClick={() => void removeAll()}>
          <Trash2 className="h-3.5 w-3.5" /> 清空全部
        </button>
      </div>

      {loading ? (
        <Panel className="mt-5 flex items-center justify-center gap-2 p-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在读取本地数据库…
        </Panel>
      ) : filtered.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((record) => (
            <Panel key={record.id} className="group overflow-hidden p-0">
              <button
                type="button"
                onClick={() => openDetail(record)}
                className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-white/60 p-3"
              >
                {urls[record.id] ? (
                  <img
                    src={urls[record.id]}
                    alt={record.fileName}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                ) : (
                  <ImagePlus className="h-8 w-8 text-line" />
                )}
              </button>
              <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-medium text-ink">{record.modern || record.number || record.fileName}</div>
                  <div className="mt-1 truncate text-[11px] text-muted">
                    {[record.number, record.source].filter(Boolean).join(' · ') || record.fileName}
                  </div>
                  <div className="mt-1 text-[10px] text-muted/80">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="编辑"
                    aria-label="编辑记录"
                    onClick={() => openDetail(record)}
                    className="rounded-lg p-2 text-muted transition hover:bg-bone hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    to={{ pathname: '/recognize', search: `?upload=${record.id}` }}
                    className="btn-ghost !px-2 !py-1.5 !text-[10px]"
                    title="用这张图识别"
                  >
                    <Database className="mr-1 h-3 w-3" /> 识别
                  </Link>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel className="mt-5 p-10">
          <EmptyNote
            title={query ? '没有匹配的记录' : '我的甲骨库还是空的'}
            desc={
              query
                ? '换一个关键词试试，或清空搜索。'
                : '点击上方上传区域，把你手头甲骨文拓片/字库图片导入到本机数据库。'
            }
            marker={query ? '无结果' : '等待上传'}
          />
        </Panel>
      )}

      <p className="mt-6 flex items-center gap-2 text-[11px] leading-5 text-muted">
        <FileQuestion className="h-4 w-4 shrink-0 text-bronze" />
        个人上传数据保存在当前浏览器的 IndexedDB（站点隔离）；清理浏览器站点数据会丢失，正式演示前请自行备份原图。
      </p>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <Panel className="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg text-ink">图片详情</h2>
                  <Tag tone="neutral">个人上传 · 本机保存</Tag>
                </div>
                <p className="mt-1 text-xs text-muted">{selected.fileName}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-bone hover:text-ink"
                onClick={closeDetail}
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-line bg-white/60 p-3">
              <img
                src={selectedUrl}
                alt={selected.fileName}
                className="max-h-[260px] max-w-full object-contain"
              />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['number', '编号', '如：T001、本馆编号'],
                  ['modern', '现代字', '如：日（可留空）'],
                  ['source', '来源', '如：采集地、收藏单位、扫描来源'],
                  ['note', '备注', '释读意见或补充说明']
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-muted">{label}</span>
                  <input
                    className="input-base"
                    value={draft[key]}
                    placeholder={placeholder}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-primary !py-2 text-xs" disabled={saving} onClick={() => void saveDetail()}>
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                保存字段
              </button>
              <Link to={{ pathname: '/recognize', search: `?upload=${selected.id}` }} className="btn-gold !py-2 text-xs">
                <Database className="mr-1 h-3.5 w-3.5" /> 用这张图识别
              </Link>
              <button
                type="button"
                className="chip ml-auto !border-amber/40 !text-amber hover:!bg-amber/10"
                onClick={() => void removeOne()}
              >
                <Trash2 className="h-3.5 w-3.5" /> 删除本条
              </button>
            </div>
          </Panel>
        </div>
      ) : null}
    </PageShell>
  )
}
