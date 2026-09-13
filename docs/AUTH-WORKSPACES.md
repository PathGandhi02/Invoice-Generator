# Auth, guest and protected workspace implementation

Implemented from `temp/GigaInvoice_Auth_Profile_Guest_Maruti_Access_Prompt.md` in the existing Expo app and existing Supabase project `vldwycierouwmyhlabwc`. This report supersedes earlier documents describing a bundled offline Maruti directory or owner-only cloud customers.

1. **Authentication files.** `src/services/AuthService.ts`, `src/state/AuthProvider.tsx`, `src/lib/supabase.ts`, `src/components/account/AuthScreen.tsx`, `Welcome.tsx`, and routes `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `auth-callback`, `terms`, `privacy`. Supabase manages passwords and sessions. Registration includes full name, optional phone, password confirmation, visibility toggle and consent. Errors avoid revealing whether a reset-email account exists. Resend/reset UI has a 60-second cooldown.

2. **Profile files.** `app/profile.tsx` edits personal full name and phone and displays the account email, verified status, workspace and initials. It links to business settings, password change and logout. Initials implement the permitted avatar fallback; avatar uploads were not added.

3. **Migration.** `supabase/migrations/202609120003_auth_workspaces.sql` is applied to the existing project. Prior migrations remain unchanged. The migration is transactional, can be repeated, and is recorded in the trusted checksum ledger.

4. **Profiles.** `profiles(id PK/FK auth.users, full_name, phone, avatar_path, created_at, updated_at)`. No passwords or password hashes. Own-account SELECT/INSERT and column-limited UPDATE with a restrictive ownership boundary.

5. **Businesses.** `businesses(id UUID PK, name nullable, protected_key unique nullable, created_at, updated_at)`. Ordinary accounts receive a new, unnamed workspace. Members can read their workspace and update its name; clients cannot alter the protected key or create protected businesses.

6. **Memberships.** `business_members(id, business_id, user_id, role owner/admin/member, status active/inactive, created_at)` has unique `(business_id,user_id)` and a user lookup index. Clients can read their own valid memberships but have no membership mutation grants.

7. **Allowlist.** `business_access_allowlist(id, business_id, email, role, is_active, created_at)` has a case-insensitive unique workspace/email index. There are no client table grants. Trusted provisioning links only the two approved, confirmed Auth identities.

8. **RLS.** All nine application tables have RLS. `is_business_member(uuid)` reads the current Auth record, active membership and server allowlist. For Maruti it also requires a confirmed email and an exact case-insensitive match to one of the two approved addresses. It does not trust client metadata or JWT email text. Restrictive policies bound access even if a permissive policy is accidentally added. Customers/settings/invoices/items require workspace membership. Drafts additionally require the current user. Composite foreign keys prevent cross-workspace customer/invoice relations. Clients write invoice headers and items only through the atomic `save_invoice_document` RPC, which calculates monetary totals on the server.

9. **Triggers.** `gigainvoice_auth_profile` runs after Auth insertion or email/confirmation changes and invokes the server-only provisioning function. It creates a profile and an appropriate membership, preserving inactive memberships. `ensure_workspace()` repairs missing own-account provisioning safely. Updated-at triggers maintain profile, business, settings, customer and draft timestamps.

10. **Guest storage.** `StorageService` supports immutable namespaces. Guest data uses `gigainvoice:v2:guest:*`; preferences/import journals use `gigainvoice:v2:preferences:*`. Guest customers start empty. No fake Auth user or profile is created. Existing v1 device data is quarantined, retained and offered only to authorized protected-workspace users.

11. **Repository selection.** `WorkspaceProvider` creates fixed, scoped local or cloud repositories. `AppProvider`, customer search, history and settings consume those services. Authentication transitions clear the visible workspace synchronously, then restore the new identity and remount the workspace. Cloud failures expose retry/sign-out rather than falling back to another account or guest records.

12. **Local import.** `GuestMigrationService` and `GuestImport` show Import to My Account / Keep Local Data Separate / Not Now. Saved invoices are included; customers, replacement defaults and the current draft are explicit choices. Adding customers to the protected master requires another confirmation. Stable import IDs and per-operation completion fingerprints support retries without duplicates; cloud invoice-number conflicts stop rather than replace another document. Local copies remain after success or partial failure. Fingerprints contain no copied invoice/customer content. Earlier private device records have a separate authorized import panel.

13. **Defaults removed.** Generic/guest company name, addresses, business phone/email, UPI ID, plan and period are empty. Currency, country and accent retain neutral defaults. Missing company name is valid. QR is initially off without a UPI ID. Existing saved business/invoice values are retained; the protected workspace name is loaded from its authorized business row.

14. **Logo removed.** No default logo is imported by preview or PDF HTML. An absent logo renders no image allocation; company heading is also omitted when blank. The old image and prepared directory were moved to ignored `temp/private-import/`. A stale native generated resource found by the release scanner was removed before the final APK.

15. **Protected workspace ID.** `c8a94e21-5162-4d77-b436-819362b86ac0`, protected key `maruti-giga-fiber`.

16. **Approved identities, live checked.** `pathmgandhi@gmail.com` has a confirmed Auth account and active membership. `manish10gandhi@gmail.com` is allowlisted but has no linked Auth account yet. That person must register and verify email; no password/account was invented. The trigger then links membership automatically.

17. **Unauthorized access.** Hosted verification confirmed anonymous REST denial and an unrelated confirmed identity's inability to read Maruti rows, even with the approved email copied into JWT claims. The test identity was inserted only inside a transaction and rolled back. Local PostgreSQL tests additionally cover the second approved but unverified email, confirmation activation, forged memberships/metadata, cross-account profiles/drafts/images, email-change revocation and forbidden membership/allowlist writes.

18. **Preserved data.** Live comparison verified all 710 original username/full-name pairs in the protected workspace. Customer IDs are updated in place by the migration. Before migration the existing cloud invoice/item/settings tables were empty. Local v1 records remain on their original devices. Creator FKs now use SET NULL so shared business records survive deletion of their original creator.

19. **Private images/storage.** `business-assets` is a private Supabase bucket, limited to PNG/JPEG/WebP and 3 MiB. Object paths begin with the workspace UUID, and storage RLS checks membership. Settings store private paths; authenticated downloads are converted to in-memory images for PDF generation. Invoice document snapshots retain the logo/QR that was explicitly used. No public image URL or persistent cloud customer cache is created.

20. **Password reset and links.** PKCE callback handling supports both web and `gigainvoice://` native routes and passes Supabase `sb_flow_id` when present. The recovery state keeps the app on the new-password screen through account restoration. Successful web callbacks remove one-time codes/tokens while preserving router history state. Implicit token callbacks are supported for compatibility. Open emailed links on the originating device/browser.

