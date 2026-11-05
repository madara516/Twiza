/**
 * الألوان الرسمية لتطبيق التويزة (Al-Twiza Brand Themes)
 * 
 * يدعم نمطين فخمين:
 * 1. النمط النهاري (Light Mode) - أخضر غابي مع خلفية نظيفة وبطاقات بيضاء
 * 2. النمط الليلي (Dark Green Mode) - أخضر زمردي عميق جداً مريح للعين (#071811) وبطاقات زمردية داكنة (#0F2E22)
 */

export const lightColors = {
  // الألوان الأساسية
  primary: '#23703F',          // Forest Organic Green
  primaryDark: '#1A5932',
  primaryLight: '#2E7D32',
  primaryMint: '#EAF4ED',
  primarySoft: '#F0FDF4',
  tabBarActive: '#23703F',
  tabBarInactive: '#9CA3AF',

  // ألوان أنواع الأماكن
  kind: {
    bin: '#22C55E',
    collection_point: '#14532D',
    wild_dump: '#EF4444',
  },

  // ألوان الحالات
  status: {
    pending: '#F59E0B',
    sent: '#3B82F6',
    received: '#0284C7',
    in_repair: '#F59E0B',
    fixed: '#22C55E',
    rejected: '#EF4444',
  },

  // ألوان الواجهة والخلفيات
  background: '#F8FAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  cardBackground: '#FFFFFF',
  
  // ألوان النصوص
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverted: '#FFFFFF',

  // ألوان الحدود والفواصل
  border: '#E5E7EB',
  borderLight: '#ECEFEA',
  borderFocus: '#1B4D3E',

  // التنبيهات
  accent: '#E65100',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  success: '#22C55E',
  successLight: '#DCFCE7',
} as const;

export const darkGreenColors = {
  // الألوان الأساسية بنمط الأخضر الداكن
  primary: '#4ADE80',          // أخضر ناصع حيوي فوق الخلفية الداكنة
  primaryDark: '#0D2B1D',      // عمق الغابة
  primaryLight: '#22C55E',
  primaryMint: '#133D2B',      // خلفية شارات زمردية داكنة
  primarySoft: '#0A261B',
  tabBarActive: '#4ADE80',
  tabBarInactive: '#7C9A8B',

  // ألوان أنواع الأماكن
  kind: {
    bin: '#4ADE80',
    collection_point: '#2DD4BF',
    wild_dump: '#F87171',
  },

  // ألوان الحالات
  status: {
    pending: '#FBBF24',
    sent: '#60A5FA',
    received: '#38BDF8',
    in_repair: '#FBBF24',
    fixed: '#4ADE80',
    rejected: '#F87171',
  },

  // ألوان الواجهة والخلفيات (Dark Green Implementation)
  background: '#071811',       // خلفية خضراء داكنة جداً مستوحاة من الواحات ليلاً
  surface: '#0F2E22',          // سطح البطاقات أخضر زمردي داكن
  surfaceAlt: '#14382A',       // خلفية الحقول والعناصر الداخلية
  cardBackground: '#0F2E22',
  
  // ألوان النصوص
  text: '#F0FDF4',             // نص أبيض مخضر فائق الوضوح
  textSecondary: '#A7C4B5',    // نص رمادي مخضر ناعم
  textMuted: '#6B8E7B',        // نص باهت
  textInverted: '#071811',

  // ألوان الحدود والفواصل
  border: '#1B4D39',           // حدود زمردية راقية
  borderLight: '#143D2D',
  borderFocus: '#4ADE80',

  // التنبيهات
  accent: '#FB923C',
  error: '#F87171',
  errorLight: '#341515',
  warning: '#FBBF24',
  warningLight: '#33290D',
  success: '#4ADE80',
  successLight: '#123A26',
} as const;

export type ThemeColors = typeof lightColors;

// التصدير الافتراضي للتوافق مع الملفات الحالية
export const colors = lightColors;
