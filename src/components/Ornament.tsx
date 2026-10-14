import { byId } from '../lib/kb'
import { GlyphShape } from './GlyphShape'

export function SealStamp({
  text,
  className = '',
  title
}: {
  text: string
  className?: string
  title?: string
}) {
  return (
    <span className={`seal-badge px-1.5 py-0.5 text-[11px] ${className}`} title={title || text}>
      {text}
    </span>
  )
}

export function OracleRule({ className = '' }: { className?: string }) {
  return <hr className={`oracle-crack ${className}`} aria-hidden="true" />
}

export function GlyphWatermark({
  id,
  className = 'h-72 w-72 text-bone',
  opacity = 0.07,
  ariaHidden = true
}: {
  id: string
  className?: string
  opacity?: number
  ariaHidden?: boolean
}) {
  const glyph = byId(id)
  if (!glyph) return null
  return (
    <span
      aria-hidden={ariaHidden}
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
    >
      <GlyphShape glyph={glyph} className="h-full w-full" />
    </span>
  )
}
