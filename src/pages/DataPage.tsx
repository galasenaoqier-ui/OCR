import { Eraser } from 'lucide-react'
import { useState } from 'react'
import EChartBox from '../components/EChartBox'
import { PageShell, Panel, Tag } from '../components/ui'
import { clearDemoData, listHistory, practiceStats, readLearning } from '../lib/stores'

export default function DataPage() {
  const [ver, setVer] = useState(0)
  const stats = practiceStats()
  const learningCount = readLearning().length
  const refresh = () => setVer((v) => v + 1)
  void ver
  const trend = useMemoTrend()
  const cards = [
    { label: '累计识别次数', value: stats.testCount, demo: false },
    { label: '高置信识别', value: stats.top1Count, demo: false },
    { label: '学习报告', value: learningCount, demo: true },
    { label: '反馈·正确', value: stats.feedbackCorrect, demo: false },
    { label: '反馈·存疑', value: stats.feedbackUncertain, demo: false },
    { label: '反馈·错误', value: stats.feedbackWrong, demo: false }
  ]
  return (
    <PageShell
      eyebrow="识别与学习数据"
      title="识别数据"
      lead="只统计保存在本机浏览器的真实识别与反馈记录；学习报告为演示数据。未开展的问卷、场次与满意度不再展示占位指标。"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Panel key={c.label} className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted">{c.label}</div>
              {c.demo ? <Tag tone="amber">演示数据</Tag> : <Tag tone="green">真实计数</Tag>}
            </div>
            <div className="mt-4 flex h-12 items-center">
              <span className="font-song text-5xl text-ink">{c.value}</span>
            </div>
          </Panel>
        ))}
      </div>

      {trend && trend.some((t) => t.value > 0) ? (
        <Panel className="mt-6 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm text-ink">识别次数趋势（真实历史记录）</h2>
            <Tag tone="green">真实计数</Tag>
          </div>
          <EChartBox
            height={260}
            option={{
              grid: { left: 40, right: 18, top: 24, bottom: 28 },
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: trend.map((t) => t.day), axisLine: { lineStyle: { color: '#4A3C30' } } },
              yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#D8CCB4' } } },
              series: [
                {
                  name: '本地识别次数',
                  type: 'line',
                  smooth: true,
                  data: trend.map((t) => t.value),
                  lineStyle: { color: '#2B211A', width: 2 },
                  itemStyle: { color: '#C28A3D' },
                  areaStyle: { color: 'rgba(194,138,61,.16)' }
                }
              ]
            }}
          />
        </Panel>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/80 bg-paper px-5 py-4">
        <p className="text-xs leading-5 text-muted">
          识别历史与反馈保存在本机 localStorage；点击清空后数据不可恢复（提交前建议清空）。
        </p>
        <button
          type="button"
          className="chip !border-amber/40 !text-amber hover:!bg-amber/10"
          onClick={() => {
            if (window.confirm('确定清空全部演示数据？')) {
              clearDemoData()
              refresh()
            }
          }}
        >
          <Eraser className="h-3.5 w-3.5" /> 清空演示数据
        </button>
      </div>
    </PageShell>
  )
}

function useMemoTrend(): { day: string; value: number }[] {
  const days: { day: string; value: number }[] = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    days.push({
      day: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      value: 0
    })
  }
  for (const h of listHistory()) {
    const ts = new Date(h.ts)
    const target = days.find(
      (d) => d.day === `${String(ts.getMonth() + 1).padStart(2, '0')}/${String(ts.getDate()).padStart(2, '0')}`
    )
    if (target) target.value++
  }
  return days
}
