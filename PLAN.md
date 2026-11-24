# Architecture Plan: Production-Grade E-Commerce Store ("That Jalta Diya")

## 1. Executive Summary & Design Findings

"That Jalta Diya" is a chic, artisanal, single-admin e-commerce boutique selling handcrafted candle bouquets, aesthetic scented candles, floral wax arrangements, custom gift hampers, and feminine gifting accessories.

### Design System & Aesthetic Findings (from Design Reference Analysis)
- **Vibe:** Funky, bold, playful, editorial Awwwards-style feminine gifting brand.
- **Visual Vocabulary:**
  - Strong typography with oversized editorial headings and quirks (`Fraunces` editorial serif for display and `Plus Jakarta Sans` for clean, high-legibility interface text).
  - Vibrant, warm color-blocking:
    - Canvas: `#FFFBF5` (Warm Cream Canvas - avoiding stark pure white)
    - Surface / Cards: `#FFF5F7` (Blush Silk) / `#FFFFFF` with sticker outlines
    - Text Primary: `#2D0C1E` (Velvet Noir Burgundy - WCAG AAA contrast >= 14:1 on canvas)
    - Accent: `#FF3366` (Hot Petal Pink) with `#E02456` hover state
    - Supporting accents: `#4A6B5D` (Matcha Sage), `#FFE8A3` (Buttercream Gold), `#E8D7F1` (Lavender Mist)
    - Borders: `#2D0C1E` crisp 1.5px/2px outlines with retro drop-shadows (`3px 3px 0px #2D0C1E`)
  - Sticker-like badges with subtle rotation angles (`rotate-[-2deg]`, `rotate-[2deg]`).
  - Color-blocked continuous marquee strip announcing store perks and updates.
  - Motion Standard: strictly CSS-driven, subtle hover/focus states, zero scroll-jacking, zero parallax, no 3D, and simple skeleton loaders.
  - Fully responsive: mobile-first, tested at 360px, 390px, 768px, 1024px, 1280px, 1536px, touch targets >= 44px, no horizontal scroll.

---

## 2. Monorepo Architecture & Tech Stack

```
/ThatJaltaDiya
├── server/
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma (PostgreSQL models with pooled & direct URLs)
│   │   ├── migrations/
│   │   └── seed.js (sharp WebP placeholder generator + demo products)
│   ├── src/
│   │   ├── config/ (env.js Zod validation, pino logger, prisma client, supabase client)
│   │   ├── middleware/ (auth, role ADMIN, validate Zod strict, errorHandler, rateLimiters, turnstile, csrf, audit)
│   │   ├── routes/ (v1 API for auth, products, categories, cart, wishlist, orders, coupons, addresses, admin, demo-cleanup)
│   │   ├── controllers/
│   │   ├── services/ (auth, payment adapter interface & stub, email, storage, order, audit)
│   │   ├── validators/ (Zod strict schemas for body, query, params)
│   │   ├── utils/ (argon2/bcrypt, jwt, sanitize-html, idempotency)
│   │   ├── app.js
│   │   ├── server.js
│   │   └── scripts/create-admin.js
│   └── tests/
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js (CSS custom variables, design system tokens)
    ├── src/
    │   ├── components/ (Button, Input, Modal, Toast, Card, Badge, Skeleton, Navbar, Footer, Marquee, etc.)
    │   ├── context/ (AuthContext, CartContext, WishlistContext, ToastContext)
    │   ├── pages/ (Home, Products, ProductDetail, Cart, Checkout, OrderConfirmation, Account, Static, Admin)
    │   ├── services/ (API client with axios / fetch silent refresh)
    │   └── utils/
```

---

