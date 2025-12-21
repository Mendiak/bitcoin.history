import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // La raíz del proyecto está en el directorio actual (index.html se moverá aquí)
  publicDir: 'public', // Los archivos estáticos (json, assets) siguen en public
  build: {
    outDir: 'dist',
  },
  server: {
    open: true, // Abrir el navegador automáticamente
  }
});
