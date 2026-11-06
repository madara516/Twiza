/**
 * شاشة إنشاء حساب جديد كمواطن (Register Screen)
 * 
 * بالدارجة: شاشة تسجيل حساب جديد، تسجل المواطن بالاسم والبريد،
 * وتفتح له وثيقة في Firestore برتبة مواطن 'citizen'.
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { AuthService } from '../../src/services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const { colors: themeColors, isDark } = useTheme();
  const { t, isRTL, language } = useLanguage();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName || !email.trim() || !password || !confirmPassword) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setErrorMessage('الاسم يجب أن يكون بين حرفين و 50 حرفاً.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('كلمة المرور يجب أن لا تقل عن 6 أحرف.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('كلمتا المرور غير متطابقتين.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await AuthService.register(email, password, trimmedName);
      const destination = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/(tabs)';
      router.replace(destination as any);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardView, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.primary }]}>
            {language === 'ar' ? 'انضم إلى التويزة' : language === 'fr' ? 'Rejoindre Twiza' : 'Join Twiza'}
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            {language === 'ar' ? 'سجل كمواطن وساهم في نظافة مدينتك' : language === 'fr' ? 'Inscrivez-vous en tant que citoyen' : 'Register as a citizen and help clean your city'}
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              {language === 'ar' ? 'الاسم واللقب' : language === 'fr' ? 'Nom et Prénom' : 'Full Name'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder={language === 'ar' ? 'مثال: محمد بن علي' : 'Ex: John Doe'}
              placeholderTextColor={themeColors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>{t('auth.email')}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder="example@mail.com"
              placeholderTextColor={themeColors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>{t('auth.password')}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={themeColors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              {language === 'ar' ? 'تأكيد كلمة المرور' : language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm Password'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={themeColors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: themeColors.primary }, loading && styles.disabledBtn]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? '#061C12' : '#FFF'} />
            ) : (
              <Text style={[styles.submitBtnText, { color: isDark ? '#061C12' : '#FFF' }]}>{t('profile.register')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/login',
                  params: { redirectTo },
                })
              }
            >
              <Text style={[styles.loginLink, { color: themeColors.primary }]}>{t('profile.login')}</Text>
            </TouchableOpacity>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
              {language === 'ar' ? 'لديك حساب بالفعل؟' : language === 'fr' ? 'Déjà un compte ?' : 'Already have an account?'}
            </Text>
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
  container: {
    padding: theme.spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'right',
    fontWeight: '600',
  },
  form: {
    gap: theme.spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: theme.typography.sizes.sm,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.md,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
  },
  footerText: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: theme.typography.sizes.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
