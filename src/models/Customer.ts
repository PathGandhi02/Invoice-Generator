export interface Customer {
  username: string;
  full_name: string;
  email?: string | null;
  address?: string | null;
  package?: string | null;
  expiry_date?: string | null;
  last_recharge_date?: string | null;
}
