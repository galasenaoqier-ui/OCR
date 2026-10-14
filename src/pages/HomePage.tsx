import {
  ArrowRight,
  BookOpen,
  Database,
  GraduationCap,
  Landmark,
  LibraryBig,
  MonitorPlay,
  Route,
  ScanLine,
  ScanSearch,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { Link } from 'react-router-dom'
import ArchiveMark from '../components/ArchiveMark'
import { GlyphShape } from '../components/GlyphShape'
import LiveRecognizeShowcase from '../components/LiveRecognizeShowcase'
import OracleEdgeField from '../components/OracleEdgeField'
import { SealStamp } from '../components/Ornament'
import { BtnLink, Reveal, Tag } from '../components/ui'
import { byId, GLYPH_COUNT } from '../lib/kb'
import { corpusStats } from '../lib/corpus'
import { evoStats } from '../lib/evolution'

const demoGlyph = byId('niu')!
const stats = corpusStats()
const evo = evoStats()
const nf = new Intl.NumberFormat('zh-CN')
const dec = nf.format(stats.deciphered.rootCategories)
const decImages = nf.format(stats.deciphered.imageFiles)
const undec = nf.format(stats.undeciphered.leafCategories)
const undecImages = nf.format(stats.undeciphered.imageFiles)
const evoTotal = nf.format(evo.totalFiles)
const evoJinwen = nf.format(evo.stageImages.jinwen)
const evoXiaozhuan = nf.format(evo.stageImages.xiaozhuan)
const evoLishu = nf.format(evo.stageImages.lishu)

const capabilities: {
  to: string
  title: string
  tag: string
  desc: string
  icon: LucideIcon
}[] = [
  {
    to: '/recognize',
    icon: ScanSearch,
    title: 'AI 识甲',
    tag: '本地 ResNet-50 · 1,588 类',
    desc: '示例、手写或上传拓片，输出 Top-K 候选、置信度与可解释依据。'
  },
  {
    to: '/library',
    icon: LibraryBig,
    title: '甲骨字库',
    tag: `精品 ${GLYPH_COUNT} + HUST 学术库`,
    desc: '本地矢量字形与 HUST-OBC 学术样本统一检索，每条来源标签一目了然。'
  },
  {
    to: '/evolution',
    icon: Route,
    title: '字形演变',
    tag: 'EVOBC 公开图版',
    desc: '甲骨 → 金文 → 篆书 → 隶书 → 今天，逐字查看可查证的演变图版。'
  },
  {
    to: '/my-library',
    icon: Database,
    title: '我的甲骨库',
    tag: 'IndexedDB · 本机',
    desc: '批量上传图片并填写编号与释字，建立只保存在当前浏览器的个人库。'
  }
]

const pipelineSteps = [
  ['输入', '示例 / 手写 / 上传拓片'],
  ['预处理', '白底补方 / 128×128 / 归一化'],
  ['候选排序', '本地模型输出 Top-K'],
  ['证据链', '相似度 · 结构 · 图版对照'],
  ['结论', '高置信给答案，低置信转考证']
]

const evidenceLayers = [
  ['相似度比对', '与候选字形计算匹配程度，给出可复现的排序依据。'],
  ['字形结构', '观察笔画疏密、部件关系与长宽比例等结构特征。'],
  ['图版对照', '候选与 HUST/EVOBC 图版或本地矢量字形并排比较。'],
  ['AI 判断', '汇总模型置信度与来源标签；低置信不显示确定答案。']
]

const scenarios: {
  icon: LucideIcon
  title: string
  desc: string
  to: string
  cta: string
}[] = [
  {
    icon: GraduationCap,
    title: '课堂教学',
    desc: '现场传图或手写，跟着候选与证据链理解“为什么是它”，把课堂变成可操作的字形实验。',
    to: '/learning',
    cta: '进入 AI 学甲骨'
  },
  {
    icon: Landmark,
    title: '展馆参观',
    desc: '不必逐字求教：示例字形、字库图版与演变脉络都可以在参观现场自助打开。',
    to: '/library',
    cta: '探索甲骨字库'
  },
  {
    icon: BookOpen,
    title: '研究学习',
    desc: '低置信与未释字形只保留候选与考证线索，作为字形资料的检索起点，不冒充结论。',
    to: '/evolution',
    cta: '查看字形演变'
  },
  {
    icon: MonitorPlay,
    title: '现场答辩',
    desc: '60–90 秒引导式 Demo：从上传到识别、证据链与知识图谱一气呵成。',
    to: '/demo',
    cta: '观看答辩 Demo'
  }
]

const scholarCaps = [
  {
    mark: '01',
    title: '字形讲解',
    desc: '识别出字形后，由数字史官解释字形结构、字义来源与造字特点。'
  },
  {
    mark: '02',
    title: '商代知识',
    desc: '把文字放回商代社会：祭祀、占卜、战争、农业与日常生活语境中理解。'
  },
  {
    mark: '03',
    title: '智能问答',
    desc: '向数字史官连续提问，在本地字库与知识范围中进行对话式学习。'
  }
]

const resources: {
  eyebrow: string
  display: string
  unit?: string
  title: string
  desc: string
  to: string
  cta: string
}[] = [
  {
    eyebrow: '本地矢量字库',
    display: String(GLYPH_COUNT),
    unit: '字',
    title: '精品矢量字形',
    desc: '现代字、拼音、释义与构形说明齐全；甲骨字形为本地矢量渲染。',
    to: '/library',
    cta: '查看字库'
  },
  {
    eyebrow: 'HUST-OBC · CC BY-NC 4.0',
    display: dec,
    unit: '类',
    title: '已释学术类别',
    desc: `收录源图 ${decImages} 张；另有未释目录 ${undec} 类（${undecImages} 张）供“待考证”研究。`,
    to: '/library',
    cta: '浏览学术库'
  },
  {
    eyebrow: 'EVOBC · CC BY-NC-SA 4.0',
    display: evoTotal,
    unit: '张',
    title: '字形演变图版',
    desc: `金文 ${evoJinwen} · 篆书 ${evoXiaozhuan} · 隶书 ${evoLishu}，覆盖 ${nf.format(evo.localLabels)} 个本地标签。`,
    to: '/evolution',
    cta: '打开演变页'
  },
  {
    eyebrow: 'IndexedDB · 本机保存',
    display: '本机',
    title: '个人上传甲骨库',
    desc: '图片与编号只存在当前浏览器，默认不上传服务器，可一键送入识别。',
    to: '/my-library',
    cta: '进入个人库'
  },
  {
    eyebrow: '本地识别引擎',
    display: 'ResNet-50',
    title: '1,588 类候选',
    desc: '模型离线运行；系统自检页另含 69 字自识与模板自检。',
    to: '/status',
    cta: '前往自检'
  }
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-8">
      {/* Hero */}
      <section
        className="rubbing-dark relative grid min-h-[86vh] items-center gap-12 overflow-hidden rounded-3xl px-5 py-14 shadow-lift md:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16"
        style={{ backgroundImage: "url('/decor/hero-bone.svg')" }}
      >
        <OracleEdgeField />
        <div className="absolute left-5 top-5 z-10 flex items-center gap-2.5">
          <ArchiveMark className="h-8 w-8 opacity-90" />
          <span className="hidden sm:block">
            <span className="block text-[10px] uppercase tracking-[0.3em] text-inkSoft">Digital Archive</span>
            <span className="mt-0.5 block text-[9px] tracking-[0.18em] text-muted">殷墟甲骨 · YQ-0042</span>
          </span>
        </div>
        <div>
          <Reveal>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-jadeDeep">
              <Sparkles className="h-3.5 w-3.5" /> 大学生新文科实践创新大赛 · 数字人文
            </div>
            <h1 className="font-song mt-6 text-[2.7rem] leading-[1.16] tracking-wide text-ink md:text-[4.3rem]">
              让三千年前的文字，
              <br />
              <span className="text-jadeDeep">再次被看见。</span>
            </h1>
            <p className="mt-7 border-l-2 border-jade/60 pl-4 text-[15px] leading-7 text-muted">
              从一块甲骨，到一个汉字。
              <br />
              用 AI 重新打开三千年前的文字世界。
            </p>
            <div className="mobile-stack-actions mt-9 flex flex-wrap gap-3 sm:flex-row">
              <BtnLink to="/recognize" variant="primary">
                开始识甲 <ArrowRight className="h-4 w-4" />
              </BtnLink>
              <Link
                to="/library"
                className="inline-flex items-center gap-2 rounded-lg border border-jade/40 px-7 py-3 text-sm text-ink transition duration-200 hover:-translate-y-px hover:border-jade hover:bg-paperLight"
              >
                <LibraryBig className="h-4 w-4" /> 探索甲骨字库
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-[11px] tracking-[0.14em] text-muted">
              <span>本地离线运行</span>
              <span className="h-1 w-1 rounded-full bg-jade/40" />
              <span>识别结果可解释</span>
              <span className="h-1 w-1 rounded-full bg-jade/40" />
              <span>不替代专业释读</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.16} y={28}>
          <LiveRecognizeShowcase />
        </Reveal>
      </section>

      {/* 01 · 旗舰能力 */}
      <section className="border-t border-line py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="eyebrow mb-4">四大能力</div>
            <h2 className="font-song text-3xl leading-snug md:text-[2.8rem]">
              不止于识别：
              <br />
              四条路径串起完整体验
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              AI识甲给出候选，字库与演变负责溯源，个人库负责把图片留存为本机资料。
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {capabilities.map((cap, i) => (
            <Reveal key={cap.title} delay={i * 0.08}>
              <Link
                to={cap.to}
                className="paper-grain parchment-card group flex h-full flex-col p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-soot text-bone transition group-hover:bg-goldLight group-hover:text-soot">
                    <cap.icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 text-bronze/45 transition group-hover:translate-x-1 group-hover:text-gold" />
                </div>
                <h3 className="font-song mt-5 text-xl text-ink">{cap.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-6 text-muted">{cap.desc}</p>
                <Tag tone="gold">{cap.tag}</Tag>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 02 · 证据链演示带 */}
      <section className="border-t border-line py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="eyebrow mb-4">可解释的识别</div>
            <h2 className="font-song text-3xl md:text-[2.8rem]">为什么是「牛」？</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              一次识别不是“黑箱给出一个答案”，而是从输入到证据链的五步过程。
            </p>
          </Reveal>
        </div>
        <Reveal className="mt-14">
          <div className="rubbing-dark relative overflow-hidden rounded-3xl px-6 py-10 shadow-lift md:px-12 md:py-12">
            <GlyphShape
              glyph={demoGlyph}
              className="pointer-events-none absolute -bottom-14 -right-12 h-80 w-80 text-ink/[0.04]"
            />
            <div className="relative grid items-center gap-10 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="mx-auto w-full max-w-[280px]">
                <div className="paper-grain parchment-card p-6 text-center">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-bronze">
                    INPUT · 本地字形示例
                  </div>
                  <GlyphShape
                    glyph={demoGlyph}
                    className="mx-auto my-6 h-36 w-36 text-bronzeDark/80"
                    strokeWidth={5.5}
                  />
                  <div className="flex items-center justify-center gap-2 border-t border-bronze/20 pt-3">
                    <span className="font-song text-2xl text-bronzeDark">牛</span>
                    <SealStamp text="示例" />
                    <Tag tone="neutral">本地字形渲染</Tag>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-xs tracking-[0.24em] text-jadeDeep">识别流水线</div>
                  <div className="h-px flex-1 bg-gradient-to-r from-jade/30 to-transparent" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-5">
                  {pipelineSteps.map(([title, desc], i) => (
                    <div
                      key={title}
                      className="relative rounded-xl border border-line/80 bg-paperLight/90 px-3 py-3.5"
                    >
                      <span className="font-song text-lg text-jadeDeep">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="mt-1.5 text-sm text-ink">{title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-muted">{desc}</div>
                      {i < pipelineSteps.length - 1 ? (
                        <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-jade/40 sm:block" />
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-center gap-3">
                  <span className="font-song text-lg text-jadeDeep">四层证据</span>
                  <span className="flex-1 border-t border-dashed border-jade/25" />
                  <span className="text-[10px] tracking-[0.18em] text-muted/70">EVIDENCE</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {evidenceLayers.map(([title, desc]) => (
                    <div key={title} className="paper-grain parchment-card px-4 py-3.5">
                      <div className="font-song text-base text-ink">{title}</div>
                      <p className="mt-1.5 text-[11px] leading-5 text-muted">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 03 · 使用场景 */}
      <section className="border-t border-line py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="eyebrow mb-4">使用场景</div>
            <h2 className="font-song text-3xl leading-snug md:text-[2.8rem]">
              它会在哪里被使用？
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              从课堂到展馆，从个人学习到现场演示——按不同观众切换用法。
            </p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {scenarios.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <article className="panel paper-grain flex h-full flex-col p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soot text-bone">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="font-song mt-5 text-xl text-ink">{s.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-6 text-muted">{s.desc}</p>
                <Link
                  to={s.to}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-bronzeDark transition hover:text-sealDark"
                >
                  {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 03b · AI数字史官 */}
      <section className="border-t border-line py-20 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="eyebrow mb-4">AI数字史官</div>
            <h2 className="font-song text-3xl leading-snug md:text-[2.8rem]">
              让甲骨文从“被识别”
              <br />
              走向“被理解”
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              识别只告诉你“这是什么字”；数字史官带你理解“这个字为什么这样写、它属于怎样的商代世界”。
            </p>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {scholarCaps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <article className="panel paper-grain flex h-full items-start gap-4 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="font-song text-2xl leading-none text-bronze/80">{s.mark}</span>
                <div>
                  <h3 className="font-song text-lg text-ink">{s.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted">{s.desc}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15} className="mt-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <BtnLink to="/digital-human?from=home" variant="primary">
              进入殷契灵境 <ArrowRight className="h-4 w-4" />
            </BtnLink>
            <a
              href="/character/digital-scholar/board.html"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !px-5 !py-2.5 text-xs"
            >
              查看角色概念板
            </a>
          </div>
        </Reveal>
      </section>

      {/* 04 · 数据资源墙 */}
      <section className="border-t border-line py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="eyebrow mb-4">数据资源</div>
            <h2 className="font-song text-3xl md:text-[2.8rem]">支撑识别的本地数据墙</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              每个数字都来自页面内置的数据文件；没有采集到的指标不显示、不占位。
            </p>
          </Reveal>
        </div>
        <Reveal className="mt-14">
          <div className="paper-grain parchment-card p-5 md:p-7">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {resources.map((r) => (
                <Link
                  key={r.title}
                  to={r.to}
                  className="group flex h-full flex-col rounded-xl border border-bronze/25 bg-bone/60 p-5 transition duration-300 hover:-translate-y-1 hover:border-gold hover:bg-bone"
                >
                  <div className="text-[10px] uppercase tracking-[0.18em] text-bronze">{r.eyebrow}</div>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                    <span className="font-song text-[1.9rem] leading-none text-bronzeDark">{r.display}</span>
                    {r.unit ? <span className="text-xs text-muted">{r.unit}</span> : null}
                  </div>
                  <div className="mt-2 text-sm font-medium text-ink">{r.title}</div>
                  <p className="mt-1.5 flex-1 text-[11px] leading-5 text-muted">{r.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-bronzeDark transition group-hover:text-sealDark">
                    {r.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-6 border-t border-bronze/15 pt-4 text-[11px] leading-5 text-muted">
              以上计数读取自本地字库、HUST-OBC 与 EVOBC 数据文件；本平台不收集问卷或满意度数据，
              识别结果亦不替代专业释读。
            </p>
          </div>
        </Reveal>
      </section>

      {/* 05 · 收尾 CTA */}
      <section className="border-t border-line py-16 md:py-24">
        <Reveal>
          <div className="rubbing-dark relative overflow-hidden rounded-3xl px-6 py-12 text-center shadow-lift md:px-14">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-16 select-none text-[14rem] leading-none text-ink/[0.03]"
            >
              契
            </span>
            <div className="relative mx-auto max-w-3xl">
              <div className="text-xs tracking-[0.28em] text-jadeDeep">殷契拾文</div>
              <h2 className="font-song mt-4 text-3xl leading-snug text-ink md:text-4xl">
                准备好亲手识读一块甲骨了吗？
              </h2>
              <p className="mt-5 text-sm leading-6 text-muted">
                从示例到上传、从候选到证据链，浏览器本地即可完成一次可解释的识读。
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <BtnLink to="/recognize" variant="gold">
                  开始识甲 <ArrowRight className="h-4 w-4" />
                </BtnLink>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-lg border border-jade/40 px-6 py-3 text-sm text-ink transition duration-200 hover:-translate-y-px hover:border-jade hover:bg-paperLight"
                >
                  了解政策背景与需求
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex items-center rounded-lg border border-line px-6 py-3 text-sm text-ink transition duration-200 hover:-translate-y-px hover:bg-paperLight"
                >
                  <ScanLine className="mr-2 h-4 w-4" /> 观看 90 秒答辩 Demo
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
