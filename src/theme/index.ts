/**
 * تصميم التطبيق (Theme) - ألوان، مسافات، وخطوط
 * 
 * بالدارجة: هذا الملف يجمع الألوان والمسافات (Spacing) باش تكون الخدمة موحدة ونظيفة في كل الشاشات.
 */

import { colors } from './colors';

export const theme = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999,
  },
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 30,
    },
  },
} as const;

export type Theme = typeof theme;
export { colors };
