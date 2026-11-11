# Anita Alumni — Vercel deployment

Target domain: https://anitaalumni.org
Source version: 27 (automatic slideshow and clarified test sign-in).

## Upload
Extract this archive. On Vercel New Project, choose a folder and select the extracted anita-alumni-vercel folder. Use Next.js framework detection and project name anita-alumni.

## Required backend setup
Create or select a Supabase project, run the included supabase.sql in the SQL editor, and configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel as server-only environment variables. This creates private database tables and a private photo bucket. Existing ChatGPT-hosted registrations and photos are not included in this source archive and do not transfer automatically.

## Environment
Use .env.example for the full list of supported variables. Set SITE_URL=https://anitaalumni.org and MEMBERSHIP_FEE_INR=1000.
For production, set EMAIL_TEST_MODE=false. Configure EMAIL_OTP_SECRET (a random server-side secret of at least 32 characters), RESEND_API_KEY and EMAIL_FROM with a verified sender. Email registration remains unavailable until this sender is configured. Never publish service keys or prefix them with NEXT_PUBLIC_.
For an isolated test deployment only, EMAIL_TEST_MODE=true enables code 1234 for private test profiles while no real email sender is configured. Never allow it on a public launch.
Configure ADMIN_LOGIN_USER, ADMIN_PASSWORD_HASH and ADMIN_EMAILS through Vercel server-side settings; see ADMIN_OPERATIONS.md. Do not paste passwords or API secrets into chat.
Optional Google sign-in needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI=https://anitaalumni.org/api/auth/google/callback, plus that same URI in Google OAuth settings.
Leave PAYMENTS_ENABLED=false until Razorpay and real payment checks are complete. WhatsApp preferences are stored; WhatsApp delivery is not yet connected.

## Domain
After a healthy deployment, add anitaalumni.org and www.anitaalumni.org in Vercel Project Settings > Domains. Use the exact DNS records Vercel assigns for this project at the existing DNS provider. The domain currently uses GoDaddy nameservers. Preserve unrelated email/MX/TXT records. Configure www to redirect to the apex domain. Verify HTTPS and registration/account/admin/photo flows before launch.

## Verification
The Next.js production build and TypeScript checks passed for this source. Supabase and live email must be tested after their environment is connected.
