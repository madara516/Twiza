/**
 * إعدادات المناطق (Region-Agnostic Architecture)
 * 
 * منصة "التويزة" مصممة للتوسع في جميع الولايات الجزائرية مستقبلاً.
 * ولاية الأغواط هي منطقة الإطلاق النموذجية الحالية (Active Pilot Region).
 */

export interface PilotRegionConfig {
  id: string;
  nameAr: string;
  nameEn: string;
  center: [number, number]; // [latitude, longitude]
  defaultZoom: number;
}

export const ACTIVE_REGION: PilotRegionConfig = {
  id: 'laghouat',
  nameAr: 'الأغواط',
  nameEn: 'Laghouat',
  center: [33.8000, 2.8650],
  defaultZoom: 15,
};
