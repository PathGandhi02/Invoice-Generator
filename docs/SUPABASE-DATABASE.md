> Historical report: the current account, guest, workspace and distribution behavior is documented in [AUTH-WORKSPACES.md](AUTH-WORKSPACES.md). Instructions below about bundled customers, owner-only access or local-only signed-in storage are superseded.

# GigaInvoice production database

This implements `temp/Supabase db integration prompt.md` on the existing application. It supersedes the shared `gigainvoice_role` setup in EXTENDED-SETUP.md: each authenticated user now sees only rows with their own `owner_id`. Do not assign app metadata to enable access.

## Schema and migration

Apply these files in order:

1. `supabase/migrations/202609120001_customers.sql` — the historical customer-only baseline.
2. `supabase/migrations/202609120002_production_schema.sql` — the owner-based production upgrade.

The upgrade creates `customers`, `business_settings`, `invoices`, and `invoice_items`, enables `pgcrypto` and `pg_trgm`, and adds all fields requested by the prompt. Existing customer records are retained. Legacy customers without an owner stay inaccessible to app users; ownership is never guessed. Importing the source under an explicit owner does not delete these legacy rows.

The migration adds missing columns, checks existing column types, and enforces required fields and constraints. An incompatible populated schema causes a transactional failure instead of silently converting data. Review such differences before making a targeted migration; existing tables are not dropped. Only global single-column username uniqueness is removed and replaced by `(owner_id, username)` uniqueness.

Indexes include owner/username uniqueness, owner/full_name, GIN trigrams on `lower(full_name)` and `lower(username)`, invoices/customer_id, invoices/owner_id plus descending created_at, and items/invoice_id. Invoice numbers are unique per owner, and settings allow one row per owner.

Each table has SELECT, INSERT, UPDATE and DELETE policies for authenticated owners, plus a restrictive owner boundary that also constrains unrelated permissive policies. Anonymous access is revoked. INSERT/UPDATE require the caller's owner ID. Composite foreign keys prevent references to another owner's customer or invoice. Customer deletion clears only the invoice's customer reference; the stored customer snapshot remains. Invoice deletion cascades to items.

`public.set_updated_at()` is shared by customers, business_settings and invoices. Pricing/discount checks reject negative or invalid values. Customer calendar timestamps use `timestamp without time zone`; the import never converts them through UTC.

## Trusted connection setup

The client continues reading only these values from `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

For database tooling, use the separate Git-ignored `.env.admin`:

```env
SUPABASE_DB_URL="postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@SESSION_POOLER_HOST:5432/postgres"
SUPABASE_DB_CA_FILE=.tooling/supabase-ca.crt
GIGAINVOICE_OWNER_USER_ID="AUTH_USER_UUID"
```

Copy the **Session pooler** URL from the existing project's Connect dialog. Direct connections require working IPv6 on this host. Percent-encode password characters such as `@`, `#`, `%`, and backslashes inside the URI. A database password is separate from an Auth user's login password.

