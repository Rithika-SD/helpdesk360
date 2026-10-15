/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070d18',
          900: '#0c1527',
          800: '#14223d',
          700: '#1e335b',
          600: '#2b477b',
        },
        brand: {
          cyan: '#06b6d4',
          blue: '#2563eb',
          lightBlue: '#38bdf8',
        }
      }
    },
  },
  plugins: [],
}
