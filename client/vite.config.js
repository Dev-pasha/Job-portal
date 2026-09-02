import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the browser call the API on the same origin during development.
    // /ad-images serves the banner files uploaded in the admin area.
    proxy: {
      '/api': 'http://localhost:4000',
      '/ad-images': 'http://localhost:4000',
    },
  },
});
