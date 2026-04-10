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
          if (id.includes('node_modules/tesseract')) return 'tesseract';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
