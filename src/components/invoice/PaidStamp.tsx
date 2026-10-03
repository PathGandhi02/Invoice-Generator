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
    transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '-8deg'] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
  }]}><Text style={styles.text}>PAID</Text><Text style={styles.date}>{formatDate(date)}</Text></Animated.View>;
}
const styles = StyleSheet.create({
  stamp: { width: 150, alignSelf: 'flex-start', marginTop: 14, marginHorizontal: 6, borderWidth: 4, borderColor: '#169362', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  text: { fontFamily: fonts.brand, fontSize: 28, letterSpacing: 4, color: '#168359' },
  date: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: '#168359' },
});
