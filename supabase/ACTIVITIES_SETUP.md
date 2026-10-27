# Activity installation and activation

Target: xbodyzqtltrdtdahrteh. Installation has not been applied by the agent; no authorized Supabase management channel is currently available.

1. Apply `migrations/20261027010000_social_activities.sql` once in the target project's SQL Editor. It is transactional and leaves the feature DISABLED. Do not rerun a partially copied script; run the complete transaction.
2. Confirm all new tables are private with RLS enabled and no anon/authenticated table grants. Only caller-bound security-definer RPCs are granted. Existing ban/block/deletion checks and admin roles are reused.
3. Enable for the owner's requested launch only after the local security suite passes and the target schema dependencies have been checked:

```sql
UPDATE private.social_activity_settings SET enabled=true WHERE id=true;
```

4. With two real accounts: create a public-place plan; confirm the second account cannot read participants/chat before admission; approve; send a message; withdraw; confirm chat access stops. Test last-seat approval, rejection, host cancellation, block and expiry. Confirm no photo access is granted. Test the map on a phone and laptop and confirm attribution remains visible.
5. When backend tests succeed, merge the feature PR to main for the frontend deployment. The navigation checks `social_activities_available`; until installed/enabled, the existing navigation remains unchanged.

Disable/recover without deleting data:

```sql
UPDATE private.social_activity_settings SET enabled=false WHERE id=true;
```

This disables every new user-facing activity RPC; it does not remove existing cafe functionality. Moderators retain their management RPC for cancelling abusive plans. Activity reports appear in the existing reports inbox with an activity ID prefix; `/admin/activities` lists the latest 100 and permits moderator/super-admin cancellation.

## Access and lifecycle

- Creator chooses a public meeting point on the map and explicitly confirms publication to signed-in Riyo users. No visitor GPS or participant coordinates are stored by this feature. No Google location records are copied into map coordinates.
- Public activity projection: plan, host display name, venue label, selected point, time and counts. Participant names are limited to the host and accepted members. Only the host receives membership user IDs for approval/removal. No email, age, birthday, photo or selfie fields enter the projection.
- Server row locks serialize approvals, withdrawal/cancellation and sends. Host plus accepted reservations must fit capacity 2–20. Requests, publication and message sends have idempotency/rate guards. Start is in the next 30 days; duration is at most 8 hours.
- Group text is read only by current eligible members. Each read/send rechecks access. Blocked peers' messages are suppressed. Public-list refresh is 20 seconds, members 15 seconds, chat 10 seconds; remote changes may remain visible until that refresh completes. Local block/privacy changes remount the activity view; hidden tabs unmount it. Cached member/message data is not rendered before renewed authorization. Expiry closes chat locally and server-side.
- Auth account deletion cascades own membership/messages and hosted activity trees. Cancellation/expiry close access but do not automatically erase stored group history. Existing restricted reports are retained; no new retention promises are made.

## Map provider

Leaflet uses standard OpenStreetMap tiles for the viewed viewport, browser HTTP caching and visible attribution. No bulk/offline prefetch, scraping or geocoding is implemented. Policy: https://operations.osmfoundation.org/policies/tiles/ . Service is best-effort; list navigation remains available if tiles fail. Review a supported tile provider before large-scale traffic; a provider switch is a deployment change, not a new user permission.
