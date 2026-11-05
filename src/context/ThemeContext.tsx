/**
 * سياق إدارة المظهر (Theme Context - Light & Dark Green Mode)
 * 
 * يتيح للمستخدم الاختيار الصريح بين:
 * - الوضع النهاري (Light Mode)
 * - الوضع الليلي الأخضر (Dark Green Mode - Deep Forest Emerald)
 * مع حفظ التفضيل محلياً في AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkGreenColors, ThemeColors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
}

const STORAGE_KEY = '@twizza_app_theme';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  setThemeMode: async () => {},
  isDark: false,
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setThemeState(saved);
        applyWebTheme(saved);
      }
    }).catch(() => {});
  }, []);

  const applyWebTheme = (mode: ThemeMode) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const bgColor = mode === 'dark' ? darkGreenColors.background : '#EAE6DF';
      document.body.style.backgroundColor = bgColor;
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeState(mode);
    applyWebTheme(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme choice:', e);
    }
  };

  const isDark = themeMode === 'dark';
  const activeColors = isDark ? (darkGreenColors as unknown as ThemeColors) : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        isDark,
        colors: activeColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
