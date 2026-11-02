/**
 * مخطط شاشات المصادقة (Auth Stack Layout)
 * 
 * بالدارجة: هذا منظم الشاشات تاع الدخول والتسجيل واسترجاع كلمة المرور.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function AuthLayout() {
  return (
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
        name="login"
        options={{
          title: 'تسجيل الدخول',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'إنشاء حساب جديد',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'استرجاع كلمة المرور',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
