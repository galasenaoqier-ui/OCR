import { ScrollView, Text, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { glyphById } from '@yinqi/core'
import { GlyphMark } from '../components/GlyphMark'
import { colors, globalStyles, spacing } from '../theme'

export function CharacterScreen() { const id = useRoute<any>().params?.id; const glyph = glyphById(id) ?? glyphById('yi'); if (!glyph) return null; return <ScrollView style={globalStyles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}><View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}><GlyphMark glyph={glyph} size={180} /><Text style={{ color: colors.ink, fontSize: 48, fontFamily: 'serif' }}>{glyph.modern}</Text><Text style={{ color: colors.bronze, fontSize: 16 }}>{glyph.pinyin} · {glyph.category}</Text></View><View style={globalStyles.card}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>释义</Text><Text style={[globalStyles.subtitle, { marginTop: spacing.sm }]}>{glyph.meaning}</Text></View><View style={globalStyles.card}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>字形说明</Text><Text style={[globalStyles.subtitle, { marginTop: spacing.sm }]}>{glyph.note}</Text></View></ScrollView> }
