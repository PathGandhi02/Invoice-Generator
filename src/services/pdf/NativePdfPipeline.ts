import type { InvoiceData } from '../../models/Invoice';
import { invoiceSchema } from '../../schemas/invoiceSchema';
import { invoiceFilename } from '../../utils/filename';
import { buildInvoiceHtml } from './invoiceHtml';
import type { PdfAdapter, PdfResult } from './types';

export interface NativePdfFile {
  uri: string;
  exists: boolean;
  size: number;
  header(): Uint8Array;
  copy(destination: NativePdfFile): Promise<void>;
  delete(): void;
}
export interface NativePdfPlatform {
  render(html: string): Promise<{ uri: string; numberOfPages: number }>;
  file(uri: string): NativePdfFile;
  destination(filename: string): NativePdfFile;
  sharingAvailable(): Promise<boolean>;
  share(uri: string, filename: string): Promise<void>;
  print(uri: string): Promise<void>;
  log(event: string, details?: Record<string, string | number | boolean>): void;
}
export class PdfOperationError extends Error {}

/** The SDK's File.copy is async. Deleting its source before awaiting it races
 * Android's copy and can hand the share sheet a missing or partial PDF. */
export class NativePdfPipeline implements PdfAdapter {
  private busy = false;
  constructor(private readonly platform: NativePdfPlatform, private readonly renderTimeoutMs = 45_000) {}

  private render(html: string): Promise<{ uri: string; numberOfPages: number }> {
    // A crashed Android WebView can leave expo-print's promise unresolved.
    // Free the action lock on timeout, and discard any late temporary output.
    return new Promise((resolve, reject) => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        reject(new PdfOperationError('PDF rendering timed out. Please try again. If it happens again, reopen the app.'));
      }, this.renderTimeoutMs);
      Promise.resolve().then(() => this.platform.render(html)).then(result => {
        clearTimeout(timer);
        if (timedOut) {
          if (result.uri?.startsWith('file://')) {
            try { this.cleanup(this.platform.file(result.uri)); } catch { /* A late renderer may already have removed its file. */ }
          }
        } else resolve(result);
      }, error => { clearTimeout(timer); if (!timedOut) reject(error); });
    });
  }

  private validate(file: NativePdfFile) {
    if (!file.uri.startsWith('file://') || !file.exists || file.size < 5) {
      throw new PdfOperationError('Unable to generate PDF. Please try again.');
    }
    const header = file.header();
    if ([37, 80, 68, 70, 45].some((byte, index) => header[index] !== byte)) {
      throw new PdfOperationError('The generated file is not a valid PDF. Please try again.');
    }
    this.platform.log('file verified', { exists: true, bytes: file.size });
  }

  private async generateFile(invoice: InvoiceData): Promise<PdfResult & { uri: string }> {
    const valid = invoiceSchema.parse(invoice);
    const filename = invoiceFilename(valid);
    this.platform.log('PDF start');
    const result = await this.render(buildInvoiceHtml(valid));
    this.platform.log('PDF URI returned', { hasUri: !!result.uri, pages: result.numberOfPages });
    if (!result.uri?.startsWith('file://') || result.numberOfPages < 1) {
      throw new PdfOperationError('Unable to generate PDF. Please try again.');
    }
    const temporary = this.platform.file(result.uri);
    let destination: NativePdfFile | undefined;
    try {
      this.validate(temporary);
      // Each export owns a folder: a later export cannot overwrite a file
      // that another application is still reading through the share provider.
      destination = this.platform.destination(filename);
      this.platform.log('file copy start');
      await temporary.copy(destination);
      this.validate(destination);
      if (destination.size !== temporary.size) throw new PdfOperationError('The PDF could not be saved completely. Please try again.');
      this.platform.log('file copy complete');
      return { filename, uri: destination.uri };
    } catch (error) {
      if (destination) this.cleanup(destination);
      throw error;
    } finally {
      this.cleanup(temporary);
    }
  }

  private cleanup(file: NativePdfFile) {
    try { if (file.exists) file.delete(); }
    catch { this.platform.log('temporary cleanup deferred'); }
  }
  private async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.busy) throw new PdfOperationError('A PDF action is already in progress. Please wait.');
    this.busy = true;
    try { return await operation(); }
    catch (error) {
      // Native error messages can contain invoice filenames. Log only the error
      // class here, alongside the stage markers above, never customer data.
      this.platform.log('PDF action failed', { errorType: error instanceof Error ? error.name : 'Unknown' });
      throw error instanceof PdfOperationError ? error : new PdfOperationError('Unable to generate PDF. Please try again.');
    } finally { this.busy = false; }
  }
  generate(invoice: InvoiceData) { return this.run(() => this.generateFile(invoice)); }
  share(invoice: InvoiceData) {
    return this.run(async () => {
      const available = await this.platform.sharingAvailable();
      this.platform.log('share availability', { available });
      if (!available) throw new PdfOperationError('Sharing is unavailable on this device. Use Generate PDF or Print.');
      const result = await this.generateFile(invoice);
      this.validate(this.platform.file(result.uri));
      await this.platform.share(result.uri, result.filename);
      this.platform.log('sharing completed');
      return result;
    });
  }
  print(invoice: InvoiceData) {
    return this.run(async () => {
      const result = await this.generateFile(invoice);
      await this.platform.print(result.uri);
    });
  }
}
