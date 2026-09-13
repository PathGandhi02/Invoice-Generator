import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../models/Database';
import type { Customer } from '../models/Customer';
import type { CustomerRepository } from './CustomerRepository';
import { customerSchema, validateCustomers } from '../schemas/customerSchema';

const columns = 'id,username,full_name,email,phone,address,package,expiry_date,last_recharge_date' as const;
export class CustomerAccessError extends Error {}
function fail(error: { code?: string } | null): never {
  if (error?.code === 'PGRST205' || error?.code === 'PGRST202' || error?.code === '42P01') {
    throw new CustomerAccessError('Live customer data is not set up yet. Use offline data or contact the owner.');
  }
  if (error?.code === '42501' || error?.code === 'PGRST301') {
    throw new CustomerAccessError('Sign in with an authorized owner account in Settings to access live customers.');
  }
  throw new CustomerAccessError('Unable to load customers. Check your internet connection.');
}

export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}
  private async request<T>(run: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try { return await run(controller.signal); } finally { clearTimeout(timer); }
  }
  async count(): Promise<number> {
    // A bounded GET preserves PostgREST's JSON errors. Some client versions
    // interpret an empty HEAD 404 response as a successful empty result.
    const { count, error } = await this.request(signal => this.client.from('customers').select('username', { count: 'exact' }).eq('is_active', true).limit(1).abortSignal(signal));
    if (error) fail(error);
    return count ?? 0;
  }
  async search(query: string): Promise<Customer[]> {
    const normalized = query.normalize('NFC').trim();
    if (Array.from(normalized).length < 2) return [];
    if (normalized.length > 150) return [];
    // RPC arguments are JSON values, never PostgREST .or() filter syntax.
    // The SQL function escapes LIKE wildcards and runs as the caller under RLS.
    const { data, error } = await this.request(signal => this.client.rpc('search_customers', { search_text: normalized, result_limit: 15 })
      .select(columns).abortSignal(signal));
    if (error) fail(error);
    return validateCustomers(data ?? []).customers;
  }
  async getByUsername(username: string): Promise<Customer | null> {
    const { data, error } = await this.request(signal => this.client.from('customers').select(columns).eq('username', username)
      .abortSignal(signal).maybeSingle());
    if (error) fail(error);
    if (!data) return null;
    const parsed = customerSchema.safeParse(data);
    if (!parsed.success) throw new CustomerAccessError('This customer record is incomplete. Enter their details manually.');
    return parsed.data;
  }
  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await this.request(signal => this.client.from('customers').select(columns).eq('id', id).abortSignal(signal).maybeSingle());
    if (error) fail(error);
    if (!data) return null;
    const parsed = customerSchema.safeParse(data);
    if (!parsed.success) throw new CustomerAccessError('This customer record is incomplete. Enter their details manually.');
    return parsed.data;
  }
  // Explicit bulk access remains available through the interface. Startup and
  // autocomplete use count/search, so they never download the entire table.
  async getAll(): Promise<Customer[]> {
    const all: Customer[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await this.request(signal => this.client.from('customers').select(columns).order('username').range(offset, offset + 999)
        .abortSignal(signal));
      if (error) fail(error);
      all.push(...validateCustomers(data ?? []).customers);
      if (!data || data.length < 1000) return all;
    }
  }
}
