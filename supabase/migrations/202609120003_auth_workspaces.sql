-- Optional accounts, isolated guests, shared verified Maruti workspace.
-- Adds to applied migrations; never rewrites historical customer/invoice rows.
begin;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, phone text, avatar_path text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.businesses (
 id uuid primary key default gen_random_uuid(), name text, protected_key text unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.business_members (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','admin','member')),
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), unique(business_id,user_id)
);
create index if not exists gigainvoice_member_user_idx on public.business_members(user_id,business_id);
create table if not exists public.business_access_allowlist (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 email text not null, role text not null default 'member' check(role in ('owner','admin','member')),
 is_active boolean not null default true, created_at timestamptz not null default now()
);
create unique index if not exists gigainvoice_allowlist_email_key on public.business_access_allowlist(business_id,lower(email));
insert into public.businesses(id,name,protected_key)
values('c8a94e21-5162-4d77-b436-819362b86ac0','Maruti Giga Fiber','maruti-giga-fiber')
on conflict(protected_key) do nothing;
insert into public.business_access_allowlist(business_id,email,role)
select id,email,'owner' from public.businesses cross join
 (values('pathmgandhi@gmail.com'),('manish10gandhi@gmail.com')) as approved(email)
where protected_key='maruti-giga-fiber'
on conflict(business_id,lower(email)) do update set is_active=true,role='owner';

-- Authorization reads current Auth records, not user metadata or stale token email.
-- Even an accidentally inserted membership cannot broaden the protected allowlist.
create or replace function public.is_business_member(target_business_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.business_members m join public.businesses b on b.id=m.business_id
  join auth.users u on u.id=m.user_id
  where m.business_id=target_business_id and m.user_id=(select auth.uid()) and m.status='active'
  and (b.protected_key is null or (
   b.protected_key='maruti-giga-fiber' and u.email_confirmed_at is not null
   and lower(u.email) in ('pathmgandhi@gmail.com','manish10gandhi@gmail.com')
   and exists(select 1 from public.business_access_allowlist a where a.business_id=b.id
    and a.is_active and lower(a.email)=lower(u.email))
  ))
 )
$$;
revoke all on function public.is_business_member(uuid) from public,anon;
grant execute on function public.is_business_member(uuid) to authenticated;

