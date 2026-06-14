import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf7",
          100: "#d5f6eb",
          200: "#afecd9",
          300: "#7bdcbf",
          400: "#45c49f",
          500: "#20a982",
          600: "#16886a",
          700: "#146d58",
          800: "#135747",
          900: "#12483d"
        },
        ink: {
          900: "#10211c",
          700: "#2e4d45",
          500: "#647a73",
          300: "#a8b8b3",
          100: "#eef3f1"
        }
      },
      boxShadow: {
        soft: "0 16px 40px rgba(18, 72, 61, 0.08)"
      }
    },
  },
  plugins: [],
};

export default config;
