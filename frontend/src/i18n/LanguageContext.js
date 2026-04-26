/**
 * Language Context
 *
 * Provides language switching functionality for the app.
 *
 * Supported (admin + public): UK (Ukrainian, default), EN (English), BG (Bulgarian)
 *
 * Toggle order on click: UK → EN → BG → UK
 *
 * Persistence: `localStorage["bibi_lang"]`. Unknown / legacy codes fall back to UK.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext(null);

// Available languages — UK first (default), then EN, then BG
export const LANGUAGES = [
  { code: 'uk', label: 'UK', flag: '🇺🇦', name: 'Українська' },
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'bg', label: 'BG', flag: '🇧🇬', name: 'Български' },
];

const DEFAULT_LANG = 'uk';

const normalizeLang = (raw) => {
  if (!raw) return DEFAULT_LANG;
  // Legacy alias: some old stored values used 'ua' instead of 'uk'
  if (raw === 'ua') return 'uk';
  return LANGUAGES.some((l) => l.code === raw) ? raw : DEFAULT_LANG;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bibi_lang');
      const next = normalizeLang(stored);
      if (stored !== next) {
        try { localStorage.setItem('bibi_lang', next); } catch {}
      }
      return next;
    }
    return DEFAULT_LANG;
  });

  // Save language preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('bibi_lang', lang); } catch {}
    }
  }, [lang]);

  // Translation function — falls back to UK, then EN, then BG, then the key itself
  const t = (key) => {
    return (
      translations[lang]?.[key] ??
      translations.uk?.[key] ??
      translations.en?.[key] ??
      translations.bg?.[key] ??
      key
    );
  };

  // Cycle through languages (UK → EN → BG → UK)
  const toggleLang = () => {
    const currentIndex = LANGUAGES.findIndex((l) => l.code === lang);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    setLang(LANGUAGES[nextIndex].code);
  };

  // Set specific language (ignores unknown codes; aliases 'ua' → 'uk')
  const changeLang = (newLang) => {
    const normalized = normalizeLang(newLang);
    setLang(normalized);
  };

  return (
    <LanguageContext.Provider
      value={{ lang, setLang: changeLang, t, toggleLang, changeLang, languages: LANGUAGES }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if used outside provider
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (key) => translations[DEFAULT_LANG]?.[key] || key,
      toggleLang: () => {},
      changeLang: () => {},
      languages: LANGUAGES,
    };
  }
  return context;
};

export default LanguageContext;
