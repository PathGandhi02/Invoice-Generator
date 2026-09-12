import createQrCode from 'qrcode-generator';
import type { InvoiceData } from '../../models/Invoice';
import { printAssets } from '../../data/printAssets';
import { calculateInvoice } from '../../utils/invoiceCalculations';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { buildUpiLink, canShowUpi } from '../../utils/payment';
import { invoiceFilename } from '../../utils/filename';
import { accentSchema, imageDataSchema } from '../../schemas/invoiceSchema';

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function safeImage(value: string | null): string | null {
  const parsed = imageDataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function buildInvoiceMarkup(invoice: InvoiceData): string {
  const e = escapeHtml;
  const totals = calculateInvoice(invoice);
  const money = (value: number) => e(formatCurrency(value, invoice.currencySymbol));
  const accent = accentSchema.safeParse(invoice.accentColor).success ? invoice.accentColor : '#dbeafe';
  const logo = safeImage(invoice.customLogo) || printAssets.logo;
  let qrImage: string | null = null;
  if (canShowUpi(invoice)) {
    const qr = createQrCode(0, 'M');
    qr.addData(buildUpiLink(invoice));
    qr.make();
    qrImage = qr.createDataURL(4, 12);
  } else if (invoice.showQr && invoice.qrType === 'custom') qrImage = safeImage(invoice.customQr);
  const contact = [invoice.address1, invoice.address2, invoice.address3, invoice.country, invoice.phone, invoice.email].filter(Boolean).map(line => `<div>${e(line)}</div>`).join('');
  const customer = [invoice.customerUsername ? `@${invoice.customerUsername}` : '', invoice.customerPhone.trim() === '+91' ? '' : invoice.customerPhone, invoice.customerAddress, invoice.customerEmail].filter(Boolean).map(line => `<div class="gi-detail">${e(line)}</div>`).join('');
  return `<article class="gi-paper">
    ${invoice.isPaid ? `<div class="gi-stamp"><strong>PAID</strong><span>${e(formatDate(invoice.dueDate))}</span></div>` : ''}
    <header class="gi-header"><img class="gi-logo" src="${logo}" alt="Business logo"/><div class="gi-business"><h1>${invoice.isPaid ? 'Receipt' : 'Invoice'}</h1><h2>${e(invoice.companyName)}</h2>${contact}</div></header>
    <section class="gi-banner" style="background:${accent}"><div class="gi-bill"><div class="gi-label">BILL TO</div><h3>${e(invoice.customerName)}</h3>${customer}</div><div class="gi-meta">
      <div class="gi-label">${invoice.isPaid ? 'Receipt' : 'Invoice'} #</div><strong>${e(invoice.invoiceNumber)}</strong>
      <div class="gi-label">Start date</div><strong>${e(formatDate(invoice.startDate))}</strong>
      <div class="gi-label">${invoice.isPaid ? 'Payment date' : 'Payment due date'}</div><strong>${e(formatDate(invoice.dueDate))}</strong></div></section>
    <table class="gi-items"><thead><tr><th>PLAN NAME</th><th>TIME PERIOD</th><th>AMOUNT</th></tr></thead><tbody><tr><td><strong>${e(invoice.planName)}</strong>${invoice.planSubtext ? `<p>${e(invoice.planSubtext)}</p>` : ''}</td><td>${e(invoice.timePeriod)}</td><td><strong>${money(totals.subtotal)}</strong></td></tr></tbody></table>
    <section class="gi-footer"><div class="gi-payment">${qrImage ? `<img class="gi-qr" src="${qrImage}" alt="Payment QR"/><div class="gi-label">${invoice.isPaid ? 'PAYMENT QR' : 'SCAN TO PAY'}</div><p>${invoice.isPaid ? 'Payment received. Thank you.' : 'Pay securely with any UPI app.'}</p>${invoice.qrType === 'upi' ? `<p>${e(invoice.upiId)}</p>` : ''}` : ''}${invoice.paymentMethod ? `<div class="gi-label">PAYMENT METHOD</div><p>${e(invoice.paymentMethod)}</p>` : ''}</div>
    <div class="gi-totals"><div><span>Subtotal</span><span>${money(totals.subtotal)}</span></div><div><span>Installation charges</span><span>${money(totals.installationFee)}</span></div><div><span>Discount (${totals.discountPercent}%)</span><span>−${money(totals.discountAmount)}</span></div><div><span>Total</span><strong>${money(totals.total)}</strong></div><section class="gi-highlight" style="background:${accent}"><span class="gi-label">${invoice.isPaid ? 'AMOUNT PAID' : 'AMOUNT DUE'}</span><strong>${money(totals.total)}</strong></section></div></section>
    <footer class="gi-note"><p>Thank you for choosing ${e(invoice.companyName)}.</p>Note: This is a computer generated invoice and does not require a signature.</footer>
  </article>`;
}

export const invoiceCss = `
@font-face{font-family:GIInter;src:url(data:font/ttf;base64,${printAssets.regular}) format('truetype');font-weight:400}
@font-face{font-family:GIInter;src:url(data:font/ttf;base64,${printAssets.bold}) format('truetype');font-weight:600 900}
.gi-paper,.gi-paper *{box-sizing:border-box}.gi-paper{position:relative;width:794px;min-height:1045px;padding:42px;background:#fff;color:#1a1a1a;font:12px/1.55 GIInter,Arial,sans-serif;overflow-wrap:anywhere;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.gi-header{display:flex;justify-content:space-between;gap:36px;margin-bottom:34px;break-inside:avoid}.gi-logo{width:200px;height:125px;object-fit:contain;margin-top:18px}.gi-business{text-align:right;max-width:390px;color:#555;font-size:11px}.gi-business h1{font-size:46px;line-height:1.2;color:#172236;margin:0 0 20px;font-weight:600}.gi-business h2{font-size:17px;color:#1a1a1a;margin:0 0 9px}
.gi-banner{display:flex;gap:25px;padding:24px;border-radius:4px;margin-bottom:30px;break-inside:avoid}.gi-bill{flex:1}.gi-label{color:#475569;font-size:10px;font-weight:600;letter-spacing:.6px}.gi-bill h3{font-size:17px;margin:7px 0}.gi-detail{color:#555;margin-top:5px;white-space:pre-wrap}.gi-meta{width:230px;display:flex;flex-direction:column;gap:4px}.gi-meta strong{margin-bottom:8px;font-size:12px}
.gi-items{border-collapse:collapse;width:100%;margin-bottom:30px;table-layout:fixed}.gi-items th{text-align:left;font-size:10px;letter-spacing:.6px;color:#475569;padding:0 0 14px;border-bottom:2px solid #263448}.gi-items td{padding:24px 0;vertical-align:top;border-bottom:1px solid #e5e7eb}.gi-items th:first-child{width:55%}.gi-items td:first-child{padding-right:20px}.gi-items th:nth-child(2),.gi-items td:nth-child(2){width:22%;text-align:center}.gi-items th:last-child,.gi-items td:last-child{width:23%;text-align:right}.gi-items p{font-size:12px;color:#555;white-space:pre-wrap;margin:8px 0 0}.gi-items tr{break-inside:avoid}
.gi-footer{display:flex;gap:30px;justify-content:space-between;break-inside:avoid}.gi-payment{flex:1;max-width:280px}.gi-qr{display:block;width:150px;height:150px;object-fit:contain;border:1px solid #e5e7eb;border-radius:6px;padding:5px;margin-bottom:12px}.gi-payment p{font-size:10px;color:#64748b;margin:7px 0 12px}.gi-totals{width:292px}.gi-totals>div{display:flex;justify-content:space-between;gap:10px;margin-bottom:16px;color:#555}.gi-totals>div>span:last-child,.gi-totals strong{color:#1a1a1a}.gi-highlight{padding:20px;margin-top:22px;border-radius:4px;display:flex;flex-direction:column;gap:7px}.gi-highlight strong{font-size:29px;line-height:1.4;color:#172236}
.gi-note{margin-top:54px;padding-top:17px;border-top:1px solid #e5e7eb;color:#64748b;font-size:10px;break-inside:avoid}.gi-note p{color:#475569;font-size:11px;margin:0 0 9px}.gi-stamp{position:absolute;left:270px;top:500px;transform:rotate(-18deg);opacity:.75;border:5px solid #169362;border-radius:10px;color:#168359;padding:7px 21px;display:flex;align-items:center;flex-direction:column}.gi-stamp strong{font-size:43px;letter-spacing:7px;line-height:1.4}.gi-stamp span{font-size:11px;letter-spacing:2px;font-weight:600}
@page{size:A4;margin:8mm 0} @media print{html,body{margin:0;padding:0;background:white}.gi-paper{width:210mm;min-height:0}.gi-paper thead{display:table-header-group}}
`;

export function buildInvoiceHtml(invoice: InvoiceData): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=794"/><title>${escapeHtml(invoiceFilename(invoice).replace(/\.pdf$/, ''))}</title><style>${invoiceCss}</style></head><body style="margin:0;background:white">${buildInvoiceMarkup(invoice)}</body></html>`;
}
