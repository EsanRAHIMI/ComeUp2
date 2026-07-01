import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@comeup/domain': path.resolve(rootDir, '../shared/domain/src/index.ts'),
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
