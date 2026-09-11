import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text } from 'react-native';
import { formatDate } from '../../utils/dates';
import { fonts } from '../../theme';
export function PaidStamp({ date }: { date: string }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      if (reduced) progress.setValue(1);
      else Animated.spring(progress, { toValue: 1, friction: 7, tension: 55, useNativeDriver: Platform.OS !== 'web' }).start();
    }).catch(() => progress.setValue(1));
    return () => { active = false; progress.stopAnimation(); };
  }, [progress]);
  return <Animated.View pointerEvents="none" style={[styles.stamp, {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }),
    transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '-18deg'] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [2, 1] }) }],
  }]}><Text style={styles.text}>PAID</Text><Text style={styles.date}>{formatDate(date)}</Text></Animated.View>;
}
const styles = StyleSheet.create({
  stamp: { position: 'absolute', top: 510, left: 265, zIndex: 1, borderWidth: 5, borderColor: '#169362', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 8, alignItems: 'center' },
  text: { fontFamily: fonts.brand, fontSize: 43, letterSpacing: 7, color: '#168359' },
  date: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: '#168359' },
});
