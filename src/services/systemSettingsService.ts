/**
 * خدمة إعدادات النظام وتأكيدات المواطنين (System Settings & Verification Rules)
 * 
 * بالدارجة: هاد السيرفيس يدير إعدادات التطبيق من قاعدة البيانات Firebase،
 * مثل: عدد تأكيدات المواطنين المطلوبة لغلق البلاغ (الافتراضي 4)، ومسافة الرصد (15 متر).
 * الإدارة تقدر تبدل هاد العدد في أي وقت من لوحة التحكم.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SystemConfig } from '../types';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  verificationThreshold: 4,
  proximityDistanceMeters: 15,
};

let inMemoryConfig: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG };

export class SystemSettingsService {
  private static readonly SETTINGS_COLLECTION = 'system_settings';
  private static readonly CONFIG_DOC = 'config';

  /**
   * جلب إعدادات النظام الحالية من Firestore مع قيمة احتياطية آمنة (Fallback)
   */
  static async getConfig(): Promise<SystemConfig> {
    try {
      if (!db) {
        return inMemoryConfig;
      }
      const docRef = doc(db, this.SETTINGS_COLLECTION, this.CONFIG_DOC);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<SystemConfig>;
        inMemoryConfig = {
          verificationThreshold: typeof data.verificationThreshold === 'number' && data.verificationThreshold > 0
            ? data.verificationThreshold
            : DEFAULT_SYSTEM_CONFIG.verificationThreshold,
          proximityDistanceMeters: typeof data.proximityDistanceMeters === 'number' && data.proximityDistanceMeters > 0
            ? data.proximityDistanceMeters
            : DEFAULT_SYSTEM_CONFIG.proximityDistanceMeters,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        };
      }
    } catch (err) {
      console.warn('تعذر جلب إعدادات النظام من Firestore، سيتم استخدام الإعدادات الافتراضية:', err);
    }
    return inMemoryConfig;
  }

  /**
   * الحصول الفوري على عدد التأكيدات المطلوبة (مفيدة للقراءة المتزامنة في الواجهة)
   */
  static getCachedVerificationThreshold(): number {
    return inMemoryConfig.verificationThreshold;
  }

  /**
   * الحصول على عتبة التأكيدات من الخادم
   */
  static async getVerificationThreshold(): Promise<number> {
    const config = await this.getConfig();
    return config.verificationThreshold;
  }

  /**
   * تحديث عدد التأكيدات من طرف المشرف (Admin)
   */
  static async updateVerificationThreshold(newThreshold: number, adminUid?: string): Promise<void> {
    if (newThreshold < 1 || newThreshold > 50) {
      throw new Error('يجب أن يكون عدد التأكيدات بين 1 و 50.');
    }

    inMemoryConfig = {
      ...inMemoryConfig,
      verificationThreshold: newThreshold,
      updatedAt: Date.now(),
      updatedBy: adminUid || 'admin',
    };

    if (db) {
      const docRef = doc(db, this.SETTINGS_COLLECTION, this.CONFIG_DOC);
      await setDoc(docRef, inMemoryConfig, { merge: true });
    }
  }
}
