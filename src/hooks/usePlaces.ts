/**
 * خطاف إدارة الأماكن الحية (usePlaces Hook)
 * 
 * بالدارجة: هذا الـ Hook يسهل جلب الأماكن وتحديثها (Pull-to-refresh)
 * مع إدارة دقيقة لحالات التحميل والأخطاء باش الواجهة تبقى سريعة وما تتبلوكاش.
 */

import { useState, useEffect, useCallback } from 'react';
import { Place, GeoLocation } from '../types';
import { PlaceService } from '../services/placeService';
import { sortPlacesByDistance, PlaceWithDistance } from '../utils/haversine';

export function usePlaces(userLocation?: GeoLocation | null, userUid?: string | null) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const verifiedData = await PlaceService.getVerifiedPlaces();

      if (userUid) {
        // جلب أماكن المستخدم الخاصة (بما فيها غير الموثقة لتظهر له على خريطته فوراً مع صورته)
        const myPlaces = await PlaceService.getMyPlaces(userUid);
        const unverifiedMine = myPlaces.filter((p) => !p.verified);
        const combined = [...verifiedData];
        for (const mp of unverifiedMine) {
          if (!combined.some((p) => p.id === mp.id)) {
            combined.push(mp);
          }
        }
        setPlaces(combined);
      } else {
        setPlaces(verifiedData);
      }
    } catch (err: any) {
      console.error('فشل جلب الأماكن:', err);
      setError('تعذر تحميل بيانات الأماكن، يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // حساب الأماكن المرتبة حسب المسافة
  const nearestPlaces: PlaceWithDistance[] = userLocation
    ? sortPlacesByDistance(userLocation, places)
    : [];

  return {
    places,
    nearestPlaces,
    loading,
    error,
    refresh: fetchPlaces,
  };
}
