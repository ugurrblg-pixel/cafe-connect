# Own-account deletion

Owner decision: remove profile/photos/verification selfies and the departing account's own sent messages. Preserve the peer's own messages. Restricted reports, bans, warnings and admin audit records remain; the confirmation explicitly states this. No 30-day recovery or universal backup erasure is promised.

## Trust and lifecycle

`delete-account` only accepts POST with a validated Bearer session, exact `SİL` confirmation and `deleteOwnMessages: true`. Target identity comes exclusively from `auth.getUser`; a body user id is ignored. Require a server-reported sign-in within ten minutes, including on retry. Refreshing a token does not satisfy the sign-in requirement. A fresh sign-in returns the user to the normal profile workflow; no automatic deletion is triggered by a redirect.

The server flag `ACCOUNT_DELETION_ENABLED` and frontend `VITE_ACCOUNT_DELETION_ENABLED` start disabled. The endpoint uses custom user validation, with `verify_jwt=false` only after the scoped gateway change is approved. Service credentials never reach the browser. All mutation/preparation RPC access is service-role-only. Only the caller's boolean pending status is accessible to authenticated users.

Preparation is idempotent per user. A shared database lock serializes profile/photo writes against start. First hide profile, close messaging, expire check-ins, deactivate conversations and withdraw pending verification, then record pending deletion. Pending users are excluded by existing banned/visibility checks. Triggers reject subsequent profile edits and new photo writes. Storage files under the own UUID in avatars and verification-selfies are removed through the Storage API, at most 100 per batch/10 batches per invocation. Real Storage SQL deletion is never used.

Only after inventory is empty does the endpoint hard-delete the authenticated user with the Auth Admin API. A BEFORE DELETE trigger checks for remaining own storage objects, cleans up private review records and non-FK social records, then auth FKs cascade profiles/check-ins/roles/verification. Conversation participant FKs use SET NULL, and conversations stay inactive; departing user's messages are deleted but peer messages remain in the restricted database. Existing chat rules continue to hide inactive conversations; this change does not add a chat-history viewer.

There is no background worker or automatic retry. Storage/Auth failures return incomplete without claiming success. The profile remains closed and its owner can sign in and retry from the profile. Removed files cannot be restored by retry/cancel. A lost final response may leave the outcome unverified in the browser; do not infer successful deletion from a network error. Final success requires Auth API confirmation. App-managed backups, restricted moderation history and already-viewed/copied data are not claimed to be erased.

## Verification and activation

Individual migration `20261018010000_own_account_deletion.sql`; never `db push` against unreconciled history. SQL rollback fixture passed scoped grants, pending status isolation, idempotency, profile/upload guards, storage-first refusal, auth/profile/own-message removal and peer preservation. All synthetic auth users/metadata were rolled back. Storage metadata was transferred between synthetic owners to simulate an empty inventory without disabling Storage's delete guard; real byte removal/order/failure handling is tested in the endpoint harness.

Handler tests cover auth, recent sign-in, flags/typed consent, forged targets, own storage paths, cleanup order, partial failures and bounded work. UI tests cover exact confirmation, no mutation on open, duplicate suppression, no dismissal while busy, retained inline errors, reauthentication, partial cleanup and success-only logout. Never delete a real user merely to validate this feature.

Before activation: migration + disabled endpoint, gateway configuration, server flag and frontend Production/Preview flag, preview review, normal release and anonymous denial checks. A real end-to-end deletion needs an explicitly disposable account, not an existing owner's account.

API references: https://supabase.com/docs/reference/javascript/auth-admin-deleteuser and https://supabase.com/docs/reference/javascript/storage-from-remove
