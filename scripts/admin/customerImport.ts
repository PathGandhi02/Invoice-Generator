import { readFile } from 'node:fs/promises';
import { validateCustomers } from '../../src/schemas/customerSchema';
import { parseCalendarDate } from '../../src/utils/dates';

export function calendarTimestamp(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const text = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?)?$/.exec(text);
  if (!match || !parseCalendarDate(match[1]!) || Number(match[2] ?? 0) > 23 || Number(match[3] ?? 0) > 59 || Number(match[4] ?? 0) > 59) throw new Error('Invalid calendar timestamp');
  return `${match[1]} ${match[2] ?? '00'}:${match[3] ?? '00'}:${match[4] ?? '00'}${match[5] ?? ''}`;
}
export function prepareCustomerImport(input: unknown, owner: string) {
  const validated = validateCustomers(input);
  let invalidDates = 0;
  const rows = validated.customers.flatMap(customer => {
    try {
      return [{ owner_id: owner, username: customer.username, full_name: customer.full_name, email: customer.email ?? null,
        phone: customer.phone ?? null, address: customer.address ?? null, package: customer.package ?? null,
        expiry_date: calendarTimestamp(customer.expiry_date), last_recharge_date: calendarTimestamp(customer.last_recharge_date) }];
    } catch { invalidDates++; return []; }
  });
  return { rows, total: validated.total, valid: rows.length, invalid: validated.invalid + invalidDates, invalidDates, duplicates: validated.duplicates };
}
export async function loadCustomerImport(owner: string, explicit?: string) {
  // Prefer the original source so invalid/skipped statistics remain truthful.
  const candidates = explicit ? [explicit] : ['temp/subscribers.json', 'input/subscribers.json', 'temp/private-import/customers.json'];
  for (const filename of candidates) {
    try { return { filename, ...prepareCustomerImport(JSON.parse((await readFile(filename, 'utf8')).replace(/^\uFEFF/, '')), owner) }; }
    catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  throw new Error('Customer JSON source not found');
}
// Parameterized SQL shared by the trusted importer and PostgreSQL tests.
// is_active is preserved on updates; rerunning an import must not reactivate a customer.
export const upsertCustomersSql = `insert into public.customers
  (owner_id,username,full_name,email,phone,address,package,expiry_date,last_recharge_date)
  select owner_id,username,full_name,email,phone,address,package,expiry_date,last_recharge_date
  from jsonb_to_recordset($1::jsonb) as r(owner_id uuid,username text,full_name text,email text,phone text,address text,package text,expiry_date timestamp,last_recharge_date timestamp)
  on conflict(owner_id,username) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,
    address=excluded.address,package=excluded.package,expiry_date=excluded.expiry_date,last_recharge_date=excluded.last_recharge_date
  returning (xmax=0) as inserted`;

// Current trusted import keeps the historical owner column for attribution;
// the workspace ID is resolved from verified membership by the CLI.
export const upsertBusinessCustomersSql = upsertCustomersSql
  .replace('(owner_id,username', '(business_id,owner_id,username')
  .replace('select owner_id,username', 'select $2::uuid,owner_id,username')
  .replace('on conflict(owner_id,username)', 'on conflict(business_id,username)');
