import { Canvas, Path, Skia } from '@shopify/react-native-skia'
import { View } from 'react-native'
import type { Glyph } from '@yinqi/core'
import { colors } from '../theme'

export function GlyphMark({ glyph, size = 92, dark = false }: { glyph: Glyph; size?: number; dark?: boolean }) {
  const path = Skia.Path.Make()
  glyph.strokes.forEach((stroke) => { stroke.forEach(([x, y], index) => { if (index === 0) path.moveTo(x * size, y * size); else path.lineTo(x * size, y * size) }) })
  return <View style={{ width: size, height: size, backgroundColor: dark ? colors.darkPanel : colors.paperDark, borderRadius: 10, overflow: 'hidden' }}><Canvas style={{ width: size, height: size }}><Path path={path} color={dark ? colors.darkText : colors.ink} style="stroke" strokeWidth={Math.max(2, size * 0.035)} strokeCap="round" strokeJoin="round" /></Canvas></View>
}
