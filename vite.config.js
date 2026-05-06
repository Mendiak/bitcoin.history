import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        halving: resolve(__dirname, 'halving.html'),
      },
    },
  },
  server: {
    open: true,
  }
});
