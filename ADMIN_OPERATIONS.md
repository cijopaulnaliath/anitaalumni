# Association administration

Open `/admin`. The owner-configured username and temporary password require a new password of at least 14 characters on first login. Passwords use salted PBKDF2 hashes; cookies are HttpOnly and Secure, sessions expire after eight hours, and login attempts are rate limited. Changing the password revokes previous password sessions. Keep the owner ChatGPT allowlist as a recovery route on Sites. For Vercel recovery, a database operator can remove the `admin_password` setting and clear `admin_sessions`, then replace the runtime password hash and redeploy.

The workspace provides member search, private member exports, registration approval, reversible removal and restore, budget categories, income/expense entries, payment reports, campaign drafts and delivery reports, audit history, photos, content, activities, and enquiries. Removal hides a member and revokes profile access while retaining financial records. Restore returns the registration to pending review. Test registrations cannot be approved.

## Reports and finances

Amounts are stored as integer paise and displayed in INR. Reports use UTC dates and a calendar-year budget. Payment selection is based on transaction creation date and displays the latest provider status. These are operational reports, not bank settlement reconciliation. Live captured/refunded payments are separate from test payments; refund totals use confirmed refunded amounts. Older refunds without an amount are flagged for reconciliation. Manual ledger entries must not duplicate online payments. Void incorrect entries to retain an audit trail. Exports cap at 10,000 rows; subdivide the reporting period if necessary.

## Email campaigns

Set `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `EMAIL_OTP_SECRET` before sending. Drafts and recipient previews work while sending is disabled. Only approved, active, email-verified alumni with explicit email-update consent are eligible. Existing registrations do not acquire consent automatically. Test and removed members are excluded. Preview recipients, explicitly queue, then send batches of up to 20; there is no background mailing job. Each recipient receives a separate email with a signed unsubscribe link. Consent is checked again immediately before sending. Provider acceptance is recorded; it is not a guarantee of inbox delivery. Uncertain provider responses stop automatic resending to avoid duplicates. Check the provider before taking further action on uncertain campaigns. No production campaign is sent by setup or automated tests.

## Temporary verification testing

Set `EMAIL_TEST_MODE=true` to allow code `1234` for any valid email address, solely as a simulated test. Request the code through the normal form before entering it. Test registrations remain private and are marked as tests; they are not email-verified, cannot be approved, paid, included in the directory, or used for mailings. `1234` never grants administrator access and never verifies a real address. The test path automatically switches off once a real email sender is configured. Disable `EMAIL_TEST_MODE` explicitly when launching real registrations. Real email codes remain random, expiring, single-use six-digit codes. Email verification is not multi-factor authentication.

## Runtime setup

Set `ADMIN_LOGIN_USER` and server-only secret `ADMIN_PASSWORD_HASH` in the runtime environment. Hash format is `pbkdf2$100000$<salt>$<64 lowercase hex characters>` using PBKDF2-SHA256 with the salt encoded as UTF-8. Never commit a plaintext password or runtime secrets. Deploy after changing runtime variables. The first login must replace the temporary password. Vercel uses the generated Supabase schema and adapters; apply `supabase.sql` and keep the service-role key server-only. Payment processing still requires the Razorpay configuration documented separately.

## Automatic association notifications

Contact enquiries are saved in Contact inbox and forwarded to anitavidyalaya.alumni@gmail.com through the existing verified EMAIL_FROM sender. The enquirer's address is used as Reply-To.

Each successful live registration sends a separate notification to every valid, unique email in the server-only ADMIN_EMAILS allowlist. The notice contains name, batch, last class, location and email, with a link to /admin for review. Test registrations do not send admin notifications. The member welcome letter remains separate.

Requires existing Resend configuration. Changing ADMIN_EMAILS requires redeployment. No database migration is needed. Provider acceptance and failures are recorded in the administration audit log as notification.contact.* or notification.registration.*. A provider-accepted email is not proof of inbox delivery; check Resend delivery/bounce logs. Notifications use idempotency keys; no automatic retry or historical backfill is scheduled. Contact enquiries and registrations remain saved if notification sending fails.

Regression check: node tests/association-notifications.cjs. Tests use mocked email requests and fictional records; they send no real email.

## Appoint a registered member as batch leader

Open Administration → Registrations. After school approval and live email verification, use **Make batch leader** on an alumni network registration. Confirm the member agreed to the role and permitted publication of their name, batch, biography, and portrait. The existing Batch leaders page publishes the appointment with `/contact` as the contact option; private phone and email are not copied into the listing. This community role grants no administrator privileges.

Use **Update batch leader listing** after changes to the profile or batch (with renewed publication confirmation), or **Remove batch leader appointment** to unpublish the appointment. Reappointing reuses the linked content entry. These actions are audited. Removed, test, event-only, unverified, and unapproved registrations cannot be appointed. Public linked listings are suppressed for inactive/unapproved members or when the saved name/batch no longer matches the profile. Existing manually created leadership entries remain managed in Pages & content. No database migration is required.

## Edit public site text and school images

Open Administration → **Site text & images**. Select a page/section and field, edit its text or upload a JPG/PNG/WebP photograph up to 3 MB, review the preview, and choose **Publish text/photo**. **Restore original** removes that field’s override. Changes appear on refreshed public pages without a code deployment. Leaving a field with unpublished changes asks whether to discard them.

Editable fields include homepage headings and descriptions, page introductions, About content, vision objectives, opportunity introductions, footer copy, and school slideshow photographs/captions/alternative text. Existing formatting is preserved until the field is overridden; edited text is plain text with line breaks. Membership amounts, payment/authentication behavior, registration requirements, legal policy pages, navigation destinations, and page layout remain code/configuration settings. Announcements/projects/leadership content use Pages & content; event details and contact information use Services & launch setup.

Overrides are stored separately per stable field in existing community_content records with role site_text. They are excluded from announcements and the generic content list. The public endpoint returns only validated, allowlisted content fields. Writes require administrator access and same-origin requests and are audited. No database migration is required. If content storage is unavailable, public pages retain their original content. Keep stable catalogue keys when updating code so previously published overrides keep working.
