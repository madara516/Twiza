/**
 * شاشة الملف الشخصي (Profile Screen)
 * 
 * بالدارجة: هذه شاشة الحساب، يشوف فيها المواطن اسمه، إيميله، ورتبته (مواطن أو أدمن)،
 * ويقدر يبدل اللغة أو يخرج من حسابه بأمان.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getCurrentLanguage, setupRTL, t } from '../../src/i18n';
import { AuthService } from '../../src/services/authService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, role, logout, refreshProfile } = useAuth();
  const [lang, setLang] = useState<'ar' | 'en'>(getCurrentLanguage());
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const handleLanguageToggle = async () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    const needReload = setupRTL(nextLang);

    if (user) {
      try {
        await AuthService.updateProfileData(user.uid, { language: nextLang });
        await refreshProfile();
      } catch (err) {
        console.error('فشل حفظ اللغة في الملف الشخصي:', err);
      }
    }

    if (needReload) {
      Alert.alert(
        'تم تغيير اللغة',
        'لتطبيق اتجاه الشاشة كاملاً (RTL/LTR)، قد تحتاج لإعادة تشغيل التطبيق.'
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'خروج',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('خطأ', err.message || 'فشل تسجيل الخروج');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {user ? (
          <>
            {/* بطاقة معلومات الحساب */}
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={styles.userName}>{profile?.displayName || 'مواطن'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>

              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  {role === 'admin' ? '🛡️ مسؤول النظام (Admin)' : '👤 مواطن (Citizen)'}
                </Text>
              </View>
            </View>

            {/* إعدادات الحساب */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>الإعدادات</Text>

              {/* تبديل اللغة */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleLanguageToggle}
                activeOpacity={0.7}
              >
                <Text style={styles.settingValue}>
                  {lang === 'ar' ? 'العربية (افتراضية)' : 'English'} 🌐
                </Text>
                <Text style={styles.settingLabel}>لغة التطبيق</Text>
              </TouchableOpacity>
            </View>

            {/* زر تسجيل الخروج */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator color="#D32F2F" />
              ) : (
                <Text style={styles.logoutText}>تسجيل الخروج 🚪</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* في حالة تصفح الضيف */
          <View style={styles.guestCard}>
            <Text style={styles.guestIcon}>👤</Text>
            <Text style={styles.guestTitle}>أنت تتصفح كضيف</Text>
            <Text style={styles.guestSubtitle}>
              يمكنك استعراض الخريطة ومعرفة أماكن الحاويات بدون تسجيل، لكن لإضافة مكان
              جديد أو تقديم بلاغ يجب تسجيل الدخول.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.secondaryBtnText}>إنشاء حساب جديد</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  userCard: {
    backgroundColor: colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  userEmail: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: theme.spacing.sm,
  },
  roleTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
  settingRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 15,
  },
  guestCard: {
    backgroundColor: colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  guestTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  guestSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: theme.spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    width: '100%',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
