import type { Candidate, HistoryRecord, ResearchRecord, ResearchStatus } from './types'

const NS = 'yinqi.'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value))
  } catch {
    // 存储满/隐私模式时静默降级，保证演示不中断
  }
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

export const RESEARCH_STATUSES: ResearchStatus[] = [
  '待分析',
  'AI辅助分析',
  '待人工确认',
  '已确认',
  '暂无结论'
]

export function listHistory(): HistoryRecord[] {
  return readJson<HistoryRecord[]>('history', [])
}

export function addHistory(rec: Omit<HistoryRecord, 'id' | 'feedback' | 'researchId'> & { id?: string }): HistoryRecord {
  const all = listHistory()
  const item: HistoryRecord = {
    ...rec,
    id: rec.id || uid(),
    feedback: '',
    researchId: ''
  }
  all.unshift(item)
  writeJson('history', all.slice(0, 200))
  return item
}

export function setFeedback(historyId: string, choice: HistoryRecord['feedback']) {
  const all = listHistory().map((r) => (r.id === historyId ? { ...r, feedback: choice } : r))
  writeJson('history', all)
}

export function listResearch(): ResearchRecord[] {
  return readJson<ResearchRecord[]>('research', [])
}

export function addResearch(item: Omit<ResearchRecord, 'id' | 'createdAt'> & { id?: string }): ResearchRecord {
  const all = listResearch()
  const record: ResearchRecord = {
    ...item,
    id: item.id || `R${String(all.length + 1).padStart(3, '0')}-${uid()}`,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
  }
  all.unshift(record)
  writeJson('research', all.slice(0, 100))
  if (record.historyId) {
    const history = listHistory().map((r) => (r.id === record.historyId ? { ...r, researchId: record.id } : r))
    writeJson('history', history)
  }
  return record
}

export function updateResearchStatus(id: string, status: ResearchStatus, note?: string) {
  writeJson(
    'research',
    listResearch().map((r) => (r.id === id ? { ...r, status, note: note ?? r.note } : r))
  )
}

export function deleteResearch(id: string) {
  writeJson('research', listResearch().filter((r) => r.id !== id))
}

export function addFeedbackRecord(choice: string, aiModern: string, confidence: number) {
  const all = readJson<{ ts: number; choice: string; aiModern: string; confidence: number; mode: string }[]>('feedback', [])
  all.unshift({
    ts: Date.now(),
    choice,
    aiModern,
    confidence,
    mode: 'browser-web'
  })
  writeJson('feedback', all.slice(0, 500))
}

export function readLearning(): Record<string, unknown>[] {
  return readJson<Record<string, unknown>[]>('learning', [])
}

export function saveLearningResult(payload: Record<string, unknown>) {
  const all = readLearning()
  all.unshift({ ...payload, ts: Date.now() })
  writeJson('learning', all.slice(0, 50))
}

export function clearDemoData() {
  localStorage.removeItem(NS + 'history')
  localStorage.removeItem(NS + 'research')
  localStorage.removeItem(NS + 'feedback')
  localStorage.removeItem(NS + 'learning')
}

export function practiceStats() {
  const history = listHistory()
  const feedback = readJson<{ choice: string }[]>('feedback', [])
  return {
    testCount: history.length,
    feedbackCorrect: feedback.filter((f) => f.choice === 'correct').length,
    feedbackWrong: feedback.filter((f) => f.choice === 'wrong').length,
    feedbackUncertain: feedback.filter((f) => f.choice === 'uncertain').length,
    researchCount: listResearch().length,
    top1Count: history.filter((h) => h.confident).length
  }
}

export { uid }
