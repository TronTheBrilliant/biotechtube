import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#1a7a5e",
          dark: "#0a3d2e",
          light: "#5DCAA5",
          hover: "#158a6a",
          subtle: "#e8f5f0",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderWidth: {
        DEFAULT: "0.5px",
        "0": "0",
        "0.5": "0.5px",
        "1": "1px",
      },
      fontSize: {
        "10": ["10px", { lineHeight: "1.4" }],
        "11": ["11px", { lineHeight: "1.5" }],
        "12": ["12px", { lineHeight: "1.5" }],
        "13": ["13px", { lineHeight: "1.65" }],
        "14": ["14px", { lineHeight: "1.65" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
export default config;
