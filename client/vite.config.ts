import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  esbuild: {
    exclude: [
      '**/packages/background-tracker/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:9999',
    },
  },
  // Tell Vite to look for .env files in the project root
  envDir: path.resolve(__dirname, '../'),
});
