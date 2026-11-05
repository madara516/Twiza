/**
 * نظام اللغات الثلاثية ودعم اتجاه الكتابة (Trilanguage i18n & RTL)
 * 
 * يدعم اللغات الثلاث:
 * 1. العربية (ar) - الاتجاه: من اليمين لليسار (RTL)
 * 2. الفرنسية (fr) - الاتجاه: من اليسار لليمين (LTR)
 * 3. الإنجليزية (en) - الاتجاه: من اليسار لليمين (LTR)
 */

import { I18nManager, Platform } from 'react-native';
import ar from './ar.json';
import fr from './fr.json';
import en from './en.json';

export type Language = 'ar' | 'fr' | 'en';

let currentLanguage: Language = 'ar';

export const translations = {
  ar,
  fr,
  en,
};

export const LANGUAGE_OPTIONS: { code: Language; name: string; nativeName: string; flag: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇩🇿', dir: 'rtl' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
];

/**
 * تهيئة ودعم اتجاه النص واللغة
 */
export function setupRTL(lang: Language = 'ar'): boolean {
  currentLanguage = lang;
  const shouldBeRTL = lang === 'ar';
  
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    if (document.body) {
      document.body.dir = shouldBeRTL ? 'rtl' : 'ltr';
    }
  }

  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    return true;
  }
  return false;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function setGlobalLanguage(lang: Language) {
  currentLanguage = lang;
  setupRTL(lang);
}

export function t(key: string, lang?: Language): string {
  const activeLang = lang || currentLanguage;
  const dict = (translations[activeLang] || translations.ar) as Record<string, any>;
  const keys = key.split('.');
  let current: any = dict;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      // Fallback to Arabic if missing
      const fallbackDict = translations.ar as Record<string, any>;
      let fbCurrent: any = fallbackDict;
      for (const fbk of keys) {
        if (fbCurrent && typeof fbCurrent === 'object' && fbk in fbCurrent) {
          fbCurrent = fbCurrent[fbk];
        } else {
          return key;
        }
      }
      return typeof fbCurrent === 'string' ? fbCurrent : key;
    }
  }
  
  return typeof current === 'string' ? current : key;
}
