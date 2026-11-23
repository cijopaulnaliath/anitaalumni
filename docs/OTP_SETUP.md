# Email or SMS verification

Registration and My account offer email or SMS codes. Email is the default. SMS is unavailable until both the provider and database are connected. School approval remains a separate administrator action; OTP never approves a member.

## Activate SMS

1. In Supabase SQL Editor, run `supabase/migrations/20261123_phone_otp.sql` against the existing project. This adds the verified-phone field and private OTP transactions. It does not approve existing numbers or remove member records. For a fresh database run `supabase.sql` first, then this migration. The migration is transactional and repeatable.
2. Create a Twilio **Verify** service for SMS. Use six-digit codes and a ten-minute validity period. Enable the countries you intend to support, including India. Confirm your account can deliver SMS to those destinations; trial accounts may restrict recipients. Use test recipients during acceptance testing.
3. Add the following **server-only** Vercel environment variables for the target environment. Keep credentials as Secret values; do not prefix any with `NEXT_PUBLIC_` and do not put them into source control or chat.

| Key | Value |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Your account SID starting with `AC` |
| `TWILIO_AUTH_TOKEN` | Your account's secret auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Your Verify service SID starting with `VA` |
| `PHONE_OTP_COUNTRY_CODES` | `+91,+1` (optional default; comma-separated supported calling codes) |
| `PHONE_OTP_ENABLED` | `true` after the migration and credentials are ready |

4. Redeploy Vercel. `/api/auth/phone` must return `enabled:true` before the SMS button becomes available. Missing credentials or migration keeps it disabled and preserves email access.
5. Complete the live acceptance checks below with consenting test recipients before inviting members to use SMS. The automated suite uses a real local PostgreSQL engine and mocked provider responses; it does not establish live provider delivery.

Existing email/Resend settings stay in place. Existing profiles must sign in by email, then verify/link their number in **My account → Phone sign-in**. A number previously typed into a profile is not an SMS login credential. If a number is already associated with another registration, request association support rather than creating a duplicate account.

## Behavior and protections

- Each code expires after ten minutes. Resend waits 60 seconds. Each challenge allows at most five attempts.
- Sends are limited to three/hour/phone, ten/hour/IP, five/hour/browser, and 100/day/site. These initial caps are defined in `reserve_alumni_phone_challenge`; adjust deliberately after measuring real registration traffic and provider spend. Failed sends still count toward the limits.
- Challenges are bound to phone, browser and purpose: registration, sign-in, or linking. Resending invalidates the previous same-browser challenge. Proofs are consumed atomically; reuse and competing submissions cannot create duplicate accounts.
- Twilio checks are performed server-side against the exact provider verification SID, recipient, service and SMS channel. No SMS code or provider credential is returned to the client or stored in the challenge table.
- Phone-only profiles may omit email. A supplied email remains unverified until separately confirmed from the signed-in account; it cannot become a sign-in or administrator credential automatically.
- Verified email remains required for email notices, email subscriptions and payment receipts. SMS-only members can use the directory and community features after school approval, but need to add/verify email before payments.
- Email allowlist administrator access still requires verified email. Phone OTP never grants administrator rights.
- The last verified contact cannot be changed through an ordinary profile edit. Link a new number with OTP or verify email first. Editing a previously verified phone while email is verified clears phone verification.
- SMS verification consent is separate from WhatsApp and marketing opt-in.

## Automated checks

Run `npm ci`, `npm test`, and `npm run build`.

The suite covers existing registration, email, payments, directory, admin, photo and community behavior, plus:

- Real PostgreSQL execution of base schema plus migration, repeat migration, permissions, transactions and concurrency.
- Expired/replayed/wrong-browser/wrong-phone/wrong-purpose proofs; duplicate/legacy/archived/test accounts; unique verified phones; session rotation and independent email linking.
- All send and attempt limits, resend invalidation, provider SID mismatch, and only-contact editing safeguards.
- SMS API validation, consent, ownership, provider failure cleanup and generic errors.
- Twilio request/response contracts through mocked HTTP, including wrong recipient, service, status, SID and channel.
- Actual client components under a deterministic hook scheduler: setup and consent gates, busy controls, duplicate-send prevention, mobile six-digit input, countdown, and stale responses when the contact changes.
- SMS registration, sign-in, recovery, account reads without email, directory approval and administrator exclusion.

## Live acceptance checklist

Use a staging/preview deployment connected to a non-production database and a real authorized test phone.

- Confirm email registration and email sign-in still work.
- Choose SMS, receive a real code, verify it and register without email; check the profile is pending school approval and email is not marked verified.
- Sign out and sign in with a fresh SMS code. Verify that the earlier browser session no longer opens the account.
- Request on one browser and try the code on another. Try a wrong code, expiry, reuse, immediate resend and the fifth/sixth attempt boundary.
- Sign in to an existing email account and link its phone. Confirm an unlinked legacy phone cannot open that account.
- Add/verify email to a phone-only profile, then check email login, receipts and notifications.
- Confirm school approval is still required for public listing and community access. Confirm SMS-only identity cannot open administration.
- Disable provider access temporarily; check readable errors, no duplicate account and a usable email fallback. Inspect Twilio delivery logs for acceptance and delivery outcomes without exposing codes.

Keep `PHONE_OTP_ENABLED` unset or `false` until those checks are complete. This switch disables SMS and phone-based directory eligibility, so after real phone-only members have joined, plan any rollback with their account access in mind. Retain the database migration when turning the switch off; dropping phone verification would lose authentication state.
