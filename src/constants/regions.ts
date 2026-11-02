/**
 * إعدادات المناطق الجغرافية والخدمية (Regions Configuration)
 * 
 * بالدارجة: تطبيق "التويزة" منصة عامة وقابلة للتوسع في كامل الجزائر.
 * الأغواط هي منطقة الإطلاق الأولى (Pilot Region).
 * هنا نعرّفو المناطق، المركز وحدود الخدمة، باش كي نتوسّعو لولايات أخرى
 * نزيدو برك منطقة جديدة بلا ما نغيرو الكود.
 */

export interface RegionBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Region {
  id: string;
  nameAr: string;
  nameEn: string;
  center: {
    latitude: number;
    longitude: number;
  };
  bounds: RegionBounds;
  radiusKm?: number;
  neighborhoods: readonly string[];
}

export const REGIONS: Record<string, Region> = {
  laghouat: {
    id: 'laghouat',
    nameAr: 'الأغواط',
    nameEn: 'Laghouat',
    center: {
      latitude: 33.80,
      longitude: 2.865,
    },
    bounds: {
      minLat: 33.70,
      maxLat: 33.90,
      minLng: 2.75,
      maxLng: 3.00,
    },
    radiusKm: 20,
    neighborhoods: [
      'الواحات',
      'الوئام',
      'المقام',
      'وسط المدينة (البلاد)',
    ],
  },
};

/**
 * المنطقة النشطة حالياً (منطقة الإطلاق الأولى)
 */
export const ACTIVE_REGION: Region = REGIONS.laghouat;

/**
 * التحقق مما إذا كانت الإحداثيات تقع داخل نطاق المنطقة المحددة
 */
export function isLocationInRegion(
  lat: number,
  lng: number,
  region: Region = ACTIVE_REGION
): boolean {
  return (
    lat >= region.bounds.minLat &&
    lat <= region.bounds.maxLat &&
    lng >= region.bounds.minLng &&
    lng <= region.bounds.maxLng
  );
}

/**
 * رسالة التنبيه اللبقة عند التواجد خارج المنطقة النشطة
 */
export const OUT_OF_SERVICE_MESSAGE = `التطبيق متوفر حالياً في ${ACTIVE_REGION.nameAr} فقط، وقريباً في ولايات أخرى`;

/**
 * تحديد أقرب حي تقريبياً بشكل آلي من الإحداثيات في الخلفية دون إزعاج المستخدم باختيار يدوي
 */
export function getApproximateNeighborhood(lat: number, lng: number): 'الواحات' | 'الوئام' | 'المقام' | 'وسط المدينة (البلاد)' {
  const centers: Record<'الواحات' | 'الوئام' | 'المقام' | 'وسط المدينة (البلاد)', { lat: number; lng: number }> = {
    'وسط المدينة (البلاد)': { lat: 33.8015, lng: 2.8640 },
    'الواحات': { lat: 33.8050, lng: 2.8685 },
    'الوئام': { lat: 33.7960, lng: 2.8610 },
    'المقام': { lat: 33.8080, lng: 2.8710 },
  };

  let minDistance = Infinity;
  let nearest: 'الواحات' | 'الوئام' | 'المقام' | 'وسط المدينة (البلاد)' = 'وسط المدينة (البلاد)';

  for (const [name, coords] of Object.entries(centers)) {
    const d = Math.hypot(lat - coords.lat, lng - coords.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = name as any;
    }
  }

  return nearest;
}
