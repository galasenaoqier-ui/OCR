import { Text, View } from 'react-native'
import { colors, spacing } from '../theme'

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm }}><Text style={{ color: colors.ink, fontSize: 19, fontWeight: '700' }}>{title}</Text>{action ? <Text style={{ color: colors.bronze, fontSize: 13 }}>{action}</Text> : null}</View>
}
