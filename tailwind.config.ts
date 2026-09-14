import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1D1F",
        mute: "#6B6E73",
        paper: "#FAFAFA",
        navy: "#1E3A5F",
        teal: "#0F7B6C",
        hair: "#E5E5E5",
      },
    },
  },
  plugins: [],
};
export default config;
