/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#faf5ff',  // Very light purple
          100: '#f3e8ff',  // Soft lavender
          200: '#e9d5ff',  // Light purple
          300: '#d8b4fe',  // Soft violet
          400: '#c084fc',  // Muted purple
          500: '#a855f7',  // Primary purple
          600: '#9333ea',  // Strong purple
          700: '#7e22ce',  // Deep purple
          800: '#6b21a8',  // Dark violet
          900: '#581c87',  // Very dark purple
        },
      },      
    },
  },
  plugins: [],
}