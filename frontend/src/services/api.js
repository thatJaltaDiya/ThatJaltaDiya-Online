/**
 * Production-Grade API Client for That Jalta Diya
 * - Access token kept strictly in memory (never in localStorage to prevent XSS theft)
 * - Automatic silent refresh via httpOnly rotating cookie on 401
 * - Request queueing during token refresh
 * - Standardized CSRF headers
 */

let inMemoryAccessToken = null;
let isRefreshing = false;
let failedQueue = [];

function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const api = {
  getAccessToken: () => inMemoryAccessToken,
  setAccessToken: (token) => {
    inMemoryAccessToken = token;
  },
  clearAccessToken: () => {
    inMemoryAccessToken = null;
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF guard
      ...options.headers,
    };

    // If body is FormData (e.g. image uploads), let browser set Content-Type with boundary
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    if (inMemoryAccessToken) {
      headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401: Unauthorized -> attempt silent refresh
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            config.headers['Authorization'] = `Bearer ${token}`;
            return fetch(url, config).then(res => res.json());
          });
        }

        isRefreshing = true;

        try {
          const refreshRes = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.data.accessToken;
            api.setAccessToken(newToken);
            processQueue(null, newToken);

            // Replay original request
            config.headers['Authorization'] = `Bearer ${newToken}`;
            const retryRes = await fetch(url, config);
            return await retryRes.json();
          } else {
            api.clearAccessToken();
            processQueue(new Error('Session expired'), null);
            return await response.json();
          }
        } catch (refreshErr) {
          api.clearAccessToken();
          processQueue(refreshErr, null);
          throw refreshErr;
        } finally {
          isRefreshing = false;
        }
      }

      const json = await response.json();
      if (!response.ok) {
        const error = new Error(json.error?.message || 'Request failed');
        error.status = response.status;
        error.code = json.error?.code;
        error.details = json.error?.details;
        throw error;
      }

      return json;
    } catch (err) {
      throw err;
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};
