/**
 * شاشة البداية والترحيب (Phase 0 Hello Screen)
 * 
 * بالدارجة: هذي هي أول شاشة يشوفها المستخدم في التيليفون على Expo Go.
 * تبيّن اسم التطبيق "التويزة"، أحياء الأغواط الأربعة المعتمدة، والألوان الرسمية للحاويات والمكبات.
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
import { colors } from '../src/theme/colors';
import { theme } from '../src/theme';
import { NEIGHBORHOODS, LAGHOUAT_CENTER } from '../src/constants/laghouat';
import { t } from '../src/i18n';

export default function HelloScreen() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'kinds'>('overview');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* رأس الصفحة والشعار */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>مدينة الأغواط 📍</Text>
          </View>
          <Text style={styles.title}>{t('app_name')}</Text>
          <Text style={styles.subtitle}>{t('tagline')}</Text>
          <View style={styles.targetDevicePill}>
            <Text style={styles.targetDeviceText}>📱 Android (Expo Go) — Phase 0 Ready</Text>
          </View>
        </View>

        {/* بطاقة الترحيب */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('welcome')}</Text>
          <Text style={styles.cardDescription}>{t('welcome_desc')}</Text>
          
          <View style={styles.geoBox}>
            <Text style={styles.geoLabel}>إحداثيات المركز (Laghouat GPS):</Text>
            <Text style={styles.geoCoords}>
              خط العرض: {LAGHOUAT_CENTER.latitude} | خط الطول: {LAGHOUAT_CENTER.longitude}
            </Text>
          </View>
        </View>

        {/* أزرار التبديل للتفاعل */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'overview' && styles.tabButtonTextActive,
              ]}
            >
              الأحياء المعتمدة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'kinds' && styles.tabButtonActive]}
            onPress={() => setActiveTab('kinds')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'kinds' && styles.tabButtonTextActive,
              ]}
            >
              دليل الألوان والأنواع
            </Text>
          </TouchableOpacity>
        </View>

        {/* محتوى التبويب: الأحياء المعتمدة */}
        {activeTab === 'overview' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('neighborhoods_title')}</Text>
            <Text style={styles.helperText}>
              الأحياء المعتمدة رسمياً في المرحلة الأولى لإضافة الأماكن والتبليغات:
            </Text>
            <View style={styles.neighborhoodGrid}>
              {NEIGHBORHOODS.map((neighborhood, index) => (
                <View key={neighborhood} style={styles.neighborhoodChip}>
                  <Text style={styles.neighborhoodIndex}>#{index + 1}</Text>
                  <Text style={styles.neighborhoodName}>{neighborhood}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* محتوى التبويب: دليل الألوان */
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>أنواع الأماكن المعتمدة على الخريطة</Text>
            
            <View style={[styles.kindRow, { borderLeftColor: colors.kind.bin }]}>
              <View style={[styles.kindDot, { backgroundColor: colors.kind.bin }]} />
              <View style={styles.kindInfo}>
                <Text style={styles.kindTitle}>سلة ({t('kinds.bin')})</Text>
                <Text style={styles.kindDesc}>حاوية فردية صغيرة للنفايات العادية.</Text>
              </View>
            </View>

            <View style={[styles.kindRow, { borderLeftColor: colors.kind.collection_point }]}>
              <View
                style={[
                  styles.kindDot,
                  { backgroundColor: colors.kind.collection_point },
                ]}
              />
              <View style={styles.kindInfo}>
                <Text style={styles.kindTitle}>نقطة تجميع ({t('kinds.collection_point')})</Text>
                <Text style={styles.kindDesc}>حاويات كبرى رسمية أو مساحات تفريغ معتمدة من البلدية.</Text>
              </View>
            </View>

            <View style={[styles.kindRow, { borderLeftColor: colors.kind.wild_dump }]}>
              <View
                style={[styles.kindDot, { backgroundColor: colors.kind.wild_dump }]}
              />
              <View style={styles.kindInfo}>
                <Text style={styles.kindTitle}>نقطة سوداء ({t('kinds.wild_dump')})</Text>
                <Text style={styles.kindDesc}>مكب نفايات فوضوي غير رسمي يحتاج تدخل البلدية.</Text>
              </View>
            </View>
          </View>
        )}

        {/* حالة النظام */}
        <View style={styles.statusFooter}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{t('status_ok')}</Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  badgeText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: theme.typography.sizes.sm,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  targetDevicePill: {
    marginTop: theme.spacing.sm,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  targetDeviceText: {
    fontSize: theme.typography.sizes.xs,
    color: '#E65100',
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  cardDescription: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  geoBox: {
    marginTop: theme.spacing.md,
    backgroundColor: '#F1F8E9',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#DCEDC8',
  },
  geoLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  geoCoords: {
    fontSize: theme.typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#ECEFF1',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: theme.spacing.xs,
  },
  helperText: {
    fontSize: theme.typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
  neighborhoodGrid: {
    gap: theme.spacing.sm,
  },
  neighborhoodChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  neighborhoodIndex: {
    fontSize: theme.typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  neighborhoodName: {
    fontSize: theme.typography.sizes.sm,
    color: colors.text,
    fontWeight: 'bold',
  },
  kindRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: theme.spacing.sm,
  },
  kindDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  kindInfo: {
    flex: 1,
  },
  kindTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  kindDesc: {
    fontSize: theme.typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  statusFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
