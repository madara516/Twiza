/**
 * خدمة تصويت طلب حاوية في الحي ("نحتاجو حاوية هنا")
 * 
 * بالدارجة: هذا السيرفيس يسمح للمواطنين باش يصوتوا على الأحياء اللي ناقصين حاويات،
 * كل مواطن عنده صوت واحد فقط في كل حي (docId = neighborhood_uid) لمنع التكرار،
 * والأدمن يشوف الإحصائيات باش يحدد الأولويات وين لازم البلدية تحط حاويات جديدة.
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import { db } from './firebase';
import { Neighborhood } from '../constants/laghouat';
import { NeedBinVote } from '../types';

export class VoteService {
  /**
   * تسجيل تصويت مواطن لحاجة حي إلى حاوية جديدة
   * يتم استخدام `${neighborhood}_${uid}` كمعرّف للوثيقة لضمان صوت واحد فقط لكل مواطن في كل حي
   */
  static async voteForBin(neighborhood: Neighborhood, uid: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase غير متصل. يرجى مراجعة الإعدادات.');
    }
    if (!uid) {
      throw new Error('يجب تسجيل الدخول للتصويت على طلب حاوية.');
    }
    if (!neighborhood) {
      throw new Error('يرجى تحديد الحي المطلوب.');
    }

    const voteDocId = `${neighborhood}_${uid}`;
    const voteRef = doc(db, 'needBinVotes', voteDocId);

    // التحقق مسبقاً إذا كان قد صوت بالفعل
    const existingSnap = await getDoc(voteRef);
    if (existingSnap.exists()) {
      throw new Error('لقد قمت بالتصويت مسبقاً لهذا الحي! نشكر حرصك واهتمامك 🙌');
    }

    const voteData: Omit<NeedBinVote, 'id'> = {
      neighborhood,
      uid,
      createdAt: Date.now(),
    };

    await setDoc(voteRef, voteData);
  }

  /**
   * التحقق مما إذا كان المستخدم قد صوت بالفعل لحي معين
   */
  static async hasVoted(neighborhood: Neighborhood, uid: string): Promise<boolean> {
    if (!db || !uid || !neighborhood) {
      return false;
    }

    try {
      const voteDocId = `${neighborhood}_${uid}`;
      const voteRef = doc(db, 'needBinVotes', voteDocId);
      const snap = await getDoc(voteRef);
      return snap.exists();
    } catch (error) {
      console.warn('تعذر جلب حالة التصويت للحي:', error);
      return false;
    }
  }

  /**
   * جلب إحصائيات الطلب على الحاويات مجمعة حسب الأحياء (مخصص للمشرفين والبلدية)
   * يرجع كائن: { 'وسط المدينة': 15, 'الواحات': 8, ... }
   */
  static async getDemandStats(): Promise<Record<string, number>> {
    if (!db) {
      return {};
    }

    try {
      const votesCol = collection(db, 'needBinVotes');
      const snapshot = await getDocs(votesCol);

      const stats: Record<string, number> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as NeedBinVote;
        const nh = data.neighborhood;
        if (nh) {
          stats[nh] = (stats[nh] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الطلب على الحاويات:', error);
      return {};
    }
  }
}
