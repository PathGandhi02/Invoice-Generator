import { databaseConnection, ownerId, AdminSetupError, reportAdminError } from './admin/database';

async function main() {
  const sql = databaseConnection();
  try {
    const tables = await sql`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('customers','business_settings','invoices','invoice_items') and c.relkind='r'`;
    if (tables.length !== 4 || tables.some(t => !t.relrowsecurity)) throw new AdminSetupError('Required tables or RLS are missing. Apply the production migration.');
    const indexes = await sql`select tablename,indexname from pg_indexes where schemaname='public' and tablename in ('customers','business_settings','invoices','invoice_items')`;
    const policies = await sql`select tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('customers','business_settings','invoices','invoice_items')`;
    const triggers = await sql`select event_object_table,trigger_name from information_schema.triggers where trigger_schema='public' and trigger_name='gigainvoice_set_updated_at'`;
    const constraints = await sql`select c.relname,p.conname,p.contype from pg_constraint p join pg_class c on c.oid=p.conrelid where p.connamespace='public'::regnamespace and c.relname in ('customers','business_settings','invoices','invoice_items')`;
    const extensions = await sql`select extname from pg_extension where extname in ('pgcrypto','pg_trgm')`;
    const requiredIndexes=['gigainvoice_customers_owner_username_key','gigainvoice_customers_owner_name_idx','gigainvoice_customers_name_trgm_idx','gigainvoice_customers_username_trgm_idx','gigainvoice_invoices_customer_idx','gigainvoice_invoices_owner_created_idx','gigainvoice_items_invoice_idx'];
    if (requiredIndexes.some(name=>!indexes.some(index=>index.indexname===name))) throw new AdminSetupError('Required database indexes are missing.');
    if (extensions.length !== 2 || triggers.length !== 3 || policies.filter(p => String(p.policyname).startsWith('gigainvoice_')).length !== 20) throw new AdminSetupError('Extensions, triggers or owner policies are incomplete.');
    console.info(JSON.stringify({ tables, indexes, policies, triggers, constraints, extensions }, null, 2));
    const privileges = await sql`select has_table_privilege('anon','public.customers','select') or has_table_privilege('anon','public.business_settings','select') or has_table_privilege('anon','public.invoices','select') or has_table_privilege('anon','public.invoice_items','select') as anon_read`;
    if (privileges[0]!.anon_read) throw new AdminSetupError('Anonymous table access remains granted. Inspect grants before importing private customers.');
    if (process.env.GIGAINVOICE_OWNER_USER_ID) {
      const owner = ownerId();
      if (!(await sql`select id from auth.users where id=${owner}::uuid`).length) throw new AdminSetupError('Configured owner is absent from Auth users.');
      await sql.begin(async tx => {
        await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: owner, role: 'authenticated' })},true)`;
        await tx`set local role authenticated`;
        const count = await tx`select count(*)::integer as count from public.customers`;
        const matches = await tx`select id from public.search_customers('mit',15)`;
        const sample = await tx`select id,username from public.customers where username='mit_patell' and full_name like 'MITKUMAR HARSHADBHAI PATEL%'`;
        const exact = sample[0] ? await tx`select id from public.customers where username=${sample[0].username}` : [];
        console.info(`Owner-role verification: ${count[0]!.count} visible customers; mit matches: ${matches.length}; requested sample present: ${sample.length > 0}; exact lookup: ${exact.length === 1}.`);
        if (sample.length && !matches.some(row => row.id === sample[0]!.id)) throw new AdminSetupError('Requested sample was not returned by mit search.');
      });
      console.info('Database owner-role verification does not replace signing in from the actual Android/web app.');
    }
  } finally { await sql.end({ timeout: 5 }); }
}
main().catch(reportAdminError);
