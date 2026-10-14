import { Platform, StyleSheet } from 'react-native'

export const colors = {
  ink: '#211F1A', inkSoft: '#51473A', bronze: '#344D46', bronzeLight: '#647B6D',
  antiqueGold: '#A58A55', paper: '#F3EBDD', paperDark: '#E5D8C2', border: '#D3C5AD',
  vermilion: '#8B4338', darkBg: '#211F1A', darkPanel: '#2B2923', darkBorder: '#494337',
  darkText: '#F3EBDD', darkMuted: '#C2B7A3', white: '#FFFFFF', success: '#647B6D', danger: '#8B4338'
} as const

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
export const radii = { sm: 8, md: 12, lg: 18, pill: 999 } as const

export const globalStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.ink, fontFamily: Platform.select({ android: 'serif', default: undefined }), fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.lg },
  button: { minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  buttonText: { color: colors.paper, fontSize: 15, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: spacing.lg, color: colors.ink, fontSize: 16 }
})
