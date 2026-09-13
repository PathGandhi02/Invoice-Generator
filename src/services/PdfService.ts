import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { NativePdfPipeline, type NativePdfFile } from './pdf/NativePdfPipeline';

function adaptFile(file: File): NativePdfFile {
  return {
    get uri() { return file.uri; },
    get exists() { return file.exists; },
    get size() { return file.size; },
    header() { const handle = file.open(); try { return handle.readBytes(5); } finally { handle.close(); } },
    copy: destination => file.copy(new File(destination.uri)),
    delete: () => file.delete(),
  };
}
export const pdfService = new NativePdfPipeline({
  render: html => Print.printToFileAsync({ html, base64: false, width: 595, height: 842, margins: { top: 22, bottom: 22, left: 0, right: 0 } }),
  file: uri => adaptFile(new File(uri)),
  destination: filename => {
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    const directory = new Directory(Paths.document, 'invoices', unique);
    directory.create({ intermediates: true });
    return adaptFile(new File(directory, filename));
  },
  sharingAvailable: () => Sharing.isAvailableAsync(),
  share: (uri, filename) => Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename }),
  print: uri => Print.printAsync({ uri }),
  log: (event, details) => { if (__DEV__) console.info(`[PDF] ${event}`, details ?? {}); },
});
