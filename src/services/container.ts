import { JsonCustomerRepository } from '../repositories/JsonCustomerRepository';
import { LocalInvoiceRepository } from '../repositories/LocalInvoiceRepository';
import { CustomerService } from './CustomerService';
import { StorageService } from './StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace repositories here when authenticated Supabase storage is introduced.
// Screens know only the services/interfaces, never the JSON source.
export const storageService = new StorageService(AsyncStorage);
export const customerService = new CustomerService(new JsonCustomerRepository(
  async () => (await import('../data/customers.json')).default,
));
export const invoiceRepository = new LocalInvoiceRepository(storageService);
