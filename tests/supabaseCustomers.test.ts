import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/models/Database';
import { SupabaseCustomerRepository } from '../src/repositories/SupabaseCustomerRepository';
import { JsonCustomerRepository } from '../src/repositories/JsonCustomerRepository';
import { CustomerService } from '../src/services/CustomerService';
import { StorageService } from '../src/services/StorageService';

function setup(response: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  const requests: { url: URL; init?: RequestInit }[] = [];
  const client = createClient<Database>('https://test.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      requests.push({ url, init });
      return response(url, init);
    } },
  });
  return { repository: new SupabaseCustomerRepository(client), requests };
}
const customer = { id: 'f04ed13c-f3ea-4f2a-89d4-70399c165ec7', username: 'mit_patell', full_name: 'MIT TEST PATEL', package: '12 Months', expiry_date: '2027-08-27T23:59:00' };
test('Supabase customer search sends literal parameter values with a bounded result limit', async () => {
  const { repository, requests } = setup(() => Response.json([customer, { invalid: true }]));
  const query = 'mit%,username.ilike.*,"x"_(test)\\';
  const results = await repository.search(query);
  assert.deepEqual(results, [customer]);
  assert.equal(requests[0]?.url.pathname, '/rest/v1/rpc/search_customers');
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), { search_text: query, result_limit: 15 });
  assert.equal(requests[0]?.url.searchParams.has('or'), false);
  assert.equal(requests[0]?.url.searchParams.get('select'),'id,username,full_name,email,phone,address,package,expiry_date,last_recharge_date');
});
test('short or oversized searches issue no remote request', async () => {
  const { repository, requests } = setup(() => Response.json([]));
  for (const query of ['', ' a ', 'x'.repeat(151)]) assert.deepEqual(await repository.search(query), []);
  assert.equal(requests.length, 0);
});
test('startup count requests at most one row without downloading the customer table', async () => {
  const { repository, requests } = setup(() => Response.json([{ username: 'test' }], { headers: { 'content-range': '0-0/2495' } }));
  assert.equal(await repository.count(), 2495);
  assert.equal(requests[0]?.init?.method, 'GET');
  assert.equal(requests[0]?.url.searchParams.get('limit'), '1');
  assert.equal(requests[0]?.url.searchParams.get('select'), 'username');
});
test('exact Supabase username lookup preserves customer dates', async () => {
  const { repository, requests } = setup(() => Response.json(customer));
  assert.deepEqual(await repository.getByUsername('mit_patell'), customer);
  assert.equal(requests[0]?.url.searchParams.get('username'), 'eq.mit_patell');
});
for (const [code, message] of [['PGRST205', /not set up/], ['42501', /Sign in/], ['', /internet connection/]] as const) {
  test(`Supabase ${code || 'network'} failure has a useful customer-facing message`, async () => {
    const { repository } = setup(() => Response.json({ code, message: 'internal server details' }, { status: 400 }));
    await assert.rejects(repository.search('mit'), message);
  });
}
test('remote failure never silently swaps to local results; the user can explicitly select and persist offline data', async () => {
  const { repository: remote } = setup(() => Response.json({ code: 'PGRST205' }, { status: 404 }));
  const local = new JsonCustomerRepository(async () => [customer]);
  const stored = new Map<string, string>();
  const storage = new StorageService({ getItem: async key => stored.get(key) ?? null, setItem: async (key, value) => { stored.set(key, value); } });
  const service = new CustomerService(local, remote, storage);
  await assert.rejects(service.search('mit'), /not set up/);
  assert.equal(service.getSnapshot().source, 'supabase');
  await service.setSource('local');
  assert.deepEqual(await service.search('mit'), [customer]);
  assert.equal(service.getSnapshot().source, 'local');
  const restored = new CustomerService(local, remote, storage);
  await restored.initialize();
  assert.equal(restored.getSnapshot().source, 'local');
  await restored.setSource('supabase');
  await assert.rejects(restored.search('mit'), /not set up/);
});
