# Security Audit & Verification Checklist: That Jalta Diya

This document provides a comprehensive security assessment of the **That Jalta Diya** e-commerce platform according to the mandatory requirements in Section 7 of the Project Brief.

---

## 1. Executive Summary

| Category | Status | Notes |
| :--- | :--- | :--- |
| **Input Validation & Sanitization** | **PASS** | Zod `.strict()` schemas on every route + DOMPurify + sanitize-html |
| **SQL Injection Protection** | **PASS** | 100% Prisma ORM queries; zero raw/unparameterized SQL |
| **Cross-Site Scripting (XSS)** | **PASS** | Helmet CSP + DOMPurify on frontend + sanitize-html on server |
| **Authentication & Tokens** | **PASS** | Argon2id + in-memory access tokens + rotating refresh tokens + family revocation |
| **Authorization & RBAC** | **PASS** | Strict ADMIN role check + IDOR scoping across all user entities |
| **CSRF & CORS** | **PASS** | Strict CORS origin whitelist + custom headers + SameSite cookies |
| **Rate Limiting & Anti-Brute Force** | **PASS** | Tiered rate limiting + progressive lockout after 5 failed logins |
| **Bot / Spam Protection** | **PASS** | Cloudflare Turnstile CAPTCHA middleware on sensitive routes |
| **Secure Headers & Transport** | **PASS** | Helmet CSP, HSTS, frameAncestors 'none', X-Content-Type-Options |
| **Commerce Data Integrity** | **PASS** | Prices in integer paise, atomic conditional stock updates, idempotency keys |
| **Secrets & Credentials** | **PASS** | Strict Zod env validation at startup; zero secrets committed |
| **File Upload Security** | **PASS** | Memory storage + Sharp EXIF stripping + WebP conversion + size bounds |
| **Audit Logging** | **PASS** | Comprehensive administrative audit logs stored in DB |

---

## 2. Detailed Checklist & Verification Results

### 7.1 Essential Security

#### 1. Input Validation (Zod)
- [x] **PASS**: Every incoming request (`body`, `params`, `query`) is validated through reusable `validate({ body, params, query })` middleware.
- [x] **PASS**: All schemas use `.strict()` to reject unknown fields and prevent mass assignment attacks.
- [x] **PASS**: Frontend forms replicate backend validation rules to prevent submission of invalid data.
- **Verification Evidence**: `server/src/middleware/validate.js`, `server/src/validators/auth.validators.js`, `server/src/validators/commerce.validators.js`, `server/src/validators/admin.validators.js`. Integration test `Rejects registration with unknown fields` passed.

#### 2. SQL Injection Protection
- [x] **PASS**: All database operations use Prisma ORM's type-safe, parameterized query engine.
- [x] **PASS**: No `$queryRawUnsafe` or concatenated SQL queries are present anywhere in the codebase.
- **Verification Evidence**: Automated code audit confirms 0 occurrences of `$queryRawUnsafe`.

#### 3. XSS Protection
- [x] **PASS**: Frontend uses `DOMPurify.sanitize()` prior to rendering any rich text.
- [x] **PASS**: Server sanitizes all rich product descriptions using `sanitize-html` with an explicit allowed tags whitelist before database writes.
- [x] **PASS**: Helmet sets Content Security Policy (`default-src 'self'`, fonts from `fonts.gstatic.com`, scripts restricted to `'self'` and Cloudflare Turnstile).
- **Verification Evidence**: `client/src/pages/ProductDetail.jsx`, `server/src/services/product.service.js`, `server/src/app.js`.

#### 4. Authentication Architecture
- [x] **PASS**: Passwords hashed using Argon2id (`timeCost: 3`, `memoryCost: 65536`, `parallelism: 4`) with individual cryptographically secure random salts.
- [x] **PASS**: Short-lived JWT access tokens (15 minutes) kept exclusively in frontend memory (never stored in `localStorage` or `sessionStorage`).
- [x] **PASS**: Long-lived refresh tokens (7 days) stored in `httpOnly`, `Secure` (production), `SameSite=Lax` cookies.
- [x] **PASS**: Refresh tokens are cryptographically hashed (SHA-256) before storing in the database.
- [x] **PASS**: Refresh token rotation implemented with **token family reuse detection**: if a revoked or previously used token is presented, all refresh tokens in that family are immediately revoked.
- [x] **PASS**: Progressive account lockout implemented: after 5 failed login attempts within 15 minutes, the account is locked for 15 minutes.
- [x] **PASS**: Dummy password hash comparison executed when an email is not found to prevent timing-based user enumeration attacks.
- **Verification Evidence**: `server/src/utils/password.js`, `server/src/utils/tokens.js`, `server/src/services/auth.service.js`. Integration tests in `server/tests/auth.test.js` pass.

#### 5. Authorization & RBAC
- [x] **PASS**: Role-Based Access Control (`CUSTOMER`, `ADMIN`) enforced server-side.
- [x] **PASS**: All `/api/v1/admin/*` endpoints strictly require `requireAuth` and `requireRole('ADMIN')`.
- [x] **PASS**: IDOR (Insecure Direct Object Reference) defense: user endpoints (addresses, orders, cart, wishlist) always scope queries to the authenticated user ID (`req.user.id`). Users cannot view or modify another customer's data.
- **Verification Evidence**: `server/src/middleware/rbac.js`, `server/src/controllers/user.controller.js`, `server/src/controllers/orders.controller.js`. Integration test in `server/tests/commerce.test.js` pass.

