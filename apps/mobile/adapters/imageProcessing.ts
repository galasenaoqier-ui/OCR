import * as ImageManipulator from 'expo-image-manipulator'
import type { ImageProcessingAdapter } from './contracts'

export const imageProcessingAdapter: ImageProcessingAdapter = {
  async decode(uri) {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 128, height: 128 } }], { format: ImageManipulator.SaveFormat.PNG, base64: true })
    const bytes = result.base64 ? Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0)) : new Uint8Array()
    return { width: 128, height: 128, data: bytes }
  },
  async resizeAndNormalize(gray, size) {
    const output = new Float32Array(size * size)
    for (let i = 0; i < output.length; i++) output[i] = (gray.data[i % Math.max(gray.data.length, 1)] ?? 255) / 255
    return output
  },
  async createThumbnail(uri) {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 320 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG })
    return result.uri
  }
}
