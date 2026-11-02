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

export function usePlaces(userLocation?: GeoLocation | null) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PlaceService.getVerifiedPlaces();
      setPlaces(data);
    } catch (err: any) {
      console.error('فشل جلب الأماكن:', err);
      setError('تعذر تحميل بيانات الأماكن، يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  }, []);

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
