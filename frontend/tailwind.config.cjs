/** @type {import('tailwindcss').Config} */
const animate = require('tailwindcss-animate');

module.exports = {
  darkMode: 'media',
  content: ['index.html', 'src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '36rem' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Baloo 2"', '"Nunito Variable"', 'cursive'],
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      boxShadow: {
        cosy: '0 2px 4px hsl(24 30% 40% / 0.06), 0 8px 24px hsl(24 30% 40% / 0.08)',
        'cosy-lg':
          '0 4px 8px hsl(24 30% 40% / 0.08), 0 18px 48px hsl(24 30% 40% / 0.16)',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        'content-show': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(-6px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.25s cubic-bezier(0.22,1,0.36,1)',
        'pop-in': 'pop-in 0.3s cubic-bezier(0.22,1,0.36,1)',
        float: 'float 3.5s ease-in-out infinite',
        'content-show': 'content-show 0.16s cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [animate],
};
