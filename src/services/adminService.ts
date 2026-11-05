/**
 * خدمة المشرفين وإدارة المنصة (Admin Service)
 * 
 * بالدارجة: هذا السيرفيس خاص بالأدمن فقط:
 * 1. مراجعة وقبول أو رفض الأماكن والحاويات المقترحة من المواطنين.
 * 2. تغيير حالات الشكاوى والبلاغات (استلام، قيد الإصلاح، تم الإصلاح، مرفوض) مع تدوين ملاحظات رسمية.
 * 3. حظر أو فك حظر المستخدمين المخالفين للقواعد.
 * 4. متابعة حجم الطلب في كل حي لتزويد البلدية بالتقارير.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Place, PlaceReport, ReportStatus, UserProfile } from '../types';
import { ReportService } from './reportService';
import { VoteService } from './voteService';

export interface AdminOverviewStats {
  pendingPlacesCount: number;
  openReportsCount: number;
  overdueReportsCount: number;
  totalVotesCount: number;
}

export class AdminService {
  /**
   * جلب جميع الأماكن المعلقة التي تنتظر موافقة المشرف (verified == false)
   */
  static async getPendingPlaces(): Promise<Place[]> {
    if (!db) return [];

    try {
      const placesCol = collection(db, 'places');
      const q = query(placesCol, where('verified', '==', false));
      const snapshot = await getDocs(q);

      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Place, 'id'>),
      }));

      if (items.length === 0) {
        const qPending = query(placesCol, where('status', '==', 'pending'));
        const snapPending = await getDocs(qPending);
        return snapPending.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Place, 'id'>),
        }));
      }

      return items;
    } catch (error) {
      console.error('خطأ في جلب الأماكن المعلقة:', error);
      return [];
    }
  }

  /**
   * قبول المكان المقترح وتوثيقه ليصبح معتمداً وظاهراً لجميع المواطنين على الخريطة
   */
  static async approvePlace(placeId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase غير متصل.');
    }

    const placeRef = doc(db, 'places', placeId);
    await updateDoc(placeRef, {
      verified: true,
      status: 'approved',
      step: 3,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * رفض المكان المقترح
   */
  static async rejectPlace(placeId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase غير متصل.');
    }

    const placeRef = doc(db, 'places', placeId);
    await updateDoc(placeRef, {
      status: 'rejected',
      step: 2,
      verified: false,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * جلب كافة التقارير والشكاوى مع دعم الفلترة حسب الحالة
   */
  static async getAllReports(statusFilter?: ReportStatus): Promise<PlaceReport[]> {
    if (!db) return [];

    try {
      const reportsCol = collection(db, 'placeReports');
      const q = statusFilter
        ? query(reportsCol, where('status', '==', statusFilter))
        : query(reportsCol);

      const snapshot = await getDocs(q);
      const reports = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PlaceReport, 'id'>),
      }));

      // ترتيب التقارير: المتأخر أولاً (overdue) ثم حسب الأحدث
      return reports.sort((a, b) => {
        const aOverdue = ReportService.isReportOverdue(a);
        const bOverdue = ReportService.isReportOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return b.createdAt - a.createdAt;
      });
    } catch (error) {
      console.error('خطأ في جلب تقارير المشرف:', error);
      return [];
    }
  }

  /**
   * تغيير حالة تقرير مع إضافة الملاحظة في سجل التاريخ
   */
  static async updateReportStatus(
    reportId: string,
    newStatus: ReportStatus,
    adminUid: string,
    note?: string
  ): Promise<void> {
    return ReportService.updateReportStatus(reportId, adminUid, newStatus, note);
  }

  /**
   * جلب قائمة المستخدمين المسجلين في النظام
   */
  static async getUsersList(): Promise<UserProfile[]> {
    if (!db) return [];

    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      return snapshot.docs.map((d) => ({
        ...(d.data() as UserProfile),
        uid: d.id,
      }));
    } catch (error) {
      console.error('خطأ في جلب قائمة المستخدمين:', error);
      return [];
    }
  }

  /**
   * حظر أو فك حظر مستخدم
   */
  static async setUserBanStatus(uid: string, isBanned: boolean): Promise<void> {
    if (!db) {
      throw new Error('Firebase غير متصل.');
    }

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isBanned,
      updatedAt: Date.now(),
    });
  }

  /**
   * جلب ملخص عام للإحصائيات الحيوية للوحة التحكم
   */
  static async getOverviewStats(): Promise<AdminOverviewStats> {
    const [pendingPlaces, allReports, demandStats] = await Promise.all([
      this.getPendingPlaces(),
      this.getAllReports(),
      VoteService.getDemandStats(),
    ]);

    const openReports = allReports.filter(
      (r) => r.status === 'sent' || r.status === 'received' || r.status === 'in_repair'
    );
    const overdueReports = allReports.filter((r) => ReportService.isReportOverdue(r));

    const totalVotes = Object.values(demandStats).reduce((sum, count) => sum + count, 0);

    return {
      pendingPlacesCount: pendingPlaces.length,
      openReportsCount: openReports.length,
      overdueReportsCount: overdueReports.length,
      totalVotesCount: totalVotes,
    };
  }
}
