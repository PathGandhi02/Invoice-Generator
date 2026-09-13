-- Upgrade the earlier customer-only schema without deleting customer records.
-- Run after 202609120001_customers.sql. See docs/SUPABASE-DATABASE.md.
-- No owner is guessed: existing customers retain NULL owner_id and are hidden by RLS.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  username text not null,
  full_name text not null,
  email text,
  phone text,
  address text,
  package text,
  expiry_date timestamp without time zone,
  last_recharge_date timestamp without time zone,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Add missing columns safely; incompatible existing required data aborts the transaction.
alter table public.customers add column if not exists id uuid primary key default gen_random_uuid();
alter table public.customers add column if not exists owner_id uuid;
alter table public.customers add column if not exists username text not null;
alter table public.customers add column if not exists full_name text not null;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists package text;
alter table public.customers add column if not exists expiry_date timestamp without time zone;
alter table public.customers add column if not exists last_recharge_date timestamp without time zone;
alter table public.customers add column if not exists is_active boolean not null default true;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  company_name text not null default 'Maruti Giga Fiber',
  address1 text,
  address2 text,
  address3 text,
  country text default 'IN',
  phone text,
  email text,
  upi_id text,
  currency_symbol text not null default '₹',
  default_plan_name text,
  default_time_period text,
  default_installation_charge numeric(12,2) not null default 0,
  accent_color text not null default '#f3f4f6',
  logo_path text,
  show_qr boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Add missing columns safely; incompatible existing required data aborts the transaction.
alter table public.business_settings add column if not exists id uuid primary key default gen_random_uuid();
alter table public.business_settings add column if not exists owner_id uuid not null;
alter table public.business_settings add column if not exists company_name text not null default 'Maruti Giga Fiber';
alter table public.business_settings add column if not exists address1 text;
alter table public.business_settings add column if not exists address2 text;
alter table public.business_settings add column if not exists address3 text;
alter table public.business_settings add column if not exists country text default 'IN';
alter table public.business_settings add column if not exists phone text;
alter table public.business_settings add column if not exists email text;
alter table public.business_settings add column if not exists upi_id text;
alter table public.business_settings add column if not exists currency_symbol text not null default '₹';
alter table public.business_settings add column if not exists default_plan_name text;
alter table public.business_settings add column if not exists default_time_period text;
alter table public.business_settings add column if not exists default_installation_charge numeric(12,2) not null default 0;
alter table public.business_settings add column if not exists accent_color text not null default '#f3f4f6';
alter table public.business_settings add column if not exists logo_path text;
alter table public.business_settings add column if not exists show_qr boolean not null default true;
alter table public.business_settings add column if not exists created_at timestamptz not null default now();
alter table public.business_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  customer_id uuid,
  invoice_number text not null,
  document_type text not null default 'invoice',
  status text not null default 'draft',
  start_date date,
  due_date date,
  payment_date date,
  customer_username text,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_address text,
  customer_package text,
  customer_expiry_date timestamp without time zone,
  customer_last_recharge_date timestamp without time zone,
  currency_symbol text not null default '₹',
  subtotal numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  installation_charges numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  is_paid boolean not null default false,
  payment_method text,
  paid_at timestamp without time zone,
  show_qr boolean not null default true,
  qr_type text not null default 'upi',
  upi_id text,
  custom_qr_path text,
  accent_color text default '#f3f4f6',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Add missing columns safely; incompatible existing required data aborts the transaction.
