import type { Config } from "tailwindcss";

// Design tokens for the MVI Accident Tracker.
// Palette is built around a "case file" feel: forest green + white,
// with plate/VT-number identifiers rendered in mono to read like
// stamped official records. Dashed "road marking" rules are used
// as the one recurring signature motif between report sections.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#EAF3EC",
          100: "#CFE6D6",
          200: "#A3D0B2",
          300: "#71B587",
          400: "#489A66",
          500: "#1F6F4A", // primary
          600: "#195C3D",
          700: "#144A31",
          800: "#0F3826",
          900: "#0A271A",
        },
        ink: "#16241C",
        paper: "#FFFFFF",
        sand: "#F6F8F5",
        amber: {
          500: "#C98A2B",
          100: "#F7E7CE",
        },
        rust: {
          500: "#B3382C",
          100: "#F4DAD7",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "dash-rule":
          "repeating-linear-gradient(90deg, #1F6F4A 0, #1F6F4A 10px, transparent 10px, transparent 20px)",
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 56, 38, 0.06), 0 1px 8px rgba(15, 56, 38, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
