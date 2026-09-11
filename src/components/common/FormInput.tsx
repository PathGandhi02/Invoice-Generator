import { useState, type Ref } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts } from '../../theme';

export function Input({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string; ref?: Ref<TextInput> }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.wrapper}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label}
      placeholderTextColor="#798da8" selectionColor={colors.blue}
      onFocus={event => { setFocused(true); props.onFocus?.(event); }}
      onBlur={event => { setFocused(false); props.onBlur?.(event); }}
      style={[styles.input, props.multiline && styles.multiline, focused && { borderColor: colors.blue }, error && { borderColor: colors.rose }, props.style]} />
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
}

export function FormInput<T extends FieldValues>({ control, name, label, numeric, ...props }: {
  control: Control<T>; name: Path<T>; label: string; numeric?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText'> & { hint?: string }) {
  return <Controller control={control} name={name} render={({ field, fieldState }) =>
    numeric ? <NumericInput {...props} label={label} error={fieldState.error?.message} value={field.value} onChangeValue={field.onChange} onBlur={field.onBlur} /> :
    <Input {...props} label={label} error={fieldState.error?.message}
      value={field.value === undefined || field.value === null ? '' : String(field.value)}
      onBlur={field.onBlur} ref={field.ref} onChangeText={field.onChange} />
  } />;
}

function NumericInput({ value, onChangeValue, ...props }: Omit<Parameters<typeof Input>[0], 'value' | 'onChangeText'> & { value: number | string; onChangeValue: (value: number | string) => void }) {
  const [display, setDisplay] = useState(String(value));
  const [previous, setPrevious] = useState(value);
  if (previous !== value) {
    setPrevious(value);
    if (!(typeof value === 'number' && display.trim() !== '' && Number(display) === value)) setDisplay(String(value));
  }
  return <Input {...props} value={display} keyboardType="decimal-pad" onChangeText={text => {
    setDisplay(text);
    const number = Number(text);
    onChangeValue(text.trim() !== '' && Number.isFinite(number) ? number : text);
  }} />;
}
const styles = StyleSheet.create({
  wrapper: { gap: 7, minWidth: 0 },
  label: { color: colors.text, fontSize: 12, fontFamily: fonts.medium },
  input: { backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 9, minHeight: 46, paddingHorizontal: 13, paddingVertical: 12, color: colors.heading, fontSize: 14, fontFamily: fonts.body },
  multiline: { minHeight: 82, textAlignVertical: 'top' },
  error: { color: colors.rose, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
});
