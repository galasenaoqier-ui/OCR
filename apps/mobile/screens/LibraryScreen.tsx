import { useMemo, useState } from 'react'
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { glyphGroups, searchGlyphs } from '@yinqi/core'
import { GlyphMark } from '../components/GlyphMark'
import { colors, globalStyles, spacing } from '../theme'

export function LibraryScreen() {
  const [query, setQuery] = useState(''); const [group, setGroup] = useState('全部'); const navigation = useNavigation<any>()
  const data = useMemo(() => searchGlyphs(query, group), [query, group])
  return <View style={globalStyles.screen}><View style={{ padding: spacing.lg, gap: spacing.md }}><Text style={globalStyles.title}>甲骨字库</Text><Text style={globalStyles.subtitle}>按现代字、拼音或主题检索 69 个精品字形。</Text><TextInput value={query} onChangeText={setQuery} placeholder="搜索字形、拼音或释义" placeholderTextColor={colors.inkSoft} style={globalStyles.input} /><FlatList horizontal showsHorizontalScrollIndicator={false} data={['全部', ...glyphGroups]} keyExtractor={(item) => item} contentContainerStyle={{ gap: spacing.sm }} renderItem={({ item }) => <TouchableOpacity onPress={() => setGroup(item)} style={{ minHeight: 40, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: 20, backgroundColor: item === group ? colors.bronze : colors.paperDark }}><Text style={{ color: item === group ? colors.paper : colors.inkSoft, fontSize: 13 }}>{item}</Text></TouchableOpacity>} /></View><FlatList data={data} numColumns={2} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }} columnWrapperStyle={{ gap: spacing.md }} renderItem={({ item }) => <TouchableOpacity style={[globalStyles.card, { flex: 1, minHeight: 190, alignItems: 'center', gap: spacing.sm }]} onPress={() => navigation.navigate('字形详情', { id: item.id })}><GlyphMark glyph={item} size={92} /><Text style={{ fontSize: 25, color: colors.ink }}>{item.modern}</Text><Text style={{ color: colors.inkSoft, fontSize: 12 }}>{item.pinyin} · {item.displayGroup}</Text></TouchableOpacity>} ListEmptyComponent={<Text style={[globalStyles.subtitle, { textAlign: 'center', marginTop: spacing.xl }]}>没有找到匹配字形</Text>} /></View>
}
