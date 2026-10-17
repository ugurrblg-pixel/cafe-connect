# Manual account verification

User flow: Profile → Account verification. Explicit consent authorizes the existing super_admin/moderator reviewers to compare a private selfie and the accepted main profile photo captured at application time. No ID documents, automatic facial recognition, liveness claim or OpenAI transmission for the verification selfie. Main profile photos still use the separate content moderation flow.

Admin flow: /admin/verification. A role-checked list returns at most 100 applications. Load the two temporary display links, compare manually, tick the comparison checkbox, approve or reject with a 5–300 character reason. Decisions, profile status and audit record commit atomically. Self-review is forbidden. Support accounts cannot inspect or decide.

The migration creates a private verification-selfies bucket (WebP, 5 MB), private request table, own upload/read/delete policies, scoped review evidence policy and validated RPCs. Admin evidence access is limited to pending applications younger than seven days and immutable submitted objects. Signed display links expire after five minutes; already-issued links can remain usable until that expiry. General profile photo visibility is not opened.

One pending application per user, three applications/day, at most two stored selfies/user. Pending evidence cannot be deleted until withdrawal/decision. Closed selfies can be deleted by the owner; previous closed files are removed before another application. Seven days limits reviewer access, not physical file retention: no automatic file deletion job is claimed. Main photo changes invalidate an existing verification badge; changed/expired/missing evidence cannot be approved.

The owner explicitly approved the scoped sensitive-photo access and activation on 2026-10-17. The migration was applied successfully through the Supabase dashboard; the private bucket and scoped RPC/policy workflow are installed. VITE_ACCOUNT_VERIFICATION_ENABLED=true is saved for Vercel Production and Preview. A build with that flag activates the client UI. Do not db push the unreconciled migration history. Deployment verification is recorded separately in outputs/account-verification-activation-complete.md.

Validation: rollback SQL under outputs/account-verification-rollback-test.sql passed workflow tests; no real photos uploaded and all test writes rolled back. Frontend 101 tests passed, six optional stress tests skipped; typecheck/build passed. Actual components with production CSS reviewed at desktop/mobile sizes using an explicitly synthetic local mock backend. No real user's verification was changed.


