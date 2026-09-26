import type { Config } from "tailwindcss";

// همون پالت اپ وب (app/globals.css) روی متغیرهای CSS تم سوار شده تا با
// تغییر تم (روشن/تاریک) خودکار آپدیت بشه — نگاه کن به src/styles/theme.css.
const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface-1)",
        surface2: "var(--surface-2)",
        border: "var(--surface-line)",
        text: "var(--text)",
        muted: "var(--muted)",
        muted2: "var(--muted2)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-deep": "var(--accent-deep)",
        secondary: "var(--secondary)",
        "pnl-win": "var(--pnl-win)",
        "pnl-loss": "var(--pnl-loss)",
      },
      borderRadius: {
        card: "18px",
      },
      fontFamily: {
        vazir: ["var(--font-vazir)", "sans-serif"],
        latin: ["var(--font-latin)", "sans-serif"],
      },
    },
  },
  plugins: [],
  future: { hoverOnlyWhenSupported: true },
};

export default config;
