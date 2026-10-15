/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta institucional — Gobernación de Córdoba
        // Azul institucional
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#1a3a6b',   // Azul Gobernación
          600: '#162f58',
          700: '#112448',
          800: '#0c1a35',
          900: '#070f20',
        },
        // Verde petróleo
        teal: {
          50:  '#effaf7',
          100: '#d6f4eb',
          200: '#aee8d8',
          300: '#76d4be',
          400: '#3dbda3',
          500: '#1a7a6e',   // Verde petróleo institucional
          600: '#156259',
          700: '#104b44',
          800: '#0b342f',
          900: '#051e1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
