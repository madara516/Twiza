/**
 * تعاريف الأنواع الأساسية للمشروع (Types & Interfaces)
 * 
 * بالدارجة: هذا الملف فيه قوالب البيانات (Types) باش تايب سكريبت يحمينا من الأخطاء
 * ويعرف واش كاين داخل كل كائن (User, Place, Report...).
 */

import { Neighborhood } from '../constants/laghouat';

export type UserRole = 'citizen' | 'admin' | 'municipality';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  language: 'ar' | 'en';
  role: UserRole;
  isBanned: boolean;
  createdAt: number;
  updatedAt: number;
}

export type PlaceKind = 'bin' | 'collection_point' | 'wild_dump';

export type BinStatus = 'ok' | 'broken' | 'full' | 'missing';
export type WildDumpStatus = 'active' | 'cleaned';
export type WildDumpSeverity = 'small' | 'medium' | 'large';
export type Severity = WildDumpSeverity;

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  kind: PlaceKind;
  location: GeoLocation;
  neighborhood: Neighborhood;
  photoURL: string | null;
  notes?: string;
  owner: 'municipality' | 'informal';
  verified: boolean;
  addedBy: string;
  createdAt: number;
  updatedAt: number;
  status?: BinStatus | WildDumpStatus;
  binCount?: number;
  schedule?: string;
  accepts?: string[];
  severity?: WildDumpSeverity;
}

export type ReportType = 'broken' | 'full' | 'dirty_spot';
export type ReportStatus = 'sent' | 'received' | 'in_repair' | 'fixed' | 'rejected';

export interface ReportHistoryItem {
  status: ReportStatus;
  by: string;
  at: number;
  note?: string;
}

export interface PlaceReport {
  id: string;
  placeId: string | null;
  type: ReportType;
  status: ReportStatus;
  description: string;
  photoURL: string | null;
  neighborhood: Neighborhood;
  location: GeoLocation;
  reporterId: string;
  reporterConfirmed: boolean | null;
  history: ReportHistoryItem[];
  createdAt: number;
  updatedAt: number;
}
