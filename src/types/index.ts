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
export type PlaceStatus = 'pending' | 'approved' | 'rejected' | BinStatus | WildDumpStatus;
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
  status?: PlaceStatus;
  binCount?: number;
  schedule?: string;
  accepts?: string[];
  severity?: WildDumpSeverity;
  confirmationsStillThere?: number;
  confirmationsResolved?: number;
  verifiedByCitizens?: string[];
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
  confirmationsStillThere?: number;
  confirmationsResolved?: number;
  verifiedByCitizens?: string[];
  history: ReportHistoryItem[];
  createdAt: number;
  updatedAt: number;
}

export interface SystemConfig {
  verificationThreshold: number; // default: 4
  proximityDistanceMeters: number; // default: 15
  updatedAt?: number;
  updatedBy?: string;
}

export type ProximityItemCategory = 'bin' | 'wild_dump' | 'report';
export type VerificationVote = 'still_there' | 'resolved';

export interface NeedBinVote {
  id: string; // `${neighborhood}_${uid}`
  neighborhood: Neighborhood;
  uid: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  neighborhood: string;
  senderId: string;
  senderName: string;
  senderRole: 'citizen' | 'admin';
  text: string;
  createdAt: number;
}
