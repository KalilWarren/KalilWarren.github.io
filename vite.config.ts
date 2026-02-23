import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        cv:       resolve(__dirname, 'cv.html'),
        research: resolve(__dirname, 'research.html'),
        toolkit:  resolve(__dirname, 'toolkit.html'),
      },
    },
  },
});
