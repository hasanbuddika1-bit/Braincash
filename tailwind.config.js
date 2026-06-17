/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        purple: {
          900: '#1a0a2e',
          800: '#2d1b4e',
          700: '#4a2c7a',
          600: '#6b3fa0',
          500: '#8b5cf6',
          400: '#a78bfa',
          300: '#c4b5fd',
        },
        blue: {
          900: '#0c1929',
          800: '#142238',
          700: '#1e3a5f',
          600: '#2563eb',
          500: '#3b82f6',
          400: '#60a5fa',
          300: '#93c5fd',
        },
        gold: {
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
          200: '#fde68a',
        },
        neon: {
          purple: '#bf00ff',
          blue: '#00d4ff',
          gold: '#ffd700',
          pink: '#ff00ff',
          green: '#00ff88',
        },
      },
      fontFamily: {
        game: ['Rajdhani', 'Orbitron', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'gradient': 'gradient 3s ease infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'coin-float': 'coinFloat 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        coinFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-5px) rotate(5deg)' },
          '75%': { transform: 'translateY(5px) rotate(-5deg)' },
        },
      },
      boxShadow: {
        'neon-purple': '0 0 5px #bf00ff, 0 0 10px #bf00ff, 0 0 20px #bf00ff',
        'neon-blue': '0 0 5px #00d4ff, 0 0 10px #00d4ff, 0 0 20px #00d4ff',
        'neon-gold': '0 0 5px #ffd700, 0 0 10px #ffd700, 0 0 20px #ffd700',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'game-gradient': 'linear-gradient(135deg, #1a0a2e 0%, #0c1929 50%, #142238 100%)',
      },
    },
  },
  plugins: [],
};
