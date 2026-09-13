import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '../src/state/AuthProvider';
import { authService } from '../src/services/AuthService';
import { Input } from '../src/components/common/FormInput';
import { Button } from '../src/components/common/Button';
import { GuestImport } from '../src/components/account/GuestImport';
import { colors, shared } from '../src/theme';

export default function Profile() {
  const { user, profile, business, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? ''), [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const router = useRouter();
  const run = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); setError(''); setMessage(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); } };
  const save = async () => { if (!user) return; if (!name.trim() || name.trim().length > 150 || phone.length > 30) throw new Error('Enter your full name and a valid phone number.'); await authService.updateProfile(user.id, name, phone); await refreshProfile(); setMessage('Profile saved.'); };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[shared.content, { maxWidth: 650 }]}>
    <Text style={shared.title}>{user ? 'Your profile.' : 'You’re using Guest Mode.'}</Text>
    {user ? <><View style={shared.card}>
      <View style={{ alignSelf: 'flex-start', borderRadius: 32, backgroundColor: '#244a73', width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}><Text style={shared.title}>{(profile?.full_name || user.email || 'U').split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase()}</Text></View>
      <Text style={shared.text}>{user.email}</Text><Text style={shared.subtitle}>{user.email_confirmed_at ? 'Email verified' : 'Email not verified'}</Text>
      <Text style={shared.text}>{business?.name || 'My business workspace'}</Text><Text style={shared.subtitle}>{business?.protected_key ? 'Shared workspace · Approved member' : 'Personal workspace'} · Cloud storage</Text>
      <Input label="Full name" value={name} onChangeText={setName} maxLength={150} /><Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} />
      <Button title="Save profile" variant="primary" busy={busy} onPress={() => { void run(save); }} />
      <Button title="Business settings" onPress={() => router.push('/settings')} />
      <Button title="Change password" onPress={() => router.push('/reset-password')} />
      <Button title="Sign out" disabled={busy} onPress={() => { void run(async () => { await signOut(); router.replace('/'); }); }} />
    </View><GuestImport /><GuestImport legacy /></> : <View style={shared.card}>
      <Text style={shared.subtitle}>Your customers, drafts, business settings and invoice history stay on this device. Create an account to save business records in the cloud.</Text>
      <Button title="Create Account" variant="primary" onPress={() => router.push('/register')} /><Button title="Sign In" onPress={() => router.push('/login')} /><Button title="Business settings" onPress={() => router.push('/settings')} />
    </View>}
    {!!error && <Text accessibilityRole="alert" style={[shared.text, { color: colors.rose }]}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={[shared.text, { color: colors.green }]}>{message}</Text>}
  </ScrollView>;
}
