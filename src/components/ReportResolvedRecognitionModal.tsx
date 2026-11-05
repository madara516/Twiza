/**
 * نافذة التكريم والاحتفاء بالمواطن عند دخول التطبيق
 * (Citizen Recognition & Solved Report Modal)
 * 
 * بالدارجة: هاد المودال يظهر للمواطن أول ما يدخل للتطبيق إذا كان بلاغ بعثه
 * تم تأكيده أو حله في الميدان، باش يحس بقيمة مساهمته وفرحة إنجازه،
 * مع زر مباشر يوجهه لمتابعة تفاصيل البلاغ.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { ReportService } from '../services/reportService';
import { PlaceReport } from '../types';
import { AppIcon } from './AppIcon';

const SEEN_REPORTS_STORAGE_KEY = 'twizza_acknowledged_resolved_reports';

export const ReportResolvedRecognitionModal: React.FC = () => {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [celebratedReport, setCelebratedReport] = useState<PlaceReport | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || isAdmin) return;

    let isMounted = true;

    const checkRecentlySolvedReports = async () => {
      try {
        const myReports = await ReportService.getMyReports(user.uid);
        if (!myReports || myReports.length === 0) return;

        // جلب قائمة المعرفات التي احتفينا بها مسبقاً
        const rawSeen = await AsyncStorage.getItem(SEEN_REPORTS_STORAGE_KEY);
        const seenIds: string[] = rawSeen ? JSON.parse(rawSeen) : [];

        // البحث عن أول بلاغ تم حله أو تم تأكيده ولم يسبق إظهاره للمستخدم
        const unacknowledgedSolved = myReports.find(
          (r) =>
            (r.status === 'fixed' || (r.confirmationsResolved && r.confirmationsResolved >= 1)) &&
            !seenIds.includes(r.id)
        );

        if (unacknowledgedSolved && isMounted) {
          setCelebratedReport(unacknowledgedSolved);
          setVisible(true);
        }
      } catch (err) {
        console.warn('فشل فحص البلاغات المحلولة للاحتفاء:', err);
      }
    };

    // فحص البلاغات عند دخول المستخدم للتطبيق
    checkRecentlySolvedReports();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const markAsAcknowledged = async (reportId: string) => {
    try {
      const rawSeen = await AsyncStorage.getItem(SEEN_REPORTS_STORAGE_KEY);
      const seenIds: string[] = rawSeen ? JSON.parse(rawSeen) : [];
      if (!seenIds.includes(reportId)) {
        seenIds.push(reportId);
        await AsyncStorage.setItem(SEEN_REPORTS_STORAGE_KEY, JSON.stringify(seenIds));
      }
    } catch (err) {
      console.warn('تعذر حفظ حالة المعاينة:', err);
    }
  };

  const handleTrackState = async () => {
    if (celebratedReport) {
      await markAsAcknowledged(celebratedReport.id);
    }
    setVisible(false);
    router.push('/(tabs)/reports');
  };

  const handleClose = async () => {
    if (celebratedReport) {
      await markAsAcknowledged(celebratedReport.id);
    }
    setVisible(false);
  };

  if (!visible || !celebratedReport) {
    return null;
  }

  let problemName = 'بلاغك البيئي';
  if (celebratedReport.type === 'broken') problemName = 'الحاوية المكسورة';
  else if (celebratedReport.type === 'full') problemName = 'الحاوية الممتلئة';
  else if (celebratedReport.type === 'dirty_spot') problemName = 'تراكم النفايات';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* دائرة التكريم والأيقونة الاحتفالية */}
          <View style={styles.iconCircle}>
            <AppIcon name="star" size={38} color="#15803D" focused />
          </View>

          <Text style={styles.title}>عمل رائع يا بطل!</Text>

          <Text style={styles.subtitle}>
            تم تأكيد صحة بلاغك حول{' '}
            <Text style={styles.highlightText}>"{problemName}"</Text> في{' '}
            <Text style={styles.highlightText}>{celebratedReport.neighborhood}</Text>{' '}
            بنجاح بفضل مشاركتك وحرصك على نظافة حومتنا!
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.statPill}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <AppIcon name="leaf" size={12} color="#475569" />
                <Text style={styles.statPillText}>أثر بيئي إيجابي</Text>
              </View>
            </View>
            <View style={[styles.statPill, styles.statPillGreen]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <AppIcon name="check" size={12} color="#15803D" />
                <Text style={[styles.statPillText, styles.statPillGreenText]}>
                  بلاغ مؤكد وموثوق
                </Text>
              </View>
            </View>
          </View>

          {/* زر المتابعة إلى صفحة التقارير */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleTrackState}
            activeOpacity={0.88}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <AppIcon name="reports" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                اضغط هنا لمتابعة حالة البلاغ
              </Text>
            </View>
          </TouchableOpacity>

          {/* زر المتابعة إلى التطبيق */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              المتابعة إلى التطبيق
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 10000,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#DCFCE7',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.22)',
      },
    }),
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  partyEmoji: {
    fontSize: 38,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Cairo_700Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 23,
    color: '#475569',
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'center',
    marginBottom: 18,
  },
  highlightText: {
    color: colors.primary,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 20,
  },
  statPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'Cairo_700Bold',
  },
  statPillGreen: {
    backgroundColor: '#E8F5E9',
  },
  statPillGreenText: {
    color: '#15803D',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Cairo_700Bold',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
  },
});
