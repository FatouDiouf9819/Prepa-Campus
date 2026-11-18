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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#0066FF",
          hover: "#0052CC",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#0066FF",
          600: "#0052CC",
          700: "#003EB3",
        },
        navy: {
          DEFAULT: "#0A1938",
          dark: "#07132D",
          light: "#0F2854",
        },
        brand: {
          blue: "#0066FF",
          blueHover: "#0052CC",
          sky: "#38BDF8",
          navy: "#0A1938",
          dark: "#07132D",
          bg: "#F8F9FE",
        },
      },
    },
  },
  plugins: [],
};
export default config;
