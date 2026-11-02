/**
 * خدمة إدارة الأماكن والحاويات (Place Service)
 * 
 * بالدارجة: هذا السيرفيس هو المسؤول على جلب الأماكن المعتمدة من Firestore،
 * ولازم الفلتر يكون verified == true كيما تفرضه قواعد الأمان (Firestore Rules).
 * وفيه دالة الإضافة السريعة للأدمن لبذر الأماكن الأولية (Seeding).
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Place, PlaceKind, GeoLocation, WildDumpSeverity } from '../types';
import { Neighborhood } from '../constants/laghouat';
import { ACTIVE_REGION, isLocationInRegion, OUT_OF_SERVICE_MESSAGE } from '../constants/regions';

// عينات أولية للأماكن المعتمدة في الأغواط في حال عدم ربط .env بعد
export const SEED_LAGHOUAT_PLACES: Omit<Place, 'id'>[] = [
  {
    kind: 'bin',
    location: { latitude: 33.8015, longitude: 2.8640 },
    neighborhood: 'وسط المدينة (البلاد)',
    photoURL: null,
    notes: 'حاوية بلاستيكية خضراء جديدة بجانب ساحة الشهداء.',
    owner: 'municipality',
    verified: true,
    addedBy: 'admin',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    status: 'ok',
  },
  {
    kind: 'collection_point',
    location: { latitude: 33.8050, longitude: 2.8685 },
    neighborhood: 'الواحات',
    photoURL: null,
    notes: 'نقطة تجميع كبرى بحي الواحات، تفريغ الحاويات كل يوم صباحاً.',
    owner: 'municipality',
    verified: true,
    addedBy: 'admin',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now(),
    status: 'ok',
    schedule: 'يومياً الساعة 07:00 صباحاً و 18:00 مساءً',
    accepts: ['نفايات منزلية', 'كرتون وبلاستيك'],
  },
  {
    kind: 'wild_dump',
    location: { latitude: 33.7960, longitude: 2.8610 },
    neighborhood: 'الوئام',
    photoURL: null,
    notes: 'تراكم نفايات صلبة عند المخرج الخلفي للحي، بحاجة لتدخل.',
    owner: 'informal',
    verified: true,
    addedBy: 'citizen',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    severity: 'medium',
  },
  {
    kind: 'bin',
    location: { latitude: 33.8080, longitude: 2.8710 },
    neighborhood: 'المقام',
    photoURL: null,
    notes: 'حاوية معدنية قرب مسجد المقام.',
    owner: 'municipality',
    verified: true,
    addedBy: 'admin',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
    status: 'ok',
  },
];

/**
 * دالة مساعدة لحذف أي حقل يحمل القيمة undefined لأن Firestore يرفضها تماماً
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export class PlaceService {
  /**
   * جلب الأماكن المعتمدة فقط (verified == true)
   */
  static async getVerifiedPlaces(): Promise<Place[]> {
    if (!db) {
      // في حالة لم يتم إعداد .env بعد، إرجاع الأماكن المبدئية للأغواط
      return SEED_LAGHOUAT_PLACES.map((p, idx) => ({
        ...p,
        id: `seed-place-${idx + 1}`,
      }));
    }

    try {
      const placesCol = collection(db, 'places');
      // الفلتر الصارم المفروض من قواعد الأمان
      const q = query(placesCol, where('verified', '==', true));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return SEED_LAGHOUAT_PLACES.map((p, idx) => ({
          ...p,
          id: `seed-place-${idx + 1}`,
        }));
      }

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Place, 'id'>),
      }));
    } catch (error) {
      console.error('خطأ في جلب الأماكن من Firestore:', error);
      // تجنب توقف التطبيق أو تعليق الـ Spinner
      return SEED_LAGHOUAT_PLACES.map((p, idx) => ({
        ...p,
        id: `seed-place-${idx + 1}`,
      }));
    }
  }

  /**
   * إضافة سريعة لمكان معتمد (مخصص للأدمن لبذر البيانات Seeding)
   */
  static async quickAddVerifiedPlace(
    placeData: Omit<Place, 'id' | 'createdAt' | 'updatedAt' | 'verified' | 'owner'>,
    adminUid: string
  ): Promise<string> {
    if (!db) {
      throw new Error('Firebase غير متصل.');
    }

    if (!isLocationInRegion(placeData.location.latitude, placeData.location.longitude, ACTIVE_REGION)) {
      throw new Error(OUT_OF_SERVICE_MESSAGE);
    }

    const now = Date.now();
    const docData = sanitizeForFirestore({
      ...placeData,
      photoURL: placeData.photoURL ?? null,
      verified: true, // الأدمن فقط يمكنه إنشاء مكان موثق مباشرة
      owner: 'municipality',
      addedBy: adminUid,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, 'places'), docData);
    return docRef.id;
  }

  /**
   * بذر الأماكن النموذجية في Firestore (Seed Demo Places للأدمن)
   */
  static async seedInitialPlaces(adminUid: string): Promise<number> {
    if (!db) return 0;
    let count = 0;
    for (const place of SEED_LAGHOUAT_PLACES) {
      await addDoc(collection(db, 'places'), {
        ...place,
        addedBy: adminUid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      count++;
    }
    return count;
  }

  /**
   * جلب تاريخ آخر تأكيد "ما زالت هنا" للمكان
   */
  static async getLastConfirmationDate(placeId: string): Promise<number | null> {
    if (!db) return null;
    try {
      const confCol = collection(db, 'places', placeId, 'confirmations');
      const q = query(confCol, orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data().createdAt as number;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * إضافة مكان جديد من قِبل المواطن
   * 
   * يطبق القيود الصارمة:
   * 1. verified = false إجبارياً
   * 2. owner = 'informal' إجبارياً
   * 3. التحقق من وقوع الموقع داخل النطاق الجغرافي للمنطقة النشطة
   */
  static async createPlace(
    placeData: {
      kind: PlaceKind;
      location: GeoLocation;
      neighborhood: Neighborhood;
      photoURL: string | null;
      notes?: string;
      severity?: WildDumpSeverity;
      schedule?: string;
      accepts?: string[];
    },
    citizenUid: string
  ): Promise<string> {
    if (!db) {
      throw new Error('Firebase غير متصل. يرجى مراجعة الإعدادات.');
    }

    if (!isLocationInRegion(placeData.location.latitude, placeData.location.longitude, ACTIVE_REGION)) {
      throw new Error(OUT_OF_SERVICE_MESSAGE);
    }

    const now = Date.now();
    const docData = sanitizeForFirestore({
      kind: placeData.kind,
      location: placeData.location,
      neighborhood: placeData.neighborhood,
      photoURL: placeData.photoURL ?? null,
      notes: placeData.notes,
      severity: placeData.severity,
      schedule: placeData.schedule,
      accepts: placeData.accepts,
      verified: false, // غير موثق حتى توافق عليه البلدية
      owner: 'informal', // ملكية غير رسمية/مقدمة من مواطن
      addedBy: citizenUid,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, 'places'), docData);
    return docRef.id;
  }

  /**
   * جلب الأماكن التي أضافها المواطن الحالي (سواء كانت موثقة أو قيد المراجعة)
   */
  static async getMyPlaces(citizenUid: string): Promise<Place[]> {
    if (!db) return [];

    try {
      const placesCol = collection(db, 'places');
      const q = query(
        placesCol,
        where('addedBy', '==', citizenUid)
      );
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Place, 'id'>),
      }));

      // ترتيب محلي حسب تاريخ الإضافة تنازلياً لتفادي الحاجة لـ Composite Index
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('خطأ في جلب أماكن المستخدم:', error);
      return [];
    }
  }

  /**
   * تأكيد وجود المكان / الحاوية ("ما زالت هنا")
   * 
   * المعرّف إجباري أن يساوي uid لمنع التكرار (كل مواطن يحسب صوته مرة واحدة)
   */
  static async confirmPlace(placeId: string, citizenUid: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase غير متصل.');
    }

    const confRef = doc(db, 'places', placeId, 'confirmations', citizenUid);
    await setDoc(confRef, {
      uid: citizenUid,
      createdAt: Date.now(),
    });
  }

  /**
   * التحقق هل أكد المواطن هذا المكان مسبقاً
   */
  static async hasUserConfirmedPlace(placeId: string, citizenUid: string): Promise<boolean> {
    if (!db) return false;
    try {
      const confRef = doc(db, 'places', placeId, 'confirmations', citizenUid);
      const snap = await getDoc(confRef);
      return snap.exists();
    } catch {
      return false;
    }
  }

  /**
   * جلب إحصائيات التأكيدات (العدد الإجمالي وتاريخ آخر تأكيد مشتق)
   */
  static async getPlaceConfirmationsStats(
    placeId: string
  ): Promise<{ count: number; lastConfirmedAt: number | null }> {
    if (!db) return { count: 0, lastConfirmedAt: null };

    try {
      const confCol = collection(db, 'places', placeId, 'confirmations');
      const snap = await getDocs(confCol);
      const count = snap.size;

      if (count === 0) {
        return { count: 0, lastConfirmedAt: null };
      }

      let lastDate = 0;
      snap.docs.forEach((d) => {
        const at = d.data().createdAt;
        if (at && at > lastDate) lastDate = at;
      });

      return {
        count,
        lastConfirmedAt: lastDate > 0 ? lastDate : null,
      };
    } catch {
      return { count: 0, lastConfirmedAt: null };
    }
  }
}
