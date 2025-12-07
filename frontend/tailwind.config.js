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
        'verde-lodo': '#96b5a6',
        'nude': '#fce1cb',
        'rosa': '#febeac',
        'marrom': '#4e383d',
        'laranja-forte': '#d9434f',
      },
    },
  },
  plugins: [],
}