## 3. Database Schema Overview (Prisma)
- **User**: Authentication, role (`CUSTOMER`, `ADMIN`), status flags, soft delete.
- **Address**: Max 10 per user, default flag, phone, postal code.
- **Category & Product & ProductImage & ProductVariant**: Hierarchical catalog, paise integers for prices, compare-at prices, stock tracking, demo flag (`isDemo = true`), soft delete for products (`deletedAt`).
- **Cart & CartItem**: Persisted across sessions, guest-to-user merge.
- **Wishlist & WishlistItem**: User-specific saved favorites.
- **Order & OrderItem**: Idempotent order placement (`idempotencyKey` unique), immutable snapshot of product details, status transitions (`PENDING`, `CONFIRMED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`), tracking info.
- **Coupon**: Percentage / flat discounts, validity dates, minimum order value, usage limits.
- **StockLog**: Complete audit trail of inventory adjustments with reasons.
- **ContactMessage**: Customer inquiries with IP and read status.
- **Testimonial**: Demo and customer reviews with moderation flag.
- **Tokens & Security**:
  - `RefreshToken`: Hashed in DB, family rotation tracking, revocation flag.
  - `EmailVerificationToken` & `PasswordResetToken`: Single-use hashes, expiration timestamps.
  - `OtpRequest`: Hashed 6-digit OTP, attempt limits, cooldowns.
  - `AuditLog`: Admin action trail (action, target, IP, userAgent, timestamp).
  - `SiteSetting`: Dynamic store settings (shipping charges, free delivery threshold, banner announcements).

---

## 4. Security & Compliance Architecture
1. **Input Validation**: Strict Zod schemas on every endpoint (`body`, `query`, `params`). Mass assignment impossible.
2. **SQL Injection**: Exclusively Prisma queries with parameterized safety.
3. **XSS & Content Security**: DOMPurify on frontend, `sanitize-html` on backend, strict Helmet CSP.
4. **Authentication**: Argon2id password hashing, constant-time comparisons, dummy hash on nonexistent emails.
5. **Authorization (RBAC & Ownership)**: Strict verification of user ownership on every resource; admin endpoints locked to `ADMIN` role under `/api/v1/admin/*`.
6. **JWT & Session Security**: 15-minute access token in memory, 7-day rotating refresh token in `httpOnly`, `Secure`, `SameSite=Strict` cookie, token family invalidation upon reuse detection, double-submit CSRF protection.
7. **Abuse & Rate Limiting**: Global rate limiter, strict login rate limiter (5 failed attempts -> lockout), Turnstile CAPTCHA verification, OTP rate limits (3/hour, 60s cooldown).
8. **Idempotency & Race Prevention**: Unique idempotency key per checkout, Prisma database transaction with atomic conditional update (`stock >= qty`) preventing overselling.
9. **Environment Safety**: Fail-fast `env.js` validating all environment variables at boot.

---

## 5. Execution Roadmap (Phases 1-7 in One Continuous Autonomous Run)
- **Phase 1**: Planning, Monorepo Setup, Prisma Schema, Migration, Env Validation.
- **Phase 2**: Backend Core: Security Middlewares, Argon2/JWT Auth, Turnstile, OTP, Error Handling, Unit Tests.
- **Phase 3**: Commerce APIs: Catalog, Cart, Wishlist, Addresses, Transactional Orders, Coupons, Admin APIs, Demo Cleanup Tool.
- **Phase 4**: Frontend Foundation: Tailwind Setup, Fonts, Tokens, Reusable Component Library, API Client with Silent Refresh.
- **Phase 5**: Storefront & Customer Experience: Home, Shop with Filters/Debounce, Product Details & Variants, Cart, Checkout, Order Tracking, Account Center.
- **Phase 6**: Admin Dashboard: Analytics, Product CRUD with Image Management, Category CRUD, Order Processing & Invoices, Customers, Coupons, Stock Logs, Site Settings & "Delete all demo data".
- **Phase 7**: Demo Seeding (Sharp WebP generation), E2E Verification, Responsive Browser Testing, Production Builds, `SECURITY.md` Checklist, Final Documentation.
