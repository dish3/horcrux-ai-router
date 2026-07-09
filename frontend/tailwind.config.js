/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        cardBg: '#131929',
        borderBg: '#1f2a45',
        accentBg: '#3b82f6',
        accentHover: '#2563eb'
      }
    },
  },
  plugins: [],
}
