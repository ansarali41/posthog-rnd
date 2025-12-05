import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy auth requests to auth service (port 3002)
      '/auth': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Proxy API requests to API service (port 3001)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

