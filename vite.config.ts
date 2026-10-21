import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const realRoot = fs.realpathSync(process.cwd());
if (process.cwd() !== realRoot) {
  process.chdir(realRoot);
}

export default defineConfig({
  root: realRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(realRoot, './src'),
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
});
