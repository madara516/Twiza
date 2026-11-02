/**
 * مخطط أشرطة التبويب السفلية (Bottom Tabs Layout)
 * 
 * بالدارجة: هذا هو شريط الأزرار التحتاني اللي يتنقل بيه المستخدم بين:
 * الخريطة، إضافة مكان، تقاريري، وحسابي.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const { role } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الخريطة',
          headerTitle: 'التويزة — الأغواط',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>🗺️</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: 'إضافة مكان',
          headerTitle: 'إضافة مكان جديد',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>➕</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'تقاريري',
          headerTitle: 'متابعة التقارير والشكاوى',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📋</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          headerTitle: 'الملف الشخصي',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
