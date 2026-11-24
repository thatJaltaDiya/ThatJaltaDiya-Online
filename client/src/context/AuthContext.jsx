import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Silent refresh on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const res = await api.post('/auth/refresh');
        if (res.success && res.data?.user) {
          api.setAccessToken(res.data.accessToken);
          setUser(res.data.user);
        }
      } catch {
        // Not logged in or expired, ignore
        api.clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = useCallback(async (email, password, turnstileToken) => {
    const res = await api.post('/auth/login', { email, password, turnstileToken });
    if (res.success) {
      api.setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data;
    }
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      api.clearAccessToken();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setUser(prev => ({ ...prev, ...updatedUserData }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
