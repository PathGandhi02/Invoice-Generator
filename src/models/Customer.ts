export interface Customer {
  id?: string;
  username: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  package?: string | null;
  expiry_date?: string | null;
  last_recharge_date?: string | null;
}
