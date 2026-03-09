/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        theme: {
          bg: "var(--bg)",
          card: "var(--card)",
          sidebar: "var(--sidebar)",
          primary: "var(--primary)",
          "primary-light": "var(--primary-light)",
          "primary-text": "var(--primary-text)",
          income: "var(--income)",
          "income-bg": "var(--income-bg)",
          expense: "var(--expense)",
          "expense-bg": "var(--expense-bg)",
          text: "var(--text)",
          muted: "var(--text-muted)",
          border: "var(--border)",
          "nav-active": "var(--nav-active-bg)",
          "nav-active-text": "var(--nav-active-text)",
          "nav-hover": "var(--nav-hover)",
          "badge-bg": "var(--badge-bg)",
          "badge-text": "var(--badge-text)",
          track: "var(--progress-track)",
        },
      },
    },
  },
  plugins: [],
};
