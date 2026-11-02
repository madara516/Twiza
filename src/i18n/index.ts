/**
 * نظام اللغات وتفعيل اتجاه الكتابة من اليمين إلى اليسار (RTL / i18n)
 * 
 * بالدارجة: هذا الملف مسؤول على الترجمة، ويضمن بلي اللغة العربية هي الأساسية
 * والتطبيق يبدا من اليمين لليسار (RTL) بطريقة صحيحة ومضبوطة.
 */

import { I18nManager } from 'react-native';
import ar from './ar.json';
import en from './en.json';

export type Language = 'ar' | 'en';

let currentLanguage: Language = 'ar';

export const translations = {
  ar,
  en,
};

/**
 * تهيئة ودعم اتجاه النص من اليمين لليسار (RTL)
 */
export function setupRTL(lang: Language = 'ar'): boolean {
  currentLanguage = lang;
  const shouldBeRTL = lang === 'ar';
  
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    return true; // يلزم إعادة تشغيل التطبيق لتطبيق RTL كاملاً في Native
  }
  return false;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  const dict = translations[currentLanguage] as Record<string, any>;
  const keys = key.split('.');
  let current: any = dict;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return key;
    }
  }
  
  return typeof current === 'string' ? current : key;
}