alter table public.invoices add column if not exists id uuid primary key default gen_random_uuid();
alter table public.invoices add column if not exists owner_id uuid not null;
alter table public.invoices add column if not exists customer_id uuid;
alter table public.invoices add column if not exists invoice_number text not null;
alter table public.invoices add column if not exists document_type text not null default 'invoice';
alter table public.invoices add column if not exists status text not null default 'draft';
alter table public.invoices add column if not exists start_date date;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists payment_date date;
alter table public.invoices add column if not exists customer_username text;
alter table public.invoices add column if not exists customer_name text not null;
alter table public.invoices add column if not exists customer_phone text;
alter table public.invoices add column if not exists customer_email text;
alter table public.invoices add column if not exists customer_address text;
alter table public.invoices add column if not exists customer_package text;
alter table public.invoices add column if not exists customer_expiry_date timestamp without time zone;
alter table public.invoices add column if not exists customer_last_recharge_date timestamp without time zone;
alter table public.invoices add column if not exists currency_symbol text not null default '₹';
alter table public.invoices add column if not exists subtotal numeric(12,2) not null default 0;
alter table public.invoices add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.invoices add column if not exists discount_amount numeric(12,2) not null default 0;
alter table public.invoices add column if not exists installation_charges numeric(12,2) not null default 0;
alter table public.invoices add column if not exists total_amount numeric(12,2) not null default 0;
alter table public.invoices add column if not exists is_paid boolean not null default false;
alter table public.invoices add column if not exists payment_method text;
alter table public.invoices add column if not exists paid_at timestamp without time zone;
alter table public.invoices add column if not exists show_qr boolean not null default true;
alter table public.invoices add column if not exists qr_type text not null default 'upi';
alter table public.invoices add column if not exists upi_id text;
alter table public.invoices add column if not exists custom_qr_path text;
alter table public.invoices add column if not exists accent_color text default '#f3f4f6';
alter table public.invoices add column if not exists notes text;
alter table public.invoices add column if not exists created_at timestamptz not null default now();
alter table public.invoices add column if not exists updated_at timestamptz not null default now();

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  owner_id uuid not null,
  plan_name text not null,
  description text,
  time_period text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
-- Add missing columns safely; incompatible existing required data aborts the transaction.
alter table public.invoice_items add column if not exists id uuid primary key default gen_random_uuid();
alter table public.invoice_items add column if not exists invoice_id uuid not null;
alter table public.invoice_items add column if not exists owner_id uuid not null;
alter table public.invoice_items add column if not exists plan_name text not null;
alter table public.invoice_items add column if not exists description text;
alter table public.invoice_items add column if not exists time_period text;
alter table public.invoice_items add column if not exists quantity numeric(10,2) not null default 1;
alter table public.invoice_items add column if not exists unit_price numeric(12,2) not null default 0;
alter table public.invoice_items add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.invoice_items add column if not exists line_total numeric(12,2) not null default 0;
alter table public.invoice_items add column if not exists sort_order integer not null default 0;
alter table public.invoice_items add column if not exists created_at timestamptz not null default now();

