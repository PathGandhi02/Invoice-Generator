import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Users, Wifi, CalendarDays, CreditCard, Building2, Palette, CheckCircle2, FileText } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { AccordionCard } from '../common/AccordionCard';
import { Button } from '../common/Button';
import { FormInput } from '../common/FormInput';
import { FormRow } from '../common/FormRow';
import { Toggle } from '../common/Toggle';
import { AccentPicker } from '../common/AccentPicker';
import { ImageUpload } from '../common/ImageUpload';
import { CustomerSearch } from '../customer/CustomerSearch';
import { SelectedCustomerCard } from '../customer/SelectedCustomerCard';
import { autofillCustomer, clearCustomer } from '../../services/InvoiceService';
import { calculateInvoice } from '../../utils/invoiceCalculations';
import { formatCurrency } from '../../utils/currency';
import { colors, fonts, shared } from '../../theme';
import type { InvoiceData } from '../../models/Invoice';
import { useWorkspace } from '../../state/WorkspaceProvider';
import { useToast } from '../../state/ToastProvider';

export function InvoiceEditor() {
  const { customers, cloud } = useWorkspace();
  const notify = useToast();
  const [savingCustomer, setSavingCustomer] = useState(false);
  const { form, setAccent } = useApp();
  const { control, setValue, reset, getValues, formState: { errors } } = form;
  const data = useWatch({ control }) as InvoiceData;
  const [section, setSection] = useState('customer');
  const [manual, setManual] = useState(!!data.customerName && !data.customerUsername);
  const totals = calculateInvoice(data);
  const money = (value: number) => formatCurrency(value, data.currencySymbol);
  const toggle = (name: string) => () => setSection(current => current === name ? '' : name);
  const field = (name: keyof typeof data, label: string, extra: Partial<Parameters<typeof FormInput<typeof data>>[0]> = {}) =>
    <FormInput key={name} control={control} name={name} label={label} {...extra} />;

  return <View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Button title="Invoice" icon={<FileText size={17} color={data.isPaid ? colors.muted : 'white'} />} variant={!data.isPaid ? 'primary' : 'secondary'}
        style={{ flex: 1 }} onPress={() => setValue('isPaid', false, { shouldDirty: true })} />
      <Button title="Paid receipt" icon={<CheckCircle2 size={17} color={data.isPaid ? 'white' : colors.green} />} variant={data.isPaid ? 'primary' : 'secondary'}
        style={{ flex: 1 }} onPress={() => setValue('isPaid', true, { shouldDirty: true })} />
    </View>
    <Text style={[shared.subtitle, { fontSize: 11, marginBottom: 4 }]}>{data.isPaid ? 'Payment received. Your document will be a paid receipt.' : 'Create an invoice for an upcoming payment.'}</Text>

    <AccordionCard title="Customer" subtitle={data.customerName || 'Search your customer directory'} icon={<Users size={19} color="#60a5fa" />} open={section === 'customer'} onToggle={toggle('customer')}>
      {data.customerUsername ? <SelectedCustomerCard invoice={data} onChange={() => { reset(clearCustomer(getValues())); setManual(false); }} />
        : !manual && !data.customerName ? <CustomerSearch onSelect={customer => { reset(autofillCustomer(getValues(), customer)); setManual(false); }} onManual={() => setManual(true)} />
          : <Button title="Search customer directory" variant="ghost" onPress={() => { reset(clearCustomer(getValues())); setManual(false); }} />}
      {(!!data.customerUsername || manual || !!data.customerName) && <>
        <Text style={[shared.subtitle, { fontSize: 11 }]}>These details apply to this invoice.</Text>
        {field('customerName', 'Customer name', { autoCapitalize: 'words' })}
        {field('customerPhone', 'Customer phone', { keyboardType: 'phone-pad' })}
        {field('customerEmail', 'Customer email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
        {field('customerAddress', 'Customer address', { multiline: true })}
        {!data.customerUsername && <Button title={cloud ? 'Save customer to workspace' : 'Save customer on this device'} busy={savingCustomer} onPress={() => {
          setSavingCustomer(true);
          void customers.save({ username: `manual_${data.id}`, full_name: data.customerName, phone: data.customerPhone, email: data.customerEmail, address: data.customerAddress, package: data.planName, expiry_date: null, last_recharge_date: null })
            .then(() => notify('Customer saved. You can find them in customer search.'))
            .catch(() => notify('Customer could not be saved. Check their name, email and your connection or storage.', 'error'))
            .finally(() => setSavingCustomer(false));
        }} />}
      </>}
      {errors.customerName && !manual && !data.customerName && <Text style={{ color: colors.rose, fontSize: 12 }}>Select a customer or enter their details manually.</Text>}
    </AccordionCard>

    <AccordionCard title="Plan & pricing" subtitle={`${data.planName || 'Internet plan'} · ${money(totals.total)}`} icon={<Wifi size={19} color={colors.purple} />} open={section === 'plan'} onToggle={toggle('plan')}>
      {field('planName', 'Plan name')}
      {field('planSubtext', 'Plan description', { multiline: true, placeholder: 'Optional details about this plan' })}
      {field('timePeriod', 'Time period', { placeholder: 'e.g. 12 months' })}
      <FormRow>{field('price', 'Plan price', { numeric: true })}{field('discount', 'Discount (%)', { numeric: true })}</FormRow>
      {field('installationCharges', 'Installation charges', { numeric: true })}
      <View style={{ gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
        {[['Subtotal', money(totals.subtotal)], ['Installation', money(totals.installationFee)], ['Discount', `−${money(totals.discountAmount)}`]].map(([label, value]) =>
          <View key={label} style={shared.between}><Text style={shared.subtitle}>{label}</Text><Text style={shared.text}>{value}</Text></View>)}
        <View style={shared.between}><Text style={[shared.text, { color: colors.heading, fontFamily: fonts.bold }]}>Final total</Text><Text style={{ color: '#93c5fd', fontSize: 22, fontFamily: fonts.heading }}>{money(totals.total)}</Text></View>
      </View>
    </AccordionCard>

    <AccordionCard title={data.isPaid ? 'Receipt details' : 'Invoice details'} subtitle={data.invoiceNumber} icon={<CalendarDays size={19} color={colors.amber} />} open={section === 'details'} onToggle={toggle('details')}>
      {field('invoiceNumber', data.isPaid ? 'Receipt number' : 'Invoice number', { autoCapitalize: 'none' })}
      {field('startDate', 'Start date', { placeholder: 'YYYY-MM-DD', hint: 'YYYY-MM-DD', maxLength: 10, keyboardType: 'numbers-and-punctuation' })}
      {field('dueDate', data.isPaid ? 'Payment date' : 'Payment due date', { placeholder: 'YYYY-MM-DD', hint: 'YYYY-MM-DD', maxLength: 10, keyboardType: 'numbers-and-punctuation' })}
      {field('currencySymbol', 'Currency symbol', { maxLength: 8 })}
    </AccordionCard>

    <AccordionCard title="Payment & QR" subtitle={data.showQr ? data.qrType === 'upi' ? 'Automatic UPI payment QR' : 'Custom payment QR' : 'Payment QR hidden'} icon={<CreditCard size={19} color={colors.green} />} open={section === 'payment'} onToggle={toggle('payment')}>
      <Controller control={control} name="showQr" render={({ field }) => <Toggle label="Show QR code" value={field.value} onChange={field.onChange} />} />
      {data.showQr && <>
        <FormRow><Button title="UPI QR" variant={data.qrType === 'upi' ? 'primary' : 'secondary'} onPress={() => setValue('qrType', 'upi', { shouldDirty: true })} />
          <Button title="Custom QR" variant={data.qrType === 'custom' ? 'primary' : 'secondary'} onPress={() => setValue('qrType', 'custom', { shouldDirty: true })} /></FormRow>
        {data.qrType === 'upi' ? field('upiId', 'UPI ID', { autoCapitalize: 'none', autoCorrect: false })
          : <ImageUpload label="QR image" value={data.customQr} error={errors.customQr?.message} onChange={value => setValue('customQr', value, { shouldDirty: true, shouldValidate: true })} />}
      </>}
      {field('paymentMethod', 'Payment method', { placeholder: 'UPI, cash, bank transfer…' })}
    </AccordionCard>

    <AccordionCard title="Business branding" subtitle="Override business details for this invoice" icon={<Building2 size={19} color="#94a3b8" />} open={section === 'branding'} onToggle={toggle('branding')}>
      {field('companyName', 'Business name')}
      <ImageUpload label="Business logo" value={data.customLogo} onChange={value => setValue('customLogo', value, { shouldDirty: true })} />
      {field('address1', 'Office address line 1')}{field('address2', 'Office address line 2')}{field('address3', 'Office address line 3')}
      <FormRow>{field('country', 'Country code')}{field('phone', 'Business phone', { keyboardType: 'phone-pad' })}</FormRow>
      {field('email', 'Business email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
    </AccordionCard>

    <AccordionCard title="Invoice styling" subtitle="A little color, your way" icon={<Palette size={19} color={colors.rose} />} open={section === 'styling'} onToggle={toggle('styling')}>
      <AccentPicker value={data.accentColor} onChange={setAccent} />
    </AccordionCard>
    {Object.keys(errors).length > 0 && <View style={{ backgroundColor: '#3a1e2c', padding: 14, borderRadius: 10, gap: 8 }}>
      <Text accessibilityLiveRegion="polite" style={{ color: '#fecdd3', fontSize: 12, fontFamily: fonts.medium }}>Check these details before saving or exporting:</Text>
      {Object.entries(errors).map(([key, error]) => <Text key={key} style={{ color: '#fecdd3', fontSize: 12 }}>{key.replace(/([A-Z])/g, ' $1')}: {error?.message}</Text>)}
    </View>}
  </View>;
}
