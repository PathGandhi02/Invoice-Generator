import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
export function FormRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 12 }}>{Children.map(children, child => <View style={{ flex: 1, minWidth: 0 }}>{child}</View>)}</View>;
}
