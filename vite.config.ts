// vite.config.ts
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Define polyfills for Node.js modules used by Web3 libraries
    base: '/',
    define: {
      global: 'globalThis',
      'process.env.VITE_SOLANA_PROGRAM_ID': JSON.stringify(env.VITE_SOLANA_PROGRAM_ID),
      'process.env.VITE_SOLANA_NETWORK': JSON.stringify(env.VITE_SOLANA_NETWORK),
    },
  
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill Node.js built-in modules.
      protocolImports: true,
    }),
  ],
  
  // Build optimizations
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto',
    },
    // Code splitting configuration
    rollupOptions: {
      plugins: [
        {
          name: 'stub-core-js',
          resolveId(id) {
            if (id.startsWith('core-js/modules/')) {
              return '\0stub:' + id; // Virtual module
            }
            return null;
          },
          load(id) {
            if (id.startsWith('\0stub:core-js/modules/')) {
              return 'export {};'; // Empty module stub
            }
            return null;
          }
        }
      ],
      output: {
        format: 'es',
        preserveModules: false,
        generatedCode: {
          constBindings: false,
        },
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split Solana into smaller chunks
          'solana-core': ['@solana/web3.js'],
          'solana-tokens': ['@solana/spl-token'],
          'solana-anchor': ['@coral-xyz/anchor'],
          'solana-wallets': ['@solana/wallet-adapter-wallets'],
          'web3-ethereum': [
            'wagmi', 
            'viem', 
            'ethers', 
            '@rainbow-me/rainbowkit'
          ],
          'web3-appkit': [
            '@reown/appkit',
            '@reown/appkit-adapter-solana',
            '@reown/appkit-adapter-wagmi'
          ],
          'ui-vendor': [
            '@headlessui/react', 
            'framer-motion', 
            'lucide-react'
          ],
          'utils': ['lodash', 'zustand', 'bs58', 'uuid']
        }
      }
    },
    
    // Increase chunk size warning limit since Web3 libs are naturally large
    chunkSizeWarningLimit: 1500,
    
    // Enable source maps for production debugging
    sourcemap: true,
    
    // CSS optimization
    cssCodeSplit: true,
    
    // Use default esbuild minification (handles CSS better than custom configs)
    minify: 'esbuild',
    
    // Target modern browsers for better optimization
    target: 'esnext',
    
    // Disable module preload warnings for circular deps
    modulePreload: {
      polyfill: false,
    }
  },

  optimizeDeps: {
    // Pre-bundle these heavy dependencies
    include: [
      'react',
      'react-dom', 
      '@solana/web3.js',
      'wagmi',
      'ethers',
      'zustand',
      'core-js'
    ],
    exclude: ['lucide-react'],
  },

  // Performance optimizations
  server: {
  port: 5173,
  proxy: {
    // ✅ Only API under /quiz/api
    '/quiz/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
    // ✅ Socket.IO
    '/socket.io': {
      target: 'http://localhost:3001',
      ws: true,
      changeOrigin: true,
    },
    // Optional: other backend routes (not SPA)
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
  fs: { cachedChecks: false },
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
};
});
