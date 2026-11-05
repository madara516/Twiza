/**
 * شاشة الملف الشخصي (Profile Screen)
 * 
 * بالدارجة: هذه شاشة الحساب، يشوف فيها المواطن اسمه، إيميله، ورتبته (مواطن أو أدمن)،
 * ويقدر يبدل اللغة أو يخرج من حسابه بأمان مع ضمان عمل تسجيل الخروج على الويب والهاتف.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getCurrentLanguage, setupRTL } from '../../src/i18n';
import { AuthService } from '../../src/services/authService';
import { AppIcon } from '../../src/components/AppIcon';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, role, isAdmin, logout, isGuest, setGuestMode, refreshProfile } = useAuth();
  const [lang, setLang] = useState<'ar' | 'en'>(getCurrentLanguage());
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

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

  // تنفيذ تسجيل الخروج الفعلي والتوجيه لشاشة الترحيب والدخول
  const performLogout = async () => {
    setShowLogoutModal(false);
    try {
      setIsLoggingOut(true);
      await logout();
      setGuestMode(false);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err: any) {
      console.error('خطأ أثناء تسجيل الخروج:', err);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace('/(auth)/login');
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutPress = () => {
    performLogout();
  };

  // خروج الضيف والعودة لشاشة البداية
  const handleExitGuest = () => {
    performLogout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* الترويسة العلوية النظيفة مع زر العودة */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.headerBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.headerGearBtn}
          onPress={handleLanguageToggle}
          activeOpacity={0.7}
        >
          <AppIcon name="settings" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

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

              <Text style={styles.userName}>{profile?.displayName || user.email?.split('@')[0] || 'Adel Bessaoudi'}</Text>
              <Text style={styles.userEmail}>@{user.email?.split('@')[0] || 'citizen'}</Text>

              <View style={styles.roleTag}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                  <AppIcon name={isAdmin || role === 'admin' ? 'shield' : 'star'} size={12} color={colors.primary} focused />
                  <Text style={styles.roleTagText}>
                    {isAdmin || role === 'admin' ? 'Admin' : 'Citizen'}
                  </Text>
                </View>
              </View>

              {/* أعمدة الإحصائيات الأربعة المطابقة للموك آب */}
              <View style={styles.statsProfileRow}>
                <View style={styles.statProfileCol}>
                  <Text style={styles.statProfileValue}>12h</Text>
                  <Text style={styles.statProfileLabel}>Volunteering</Text>
                </View>
                <View style={styles.statProfileCol}>
                  <Text style={styles.statProfileValue}>8</Text>
                  <Text style={styles.statProfileLabel}>Twizas</Text>
                </View>
                <View style={styles.statProfileCol}>
                  <Text style={styles.statProfileValue}>3</Text>
                  <Text style={styles.statProfileLabel}>Reports</Text>
                </View>
                <View style={styles.statProfileCol}>
                  <Text style={styles.statProfileValue}>#3</Text>
                  <Text style={styles.statProfileLabel}>In District</Text>
                </View>
              </View>
            </View>

            {/* الأوسمة والشارات (Badges) المطابقة للموك آب */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.viewAllBadges}>View all &gt;</Text>
                </TouchableOpacity>
                <Text style={styles.sectionHeader}>Badges</Text>
              </View>

              <View style={styles.badgesRow}>
                <View style={styles.badgeItem}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: '#EAF4ED' }]}>
                    <AppIcon name="shield" size={20} color="#23703F" focused />
                  </View>
                  <Text style={styles.badgeLabel}>Green Hero</Text>
                </View>

                <View style={styles.badgeItem}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <AppIcon name="star" size={20} color="#D97706" focused />
                  </View>
                  <Text style={styles.badgeLabel}>Community Leader</Text>
                </View>

                <View style={styles.badgeItem}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <AppIcon name="heart" size={20} color="#0284C7" focused />
                  </View>
                  <Text style={styles.badgeLabel}>Twiza Star</Text>
                </View>
              </View>
            </View>

            {/* قائمة الإعدادات والخيارات مع الأيقونات المطابقة للموك آب */}
            <View style={styles.menuCard}>
              {/* تبديل اللغة */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleLanguageToggle}
                activeOpacity={0.7}
              >
                <View style={styles.menuChevronBox}>
                  <Text style={styles.menuChevron}>›</Text>
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={styles.menuTitle}>Language / لغة التطبيق</Text>
                  <Text style={styles.menuSubtitle}>{lang === 'ar' ? 'العربية' : 'English'}</Text>
                </View>
                <View style={styles.menuIconCircle}>
                  <AppIcon name="settings" size={18} color="#23703F" />
                </View>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              {/* معلومات الحساب */}
              <View style={styles.menuRow}>
                <View style={styles.menuChevronBox}>
                  <Text style={styles.menuChevron}>›</Text>
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={styles.menuTitle}>Account Information</Text>
                  <Text style={styles.menuSubtitle}>{user.email}</Text>
                </View>
                <View style={styles.menuIconCircle}>
                  <AppIcon name="user" size={18} color="#23703F" />
                </View>
              </View>

              <View style={styles.menuDivider} />

              {/* الإشعارات */}
              <View style={styles.menuRow}>
                <View style={styles.menuChevronBox}>
                  <Text style={styles.menuChevron}>›</Text>
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={styles.menuTitle}>Notifications</Text>
                  <Text style={styles.menuSubtitle}>Enabled</Text>
                </View>
                <View style={styles.menuIconCircle}>
                  <AppIcon name="bell" size={18} color="#23703F" />
                </View>
              </View>
            </View>

            {/* زر تسجيل الخروج الصريح المطابق لـ Screen 11 */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogoutPress}
              disabled={isLoggingOut}
              activeOpacity={0.85}
            >
              {isLoggingOut ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <View style={styles.logoutContent}>
                  <AppIcon name="logout" size={18} color="#DC2626" />
                  <Text style={styles.logoutText}>Log Out</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* في حالة تصفح الضيف */
          <View style={styles.guestCard}>
            <View style={styles.guestIconCircle}>
              <AppIcon name="user" size={40} color="#15803D" />
            </View>
            <Text style={styles.guestTitle}>أنت تتصفح كضيف</Text>
            <Text style={styles.guestSubtitle}>
              يمكنك استعراض الخريطة ومعرفة أماكن الحاويات بدون تسجيل، لكن لإضافة مكان
              جديد أو تقديم بلاغ يجب تسجيل الدخول.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryBtnText}>إنشاء حساب جديد</Text>
            </TouchableOpacity>

            {/* زر الخروج من وضع الضيف والعودة لشاشة البداية */}
            <TouchableOpacity
              style={styles.exitGuestBtn}
              onPress={handleExitGuest}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <AppIcon name="logout" size={16} color="#DC2626" />
                <Text style={styles.exitGuestBtnText}>الخروج والعودة للشاشة الرئيسية</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* نافذة تأكيد تسجيل الخروج للمتصفح والويب */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconCircle}>
              <AppIcon name="logout" size={30} color="#DC2626" />
            </View>
            <Text style={styles.confirmTitle}>تأكيد تسجيل الخروج</Text>
            <Text style={styles.confirmMessage}>
              هل أنت متأكد من رغبتك في تسجيل الخروج والعودة لشاشة البداية؟
            </Text>

            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={performLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmLogoutText}>نعم، خروج</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                <Text style={styles.confirmCancelText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackBtn: {
    padding: 6,
  },
  headerBackIcon: {
    fontSize: 26,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  headerGearBtn: {
    padding: 6,
  },
  statsProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 16,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statProfileCol: {
    alignItems: 'center',
    flex: 1,
  },
  statProfileValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#23703F',
  },
  statProfileLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllBadges: {
    fontSize: 12,
    color: '#23703F',
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
  },
  badgeItem: {
    alignItems: 'center',
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    fontFamily: theme.fontFamily,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  menuLabelContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  menuChevronBox: {
    paddingLeft: 8,
  },
  menuChevron: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  userCard: {
    backgroundColor: colors.surface,
    padding: theme.spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  userName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '800',
    fontFamily: theme.fontFamily,
    color: colors.text,
  },
  userEmail: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: theme.spacing.sm,
  },
  roleTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: theme.fontFamily,
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
    fontFamily: theme.fontFamily,
  },
  settingValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  logoutButton: {
    backgroundColor: colors.errorLight,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '800',
    fontFamily: theme.fontFamily,
    fontSize: 15,
  },
  guestCard: {
    backgroundColor: colors.surface,
    padding: theme.spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  guestIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  guestTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '800',
    fontFamily: theme.fontFamily,
    color: colors.text,
  },
  guestSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: theme.fontFamily,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: theme.spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFF',
    fontFamily: theme.fontFamily,
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 13,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: colors.text,
    fontFamily: theme.fontFamily,
    fontWeight: '700',
    fontSize: 14,
  },
  exitGuestBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  exitGuestBtnText: {
    color: colors.error,
    fontFamily: theme.fontFamily,
    fontWeight: '700',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  guestIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAF4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  confirmMessage: {
    fontFamily: theme.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtonsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    width: '100%',
  },
  confirmLogoutBtn: {
    flex: 1,
    backgroundColor: colors.error,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmLogoutText: {
    color: '#FFF',
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '800',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmCancelText: {
    color: colors.text,
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
});
