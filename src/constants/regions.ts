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
