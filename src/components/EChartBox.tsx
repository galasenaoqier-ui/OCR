import { useEffect, useRef } from 'react'
import type { ECharts } from 'echarts'
import type { EChartsOption } from 'echarts'

export default function EChartBox({
  option,
  height = 280,
  className = ''
}: {
  option: EChartsOption
  height?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | null>(null)
  useEffect(() => {
    let alive = true
    void import('echarts').then((mod) => {
      if (!alive || !ref.current) return
      chart.current = mod.init(ref.current, undefined, { renderer: 'canvas' })
      chart.current.setOption(option)
    })
    return () => {
      alive = false
      chart.current?.dispose()
    }
  }, [option])
  return <div ref={ref} style={{ height }} className={className} aria-hidden="true" />
}
