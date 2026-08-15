"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const storageKey = "bnl-theme";
const themeChangeEvent = "bnl-theme-change";

function getTheme(): Theme {
  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

function subscribeToThemeChange(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(themeChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeToThemeChange, getTheme, () => "light");

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  };

  const isDark = theme === "dark";

  return (
    <button
      className={`theme-toggle${className ? ` ${className}` : ""}`}
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
      title={isDark ? "Helles Design" : "Dunkles Design"}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span>{isDark ? "Hell" : "Dunkel"}</span>
    </button>
  );
}
