/**
 * المخطط الجذري للتطبيق (Root Layout)
 * 
 * بالدارجة: هذا هو الهيكل الرئيسي لكل صفحات التطبيق، يضمن تغليف التطبيق
 * بـ AuthProvider لتوفير حالة المستخدم وتفعيل اتجاه اليمين إلى اليسار (RTL).
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { setupRTL } from '../src/i18n';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  useEffect(() => {
    // تفعيل اتجاه اليمين إلى اليسار للغة العربية الافتراضية
    setupRTL('ar');
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
