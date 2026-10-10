"use client";

import { useIsomorphicLayoutEffect } from "@heroui/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  applyTheme,
  readAppliedTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  type ResolvedTheme,
  type Theme,
} from "./theme";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  toggleThemeLabel: string;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.(SYSTEM_DARK_QUERY).matches === true;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    setThemeState(readStoredTheme(window.localStorage) ?? readAppliedTheme(root));
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    const query = window.matchMedia?.(SYSTEM_DARK_QUERY);
    const sync = () => {
      const resolved = resolveTheme(theme, prefersDark());
      applyTheme(document.documentElement, resolved);
      setResolvedTheme(resolved);
    };
    sync();
    if (!query || theme !== "system") return;
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [preferenceLoaded, theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    storeTheme(typeof window === "undefined" ? null : window.localStorage, nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const toggleThemeLabel = resolvedTheme === "dark" ? "切换为浅色主题" : "切换为深色主题";

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleThemeLabel, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "light",
      resolvedTheme: "light",
      toggleThemeLabel: "切换为深色主题",
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
