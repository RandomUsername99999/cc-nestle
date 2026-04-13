/** @type {import('tailwindcss').Config} */
module.exports = {
 content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { 
   extend: {
    colors: {
     coffee: {
      50: '#EFEBE9',
      100: '#D7CCC8',
      200: '#BCAAA4',
      300: '#A1887F',
      400: '#8D6E63',
      500: '#795548',
      600: '#6D4C41',
      700: '#5D4037',
      800: '#4E342E',
      900: '#3E2723',
      950: '#2D1D19',
     }
    }
   }
  },
 plugins: [],
}