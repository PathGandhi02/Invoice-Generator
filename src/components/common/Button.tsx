import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../../theme';

export function Button({ title, onPress, icon, variant = 'secondary', disabled, busy, style, accessibilityLabel }: {
  title: string; onPress: () => void; icon?: ReactNode; variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}
    accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, variant === 'primary' ? styles.primary : variant === 'ghost' ? styles.ghost : styles.secondary,
      (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }, style]}>
    {busy ? <ActivityIndicator size="small" color={colors.heading} /> : icon}
    <Text style={styles.text}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primary: { backgroundColor: '#2563eb', borderColor: '#4385f8' },
  secondary: { backgroundColor: '#1b2a42', borderColor: colors.border },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  text: { color: colors.heading, fontSize: 13, fontFamily: fonts.bold },
});
