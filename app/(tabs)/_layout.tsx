/**
 * مخطط أشرطة التبويب السفلية (Bottom Tabs Layout)
 * 
 * بالدارجة: هذا هو شريط الأزرار التحتاني اللي يتنقل بيه المستخدم بين:
 * الخريطة، إضافة مكان، تقاريري، وحسابي، مع هوية بصرية متناسقة بالأخضر الغابي (#1B4D3E).
 */

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const { user, isGuest, loading, role, isAdmin } = useAuth();

  // إذا تم تسجيل الخروج ولم يعد هناك مستخدم ولا وضع ضيف، يتم الإخراج فوراً لشاشة الدخول
  if (!loading && !user && !isGuest) {
    return <Redirect href="/(auth)/login" />;
  }

  const hasAdminAccess = Boolean(isAdmin || role === 'admin');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily,
          fontSize: 12,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.borderLight,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: theme.fontFamily,
          fontWeight: '800',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الخريطة',
          headerShown: false,
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
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>➕</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'تقاريري',
          headerShown: false,
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
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>👤</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'الإدارة',
          headerShown: false,
          href: hasAdminAccess ? '/admin' : null,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>🛡️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
