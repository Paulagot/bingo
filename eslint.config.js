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
      
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      
      // Enforce consistent naming
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
      ],
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

  // ---- Node overrides (server, scripts, config files)
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
        ...globals.node, // <-- fixes 'process' / __dirname etc.
      },
    },
    rules: {
      // Be lenient with unused vars in server routes/handlers
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // ---- Optional: relax fast-refresh warnings only on provider files
  {
    files: [
      'src/chains/stellar/StellarWalletProvider.tsx',
      'src/chains/evm/EvmWalletProvider.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },
)



