import { byId } from '../lib/kb'
import { GlyphShape } from './GlyphShape'

const EDGES = [
  { id: 'ri', cls: 'left-[3%] top-[7%] h-16 w-16 opacity-[0.08] -rotate-6 md:h-24 md:w-24' },
  { id: 'yue', cls: 'right-[8%] top-[6%] h-16 w-16 opacity-[0.07] rotate-6 md:h-24 md:w-24' },
  { id: 'shan', cls: 'right-[3%] top-[38%] h-14 w-14 opacity-[0.07] rotate-12 md:h-20 md:w-20' },
  { id: 'niu', cls: 'bottom-[14%] right-[5%] h-16 w-16 opacity-[0.07] md:h-28 md:w-28' },
  { id: 'xiang', cls: 'bottom-[6%] left-[12%] h-16 w-16 opacity-[0.06] rotate-6 md:h-24 md:w-24' },
  { id: 'yu', cls: 'left-[2%] top-[52%] h-14 w-14 opacity-[0.07] rotate-12 md:h-20 md:w-20' },
  { id: 'ma', cls: 'left-[8%] top-[30%] hidden h-16 w-16 opacity-[0.055] md:block md:h-24 md:w-24' },
  { id: 'niao', cls: 'right-[16%] top-[2%] hidden h-14 w-14 opacity-[0.06] md:block md:h-20 md:w-20' },
  { id: 'long', cls: 'left-[42%] bottom-[-1%] hidden h-16 w-16 opacity-[0.05] md:block md:h-20 md:w-20' }
].map((e) => ({ ...e, glyph: byId(e.id) }))
.filter((e) => Boolean(e.glyph))

export default function OracleEdgeField({
  className = ''
}: {
  /** 供调用方叠加额外定位/裁剪类。 */
  className?: string
}) {
  return (
    <div aria-hidden="true" className={`pointer-events-none !absolute inset-0 select-none overflow-hidden ${className}`}>
      {EDGES.map(({ id, glyph, cls }) =>
        glyph ? (
          <span key={id} className={`absolute text-[#9E5B34] ${cls}`}>
            <GlyphShape glyph={glyph} className="h-full w-full" strokeWidth={3} />
          </span>
        ) : null
      )}
    </div>
  )
}
