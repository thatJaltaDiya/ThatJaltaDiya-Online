import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/wishlist');
      if (res.success) {
        setWishlistItems(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isWishlisted = useCallback((productId) => {
    return wishlistItems.some(item => item.productId === productId);
  }, [wishlistItems]);

  const toggleWishlist = useCallback(async (productId) => {
    if (!isAuthenticated) {
      showToast({ type: 'info', message: 'Please sign in to save items to your wishlist.' });
      return false;
    }

    try {
      const res = await api.post(`/wishlist/toggle/${productId}`);
      if (res.success) {
        if (res.data.isWishlisted) {
          showToast({ type: 'success', message: 'Added to your favorites! 💖' });
        } else {
          showToast({ type: 'info', message: 'Removed from favorites.' });
        }
        await fetchWishlist();
        return res.data.isWishlisted;
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to update wishlist.' });
    }
    return false;
  }, [isAuthenticated, showToast, fetchWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        loading,
        isWishlisted,
        toggleWishlist,
        refreshWishlist: fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
