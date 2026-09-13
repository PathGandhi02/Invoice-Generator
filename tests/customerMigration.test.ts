import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('customer migration enforces owner RLS, safe partial search, date preservation and read-only client access', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.jwt() to anon, authenticated;`);
    const migration = await readFile('supabase/migrations/202609120001_customers.sql', 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Safe to reapply without destroying rows/policies.
    const rows = [
      ['mit_patell', 'MIT TEST PATEL'], ['literal_%', 'Name (special), star*'],
      ['unicode', 'ગુજરાતી નામ'], ['backslash', 'path\\name'],
      ...Array.from({ length: 25 }, (_, i) => [`user_${i}`, `Customer ${i}`]),
    ];
    for (const [username, name] of rows) {
      await db.query('insert into public.customers (username, full_name, expiry_date) values ($1,$2,$3)', [username, name, '2027-08-27 23:59:00']);
    }
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.customers'), /permission denied/);
    await assert.rejects(db.query("select * from public.search_customers('mit',15)"), /permission denied/);
    await db.exec('reset role; set role authenticated');
    assert.equal((await db.query('select * from public.customers')).rows.length, 0);
    await assert.rejects(db.query("select * from public.search_customers('mit',15)"), /Owner access/);
    // A user-editable claim cannot grant access.
    await db.query("select set_config('test.jwt', $1, false)", [JSON.stringify({ user_metadata: { gigainvoice_role: 'owner' } })]);
    assert.equal((await db.query('select * from public.customers')).rows.length, 0);
    await db.query("select set_config('test.jwt', $1, false)", [JSON.stringify({ app_metadata: { gigainvoice_role: 'owner' } })]);
    const search = async (term: string, limit = 15) => (await db.query<{ username: string }>('select username from public.search_customers($1,$2)', [term, limit])).rows;
    assert.deepEqual(await search('miT'), [{ username: 'mit_patell' }]);
    assert.deepEqual(await search('PATELL'), [{ username: 'mit_patell' }]);
    assert.deepEqual(await search('_%'), [{ username: 'literal_%' }]);
    assert.deepEqual(await search('star*'), [{ username: 'literal_%' }]);
    assert.deepEqual(await search('path\\'), [{ username: 'backslash' }]);
    assert.deepEqual(await search('ગુજરાતી'), [{ username: 'unicode' }]);
    assert.deepEqual(await search("%'),true--"), []);
    assert.deepEqual(await search('m'), []);
    assert.equal((await search('Customer')).length, 15);
    assert.equal((await search('Customer', 10000)).length, 20);
    const date = await db.query<{ day: string }>("select to_char(expiry_date, 'YYYY-MM-DD HH24:MI:SS') as day from public.customers where username='mit_patell'");
    assert.equal(date.rows[0]?.day, '2027-08-27 23:59:00');
    await assert.rejects(db.query("update public.customers set full_name='changed'"), /permission denied/);
    await assert.rejects(db.query('delete from public.customers'), /permission denied/);
  } finally { await db.close(); }
});
