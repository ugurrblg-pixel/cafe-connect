# Same-cafe photos — prepared activation

Backend: apply only 20261017010000_same_cafe_photos.sql after explicit scoped photo-access confirmation. No db push. Deploy cafe-photo with custom auth.getUser validation and verify_jwt=false (new endpoint); enable server CAFE_PHOTOS_ENABLED=true and Vercel VITE_CAFE_PHOTOS_ENABLED=true for Production/Preview.

Only accepted immutable avatar objects referenced by a profile are returned. Both users require same-cafe active check-ins created after the migration's release timestamp, visible profiles and no ban/block. Only declared member fields + photo_refs are returned; no contacts, birthday or selfie. No Storage grant/read policy is widened. The service-only authorizer cannot be called directly by app users.

The image endpoint validates the user Bearer token, checks the caller-bound authorizer, downloads WebP <=5 MB, and rechecks before returning non-cacheable bytes. Client only keeps a Blob URL in memory, authorizes every 25 seconds and downloads again only if object identity changes. Current bytes expire after 31 seconds without renewed authorization; hidden tab and local block clear bytes. Already-seen/saved images cannot be recalled. Other-user photo access is not opened in chat/matches outside the cafe scope.

Rollback SQL passed same-cafe access, pre-activation consent cutoff, expired viewers/targets, wrong cafe, mutual blocks, hidden profiles, rejected/stale objects, private field projection and service-only authorizer grants. All temporary writes rolled back; no real photo was sent to another user. Handler/hook tests cover invalid/missing auth, forged caller, no-store image transport, post-download races, memory revocation and account switches.
