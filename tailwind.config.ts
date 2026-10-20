import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213D",
        mute: "#3D4A63",
        paper: "#F6F7F4",
        navy: "#14213D",
        teal: "#0B6B50",
        hair: "#E4E7E1",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
