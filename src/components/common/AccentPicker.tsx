import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { accents, shared } from '../../theme';
export function AccentPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const names = ['Slate', 'Sky blue', 'Mint', 'Amber', 'Rose', 'Lavender'];
  return <View style={{ gap: 12 }}><Text style={shared.label}>Invoice accent</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
    {accents.map((color, index) => <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`${names[index]} accent`}
      accessibilityState={{ checked: value === color }} onPress={() => onChange(color)}
      style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color, borderColor: value === color ? '#3b82f6' : 'transparent', borderWidth: 3, alignItems: 'center', justifyContent: 'center' }}>
      {value === color && <Check size={20} color="#172236" />}
    </Pressable>)}
  </View></View>;
}
