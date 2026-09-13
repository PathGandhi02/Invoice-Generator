import { databaseConnection, ownerId, AdminSetupError, reportAdminError } from './admin/database';
import { loadCustomerImport, upsertBusinessCustomersSql } from './admin/customerImport';

async function main() {
  const dry = process.argv.includes('--dry-run');
  const file = process.argv.find(arg => arg.startsWith('--source='))?.slice(9);
  // Dry-run validates the complete source without guessing a real owner's ID.
  const owner = dry ? '00000000-0000-0000-0000-000000000000' : ownerId();
  const source = await loadCustomerImport(owner, file);
  console.info(`Customer source loaded. Total: ${source.total}; valid: ${source.valid}; invalid: ${source.invalid}; invalid dates: ${source.invalidDates}; duplicates skipped: ${source.duplicates}.`);
  if (dry) { console.info('Dry run complete. No database connection or upload performed.'); return; }
  if (!source.rows.length) throw new AdminSetupError('No valid customers to import. Nothing was uploaded.');
  const sql = databaseConnection();
  try {
    const stats = await sql.begin(async tx => {
      await tx`select pg_advisory_xact_lock(hashtext(${`gigainvoice:import:${owner}`}))`;
      await tx`set local lock_timeout='15s'`;
      await tx`set local statement_timeout='60s'`;
      const user = await tx`select id from auth.users where id=${owner}::uuid`;
      if (!user.length) throw new AdminSetupError('The configured owner UUID does not exist in this project\'s Auth users. No customers imported.');
      const workspace = await tx`select b.id from public.businesses b join public.business_members m on m.business_id=b.id
        join auth.users u on u.id=m.user_id join public.business_access_allowlist a on a.business_id=b.id and lower(a.email)=lower(u.email)
        where u.id=${owner}::uuid and u.email_confirmed_at is not null and m.status='active' and a.is_active
        and lower(u.email) in ('pathmgandhi@gmail.com','manish10gandhi@gmail.com') and b.protected_key='maruti-giga-fiber'`;
      if (workspace.length !== 1) throw new AdminSetupError('The import owner must be a verified, approved member of the protected Maruti workspace. Nothing imported.');
      let inserted = 0; let updated = 0;
      for (let offset = 0; offset < source.rows.length; offset += 200) {
        // postgres serializes JSONB itself; a pre-stringified value becomes a
        // JSON string instead of the array required by jsonb_to_recordset.
        const results = await tx.unsafe<{ inserted: boolean }[]>(upsertBusinessCustomersSql, [tx.json(source.rows.slice(offset, offset + 200)), workspace[0]!.id]);
        for (const result of results) { if (result.inserted) inserted++; else updated++; }
      }
      return { inserted, updated };
    });
    console.info(`Import committed. Inserted: ${stats.inserted}; updated: ${stats.updated}.`);
    const count = await sql`select count(*)::integer as count from public.customers where owner_id=${owner}::uuid`;
    console.info(`Owner customer count: ${count[0]!.count}. Run npm run db:verify for owner-scoped sample lookups.`);
  } finally { await sql.end({ timeout: 5 }); }
}
main().catch(reportAdminError);
