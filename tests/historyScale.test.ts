import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/models/Database';
import { StorageService } from '../src/services/StorageService';
import { GuestDataService, type GuestAdapter } from '../src/services/GuestDataService';
import { LocalInvoiceRepository } from '../src/repositories/LocalInvoiceRepository';
import { CloudInvoiceRepository, LocalCustomerRepository } from '../src/repositories/WorkspaceRepositories';
import { fixtureInvoice, fixtureCustomer } from './fixtures/largeData';

test('10,000 snapshots retain order, Unicode search, identity and independent reopened data', async () => {
  const data = new Map<string,string>();
  const storage = new StorageService({ getItem: async k => data.get(k) ?? null, setItem: async (k,v) => { data.set(k,v); } });
  const rows = Array.from({length:10000}, (_,i) => fixtureInvoice(i));
  // Tied dates must have a deterministic ID tie-breaker.
  rows[0]!.savedAt = rows[1]!.savedAt;
  await storage.set('history', rows);
  await storage.set('customers', Array.from({length:10000}, (_,i) => fixtureCustomer(i)));
  const repo = new LocalInvoiceRepository(storage);
  const summaries = await repo.summaries('');
  assert.equal(summaries.length,10000);
  assert.equal(new Set(summaries.map(r => r.id)).size,10000);
  assert.equal(summaries[0]!.id,'fixture-9999');
  assert.equal(summaries.at(-2)!.id,'fixture-0');
  assert.equal(summaries.at(-1)!.id,'fixture-1');
  assert.equal((await repo.summaries('Cafe\u0301')).length,10000);
  assert.equal((await repo.search('LOAD-009999'))[0]!.total,200);
  assert.equal(new Set(summaries.map(r => r.currencySymbol)).size,2);
  assert.ok(summaries.every(r => !('data' in r)));
  const reopened = await repo.get('fixture-8001');
  reopened.data.customerName = 'Changed outside repository';
  assert.equal((await repo.get('fixture-8001')).data.customerName,rows[8001]!.data.customerName);
  const customers = new LocalCustomerRepository(storage);
  assert.equal(await customers.count(),10000);
  assert.equal((await customers.search('café')).length,15);
  assert.equal((await customers.search('fixture_9999'))[0]!.username,'fixture_9999');
});

test('separate guest repositories serialize read-modify-write with reset and preserve both saves', async () => {
  const data = new Map<string,string>();
  const adapter:GuestAdapter = { getItem:async k => data.get(k)??null, setItem:async(k,v)=>{await new Promise(r=>setTimeout(r,2));data.set(k,v);}, getAllKeys:async()=>[...data.keys()],removeItem:async k=>{data.delete(k);} };
  let pending:Promise<unknown> = Promise.resolve();
  const lock = <T>(work:()=>Promise<T>) => {const next=pending.catch(()=>{}).then(work);pending=next;return next;};
  const first = new GuestDataService(adapter,lock), second = new GuestDataService(adapter,lock);
  const a = new LocalInvoiceRepository(first.open(await first.current())), b = new LocalInvoiceRepository(second.open(await second.current()));
  await Promise.all([a.save(fixtureInvoice(1)), b.save(fixtureInvoice(2)), a.save(fixtureInvoice(3))]);
  assert.equal((await b.getAll()).length,3);
  await b.save({...fixtureInvoice(1),data:{...fixtureInvoice(1).data,planName:'Updated plan'}});
  assert.equal((await a.getAll()).length,3);
  assert.equal((await a.get('fixture-1')).data.planName,'Updated plan');
});

test('quota errors preserve old history, expose useful recovery, and permit retry', async () => {
  let raw:string|null = null, full = false;
  const repo = new LocalInvoiceRepository(new StorageService({getItem:async()=>raw,setItem:async(_,v)=>{if(full)throw new DOMException('Quota exceeded','QuotaExceededError');raw=v;}}));
  await repo.save(fixtureInvoice(1)); const before = raw;
  full = true;
  await assert.rejects(repo.save(fixtureInvoice(2)),/storage is full/);
  assert.equal(raw,before);assert.equal((await repo.getAll()).length,1);
  full = false;await repo.save(fixtureInvoice(2));assert.equal((await repo.getAll()).length,2);
});

test('invalid customer rows are reported and never silently removed by a save', async () => {
  const raw = [fixtureCustomer(1),{broken:true}]; let saved = false;
  const repo = new LocalCustomerRepository({get:async<T>()=>raw as T,set:async()=>{saved=true;}});
  await assert.rejects(repo.count(),/kept/);await assert.rejects(repo.save(fixtureCustomer(2)),/kept/);assert.equal(saved,false);
});

test('cloud summary pages omit documents, retain tied-date ordering, and fetch one scoped snapshot on open', async () => {
  const rows = Array.from({length:1001},(_,i)=>{const record=fixtureInvoice(i);return {id:`cloud-${String(i).padStart(6,'0')}`,local_id:record.id,invoice_number:record.invoiceNumber,customer_name:record.customerName,customer_username:record.customerUsername,start_date:record.date,total_amount:record.total,is_paid:record.isPaid,created_at:'2026-09-01T00:00:00.000Z',currency_symbol:record.data.currencySymbol,document:record.data};});
  const urls:URL[]=[];
  const client=createClient<Database>('https://fixture.supabase.co','sb_publishable_test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{
    const url=new URL(String(input));urls.push(url);
    assert.equal(url.searchParams.get('business_id'),'eq.fixture-workspace');
    if(url.searchParams.has('id'))return Response.json(rows[750]);
    assert.equal(url.searchParams.get('order'),'created_at.desc,id.asc');
    assert.ok(!url.searchParams.get('select')!.includes('document'));
    const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));
    return Response.json(rows.slice(offset,offset+limit).map(({document:_document,...summary})=>summary));
  }}});
  const repo=new CloudInvoiceRepository(client,'fixture-workspace');
  const result=await repo.summaries('café');
  assert.equal(result.length,1001);assert.equal(new Set(result.map(r=>r.id)).size,1001);assert.equal(urls.length,3);
  const reopened=await repo.get(result[750]!.id);assert.equal(urls.length,4);assert.deepEqual(reopened.data,rows[750]!.document);
  assert.equal(urls.at(-1)!.searchParams.get('id'),'eq.cloud-000750');
});
