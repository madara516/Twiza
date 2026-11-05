/**
 * الألوان الرسمية لتطبيق التويزة (Al-Twiza Brand Theme)
 * 
 * الهوية البيئية الصارمة:
 * - الأخضر الغابي الداكن (#1B4D3E) كلون أساسي فخم
 * - الأخضر النعناعي (#2E7D32) للمؤشرات واللمسات التفاعلية
 * - خلفية كريمية نقية (#F7F5F0) مع بطاقات بيضاء (#FFFFFF) وحدود ناعمة (#E5E7EB)
 * - دلالات ألوان صريحة:
 *   - Bin / Approved: #22C55E
 *   - Collection Point: #14532D
 *   - Wild Dump / Rejected: #EF4444
 *   - Pending Review: #F59E0B text on #FEF3C7 pill badge
 */

export const colors = {
  // الألوان الأساسية للهوية المستوحاة من الموك آب
  primary: '#23703F',          // Forest Organic Green (اللون الأخضر المرجعي)
  primaryDark: '#1A5932',      // أخضر داكن للترويسات والظلال
  primaryLight: '#2E7D32',     // أخضر متوسط للعناصر التفاعلية
  primaryMint: '#EAF4ED',      // خلفية خضراء نعناعية هادئة للبطاقات والشارات
  primarySoft: '#F0FDF4',      // خلفية خضراء فائقة النعومة
  tabBarActive: '#23703F',     // لون الأيقونة النشطة في الشريط السفلي
  tabBarInactive: '#9CA3AF',   // لون الأيقونة غير النشطة

  // ألوان أنواع الأماكن (Kinds)
  kind: {
    bin: '#22C55E',            // أخضر حيوي - سلة فردية
    collection_point: '#14532D',// أخضر غابي داكن - نقطة تجميع رئيسية
    wild_dump: '#EF4444',      // أحمر صريح - نقطة سوداء / مكب فوضوي
  },

  // ألوان الحالات (Statuses)
  status: {
    pending: '#F59E0B',        // كهرماني / برتقالي - قيد المراجعة
    sent: '#3B82F6',           // أزرق - Processing
    received: '#0284C7',       // أزرق سماوي - استُلم
    in_repair: '#F59E0B',      // برتقالي - In Progress
    fixed: '#22C55E',          // أخضر ناصع - Solved / تم الإصلاح
    rejected: '#EF4444',       // أحمر - مرفوض
  },

  // ألوان الواجهة والخلفيات
  background: '#F8FAF8',       // خلفية عصرية فاتحة ونظيفة مريحة للعين
  surface: '#FFFFFF',          // أبيض ناصع للبطاقات والعناصر العائمة
  surfaceAlt: '#F3F4F6',       // سطح رمادي ناعم
  
  // ألوان النصوص
  text: '#1F2937',             // نص رئيسي رمادي داكن فخم
  textSecondary: '#6B7280',    // نص فرعي
  textMuted: '#9CA3AF',        // نص خافت
  textInverted: '#FFFFFF',     // نص أبيض ناصع فوق الخلفيات الداكنة

  // ألوان الحدود والفواصل
  border: '#E5E7EB',           // حدود ناعمة للبطاقات (White Card border #E5E7EB)
  borderLight: '#ECEFEA',      // حدود خفيفة جداً
  borderFocus: '#1B4D3E',      // لون التحديد للتركيز على الحقول

  // ألوان الإشعارات والتنبيهات
  accent: '#E65100',           // لون مميز للتحذيرات
  error: '#EF4444',            // الأخطاء والرفض
  errorLight: '#FEE2E2',       // خلفية بطاقات الأخطاء
  warning: '#F59E0B',          // تنبيهات الحالات المعلقة
  warningLight: '#FEF3C7',     // خلفية التنبيهات المعلقة
  success: '#22C55E',          // النجاح والاعتماد
  successLight: '#DCFCE7',     // خلفية بطاقات النجاح
} as const;
