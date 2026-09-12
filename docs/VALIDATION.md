# Build validation — 12 September 2026

The supplied GigaInvoice brief has been checked against the Expo implementation.

## Confirmed

- Customer import: 715 input rows, 710 valid customers, 5 invalid records skipped, no duplicate usernames. Prepared data matches all valid source records.
- Dependency lockfile repaired; npm clean-install validation succeeds. Expo dependency compatibility check passes.
- TypeScript strict checking and ESLint pass.
- All 17 business and persistence tests pass.
- All 10 desktop/mobile Chrome workflows pass. The four PDF/offline workflows were repeated after correcting the footer spacing and passed, including the new single-page receipt assertion.
- Static web export and Android JavaScript/Hermes export succeed.
- Production web offline startup, editing, and PDF export pass.
- Sample receipt exports as one A4 page with logo, QR, paid stamp, correct total, and sanitized filename.

## Local outputs

- Website: `dist/`; preview at http://127.0.0.1:4173 while the local server is running.
- Sample receipt: `artifacts/Sample-Receipt.pdf`.
- Mobile preview: `artifacts/Mobile-Preview.png`.

## Scope

Native APK compilation and emulator verification are recorded below. A JavaScript export alone is not native runtime validation. Real-device share targets and iOS/Xcode require platform checks. No customer data was sent to a backend or cloud build service.

## Android APK and emulator

- Final local release APK compiled successfully; full build took 13m 40s and the final startup-font correction rebuilt incrementally in 1m 34s.
- Output: `artifacts/GigaInvoice.apk` (110,033,136 bytes).
- SHA-256: `1BCCDE3527A07F31F76C818D31B2C47695EB587D3C19C131DD37245DBB99DD54`.
- Uses the generated development signing key for private testing; production signing remains an EAS/owner setup step.
- Installed and launched standalone on the local Pixel 9 Android emulator without Metro.
- Loaded 710 customers, created a synthetic manual invoice for AndroidTest, and displayed the correct INR 1,250 total.
- Draft survived APK replacement and an app force-stop/relaunch.
- Paid receipt PDF generated locally and appeared in saved history.
- Android system share sheet opened with the correct Receipt PDF filename. No share destination was selected and no message/file was sent.
- No AndroidRuntime or ReactNativeJS error log entries were observed during these checks.
- Evidence: `artifacts/Android-Preview.png` and `artifacts/Android-Share.png`.

Physical-device printing/sharing integrations and iOS compilation were not tested. The EAS preview profile is configured; no cloud build or public deployment was performed.

The final native screenshot confirms complete branding and navigation labels after waiting for bundled fonts before mounting the workspace. The final website passed all 10 browser workflows again (22.7s), including single-page PDF and offline checks. TypeScript and lint also passed after this change.
