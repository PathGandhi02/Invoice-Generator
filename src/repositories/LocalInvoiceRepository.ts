import type { Invoice } from '../models/Invoice';
import { summarizeInvoice } from '../models/Invoice';
import type { InvoiceRepository } from './InvoiceRepository';
import type { StorageService } from '../services/StorageService';
import { historyRecordSchema } from '../schemas/invoiceSchema';
import { normalizeSearch } from '../utils/search';

export class LocalInvoiceRepository implements InvoiceRepository {
  private pending: Promise<void> = Promise.resolve();
  private serialized: string | null | undefined;
  private records: Invoice[] = [];
  private terms: string[] = [];
  private remember(serialized: string | null, records: Invoice[]) {
    this.records = records.sort((a,b) => b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id));
    this.terms = this.records.map(record => normalizeSearch(`${record.customerName} ${record.customerUsername ?? ''} ${record.invoiceNumber}`));
    this.serialized = serialized;
    return this.records;
  }
  constructor(private readonly storage: StorageService) {}
  async getAll(): Promise<Invoice[]> {
    return (await this.read()).map(record => ({ ...record, data: { ...record.data } }));
  }
  private async read(): Promise<Invoice[]> {
    const serialized = await this.storage.readSerialized('history');
    return this.parse(serialized);
  }
  private parse(serialized: string | null): Invoice[] {
    if (serialized === this.serialized) return this.records;
    let value: unknown;
    try { value = serialized === null ? null : JSON.parse(serialized); }
    catch { throw new Error('Saved history could not be read. Existing data has been kept.'); }
    if (value === null) return this.remember(null, []);
    if (!Array.isArray(value)) throw new Error('Saved history could not be read.');
    const records = value.map(record => historyRecordSchema.safeParse(record));
    if (records.some(record => !record.success)) throw new Error('Saved history could not be read. Existing data has been kept.');
    return this.remember(serialized, records.flatMap(record => record.success ? [record.data] : []));
  }
  save(invoice: Invoice): Promise<void> {
    const operation = this.pending.catch(() => {}).then(async () => {
      const valid = historyRecordSchema.parse(invoice);
      let saved: { serialized: string; records: Invoice[] } | undefined;
      await this.storage.update('history', serialized => {
        const records = this.parse(serialized);
        const next = [valid, ...records.filter(record => record.id !== valid.id)];
        saved = { serialized: JSON.stringify(next), records: next };
        return saved.serialized;
      }).catch(error => {
        if (error instanceof Error && /quota|space|storage.*full/i.test(`${error.name} ${error.message}`)) throw new Error('Invoice could not be saved: device storage is full. Export documents you need, free storage and retry. Existing history was kept.');
        throw error;
      });
      if (saved) this.remember(saved.serialized, saved.records);
    });
    this.pending = operation;
    return operation;
  }
  async search(query: string): Promise<Invoice[]> {
    const normalized = normalizeSearch(query);
    return (await this.read()).filter((_, index) => this.terms[index]!.includes(normalized))
      .map(record => ({ ...record, data: { ...record.data } }));
  }
  async summaries(query: string) {
    const normalized = normalizeSearch(query);
    return (await this.read()).filter((_,index) => this.terms[index]!.includes(normalized)).map(summarizeInvoice);
  }
  async get(id: string) {
    const record = (await this.read()).find(row => row.id === id);
    if (!record) throw new Error('This saved invoice is no longer available. Reload history.');
    return { ...record, data: { ...record.data } };
  }
}
