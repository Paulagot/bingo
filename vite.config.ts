// vite.config.ts
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',

    // Define global polyfill (required for Solana + WC)
    define: {
      global: 'globalThis',
    },

    plugins: [
      react(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],

    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
      },

      rollupOptions: {
        plugins: [
          {
            name: 'stub-core-js',
            resolveId(id) {
              if (id.startsWith('core-js/modules/')) {
                return '\0stub:' + id;
              }
              return null;
            },
            load(id) {
              if (id.startsWith('\0stub:core-js/modules/')) {
                return 'export {};';
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
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',

          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],

            // Solana ecosystem
            'solana-core': ['@solana/web3.js'],
            'solana-tokens': ['@solana/spl-token'],
            'solana-anchor': ['@coral-xyz/anchor'],
            'solana-wallets': [
              '@solana/wallet-adapter-wallets',
              '@solana/wallet-adapter-base'
            ],

            // WalletConnect isolation (CRITICAL for mobile)
            'walletconnect': [
              '@walletconnect/sign-client',
              '@walletconnect/utils',
              '@walletconnect/core',
              '@walletconnect/jsonrpc-provider',
              '@walletconnect/jsonrpc-utils',
              '@solana/wallet-adapter-walletconnect'
            ],

            // EVM libs
            'web3-ethereum': [
              'wagmi',
              'viem',
              'ethers',
              
            ],

            // Reown
            'web3-appkit': [
              '@reown/appkit',
              '@reown/appkit-adapter-solana',
              '@reown/appkit-adapter-wagmi'
            ],

            // UI and util libs
            'ui-vendor': [
              '@headlessui/react',
              'framer-motion',
              'lucide-react'
            ],

            'utils': ['lodash', 'zustand', 'bs58', 'uuid']
          }
        }
      },

      chunkSizeWarningLimit: 1500,
      sourcemap: true,
      cssCodeSplit: true,
      minify: 'esbuild',
      target: 'esnext',

      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps) => {
          const reactChunks = deps.filter(dep => dep.includes('react-vendor'));
          const otherChunks = deps.filter(dep => !dep.includes('react-vendor'));
          return [...reactChunks, ...otherChunks];
        }
      }
    },

    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        '@solana/web3.js',
        'wagmi',
        'ethers',
        'zustand',
        'core-js',

        // 🔥 WalletConnect MUST be prebundled (Fixes mobile issues)
        '@solana/wallet-adapter-walletconnect',
        '@walletconnect/sign-client',
        '@walletconnect/core',
        '@walletconnect/utils',
        '@walletconnect/jsonrpc-provider',
        '@walletconnect/jsonrpc-utils',
      ],
      exclude: ['lucide-react'],
      esbuildOptions: { jsx: 'automatic' },
    },

    server: {
      port: 5173,
      proxy: {
        '/quiz/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          ws: true,
          changeOrigin: true
        },
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

