import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { guestData } from '../services/container';
import { GUEST_CONTROL, type GuestState } from '../services/GuestDataService';

function useGuestState() {
  const [state, setState] = useState<GuestState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const serial = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++serial.current;
    try {
      const next = await guestData.current();
      if (version === serial.current) { setState(current => current?.generation === next.generation && current.resetting === next.resetting ? current : next); setError(''); }
    } catch { if (version === serial.current) setError('Guest data could not be opened. You can retry or clear local guest data.'); }
  }, []);
  useEffect(() => {
    let active = true;
    const update = () => { if (active) void refresh(); };
    update();
    const unsubscribe = guestData.subscribe(update);
    const appState = AppState.addEventListener('change', status => { if (status === 'active') update(); });
    const onStorage = (event: StorageEvent) => { if (event.key === GUEST_CONTROL) update(); };
    if (Platform.OS === 'web') { window.addEventListener('storage', onStorage); window.addEventListener('focus', update); window.addEventListener('pageshow', update); }
    return () => { active = false; unsubscribe(); appState.remove(); if (Platform.OS === 'web') { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', update); window.removeEventListener('pageshow', update); } };
  }, [refresh]);
  const clear = useCallback(async () => {
    setBusy(true); setError('');
    try { await guestData.clear(); await refresh(); }
    catch { await refresh(); setError('Guest data was not completely cleared. Retry clearing to finish.'); }
    finally { setBusy(false); }
  }, [refresh]);
  const generation = state?.generation;
  const storage = useMemo(() => generation ? guestData.open({ generation, resetting: false }) : null, [generation]);
  return { state, storage, error, busy, clear, refresh };
}
const Context = createContext<ReturnType<typeof useGuestState> | null>(null);
export function GuestDataProvider({ children }: { children: ReactNode }) { return <Context.Provider value={useGuestState()}>{children}</Context.Provider>; }
export function useGuestData() { const value = useContext(Context); if (!value) throw new Error('GuestDataProvider missing'); return value; }
