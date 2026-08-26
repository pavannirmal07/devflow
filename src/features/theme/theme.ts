export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = "devflow_theme_mode";

/**
 * Reads the stored theme mode preference from localStorage with safe fallback.
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch (e) {
    console.warn("Failed to read theme preference from localStorage:", e);
  }
  return "system";
}

/**
 * Persists the theme mode preference into localStorage safely.
 */
export function setStoredTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    console.warn("Failed to save theme preference to localStorage:", e);
  }
}

/**
 * Detects the operating system's color scheme preference.
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Resolves a ThemeMode ("system" | "light" | "dark") to an actual "light" | "dark" theme.
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}

/**
 * Applies the resolved theme to the DOM (adds/removes .dark class on <html> and sets colorScheme).
 */
export function applyThemeToDOM(resolvedTheme: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (resolvedTheme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }

  root.style.colorScheme = resolvedTheme;
}
