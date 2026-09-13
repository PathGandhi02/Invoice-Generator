import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { prepareCustomerImport, calendarTimestamp, upsertCustomersSql } from '../scripts/admin/customerImport';
import { autofillCustomer, clearCustomer, createDraft, toHistoryRecord } from '../src/services/InvoiceService';
import { validateSupabaseConfig } from '../src/lib/supabaseConfig';
import { defaultSettings } from '../src/models/BusinessSettings';

const ownerA='11111111-1111-4111-8111-111111111111';
const ownerB='22222222-2222-4222-8222-222222222222';

test('production schema preserves legacy rows, isolates owners and validates relations, import, timestamps and indexes', async () => {
  const db=await PGlite.create({ extensions: { pgcrypto, pg_trgm } });
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on all functions in schema auth to anon,authenticated;`);
    await db.exec(await readFile('supabase/migrations/202609120001_customers.sql','utf8'));
    await db.query('insert into auth.users values($1),($2)',[ownerA,ownerB]);
    await db.exec("insert into public.customers(username,full_name) values('legacy','Kept legacy row')");
    const migration=await readFile('supabase/migrations/202609120002_production_schema.sql','utf8');
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await db.query("select * from public.customers where username='legacy' and owner_id is null")).rows.length,1);
    const rows=[{username:'mit_owner',full_name:'MITKUMAR HARSHADBHAI PATEL',phone:'+919876543210',expiry_date:'2027-08-27 23:59:00'},
      {username:'literal_%',full_name:'Literal (name), path\\home'},
      {username:'unicode',full_name:'ગુજરાતી નામ'},...Array.from({length:25},(_,i)=>({username:`item_${i}`,full_name:`Customer ${i}`}))];
    const prepared=prepareCustomerImport(rows,ownerA);
    const first=await db.query<{inserted:boolean}>(upsertCustomersSql,[JSON.stringify(prepared.rows)]);
    assert.equal(first.rows.filter(r=>r.inserted).length,28);
    const second=await db.query<{inserted:boolean}>(upsertCustomersSql,[JSON.stringify(prepared.rows)]);
    assert.equal(second.rows.filter(r=>r.inserted).length,0);
    await db.query(upsertCustomersSql,[JSON.stringify(prepareCustomerImport([rows[0]],ownerB).rows)]);
    const login=async (owner:string)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:owner,role:'authenticated'})]);await db.exec('set role authenticated');};
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.customers'),/permission denied/);
    await assert.rejects(db.query("select * from public.search_customers('mit',15)"),/permission denied/);
    await login(ownerA);
    assert.equal((await db.query('select * from public.customers')).rows.length,28);
    const search=async (term:string,limit=15)=>(await db.query<{username:string}>('select username from public.search_customers($1,$2)',[term,limit])).rows;
    assert.deepEqual(await search('miT'),[{username:'mit_owner'}]);
    assert.deepEqual(await search('_%'),[{username:'literal_%'}]);
    assert.deepEqual(await search('path\\'),[{username:'literal_%'}]);
    assert.deepEqual(await search('ગુજરાતી'),[{username:'unicode'}]);
    assert.deepEqual(await search("%'),true--"),[]);
    assert.equal((await search('Customer',100)).length,20);
    assert.equal((await search('Customer')).length,15);
    await db.exec("update public.customers set is_active=false where username='mit_owner'");
    assert.deepEqual(await search('mit'),[]);
    await db.exec("update public.customers set is_active=true where username='mit_owner'");
    await assert.rejects(db.query('insert into public.customers(owner_id,username,full_name) values($1,\'wrong\',\'Wrong\')',[ownerB]),/row-level security/);
    await assert.rejects(db.query('update public.customers set owner_id=$1',[ownerB]),/row-level security/);
    await db.query("insert into public.business_settings(owner_id) values($1)",[ownerA]);
    await assert.rejects(db.query("insert into public.business_settings(owner_id) values($1)",[ownerA]),/unique/);
    const a=(await db.query<{id:string}>("select id from public.customers where username='mit_owner'")).rows[0]!.id;
    await login(ownerB);
    const b=(await db.query<{id:string}>("select id from public.customers where username='mit_owner'")).rows[0]!.id;
    assert.equal((await db.query('select * from public.customers')).rows.length,1);
    const invoiceB=(await db.query<{id:string}>("insert into public.invoices(owner_id,customer_id,invoice_number,customer_name) values($1,$2,'SAME','B snapshot') returning id",[ownerB,b])).rows[0]!.id;
    await login(ownerA);
    await assert.rejects(db.query("insert into public.invoices(owner_id,customer_id,invoice_number,customer_name) values($1,$2,'BAD','Bad')",[ownerA,b]),/foreign key/);
    const invoiceA=(await db.query<{id:string}>("insert into public.invoices(owner_id,customer_id,invoice_number,customer_name) values($1,$2,'SAME','Original snapshot') returning id",[ownerA,a])).rows[0]!.id;
    await assert.rejects(db.query("insert into public.invoice_items(owner_id,invoice_id,plan_name) values($1,$2,'Cross owner')",[ownerA,invoiceB]),/foreign key/);
    await db.query("insert into public.invoice_items(owner_id,invoice_id,plan_name) values($1,$2,'Plan')",[ownerA,invoiceA]);
    await assert.rejects(db.query("update public.invoices set total_amount=-1 where id=$1",[invoiceA]),/check constraint/);
    await assert.rejects(db.query("update public.invoice_items set discount_percent=101 where invoice_id=$1",[invoiceA]),/check constraint/);
    await assert.rejects(db.query("update public.invoices set subtotal='NaN' where id=$1",[invoiceA]),/check constraint/);
    await db.query("update public.customers set full_name='Edited master',updated_at='2000-01-01' where id=$1",[a]);
    const unchanged=(await db.query<{customer_name:string}>('select customer_name from public.invoices where id=$1',[invoiceA])).rows[0];
    assert.equal(unchanged?.customer_name,'Original snapshot');
    assert.equal((await db.query("select id from public.customers where updated_at>'2000-01-02' and id=$1",[a])).rows.length,1);
    assert.equal((await db.query<{day:string}>("select to_char(expiry_date,'YYYY-MM-DD HH24:MI:SS') as day from public.customers where id=$1",[a])).rows[0]?.day,'2027-08-27 23:59:00');
    await db.query('delete from public.customers where id=$1',[a]);
    assert.equal((await db.query<{customer_id:null}>('select customer_id from public.invoices where id=$1',[invoiceA])).rows[0]?.customer_id,null);
    await db.query('delete from public.invoices where id=$1',[invoiceA]);
    assert.equal((await db.query('select * from public.invoice_items')).rows.length,0);
    await db.exec('reset role');
    const indexes=await db.query<{indexdef:string}>("select indexdef from pg_indexes where indexname like 'gigainvoice_customers_%trgm_idx'");
    assert.equal(indexes.rows.length,2);
    assert.ok(indexes.rows.every(r=>r.indexdef.includes('USING gin (lower(')));
    assert.equal((await db.query("select * from pg_policies where policyname like 'gigainvoice_%'")).rows.length,20);
  } finally { await db.close(); }
});

test('import validation preserves source names, rejects invalid timestamps and skips duplicate/invalid rows',()=>{
  const source=prepareCustomerImport([{username:' x ',full_name:' Name ',expiry_date:'2027-08-27 23:59:00'},
    {username:' x ',full_name:'duplicate'},{username:'invalid',full_name:''},{username:'badtime',full_name:'bad',expiry_date:'2027-08-27 25:00:00'}],ownerA);
  assert.equal(source.valid,1);assert.equal(source.invalid,2);assert.equal(source.duplicates,1);
  assert.equal(source.rows[0]?.username,' x ');assert.equal(source.rows[0]?.full_name,' Name ');
  assert.equal(calendarTimestamp('2027-08-27T23:59:00'),'2027-08-27 23:59:00');
  assert.throws(()=>calendarTimestamp('2027-02-30 23:59:00'));
  assert.throws(()=>calendarTimestamp('2027-08-27T23:59:00Z'));
});

test('customer selection retains id and phone in historical snapshot independently of master edits',()=>{
  const customer={id:ownerA,username:'snapshot',full_name:'Original',phone:'+919876543210'};
  const selected=autofillCustomer(createDraft(defaultSettings),customer);
  const saved=toHistoryRecord(selected);
  customer.full_name='Changed';
  assert.equal(saved.data.customerId,ownerA);assert.equal(saved.data.customerName,'Original');assert.equal(saved.data.customerPhone,'+919876543210');
  assert.equal(clearCustomer(selected).customerId,undefined);
});

test('public client rejects incomplete or privileged configuration without echoing credential values',()=>{
  assert.equal(validateSupabaseConfig(),null);
  assert.throws(()=>validateSupabaseConfig('https://example.supabase.co','sb_secret_private'),/Invalid Supabase/);
  assert.throws(()=>validateSupabaseConfig('https://example.supabase.co'),/Invalid Supabase/);
  assert.throws(()=>validateSupabaseConfig('http://example.supabase.co','sb_publishable_test'),/Invalid Supabase/);
  assert.equal(validateSupabaseConfig('https://example.supabase.co','sb_publishable_test')?.url,'https://example.supabase.co');
});
