import type { Candidate, Glyph, HistoryRecord, RecognitionResult, ResearchRecord } from '@yinqi/core'

export interface LocalImage { uri: string; fileName?: string; width?: number; height?: number; mimeType?: string }
export interface PermissionState { camera: boolean; media: boolean }
export interface GrayImage { width: number; height: number; data: Uint8Array }
export interface EngineStatus { state: 'idle' | 'loading' | 'ready' | 'fallback' | 'error'; message: string; model: string }
export type RecognitionInput = { kind: 'image'; image: LocalImage } | { kind: 'sample'; glyph: Glyph } | { kind: 'draw'; strokes: number[][][] }

export interface ImageSourceAdapter { pickFromGallery(): Promise<LocalImage | null>; captureWithCamera(): Promise<LocalImage | null>; requestPermissions(): Promise<PermissionState> }
export interface ImageProcessingAdapter { decode(uri: string): Promise<GrayImage>; resizeAndNormalize(gray: GrayImage, size: number): Promise<Float32Array>; createThumbnail(uri: string): Promise<string> }
export interface RecognitionEngine { ready(): Promise<void>; status(): EngineStatus; recognize(input: RecognitionInput): Promise<RecognitionResult> }
export interface StorageAdapter {
  listHistory(): Promise<HistoryRecord[]>; saveHistory(record: HistoryRecord): Promise<void>
  listResearch(): Promise<ResearchRecord[]>; saveResearch(record: ResearchRecord): Promise<void>
}

export type { Candidate }