-- Fail instead of silently reinterpreting dates or coercing existing production data.
do $$
declare mismatch text;
begin
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.customers.id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='owner_id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.customers.owner_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='username' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.customers.username: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='full_name' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.customers.full_name: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='email' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.customers.email: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='phone' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.customers.phone: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='address' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.customers.address: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='package' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.customers.package: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='expiry_date' and not a.attisdropped) <> 'timestamp without time zone' then raise exception 'Incompatible column public.customers.expiry_date: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='last_recharge_date' and not a.attisdropped) <> 'timestamp without time zone' then raise exception 'Incompatible column public.customers.last_recharge_date: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='is_active' and not a.attisdropped) <> 'boolean' then raise exception 'Incompatible column public.customers.is_active: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='created_at' and not a.attisdropped) <> 'timestamp with time zone' then raise exception 'Incompatible column public.customers.created_at: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.customers'::regclass and a.attname='updated_at' and not a.attisdropped) <> 'timestamp with time zone' then raise exception 'Incompatible column public.customers.updated_at: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.business_settings.id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='owner_id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.business_settings.owner_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='company_name' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.company_name: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='address1' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.address1: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='address2' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.address2: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='address3' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.address3: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='country' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.country: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='phone' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.phone: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='email' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.email: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='upi_id' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.upi_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='currency_symbol' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.currency_symbol: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='default_plan_name' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.default_plan_name: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='default_time_period' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.default_time_period: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='default_installation_charge' and not a.attisdropped) <> 'numeric(12,2)' then raise exception 'Incompatible column public.business_settings.default_installation_charge: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='accent_color' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.accent_color: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='logo_path' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.business_settings.logo_path: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='show_qr' and not a.attisdropped) <> 'boolean' then raise exception 'Incompatible column public.business_settings.show_qr: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='created_at' and not a.attisdropped) <> 'timestamp with time zone' then raise exception 'Incompatible column public.business_settings.created_at: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.business_settings'::regclass and a.attname='updated_at' and not a.attisdropped) <> 'timestamp with time zone' then raise exception 'Incompatible column public.business_settings.updated_at: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.invoices.id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='owner_id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.invoices.owner_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.invoices.customer_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='invoice_number' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.invoice_number: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='document_type' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.document_type: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='status' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.status: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='start_date' and not a.attisdropped) <> 'date' then raise exception 'Incompatible column public.invoices.start_date: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='due_date' and not a.attisdropped) <> 'date' then raise exception 'Incompatible column public.invoices.due_date: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='payment_date' and not a.attisdropped) <> 'date' then raise exception 'Incompatible column public.invoices.payment_date: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_username' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.customer_username: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_name' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.customer_name: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_phone' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.customer_phone: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_email' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.customer_email: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_address' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.customer_address: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_package' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.customer_package: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_expiry_date' and not a.attisdropped) <> 'timestamp without time zone' then raise exception 'Incompatible column public.invoices.customer_expiry_date: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='customer_last_recharge_date' and not a.attisdropped) <> 'timestamp without time zone' then raise exception 'Incompatible column public.invoices.customer_last_recharge_date: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='currency_symbol' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.currency_symbol: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='subtotal' and not a.attisdropped) <> 'numeric(12,2)' then raise exception 'Incompatible column public.invoices.subtotal: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='discount_percent' and not a.attisdropped) <> 'numeric(5,2)' then raise exception 'Incompatible column public.invoices.discount_percent: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='discount_amount' and not a.attisdropped) <> 'numeric(12,2)' then raise exception 'Incompatible column public.invoices.discount_amount: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='installation_charges' and not a.attisdropped) <> 'numeric(12,2)' then raise exception 'Incompatible column public.invoices.installation_charges: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='total_amount' and not a.attisdropped) <> 'numeric(12,2)' then raise exception 'Incompatible column public.invoices.total_amount: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='is_paid' and not a.attisdropped) <> 'boolean' then raise exception 'Incompatible column public.invoices.is_paid: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='payment_method' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.payment_method: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='paid_at' and not a.attisdropped) <> 'timestamp without time zone' then raise exception 'Incompatible column public.invoices.paid_at: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='show_qr' and not a.attisdropped) <> 'boolean' then raise exception 'Incompatible column public.invoices.show_qr: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='qr_type' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.qr_type: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='upi_id' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.upi_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='custom_qr_path' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.custom_qr_path: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='accent_color' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.accent_color: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='notes' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoices.notes: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='created_at' and not a.attisdropped) <> 'timestamp with time zone' then raise exception 'Incompatible column public.invoices.created_at: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoices'::regclass and a.attname='updated_at' and not a.attisdropped) <> 'timestamp with time zone' then raise exception 'Incompatible column public.invoices.updated_at: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.invoice_items.id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='invoice_id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.invoice_items.invoice_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='owner_id' and not a.attisdropped) <> 'uuid' then raise exception 'Incompatible column public.invoice_items.owner_id: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='plan_name' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoice_items.plan_name: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='description' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoice_items.description: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='time_period' and not a.attisdropped) <> 'text' then raise exception 'Incompatible column public.invoice_items.time_period: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='quantity' and not a.attisdropped) <> 'numeric(10,2)' then raise exception 'Incompatible column public.invoice_items.quantity: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='unit_price' and not a.attisdropped) <> 'numeric(12,2)' then raise exception 'Incompatible column public.invoice_items.unit_price: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='discount_percent' and not a.attisdropped) <> 'numeric(5,2)' then raise exception 'Incompatible column public.invoice_items.discount_percent: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='line_total' and not a.attisdropped) <> 'numeric(12,2)' then raise exception 'Incompatible column public.invoice_items.line_total: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='sort_order' and not a.attisdropped) <> 'integer' then raise exception 'Incompatible column public.invoice_items.sort_order: inspect and migrate explicitly before retrying.'; end if;
  if (select format_type(a.atttypid,a.atttypmod) from pg_attribute a where a.attrelid='public.invoice_items'::regclass and a.attname='created_at' and not a.attisdropped) <> 'timestamp with time zone' then raise exception 'Incompatible column public.invoice_items.created_at: inspect and migrate explicitly before retrying.'; end if;
