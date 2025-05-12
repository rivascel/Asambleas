import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../src/ssl/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../src/ssl/cert.pem')),
    },
    port: 5173,
    historyApiFallback: true
  }
});