21. **Validation.** 44 distinct unit/PostgreSQL tests passed across the full baseline run and the final native PDF regression run. Browser coverage includes 22 desktop/mobile cases: optional guest entry, blank defaults, legacy quarantine, scoped cloud search, profile save, persistent sessions, logout/account switching, explicit import, registration validation, resend/reset callbacks, PKCE password update, cloud restore failure, manual invoices, saved settings/history, one-page PDFs and offline guest export. TypeScript and lint passed; Expo diagnostics passed 21/21. Hosted database verification and a real-owner browser sign-in/search/autofill/cloud-draft/logout check passed; the browser test restored the pre-test cloud draft. Release asset scanning checks web and APK contents against 558 long private customer names in UTF-8/UTF-16 and the original logo.

22. **Dashboard configuration.** The user confirmed adding `gigainvoice://auth-callback`, `gigainvoice://reset-password`, `http://localhost:8081/auth-callback`, `http://localhost:8081/reset-password`, `http://127.0.0.1:4173/auth-callback`, and `http://127.0.0.1:4173/reset-password` to allowed redirects. Add deployed HTTPS equivalents and set the production Site URL when hosting. Registration/email confirmation are enabled. Inbox delivery, SMTP limits and actual clicked production emails have not been independently tested. The reset-link browser tests use controlled Auth responses.

23. **Android.** Local release APK builds successfully with the existing Android SDK/JDK. Emulator validation restored the existing authorized session and 710-customer directory, then verified logout to an empty guest directory. The fictional guest invoice generated successfully, opened the Android share sheet and rendered as one page in system print preview. Its saved PDF was inspected for the correct customer, plan, 10% discount and total of INR 1,325.45, with no default company/logo. An initial WebView stall was reproduced; native rendering now has a 45-second timeout, releases the action lock for retry and cleans up late output. The timeout, retry and late-file cleanup test passes. Physical-device targets and store signing remain separate from emulator validation.

24. **Web.** Production export includes 15 routes and the offline asset cache. The current build is served at http://127.0.0.1:4173. Private customer JSON and the old logo are absent from application imports and distribution assets. Supabase responses are outside the service-worker cache.

25. **Remaining external steps.** The second approved user must create/verify their account. Configure production hosting callbacks and production signing when deploying. iOS needs macOS/Xcode. Real email delivery and physical-device share targets remain unverified; no known failed access-control test is left unresolved.


## Final artifacts

- APK: `artifacts/GigaInvoice.apk`, 110,535,192 bytes.
- SHA-256: `60679e10965d1778cfa8b232bf66467f715dac18a560fffca2f3c8e40492822d`.
- Web: `dist/`, served at http://127.0.0.1:4173.
- Native PDF evidence: `artifacts/Android-Guest-Validation.pdf`, `artifacts/Android-Guest-PDF.png`, `artifacts/Android-Guest-Print-Preview.png`.
- Validation logs: `.tooling/auth-e2e-final.log` (22 passed), `.tooling/auth-android-build-final.log` (build successful).
- The final APK and web asset scan passed after replacing the stale generated logo resource.
