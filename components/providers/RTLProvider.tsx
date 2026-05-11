'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Dir = 'rtl' | 'ltr';
type Lang = 'ar' | 'en';

interface RTLContextValue {
  dir: Dir;
  lang: Lang;
  toggleLang: () => void;
  isRTL: boolean;
}

const RTLContext = createContext<RTLContextValue>({
  dir: 'rtl',
  lang: 'ar',
  toggleLang: () => {},
  isRTL: true,
});

export function RTLProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar');
  const dir: Dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const toggleLang = () => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));

  return (
    <RTLContext.Provider value={{ dir, lang, toggleLang, isRTL: dir === 'rtl' }}>
      {children}
    </RTLContext.Provider>
  );
}

export function useRTL() {
  return useContext(RTLContext);
}
