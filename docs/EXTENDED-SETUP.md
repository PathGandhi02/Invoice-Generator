> Historical report: the current account, guest, workspace and distribution behavior is documented in [AUTH-WORKSPACES.md](AUTH-WORKSPACES.md). Instructions below about bundled customers, owner-only access or local-only signed-in storage are superseded.

# Extended prompt implementation and setup

> Historical report for the earlier extension. The new [production database guide](SUPABASE-DATABASE.md) supersedes its Supabase setup, RLS and missing-table status. Use `owner_id = auth.uid()` and the trusted owner import; the old app_metadata owner claim is no longer required. See [current live validation](DATABASE-VALIDATION.md).

## Android PDF repair

The installed `expo-file-system` 57 API defines `File.copy()` as returning `Promise<void>` (also implemented as an Android `AsyncFunction`). The old PDF service did not await it, deleted the source immediately, and returned a destination URI without checking it. Android could therefore share before copying completed, copy from an already deleted source, or report success for missing/partial output. Repeated exports also reused and deleted the same destination filename.

`NativePdfPipeline` now generates HTML from the existing invoice model, awaits `expo-print`, verifies a local URI, nonempty size and `%PDF-` header, awaits copying, and verifies the named destination's header and size against the source. It only deletes the temporary file after that work settles. Each operation gets a separate subdirectory so later exports cannot overwrite a file another application is reading. A service-level lock and synchronous button guard reject overlapping actions. Button labels show generation/preparation progress, and failures cannot report PDF success.

Sharing checks availability, generates through the same pipeline, revalidates the output and awaits `expo-sharing`. Print also consumes the verified PDF. The existing web PDF adapter is retained. Logo/QR/paid stamp use the existing offline printable HTML assets; no screenshot or external QR service is used.

Temporary output is initially in Expo Print's app cache. Completed PDFs remain in the app's documents directory at `invoices/<operation-id>/Invoice_<sanitized-number>.pdf` or `Receipt_<sanitized-number>.pdf`. The operation directory is unique; the visible attachment filename remains exactly the sanitized invoice/receipt name. Files are kept after the share sheet closes because receiving applications can read asynchronously. No broad Android storage permission was added.

Development logs record stages, URI presence, page count, file sizes, share availability and error class without printing customer data or credential values.

## Supabase setup still required

The supplied URL and publishable key are configured in Git-ignored `.env`. Only these client-safe values are read:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The live project returned `PGRST205` for `public.customers` and `PGRST202` for `search_customers`. This workspace has no authorized database administration connection. The migration has been tested locally but has not been applied to the live project.

Perform these steps in the owner's Supabase Dashboard:

1. Inspect any existing tables/policies, then execute [the customer migration](../supabase/migrations/202609120001_customers.sql) in the SQL editor. It creates the table if missing, installs the search function and timestamp trigger, enables RLS, removes anonymous access and client write grants, and limits authenticated reads to the owner role. It does not drop table data. Its restrictive policy also constrains any existing permissive policies, so review it if this table is shared with another application.
2. Import `artifacts/customers-import.csv` into `public.customers` using the table editor. It contains all 710 valid source customers with unchanged timestamps. ID/created_at/updated_at columns use database defaults. Do not re-import over an existing populated table without deciding how to handle duplicate usernames.
3. Create or identify the owner's email/password account under Authentication → Users. This app provides sign-in only; it does not allow public registration.
4. Assign the owner claim through trusted administration. In the SQL editor, substitute the owner's Auth user UUID:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"gigainvoice_role":"owner"}'::jsonb
where id = 'OWNER_AUTH_USER_UUID';
```

5. Sign in under Settings → Customer account. If the account was already signed in before its role changed, sign out and back in to obtain a fresh token. Search a known name/username, such as `mit`, and confirm the record comes from live data.

No service_role, server secret, password, or admin key belongs in `.env`, `EXPO_PUBLIC_*`, app configuration, or the APK. Do not grant customer reads based on user_metadata: users can edit it. The migration uses protected app_metadata and remains read-only for clients. Local invoices and business settings remain device-local and are not uploaded to Supabase.

## Data flow and fallback

`src/lib/supabase.ts` creates a typed client with native session persistence and foreground token refresh. `SupabaseCustomerRepository` implements the existing repository contract. Search calls a parameterized `search_customers` RPC over `public.customers`: case-insensitive name/username matches, literal wildcard escaping, a two-character minimum, and a default maximum of 15 results. Startup queries count metadata with at most one returned row, not the whole table. Errors/timeouts reach understandable UI messages.

CustomerSearch retains its debounce, dropdown, manual entry and autofill. Live errors never silently substitute local results. The user can choose **Use offline customer data**; that selection is saved and the directory is prominently labeled **Offline customer data · Saved directory snapshot**. **Use live customer data** retries the live repository. The bundled fallback is the owner's supplied static directory, not a cache of authenticated remote results.

The public client configuration and static customer fallback remain extractable from a private APK/web bundle. Keep distribution of the bundled offline directory private. Signing out ends this device's live session; existing device-local invoices, settings and the bundled offline directory remain on the device.

## Files and dependencies

Main changed files: `src/services/PdfService.ts`, `src/services/pdf/NativePdfPipeline.ts`, `src/components/invoice/InvoiceActions.tsx`, `src/lib/supabase.ts`, `src/repositories/SupabaseCustomerRepository.ts`, `src/services/CustomerService.ts`, `src/services/container.ts`, customer model/schema/interface, `CustomerSearch.tsx`, `CustomerAccount.tsx`, `AccountService.ts`, and Settings. Added the migration, development connection checker, CSV preparation script and PDF/repository/SQL/browser tests.

Added runtime packages: `@supabase/supabase-js` and `react-native-url-polyfill`. Added dev-only `@electric-sql/pglite` to execute migration/RLS tests locally. Existing Expo 57, expo-print, expo-sharing and expo-file-system versions were retained.

## Run and verify

```sh
npm install
npm run prepare:customers
npm run prepare:supabase
npm run check:supabase
npm run typecheck
npm run lint
npm test
npx expo start
npx expo start --android
npx expo start --web
npm run export:web
npm run export:android
npm run test:e2e
```

`check:supabase` is an owner/development CLI, not a production screen. It makes a bounded SELECT, reports setup/permission/network errors, and prints no rows or credentials. Denial of anonymous access is expected after RLS setup and does not substitute for a signed-in search test.

For a cloud preview APK, after configuring an Expo account/project and the same two public environment values in its build environment:

```sh
eas build -p android --profile preview
```

`.env` is excluded from the EAS archive, so set those values for the EAS build environment before building. The local customer dataset is deliberately included for this private offline fallback; an EAS build uploads that dataset to the build service. Local Android building is documented in the main README and avoids that upload.

See the current [validation report](EXTENDED-VALIDATION.md) for actual APK, web, test and device results. Physical Android device/share-target and iOS verification must be distinguished from local emulator checks.
