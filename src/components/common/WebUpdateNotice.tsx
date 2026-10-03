import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { shared } from '../../theme';

export function WebUpdateNotice() {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    const check = () => { if (active) setWaiting(!!registration?.waiting); };
    const installing = () => { registration?.installing?.addEventListener('statechange', check); check(); };
    const refresh = () => { void registration?.update().catch(() => {}); };
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(value => {
      if (!active) return;
      registration = value; value.addEventListener('updatefound', installing); installing();
    }).catch(() => console.info('Offline installation could not finish. Reconnect and reopen to retry.'));
    window.addEventListener('focus', refresh);
    return () => { active = false; registration?.removeEventListener('updatefound', installing); window.removeEventListener('focus', refresh); };
  }, []);
  if (!waiting) return null;
  return <View style={{ padding: 12, backgroundColor: '#1c3151' }}><Text accessibilityLiveRegion="polite" style={shared.text}>An update is ready. Finish your work, then close all GigaInvoice tabs and app windows and reopen. Your guest records will stay on this device.</Text></View>;
}
