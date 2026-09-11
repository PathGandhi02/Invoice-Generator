import type { Invoice } from '../models/Invoice';
import type { InvoiceRepository } from './InvoiceRepository';
import type { StorageService } from '../services/StorageService';
import { historyRecordSchema } from '../schemas/invoiceSchema';
import { normalizeSearch } from '../utils/search';

export class LocalInvoiceRepository implements InvoiceRepository {
  private pending: Promise<void> = Promise.resolve();
  constructor(private readonly storage: StorageService) {}
  async getAll(): Promise<Invoice[]> {
    const value = await this.storage.get<unknown>('history');
    if (value === null) return [];
    if (!Array.isArray(value)) throw new Error('Saved history could not be read.');
    const records = value.map(record => historyRecordSchema.safeParse(record));
    if (records.some(record => !record.success)) throw new Error('Saved history could not be read. Existing data has been kept.');
    return records.flatMap(record => record.success ? [record.data] : [])
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }
  save(invoice: Invoice): Promise<void> {
    const operation = this.pending.catch(() => {}).then(async () => {
      const valid = historyRecordSchema.parse(invoice);
      const records = await this.getAll();
      await this.storage.set('history', [valid, ...records.filter(record => record.id !== valid.id)]);
    });
    this.pending = operation;
    return operation;
  }
  async search(query: string): Promise<Invoice[]> {
    const normalized = normalizeSearch(query);
    return (await this.getAll()).filter(record =>
      normalizeSearch(`${record.customerName} ${record.customerUsername ?? ''} ${record.invoiceNumber}`).includes(normalized));
  }
}
