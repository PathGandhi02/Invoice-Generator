import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, AlertCircle, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { FadeIn } from '../components/common/FadeIn';
type ToastKind = 'success' | 'error' | 'info';
const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();
  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 8000 : 4500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <ToastContext.Provider value={notify}>{children}{toast &&
    <View pointerEvents="box-none" style={[styles.container, { bottom: 82 + insets.bottom }]}>
      <FadeIn key={toast.id} style={styles.toast}>
        {toast.kind === 'error' ? <AlertCircle size={20} color={colors.rose} /> : <CheckCircle2 size={20} color={colors.green} />}
        <Text accessibilityLiveRegion="polite" style={styles.text}>{toast.message}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => setToast(null)} style={styles.close}><X size={18} color={colors.text} /></Pressable>
      </FadeIn>
    </View>}
  </ToastContext.Provider>;
}
const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 100 },
  toast: { maxWidth: 550, width: '100%', padding: 12, paddingLeft: 18, borderRadius: 16, borderWidth: 1, borderColor: '#49607c', backgroundColor: '#16243bf5', flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 12 },
  text: { flex: 1, color: colors.heading, fontSize: 13, lineHeight: 20, fontFamily: fonts.body },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
