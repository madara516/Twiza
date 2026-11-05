/**
 * سياق إدارة اللغات الثلاثية (Trilanguage Context)
 * 
 * يتيح للمستخدم الاختيار الصريح بين:
 * - العربية (ar)
 * - الفرنسية (fr)
 * - الإنجليزية (en)
 * مع حفظ التفضيل محلياً في AsyncStorage وتطبيق اتجاه النصوص (RTL / LTR).
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, setupRTL, setGlobalLanguage, t as translateFn, LANGUAGE_OPTIONS } from '../i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
  languageOptions: typeof LANGUAGE_OPTIONS;
}

const STORAGE_KEY = '@twizza_app_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: async () => {},
  t: (k) => k,
  isRTL: true,
  languageOptions: LANGUAGE_OPTIONS,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('ar');

  useEffect(() => {
    // استرجاع اللغة المحفوظة عند فتح التطبيق
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'ar' || saved === 'fr' || saved === 'en') {
        setLangState(saved);
        setGlobalLanguage(saved);
      } else {
        setupRTL('ar');
      }
    }).catch(() => {
      setupRTL('ar');
    });
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLangState(newLang);
    setGlobalLanguage(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Failed to save language choice:', e);
    }
  };

  const t = (key: string) => translateFn(key, language);
  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL,
        languageOptions: LANGUAGE_OPTIONS,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
