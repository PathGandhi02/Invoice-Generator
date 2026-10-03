import type { Invoice, InvoiceSummary } from '../models/Invoice';
export interface InvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  getAll(): Promise<Invoice[]>;
  search(query: string): Promise<Invoice[]>;
  summaries(query: string): Promise<InvoiceSummary[]>;
  get(id: string): Promise<Invoice>;
}
