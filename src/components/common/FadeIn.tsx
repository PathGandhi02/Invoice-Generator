import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (active) Animated.timing(opacity, { toValue: 1, duration: reduced ? 0 : 180, useNativeDriver: Platform.OS !== 'web' }).start();
    }).catch(() => opacity.setValue(1));
    return () => { active = false; opacity.stopAnimation(); };
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
