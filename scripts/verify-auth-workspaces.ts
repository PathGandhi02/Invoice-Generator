import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { databaseConnection, ownerId, reportAdminError } from './admin/database';
import { loadCustomerImport } from './admin/customerImport';

async function main() {
 const sql = databaseConnection();
 try {
  const owner = ownerId();
  const business = await sql`select id from public.businesses where protected_key='maruti-giga-fiber'`;
  assert.equal(business.length,1); const bid = business[0]!.id;
  const source = await loadCustomerImport(owner);
  const comparison = await sql`select count(*)::integer as matching from public.customers c join jsonb_to_recordset(${sql.json(source.rows)}) as s(username text,full_name text)
    on c.username=s.username and c.full_name=s.full_name where c.business_id=${bid}::uuid`;
  assert.equal(comparison[0]!.matching,source.valid);
  const count = await sql`select count(*)::integer count from public.customers where business_id=${bid}::uuid`;
  console.info(`Preserved customers: ${count[0]!.count}; original username/name pairs verified: ${comparison[0]!.matching}.`);
  const approved = await sql`select a.email,exists(select 1 from auth.users u join public.business_members m on m.user_id=u.id
    where lower(u.email)=lower(a.email) and u.email_confirmed_at is not null and m.business_id=a.business_id and m.status='active') as linked
    from public.business_access_allowlist a where a.business_id=${bid}::uuid and a.is_active order by a.email`;
  assert.equal(approved.length,2); console.info('Approved identities:',JSON.stringify(approved));
  const schema = await sql`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('profiles','businesses','business_members','business_access_allowlist','customers','business_settings','invoices','invoice_items','workspace_user_state') and c.relkind='r'`;
  assert.equal(schema.length,9); assert.ok(schema.every(t=>t.relrowsecurity));
  const bucket = await sql`select public from storage.buckets where id='business-assets'`; assert.equal(bucket[0]?.public,false);
  // Transaction-only identities exercise the actual hosted Postgres policies.
  // No password, login, message or persistent Auth account is created.
  try {
   await sql.begin(async tx => {
    const testId='c966fdb9-ded5-45b6-8cc1-24df2d6af604';
    await tx`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(${testId}::uuid,'workspace-rls-check@example.invalid',now(),'{}')`;
    await tx`select set_config('request.jwt.claims',${JSON.stringify({sub:testId,role:'authenticated',email:'pathmgandhi@gmail.com'})},true)`;
    await tx`set local role authenticated`;
    const own = await tx`select * from public.ensure_workspace()`; assert.equal(own.length,1); assert.notEqual(own[0]!.id,bid);
    const hidden = await tx`select count(*)::integer count from public.customers where business_id=${bid}::uuid`; assert.equal(hidden[0]!.count,0);
    const access = await tx`select public.is_business_member(${bid}::uuid) as allowed`; assert.equal(access[0]!.allowed,false);
    await tx`reset role`;
    await tx`select set_config('request.jwt.claims',${JSON.stringify({sub:owner,role:'authenticated'})},true)`;
    await tx`set local role authenticated`;
    const allowed = await tx`select count(*)::integer count from public.customers where business_id=${bid}::uuid`; assert.equal(allowed[0]!.count,count[0]!.count);
    throw new Error('VERIFICATION_ROLLBACK');
   });
  } catch(e) { if (!(e instanceof Error) || e.message!=='VERIFICATION_ROLLBACK') throw e; }
  const client=createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!,process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  const anonymous=await client.from('customers').select('id').limit(1); assert.ok(anonymous.error); assert.equal(anonymous.data,null);
  console.info('PASS: nine RLS tables, private image bucket, anonymous REST denial, generic identity denial and approved owner access. Transaction test user rolled back.');
 } finally { await sql.end({timeout:5}); }
}
main().catch(reportAdminError);
