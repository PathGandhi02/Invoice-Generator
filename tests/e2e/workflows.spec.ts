import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const customers = JSON.parse(readFileSync('src/data/customers.json', 'utf8'));
const customerCountLabel = `${customers.length.toLocaleString('en-IN')} customers available`;

async function manualInvoice(page: Page) {
  await page.getByRole('button', { name: 'Enter customer manually' }).click();
  await page.getByRole('textbox', { name: 'Customer name', exact: true }).fill('Test Customer');
  await page.getByRole('textbox', { name: 'Customer address', exact: true }).fill('Idar, Gujarat');
  await page.getByRole('button', { name: 'Plan & pricing', exact: true }).click();
  await page.getByRole('textbox', { name: 'Plan price', exact: true }).fill('1250.50');
  await page.getByRole('textbox', { name: 'Discount (%)', exact: true }).fill('10');
  await page.getByRole('textbox', { name: 'Installation charges', exact: true }).fill('200');
}

test('customer search, selection, metadata, and invoice-only edits', async ({ page }) => {
  const customer = customers.find((item: { email?: string | null }) => !item.email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item.email));
  await page.goto('/');
  await expect(page.getByText(customerCountLabel, { exact: false })).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search customers' });
  await search.fill(customer.username);
  await page.getByRole('button', { name: `Select ${customer.full_name}, ${customer.username}`, exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Customer name', exact: true })).toHaveValue(customer.full_name);
  await expect(page.getByText(`@${customer.username}`, { exact: true }).first()).toBeVisible();
  await page.getByRole('textbox', { name: 'Customer name', exact: true }).fill('Invoice-only edit');
  await page.getByRole('button', { name: 'Change customer' }).click();
  await search.fill(customer.username);
  await expect(page.getByRole('button', { name: `Select ${customer.full_name}, ${customer.username}`, exact: true })).toBeVisible();
});

test('manual invoice, decimal pricing, paid receipt, persistence, history and PDF download', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await manualInvoice(page);
  await expect(page.getByRole('textbox', { name: 'Plan price', exact: true })).toHaveValue('1250.50');
  await expect(page.getByText('₹1,325.45', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Paid receipt', exact: true }).click();
  await page.getByRole('button', { name: 'Receipt details', exact: true }).click();
  await page.getByRole('textbox', { name: 'Receipt number', exact: true }).fill('2026/TEST:001');
  await page.getByRole('textbox', { name: 'Start date', exact: true }).fill('2026-09-11');
  await page.getByRole('textbox', { name: 'Payment date', exact: true }).fill('2026-09-14');
  await page.getByRole('button', { name: 'Save invoice', exact: true }).click();
  await expect(page.getByText('Invoice saved', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'Open receipt 2026/TEST:001', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Customer name', exact: true })).toHaveValue('Test Customer');
  await expect(page.getByText('Draft saved on this device', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Customer name', exact: true })).toHaveValue('Test Customer');
  if (info.project.name.includes('mobile')) await page.getByRole('tab', { name: 'Preview invoice', exact: true }).click();
  await expect(page.getByTestId('invoice-paper').getByText('PAID', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('invoice-preview.png'), fullPage: true });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('Receipt_2026_TEST_001.pdf');
  const file = info.outputPath(download.suggestedFilename());
  await download.saveAs(file);
  const bytes = readFileSync(file);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(20_000);
  // A normal receipt must fit the A4 printable area without a second footer page.
  expect(bytes.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('business settings persist and apply to new invoices while preserving the existing draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter customer manually' }).click();
  await page.getByRole('textbox', { name: 'Customer name', exact: true }).fill('Preserved Draft');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('textbox', { name: 'Business name', exact: true }).fill('Test Fiber');
  await page.getByRole('textbox', { name: 'Default plan', exact: true }).fill('250 Mbps Unlimited');
  await page.getByRole('radio', { name: 'Mint accent', exact: true }).click();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByText('Settings saved.', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Business name', exact: true })).toHaveValue('Test Fiber');
  await page.getByRole('link', { name: 'Invoice', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Customer name', exact: true })).toHaveValue('Preserved Draft');
  await page.getByRole('button', { name: 'New invoice', exact: true }).click();
  await page.getByRole('button', { name: 'Plan & pricing', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Plan name', exact: true })).toHaveValue('250 Mbps Unlimited');
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open draft Preserved Draft', exact: true })).toBeVisible();
});

test('invalid invoices cannot be exported and empty customer search remains usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Search customers' }).fill('zzzz_no_such_customer');
  await expect(page.getByText('No customer found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save invoice', exact: true }).click();
  await expect(page.getByText('Select a customer or enter their details manually.', { exact: true })).toBeVisible();
  await manualInvoice(page);
  await page.getByRole('textbox', { name: 'Discount (%)', exact: true }).fill('120');
  await page.getByRole('button', { name: 'Save invoice', exact: true }).click();
  await expect(page.getByText('Discount must be between 0 and 100%.', { exact: true })).toBeVisible();
});

test('installed web cache supports offline startup, customer search and PDF export', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(customerCountLabel, { exact: false })).toBeVisible();
  await manualInvoice(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  expect((await downloading).suggestedFilename()).toMatch(/^Invoice_.*\.pdf$/);
});
