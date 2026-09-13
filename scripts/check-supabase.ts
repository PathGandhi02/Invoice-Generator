// Development/owner CLI only: never imported by the production application.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/models/Database';

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key?.startsWith('sb_publishable_')) throw new Error('Set the Supabase URL and publishable key in .env. Privileged keys are not accepted.');
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  console.info('Supabase client initialized. Checking customers SELECT with the public client role.');
  const { error, count } = await client.from('customers').select('username', { count: 'exact' }).limit(1).abortSignal(AbortSignal.timeout(10_000));
  if (error) {
    console.error(`Customer SELECT failed (${error.code || 'network'}).`);
    if (error.code === 'PGRST205') console.error('The customers table is missing. Follow docs/SUPABASE-DATABASE.md and apply both migrations.');
    else if (error.code === '42501') console.info('Anonymous SELECT is denied, as expected under the supplied RLS policies. Sign in as the authorized owner in the app to verify private search.');
    else console.error('Check the connection and database grants. No credentials or customer rows were logged.');
    process.exitCode = error.code === '42501' ? 0 : 1;
  } else {
    console.info(`SELECT succeeded; ${count ?? 0} rows visible to the public client role.`);
    if (count) console.info('Customer rows are anonymously readable. Review RLS before making this private directory available publicly.');
    else console.info('An empty result does not prove owner access; sign in and test a known username.');
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Connection test failed.'); process.exitCode = 1; });
