/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bbe0ff',
          300: '#8bcdff',
          400: '#54b0ff',
          500: '#2d8bff',
          600: '#1669f5',
          700: '#0f54e1',
          800: '#1343b6',
          900: '#163c8f',
          950: '#122657',
        },
        aqi: {
          good: '#00e400',
          moderate: '#ffff00',
          sensitive: '#ff7e00',
          unhealthy: '#ff0000',
          very: '#8f3f97',
          hazardous: '#7e0023',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