end $$;
alter table public.customers alter column id set not null;
alter table public.customers alter column id set default gen_random_uuid();
alter table public.customers alter column username set not null;
alter table public.customers alter column full_name set not null;
alter table public.customers alter column is_active set not null;
alter table public.customers alter column is_active set default true;
alter table public.customers alter column created_at set not null;
alter table public.customers alter column created_at set default now();
alter table public.customers alter column updated_at set not null;
alter table public.customers alter column updated_at set default now();
alter table public.business_settings alter column id set not null;
alter table public.business_settings alter column id set default gen_random_uuid();
alter table public.business_settings alter column owner_id set not null;
alter table public.business_settings alter column company_name set not null;
alter table public.business_settings alter column company_name set default 'Maruti Giga Fiber';
alter table public.business_settings alter column country set default 'IN';
alter table public.business_settings alter column currency_symbol set not null;
alter table public.business_settings alter column currency_symbol set default '₹';
alter table public.business_settings alter column default_installation_charge set not null;
alter table public.business_settings alter column default_installation_charge set default 0;
alter table public.business_settings alter column accent_color set not null;
alter table public.business_settings alter column accent_color set default '#f3f4f6';
alter table public.business_settings alter column show_qr set not null;
alter table public.business_settings alter column show_qr set default true;
alter table public.business_settings alter column created_at set not null;
alter table public.business_settings alter column created_at set default now();
alter table public.business_settings alter column updated_at set not null;
alter table public.business_settings alter column updated_at set default now();
alter table public.invoices alter column id set not null;
alter table public.invoices alter column id set default gen_random_uuid();
alter table public.invoices alter column owner_id set not null;
alter table public.invoices alter column invoice_number set not null;
alter table public.invoices alter column document_type set not null;
alter table public.invoices alter column document_type set default 'invoice';
alter table public.invoices alter column status set not null;
alter table public.invoices alter column status set default 'draft';
alter table public.invoices alter column customer_name set not null;
alter table public.invoices alter column currency_symbol set not null;
alter table public.invoices alter column currency_symbol set default '₹';
alter table public.invoices alter column subtotal set not null;
alter table public.invoices alter column subtotal set default 0;
alter table public.invoices alter column discount_percent set not null;
alter table public.invoices alter column discount_percent set default 0;
alter table public.invoices alter column discount_amount set not null;
alter table public.invoices alter column discount_amount set default 0;
alter table public.invoices alter column installation_charges set not null;
alter table public.invoices alter column installation_charges set default 0;
alter table public.invoices alter column total_amount set not null;
alter table public.invoices alter column total_amount set default 0;
alter table public.invoices alter column is_paid set not null;
alter table public.invoices alter column is_paid set default false;
alter table public.invoices alter column show_qr set not null;
alter table public.invoices alter column show_qr set default true;
alter table public.invoices alter column qr_type set not null;
alter table public.invoices alter column qr_type set default 'upi';
alter table public.invoices alter column accent_color set default '#f3f4f6';
alter table public.invoices alter column created_at set not null;
alter table public.invoices alter column created_at set default now();
alter table public.invoices alter column updated_at set not null;
alter table public.invoices alter column updated_at set default now();
alter table public.invoice_items alter column id set not null;
alter table public.invoice_items alter column id set default gen_random_uuid();
alter table public.invoice_items alter column invoice_id set not null;
alter table public.invoice_items alter column owner_id set not null;
alter table public.invoice_items alter column plan_name set not null;
alter table public.invoice_items alter column quantity set not null;
alter table public.invoice_items alter column quantity set default 1;
alter table public.invoice_items alter column unit_price set not null;
alter table public.invoice_items alter column unit_price set default 0;
alter table public.invoice_items alter column discount_percent set not null;
alter table public.invoice_items alter column discount_percent set default 0;
alter table public.invoice_items alter column line_total set not null;
alter table public.invoice_items alter column line_total set default 0;
alter table public.invoice_items alter column sort_order set not null;
alter table public.invoice_items alter column sort_order set default 0;
alter table public.invoice_items alter column created_at set not null;
alter table public.invoice_items alter column created_at set default now();

