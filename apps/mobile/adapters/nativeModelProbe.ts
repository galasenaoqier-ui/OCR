import * as ort from 'onnxruntime-react-native'
import { Asset } from 'expo-asset'
import type { EngineStatus } from './contracts'

export interface NativeModelProbeResult {
  available: boolean
  status: EngineStatus
  inputNames: string[]
  outputNames: string[]
  error?: string
}

/**
 * Development Build probe for the bundled HUST-OBC ONNX model.
 * The first slice does not claim model readiness until this probe succeeds.
 */
export async function probeNativeOnnxModel(modelUri: string): Promise<NativeModelProbeResult> {
  try {
    const session = await ort.InferenceSession.create(modelUri)
    return {
      available: true,
      status: { state: 'ready', message: '本地 ONNX 模型已就绪', model: 'HUST-OBC ResNet-50 · ONNX Runtime Mobile' },
      inputNames: [...session.inputNames],
      outputNames: [...session.outputNames]
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      available: false,
      status: { state: 'fallback', message: `原生 ONNX 不可用，已降级辅助匹配：${message}`, model: '辅助匹配引擎' },
      inputNames: [],
      outputNames: [],
      error: message
    }
  }
}

export async function probeBundledOnnxModel(): Promise<NativeModelProbeResult> {
  const asset = Asset.fromModule(require('../assets/hust/resnet50.onnx'))
  await asset.downloadAsync()
  if (!asset.localUri) {
    return { available: false, status: { state: 'fallback', message: '模型资源未能下载到本地', model: '辅助匹配引擎' }, inputNames: [], outputNames: [], error: 'missing-local-uri' }
  }
  return probeNativeOnnxModel(asset.localUri)
}
