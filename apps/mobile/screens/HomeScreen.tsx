import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { glyphs } from '@yinqi/core'
import { GlyphMark } from '../components/GlyphMark'
import { SectionTitle } from '../components/SectionTitle'
import { colors, globalStyles, spacing } from '../theme'

export function HomeScreen() {
  const navigation = useNavigation<any>()
  return <ScrollView style={globalStyles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
    <View style={{ paddingTop: spacing.xl }}><Text style={{ color: colors.bronze, letterSpacing: 2, fontSize: 12 }}>DIGITAL HUMANITIES · ORACLE BONE</Text><Text style={[globalStyles.title, { fontSize: 34, marginTop: spacing.sm }]}>殷契拾文</Text><Text style={[globalStyles.subtitle, { marginTop: spacing.sm, maxWidth: 330 }]}>在拓片、字形与证据之间，重新阅读三千年前的文字。</Text></View>
    <View style={{ backgroundColor: colors.ink, borderRadius: 18, padding: spacing.xl, gap: spacing.md }}><Text style={{ color: colors.antiqueGold, fontSize: 13 }}>研究工作台</Text><Text style={{ color: colors.paper, fontSize: 22, fontWeight: '700' }}>从一幅拓片开始</Text><Text style={{ color: colors.darkMuted, lineHeight: 21 }}>拍摄、上传或手写一个字，查看候选字与字形证据。</Text><TouchableOpacity accessibilityRole="button" style={[globalStyles.button, { backgroundColor: colors.bronze, alignSelf: 'flex-start', marginTop: spacing.sm }]} onPress={() => navigation.navigate('识甲')}><Text style={globalStyles.buttonText}>开始识甲</Text></TouchableOpacity></View>
    <View><SectionTitle title="今日字库" action={`${glyphs.length} 字`} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>{glyphs.slice(0, 6).map((glyph) => <TouchableOpacity key={glyph.id} style={[globalStyles.card, { width: 118, alignItems: 'center', gap: spacing.sm }]} onPress={() => navigation.navigate('字库', { glyphId: glyph.id })}><GlyphMark glyph={glyph} size={72} /><Text style={{ fontSize: 23, color: colors.ink }}>{glyph.modern}</Text><Text style={{ color: colors.inkSoft, fontSize: 12 }}>{glyph.pinyin}</Text></TouchableOpacity>)}</ScrollView></View>
    <View style={[globalStyles.card, { backgroundColor: colors.paperDark }]}><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>研究提示</Text><Text style={[globalStyles.subtitle, { marginTop: spacing.sm }]}>AI 结果是释读线索，最终判断仍需结合辞例、出处与工具书。</Text></View>
  </ScrollView>
}
