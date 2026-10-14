import { Link } from 'react-router-dom'
import { GLYPH_COUNT, SOURCES } from '../lib/kb'
import { corpusStats, HUST_INDEX } from '../lib/corpus'
import { evoSource } from '../lib/evolution'
import ArchiveMark from './ArchiveMark'

export default function Footer() {
  const stats = corpusStats()
  const source = evoSource()
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <ArchiveMark className="h-9 w-9 shrink-0" />
            <div>
              <div className="font-song text-lg text-ink">殷契拾文</div>
              <div className="text-[11px] text-muted">甲骨文拓片文字智能识别与检索系统</div>
            </div>
          </div>
          <p className="mt-5 text-sm italic leading-6 text-jadeDeep">
            技术赋能人文，人文解释技术。
          </p>
          <p className="mt-3 text-xs leading-5 text-muted">
            精品 {GLYPH_COUNT} 字矢量字库 · HUST 学术库已释 {stats.deciphered.rootCategories} 类 · ResNet-50 本地 ONNX 模型已接入
          </p>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-jadeDeep">
            <img src={`${import.meta.env.BASE_URL || './'}decor/omen-mark.svg`} alt="" aria-hidden="true" className="h-4 w-4 opacity-60" />
            站内导航
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['项目介绍', '/about'],
              ['AI识甲', '/recognize'],
              ['甲骨字库', '/library'],
              ['我的甲骨库', '/my-library'],
              ['字形演变', '/evolution'],
              ['字形对比', '/compare'],
              ['甲骨知识', '/knowledge'],
              ['数字史官', '/digital-human'],
              ['AI学甲骨', '/learning'],
              ['识别数据', '/data'],
              ['系统自检', '/status']
            ].map(([label, to]) => (
              <Link key={to} to={to} className="text-muted transition hover:text-jadeDeep">
                {label}
              </Link>
            ))}
          </div>
          <a
            href={`${import.meta.env.BASE_URL || './'}character/digital-scholar/board.html`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-xs text-muted underline-offset-2 transition hover:text-jadeDeep hover:underline"
          >
            数字史官 · 角色概念板（矢量）
          </a>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-jadeDeep">
            <img src={`${import.meta.env.BASE_URL || './'}decor/omen-mark.svg`} alt="" aria-hidden="true" className="h-4 w-4 opacity-60" />
            数据来源
          </div>
          <ul className="space-y-2 text-xs leading-5 text-muted">
            {SOURCES.map((s) => (
              <li key={s.title}>
                <span className="text-inkSoft">{s.title}</span>
                <span className="ml-1 text-muted/85">· {s.role}</span>
              </li>
            ))}
            <li key="hust-obc">
              <span className="text-inkSoft">HUST-OBC 公开数据集</span>
              <span className="ml-1 text-muted/85">· {HUST_INDEX.attribution.venue} · {HUST_INDEX.license}（{HUST_INDEX.attribution.doi}）</span>
            </li>
            {source ? (
              <li key="evobc">
                <span className="text-inkSoft">{source.title}</span>
                <span className="ml-1 text-muted/85">
                  · Guan 等，{source.year}（arXiv:{source.arxiv}）· {source.license}
                </span>
              </li>
            ) : null}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-muted/85">
            <Link to="/status" className="underline-offset-2 hover:underline">数据来源</Link>
            <span>·</span>
            <span>项目说明</span>
            <span>·</span>
            <span>使用声明</span>
            <span>·</span>
            <span>研究参考</span>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-5 py-4 pb-24 text-center text-[11px] text-muted lg:pb-4">
            大学生新文科实践创新大赛 · 数字人文方向 · 殷契拾文为研究与学习演示平台，识别结果不替代专业释读。
      </div>
    </footer>
  )
}
