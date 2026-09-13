import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../common/Button';
import { useAuth } from '../../state/AuthProvider';
import { shared } from '../../theme';

export function Welcome() {
  const router = useRouter();
  const { continueAsGuest } = useAuth();
  return <ScrollView contentContainerStyle={[shared.content, { maxWidth: 540, paddingTop: 60 }]}>
    <Text style={shared.title}>Invoices that feel like your business.</Text>
    <Text style={shared.subtitle}>Create invoices, receipts and payment QR codes. Start on this device, or create an account to keep your business in the cloud.</Text>
    <View style={shared.card}>
      <Button title="Create Account" variant="primary" onPress={() => router.push('/register')} />
      <Button title="Sign In" onPress={() => router.push('/login')} />
      <Button title="Continue as Guest" variant="ghost" onPress={() => { void continueAsGuest(); }} />
      <Text style={shared.subtitle}>Guest data stays on this device. Signing in never imports it without your choice.</Text>
    </View>
  </ScrollView>;
}