-- Remove only single-column username uniqueness; owner-scoped uniqueness replaces it.
do $$
declare entry record;
begin
  for entry in select conname from pg_constraint where conrelid='public.customers'::regclass and contype='u'
    and conkey = array[(select attnum from pg_attribute where attrelid='public.customers'::regclass and attname='username')]::smallint[]
  loop execute format('alter table public.customers drop constraint %I', entry.conname); end loop;
  for entry in select i.indexrelid::regclass as index_name from pg_index i
    where i.indrelid='public.customers'::regclass and i.indisunique and not i.indisprimary
      and i.indnkeyatts=1 and i.indkey[0]=(select attnum from pg_attribute where attrelid=i.indrelid and attname='username')
      and not exists(select 1 from pg_constraint c where c.conindid=i.indexrelid)
  loop execute format('drop index %s', entry.index_name); end loop;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.customers'::regclass and contype='p') then alter table public.customers add primary key(id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.business_settings'::regclass and contype='p') then alter table public.business_settings add primary key(id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and contype='p') then alter table public.invoices add primary key(id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoice_items'::regclass and contype='p') then alter table public.invoice_items add primary key(id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.customers'::regclass and conname='gigainvoice_customers_owner_fk') then alter table public.customers add constraint gigainvoice_customers_owner_fk foreign key (owner_id) references auth.users(id) on delete cascade; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.business_settings'::regclass and conname='gigainvoice_business_settings_owner_fk') then alter table public.business_settings add constraint gigainvoice_business_settings_owner_fk foreign key (owner_id) references auth.users(id) on delete cascade; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_owner_fk') then alter table public.invoices add constraint gigainvoice_invoices_owner_fk foreign key (owner_id) references auth.users(id) on delete cascade; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoice_items'::regclass and conname='gigainvoice_invoice_items_owner_fk') then alter table public.invoice_items add constraint gigainvoice_invoice_items_owner_fk foreign key (owner_id) references auth.users(id) on delete cascade; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.customers'::regclass and conname='gigainvoice_customers_owner_username_key') then alter table public.customers add constraint gigainvoice_customers_owner_username_key unique (owner_id, username); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.customers'::regclass and conname='gigainvoice_customers_owner_id_key') then alter table public.customers add constraint gigainvoice_customers_owner_id_key unique (owner_id, id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.customers'::regclass and conname='gigainvoice_customers_names_check') then alter table public.customers add constraint gigainvoice_customers_names_check check (length(btrim(username)) > 0 and length(btrim(full_name)) > 0); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.business_settings'::regclass and conname='gigainvoice_business_owner_key') then alter table public.business_settings add constraint gigainvoice_business_owner_key unique (owner_id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.business_settings'::regclass and conname='gigainvoice_business_installation_check') then alter table public.business_settings add constraint gigainvoice_business_installation_check check (default_installation_charge between 0 and 9999999999.99); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_owner_number_key') then alter table public.invoices add constraint gigainvoice_invoices_owner_number_key unique (owner_id, invoice_number); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_owner_id_key') then alter table public.invoices add constraint gigainvoice_invoices_owner_id_key unique (owner_id, id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_customer_owner_fk') then alter table public.invoices add constraint gigainvoice_invoices_customer_owner_fk foreign key (owner_id,customer_id) references public.customers(owner_id,id) on delete set null (customer_id); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_values_check') then alter table public.invoices add constraint gigainvoice_invoices_values_check check (document_type in ('invoice','receipt') and status in ('draft','issued','paid','cancelled') and qr_type in ('upi','custom') and length(btrim(invoice_number))>0 and length(btrim(customer_name))>0 and discount_percent between 0 and 100 and subtotal between 0 and 9999999999.99 and discount_amount between 0 and 9999999999.99 and installation_charges between 0 and 9999999999.99 and total_amount between 0 and 9999999999.99); end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoice_items'::regclass and conname='gigainvoice_items_invoice_owner_fk') then alter table public.invoice_items add constraint gigainvoice_items_invoice_owner_fk foreign key (owner_id,invoice_id) references public.invoices(owner_id,id) on delete cascade; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.invoice_items'::regclass and conname='gigainvoice_items_values_check') then alter table public.invoice_items add constraint gigainvoice_items_values_check check (discount_percent between 0 and 100 and quantity > 0 and quantity <= 99999999.99 and unit_price between 0 and 9999999999.99 and line_total between 0 and 9999999999.99 and length(btrim(plan_name))>0); end if;
end $$;

create index if not exists gigainvoice_customers_owner_name_idx on public.customers(owner_id,full_name);
create index if not exists gigainvoice_invoices_customer_idx on public.invoices(customer_id);
create index if not exists gigainvoice_invoices_owner_created_idx on public.invoices(owner_id,created_at desc);
create index if not exists gigainvoice_items_invoice_idx on public.invoice_items(invoice_id);
-- Respect installations where pg_trgm already lives in public instead of extensions.
do $$
declare ext_schema text;
begin
  select n.nspname into ext_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_trgm';
  execute format('create index if not exists gigainvoice_customers_name_trgm_idx on public.customers using gin (lower(full_name) %I.gin_trgm_ops)', ext_schema);
  execute format('create index if not exists gigainvoice_customers_username_trgm_idx on public.customers using gin (lower(username) %I.gin_trgm_ops)', ext_schema);
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists gigainvoice_customer_updated_at on public.customers;
create or replace trigger gigainvoice_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create or replace trigger gigainvoice_set_updated_at before update on public.business_settings for each row execute function public.set_updated_at();
create or replace trigger gigainvoice_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();

