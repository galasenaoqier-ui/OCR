import { useEffect, useState } from 'react'

/** Brand reveal shown once per browser session while the app boots. */
export default function LogoMotionLoader() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.sessionStorage.getItem('yinqi-logo-motion-seen') === '1') return
    setVisible(true)
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem('yinqi-logo-motion-seen', '1')
      setVisible(false)
    }, 3900)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null
  return (
    <div className="logo-motion-loader" role="status" aria-label="殷契拾文正在唤醒">
      <iframe
        title="光痕唤文 Logo 加载动画"
        src={`${import.meta.env.BASE_URL || '/'}logo-motion.html?autoplay=1`}
        className="logo-motion-loader__frame"
      />
      <button
        type="button"
        className="logo-motion-loader__skip"
        onClick={() => {
          window.sessionStorage.setItem('yinqi-logo-motion-seen', '1')
          setVisible(false)
        }}
      >
        跳过动画
      </button>
    </div>
  )
}
