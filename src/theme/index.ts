/**
 * تصميم التطبيق (Theme) - ألوان، مسافات، خطوط وظلال موحدة
 */

import { Platform } from 'react-native';
import { colors } from './colors';

export const fontFamily = Platform.select({
  web: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const theme = {
  colors,
  fontFamily,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  typography: {
    fontFamily,
    sizes: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
      display: 34,
    },
  },
  shadows: {
    soft: {
      shadowColor: '#1B4D3E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    card: {
      shadowColor: '#0A1A14',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    },
    floating: {
      shadowColor: '#1B4D3E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 6,
    },
  },
} as const;

export type Theme = typeof theme;
export { colors };
