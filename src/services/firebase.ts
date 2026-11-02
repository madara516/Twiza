/**
 * إعدادات وتهيئة Firebase (Auth, Firestore, Storage)
 * 
 * بالدارجة: هذا هو المحرك تاع الفايربيز كامل، نربطو بيه قاعدة البيانات (Firestore)،
 * نظام الحسابات (Auth) مع حفظ الجلسة في التيليفون (AsyncStorage)، وتخزين الصور (Storage).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // تهيئة Auth مع حفظ الجلسة في الهاتف (Persistence)
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // في حالة إعادة التحميل السريع (Fast Refresh) إذا كان Auth مهيأ مسبقاً
      auth = getAuth(app);
    }

    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('فشل في تهيئة Firebase:', error);
  }
} else {
  console.warn(
    'تنبيه: مفاتيح Firebase غير محددة في .env. يرجى نسخ .env.example إلى .env وملء المفاتيح.'
  );
}

export { app, auth, db, storage };
