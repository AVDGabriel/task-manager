/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'selector',
  theme: {
    extend: {
      colors: {
        fluent: {
          blue: '#0078d4',
          'blue-hover': '#106ebe',
          red: '#d83b01',
          green: '#107c41',
          yellow: '#ffb900',
        },
      },
    },
  },
  plugins: [],
}
