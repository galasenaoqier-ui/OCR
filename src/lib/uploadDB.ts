// 个人甲骨上传数据库：仅保存在当前浏览器 IndexedDB，不上传服务器。
export interface UploadRecord {
  id: string
  fileName: string
  type: string
  size: number
  createdAt: number
  number: string
  modern: string
  source: string
  note: string
  original: Blob
  thumb?: Blob
}

export interface NewUploadItem {
  file: File
  thumb?: Blob
}

const DB_NAME = 'yinqi-uploads'
const STORE = 'uploadRecords'

let dbPromise: Promise<IDBDatabase> | null = null

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 12)
  return `U${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function openDB(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('当前浏览器不支持 IndexedDB'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('打开上传数据库失败'))
  })
  return dbPromise
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('数据库操作失败'))
    tx.onabort = () => reject(tx.error || new Error('数据库操作已中止'))
  })
}

export async function listUploads(): Promise<UploadRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const rows = (req.result || []) as UploadRecord[]
      resolve(rows.sort((a, b) => b.createdAt - a.createdAt))
    }
    req.onerror = () => reject(req.error || new Error('读取上传记录失败'))
  })
}

export async function getUpload(id: string): Promise<UploadRecord | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as UploadRecord | undefined)
    req.onerror = () => reject(req.error || new Error('读取上传记录失败'))
  })
}

export async function addUploads(items: NewUploadItem[]): Promise<UploadRecord[]> {
  if (!items.length) return []
  const db = await openDB()
  const records: UploadRecord[] = items.map((item) => ({
    id: uid(),
    fileName: item.file.name,
    type: item.file.type || 'application/octet-stream',
    size: item.file.size,
    createdAt: Date.now(),
    number: '',
    modern: '',
    source: '',
    note: '',
    original: item.file,
    thumb: item.thumb
  }))
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const record of records) store.put(record)
    txDone(tx).then(() => resolve(records), reject)
  })
}

export async function updateUpload(
  id: string,
  fields: Partial<Pick<UploadRecord, 'number' | 'modern' | 'source' | 'note' | 'fileName'>>
): Promise<UploadRecord> {
  const db = await openDB()
  const existing = await getUpload(id)
  if (!existing) throw new Error('记录不存在')
  const next: UploadRecord = { ...existing, ...fields }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(next)
    txDone(tx).then(() => resolve(next), reject)
  })
}

export async function deleteUpload(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    txDone(tx).then(() => resolve(), reject)
  })
}

export async function clearUploads(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    txDone(tx).then(() => resolve(), reject)
  })
}
