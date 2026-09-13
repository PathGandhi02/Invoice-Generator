export function validateSupabaseConfig(rawUrl?: string, rawKey?: string) {
  const url = rawUrl?.trim();
  const key = rawKey?.trim();
  if (!url && !key) return null; // Explicit local-only configuration.
  let validUrl = false;
  try { const parsed = new URL(url ?? ''); validUrl = parsed.protocol === 'https:' && !!parsed.hostname && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && parsed.pathname === '/'; } catch { /* Report a safe configuration error below. */ }
  if (!validUrl || !key?.startsWith('sb_publishable_')) throw new Error('Invalid Supabase configuration. Set both EXPO_PUBLIC_SUPABASE_URL (HTTPS) and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (publishable key only).');
  return { url: url!, key };
}
