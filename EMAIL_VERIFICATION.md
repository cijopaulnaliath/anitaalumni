# Registration email verification

## Live setup still required
Email delivery is wired to Resend. No Resend account credential or verified sending address has been supplied, so new registrations cannot complete yet. There is no bypass, displayed code, or automatic approval when email is unavailable.

Configure server-only environment variables on the ChatGPT Site or on Vercel:
- `RESEND_API_KEY`: a sending API key from the association's transactional email account.
- `EMAIL_FROM`: a verified sender, such as the association's chosen address on its own verified domain. No sender address is assumed or invented.
- `EMAIL_OTP_SECRET`: a random secret of at least 32 characters. A secure value has been configured for the ChatGPT Site; generate a separate secure value for your Vercel deployment. Do not expose it to the browser or commit it in source.

No actual provider email was sent during implementation. Tests intercept provider requests locally. Complete a live delivery check from an email address you control after configuring the account, then test expiration, wrong-code handling, resend limits, and registration end to end.

## Workflow
1. Enter the registration email and request a six-digit code.
2. Enter the code in the same browser within 10 minutes.
3. Submit the registration. A verified proof is consumed atomically with registration creation; changing the address, replaying the proof, or using another browser is rejected.
4. The application enters association review. An administrator checks school/batch evidence before approval. Email verification alone never grants membership or proves school attendance.
5. Existing registrants verify the stored address from My profile. Approval, directory listing, reunion uploads, and membership checkout require verified email. Administrators cannot bypass this check through the review API.

Email OTP is inbox verification, not full multi-factor authentication. True MFA requires an additional authentication factor; it is not claimed by this release. Returning members use /account to verify their registered email and restore access on another device. A successful sign-in rotates the member token, revokes the prior browser session, and sets a 30-day HttpOnly cookie with server-side expiry. Sign out revokes the session. Members may edit profile details; changes to their name, batch, class, or rejoining the network require association review again. Loss of email access and email-address changes require manual association support.

## Controls
- Cryptographically random six-digit codes, stored as HMAC-SHA256 proofs with a secret.
- HttpOnly, Secure, SameSite=Strict browser-session binding.
- Ten-minute expiry, at most five guesses per challenge, one-minute resend cooldown.
- At most three sends per address and ten per IP per hour; reservations use atomic D1 statements or locked PostgreSQL transactions.
- A new code invalidates earlier challenges for that address/browser. Consumed and failed sends still count toward limits.
- Codes are never returned by API responses or application logs. Public directory APIs never expose emails, phone numbers, or email proofs.
- Expired challenge records older than 24 hours are purged opportunistically on later send requests. Provider-side email retention follows the provider's settings.
- Photo writes are blocked before email proof validation; final consumption and registration insertion are transactional.

## Age gate removal
The registration and payment interfaces and server validation no longer require an age declaration or a minimum age. No date of birth is collected. General consent, photo-sharing permission, email verification, and school/batch review still apply.

## Vercel
Run the full updated supabase.sql before deploying. Email tables and RPCs are server-only under RLS, with access granted to service_role and revoked from anon/authenticated. Store all provider keys and the OTP secret as server-side environment variables. The exported source uses the same security flow via PostgreSQL transactions.
