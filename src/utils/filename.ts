export function invoiceFilename(invoice: { isPaid: boolean; invoiceNumber: string }): string {
  const number = invoice.invoiceNumber.normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\s]/g, '_')
    .replace(/\.+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 100);
  return `${invoice.isPaid ? 'Receipt' : 'Invoice'}_${number || 'untitled'}.pdf`;
}
