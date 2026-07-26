import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "auto" | "light" | "dark";

const STORAGE_KEY = "vs-theme";

function readStored(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

function apply(choice: ThemeChoice) {
  if (choice === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", choice);
  }
}

/** Tracks the user's theme choice (auto/light/dark), persists it, and keeps
 *  the `data-theme` attribute on <html> in sync (index.html applies the
 *  stored value before first paint, so this just takes over from there). */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(readStored);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can be unavailable (private mode, disabled storage) -
      // the choice still applies for this session via React state.
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const order: ThemeChoice[] = ["auto", "light", "dark"];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  }, [theme, setTheme]);

  return { theme, setTheme, cycleTheme };
}
