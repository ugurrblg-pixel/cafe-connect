# Riyo beta release evidence — 5 November 2026

## Implemented in this release

- Same-origin standalone manifest, 192/512px PNGs, separate maskable icon and 180px Apple touch icon, derived from the existing Riyo dark logo. No store submission or native installation is claimed.
- Offline navigation fallback contains only generic Turkish help and a retry link. The service worker stores only offline.html and icons, never authenticated HTML, APIs, messages or private photos. HTTP errors remain HTTP errors. No automatic page reload on worker activation.
- Push notifications remain unavailable without a delivery service/subscription. The dormant worker uses generic notification text and same-origin targets; it does not log push payloads.
- Confirmed owner support address: support@cafemeet.com. Settings, terms/privacy contact details, localized help and error-boundary support link use it. No message was sent to this mailbox.
- Public share metadata points to riyosocial.app. `npm run verify:release` performs public, read-only deployment checks; it is not a private-user workflow test.

## Validation status and dependencies

- Anonymous production POST to delete-account returned 401 sign_in_required. This proves anonymous denial only, not enabled flags or complete deletion.
- Account-deletion UI/handler and worker tests passed locally. Full live deletion still needs a designated disposable account and storage/Auth verification; never delete an existing owner account as a test.
- Supabase access recovered through the in-app browser. Project status is Healthy. The dashboard explicitly reports that this Free Plan has no project backups. Restore has not been exercised; no plan upgrade or database restore was started.
- Read-only live SQL confirmed prepare_account_deletion(uuid) and private.account_deletions exist; authenticated cannot execute preparation directly, service_role can. The legacy JWT gateway is off as previously authorized; anonymous endpoint requests still return 401 through function-owned auth. The signed-in owner's profile shows the enabled deletion action. No real account was deleted and the backend feature flag's value was not extracted.
- GitHub Release quality runs typecheck, tests and production build with isolated placeholder environment values and contents:read only. First run exposed two suites depending on absent local environment settings; the isolated CI configuration fixed this. Run 42067325046 passed all checks. Local full checks were interrupted by host out-of-memory errors, not reported as passed.
- ErrorBoundary offers support contact and console diagnostics. No central automatic error-reporting provider, alerting or uptime monitor has been configured; do not claim monitoring is operational.
- Privacy/terms contact address is corrected. Substantive legal review remains open: photo screening transfers, verification selfies/manual review and retention, restricted moderation records after deletion, Places data and current payment availability must match implementation. No claim of legal compliance is made.
- Broader Google independence/import scope is unchanged. Existing 2km search and paid-request quotas remain.

## Owner's physical-device checks

The owner has both Android and iPhone. Run against https://www.riyosocial.app/ with two ordinary test accounts; do not share passwords.

1. Android Chrome: open site, add/install to home screen if offered, launch icon, confirm correct app identity and standalone layout. iPhone Safari: Share → Add to Home Screen; launch the saved icon. Installation controls and availability vary by browser.
2. Fresh start: minimum three-second startup; slower auth retains the screen. Switch to another app/tab and return; same session must retain the current page and typed draft. A discarded process/full refresh is a new start.
3. Sign in with Google and email; test password recovery with the owner's test mailbox. Do not claim success from merely opening the recovery form.
4. Allow location, reject it, then retry after granting it. Nearby search stays 2km. Check an indoor location and poor network separately.
5. New account photo: try supported JPEG/PNG, invalid file and cancelled upload; accepted photo follows existing moderation. Verification selfie requires raised right hand, reviewed manually.
6. Two accounts at the same venue: join, limited profile/accepted photo visibility, wave, mutual match, send/receive message. Block, hide profile and leave: access must close under existing server rules.
7. Activities: create a disposable plan, request participation from the second account, host approval then group chat. Expired/cancelled plans must not grant new access.
8. Load the app online once, then turn off connectivity and open it again: generic offline screen, no old chat/photos. Restore network and retry. This does not make private features work offline.
9. Only with a specifically disposable account: fresh sign-in, exact deletion confirmation, verify own photos/profile/sent messages disappear and account cannot sign in again. Partial failures must show incomplete and allow explicit retry.

Record device/OS/browser, time, steps and result for each. Physical-device success is still pending; desktop narrow viewport tests do not replace it.

## Before broad promotion

Confirm end-to-end deletion, two-device safety checks, dashboard backup/restore evidence, central error/availability monitoring and policy review. A 20–30 person free beta can surface issues, but these pending items must not be represented as completed. Premium checkout and phone push remain closed.

## Free-plan backup preparation

No working backup has been produced by this release. Before taking personal data from a broad audience, the operator needs a PostgreSQL-compatible database export and a separate copy of Storage file bytes in a private, access-restricted destination. A database dump alone does not contain profile/selfie image bytes. Never commit backups, connection passwords or private images to this repository or upload them to public artifacts.

Use the official Supabase backup/restore instructions, record the PostgreSQL version and required roles/extensions, and test restoration only in a separate non-production project. Restoring over production is not a validation step. A CLI connection needs the operator's database credentials; do not extract browser session secrets or change/reset the database password to bypass this dependency. A paid automatic backup plan is a separate owner decision; no spending was authorized by this preparation.
