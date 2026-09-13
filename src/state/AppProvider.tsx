import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Invoice, InvoiceData } from '../models/Invoice';
import { defaultSettings, type BusinessSettings } from '../models/BusinessSettings';
import { draftSchema, invoiceSchema, settingsSchema } from '../schemas/invoiceSchema';
import { createDraft, toHistoryRecord } from '../services/InvoiceService';
import { useWorkspace } from './WorkspaceProvider';
import { useToast } from './ToastProvider';
import { useAuth } from './AuthProvider';
import { Button } from '../components/common/Button';
import { shared } from '../theme';

interface AppContextValue {
  form: UseFormReturn<InvoiceData>;
  ready: boolean;
  settings: BusinessSettings;
  draftStatus: 'saved' | 'saving' | 'error';
  drafts: InvoiceData[];
  saveSettings: (settings: BusinessSettings) => Promise<void>;
  saveInvoice: (data: InvoiceData) => Promise<Invoice>;
  newInvoice: () => Promise<void>;
  openInvoice: (data: InvoiceData) => Promise<void>;
  setAccent: (color: string) => void;
}
const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider is missing.');
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { storage: storageService, invoices: invoiceRepository, cloud } = useWorkspace();
  const { signOut } = useAuth();
  const [restoreError, setRestoreError] = useState(false), [revision, setRevision] = useState(0);
  const notify = useToast();
  const [settings, setSettings] = useState(defaultSettings);
  const settingsRef = useRef(settings);
  const [ready, setReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [drafts, setDrafts] = useState<InvoiceData[]>([]);
  const draftsRef = useRef(drafts);
  const form = useForm<InvoiceData>({ defaultValues: createDraft(defaultSettings), resolver: zodResolver(invoiceSchema), mode: 'onBlur' });
  const { reset, getValues, subscribe } = form;

  useEffect(() => {
    let active = true;
    async function restore() {
      const [storedSettings, storedDraft, storedDrafts] = await Promise.allSettled([
        storageService.get('settings'), storageService.get('draft'), storageService.get('drafts'),
      ]);
      if (!active) return;
      if ([storedSettings, storedDraft, storedDrafts].some(result => result.status === 'rejected')) {
        setRestoreError(true); return;
      }
      setRestoreError(false);
      const business = storedSettings.status === 'fulfilled' && storedSettings.value ? settingsSchema.safeParse(storedSettings.value) : null;
      const saved = business?.success ? business.data : defaultSettings;
      settingsRef.current = saved;
      setSettings(saved);
      const draft = storedDraft.status === 'fulfilled' && storedDraft.value ? draftSchema.safeParse(storedDraft.value) : null;
      reset(draft?.success ? draft.data : createDraft(saved));
      if (storedDrafts.status === 'fulfilled' && Array.isArray(storedDrafts.value)) {
        const recent = storedDrafts.value.flatMap(value => { const result = draftSchema.safeParse(value); return result.success ? [result.data] : []; });
        draftsRef.current = recent;
        setDrafts(recent);
      }
      if ([storedSettings, storedDraft, storedDrafts].some(result => result.status === 'rejected') || (business && !business.success) || (draft && !draft.success)) {
        notify('Some saved data could not be restored. Check your details before exporting.', 'error');
      }
      setReady(true);
    }
    void restore();
    return () => { active = false; };
  }, [notify, reset, storageService, revision]);

  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    let reported = false;
    const persist = () => {
      clearTimeout(timer);
      // Incomplete numeric input is stored as zero; validation still prevents exporting it.
      const values = { ...getValues() };
      for (const key of ['price', 'discount', 'installationCharges'] as const) {
        if (typeof values[key] !== 'number' || !Number.isFinite(values[key])) values[key] = 0;
      }
      return storageService.set('draft', values).then(() => {
        if (active) setDraftStatus('saved');
        reported = false;
      }).catch(() => {
        if (active) setDraftStatus('error');
        if (!reported) notify(cloud ? 'Cloud draft could not be saved. Check your connection and retry.' : 'Draft could not be saved on this device. Free some storage and try again.', 'error');
        reported = true;
      });
    };
    const unsubscribe = subscribe({ formState: { values: true }, callback: () => {
      setDraftStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(() => { void persist(); }, 350);
    } });
    const appState = AppState.addEventListener('change', state => { if (state !== 'active') void persist(); });
    const flush = () => { void persist(); };
    if (Platform.OS === 'web') window.addEventListener('pagehide', flush);
    return () => { active = false; clearTimeout(timer); unsubscribe(); appState.remove(); if (Platform.OS === 'web') window.removeEventListener('pagehide', flush); };
  }, [ready, subscribe, getValues, notify, storageService, cloud]);

  const saveSettings = useCallback(async (next: BusinessSettings) => {
    const valid = settingsSchema.parse(next);
    await storageService.set('settings', valid);
    settingsRef.current = valid;
    setSettings(valid);
  }, [storageService]);

  const saveInvoice = useCallback(async (data: InvoiceData) => {
    const record = toHistoryRecord(invoiceSchema.parse(data));
    await invoiceRepository.save(record);
    return record;
  }, [invoiceRepository]);

  const openInvoice = useCallback(async (data: InvoiceData) => {
    const snapshot = { ...getValues() };
    for (const key of ['price', 'discount', 'installationCharges'] as const) {
      if (typeof snapshot[key] !== 'number' || !Number.isFinite(snapshot[key])) snapshot[key] = 0;
    }
    const current = draftSchema.safeParse(snapshot);
    if (!current.success) throw new Error('Check your current draft before switching invoices.');
    if (current.success && current.data.id !== data.id && (current.data.customerName || current.data.price)) {
      const recent = [current.data, ...draftsRef.current.filter(item => item.id !== current.data.id && item.id !== data.id)].slice(0, 10);
      await storageService.set('drafts', recent);
      draftsRef.current = recent;
      setDrafts(recent);
    }
    await storageService.set('draft', data);
    reset(data);
  }, [getValues, reset, storageService]);

  const newInvoice = useCallback(() => openInvoice(createDraft(settingsRef.current)), [openInvoice]);
  const setAccent = useCallback((color: string) => {
    form.setValue('accentColor', color, { shouldDirty: true });
    void saveSettings({ ...settingsRef.current, accentColor: color }).catch(() => notify('Accent could not be saved as a default.', 'error'));
  }, [form, notify, saveSettings]);

  if (restoreError) return <View style={[shared.content, { flex: 1, justifyContent: 'center' }]}><Text style={shared.title}>Your saved workspace could not be restored.</Text><Text style={shared.subtitle}>Check your connection or device storage. Existing records have been kept.</Text><Button title="Retry workspace" onPress={() => { setRestoreError(false); setRevision(n => n + 1); }} />{cloud && <Button title="Sign out" onPress={() => { void signOut().catch(() => {}); }} />}</View>;
  return <AppContext.Provider value={{ form, ready, settings, draftStatus, drafts, saveSettings, saveInvoice, newInvoice, openInvoice, setAccent }}>
    <FormProvider {...form}>{children}</FormProvider>
  </AppContext.Provider>;
}
