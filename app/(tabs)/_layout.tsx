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
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { AppIcon } from '../../src/components/AppIcon';

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
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily,
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomColor: '#E5E7EB',
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
          title: 'Home',
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
          title: 'Reports',
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
          headerTitle: 'Add Report',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerFabButton}>
              <AppIcon name="plus" size={24} color="#FFFFFF" focused />
            </View>
          ),
        }}
      />

      {/* 4. شات الحومة (Chat) */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
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
          title: 'Map',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name="map" color={String(color || colors.primary)} focused={focused} size={22} />
          ),
        }}
      />

      {/* التبويبات الثانوية التي لا تظهر في الشريط السفلي */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          headerShown: false,
          href: hasAdminAccess ? '/admin' : null,
          tabBarIcon: ({ color, focused }) => (
            <AppIcon name="shield" color={String(color || colors.primary)} focused={focused} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerFabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#23703F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 18 : 12,
    elevation: 6,
    shadowColor: '#23703F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});
