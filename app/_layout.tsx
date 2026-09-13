import { Slot, Link, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Wifi, FilePlus2, History, Settings2, ShieldCheck, UserRound } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { ToastProvider } from '../src/state/ToastProvider';
import { AppProvider, useApp } from '../src/state/AppProvider';
import { colors, fonts } from '../src/theme';
import { AuthProvider, useAuth } from '../src/state/AuthProvider';
import { WorkspaceProvider, useWorkspace } from '../src/state/WorkspaceProvider';
import { Button } from '../src/components/common/Button';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Outfit_600SemiBold, Outfit_700Bold });
  useEffect(() => {
    if (Platform.OS === 'web' && process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => console.info('Offline web cache is unavailable; the current workspace remains usable.'));
    }
  }, []);
  // Native text measurements can retain fallback widths after the font loads.
  // Mount the workspace once fonts settle; still allow startup if loading fails.
  const waitingForFonts = Platform.OS !== 'web' && !fontsLoaded && !fontError;
  return <SafeAreaProvider>{waitingForFonts
    ? <View style={[styles.root, styles.loading]}><ActivityIndicator accessibilityLabel="Loading workspace" color={colors.blue} /></View>
    : <ToastProvider><AuthProvider><WorkspaceBoundary /></AuthProvider></ToastProvider>}
  </SafeAreaProvider>;
}

function WorkspaceBoundary() {
  const { user, business, isLoading, error, retry, signOut, continueAsGuest } = useAuth();
  if (isLoading) return <View style={[styles.root, styles.loading]}><ActivityIndicator color={colors.blue} /><Text style={styles.navText}>Opening your workspace…</Text></View>;
  if (error || (user && !business)) return <View style={[styles.root, styles.loading]}><Text style={styles.navText}>{error || 'Your workspace is unavailable.'}</Text><Button title="Retry" onPress={retry} /><Button title={user ? 'Sign out' : 'Continue as Guest'} onPress={() => { void (user ? signOut() : continueAsGuest()).catch(() => {}); }} /></View>;
  return <WorkspaceProvider key={user ? `${user.id}:${business?.id}` : 'guest'}><AppProvider><AppShell /></AppProvider></WorkspaceProvider>;
}

function AppShell() {
  const { width } = useWindowDimensions();
  const { ready } = useApp();
  const { cloud } = useWorkspace();
  const { recovery } = useAuth();
  const router = useRouter();
  // Match the static HTML until storage hydration completes on the client.
  const desktop = ready && width >= 1100;
  const pathname = usePathname();
  useEffect(() => { if (ready && recovery && pathname !== '/reset-password') router.replace('/reset-password'); }, [ready, recovery, pathname, router]);
  const navigation = <View style={[styles.nav, !desktop && styles.bottomNav]}>
    {([{ href: '/', title: 'Invoice', icon: FilePlus2 }, { href: '/history', title: 'History', icon: History }, { href: '/settings', title: 'Settings', icon: Settings2 }, { href: '/profile', title: 'Profile', icon: UserRound }] as const).map(item => {
      const selected = pathname === item.href;
      return <Link key={item.href} href={item.href} asChild><Pressable accessibilityRole="link" accessibilityLabel={item.title} accessibilityState={{ selected }}
        style={StyleSheet.flatten([styles.navItem, !desktop && { flex: 1, flexDirection: 'column', gap: 5 }, selected && styles.navSelected])}>
        <item.icon size={19} color={selected ? '#93c5fd' : colors.muted} /><Text style={[styles.navText, selected && { color: '#bfdbfe' }]}>{item.title}</Text>
      </Pressable></Link>;
    })}
  </View>;
  return <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
    <StatusBar style="light" />
    <View style={[styles.header, !desktop && { paddingHorizontal: 18, height: 70 }]}>
      <View style={styles.brand}><View style={styles.brandIcon}><Wifi size={25} color="white" /></View><View><Text style={styles.brandName}>GigaInvoice</Text><Text style={styles.brandSubtitle}>PRO STUDIO</Text></View></View>
      {desktop ? navigation : <View style={styles.localBadge}><ShieldCheck size={13} color={colors.green} /><Text style={styles.localText}>{cloud ? 'Cloud workspace' : 'Guest · This device'}</Text></View>}
    </View>
    {ready ? <View style={{ flex: 1 }}><Slot /></View> : <View style={styles.loading}><ActivityIndicator color={colors.blue} /><Text style={styles.navText}>Restoring your workspace…</Text></View>}
    {!desktop && navigation}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 78, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#10192a' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandIcon: { width: 43, height: 43, backgroundColor: '#2563eb', borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#5c8df7' },
  brandName: { color: '#f8fafc', fontSize: 24, lineHeight: 28, fontFamily: fonts.brand },
  brandSubtitle: { color: '#829cbd', fontSize: 9, letterSpacing: 2.6, fontFamily: fonts.bold, marginTop: 3 },
  nav: { flexDirection: 'row', gap: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, paddingVertical: 12, minHeight: 46, borderRadius: 10 },
  navSelected: { backgroundColor: '#1c3151' },
  navText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  bottomNav: { paddingHorizontal: 14, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#10192a' },
  localBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  localText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
});
