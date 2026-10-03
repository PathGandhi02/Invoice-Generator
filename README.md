# GigaInvoice

An Expo/React Native invoice and receipt app for Android, iOS and responsive web. Accounts are optional. Guests keep their own local customers, settings, drafts and history; signed-in users use Supabase business workspaces. The shared Maruti directory is available only to its approved verified members and is never bundled in the app.

## Run

```sh
npm ci
npm run web
```

On Windows use `npm.cmd` / `npx.cmd` if PowerShell blocks unsigned scripts. Guest mode needs no database credentials. Cloud accounts use only the public project URL and publishable key from `.env.example`, copied into a Git-ignored `.env`.

```sh
npm run export:web
npm run preview
```

Preview: http://127.0.0.1:4173. Deploy `dist/` at a domain root with routes such as `/profile` resolving to `profile.html`. Production web caches application assets for offline guest use; it does not cache Supabase responses. Signed-in cloud work requires a connection. Browser or app data clearing can erase guest records; keep exported copies.

## Use

1. Choose Continue as Guest, Create Account or Sign In.
2. Select one of your saved customers or enter a customer manually. Blank business details are allowed; set your plan, time period, amounts and dates.
3. Preview, save, export, share or print an invoice or paid receipt. Add your own logo and UPI/custom QR if needed.
4. Profile manages your personal details, business settings, password and logout. After signing in, choose whether to import local records. Import never runs automatically.

Guest storage uses `gigainvoice:v2:guest:*`. Earlier `gigainvoice:v1:*` data is retained separately because it may contain protected business information; approved Maruti members can explicitly review/import it from Profile. Switching accounts destroys the previous workspace's component and repository instances. Cloud business data is not persisted in guest storage.

Guest Settings includes **Clear guest data on this device**, with confirmation and recovery after an interrupted reset. It removes local guest records and embedded images while preserving separately protected legacy records, account sessions and exported PDFs. Other open guest windows are invalidated. Web updates wait until all app windows close; finish your work before reopening to activate an update.

See [invoice and guest/offline acceptance](docs/INVOICE-GUEST-OFFLINE-ACCEPTANCE.md) for measured storage limits, current candidate artifacts, physical-device evidence and outstanding hosted checks. Reproduce the synthetic repository benchmark with `npm run benchmark:invoices`; browser fixtures run with `npm run test:e2e`. Set `GIGAINVOICE_TEST_URL` to an authorized test origin for browser checks; the two-build update harness always uses an isolated local origin.

## Database and email links

See [the auth/workspace implementation report](docs/AUTH-WORKSPACES.md) for schema, access rules, verification and setup. Migrations are applied once through a checksum ledger:

```sh
npm run db:apply
npm run db:verify
```

Trusted administration uses Git-ignored `.env.admin`. Never put a database password, service-role key or admin token in an `EXPO_PUBLIC_*` variable. Keep applied migrations unchanged; add a new file for later changes.

Registration requires email confirmation. Add the app's callback and reset URLs under Supabase Authentication → URL Configuration. Native URLs are `gigainvoice://auth-callback` and `gigainvoice://reset-password`; web URLs use the current origin with `/auth-callback` and `/reset-password`. Open PKCE emails on the device/browser where they were requested. Add your deployed HTTPS origin when hosting publicly.

The two approved Maruti emails are maintained in a server-only allowlist. An email entry is not a login account. Registration plus verified email links an approved identity automatically; no other user can grant themselves membership.

## Private customer import

Private input is not required to run or build the app. Trusted preparation writes only to `temp/private-import/`:

```sh
npm run prepare:customers -- temp/subscribers.json
npm run db:import:check
npm run db:import
```

The importer resolves the configured owner's verified Maruti membership and upserts by workspace/username, preserving customer IDs and inactive status. It rejects an unapproved owner. The original 715 input rows contained 710 valid customers and five invalid rows. Input, prepared data, admin configuration and artifacts are excluded from Git and EAS upload.

## Android / iOS

```sh
npx expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleRelease
```

Windows uses `.\gradlew.bat`. Use JDK/Android SDK environment paths matching your host. The local APK is `artifacts/GigaInvoice.apk`; this development-signed build is for testing. Configure production signing before store distribution. EAS profiles are also available in `eas.json`. iOS native compilation requires macOS/Xcode and was not performed on this Windows host.

Native PDFs are verified local files before the app reports success or opens the share/print sheet. Downloaded/shared copies remain on the device after logout. Physical-device share targets still require device testing.

If upgrading an older native checkout, remove stale generated `src_assets_logo.jpg` resources from the previous bundle or perform a clean build. Scan release artifacts before distribution:

```sh
node scripts/verify-public-build.mjs
```

This local scan requires the original private input and logo under `temp/private-import/`; they are comparison inputs only and are not shipped.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
npm run export:web
npm run test:e2e
npm run db:verify
```

Tests cover guest isolation/import retries, PostgreSQL membership and RLS, verified allowlist access, private image storage, invoice transactions, calculations, PDFs, persistence, auth forms, recovery callbacks, logout and offline guest journeys. Browser tests use fictional data and mocked Auth except for a separate local real-owner acceptance check. They do not establish delivery of real verification/reset email.
