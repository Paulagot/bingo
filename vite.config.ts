// vite.config.ts - Simplified for Railway deployment
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Basic optimizations that work reliably
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['@solana/web3.js', 'wagmi', 'ethers'],
        }
      }
    },
    target: 'esnext',
    sourcemap: false, // Disable sourcemaps for production
  },

  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['lucide-react'],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.nuxt', '.vercel', 'src/test/integration/**'],
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
