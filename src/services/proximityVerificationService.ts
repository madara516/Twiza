/**
 * محرك التحقق الجغرافي الذكي والتنبيهات الميدانية (Proximity Verification Engine)
 * 
 * بالدارجة: هاد السيرفيس يدير فحص المسافة بين المواطن والبلاغات أو الحاويات،
 * إذا قرب أقل من 15 متر، يرسل إشعار في المتصفح ويطلع بطاقة تفاعلية على طريقة Google Maps
 * يسأله واش المشكل ما زال كاين، مع زر سريع للإبلاغ إذا كاين خلل.
 * وإذا 4 مواطنين أكدوا أن المشكل تحل، البلاغ يتبدل أوتوماتيكياً إلى "تم الحل".
 */

import { Platform } from 'react-native';
import { doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from './firebase';
import { calculateDistance } from '../utils/haversine';
import { GeoLocation, Place, PlaceReport, ProximityItemCategory, VerificationVote } from '../types';
import { SystemSettingsService } from './systemSettingsService';

export interface ProximityPromptItem {
  id: string;
  category: ProximityItemCategory;
  title: string;
  question: string;
  distanceMeters: number;
  primaryActionLabel: string;   // ما زالت موجودة / نعم
  secondaryActionLabel: string; // تم تنظيفها / غير موجودة
  reportActionLabel: string;    // أبلغ عن مشكلة هنا
  location: GeoLocation;
  placeId?: string | null;
  reportType?: string;
}

// مدة التهدئة لمنع إزعاج المستخدم لنفس النقطة (30 دقيقة)
const COOLDOWN_DURATION_MS = 30 * 60 * 1000;
const promptCooldowns = new Map<string, number>();

export class ProximityVerificationService {
  /**
   * فحص ما إذا كان العنصر في فترة التهدئة لتجنب تكرار الإشعارات
   */
  static isItemInCooldown(itemId: string): boolean {
    const lastAlert = promptCooldowns.get(itemId);
    if (!lastAlert) return false;
    return Date.now() - lastAlert < COOLDOWN_DURATION_MS;
  }

  /**
   * تسجيل فترة التهدئة لعنصر معين
   */
  static markItemCooldown(itemId: string): void {
    promptCooldowns.set(itemId, Date.now());
  }

  /**
   * إعادة ضبط التهدئة (مفيد للاختبارات)
   */
  static resetCooldowns(): void {
    promptCooldowns.clear();
  }

  /**
   * إنشاء تفاصيل السؤال الذكي حسب نوع العنصر (حاوية، نقطة سوداء، أو بلاغ نشط)
   */
  static buildPromptForItem(
    item: {
      id: string;
      category: ProximityItemCategory;
      location: GeoLocation;
      title?: string;
      notes?: string;
      type?: string;
      kind?: string;
      neighborhood?: string;
    },
    distanceMeters: number
  ): ProximityPromptItem {
    const roundedDist = Math.round(distanceMeters);

    if (item.category === 'bin') {
      return {
        id: item.id,
        category: 'bin',
        title: item.title || `حاوية نفايات في ${item.neighborhood || 'الحي'}`,
        question: `أنت على بعد ${roundedDist}م: هل الحاوية ما زالت في مكانها؟`,
        distanceMeters: roundedDist,
        primaryActionLabel: 'نعم، موجودة ✅',
        secondaryActionLabel: 'غير موجودة / اختفت ❌',
        reportActionLabel: '⚠️ أبلغ عن مشكلة بالحاوية (مكسورة / تفيض)',
        location: item.location,
      };
    }

    if (item.category === 'wild_dump') {
      return {
        id: item.id,
        category: 'wild_dump',
        title: item.title || `نقطة سوداء / مكب عشوائي في ${item.neighborhood || 'الحي'}`,
        question: `أنت على بعد ${roundedDist}م من نقطة سوداء: هل ما زالت النفايات متراكمة؟`,
        distanceMeters: roundedDist,
        primaryActionLabel: 'ما زالت متراكمة ⚠️',
        secondaryActionLabel: 'تم تنظيفها بالكامل ✨',
        reportActionLabel: '📸 تحديث التقرير أو الإبلاغ عن تفاقمها',
        location: item.location,
      };
    }

    // بلاغ نشط (Report)
    let typeName = 'مشكلة بيئية';
    if (item.type === 'broken') typeName = 'حاوية مكسورة';
    else if (item.type === 'full') typeName = 'حاوية ممتلئة';
    else if (item.type === 'dirty_spot') typeName = 'تراكم أوساخ';

    return {
      id: item.id,
      category: 'report',
      title: item.title || `بلاغ عن ${typeName} (${item.neighborhood || 'الحي'})`,
      question: `أنت قرب موقع بلاغ: هل المشكلة (${typeName}) ما زالت قائمة؟`,
      distanceMeters: roundedDist,
      primaryActionLabel: 'نعم، ما زالت قائمة ⚠️',
      secondaryActionLabel: 'تم حلها وتنظيف المكان ✅',
      reportActionLabel: 'ℹ️ أبلغ عن تفاصيل إضافية',
      location: item.location,
      reportType: item.type,
    };
  }

  /**
   * فحص جميع الأماكن والبلاغات القريبة ضمن نطاق الـ 15 متراً
   */
  static findNearestEligibleItem(
    userLocation: GeoLocation,
    places: Place[],
    reports: PlaceReport[],
    maxDistanceMeters: number = 15
  ): ProximityPromptItem | null {
    let closestItem: ProximityPromptItem | null = null;
    let minDistance = maxDistanceMeters + 1;

    // 1. فحص البلاغات النشطة أولاً (ذات الأولوية القصوى)
    for (const rep of reports) {
      if (rep.status === 'fixed' || rep.status === 'rejected') continue;
      if (this.isItemInCooldown(rep.id)) continue;

      const dist = calculateDistance(userLocation, rep.location);
      if (dist <= maxDistanceMeters && dist < minDistance) {
        minDistance = dist;
        closestItem = this.buildPromptForItem({
          id: rep.id,
          category: 'report',
          location: rep.location,
          type: rep.type,
          neighborhood: rep.neighborhood,
          title: rep.description,
        }, dist);
      }
    }

    // 2. إذا لم يوجد بلاغ قريب، نفحص الأماكن (الحاويات والنقاط السوداء)
    if (!closestItem) {
      for (const pl of places) {
        if (this.isItemInCooldown(pl.id)) continue;
        const dist = calculateDistance(userLocation, pl.location);
        if (dist <= maxDistanceMeters && dist < minDistance) {
          minDistance = dist;
          const category: ProximityItemCategory = pl.kind === 'wild_dump' ? 'wild_dump' : 'bin';
          closestItem = this.buildPromptForItem({
            id: pl.id,
            category,
            location: pl.location,
            neighborhood: pl.neighborhood,
            title: pl.notes,
          }, dist);
        }
      }
    }

    return closestItem;
  }

  /**
   * طلب إذن إشعارات المتصفح
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          return true;
        }
        if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
      } catch (err) {
        console.warn('تعذر طلب إذن الإشعارات في المتصفح:', err);
      }
    }
    return false;
  }

  /**
   * إرسال إشعار المتصفح
   */
  static dispatchBrowserNotification(prompt: ProximityPromptItem): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const n = new Notification('التويزة - رصد ميداني ذكي 📍', {
            body: `${prompt.question}\nانقر للتأكيد والمساهمة في نظافة حومتك.`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `twizza-proximity-${prompt.id}`,
          });

          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch (err) {
          console.warn('فشل إرسال إشعار المتصفح:', err);
        }
      }
    }
  }

  /**
   * تسجيل تصويت المواطن وتحديث حالة البلاغ عند الوصول لعتبة التأكيدات (الافتراضي 4)
   */
  static async submitVerificationVote(params: {
    itemId: string;
    category: ProximityItemCategory;
    vote: VerificationVote;
    userId: string;
    userName?: string;
  }): Promise<{ reachedThreshold: boolean; newStatus?: string }> {
    const { itemId, category, vote, userId, userName } = params;

    // تسجيل التهدئة فور الإجابة
    this.markItemCooldown(itemId);

    if (!db || !userId) {
      return { reachedThreshold: false };
    }

    const threshold = await SystemSettingsService.getVerificationThreshold();
    const collectionName = category === 'report' ? 'reports' : 'places';
    const docRef = doc(db, collectionName, itemId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { reachedThreshold: false };
    }

    const data = snap.data();
    const currentResolved = (data.confirmationsResolved || 0) + (vote === 'resolved' ? 1 : 0);
    const currentStillThere = (data.confirmationsStillThere || 0) + (vote === 'still_there' ? 1 : 0);

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
      verifiedByCitizens: arrayUnion(userId),
    };

    if (vote === 'resolved') {
      updates.confirmationsResolved = increment(1);
    } else {
      updates.confirmationsStillThere = increment(1);
    }

    let reachedThreshold = false;
    let newStatus: string | undefined = undefined;

    // فحص بلوغ عتبة الـ 4 تأكيدات لحل المشكلة
    if (vote === 'resolved' && currentResolved >= threshold) {
      reachedThreshold = true;
      if (category === 'report') {
        newStatus = 'fixed';
        updates.status = 'fixed';
        updates.reporterConfirmed = true;
        updates.resolvedAt = Date.now();
        updates.resolvedByCitizensCount = currentResolved;
        updates.history = arrayUnion({
          status: 'fixed',
          by: userName || 'تأكيد جماعي من المواطنين (التويزة)',
          at: Date.now(),
          note: `تم تأكيد حل المشكلة ونظافة المكان تلقائياً بعد بلوغ ${threshold} تأكيدات ميدانية من المواطنين.`,
        });
      } else if (category === 'wild_dump') {
        newStatus = 'cleaned';
        updates.status = 'cleaned';
      }
    }

    await updateDoc(docRef, updates);
    return { reachedThreshold, newStatus };
  }
}
