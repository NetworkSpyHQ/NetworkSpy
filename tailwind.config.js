/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'table-header': '#23262a',
        button: {
          bg: 'var(--button-bg-color)',
          text: 'var(--button-text-color)',
          hover: 'var(--button-hover-bg-color)',
        },
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['hover'],
    },
  },
  plugins: [
    require("@tailwindcss/typography"), 
    require("@tailwindcss/container-queries")
  ],
};
