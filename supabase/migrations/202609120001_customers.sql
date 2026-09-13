-- Apply in the Supabase SQL editor after inspecting any existing customers table.
-- No table/data is dropped. The live project returned PGRST205 (table missing)
-- when checked with its publishable key during this implementation.
begin;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (length(btrim(username)) > 0),
  full_name text not null check (length(btrim(full_name)) > 0),
  email text,
  address text,
  package text,
  -- The ISP export supplies calendar timestamps without a timezone.
  expiry_date timestamp without time zone,
  last_recharge_date timestamp without time zone,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;
revoke all on public.customers from anon;
revoke insert, update, delete, truncate, references, trigger on public.customers from authenticated;
grant select on public.customers to authenticated;

-- app_metadata is assigned only through trusted administration. Never use
-- user_metadata for authorization: users can edit their own user_metadata.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'customers' and policyname = 'gigainvoice_owner_read') then
    create policy gigainvoice_owner_read on public.customers for select to authenticated
      using ((select auth.jwt()) -> 'app_metadata' ->> 'gigainvoice_role' = 'owner');
  end if;
  -- Restrictive policy also constrains pre-existing permissive SELECT policies.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'customers' and policyname = 'gigainvoice_owner_boundary') then
    create policy gigainvoice_owner_boundary on public.customers as restrictive for select to authenticated
      using ((select auth.jwt()) -> 'app_metadata' ->> 'gigainvoice_role' = 'owner');
  end if;
end $$;

create or replace function public.gigainvoice_customer_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create or replace trigger gigainvoice_customer_updated_at
  before update on public.customers for each row
  execute function public.gigainvoice_customer_updated_at();

create or replace function public.search_customers(search_text text, result_limit integer default 15)
returns setof public.customers
language plpgsql stable security invoker set search_path = '' as $$
declare
  term text := normalize(btrim(search_text), NFC);
  pattern text;
begin
  if (select auth.jwt()) -> 'app_metadata' ->> 'gigainvoice_role' is distinct from 'owner' then
    raise insufficient_privilege using message = 'Owner access is required.';
  end if;
  if term is null or char_length(term) < 2 or char_length(term) > 150 then return; end if;
  -- Parameters remain values. Escape SQL LIKE wildcards literally, including
  -- backslashes, so punctuation cannot turn a search into a broad/raw filter.
  pattern := '%' || replace(replace(replace(term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  return query select c.* from public.customers c
    where c.full_name ilike pattern escape E'\\' or c.username ilike pattern escape E'\\'
    order by c.full_name, c.username
    limit greatest(1, least(coalesce(result_limit, 15), 20));
end;
$$;
revoke all on function public.search_customers(text, integer) from public, anon;
grant execute on function public.search_customers(text, integer) to authenticated;

commit;
