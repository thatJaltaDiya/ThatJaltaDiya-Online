import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const CLOUDFLARE_TEST_KEYS = [
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '3x00000000000000000000FF',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Production build check for Turnstile Key
  if (mode === 'production' && process.env.ALLOW_TEST_KEYS !== 'true') {
    const siteKey = env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey || CLOUDFLARE_TEST_KEYS.includes(siteKey)) {
      throw new Error(
        `\n❌ FATAL PRODUCTION BUILD ERROR:\n` +
        `VITE_TURNSTILE_SITE_KEY is missing or equals a known Cloudflare test key (${siteKey}).\n` +
        `Production builds require a real site key generated in the Cloudflare Dashboard.\n` +
        `For offline or CI dry-run builds without credentials, set ALLOW_TEST_KEYS=true.\n`
      );
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            utils: ['zod', 'dompurify', 'lucide-react'],
          },
        },
      },
    },
  };
});
