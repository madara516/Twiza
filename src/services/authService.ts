/**
 * خدمة المصادقة وإدارة الحسابات (Auth Service)
 * 
 * بالدارجة: هذا السيرفيس فيه كل الدوال تاع الحسابات: التسجيل، تسجيل الدخول،
 * الخروج، واسترجاع كلمة السر. ومع كل تسجيل جديد ننشئو وثيقة المستخدم في Firestore
 * برتبة 'citizen' وممنوع الكلاينت يتحكم في رتبته.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from '../types';

export class AuthService {
  /**
   * تسجيل حساب جديد كمواطن
   */
  static async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<UserProfile> {
    if (!auth || !db) {
      throw new Error('Firebase غير مهيأ بعد. يرجى إعداد ملف .env أولاً.');
    }

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      throw new Error('الاسم يجب أن يكون بين حرفين و 50 حرفاً.');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: trimmedName });

      const now = Date.now();
      const userProfile: UserProfile = {
        uid: user.uid,
        displayName: trimmedName,
        photoURL: null,
        language: 'ar',
        role: 'citizen', // دور المواطن هو الافتراضي دوماً
        isBanned: false,
        createdAt: now,
        updatedAt: now,
      };

      // حفظ وثيقة المستخدم في Firestore مع حماية المهلة لعدم تعليق الواجهة
      try {
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
        await Promise.race([
          setDoc(doc(db, 'users', user.uid), userProfile),
          timeoutPromise,
        ]);
      } catch (dbErr) {
        console.warn('تنبيه: تأخر حفظ وثيقة المستخدم في Firestore:', dbErr);
      }

      return userProfile;
    } catch (error: any) {
      console.error('خطأ أثناء التسجيل:', error);
      throw new Error(this.mapAuthError(error.code || error.message));
    }
  }

  /**
   * تسجيل الدخول
   */
  static async login(email: string, password: string): Promise<FirebaseUser> {
    if (!auth) {
      throw new Error('Firebase غير مهيأ بعد. يرجى إعداد ملف .env أولاً.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      return userCredential.user;
    } catch (error: any) {
      console.error('خطأ أثناء تسجيل الدخول:', error);
      throw new Error(this.mapAuthError(error.code || error.message));
    }
  }

  /**
   * تسجيل الخروج
   */
  static async logout(): Promise<void> {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error('خطأ أثناء تسجيل الخروج:', error);
      throw error;
    }
  }

  /**
   * إرسال رابط إعادة تعيين كلمة المرور
   */
  static async resetPassword(email: string): Promise<void> {
    if (!auth) {
      throw new Error('Firebase غير مهيأ بعد. يرجى إعداد ملف .env أولاً.');
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      console.error('خطأ في استرجاع كلمة المرور:', error);
      throw new Error(this.mapAuthError(error.code || error.message));
    }
  }

  /**
   * جلب وثيقة المستخدم من Firestore
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!db) return null;

    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      return null;
    }
  }

  /**
   * تحديث بيانات الملف الشخصي المسموح بها للمواطن (الاسم، اللغة)
   */
  static async updateProfileData(
    uid: string,
    data: { displayName?: string; language?: 'ar' | 'en' }
  ): Promise<void> {
    if (!db) return;

    try {
      const docRef = doc(db, 'users', uid);
      const updatePayload: Record<string, any> = {
        updatedAt: Date.now(),
      };

      if (data.displayName) {
        updatePayload.displayName = data.displayName.trim();
      }
      if (data.language) {
        updatePayload.language = data.language;
      }

      await updateDoc(docRef, updatePayload);
    } catch (error) {
      console.error('خطأ أثناء تحديث بيانات الحساب:', error);
      throw error;
    }
  }

  /**
   * ترجمة رسائل أخطاء Firebase إلى العربية البسيطة
   */
  private static mapAuthError(code: string): string {
    switch (code) {
      case 'auth/api-key-not-valid':
        return 'مفتاح Firebase غير مفعل أو غير صالح. تأكد من تفعيل خدمة Authentication في Firebase Console.';
      case 'auth/invalid-email':
        return 'صيغة البريد الإلكتروني غير صحيحة.';
      case 'auth/user-disabled':
        return 'هذا الحساب تم تعطيله.';
      case 'auth/user-not-found':
        return 'لا يوجد حساب بهذا البريد الإلكتروني.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      case 'auth/email-already-in-use':
        return 'هذا البريد الإلكتروني مسجل مسبقاً.';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة (يجب أن تتكون من 6 أحرف على الأقل).';
      case 'auth/too-many-requests':
        return 'تم حظر المحاولات مؤقتاً بسبب كثرة المحاولات الخاطئة. انتظر قليلاً ثم أعد المحاولة.';
      default:
        return 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.';
    }
  }
}
