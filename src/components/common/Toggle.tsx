import { Switch, Text, View } from 'react-native';
import { shared } from '../../theme';
export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={shared.between}>
    <View style={{ flex: 1, gap: 4 }}><Text style={shared.text}>{label}</Text>{hint && <Text style={[shared.subtitle, { fontSize: 12 }]}>{hint}</Text>}</View>
    <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ false: '#36465f', true: '#2563eb' }} thumbColor="#ffffff" />
  </View>;
}
