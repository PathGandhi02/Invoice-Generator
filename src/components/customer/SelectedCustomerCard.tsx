import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { InvoiceData } from '../../models/Invoice';
import { formatDate } from '../../utils/dates';
import { colors, fonts, shared } from '../../theme';
import { Button } from '../common/Button';
export function SelectedCustomerCard({ invoice, onChange }: { invoice: InvoiceData; onChange: () => void }) {
  return <View style={styles.card}>
    <View style={shared.row}><CheckCircle2 size={16} color={colors.green} /><Text style={styles.caption}>CUSTOMER SELECTED</Text></View>
    <Text style={styles.name}>{invoice.customerName}</Text>
    <Text style={styles.username}>@{invoice.customerUsername}</Text>
    {!!invoice.customerAddress && <Text style={styles.detail}>{invoice.customerAddress}</Text>}
    <View style={styles.metadata}>
      {[['Package', invoice.customerPackage || '—'], ['Last recharge', formatDate(invoice.customerLastRechargeDate)], ['Expiry', formatDate(invoice.customerExpiryDate)]].map(([label, value]) =>
        <View key={label} style={{ gap: 5, minWidth: 85 }}><Text style={styles.detail}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
    </View>
    <Button title="Change customer" variant="ghost" onPress={onChange} />
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#285448', backgroundColor: '#142e2e', gap: 9 },
  caption: { color: '#78ddbd', fontSize: 10, fontFamily: fonts.bold, letterSpacing: 1 },
  name: { color: colors.heading, fontSize: 14, lineHeight: 21, fontFamily: fonts.bold },
  username: { color: '#95b6d9', fontSize: 12, fontFamily: fonts.body },
  detail: { color: '#a6b9ba', fontSize: 11, lineHeight: 17, fontFamily: fonts.body },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: '#2b4947' },
  value: { color: colors.heading, fontSize: 11, fontFamily: fonts.medium },
});
