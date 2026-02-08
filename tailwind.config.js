/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#14AA82',
          hover: '#0d8a6a',
        },
        surface: {
          DEFAULT: '#1a1a2e',
          alt: '#16213e',
        },
        heading: '#e5e5e5',
        muted: '#9ca3af',
      },
    },
  },
  plugins: [],
};
