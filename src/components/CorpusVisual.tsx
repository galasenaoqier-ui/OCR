// 统一渲染“矢量字形 / HUST-OBC 拓片图 / 占位文字”三种视觉，
// 供字库、识别结果与证据链复用。
import { Link } from 'react-router-dom'
import { GlyphShape } from './GlyphShape'
import {
  corpusIdOf,
  corpusAssetUrl,
  displayLabel,
  entryForCorpusId,
  localGlyphForEntry,
  sampleImage,
  type CorpusEntry
} from '../lib/corpus'
import { byId } from '../lib/kb'

export function CorpusThumb({
  entry,
  className = '',
  alt
}: {
  entry?: CorpusEntry | null
  className?: string
  alt?: string
}) {
  if (!entry) {
    return (
      <span className={`inline-flex items-center justify-center text-bronze/60 ${className}`}>?</span>
    )
  }
  const local = localGlyphForEntry(entry)
  const src = sampleImage(entry)
  const label = alt || displayLabel(entry)
  if (src) {
    return (
      <img
        src={corpusAssetUrl(src)}
        alt={label}
        loading="lazy"
        className={`sepia-rubbing object-contain ${className}`}
        draggable={false}
      />
    )
  }
  if (local) {
    return <GlyphShape glyph={local} className={className} />
  }
  return (
    <span className={`inline-flex items-center justify-center text-bronze/60 ${className}`}>
      {entry.corpus === 'hust-undec' ? '?' : displayLabel(entry).slice(0, 1)}
    </span>
  )
}

export function CorpusThumbCard({
  entry,
  className = ''
}: {
  entry: CorpusEntry
  className?: string
}) {
  const src = sampleImage(entry)
  const local = localGlyphForEntry(entry)
  return (
    <span className={`inline-flex items-center justify-center text-ink ${className}`}>
      {src ? (
        <img src={corpusAssetUrl(src)} alt={displayLabel(entry)} loading="lazy" className="sepia-rubbing max-h-full max-w-full object-contain" draggable={false} />
      ) : local ? (
        <GlyphShape glyph={local} className="h-full w-full" />
      ) : (
        <span className="text-3xl text-bronze/45">?</span>
      )}
    </span>
  )
}

export function VisualForGlyphId({
  glyphId,
  modern = '',
  className = '',
  shapeClassName = ''
}: {
  glyphId: string
  modern?: string
  className?: string
  shapeClassName?: string
}) {
  const entry = entryForCorpusId(glyphId)
  if (entry) {
    return <CorpusThumb entry={entry} className={className} alt={modern || displayLabel(entry)} />
  }
  const glyph = byId(glyphId)
  if (glyph) return <GlyphShape glyph={glyph} className={shapeClassName || className} />
  return (
    <span className={`inline-flex items-center justify-center text-lg ${className}`}>{modern || '?'}</span>
  )
}

export function HustEntryLink({
  entry,
  children,
  className = ''
}: {
  entry: CorpusEntry
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Link to={`/hust/${encodeURIComponent(corpusIdOf(entry))}`} className={className}>
      {children ?? displayLabel(entry)}
    </Link>
  )
}
