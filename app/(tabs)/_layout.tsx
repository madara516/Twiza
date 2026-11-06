/**
 * مخطط أشرطة التبويب السفلية الخمسة المطابقة للموك آب (Mockup 5-Tab Bar Layout)
 * 
 * بالدارجة: شريط الأزرار السفلي الأصلي المكون من 5 تبويبات مع الزر الدائري الأخضر البارز (+) في المنتصف:
 * 1. Home (الرئيسية)
 * 2. Reports (تقاريري)
 * 3. (+) Add (إضافة تقرير/مكان - زر دائري مرتفع)
 * 4. Chat (شات الحومة)
 * 5. Map (الخريطة الحرة)
 */

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTheme } from '../../src/context/ThemeContext';
import { AppIcon } from '../../src/components/AppIcon';

export default function TabLayout() {
  const { user, isGuest, loading, role, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  // إذا تم تسجيل الخروج ولم يعد هناك مستخدم ولا وضع ضيف، يتم الإخراج فوراً لشاشة الدخول
  if (!loading && !user && !isGuest) {
    return <Redirect href="/(auth)/login" />;
  }

  const hasAdminAccess = Boolean(isAdmin || role === 'admin');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily,
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
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
      {/* 1. الرئيسية (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name="home" color={String(color || colors.primary)} focused={focused} size={22} />
          ),
        }}
      />

      {/* 2. تقاريري (Reports) */}
      <Tabs.Screen
        name="reports"
        options={{
          title: t('tabs.reports'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name="reports" color={String(color || colors.primary)} focused={focused} size={22} />
          ),
        }}
      />

      {/* 3. زر الإضافة المركزي البارز (+) المطابق للموك آب */}
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          headerTitle: t('add.title'),
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.centerFabButton, { backgroundColor: isDark ? '#4ADE80' : '#23703F' }]}>
              <AppIcon name="plus" size={24} color={isDark ? '#061C12' : '#FFFFFF'} focused />
            </View>
          ),
        }}
      />

      {/* 4. شات الحومة (Chat) */}
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name="chat" color={String(color || colors.primary)} focused={focused} size={22} />
          ),
        }}
      />

      {/* 5. الخريطة (Map) */}
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name="map" color={String(color || colors.primary)} focused={focused} size={22} />
          ),
        }}
      />

      {/* التبويبات الثانوية التي لا تظهر في الشريط السفلي لكنها قابلة للفتح */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerFabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    top: -12,
  },
});
