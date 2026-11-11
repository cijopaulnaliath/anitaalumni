# Membership fees, donations, and donor shout-outs

## Merchant setup
The implementation uses Razorpay Standard Checkout in INR. The approved current membership fee is ₹1,000. No payment account or keys have been supplied. All checkout buttons remain disabled until enabled through server-side environment variables. No demo payments are presented as real funds.

Configure these environment variables on the ChatGPT Site, or on Vercel for the exported project:
- `RAZORPAY_KEY_ID`: test key first; use the live key only after full provider testing.
- `RAZORPAY_KEY_SECRET`: server-only secret paired with the key ID.
- `RAZORPAY_WEBHOOK_SECRET`: separate random secret configured in the Razorpay webhook dashboard.
- `MEMBERSHIP_FEE_INR`: approved one-time fee in rupees, e.g. the association's actual approved amount. The current default and hosted configuration are 1000 (₹1,000); the administrator can change the server setting later.
- `PAYMENTS_ENABLED`: `true` only after recipient, fees, terms, and live readiness are reviewed. Omitted/false keeps checkout unavailable.

Enable automatic capture in the Razorpay dashboard. Add a webhook at the published origin plus `/api/payments/webhook`; subscribe to `payment.captured`, `payment.failed`, `order.paid`, and `refund.processed`. The endpoint must be publicly reachable; do not change Site audience just to make a webhook work. An owner-private review site can preview UI but cannot receive ordinary external webhook deliveries. Configure keys as secrets; never put them in browser code, source, messages, or `NEXT_PUBLIC_` variables.

Before live activation, publish the association's responsible support contact and approved refund policy on `/payment-terms`, confirm the legal recipient in Razorpay, and test a captured payment, pending payment, cancelled checkout, duplicate callback, and refund with test credentials. Accepting payments from overseas depends on the merchant's provider/account permissions and the association's eligibility; the implementation does not enable or promise international acceptance.

## Behavior
- Register an alumni profile before paying membership. Membership fee comes only from server configuration, and the registered email is used to enforce one one-time membership transaction per live/test mode. The email is not verified by the current pilot registration system.
- Membership payments reuse the same Razorpay order on retry, with a database lease to avoid concurrent duplicate order creation. A refunded membership is blocked from automatic repayment pending administrator review.
- Donations are separate one-time payments, ₹1–₹1,00,000. Preset amounts are suggestions. A unique transaction reference makes retries idempotent; start a new donation to change the saved amount or donor choices.
- A member/donor is fulfilled only after server validation of the checkout signature plus a provider API check of the exact order, amount, currency, and captured state. Authorization alone does not grant paid status.
- Every confirmed live donation gets an automatic donor-wall thank-you. The donor's name and amount are private by default. Anonymous shout-outs still acknowledge the gift. No email, transaction reference, or provider payment ID is exposed on the public wall. Latest 60 donations appear, equally ranked by time, never by amount.
- Webhooks validate the raw-body HMAC signature; updates are idempotent and a refund cannot be overwritten by stale captured/failed events. Refunded donations are removed from the wall. Test transactions never appear on the live donor wall.
- A browser stores the most recent transaction reference only, for status recovery. Actual records remain server-side. The payment confirmation is not a tax-exemption certificate.
- Financial ledger records are retained independently from profile deletion. No refund, payment capture, payout, or social-media message is initiated by this application. Capture is controlled by the merchant's provider configuration.

## Remaining operational setup
The account administrator handles refunds and donor corrections in the provider/database. The community administrator dashboard supports registration approvals, pages, photos, and enquiries. Financial refunds still require the provider dashboard; verified cross-device member login is not yet implemented. Abuse throttling/CAPTCHA and audited finance administration should be configured before broad launch. Confirmed funds do not themselves verify alumni identity.

## Verification
`node tests/payments.mjs` tests the actual route code against local D1/R2 and a mocked provider, including invalid signatures, fee tampering, duplicate orders/webhooks, private shout-outs, capture, and refunds. This is not a real provider transaction. `node tests/integration.mjs` retains registration regression coverage.

Membership checkout now requires administrator-approved alumni registration. Registration approval does not follow automatically from a fee payment.
