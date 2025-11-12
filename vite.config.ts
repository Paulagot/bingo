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
        // Ensure React is loaded first
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: (id) => {
          // Vendor chunks - MUST come before feature chunks to ensure proper loading order
          if (id.includes('node_modules')) {
            // React MUST be bundled together to ensure proper loading order
            // Match main branch approach: bundle react, react-dom, react-router-dom together
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules\\react\\') ||
                id.includes('node_modules/react-dom/') || 
                id.includes('node_modules\\react-dom\\') ||
                id.includes('node_modules/react-router-dom/') ||
                id.includes('node_modules\\react-router-dom\\')) {
              return 'react-vendor';
            }

            // Solana libraries
            if (id.includes('@solana/web3.js')) {
              return 'solana-core';
            }
            if (id.includes('@solana/spl-token')) {
              return 'solana-tokens';
            }
            if (id.includes('@coral-xyz/anchor')) {
              return 'solana-anchor';
            }
            if (id.includes('@solana/wallet-adapter')) {
              return 'solana-wallets';
            }

            // EVM libraries
            if (id.includes('wagmi') || id.includes('viem') || id.includes('ethers') || id.includes('@rainbow-me/rainbowkit')) {
              return 'web3-ethereum';
            }

            // Web3 AppKit
            if (id.includes('@reown/appkit')) {
              return 'web3-appkit';
            }

            // UI libraries
            if (id.includes('@headlessui/react') || id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }

            // Utility libraries
            if (id.includes('lodash') || id.includes('zustand') || id.includes('bs58') || id.includes('uuid')) {
              return 'utils';
            }

            // Other node_modules
            return 'vendor';
          }

          // Feature-based code splitting (after vendor chunks)
          if (id.includes('/src/features/auth/')) {
            return 'feature-auth';
          }
          if (id.includes('/src/features/quiz/')) {
            return 'feature-quiz';
          }
          if (id.includes('/src/features/bingo/')) {
            return 'feature-bingo';
          }
          if (id.includes('/src/features/web3/')) {
            return 'feature-web3';
          }
          if (id.includes('/src/shared/')) {
            return 'shared';
          }
          if (id.includes('/src/app/')) {
            return 'app';
          }
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
    
    // Enable module preload to ensure React loads first
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps) => {
        // Ensure react-vendor chunk loads before any other chunks
        const reactChunks = deps.filter(dep =>
          dep.includes('react-vendor')
        );
        const otherChunks = deps.filter(dep =>
          !dep.includes('react-vendor')
        );
        // Return React chunks first, then others
        return [...reactChunks, ...otherChunks];
      }
    }
  },

  optimizeDeps: {
    // Pre-bundle these heavy dependencies
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom', 
      '@solana/web3.js',
      'wagmi',
      'ethers',
      'zustand',
      'core-js'
    ],
    exclude: ['lucide-react'],
    // Ensure React is always available
    esbuildOptions: {
      jsx: 'automatic',
    },
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
      '@app': '/src/app',
      '@features': '/src/features',
      '@shared': '/src/shared',
      '@entities': '/src/entities',
      '@widgets': '/src/widgets',
    },
  },
};
});
