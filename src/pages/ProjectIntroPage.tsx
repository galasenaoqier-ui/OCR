import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  GraduationCap,
  Home,
  Landmark,
  LibraryBig,
  MonitorPlay,
  Route,
  Scale,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { OracleRule, SealStamp } from '../components/Ornament'
import { PageShell, Panel, Reveal } from '../components/ui'

const policies: {
  icon: LucideIcon
  issuer: string
  doc: string
  focus: string
  response: string
}[] = [
  {
    icon: Landmark,
    issuer: '中办、国办 · 2017 年印发',
    doc: '《关于实施中华优秀传统文化传承发展工程的意见》',
    focus: '实施中华优秀传统文化传承发展工程，推动优秀传统文化融入教育、生产生活与公共文化服务。',
    response: '把甲骨字形做成课堂、展馆可现场演示的识别与学习工具，让古文字从“展柜”走向“可感可学”。'
  },
  {
    icon: Database,
    issuer: '中办、国办 · 2022 年印发',
    doc: '《关于推进实施国家文化数字化战略的意见》',
    focus: '推进文化资源数字化，建设国家文化大数据体系，推动文化资源创造性转化、创新性发展。',
    response: '以可查证的公开数据集为来源，在浏览器内形成字库、图版与识别记录的结构化组织；个人上传图片仅保存在本机。'
  },
  {
    icon: Sparkles,
    issuer: '教育部、国家语委、中央网信办等 · 2025 年印发',
    doc: '《关于加强数字中文建设 推进语言文字信息化发展的意见》',
    focus: '推进语言文字信息化与人工智能融合发展，加强数字中文资源建设与应用。',
    response: '以本地 ResNet-50 模型承担拓片字形识别，通过可解释证据链实现“AI 辅助 + 人工判断”的释读路径。'
  },
  {
    icon: GraduationCap,
    issuer: '中共中央、国务院 · 2025 年印发',
    doc: '《教育强国建设规划纲要（2024—2035年）》',
    focus: '部署深化新文科建设，推动科技与人文交叉融合，培养跨学科实践人才。',
    response: '作为大学生新文科实践创新大赛的数字人文方向项目：以 AI 工程方法服务古文字教育普及与可解释识读。'
  }
]

const goals = [
  { mark: '甲', title: '可现场演示', desc: '面向课堂、展馆与答辩现场，输入图片/手写即可获得可解释识别结果。' },
  { mark: '乙', title: '可扩展知识库', desc: '内置 69 字精品字库、HUST-OBC 学术样本与 EVOBC 金文/篆书/隶书图版时间轴。' },
  { mark: '丙', title: '人机协同机制', desc: '高置信显示结果，低置信只给候选与考证提示，再由人工与专家判断。' },
  { mark: '丁', title: '诚实数据口径', desc: '只展示真实记录；问卷、场次与满意度等未采集数据不占位、不伪造。' }
]

const routeSteps = [
  ['输入', '示例 / 手写 / 上传拓片'],
  ['预处理', '白底补方 / 128×128 / 归一化'],
  ['模型识别', 'ResNet-50 本地 ONNX · 1588 类'],
  ['候选排序', 'Softmax Top-K'],
  ['证据链', '置信度 · 结构 · 图版对照'],
  ['知识延伸', '字形演变 / 字库 / 甲骨知识']
]

const modules = [
  { label: '首页', path: '/', icon: Home, desc: '产品总览：能力、证据链演示与数据资源入口' },
  { label: 'AI识甲', path: '/recognize', icon: ScanSearch, desc: '示例/手写/上传识别与证据链' },
  { label: '甲骨字库', path: '/library', icon: LibraryBig, desc: '精品 69 + HUST 学术字库检索' },
  { label: '我的甲骨库', path: '/my-library', icon: Database, desc: '个人图片上传数据库（IndexedDB）' },
  { label: '字形演变', path: '/evolution', icon: Route, desc: '甲骨 → 金文/篆书/隶书 → 今天' },
  { label: '字形对比', path: '/compare', icon: Scale, desc: '输入与参考字形结构比对' },
  { label: '甲骨知识', path: '/knowledge', icon: BookOpen, desc: '商代社会与文字背景知识网络' },
  { label: 'AI学甲骨', path: '/learning', icon: GraduationCap, desc: '猜字、识字与学习报告游戏' },
  { label: '识别数据', path: '/data', icon: BarChart3, desc: '本机真实识别/反馈统计' },
  { label: '系统自检', path: '/status', icon: ShieldCheck, desc: '69 字自识与引擎状态检查' },
  { label: '答辩Demo', path: '/demo', icon: MonitorPlay, desc: '现场演示完整叙事流程' }
]

