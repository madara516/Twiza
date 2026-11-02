/**
 * دوال مساعدة عامة (Utilities)
 * 
 * بالدارجة: دوال حسابية وتنسيقية عامة نحتاجوها في التطبيق.
 */

/**
 * تنسيق المسافة بالأمتار أو الكيلومترات
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} م`;
  }
  return `${(meters / 1000).toFixed(1)} كم`;
}
