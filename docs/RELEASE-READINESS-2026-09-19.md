# GigaInvoice — Play Store and Website Release Readiness

**Assessment date:** 19 September 2026  
**Repository:** Invoice-Generator / branch `Invoice_ver01` / commit `e69b9a3`, plus the existing uncommitted customer-rendering fix  
**Scope:** Read-only project assessment, local validation, and current official publishing documentation. This report is the only new tracked file created for this request; application code and configuration were not changed.

## 1. Release decision

**The core product is implemented and suitable for a staging website and further Android testing. It is not yet ready for a public production launch or Play Store submission.**

The remaining work is mainly account/data lifecycle, production configuration, Android distribution, policy materials, and release acceptance testing. There is no evidence that the app needs to be rebuilt from scratch.

| Area | Assessment | Main remaining work |
| --- | --- | --- |
| Invoice and receipt features | Implemented; automated workflows pass | Physical-device acceptance and larger-data checks |
| Guest/offline web use | Implemented; browser tests pass | Production-domain offline/update checks and a clear local-data removal path |
| Supabase integration | Implemented; local database/access-control tests pass | Verify current hosted configuration, email delivery, backups and recovery |
| Public website | Export is available; ready for staging | Hosting, HTTPS domain, build variables, callbacks, public policies and support |
| Google Play release | Blocked | Account deletion, policy declarations, signed AAB, store assets, console setup and testing |

**Recommended next milestone:** finish account deletion and privacy/support materials, configure production authentication, then deploy a staging website and build a signed Android bundle for internal testing.

## 2. What is already present

The project uses Expo SDK 57, React Native 0.86, React 19, Expo Router and Supabase. The website is a static export, so the existing UI does not require a separate application server. Supabase supplies authentication, database functions and private image storage.

| Capability | Evidence |
| --- | --- |
| Optional accounts, guest entry, registration, verification, login, recovery and profile editing | `app/`, [AuthService](../src/services/AuthService.ts), [AuthProvider](../src/state/AuthProvider.tsx) |
| Separate local guest records and cloud workspaces; explicit local import | [WorkspaceProvider](../src/state/WorkspaceProvider.tsx), [GuestMigrationService](../src/services/GuestMigrationService.ts) |
| Customer search/manual entry, invoice/receipt editor, pricing, discounts, installation charges, branding and QR | `src/components/customer/`, `src/components/invoice/` |
| PDF download, sharing, printing, draft persistence and history | `src/services/PdfService*`, `src/services/pdf/`, [history](../app/history.tsx) |
| Database migrations, RLS, protected workspace membership and atomic invoice writes | [Workspace migration](../supabase/migrations/202609120003_auth_workspaces.sql), `tests/*Database.test.ts`, `tests/authWorkspace.test.ts` |
| Private business image bucket and exclusion of private import inputs from Git/EAS | Migration, [.gitignore](../.gitignore), [.easignore](../.easignore) |
| Web manifest, service worker, static routes and local preview server | [Web preparation](../scripts/prepare-web.mjs), [preview server](../scripts/serve-web.mjs) |
| Android package and application assets | [app.json](../app.json), `assets/`, generated `android/` project |

The latest implementation record is [AUTH-WORKSPACES.md](AUTH-WORKSPACES.md). Older validation documents describe superseded bundled-customer and owner-only designs; they should not guide the public release.

## 3. Validation performed for this assessment

| Check | Result and scope |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | **44 passed**, including isolated PostgreSQL migrations/RLS, invoice calculations, persistence, guest isolation/import and native PDF failure handling |
| `npm run test:e2e` | **22 passed** against the existing exported website, in desktop Chrome and an emulated mobile viewport |
| `npm audit --omit=dev` | **0 reported vulnerabilities** in the audited production dependency graph; not a complete security audit |
| `node scripts/verify-public-build.mjs` | Passed for the current web export and existing APK; checked 558 long protected customer names and the old logo |
| Git inspection | Existing code change is the earlier one-line `InvoiceEditor.tsx` fix; `.env`, `.env.admin`, private import data and artifacts are not tracked in the inspected paths |
| Android release manifest inspection | Package `com.marutigigafiber.gigainvoice`, minimum SDK 24, target SDK 36, version name `1.0.0`, version code `1` |
| Existing outputs | `dist/`: 67 files, approximately 13.0 MiB uncompressed; `artifacts/GigaInvoice.apk`: approximately 105.4 MiB. No AAB found in the inspected output locations |

