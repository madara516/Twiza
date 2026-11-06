/**
 * شاشة البداية المطابقة تماماً للموك آب بدقة SVG فيكتور عالية (Ultra-Crisp Vector Splash Screen)
 * 
 * الميزات:
 * 1. شعار التويزة (الدرع والورقة الصاعدة) مرسوم بدقة SVG فيكتور نقية 100% بدون كلمات وبدون أي تشويش.
 * 2. رسم معالم مدينة الأغواط الأثرية (المئذنة، النخيل الباسق، القبة المعمارية، والأسوار العتيقة) كأفق فيكتور نقي.
 * 3. التدرج اللوني الهادئ (#FFFFFF ➔ #F2F8F4 ➔ #D4EEDC).
 * 4. العنوان والعبارة الملهمة: "Twiza" و "Small actions. Big changes."
 * 5. أزرار اللغات الثلاث السريعة في الأعلى وانتقال حركي ناعم نحو شاشة تسجيل الدخول.
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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useTheme } from '../src/context/ThemeContext';
import { Language } from '../src/i18n';
import { TwizaEmblemSvg, LaghouatSkylineSvg } from '../src/components/SplashArt';

export default function MockupSplashScreen() {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { isDark } = useTheme();

  const [hasNavigated, setHasNavigated] = useState(false);

  // قيم التحريك (Animation Values)
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;
  const exitScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. حركة الدخول الانسيابية للشعار والنصوص
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. الانتقال التلقائي بعد ثانيتين ونصف
    const timer = setTimeout(() => {
      proceedToNextScreen();
    }, 2600);

    return () => clearTimeout(timer);
  }, [user, isGuest, authLoading]);

  const proceedToNextScreen = () => {
    if (hasNavigated) return;
    setHasNavigated(true);

    // حركة الخروج السلسة (Smooth Exit)
    Animated.parallel([
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(exitScaleAnim, {
        toValue: 1.05,
        duration: 400,
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

  // نصوص الشعار اللفظي حسب اللغة المختارة
  const getTaglineText = () => {
    if (language === 'ar') {
      return 'خطوات بسيطة..\nأثر عظيم.';
    }
    if (language === 'fr') {
      return 'Petits gestes.\nGrands impacts.';
    }
    return 'Small actions.\nBig changes.';
  };

  return (
    <TouchableOpacity
      style={styles.touchableWrapper}
      activeOpacity={1}
      onPress={proceedToNextScreen}
    >
      <View
        style={[
          styles.container,
          Platform.OS === 'web'
            ? ({
                background: isDark
                  ? 'linear-gradient(180deg, #092116 0%, #061910 60%, #030F0A 100%)'
                  : 'linear-gradient(180deg, #FFFFFF 0%, #F2F8F4 45%, #D4EEDC 100%)',
              } as any)
            : { backgroundColor: isDark ? '#061910' : '#EAF5EE' },
        ]}
      >
        {/* أزرار اختيار اللغة السرية العلوية */}
        <View style={styles.topLangBar}>
          <TouchableOpacity
            style={[styles.langChip, language === 'ar' && styles.langChipActive]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleSelectLanguage('ar');
            }}
          >
            <Text style={[styles.langChipText, language === 'ar' && styles.langChipTextActive]}>
              العربية
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, language === 'fr' && styles.langChipActive]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleSelectLanguage('fr');
            }}
          >
            <Text style={[styles.langChipText, language === 'fr' && styles.langChipTextActive]}>
              Français
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, language === 'en' && styles.langChipActive]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleSelectLanguage('en');
            }}
          >
            <Text style={[styles.langChipText, language === 'en' && styles.langChipTextActive]}>
              English
            </Text>
          </TouchableOpacity>
        </View>

        {/* الكتلة المركزية: شعار التطبيق الفيكتوري الصافي + Twiza + العبارة */}
        <Animated.View
          style={[
            styles.centerContent,
            {
              opacity: Animated.multiply(fadeAnim, exitFadeAnim),
              transform: [{ scale: Animated.multiply(scaleAnim, exitScaleAnim) }],
            },
          ]}
        >
          {/* شعار التطبيق الرسمي المفرغ بدقة SVG فائقة بدون كلمات */}
          <View style={styles.logoWrapper}>
            {Platform.OS === 'web' ? (
              <TwizaEmblemSvg size={106} isDark={isDark} />
            ) : (
              <Image
                source={require('../assets/images/app_logo_emblem.png')}
                style={styles.logoImageFallback}
                resizeMode="contain"
              />
            )}
          </View>

          {/* العنوان الرسمي: Twiza */}
          <Text style={[styles.title, { color: isDark ? '#4ADE80' : '#153E2B' }]}>
            Twiza
          </Text>

          {/* العبارة الملهمة المطابقة للموك آب: Small actions. Big changes. */}
          <Text style={[styles.subtitle, { color: isDark ? '#A7C4B5' : '#2D5541' }]}>
            {getTaglineText()}
          </Text>
        </Animated.View>

        {/* رسم الخطوط الأثرية لمدينة الأغواط بدقة فيكتور نقية (SVG Laghouat Skyline) */}
        <View style={styles.skylineWrapper} pointerEvents="none">
          {Platform.OS === 'web' ? (
            <LaghouatSkylineSvg isDark={isDark} />
          ) : (
            <Image
              source={require('../assets/images/splash_skyline.png')}
              style={styles.skylineImageFallback}
              resizeMode="cover"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchableWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  topLangBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 20,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(35, 112, 63, 0.15)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  langChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  langChipActive: {
    backgroundColor: '#23703F',
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2D5541',
  },
  langChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: -30,
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 108,
    height: 106,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImageFallback: {
    width: 108,
    height: 106,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
    fontFamily: Platform.select({
      web: "'Cairo', 'Segoe UI', sans-serif",
      default: 'System',
    }),
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.select({
      web: "'Cairo', 'Tajawal', sans-serif",
      default: 'System',
    }),
  },
  skylineWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1,
  },
  skylineImageFallback: {
    width: '100%',
    height: 180,
  },
});
