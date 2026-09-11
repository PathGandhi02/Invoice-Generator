import type { InvoiceData } from '../models/Invoice';
import { calculateInvoice } from './invoiceCalculations';

export function buildUpiLink(invoice: InvoiceData): string {
  const values = {
    pa: invoice.upiId.trim(), pn: invoice.companyName,
    am: calculateInvoice(invoice).total.toFixed(2), cu: 'INR',
    tn: `${invoice.isPaid ? 'Receipt' : 'Invoice'}_${invoice.invoiceNumber}`,
  };
  return `upi://pay?${Object.entries(values).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}

export function canShowUpi(invoice: InvoiceData): boolean {
  return invoice.showQr && invoice.qrType === 'upi' && invoice.currencySymbol === '₹'
    && /^[\w.+-]+@[\w.-]+$/.test(invoice.upiId.trim());
}
