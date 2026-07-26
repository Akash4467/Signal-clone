import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        signal: {
          blue: "#3B76F0",
          blueDark: "#2C6BED",
          bubble: "#3B76F0",
          bubbleIn: "#E9E9E9",
          bubbleInDark: "#2E2E2E",
          bg: "#FFFFFF",
          bgDark: "#121212",
          sidebar: "#F6F6F6",
          sidebarDark: "#1B1B1B",
          border: "#E0E0E0",
          borderDark: "#2C2C2C",
          text: "#1B1B1B",
          textDark: "#F5F5F5",
          muted: "#6E6E6E",
          mutedDark: "#A0A0A0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
