import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';
import { FadeIn } from './FadeIn';
export function AccordionCard({ title, subtitle, icon, open, onToggle, children }: {
  title: string; subtitle?: string; icon: ReactNode; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return <View style={[styles.card, open && { borderColor: '#345078' }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }}
      onPress={onToggle} style={({ pressed }) => [styles.header, pressed && { opacity: 0.75 }]}>
      <View style={styles.icon}>{icon}</View>
      <View style={{ flex: 1, gap: 4 }}><Text style={styles.title}>{title}</Text>{subtitle && <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>}</View>
      {open ? <ChevronDown size={17} color={colors.muted} /> : <ChevronRight size={17} color={colors.muted} />}
    </Pressable>
    {open && <FadeIn style={styles.body}>{children}</FadeIn>}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: 14, overflow: 'hidden' },
  header: { minHeight: 78, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { backgroundColor: '#1f304a', padding: 10, borderRadius: 11 },
  title: { color: colors.heading, fontSize: 14, fontFamily: fonts.bold },
  subtitle: { color: colors.muted, fontSize: 11, fontFamily: fonts.body },
  body: { padding: 18, paddingTop: 3, gap: 16 },
});
