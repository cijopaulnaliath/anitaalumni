# Paytm membership and donation setup

Checkout supports one-time INR membership fees (default ₹1,000) after school approval, and optional donations. Only server-verified, live successful donations enter the wall of thanks, according to donor consent. No recurring payments.

## Vercel server configuration

Set Production environment variables using the Paytm merchant dashboard. Never commit keys.

- PAYMENT_PROVIDER=paytm
- PAYTM_ENVIRONMENT=staging (first); production only after test acceptance and merchant activation
- PAYTM_MID: corresponding environment merchant ID
- PAYTM_MERCHANT_KEY: corresponding 16-character merchant key (Secret)
- PAYTM_WEBSITE_NAME=WEBSTAGING in staging; DEFAULT in production unless Paytm assigns another value
- SITE_URL=https://anitaalumni.org
- MEMBERSHIP_FEE_INR=1000
- PAYMENTS_ENABLED=false until setup is complete; true to explicitly open checkout

Configure the merchant website/callback in Paytm. Callback: https://anitaalumni.org/api/payments/paytm/callback
Payment notification/webhook: https://anitaalumni.org/api/payments/paytm/webhook

Keep the existing Supabase and email configuration. No SQL changes are needed for this integration. Publish support email, responsible contact, response timeframe and refund policy through administration before live checkout; the live readiness gate checks these fields.

## Acceptance

Use staging credentials and PAYMENTS_ENABLED=true for controlled testing. Test an approved, email-verified member paying ₹1,000; verify receipt, paid state and no second charge; test an optional donation with named/anonymous and amount visibility choices; test cancellation, delayed payment and Check payment status. Staging donations stay off the public donor wall. Confirm callback/webhook delivery in Paytm dashboard. Before production switch both credentials and environment, and obtain merchant activation. No live transaction was performed by the implementation agent.

Paytm results must pass checksum verification and server-to-server status checks for merchant, order and amount. A browser success message is never accepted as proof. Pending/uncertain payments remain pending; always check status before retrying. Refunds are initiated through Paytm merchant operations; status refresh removes any refunded gift from shout-outs when Paytm reports the refund amount. A blocked/failed order may require administrator/provider reconciliation before retrying; no automatic second order is created for the same membership.

## Administrator emails

Set ADMIN_EMAILS to a comma-separated list of exact registered email addresses. Users must have a live, email-verified profile and must sign in with a fresh email code, then open /admin. Administrative access lasts at most eight hours after that sign-in; member access can last longer. Changes to the allowlist take effect after redeployment and are checked on every request. Test profiles never gain email-admin access. Existing owner-issued password credentials remain available as a fallback. This is email-code authentication, not multi-factor authentication. Share no common passwords between email administrators.

## Local checks

npm run build
node tests/paytm-admin-regression.cjs

Tests use fictional data and mocked provider responses; merchant delivery, settlement and real device checkout need the acceptance steps above.
