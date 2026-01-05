
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#eff1ff',
          100: '#e1e4ff',
          200: '#c6ccff',
          300: '#a3adff',
          400: '#7e87ff',
          500: '#585aff',
          600: '#2005A2', 
          700: '#1a0482',
          800: '#16036b',
          900: '#140356',
        },
        maroon: {
          50: '#fdf2f7',
          100: '#fce7f1',
          200: '#fad0e2',
          300: '#f7a8c8',
          400: '#f074a3',
          500: '#e54580',
          600: '#AF1456', 
          700: '#900d43',
          800: '#780f3b',
          900: '#651034',
        },
        red: {
          50: '#fdf2f7',
          100: '#fce7f1',
          200: '#fad0e2',
          300: '#f7a8c8',
          400: '#f074a3',
          500: '#e54580',
          600: '#AF1456', 
          700: '#900d43',
          800: '#780f3b',
          900: '#651034',
        }
      }
    },
  },
  plugins: [],
}
