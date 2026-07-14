import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Explicitly set DISABLE_HMR to 'false' as requested by the user
  process.env.DISABLE_HMR = 'false';

  return {
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/proxy': {
          target: 'https://smartsolar-th.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/proxy/, '/api'),
        },
      },
      // Enforce HMR to be enabled
      hmr: true,
      // Enable file watching so the dev server triggers reload/updates automatically
      watch: {},
    },
  };
});
