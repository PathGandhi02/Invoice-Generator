// Trusted Node tooling only. Never import from app/ or src/.
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

export class AdminSetupError extends Error {}
export function databaseConnection() {
  const value = process.env.SUPABASE_DB_URL;
  if (!value || value.includes('[YOUR-PASSWORD]')) throw new AdminSetupError('Set the complete SUPABASE_DB_URL in .env.admin; the password placeholder is not a credential.');
  let db: URL;
  let project: URL;
  try { db = new URL(value); project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''); }
  catch { throw new AdminSetupError('Invalid database/public project URL. Check local configuration.'); }
  const ref = project.hostname.split('.')[0];
  const direct = db.hostname === `db.${ref}.supabase.co` && decodeURIComponent(db.username) === 'postgres';
  const pooler = db.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(db.username) === `postgres.${ref}`;
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || !(direct || pooler) || !db.password || db.pathname !== '/postgres' || db.port !== '5432') {
    throw new AdminSetupError('Use the configured project\'s direct or session-pooler PostgreSQL URL on port 5432. Other projects and transaction-pooler connections are rejected.');
  }
  const ca = process.env.SUPABASE_DB_CA_FILE ? readFileSync(process.env.SUPABASE_DB_CA_FILE, 'utf8') : undefined;
  return postgres(value, { ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 1, prepare: false, connect_timeout: 15, idle_timeout: 10, onnotice: () => {} });
}
export function ownerId() {
  const owner = process.env.GIGAINVOICE_OWNER_USER_ID?.trim();
  if (!owner || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)) throw new AdminSetupError('Set GIGAINVOICE_OWNER_USER_ID to the intended Auth user UUID in .env.admin.');
  return owner;
}
export function reportAdminError(error: unknown) {
  // PostgreSQL errors can include entire rows, SQL and connection details.
  if (error instanceof AdminSetupError) console.error(error.message);
  else {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    console.error(`Database operation failed (${/^[A-Z0-9_]+$/i.test(code) ? code : 'unknown'}). No credentials or customer rows logged. Check connection, schema and the setup guide.`);
  }
  process.exitCode = 1;
}
