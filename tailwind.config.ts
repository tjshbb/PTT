import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#e11d48",
          fg: "#fff1f2",
        },
      },
    },
  },
  plugins: [],
};

export default config;
