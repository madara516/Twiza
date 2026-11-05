/**
 * شاشة الرئيسية (Home Dashboard Screen - Mockup Screen 2)
 * 
 * بالدارجة: هادي الشاشة الرئيسية المطابقة تماماً لـ Screen 2 في الموك آب:
 * - ترحيب بالمواطن: Good morning, Adel 👏 Let's make Laghouat greener!
 * - بطاقة نقاط وأثر المواطن: 5 ★ Citizen مع ساعات التطوع وعدد التويزات والبلاغات.
 * - رسم بياني لمستوى الأثر البيئي (Your Impact).
 * - بطاقة الفعالية القادمة للتويزة: Next Twiza Event مع زر Join.
 * - أزرار الوصول السريع للخريطة والبلاغات.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { AppIcon } from '../../src/components/AppIcon';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const userName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'عادل';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. الترويسة والترحيب + صورة الملف الشخصي */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.greetingContainer}>
            <Text style={styles.greetingTitle}>
              صباح الخير، {userName}
            </Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <AppIcon name="leaf" size={13} color="#15803D" />
              <Text style={styles.greetingSubtitle}>
                معاً لنجعل الأغواط أنقى وأجمل!
              </Text>
            </View>
          </View>
        </View>

        {/* 2. بطاقة رتبة المواطن والأثر الشهري (Citizen Score Card) */}
        <View style={styles.citizenCard}>
          <View style={styles.citizenCardHeader}>
            <View style={styles.impactProgressBadge}>
              <Text style={styles.impactProgressText}>4/5</Text>
            </View>
            <View style={styles.citizenBadgeRow}>
              <Text style={styles.citizenRank}>مواطن مساهم ★ 5</Text>
              <Text style={styles.citizenRankSub}>أثرك البيئي هذا الشهر</Text>
            </View>
          </View>

          {/* شريط التقدم الأخضر */}
          <View style={styles.progressBarTrack}>
            <View style={styles.progressBarFill} />
          </View>

          {/* أعمدة الإحصائيات الأربعة */}
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>12 سا</Text>
              <Text style={styles.statLabel}>تطوع</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>حملات</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>بلاغات</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>#3</Text>
              <Text style={styles.statLabel}>في الحي</Text>
            </View>
          </View>
        </View>

        {/* 3. بطاقة رسم الأثر البيئي (Your Impact Graph) */}
        <View style={styles.impactCard}>
          <View style={styles.sectionHeaderRow}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.viewDetailsText}>عرض التفاصيل ←</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>أثر مساهماتك</Text>
          </View>

          {/* محاكاة الرسم البياني الأخضر الانسيابي */}
          <View style={styles.chartWrapper}>
            <View style={styles.chartLineContainer}>
              <View style={[styles.chartNode, { left: '10%', bottom: '25%' }]} />
              <View style={[styles.chartNode, { left: '35%', bottom: '40%' }]} />
              <View style={[styles.chartNode, { left: '65%', bottom: '70%' }]} />
              <View style={[styles.chartNode, { left: '90%', bottom: '55%' }]} />
              <View style={styles.chartCurveLine} />
            </View>
            <View style={styles.chartMonthsRow}>
              <Text style={styles.monthText}>سبتمبر</Text>
              <Text style={styles.monthText}>أكتوبر</Text>
              <Text style={styles.monthText}>نوفمبر</Text>
              <Text style={styles.monthText}>ديسمبر</Text>
            </View>
          </View>
        </View>

        {/* 4. بطاقة الفعالية القادمة للتويزة (Next Twiza Event Card) */}
        <View style={styles.eventCard}>
          <View style={styles.eventImagePlaceholder}>
            <Image
              source={require('../../assets/icons/extracted/img_laghouat_oasis.png')}
              style={styles.eventImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.eventInfo}>
            <View style={styles.eventHeaderRow}>
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => router.push('/(tabs)/chat')}
                activeOpacity={0.85}
              >
                <Text style={styles.joinBtnText}>انضمام</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.eventTitle}>فعالية التويزة القادمة</Text>
                <Text style={styles.eventSubtitle}>تنظيف وتجميل المدينة القديمة</Text>
              </View>
            </View>

            <View style={styles.eventMetaRow}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <AppIcon name="people" size={13} color="#6B7280" />
                <Text style={styles.eventMetaText}>12 متطوع</Text>
              </View>
              <Text style={styles.eventMetaDot}>•</Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <AppIcon name="pin" size={13} color="#6B7280" />
                <Text style={styles.eventMetaText}>نهج المقاومة الرئيسي</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. بطاقات الوصول السريع للخريطة والشات */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(tabs)/map')}
            activeOpacity={0.85}
          >
            <View style={styles.quickIconCircle}>
              <AppIcon name="bin" size={20} color={colors.primary} />
            </View>
            <Text style={styles.quickCardTitle}>أقرب الحاويات</Text>
            <Text style={styles.quickCardSubtitle}>12 حاوية قريبة منك ←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(tabs)/add')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <AppIcon name="camera" size={20} color={colors.primary} />
            </View>
            <Text style={styles.quickCardTitle}>إضافة بلاغ</Text>
            <Text style={styles.quickCardSubtitle}>ساهم في نظافة الأغواط ←</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 95,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  avatarBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#23703F',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  citizenCard: {
    backgroundColor: '#EAF4ED',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D7E9DC',
  },
  citizenCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  citizenBadgeRow: {
    alignItems: 'flex-start',
  },
  citizenRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E34',
    fontFamily: theme.fontFamily,
  },
  citizenRankSub: {
    fontSize: 11,
    color: '#4B7764',
    marginTop: 1,
  },
  impactProgressBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E34',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    width: '80%',
    height: '100%',
    backgroundColor: '#23703F',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E34',
  },
  statLabel: {
    fontSize: 10,
    color: '#4B7764',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#C5DEC8',
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#23703F',
    fontWeight: '600',
  },
  chartWrapper: {
    height: 100,
    justifyContent: 'flex-end',
  },
  chartLineContainer: {
    height: 70,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chartNode: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#23703F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  chartCurveLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    bottom: '40%',
    height: 2,
    backgroundColor: '#86EFAC',
  },
  chartMonthsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  monthText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  eventImagePlaceholder: {
    height: 110,
    backgroundColor: '#E5E7EB',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventInfo: {
    padding: 14,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  eventSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  joinBtn: {
    backgroundColor: '#23703F',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 16,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  eventMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventMetaDot: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    fontFamily: theme.fontFamily,
  },
  quickCardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
});
