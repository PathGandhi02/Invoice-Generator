import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Building2, CreditCard, Save, Wifi } from 'lucide-react-native';
import { useApp } from '../src/state/AppProvider';
import { useToast } from '../src/state/ToastProvider';
import type { BusinessSettings } from '../src/models/BusinessSettings';
import { settingsSchema } from '../src/schemas/invoiceSchema';
import { FormInput } from '../src/components/common/FormInput';
import { FormRow } from '../src/components/common/FormRow';
import { ImageUpload } from '../src/components/common/ImageUpload';
import { AccentPicker } from '../src/components/common/AccentPicker';
import { Button } from '../src/components/common/Button';
import { useWorkspace } from '../src/state/WorkspaceProvider';
import { useRouter } from 'expo-router';
import { colors, fonts, shared } from '../src/theme';
import { ClearGuestData } from '../src/components/account/ClearGuestData';

export default function SettingsScreen() {
  const { settings, saveSettings } = useApp();
  const { cloud } = useWorkspace();
  const router = useRouter();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const form = useForm<BusinessSettings>({ defaultValues: settings, resolver: zodResolver(settingsSchema), mode: 'onBlur' });
  const values = useWatch({ control: form.control });
  const field = (name: keyof BusinessSettings, label: string, extra: Partial<Parameters<typeof FormInput<BusinessSettings>>[0]> = {}) => <FormInput key={name} control={form.control} name={name} label={label} {...extra} />;
  const save = form.handleSubmit(async data => {
    setBusy(true);
    try { await saveSettings(data); form.reset(data); notify('Settings saved. New invoices will use these defaults.'); }
    catch { notify('Settings could not be saved. Check your connection or device storage and try again.', 'error'); }
    finally { setBusy(false); }
  }, () => notify('Check the highlighted settings.', 'error'));
  return <KeyboardAvoidingView style={shared.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[shared.content, { maxWidth: 780 }]}>
      <View style={{ gap: 8 }}><Text style={shared.title}>Your business, your defaults.</Text><Text style={shared.subtitle}>Set up once. Make every invoice feel like you.</Text></View>
      <View style={shared.card}>
        <View style={shared.row}><Building2 size={21} color="#60a5fa" /><Text style={{ color: colors.heading, fontFamily: fonts.heading, fontSize: 20 }}>Business details</Text></View>
        {field('companyName', 'Business name')}
        <ImageUpload label="Business logo" value={values.logo ?? null} onChange={value => form.setValue('logo', value, { shouldDirty: true })} />
        {field('address1', 'Office address line 1')}{field('address2', 'Office address line 2')}{field('address3', 'Office address line 3')}
        <FormRow>{field('country', 'Country code', { maxLength: 3 })}{field('phone', 'Business phone', { keyboardType: 'phone-pad' })}</FormRow>
        {field('email', 'Business email', { autoCapitalize: 'none', keyboardType: 'email-address' })}
      </View>
      <View style={shared.card}>
        <View style={shared.row}><Wifi size={21} color={colors.purple} /><Text style={{ color: colors.heading, fontFamily: fonts.heading, fontSize: 20 }}>Plan defaults</Text></View>
        {field('defaultPlanName', 'Default plan')}{field('defaultTimePeriod', 'Default time period')}
        {field('defaultInstallationCharges', 'Default installation charge', { numeric: true })}
      </View>
      <View style={shared.card}>
        <View style={shared.row}><CreditCard size={21} color={colors.green} /><Text style={{ color: colors.heading, fontFamily: fonts.heading, fontSize: 20 }}>Payment & appearance</Text></View>
        {field('upiId', 'Default UPI ID', { autoCapitalize: 'none', autoCorrect: false })}
        {field('currencySymbol', 'Default currency symbol', { maxLength: 8 })}
        <Controller control={form.control} name="accentColor" render={({ field }) => <AccentPicker value={field.value} onChange={field.onChange} />} />
      </View>
      <Text style={shared.subtitle}>{cloud ? 'Saved to your cloud workspace.' : 'Saved on this device.'} These defaults apply to new invoices. Your current invoice keeps its own details.</Text>
      <Button title="Save settings" variant="primary" busy={busy} icon={<Save size={18} color="white" />} onPress={() => { void save(); }} />
      <Button title="Account & profile" onPress={() => router.push('/profile')} />
      {!cloud && <ClearGuestData />}
    </ScrollView>
  </KeyboardAvoidingView>;
}
