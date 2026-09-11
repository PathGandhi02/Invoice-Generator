import type { CustomerRepository } from '../repositories/CustomerRepository';
export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}
  async count() { return (await this.repository.getAll()).length; }
  search(query: string) { return this.repository.search(query); }
  getByUsername(username: string) { return this.repository.getByUsername(username); }
}
