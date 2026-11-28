import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from '../context/ToastContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { ProductDetail } from '../pages/ProductDetail.jsx';
import { Cart } from '../pages/Cart.jsx';
import { api } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAdmin: false,
    user: { id: 'u1', email: 'buyer@example.com', role: 'CUSTOMER' },
  }),
}));

vi.mock('../context/WishlistContext.jsx', () => ({
  useWishlist: () => ({
    isWishlisted: () => false,
    toggleWishlist: vi.fn(),
  }),
}));

function renderWithCart(ui, initialEntry = '/') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ToastProvider>
          <CartProvider>{ui}</CartProvider>
        </ToastProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('Add to Bag & Bag Quantity Loader Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows minimal loader on Add To Bag until request settles', async () => {
    let resolveAdd;
    const addPromise = new Promise((resolve) => {
      resolveAdd = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url.startsWith('/cart')) {
        return Promise.resolve({ success: true, data: { items: [], subtotal: 0, totalItems: 0 } });
      }
      if (url === '/products/diya-bouquet') {
        return Promise.resolve({
          success: true,
          data: {
            product: {
              id: 'prod-1',
              name: 'Diya Bouquet',
              slug: 'diya-bouquet',
              sku: 'SKU-1',
              price: 99900,
              stock: 3,
              images: [],
              variants: [],
              category: { name: 'Bouquets', slug: 'bouquets' },
            },
            relatedProducts: [],
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    api.post.mockImplementation((url) => {
      if (url === '/cart/items') return addPromise;
      return Promise.resolve({ success: true, data: {} });
    });

    renderWithCart(
      <Routes>
        <Route path="/product/:slug" element={<ProductDetail />} />
      </Routes>,
      '/product/diya-bouquet'
    );

    const addBtn = await screen.findByRole('button', { name: /add to bag/i });
    expect(addBtn).not.toBeDisabled();

    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(addBtn).toBeDisabled();
      expect(addBtn).toHaveAttribute('aria-busy', 'true');
      expect(addBtn).toHaveTextContent(/adding\.\.\./i);
    });

    // Duplicate click while in flight should not trigger a second POST
    fireEvent.click(addBtn);
    expect(api.post).toHaveBeenCalledTimes(1);

    resolveAdd({
      success: true,
      data: {
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Diya Bouquet',
            productSlug: 'diya-bouquet',
            price: 99900,
            quantity: 1,
            itemTotal: 99900,
            availableStock: 3,
          },
        ],
        subtotal: 99900,
        totalItems: 1,
      },
    });

    await waitFor(() => {
      expect(addBtn).not.toBeDisabled();
      expect(addBtn).toHaveAttribute('aria-busy', 'false');
      expect(addBtn).toHaveTextContent(/add to bag/i);
    });
  });

  it('shows loaders on Bag +/- buttons and displays "maximum reached..." at stock limit', async () => {
    let resolveInc;
    const incPromise = new Promise((resolve) => {
      resolveInc = resolve;
    });

    let resolveDec;
    const decPromise = new Promise((resolve) => {
      resolveDec = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url.startsWith('/cart')) {
        return Promise.resolve({
          success: true,
          data: {
            items: [
              {
                id: 'item-1',
                productId: 'prod-1',
                productName: 'Diya Bouquet',
                productSlug: 'diya-bouquet',
                price: 99900,
                quantity: 1,
                itemTotal: 99900,
                availableStock: 2,
              },
            ],
            subtotal: 99900,
            totalItems: 1,
          },
        });
      }
      if (url === '/settings/public') {
        return Promise.resolve({
          success: true,
          data: { shippingFee: 0, freeShippingThreshold: 0 },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    api.patch
      .mockImplementationOnce(() => incPromise)
      .mockImplementationOnce(() => decPromise);

    renderWithCart(<Cart />);

    const incBtn = await screen.findByRole('button', { name: /increase quantity/i });
    const decBtn = screen.getByRole('button', { name: /decrease quantity/i });

    expect(screen.queryByText('maximum reached...')).not.toBeInTheDocument();

    // Increase quantity from 1 -> 2 (reaches availableStock: 2)
    fireEvent.click(incBtn);

    await waitFor(() => {
      expect(incBtn).toHaveAttribute('aria-busy', 'true');
      expect(incBtn).toBeDisabled();
      expect(decBtn).toBeDisabled();
    });

    resolveInc({
      success: true,
      data: {
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Diya Bouquet',
            productSlug: 'diya-bouquet',
            price: 99900,
            quantity: 2,
            itemTotal: 199800,
            availableStock: 2,
          },
        ],
        subtotal: 199800,
        totalItems: 2,
      },
    });

    await waitFor(() => {
      expect(incBtn).toHaveAttribute('aria-busy', 'false');
      expect(incBtn).toBeDisabled();
      expect(decBtn).not.toBeDisabled();
      expect(screen.getByText('maximum reached...')).toBeInTheDocument();
    });

    // Decrease quantity from 2 -> 1
    fireEvent.click(decBtn);

    await waitFor(() => {
      expect(decBtn).toHaveAttribute('aria-busy', 'true');
      expect(decBtn).toBeDisabled();
      expect(incBtn).toBeDisabled();
    });

    resolveDec({
      success: true,
      data: {
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Diya Bouquet',
            productSlug: 'diya-bouquet',
            price: 99900,
            quantity: 1,
            itemTotal: 99900,
            availableStock: 2,
          },
        ],
        subtotal: 99900,
        totalItems: 1,
      },
    });

    await waitFor(() => {
      expect(decBtn).toHaveAttribute('aria-busy', 'false');
      expect(incBtn).not.toBeDisabled();
      expect(screen.queryByText('maximum reached...')).not.toBeInTheDocument();
    });

    // Remove item shows loader on delete button until request resolves
    let resolveDelete;
    const deletePromise = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    api.delete.mockImplementationOnce(() => deletePromise);

    const removeBtn = screen.getByRole('button', { name: /remove item/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(removeBtn).toHaveAttribute('aria-busy', 'true');
      expect(removeBtn).toBeDisabled();
      expect(incBtn).toBeDisabled();
      expect(decBtn).toBeDisabled();
    });

    resolveDelete({
      success: true,
      data: { items: [], subtotal: 0, totalItems: 0 },
    });

    await waitFor(() => {
      expect(screen.getByText(/your bag is empty/i)).toBeInTheDocument();
    });
  });
});
