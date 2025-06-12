import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/project-love-and-peace/', // 👈 required for GitHub Pages subpath
  plugins: [react()],
  resolve: {
    alias: {
      'mapbox-gl': 'maplibre-gl'
    }
  },
  server: {
    port: 3000
  }
});
