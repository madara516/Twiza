/**
 * شاشة الملف الشخصي وإعدادات التطبيق (Profile & Settings Screen)
 * 
 * تتيح للمواطن أو المشرف:
 * 1. استعراض الحساب والرتبة والإحصائيات والأوسمة
 * 2. الاختيار الصريح بين اللغات الثلاث (العربية / Français / English)
 * 3. الاختيار الصريح بين المظهر النهاري والمظهر الليلي (الأخضر الداكن)
 * 4. تسجيل الخروج بأمان مع حوار تأكيد متجاوب.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTheme, ThemeMode } from '../../src/context/ThemeContext';
import { Language } from '../../src/i18n';
import { AuthService } from '../../src/services/authService';
import { AppIcon } from '../../src/components/AppIcon';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, role, isAdmin, logout, isGuest, setGuestMode, refreshProfile } = useAuth();
  const { language, setLanguage, t, isRTL, languageOptions } = useLanguage();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();

  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);

  // اختيار اللغة من القائمة الثلاثية
  const handleSelectLanguage = async (newLang: Language) => {
    setShowLanguageModal(false);
    await setLanguage(newLang);

    if (user) {
      try {
        await AuthService.updateProfileData(user.uid, { language: newLang });
        await refreshProfile();
      } catch (err) {
        console.error('فشل حفظ اللغة في الملف الشخصي:', err);
      }
    }
  };

  // اختيار المظهر (نهاري أو ليلي أخضر)
  const handleSelectTheme = async (mode: ThemeMode) => {
    setShowThemeModal(false);
    await setThemeMode(mode);
  };

  // تنفيذ تسجيل الخروج الفعلي
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

  const currentLangOption = languageOptions.find((l) => l.code === language) || languageOptions[0];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* الترويسة العلوية النظيفة مع زر العودة */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <AppIcon name="chevron_right" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
        <TouchableOpacity
          style={styles.headerGearBtn}
          onPress={() => setShowThemeModal(true)}
          activeOpacity={0.7}
        >
          <AppIcon name="settings" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {user ? (
          <>
            {/* بطاقة معلومات الحساب */}
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
                <Text style={[styles.avatarText, { color: isDark ? '#4ADE80' : '#23703F' }]}>
                  {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={[styles.userName, { color: colors.text }]}>
                {profile?.displayName || user.email?.split('@')[0] || 'Adel Bessaoudi'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                @{user.email?.split('@')[0] || 'citizen'}
              </Text>

              <View style={[styles.roleTag, { backgroundColor: isDark ? '#133D2B' : '#EAF4ED' }]}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                  <AppIcon name={isAdmin || role === 'admin' ? 'shield' : 'star'} size={12} color={colors.primary} focused />
                  <Text style={[styles.roleTagText, { color: colors.primary }]}>
                    {isAdmin || role === 'admin' ? t('profile.role_admin') : t('profile.role_citizen')}
                  </Text>
                </View>
              </View>

              {/* أعمدة الإحصائيات الأربعة المطابقة للموك آب */}
              <View style={[styles.statsProfileRow, { borderTopColor: colors.border }]}>
                <View style={styles.statProfileCol}>
                  <Text style={[styles.statProfileValue, { color: colors.primary }]}>12h</Text>
                  <Text style={[styles.statProfileLabel, { color: colors.textSecondary }]}>{t('home.stat_volunteering')}</Text>
                </View>
                <View style={styles.statProfileCol}>
                  <Text style={[styles.statProfileValue, { color: colors.primary }]}>8</Text>
                  <Text style={[styles.statProfileLabel, { color: colors.textSecondary }]}>{t('home.stat_twizas')}</Text>
                </View>
                <View style={styles.statProfileCol}>
                  <Text style={[styles.statProfileValue, { color: colors.primary }]}>3</Text>
                  <Text style={[styles.statProfileLabel, { color: colors.textSecondary }]}>{t('home.stat_reports')}</Text>
                </View>
                <View style={styles.statProfileCol}>
                  <Text style={[styles.statProfileValue, { color: colors.primary }]}>#3</Text>
                  <Text style={[styles.statProfileLabel, { color: colors.textSecondary }]}>{t('home.stat_district')}</Text>
                </View>
              </View>
            </View>

            {/* الأوسمة والشارات (Badges) */}
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionTitleRow}>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={[styles.viewAllBadges, { color: colors.primary }]}>{t('profile.view_all')}</Text>
                </TouchableOpacity>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>{t('profile.badges')}</Text>
              </View>

              <View style={styles.badgesRow}>
                <View style={styles.badgeItem}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
                    <AppIcon name="shield" size={20} color={isDark ? '#4ADE80' : '#23703F'} focused />
                  </View>
                  <Text style={[styles.badgeLabel, { color: colors.textSecondary }]}>بطل البيئة</Text>
                </View>

                <View style={styles.badgeItem}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: isDark ? '#33290D' : '#FEF3C7' }]}>
                    <AppIcon name="star" size={20} color="#D97706" focused />
                  </View>
                  <Text style={[styles.badgeLabel, { color: colors.textSecondary }]}>قائد مجتمعي</Text>
                </View>

                <View style={styles.badgeItem}>
                  <View style={[styles.badgeIconCircle, { backgroundColor: isDark ? '#103040' : '#E0F2FE' }]}>
                    <AppIcon name="heart" size={20} color="#0284C7" focused />
                  </View>
                  <Text style={[styles.badgeLabel, { color: colors.textSecondary }]}>نجم التويزة</Text>
                </View>
              </View>
            </View>

            {/* قائمة الإعدادات (اللغة، المظهر، الحساب، الإشعارات) */}
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* 1. اختيار لغة التطبيق الثلاثية (Trilanguage Choice) */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setShowLanguageModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.menuChevronBox}>
                  <Text style={[styles.menuChevron, { color: colors.textSecondary }]}>›</Text>
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{t('language.title')}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.primary }]}>
                    {currentLangOption.flag} {currentLangOption.nativeName}
                  </Text>
                </View>
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
                  <AppIcon name="compass" size={18} color={colors.primary} />
                </View>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

              {/* 2. اختيار مظهر التطبيق (Dark Green / Light Theme Choice) */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setShowThemeModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.menuChevronBox}>
                  <Text style={[styles.menuChevron, { color: colors.textSecondary }]}>›</Text>
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{t('theme.title')}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.primary }]}>
                    {isDark ? '🌲 ' + t('theme.dark') : '☀️ ' + t('theme.light')}
                  </Text>
                </View>
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
                  <AppIcon name="settings" size={18} color={colors.primary} />
                </View>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

              {/* 3. معلومات الحساب */}
              <View style={styles.menuRow}>
                <View style={styles.menuChevronBox}>
                  <Text style={[styles.menuChevron, { color: colors.textSecondary }]}>›</Text>
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{t('profile.account_info')}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{user.email}</Text>
                </View>
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
                  <AppIcon name="user" size={18} color={colors.primary} />
                </View>
              </View>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

              {/* 4. الإشعارات */}
              <View style={styles.menuRow}>
                <View style={styles.menuChevronBox}>
                  <Text style={[styles.menuChevron, { color: colors.textSecondary }]}>›</Text>
                </View>
                <View style={styles.menuLabelContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{t('profile.notifications')}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.primary }]}>{t('profile.enabled')}</Text>
                </View>
                <View style={[styles.menuIconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
                  <AppIcon name="bell" size={18} color={colors.primary} />
                </View>
              </View>
            </View>

            {/* زر تسجيل الخروج */}
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: isDark ? '#2E1515' : '#FEF2F2', borderColor: '#FCA5A5' }]}
              onPress={() => setShowLogoutModal(true)}
              disabled={isLoggingOut}
              activeOpacity={0.85}
            >
              {isLoggingOut ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <View style={styles.logoutContent}>
                  <AppIcon name="logout" size={18} color="#DC2626" />
                  <Text style={styles.logoutText}>{t('profile.logout')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* في حالة تصفح الضيف */
          <View style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.guestIconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
              <AppIcon name="user" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>{t('profile.guest_title')}</Text>
            <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
              {t('profile.guest_desc')}
            </Text>

            {/* إعدادات سريعة للغة والمظهر للضيف */}
            <View style={{ width: '100%', flexDirection: 'row', gap: 10, marginVertical: 12 }}>
              <TouchableOpacity
                style={[styles.guestPrefBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                onPress={() => setShowLanguageModal(true)}
              >
                <Text style={{ fontSize: 13, color: colors.text }}>
                  {currentLangOption.flag} {currentLangOption.nativeName}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.guestPrefBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                onPress={() => setShowThemeModal(true)}
              >
                <Text style={{ fontSize: 13, color: colors.text }}>
                  {isDark ? '🌲 ' + t('theme.dark') : '☀️ ' + t('theme.light')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>{t('profile.login')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.88}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>{t('profile.register')}</Text>
            </TouchableOpacity>

            {/* زر الخروج من وضع الضيف والعودة لشاشة البداية */}
            <TouchableOpacity
              style={styles.exitGuestBtn}
              onPress={performLogout}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <AppIcon name="logout" size={16} color="#DC2626" />
                <Text style={styles.exitGuestBtnText}>{t('profile.exit_guest')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* نافذة اختيار اللغة الثلاثية (Trilanguage Choice Modal) */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.choiceModalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>{t('language.choose')}</Text>
              <AppIcon name="compass" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.modalSubheading, { color: colors.textSecondary }]}>
              اختر اللغة المفضلة لك، وسيتغير اتجاه ونصوص التطبيق فوراً
            </Text>

            <View style={{ width: '100%', gap: 10, marginVertical: 14 }}>
              {languageOptions.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[
                      styles.choiceCard,
                      {
                        backgroundColor: isSelected ? (isDark ? '#14382A' : '#EAF4ED') : colors.surfaceAlt,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectLanguage(opt.code)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 24 }}>{opt.flag}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.choiceTitle, { color: colors.text }]}>
                          {opt.nativeName} ({opt.name})
                        </Text>
                        <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>
                          {t(`language.${opt.code}_desc`)}
                        </Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <View style={[styles.checkedCircle, { backgroundColor: colors.primary }]}>
                        <AppIcon name="check" size={14} color="#FFF" />
                      </View>
                    ) : (
                      <View style={[styles.uncheckedCircle, { borderColor: colors.border }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* نافذة اختيار المظهر (Theme Choice Modal - Light & Dark Green) */}
      <Modal visible={showThemeModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.choiceModalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>{t('theme.choose')}</Text>
              <AppIcon name="settings" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.modalSubheading, { color: colors.textSecondary }]}>
              اختر النمط البصري المريح لعينيك
            </Text>

            <View style={{ width: '100%', gap: 10, marginVertical: 14 }}>
              {/* الخيار 1: الوضع النهاري */}
              <TouchableOpacity
                style={[
                  styles.choiceCard,
                  {
                    backgroundColor: themeMode === 'light' ? (isDark ? '#14382A' : '#EAF4ED') : colors.surfaceAlt,
                    borderColor: themeMode === 'light' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSelectTheme('light')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>☀️</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.choiceTitle, { color: colors.text }]}>{t('theme.light')}</Text>
                    <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>
                      {t('theme.light_desc')}
                    </Text>
                  </View>
                </View>
                {themeMode === 'light' ? (
                  <View style={[styles.checkedCircle, { backgroundColor: colors.primary }]}>
                    <AppIcon name="check" size={14} color="#FFF" />
                  </View>
                ) : (
                  <View style={[styles.uncheckedCircle, { borderColor: colors.border }]} />
                )}
              </TouchableOpacity>

              {/* الخيار 2: الوضع الليلي الأخضر */}
              <TouchableOpacity
                style={[
                  styles.choiceCard,
                  {
                    backgroundColor: themeMode === 'dark' ? (isDark ? '#14382A' : '#EAF4ED') : colors.surfaceAlt,
                    borderColor: themeMode === 'dark' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSelectTheme('dark')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>🌲</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.choiceTitle, { color: colors.text }]}>{t('theme.dark')}</Text>
                    <Text style={[styles.choiceDesc, { color: colors.textSecondary }]}>
                      {t('theme.dark_desc')}
                    </Text>
                  </View>
                </View>
                {themeMode === 'dark' ? (
                  <View style={[styles.checkedCircle, { backgroundColor: colors.primary }]}>
                    <AppIcon name="check" size={14} color="#FFF" />
                  </View>
                ) : (
                  <View style={[styles.uncheckedCircle, { borderColor: colors.border }]} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* نافذة تأكيد تسجيل الخروج */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.confirmIconCircle}>
              <AppIcon name="logout" size={30} color="#DC2626" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>تأكيد تسجيل الخروج</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
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
                style={[styles.confirmCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                <Text style={[styles.confirmCancelText, { color: colors.text }]}>إلغاء</Text>
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
  },
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: 90,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: theme.fontFamily,
  },
  headerGearBtn: {
    padding: 6,
  },
  userCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: theme.fontFamily,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 10,
    fontFamily: theme.fontFamily,
  },
  roleTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 2,
    marginBottom: 4,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  statsProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 16,
    marginTop: 14,
    borderTopWidth: 1,
  },
  statProfileCol: {
    alignItems: 'center',
    flex: 1,
  },
  statProfileValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statProfileLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  viewAllBadges: {
    fontSize: 12,
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
    gap: 6,
  },
  badgeIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fontFamily,
  },
  menuCard: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  menuChevronBox: {
    paddingLeft: 4,
  },
  menuChevron: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuLabelContainer: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDivider: {
    height: 1,
  },
  logoutButton: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: theme.fontFamily,
  },
  guestCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  guestIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: theme.fontFamily,
  },
  guestSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: theme.fontFamily,
  },
  guestPrefBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    width: '100%',
    padding: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  secondaryBtn: {
    width: '100%',
    padding: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  exitGuestBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  exitGuestBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  choiceModalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubheading: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 12,
  },
  choiceCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  choiceDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  checkedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  modalCloseBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmLogoutBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmLogoutText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
