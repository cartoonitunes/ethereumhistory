import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Archive-inspired dark palette
        obsidian: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d9d9de",
          300: "#b8b8c1",
          400: "#91919f",
          500: "#737384",
          600: "#5d5d6b",
          700: "#4c4c57",
          800: "#41414a",
          900: "#393940",
          950: "#18181b",
        },
        // Ethereum-inspired accent
        ether: {
          50: "#f0f4ff",
          100: "#e0e8ff",
          200: "#c7d4fe",
          300: "#a4b8fc",
          400: "#8093f8",
          500: "#626ef1",
          600: "#4f4de5",
          700: "#423eca",
          800: "#3735a3",
          900: "#323381",
          950: "#1e1d4b",
        },
        // Era colors for visual distinction
        era: {
          frontier: "#8b5cf6",    // Purple - The beginning
          homestead: "#3b82f6",   // Blue - Stability
          dao: "#ef4444",         // Red - The crisis
          tangerine: "#f97316",   // Orange - Recovery
          spurious: "#eab308",    // Yellow - Hardening
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
