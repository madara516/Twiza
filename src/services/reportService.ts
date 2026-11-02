/**
 * خدمة التقارير والشكاوى (Report Service)
 * 
 * بالدارجة: هذا السيرفيس يدير دورة حياة البلاغات والشكاوى (placeReports) للمواطنين،
 * من الإرسال (sent) إلى الاستلام (received) والإصلاح (in_repair ثم fixed)،
 * مع تنبيه الـ 14 يوم إذا تأخر الرد، وتأكيد المواطن "هل تم الإصلاح فعلاً؟".
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  PlaceReport,
  ReportType,
  ReportStatus,
  ReportHistoryItem,
  GeoLocation,
} from '../types';
import { Neighborhood } from '../constants/laghouat';
import { ACTIVE_REGION, isLocationInRegion, OUT_OF_SERVICE_MESSAGE } from '../constants/regions';

export class ReportService {
  /**
   * إنشاء تقرير جديد من المواطن
   */
  static async createReport(
    params: {
      placeId?: string | null;
      type: ReportType;
      description: string;
      photoURL?: string | null;
      neighborhood: Neighborhood;
      location: GeoLocation;
    },
    reporterId: string
  ): Promise<string> {
    if (!db) {
      throw new Error('Firebase غير متصل. يرجى مراجعة الإعدادات.');
    }

    const trimmedDesc = params.description.trim();
    if (!trimmedDesc) {
      throw new Error('يرجى كتابة وصف للتقرير.');
    }
    if (trimmedDesc.length > 1000) {
      throw new Error('وصف التقرير يجب أن لا يتجاوز 1000 حرف.');
    }

    if (!isLocationInRegion(params.location.latitude, params.location.longitude, ACTIVE_REGION)) {
      throw new Error(OUT_OF_SERVICE_MESSAGE);
    }

    const now = Date.now();
    const initialHistory: ReportHistoryItem = {
      status: 'sent',
      by: reporterId,
      at: now,
    };

    const docData: Omit<PlaceReport, 'id'> = {
      placeId: params.placeId || null,
      type: params.type,
      status: 'sent',
      description: trimmedDesc,
      photoURL: params.photoURL || null,
      neighborhood: params.neighborhood,
      location: params.location,
      reporterId,
      reporterConfirmed: null,
      history: [initialHistory],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'placeReports'), docData);
    return docRef.id;
  }

  /**
   * جلب تقارير المواطن الحالي
   */
  static async getMyReports(reporterId: string): Promise<PlaceReport[]> {
    if (!db) return [];

    try {
      const reportsCol = collection(db, 'placeReports');
      const q = query(reportsCol, where('reporterId', '==', reporterId));
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<PlaceReport, 'id'>),
      }));

      // ترتيب محلي بالأحدث أولاً
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('خطأ في جلب تقارير المستخدم:', error);
      return [];
    }
  }

  /**
   * إجابة صاحب التقرير: هل تم الإصلاح فعلاً؟ (نعم / لا)
   * مسموح بها فقط عندما تكون الحالة 'fixed'
   */
  static async confirmFix(
    reportId: string,
    reporterId: string,
    isFixed: boolean
  ): Promise<void> {
    if (!db) return;

    const reportRef = doc(db, 'placeReports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) {
      throw new Error('التقرير غير موجود.');
    }

    const data = snap.data() as PlaceReport;
    if (data.reporterId !== reporterId) {
      throw new Error('لا يمكنك تأكيد تقرير مستخدم آخر.');
    }

    if (data.status !== 'fixed') {
      throw new Error('لا يمكن تأكيد الإصلاح إلا بعد أن تعلن البلدية إتمامه.');
    }

    await updateDoc(reportRef, {
      reporterConfirmed: isFixed,
      updatedAt: Date.now(),
    });
  }

  /**
   * تغيير حالة التقرير (للأدمن أو البلدية)
   */
  static async updateReportStatus(
    reportId: string,
    byUid: string,
    newStatus: ReportStatus,
    note?: string
  ): Promise<void> {
    if (!db) return;

    const reportRef = doc(db, 'placeReports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) {
      throw new Error('التقرير غير موجود.');
    }

    const currentData = snap.data() as PlaceReport;
    const now = Date.now();

    const historyEntry: ReportHistoryItem = {
      status: newStatus,
      by: byUid,
      at: now,
      ...(note ? { note: note.trim() } : {}),
    };

    const updatedHistory = [...(currentData.history || []), historyEntry];

    await updateDoc(reportRef, {
      status: newStatus,
      history: updatedHistory,
      updatedAt: now,
    });
  }

  /**
   * التحقق مما إذا كان التقرير متأخراً عن موعده (Overdue > 14 days)
   * يحسب تلقائياً لدى الكلاينت بدون تخزينه
   */
  static isReportOverdue(report: PlaceReport): boolean {
    const isPending = report.status === 'sent' || report.status === 'received';
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const age = Date.now() - report.createdAt;
    return isPending && age > fourteenDaysMs;
  }
}
