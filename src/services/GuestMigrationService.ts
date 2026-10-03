import type { BusinessSettings } from '../models/BusinessSettings';
import type { InvoiceData } from '../models/Invoice';
import type { InvoiceRepository } from '../repositories/InvoiceRepository';
import { LocalInvoiceRepository } from '../repositories/LocalInvoiceRepository';
import { LocalCustomerRepository, type Persistence, type WorkspaceCustomers } from '../repositories/WorkspaceRepositories';
import { draftSchema, settingsSchema } from '../schemas/invoiceSchema';
import { StorageService } from './StorageService';

export async function inspectLocalData(source: StorageService) {
  const [customers, invoices, settings, draft] = await Promise.all([
    new LocalCustomerRepository(source).getAll(), new LocalInvoiceRepository(source).getAll(), source.get('settings'), source.get('draft'),
  ]);
  const business = settingsSchema.safeParse(settings), current = draftSchema.safeParse(draft);
  return { customers, invoices, settings: business.success ? business.data : null, draft: current.success && (current.data.customerName || current.data.price) ? current.data : null };
}
export type LocalData = Awaited<ReturnType<typeof inspectLocalData>>;
export type ImportOptions = { customers: boolean; settings: boolean; draft: boolean; protectedBusiness: boolean; confirmMaster: boolean; };
function digest(value: unknown) {
  const text = JSON.stringify(value); let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); }
  return `${text.length}:${a >>> 0}:${b >>> 0}`;
}
export async function importLocalData(data: LocalData, target: { customers: WorkspaceCustomers; invoices: Pick<InvoiceRepository, 'save'>; saveSettings: (s: BusinessSettings) => Promise<void>; openInvoice: (d: InvoiceData) => Promise<void>; }, options: ImportOptions, journal: Persistence, scope: string, checkSource: () => Promise<unknown> = async () => {}) {
  if (options.customers && options.protectedBusiness && !options.confirmMaster) throw new Error('Confirm adding local customers to the shared master list first.');
  let completed = 0;
  // Only completed operations are journaled. Stable IDs make retries safe if a
  // request reaches the server but its response or local journal write is lost.
  const once = async (kind: string, id: string, value: unknown, action: () => Promise<unknown>) => {
    await checkSource();
    const key = `import:${scope}:${kind}:${id}`;
    const fingerprint = digest(value);
    if (await journal.get<string>(key) === fingerprint) return;
    await action(); await journal.set(key, fingerprint); completed++;
  };
  if (options.customers) for (const customer of data.customers) {
    const imported = { ...customer, id: undefined, username: `import_${customer.username}` };
    await once('customer', customer.username, imported, () => target.customers.save(imported));
  }
  for (const invoice of data.invoices) {
    const imported = { ...invoice, id: `import-${invoice.id}`, data: { ...invoice.data, id: `import-${invoice.id}`, customerId: undefined } };
    await once('invoice', invoice.id, imported, () => target.invoices.save(imported));
  }
  if (options.settings && data.settings) await once('settings', 'defaults', data.settings, () => target.saveSettings(data.settings!));
  if (options.draft && data.draft) {
    const draft = { ...data.draft, id: `import-${data.draft.id}`, customerId: undefined };
    await once('draft', 'current', draft, () => target.openInvoice(draft));
  }
  return completed;
}