create or replace function public.gigainvoice_provision_user(target_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare u auth.users; bid uuid;
begin
 select * into u from auth.users where id=target_user;
 if u.id is null then return; end if;
 perform pg_advisory_xact_lock(hashtext('gigainvoice:provision:'||u.id::text));
 insert into public.profiles(id,full_name,phone)
 values(u.id,left(u.raw_user_meta_data->>'full_name',250),left(u.raw_user_meta_data->>'phone',80))
 on conflict(id) do nothing;
 if u.email_confirmed_at is not null then
  insert into public.business_members(business_id,user_id,role)
  select a.business_id,u.id,a.role from public.business_access_allowlist a join public.businesses b on b.id=a.business_id
   where b.protected_key='maruti-giga-fiber' and a.is_active and lower(a.email)=lower(u.email)
    and lower(u.email) in ('pathmgandhi@gmail.com','manish10gandhi@gmail.com')
  on conflict(business_id,user_id) do nothing;
 end if;
 if not exists(select 1 from public.business_members where user_id=u.id and status='active') then
  insert into public.businesses(name) values(null) returning id into bid;
  insert into public.business_members(business_id,user_id,role) values(bid,u.id,'owner');
 end if;
end $$;
revoke all on function public.gigainvoice_provision_user(uuid) from public,anon,authenticated;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.gigainvoice_provision_user(new.id); return new; end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
drop trigger if exists gigainvoice_auth_profile on auth.users;
create trigger gigainvoice_auth_profile after insert or update of email,email_confirmed_at on auth.users
 for each row execute function public.handle_new_user();
do $$ declare u record; begin for u in select id from auth.users loop perform public.gigainvoice_provision_user(u.id); end loop; end $$;

create or replace function public.ensure_workspace()
returns setof public.businesses language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then raise insufficient_privilege using message='Sign in required'; end if;
 perform public.gigainvoice_provision_user((select auth.uid()));
 return query select b.* from public.businesses b where public.is_business_member(b.id)
 order by (b.protected_key is not null) desc,b.created_at,b.id;
end $$;
revoke all on function public.ensure_workspace() from public,anon;
grant execute on function public.ensure_workspace() to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_access_allowlist enable row level security;
revoke all on public.profiles,public.businesses,public.business_members,public.business_access_allowlist from public,anon,authenticated;
grant select,insert on public.profiles to authenticated;
grant update(full_name,phone,avatar_path) on public.profiles to authenticated;
grant select on public.businesses,public.business_members to authenticated;
grant update(name) on public.businesses to authenticated;
drop policy if exists gigainvoice_profile_read on public.profiles;
create policy gigainvoice_profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists gigainvoice_profile_insert on public.profiles;
create policy gigainvoice_profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
drop policy if exists gigainvoice_profile_update on public.profiles;
create policy gigainvoice_profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
drop policy if exists gigainvoice_profile_boundary on public.profiles;
create policy gigainvoice_profile_boundary on public.profiles as restrictive for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
drop policy if exists gigainvoice_business_read on public.businesses;
create policy gigainvoice_business_read on public.businesses for select to authenticated using(public.is_business_member(id));
drop policy if exists gigainvoice_business_update on public.businesses;
create policy gigainvoice_business_update on public.businesses for update to authenticated using(public.is_business_member(id)) with check(public.is_business_member(id));
drop policy if exists gigainvoice_business_boundary on public.businesses;
create policy gigainvoice_business_boundary on public.businesses as restrictive for all to authenticated using(public.is_business_member(id)) with check(public.is_business_member(id));
drop policy if exists gigainvoice_members_read on public.business_members;
create policy gigainvoice_members_read on public.business_members for select to authenticated using(user_id=(select auth.uid()) and public.is_business_member(business_id));
drop policy if exists gigainvoice_members_boundary on public.business_members;
create policy gigainvoice_members_boundary on public.business_members as restrictive for all to authenticated using(user_id=(select auth.uid()) and public.is_business_member(business_id));
-- No client grants/policies on the allowlist; no membership INSERT/UPDATE/DELETE grants.
create or replace trigger gigainvoice_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create or replace trigger gigainvoice_set_updated_at before update on public.businesses for each row execute function public.set_updated_at();

alter table public.customers add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.business_settings add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.invoices add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.invoice_items add column if not exists business_id uuid references public.businesses(id) on delete cascade;
-- Existing owner records follow that owner's verified membership. No IDs change.
do $$ declare t text; begin
 foreach t in array array['customers','business_settings','invoices','invoice_items'] loop
  execute format('update public.%I r set business_id=(select m.business_id from public.business_members m join public.businesses b on b.id=m.business_id where m.user_id=r.owner_id and m.status=''active'' order by (b.protected_key is not null) desc,b.created_at,b.id limit 1) where r.business_id is null and r.owner_id is not null',t);
 end loop;
end $$;
-- Shared data survives deletion of its original creator. Membership owns access.
do $$ declare t text; begin
 foreach t in array array['customers','business_settings','invoices','invoice_items'] loop
  execute format('alter table public.%I alter column owner_id drop not null',t);
  execute format('alter table public.%I drop constraint if exists %I',t,'gigainvoice_'||t||'_owner_fk');
  execute format('alter table public.%I add constraint %I foreign key(owner_id) references auth.users(id) on delete set null',t,'gigainvoice_'||t||'_owner_fk');
 end loop;
end $$;
alter table public.invoices alter column show_qr set default false;
-- Retain arbitrary existing percentage precision in document calculations.
alter table public.invoices alter column discount_percent type numeric;
alter table public.invoice_items alter column discount_percent type numeric;
-- Orphan legacy rows stay preserved and inaccessible until explicitly assigned.
alter table public.business_settings alter column company_name drop default;
alter table public.business_settings alter column company_name drop not null;
alter table public.business_settings alter column logo_path drop not null;
alter table public.business_settings alter column show_qr set default false;
alter table public.invoices add column if not exists local_id text;
alter table public.invoices add column if not exists document jsonb;
alter table public.customers drop constraint if exists gigainvoice_customers_owner_username_key;
alter table public.business_settings drop constraint if exists gigainvoice_business_owner_key;
alter table public.invoices drop constraint if exists gigainvoice_invoices_owner_number_key;
alter table public.invoices drop constraint if exists gigainvoice_invoices_customer_owner_fk;
alter table public.invoice_items drop constraint if exists gigainvoice_items_invoice_owner_fk;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.customers'::regclass and conname='gigainvoice_customers_business_username_key') then alter table public.customers add constraint gigainvoice_customers_business_username_key unique(business_id,username); end if; end $$;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.customers'::regclass and conname='gigainvoice_customers_business_id_key') then alter table public.customers add constraint gigainvoice_customers_business_id_key unique(business_id,id); end if; end $$;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.business_settings'::regclass and conname='gigainvoice_settings_business_key') then alter table public.business_settings add constraint gigainvoice_settings_business_key unique(business_id); end if; end $$;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_business_number_key') then alter table public.invoices add constraint gigainvoice_invoices_business_number_key unique(business_id,invoice_number); end if; end $$;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_business_local_key') then alter table public.invoices add constraint gigainvoice_invoices_business_local_key unique(business_id,local_id); end if; end $$;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_business_id_key') then alter table public.invoices add constraint gigainvoice_invoices_business_id_key unique(business_id,id); end if; end $$;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.invoices'::regclass and conname='gigainvoice_invoices_customer_business_fk') then alter table public.invoices add constraint gigainvoice_invoices_customer_business_fk foreign key(business_id,customer_id) references public.customers(business_id,id) on delete set null(customer_id); end if; end $$;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.invoice_items'::regclass and conname='gigainvoice_items_invoice_business_fk') then alter table public.invoice_items add constraint gigainvoice_items_invoice_business_fk foreign key(business_id,invoice_id) references public.invoices(business_id,id) on delete cascade; end if; end $$;
create index if not exists gigainvoice_customers_business_name_idx on public.customers(business_id,full_name);
create index if not exists gigainvoice_invoices_business_created_idx on public.invoices(business_id,created_at desc);