-- Retire only the two known policies from the previous shared-role design.
drop policy if exists gigainvoice_owner_read on public.customers;
drop policy if exists gigainvoice_owner_boundary on public.customers;
alter table public.customers enable row level security;
revoke all on public.customers from anon, public;
grant select,insert,update,delete on public.customers to authenticated;
drop policy if exists gigainvoice_customers_select on public.customers;
create policy gigainvoice_customers_select on public.customers for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_customers_insert on public.customers;
create policy gigainvoice_customers_insert on public.customers for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_customers_update on public.customers;
create policy gigainvoice_customers_update on public.customers for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_customers_delete on public.customers;
create policy gigainvoice_customers_delete on public.customers for delete to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_customers_boundary on public.customers;
create policy gigainvoice_customers_boundary on public.customers as restrictive for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter table public.business_settings enable row level security;
revoke all on public.business_settings from anon, public;
grant select,insert,update,delete on public.business_settings to authenticated;
drop policy if exists gigainvoice_business_settings_select on public.business_settings;
create policy gigainvoice_business_settings_select on public.business_settings for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_business_settings_insert on public.business_settings;
create policy gigainvoice_business_settings_insert on public.business_settings for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_business_settings_update on public.business_settings;
create policy gigainvoice_business_settings_update on public.business_settings for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_business_settings_delete on public.business_settings;
create policy gigainvoice_business_settings_delete on public.business_settings for delete to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_business_settings_boundary on public.business_settings;
create policy gigainvoice_business_settings_boundary on public.business_settings as restrictive for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter table public.invoices enable row level security;
revoke all on public.invoices from anon, public;
grant select,insert,update,delete on public.invoices to authenticated;
drop policy if exists gigainvoice_invoices_select on public.invoices;
create policy gigainvoice_invoices_select on public.invoices for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoices_insert on public.invoices;
create policy gigainvoice_invoices_insert on public.invoices for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoices_update on public.invoices;
create policy gigainvoice_invoices_update on public.invoices for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoices_delete on public.invoices;
create policy gigainvoice_invoices_delete on public.invoices for delete to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoices_boundary on public.invoices;
create policy gigainvoice_invoices_boundary on public.invoices as restrictive for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter table public.invoice_items enable row level security;
revoke all on public.invoice_items from anon, public;
grant select,insert,update,delete on public.invoice_items to authenticated;
drop policy if exists gigainvoice_invoice_items_select on public.invoice_items;
create policy gigainvoice_invoice_items_select on public.invoice_items for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoice_items_insert on public.invoice_items;
create policy gigainvoice_invoice_items_insert on public.invoice_items for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoice_items_update on public.invoice_items;
create policy gigainvoice_invoice_items_update on public.invoice_items for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoice_items_delete on public.invoice_items;
create policy gigainvoice_invoice_items_delete on public.invoice_items for delete to authenticated using (owner_id = (select auth.uid()));
drop policy if exists gigainvoice_invoice_items_boundary on public.invoice_items;
create policy gigainvoice_invoice_items_boundary on public.invoice_items as restrictive for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Signature remains compatible with the existing repository. RLS supplies tenancy.
create or replace function public.search_customers(search_text text, result_limit integer default 15)
returns setof public.customers
language plpgsql stable security invoker set search_path='' as $$
declare term text := lower(normalize(btrim(search_text), NFC)); pattern text;
begin
  if (select auth.uid()) is null then raise insufficient_privilege using message='Sign in to access customers.'; end if;
  if term is null or char_length(term)<2 or char_length(term)>150 then return; end if;
  pattern := '%' || replace(replace(replace(term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  return query select c.* from public.customers c
    where c.owner_id=(select auth.uid()) and c.is_active
      and (lower(c.full_name) like pattern escape E'\\' or lower(c.username) like pattern escape E'\\')
    order by c.full_name,c.username limit greatest(1,least(coalesce(result_limit,15),20));
end;
$$;
revoke all on function public.search_customers(text,integer) from public,anon;
grant execute on function public.search_customers(text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
