import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService, type StorageAdapter } from '../src/services/StorageService';
import { LocalInvoiceRepository } from '../src/repositories/LocalInvoiceRepository';
import { createDraft, toHistoryRecord } from '../src/services/InvoiceService';
import { defaultSettings } from '../src/models/BusinessSettings';

function memoryAdapter() {
  const data = new Map<string, string>();
  const adapter: StorageAdapter = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
  };
  return { data, adapter };
}
test('storage uses versioned names and returns independent serialized snapshots', async () => {
  const { data, adapter } = memoryAdapter();
  const storage = new StorageService(adapter);
  const original = { companyName: 'Demo Fiber' };
  const saving = storage.set('settings', original);
  original.companyName = 'Changed';
  await saving;
  assert.ok(data.has('gigainvoice:v1:settings'));
  assert.deepEqual(await storage.get('settings'), { companyName: 'Demo Fiber' });
  assert.equal(await storage.get('missing'), null);
});
test('queued writes preserve the newest draft even when the first write is slow', async () => {
  const { data, adapter } = memoryAdapter();
  const storage = new StorageService({ ...adapter, setItem: async (key, value) => {
    if (value === '1') await new Promise(resolve => setTimeout(resolve, 25));
    data.set(key, value);
  } });
  await Promise.all([storage.set('draft', 1), storage.set('draft', 2), storage.set('draft', 3)]);
  assert.equal(await storage.get('draft'), 3);
});
test('storage failures reject clearly and subsequent saves can recover', async () => {
  const { adapter } = memoryAdapter();
  let fail = true;
  const storage = new StorageService({ ...adapter, setItem: async (key, value) => {
    if (fail) { fail = false; throw new Error('Quota full'); }
    await adapter.setItem(key, value);
  } });
  await assert.rejects(storage.set('draft', 1), /Quota full/);
  await storage.set('draft', 2);
  assert.equal(await storage.get('draft'), 2);
});
test('concurrent invoice saves keep both invoices and updating a receipt does not duplicate history', async () => {
  const repository = new LocalInvoiceRepository(new StorageService(memoryAdapter().adapter));
  const first = toHistoryRecord({ ...createDraft(defaultSettings), planName: 'Test Plan', timePeriod: '12 Months', customerName: 'First Customer', price: 1000 });
  const second = toHistoryRecord({ ...createDraft(defaultSettings), planName: 'Test Plan', timePeriod: '12 Months', customerName: 'Second Customer', price: 2000 });
  await Promise.all([repository.save(first), repository.save(second)]);
  assert.equal((await repository.getAll()).length, 2);
  await repository.save(toHistoryRecord({ ...first.data, isPaid: true }));
  const matches = await repository.search('FIRST CUS');
  assert.equal(matches.length, 1); assert.equal(matches[0]?.isPaid, true);
  assert.equal((await repository.search(first.invoiceNumber)).length, 1);
  assert.equal((await repository.getAll()).length, 2);
});
test('corrupt history is preserved instead of overwritten by the next save', async () => {
  const { data, adapter } = memoryAdapter();
  data.set('gigainvoice:v1:history', '[{"broken":true}]');
  const repository = new LocalInvoiceRepository(new StorageService(adapter));
  await assert.rejects(repository.save(toHistoryRecord({ ...createDraft(defaultSettings), planName: 'Test Plan', timePeriod: '12 Months', customerName: 'Test' })), /could not be read/);
  assert.equal(data.get('gigainvoice:v1:history'), '[{"broken":true}]');
});
