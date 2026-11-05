/**
 * ثوابت منطقة الأغواط (منطقة الإطلاق التجريبية الأولى)
 * 
 * بالدارجة: هاد الملف يستورد الإعدادات من regions.ts ويخلي التوافق مع الكود السابق،
 * مع اعتبار الأغواط هي منطقة الانطلاق الأولى.
 */

import { ACTIVE_REGION, isLocationInRegion, RegionBounds } from './regions';

export const LAGHOUAT_CENTER = {
  latitude: ACTIVE_REGION.center.latitude,
  longitude: ACTIVE_REGION.center.longitude,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
} as const;

export const LAGHOUAT_BOUNDING_BOX = {
  minLatitude: ACTIVE_REGION.bounds.minLat,
  maxLatitude: ACTIVE_REGION.bounds.maxLat,
  minLongitude: ACTIVE_REGION.bounds.minLng,
  maxLongitude: ACTIVE_REGION.bounds.maxLng,
} as const;

export const NEIGHBORHOODS = ACTIVE_REGION.neighborhoods;

export type Neighborhood = (typeof NEIGHBORHOODS)[number];

/**
 * دالة للتأكد هل الإحداثيات داخل النطاق الجغرافي للمنطقة النشطة
 */
export function inLaghouat(location: { latitude: number; longitude: number }): boolean {
  return isLocationInRegion(location.latitude, location.longitude, ACTIVE_REGION);
}
