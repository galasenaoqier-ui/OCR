import type { Glyph } from '../lib/types'

function strokesToPath(strokes: number[][][]): string[] {
  return strokes.map((poly) => {
    const pts = poly.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`)
    return `M${pts.join('L')}`
  })
}

export function GlyphShape({
  glyph,
  className = '',
  stroke = 'currentColor',
  strokeWidth = 3.4
}: {
  glyph?: Pick<Glyph, 'strokes' | 'modern'> | null
  className?: string
  stroke?: string
  strokeWidth?: number
}) {
  if (!glyph) return null
  return (
    <svg
      viewBox="-2 -2 104 104"
      className={className}
      role="img"
      aria-label={`甲骨字形：${glyph.modern}`}
      fill="none"
    >
      {strokesToPath(glyph.strokes).map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

export function GlyphCard({
  glyph,
  onClick,
  active = false,
  className = ''
}: {
  glyph: Glyph
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full flex-col items-center rounded-xl border bg-paper px-3 pb-4 pt-5 text-center transition duration-300 hover:-translate-y-1 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
        active ? 'border-bronze ring-1 ring-bronze/40' : 'border-line/90 hover:border-bronze/50'
      } ${className}`}
    >
      <span className="mb-2 h-20 w-20 text-ink">
        <GlyphShape glyph={glyph} className="h-full w-full transition duration-300 group-hover:text-bronzeDark" />
      </span>
      <span className="text-lg text-ink">{glyph.modern}</span>
      <span className="mt-0.5 text-[11px] text-muted">{glyph.pinyin}</span>
    </button>
  )
}
