/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Diamond Exchange Dark Theme
        bg: {
          primary: '#0a0a0f',
          secondary: '#12121a',
          card: '#1a1a28',
          hover: '#22223a',
          border: '#2a2a42',
        },
        accent: {
          gold: '#f0b429',
          blue: '#1e88e5',
          pink: '#e91e8c',
          green: '#00c853',
          red: '#f44336',
          purple: '#7c4dff',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0c0',
          muted: '#606080',
        }
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blink: {
          '50%': { opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
