import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const { isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState({ items: [], subtotal: 0, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [pendingAddKeys, setPendingAddKeys] = useState({});
  const pendingAddRef = useRef({});

  const getAddKey = (productId, variantId = null) => `${productId}:${variantId || ''}`;
  const isAddingToCart = useCallback(
    (productId, variantId = null) => Boolean(pendingAddKeys[getAddKey(productId, variantId)]),
    [pendingAddKeys]
  );

  // Fetch Cart
  const fetchCart = useCallback(async () => {
    if (isAdmin) {
      setCart({ items: [], subtotal: 0, totalItems: 0 });
      setLoading(false);
      return;
    }
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
  }, [isAuthenticated, isAdmin]);

  // When user logs in, merge guest cart
  useEffect(() => {
    async function handleAuthChange() {
      if (isAuthenticated && !isAdmin) {
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
  }, [isAuthenticated, isAdmin, fetchCart]);

  const addToCart = useCallback(async (productId, variantId = null, quantity = 1) => {
    if (isAdmin) {
      showToast({ type: 'info', message: 'Admin accounts cannot purchase products.' });
      return { success: false };
    }
    if (!isAuthenticated) {
      showToast({ type: 'info', message: 'Please sign in to add items to your bag.' });
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return { success: false };
    }

    const key = getAddKey(productId, variantId);
    if (pendingAddRef.current[key]) {
      return { success: false };
    }

    pendingAddRef.current[key] = true;
    setPendingAddKeys((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await api.post('/cart/items', {
        productId,
        variantId,
        quantity,
      });
      if (res.success) {
        setCart(res.data);
        showToast({ type: 'success', message: 'Added to your bag! 🌸' });
      }
      return res;
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not add item to bag.' });
      throw err;
    } finally {
      delete pendingAddRef.current[key];
      setPendingAddKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [isAuthenticated, isAdmin, showToast, navigate, location.pathname, location.search]);

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
        isAddingToCart,
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
