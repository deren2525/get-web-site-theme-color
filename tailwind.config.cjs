/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./entrypoints/**/*.{html,ts,js,vue}', './components/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#1fa0a2',
        background: '#f2f2f2',
        gray: '#666666',
        white: '#FFFFFF',
        status: {
          success: '#16a4a7',
          error: '#e6705f',
        },
        'tab-inactive': '#a8a5a1',
      },
    },
  },
  plugins: [],
}