The initial sandboxed test command could not spawn test workers. Running the same suite with the required process access succeeded; this was an environment restriction, not a failed application assertion. Browser testing was also successfully run with the necessary process access.

The web export had already built successfully earlier in this session. This audit exercised that export rather than generating another release. It did not rebuild Android, use a physical phone, send real authentication emails, modify the hosted database, or inspect authenticated Play Console/hosting/Supabase dashboard settings. Cloud browser tests mock Auth and database requests. Earlier real-owner/emulator checks are documented in `AUTH-WORKSPACES.md`; they are historical evidence, not a fresh production acceptance test.

Current APK SHA-256: `6684ec1eb0124f2538e4bbb785d63c8cb8425d885e6fa6ad7114fdb55e0e1434`. This differs from the checksum in the older implementation report. Record the exact commit, checksum and checks for the eventual release artifact instead of reusing that older checksum.

## 4. Work required before public release

### R1 — Add an actionable account-deletion process

**Confirmed missing; Play submission blocker.** Registration exists, but Profile has no deletion action, AuthService has no deletion operation, and there is no dedicated deletion-request route. The privacy notice only says to contact a workspace administrator, without a contact mechanism.

Provide a readily discoverable Profile action and a public web page where a user can request account and associated-data deletion without reinstalling the app. The request can use a securely operated support process or a trusted backend; immediate automated deletion is not the only possible design. Define identity verification, completion handling and retained-data exceptions. Google requires both the in-app path and external resource for this app's account-creation flow. [Google account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

**Project-specific detail:** the workspace migration deliberately changes creator foreign keys to `ON DELETE SET NULL`. Deleting only the Supabase Auth user therefore does not delete all business records or images. Specify separate handling for an individual's workspace and a shared workspace, preserving other members' legitimate records while fulfilling the user's request. Include abandoned workspaces, private Storage objects, drafts and sessions. Privileged deletion credentials must stay in a trusted backend/admin process.

**Complete when:** a test user can request deletion from Android and the website; an authorized process completes it; access is revoked; data removal/retention is verified and explained.

### R2 — Complete privacy, support and Play declarations

**Confirmed incomplete in the repository; Play submission blocker.** [Privacy](../app/privacy.tsx) is a short notice, with no named operator/contact channel or concrete retention/deletion policy. [Terms](../app/terms.tsx) is also brief. No dedicated support or deletion website page was found.

Publish a public HTML privacy policy naming GigaInvoice/the operator, with a working privacy contact, data uses and recipients, security practices, retention and deletion rules. Align Play Data safety answers with the actual signed-in behavior. An entirely local guest mode does not make the cloud product a “no data collected” app. [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).

Make legal/support/deletion pages reachable without account restoration. Currently all routes pass through the auth/workspace boundary in [the root layout](../app/_layout.tsx), and a workspace restoration error can prevent the route content from rendering. A public policy should remain available when an account or backend is unavailable.

Suggested data inventory for the owner to review before completing the form:

| Data handled by this project | Observed use |
| --- | --- |
| Account email, user ID, name and optional phone | Authentication and profile/workspace management |
| Customer names, contact details, addresses and service dates | Customer directory and invoice content |
| Invoice amounts, payment status, method and UPI instructions | Business documents and payment instructions |
| Uploaded logos/custom QR images | Branding and document generation |
| Local guest drafts, customers and history | Device/browser storage; explicit optional cloud import |
| Exported/shared PDFs | User-selected downloads and share destinations |

