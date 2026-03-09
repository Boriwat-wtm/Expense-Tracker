export type ThemeId = "classic" | "cozy" | "roastery" | "dark";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    bg: string;
    card: string;
    primary: string;
    income: string;
    expense: string;
  };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "classic",
    name: "Classic Trust",
    description: "น่าเชื่อถือ มืออาชีพ",
    preview: {
      bg: "#F8FAFC",
      card: "#FFFFFF",
      primary: "#2563EB",
      income: "#16A34A",
      expense: "#DC2626",
    },
  },
  {
    id: "cozy",
    name: "Cozy & Playful",
    description: "อบอุ่น สบายตา น่ารัก",
    preview: {
      bg: "#FFFBF0",
      card: "#FFFFFF",
      primary: "#8B5CF6",
      income: "#059669",
      expense: "#E11D48",
    },
  },
  {
    id: "roastery",
    name: "Industrial Roastery",
    description: "คราฟต์ เท่ โกดังกาแฟ",
    preview: {
      bg: "#FAFAF9",
      card: "#FFFFFF",
      primary: "#D97706",
      income: "#4D7C0F",
      expense: "#9F1239",
    },
  },
  {
    id: "dark",
    name: "Developer Dark",
    description: "Dark mode ถนอมสายตา",
    preview: {
      bg: "#0F172A",
      card: "#1E293B",
      primary: "#38BDF8",
      income: "#4ADE80",
      expense: "#F87171",
    },
  },
];

const STORAGE_KEY = "expense-tracker-theme";

function applyTheme(themeId: ThemeId) {
  document.documentElement.setAttribute("data-theme", themeId);
}

export function useTheme() {
  const saved = (localStorage.getItem(STORAGE_KEY) as ThemeId | null) ?? "classic";
  applyTheme(saved);

  function setTheme(id: ThemeId) {
    localStorage.setItem(STORAGE_KEY, id);
    applyTheme(id);
    // Force re-render by dispatching custom event
    window.dispatchEvent(new CustomEvent("themechange", { detail: id }));
  }

  function getCurrentTheme(): ThemeId {
    return (localStorage.getItem(STORAGE_KEY) as ThemeId | null) ?? "classic";
  }

  return { setTheme, getCurrentTheme, THEMES };
}

// Apply theme immediately on module load (before React renders)
const initialTheme = (localStorage.getItem(STORAGE_KEY) as ThemeId | null) ?? "classic";
applyTheme(initialTheme);
