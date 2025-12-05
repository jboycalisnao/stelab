import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', // Output to 'build' folder to match Netlify settings
  },
  server: {
    port: 3000
  }
});