/**
 * شاشة الترحيب وتسجيل الدخول الموحدة (Screen 1 - Splash & Login Screen)
 * 
 * تدعم:
 * - اللغات الثلاث (العربية / Français / English)
 * - النمط النهاري والنمط الليلي الأخضر
 * - الدخول المباشر كضيف "البحث عن أقرب سلة"
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthService } from '../../src/services/authService';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTheme } from '../../src/context/ThemeContext';
import { MailIcon, LockIcon } from '../../src/components/Icons';
import { AppIcon } from '../../src/components/AppIcon';
import { Language } from '../../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const { setGuestMode } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();

  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // المصادقة الأساسية (تسجيل الدخول أو إنشاء حساب جديد)
  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage(
        language === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
          : language === 'fr'
          ? 'Veuillez saisir votre email et mot de passe.'
          : 'Please enter both email and password.'
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      if (isSignUp) {
        const nameToUse = displayName.trim() || trimmedEmail.split('@')[0];
        await AuthService.register(trimmedEmail, password, nameToUse);
      } else {
        await AuthService.login(trimmedEmail, password);
      }

      setGuestMode(false);
      const destination = (redirectTo && redirectTo.startsWith('/')) ? redirectTo : '/(tabs)';
      router.replace(destination as any);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (language === 'ar'
            ? 'فشل التحقق من الحساب. تأكد من صحة البيانات.'
            : language === 'fr'
            ? 'Échec de connexion. Vérifiez vos identifiants.'
            : 'Authentication failed. Please check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  // الزر السريع: "أقرب سلة ليا" ينقل مباشرة للخريطة بدون تسجيل دخول
  const handleNearestBin = () => {
    setGuestMode(true);
    router.replace('/(tabs)/map');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardView, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenContainer}>
          {/* شريط اختيار اللغة الثلاثية في أعلى الشاشة */}
          <View style={styles.topLangRow}>
            <View style={[styles.langSwitchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.langSwitchBtn, language === 'ar' && { backgroundColor: colors.primary }]}
                onPress={() => setLanguage('ar')}
              >
                <Text
                  style={[
                    styles.langSwitchText,
                    { color: language === 'ar' ? (isDark ? '#061C12' : '#FFF') : colors.textSecondary },
                  ]}
                >
                  العربية
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langSwitchBtn, language === 'fr' && { backgroundColor: colors.primary }]}
                onPress={() => setLanguage('fr')}
              >
                <Text
                  style={[
                    styles.langSwitchText,
                    { color: language === 'fr' ? (isDark ? '#061C12' : '#FFF') : colors.textSecondary },
                  ]}
                >
                  Français
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langSwitchBtn, language === 'en' && { backgroundColor: colors.primary }]}
                onPress={() => setLanguage('en')}
              >
                <Text
                  style={[
                    styles.langSwitchText,
                    { color: language === 'en' ? (isDark ? '#061C12' : '#FFF') : colors.textSecondary },
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* الشعار والهوية الرسمية */}
          <View style={styles.logoSection}>
            <View style={styles.shieldCropContainer}>
              <Image
                source={require('../../assets/images/t_shield_logo.png')}
                style={styles.logoShield}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>Twiza</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              {t('tagline')}
            </Text>
          </View>

          {/* صندوق رسالة الخطأ إن وجد */}
          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* نموذج الدخول الموحد بالبريد الإلكتروني */}
          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {language === 'ar' ? 'الاسم الكامل' : language === 'fr' ? 'Nom complet' : 'Full Name'}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={
                      language === 'ar'
                        ? 'مثال: أحمد الأغواطي'
                        : language === 'fr'
                        ? 'Ex: Ahmed de Laghouat'
                        : 'e.g. Ahmed from Laghouat'
                    }
                    placeholderTextColor={colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                </View>
              </View>
            )}

            {/* حقل البريد الإلكتروني */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('auth.email')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.iconBox}>
                  <MailIcon size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={[styles.textInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* حقل كلمة المرور */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('auth.password')}</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.iconBox}>
                  <LockIcon size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={[styles.textInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={true}
                />
              </View>
            </View>

            {/* زر تسجيل الدخول / إنشاء حساب العريض */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={isDark ? '#061C12' : '#FFF'} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: isDark ? '#061C12' : '#FFF' }]}>
                  {isSignUp
                    ? language === 'ar'
                      ? 'إنشاء حساب'
                      : language === 'fr'
                      ? 'Créer un compte'
                      : 'Create Account'
                    : t('auth.login_title')}
                </Text>
              )}
            </TouchableOpacity>

            {/* الزر السريع: "أقرب سلة ليا" ينقل للخريطة مباشرة بدون تسجيل */}
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleNearestBin}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <AppIcon name="bin" size={17} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  {t('auth.find_closest_bin')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* تبديل بين تسجيل الدخول وإنشاء حساب */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleLink, { color: colors.primary }]}>
                  {isSignUp
                    ? language === 'ar'
                      ? 'لديك حساب بالفعل؟ تسجيل الدخول'
                      : language === 'fr'
                      ? 'Déjà un compte ? Se connecter'
                      : 'Already have an account? Sign In'
                    : language === 'ar'
                    ? 'حساب جديد؟ إنشاء حساب مواطن'
                    : language === 'fr'
                    ? 'Nouveau ? Créer un compte citoyen'
                    : 'New here? Create Citizen Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  screenContainer: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  topLangRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  langSwitchBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  langSwitchBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  langSwitchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  shieldCropContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoShield: {
    width: 78,
    height: 78,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 50,
  },
  iconBox: {
    marginLeft: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
