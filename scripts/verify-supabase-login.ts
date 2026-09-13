// Optional trusted acceptance check using the normal public Auth/API client.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/models/Database';
import { validateSupabaseConfig } from '../src/lib/supabaseConfig';
import { SupabaseCustomerRepository } from '../src/repositories/SupabaseCustomerRepository';
import { ownerId, AdminSetupError, reportAdminError } from './admin/database';

async function main() {
  const config=validateSupabaseConfig(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const email=process.env.GIGAINVOICE_OWNER_EMAIL;
  const password=process.env.GIGAINVOICE_OWNER_PASSWORD;
  if (!config || !email || !password) throw new AdminSetupError('Set the owner login email/password locally in .env.admin to run this optional live Auth check.');
  const client=createClient<Database>(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if (error) throw new AdminSetupError('Owner login failed. Check the local account credentials and confirmed email.');
  try {
    if (data.user.id!==ownerId()) throw new AdminSetupError('Login account does not match the configured owner UUID.');
    const repository=new SupabaseCustomerRepository(client);
    const count=await repository.count();
    const matches=await repository.search('mit');
    if (!matches.length) throw new AdminSetupError('Signed-in mit search returned no customers.');
    const selected=matches.find(c=>c.username==='mit_patell') ?? matches[0]!;
    const exact=await repository.getByUsername(selected.username);
    const byId=selected.id ? await repository.getById(selected.id) : null;
    if (exact?.id!==selected.id || byId?.id!==selected.id) throw new AdminSetupError('Exact username/id lookup does not match autocomplete.');
    console.info(`Real Auth/API verified: owner matched; ${count} customers; mit matches: ${matches.length}; exact username and id lookup passed; timestamp retained: ${exact?.expiry_date===selected.expiry_date}.`);
  } finally { await client.auth.signOut({scope:'local'}); }
}
main().catch(reportAdminError);
