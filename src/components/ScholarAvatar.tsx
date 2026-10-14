import { motion } from 'framer-motion'

export default function ScholarAvatar({
  speaking = false,
  thinking = false,
  className = ''
}: {
  speaking?: boolean
  thinking?: boolean
  className?: string
}) {
  return (
    <div
      className={`relative flex h-full w-auto min-w-0 items-end justify-center overflow-hidden ${className}`}
      role="img"
      aria-label="殷契灵境 · 贞人数字史官立绘"
    >
      <motion.div
        className="relative flex h-full w-full items-end justify-center"
        animate={{ y: speaking ? [0, -2, 0] : thinking ? [0, -1.5, 0] : [0, -1, 0] }}
        transition={{ duration: speaking ? 1.8 : 4.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[5%] left-1/2 h-[86%] w-[78%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(191,145,76,0.28),rgba(191,145,76,0)_68%)] blur-xl"
        />
        <img
          src={`${import.meta.env.BASE_URL || './'}assets/digital-scholar-2d.svg`}
          alt="甲骨文数字史官人物"
          className="relative z-[1] h-full w-auto max-w-none object-contain object-center"
          style={{
            // The source is a character design board. Keep only the large
            // front-facing figure on the left while preserving its aspect ratio.
            width: 'auto',
            transform: 'scale(1.03)',
            transformOrigin: '50% 50%',
            filter: 'drop-shadow(0 12px 18px rgba(34, 20, 10, .28)) saturate(.92) contrast(1.04)'
          }}
          draggable={false}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[18%] bottom-[4%] z-[2] h-8 rounded-[50%] bg-[#24170f]/25 blur-md"
        />
      </motion.div>
    </div>
  )
}
