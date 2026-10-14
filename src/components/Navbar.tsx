import { Menu, MonitorPlay, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import ArchiveMark from './ArchiveMark'
import { SealStamp } from './Ornament'

const LINKS = [
  { to: '/', label: '首页', end: true },
  { to: '/about', label: '项目介绍' },
  { to: '/recognize', label: 'AI识甲' },
  { to: '/library', label: '甲骨字库' },
  { to: '/my-library', label: '我的甲骨库' },
  { to: '/evolution', label: '字形演变' },
  { to: '/knowledge', label: '甲骨知识' },
  { to: '/digital-human', label: '数字史官' }
]

const MOBILE_LINKS = [
  { to: '/', label: '首页', end: true },
  { to: '/recognize', label: 'AI识甲' },
  { to: '/library', label: '字库' },
  { to: '/learning', label: '学习' },
  { to: '/my-library', label: '我的' }
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  const brand = (
    <Link to="/" className="flex items-center gap-2.5" aria-label="殷契拾文 首页">
      <ArchiveMark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-song flex items-center gap-2 text-[1.15rem] text-ink">
          殷契拾文
          <SealStamp text="拾文" className="hidden !px-1 !py-px !text-[8px] md:inline-flex" />
        </span>
        <span className="mt-1 text-[10px] tracking-widest text-muted">甲骨文拓片智能识别与检索</span>
      </span>
    </Link>
  )

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-shadow duration-300 ${
        scrolled || open ? 'border-line/90 bg-paper/95 shadow-card backdrop-blur-md' : 'border-line/70 bg-paper/90 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
        {brand}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `relative px-3.5 py-2 text-[13px] transition-colors duration-200 ${
                  isActive
                    ? 'font-medium text-ink after:absolute after:-bottom-[3px] after:left-3 after:right-3 after:h-[2px] after:bg-jade'
                    : 'text-[#4A3C30] hover:text-ink hover:bg-paperSoft/40'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/demo" className="btn-ghost !px-4 !py-2 text-xs" title="进入答辩 Demo">
            <MonitorPlay className="h-4 w-4" /> 答辩Demo
          </Link>
          <Link to="/recognize" className="btn-primary !px-5 !py-2 text-xs">
            开始识别
          </Link>
        </div>
        <button
          type="button"
          className="rounded-md p-2 text-ink transition hover:bg-paperSoft lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? '关闭菜单' : '打开菜单'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-line/80 bg-paper/95 px-5 py-4 backdrop-blur-md lg:hidden" aria-label="移动端导航">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'border-l-2 border-jade bg-paperSoft/60 pl-[10px] font-medium text-ink'
                      : 'text-[#4A3C30] hover:bg-paperSoft/50 hover:text-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-3 flex gap-2">
              <Link to="/demo" className="btn-ghost flex-1 !py-2 text-xs">答辩Demo</Link>
              <Link to="/recognize" className="btn-primary flex-1 !py-2 text-xs">开始识别</Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
    <nav className="mobile-bottom-nav lg:hidden" aria-label="移动端快捷导航">
      {MOBILE_LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `mobile-bottom-link ${isActive ? 'is-active' : ''}`}><span>{l.label === 'AI识甲' ? '识' : l.label === '字库' ? '字' : l.label === '学习' ? '学' : l.label === '我的' ? '藏' : '殷'}</span><small>{l.label}</small></NavLink>)}
    </nav>
    </>
  )
}
