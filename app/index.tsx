/**
 * شاشة البداية البطولية (Hero Splash Screen)
 * 
 * تظهر فور فتح التطبيق مع تأثيرات حركية انسيابية (Pulsing Glow & Smooth Spring Entrance)،
 * تتيح للمستخدم الاختيار الفوري بين اللغات الثلاث (العربية / Français / English)،
 * ثم تنتقل بحركة سلسة (Fade & Scale Transition) إلى شاشة تسجيل الدخول أو الشاشة الرئيسية.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Easing,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useTheme } from '../src/context/ThemeContext';
import { AppIcon } from '../src/components/AppIcon';
import { Language } from '../src/i18n';

export default function HeroSplashScreen() {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [hasNavigated, setHasNavigated] = useState(false);

  // قيم التحريك (Animation Values)
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. حركة الدخول الانسيابية
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start();

    // 2. نبض الهالة الضوئية حول الشعار
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.14,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 3. التوجيه التلقائي بعد اكتمال العرض
    const timer = setTimeout(() => {
      proceedToNextScreen();
    }, 2400);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, [user, isGuest, authLoading]);

  const proceedToNextScreen = () => {
    if (hasNavigated) return;
    setHasNavigated(true);

    // حركة الخروج السينمائية (Smooth Exit Animation)
    Animated.parallel([
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.08,
        duration: 450,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (user || isGuest) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });
  };

  const handleSelectLanguage = (langCode: Language) => {
    setLanguage(langCode);
  };

  return (
    <View style={styles.container}>
      {/* خلفية بتدرج أخضر زمردي داكن فخم */}
      <View style={styles.backgroundGlow} />

      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: Animated.multiply(fadeAnim, exitFadeAnim),
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* هالة النبض الدائرية الخلفية */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* شعار التويزة الدائري الفخم */}
        <View style={styles.emblemContainer}>
          <View style={styles.emblemInner}>
            <AppIcon name="leaf" size={48} color="#4ADE80" focused />
          </View>
        </View>

        {/* العناوين والشعار اللفظي */}
        <Animated.View
          style={[
            styles.textBlock,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.brandTitleArabic}>التـويـزة</Text>
          <Text style={styles.brandTitleEnglish}>AL-TWIZA</Text>
          <View style={styles.sloganDivider} />
          <Text style={styles.brandSlogan}>{t('tagline')}</Text>
          <Text style={styles.brandSubSlogan}>{t('hero_subtitle')}</Text>
        </Animated.View>

        {/* محدد اللغات الثلاث الصريح (Arabic / Français / English) */}
        <View style={styles.languagePillsContainer}>
          <TouchableOpacity
            style={[
              styles.langPill,
              language === 'ar' && styles.langPillActive,
            ]}
            onPress={() => handleSelectLanguage('ar')}
            activeOpacity={0.8}
          >
            <Text style={[styles.langPillText, language === 'ar' && styles.langPillTextActive]}>
              🇩🇿 العربية
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langPill,
              language === 'fr' && styles.langPillActive,
            ]}
            onPress={() => handleSelectLanguage('fr')}
            activeOpacity={0.8}
          >
            <Text style={[styles.langPillText, language === 'fr' && styles.langPillTextActive]}>
              🇫🇷 Français
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langPill,
              language === 'en' && styles.langPillActive,
            ]}
            onPress={() => handleSelectLanguage('en')}
            activeOpacity={0.8}
          >
            <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>
              🇬🇧 English
            </Text>
          </TouchableOpacity>
        </View>

        {/* شريط التحميل الأنيق وزر البدء الفوري */}
        <View style={styles.bottomActions}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={proceedToNextScreen}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>{t('get_started')}</Text>
            <AppIcon name="chevron_right" size={16} color="#061C12" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071811', // Deep Emerald Forest
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundGlow: {
    position: 'absolute',
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: '#133D2B',
    opacity: 0.45,
    top: '25%',
    ...(Platform.OS === 'web'
      ? ({
          filter: 'blur(90px)',
        } as any)
      : {}),
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    top: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  emblemContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0F2E22',
    borderWidth: 2,
    borderColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    marginBottom: 24,
  },
  emblemInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#143D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandTitleArabic: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F0FDF4',
    letterSpacing: 1,
    textAlign: 'center',
  },
  brandTitleEnglish: {
    fontSize: 14,
    fontWeight: '700',
    color: '#86EFAC',
    letterSpacing: 5,
    marginTop: 2,
    textAlign: 'center',
  },
  sloganDivider: {
    width: 48,
    height: 2,
    backgroundColor: '#22C55E',
    borderRadius: 1,
    marginVertical: 14,
  },
  brandSlogan: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DCFCE7',
    textAlign: 'center',
  },
  brandSubSlogan: {
    fontSize: 12,
    color: '#A7C4B5',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  languagePillsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'rgba(15, 46, 34, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1B4D39',
  },
  langPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  langPillActive: {
    backgroundColor: '#22C55E',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A7C4B5',
  },
  langPillTextActive: {
    color: '#061C12',
    fontWeight: '800',
  },
  bottomActions: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    gap: 16,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#133D2B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 2,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4ADE80',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#061C12',
  },
});