#### 6. CSRF & CORS Protection
- [x] **PASS**: SameSite cookies used for refresh tokens.
- [x] **PASS**: Custom request headers (`X-Requested-With`, `X-CSRF-Token`, `Authorization`) required for state-changing operations.
- [x] **PASS**: Strict CORS whitelist configured via `CLIENT_ORIGINS` environment variable, blocking unauthorized cross-origin requests.
- **Verification Evidence**: `server/src/app.js`, `server/src/middleware/csrf.js`.

#### 7. Rate Limiting & DoS Protection
- [x] **PASS**: Tiered rate limiters applied via `express-rate-limit`:
  - Global API: 100 requests per 15 minutes
  - Auth login: 5 requests per 15 minutes per IP
  - Auth register: 3 requests per hour per IP
  - Password reset: 3 requests per hour per IP
  - Checkout order creation: 5 requests per minute per IP
  - Contact messages: 3 requests per 15 minutes per IP
- [x] **PASS**: Request body size tightly capped to 10kb (preventing memory exhaustion attacks).
- [x] **PASS**: HTTP Parameter Pollution protection enabled via `hpp()`.
- **Verification Evidence**: `server/src/middleware/rate-limiter.js`, `server/src/app.js`.

#### 8. Anti-Bot / Spam Protection (Cloudflare Turnstile)
- [x] **PASS**: Cloudflare Turnstile CAPTCHA verification middleware implemented for checkout, account registration, and contact form submissions.
- [x] **PASS**: Configurable test/dev bypass (`ALLOW_TEST_CAPTCHA=true`) to enable seamless automated testing without breaking CI pipelines.
- **Verification Evidence**: `server/src/middleware/turnstile.js`, `client/src/components/ui/TurnstileWidget.jsx`.

#### 9. Secure Headers & Transport
- [x] **PASS**: `helmet` configured with strict Content Security Policy (CSP).
- [x] **PASS**: HTTP Strict Transport Security (HSTS) with 1-year max age, subdomains, and preloading enabled in production.
- [x] **PASS**: Clickjacking protection: `frameAncestors: ["'none'"]` and `X-Frame-Options: DENY`.
- [x] **PASS**: MIME type sniffing disabled: `X-Content-Type-Options: nosniff`.
- **Verification Evidence**: `server/src/app.js`.

#### 10. Commerce Data Integrity
- [x] **PASS**: All monetary values (prices, subtotals, discounts, shipping fees, totals) stored as **integers in paise** (e.g., ₹1,899.00 = `189900`), completely preventing floating-point rounding errors.
- [x] **PASS**: Product names, unit prices, selected variants, and image URLs are permanently snapshotted into `OrderItem` records upon order placement.
- [x] **PASS**: Unique `idempotencyKey` enforced on all order creations to prevent accidental double-billing or duplicate order processing.
- [x] **PASS**: **Atomic Conditional Stock Decrements**: Stock is deducted inside a PostgreSQL transaction with a conditional check (`stock >= quantity`), preventing negative inventory and race condition overselling.
- **Verification Evidence**: `server/prisma/schema.prisma`, `server/src/services/order.service.js`.

#### 11. Secrets Management
- [x] **PASS**: All environment variables validated at server boot using Zod (`server/src/config/env.js`). If any required secret or URL is missing or malformed, the process immediately crashes with clear diagnostic output.
- [x] **PASS**: Zero secrets, API keys, or database credentials committed to git.
- [x] **PASS**: Complete `.env.example` templates provided for both server and client.
- **Verification Evidence**: `server/src/config/env.js`, `server/.env.example`, `client/.env.example`.

#### 12. File Upload Security
- [x] **PASS**: Multer configured with memory storage (no untrusted files written to disk before validation).
- [x] **PASS**: File size strictly capped at 5 MB; only images (`image/jpeg`, `image/png`, `image/webp`) accepted.
- [x] **PASS**: `sharp` pipeline strips all EXIF metadata and hidden malicious payloads.
- [x] **PASS**: All uploaded images are converted to optimized WebP format with responsive size variants (`lg` 1200px, `md` 600px, `th` 250px).
- [x] **PASS**: Private upload via backend service role key; public read via CDN URLs or static development folder.
- **Verification Evidence**: `server/src/middleware/upload.js`, `server/src/services/storage.service.js`.

---

## 3. Hardening & Operational Controls

### 1. Session Invalidation on Password Change
- [x] **PASS**: When a user changes or resets their password, all active refresh token families for that user account are marked `isRevoked: true`, immediately revoking existing sessions across all browsers and devices.

### 2. Single Admin CLI Architecture
- [x] **PASS**: There is no public admin registration route or API endpoint.
- [x] **PASS**: The single admin account is initialized via a secure CLI script (`npm run create-admin`) that reads credentials interactively from terminal prompts or environment variables.

### 3. Timing Attack Mitigation
- [x] **PASS**: When a non-existent email is submitted to `/auth/login`, a dummy Argon2id hash verification is executed with identical cost parameters before returning an unauthorized response, ensuring consistent response latency.

### 4. Administrative Audit Logging
- [x] **PASS**: Sensitive admin operations (product creations, price updates, stock adjustments, order status modifications, demo data cleanup) are recorded in the `AuditLog` database table with admin ID, action type, IP address, user agent, and timestamp.

---

## 4. Verification Conclusion

**Final Status: APPROVED FOR PRODUCTION DEPLOYMENT**  
All mandatory security requirements, architectural patterns, and hardening controls have been implemented, tested, and validated.
