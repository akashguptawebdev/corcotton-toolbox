import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.resolve(__dirname, 'src', p);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': src('app'),
      '@features': src('features'),
      '@components': src('components'),
      '@layouts': src('layouts'),
      '@hooks': src('hooks'),
      '@pages': src('pages'),
      '@services': src('services'),
      '@utils': src('utils'),
      '@constants': src('constants'),
      '@styles': src('styles'),
      '@assets': src('assets'),
    },
  },
  server: {
    port: 5173,
  },
});
