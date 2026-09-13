import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ArrowUpRight, FileText, History, Plus } from 'lucide-react-native';
import type { Invoice, InvoiceData } from '../src/models/Invoice';
import { useWorkspace } from '../src/state/WorkspaceProvider';
import { useApp } from '../src/state/AppProvider';
import { useToast } from '../src/state/ToastProvider';
import { formatCurrency } from '../src/utils/currency';
import { formatDate } from '../src/utils/dates';
import { Input } from '../src/components/common/FormInput';
import { Button } from '../src/components/common/Button';
import { colors, fonts, shared } from '../src/theme';

export default function HistoryScreen() {
  const { invoices: invoiceRepository, cloud } = useWorkspace();
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const { openInvoice, newInvoice, drafts } = useApp();
  const [busy, setBusy] = useState(false);
  const notify = useToast();
  const router = useRouter();
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => { setRevision(value => value + 1); }, []));
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void invoiceRepository.search(query).then(results => { if (active) { setRecords(results); setFailed(false); } })
        .catch(() => { if (active) { setFailed(true); notify('Invoice history could not be loaded. Your saved data has been kept.', 'error'); } })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [query, revision, notify, invoiceRepository]);

  const open = async (data?: InvoiceData) => {
    if (busy) return;
    setBusy(true);
    try { if (data) await openInvoice(data); else await newInvoice(); router.push('/'); }
    catch { notify('Your current draft could not be saved. Try again before switching invoices.', 'error'); }
    finally { setBusy(false); }
  };
  const paid = records.filter(record => record.isPaid).reduce((sum, record) => sum + record.total, 0);
  const due = records.filter(record => !record.isPaid).reduce((sum, record) => sum + record.total, 0);
  const currencies = new Set(records.map(record => record.data.currencySymbol));
  const currency = currencies.size <= 1 ? records[0]?.data.currencySymbol ?? '₹' : null;
  return <View style={shared.page}><FlatList data={records} keyExtractor={item => item.id}
    contentContainerStyle={[shared.content, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<View style={{ gap: 24 }}>
      <View style={[shared.between, width < 500 && { alignItems: 'flex-start', flexDirection: 'column' }]}><View style={{ gap: 7 }}><Text style={shared.title}>Every invoice, in one place.</Text><Text style={shared.subtitle}>{cloud ? 'Your workspace invoices and receipts, saved in the cloud.' : 'Your saved invoices and receipts, on this device.'}</Text></View><Button title="New invoice" variant="primary" busy={busy} onPress={() => { void open(); }} icon={<Plus size={17} color="white" />} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[[String(records.length), 'Saved documents'], [currency ? formatCurrency(paid, currency) : 'Multiple currencies', 'Marked paid'], [currency ? formatCurrency(due, currency) : 'Multiple currencies', 'Amount due']].map(([value, label]) => <View key={label} style={[shared.card, { flex: 1, minWidth: 145 }]}><Text style={shared.label}>{label}</Text><Text style={{ fontSize: 23, color: label === 'Marked paid' ? colors.green : colors.heading, fontFamily: fonts.heading }}>{value}</Text></View>)}
      </View>
      {drafts.length > 0 && <View style={{ gap: 12 }}><Text style={styles.sectionTitle}>Recent drafts</Text>{drafts.slice(0, 10).map(draft => <Pressable key={draft.id} accessibilityRole="button" accessibilityLabel={`Open draft ${draft.customerName || draft.invoiceNumber}`} disabled={busy} onPress={() => { void open(draft); }} style={styles.draft}><FileText size={18} color={colors.muted} /><View style={{ flex: 1 }}><Text style={shared.text}>{draft.customerName || 'Untitled customer'}</Text><Text style={[shared.subtitle, { fontSize: 11 }]}>{draft.invoiceNumber}</Text></View><Text style={styles.badge}>DRAFT</Text><ArrowUpRight size={17} color={colors.muted} /></Pressable>)}</View>}
      <Input label="Search invoice history" placeholder="Customer name, username or invoice number…" value={query} onChangeText={setQuery} autoCapitalize="none" />
      <View style={shared.between}><Text style={styles.sectionTitle}>Saved documents</Text>{loading && <ActivityIndicator size="small" color={colors.blue} />}</View>
    </View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.isPaid ? 'receipt' : 'invoice'} ${item.invoiceNumber}`} disabled={busy}
      onPress={() => { void open(item.data); }} style={({ pressed }) => [styles.record, pressed && { backgroundColor: '#20314c' }]}>
      <View style={styles.documentIcon}><FileText size={22} color="#93c5fd" /></View>
      <View style={{ flex: 1, gap: 5 }}><Text style={styles.customer}>{item.customerName}</Text><Text style={styles.recordMeta}>{item.invoiceNumber}</Text><Text style={styles.recordMeta}>{formatDate(item.date)}</Text></View>
      <View style={{ alignItems: 'flex-end', gap: 10, maxWidth: '38%' }}><Text style={styles.total}>{formatCurrency(item.total, item.data.currencySymbol)}</Text><Text style={[styles.badge, { color: item.isPaid ? '#86efac' : '#fcd34d', backgroundColor: item.isPaid ? '#183e33' : '#3d3421' }]}>{item.isPaid ? 'PAID RECEIPT' : 'INVOICE · DUE'}</Text></View>
      {width > 600 && <ArrowUpRight size={19} color={colors.muted} />}
    </Pressable>}
    ListEmptyComponent={!loading ? <View style={styles.empty}><History size={38} color={colors.muted} /><Text style={styles.sectionTitle}>{failed ? 'History could not be loaded' : query ? 'No matching invoices' : 'Your next chapter starts here.'}</Text><Text style={[shared.subtitle, { textAlign: 'center' }]}>{failed ? 'Try loading your saved documents again.' : query ? 'Try another customer name or invoice number.' : 'Save or export your first invoice to see it here.'}</Text>{failed && <Button title="Retry" onPress={() => setRevision(value => value + 1)} />}</View> : null}
  /></View>;
}
const styles = StyleSheet.create({
  sectionTitle: { color: colors.heading, fontSize: 18, fontFamily: fonts.heading },
  record: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  documentIcon: { width: 44, height: 48, borderRadius: 10, backgroundColor: '#223652', alignItems: 'center', justifyContent: 'center' },
  customer: { color: colors.heading, fontFamily: fonts.bold, fontSize: 13, lineHeight: 20 },
  recordMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
  total: { color: colors.heading, fontFamily: fonts.heading, fontSize: 19 },
  badge: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.5, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 5, color: '#bfdbfe', backgroundColor: '#1b3350' },
  empty: { padding: 35, gap: 18, alignItems: 'center' },
  draft: { backgroundColor: '#152035', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
