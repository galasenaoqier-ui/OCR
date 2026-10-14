import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileImage,
  ImagePlus,
  Loader2,
  PenLine,
  ScanSearch,
  Shapes,
  ThumbsDown,
  ThumbsUp,
  Minus,
  RefreshCw
} from 'lucide-react'
import DrawPad from '../components/DrawPad'
import { GlyphShape } from '../components/GlyphShape'
import { CorpusThumb, VisualForGlyphId } from '../components/CorpusVisual'
import {
  Disclaimer,
  EmptyNote,
  PageShell,
  Panel,
  Reveal,
  Ring,
  Tag
} from '../components/ui'
import { byId, relatedOf, SAMPLE_IDS } from '../lib/kb'
import { modelEngine } from '../lib/engine/modelEngine'
import { browserEngine } from '../lib/engine/engine'
import { corpusStats, displayLabel, entryForCorpusId } from '../lib/corpus'
import { fileToDataUrl, readFileAsGray, strokesToDataUrl } from '../lib/imageUtils'
import { getUpload } from '../lib/uploadDB'
import { ExternalApiError, HttpAdapter, mergeExternalResult, type RecognitionInput } from '../lib/api/service'
import {
  addHistory,
  addFeedbackRecord,
  setFeedback
} from '../lib/stores'
import type { Candidate, InputMode, RecognitionResult } from '../lib/types'
import type { GrayImage } from '../lib/engine/binary'

type Tab = 'sample' | 'draw' | 'upload'
type RunState = 'idle' | 'running' | 'done' | 'error'

interface PendingInput {
  mode: InputMode
  label: string
  glyphId?: string
  strokes?: { x: number; y: number }[][]
  gray?: GrayImage
  thumb?: string
}

// 六个“示例字形”直接使用 HUST-OBC 已释学术样本（与 ResNet-50 训练域一致），
// 而不是本地矢量线条画——模型在拓片照片域上训练，对矢量示例会误判。
// 类别号来自 src/data/hust/index.json 的已释类别；马/鱼/龙对应正形 馬/魚/龍。
const SAMPLE_HUST_IDS: Record<string, string> = {
  ri: '0773',
  niu: '1047',
  xiang: '1426',
  ma: '1601',
  yu: '1629',
  long: '1675'
}

function sampleHustFile(id: string): string | undefined {
  const categoryId = SAMPLE_HUST_IDS[id]
  if (!categoryId) return undefined
  const entry = entryForCorpusId(`hust-dec:${categoryId}`)
  return entry?.samples[0]?.file
}

function hybridResult(model: RecognitionResult, local: RecognitionResult): RecognitionResult {
  const merged = new Map<string, Candidate>()
  for (const c of local.candidates) merged.set(c.modern, { ...c, score: c.score * 0.65 })
  for (const c of model.candidates) {
    const prev = merged.get(c.modern)
    if (prev) prev.score += c.score * 0.35
    else merged.set(c.modern, { ...c, score: c.score * 0.35 })
  }
  const candidates = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 5).map((c, i) => ({ ...c, rank: i + 1, score: Number(c.score.toFixed(1)), reason: `本地结构 ${((local.candidates.find((x) => x.modern === c.modern)?.score) || 0).toFixed(1)}% · 学术模型 ${((model.candidates.find((x) => x.modern === c.modern)?.score) || 0).toFixed(1)}%` }))
  const top = candidates[0]
  const agree = Boolean(top && model.top1?.modern === local.top1?.modern)
  return {
    ...local,
    top1: top,
    candidates,
    confident: Boolean(agree && top && top.score >= 70),
    statusText: agree && top && top.score >= 70 ? '高置信度' : '需要进一步考证',
    statusTone: agree && top && top.score >= 70 ? 'high' : 'low',
    engineName: `${local.inputMode === 'draw' ? '手写' : '图片'}双引擎融合 · ResNet-50 + 本地结构匹配`,
    resultTitle: agree ? '识别结果（双引擎一致）' : '识别结果（模型与结构匹配存在分歧）',
    threshold: 70,
    disclaimer:
      agree ? 'ResNet-50 与本地结构匹配结果一致，融合结果仅供研究与学习参考，不替代专业释读。' : 'ResNet-50 与本地结构匹配结果存在分歧，系统展示融合后的 Top-K 候选，仅供研究与学习参考。',
    evidence: top
      ? {
          ...local.evidence,
          libraryMatched: `双引擎融合将“${top.modern}”列为最高候选（融合分数 ${top.score.toFixed(1)}%）。`
        }
      : local.evidence
  }
}

const STEP_LABELS: { title: string; detail: string }[] = [
  { title: '图像预处理', detail: '去噪 · 二值化 · 归一化' },
  { title: '字形检测', detail: '分析笔画与结构' },
  { title: '字库检索', detail: '匹配参考字形' },
  { title: '候选排序', detail: '计算 Top-K 结果' },
  { title: 'AI 辅助分析', detail: '生成解释' }
]

