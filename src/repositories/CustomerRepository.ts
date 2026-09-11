import type { Customer } from '../models/Customer';
export interface CustomerRepository {
  getAll(): Promise<Customer[]>;
  search(query: string): Promise<Customer[]>;
  getByUsername(username: string): Promise<Customer | null>;
}
