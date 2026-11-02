/**
 * حساب المسافات الجغرافية (Haversine Formula)
 * 
 * بالدارجة: هذه هي المعادلة الرياضية (Haversine) اللي تحسب المسافة الحقيقية بين
 * موقع المواطن (GPS) وبين كل حاوية أو نقطة رمي نفايات بالمتر والكيلومتر، وترتبهم من الأقرب للأبعد.
 */

import { GeoLocation, Place } from '../types';

const EARTH_RADIUS_METERS = 6371000; // نصف قطر الأرض بالمتر

/**
 * تحويل الدرجات إلى راديان
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * حساب المسافة الفاصلة بين نقطتين جغرافيتين بالمتر باستخدام صيغة Haversine
 */
export function calculateDistance(
  coord1: GeoLocation,
  coord2: GeoLocation
): number {
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * تنسيق المسافة بالمتر أو الكيلومتر للعرض باللغة العربية
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} م`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} كم`;
}

export type PlaceWithDistance = Place & {
  distance: number;
  formattedDistance: string;
};

/**
 * ترتيب قائمة الأماكن من الأقرب إلى الأبعد بالنسبة لموقع المستخدم
 */
export function sortPlacesByDistance(
  userLocation: GeoLocation,
  places: Place[]
): PlaceWithDistance[] {
  return places
    .map((place) => {
      const distance = calculateDistance(userLocation, place.location);
      return {
        ...place,
        distance,
        formattedDistance: formatDistance(distance),
      };
    })
    .sort((a, b) => a.distance - b.distance);
}