const innovations = [
  { title: '可信度设计', desc: '区分“识别结果”与“辅助释读建议”，低置信不显示确定答案，回应古文字研究伦理。' },
  { title: '可解释证据链', desc: '每次识别提供置信度、结构特征、图版对照与原因说明，结果可追问。' },
  { title: '算法可插拔与数据扩展', desc: '从 69 字出发，已接入 HUST-OBC 与 EVOBC 公开数据，统一接口便于扩展。' },
  { title: '轻量现场导向', desc: '浏览器本地运行、离线可用，适合课堂、展馆与答辩现场演示。' }
]

export default function ProjectIntroPage() {
  return (
    <PageShell
      eyebrow="关于本项目"
      title="项目介绍"
      lead="殷契拾文——基于 OCR 技术的甲骨文拓片文字智能识别与检索系统。本页介绍项目需求背景、对国家文化数字化等战略的响应、技术路线与数据规范。"
    >
      {/* 01 · 政策背景与需求 */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <div className="eyebrow">01 · 政策背景与需求</div>
          <SealStamp text="政策" className="ml-auto" />
        </div>
        <Panel className="paper-grain mt-5 p-6 md:p-8">
          <h3 className="font-song text-xl text-ink">需求从何而来</h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            甲骨文是现存最早成体系的成熟汉字，但真实拓片字迹漫漶、异体众多——对普通观众是
            <strong className="font-medium text-ink">“看不懂”</strong>，
            对学习者意味着文字学、考古学等多重
            <strong className="font-medium text-ink">“学不会”</strong>的门槛，
            对静态展览而言又常常
            <strong className="font-medium text-ink">“难传播”</strong>。
          </p>
          <p className="mt-3 rounded-lg bg-bone/70 px-4 py-3 text-xs leading-6 text-muted">
            以上三点是本项目的<b>选题背景</b>，并非已经完成的用户问卷或现场调研结论。本平台因此定位为
            “研究学习演示项目”，以课堂与展馆可现场运行的工具形态回应公众理解、语言资源保护与
            新文科人才培养等方向。
          </p>
        </Panel>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {policies.map((p, i) => (
            <Reveal key={p.doc} delay={i * 0.06}>
              <Panel className="paper-grain h-full p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soot text-bone">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-bronze">{p.issuer}</div>
                    <h3 className="font-song mt-1 text-lg leading-snug text-ink">{p.doc}</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-xs leading-6">
                  <div className="rounded-lg bg-bone/70 px-4 py-3 text-muted">
                    <span className="font-medium text-ink">政策方向：</span>
                    {p.focus}
                  </div>
                  <div className="rounded-lg border border-gold/30 bg-parchment/70 px-4 py-3 text-ink/85">
                    <span className="font-medium text-sealDark">本项目响应：</span>
                    {p.response}
                  </div>
                </div>
              </Panel>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-line bg-paper px-5 py-3 text-[11px] leading-5 text-muted">
          政策名称、印发机关与表述以官方正式发文为准；此处仅用于学习展示与项目说明，不构成政策解读。
        </p>
      </section>

      {/* 02 · 项目定位与目标 */}
      <section className="mt-16">
        <div className="flex items-center gap-3">
          <div className="eyebrow">02 · 项目定位与目标</div>
          <SealStamp text="目标" className="ml-auto" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <Reveal key={g.title}>
              <Panel className="paper-grain flex h-full items-start gap-4 p-6">
                <span className="seal-badge !px-2 !py-1 !text-sm">{g.mark}</span>
                <div>
                  <h3 className="font-song text-lg text-ink">{g.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{g.desc}</p>
                </div>
              </Panel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 03 · 技术路线 */}
      <section className="mt-16">
        <div className="flex items-center gap-3">
          <div className="eyebrow">03 · 技术路线</div>
          <SealStamp text="方法" className="ml-auto" />
        </div>
        <Panel className="paper-grain mt-5 p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {routeSteps.map(([title, detail], i) => (
              <div key={title} className="relative rounded-xl border border-bronze/25 bg-bone/60 p-4">
                <span className="font-song text-xl text-bronzeDark">{String(i + 1).padStart(2, '0')}</span>
                <div className="mt-2 text-sm font-medium text-ink">{title}</div>
                <div className="mt-1 text-[11px] leading-5 text-muted">{detail}</div>
                {i < routeSteps.length - 1 ? (
                  <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-gold lg:block" />
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-lg bg-bone/70 px-4 py-3 text-xs leading-6 text-muted">
            手写输入若 ResNet-50 置信度低于 70%，会自动以本地 69 字矢量字形匹配复核，并在结果中明确标注
            “模型低置信 → 本地字形校验”，不冒充纯模型结论。
          </p>
        </Panel>
      </section>

      {/* 04 · 系统模块 */}
      <section className="mt-16">
        <div className="flex items-center gap-3">
          <div className="eyebrow">04 · 系统模块</div>
          <SealStamp text="模块" className="ml-auto" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Reveal key={m.path}>
              <Link
                to={m.path}
                className="group flex h-full items-start gap-4 rounded-xl border border-bronze/30 bg-paper p-5 shadow-card transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lift"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soot text-bone transition group-hover:bg-goldLight group-hover:text-soot">
                  <m.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{m.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{m.desc}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 05 · 数据与学术规范 */}
      <section className="mt-16">
        <div className="flex items-center gap-3">
          <div className="eyebrow">05 · 数据与学术规范</div>
          <SealStamp text="数据" className="ml-auto" />
        </div>
        <Panel className="paper-grain mt-5 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['精品 69 字', '本地矢量字库：甲骨字形、现代字、拼音、释义与构形说明。'],
              ['HUST-OBC', '公开学术数据集（CC BY-NC 4.0）：已释 1,588 类 / 77,064 张源图，内置精选样本与识别模板。'],
              ['EVOBC', '公开字形演变图版（CC BY-NC-SA 4.0）：金文/篆书/隶书共 1,438 个标签条目 / 3,361 张图版。'],
              ['个人上传库', '图片保存在浏览器 IndexedDB，仅本机使用、不上传服务器，可一键送入识别。']
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-bronze/25 bg-bone/60 p-5">
                <div className="font-song text-lg text-ink">{title}</div>
                <p className="mt-2 text-xs leading-6 text-muted">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-bone/70 px-4 py-3 text-xs leading-6 text-muted">
            诚实原则：识别结果不替代专业释读；未开展的问卷、场次、满意度等指标不显示、不占位；页面可查来源与许可信息。
          </div>
        </Panel>
      </section>

      {/* 06 · 创新点 */}
      <section className="mt-16">
        <div className="flex items-center gap-3">
          <div className="eyebrow">06 · 创新点</div>
          <SealStamp text="创新" className="ml-auto" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {innovations.map((n) => (
            <Reveal key={n.title}>
              <Panel className="paper-grain h-full p-6">
                <h3 className="font-song text-lg text-ink">{n.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{n.desc}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
      </section>

      <OracleRule className="mt-16" />
      <p className="mt-6 text-[11px] text-muted">
        大学生新文科实践创新大赛 · 数字人文方向 · 研究学习演示平台，识别结果不替代专业释读。
        <span className="ml-2 rounded-full border border-bronze/35 bg-paper px-2.5 py-0.5">殷契拾文 · 2026</span>
      </p>
    </PageShell>
  )
}
