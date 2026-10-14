import AsyncStorage from '@react-native-async-storage/async-storage'
import type { HistoryRecord, ResearchRecord } from '@yinqi/core'
import type { StorageAdapter } from './contracts'

const HISTORY_KEY = 'yinqi.mobile.history'
const RESEARCH_KEY = 'yinqi.mobile.research'
async function read<T>(key: string): Promise<T[]> { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) as T[] : [] }
async function write<T>(key: string, values: T[]) { await AsyncStorage.setItem(key, JSON.stringify(values)) }

export const storageAdapter: StorageAdapter = {
  async listHistory() { return read<HistoryRecord>(HISTORY_KEY) },
  async saveHistory(record) { const all = await read<HistoryRecord>(HISTORY_KEY); await write(HISTORY_KEY, [record, ...all].slice(0, 200)) },
  async listResearch() { return read<ResearchRecord>(RESEARCH_KEY) },
  async saveResearch(record) { const all = await read<ResearchRecord>(RESEARCH_KEY); await write(RESEARCH_KEY, [record, ...all].slice(0, 100)) }
}
