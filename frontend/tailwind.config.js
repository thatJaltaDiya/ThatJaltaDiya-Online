/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-card': 'var(--color-surface-card)',
        primary: 'var(--color-primary)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
        sage: {
          DEFAULT: 'var(--color-sage)',
          dark: 'var(--color-sage-dark)',
        },
        butter: 'var(--color-butter)',
        lavender: 'var(--color-lavender)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'pop-sm': '2px 2px 0px var(--color-border)',
        'pop': '3px 3px 0px var(--color-border)',
        'pop-md': '4px 4px 0px var(--color-border)',
        'pop-lg': '6px 6px 0px var(--color-border)',
        'pop-hover': '1px 1px 0px var(--color-border)',
      },
      borderRadius: {
        'sticker': '12px',
        'badge': '9999px',
        'pill': '9999px',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        }
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
