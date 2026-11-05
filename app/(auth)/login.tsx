/**
 * شاشة الترحيب وتسجيل الدخول الموحدة (Screen 1 - Splash & Login Screen)
 * 
 * مطابقة للمخطط المرجعي مع الترقية الصارمة للمصادقة الموحدة:
 * - شعار التويزة البيئي والعنوان "التويزة" بخلفية شفافة 100% بدون إطار بيج
 * - مدخل البريد الإلكتروني مع أيقونة البريد الخضراء الداكنة (#1B4D3E)
 * - مدخل كلمة المرور مع أيقونة القفل الخضراء الداكنة (#1B4D3E)
 * - زر أخضر عريض "تسجيل الدخول" (أو "إنشاء حساب" عند التبديل)
 * - زر أبيض محدد "أقرب سلة ليا" ينقل للخريطة مباشرة كضيف
 * - تصميم ممتد متناسق داخل إطار الهاتف النقال (بدون حواف صندوقية مزدوجة)
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
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { AuthService } from '../../src/services/authService';
import { useAuth } from '../../src/context/AuthContext';
import { MailIcon, LockIcon } from '../../src/components/Icons';

export default function LoginScreen() {
  const router = useRouter();
  const { setGuestMode } = useAuth();

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
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
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
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل التحقق من الحساب. تأكد من صحة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  // الزر السريع: "أقرب سلة ليا" ينقل مباشرة للخريطة كضيف
  const handleNearestBin = () => {
    setGuestMode(true);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenContainer}>
          {/* الشعار والهوية الرسمية: الدرع بالأعلى وعنوان "التويزة" مباشرة تحته */}
          <View style={styles.logoSection}>
            <View style={styles.shieldCropContainer}>
              <Image
                source={require('../../assets/images/shield_clean.png')}
                style={styles.logoShield}
              />
            </View>
            <Text style={styles.brandTitle}>التويزة</Text>
          </View>

          {/* صندوق رسالة الخطأ إن وجد */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* نموذج الدخول الموحد بالبريد الإلكتروني */}
          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="مثال: أحمد الأغواطي"
                    placeholderTextColor={colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    textAlign="right"
                  />
                </View>
              </View>
            )}

            {/* حقل البريد الإلكتروني مع أيقونة البريد الخضراء الداكنة */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBox}>
                  <MailIcon size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>
            </View>

            {/* حقل كلمة المرور مع أيقونة القفل الخضراء الداكنة */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBox}>
                  <LockIcon size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="كلمة المرور"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={true}
                  textAlign="right"
                />
              </View>
            </View>

            {/* زر تسجيل الدخول / إنشاء حساب العريض بالأخضر الغابي */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverted} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
                </Text>
              )}
            </TouchableOpacity>

            {/* الزر السريع: "أقرب سلة ليا" */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleNearestBin}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>أقرب سلة ليا</Text>
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
                <Text style={styles.toggleLink}>
                  {isSignUp
                    ? 'لديك حساب بالفعل؟ تسجيل الدخول'
                    : 'حساب جديد؟ إنشاء حساب مواطن'}
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  screenContainer: {
    width: '100%',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldCropContainer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoShield: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    ...(Platform.OS === 'web' ? ({ mixBlendMode: 'multiply' } as any) : {}),
  },
  brandTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 46,
    fontWeight: '900',
    color: '#1B4D3E',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  errorBox: {
    width: '100%',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontFamily: 'Tajawal-Medium',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Tajawal-Bold',
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'right',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: 'Tajawal-Regular',
    color: colors.text,
    paddingHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary, // #1B4D3E
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: colors.textInverted,
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    fontWeight: '700',
  },
  toggleRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  toggleLink: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: 'Tajawal-Bold',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
