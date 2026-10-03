import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GuestDataService, GUEST_CONTROL, GUEST_PREFIX, type GuestAdapter } from '../src/services/GuestDataService';
import { LocalInvoiceRepository } from '../src/repositories/LocalInvoiceRepository';
import { createDraft, toHistoryRecord } from '../src/services/InvoiceService';
import { defaultSettings } from '../src/models/BusinessSettings';
import { StorageService } from '../src/services/StorageService';
import { importLocalData } from '../src/services/GuestMigrationService';
import { fixtureInvoice } from './fixtures/largeData';

function setup() {
  const data = new Map<string, string>();
  const adapter: GuestAdapter = { getItem: async k => data.get(k) ?? null, setItem: async (k,v) => { data.set(k,v); }, removeItem: async k => { data.delete(k); }, getAllKeys: async () => [...data.keys()] };
  return { data, adapter, service: new GuestDataService(adapter) };
}
test('reset removes only guest records, fences old instances, and allows new work', async () => {
  const { data, service } = setup();
  const unrelated = ['gigainvoice:supabase:auth', 'gigainvoice:v1:history', 'gigainvoice:v2:preferences:import:cloud', 'another-app'];
  for (const key of unrelated) data.set(key, 'untouched');
  const old = service.open(await service.current());
  for (const key of ['settings','customers','history','draft','drafts']) await old.set(key, { private: 'old' });
  await service.clear();
  assert.deepEqual([...data.keys()].sort(), [...unrelated,GUEST_CONTROL].sort());
  for (const key of unrelated) assert.equal(data.get(key), 'untouched');
  await assert.rejects(old.set('draft', 'resurrected'), /cleared/);
  await assert.rejects(old.get('history'), /cleared/);
  const fresh = service.open(await service.current());
  assert.equal(await fresh.get('history'), null);
  await fresh.set('draft', 'new');
  assert.equal(await fresh.get('draft'), 'new');
  await service.clear(); await service.clear();
  assert.equal(await service.open(await service.current()).get('draft'), null);
});
test('partial deletion survives restart and can be retried without exposing remaining rows', async () => {
  const { data, adapter } = setup();
  data.set(`${GUEST_PREFIX}history`, 'broken JSON'); data.set(`${GUEST_PREFIX}draft`, 'private');
  let fail = true;
  const service = new GuestDataService({ ...adapter, removeItem: async k => { if (fail) { fail = false; throw new Error('Disk unavailable'); } await adapter.removeItem(k); } });
  await assert.rejects(service.clear(), /Disk unavailable/);
  assert.equal((await service.current()).resetting, true);
  const restarted = new GuestDataService(adapter);
  await assert.rejects(restarted.open(await restarted.current()).get('history'), /cleared/);
  await restarted.clear();
  assert.equal((await restarted.current()).resetting, false);
  assert.deepEqual([...data.keys()], [GUEST_CONTROL]);
});
test('failure to write reset intent preserves old records; corrupt reset metadata can recover', async () => {
  const { data, adapter } = setup();
  data.set(`${GUEST_PREFIX}draft`, 'kept');
  const failing = new GuestDataService({ ...adapter, setItem: async () => { throw new Error('Quota'); } });
  await assert.rejects(failing.clear(), /Quota/);
  assert.equal(data.get(`${GUEST_PREFIX}draft`), 'kept');
  data.set(GUEST_CONTROL, '{broken');
  const service = new GuestDataService(adapter);
  await assert.rejects(service.current());
  await service.clear();
  assert.equal((await service.current()).resetting, false);
});
test('slow writes and repository queues cannot restore history after reset', async () => {
  const { data, adapter } = setup();
  const service = new GuestDataService({ ...adapter, setItem: async (k,v) => { if (k.endsWith('draft')) await new Promise(r => setTimeout(r, 20)); await adapter.setItem(k,v); } });
  const old = service.open(await service.current());
  const saving = old.set('draft', 'old');
  const clearing = service.clear();
  const repo = new LocalInvoiceRepository(old);
  const invoice = toHistoryRecord({ ...createDraft(defaultSettings), customerName: 'Fictional', planName: 'Plan', timePeriod: 'month' });
  const late = repo.save(invoice);
  const results = await Promise.allSettled([saving,clearing,late]);
  assert.equal(results[1]?.status, 'fulfilled');
  assert.equal(results[2]?.status, 'rejected');
  assert.deepEqual([...data.keys()], [GUEST_CONTROL]);
});
test('another tab retains its old lease even when it missed every reset notification', async () => {
  const { adapter, service } = setup();
  const otherTab = new GuestDataService(adapter);
  const suspended = otherTab.open(await otherTab.current());
  await suspended.set('draft', 'before');
  await service.clear();
  await assert.rejects(suspended.set('draft','after'), /cleared/);
  const fresh = otherTab.open(await otherTab.current());
  assert.equal(await fresh.get('draft'), null);
});
test('without cross-tab locks a late old-generation write is discarded', async () => {
  const { data, adapter, service } = setup();
  let entered!: () => void, release!: () => void;
  const writing = new Promise<void>(r => { entered = r; });
  const resume = new Promise<void>(r => { release = r; });
  const other = new GuestDataService({ ...adapter, setItem: async (k,v) => { entered(); await resume; await adapter.setItem(k,v); } });
  const old = other.open(await other.current());
  const late = old.set('draft', 'stale');
  await writing; await service.clear(); release();
  await assert.rejects(late, /cleared/);
  assert.deepEqual([...data.keys()], [GUEST_CONTROL]);
});

test('reset stops subsequent import operations but preserves completed cloud writes and retry journals', async () => {
  const { adapter, service } = setup();
  const old = service.open(await service.current());
  const journal = new StorageService(adapter,'gigainvoice:v2:preferences:');
  const cloud:string[]=[];
  const target={customers:{count:async()=>0,search:async()=>[],getAll:async()=>[],save:async()=>{}},invoices:{save:async(invoice:ReturnType<typeof fixtureInvoice>)=>{cloud.push(invoice.id);await service.clear();}},saveSettings:async()=>{},openInvoice:async()=>{}};
  const data={customers:[],invoices:[fixtureInvoice(1),fixtureInvoice(2)],settings:null,draft:null};
  const options={customers:false,settings:false,draft:false,protectedBusiness:false,confirmMaster:false};
  await assert.rejects(importLocalData(data,target,options,journal,'account:guest',()=>old.get('draft')),/cleared/);
  assert.deepEqual(cloud,['import-fixture-1']);
  assert.ok(await journal.get('import:account:guest:invoice:fixture-1'));
  assert.equal(await journal.get('import:account:guest:invoice:fixture-2'),null);
  assert.equal(await service.open(await service.current()).get('history'),null);
});

test('page-close flush is immediate and a suspended page cannot flush into a cleared workspace',async()=>{
  const {data,adapter}=setup();const sync={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
  const service=new GuestDataService(adapter,work=>work(),sync),old=service.open(await service.current());
  assert.equal(old.flush('draft',{customerName:'Last keystroke'}),true);
  assert.equal(data.get(`${GUEST_PREFIX}draft`),'{"customerName":"Last keystroke"}');
  await service.clear();assert.throws(()=>old.flush('draft',{customerName:'Stale pagehide'}),/cleared/);
  assert.deepEqual([...data.keys()],[GUEST_CONTROL]);
});
