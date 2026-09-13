import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../../state/AuthProvider';
import { useApp } from '../../state/AppProvider';
import { useWorkspace } from '../../state/WorkspaceProvider';
import { guestStorage, legacyStorage, preferencesStorage } from '../../services/container';
import { importLocalData, inspectLocalData, type LocalData } from '../../services/GuestMigrationService';
import { Button } from '../common/Button';
import { Toggle } from '../common/Toggle';
import { colors, shared } from '../../theme';

export function GuestImport({ legacy = false }: { legacy?: boolean }) {
  const { business, user } = useAuth();
  const { customers, invoices, scope } = useWorkspace();
  const { saveSettings, openInvoice } = useApp();
  const [data, setData] = useState<LocalData | null>(null), [hidden, setHidden] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [done, setDone] = useState('');
  const [addCustomers, setAddCustomers] = useState(false), [addSettings, setAddSettings] = useState(false), [addDraft, setAddDraft] = useState(false), [confirm, setConfirm] = useState(false);
  const protectedBusiness = !!business?.protected_key;
  const key = `import-choice:${scope}:${legacy ? 'legacy' : 'guest'}`;
  useEffect(() => {
    if (!user || (legacy && !protectedBusiness)) return;
    let active = true;
    void Promise.all([inspectLocalData(legacy ? legacyStorage : guestStorage), preferencesStorage.get<string>(key)]).then(([local, choice]) => { if (active) { setData(local); setHidden(choice === 'separate' || choice === 'imported'); } }).catch(() => { if (active) setError('Local records could not be read. They have been kept on this device.'); });
    return () => { active = false; };
  }, [user, protectedBusiness, legacy, key]);
  if (!user || (legacy && !protectedBusiness)) return null;
  const hasData = data && (data.customers.length || data.invoices.length || data.settings || data.draft);
  if (!hasData && !error) return null;
  if (hidden) return <Button title={legacy ? 'Review earlier device data' : 'Review guest import'} variant="ghost" onPress={() => setHidden(false)} />;
  const run = async () => {
    if (!data || busy) return;
    setBusy(true); setError(''); setDone('');
    try {
      const count = await importLocalData(data, { customers, invoices, saveSettings, openInvoice }, { customers: addCustomers, settings: addSettings, draft: addDraft, protectedBusiness, confirmMaster: confirm }, preferencesStorage, `${scope}:${legacy ? 'legacy' : 'guest'}`);
      await preferencesStorage.set(key, 'imported');
      setDone(`Import complete: ${count} records saved. Local copies remain on this device.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Import stopped. Retry safely; your local data remains intact.'); }
    finally { setBusy(false); }
  };
  return <View style={shared.card}>
    <Text style={shared.title}>{legacy ? 'Earlier device data' : 'Bring your guest work with you?'}</Text>
    <Text style={shared.subtitle}>{legacy ? 'Earlier app records are kept separately because they may contain shared business information. Only this approved workspace can import them.' : 'Choose what to copy into this account. Nothing is uploaded until you confirm.'}</Text>
    {data && <><Text style={shared.text}>{data.invoices.length} saved documents · {data.customers.length} local customers</Text>
      {!!data.customers.length && <Toggle label="Include local customers" value={addCustomers} onChange={setAddCustomers} />}
      {protectedBusiness && addCustomers && <Toggle label="I confirm adding these customers to the shared master list" value={confirm} onChange={setConfirm} />}
      {!!data.settings && <Toggle label="Replace workspace business defaults with local settings" value={addSettings} onChange={setAddSettings} />}
      {!!data.draft && <Toggle label="Open my local draft in this account" value={addDraft} onChange={setAddDraft} />}
      <Text style={shared.subtitle}>Saved documents are included. Existing invoice numbers cannot be overwritten by an import. Uncheck settings to keep current workspace defaults.</Text>
      <Button title="Import to My Account" variant="primary" busy={busy} disabled={protectedBusiness && addCustomers && !confirm} onPress={() => { void run(); }} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={[shared.text, { color: colors.rose }]}>{error}</Text>}
    {!!done && <Text accessibilityLiveRegion="polite" style={[shared.text, { color: colors.green }]}>{done}</Text>}
    <Button title="Keep Local Data Separate" disabled={busy} onPress={() => { void preferencesStorage.set(key, 'separate').then(() => setHidden(true)).catch(() => setError('Your choice could not be saved.')); }} />
    <Button title="Not Now" variant="ghost" disabled={busy} onPress={() => setHidden(true)} />
  </View>;
}
