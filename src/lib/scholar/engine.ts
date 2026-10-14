import { byId, byModern, KNOWLEDGE_TOPICS, SOURCES } from '../kb'
import type { Glyph } from '../types'

export type ScholarMode = 'learn' | 'research'

export interface ScholarLink {
  label: string
  to: string
}

export interface ScholarContext {
  glyphId?: string
  modern?: string
  score?: number
  from?: 'home' | 'recognize' | 'direct'
  mode: ScholarMode
}

export interface ScholarAnswer {
  text: string
  sources: string[]
  links: ScholarLink[]
  disclaimer: string
}

export interface ScholarProvider {
  id: string
  name: string
  ready: boolean
  ask(ctx: ScholarContext, question: string): ScholarAnswer | Promise<ScholarAnswer>
}

const DISCLAIMER = 'AI 生成讲解，请以专业文献为准；本平台讲解不替代专家释读。'

function trimText(text: string, max = 148): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > max ? `${cleaned.slice(0, max).trimEnd()}……` : cleaned
}

function topicForGlyph(glyph: Glyph | undefined) {
  if (!glyph) return undefined
  return KNOWLEDGE_TOPICS.find((t) => t.glyphModern.includes(glyph.modern))
}

export function scholarLinksFor(glyph: Glyph | undefined): ScholarLink[] {
  if (!glyph) {
    return [{ label: '浏览甲骨知识', to: '/knowledge' }]
  }
  return [
    { label: '查看字库详情', to: `/character/${glyph.id}` },
    { label: '查看字形演变', to: `/evolution?glyph=${glyph.id}` },
    { label: '浏览甲骨知识', to: '/knowledge' }
  ]
}

export function relationChainFor(glyph: Glyph | undefined): string[] {
  if (!glyph) return ['甲骨文', '商代']
  const chain = ['甲骨文', glyph.modern]
  const topic = topicForGlyph(glyph)
  if (topic && !chain.includes(topic.label)) chain.push(topic.label)
  if (!chain.includes('商代')) chain.push('商代')
  if (!chain.includes('卜辞')) chain.push('卜辞')
  return chain.slice(0, 6)
}

export function welcomeAnswer(mode: ScholarMode): ScholarAnswer {
  const text = trimText(
    '欢迎来到殷契灵境。这里，我们从一枚甲骨开始，重新认识三千多年前的文字。你可以问我一个字、一片甲骨，也可以问我关于商代历史的一切。',
    120
  )
  return {
    text,
    sources: SOURCES.slice(0, 2).map((s) => s.title),
    links: [{ label: '进入甲骨字库', to: '/library' }],
    disclaimer: DISCLAIMER
  }
}

export function introForGlyph(glyph: Glyph | undefined, score?: number, mode: ScholarMode = 'learn'): ScholarAnswer {
  if (!glyph) return welcomeAnswer(mode)
  const topic = topicForGlyph(glyph)
  const scoreLine = typeof score === 'number' ? `本次识别演示置信度为 ${score.toFixed(1)}%。` : ''
  const base =
    `这个字是“${glyph.modern}”。在甲骨文中，它通过描绘${glyph.category === '象形' ? '具体事物的形态' : '与字义相关的特征'}来表现意思，本字释义为“${glyph.meaning}”。` +
    (glyph.note ? `${glyph.note}` : '') +
    (topic ? `在商代社会语境中，它常与“${topic.label}”相关。` : '') +
    scoreLine
  const research = mode === 'research'
  return {
    text: trimText(base, research ? 150 : 130),
    sources: [...SOURCES.slice(0, 2).map((s) => s.title), '本地 69 字矢量字库'].filter((x, i, a) => a.indexOf(x) === i),
    links: scholarLinksFor(glyph),
    disclaimer: DISCLAIMER
  }
}

