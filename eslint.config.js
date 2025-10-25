// eslint.config.ts
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import tailwind from 'eslint-plugin-tailwindcss'

export default tseslint.config(
  // ---- Global ignores
  { ignores: ['dist', 'build', 'node_modules', 'coverage'] },

  // ---- TypeScript / TSX (browser + React)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser, // default: browser for src/**
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      tailwindcss: tailwind,
    },
    settings: {
      tailwindcss: {
        callees: ['cn', 'clsx', 'cva', 'twMerge'],
        config: 'tailwind.config.ts',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-custom-classname': 'off',
    },
  },

  // ---- JavaScript / JSX (browser + React)
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      tailwindcss: tailwind,
    },
    settings: {
      tailwindcss: {
        callees: ['cn', 'clsx', 'cva', 'twMerge'],
        config: 'tailwind.config.ts',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-custom-classname': 'off',
    },
  },

  // ---- Node overrides (server, scripts, configs)
  {
    files: [
      'server/**/*.{js,ts,mjs,cjs}',
      'scripts/**/*.{js,ts,mjs,cjs}',
      'vite.config.*',
      'vitest*.config.*',
      'eslint.config.*',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node, // <-- fixes 'process' / __dirname / require etc.
      },
    },
    rules: {
      // you can add node-specific rules here later
    },
  },

  // ---- Optional: relax fast-refresh rule only on providers
  {
    files: [
      'src/chains/stellar/StellarWalletProvider.tsx',
      'src/chains/evm/EvmWalletProvider.tsx',
    ],
    rules: {
      // these files export helpers + components; warn only
      'react-refresh/only-export-components': 'warn',
    },
  },
)


