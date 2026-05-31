import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // YelhaDelivery brand tokens (mapped to CSS variables in globals.css)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          light: 'hsl(var(--primary-light))',
          dark: 'hsl(var(--primary-dark))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        background: 'hsl(var(--bg-base))',
        card: {
          DEFAULT: 'hsl(var(--bg-card))',
          foreground: 'hsl(var(--text-primary))',
        },
        input: 'hsl(var(--bg-input))',
        border: 'hsl(var(--border))',
        foreground: 'hsl(var(--text-primary))',
        muted: {
          DEFAULT: 'hsl(var(--bg-muted))',
          foreground: 'hsl(var(--text-secondary))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        destructive: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(0 0% 100%)',
        },
        ring: 'hsl(var(--primary))',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
