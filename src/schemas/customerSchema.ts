import { z } from 'zod';
import type { Customer } from '../models/Customer';

const optionalText = z.string().nullish();
export const customerSchema = z.object({
  id: z.uuid().optional(),
  username: z.string().refine(value => value.trim().length > 0),
  full_name: z.string().refine(value => value.trim().length > 0),
  email: optionalText,
  phone: optionalText,
  address: optionalText,
  package: optionalText,
  expiry_date: optionalText,
  last_recharge_date: optionalText,
});

export function validateCustomers(source: unknown) {
  if (!Array.isArray(source)) throw new Error('The customer file must contain a JSON array.');
  const customers: Customer[] = [];
  const usernames = new Set<string>();
  let invalid = 0;
  let duplicates = 0;
  for (const record of source) {
    const result = customerSchema.safeParse(record);
    if (!result.success) { invalid++; continue; }
    if (usernames.has(result.data.username)) { duplicates++; continue; }
    usernames.add(result.data.username);
    customers.push(result.data);
  }
  return { customers, total: source.length, invalid, duplicates };
}
