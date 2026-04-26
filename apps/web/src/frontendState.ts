import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";
export type ProjectView = "overview" | "backlog" | "planning" | "board" | "docs";

const THEME_KEY = "fabriqueta.theme";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => readStorage(key, initialValue));

  useEffect(() => {
    writeStorage(key, state);
  }, [key, state]);

  return [state, setState] as const;
}

export function useThemeMode() {
  const [theme, setTheme] = usePersistentState<ThemeMode>(THEME_KEY, "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return [theme, setTheme] as const;
}

export function isProjectView(value: string): value is ProjectView {
  return ["overview", "backlog", "planning", "board", "docs"].includes(value);
}

export function formatShortDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Date(value.replace(" ", "T")).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
