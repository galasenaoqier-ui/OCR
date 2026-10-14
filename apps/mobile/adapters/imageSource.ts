import * as ImagePicker from 'expo-image-picker'
import type { ImageSourceAdapter, LocalImage, PermissionState } from './contracts'

const mapAsset = (asset?: ImagePicker.ImagePickerAsset): LocalImage | null => asset ? ({ uri: asset.uri, fileName: asset.fileName ?? undefined, width: asset.width, height: asset.height, mimeType: asset.mimeType ?? undefined }) : null

export const imageSourceAdapter: ImageSourceAdapter = {
  async requestPermissions(): Promise<PermissionState> {
    const camera = await ImagePicker.requestCameraPermissionsAsync()
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return { camera: camera.granted, media: media.granted }
  },
  async pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true, aspect: [1, 1] })
    return result.canceled ? null : mapAsset(result.assets[0])
  },
  async captureWithCamera() {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true, aspect: [1, 1] })
    return result.canceled ? null : mapAsset(result.assets[0])
  }
}
