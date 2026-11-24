import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);

function getOrCreateGuestId() {
  let guestId = localStorage.getItem('tjd_guest_id');
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('tjd_guest_id', guestId);
  }
  return guestId;
}

export function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [cart, setCart] = useState({ items: [], subtotal: 0, totalItems: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch Cart
  const fetchCart = useCallback(async () => {
    try {
      const guestId = !isAuthenticated ? getOrCreateGuestId() : undefined;
      const query = guestId ? `?guestId=${guestId}` : '';
      const res = await api.get(`/cart${query}`);
      if (res.success) {
        setCart(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // When user logs in, merge guest cart
  useEffect(() => {
    async function handleAuthChange() {
      if (isAuthenticated) {
        const guestId = localStorage.getItem('tjd_guest_id');
        if (guestId) {
          try {
            await api.post('/cart/merge', { guestId });
            localStorage.removeItem('tjd_guest_id');
          } catch {
            // ignore
          }
        }
      }
      fetchCart();
    }
    handleAuthChange();
  }, [isAuthenticated, fetchCart]);

  const addToCart = useCallback(async (productId, variantId = null, quantity = 1) => {
    try {
      const guestId = !isAuthenticated ? getOrCreateGuestId() : undefined;
      const res = await api.post('/cart/items', {
        productId,
        variantId,
        quantity,
        guestId,
      });
      if (res.success) {
        setCart(res.data);
        showToast({ type: 'success', message: 'Added to your bouquet bag! 🌸' });
      }
      return res;
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not add item to bag.' });
      throw err;
    }
  }, [isAuthenticated, showToast]);

  const updateQuantity = useCallback(async (cartItemId, quantity) => {
    try {
      const guestId = !isAuthenticated ? getOrCreateGuestId() : undefined;
      const res = await api.patch(`/cart/items/${cartItemId}`, {
        quantity,
        guestId,
      });
      if (res.success) {
        setCart(res.data);
      }
      return res;
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not update bag.' });
      throw err;
    }
  }, [isAuthenticated, showToast]);

  const removeFromCart = useCallback(async (cartItemId) => {
    try {
      const guestId = !isAuthenticated ? getOrCreateGuestId() : undefined;
      const query = guestId ? `?guestId=${guestId}` : '';
      const res = await api.delete(`/cart/items/${cartItemId}${query}`);
      if (res.success) {
        setCart(res.data);
        showToast({ type: 'info', message: 'Item removed from bag.' });
      }
      return res;
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not remove item.' });
      throw err;
    }
  }, [isAuthenticated, showToast]);

  const clearCartState = useCallback(() => {
    setCart({ items: [], subtotal: 0, totalItems: 0 });
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart: fetchCart,
        clearCartState,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
