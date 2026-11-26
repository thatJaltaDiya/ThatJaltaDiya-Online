import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/thatjaltadiya?schema=public',
      DIRECT_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/thatjaltadiya?schema=public',
      ALLOW_TEST_CAPTCHA: 'true',
      ALLOW_UNPAID_TEST_ORDERS: 'true',
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      JWT_ACCESS_SECRET: 'that_jalta_diya_test_jwt_access_secret_32_characters_long',
      JWT_REFRESH_SECRET: 'that_jalta_diya_test_jwt_refresh_secret_32_characters_long',
      COOKIE_SECRET: 'that_jalta_diya_test_cookie_secret_32_characters_long',
    },
  },
});
