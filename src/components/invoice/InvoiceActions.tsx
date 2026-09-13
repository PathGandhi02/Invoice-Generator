import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Download, Printer, Save, Share2 } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { useToast } from '../../state/ToastProvider';
import { pdfService } from '../../services/PdfService';
import { Button } from '../common/Button';
import type { InvoiceData } from '../../models/Invoice';
import { colors } from '../../theme';

export function InvoiceActions({ onInvalid, compact = false }: { onInvalid: () => void; compact?: boolean }) {
  const { form, saveInvoice } = useApp();
  const notify = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const inFlight = useRef(false);
  const act = (action: 'save' | 'generate' | 'share' | 'print') => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(action);
    void form.handleSubmit(async (invoice: InvoiceData) => {
      try {
        if (action !== 'save') await pdfService[action](invoice);
        try { await saveInvoice(invoice); }
        catch (error) { notify(error instanceof Error ? error.message : action === 'save' ? 'Invoice could not be saved. Check connection or storage.' : 'Output prepared, but history could not be saved.', 'error'); return; }
        notify(action === 'save' ? 'Invoice saved' : action === 'print' ? 'Print dialog opened' : action === 'share' ? Platform.OS === 'web' ? 'PDF ready to share or download' : 'PDF ready to share.' : Platform.OS === 'web' ? 'PDF downloaded' : 'PDF created successfully. Saved on this device.');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        notify(error instanceof Error && /Sharing is unavailable|image|Printing is unavailable|PDF/.test(error.message) ? error.message : 'Unable to generate PDF. Please try again.', 'error');
      }
    }, () => { onInvalid(); notify('Check the highlighted invoice details before continuing.', 'error'); })()
      .catch(() => notify('Unable to prepare this invoice. Please try again.', 'error'))
      .finally(() => { inFlight.current = false; setBusy(null); });
  };
  return <View style={{ gap: 9 }}>
    <View style={{ flexDirection: 'row', gap: 9 }}>
      <Button title={busy === 'generate' ? 'Generating PDF…' : Platform.OS === 'web' ? 'Export PDF' : 'Generate PDF'} variant="primary" style={{ flex: 1 }} icon={<Download size={17} color="white" />} busy={busy === 'generate'} disabled={!!busy} onPress={() => act('generate')} />
      <Button title={busy === 'share' ? 'Preparing PDF…' : 'Share'} icon={<Share2 size={17} color={colors.text} />} busy={busy === 'share'} disabled={!!busy} onPress={() => act('share')} />
    </View>
    <View style={{ flexDirection: 'row', gap: 9 }}>
      <Button title={compact ? 'Save' : 'Save invoice'} style={{ flex: 1 }} icon={<Save size={16} color={colors.text} />} busy={busy === 'save'} disabled={!!busy} onPress={() => act('save')} />
      <Button title="Print" style={{ flex: 1 }} icon={<Printer size={16} color={colors.text} />} busy={busy === 'print'} disabled={!!busy} onPress={() => act('print')} />
    </View>
  </View>;
}
