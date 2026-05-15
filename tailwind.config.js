/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0c",
        surface: "#111116",
        border: "#1e1e28",
        text: "#f0f0f8",
        muted: "#6b6b80",
        accent: "#e8ff47",
        error: "#ff4757",
        info: "#4fc3f7",
      },
      fontFamily: {
        mono: ["DM Mono", "monospace"],
        sans: ["Inter", "Sora", "sans-serif"],
      },
      borderRadius: {
        card: "6px",
        btn: "4px",
      },
    },
  },
  plugins: [],
};
