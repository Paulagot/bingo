/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'
import aspectRatio from '@tailwindcss/aspect-ratio'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    container: { center: true, padding: '1rem', screens: { xl: '1200px' } },
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        fg: 'hsl(var(--fg))',
        card: 'hsl(var(--card))',
        cardFg: 'hsl(var(--card-fg))',
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          fg: 'hsl(var(--brand-fg))',
          soft: 'hsl(var(--brand-soft))',
        },
        muted: 'hsl(var(--muted))',
        border: 'hsl(var(--border))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.06)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Inter', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [forms, typography, aspectRatio],
}


