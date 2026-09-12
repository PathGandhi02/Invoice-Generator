# GigaInvoice · Pro Studio

A shared React Native, Expo Router, and TypeScript app for Maruti Giga Fiber. Android, iOS, and responsive web share the editor, customer services, calculations, and local persistence. No backend or Supabase account is required.

## Setup

Use Node.js 22 or newer and npm:

```sh
npm ci
npm run prepare:customers
npm run web
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if execution policy blocks the corresponding PowerShell scripts.

The supplied source is `temp/subscribers.json`. Preparation searches `temp/`, `input/`, and `tmp/` for matching JSON arrays and chooses the file with the most valid customers. Use an explicit path when several exports exist:

```sh
npm run prepare:customers -- "temp/subscribers.json"
```

The script validates with Zod, preserves source values, skips invalid rows and duplicate usernames, and writes `src/data/customers.json`. This source contains 715 records: 710 valid, 5 invalid, and no duplicates. Both source and prepared customer data are excluded from Git. A fresh checkout needs the owner's input before running or exporting the app. To update customers, replace the input and run preparation again. Existing invoice snapshots remain unchanged.

The default logo is `src/assets/logo.jpg`. Icons and embedded PDF fonts are included; regenerate after changing source assets with `npm run prepare:assets`.

## Daily use

1. Search by customer name or username and select a result, or enter a customer manually.
2. Set the plan, price, discount, installation fee, and dates. Package duration fills the time period; internet speed remains separately editable.
3. Choose Invoice or Paid receipt, then preview, save, export, print, or share.

Desktop shows editor and preview side by side. Mobile has Edit details and Preview tabs, document zoom, and output actions. Search waits 250 ms and shows up to 15 matches. Invoice edits never alter the customer directory. UPI QR codes are generated locally; custom QR images and logos are supported.

Settings apply to new invoices. Current invoices retain their own details. Drafts save automatically. Starting another invoice retains up to ten recent drafts in History; saved invoices can be searched and reopened.

## Android and iOS

```sh
npm run android
npm run ios
```

These start Expo and open the corresponding target when available. Compile with the installed Android SDK or macOS/Xcode:

```sh
npm run native:android
npm run native:ios
```

Native PDF output uses `expo-print`, saves files in the app's documents/invoices directory, and opens the system share sheet through `expo-sharing`. Use Share to send PDFs to WhatsApp, email, or Files. Native PDF generation and the Android share sheet have been verified on the Pixel 9 emulator; physical-device share targets still need testing. iOS compilation requires macOS/Xcode.

### APK and App Bundle

The identifier is `com.marutigigafiber.gigainvoice`. `eas.json` configures an internal preview APK and a production build for future store distribution:

```sh
npm run prepare:customers
npx eas-cli login
npx eas-cli build -p android --profile preview
# Future Android App Bundle:
npx eas-cli build -p android --profile production
```

EAS requires an Expo account, project linking, and signing setup on the first build. `.easignore` includes the prepared customer dataset because the private app requires it. An EAS build uploads that dataset with the project to Expo's build service; use local compilation when data must remain on this computer.

Local Android compilation with the installed SDK and JDK:

```sh
npx expo prebuild --platform android --no-install
cd android
# Windows:
.\gradlew.bat :app:assembleRelease
# macOS/Linux:
./gradlew :app:assembleRelease
```

The tested APK is available at `artifacts/GigaInvoice.apk`; see [validation results](docs/VALIDATION.md). Local build output: `android/app/build/outputs/apk/release/app-release.apk`. The generated local release configuration uses a development keystore for private testing. Configure your own signing credentials or EAS signing for distribution. Native directories are generated and Git-ignored; durable configuration belongs in `app.json` or Expo config plugins. See [Expo APK instructions](https://docs.expo.dev/build-reference/apk/) and [local build documentation](https://docs.expo.dev/guides/local-app-development/).

## Web and offline use

```sh
npm run export:web
npm run preview
```

Open `http://127.0.0.1:4173`. Deploy `dist/` to static hosting; the Node server is only for local preview. `npx expo export --platform web` also produces the base export. The npm export script adds an installable manifest and versioned offline cache. Serve at the domain root over HTTPS or localhost, with clean routes such as `/history` resolving to `history.html`.

After the first online load finishes caching, the production website can reopen offline, search customers, edit invoices, and export PDFs. Development mode does not install the cache. Export PDF downloads a file; Print opens browser printing. Web Share uses file sharing where supported, otherwise it downloads the PDF.

Customer data is bundled in the APK and website assets. Keep this private build and web hosting restricted to intended users. The app sends no customer information to analytics, QR APIs, or a backend.

## Persistence and architecture

`StorageService` wraps AsyncStorage under `gigainvoice:v1:*` keys for settings, the current draft, recent drafts, and history. Data stays in browser-local or native application storage and does not sync across devices. Clearing site/app data or uninstalling can remove it. Native PDFs stay in app documents; shared/downloaded copies remain wherever you save them.

```text
Customer UI → CustomerService → CustomerRepository → JsonCustomerRepository
Invoice history → InvoiceRepository → LocalInvoiceRepository → StorageService
Invoice data → shared calculations and HTML → platform PdfService
```

Customers are validated and indexed once per repository instance. Unicode search normalization preserves source values. Calendar date helpers retain the source day. Calculations discount only the plan price, then add installation fees and round monetary output.

To connect Supabase later, implement `CustomerRepository` (`getAll`, `search`, `getByUsername`) and `InvoiceRepository`, then replace the bindings in `src/services/container.ts`. Keep customer fields unchanged: username, full_name, email, address, package, expiry_date, last_recharge_date. Future tables can include customers, invoices, invoice_items, and business_settings. Add authentication and Row Level Security with that migration. `.env.example` contains inactive placeholders; there is no active Supabase connection.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run export:web
npm run export:android
npm run test:e2e
```

Unit tests cover calculations, customer search, source validation, dates, autofill, filename safety, QR payloads, PDF markup, storage failures, and concurrent saves. The source-integrity test uses `temp/subscribers.json`. Browser tests use installed Google Chrome at desktop and Pixel 7 viewport sizes and cover search, receipts, PDFs, history, settings, errors, and offline output. Export web before running them. Android JavaScript export checks bundling; it does not establish successful native compilation or device sharing.
