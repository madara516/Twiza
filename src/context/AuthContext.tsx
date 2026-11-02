/**
 * سياق المصادقة (AuthContext)
 * 
 * بالدارجة: هذا هو الكاشف تاع تسجيل الدخول في التطبيق كامل،
 * يبدا بـ loading=true وما ينحيهاش حتى يرجع Firebase بالجواب الرسمي.
 * وفي حالة كاش غلطة دايرين try/catch باش التيليفون ما يقعدش يدور ويبلوكي.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AuthService } from '../services/authService';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isGuest: boolean;
  setGuestMode: (guest: boolean) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // القاعدة الصارمة: loading تبدأ دائماً بـ true ولا تصبح false إلا بعد أول جواب رسمي
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  const fetchUserProfile = async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }
    try {
      // حماية من تعليق التطبيق في حال تأخر اتصال Firestore
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      const p = await Promise.race([
        AuthService.getUserProfile(firebaseUser.uid),
        timeoutPromise,
      ]);
      setProfile(p);
    } catch (err) {
      console.error('فشل في جلب ملف المستخدم:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    if (!auth) {
      // إذا لم يكن الفايربيز مهيأ بعد
      setLoading(false);
      return;
    }

    // الاستماع لحالة الدخول مع وضع try/catch إلزامي لمنع تعليق التطبيق
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          setIsGuest(false);
          await fetchUserProfile(firebaseUser);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('خطأ غير متوقع في onAuthStateChanged:', err);
      } finally {
        // فك التعليق دائماً مهما حدث
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setProfile(null);
      setIsGuest(false);
    } catch (err) {
      console.error('فشل تسجيل الخروج:', err);
      throw err;
    }
  };

  const role: UserRole | null = profile?.role ?? (user ? 'citizen' : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isGuest,
        setGuestMode: setIsGuest,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth يجب استخدامها داخل AuthProvider');
  }
  return context;
}
