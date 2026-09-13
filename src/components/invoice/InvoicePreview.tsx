import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { InvoiceData } from '../../models/Invoice';
import { formatDate } from '../../utils/dates';
import { calculateInvoice } from '../../utils/invoiceCalculations';
import { formatCurrency } from '../../utils/currency';
import { fonts } from '../../theme';
import { PaymentQr } from './PaymentQr';
import { PaidStamp } from './PaidStamp';

export function InvoicePreview({ invoice, fullSize = false }: { invoice: InvoiceData; fullSize?: boolean }) {
  const [available, setAvailable] = useState(820);
  const [paperHeight, setPaperHeight] = useState(1060);
  const [logoError, setLogoError] = useState(false);
  const [lastLogo, setLastLogo] = useState(invoice.customLogo);
  if (lastLogo !== invoice.customLogo) { setLastLogo(invoice.customLogo); setLogoError(false); }
  const scale = fullSize ? 1 : Math.min(1, Math.max(0.3, available / 820));
  const totals = calculateInvoice(invoice);
  const money = (value: number) => formatCurrency(value, invoice.currencySymbol);
  const accent = invoice.accentColor;

  return <View onLayout={event => setAvailable(event.nativeEvent.layout.width)} style={{ width: '100%', alignItems: 'center' }}>
    <ScrollView horizontal={fullSize} scrollEnabled={fullSize} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} style={{ width: '100%' }}>
      <View style={{ width: 820 * scale, height: paperHeight * scale, overflow: 'hidden', backgroundColor: 'white' }}>
        <View testID="invoice-paper" onLayout={event => setPaperHeight(event.nativeEvent.layout.height)}
          style={[styles.paper, { transform: [{ scale }], transformOrigin: 'top left' }]}>
          {invoice.isPaid && <PaidStamp date={invoice.dueDate} />}
          <View style={styles.header}>
            {invoice.customLogo && !logoError && <Image accessibilityLabel="Business logo" source={{ uri: invoice.customLogo }}
              onError={() => setLogoError(true)} resizeMode="contain" style={styles.logo} />}
            <View style={styles.business}>
              <Text style={styles.title}>{invoice.isPaid ? 'Receipt' : 'Invoice'}</Text>
              {!!invoice.companyName && <Text style={styles.company}>{invoice.companyName}</Text>}
              {[invoice.address1, invoice.address2, invoice.address3, invoice.country, invoice.phone, invoice.email].filter(Boolean).map((line, index) => <Text key={index} style={styles.contact}>{line}</Text>)}
            </View>
          </View>
          <View style={[styles.banner, { backgroundColor: accent }]}>
            <View style={{ flex: 1, gap: 7, paddingRight: 26 }}>
              <Text style={styles.label}>BILL TO</Text>
              <Text style={styles.customer}>{invoice.customerName || 'Customer name'}</Text>
              {!!invoice.customerUsername && <Text style={styles.detail}>@{invoice.customerUsername}</Text>}
              {invoice.customerPhone.trim() !== '+91' && !!invoice.customerPhone && <Text style={styles.detail}>{invoice.customerPhone}</Text>}
              {!!invoice.customerAddress && <Text style={styles.detail}>{invoice.customerAddress}</Text>}
              {!!invoice.customerEmail && <Text style={styles.detail}>{invoice.customerEmail}</Text>}
            </View>
            <View style={{ width: 235, gap: 13 }}>
              {[[invoice.isPaid ? 'Receipt #' : 'Invoice #', invoice.invoiceNumber], ['Start date', formatDate(invoice.startDate)], [invoice.isPaid ? 'Payment date' : 'Payment due date', formatDate(invoice.dueDate)]].map(([label, value]) =>
                <View key={label} style={{ gap: 5 }}><Text style={styles.label}>{label}</Text><Text style={styles.metaValue}>{value}</Text></View>)}
            </View>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.label, { flex: 1 }]}>PLAN NAME</Text><Text style={[styles.label, { width: 140, textAlign: 'center' }]}>TIME PERIOD</Text><Text style={[styles.label, { width: 145, textAlign: 'right' }]}>AMOUNT</Text>
            </View>
            <View style={styles.tableRow}>
              <View style={{ flex: 1, gap: 9, paddingRight: 20 }}><Text style={styles.plan}>{invoice.planName}</Text>{!!invoice.planSubtext && <Text style={styles.detail}>{invoice.planSubtext}</Text>}</View>
              <Text style={[styles.detail, { width: 140, textAlign: 'center' }]}>{invoice.timePeriod}</Text>
              <Text style={[styles.plan, { width: 145, textAlign: 'right' }]}>{money(totals.subtotal)}</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <View style={{ flex: 1, gap: 18 }}><PaymentQr invoice={invoice} />
              {!!invoice.paymentMethod && <View style={{ gap: 5 }}><Text style={styles.label}>PAYMENT METHOD</Text><Text style={styles.detail}>{invoice.paymentMethod}</Text></View>}
            </View>
            <View style={{ width: 300, gap: 17 }}>
              {[['Subtotal', money(totals.subtotal)], ['Installation charges', money(totals.installationFee)], [`Discount (${totals.discountPercent}%)`, `−${money(totals.discountAmount)}`], ['Total', money(totals.total)]].map(([label, value]) =>
                <View key={label} style={styles.totalRow}><Text style={styles.detail}>{label}</Text><Text style={styles.totalValue}>{value}</Text></View>)}
              <View style={[styles.highlight, { backgroundColor: accent }]}><Text style={styles.label}>{invoice.isPaid ? 'AMOUNT PAID' : 'AMOUNT DUE'}</Text><Text style={styles.amount}>{money(totals.total)}</Text></View>
            </View>
          </View>
          <View style={{ flex: 1, minHeight: 75 }} />
          <View style={styles.note}><Text style={styles.thankyou}>{invoice.companyName ? `Thank you for choosing ${invoice.companyName}.` : 'Thank you for your business.'}</Text><Text style={styles.noteText}>Note: This is a computer generated invoice and does not require a signature.</Text></View>
        </View>
      </View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  paper: { width: 820, minHeight: 1060, backgroundColor: 'white', padding: 52, position: 'relative' },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 40, marginBottom: 36 },
  logo: { width: 205, height: 125, marginTop: 18 },
  business: { flex: 1, alignItems: 'flex-end', gap: 4 },
  title: { fontSize: 47, lineHeight: 58, fontFamily: fonts.heading, color: '#172236', marginBottom: 13 },
  company: { fontSize: 17, fontFamily: fonts.bold, color: '#1a1a1a', textAlign: 'right', marginBottom: 6 },
  contact: { fontSize: 11, lineHeight: 17, fontFamily: fonts.body, color: '#555555', textAlign: 'right' },
  banner: { padding: 25, flexDirection: 'row', borderRadius: 4, marginBottom: 34 },
  label: { fontSize: 10, lineHeight: 16, letterSpacing: 0.7, fontFamily: fonts.bold, color: '#475569' },
  customer: { fontSize: 17, lineHeight: 24, fontFamily: fonts.bold, color: '#1a1a1a' },
  detail: { fontSize: 12, lineHeight: 19, fontFamily: fonts.body, color: '#555555' },
  metaValue: { fontSize: 12, lineHeight: 18, fontFamily: fonts.bold, color: '#1a1a1a' },
  table: { marginBottom: 28 },
  tableHead: { flexDirection: 'row', paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: '#263448' },
  tableRow: { flexDirection: 'row', paddingVertical: 25, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  plan: { fontSize: 14, lineHeight: 20, fontFamily: fonts.bold, color: '#1a1a1a' },
  footer: { flexDirection: 'row', gap: 30, marginTop: 5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  totalValue: { fontFamily: fonts.medium, fontSize: 12, color: '#1a1a1a' },
  highlight: { padding: 20, borderRadius: 4, gap: 8, marginTop: 5 },
  amount: { fontSize: 30, fontFamily: fonts.heading, color: '#172236' },
  note: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 18, gap: 9 },
  thankyou: { fontFamily: fonts.medium, fontSize: 11, color: '#475569' },
  noteText: { fontFamily: fonts.body, fontSize: 10, color: '#64748b', lineHeight: 17 },
});
