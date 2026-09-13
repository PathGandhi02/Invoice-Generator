import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';
import { authService } from '../../services/AuthService';
import { useAuth } from '../../state/AuthProvider';
import { Button } from '../common/Button';
import { Input } from '../common/FormInput';
import { Toggle } from '../common/Toggle';
import { colors, shared } from '../../theme';

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email' | 'auth-callback';
const titles: Record<Mode, string> = { login: 'Welcome back.', register: 'Create your account.', 'forgot-password': 'Reset your password.', 'reset-password': 'Choose a new password.', 'verify-email': 'Check your email.', 'auth-callback': 'Verifying your email…' };
export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { user, continueAsGuest, finishRecovery } = useAuth();
  const [name, setName] = useState(''), [email, setEmail] = useState(params.email ?? ''), [phone, setPhone] = useState('');
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [show, setShow] = useState(false), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(mode === 'auth-callback' ? 'Email confirmed? Sign in to open your workspace.' : ''), [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const url = Linking.useURL();
  const handled = useRef(false);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(n => n - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  useEffect(() => {
    if (mode !== 'auth-callback' && mode !== 'reset-password') return;
    const link = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : url;
    if (!link || handled.current) return;
    if (!/[?#].*(code=|access_token=|error=)/.test(link)) return;
    handled.current = true;
    void Promise.resolve().then(() => { setBusy(true); return authService.callback(link); }).then(() => { if (mode === 'auth-callback') router.replace('/profile'); else setMessage('Email link verified. Enter your new password.'); })
      .catch(e => setError(e instanceof Error ? e.message : 'This email link could not be verified.'))
      .finally(() => setBusy(false));
  }, [mode, url, router]);
  const submit = async () => {
    if (busy) return;
    setError(''); setMessage('');
    if (!['reset-password', 'auth-callback'].includes(mode) && !z.email().safeParse(email.trim()).success) { setError('Enter a valid email address.'); return; }
    if (mode === 'register' && (!name.trim() || name.trim().length > 150 || phone.length > 30)) { setError('Enter your full name (up to 150 characters) and a valid phone number.'); return; }
    if (['register', 'reset-password'].includes(mode) && (password.length < 8 || password.length > 72 || password !== confirmation)) { setError('Use 8–72 characters and make both passwords match.'); return; }
    if (mode === 'register' && !consent) { setError('Accept the Terms and Privacy notice to create an account.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') { await authService.signIn(email, password); setPassword(''); router.replace('/profile'); }
      if (mode === 'register') { const data = await authService.signUp(name, email, phone, password); setPassword(''); setConfirmation(''); router.replace(data.session ? '/profile' : { pathname: '/verify-email', params: { email: email.trim() } }); }
      if (mode === 'forgot-password') { await authService.resetPassword(email); setCooldown(60); setMessage('If an account uses this email, a reset link is on its way. Open it on this device.'); }
      if (mode === 'verify-email') { await authService.resend(email); setCooldown(60); setMessage('If verification is needed, a new email is on its way. Check your inbox and spam folder.'); }
      if (mode === 'reset-password') { await authService.updatePassword(password); finishRecovery(); setPassword(''); setConfirmation(''); setMessage('Password updated. You can return to your profile.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const hasPassword = ['login', 'register', 'reset-password'].includes(mode);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[shared.content, { maxWidth: 520 }]}>
    <Text style={shared.title}>{titles[mode]}</Text>
    {mode === 'verify-email' && <Text style={shared.subtitle}>Open the verification email on the device where you registered. Then sign in. Guest mode is available while you wait.</Text>}
    {mode === 'register' && <Text style={shared.subtitle}>Your account gets its own workspace. Existing guest data stays separate until you choose to import it.</Text>}
    <View style={shared.card}>
      {mode === 'register' && <><Input label="Full name" value={name} onChangeText={setName} autoComplete="name" maxLength={150} /><Input label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} /></>}
      {!['reset-password', 'auth-callback'].includes(mode) && <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" maxLength={254} />}
      {hasPassword && <><Input label={mode === 'reset-password' ? 'New password' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={72} />
        {mode !== 'login' && <Input label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} maxLength={72} />}
        <Toggle label="Show password" value={show} onChange={setShow} /></>}
      {mode === 'register' && <><Toggle label="I accept the Terms and Privacy notice" value={consent} onChange={setConsent} /><View style={shared.row}><Button title="Terms" variant="ghost" onPress={() => router.push('/terms')} /><Button title="Privacy" variant="ghost" onPress={() => router.push('/privacy')} /></View></>}
      {!!error && <Text accessibilityRole="alert" style={[shared.text, { color: colors.rose }]}>{error}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={[shared.text, { color: colors.green }]}>{message}</Text>}
      {mode === 'reset-password' && !user && <Text style={shared.subtitle}>Open a valid password reset email to continue.</Text>}
      {mode !== 'auth-callback' && <Button title={cooldown ? `Try again in ${cooldown}s` : ({ login: 'Sign In', register: 'Create Account', 'forgot-password': 'Send reset link', 'reset-password': 'Update password', 'verify-email': 'Resend verification email' } as const)[mode]} variant="primary" busy={busy} disabled={cooldown > 0 || (mode === 'reset-password' && !user)} onPress={() => { void submit(); }} />}
      {mode === 'login' && <><Button title="Forgot password?" variant="ghost" onPress={() => router.push('/forgot-password')} /><Button title="Verify your email" variant="ghost" onPress={() => router.push({ pathname: '/verify-email', params: { email } })} /><Button title="Create Account" onPress={() => router.push('/register')} /></>}
      {mode !== 'login' && <Button title={user ? 'Back to profile' : 'Sign In'} onPress={() => router.replace(user ? '/profile' : '/login')} />}
      {!user && <Button title="Continue as Guest" variant="ghost" onPress={() => { void continueAsGuest().then(() => router.replace('/')); }} />}
    </View>
  </ScrollView>;
}
