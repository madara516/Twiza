/**
 * المخطط الجذري للتطبيق (Root Layout)
 * 
 * يطبق غلاف الهاتف الذكي على متصفح الويب (Mobile App Shell) لحماية التصميم
 * المتجاوب من التمدد العريض (100% width)، مع دعم RTL، واللغات الثلاثية، والنمطين النهاري والليلي الأخضر.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { LanguageProvider, useLanguage } from '../src/context/LanguageContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { GlobalProximityWatcher } from '../src/components/GlobalProximityWatcher';
import { ReportResolvedRecognitionModal } from '../src/components/ReportResolvedRecognitionModal';

function InnerRootLayout() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useLanguage();

  useEffect(() => {
    // تحميل خطوط Google Fonts (Cairo & Tajawal) وإعداد اتجاه الصفحة في بيئة الويب
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontLinkId = 'twizza-arabic-fonts';
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement('link');
        link.id = fontLinkId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  const stackContent = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <GlobalProximityWatcher />
      <ReportResolvedRecognitionModal />
      {Platform.OS === 'web' ? (
        <View style={[styles.webBackdrop, { backgroundColor: isDark ? '#040F0B' : '#EAE6DF' }]}>
          <View style={[styles.webPhoneContainer, { backgroundColor: colors.background }]}>
            {stackContent}
          </View>
        </View>
      ) : (
        stackContent
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <InnerRootLayout />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    backgroundColor: '#EAE6DF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh' as any,
    width: '100%',
  },
  webPhoneContainer: {
    width: '100%',
    maxWidth: 430,
    minHeight: '100vh' as any,
    maxHeight: '100vh' as any,
    backgroundColor: '#F8FAF8',
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
        } as any)
      : {}),
  },
});
