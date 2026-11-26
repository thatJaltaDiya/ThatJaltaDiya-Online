import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { AdminRoute } from './routes/AdminRoute.jsx';

// Storefront Pages
import { Home } from './pages/Home.jsx';
import { Shop } from './pages/Shop.jsx';
import { ProductDetail } from './pages/ProductDetail.jsx';
import { Cart } from './pages/Cart.jsx';
import { Checkout } from './pages/Checkout.jsx';
import { OrderConfirmation } from './pages/OrderConfirmation.jsx';

// Account Pages
import { AccountLayout } from './pages/account/AccountLayout.jsx';
import { OrderHistory } from './pages/account/OrderHistory.jsx';
import { SavedAddresses } from './pages/account/SavedAddresses.jsx';
import { WishlistPage } from './pages/account/WishlistPage.jsx';
import { ProfileSettings } from './pages/account/ProfileSettings.jsx';

// Auth Pages
import { Login } from './pages/auth/Login.jsx';
import { Register } from './pages/auth/Register.jsx';
import { VerifyEmail } from './pages/auth/VerifyEmail.jsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.jsx';
import { ResetPassword } from './pages/auth/ResetPassword.jsx';

// Static & Policy Pages
import { About } from './pages/static/About.jsx';
import { Contact } from './pages/static/Contact.jsx';
import { FAQ } from './pages/static/FAQ.jsx';
import { ShippingPolicy } from './pages/static/ShippingPolicy.jsx';
import { ReturnPolicy } from './pages/static/ReturnPolicy.jsx';
import { PrivacyPolicy } from './pages/static/PrivacyPolicy.jsx';
import { Terms } from './pages/static/Terms.jsx';

// Admin Layout & Pages (Phase 6)
import { AdminLayout } from './components/layout/AdminLayout.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { AdminProducts } from './pages/admin/AdminProducts.jsx';
import { AdminCategories } from './pages/admin/AdminCategories.jsx';
import { AdminOrders } from './pages/admin/AdminOrders.jsx';
import { AdminCustomers } from './pages/admin/AdminCustomers.jsx';
import { AdminInventory } from './pages/admin/AdminInventory.jsx';
import { AdminSettings } from './pages/admin/AdminSettings.jsx';
import { AdminContactMessages } from './pages/admin/AdminContactMessages.jsx';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs.jsx';

// Storefront Wrapper with Header and Footer
function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-primary selection:bg-accent selection:text-white">
      <Navbar />
      <main className="flex-1" id="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Storefront Routes */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
        <Route path="/return-policy" element={<ReturnPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Customer Protected Checkout & Tracking */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-confirmation/:orderNumber"
          element={
            <ProtectedRoute>
              <OrderConfirmation />
            </ProtectedRoute>
          }
        />

        {/* Customer Account Area */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OrderHistory />} />
          <Route path="addresses" element={<SavedAddresses />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="profile" element={<ProfileSettings />} />
        </Route>
      </Route>

      {/* Admin Panel (Phase 6) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="contact-messages" element={<AdminContactMessages />} />
        <Route path="audit" element={<AdminAuditLogs />} />
      </Route>

      {/* 404 Catch All */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
            <h1 className="font-editorial text-6xl font-extrabold text-accent mb-3">404</h1>
            <p className="font-editorial text-2xl font-bold text-primary mb-2">Page Not Found</p>
            <p className="text-xs text-primary/60 mb-6">The page you were looking for doesn't exist.</p>
            <a href="/" className="px-6 py-2.5 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-full border-2 border-border shadow-pop">
              Return Home
            </a>
          </div>
        }
      />
    </Routes>
  );
}