Download the database CA certificate from Database Settings → SSL Configuration, save it at the path above, and keep certificate verification enabled. See [Supabase connection instructions](https://supabase.com/docs/guides/database/connecting-to-postgres) and [SSL verification](https://supabase.com/docs/guides/platform/ssl-enforcement). If your system already trusts the certificate chain, the CA file variable is optional.

The admin driver permits only the configured project's direct/session-pooler database on port 5432. It verifies TLS and prints sanitized errors. Credentials remain outside app source, public environment variables, build configuration and bundles. `.env.admin` is excluded from Git and EAS uploads. The only new dependency for this phase is development-only `postgres`.

## Inspect, apply, verify and import

From the repository root (use `npm.cmd` in Windows PowerShell if necessary):

```sh
npm install
npm run db:inspect
npm run db:apply
npm run db:verify
npm run db:import:check
npm run db:import
npm run db:verify
npm run check:supabase
```

Optional real login/repository verification: set `GIGAINVOICE_OWNER_EMAIL` and `GIGAINVOICE_OWNER_PASSWORD` only in `.env.admin`, then run `npm run db:login:verify`. This uses the normal publishable Auth/API client, verifies the account UUID and owner customer lookups, and logs out its temporary session. Never prefix these credentials with `EXPO_PUBLIC_`.

`db:inspect` reads table/column metadata without mutations. `db:apply` applies the reviewed SQL files together in one transaction, with an advisory lock and a private checksum ledger in `gigainvoice_private.migrations`. Repeated calls skip unchanged applied files and reject edits to their checksums. No extra Supabase project is created. This runner uses its own ledger; do not alternate it with Supabase CLI migration history without explicitly reconciling the histories.

Alternatively, execute the two SQL files in order through the existing project's SQL editor, then run `db:verify` with the trusted connection. Each SQL file has its own transaction wrapper. Do not reapply the baseline by itself after the production upgrade because it contains the old shared-role policies.

`db:import:check` validates the original `temp/subscribers.json` without connecting or uploading. The fallback source is `src/data/customers.json`; an explicit source can be supplied:

```sh
npm run db:import -- --source=path/to/customers.json
```

The importer validates the full source, preserves names/addresses, rejects invalid timestamps, skips invalid/duplicate records, checks the owner exists in `auth.users`, and upserts by `(owner_id, username)` in batches of 200. All batches commit together. Counts distinguish inserted and updated rows; reruns do not create duplicates or reactivate previously inactive customers. It never runs from the APK, web app or app startup.

Source validation reports 715 total records, 710 valid, 5 invalid, zero duplicate usernames and zero invalid timestamps. The live import committed 710 inserts and zero updates for the explicitly selected Auth owner. The resulting count and owner-scoped sample lookups were verified.

The older `prepare:supabase` CSV is retained for historical/manual use. It does not assign ownership and is superseded by `db:import`; importing that CSV without an owner will create rows hidden by production RLS.

## Authentication and application integration

Create or identify the intended email/password user in Supabase Authentication → Users and copy its UID into `GIGAINVOICE_OWNER_USER_ID`. The application has login, persisted session and logout under Settings → Customer account; there is no public signup screen. No app_metadata owner claim is required by this schema.

`SupabaseCustomerRepository` uses the existing service interface. Searches are server-side, owner-filtered and limited to 15 results, with a two-character minimum and the existing 250 ms debounce. Literal wildcard escaping prevents user text from becoming query syntax. Autocomplete explicitly selects only id, username, name, email, phone, address, package and the two source dates. Inactive customers are omitted from autocomplete and its count. Exact username/id lookup remains protected by RLS.

Selection now preserves `customerId` and phone alongside the existing customer snapshot. Editing invoice-specific details never updates the master customer. Native PDF generation/sharing is unchanged. Explicit **Offline customer data** remains available and visibly labeled; it never silently replaces a failed live search.

Invoice history and business settings continue using their existing local persistence. Their database tables and types are ready, but automatic synchronization is intentionally not enabled: the current draft identifiers, embedded images and offline saves need a deliberate sync/conflict design. No cloud invoice creation is attempted, so the application cannot leave a remote invoice header behind after a failed item write. This follows the prompt's customer-first priority and conditional invoice-sync requirement.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run export:web`, `npm run test:e2e`, and `npm run export:android`.

Production SQL tests use real PostgreSQL through PGlite with both required extensions. They cover a legacy upgrade applied twice, two owners sharing a username, cross-owner CRUD/foreign-key denial, anonymous denial, safe partial search, indexed expressions, owner import idempotence, inactive customers, unchanged invoice snapshots, numeric constraints, updated_at, and delete behavior.

`db:verify` checks live tables/RLS, indexes, policies, triggers, extensions and constraints, and can execute owner-role sample queries without exposing customer rows. This is separate from actual Auth login and Android/web verification. See `docs/DATABASE-VALIDATION.md` for current live and build results.
