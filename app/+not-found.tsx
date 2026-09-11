import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { shared } from '../src/theme';
export default function NotFound() {
  return <View style={[shared.page, { alignItems: 'center', justifyContent: 'center', gap: 20 }]}><Text style={shared.title}>Page not found</Text><Link href="/" style={{ color: '#93c5fd', padding: 16 }}>Return to your invoice</Link></View>;
}
