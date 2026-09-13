> Historical report: the current account, guest, workspace and distribution behavior is documented in [AUTH-WORKSPACES.md](AUTH-WORKSPACES.md). Instructions below about bundled customers, owner-only access or local-only signed-in storage are superseded.

# Production database validation — 12 September 2026

Implemented `temp/Supabase db integration prompt.md` against the existing Supabase project `vldwycierouwmyhlabwc`. This report supersedes the earlier missing-table status and shared-owner-role design.

## Applied and verified live

- Inspected the actual PostgreSQL catalog before migration: none of the four application tables existed.
- Applied `202609120001_customers.sql` and `202609120002_production_schema.sql` in one transaction through the configured session pooler, with full TLS verification.
- Created `public.customers`, `public.business_settings`, `public.invoices`, and `public.invoice_items` with the requested columns, relationships and numeric constraints.
- Enabled `pgcrypto` and `pg_trgm`.
- Verified owner-scoped username and invoice-number uniqueness, owner/name indexes, both partial-search GIN indexes, invoice/customer and owner/created_at indexes, and item/invoice indexes.
- Verified RLS on all four tables: 20 application policies (four CRUD policies plus a restrictive owner boundary per table), using `owner_id = auth.uid()`.
- Verified three update triggers using `public.set_updated_at()`.
- Confirmed the public/publishable client cannot read customers anonymously (`42501`). No anonymous public customer policy was added.

## Customer import and live searches

The user explicitly supplied the owner Auth UUID. The importer verified that account exists before writing data.

| Import statistic | Result |
| --- | ---: |
| Original source records | 715 |
| Valid/imported records | 710 |
| Invalid records skipped | 5 |
| Duplicate usernames skipped | 0 |
| Invalid timestamps | 0 |
| Inserted | 710 |
| Updated | 0 |
| Final owner customer count | 710 |

The first live import attempt encountered a PostgreSQL-driver JSONB encoding error and rolled back. The importer was corrected to use the driver's JSON parameter helper; the successful attempt above committed all batches together. No partial import was retained.

Live `mit` search returns 10 records. The requested source record is actually named **MITKUMAR HARSHADBHAI PATEL(Vishnu jin)** with username **mit_patell**; its original suffix was preserved. The database verification and normal authenticated repository both confirmed search and exact username lookup. The repository also verified exact UUID lookup and unchanged source timestamp values.

## Real application checks

- **Web:** actual email/password login against Supabase, persisted session after reload, live `mit` autocomplete, selection of `mit_patell`, name/address autofill, customer ID persisted in the draft, and logout all passed. Evidence: `artifacts/database-web-live-check.json` and `artifacts/Web-Live-Supabase.png`.
- **Android:** actual owner email/password login and live customer results passed. The requested record was below the initially visible portion of the scrollable dropdown; refining to `mit_patell` selected it and populated the native form. The owner session and selected customer draft both survived a full process restart. Evidence: `artifacts/Android-Live-Supabase.png`.
- **Native PDF:** the newly built APK installed and opened native sharing with the preserved receipt attachment. Evidence: `artifacts/Android-Database-APK-Share.png`. The PDF implementation itself was unchanged by this database phase.

These are local browser/emulator checks. Physical Android hardware and iOS were not tested. No invoice or PDF was sent to another person.

## Automated and build checks

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed, no remaining warnings |
| Unit/PostgreSQL tests | 41 passed |
| Desktop/mobile Chrome workflows | 18 passed |
| Web export and offline cache | Passed |
| Android Hermes export | Passed |
| Native release APK compilation | Passed in 1m 17s |
| Credential scan | 121 generated web/Android/APK asset files checked; no admin credentials or admin environment configuration found |

The PostgreSQL tests execute both extensions and migration code, including repeated upgrades with retained legacy rows, import reruns, two owners sharing a username, cross-owner foreign-key/CRUD denial, anonymous denial, literal punctuation/Unicode searches, inactive rows, snapshot immutability, timestamps, triggers, numeric checks and delete behavior.

The final APK is `artifacts/GigaInvoice.apk` (110,622,320 bytes). SHA-256: `EDECAE847A48B478BA330D4A6450CE4660E115EBBC911A24B91FE95EE6705366`. It uses the existing private-testing signing configuration. Website output is in `dist/`; `npm run preview` serves it locally.

## Scope and operation

Customer data is live in Supabase. Invoice history and business defaults remain device-local under the prompt's customer-first/conditional-sync scope; their database schema is ready for a separate synchronization implementation. The app does not upload the bundled JSON or create remote invoice headers/items on startup or Save.

No database migration or import step remains pending. Use Settings → Customer account to sign into the owner account on another installation. See [SUPABASE-DATABASE.md](SUPABASE-DATABASE.md) for admin commands and schema details. Database and login credentials are confined to the ignored local admin configuration, never app bundles; rotate credentials that were shared in chat and update local configuration accordingly.