do $$ declare t text; p record; begin
 foreach t in array array['customers','business_settings','invoices','invoice_items'] loop
  -- Replace the known preceding owner policies; constrain any unrelated policies.
  for p in select policyname from pg_policies where schemaname='public' and tablename=t and policyname like 'gigainvoice_%' loop
   execute format('drop policy %I on public.%I',p.policyname,t);
  end loop;
  execute format('create policy gigainvoice_business_access on public.%I for all to authenticated using(public.is_business_member(business_id)) with check(public.is_business_member(business_id))',t);
  execute format('create policy gigainvoice_business_boundary on public.%I as restrictive for all to authenticated using(public.is_business_member(business_id)) with check(public.is_business_member(business_id))',t);
  execute format('revoke all on public.%I from public,anon',t);
 end loop;
end $$;

create table if not exists public.workspace_user_state(
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 key text not null check(key in ('draft','drafts')),
 value jsonb not null check(octet_length(value::text)<=12000000),
 updated_at timestamptz not null default now(),
 primary key(business_id,user_id,key)
);
alter table public.workspace_user_state enable row level security;
revoke all on public.workspace_user_state from public,anon;
grant select,insert,update,delete on public.workspace_user_state to authenticated;
drop policy if exists gigainvoice_user_state on public.workspace_user_state;
create policy gigainvoice_user_state on public.workspace_user_state for all to authenticated
 using(user_id=(select auth.uid()) and public.is_business_member(business_id))
 with check(user_id=(select auth.uid()) and public.is_business_member(business_id));
drop policy if exists gigainvoice_user_state_boundary on public.workspace_user_state;
create policy gigainvoice_user_state_boundary on public.workspace_user_state as restrictive for all to authenticated
 using(user_id=(select auth.uid()) and public.is_business_member(business_id))
 with check(user_id=(select auth.uid()) and public.is_business_member(business_id));
