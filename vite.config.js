import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: './',
  server: {
    port: 5173,
    // Backend writes JSON data at runtime (audit logs, plans, overrides, uploads).
    // Watching it makes the admin page reload mid-request after every save.
    watch: {
      ignored: ['**/server/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/media': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
});
