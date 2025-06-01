module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",  // Make sure to scan these files for Tailwind classes
  ],
  theme: {
    extend: {
      colors: {
        'background': '#111827',  // Dark background color for the page
        'primary': '#8b5cf6',     // Vite-like purple accent
        'secondary': '#6b21a8',   // Dark purple accent
        'card-background': '#1f2937', // Card background color
        renewco: '#f6f3ed'
      },
    },
  },
  darkMode: 'class', // Enable dark mode using the 'class' strategy
  plugins: [],
}