create or replace trigger gigainvoice_set_updated_at before update on public.workspace_user_state for each row execute function public.set_updated_at();

-- Scope search explicitly; the existing RPC also remains secure through RLS.
create or replace function public.search_business_customers(target_business_id uuid, search_text text, result_limit integer default 15)
returns setof public.customers language plpgsql stable security invoker set search_path='' as $$
declare term text:=lower(normalize(btrim(search_text),NFC)); pattern text;
begin
 if not public.is_business_member(target_business_id) then raise insufficient_privilege using message='Workspace access required'; end if;
 if term is null or char_length(term)<2 or char_length(term)>150 then return; end if;
 pattern:='%'||replace(replace(replace(term,E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%';
 return query select c.* from public.customers c where c.business_id=target_business_id and c.is_active
 and (lower(c.full_name) like pattern escape E'\\' or lower(c.username) like pattern escape E'\\')
 order by c.full_name,c.username limit greatest(1,least(coalesce(result_limit,15),20));
end $$;
revoke all on function public.search_business_customers(uuid,text,integer) from public,anon;
grant execute on function public.search_business_customers(uuid,text,integer) to authenticated;
-- Do not retain the old owner_id-filtering RPC that excludes a second member.
create or replace function public.search_customers(search_text text,result_limit integer default 15)
returns setof public.customers language sql stable security invoker set search_path='' as $$
 select c.* from public.businesses b cross join lateral public.search_business_customers(b.id,search_text,result_limit) c
 where public.is_business_member(b.id) limit greatest(1,least(coalesce(result_limit,15),20))
$$;

-- An invoice header and its one current plan item are one transaction. Monetary
-- columns are calculated on the server, not trusted from client total fields.
create or replace function public.save_invoice_document(target_business_id uuid, payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare iid uuid; oid uuid; cid uuid; price numeric; discount numeric; installation numeric; deduction numeric; total numeric; paid boolean;
begin
 if not public.is_business_member(target_business_id) then raise insufficient_privilege using message='Workspace access required'; end if;
 if jsonb_typeof(payload)<>'object' or octet_length(payload::text)>12000000 then raise exception 'Invalid invoice document'; end if;
 if coalesce(length(btrim(payload->>'id')),0) not between 1 and 250
 or coalesce(length(btrim(payload->>'invoiceNumber')),0) not between 1 and 100
 or coalesce(length(btrim(payload->>'customerName')),0) not between 1 and 250
 or coalesce(length(btrim(payload->>'planName')),0) not between 1 and 250
 or coalesce(length(btrim(payload->>'timePeriod')),0) not between 1 and 250 then raise exception 'Required invoice fields missing'; end if;
 price:=(payload->>'price')::numeric; discount:=(payload->>'discount')::numeric; installation:=(payload->>'installationCharges')::numeric;
 if price is null or discount is null or installation is null or not(price between 0 and 999999999) or not(discount between 0 and 100) or not(installation between 0 and 999999999) then raise exception 'Invalid invoice amounts'; end if;
 if (payload->>'startDate')::date is null or (payload->>'dueDate')::date is null or (payload->>'dueDate')::date<(payload->>'startDate')::date then raise exception 'Invalid invoice dates'; end if;
 paid:=coalesce((payload->>'isPaid')::boolean,false);
 price:=round(price,2); installation:=round(installation,2); deduction:=round(price*discount/100,2); total:=price-deduction+installation;
 cid:=nullif(payload->>'customerId','')::uuid;
 if cid is not null and not exists(select 1 from public.customers where id=cid and business_id=target_business_id) then raise exception 'Customer does not belong to this workspace'; end if;
 insert into public.invoices(owner_id,business_id,customer_id,local_id,document,invoice_number,document_type,status,
 start_date,due_date,payment_date,customer_username,customer_name,customer_phone,customer_email,customer_address,customer_package,customer_expiry_date,customer_last_recharge_date,
 currency_symbol,subtotal,discount_percent,discount_amount,installation_charges,total_amount,is_paid,payment_method,show_qr,qr_type,upi_id,accent_color)
 values((select auth.uid()),target_business_id,cid,payload->>'id',payload,payload->>'invoiceNumber',case when paid then 'receipt' else 'invoice' end,case when paid then 'paid' else 'issued' end,
 (payload->>'startDate')::date,(payload->>'dueDate')::date,case when paid then (payload->>'dueDate')::date end,
 payload->>'customerUsername',payload->>'customerName',payload->>'customerPhone',payload->>'customerEmail',payload->>'customerAddress',payload->>'customerPackage',
 nullif(payload->>'customerExpiryDate','')::timestamp,nullif(payload->>'customerLastRechargeDate','')::timestamp,
 coalesce(payload->>'currencySymbol','₹'),price,discount,deduction,installation,total,paid,payload->>'paymentMethod',coalesce((payload->>'showQr')::boolean,false),coalesce(payload->>'qrType','upi'),payload->>'upiId',payload->>'accentColor')
 on conflict(business_id,local_id) do update set
 customer_id=excluded.customer_id,document=excluded.document,invoice_number=excluded.invoice_number,document_type=excluded.document_type,status=excluded.status,
 start_date=excluded.start_date,due_date=excluded.due_date,payment_date=excluded.payment_date,customer_username=excluded.customer_username,customer_name=excluded.customer_name,
 customer_phone=excluded.customer_phone,customer_email=excluded.customer_email,customer_address=excluded.customer_address,customer_package=excluded.customer_package,
 customer_expiry_date=excluded.customer_expiry_date,customer_last_recharge_date=excluded.customer_last_recharge_date,currency_symbol=excluded.currency_symbol,
 subtotal=excluded.subtotal,discount_percent=excluded.discount_percent,discount_amount=excluded.discount_amount,installation_charges=excluded.installation_charges,total_amount=excluded.total_amount,
 is_paid=excluded.is_paid,payment_method=excluded.payment_method,show_qr=excluded.show_qr,qr_type=excluded.qr_type,upi_id=excluded.upi_id,accent_color=excluded.accent_color
 returning id,owner_id into iid,oid;
 delete from public.invoice_items where invoice_id=iid;
 insert into public.invoice_items(owner_id,business_id,invoice_id,plan_name,description,time_period,quantity,unit_price,discount_percent,line_total)
 values(oid,target_business_id,iid,payload->>'planName',payload->>'planSubtext',payload->>'timePeriod',1,price,discount,price-deduction);
 return iid;
end $$;
revoke all on function public.save_invoice_document(uuid,jsonb) from public,anon;
grant execute on function public.save_invoice_document(uuid,jsonb) to authenticated;
-- App writes go through the atomic RPC. Existing rows remain readable.
revoke insert,update,delete on public.invoices,public.invoice_items from authenticated;

create or replace function public.is_business_asset(asset_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select case when split_part(asset_name,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
 then public.is_business_member(split_part(asset_name,'/',1)::uuid) else false end
$$;
revoke all on function public.is_business_asset(text) from public,anon;
grant execute on function public.is_business_asset(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-assets','business-assets',false,3145728,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists gigainvoice_assets on storage.objects;
create policy gigainvoice_assets on storage.objects for all to authenticated
 using(bucket_id='business-assets' and public.is_business_asset(name))
 with check(bucket_id='business-assets' and public.is_business_asset(name));
drop policy if exists gigainvoice_assets_boundary on storage.objects;
create policy gigainvoice_assets_boundary on storage.objects as restrictive for all to authenticated
 using(bucket_id<>'business-assets' or public.is_business_asset(name))
 with check(bucket_id<>'business-assets' or public.is_business_asset(name));
drop policy if exists gigainvoice_assets_anon_boundary on storage.objects;
create policy gigainvoice_assets_anon_boundary on storage.objects as restrictive for all to anon
 using(bucket_id<>'business-assets') with check(bucket_id<>'business-assets');
notify pgrst,'reload schema';
commit;
