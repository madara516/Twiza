/**
 * ثوابت مدينة الأغواط - Al-Twiza (التويزة)
 * 
 * Ce fichier définit les coordonnées géographiques, la boîte de délimitation (bounding box)
 * et la liste officielle des quartiers de Laghouat.
 * 
 * بالدارجة: هذا الملف فيه حدود الأغواط الجغرافية (GPS)، نقطة المركز، وقائمة الأحياء المعتمدة.
 * باش ما نقبلو حتى بلاصة خارج الأغواط لا في التيليفون ولا في الفايربيز.
 */

export const LAGHOUAT_CENTER = {
  latitude: 33.80,
  longitude: 2.865,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
} as const;

export const LAGHOUAT_BOUNDING_BOX = {
  minLatitude: 33.70,
  maxLatitude: 33.90,
  minLongitude: 2.75,
  maxLongitude: 3.00,
} as const;

export const NEIGHBORHOODS = [
  'الواحات',
  'الوئام',
  'المقام',
  'وسط المدينة (البلاد)',
] as const;

export type Neighborhood = (typeof NEIGHBORHOODS)[number];

/**
 * دالة للتأكد هل الإحداثيات داخل النطاق الجغرافي لبلدية الأغواط
 */
export function inLaghouat(location: { latitude: number; longitude: number }): boolean {
  return (
    location.latitude >= LAGHOUAT_BOUNDING_BOX.minLatitude &&
    location.latitude <= LAGHOUAT_BOUNDING_BOX.maxLatitude &&
    location.longitude >= LAGHOUAT_BOUNDING_BOX.minLongitude &&
    location.longitude <= LAGHOUAT_BOUNDING_BOX.maxLongitude
  );
}
