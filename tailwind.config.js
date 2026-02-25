/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bar: {
          dark: '#1a1a2e',
          darker: '#16213e',
          amber: '#d4a574',
          gold: '#f4d03f',
          purple: '#9b59b6',
          neon: '#e94560',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(212, 165, 116, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 165, 116, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
