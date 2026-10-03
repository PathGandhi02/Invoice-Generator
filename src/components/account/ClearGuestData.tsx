import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useGuestData } from '../../state/GuestDataProvider';
import { useAuth } from '../../state/AuthProvider';
import { Button } from '../common/Button';
import { colors, shared } from '../../theme';

export function ClearGuestData() {
  const { user } = useAuth();
  const { storage, state, clear, busy, error } = useGuestData();
  const [confirm, setConfirm] = useState(false);
  const [summary, setSummary] = useState('');
  useEffect(() => {
    if (!confirm || !storage || state?.resetting) return;
    let active = true;
    void Promise.all([storage.get<unknown>('customers'), storage.get<unknown>('history')]).then(([customers, history]) => {
      if ((customers !== null && !Array.isArray(customers)) || (history !== null && !Array.isArray(history))) throw new Error();
      if (active) setSummary(`${Array.isArray(customers) ? customers.length : 0} customers and ${Array.isArray(history) ? history.length : 0} saved documents.`);
    }).catch(() => { if (active) setSummary('Some stored data cannot be counted. You can still clear guest data.'); });
    return () => { active = false; };
  }, [confirm, storage, state?.resetting]);
  // Never offer this destructive action against a signed-in workspace.
  if (user) return null;
  return <View style={{ gap: 10 }}>
    <Button title={state?.resetting ? 'Retry clearing guest data' : 'Clear guest data on this device'} disabled={busy} onPress={() => { setSummary(''); setConfirm(true); }} />
    {!!error && <Text accessibilityRole="alert" style={[shared.text, { color: colors.rose }]}>{error}</Text>}
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirm(false); }}>
      <View style={{ flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 22 }}>
        <ScrollView contentContainerStyle={[shared.card, { width: '100%', maxWidth: 560, alignSelf: 'center' }]}>
          <Text accessibilityRole="header" style={shared.title}>Clear guest data?</Text>
          {!!summary && <Text style={shared.text}>{summary}</Text>}
          <Text style={shared.text}>This removes guest customers, saved invoices and receipts, current and recent drafts, business settings, logos and QR images from this browser or app. This cannot be undone.</Text>
          <Text style={shared.subtitle}>Export documents you need before continuing. Downloaded or shared PDFs remain. Cloud accounts and records, other devices and separately protected earlier records are not removed.</Text>
          <Button title="Cancel" disabled={busy} onPress={() => setConfirm(false)} />
          <Button title="Clear guest data" busy={busy} style={{ backgroundColor: '#7f1d1d', borderColor: '#ef4444' }} onPress={() => { if (!user) { setConfirm(false); void clear(); } }} />
        </ScrollView>
      </View>
    </Modal>
  </View>;
}
