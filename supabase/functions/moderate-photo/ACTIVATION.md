# Photo content review — activation pending

This implementation is not deployed or enabled. It does not verify account identity and does not publish photos to other users.

Activation order:
1. Review and test the prepared migration against the actual backend in a transaction before applying it. It adds service-only rate limits and review receipts, then guards new profile photo references. Existing referenced photos are not retroactively classified.
2. User adds OPENAI_API_KEY as a Supabase secret themselves. Never commit the key or put it in a VITE variable. PHOTO_REVIEW_ENABLED=true is the separate server activation switch.
3. Deploy moderate-photo including policy.ts, preserving custom Bearer authentication (gateway verification must support the project's publishable key format).
4. Set VITE_PHOTO_REVIEW_ENABLED=true only after server/database integration tests pass; redeploy the frontend.
5. Each uploader consents in the upload UI before their image is transmitted to OpenAI. API failure, malformed response or recording failure never produces accepted status. Failed new uploads are cleaned up using existing own-file rules.

The server validates ownership, immutable storage object IDs, file type, size, daily/minute limits and provider result shape. It records accepted/rejected receipts through service-only RPCs. Client-only bypasses do not grant a new reviewed profile reference once the SQL guard is active. A missing provider, secret, quota RPC or record RPC blocks acceptance.

Scope: sexual content, violence and self-harm signals supported for image inputs by omni-moderation-latest. This is not face matching, identity verification or a dedicated CSAM detector; unsupported image categories must not be treated as checked. A clean classification is not an infallible guarantee. No real user photos were transmitted while preparing this change.

The Moderation endpoint is free to use according to https://developers.openai.com/api/docs/guides/moderation ; API credentials and account access are still required. Runtime key access and a real integration test remain pending.
