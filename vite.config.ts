
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  define: {
    // This allows the use of process.env in the browser code
    'process.env': process.env
  }
});
