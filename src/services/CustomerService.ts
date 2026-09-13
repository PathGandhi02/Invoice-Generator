import type { CustomerRepository } from '../repositories/CustomerRepository';
import type { StorageService } from './StorageService';
export type CustomerSource = 'local' | 'supabase';
export class CustomerService {
  private snapshot: { source: CustomerSource; revision: number };
  private listeners = new Set<() => void>();
  private initialization?: Promise<void>;
  constructor(private readonly local: CustomerRepository, private readonly remote?: CustomerRepository, private readonly storage?: StorageService) {
    this.snapshot = { source: remote ? 'supabase' : 'local', revision: 0 };
  }
  get canUseLive() { return !!this.remote; }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  refresh = () => {
    this.snapshot = { ...this.snapshot, revision: this.snapshot.revision + 1 };
    this.listeners.forEach(listener => listener());
  };
  initialize() {
    if (!this.initialization) this.initialization = (async () => {
      const source = await this.storage?.get<CustomerSource>('customer-source').catch(() => null);
      if (source === 'local' && this.snapshot.source !== 'local') {
        this.snapshot = { source, revision: this.snapshot.revision + 1 };
        this.listeners.forEach(listener => listener());
      }
    })();
    return this.initialization;
  }
  async setSource(source: CustomerSource) {
    await this.initialize();
    if (source === 'supabase' && !this.remote) throw new Error('Live customer data is not configured.');
    await this.storage?.set('customer-source', source);
    this.snapshot = { source, revision: this.snapshot.revision + 1 };
    this.listeners.forEach(listener => listener());
  }
  private async repository() { await this.initialize(); return this.snapshot.source === 'supabase' && this.remote ? this.remote : this.local; }
  async count() { return (await this.repository()).count(); }
  async search(query: string) { return (await this.repository()).search(query); }
  async getByUsername(username: string) { return (await this.repository()).getByUsername(username); }
}
