import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Play, Pause } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { byId, SAMPLE_IDS } from '../lib/kb'
import { GlyphShape } from './GlyphShape'
import { SealStamp } from './Ornament'
import { Tag } from './ui'

const ITEMS = SAMPLE_IDS.map((id) => byId(id)).filter((g): g is NonNullable<typeof g> => Boolean(g))

export default function LiveRecognizeShowcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [scanning, setScanning] = useState(false)
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const item = ITEMS[index % ITEMS.length]

  useEffect(() => {
    if (paused || reduceMotion || ITEMS.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % ITEMS.length), 4000)
    return () => clearInterval(timer)
  }, [paused, reduceMotion])

  useEffect(() => {
    if (reduceMotion) return
    setScanning(true)
    if (scanTimer.current) clearTimeout(scanTimer.current)
    scanTimer.current = setTimeout(() => setScanning(false), 720)
    return () => {
      if (scanTimer.current) clearTimeout(scanTimer.current)
    }
  }, [index, reduceMotion])

  if (!item) return null

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line bg-paperLight shadow-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between border-b border-line/80 px-4 py-3 text-[10px] uppercase tracking-[0.2em]">
        <span className="text-inkSoft">Digital Archive · Live</span>
        <span className="text-muted">{String(index + 1).padStart(2, '0')} / {String(ITEMS.length).padStart(2, '0')}</span>
      </div>

      <div className="relative mx-auto my-5 aspect-square w-[76%] max-w-[280px] overflow-hidden rounded-lg border border-line/80 bg-parchment/75">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <GlyphShape glyph={item} className="h-[72%] w-[72%] text-bronzeDark/90" strokeWidth={4.8} />
          </motion.div>
        </AnimatePresence>

        <span className="absolute left-2.5 top-2.5 rounded border border-bronze/45 bg-paperLight/85 px-2 py-1 text-[9px] tracking-[0.2em] text-inkSoft backdrop-blur-[1px]">
          AI DETECTED
        </span>
        <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-seal" />
          OCR LIVE
        </span>

        {scanning ? (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-[18%] bg-gradient-to-r from-transparent via-goldLight/25 to-transparent"
            initial={{ left: '-22%' }}
            animate={{ left: '108%' }}
            transition={{ duration: 0.62, ease: 'easeInOut' }}
          />
        ) : null}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-song text-[2.4rem] leading-none text-ink">{item.modern}</span>
              <SealStamp text="示例" />
            </div>
            {item.pinyin || item.meaning ? (
              <div className="mt-1.5 text-[10px] leading-4 text-muted">
                {item.pinyin ? `${item.pinyin} · ` : ''}
                {item.meaning ?? ''}
              </div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="font-song text-xl leading-none text-bronze">96.8%</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-gold">High Confidence</div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-muted">
          <Tag tone="neutral">本地字形渲染</Tag>
          <span>示例置信度 · 非实测</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" role="tablist" aria-label="示例字形切换">
            {ITEMS.map((g, i) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`显示示例字形：${g.modern}`}
                onClick={() => setIndex(i)}
                className={`flex h-9 w-9 items-center justify-center rounded-md border transition ${
                  i === index ? 'border-bronze bg-paperSoft' : 'border-line bg-paper hover:border-bronze/60'
                }`}
              >
                <GlyphShape glyph={g} className="h-6 w-6 text-bronzeDark" strokeWidth={3.6} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? '继续自动演示' : '暂停自动演示'}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[10px] text-inkSoft transition hover:border-bronze"
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {paused ? '继续' : '暂停'}
          </button>
        </div>

        <Link
          to="/recognize"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-bronze transition hover:text-bronzeDark"
        >
          开始自己识别 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
