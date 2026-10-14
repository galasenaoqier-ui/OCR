import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CircleDot, Info } from 'lucide-react'
import OracleEdgeField from './OracleEdgeField'
import { OracleRule, SealStamp } from './Ornament'

export function BtnLink({
  to,
  children,
  variant = 'primary',
  className = ''
}: {
  to: string
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'gold'
  className?: string
}) {
  const cls =
    variant === 'primary' ? 'btn-primary' : variant === 'gold' ? 'btn-gold' : 'btn-ghost'
  return (
    <Link to={to} className={`${cls} ${className}`}>
      {children}
    </Link>
  )
}

export function PageShell({
  eyebrow,
  title,
  lead,
  children,
  wide = false
}: {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={`page-shell mx-auto w-full ${wide ? 'max-w-[1400px]' : 'max-w-page'} px-5 pb-24 pt-10 md:px-8 md:pt-16`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="rubbing-dark relative mb-10 overflow-hidden rounded-2xl px-6 py-8 shadow-card md:px-10 md:py-10"
      >
        <OracleEdgeField />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-10 select-none font-song text-[9rem] leading-none text-ink/[0.035] md:text-[12rem]"
        >
          契
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-8 hidden h-16 w-16 border-r border-t border-goldLight/30 md:block"
        />
        <div className="flex flex-wrap items-center gap-3">
          {eyebrow ? <div className="text-[11px] uppercase tracking-[0.26em] text-jadeDeep">{eyebrow}</div> : null}
          <SealStamp text="拾文" className="ml-auto hidden !px-1.5 !py-0.5 !text-[10px] sm:inline-flex" />
        </div>
        <h1 className="font-song mt-5 max-w-4xl text-4xl leading-tight text-ink md:text-[3.4rem]">{title}</h1>
        {lead ? <p className="mt-5 max-w-3xl text-[14px] leading-7 text-muted md:text-[15px]">{lead}</p> : null}
        <OracleRule className="mt-6 max-w-[280px]" />
      </motion.div>
      {children}
    </div>
  )
}

export function Reveal({
  children,
  delay = 0,
  className = '',
  y = 18
}: {
  children: ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel paper-grain overflow-hidden ${className}`}>{children}</section>
}

export function Tag({
  children,
  tone = 'neutral'
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'gold' | 'ink'
}) {
  const map: Record<string, string> = {
    neutral: 'border-line text-muted bg-paper',
    green: 'border-green/30 text-green bg-green/5',
    amber: 'border-amber/35 text-amber bg-amber/5',
    gold: 'border-gold/40 text-[#4A3C30] bg-gold/10',
    ink: 'border-ink/20 text-ink bg-ink/5'
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${map[tone]}`}>
      {children}
    </span>
  )
}

export function Ring({
  value,
  size = 94,
  label
}: {
  value: number
  size?: number
  label?: string
}) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E0D2BA" strokeWidth={3} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#C28A3D"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: c - (c * Math.max(0, Math.min(100, value))) / 100 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm text-ink">
          {value.toFixed(1)}%
        </div>
      </div>
      {label ? <div className="text-xs text-muted">{label}</div> : null}
    </div>
  )
}

export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {value}
      {suffix}
    </motion.span>
  )
}

export function Disclaimer({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'neutral' }) {
  return (
    <div
      className={`mt-6 flex gap-3 rounded-lg border px-4 py-3 text-xs leading-5 ${
        tone === 'amber'
          ? 'border-amber/30 bg-amber/5 text-[#6B4A28]'
          : 'border-line bg-paper text-muted'
      }`}
    >
      {tone === 'amber' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  )
}

export function EmptyNote({
  title,
  desc,
  marker = '资料待补充'
}: {
  title: string
  desc?: string
  marker?: string
}) {
  return (
    <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-bronze/35 bg-bone/60 px-6 py-10 text-center">
      <CircleDot className="h-5 w-5 text-bronze/60" />
      <div className="text-sm font-medium text-ink">{title}</div>
      {desc ? <div className="max-w-sm text-xs leading-5 text-muted">{desc}</div> : null}
      <Tag tone="amber">{marker}</Tag>
    </div>
  )
}

export function StatBlock({ num, unit, label }: { num: string; unit?: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1">
        <span className="font-song text-[2.5rem] leading-none text-bone">{num}</span>
        {unit ? <span className="text-sm text-goldLight">{unit}</span> : null}
      </div>
      <div className="text-xs tracking-wide text-bone/60">{label}</div>
    </div>
  )
}
