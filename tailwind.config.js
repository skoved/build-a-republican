/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", '"Times New Roman"', "serif"],
        serif: ['"Newsreader"', "Georgia", '"Times New Roman"', "serif"],
      },
      colors: {
        paper: "#f4efe4",
        ink: "#1c1a17",
        "gop-red": "#b22234",
        "gop-blue": "#0a3161",
        brass: "#b3893f",
        leather: "#2b2320",
      },
      boxShadow: {
        case: "0 18px 40px -12px rgba(0,0,0,0.55)",
        paperlift: "0 10px 30px -8px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
