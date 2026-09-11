import type { Customer } from '../models/Customer';
import type { CustomerRepository } from './CustomerRepository';
import { validateCustomers } from '../schemas/customerSchema';
import { normalizeSearch } from '../utils/search';

export class JsonCustomerRepository implements CustomerRepository {
  private initialization?: Promise<void>;
  private customers: Customer[] = [];
  private index: { customer: Customer; searchable: string }[] = [];
  private usernames = new Map<string, Customer>();

  constructor(private readonly source: () => Promise<unknown>, private readonly limit = 15) {}

  private load(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.source().then(source => {
        const result = validateCustomers(source);
        this.customers = result.customers;
        this.index = this.customers.map(customer => ({ customer, searchable: normalizeSearch([
          customer.full_name, customer.username, customer.email, customer.address,
        ].filter(Boolean).join(' ')) }));
        this.usernames = new Map(this.customers.map(customer => [customer.username, customer]));
        console.info(`Customers loaded: ${this.customers.length}. Invalid records skipped: ${result.invalid}. Duplicate usernames: ${result.duplicates}.`);
      }).catch(error => { this.initialization = undefined; throw error; });
    }
    return this.initialization;
  }

  async getAll(): Promise<Customer[]> {
    await this.load();
    return this.customers.map(customer => ({ ...customer }));
  }

  async search(query: string): Promise<Customer[]> {
    const normalized = normalizeSearch(query);
    if (Array.from(normalized).length < 2) return [];
    await this.load();
    const matches: Customer[] = [];
    for (const entry of this.index) {
      if (entry.searchable.includes(normalized)) matches.push({ ...entry.customer });
      if (matches.length >= this.limit) break;
    }
    return matches;
  }

  async getByUsername(username: string): Promise<Customer | null> {
    await this.load();
    const customer = this.usernames.get(username);
    return customer ? { ...customer } : null;
  }
}
