> Historical report: the current account, guest, workspace and distribution behavior is documented in [AUTH-WORKSPACES.md](AUTH-WORKSPACES.md). Instructions below about bundled customers, owner-only access or local-only signed-in storage are superseded.

# Extended prompt validation — 12 September 2026

> This records the previous extension. See [DATABASE-VALIDATION.md](DATABASE-VALIDATION.md) for the newer live database, import and build status.

The existing Expo application was repaired and extended from `temp/extendedprompt.md`. Implementation and live setup instructions are in [EXTENDED-SETUP.md](EXTENDED-SETUP.md).

## Automated checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 37 passed, including native PDF failure/race tests and actual PostgreSQL migration/RLS tests using PGlite |
| `npx expo install --check` | Dependencies up to date |
| `npx expo-doctor` | 21/21 checks passed |
| `npm run export:web` | Passed; static site and offline cache in `dist/` |
| `npm run export:android` | Passed; final Hermes bundle in `dist-android/` |
| `npm run test:e2e` | 16 desktop/mobile Chrome tests passed |
| `npm run test:e2e -- tests/e2e/supabase.spec.ts` | All 6 passed again after the final customer-directory error-state refinement |
| `gradlew.bat :app:assembleRelease --console=plain --no-daemon` | Final native build passed in 1m 41s; 605 tasks |
| `git diff --check` | Passed |

The original browser workflows cover offline invoicing, export, history, settings and validation. New browser tests use mocked Supabase HTTP responses to verify bounded RPC arguments, selection/autofill, permission errors, missing-backend behavior and explicit persisted offline fallback. They do not establish a working live Supabase database.

The SQL tests execute the migration twice and verify anonymous denial, owner-only reads, rejection of user-editable metadata as authorization, denied client writes, literal wildcard/punctuation searches, Unicode and date preservation, and result limits.

## Android runtime checks

The release APK was installed on the local Pixel 9 Android emulator. Invoice and receipt generation, native sharing and native printing were exercised with synthetic customer names. Sharing received `Invoice_2027-2026_5678.pdf` for invoice number `2027-2026/5678`, and a correctly prefixed/sanitized receipt attachment.

The same verified PDF generation pipeline feeds native Print. Its output was saved locally through Android's **Save as PDF**, pulled from Downloads and parsed/rendered using PyMuPDF:

- `artifacts/Android-Invoice.pdf`: 188,481 bytes, one page, readable invoice number/totals, default business logo and UPI QR. Android's print dialog used its default Letter paper size for this validation copy.
- `artifacts/Android-Receipt-Custom-Logo.pdf`: 244,323 bytes, one ISO A4 page (595 × 841 PDF points), receipt heading, visible PAID stamp, ₹1,250 total, custom PNG logo chosen with the native picker, and UPI QR.
- Rendered evidence: `Android-Invoice-Rendered.png` and `Android-Receipt-Custom-Logo-Rendered.png` in `artifacts/`.
- Native attachment evidence: `Android-Invoice-Share.png`, `Android-Receipt-Share.png` and `Android-Final-APK-Share.png` in `artifacts/`.

These PDF artifacts are copies saved through the Android print service, not direct pulls from the app's private documents folder. The app itself verifies the original generated and copied files' URI, existence, size and PDF header before succeeding or sharing. Files were not sent to people or uploaded to a share target.

## Deliverables

- Final private-testing APK: `artifacts/GigaInvoice.apk` — 110,620,424 bytes (about 105.5 MiB).
- SHA-256: `ED6B2FEF830ADAD86B230D23A6A5867872271377025A6E59F21502433C91E485`.
- Generated native output: `android/app/build/outputs/apk/release/app-release.apk`.
- Website: `dist/`; run `npm run preview` and open `http://127.0.0.1:4173`.
- Customer import: `artifacts/customers-import.csv`, 710 validated records with source timestamps retained; no invalid timestamps were blanked in this source.

The APK is built locally with the existing development signing configuration. EAS/cloud signing was not used. Public Supabase configuration is included in this local build; no privileged key was added. Build artifacts and the private customer dataset are Git-ignored.

## Remaining external verification

The live project reports `PGRST205` (missing `public.customers`) and `PGRST202` (missing `search_customers`). `npm run check:supabase` exits with a setup failure rather than claiming an empty successful directory. Its bounded GET deliberately preserves the server's JSON error; an empty HEAD 404 can be misinterpreted by the installed client as a successful zero count.

Apply the provided migration, import the CSV, create/authorize the owner account, and sign in using [the setup guide](EXTENDED-SETUP.md). The supplied publishable key cannot perform this administrative setup. A real live search for `mit` and selection of the requested customer remain unverified until that setup is complete. Local PostgreSQL and mocked HTTP tests pass, and unavailable live data leaves manual entry and the explicit offline directory usable.

Physical Android devices, receipt delivery through third-party share apps, and iOS/Xcode were not available for verification. Emulator checks are not a claim of physical-device or iOS testing.
