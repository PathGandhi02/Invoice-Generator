import { z } from 'zod';
import { parseCalendarDate } from '../utils/dates';

const text = z.string().max(1000, 'Keep this under 1,000 characters.');
const required = z.string().trim().min(1, 'This field is required.').max(250);
const email = z.union([z.literal(''), z.email('Enter a valid email address.')]);
const money = z.number('Enter a valid amount.').finite().min(0, 'Amount cannot be negative.').max(999_999_999);
const date = z.string().refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !!parseCalendarDate(value), 'Use a valid date: YYYY-MM-DD.');
export const imageDataSchema = z.string().max(4_300_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).nullable();
export const accentSchema = z.string().regex(/^#[\da-fA-F]{6}$/, 'Use a six-digit hex color.');

// Drafts can be incomplete, but persisted values must still have the correct types.
export const draftSchema = z.object({
  id: required, companyName: text, address1: text, address2: text, address3: text,
  country: text, phone: text, email: text,
  customerUsername: text.optional(), customerName: text, customerPhone: text,
  customerAddress: text, customerEmail: text, customerPackage: text.optional(),
  customerExpiryDate: text.optional(), customerLastRechargeDate: text.optional(),
  invoiceNumber: text, startDate: text, dueDate: text, planName: text, planSubtext: text,
  timePeriod: text, price: z.number().finite(), currencySymbol: text,
  isPaid: z.boolean(), paymentMethod: text, showQr: z.boolean(),
  qrType: z.enum(['upi', 'custom']), upiId: text, discount: z.number().finite(),
  installationCharges: z.number().finite(), customLogo: imageDataSchema,
  customQr: imageDataSchema, accentColor: accentSchema,
});

export const invoiceSchema = draftSchema.extend({
  companyName: required, customerName: required, customerEmail: email, email,
  invoiceNumber: required.max(100), startDate: date, dueDate: date,
  planName: required, timePeriod: required, currencySymbol: required.max(8),
  price: money, installationCharges: money,
  discount: z.number('Enter a valid discount.').finite().min(0).max(100, 'Discount must be between 0 and 100%.'),
}).superRefine((data, ctx) => {
  if (data.dueDate < data.startDate) ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Date cannot be before the start date.' });
  if (data.showQr && data.qrType === 'upi') {
    if (!/^[\w.+-]+@[\w.-]+$/.test(data.upiId.trim())) ctx.addIssue({ code: 'custom', path: ['upiId'], message: 'Enter a valid UPI ID.' });
    if (data.currencySymbol !== '₹') ctx.addIssue({ code: 'custom', path: ['currencySymbol'], message: 'UPI payments use INR. Select ₹ or turn off the UPI QR.' });
  }
  if (data.showQr && data.qrType === 'custom' && !data.customQr) ctx.addIssue({ code: 'custom', path: ['customQr'], message: 'Choose a QR image or turn off QR.' });
});

export const settingsSchema = z.object({
  companyName: required, address1: text, address2: text, address3: text,
  country: required.max(3), phone: text, email,
  upiId: text, currencySymbol: required.max(8), defaultPlanName: required,
  defaultTimePeriod: required, defaultInstallationCharges: money,
  accentColor: accentSchema, logo: imageDataSchema,
});

export const historyRecordSchema = z.object({
  id: required, invoiceNumber: required, customerUsername: text.optional(),
  customerName: required, date, total: z.number().finite().min(0).max(1_999_999_998), isPaid: z.boolean(), savedAt: z.iso.datetime(),
  data: invoiceSchema,
});
