# Welcome confirmations, Google sign-in and testing

Real registrations atomically queue a welcome email. When Resend is connected, delivery is attempted immediately, containing the website URL, profile/photo editing link, one-time ₹1,000 fee, optional donations/shout-outs, events and contact help. Registration is not payment or school approval. Event-only registrations receive distinct wording. Test profiles receive no email. Welcome mail does not subscribe anyone to bulk updates.

Administrators see the latest 200 statuses and can explicitly process up to 10 pending/failed messages. Database claims and provider idempotency keys prevent concurrent duplicate sends. Unknown or interrupted sends require provider reconciliation; they are not automatically retried. Provider acceptance is not guaranteed inbox delivery. Existing profiles are not retrospectively emailed.

## Email activation

Set server secrets RESEND_API_KEY, a domain-verified EMAIL_FROM, and EMAIL_OTP_SECRET (at least 32 characters). SITE_URL should be the final HTTPS public origin. Deploy after configuration changes. Earlier queued real confirmations can be processed in Admin. No real delivery is possible until the sender is verified.

## Google activation

Create a Web application OAuth client in the association's Google Cloud project; configure consent branding/audience. Register this exact callback:

https://anita-alumni.cineloom-6604.chatgpt.site/api/auth/google/callback

Set server-only GOOGLE_CLIENT_ID, secret GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to that callback, then redeploy. Google Testing apps require designated test users; publish the consent app when ready. Request only openid/email, no Gmail mailbox scope. These credentials cannot be replaced by a Gmail connector or a Google Authenticator code.

Google login is for existing registrations with the same Gmail or authoritative Workspace email. A verified Google subject is linked and checked on later logins. Third-party-email Google accounts must use email codes. Test/archived profiles cannot sign in with Google. No new profile or admin access is created by Google login. School approval remains independent. The code flow uses browser-bound single-use state, ten-minute expiry, PKCE S256, nonce and RS256 verification with Google keys, and validates issuer/audience/presenter/expiry/email. Google tokens are not retained. This is not an MFA guarantee; users can protect Google with its two-step verification.

## Temporary code 1234

While EMAIL_TEST_MODE=true and no real sender is configured, any valid email can request code 1234. The UI explicitly says testing; no email is sent. New profiles have is_test=1 and email_verified_at=NULL, stay private, and cannot be approved, mailed or paid. The code can reopen only test profiles, never an existing live member or admin account. When the real sender is configured, this path automatically switches off and live six-digit codes are required. Remove your test profile from My account before creating a real registration with the same email. Tests contain fictional details, not identity evidence.

Vercel: apply updated supabase.sql as the database owner, regenerate the export, and configure the same secrets server-side. The new tables/RPCs are service-role only. Never put secrets in chat, source, browser code or NEXT_PUBLIC variables.
