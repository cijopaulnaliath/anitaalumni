# Community services and launch handover

## Member experience
- `/alumni`: search approved, opted-in alumni by name, school year, country, city, or profession.
- `/account`: restore access with a code sent to the registered email; edit details and photos, change visibility, view payments, download captured-payment confirmations, and manage bookings.
- `/events`, `/volunteer`, `/mentoring`: dated opportunities with capacity, reservations, cancellation, and calendar downloads. A calendar entry is not a reservation. Members must be approved and email-verified to book.
- `/faq` and `/verification`: explain eligibility, privacy, school checks, payments, photo moderation, and recovery.

Email-code sign-in replaces the previous browser token, consumes a browser-bound proof exactly once, and expires after 30 days on both server and browser. Logout revokes the token. School-detail changes return a member to pending review. Email changes or losing access to the inbox require manual association support; no unauthenticated email-change endpoint is provided. Email OTP is not full MFA.

## Administrator workflow
Open `/admin` using an account in `ADMIN_EMAILS`.

1. **Registrations:** confirm the name, batch, and class against a school record or known batch leader. Record the source category and a private note. School approval requires a trusted-source selection and an evidence note of at least 10 characters. It can be recorded while inbox verification is pending; directory listing, booking, uploads, and membership checkout remain gated by verified email. Test registrations cannot receive real approval; the review history is retained privately until the registration is deleted.
2. **Pages & content:** publish confirmed board members and batch leaders with portraits, role, brief/full bio, batch, and an optional approved HTTPS, mailto, or `/contact` link. Confirm permission before publishing people or photographs. Projects must be marked ongoing or completed; do not publish proposed ideas as completed work.
3. **Photo review:** review uploaded reunion photos for consent and appropriateness, then publish or reject. Alumni can submit up to six photos, each under 3 MB.
4. **Services & launch setup → Events, volunteering & mentoring:** create a draft; confirm date/time zone, venue, organizer, capacity and permission; then publish. A mentoring entry represents a mentor’s scheduled conversation and can include their approved biography. Published opportunities require future start times. Capacity cannot be reduced below current bookings. Mark an opportunity cancelled to close it.
5. **Reservations:** private attendee names and registered emails are available to authorized organizers. Members see schedule changes in their account. Automatic booking or cancellation emails are not currently sent; organizers must contact affected attendees.
6. **Contact & setup:** enter the approved association email, phone, responsible contact/role, response timeframe, and refund policy. These values appear publicly on Contact and payment terms. Unconfirmed values remain blank.
7. **Contact inbox:** enquiries are stored privately; reply using the approved association email. No response timeframe is invented by the application.

## External activation still required
- Email: configure `RESEND_API_KEY` as a server secret and `EMAIL_FROM` as an approved sender on a verified domain. `EMAIL_OTP_SECRET` must be at least 32 random characters. Test a real delivery and complete registration and cross-device sign-in.
- Payments: configure the authorized association’s Razorpay key ID, key secret, signed-webhook secret, and `PAYMENTS_ENABLED=true`. The fee remains INR 1,000. Live checkout also requires a published responsible contact, email, response timeframe, and refund policy. Test mode can be exercised before live policy publication. Test a captured transaction, duplicate membership attempt, downloadable confirmation, signed refund, and donor-wall removal.
- Content: obtain actual board/batch-leader appointments, publication permission, reunion photographs, confirmed project details, and opportunity dates. No invented people, completed projects, or event dates are seeded into production. The Updates page includes a founding-community invitation explicitly identifying the effort as proposed.

## Hosting
The ChatGPT Site applies the append-only D1 migration at publication. For Vercel, run the full updated `supabase.sql` as an authorized database administrator, configure service-role secrets, and deploy the generated Next.js project. New tables use RLS with no anon/authenticated access; server-only functions are granted to `service_role`. Dated opportunity reservations are serialized per opportunity in PostgreSQL and use an atomic conditional write in D1. Local tests cover capacity races and private access; the Supabase/Vercel production service still needs a configured integration check.
