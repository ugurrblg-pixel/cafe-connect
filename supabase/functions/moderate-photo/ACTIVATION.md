# Photo content review — deployment status

Installed in Supabase: private quota/receipt tables, service-only reserve/record RPCs and the profile-photo guard trigger. The rollback integration test passed for ownership, rejected/accepted verdicts, immutable object IDs, private photo status and quotas. All temporary test data was rolled back before applying the migration.

The moderate-photo function has been deployed through the dashboard as a single-file bundle generated from index.ts, policy.ts and selfTestImage.ts. The owner saved OPENAI_API_KEY; the agent verified the secret name only, never opened or exported its value. PHOTO_REVIEW_ENABLED=true is configured on the server.

Activation is not yet complete. VITE_PHOTO_REVIEW_ENABLED is still unset/off. Saving the required per-function legacy JWT compatibility setting was rejected by automatic approval review and an explicit action-time confirmation is pending. The dashboard's legacy JWT setting remains ON; it was not bypassed. supabase/config.toml contains the intended setting for review only, not proof of the deployed setting.

After approval: save that setting, invoke the server-authorized self-test using only the built-in synthetic cup image, verify the result, enable VITE_PHOTO_REVIEW_ENABLED and redeploy the frontend. Then check consent, rejection/unavailable behavior and normal own-photo upload. Do not open other users' photo access as part of this task.

Each uploader must consent to sending their new image to OpenAI for content review. Failure, malformed response or missing receipt blocks acceptance. The guard also prevents new unreviewed photo references through direct API writes. Existing referenced photos are retained and not retroactively classified. Quota is five checks per minute and 20 per day per user.

The self-test accepts only existing server credentials, never normal user tokens or supplied images, and never reads personal photos. It exists to test the provider connection without altering a profile. Normal review validates auth.getUser, own immutable object ID, WebP MIME/size and stored verdict. Content screening neither verifies account identity nor publishes private photos.

The model checks image-supported sexual, violence and self-harm categories. It is not identity verification or a dedicated CSAM detector, and unsupported image categories must not be presented as checked. The Moderation endpoint is free according to https://developers.openai.com/api/docs/guides/moderation ; account access still needs a real connectivity test.
