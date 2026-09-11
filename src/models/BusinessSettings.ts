export interface BusinessSettings {
  companyName: string;
  address1: string;
  address2: string;
  address3: string;
  country: string;
  phone: string;
  email: string;
  upiId: string;
  currencySymbol: string;
  defaultPlanName: string;
  defaultTimePeriod: string;
  defaultInstallationCharges: number;
  accentColor: string;
  logo: string | null;
}

export const defaultSettings: BusinessSettings = {
  companyName: 'Maruti Giga Fiber',
  address1: 'Ajay Electronics',
  address2: 'Near Sangh Idar',
  address3: 'Idar Gujarat 383430',
  country: 'IN',
  phone: '9925559411',
  email: 'marutigigafiber@gmail.com',
  upiId: 'manish10gandhi-1@okhdfcbank',
  currencySymbol: '₹',
  defaultPlanName: '100 Mbps Unlimited',
  defaultTimePeriod: '12 months',
  defaultInstallationCharges: 0,
  accentColor: '#dbeafe',
  logo: null,
};
