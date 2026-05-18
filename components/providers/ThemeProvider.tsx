'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

const ThemeProviderContext = createContext<ThemeProviderContextValue | undefined>(undefined);

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'clinicos-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const hasLoadedStoredTheme = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem(storageKey);
      hasLoadedStoredTheme.current = true;

      if (isTheme(savedTheme)) {
        setThemeState(savedTheme);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);

    try {
      window.localStorage.setItem(storageKey, nextTheme);
      hasLoadedStoredTheme.current = true;
    } catch {
      // localStorage can be unavailable in private mode.
    }
  }, [storageKey]);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
