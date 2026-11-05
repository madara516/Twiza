/**
 * سياق المصادقة (AuthContext)
 * 
 * إدارة حالة تسجيل الدخول، التحقق من رتبة المستخدم (citizen / admin)،
 * وربط قائمة المشرفين المصرح لهم (ADMIN_EMAILS) لحماية النظام 100%.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AuthService } from '../services/authService';
import { UserProfile, UserRole } from '../types';
import { isAdminEmail } from '../config/admin';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  isGuest: boolean;
  setGuestMode: (guest: boolean) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      const p = await Promise.race([
        AuthService.getUserProfile(firebaseUser.uid),
        timeoutPromise,
      ]);

      if (p) {
        if (isAdminEmail(firebaseUser.email)) {
          setProfile({ ...p, role: 'admin' });
        } else {
          setProfile(p);
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('فشل في جلب ملف المستخدم:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

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
      await Promise.race([
        AuthService.logout().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch (err) {
      console.warn('تنبيه أثناء تسجيل الخروج:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setIsGuest(false);
    }
  };

  // التحقق الصارم من رتبة الأدمن (سواء من Firestore أو من قائمة المشرفين المصرح لهم)
  const isEmailAdmin = isAdminEmail(user?.email);
  const isFirestoreAdmin = profile?.role === 'admin';
  const isAdmin = Boolean(user && (isEmailAdmin || isFirestoreAdmin));
  const role: UserRole | null = isAdmin ? 'admin' : (profile?.role ?? (user ? 'citizen' : null));

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
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
