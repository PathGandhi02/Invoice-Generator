import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { databaseConnection, AdminSetupError, reportAdminError } from './admin/database';

async function main() {
  const apply = process.argv.includes('--apply');
  const sql = databaseConnection();
  try {
    const tables = await sql`select c.relname as table_name,c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('customers','business_settings','invoices','invoice_items') and c.relkind='r' order by c.relname`;
    console.info('Existing schema:', JSON.stringify(tables));
    const columns = await sql`select table_name,column_name,data_type,is_nullable from information_schema.columns
      where table_schema='public' and table_name in ('customers','business_settings','invoices','invoice_items') order by table_name,ordinal_position`;
    console.info('Existing columns:', JSON.stringify(columns));
    const files = (await readdir('supabase/migrations')).filter(name => /^\d+.*\.sql$/.test(name)).sort();
    console.info('Migration files:', files.join(', '));
    if (!apply) { console.info('Inspection only. Run npm run db:apply to apply the reviewed migrations.'); return; }
    await sql.begin(async tx => {
      await tx`select pg_advisory_xact_lock(hashtext('gigainvoice:migrations'))`;
      await tx`set local lock_timeout='15s'`;
      await tx`set local statement_timeout='120s'`;
      await tx`create schema if not exists gigainvoice_private`;
      await tx`revoke all on schema gigainvoice_private from public,anon,authenticated`;
      await tx`create table if not exists gigainvoice_private.migrations (name text primary key,checksum text not null,applied_at timestamptz not null default now())`;
      for (const filename of files) {
        const source = await readFile(`supabase/migrations/${filename}`, 'utf8');
        const checksum = createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex');
        const previous = await tx`select checksum from gigainvoice_private.migrations where name=${filename}`;
        if (previous.length) {
          if (previous[0]!.checksum !== checksum) throw new AdminSetupError(`Applied migration ${filename} changed. Restore it and add a new migration instead.`);
          continue;
        }
        // Each file can also run in the SQL editor. Here the entire migration set
        // is one transaction, so strip only its outer transaction statements.
        const body = source.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '');
        await tx.unsafe(body);
        await tx`insert into gigainvoice_private.migrations(name,checksum) values(${filename},${checksum})`;
      }
    });
    console.info('Migrations committed. Run npm run db:verify to inspect the resulting schema and access rules.');
  } finally { await sql.end({ timeout: 5 }); }
}
main().catch(reportAdminError);
