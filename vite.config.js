import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const apiTarget = loadEnv(mode, process.cwd(), '').VITE_API_URL || 'http://localhost:8090';
  return {
    plugins: [react(), tailwindcss(), viteSingleFile()],
    base: '/',
    server: {
      port: 5173,
      // Backend writes JSON data at runtime (audit logs, plans, overrides, uploads).
      // Watching it makes the admin page reload mid-request after every save.
      watch: {
        ignored: ['**/server/**']
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/media': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  };
});
