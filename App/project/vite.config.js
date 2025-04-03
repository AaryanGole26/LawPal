import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Ensure the root is set correctly
  server: {
    port: 5173, 
  },
  build: {
    outDir: 'dist', // Ensure the output directory is set correctly
    emptyOutDir: true, // Clears previous builds
  },
});
