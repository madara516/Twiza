/**
 * مكوّن قفل الميزات للزوار (Guest Login Required Prompt)
 * 
 * يظهر عندما يحاول الزائر (الضيف) الوصول إلى أي ميزة تتطلب حساباً
 * (الرئيسية، الملف الشخصي، البلاغات، وإضافة مكان)،
 * دون إظهار أي بيانات وهمية، مع توجيه ذكي للمكان المطلوب بعد تسجيل الدخول.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AppIcon } from './AppIcon';

interface GuestLoginPromptProps {
  title?: string;
  description?: string;
  redirectTo: string;
}

export const GuestLoginPrompt: React.FC<GuestLoginPromptProps> = ({
  title,
  description,
  redirectTo,
}) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();

  const defaultTitle =
    language === 'ar'
      ? 'أنت تتصفح كضيف'
      : language === 'fr'
      ? 'Vous naviguez en mode invité'
      : 'You are browsing as a guest';

  const defaultDesc =
    language === 'ar'
      ? 'يمكنك استعراض الخريطة ومعرفة أماكن الحاويات بدون تسجيل، لكن للوصول إلى هذه الميزة ومتابعة أثرك البيئي يرجى تسجيل الدخول.'
      : language === 'fr'
      ? "L'exploration de la carte est ouverte à tous sans compte. Pour accéder à cette fonctionnalité et suivre vos actions, veuillez vous connecter."
      : 'Map exploration is freely available without an account. To access this feature and track your environmental impact, please sign in.';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* الأيقونة العلوية الثيمية */}
        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
          <AppIcon name="user" size={42} color={colors.primary} focused />
        </View>

        {/* النصوص التوضيحية */}
        <Text style={[styles.title, { color: colors.text }]}>{title || defaultTitle}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{description || defaultDesc}</Text>

        {/* 1. زر تسجيل الدخول مع حفظ مسار العودة (redirectTo) */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() =>
            router.push({
              pathname: '/(auth)/login',
              params: { redirectTo },
            })
          }
          activeOpacity={0.88}
        >
          <View style={styles.btnContent}>
            <AppIcon name="user" size={18} color={isDark ? '#061C12' : '#FFFFFF'} />
            <Text style={[styles.primaryBtnText, { color: isDark ? '#061C12' : '#FFFFFF' }]}>
              {language === 'ar' ? 'تسجيل الدخول' : language === 'fr' ? 'Se connecter' : 'Sign In'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 2. زر إنشاء حساب جديد مع حفظ مسار العودة */}
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() =>
            router.push({
              pathname: '/(auth)/register',
              params: { redirectTo },
            })
          }
          activeOpacity={0.88}
        >
          <View style={styles.btnContent}>
            <AppIcon name="plus" size={18} color={colors.text} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              {language === 'ar' ? 'إنشاء حساب جديد' : language === 'fr' ? 'Créer un compte' : 'Create an Account'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. زر استكشاف الخريطة المتاح دائماً للضيوف */}
        <TouchableOpacity
          style={[styles.tertiaryBtn, { backgroundColor: 'transparent' }]}
          onPress={() => router.push('/(tabs)/map')}
          activeOpacity={0.7}
        >
          <View style={styles.btnContent}>
            <AppIcon name="map" size={18} color={colors.primary} />
            <Text style={[styles.tertiaryBtnText, { color: colors.primary }]}>
              {language === 'ar'
                ? 'استكشاف الخريطة (متاح كضيف)'
                : language === 'fr'
                ? 'Explorer la carte (Mode Invité)'
                : 'Explore Map (Guest Mode)'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tertiaryBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
