import type { Customer } from '../models/Customer';
import type { BusinessSettings } from '../models/BusinessSettings';
import type { Invoice, InvoiceData } from '../models/Invoice';
import { daysFromToday, today } from '../utils/dates';
import { calculateInvoice } from '../utils/invoiceCalculations';

export function createDraft(settings: BusinessSettings): InvoiceData {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id, companyName: settings.companyName, address1: settings.address1,
    address2: settings.address2, address3: settings.address3, country: settings.country,
    phone: settings.phone, email: settings.email, upiId: settings.upiId,
    customerName: '', customerPhone: '+91 ', customerAddress: '', customerEmail: '',
    invoiceNumber: `${new Date().getFullYear()}/${id.toUpperCase()}`,
    startDate: today(), dueDate: daysFromToday(3), planName: settings.defaultPlanName,
    planSubtext: '', timePeriod: settings.defaultTimePeriod, price: 0,
    currencySymbol: settings.currencySymbol, isPaid: false, paymentMethod: '',
    showQr: true, qrType: 'upi', discount: 0,
    installationCharges: settings.defaultInstallationCharges, customLogo: settings.logo,
    customQr: null, accentColor: settings.accentColor,
  };
}

export function autofillCustomer(invoice: InvoiceData, customer: Customer): InvoiceData {
  return {
    ...invoice, customerUsername: customer.username, customerName: customer.full_name,
    customerEmail: customer.email || '', customerAddress: customer.address || '',
    customerPhone: '+91 ', timePeriod: customer.package || '',
    customerPackage: customer.package || '', customerExpiryDate: customer.expiry_date || '',
    customerLastRechargeDate: customer.last_recharge_date || '',
  };
}

export function clearCustomer(invoice: InvoiceData): InvoiceData {
  return {
    ...invoice, customerUsername: undefined, customerName: '', customerEmail: '',
    customerAddress: '', customerPhone: '+91 ', customerPackage: undefined,
    customerExpiryDate: undefined, customerLastRechargeDate: undefined, timePeriod: '',
  };
}

export function toHistoryRecord(data: InvoiceData): Invoice {
  return {
    id: data.id, invoiceNumber: data.invoiceNumber, customerUsername: data.customerUsername,
    customerName: data.customerName, date: data.startDate, total: calculateInvoice(data).total,
    isPaid: data.isPaid, savedAt: new Date().toISOString(), data: { ...data },
  };
}
