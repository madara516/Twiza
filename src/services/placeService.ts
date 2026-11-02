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
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Place, PlaceKind, GeoLocation } from '../types';
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
    const docData: Omit<Place, 'id'> = {
      ...placeData,
      verified: true, // الأدمن فقط يمكنه إنشاء مكان موثق مباشرة
      owner: 'municipality',
      addedBy: adminUid,
      createdAt: now,
      updatedAt: now,
    };

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
}