function candidateDetail(c: Candidate | undefined, selected: boolean) {
  if (!c) return null
  return {
    ...c
  }
}

export default function RecognizePage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('sample')
  const [sampleId, setSampleId] = useState('ma')
  const [drawn, setDrawn] = useState<{ x: number; y: number }[][]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileThumb, setFileThumb] = useState('')
  const [fileGray, setFileGray] = useState<GrayImage | null>(null)
  const [pending, setPending] = useState<PendingInput | null>(null)
  const [run, setRun] = useState<RunState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [historyId, setHistoryId] = useState('')
  const [selIdx, setSelIdx] = useState(0)
  const [stepNo, setStepNo] = useState(0)
  const [modelLoad, setModelLoad] = useState<{ loaded: number; total: number } | null>(null)
  const [modelReady, setModelReady] = useState(false)
  const [modelError, setModelError] = useState('')
  const [externalToken, setExternalToken] = useState('')
  const [externalError, setExternalError] = useState('')
  const [externalSaving, setExternalSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onStrokes = useCallback((strokes: { x: number; y: number }[][]) => {
    setDrawn(strokes)
    setPending(null)
  }, [])

  useEffect(() => {
    const p: PendingInput | null =
      tab === 'sample'
        ? { mode: 'sample', label: `示例 · ${byId(sampleId)?.modern || ''}`, glyphId: sampleId }
        : tab === 'draw' && drawn.length
          ? {
              mode: 'draw',
              label: `手写 · ${drawn.length} 笔`,
              strokes: drawn,
              thumb: strokesToDataUrl(drawn)
            }
          : tab === 'upload' && fileGray && file
            ? {
                mode: 'image',
                label: `图片 · ${file.name}`,
                gray: fileGray,
                thumb: fileThumb
              }
            : null
    setPending(p)
  }, [tab, sampleId, drawn, fileGray, file, fileThumb])

  useEffect(() => {
    setRun('idle')
    setResult(null)
    setHistoryId('')
  }, [tab])

  useEffect(() => {
    void browserEngine.ready()
    try {
      setExternalToken(localStorage.getItem('yinqi.baidu.accessToken') || '')
    } catch {
      setExternalToken('')
    }
  }, [])

  function saveExternalToken(value: string) {
    setExternalToken(value)
    setExternalError('')
    setExternalSaving(true)
    try {
      if (value.trim()) localStorage.setItem('yinqi.baidu.accessToken', value.trim())
      else localStorage.removeItem('yinqi.baidu.accessToken')
    } finally {
      window.setTimeout(() => setExternalSaving(false), 0)
    }
  }

  const loadAcademicModel = useCallback(async () => {
    setModelError('')
    setModelReady(false)
    setModelLoad({ loaded: 0, total: 0 })
    modelEngine.setLoadListener((loaded, total) => setModelLoad({ loaded, total }))
    try {
      await modelEngine.ready()
      setModelReady(true)
    } catch (e: unknown) {
      setModelError(e instanceof Error ? e.message : '模型加载失败')
    } finally {
      setModelLoad(null)
      modelEngine.setLoadListener(null)
    }
  }, [])

  function retryAcademicModel() {
    modelEngine.reset()
    void loadAcademicModel()
  }

  function selectSample(id: string) {
    setSampleId(id)
    setTab('sample')
    setFile(null)
    setFileGray(null)
    setFileThumb('')
  }

  async function handleFile(f: File) {
    if (!/\.(png|jpe?g|webp|bmp)$/i.test(f.name) && !f.type.startsWith('image/')) {
      setErrorMsg('仅支持 PNG / JPG / JPEG / WEBP / BMP')
      return
    }
    try {
      setFile(f)
      const [gray, thumb] = await Promise.all([readFileAsGray(f), fileToDataUrl(f)])
      setFileGray(gray)
      setFileThumb(thumb)
      setTab('upload')
    } catch {
      setErrorMsg('图片读取失败，请换一张图片重试')
    }
  }

  const uploadParam = searchParams.get('upload')
  useEffect(() => {
    if (!uploadParam) return
    let cancelled = false
    void (async () => {
      try {
        const record = await getUpload(uploadParam)
        if (cancelled || !record) throw new Error('未找到该上传记录，可能已被删除')
        const file = new File([record.original], record.fileName, { type: record.type })
        await handleFile(file)
      } catch (e) {
        if (!cancelled) setErrorMsg(e instanceof Error ? e.message : '读取个人上传图片失败')
      }
    })()
    return () => {
      cancelled = true
    }
    // handleFile 依赖文件内容与表单状态，仅在 upload 参数变化时触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadParam])

  async function startRecognize() {
    if (!pending) {
      setErrorMsg('请先选择输入内容')
      return
    }
    setErrorMsg('')
    setExternalError('')
    setRun('running')
    setStepNo(0)
    setResult(null)
    setSelIdx(0)
    try {
      const g = pending.glyphId ? byId(pending.glyphId) : undefined
      const localInput = pending.mode === 'draw'
        ? {
            kind: 'strokes' as const,
            mode: pending.mode,
            strokes: pending.strokes!.map((s) => s.map((p) => [p.x, p.y] as [number, number])),
            thumbUrl: pending.thumb
          }
        : pending.mode === 'image'
          ? { kind: 'gray' as const, mode: pending.mode, gray: pending.gray!, thumbUrl: pending.thumb }
          : null
      const localResult = () => pending.mode === 'sample' && g
        ? browserEngine.sampleRecognition(g.id, pending.thumb)
        : browserEngine.recognize(localInput!)
      const externalInput: RecognitionInput = pending.mode === 'sample' && g
        ? { kind: 'strokes', mode: 'sample', strokes: g.strokes, thumbUrl: pending.thumb }
        : localInput!
      if (externalToken.trim()) {
        try {
          const [external, local] = await Promise.all([
            new HttpAdapter(externalToken).recognize(externalInput),
            localResult()
          ])
          const externalMerged = mergeExternalResult(external, local)
          for (let i = 0; i < STEP_LABELS.length + 1; i++) {
            setStepNo(i + 1)
            await new Promise<void>((resolve) => setTimeout(resolve, i === STEP_LABELS.length ? 420 : 300))
          }
          const history = addHistory({ ts: externalMerged.ts, inputMode: externalMerged.inputMode, thumbUrl: externalMerged.inputThumb, top1Id: externalMerged.top1?.glyphId || '', top1Modern: externalMerged.top1?.modern || '', top1Score: externalMerged.top1?.score || 0, confident: externalMerged.confident, candidates: externalMerged.candidates, engineName: externalMerged.engineName })
          setHistoryId(history.id)
          setResult({ ...externalMerged, inputThumb: externalMerged.inputThumb || pending.thumb })
          setRun('done')
          return
        } catch (error) {
          const message = error instanceof ExternalApiError ? error.message : '外部 OCR 请求失败'
          setExternalError(`${message}，已自动切换本地识别`)
        }
      }
      const enginePromise = !modelReady
        ? pending.mode === 'sample' && g
          ? localResult()
          : localResult()
        :
        pending.mode === 'sample' && g
          ? (async () => {
              const file = sampleHustFile(g.id)
              if (!file) {
                // 库外兜底：仍用矢量字形，仅当 HUST 样本缺失时。
                return modelEngine.recognize({
                  kind: 'strokes',
                  mode: 'sample',
                  strokes: g.strokes,
                  thumbUrl: pending.thumb
                })
              }
              const blob = await (await fetch(file)).blob()
              const gray = await readFileAsGray(new File([blob], 'sample.png', { type: blob.type || 'image/png' }))
              return modelEngine.recognize({
                kind: 'gray',
                mode: 'sample',
                gray,
                thumbUrl: file
              })
            })()
          : pending.mode === 'draw'
            ? (async () => {
                const strokes = pending.strokes!.map((s) => s.map((p) => [p.x, p.y] as [number, number]))
                const model = await modelEngine.recognize({
                  kind: 'strokes',
                  mode: 'draw',
                  strokes,
                  thumbUrl: pending.thumb
                })
                const local = await browserEngine.recognize({
                  kind: 'strokes',
                  mode: 'draw',
                  strokes,
                  thumbUrl: pending.thumb
                })
                return local.top1 ? hybridResult(model, local) : model
              })()
            : (async () => {
                const [model, local] = await Promise.all([
                  modelEngine.recognize({
                    kind: 'gray',
                    mode: 'image',
                    gray: pending.gray!,
                    thumbUrl: pending.thumb
                  }),
                  localResult()
                ])
                return local.top1 ? hybridResult(model, local) : model
              })()
      let res: RecognitionResult
      try {
        res = await enginePromise
      } catch (modelFailure) {
        if (!modelReady) throw modelFailure
        const reason = modelFailure instanceof Error ? modelFailure.message : '模型推理失败'
        setModelReady(false)
        setModelError(reason)
        modelEngine.reset()
        res = await localResult()
      }
      for (let i = 0; i < STEP_LABELS.length + 1; i++) {
        setStepNo(i + 1)
        await new Promise<void>((resolve) => setTimeout(resolve, i === STEP_LABELS.length ? 420 : 300))
      }
      const history = addHistory({
        ts: res.ts,
        inputMode: res.inputMode,
        thumbUrl: res.inputThumb,
        top1Id: res.top1?.glyphId || '',
        top1Modern: res.top1?.modern || '',
        top1Score: res.top1?.score || 0,
        confident: res.confident,
        candidates: res.candidates,
        engineName: res.engineName
      })
      setHistoryId(history.id)
      setResult({ ...res, inputThumb: res.inputThumb || pending.thumb })
      setRun('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '识别失败')
      setRun('error')
    }
  }

  function onFeedback(choice: 'correct' | 'wrong' | 'uncertain') {
    if (!historyId || !result?.top1) return
    setFeedback(historyId, choice)
    addFeedbackRecord(choice, result.top1.modern, result.top1.score)
    setHistoryId('')
  }

  const inputPanel =
    tab === 'sample' ? (
      <div>
        <p className="mb-3 text-xs text-muted">点击示例字形，载入与模型同源的 HUST-OBC 学术样本（已释拓片）。</p>
        <div className="grid grid-cols-3 gap-2">
          {SAMPLE_IDS.map((id) => {
            const g = byId(id)!
            const file = sampleHustFile(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectSample(id)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition hover:-translate-y-0.5 hover:border-bronze ${
                  sampleId === id && tab === 'sample' ? 'border-bronze bg-bronze/5' : 'border-line bg-paper'
                }`}
              >
                <span className="h-14 w-14 text-ink">
                  {file ? (
                    <img
                      src={file}
                      alt={`示例 · ${g.modern}`}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-contain mix-blend-multiply"
                    />
                  ) : (
                    <GlyphShape glyph={g} className="h-full w-full" />
                  )}
                </span>
                <span className="text-sm">{g.modern}</span>
                <span className="text-[10px] text-muted">{g.pinyin}</span>
              </button>
            )
          })}
        </div>
      </div>
    ) : tab === 'draw' ? (
      <DrawPad onStrokesChange={onStrokes} />
    ) : (
      <div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.bmp,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
        {fileThumb ? (
          <div className="space-y-3">
            <div className="relative mx-auto aspect-square max-w-[300px] overflow-hidden rounded-xl border border-line bg-paper">
              <img src={fileThumb} alt="上传预览" className="h-full w-full object-contain" />
            </div>
            <button className="btn-ghost w-full !py-2 text-xs" type="button" onClick={() => fileRef.current?.click()}>
              重新选择图片
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-bronze/45 bg-paper text-muted transition hover:border-bronze hover:bg-bone"
          >
            <ImagePlus className="h-8 w-8 text-bronze" />
            <span className="text-sm text-ink">上传甲骨拓片</span>
            <span className="text-[11px]">PNG / JPG / JPEG / WEBP / BMP</span>
          </button>
        )}
      </div>
    )

  return (
    <PageShell eyebrow="核心研究功能" title="AI 识甲" lead="上传骨片、手写字形或选择示例，使用浏览器本地 ResNet-50 学术模型完成 1588 类识别；手写输入若模型置信度低于 70%，会自动用本地 69 字矢量字形复核并明确标注结果来源。">
      <div className="grid items-start gap-6 xl:grid-cols-[400px_1fr]">
        {/* 左侧输入 */}
        <div className="space-y-4 xl:sticky xl:top-24">
          <Panel className="mobile-tight-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink">输入甲骨文</h2>
              <Tag tone="neutral">
                {modelReady ? 'ResNet-50 模型已就绪' : modelError ? '本地结构匹配可用' : '本地结构匹配已就绪'}
              </Tag>
            </div>
            <div className="mb-4 rounded-lg border border-line/70 bg-bone/40 p-3">
              <label className="block text-[11px] text-muted" htmlFor="baidu-access-token">百度 OCR Access Token（可选）</label>
              <div className="mt-2 flex gap-2">
                <input
                  id="baidu-access-token"
                  type="password"
                  value={externalToken}
                  onChange={(event) => saveExternalToken(event.target.value)}
                  placeholder="输入后启用外部增强"
                  className="min-w-0 flex-1 rounded-md border border-line bg-paper px-2.5 py-2 text-xs text-ink outline-none focus:border-bronze"
                  autoComplete="off"
                />
                {externalToken ? <button type="button" onClick={() => saveExternalToken('')} className="chip shrink-0">清除</button> : null}
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-muted">凭据仅保存在本机浏览器；未填写时使用本地识别。</p>
              {externalSaving ? <span className="text-[10px] text-green">已保存</span> : null}
              {externalError ? <p className="mt-1 rounded-md bg-amber/10 px-2 py-1 text-[10px] leading-4 text-[#6B4A28]">{externalError}</p> : null}
            </div>
              <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-bone p-1 text-[11px] sm:text-xs">
              {(
                [
                  ['sample', '示例字形', Shapes],
                  ['draw', '手写输入', PenLine],
                  ['upload', '上传图片', FileImage]
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 transition ${
                    tab === key ? 'bg-ink text-bone' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            {inputPanel}
            <button
              type="button"
              onClick={() => void startRecognize()}
              disabled={run === 'running' || !pending}
              className="btn-primary mt-5 w-full"
            >
              {run === 'running' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}
              {run === 'running' ? '正在识别…' : '开始识别'}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted">
              {pending ? pending.label : '请先选择输入内容'}
            </p>
            {errorMsg ? <p className="mt-2 rounded-md bg-amber/10 px-3 py-2 text-xs text-[#6B4A28]">{errorMsg}</p> : null}
            {modelLoad ? (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-muted">
                  <span>{modelLoad.total ? '下载 ONNX 模型' : '正在初始化 ResNet-50…'}</span>
                  <span>{modelLoad.total ? `${Math.round((modelLoad.loaded / 1024 / 1024) * 10) / 10} / ${Math.round((modelLoad.total / 1024 / 1024) * 10) / 10} MB` : ''}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-line/60">
                  <div
                    className="h-full rounded-full bg-bronze transition-all"
                    style={{ width: `${modelLoad.total ? Math.min(100, (modelLoad.loaded / modelLoad.total) * 100) : 15}%` }}
                  />
                </div>
              </div>
            ) : null}
            {modelError ? (
              <div className="mt-2 rounded-md bg-amber/10 px-3 py-2 text-xs leading-5 text-[#6B4A28]">
                <p>学术模型不可用，当前使用本地结构匹配：{modelError}</p>
                <button type="button" onClick={retryAcademicModel} className="mt-1 inline-flex items-center gap-1 font-medium text-bronzeDark hover:underline">
                  <RefreshCw className="h-3 w-3" /> 重试模型
                </button>
              </div>
            ) : modelReady ? (
              <p className="mt-2 text-center text-[10px] leading-4 text-muted">
                ResNet-50 可用；识别时将与本地结构匹配融合，图片不会上传。
              </p>
            ) : (
              <div className="mt-2 text-center text-[10px] leading-4 text-muted">
                默认使用本地结构匹配。需要 1588 类学术模型时再加载 102 MB ONNX 文件。
                <button type="button" onClick={() => void loadAcademicModel()} className="ml-1 font-medium text-bronzeDark hover:underline">加载学术模型</button>
              </div>
            )}
          </Panel>
        </div>

        {/* 右侧结果/流程 */}
        <div className="min-w-0">
          {run === 'running' ? (
            <Panel className="mobile-tight-panel p-8">
              <div className="mb-8 flex items-center gap-3">
                <ScanSearch className="h-5 w-5 animate-pulse text-bronze" />
                <h3 className="text-lg text-ink">正在分析</h3>
                <span className="text-xs text-muted">{pending?.label}</span>
              </div>
              <div className="space-y-2">
                {STEP_LABELS.map((s, i) => {
                  const idx = i + 1
                  const active = stepNo === idx
                  const done = stepNo > idx
                  return (
                    <div
                      key={s.title}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-3 transition sm:gap-4 sm:px-4 ${
                        active
                          ? 'border-gold bg-gold/10'
                          : done
                            ? 'border-line/80 bg-paper'
                            : 'border-line/50 opacity-45'
                      }`}
                    >
                      <span className={`font-song text-lg ${active ? 'text-bronzeDark' : 'text-muted'}`}>
                        {String(idx).padStart(2, '0')}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm text-ink">{s.title}</div>
                        <div className="text-[11px] text-muted">{s.detail}</div>
                      </div>
                      {done ? <Check className="h-4 w-4 text-green" /> : active ? <Loader2 className="h-4 w-4 animate-spin text-bronze" /> : null}
                    </div>
                  )
                })}
                <div className={`flex items-center justify-between px-4 py-3 text-xs ${stepNo > STEP_LABELS.length ? 'text-green' : 'text-muted'}`}>
                  {stepNo > STEP_LABELS.length ? '分析完成，正在生成报告…' : 'AI 正在阅读你的字形'}
                </div>
              </div>
            </Panel>
          ) : result ? (
            <ResultView
              result={result}
              selIdx={selIdx}
              onSelect={setSelIdx}
              historyId={historyId}
              onFeedback={onFeedback}
              onRestart={() => {
                setRun('idle')
                setResult(null)
              }}
            />
          ) : (
            <Panel className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-bronze/25 bg-bone">
                <Shapes className="h-7 w-7 text-bronze" />
              </div>
              <h2 className="text-xl text-ink">尚未开始识别</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                选择示例字形、上传骨片图片或手写一个字形，点击「开始识别」。高置信才显示确定结果；低置信进入 AI 辅助释读建议。
              </p>
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function ResultView({
  result,
  selIdx,
  onSelect,
  historyId,
  onFeedback,
  onRestart
}: {
  result: RecognitionResult
  selIdx: number
  onSelect: (i: number) => void
  historyId: string
  onFeedback: (choice: 'correct' | 'wrong' | 'uncertain') => void
  onRestart: () => void
}) {
  const selected = result.candidates[selIdx]
  if (!selected) {
    return (
      <Panel className="p-8">
        <EmptyNote title="未能提取到有效笔画" desc={result.evidence.summary} marker="需要进一步考证" />
      </Panel>
    )
  }
  return (
    <div className="space-y-5">
      {result.confident ? (
        <HighConfidence
          result={result}
          selected={selected}
          selIdx={selIdx}
          onSelect={onSelect}
          historyId={historyId}
          onFeedback={onFeedback}
          onRestart={onRestart}
        />
      ) : (
        <LowConfidence
          result={result}
          selected={selected}
          onSelect={onSelect}
          historyId={historyId}
          onRestart={onRestart}
        />
      )}
    </div>
  )
}

function CandidateRows({
  candidates,
  selIdx,
  onSelect
}: {
  candidates: Candidate[]
  selIdx: number
  onSelect: (i: number) => void
}) {
  return (
    <Panel className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm text-ink">AI 候选 Top-K</h3>
      <div className="overflow-hidden rounded-lg border border-line/70">
        {candidates.map((c, i) => {
          const g = byId(c.glyphId)
          const active = i === selIdx
          return (
            <button
              key={c.glyphId + i}
              type="button"
              onClick={() => onSelect(i)}
              className={`grid w-full grid-cols-[2.2rem_3.4rem_1fr_auto_auto] items-center gap-3 border-b border-line/60 px-4 py-2.5 text-left transition last:border-0 hover:bg-bone/60 ${
                active ? 'bg-bronze/10' : ''
              }`}
            >
              <span className="text-xs text-muted">{String(c.rank).padStart(2, '0')}</span>
              <span className="h-10 w-10 text-ink">
                <VisualForGlyphId glyphId={c.glyphId} modern={c.modern} className="h-full w-full object-contain" />
              </span>
              <span>
                <span className="block text-base text-ink">{c.modern}</span>
                <span className="block text-[10px] text-muted">{c.pinyin}</span>
              </span>
              <span className="text-sm font-medium text-ink">{c.score.toFixed(1)}%</span>
              {active ? <Check className="h-4 w-4 text-bronzeDark" /> : <ChevronRight className="h-4 w-4 text-muted/50" />}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

function HighConfidence({
  result,
  selected,
  selIdx,
  onSelect,
  historyId,
  onFeedback,
  onRestart
}: {
  result: RecognitionResult
  selected: Candidate
  selIdx: number
  onSelect: (i: number) => void
  historyId: string
  onFeedback: (choice: 'correct' | 'wrong' | 'uncertain') => void
  onRestart: () => void
}) {
  const glyph = byId(selected.glyphId)
  const corpusEntry = entryForCorpusId(selected.glyphId)
  const isTop = selIdx === 0
  return (
    <>
      <Panel className="turtle-corner-fragment overflow-hidden p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-5">
            {glyph ? (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-line bg-bone p-2 text-ink">
                <GlyphShape glyph={glyph} className="h-full w-full" />
              </div>
            ) : corpusEntry && corpusEntry.samples.length ? (
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-line bg-bone p-1.5">
                <CorpusThumb entry={corpusEntry} className="max-h-full max-w-full object-contain" alt={displayLabel(corpusEntry)} />
              </div>
            ) : null}
            <div>
              <div className="font-song text-6xl leading-none text-ink">{selected.modern}</div>
              <div className="mt-3 flex items-center gap-2">
                <Tag tone="green">🟢 {result.statusText}</Tag>
                {!isTop ? <Tag tone="neutral">正在查看第 {selected.rank} 候选</Tag> : null}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-song text-4xl text-bronzeDark">{selected.score.toFixed(1)}%</div>
            <div className="mt-1 text-xs tracking-widest text-muted">HIGH CONFIDENCE</div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['现代汉字', selected.modern],
            ['拼音', selected.pinyin],
            ['类别', `${selected.category} · 象形`],
            ['释义', selected.meaning]
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line/70 bg-bone/50 px-4 py-3">
              <div className="text-[11px] text-muted">{k}</div>
              <div className="mt-1 text-sm leading-5 text-ink">{v}</div>
            </div>
          ))}
        </div>
        {!isTop ? (
          <p className="mt-4 rounded-lg bg-bone/70 px-4 py-3 text-xs leading-6 text-muted">
            {selected.reason}
          </p>
        ) : null}
      </Panel>

      <CandidateRows candidates={result.candidates} selIdx={selIdx} onSelect={onSelect} />

      <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="font-song text-lg text-ink">让数字史官为你讲解</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            自动携带当前识别文字、置信度与字形资料进入「殷契灵境」，无需重新提问。
          </p>
        </div>
        <Link
          to={`/digital-human?from=recognize&glyph=${encodeURIComponent(selected.glyphId)}&modern=${encodeURIComponent(selected.modern)}&score=${selected.score.toFixed(1)}`}
          className="btn-primary !px-5 !py-2.5 text-xs"
        >
          让数字史官讲解
        </Link>
      </Panel>

      <EvidenceChainView result={result} selected={selected} isTop={isTop} />

      <Panel className="p-5">
        <h3 className="mb-4 text-sm text-ink">用户反馈</h3>
        <div className="flex flex-wrap gap-2">
          {historyId ? (
            <>
              <button className="chip hover:border-green" type="button" onClick={() => onFeedback('correct')}>
                <ThumbsUp className="h-3.5 w-3.5" /> 识别正确
              </button>
              <button className="chip hover:border-amber" type="button" onClick={() => onFeedback('wrong')}>
                <ThumbsDown className="h-3.5 w-3.5" /> 识别错误
              </button>
              <button className="chip" type="button" onClick={() => onFeedback('uncertain')}>
                <Minus className="h-3.5 w-3.5" /> 不确定
              </button>
            </>
          ) : (
            <span className="text-xs text-muted">已记录本次反馈，感谢参与人机协同校验。</span>
          )}
          <button className="chip ml-auto hover:border-gold" type="button" onClick={onRestart}>
            <ArrowRight className="h-3.5 w-3.5 rotate-180" /> 重新识别
          </button>
        </div>
        <Disclaimer tone="neutral">{result.disclaimer}</Disclaimer>
      </Panel>
    </>
  )
}

function LowConfidence({
  result,
  selected,
  onSelect,
  historyId,
  onRestart
}: {
  result: RecognitionResult
  selected: Candidate
  onSelect: (i: number) => void
  historyId: string
  onRestart: () => void
}) {
  return (
    <>
      <Panel className="turtle-corner-fragment overflow-hidden border-amber/30 p-6 md:p-8">
        <Tag tone="amber">🟡 {result.statusText}</Tag>
        <h2 className="font-song mt-4 text-4xl text-ink">暂未能可靠识别</h2>
        <p className="mt-2 text-sm text-muted">AI 不会强行给出确定答案，以下仅为可追溯的辅助方向。</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-medium text-ink">AI 结构分析</h3>
            <div className="rounded-xl border border-line/70 bg-bone/60 p-4 text-xs leading-6 text-ink/85">
              <p>{result.evidence.summary}</p>
              <p className="mt-2 text-muted">{result.aiHint}</p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {result.aiFeatureLines.map((l) => (
                <li key={l} className="rounded-full border border-line bg-paper px-3 py-1 text-[11px] text-muted">
                  {l}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium text-ink">候选释读方向</h3>
            <div className="space-y-2">
              {result.candidates.map((c, i) => (
                <button
                  key={c.glyphId}
                  type="button"
                  onClick={() => onSelect(i)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    selected.rank === c.rank ? 'border-amber/50 bg-amber/5' : 'border-line/70 bg-paper hover:border-bronze/40'
                  }`}
                >
                  <span className="text-xs text-muted">{String(c.rank).padStart(2, '0')}</span>
                  <span className="font-song text-2xl text-ink">{c.modern}</span>
                  <span className="ml-auto text-sm font-medium">{c.score.toFixed(1)}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-5 rounded-lg bg-amber/5 px-4 py-3 text-xs leading-6 text-[#6B4A28]">
          {selected.reason} 相似度与理由仅供判断参考。
        </p>
      </Panel>
      <Panel className="p-5">
        <h3 className="mb-3 text-sm text-ink">考证提示</h3>
        <p className="mb-4 text-xs leading-5 text-muted">
          建议把本次类别号、结构特征与 Top 候选截图归档到个人研究材料，再结合辞例与工具书交由人工/专家考证；本页面不代替专业释读结论。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="chip ml-auto" type="button" onClick={onRestart}>重新识别</button>
        </div>
        <Disclaimer>{result.disclaimer}</Disclaimer>
      </Panel>
    </>
  )
}

function EvidenceChainView({
  result,
  selected,
  isTop
}: {
  result: RecognitionResult
  selected: Candidate
  isTop: boolean
}) {
  const g = byId(selected.glyphId)
  const entryRefs = g
    ? []
    : result.candidates
        .slice(0, 3)
        .map((c) => entryForCorpusId(c.glyphId))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
  const vectorRefs = g
    ? [g, ...relatedOf(g.id).filter((r) => r.id !== g.id).slice(0, 2)]
        .slice(0, 3)
        .filter((r) => Boolean(r))
    : []
  if (!vectorRefs.length && !entryRefs.length) {
    for (const cand of result.candidates) {
      if (vectorRefs.length + entryRefs.length >= 3) break
      const cg = byId(cand.glyphId)
      if (cg && !vectorRefs.some((r) => r.id === cg.id)) vectorRefs.push(cg)
    }
  }
  const f = result.evidence.features
  const feats: [string, string, number][] = [
    ['左右对称', f.symmetry >= 0.8 ? '较高' : f.symmetry <= 0.55 ? '偏弱' : '一般', f.symmetry],
    ['笔画密度', f.density >= 0.25 && f.density <= 0.6 ? '中等' : f.density < 0.25 ? '疏朗' : '较密', f.density],
    ['重心位置', f.topRatio > 0.58 ? '偏上' : f.topRatio < 0.42 ? '偏下' : '居中', Math.abs(0.5 - f.topRatio) * 2],
    ['长宽比例', f.bboxAspect > 1.1 ? '横展' : f.bboxAspect < 0.9 ? '纵长' : '接近方形', Math.min(1, 1 / (1 + Math.abs(1 - f.bboxAspect)))],
    ['纵横线', `${f.hLines} 横 · ${f.vLines} 纵`, Math.min(1, (f.hLines + f.vLines) / 4)],
    ['部件数', `${f.componentCount} 个`, Math.min(1, f.componentCount / 5)]
  ]
  return (
    <Panel className="p-6 md:p-8">
      <div className="eyebrow mb-2">识别证据链</div>
      <h2 className="font-song mb-8 text-3xl text-ink">
        {isTop ? `为什么是“${selected.modern}”？` : `为什么把“${selected.modern}”列入候选？`}
      </h2>
      <div className="space-y-6">
        <Reveal>
          <div className="flex gap-4">
            <span className="font-song text-lg text-gold">01</span>
            <div className="min-w-0 flex-1">
              <h3 className="mb-5 text-lg text-ink">{result.engineName.includes('ResNet') ? '模型判断' : '字形相似'}</h3>
              <div className="flex flex-wrap gap-8">
                <Ring value={selected.score} label={result.engineName.includes('ResNet') ? '模型置信度' : '综合相似度'} />
                <Ring value={selected.coverage ?? 0} label="笔画覆盖率" />
                <div className="min-w-[220px] flex-1 text-xs leading-6 text-muted">
                  {result.engineName.includes('ResNet')
                    ? 'ONNX ResNet-50 在 1588 个已释类别上输出 Softmax 概率；本数字是模型对当前输入属于该类的置信度（百分比）。'
                    : '采用 Chamfer 双向距离 + 双向笔画覆盖率组合评分：既要求参考字形被查询覆盖，也要求查询字形被参考覆盖。'}
                  {selected.chamfer !== null ? <p className="mt-2">Chamfer 双向距离 {selected.chamfer}（越小越接近）</p> : null}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal>
          <div className="flex gap-4">
            <span className="font-song text-lg text-gold">02</span>
            <div className="min-w-0 flex-1">
              <h3 className="mb-5 text-lg text-ink">视觉结构</h3>
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {feats.map(([label, value, pct]) => (
                  <div key={label} className="text-xs">
                    <div className="flex justify-between text-muted">
                      <span>{label}</span>
                      <span className="text-ink">{value}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/60">
                      <div className="h-full rounded-full bg-bronze/70" style={{ width: `${Math.max(4, pct * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal>
          <div className="flex gap-4">
            <span className="font-song text-lg text-gold">03</span>
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-lg text-ink">数据库匹配</h3>
              <p className="mb-5 max-w-2xl text-xs leading-6 text-muted">
                {result.evidence.libraryMatched.replaceAll('“' + result.top1?.modern, `“${selected.modern}`)}
              </p>
              <div className="flex flex-wrap gap-4">
                {vectorRefs.map((rg) => (
                  <div key={rg.id} className="flex w-24 flex-col items-center rounded-lg border border-line bg-bone p-2 text-ink">
                    <GlyphShape glyph={rg} className="h-16 w-16" />
                    <span className="mt-1 text-sm">{rg.modern}</span>
                  </div>
                ))}
                {entryRefs.map((e) => (
                  <div key={e.id} className="flex w-24 flex-col items-center overflow-hidden rounded-lg border border-line bg-bone p-2 text-ink">
                    <CorpusThumb entry={e} className="h-16 w-16 object-contain" alt={displayLabel(e)} />
                    <span className="mt-1 text-sm">{displayLabel(e).split('（')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal>
          <div className="flex gap-4">
            <span className="font-song text-lg text-gold">04</span>
            <div className="min-w-0 flex-1">
              <h3 className="mb-3 text-lg text-ink">AI 判断</h3>
              <blockquote className="border-l-2 border-gold pl-4 text-sm leading-7 text-ink/85">
                当前输入字形与已释甲骨文“{selected.modern}”的字形特征具有较高一致性
                {isTop ? '，因此系统将“' + selected.modern + '”列为第一候选。' : `，系统将其列为第 ${selected.rank} 候选供人工参考。`}
              </blockquote>
              <p className="mt-3 text-xs leading-6 text-muted">{result.aiHint}</p>
            </div>
          </div>
        </Reveal>
      </div>
      <Disclaimer tone="neutral">
        识别结果仅供研究与学习参考，不替代古文字学专家释读。证据链数据来自
        {result.engineName.includes('ResNet')
          ? '浏览器本地 ONNX ResNet-50 的真实推理结果'
          : '本地传统字形匹配引擎的真实计算结果'}。
      </Disclaimer>
    </Panel>
  )
}
