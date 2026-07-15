/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#D8581B',
          light: '#FFF0E6',
          dark: '#1E1E24',
          gray: '#64748B',
        }
      }
    },
  },
  plugins: [],
}
