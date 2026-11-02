/**
 * المخطط الجذري للتطبيق (Root Layout)
 * 
 * بالدارجة: هذا هو الهيكل الرئيسي لكل صفحات التطبيق، يضمن تفعيل الـ RTL (من اليمين لليسار)
 * ويهيئ شريط التنقل والـ SafeArea.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { setupRTL } from '../src/i18n';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  useEffect(() => {
    // تفعيل اتجاه اليمين إلى اليسار للغة العربية الافتراضية
    setupRTL('ar');
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'التويزة — الأغواط',
            headerShown: true,
          }}
        />
      </Stack>
    </>
  );
}
