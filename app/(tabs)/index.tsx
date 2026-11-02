/**
 * شاشة الخريطة (Map Tab)
 * 
 * بالدارجة: هذه هي شاشة الخريطة، في المرحلة 1 تعرض معلومات الأحياء وحالة الاتصال
 * وتكون جاهزة كقاعدة لتثبيت الخريطة التفاعلية في المرحلة 2 (Phase 2).
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { NEIGHBORHOODS, LAGHOUAT_CENTER } from '../../src/constants/laghouat';
import { useAuth } from '../../src/context/AuthContext';
import { t } from '../../src/i18n';

export default function MapScreen() {
  const router = useRouter();
  const { user, profile, isGuest } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* شريط حالة الدخول / الضيف */}
        <View style={styles.authBanner}>
          {user ? (
            <View style={styles.userRow}>
              <Text style={styles.welcomeText}>
                مرحباً، {profile?.displayName || user.email} 👋
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {profile?.role === 'admin' ? 'مدير (Admin)' : 'مواطن'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.guestRow}>
              <Text style={styles.guestText}>تتصفح حالياً كـ ضيف (Guest) 👁️</Text>
              <TouchableOpacity
                style={styles.loginBtnSmall}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.loginBtnTextSmall}>تسجيل الدخول</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* بطاقة الخريطة التحضيرية لـ Phase 2 */}
        <View style={styles.mapNoticeCard}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapTitle}>الخريطة التفاعلية لمدينة الأغواط</Text>
          <Text style={styles.mapDesc}>
            في المرحلة القادمة (المرحلة 2) ستظهر هنا الخريطة التفاعلية بالكامل مع
            مواقع الحاويات، المكبات الفوضوية، وميزة "أقرب الأماكن لي" عبر GPS.
          </Text>

          <View style={styles.geoBox}>
            <Text style={styles.geoTitle}>مركز بلدية الأغواط:</Text>
            <Text style={styles.geoText}>
              خط العرض: {LAGHOUAT_CENTER.latitude} | خط الطول: {LAGHOUAT_CENTER.longitude}
            </Text>
          </View>
        </View>

        {/* الأحياء المغطاة */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>الأحياء المعتمدة في النسخة الأولى</Text>
          <View style={styles.neighborhoodList}>
            {NEIGHBORHOODS.map((neighborhood, index) => (
              <View key={neighborhood} style={styles.chip}>
                <Text style={styles.chipIndex}>#{index + 1}</Text>
                <Text style={styles.chipName}>{neighborhood}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* دليل الألوان الرسمي */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ألوان الحاويات المعتمدة</Text>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: colors.kind.bin }]} />
            <Text style={styles.legendText}>سلة (أخضر)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: colors.kind.collection_point }]} />
            <Text style={styles.legendText}>نقطة تجميع (أخضر داكن)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: colors.kind.wild_dump }]} />
            <Text style={styles.legendText}>نقطة سوداء (أحمر)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  authBanner: {
    backgroundColor: colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: 'bold',
    color: colors.primary,
  },
  roleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: 'bold',
  },
  guestRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestText: {
    fontSize: theme.typography.sizes.xs,
    color: colors.textSecondary,
  },
  loginBtnSmall: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  loginBtnTextSmall: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapNoticeCard: {
    backgroundColor: '#E8F5E9',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  mapTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  mapDesc: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  geoBox: {
    marginTop: theme.spacing.md,
    backgroundColor: colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    width: '100%',
    alignItems: 'center',
  },
  geoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  geoText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
  neighborhoodList: {
    gap: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  chipIndex: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  chipName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
