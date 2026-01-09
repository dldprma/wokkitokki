/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          500: "#2561D9",
          600: "#2975D9",
        },
        accent: {
          500: "#CFF250",
        },
        danger: {
          500: "#F23827",
        },
        dark: {
          500: "#262626",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
