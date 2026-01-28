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
      typography: {
        DEFAULT: {
          css: {
            color: "#b8b8c1", // obsidian-300
            maxWidth: "none",
            a: {
              color: "#8093f8", // ether-400
              "&:hover": {
                color: "#a4b8fc", // ether-300
              },
            },
            code: {
              color: "#d9d9de", // obsidian-200
              backgroundColor: "#18181b", // obsidian-950/50
              padding: "0.125rem 0.25rem",
              borderRadius: "0.25rem",
              fontWeight: "400",
            },
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            pre: {
              backgroundColor: "#0d0d0e",
              color: "#d9d9de",
              border: "1px solid #27272a",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
            },
            h1: {
              color: "#b8b8c1", // obsidian-300
              fontSize: "1.125rem", // text-lg
              fontWeight: "500",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
            },
            h2: {
              color: "#b8b8c1", // obsidian-300
              fontSize: "1rem", // text-base
              fontWeight: "500",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
            },
            h3: {
              color: "#b8b8c1", // obsidian-300
              fontSize: "0.875rem", // text-sm
              fontWeight: "500",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
            },
            h4: {
              color: "#b8b8c1",
              fontSize: "0.875rem",
              fontWeight: "500",
              marginTop: "1.25rem",
              marginBottom: "0.5rem",
            },
            h5: {
              color: "#b8b8c1",
              fontSize: "0.875rem",
              fontWeight: "500",
              marginTop: "1rem",
              marginBottom: "0.5rem",
            },
            h6: {
              color: "#b8b8c1",
              fontSize: "0.875rem",
              fontWeight: "500",
              marginTop: "1rem",
              marginBottom: "0.5rem",
            },
            p: {
              color: "#b8b8c1", // obsidian-300
              lineHeight: "1.75", // leading-relaxed
              marginBottom: "1rem", // mb-4
            },
            ul: {
              marginTop: "0.5rem",
              marginBottom: "1rem",
            },
            ol: {
              marginTop: "0.5rem",
              marginBottom: "1rem",
            },
            li: {
              marginTop: "0.25rem",
              marginBottom: "0.25rem",
            },
            strong: {
              color: "#b8b8c1",
              fontWeight: "600",
            },
            em: {
              color: "#b8b8c1",
            },
            blockquote: {
              color: "#91919f", // obsidian-400
              borderLeftColor: "#41414a", // obsidian-800
            },
          },
        },
        invert: {
          css: {
            color: "#b8b8c1", // obsidian-300
            a: {
              color: "#8093f8", // ether-400
              "&:hover": {
                color: "#a4b8fc", // ether-300
              },
            },
            code: {
              color: "#d9d9de", // obsidian-200
              backgroundColor: "#18181b", // obsidian-950/50
            },
            h1: {
              color: "#b8b8c1",
              fontSize: "1.125rem",
            },
            h2: {
              color: "#b8b8c1",
              fontSize: "1rem",
            },
            h3: {
              color: "#b8b8c1",
              fontSize: "0.875rem",
            },
            h4: {
              color: "#b8b8c1",
              fontSize: "0.875rem",
            },
            h5: {
              color: "#b8b8c1",
              fontSize: "0.875rem",
            },
            h6: {
              color: "#b8b8c1",
              fontSize: "0.875rem",
            },
            p: {
              color: "#b8b8c1",
              lineHeight: "1.75",
              marginBottom: "1rem",
            },
          },
        },
      },
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
  plugins: [require("@tailwindcss/typography")],
};
export default config;
