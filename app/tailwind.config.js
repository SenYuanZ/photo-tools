/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#ff7fae',
          blue: '#5da8ff',
          yellow: '#ffe186',
          ink: '#3f3b4f',
        },
      },
      boxShadow: {
        candy: '0 14px 34px rgba(255, 127, 174, 0.16)',
      },
    },
  },
  plugins: [],
}
