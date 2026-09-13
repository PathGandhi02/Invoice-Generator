import type { Customer } from '../models/Customer';
export interface CustomerRepository {
  getById?(id: string): Promise<Customer | null>;
  count(): Promise<number>;
  getAll(): Promise<Customer[]>;
  search(query: string): Promise<Customer[]>;
  getByUsername(username: string): Promise<Customer | null>;
}
