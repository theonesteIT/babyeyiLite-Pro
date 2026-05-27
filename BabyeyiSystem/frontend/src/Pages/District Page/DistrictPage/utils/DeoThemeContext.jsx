import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'deo_portal_dark_mode';

const DeoThemeContext = createContext({
  darkMode: false,
  setDarkMode: () => {},
  toggleDarkMode: () => {},
});

export function DeoThemeProvider({ children, initialDark = false }) {
  const [darkMode, setDarkModeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored != null) return stored === '1' || stored === 'true';
    } catch {
      /* ignore */
    }
    return !!initialDark;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('deo-dark');
    else root.classList.remove('deo-dark');
    try {
      localStorage.setItem(STORAGE_KEY, darkMode ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  const setDarkMode = useCallback((v) => setDarkModeState(!!v), []);
  const toggleDarkMode = useCallback(() => setDarkModeState((d) => !d), []);

  const value = useMemo(
    () => ({ darkMode, setDarkMode, toggleDarkMode }),
    [darkMode, setDarkMode, toggleDarkMode]
  );

  return <DeoThemeContext.Provider value={value}>{children}</DeoThemeContext.Provider>;
}

export function useDeoTheme() {
  return useContext(DeoThemeContext);
}
