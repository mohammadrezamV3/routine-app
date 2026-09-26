import { useCallback, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, storeTheme, ThemeMode } from "./theme";
import { syncStatusBar } from "./statusBar";

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(mode);
    void syncStatusBar(mode);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      storeTheme(next);
      return next;
    });
  }, []);

  return { mode, toggle };
}
