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
          light: '#e3f0ff',
          DEFAULT: '#3c82dc',
          dark: '#1e3a5c',
        },
        accent: {
          light: '#f5e8ff',
          DEFAULT: '#a259ff',
          dark: '#6e38b1',
        },
        background: {
          light: '#f8fafc',
          DEFAULT: '#f0f4fa',
          dark: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
        heading: ['Montserrat', 'Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
