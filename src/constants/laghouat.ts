/**
 * ثوابت منطقة الأغواط (منطقة الإطلاق التجريبية الأولى)
 * 
 * تحتوي على الإحداثيات الدقيقة لجميع أحياء الأغواط الـ 28 مع مراكزها الجغرافية.
 */

import { ACTIVE_REGION, isLocationInRegion, RegionBounds } from './regions';

export const LAGHOUAT_CENTER = {
  latitude: 33.8000,
  longitude: 2.8650,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
} as const;

export const LAGHOUAT_BOUNDING_BOX = {
  minLatitude: ACTIVE_REGION.bounds.minLat,
  maxLatitude: ACTIVE_REGION.bounds.maxLat,
  minLongitude: ACTIVE_REGION.bounds.minLng,
  maxLongitude: ACTIVE_REGION.bounds.maxLng,
} as const;

export const NEIGHBORHOODS = [
  { id: 'gharbiya',     nameAr: 'الغربية',               center: [33.7995, 2.8590], active: true },
  { id: 'safah',        nameAr: 'الصفاح',                center: [33.7950, 2.8680], active: true },
  { id: 'zouqaq-hajaj', nameAr: 'زقاق الحجاج',           center: [33.8020, 2.8780], active: true },
  { id: 'dhalaa',       nameAr: 'الضلعة',                center: [33.8040, 2.8710], active: true },
  { id: 'chtit',        nameAr: 'الشطيط',                center: [33.8120, 2.8850], active: true },
  { id: 'sidi-yanes',   nameAr: 'سيدي يانس',             center: [33.8015, 2.8640], active: true },
  { id: 'zouqaq-taqa',  nameAr: 'زقاق الطاقة',           center: [33.7985, 2.8730], active: true },
  { id: 'wahat-nord',   nameAr: 'الواحات الشمالية',      center: [33.8090, 2.8750], active: true },
  { id: 'centre-ville', nameAr: 'وسط المدينة',           center: [33.8000, 2.8650], active: true },
  { id: 'ksar-bzaim',   nameAr: 'قصر البزائم (زوايمو)',  center: [33.7920, 2.8820], active: false },
  { id: 'sadiqiya',     nameAr: 'الصادقية (قصر الفروج)', center: [33.7960, 2.8880], active: false },
  { id: 'miqdar',       nameAr: 'المقدر',                center: [33.7880, 2.8550], active: false },
  { id: 'zbara',        nameAr: 'الزبارة',               center: [33.8060, 2.8610], active: false },
  { id: 'gabou',        nameAr: 'القابو',                center: [33.8160, 2.8690], active: false },
  { id: 'sawadiq',      nameAr: 'الصوادق',               center: [33.8140, 2.8760], active: false },
  { id: 'maqta',        nameAr: 'المقطع',                center: [33.7850, 2.8620], active: false },
  { id: 'qawatin',      nameAr: 'القواطين',              center: [33.8220, 2.8720], active: false },
  { id: 'maamoura',     nameAr: 'المعمورة',              center: [33.7800, 2.8450], active: false },
  { id: 'maqam',        nameAr: 'المقام',                center: [33.7910, 2.8500], active: false },
  { id: 'wiam',         nameAr: 'الوئام',                center: [33.7940, 2.8420], active: false },
  { id: 'musalaha',     nameAr: 'المصالحة',              center: [33.7890, 2.8380], active: false },
  { id: 'salam',        nameAr: 'السلام',                center: [33.8030, 2.8480], active: false },
  { id: 'sanawbar',     nameAr: 'الصنوبر',               center: [33.7970, 2.8520], active: false },
  { id: 'mustaqbal',    nameAr: 'المستقبل',              center: [33.8080, 2.8450], active: false },
  { id: 'saada',        nameAr: 'السعادة',               center: [33.8050, 2.8540], active: false },
  { id: 'bouknefous',   nameAr: 'بوخنفوس',               center: [33.8350, 2.8900], active: false },
  { id: 'mahafir',      nameAr: 'المحافير',              center: [33.7720, 2.8300], active: false },
  { id: 'other',        nameAr: 'حي آخر',                center: null,              active: true },
] as const;

export type NeighborhoodItem = (typeof NEIGHBORHOODS)[number];
export type Neighborhood = (typeof NEIGHBORHOODS)[number]['nameAr'] | string;

export const ACTIVE_NEIGHBORHOODS = NEIGHBORHOODS.filter((n) => n.active);

export function getNeighborhoodById(id: string): NeighborhoodItem | undefined {
  return NEIGHBORHOODS.find((n) => n.id === id);
}

export function getNeighborhoodByName(name: string): NeighborhoodItem | undefined {
  return NEIGHBORHOODS.find((n) => n.nameAr === name);
}

export function getNeighborhoodCenter(nameOrId: string): [number, number] | null {
  const item = NEIGHBORHOODS.find((n) => n.nameAr === nameOrId || n.id === nameOrId);
  return item && item.center ? [item.center[0], item.center[1]] : null;
}

/**
 * دالة للتأكد هل الإحداثيات داخل النطاق الجغرافي للمنطقة النشطة
 */
export function inLaghouat(location: { latitude: number; longitude: number }): boolean {
  return isLocationInRegion(location.latitude, location.longitude, ACTIVE_REGION);
}
