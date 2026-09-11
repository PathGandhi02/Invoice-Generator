import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0b0f19', dashboard: '#0f172a', panel: '#172236', input: '#101a2c',
  border: '#2a3850', text: '#cbd5e1', heading: '#f8fafc', muted: '#93a3ba',
  blue: '#3b82f6', green: '#34d399', amber: '#fbbf24', rose: '#fb7185', purple: '#a78bfa',
};
export const accents = ['#f3f4f6', '#dbeafe', '#d1fae5', '#fef3c7', '#fce7f3', '#ede9fe'];
export const fonts = { body: 'Inter_400Regular', medium: 'Inter_500Medium', bold: 'Inter_600SemiBold', heading: 'Outfit_600SemiBold', brand: 'Outfit_700Bold' };
export const shared = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 22, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  title: { color: colors.heading, fontSize: 30, fontFamily: fonts.heading },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22, fontFamily: fonts.body },
  text: { color: colors.text, fontSize: 14, fontFamily: fonts.body },
  label: { color: colors.text, fontSize: 12, fontFamily: fonts.medium },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: colors.panel, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 16 },
});
