# Photo content review — enabled backend

Installed in Supabase: private quota/receipt tables, service-only reserve/record RPCs and the profile-photo guard. The rollback integration test passed ownership, rejected/accepted verdicts, immutable object IDs, private status and quotas. All temporary test writes were rolled back before applying the migration.

moderate-photo is deployed through the dashboard as a single-file bundle generated from index.ts, policy.ts and selfTestImage.ts. The owner saved OPENAI_API_KEY; only its name was inspected, never its value. PHOTO_REVIEW_ENABLED=true is configured on the server. The owner explicitly approved disabling legacy JWT verification for this function; the function's own auth.getUser authentication remains mandatory for normal uploads.

The administrative self-test returned HTTP 200, accepted, fixture synthetic-cup, personal_photos_sent=false. The test uses only the built-in harmless graphic and existing server authorization. Normal users cannot invoke it or provide a different image. Provider failures and malformed results remain pending. No personal photo was transmitted in the connectivity test.

VITE_PHOTO_REVIEW_ENABLED=true is saved for Vercel Production and Preview. A new frontend deployment is required for that flag to take effect. Each uploader explicitly consents to sending the new image to OpenAI. Failed or rejected new uploads are not added to the profile. The database guard also blocks new unreviewed references submitted directly to the API. Existing referenced photos are retained and are not retroactively classified. Quota is five checks per minute and 20 per day per user.

This is content screening, not identity/account verification or permission to publish private photos. Existing owner-only photo visibility is unchanged. Image-supported sexual, violence and self-harm categories are checked; this is not a dedicated CSAM detector and unsupported image categories are not presented as checked. Classification is not infallible.

Moderation pricing/docs: https://developers.openai.com/api/docs/guides/moderation . The endpoint is free to use; deployment/account limits still apply.