This is an inventory, not a pre-completed Data safety declaration. The owner must confirm provider processing, retention and applicable form categories. No advertising, analytics or crash-reporting SDK was identified in the reviewed application dependencies; provider logs and future SDK additions still need consideration.

### R3 — Produce a properly signed Android App Bundle

**Confirmed missing locally; Play distribution blocker.** The generated `android/app/build.gradle` uses `signingConfigs.debug` for release. The existing APK is for testing. `npm run build:apk` explicitly uses the EAS preview/APK profile.

Choose EAS Build or a managed local release process, configure the upload key and Play App Signing, and produce a release `.aab`. Preserve the upload credentials securely and verify package ownership before the first upload. `eas.json` contains a production profile with auto-increment, but no `extra.eas.projectId` is present in `app.json`; the repository does not establish that the Expo project and remote credentials are configured. [Android signing](https://developer.android.com/studio/publish/app-signing), [Expo production builds](https://docs.expo.dev/deploy/build-project/).

The generated native folders are ignored and excluded from EAS uploads. Make any future permission or native configuration changes reproducible through Expo configuration/plugins, not only in this local generated directory.

**Complete when:** the signed AAB uploads to Play's internal track, installs through Play, launches without Metro, and passes the acceptance checks below.

### R4 — Configure production cloud authentication and delivery

**External configuration unverified; gate for public account registration.** Source support for callbacks/reset links exists. Earlier setup covered local URLs and the native scheme; a production domain is not configured in the repository.

Set the production Supabase Site URL and exact HTTPS callback/reset redirects for the selected domain. Keep the native `gigainvoice://auth-callback` and `gigainvoice://reset-password` routes. Test registration, confirmation, resend, reset, expired links and session restoration on the actual website and signed Android build. The present PKCE flow expects an email link to be opened in the originating browser/device; test and explain that limitation.

Verify a production email provider/custom SMTP configuration and domain authentication. Supabase's default sender is intended for non-production use and restricts recipients/rates. Its actual configuration was not inspected here. [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

Set both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the hosting/EAS build environment. `.env` is excluded from EAS upload. These values are embedded at build time, so a build without them can disable cloud accounts even though local development works. [Expo environment variables](https://docs.expo.dev/eas/environment-variables/usage/).

### R5 — Rotate previously shared credentials and establish recovery

**Required before production use.** Database and account passwords were supplied in the earlier setup conversation. Rotate those passwords locally/in the relevant consoles and update trusted local configuration. Do not reproduce them in release documentation, client variables, build logs or Git.

Verify current RLS/grants and private Storage on the hosted project, establish database and image backups, and perform a restore exercise. Confirm ownership/MFA, email quotas and an availability plan. The database schema/tests are present; current project plan, backup coverage, SMTP and dashboard security settings remain unverified. Supabase documents plan-dependent availability and backup considerations in its [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).

### R6 — Complete release acceptance and store setup

**Pending evidence; release gate.** Existing emulator and mocked browser checks are useful, but do not establish physical-device behavior or Play review readiness. Complete the Android/store checklist in section 6 and the hosted website checks in section 5.

## 5. Website hosting plan

**Recommended first host:** Netlify for the existing static output. EAS Hosting is a reasonable alternative if you want Expo to manage both build and web deployment. The choice is operational; the current UI does not require a VPS. Expo documents static output and these hosting paths. [Expo web publishing](https://docs.expo.dev/guides/publishing-websites/).

| Setting | Recommended value/action for this repository |
| --- | --- |
| Source | Correct GitHub repository and a deliberately selected release branch |
| Install | `npm ci` using the lockfile and a compatible, pinned Node version |
| Build | `npm run export:web` — includes this project's PWA preparation step |
| Publish directory | `dist` |
| Deployment path | Domain root; manifest/service-worker paths are root-relative |
| Environment | The two public Supabase variables, set before building |
| Domain | One canonical HTTPS domain; redirect other aliases consistently |
| Routing | `/profile`, `/privacy`, `/auth-callback`, etc. must resolve to their generated HTML routes and preserve query parameters |
| Caching | Revalidate HTML and `sw.js`; use long caching for content-hashed assets; verify upgrade behavior |
| Operations | Preview deployments, a known rollback version and basic uptime/error monitoring |

No hosting-provider deployment file or CI workflow was found in the reviewed checkout. Hosting may still have been configured externally; this audit does not prove no external deployment exists. The local `serve-web.mjs` server is a loopback preview tool, not the public hosting setup.

Before enabling public registration, verify:

1. Direct navigation and refresh on every route, including recovery links with query parameters and a real 404.
2. Real sign-up/confirmation/reset emails against the production domain and a non-owner test account.
3. Signed-in customer search, create/save/reopen, account switching and explicit guest import with fictional records.
4. PDF export and print on Chrome, Firefox, Edge and Safari; mobile-browser sharing where supported.
5. PWA install, offline guest launch/export and upgrade from the previous deployed version without draft loss.
6. Public privacy/support/deletion pages in an incognito browser and with the backend unavailable.
7. HTTPS and suitable response headers. Test any Content Security Policy with the PDF renderer, inline styles, data images, fonts and print iframe before enforcing it.
8. Deployment uploads only the intended public output. Keep `.env.admin`, private imports and internal artifacts out of hosting.

The export currently totals about 13 MiB uncompressed, and the service worker precaches the exported assets. Measure first-load/install behavior on slow mobile connections; static-host compression and caching need to be verified on the selected host.

## 6. Google Play checklist

| Requirement | Current position and next action |
| --- | --- |
| Developer account | Account type/status not inspected. Complete Play registration, identity/contact and applicable device verification. Google lists a US$25 one-time registration fee. [Account setup](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) |
| Package/version | Present: `com.marutigigafiber.gigainvoice`, `1.0.0` / code `1`. Confirm final publisher identity and keep version codes increasing |
| Target SDK | Existing generated release manifest targets **36**, meeting the requirement for new phone/tablet submissions effective 31 August 2026. Recheck the final AAB. [Target API policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) |
| Native compatibility | Validate final AAB/APKs for 64-bit and 16 KB page-size support, including every native library; test on a suitable device/emulator. SDK versions alone do not prove this. [Android page-size guidance](https://developer.android.com/guide/practices/page-sizes) |
| Signing/build | Replace development signing with the production process; upload an AAB and enable Play App Signing |
| Permissions | Release manifest includes `SYSTEM_ALERT_WINDOW` plus legacy read/write external storage through SDK 32. Establish necessity and remove unused permissions through reproducible Expo config; retest document picking, PDF output and sharing |
| Privacy and deletion | Complete R1/R2, publish both URLs, and enter them in the console |
| Store material | Prepare a 512×512 Play icon, 1024×500 feature graphic, current screenshots, short/full descriptions, support contact, category and release notes. Existing 1024×1024 launcher assets are not the required Play listing icon. Use fictional customer details. [Asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) |
| App content | Complete Data safety, content rating, target audience, ads declaration and other applicable console forms; match the implemented functionality |
| Reviewer access | Supply a dedicated verified account with fictional business data and clear instructions for restricted functionality. Explain the protected-directory access model. Do not hand over the real customer-owner account. [Review preparation](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en) |
| Testing track | First use internal testing and inspect the pre-launch report. For personal accounts created after 13 November 2023, the current rule requires at least 12 testers opted into closed testing continuously for 14 days before applying for production access. Applicability depends on this developer account. [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) |
| Release review | Resolve crashes, ANRs, policy and compatibility findings; obtain production access where required; submit the first production release after acceptance |

Physical-device acceptance should cover cold start, slow/offline network, guest persistence, real account emails/deep links, signed-in workspace isolation, PDF generation with custom logos/QRs, the actual share targets users need, system print, rotation/large screens, large text/TalkBack, and an update from an earlier signed test version. Include a low-memory device and current Android behavior. Preserve guest data when planning the transition from the existing debug-signed APK to a differently signed store build; an uninstall can erase it.

## 7. Improvements to schedule, distinct from store blockers

| Priority | Finding | Recommended follow-up |
| --- | --- | --- |
| Before broad production use | Native Auth sessions use AsyncStorage; Android allows backups, with no explicit backup rules observed | Review secure session storage and backup exclusions for tokens/private local data. This is a security design task, not a claim that AsyncStorage itself causes Play rejection |
| Before significant data growth | Cloud invoice history fetches all invoice documents in batches and filters them locally on each search | Add server-side search/pagination and lightweight list records; load full document/images when opening an invoice |
| Before significant image growth | New logos use new Storage paths; the reviewed settings save path does not remove replaced uploads | Define cleanup for unused uploads and include it in deletion/retention handling |
| Before launch | No configured crash-reporting service or repository CI pipeline found | Add release checks, privacy-conscious error monitoring, alerts and an operational rollback procedure |
| Before launch | Guest storage has no visible clear-all/backup-restore workflow | Provide understandable local removal and backup guidance; distinguish local copies from cloud account deletion |
| After initial release | Customer administration, bulk export, richer line items/tax fields and reporting are limited/absent | Prioritize from actual business needs; these are product improvements, not automatic Play requirements. Do not market unsupported accounting/tax capabilities |
| Optional | Avatar uploads, push notifications, social login, paid subscriptions and OTA updates are absent | Add only if needed. Initials already meet the current profile approach; these features are not prerequisites for this release |

Signed-in cloud work currently requires a connection. Offline functionality is demonstrated for guest mode. Store and website copy should describe that distinction accurately.

## 8. Recommended order and ownership

| Stage | Owner | Deliverable / exit condition |
| --- | --- | --- |
| 1. Confirm release identity | App owner | Final developer identity, Play account type, package/brand, launch countries/audience, support/privacy email, domain, hosting/SMTP budget |
| 2. Close release gaps | Developer + owner | Deletion request and fulfillment process, complete privacy/support pages, credentials rotated, permissions/storage/retention decisions recorded |
| 3. Configure staging | Developer + owner | HTTPS staging website, build variables, verified production email setup and callback configuration; backup/restore plan checked |
| 4. Build Android candidate | Developer | Reproducible production signing, AAB, exact commit/checksum, private-data scan, API/page-size verification, internal Play install |
| 5. Acceptance | Owner/testers + developer | Real email and physical-device matrix complete; hosted-browser checks pass; pre-launch findings resolved |
| 6. Publish | Owner + developer | Website promoted after acceptance; store listing/declarations complete; required closed-test period and production access satisfied; app submitted for review |
| 7. Operate | Owner + developer | Monitor availability/errors/storage/email, answer support/deletion requests, test restores and maintain dependencies |

**Immediate next development task:** account deletion plus public privacy/support pages. **Immediate next owner task:** choose the domain and confirm the Play developer account type/status. These decisions unblock the callback, email, policy URL and testing-track work.

The 14-day closed-test window, if applicable, is external lead time after a testable release is available. Account verification, email-domain setup and store review also affect the schedule; this report does not promise a fixed publication date or approval.

## 9. Repository and scope notes

- The existing `InvoiceEditor.tsx` rendering fix remains uncommitted. Include it in the eventual release commit before a Git-based deployment; it was not modified during this audit.
- No migrations, dependency upgrades, credential rotations, deployments, store submissions or messages to other people were performed.
- New test output is local/ignored. The only new report is this Markdown file.
- Backend/customer counts and the second protected member's onboarding status were not checked live. The historical implementation report records one additional approved member still needing registration/verification; confirm that status if needed for the business rollout.
- This is a release-readiness review supported by code inspection and the checks above, not a penetration test or a guarantee of Play approval. The official policy links were checked on the assessment date; recheck console requirements when submitting.
