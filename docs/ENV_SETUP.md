# 📋 Environment Setup Guide: That Jalta Diya

This guide maps every environment variable for both **Backend** and **Frontend**, where to find or generate the values in your cloud provider consoles, and how to verify your deployment.

---

## 🔐 Backend Variables (`backend/.env`)

| Variable Name | Required in Prod | Where to Get It / Format | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | Set to `production` on host | Controls security guards, CSP, HTTPS enforcement |
| `PORT` | No | Default `5000` | Port Express listens on |
| `DATABASE_URL` | Yes | **Neon Console** > Project Dashboard > Connection Details > Select **"Pooled connection"** (Host contains `-pooler`) | PostgreSQL pooled connection string via pgbouncer |
| `DIRECT_URL` | Yes | **Neon Console** > Project Dashboard > Connection Details > Select **"Direct connection"** (Host does NOT contain `-pooler`) | Direct PostgreSQL connection string used for Prisma migrations |
| `CLIENT_ORIGINS` | Yes | Your frontend domains, e.g. `https://thatjaltadiya.com` | Comma-separated allowed origins (must be HTTPS in prod) |
| `TRUST_PROXY` | Yes | `1` (or number of reverse proxy hops, e.g. Cloudflare) | Configures Express IP resolution |
| `JWT_ACCESS_SECRET` | Yes | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | High-entropy secret for 15-minute access tokens (min 64 chars in prod) |
| `JWT_REFRESH_SECRET` | Yes | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | High-entropy secret for 7-day refresh tokens (min 64 chars in prod) |
| `COOKIE_SECRET` | Yes | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Secret for signing express cookies (min 32 chars in prod) |
| `COOKIE_DOMAIN` | Optional | `.thatjaltadiya.com` | Domain scope for refresh cookies |
| `COOKIE_SAMESITE` | No | `strict` or `lax` (default `strict` in prod) | Cookie SameSite enforcement |
| `STORAGE_ENDPOINT` | Yes | **Neon Console** > Storage > Bucket Settings > **Endpoint URL** (e.g. `https://storage.neon.tech`) | S3-compatible API endpoint |
| `STORAGE_REGION` | Yes | **Neon Console** > Storage > Bucket Region (e.g. `us-east-1` or `eu-central-1`) | AWS / S3 region string |
| `STORAGE_ACCESS_KEY_ID` | Yes | **Neon Console** > Storage > Credentials > Create Key > **Access Key ID** | S3 API Access Key |
| `STORAGE_SECRET_ACCESS_KEY`| Yes | **Neon Console** > Storage > Credentials > Create Key > **Secret Access Key** | S3 API Secret Key |
| `STORAGE_BUCKET` | Yes | **Neon Console** > Storage > Bucket Name (e.g. `product-images`) | Target bucket (set to `public_read`) |
| `STORAGE_PUBLIC_BASE_URL` | Yes | **Neon Console** > Storage > Bucket Details > **Public CDN URL** | Public base URL used for product image rendering |
| `STORAGE_FORCE_PATH_STYLE` | No | `true` (default for Neon) | Enables path-style S3 addressing |
| `TURNSTILE_SECRET_KEY` | Yes | **Cloudflare Dashboard** > Turnstile > Select Site > **Secret Key** | Server-side captcha verification key |
| `ALLOW_TEST_CAPTCHA` | No | `false` in production (fails startup if `true`) | Local test bypass |
| `ALLOW_UNPAID_TEST_ORDERS` | No | `false` in production (fails startup if `true`) | Test checkout mode |
| `ENABLE_UNPAID_ORDER_EXPIRY`| No | `true` | Automated cancellation of abandoned unpaid orders |
| `UNPAID_ORDER_EXPIRY_MINUTES`| No | `30` | Minutes before an unpaid order is cancelled and restocked |
| `SMTP_HOST` | Conditional | Email provider (e.g. `smtp.resend.com`, `smtp.sendgrid.net`, `smtp.gmail.com`) | SMTP host |
| `SMTP_PORT` | Conditional | `587` or `465` | SMTP port |
| `SMTP_USER` | Conditional | Email provider username / API key | SMTP authentication username |
| `SMTP_PASS` | Conditional | Email provider password / API key | SMTP authentication password |
| `RESEND_API_KEY` | Conditional | **Resend Dashboard** > API Keys | Alternative to SMTP |
| `EMAIL_FROM` | Yes | `That Jalta Diya <hello@thatjaltadiya.com>` | Sender identity (must match verified domain) |
| `SMS_PROVIDER` | No | `none`, `msg91`, or `twilio` (default `none`) | SMS gateway adapter |
| `MSG91_AUTH_KEY` | Conditional | **MSG91 Dashboard** > Auth Keys | Required if `SMS_PROVIDER=msg91` |
| `MSG91_TEMPLATE_ID` | Conditional | **MSG91 Dashboard** > OTP Templates | Template ID for OTP |
| `TWILIO_ACCOUNT_SID` | Conditional | **Twilio Console** > Account Info | Required if `SMS_PROVIDER=twilio` |
| `TWILIO_AUTH_TOKEN` | Conditional | **Twilio Console** > Account Info | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Conditional | **Twilio Console** > Active Numbers | Twilio Sender Phone Number |
| `SENTRY_DSN` | Optional | **Sentry Dashboard** > Project Settings > Client Keys | Error monitoring (PII scrubbed) |

---

## 🎨 Frontend Variables (`frontend/.env` / Cloudflare Pages / Vercel)

| Variable Name | Required in Prod | Where to Get It / Format | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | `https://api.thatjaltadiya.com/api/v1` | Public API endpoint |
| `VITE_TURNSTILE_SITE_KEY` | Yes | **Cloudflare Dashboard** > Turnstile > Select Site > **Site Key** | Public widget key (Production build rejects test keys) |

---

## 🧪 Post-Setup Verification

After pasting your credentials into `backend/.env`:

```bash
cd backend
npm run verify:integrations
```

This runs 5 automated checks:
1. Environment variables completeness.
2. Neon Database connectivity across both `DATABASE_URL` (pooled) and `DIRECT_URL`.
3. Database migrations application status.
4. Object Storage upload, public HTTP fetch, and deletion probe.
5. Turnstile secret and email provider readiness.