export function answerForQuestion(ctx: ScholarContext, question: string): ScholarAnswer {
  const glyph = ctx.glyphId ? byId(ctx.glyphId) : ctx.modern ? byModern(ctx.modern) : undefined
  const topic = topicForGlyph(glyph)
  const q = question.trim()

  if (/演变|后来|发展|传承|变化/.test(q)) {
    const text = glyph
      ? `“${glyph.modern}”的形态演变可以沿甲骨文→金文→篆书→隶书→今天观察。本平台对已匹配 EVOBC 图版的字展示真实图版；尚未匹配的阶段保持“资料待补充”，不凭空补形。`
      : '字形演变通常沿甲骨文→金文→篆书→隶书→楷书/现代字推进。各阶段图版以 EVOBC 公开数据集为准，缺图阶段平台如实显示待补充。'
    return {
      text: trimText(text, 130),
      sources: ['EVOBC（CC BY-NC-SA 4.0）', '《说文解字》'],
      links: glyph ? scholarLinksFor(glyph) : [{ label: '查看字形演变', to: '/evolution' }],
      disclaimer: DISCLAIMER
    }
  }
  if (/为什么|怎么|结构|造字|象形|指事|会意/.test(q)) {
    const text = glyph
      ? `“${glyph.modern}”属于${glyph.category}字，本地字库释义为“${glyph.meaning}”。${glyph.note ? glyph.note : '这类字形多保留早期“以形表意”的造字特征。'}甲骨文中的许多字正是通过形体表达概念，这帮助我们理解商代人的观察与思维。`
      : '甲骨文包含大量象形与指事成分，早期文字常借助具体形态表达事物；字义与字形之间的关系需要在具体材料和工具书中逐字核对。'
    return {
      text: trimText(text, 145),
      sources: SOURCES.slice(0, 2).map((s) => s.title),
      links: glyph ? scholarLinksFor(glyph) : [{ label: '浏览甲骨知识', to: '/knowledge' }],
      disclaimer: DISCLAIMER
    }
  }
  if (/意思|含义|本义|表达什么|释为|怎么读|读音/.test(q)) {
    const text = glyph
      ? `“${glyph.modern}”的拼音为 ${glyph.pinyin}，本地字库释义为“${glyph.meaning}”，归类为${glyph.category}。具体卜辞义项仍应回到《甲骨文合集》等材料与专业考释中核对。`
      : '字的本义与卜辞用法需要对照出土材料与工具书，本地字库仅收录已释字形。'
    return {
      text: trimText(text, 130),
      sources: SOURCES.slice(0, 3).map((s) => s.title),
      links: glyph ? scholarLinksFor(glyph) : [{ label: '浏览甲骨字库', to: '/library' }],
      disclaimer: DISCLAIMER
    }
  }
  if (/商代|社会|生活|祭祀|占卜|战争|农业|青铜|殷墟|商王/.test(q)) {
    const topicText = topic?.summary || KNOWLEDGE_TOPICS.find((t) => t.label === '商代')?.summary
    return {
      text: trimText(topicText || '相关通识介绍可查看甲骨知识页面；本平台按本地已收录资料回答，不作逐片考释。', 150),
      sources: [...SOURCES.slice(0, 2).map((s) => s.title), topic ? `话题：${topic.label}` : '甲骨知识'].filter(
        (x, i, a) => a.indexOf(x) === i
      ),
      links: [{ label: '查看相关知识', to: '/knowledge' }],
      disclaimer: DISCLAIMER
    }
  }
  if (/卜辞|贞人|占卜记录/.test(q)) {
    return {
      text: trimText(
        '卜辞通常记录占卜时间、贞问者、所问事项与吉凶判断。它不是通顺的“问答记录”，而是一种结构化的占卜档案。更细的释读需要逐片核对。',
        140
      ),
      sources: ['《甲骨文合集》', '本地字库构形资料'],
      links: [{ label: '浏览甲骨知识', to: '/knowledge' }],
      disclaimer: DISCLAIMER
    }
  }
  if (/OCR|识别|人工智能|AI|数字人文|数字博物馆/.test(q)) {
    return {
      text: trimText(
        '本平台用 OCR/本地模型把拓片字形转成候选字，再用字形库与图版对照做可解释判断。AI 识别不等于专家释读，低置信结果只提供考证方向。',
        140
      ),
      sources: ['本地识别引擎说明', 'HUST-OBC / EVOBC 数据说明'],
      links: [{ label: '进入 AI 识甲', to: '/recognize' }],
      disclaimer: DISCLAIMER
    }
  }
  return {
    text: trimText(
      '这个问题暂不在我已收录的资料范围内。数字史官只讲解本地字库、字形演变、卜辞通识与商代历史文化；更专业的考释请参考《甲骨文合集》等专业文献。',
      140
    ),
    sources: ['本地知识引擎', SOURCES[0].title],
    links: [{ label: '浏览甲骨知识', to: '/knowledge' }],
    disclaimer: DISCLAIMER
  }
}

export const DEFAULT_PROVIDER: ScholarProvider = {
  id: 'local-knowledge',
  name: '本地知识引擎（离线 · 示例讲解）',
  ready: true,
  ask(ctx, question) {
    if (!question.trim()) return welcomeAnswer(ctx.mode)
    return answerForQuestion(ctx, question)
  }
}

export const PROVIDERS: ScholarProvider[] = [DEFAULT_PROVIDER]

export function recommendedQuestions(glyph: Glyph | undefined): string[] {
  if (!glyph) {
    return [
      '为什么甲骨文这么像图画？',
      '甲骨文主要在哪些地方出土？',
      'OCR 识别和专家释读有什么区别？'
    ]
  }
  const topic = topicForGlyph(glyph)
  return [
    '这个字为什么这样写？',
    '它最早表达什么意思？',
    '这个字后来怎么演变？',
    topic ? `这个字和商代“${topic.label}”有什么关系？` : '这个字和商代生活有什么关系？'
  ]
}
