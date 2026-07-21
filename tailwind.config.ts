import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07111F",
        muted: "#667085",
        cream: "#FFF8E8",
        page: "#F7F4EA",
        line: "#E6E2D8",
        yellow: "#FFD85A",
        arc: {
          50: "#E7F8EC",
          100: "#D8F1DE",
          500: "#FFD85A",
          600: "#0FA86B",
          900: "#063F2C"
        },
        forest: {
          950: "#04291F"
        }
      },
      boxShadow: {
        card: "0 18px 45px rgba(7, 17, 31, 0.08)",
        cream: "0 24px 70px rgba(59, 48, 22, 0.10)",
        deep: "0 28px 80px rgba(4, 41, 31, 0.28)",
        soft: "0 16px 40px rgba(15, 168, 107, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
