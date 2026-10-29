import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { Locale, Translations } from "./types";
import { en } from "./locales/en";
import { pt } from "./locales/pt";

const dictionaries: Record<Locale, Translations> = {
  en,
  pt,
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  translations: Translations;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "scoreboard_locale";

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadSavedLocale() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (saved === "en" || saved === "pt")) {
          setLocaleState(saved);
        } else {
          // Detect device locale
          const deviceLocales = getLocales();
          const primaryLanguage = deviceLocales[0]?.languageCode?.toLowerCase() || "";
          if (primaryLanguage.startsWith("pt")) {
            setLocaleState("pt");
          }
        }
      } catch (e) {
        console.warn("Failed to load preferred language:", e);
      } finally {
        setIsReady(true);
      }
    }

    loadSavedLocale();
  }, []);

  const setLocale = async (newLocale: Locale) => {
    try {
      setLocaleState(newLocale);
      await AsyncStorage.setItem(STORAGE_KEY, newLocale);
    } catch (e) {
      console.warn("Failed to persist preferred language:", e);
    }
  };

  const currentDict = dictionaries[locale] || en;

  const t = useMemo(() => {
    return (path: string, params?: Record<string, string | number>): string => {
      let text = getNestedValue(currentDict, path);
      if (text === undefined) {
        // Fallback to English dictionary
        text = getNestedValue(en, path);
      }
      if (text === undefined) {
        return path;
      }
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          text = (text as string).replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
        });
      }
      return text;
    };
  }, [currentDict]);

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        translations: currentDict,
        isReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
