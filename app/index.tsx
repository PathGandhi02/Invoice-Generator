import { useState } from 'react';
import { useAuth } from '../src/state/AuthProvider';
import { useWorkspace } from '../src/state/WorkspaceProvider';
import { Welcome } from '../src/components/account/Welcome';
import { useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Check, Circle, Eye, PencilLine, Plus, ZoomIn, ZoomOut } from 'lucide-react-native';
import { useApp } from '../src/state/AppProvider';
import { useToast } from '../src/state/ToastProvider';
import { InvoiceEditor } from '../src/components/invoice/InvoiceEditor';
import { InvoicePreview } from '../src/components/invoice/InvoicePreview';
import { InvoiceActions } from '../src/components/invoice/InvoiceActions';
import { Button } from '../src/components/common/Button';
import { FadeIn } from '../src/components/common/FadeIn';
import { colors, fonts, shared } from '../src/theme';
import type { InvoiceData } from '../src/models/Invoice';

export default function InvoiceScreen() {
  const { width } = useWindowDimensions();
  const { user, guestChosen } = useAuth();
  const { cloud } = useWorkspace();
  const desktop = width >= 1100;
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [fullSize, setFullSize] = useState(false);
  const [creating, setCreating] = useState(false);
  const { form, draftStatus, newInvoice } = useApp();
  const data = useWatch({ control: form.control }) as InvoiceData;
  const notify = useToast();
  const create = async () => {
    setCreating(true);
    try { await newInvoice(); setTab('edit'); notify('New invoice ready. Your previous draft is in History.'); }
    catch { notify('The current draft could not be saved. Try again before starting a new invoice.', 'error'); }
    finally { setCreating(false); }
  };
  if (!user && !guestChosen) return <Welcome />;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!desktop && <View style={styles.tabs}>
      {(['edit', 'preview'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={item === 'edit' ? 'Edit details' : 'Preview invoice'} accessibilityState={{ selected: tab === item }}
        onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
        {item === 'edit' ? <PencilLine size={17} color={tab === item ? '#93c5fd' : colors.muted} /> : <Eye size={17} color={tab === item ? '#93c5fd' : colors.muted} />}
        <Text style={[styles.tabText, tab === item && { color: '#bfdbfe' }]}>{item === 'edit' ? 'Edit details' : 'Preview'}</Text>
      </Pressable>)}
    </View>}
    <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column' }}>
      {(desktop || tab === 'edit') && <ScrollView keyboardShouldPersistTaps="handled" style={[styles.editor, desktop && { width: 460, flexBasis: 460, flexGrow: 0, flexShrink: 0 }]} contentContainerStyle={styles.editorContent}>
        <View style={shared.between}><View style={{ gap: 5 }}><Text style={styles.editorTitle}>Let’s make it official.</Text><Text style={shared.subtitle}>A great connection. A clear invoice.</Text></View>
          <Button title="New" accessibilityLabel="New invoice" busy={creating} onPress={() => { void create(); }} icon={<Plus size={16} color={colors.text} />} /></View>
        <View style={styles.saveStatus}>{draftStatus === 'saved' ? <Check size={13} color={colors.green} /> : <Circle size={11} color={draftStatus === 'error' ? colors.rose : colors.amber} />}<Text style={styles.saveText}>{draftStatus === 'saved' ? cloud ? 'Draft saved to cloud' : 'Draft saved on this device' : draftStatus === 'saving' ? 'Saving your draft…' : 'Draft not saved · Check device storage'}</Text></View>
        <InvoiceEditor key={data.id} />
        <View style={{ marginTop: 5, gap: 12 }}>
          {!desktop && <Button title="Preview invoice" variant="primary" icon={<Eye size={18} color="white" />} onPress={() => setTab('preview')} />}
          <InvoiceActions onInvalid={() => setTab('edit')} />
        </View>
        <Text style={styles.bottomHint}>Made for your everyday business.</Text>
      </ScrollView>}
      {(desktop || tab === 'preview') && <View style={styles.preview}>
        <View style={styles.previewToolbar}><View style={shared.row}><View style={styles.liveDot} /><Text style={styles.previewLabel}>LIVE PREVIEW</Text></View>
          <View style={shared.row}><Text style={styles.paperLabel}>A4 · {data.isPaid ? 'Paid receipt' : 'Invoice'}</Text>
            {!desktop && <Button title={fullSize ? 'Fit' : 'Zoom'} variant="ghost" onPress={() => setFullSize(value => !value)} icon={fullSize ? <ZoomOut size={16} color={colors.muted} /> : <ZoomIn size={16} color={colors.muted} />} />}
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: desktop ? 32 : 12, paddingTop: desktop ? 12 : 4, paddingBottom: 30, alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 820, boxShadow: '0 14px 50px rgba(0,0,0,0.28)' }}><InvoicePreview invoice={data} fullSize={!desktop && fullSize} /></View>
          <Text style={[styles.bottomHint, { marginTop: 22 }]}>Your invoice, ready for a better connection.</Text>
        </ScrollView>
        {!desktop && <FadeIn style={styles.mobileActions}><InvoiceActions compact onInvalid={() => setTab('edit')} /></FadeIn>}
      </View>}
    </View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10, backgroundColor: colors.dashboard, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 9, gap: 8 },
  activeTab: { backgroundColor: '#1c3151' },
  tabText: { color: colors.muted, fontSize: 13, fontFamily: fonts.bold },
  editor: { backgroundColor: colors.dashboard, borderRightWidth: 1, borderRightColor: colors.border, flex: 1 },
  editorContent: { padding: 22, gap: 18, maxWidth: 650, width: '100%', alignSelf: 'center' },
  editorTitle: { color: colors.heading, fontFamily: fonts.heading, fontSize: 23 },
  saveStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -3 },
  saveText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  preview: { flex: 1, backgroundColor: '#111a2a' },
  previewToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, minHeight: 67, gap: 15 },
  liveDot: { width: 6, height: 6, backgroundColor: colors.green, borderRadius: 3 },
  previewLabel: { color: '#a2b2c8', fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.8 },
  paperLabel: { color: '#94a3b8', fontFamily: fonts.body, fontSize: 11 },
  bottomHint: { color: '#8d9db4', fontFamily: fonts.body, fontSize: 10, textAlign: 'center', lineHeight: 17 },
  mobileActions: { padding: 12, backgroundColor: '#111c2f', borderTopWidth: 1, borderTopColor: colors.border },
});
