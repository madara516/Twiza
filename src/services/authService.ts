/**
 * خدمة المصادقة وإدارة الحسابات (Auth Service)
 * 
 * بالدارجة: هذا السيرفيس فيه كل الدوال تاع الحسابات: التسجيل، تسجيل الدخول،
 * الخروج، واسترجاع كلمة السر. ومع كل تسجيل أو دخول، نضمن وجود وثيقة المستخدم
 * في Firestore مع قراءة role (admin / citizen) للتحكم في الصلاحيات.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from '../types';

export class AuthService {
  /**
   * تسجيل حساب جديد كمواطن وضمان حفظ وثيقة المستخدم في Firestore
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
        role: 'citizen',
        isBanned: false,
        createdAt: now,
        updatedAt: now,
      };

      // حفظ وثيقة المستخدم في Firestore
      try {
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
        await Promise.race([
          setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: trimmedName,
            photoURL: null,
            language: 'ar',
            role: 'citizen',
            isBanned: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
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
   * تسجيل الدخول والتحقق من وجود وثيقة المستخدم وقراءة role
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
      const user = userCredential.user;

      // التأكد من وجود وثيقة /users/{uid} في Firestore
      if (db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'مواطن',
              role: 'citizen',
              photoURL: user.photoURL || null,
              language: 'ar',
              isBanned: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (dbErr) {
          console.warn('تنبيه أثناء التحقق من وثيقة المستخدم عند الدخول:', dbErr);
        }
      }

      return user;
    } catch (error: any) {
      console.error('خطأ أثناء تسجيل الدخول:', error);
      throw new Error(this.mapAuthError(error.code || error.message));
    }
  }

  /**
   * تسجيل الخروج من الحساب وتنظيف كامل للجلسة والتخزين المحلي
   */
  static async logout(): Promise<void> {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.warn('تنبيه أثناء signOut من Firebase:', error);
    }

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage?.clear?.();
        window.sessionStorage?.clear?.();
      }
      await AsyncStorage.clear();
    } catch (clearErr) {
      console.warn('تنبيه أثناء مسح التخزين:', clearErr);
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
   * جلب وثيقة المستخدم من Firestore وإنشاؤها إذا لم تكن موجودة بعد
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!db) return null;

    try {
      const docRef = doc(db, 'users', uid);
      let docSnap = await getDoc(docRef);

      // إذا لم تكن الوثيقة موجودة، ننشئها برتبة citizen افتراضية
      if (!docSnap.exists() && auth?.currentUser) {
        const u = auth.currentUser;
        try {
          await setDoc(docRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.email?.split('@')[0] || 'مواطن',
            role: 'citizen',
            photoURL: u.photoURL || null,
            language: 'ar',
            isBanned: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          docSnap = await getDoc(docRef);
        } catch (createErr) {
          console.warn('فشل إنشاء وثيقة المستخدم عند الجلب:', createErr);
        }
      }

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error: any) {
      if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
        console.warn('تنبيه: تعذر الاتصال بـ Firestore، جاري استخدام رتبة مواطن افتراضية.');
        return {
          uid,
          displayName: auth?.currentUser?.displayName || 'مواطن',
          photoURL: null,
          language: 'ar',
          role: 'citizen',
          isBanned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }
      console.warn('تنبيه في جلب بيانات المستخدم:', error);
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
   * ترجمة رسائل أخطاء Firebase إلى العربية واضحة
   */
  private static mapAuthError(codeOrMsg: string): string {
    const errorMap: Record<string, string> = {
      'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
      'auth/user-disabled': 'تم تعطيل هذا الحساب. يرجى التواصل مع الإدارة.',
      'auth/user-not-found': 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
      'auth/wrong-password': 'كلمة المرور غير صحيحة.',
      'auth/invalid-credential': 'بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.',
      'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجل به حساب بالفعل.',
      'auth/weak-password': 'كلمة المرور ضعيفة. يجب أن تتكون من 6 أحرف على الأقل.',
      'auth/network-request-failed': 'فشل الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.',
      'auth/too-many-requests': 'تم حظر الدخول مؤقتاً لكثرة المحاولات. انتظر قليلاً.',
    };

    return errorMap[codeOrMsg] || 'حدث خطأ في المصادقة. يرجى المحاولة مرة أخرى.';
  }
}
