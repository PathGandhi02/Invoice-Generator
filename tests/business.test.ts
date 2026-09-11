import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateInvoice } from '../src/utils/invoiceCalculations';
import { formatCurrency } from '../src/utils/currency';
import { formatDate, parseCalendarDate } from '../src/utils/dates';
import { invoiceFilename } from '../src/utils/filename';
import { buildUpiLink, canShowUpi } from '../src/utils/payment';
import { validateCustomers } from '../src/schemas/customerSchema';
import { invoiceSchema } from '../src/schemas/invoiceSchema';
import { JsonCustomerRepository } from '../src/repositories/JsonCustomerRepository';
import { createDraft, autofillCustomer } from '../src/services/InvoiceService';
import { defaultSettings } from '../src/models/BusinessSettings';
import { buildInvoiceHtml } from '../src/services/pdf/invoiceHtml';

test('discount applies only to the plan, then installation is added', () => {
  assert.deepEqual(calculateInvoice({ price: 1000, discount: 10, installationCharges: 200 }), {
    subtotal: 1000, discountPercent: 10, discountAmount: 100, installationFee: 200, total: 1100,
  });
  assert.equal(calculateInvoice({ price: 99.99, discount: 15, installationCharges: 0 }).total, 84.99);
});
test('preview calculations stay finite and never negative', () => {
  for (const input of [
    { price: -10, discount: -40, installationCharges: -5 },
    { price: Infinity, discount: NaN, installationCharges: NaN },
    { price: 100, discount: 500, installationCharges: 0 },
  ]) assert.equal(calculateInvoice(input).total, 0);
});
test('Indian grouping and decimal precision are preserved', () => {
  assert.equal(formatCurrency(125000), '₹1,25,000.00');
  assert.equal(formatCurrency(1234.5, '$'), '$1,234.50');
});
test('calendar dates preserve source day, including explicit timezone timestamps', () => {
  assert.equal(formatDate('2027-08-27 23:59:00'), '27 Aug 2027');
  assert.equal(formatDate('2027-08-27T23:59:00-08:00'), '27 Aug 2027');
  assert.equal(formatDate('2028-02-29'), '29 Feb 2028');
  for (const invalid of ['2027-02-29', '2026-13-01', '2026-04-31', 'not a date']) assert.equal(parseCalendarDate(invalid), null);
  assert.equal(formatDate(null), '—');
});
test('validation keeps valid entries and reports invalid rows and exact duplicate usernames', () => {
  const valid = { username: 'test_one', full_name: 'Test Customer', email: null, package: '12 Months' };
  const result = validateCustomers([valid, { full_name: 'Missing username' }, { username: 'blank', full_name: ' ' }, valid]);
  assert.equal(result.total, 4); assert.equal(result.invalid, 2); assert.equal(result.duplicates, 1);
  assert.deepEqual(result.customers, [valid]);
  assert.throws(() => validateCustomers({ customers: [] }), /JSON array/);
  assert.equal(validateCustomers([]).customers.length, 0);
});
test('all valid supplied records are included in the prepared JSON', () => {
  const source = JSON.parse(readFileSync('temp/subscribers.json', 'utf8'));
  const prepared = JSON.parse(readFileSync('src/data/customers.json', 'utf8'));
  assert.deepEqual(prepared, validateCustomers(source).customers);
});
test('indexed search is partial, case-insensitive, Unicode safe, bounded, and initialized once', async () => {
  let loads = 0;
  const repository = new JsonCustomerRepository(async () => {
    loads++;
    return [
      { username: 'patel_test', full_name: 'MIT TEST PATEL', address: 'Idar' },
      { username: 'unicode_test', full_name: 'ગુજરાતી નામ' },
      { username: 'accent', full_name: 'Café Example' },
      ...Array.from({ length: 3000 }, (_, index) => ({ username: `account_${index}`, full_name: `Customer ${index}` })),
    ];
  });
  assert.equal((await repository.search('miT t'))[0]?.username, 'patel_test');
  assert.equal((await repository.search('PATEL_TE'))[0]?.username, 'patel_test');
  assert.equal((await repository.search('ગુજરાતી'))[0]?.username, 'unicode_test');
  assert.equal((await repository.search('Cafe\u0301'))[0]?.username, 'accent');
  assert.equal((await repository.search('account_')).length, 15);
  assert.equal((await repository.search('a')).length, 0);
  assert.equal((await repository.search('missing customer')).length, 0);
  assert.equal((await repository.getAll()).length, 3003);
  const copy = await repository.getByUsername('patel_test');
  copy!.full_name = 'Edited';
  assert.equal((await repository.getByUsername('patel_test'))?.full_name, 'MIT TEST PATEL');
  assert.equal(loads, 1);
});
test('selection autofills invoice fields without mapping package to plan or mutating customer', () => {
  const customer = Object.freeze({ username: 'demo', full_name: 'Demo User', email: null, address: 'Idar', package: '12 Months', expiry_date: '2027-08-27 23:59:00' });
  const draft = createDraft(defaultSettings);
  const selected = autofillCustomer({ ...draft, customerPhone: '1111111111' }, customer);
  assert.equal(selected.customerName, customer.full_name); assert.equal(selected.customerEmail, '');
  assert.equal(selected.customerAddress, 'Idar'); assert.equal(selected.timePeriod, '12 Months');
  assert.equal(selected.planName, '100 Mbps Unlimited'); assert.equal(selected.customerPhone, '+91 ');
  assert.equal(selected.customerExpiryDate, customer.expiry_date);
  selected.customerName = 'Invoice-only change';
  assert.equal(customer.full_name, 'Demo User');
});
test('filenames are safe on Windows, including slashes, whitespace, control chars and receipt prefix', () => {
  assert.equal(invoiceFilename({ invoiceNumber: '2026/001: A?*', isPaid: false }), 'Invoice_2026_001_A.pdf');
  assert.equal(invoiceFilename({ invoiceNumber: '../\\<>|\u0000', isPaid: true }), 'Receipt_untitled.pdf');
  assert.ok(invoiceFilename({ invoiceNumber: 'x'.repeat(300), isPaid: false }).length < 120);
});
test('UPI payload encodes every field and reflects discounted totals and receipt mode', () => {
  const invoice = { ...createDraft(defaultSettings), customerName: 'Demo', companyName: 'Demo & Co', invoiceNumber: '26/1 & 2', price: 1200, discount: 25, installationCharges: 100 };
  const url = new URL(buildUpiLink(invoice));
  assert.equal(url.searchParams.get('pn'), 'Demo & Co');
  assert.equal(url.searchParams.get('am'), '1000.00');
  assert.equal(url.searchParams.get('tn'), 'Invoice_26/1 & 2');
  assert.equal(new URL(buildUpiLink({ ...invoice, isPaid: true })).searchParams.get('tn'), 'Receipt_26/1 & 2');
  assert.equal(canShowUpi({ ...invoice, currencySymbol: '$' }), false);
});
test('export validation rejects invalid dates, amounts and missing QR while allowing manual customers', () => {
  const invoice = { ...createDraft(defaultSettings), customerName: 'Manual Customer' };
  assert.equal(invoiceSchema.safeParse(invoice).success, true);
  for (const change of [{ price: -1 }, { price: NaN }, { discount: 101 }, { startDate: '2026-02-30' }, { customerEmail: 'bad' }, { currencySymbol: '$' }, { qrType: 'custom' }]) {
    assert.equal(invoiceSchema.safeParse({ ...invoice, ...change }).success, false);
  }
});
test('PDF HTML escapes invoice values and contains offline QR, logo and paid stamp', () => {
  const invoice = { ...createDraft(defaultSettings), customerName: '<script>alert(1)</script>', isPaid: true, price: 1000, dueDate: '2026-09-14' };
  const html = buildInvoiceHtml(invoice);
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('data:image/gif;base64,')); assert.ok(html.includes('data:image/jpeg;base64,'));
  assert.ok(html.includes('>PAID<')); assert.ok(html.includes('14 Sep 2026')); assert.ok(html.includes('AMOUNT PAID'));
  assert.ok(!html.includes('src="https://'));
});
