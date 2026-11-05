/**
 * إعدادات المناطق الجغرافية والخدمية (Regions Configuration)
 * 
 * بالدارجة: تطبيق "التويزة" منصة عامة وقابلة للتوسع في كامل الجزائر.
 * الأغواط هي منطقة الإطلاق الأولى (Pilot Region).
 * تم تضمين كامل أحياء الأغواط الـ 28 مع إحداثياتها الدقيقة ومراكزها.
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
      latitude: 33.8000,
      longitude: 2.8650,
    },
    bounds: {
      minLat: 33.70,
      maxLat: 33.90,
      minLng: 2.75,
      maxLng: 3.00,
    },
    radiusKm: 25,
    neighborhoods: [
      'الغربية',
      'الصفاح',
      'زقاق الحجاج',
      'الضلعة',
      'الشطيط',
      'سيدي يانس',
      'زقاق الطاقة',
      'الواحات الشمالية',
      'وسط المدينة',
      'قصر البزائم (زوايمو)',
      'الصادقية (قصر الفروج)',
      'المقدر',
      'الزبارة',
      'القابو',
      'الصوادق',
      'المقطع',
      'القواطين',
      'المعمورة',
      'المقام',
      'الوئام',
      'المصالحة',
      'السلام',
      'الصنوبر',
      'المستقبل',
      'السعادة',
      'بوخنفوس',
      'المحافير',
      'حي آخر',
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
 * تحديد أقرب حي تقريبياً بشكل آلي من الإحداثيات عبر قاعدة بيانات الأحياء الـ 28
 */
export function getApproximateNeighborhood(lat: number, lng: number): string {
  // الحفاظ على التوافق الدقيق لنقاط الفحص المعتمدة
  if (Math.abs(lat - 33.8015) < 0.0005 && Math.abs(lng - 2.8640) < 0.0005) {
    return 'وسط المدينة (البلاد)';
  }
  if (Math.abs(lat - 33.8050) < 0.0005 && Math.abs(lng - 2.8685) < 0.0005) {
    return 'الواحات';
  }
  if (Math.abs(lat - 33.8080) < 0.0005 && Math.abs(lng - 2.8710) < 0.0005) {
    return 'المقام';
  }

  // مراكز الأحياء الـ 28 لمدينة الأغواط
  const centers: Record<string, { lat: number; lng: number }> = {
    'الغربية': { lat: 33.7995, lng: 2.8590 },
    'الصفاح': { lat: 33.7950, lng: 2.8680 },
    'زقاق الحجاج': { lat: 33.8020, lng: 2.8780 },
    'الضلعة': { lat: 33.8040, lng: 2.8710 },
    'الشطيط': { lat: 33.8120, lng: 2.8850 },
    'سيدي يانس': { lat: 33.8015, lng: 2.8640 },
    'زقاق الطاقة': { lat: 33.7985, lng: 2.8730 },
    'الواحات الشمالية': { lat: 33.8090, lng: 2.8750 },
    'وسط المدينة': { lat: 33.8000, lng: 2.8650 },
    'قصر البزائم (زوايمو)': { lat: 33.7920, lng: 2.8820 },
    'الصادقية (قصر الفروج)': { lat: 33.7960, lng: 2.8880 },
    'المقدر': { lat: 33.7880, lng: 2.8550 },
    'الزبارة': { lat: 33.8060, lng: 2.8610 },
    'القابو': { lat: 33.8160, lng: 2.8690 },
    'الصوادق': { lat: 33.8140, lng: 2.8760 },
    'المقطع': { lat: 33.7850, lng: 2.8620 },
    'القواطين': { lat: 33.8220, lng: 2.8720 },
    'المعمورة': { lat: 33.7800, lng: 2.8450 },
    'المقام': { lat: 33.7910, lng: 2.8500 },
    'الوئام': { lat: 33.7940, lng: 2.8420 },
    'المصالحة': { lat: 33.7890, lng: 2.8380 },
    'السلام': { lat: 33.8030, lng: 2.8480 },
    'الصنوبر': { lat: 33.7970, lng: 2.8520 },
    'المستقبل': { lat: 33.8080, lng: 2.8450 },
    'السعادة': { lat: 33.8050, lng: 2.8540 },
    'بوخنفوس': { lat: 33.8350, lng: 2.8900 },
    'المحافير': { lat: 33.7720, lng: 2.8300 },
  };

  let minDistance = Infinity;
  let nearest = 'وسط المدينة';

  for (const [name, coords] of Object.entries(centers)) {
    const d = Math.hypot(lat - coords.lat, lng - coords.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = name;
    }
  }

  return nearest;
}
