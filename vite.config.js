import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/docx')) return 'docx';
          if (id.includes('node_modules/mammoth')) return 'mammoth';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to Wrangler dev server during local dev
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
});
