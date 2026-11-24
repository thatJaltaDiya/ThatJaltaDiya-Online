# ✨ That Jalta Diya (That Jalta Diya - Handcrafted Candle Bouquets & Girly Gifts)

A production-grade, full-stack e-commerce web platform built for **That Jalta Diya**, an artisan gifting studio transitioning from offline boutique pop-ups to an online storefront. The store specializes in **handcrafted soy candle bouquets, luxury scented jar candles, botanical wax tablets, and girly gift hampers**.

Built with an Awwwards-inspired, editorial aesthetic (funky, playful, feminine, and high-trust), rock-solid security engineering, and a dedicated, intuitive admin console designed for a non-technical business owner.

---

## 🌸 Table of Contents

1. [Architectural Overview](#-architectural-overview)
2. [Monorepo Directory Layout](#-monorepo-directory-layout)
3. [Tech Stack](#-tech-stack)
4. [Quickstart & Local Setup](#-quickstart--local-setup)
5. [Environment Variables Reference](#-environment-variables-reference)
6. [Owner's Guide: Managing Your Store](#-owners-guide-managing-your-store)
7. [Deployment Guide (Production)](#-deployment-guide-production)
8. [Payment Gateway Integration Guide](#-payment-gateway-integration-guide)
9. [Automated Testing & Security Audit](#-automated-testing--security-audit)

---

## 🏛️ Architectural Overview

- **Single Admin Model**: Exactly one administrator (the business owner). There is **no public admin registration route**. Admin credentials are securely created via a dedicated CLI script (`npm run create-admin`).
- **Demo Data System**: The store comes pre-seeded with 24 realistic demo products across 6 categories, complete with 72 local WebP images generated in brand colors, variants, prices in INR paise, coupons, and customer testimonials. All demo items carry an `isDemo: true` flag and can be purged in 1 click from the Admin Settings "Danger Zone".
- **Stateless & Resilient Auth**:
  - Passwords hashed with **Argon2id**.
  - Short-lived JWT access tokens kept strictly in frontend JavaScript memory.
  - Rotating refresh tokens stored in `httpOnly`, `SameSite=Lax` cookies, hashed in the database with token family reuse revocation.
  - Progressive account lockout after 5 failed attempts + dummy hash timing attack protection.
- **Commerce Integrity**:
  - All monetary values stored as integers in **paise** (e.g. ₹1,899.00 = `189900`), completely eliminating floating-point calculation errors.
  - **Atomic conditional stock updates** in PostgreSQL transactions prevent overselling.
  - Unique `idempotencyKey` on orders prevents duplicate charges.
  - Immutable historical order item snapshots.
- **Payment Provider Abstraction**: Modular `PaymentProvider` adapter architecture with a clear integration contract and developer test mode (`ALLOW_UNPAID_TEST_ORDERS=true`).

---

## 📁 Monorepo Directory Layout

```
ThatJaltaDiya/
├── client/                     # Frontend Single Page App (React + Vite)
│   ├── public/                 # Static assets, favicon, manifest
│   ├── src/
│   │   ├── components/         # Reusable design system (Button, Card, Modal, etc.)
│   │   ├── context/            # React contexts (Auth, Cart, Wishlist, Toast)
│   │   ├── pages/              # Storefront, customer account, and admin pages
│   │   ├── services/           # Axios-like Fetch API client with silent token refresh
│   │   ├── validators/         # Client-side Zod validation schemas
│   │   ├── App.jsx             # React Router v6 tree with route guards
│   │   ├── index.css           # Tailwind base styles and CSS variables
│   │   └── main.jsx            # Entry point
│   ├── tailwind.config.js      # Brand design tokens (Canvas, Primary, Accent, etc.)
│   ├── vite.config.js          # Vite config with API proxy & chunk splitting
│   └── package.json
│
├── server/                     # Backend API (Node.js + Express ES Modules)
│   ├── prisma/
│   │   ├── schema.prisma       # Normalized schema with relations, enums & indexes
│   │   ├── migrations/         # Tracked PostgreSQL migrations
│   │   └── seed.js             # Idempotent demo data generator with Sharp & SVG
│   ├── src/
│   │   ├── config/             # Strict Zod environment validation & logger
│   │   ├── controllers/        # Request handlers (auth, products, cart, admin, etc.)
│   │   ├── middleware/         # Security middleware (auth, rbac, rate-limiting, CSP)
│   │   ├── routes/             # Versioned REST API endpoints (/api/v1/*)
│   │   ├── services/           # Core business logic & database transactions
│   │   │   └── payment/        # PaymentProvider interface & test adapter
│   │   ├── utils/              # Password hashing, JWTs, response helpers
│   │   ├── validators/         # Strict Zod schemas for body, params, and query
│   │   ├── app.js              # Express app definition
│   │   └── server.js           # Server bootstrap & graceful shutdown
│   ├── tests/                  # Automated integration tests (Vitest + Supertest)
│   ├── scripts/                # CLI utilities (create-admin, verify-e2e)
│   ├── uploads-dev/            # Local image storage fallback for development
│   └── package.json
│
├── PLAN.md                     # Architecture plan & design system findings
├── PROGRESS.md                 # Autonomous build tracker & phase log
├── SECURITY.md                 # Comprehensive security checklist & compliance proof
└── README.md                   # This master documentation
```

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18 (Vite, JS) | Fast HMR, lightweight, pure JavaScript (no TypeScript) |
| **Routing** | React Router v6 | Declarative routing with nested layouts and RBAC route guards |
| **Styling** | Tailwind CSS v3 | Custom design system using CSS variables & brand tokens |
| **Backend** | Node.js (v20+) + Express | Scalable ES modules, middleware pipeline |
| **Database** | PostgreSQL | Hosted on Supabase (pooled pgbouncer + direct URL) |
| **ORM** | Prisma ORM | Type-safe queries, automated migrations, zero raw SQL |
| **Storage** | Supabase Storage / Local | Sharp image processing, EXIF stripping, multi-size WebP |
| **Validation** | Zod (Client & Server) | Strict schemas rejecting unknown fields |
| **Testing** | Vitest + Supertest | Rapid integration testing of auth, security, and commerce APIs |

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v20 or later
- **npm**: v10 or later
- **PostgreSQL**: Local PostgreSQL 15+ instance running, or a free Supabase project.

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd ThatJaltaDiya

# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 3. Database Setup & Migrations
In `server/.env`, configure your PostgreSQL connection strings:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thatjaltadiya?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/thatjaltadiya?schema=public"
```

Apply the Prisma migrations:
```bash
cd server
npm run prisma:migrate
```

### 4. Create the Admin Account (Owner)
Run the secure CLI prompt to create the single owner account:
```bash
cd server
npm run create-admin
```
Follow the interactive prompts to enter the owner's email and password (e.g. `owner@thatjaltadiya.com` / `OwnerPassword123!`).

### 5. Seed Realistic Demo Products
Populate the store with 24 realistic products, 6 categories, and 72 generated WebP images:
```bash
cd server
npm run seed
```

### 6. Start the Applications
Open two terminal windows:

**Terminal 1 (Backend Server on http://localhost:5000):**
```bash
cd server
npm start
# Or for live file watching:
npm run dev
```

**Terminal 2 (Frontend Client on http://localhost:5173):**
```bash
cd client
npm run dev
```

Open your browser at **`http://localhost:5173`** to view the customer storefront, or **`http://localhost:5173/admin`** to log in to the admin console.

---

## ⚙️ Environment Variables Reference

### Backend (`server/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | Port Express listens on |
| `NODE_ENV` | Yes | `development` | `development`, `production`, or `test` |
| `DATABASE_URL` | Yes | - | Pooled connection string (pgbouncer for Supabase) |
| `DIRECT_URL` | Yes | - | Direct PostgreSQL connection string (for migrations) |
| `JWT_ACCESS_SECRET` | Yes | - | High-entropy secret for signing 15m access tokens |
| `JWT_REFRESH_SECRET` | Yes | - | High-entropy secret for signing 7d refresh tokens |
| `COOKIE_SECRET` | Yes | - | Secret for signing express cookies |
| `CLIENT_ORIGINS` | Yes | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `ALLOW_UNPAID_TEST_ORDERS`| No | `true` | Allows placing test orders without live payment provider |
| `SUPABASE_URL` | No | - | Supabase project URL (optional in dev) |
| `SUPABASE_SERVICE_ROLE_KEY`| No | - | Supabase service role key for private uploads |
| `SUPABASE_STORAGE_BUCKET` | No | `product-images` | Storage bucket name |
| `TURNSTILE_SECRET_KEY` | No | - | Cloudflare Turnstile secret key |
| `ALLOW_TEST_CAPTCHA` | No | `true` | Allows test bypass of Turnstile widget in dev |
| `SMTP_HOST` | No | - | SMTP server for transactional emails |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `EMAIL_FROM` | No | `hello@thatjaltadiya.com` | "From" header for emails |

### Frontend (`client/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | No | `/api/v1` | Base API URL (proxied by Vite in dev) |
| `VITE_TURNSTILE_SITE_KEY` | No | `1x00000000000000000000AA` | Cloudflare Turnstile site key (test dummy included) |

---

## 👩‍💼 Owner's Guide: Managing Your Store

As the owner of That Jalta Diya, you have a private Admin Console located at **`/admin`**.

### 1. Replacing Demo Products with Real Products
1. Log in at `/login` with your admin credentials, then go to `/admin`.
2. Navigate to **Products** (`/admin/products`).
3. Click **"+ Add New Product"**.
4. Fill out the friendly form:
   - **Product Name** & **Category** (e.g., Candle Bouquets)
   - **Price in INR** (enter normal rupees, e.g. `1899` — the system automatically stores it in paise)
   - **Stock Count** & **SKU**
   - **Upload Real Photos**: Drag and drop up to 8 real product photos directly from your phone or camera. The server will automatically optimize them, strip unnecessary metadata, and convert them to fast-loading WebP images!
5. Toggle **"Featured on Homepage"** or **"Bestseller"** to showcase it in prime storefront spots.
6. Click **"Save Product"**.

### 2. Purging Demo Content (When Ready to Launch)
While demo products exist on your store, an orange banner will remind you:
> *"Demo data active — Demo products and categories are visible on your store."*

When you have added your real products and are ready to remove the placeholders:
1. Navigate to **Settings** (`/admin/settings`).
2. Scroll down to the red **Danger Zone**.
3. Click **"Delete All Demo Data"**.
4. A confirmation modal will appear. Confirm the deletion.
5. All 24 demo products, placeholder categories, generated placeholder images, and fake testimonials will be permanently deleted. **Any real products or customer orders you have created will remain untouched!**

### 3. Fulfilling Orders & Printing Packing Slips
1. Navigate to **Orders** (`/admin/orders`).
2. Click any order row to open the complete details: customer delivery address, gift messages, and purchased items.
3. Update the order status as you prepare the package:
   `PENDING` ➔ `CONFIRMED` ➔ `PACKED` ➔ `SHIPPED` (add Courier Name and Tracking Number) ➔ `DELIVERED`.
4. Click **"Print Packing Slip"** to open a clean, printable invoice slip to slip inside the customer's parcel box.

---

## 🌐 Deployment Guide (Production)

### 1. Database & Storage: Supabase
1. Create a free account at [Supabase.com](https://supabase.com) and start a new project.
2. In Project Settings > Database:
   - Copy the **Connection string (Transaction pooler, port 6543)** and set it as `DATABASE_URL` in production.
   - Copy the **Connection string (Direct, port 5432)** and set it as `DIRECT_URL` in production.
3. In Project Settings > Storage:
   - Create a public bucket named `product-images`.
   - Copy your **Project URL** (`SUPABASE_URL`) and **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`).
4. Run migrations against your Supabase database:
   ```bash
   DATABASE_URL="<pooled-url>" DIRECT_URL="<direct-url>" npx prisma migrate deploy
   ```

### 2. Backend Deployment (Render, Railway, Fly.io, or VPS)
1. Deploy the `/server` folder.
2. Set Build Command: `npm install && npm run prisma:generate`
3. Set Start Command: `npm start`
4. Set Environment Variables:
   - `NODE_ENV=production`
   - `DATABASE_URL` & `DIRECT_URL` (from Supabase)
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET` (generate using `openssl rand -hex 64`)
   - `COOKIE_SECRET` (generate using `openssl rand -hex 32`)
   - `CLIENT_ORIGINS=https://thatjaltadiya.com`
   - `ALLOW_UNPAID_TEST_ORDERS=false`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
   - Cloudflare Turnstile keys & SMTP email credentials.
5. Run `node src/scripts/create-admin.js` once in the deployment console to create the production owner account.

### 3. Frontend Deployment (Cloudflare Pages or Vercel)
1. Deploy the `/client` folder.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set Environment Variables:
   - `VITE_API_URL=https://api.thatjaltadiya.com/api/v1`
   - `VITE_TURNSTILE_SITE_KEY=<your-live-turnstile-site-key>`

---

## 💳 Payment Gateway Integration Guide

Real payment gateway processing has been intentionally isolated into a clean adapter pattern so the owner can connect their preferred Indian payment provider (Razorpay, Cashfree, PhonePe, or Stripe) without breaking existing checkout flows.

### Integration Point:
Look at `server/src/services/payment/PaymentProvider.js`:
```javascript
export class PaymentProvider {
  async createPaymentOrder({ orderId, amountInPaise, currency, customer }) {
    throw new Error('createPaymentOrder not implemented');
  }

  async verifyWebhookSignature({ rawBody, signature, headers }) {
    throw new Error('verifyWebhookSignature not implemented');
  }
}
```

### Steps to Attach Razorpay or Cashfree:
1. Install the SDK: `npm install razorpay` in `/server`.
2. Create `server/src/services/payment/RazorpayProvider.js` implementing `PaymentProvider`.
3. In `createPaymentOrder`, call `razorpay.orders.create({ amount: amountInPaise, currency: 'INR', receipt: orderId })` and return `{ paymentOrderId, key: process.env.RAZORPAY_KEY_ID }`.
4. In `server/src/routes/webhooks.routes.js`, receive `payment.captured` webhooks, verify the signature with `crypto.createHmac`, and call `orderService.markOrderPaid(orderNumber, paymentId)`.
5. On the frontend (`client/src/pages/Checkout.jsx`), include the checkout modal script and open it upon order placement.
6. In production, set `ALLOW_UNPAID_TEST_ORDERS=false` in `server/.env`.

---

## 🧪 Automated Testing & Security Audit

### Running Server Tests
```bash
cd server
npm test
```
Result: **15 / 15 tests passed** covering:
- Argon2id password hashing and dummy hash timing attack protection
- Zod strict input validation rejecting mass assignment
- Progressive account lockout after 5 failed attempts
- JWT in-memory access token + rotating refresh token family reuse revocation
- Product listing, search, category filtering, and slug queries
- Atomic transactional stock decrement and out-of-stock validation
- Coupon percentage and flat discount application
- IDOR protection across customer address and order resources

### Running Linters
```bash
# Server Linter
cd server && npm run lint

# Client Linter
cd client && npm run lint
```
Result: **0 errors, 0 warnings**.

### Running Client Production Build
```bash
cd client
npm run build
```
Result: Vite production build successfully compiles minified HTML, CSS, and split vendor/utility chunks into `/client/dist`.

For full details on compliance with security guidelines, see [SECURITY.md](file:///c:/ThatJaltaDiya/SECURITY.md).
