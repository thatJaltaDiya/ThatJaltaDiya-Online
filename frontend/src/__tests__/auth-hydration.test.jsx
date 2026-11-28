import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from '../context/ToastContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { WishlistProvider } from '../context/WishlistContext.jsx';
import { Navbar } from '../components/layout/Navbar.jsx';
import { GuestRoute } from '../routes/GuestRoute.jsx';
import { Login } from '../pages/auth/Login.jsx';
import { api } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  api: {
    getAccessToken: vi.fn(() => null),
    setAccessToken: vi.fn(),
    setCsrfToken: vi.fn(),
    clearAccessToken: vi.fn(() => {
      localStorage.removeItem('tjd_has_session');
    }),
    get: vi.fn(() => Promise.resolve({ success: true, data: { items: [], subtotal: 0, totalItems: 0 } })),
    post: vi.fn(),
  },
}));

function renderAppAt(initialRoute) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <Navbar />
                <Routes>
                  <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                  <Route path="/shop" element={<div>Shop Catalog Destination</div>} />
                  <Route path="/" element={<div>Home Page</div>} />
                </Routes>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('Auth Hydration & Login Redirect Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('hides Sign In flash during cold refresh when session hint is set and redirects away from /login', async () => {
    localStorage.setItem('tjd_has_session', '1');

    let resolveRefresh;
    api.post.mockImplementation((url) => {
      if (url === '/auth/refresh') {
        return new Promise((resolve) => {
          resolveRefresh = resolve;
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/login');

    // While /auth/refresh is in flight with session hint: no fake Sign In link or login form
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in to your account/i })).not.toBeInTheDocument();

    resolveRefresh({
      success: true,
      data: {
        user: { id: 'u1', name: 'Diya Customer', email: 'buyer@example.com', role: 'CUSTOMER' },
        accessToken: 'fresh-token',
        csrfToken: 'fresh-csrf',
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Account Menu')).toBeInTheDocument();
      expect(screen.getByText('Shop Catalog Destination')).toBeInTheDocument();
    });
  });

  it('shows Sign In immediately for guests without session hint', async () => {
    api.post.mockImplementation((url) => {
      if (url === '/auth/refresh') {
        return new Promise(() => {}); // still pending
      }
      return Promise.resolve({ success: true, data: {} });
    });

    renderAppAt('/');

    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });
});
