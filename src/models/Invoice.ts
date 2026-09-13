export interface InvoiceData {
  id: string;
  companyName: string;
  address1: string;
  address2: string;
  address3: string;
  country: string;
  phone: string;
  email: string;
  customerUsername?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  customerPackage?: string;
  customerExpiryDate?: string;
  customerLastRechargeDate?: string;
  invoiceNumber: string;
  startDate: string;
  dueDate: string;
  planName: string;
  planSubtext: string;
  timePeriod: string;
  price: number;
  currencySymbol: string;
  isPaid: boolean;
  paymentMethod: string;
  showQr: boolean;
  qrType: 'upi' | 'custom';
  upiId: string;
  discount: number;
  installationCharges: number;
  customLogo: string | null;
  customQr: string | null;
  accentColor: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerUsername?: string;
  customerName: string;
  date: string;
  total: number;
  isPaid: boolean;
  savedAt: string;
  data: InvoiceData;
}
