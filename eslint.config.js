import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import tailwind from 'eslint-plugin-tailwindcss'

export default tseslint.config(
  { ignores: ['dist', 'build', 'node_modules'] },

  // TypeScript/TSX
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      tailwindcss: tailwind,
    },
    settings: {
      tailwindcss: {
        // helps the plugin understand helper fns you use for classNames
        callees: ['cn', 'clsx', 'cva', 'twMerge'],
        // point to your Tailwind config if not default
        config: 'tailwind.config.ts',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Tailwind consistency
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-contradicting-classname': 'error',
      // keep OFF so custom utilities like "section", "btn" don’t error
      'tailwindcss/no-custom-classname': 'off',
    },
  },

  // JavaScript/JSX (if you have any)
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
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
  }
)

