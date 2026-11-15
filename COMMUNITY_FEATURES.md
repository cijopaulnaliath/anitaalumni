# Connections, batch workspaces, invitations, and WhatsApp

## Where to find the features

- **My account → Connections & invitations** (`/network`): approved, email-verified alumni can create their personal invitation link and QR code, send private connection requests, respond, and message after acceptance. The directory’s **Request to connect** link selects the member.
- **Batch leader workspace** (`/batch-workspace`): appointed leaders see school names, class/batch details and review status for their own batch. They can recommend pending registrations with a reference note and draft WhatsApp updates. They cannot approve registrations, see private contacts, access another batch, or send campaigns. Administrators can select any batch.
- **Administration → Community & WhatsApp**: administrators review batch recommendations and create, preview, queue, send, or cancel WhatsApp campaigns for one batch or all eligible alumni. Saving or queueing does not automatically send. Send the next three recipients explicitly until the campaign is complete.

Appointment comes from the existing registered-member batch leader control. An archived, unapproved, unverified, test, renamed, or batch-changed profile cannot retain workspace access unless its current, published appointment matches. Revocations are checked server-side on every request.

## Invitations and private connections

Personal invitation links use an opaque random reference, expire after 90 days, and preselect the inviter’s Class 10 batch. They do not approve registrations, bypass email verification, or expose the inviter’s email/phone. Visiting Connections & invitations renews an expired invitation. QR codes are generated locally by the server using the `qrcode` package; no third-party QR service receives links or member data. Share buttons open a draft in the member’s own WhatsApp; they do not send automatically.

Only active, approved, email-verified alumni can use private connections. Requests can target active, approved alumni with verified email; directory listing is automatic. The recipient alone can accept or decline; the sender can withdraw a pending request. Either participant can block the connection. Contact details are never revealed by acceptance. Conversations are stored privately, with up to 200 messages per connection, 10 requests per sender/day, 30 messages/hour, and a brief interval between messages. Refresh the conversation to see replies. Initial requests and acceptance send transactional Resend notifications when configured; notification failure does not discard the saved request. Conversations are not end-to-end encrypted. Other participants retain history if an account is removed; association administrators handle requests for removal or abuse reports.

## Configure WhatsApp Cloud API

The association must provide its own Meta Business app, WhatsApp Business Account, phone number, access token with the necessary WhatsApp permissions, and an approved message template. No account or live template is provisioned automatically. This implementation calls Meta’s Cloud API directly.

Add these **server-only Vercel environment variables**, then redeploy:

| Variable | Value |
| --- | --- |
| `WHATSAPP_ENABLED` | `false` during setup; `true` after configuration and controlled testing |
| `WHATSAPP_ACCESS_TOKEN` | Secret access token for the association’s WhatsApp phone number |
| `WHATSAPP_PHONE_NUMBER_ID` | Numeric Cloud API phone number ID, not the telephone number |
| `WHATSAPP_API_VERSION` | Supported Graph API version from the current Meta dashboard, including `v` |
| `WHATSAPP_TEMPLATE_NAME` | Exact approved template name |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Exact approved language code, such as `en` or `en_US` |
| `WHATSAPP_APP_SECRET` | Secret Meta app secret used to verify webhook POST signatures |
| `WHATSAPP_VERIFY_TOKEN` | A random secret you choose and enter in Meta’s webhook configuration |
| `WHATSAPP_TEST_RECIPIENTS` | During tests, comma-separated verified test phone numbers in `+countrycode` format; remove only after acceptance |

Keep the existing Supabase, Resend, and SITE_URL settings. Never put tokens in source code, screenshots, campaign messages, or client-side variables.

Create and obtain approval for a template with **one positional text body parameter** (`{{1}}`). Example text to submit to Meta:

> Hello Anita Alumni member,
>
> Here is an update from the Anita Alumni association: {{1}}
>
> Manage your update preferences at https://anitaalumni.org/account. Reply STOP to stop WhatsApp updates.

The parameter receives the campaign title and message as a single line. Use the category and content approved by Meta. The implementation does not bypass approval or send free-form cold messages. Generic `hello_world` templates without a body parameter are incompatible. If Meta rejects this example, use an approved equivalent with the same single-parameter shape.

In the Meta app configure:

- Callback URL: `https://anitaalumni.org/api/network/whatsapp/webhook` (use the final canonical site host if Vercel redirects this domain).
- Verify token: the same value as `WHATSAPP_VERIFY_TOKEN`.
- Subscribe to the **messages** webhook field for inbound STOP replies and message delivery/read/failure status.

Campaign eligibility requires an active, approved, email-verified, non-test alumni registration, a valid international phone number, explicit WhatsApp opt-in and a recorded consent timestamp. Duplicate phone numbers are deduplicated. Preview includes the precise audience fingerprint; if it changes, queueing requires another preview. Eligibility and phone are rechecked immediately before sending. STOP, UNSUBSCRIBE, CANCEL, and OPT OUT messages signed by the configured Meta app disable the matching phone’s WhatsApp opt-in. My account provides the existing preference control as well.

A provider acceptance response is shown as **accepted**, not delivered. Signed webhooks supply **sent**, **delivered**, **read**, or **failed**. Timeouts and uncertain provider outcomes are not automatically retried. If a sending process is interrupted, refresh and resume the campaign; processing recipients older than its lease are marked unknown rather than resubmitted. Check Meta logs before creating another campaign for uncertain recipients. An in-flight message may still arrive after cancellation or opt-out.

## Testing before sending to members

1. Configure Meta’s test phone and verified test recipients. Set WHATSAPP_TEST_RECIPIENTS to those numbers and use consented, approved profiles.
2. Confirm an unapproved/non-opted-in/test profile is excluded and a leader cannot select another batch or send.
3. Preview, queue, and explicitly send a small test campaign. Confirm phone deduplication, account link, STOP instruction, and the provider result.
4. Validate delivered/read callbacks and an actual STOP reply; verify that member disappears from the audience.
5. Verify request/accept/decline/block, private message access, revoked leader access, and invitation QR scan on physical devices.
6. Remove the test restriction only when the association approves live delivery.

No live WhatsApp message was sent during implementation. Provider credentials, template approval, webhook delivery and physical-device scanning need the association’s acceptance test.

## Storage and checks

No SQL migration is required. Private durable records reuse the existing `site_settings` table under the `network.` namespace; existing SQL denies anon/authenticated clients access and grants the service role access. Conditional compare-and-set writes protect claims and updates; private member information never appears in public invitations. Current lists are bounded at 10,000 records per namespace and conversations at 200 messages. Revisit indexed relational storage and retention as the network grows; historical requests, campaign delivery records, recommendations, and conversations are retained privately until the association removes them. Administrative WhatsApp and recommendation actions are audited. No WhatsApp campaign is started on a schedule.

Run `npm run build`, `node tests/network-features.cjs`, `node tests/batch-leader.cjs`, and `node tests/site-content.cjs`. Tests use fictional profiles, in-memory persistence, and mocked provider responses and do not send messages.

References: [Meta message template API](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text), [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy), [Meta webhook signature reference](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/).
