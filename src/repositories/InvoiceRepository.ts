import type { Invoice } from '../models/Invoice';
export interface InvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  getAll(): Promise<Invoice[]>;
  search(query: string): Promise<Invoice[]>;
}
