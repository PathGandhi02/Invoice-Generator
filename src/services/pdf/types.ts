import type { InvoiceData } from '../../models/Invoice';
export interface PdfResult { filename: string; uri?: string }
export interface PdfAdapter {
  generate(invoice: InvoiceData): Promise<PdfResult>;
  share(invoice: InvoiceData): Promise<PdfResult>;
  print(invoice: InvoiceData): Promise<void>;
}
