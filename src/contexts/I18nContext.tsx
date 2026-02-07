import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { translations, Locale } from '@/lib/i18n/translations';

// Use the actual structure type, not a specific locale's type
type Translations = typeof translations[Locale];

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  formatString: (template: string, params: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Detect user's preferred locale from browser/device
function detectLocale(): Locale {
  // Check navigator language
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
  
  // Extract language code (e.g., 'tr-TR' -> 'tr')
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Check if we support this language
  if (langCode === 'tr') {
    return 'tr';
  }
  
  // Default to English
  return 'en';
}

// Try to infer country from timezone as fallback
function inferLocaleFromTimezone(): Locale | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Turkish timezones
    if (timezone.includes('Istanbul') || timezone.includes('Turkey')) {
      return 'tr';
    }
  } catch {
    // Ignore timezone detection errors
  }
  
  return null;
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // Detect locale on mount
  useEffect(() => {
    // First try browser language
    let detectedLocale = detectLocale();
    
    // If English (default), try timezone inference as backup
    if (detectedLocale === 'en') {
      const timezoneLocale = inferLocaleFromTimezone();
      if (timezoneLocale) {
        detectedLocale = timezoneLocale;
      }
    }
    
    setLocaleState(detectedLocale);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  // Get translations for current locale
  const t = useMemo(() => translations[locale], [locale]);

  // Format string with parameters (e.g., "Hello {name}" -> "Hello John")
  const formatString = useCallback((template: string, params: Record<string, string | number>): string => {
    return Object.entries(params).reduce((str, [key, value]) => {
      return str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }, template);
  }, []);

  const value = useMemo(() => ({
    locale,
    t,
    setLocale,
    formatString,
  }), [locale, t, setLocale, formatString]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
