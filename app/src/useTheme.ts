import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";

export type FontSizeLevel = "extra-small" | "small" | "standard" | "large" | "extra-large";

const FONT_SIZE_ORDER: FontSizeLevel[] = [
  "extra-small",
  "small",
  "standard",
  "large",
  "extra-large",
];

const FONT_SIZE_LABELS: Record<FontSizeLevel, string> = {
  "extra-small": "特小",
  "small": "小",
  "standard": "标准",
  "large": "大",
  "extra-large": "特大",
};

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

function getStoredFontSize(): FontSizeLevel {
  const stored = localStorage.getItem("fontSize");
  if (stored && FONT_SIZE_ORDER.includes(stored as FontSizeLevel)) {
    return stored as FontSizeLevel;
  }
  return "standard";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => getStoredTheme() || "light"
  );
  const [fontSize, setFontSizeState] = useState<FontSizeLevel>(getStoredFontSize);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!getStoredTheme()) {
        setTheme(getSystemTheme());
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  const zoomIn = useCallback(() => {
    setFontSizeState((current) => {
      const currentIndex = FONT_SIZE_ORDER.indexOf(current);
      if (currentIndex < FONT_SIZE_ORDER.length - 1) {
        return FONT_SIZE_ORDER[currentIndex + 1];
      }
      return current;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setFontSizeState((current) => {
      const currentIndex = FONT_SIZE_ORDER.indexOf(current);
      if (currentIndex > 0) {
        return FONT_SIZE_ORDER[currentIndex - 1];
      }
      return current;
    });
  }, []);

  const fontSizeLabel = FONT_SIZE_LABELS[fontSize];
  const canZoomIn = FONT_SIZE_ORDER.indexOf(fontSize) < FONT_SIZE_ORDER.length - 1;
  const canZoomOut = FONT_SIZE_ORDER.indexOf(fontSize) > 0;

  return { theme, toggleTheme, fontSize, fontSizeLabel, zoomIn, zoomOut, canZoomIn, canZoomOut };
}
