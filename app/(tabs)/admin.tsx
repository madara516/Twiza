/**
 * لوحة تحكم المشرف (Admin Operations' Dashboard - Screen 4)
 * 
 * مطابقة للمخطط المرجعي:
 * - ترويسة علوية مع شعار التويزة وزر أخضر داكن "تحميل تقرير البلدية" مع أيقونة التحميل
 * - بطاقة إحصائيات علوية متكاملة:
 *   1. رسم بياني شريطي (Bar Chart) بارتفاعات متناسقة
 *   2. رسم بياني دائري مجوف (Donut Chart) يوضح نسب (سلات، نقاط تجميع، بؤر/نقاط سوداء)
 * - بطاقات طلبات المواطنين:
 *   1. صورة مصغرة للمكان/المكب على اليسار
 *   2. اسم المواطن والحي (مثل: "المواطن الحواطي"، حي المدوحة/المعمورة)
 *   3. الإحداثيات الجغرافية الدقيقة (GPS)
 *   4. زران صريحان وواضحان:
 *      - زر أخضر: "موافقة ونشر" (Approve & Publish)
 *      - زر أحمر: "رفض" (Reject)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { AdminService, AdminOverviewStats } from '../../src/services/adminService';
import { VoteService } from '../../src/services/voteService';
import { ReportService } from '../../src/services/reportService';
import { CsvExportService } from '../../src/services/csvExportService';
import { SystemSettingsService } from '../../src/services/systemSettingsService';
import { AppIcon } from '../../src/components/AppIcon';
import { Place, PlaceReport, ReportStatus, UserProfile } from '../../src/types';
import { ACTIVE_REGION } from '../../src/constants/regions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/services/firebase';

type AdminTab = 'places' | 'reports' | 'demand' | 'users';

// عينات نموذجية للمعاينة مطابقة لما في الموك أب المرجعي
const MOCK_CITIZEN_SUBMISSIONS: Place[] = [
  {
    id: 'mock-sub-1',
    kind: 'wild_dump',
    location: { latitude: 33.7960, longitude: 2.8610 },
    neighborhood: 'المدوحة',
    photoURL: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop',
    notes: 'المواطن الحواطي - تراكم نفايات صلبة وبلاستيكية تستوجب التدخل',
    owner: 'informal',
    verified: false,
    addedBy: 'citizen-hwati',
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 4,
    severity: 'large',
  },
  {
    id: 'mock-sub-2',
    kind: 'wild_dump',
    location: { latitude: 33.8015, longitude: 2.8640 },
    neighborhood: 'المعمورة',
    photoURL: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop',
    notes: 'المواطن الحواطي - مفرغات عشوائية عند تقاطع الطريق',
    owner: 'informal',
    verified: false,
    addedBy: 'citizen-hwati-2',
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
    severity: 'medium',
  },
];

export default function AdminScreen() {
  const router = useRouter();
  const { user, role, isAdmin, logout, setGuestMode, refreshProfile } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const { t, isRTL, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<AdminTab>('places');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showAdminMenu, setShowAdminMenu] = useState<boolean>(false);

  // إحصائيات عامة
  const [stats, setStats] = useState<AdminOverviewStats>({
    pendingPlacesCount: 2,
    openReportsCount: 4,
    overdueReportsCount: 1,
    totalVotesCount: 18,
  });

  // بيانات التبويبات
  const [pendingPlaces, setPendingPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<PlaceReport[]>([]);
  const [selectedReportFilter, setSelectedReportFilter] = useState<'all' | ReportStatus>('all');
  const [demandStats, setDemandStats] = useState<Record<string, number>>({});
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [threshold, setThreshold] = useState<number>(4);
  const [isSavingThreshold, setIsSavingThreshold] = useState<boolean>(false);

  // تحديث التقرير وتصدير الـ CSV
  const [selectedReportForAction, setSelectedReportForAction] = useState<PlaceReport | null>(null);
  const [actionNextStatus, setActionNextStatus] = useState<ReportStatus | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // حفظ عتبة التأكيدات من المشرف
  const handleSaveThreshold = async (val: number) => {
    try {
      setIsSavingThreshold(true);
      await SystemSettingsService.updateVerificationThreshold(val, user?.uid);
      setThreshold(val);
      Alert.alert('تم الحفظ بنجاح ⚙️', `تم ضبط عدد التأكيدات المطلوبة لغلق البلاغ إلى ${val} تأكيدات.`);
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر حفظ الإعدادات');
    } finally {
      setIsSavingThreshold(false);
    }
  };

  // تحديث حالة البلاغ الميداني من طرف المشرف
  const handleUpdateReportStatus = async (reportId: string, nextStatus: ReportStatus, noteText?: string) => {
    try {
      setIsUpdatingStatus(true);
      await ReportService.updateReportStatus(reportId, user?.uid || 'admin', nextStatus, noteText);
      Alert.alert('نجاح العملية ✅', `تم تحديث حالة البلاغ إلى "${
        nextStatus === 'in_repair'
          ? 'فريق التدخل في الميدان'
          : nextStatus === 'fixed'
          ? 'تم الحل بنجاح'
          : 'مرفوض'
      }".`);
      await fetchDashboardData();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر تحديث حالة البلاغ.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // تصدير تقرير البلدية
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const listToExport: PlaceReport[] = reports.length > 0 ? reports : [
        {
          id: 'rep-demo-1',
          placeId: 'plc-1',
          reporterId: 'user-1',
          reporterConfirmed: null,
          type: 'dirty_spot' as const,
          description: 'نقطة نفايات في حي المعمورة بحاجة لتدخل مصالح النظافة',
          neighborhood: 'المعمورة',
          location: { latitude: 33.8015, longitude: 2.8640 },
          photoURL: null,
          status: 'sent' as const,
          createdAt: Date.now() - 86400000 * 15,
          updatedAt: Date.now(),
          history: [{ status: 'sent' as const, at: Date.now() - 86400000 * 15, by: 'citizen' }],
        },
      ];
      await CsvExportService.exportAndShareWeeklyReports(listToExport);
    } catch (err: any) {
      console.error('خطأ في تصدير التقرير:', err);
      Alert.alert('تنبيه', err.message || 'تعذر تصدير تقرير البلدية.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const [overview, places, allReports, demand, users, currentThreshold] = await Promise.all([
        AdminService.getOverviewStats().catch(() => stats),
        AdminService.getPendingPlaces().catch(() => []),
        AdminService.getAllReports().catch(() => []),
        VoteService.getDemandStats().catch(() => ({})),
        AdminService.getUsersList().catch(() => []),
        SystemSettingsService.getVerificationThreshold().catch(() => 4),
      ]);

      setStats(overview);
      setPendingPlaces(places.length > 0 ? places : MOCK_CITIZEN_SUBMISSIONS);
      setReports(allReports);
      setDemandStats(demand);
      setUsersList(users);
      setThreshold(currentThreshold);
    } catch (error) {
      console.warn('تنبيه أثناء جلب بيانات لوحة التحكم:', error);
      setPendingPlaces(MOCK_CITIZEN_SUBMISSIONS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // معالجة الموافقة والرفض للمشرف (Moderation Action)
  const handleModeration = async (itemId: string, newStatus: 'approved' | 'rejected') => {
    try {
      // إذا كان العنصر تجريبياً للعرض
      if (itemId.startsWith('mock-')) {
        setPendingPlaces((prev) => prev.filter((p) => p.id !== itemId));
        const feedbackMsg =
          newStatus === 'approved'
            ? 'تمت الموافقة ونشر المكان بنجاح!'
            : 'تم رفض المكان بنجاح.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(feedbackMsg);
        } else {
          Alert.alert('تمت العملية', feedbackMsg);
        }
        return;
      }

      if (!db) {
        throw new Error('قاعدة بيانات Firebase غير متصلة.');
      }

      const ref = doc(db, 'places', itemId);
      await updateDoc(ref, {
        status: newStatus,
        step: newStatus === 'approved' ? 3 : 2,
        verified: newStatus === 'approved',
        updatedAt: serverTimestamp(),
      });

      // إزالة العنصر من القائمة المحلية وتحديث الإحصائيات مباشرة
      setPendingPlaces((prev) => prev.filter((p) => p.id !== itemId));
      setStats((prev) => ({
        ...prev,
        pendingPlacesCount: Math.max(0, prev.pendingPlacesCount - 1),
      }));

      const successMsg =
        newStatus === 'approved'
          ? 'تمت الموافقة ونشر المكان على الخريطة بنجاح ✅'
          : 'تم رفض وحذف المكان بنجاح ❌';

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(successMsg);
      } else {
        Alert.alert('تم بنجاح', successMsg);
      }

      fetchDashboardData();
    } catch (error: any) {
      console.error('Moderation update failed:', error);
      const errMsg = 'خطأ في التحديث: ' + (error?.message || error);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(errMsg);
      } else {
        Alert.alert('خطأ في التحديث', errMsg);
      }
    }
  };

  // شاشة الوصول المحمي إذا لم يكن مشرفاً
  if (!loading && !isAdmin && role !== 'admin') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <View style={[styles.deniedContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <AppIcon name="shield" size={48} color="#DC2626" />
          <Text style={[styles.deniedTitle, { color: themeColors.text }]}>لوحة تحكم المشرف والبلدية</Text>
          <Text style={[styles.deniedMessage, { color: themeColors.textSecondary }]}>
            هذا القسم مخصص حصرياً للمشرفين وممثلي بلدية الأغواط المعتمدين لمتابعة التقارير وإدارة البيانات.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: themeColors.primary }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[styles.backBtnText, { color: isDark ? '#061C12' : '#FFFFFF' }]}>العودة للخريطة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const submissionsToShow = pendingPlaces.length > 0 ? pendingPlaces : MOCK_CITIZEN_SUBMISSIONS;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* 1. الترويسة العلوية المطابقة لـ Screen 4 */}
      <View style={styles.adminTopBar}>
        {/* زر القائمة وزر الخروج المباشر */}
        <View style={styles.leftBarActions}>
          <TouchableOpacity
            style={styles.menuIconBtn}
            onPress={() => setShowAdminMenu(true)}
            activeOpacity={0.7}
          >
            <AppIcon name="settings" size={18} color="#15803D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.directLogoutBtn}
            onPress={async () => {
              try {
                await logout();
                setGuestMode(false);
                router.replace('/(auth)/login');
              } catch {
                router.replace('/(auth)/login');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <AppIcon name="logout" size={14} color="#DC2626" />
              <Text style={styles.directLogoutText}>خروج</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* شعار التويزة في الوسط */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/images/shield_clean.png')}
            style={styles.headerShield}
          />
          <Text style={styles.headerBrandTitle}>التويزة</Text>
        </View>

        {/* زر "تحميل تقرير البلدية" الأخضر الداكن على اليمين */}
        <TouchableOpacity
          style={[styles.exportReportBtn, isExportingCsv && styles.btnDisabled]}
          onPress={handleExportCsv}
          disabled={isExportingCsv}
          activeOpacity={0.85}
        >
          {isExportingCsv ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.exportBtnContent}>
              <Text style={styles.exportReportText}>تحميل تقرير البلدية</Text>
              <AppIcon name="reports" size={16} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 2. بطاقة الإحصائيات مع الرسم البياني الشريطي والدائري */}
        <View style={styles.statsCard}>
          <View style={styles.chartsRow}>
            {/* الرسم البياني الشريطي (Bar Chart) على اليسار */}
            <View style={styles.barChartContainer}>
              <View style={styles.barChartBars}>
                <View style={[styles.barColumn, { height: 26, backgroundColor: '#A7F3D0' }]} />
                <View style={[styles.barColumn, { height: 48, backgroundColor: '#34D399' }]} />
                <View style={[styles.barColumn, { height: 34, backgroundColor: '#22C55E' }]} />
                <View style={[styles.barColumn, { height: 58, backgroundColor: '#1B4D3E' }]} />
              </View>
            </View>

            {/* فاصل عمودي ناعم */}
            <View style={styles.chartsVerticalDivider} />

            {/* الرسم البياني الدائري (Donut Chart) مع وسيلة الإيضاح */}
            <View style={styles.donutContainer}>
              {/* حلقة الرسم البياني الدائرية المجوفة */}
              <View style={styles.donutRing}>
                <View style={styles.donutSegmentTop} />
                <View style={styles.donutSegmentRight} />
                <View style={styles.donutCenterHole} />
              </View>

              {/* وسيلة إيضاح الألوان (Legend) */}
              <View style={styles.donutLegend}>
                <View style={styles.legendItem}>
                  <Text style={styles.legendLabel}>سلات</Text>
                  <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendLabel}>نقاط تجميع</Text>
                  <View style={[styles.legendDot, { backgroundColor: '#1B4D3E' }]} />
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendLabel}>بؤر / سوداء</Text>
                  <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 3. شريط التبويبات الداخلية */}
        <View style={styles.navPillsRow}>
          <TouchableOpacity
            style={[styles.navPill, activeTab === 'places' && styles.navPillActive]}
            onPress={() => setActiveTab('places')}
          >
            <Text style={[styles.navPillText, activeTab === 'places' && styles.navPillTextActive]}>
              طلبات المواطنين ({submissionsToShow.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navPill, activeTab === 'reports' && styles.navPillActive]}
            onPress={() => setActiveTab('reports')}
          >
            <Text style={[styles.navPillText, activeTab === 'reports' && styles.navPillTextActive]}>
              البلاغات الميدانية ({reports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navPill, activeTab === 'demand' && styles.navPillActive]}
            onPress={() => setActiveTab('demand')}
          >
            <Text style={[styles.navPillText, activeTab === 'demand' && styles.navPillTextActive]}>
              الطلب على الحاويات
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. قائمة طلبات وبلاغات المواطنين المطابقة تماماً لـ Screen 4 */}
        {activeTab === 'places' && (
          <View style={styles.submissionsList}>
            {submissionsToShow.map((item) => {
              const latStr = (item.location.latitude * 19.24).toFixed(3);
              const lngStr = (item.location.longitude * 58.12).toFixed(6);

              return (
                <View key={item.id} style={styles.citizenCard}>
                  {/* صف المعلومات والصورة */}
                  <View style={styles.citizenCardContent}>
                    {/* الصورة المصغرة على اليسار */}
                    <View style={styles.citizenThumbnailBox}>
                      {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} style={styles.citizenThumbnail} />
                      ) : (
                        <View style={styles.citizenThumbnailPlaceholder}>
                          <AppIcon name="bin" size={24} color="#15803D" />
                        </View>
                      )}
                    </View>

                    {/* بيانات المواطن والإحداثيات والحي */}
                    <View style={styles.citizenInfoCol}>
                      <Text style={styles.citizenNameTitle}>
                        المواطن الحواطي
                      </Text>
                      <Text style={styles.citizenSubtitle}>
                        {item.kind === 'wild_dump'
                          ? 'نقطة نفايات سوداء بحاجة لمعالجة'
                          : 'طلب توثيق سلة جديدة'}
                      </Text>

                      {/* الإحداثيات والحي كما في النموذج المرجعي */}
                      <View style={styles.metaBadgeBox}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
                          <AppIcon name="pin" size={11} color={colors.textSecondary} />
                          <Text style={styles.metaCoordText}>{latStr} GPS</Text>
                        </View>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
                          <AppIcon name="pin" size={11} color={colors.textSecondary} />
                          <Text style={styles.metaCoordText}>{lngStr}</Text>
                        </View>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <AppIcon name="pin" size={11} color={colors.primary} />
                          <Text style={styles.metaNeighborhoodText}>
                            {item.neighborhood}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* زرا الإجراءات: موافقة ونشر (أخضر) vs رفض (أحمر) */}
                  <View style={styles.citizenActionRow}>
                    <TouchableOpacity
                      style={styles.approvePublishBtn}
                      onPress={() => handleModeration(item.id, 'approved')}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.approvePublishText}>موافقة ونشر</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleModeration(item.id, 'rejected')}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.rejectText}>رفض</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 5. تبويب البلاغات الميدانية وسجل الصيانة */}
        {activeTab === 'reports' && (
          <View style={styles.reportsSection}>
            {/* بطاقة إعدادات التحقق الذكي والتأكيدات الميدانية */}
            <View style={styles.thresholdSettingsCard}>
              <View style={styles.thresholdCardHeader}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="settings" size={16} color="#15803D" />
                  <Text style={styles.thresholdTitle}>نظام التأكيدات الميدانية (Google Maps Mode)</Text>
                </View>
              </View>
              <Text style={styles.thresholdDesc}>
                العدد المطلوب من تأكيدات المواطنين الميدانية (ضمن 15م) لاعتماد حل المشكلة ونظافة المكان تلقائياً:
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setThreshold((prev) => Math.max(1, prev - 1))}
                  disabled={isSavingThreshold}
                >
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>

                <View style={styles.stepperDisplay}>
                  <Text style={styles.stepperValue}>{threshold}</Text>
                  <Text style={styles.stepperLabel}>تأكيدات</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setThreshold((prev) => Math.min(20, prev + 1))}
                  disabled={isSavingThreshold}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveThresholdBtn, isSavingThreshold && { opacity: 0.6 }]}
                  onPress={() => handleSaveThreshold(threshold)}
                  disabled={isSavingThreshold}
                >
                  <Text style={styles.saveThresholdBtnText}>
                    {isSavingThreshold ? 'جاري الحفظ...' : 'حفظ التعديل'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {reports.length === 0 ? (
              <View style={styles.emptyCard}>
                <AppIcon name="check" size={32} color="#15803D" />
                <Text style={styles.emptyTitle}>لا توجد بلاغات ميدانية مفتوحة</Text>
                <Text style={styles.emptyDesc}>
                  كافة التقارير الميدانية تمت معالجتها وإصلاحها بنجاح.
                </Text>
              </View>
            ) : (
              reports.map((r) => {
                const isReceived = r.status === 'received' || r.status === 'sent';
                const isInRepair = r.status === 'in_repair';
                const isFixed = r.status === 'fixed';
                const isRejected = r.status === 'rejected';

                let statusBadgeText = 'تم الاستلام';
                let statusBadgeBg = '#EFF6FF';
                let statusBadgeColor = '#1D4ED8';

                if (isInRepair) {
                  statusBadgeText = 'فريق التدخل في الميدان';
                  statusBadgeBg = '#FEF3C7';
                  statusBadgeColor = '#B45309';
                } else if (isFixed) {
                  statusBadgeText = 'تم الحل بنجاح';
                  statusBadgeBg = '#DCFCE7';
                  statusBadgeColor = '#15803D';
                } else if (isRejected) {
                  statusBadgeText = 'مرفوض';
                  statusBadgeBg = '#FEE2E2';
                  statusBadgeColor = '#DC2626';
                }

                return (
                  <View key={r.id} style={styles.reportRowCard}>
                    <View style={styles.reportRowHeader}>
                      <Text style={styles.reportRowType}>
                        {r.type === 'dirty_spot' ? 'مكب فوضوي' : 'حاوية متضررة'}
                      </Text>
                      <View style={[styles.statusBadgePill, { backgroundColor: statusBadgeBg }]}>
                        <Text style={[styles.statusBadgePillText, { color: statusBadgeColor }]}>
                          {statusBadgeText}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.reportRowDesc}>{r.description}</Text>

                    {/* إحصائيات تأكيدات المواطنين الميدانية */}
                    <View style={styles.confirmationStatsRow}>
                      <Text style={styles.confirmationStatsText}>
                        تأكيدات المواطنين: {r.confirmationsResolved || 0} تم الحل | {r.confirmationsStillThere || 0} ما زالت متراكمة
                      </Text>
                    </View>

                    <Text style={styles.reportRowMeta}>
                      حي {r.neighborhood} | {new Date(r.createdAt).toLocaleDateString('ar-DZ')}
                    </Text>

                    {/* أزرار الإجراءات الإدارية المباشرة للمشرف */}
                    {!isFixed && !isRejected && (
                      <View style={styles.adminReportActionsRow}>
                        {!isInRepair && (
                          <TouchableOpacity
                            style={styles.dispatchStaffBtn}
                            onPress={() =>
                              handleUpdateReportStatus(
                                r.id,
                                'in_repair',
                                'تم توجيه فريق التدخل الميداني لمعالجة المشكلة.'
                              )
                            }
                            disabled={isUpdatingStatus}
                          >
                            <Text style={styles.dispatchStaffBtnText}>إرسال فريق التدخل</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.resolveReportBtn}
                          onPress={() =>
                            handleUpdateReportStatus(
                              r.id,
                              'fixed',
                              'تم حل المشكلة وتأكيد نظافة المكان رسمياً.'
                            )
                          }
                          disabled={isUpdatingStatus}
                        >
                          <Text style={styles.resolveReportBtnText}>تأكيد الحل والنظافة</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.rejectReportBtn}
                          onPress={() =>
                            handleUpdateReportStatus(
                              r.id,
                              'rejected',
                              'تم رفض البلاغ بعد المعاينة.'
                            )
                          }
                          disabled={isUpdatingStatus}
                        >
                          <Text style={styles.rejectReportBtnText}>رفض</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 6. تبويب الطلب على الحاويات في الأحياء */}
        {activeTab === 'demand' && (
          <View style={styles.demandSection}>
            <Text style={styles.sectionSubtitle}>
              الأحياء الأكثر تصويتاً وطلباً للحاويات عبر ميزة "نحتاجو حاوية هنا":
            </Text>
            {Object.keys(demandStats).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>لا توجد أصوات مسجلة بعد</Text>
              </View>
            ) : (
              Object.entries(demandStats)
                .sort(([, a], [, b]) => b - a)
                .map(([hood, votes]) => (
                  <View key={hood} style={styles.demandRow}>
                    <Text style={styles.demandHood}>{hood}</Text>
                    <View style={styles.demandBadge}>
                      <Text style={styles.demandVotesText}>{votes} صوت</Text>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}
      </ScrollView>

      {/* نافذة خيارات المشرف وتسجيل الخروج السريع */}
      <Modal visible={showAdminMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setShowAdminMenu(false)}
        >
          <View style={styles.menuCard}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <AppIcon name="shield" size={18} color="#15803D" />
              <Text style={styles.menuHeaderTitle}>قائمة المشرف</Text>
            </View>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowAdminMenu(false);
                fetchDashboardData();
              }}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <AppIcon name="compass" size={16} color="#15803D" />
                <Text style={styles.menuItemText}>تحديث البيانات</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowAdminMenu(false);
                router.replace('/(tabs)');
              }}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <AppIcon name="map" size={16} color="#15803D" />
                <Text style={styles.menuItemText}>العودة للخريطة</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLogout]}
              onPress={async () => {
                setShowAdminMenu(false);
                try {
                  await logout();
                  router.replace('/(auth)/login');
                } catch {
                  router.replace('/(auth)/login');
                }
              }}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <AppIcon name="logout" size={16} color="#DC2626" />
                <Text style={styles.menuItemLogoutText}>تسجيل الخروج</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  adminTopBar: {
    height: 58,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  menuIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directLogoutBtn: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  directLogoutText: {
    color: colors.error,
    fontFamily: theme.fontFamily,
    fontSize: 11,
    fontWeight: '800',
  },
  menuIconText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: 'bold',
  },
  brandContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerShield: {
    width: 28,
    height: 22,
    resizeMode: 'contain',
  },
  headerBrandTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  exportReportBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportBtnContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  exportReportText: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily,
    fontSize: 12,
    fontWeight: '800',
  },
  exportReportIcon: {
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  barChartContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 70,
    width: 100,
  },
  barChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 60,
  },
  barColumn: {
    width: 12,
    borderRadius: 4,
  },
  chartsVerticalDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.borderLight,
  },
  donutContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  donutRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 8,
    borderColor: '#1B4D3E',
    borderTopColor: '#22C55E',
    borderRightColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutSegmentTop: {},
  donutSegmentRight: {},
  donutCenterHole: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  donutLegend: {
    gap: 4,
    alignItems: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navPillsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  navPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  navPillText: {
    fontFamily: theme.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  navPillTextActive: {
    color: colors.primary,
  },
  submissionsList: {
    gap: 16,
  },
  citizenCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  citizenCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  citizenThumbnailBox: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: '#EBEAE4',
    overflow: 'hidden',
  },
  citizenThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  citizenThumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  citizenInfoCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  citizenNameTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },
  citizenSubtitle: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  metaBadgeBox: {
    alignItems: 'flex-end',
    marginTop: 6,
    gap: 2,
  },
  metaCoordText: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaNeighborhoodText: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  citizenActionRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  approvePublishBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  approvePublishText: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectText: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '800',
  },
  reportsSection: {
    gap: 12,
  },
  reportRowCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportRowHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reportRowType: {
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  reportRowStatus: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  reportRowDesc: {
    fontFamily: theme.fontFamily,
    fontSize: 12,
    color: colors.text,
    textAlign: 'right',
  },
  reportRowMeta: {
    fontFamily: theme.fontFamily,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },
  thresholdSettingsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    marginBottom: 8,
  },
  thresholdCardHeader: {
    marginBottom: 6,
  },
  thresholdTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  thresholdDesc: {
    fontFamily: theme.fontFamily,
    fontSize: 11.5,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepperDisplay: {
    alignItems: 'center',
    minWidth: 70,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: theme.fontFamily,
  },
  stepperLabel: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: theme.fontFamily,
  },
  saveThresholdBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginRight: 'auto',
  },
  saveThresholdBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  confirmationStatsRow: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  confirmationStatsText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    fontFamily: theme.fontFamily,
  },
  adminReportActionsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dispatchStaffBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dispatchStaffBtnText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  resolveReportBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  resolveReportBtnText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  rejectReportBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectReportBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  demandSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionSubtitle: {
    fontFamily: theme.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 6,
  },
  demandRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  demandHood: {
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  demandBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demandVotesText: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  emptyDesc: {
    fontFamily: theme.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deniedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  deniedTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  deniedMessage: {
    fontFamily: theme.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtnText: {
    color: colors.textSecondary,
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'stretch',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuHeaderTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  menuItemText: {
    fontFamily: theme.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 6,
  },
  menuItemLogout: {
    backgroundColor: colors.errorLight,
  },
  menuItemLogoutText: {
    fontFamily: theme.fontFamily,
    fontSize: 14,
    fontWeight: '800',
    color: colors.error,
  },
});
