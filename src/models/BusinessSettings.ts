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
  companyName: '',
  address1: '',
  address2: '',
  address3: '',
  country: 'IN',
  phone: '',
  email: '',
  upiId: '',
  currencySymbol: '₹',
  defaultPlanName: '',
  defaultTimePeriod: '',
  defaultInstallationCharges: 0,
  accentColor: '#dbeafe',
  logo: null,
};
