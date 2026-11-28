import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

// Deduplicate mount refresh across React StrictMode double-invocations so
// single-use refresh token rotation never triggers false reuse detection.
let pendingInitAuthPromise = null;
const SESSION_HINT_KEY = 'tjd_has_session';

function readSessionHint() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSessionHint(active) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (active) {
      localStorage.setItem(SESSION_HINT_KEY, '1');
    } else {
      localStorage.removeItem(SESSION_HINT_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSessionHint, setHasSessionHint] = useState(readSessionHint);

  // Silent refresh on mount
  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        if (!pendingInitAuthPromise) {
          pendingInitAuthPromise = api.post('/auth/refresh').finally(() => {
            setTimeout(() => {
              pendingInitAuthPromise = null;
            }, 500);
          });
        }

        const res = await pendingInitAuthPromise;
        if (!active) return;

        if (res.success && res.data?.user) {
          api.setAccessToken(res.data.accessToken);
          if (res.data.csrfToken) {
            api.setCsrfToken(res.data.csrfToken);
          }
          writeSessionHint(true);
          setHasSessionHint(true);
          setUser(res.data.user);
        } else {
          writeSessionHint(false);
          setHasSessionHint(false);
        }
      } catch {
        if (!active) return;
        // Not logged in or expired, ignore
        api.clearAccessToken();
        writeSessionHint(false);
        setHasSessionHint(false);
        setUser(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    initAuth();

    return () => {
      active = false;
    };
  }, []);

  const completeSession = useCallback((userData, accessToken, csrfToken = null) => {
    api.setAccessToken(accessToken);
    if (csrfToken) {
      api.setCsrfToken(csrfToken);
    }
    writeSessionHint(true);
    setHasSessionHint(true);
    setUser(userData);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      completeSession(res.data.user, res.data.accessToken, res.data.csrfToken);
      return res.data;
    }
  }, [completeSession]);

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      api.clearAccessToken();
      writeSessionHint(false);
      setHasSessionHint(false);
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
        hasSessionHint,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        completeSession,
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
