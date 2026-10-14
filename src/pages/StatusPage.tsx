import { Activity, Check, Cpu, Database, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { PageShell, Panel, Tag } from '../components/ui'
import { HUST_DEC, corpusStats } from '../lib/corpus'
import { browserEngine } from '../lib/engine/engine'
import { hustBrowserEngine } from '../lib/engine/hustEngine'
import { GLYPHS } from '../lib/kb'
import { readFileAsGray } from '../lib/imageUtils'

export default function StatusPage() {
  const [progress, setProgress] = useState(0)
  const [passing, setPassing] = useState(0)
  const [running, setRunning] = useState(false)
  const [failures, setFailures] = useState<string[]>([])
  const [hustRunning, setHustRunning] = useState(false)
  const [hustPassing, setHustPassing] = useState(0)
  const [hustTotal, setHustTotal] = useState(0)
  const [hustDetails, setHustDetails] = useState<string[]>([])
  const [loadText, setLoadText] = useState('')

  async function runSelfTest() {
    setRunning(true)
    setProgress(0)
    setPassing(0)
    setFailures([])
    for (const g of GLYPHS) {
      try {
        const r = await browserEngine.sampleRecognition(g.id)
        if (r.top1?.glyphId === g.id && r.confident) setPassing((n) => n + 1)
        else setFailures((f) => [...f, `${g.modern}：命中 ${r.top1?.modern || '无'}`])
      } catch (e) {
        setFailures((f) => [...f, `${g.modern}：${e instanceof Error ? e.message : '异常'}`])
      }
      setProgress((p) => p + 1)
    }
    setRunning(false)
  }

  const status = browserEngine.status()
  const stats = corpusStats()
  async function runHustSelfTest() {
    setHustRunning(true)
    setHustPassing(0)
    setHustTotal(0)
    setHustDetails([])
    const candidates = HUST_DEC.filter((e) => e.samples.length >= 2)
    const sample: (typeof HUST_DEC)[number][] = []
    const step = Math.max(1, Math.floor(candidates.length / 20))
    for (let i = 0; i < 20; i++) {
      const e = candidates[(i * step + (i * 37) % candidates.length) % candidates.length]
      if (e && !sample.some((s) => s.id === e.id)) sample.push(e)
    }
    setLoadText(`加载 HUST 模板索引…`)
    hustBrowserEngine.setLoadListener((loaded, total) => {
      setLoadText(`加载 HUST 模板索引 ${Math.round((loaded / 1024 / 1024) * 10) / 10} MB`)
    })
    try {
      await hustBrowserEngine.ready()
      hustBrowserEngine.setLoadListener(null)
      for (let i = 0; i < sample.length; i++) {
        const e = sample[i]
        setLoadText(`学术库自检 ${i + 1}/${sample.length}：${e.categoryId}`)
        try {
          const sampleFile = e.samples[Math.min(1, e.samples.length - 1)].file
          const blob = await (await fetch(sampleFile)).blob()
          const gray = await readFileAsGray(new File([blob], `q${i}.png`, { type: blob.type || 'image/png' }))
          const r = await hustBrowserEngine.recognize({ kind: 'gray', mode: 'image', gray })
          if (r.top1?.glyphId === `hust-dec:${e.categoryId}`) setHustPassing((n) => n + 1)
          else setHustDetails((d) => [...d, `${e.categoryId}：Top1 ${r.top1?.modern || '无'}`])
        } catch (err) {
          setHustDetails((d) => [...d, `${e.categoryId}：${err instanceof Error ? err.message : '异常'}`])
        }
        setHustTotal(i + 1)
      }
    } catch (err) {
      hustBrowserEngine.setLoadListener(null)
      setHustDetails((d) => [...d, `加载失败：${err instanceof Error ? err.message : String(err)}`])
    }
    setLoadText('')
    setHustRunning(false)
  }
  return (
    <PageShell
      eyebrow="系统自检"
      title="识别引擎自检"
      lead="逐字渲染本地 69 个字形并交给识别引擎重新识别，验证“渲染 → 预处理 → 匹配”链路在浏览器内真实可用。"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <Panel className="p-6">
          <Cpu className="mb-4 h-6 w-6 text-bronze" />
          <div className="eyebrow mb-2">本地引擎</div>
          <div className="text-sm leading-6 text-ink/85">{status.engine}</div>
          <div className="mt-3 flex items-center gap-2">
            <Tag tone="green">可用</Tag>
            <span className="text-xs text-muted">{status.librarySize} 字参考字库</span>
          </div>
        </Panel>
        <Panel className="p-6">
          <ShieldCheck className="mb-4 h-6 w-6 text-bronze" />
          <div className="eyebrow mb-2">学术识别模型</div>
          <div className="text-sm leading-6 text-ink/85">HUST-OBC ResNet-50（ONNX · 浏览器本地）</div>
          <div className="mt-3"><Tag tone="green">已接入 · 需首次加载</Tag></div>
          <p className="mt-3 text-[11px] leading-5 text-muted">
            模型约 102 MB，打开 AI 识甲页即自动加载；
            官方 Validation 测试集报告 Top-1 约 94.6%，任意上传结果以页面置信度为准。
          </p>
        </Panel>
        <Panel className="p-6">
          <Activity className="mb-4 h-6 w-6 text-bronze" />
          <div className="eyebrow mb-2">自检进度</div>
          <div className="font-song text-4xl text-ink">
            {running ? `${progress} / ${GLYPHS.length}` : `${passing} / ${GLYPHS.length}`}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/60">
            <div className="h-full rounded-full bg-green transition-all" style={{ width: `${(progress / GLYPHS.length) * 100}%` }} />
          </div>
          <button className="btn-primary mt-5 w-full !py-2 text-xs" type="button" onClick={() => void runSelfTest()} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : '开始 69 字自检'}
          </button>
        </Panel>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <Panel className="p-6">
          <Database className="mb-4 h-6 w-6 text-bronze" />
          <div className="eyebrow mb-2">HUST-OBC 学术数据（实检）</div>
          <div className="space-y-2 text-sm leading-6 text-ink/85">
            <div className="flex justify-between"><span>已释根类</span><strong>{stats.deciphered.rootCategories.toLocaleString()}</strong></div>
            <div className="flex justify-between"><span>已释源图像</span><strong>{stats.deciphered.imageFiles.toLocaleString()}</strong></div>
            <div className="flex justify-between"><span>未释类别（目录）</span><strong>{stats.undeciphered.leafCategories.toLocaleString()}</strong></div>
            <div className="flex justify-between"><span>待复核 GXD</span><strong>{stats.gxd1390.categories.toLocaleString()}</strong></div>
            <div className="flex justify-between"><span>与本地精品字库对应</span><strong>{stats.localMapped}/69</strong></div>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted">
            学术库采用 HUST-OBC（CC BY-NC 4.0）图像模板，不参与任何深度学习指标展示。
          </p>
        </Panel>
        <Panel className="p-6">
          <Cpu className="mb-4 h-6 w-6 text-bronze" />
          <div className="eyebrow mb-2">学术库模板自检（抽样，如实测量）</div>
          <p className="text-sm leading-6 text-muted">
            抽取 20 个已释类别，用“非主模板的内置示例图”作为查询，检验 HUST 大库在浏览器内的真实 Top-1 命中情况；本项不预设准确率。
          </p>
          <div className="mt-4 flex items-end gap-3">
            <div className="font-song text-5xl text-ink">
              {hustRunning || hustTotal > 0 ? `${hustPassing} / ${hustTotal || 20}` : '20'}
            </div>
            <div className="pb-1 text-xs text-muted">样本命中</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/60">
            <div className="h-full rounded-full bg-bronze transition-all" style={{ width: `${(hustTotal / 20) * 100}%` }} />
          </div>
          <p className="mt-3 min-h-[1.2rem] text-xs text-muted">{loadText}</p>
          <button className="btn-primary mt-2 w-full !py-2.5 text-xs" type="button" onClick={() => void runHustSelfTest()} disabled={hustRunning}>
            {hustRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : '开始 HUST 抽样自检'}
          </button>
          {hustDetails.length ? (
            <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-[11px] leading-4 text-amber">
              {hustDetails.map((d) => <li key={d}>{d}</li>)}
            </ul>
          ) : hustTotal === 20 && !hustRunning ? (
            <p className="mt-3 text-xs text-green">抽样完成：Top-1 命中 {hustPassing}/20（实测值，不承诺全库准确率）。</p>
          ) : null}
        </Panel>
      </div>
      {failures.length ? (
        <Panel className="mt-6 p-5">
          <div className="text-xs text-amber">自检失败项：</div>
          {failures.map((f) => (
            <p key={f} className="mt-1 text-xs text-muted">{f}</p>
          ))}
        </Panel>
      ) : progress > 0 ? (
        <Panel className="mt-6 flex items-center gap-3 p-5 text-sm text-green">
          <Check className="h-5 w-5" /> 69 字形全部通过 Top-1 命中与高置信检查。
        </Panel>
      ) : null}
    </PageShell>
  )
}
