import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import type { InvoiceData } from '../models/Invoice';
import { invoiceSchema } from '../schemas/invoiceSchema';
import { invoiceFilename } from '../utils/filename';
import { buildInvoiceHtml } from './pdf/invoiceHtml';
import type { PdfAdapter, PdfResult } from './pdf/types';

class NativePdfService implements PdfAdapter {
  async generate(invoice: InvoiceData): Promise<PdfResult> {
    const valid = invoiceSchema.parse(invoice);
    const filename = invoiceFilename(valid);
    const result = await Print.printToFileAsync({ html: buildInvoiceHtml(valid), width: 595, height: 842, margins: { top: 22, bottom: 22, left: 0, right: 0 } });
    const directory = new Directory(Paths.document, 'invoices');
    directory.create({ intermediates: true, idempotent: true });
    const destination = new File(directory, filename);
    if (destination.exists) destination.delete();
    const temporary = new File(result.uri);
    temporary.copy(destination);
    temporary.delete();
    return { filename, uri: destination.uri };
  }
  async share(invoice: InvoiceData): Promise<PdfResult> {
    if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is unavailable on this device. Use Generate PDF or Print.');
    const result = await this.generate(invoice);
    await Sharing.shareAsync(result.uri!, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: result.filename });
    return result;
  }
  async print(invoice: InvoiceData): Promise<void> {
    await Print.printAsync({ html: buildInvoiceHtml(invoiceSchema.parse(invoice)) });
  }
}
export const pdfService: PdfAdapter = new NativePdfService();
