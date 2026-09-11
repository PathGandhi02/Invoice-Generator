import type { InvoiceData } from '../models/Invoice';
import { invoiceSchema } from '../schemas/invoiceSchema';
import { invoiceFilename } from '../utils/filename';
import { buildInvoiceHtml, buildInvoiceMarkup, invoiceCss } from './pdf/invoiceHtml';
import type { PdfAdapter, PdfResult } from './pdf/types';

async function waitForImages(root: HTMLElement | Document) {
  await Promise.all(Array.from(root.querySelectorAll('img')).map(image => image.decode().catch(() => {
    throw new Error('An invoice image could not be loaded. Replace the image and try again.');
  })));
}

class WebPdfService implements PdfAdapter {
  private async render(invoice: InvoiceData): Promise<Blob> {
    const valid = invoiceSchema.parse(invoice);
    const html2pdf = (await import('html2pdf.js')).default;
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:white;';
    host.innerHTML = `<style>${invoiceCss}</style>${buildInvoiceMarkup(valid)}`;
    document.body.appendChild(host);
    try {
      await document.fonts.ready;
      await waitForImages(host);
      const paper = host.querySelector<HTMLElement>('.gi-paper')!;
      const options = {
        margin: [8, 0, 8, 0] as [number, number, number, number], filename: invoiceFilename(valid),
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: false, logging: false, windowWidth: 1000 },
        jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.gi-header', '.gi-banner', '.gi-footer', '.gi-note', 'tr'] },
      };
      const blob = await html2pdf().set(options).from(paper).outputPdf('blob');
      return blob as Blob;
    } finally { host.remove(); }
  }
  private download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  async generate(invoice: InvoiceData): Promise<PdfResult> {
    const blob = await this.render(invoice);
    const filename = invoiceFilename(invoice);
    this.download(blob, filename);
    return { filename };
  }
  async share(invoice: InvoiceData): Promise<PdfResult> {
    const blob = await this.render(invoice);
    const filename = invoiceFilename(invoice);
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: filename }); }
      catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        this.download(blob, filename);
      }
    } else this.download(blob, filename);
    return { filename };
  }
  async print(invoice: InvoiceData): Promise<void> {
    const valid = invoiceSchema.parse(invoice);
    const frame = document.createElement('iframe');
    frame.title = 'Invoice print document';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;';
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('The print document did not load. Try Export PDF.')), 15_000);
      frame.onload = () => { clearTimeout(timer); resolve(); };
    });
    frame.srcdoc = buildInvoiceHtml(valid);
    document.body.appendChild(frame);
    try {
      await ready;
      const doc = frame.contentDocument;
      if (!doc || !frame.contentWindow) throw new Error('Printing is unavailable in this browser. Use Export PDF.');
      await doc.fonts.ready;
      await waitForImages(doc);
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } finally { setTimeout(() => frame.remove(), 60_000); }
  }
}
export const pdfService: PdfAdapter = new WebPdfService();
