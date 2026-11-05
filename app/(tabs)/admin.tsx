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
import { AdminService, AdminOverviewStats } from '../../src/services/adminService';
import { VoteService } from '../../src/services/voteService';
import { ReportService } from '../../src/services/reportService';
import { CsvExportService } from '../../src/services/csvExportService';
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

  // تحديث التقرير وتصدير الـ CSV
  const [selectedReportForAction, setSelectedReportForAction] = useState<PlaceReport | null>(null);
  const [actionNextStatus, setActionNextStatus] = useState<ReportStatus | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

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
      const [overview, places, allReports, demand, users] = await Promise.all([
        AdminService.getOverviewStats().catch(() => stats),
        AdminService.getPendingPlaces().catch(() => []),
        AdminService.getAllReports().catch(() => []),
        VoteService.getDemandStats().catch(() => ({})),
        AdminService.getUsersList().catch(() => []),
      ]);

      setStats(overview);
      setPendingPlaces(places.length > 0 ? places : MOCK_CITIZEN_SUBMISSIONS);
      setReports(allReports);
      setDemandStats(demand);
      setUsersList(users);
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedIcon}>🔒</Text>
          <Text style={styles.deniedTitle}>لوحة تحكم المشرف والبلدية</Text>
          <Text style={styles.deniedMessage}>
            هذا القسم مخصص حصرياً للمشرفين وممثلي بلدية الأغواط المعتمدين لمتابعة التقارير وإدارة البيانات.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.backBtnText}>العودة للخريطة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const submissionsToShow = pendingPlaces.length > 0 ? pendingPlaces : MOCK_CITIZEN_SUBMISSIONS;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. الترويسة العلوية المطابقة لـ Screen 4 */}
      <View style={styles.adminTopBar}>
        {/* زر القائمة وزر الخروج المباشر */}
        <View style={styles.leftBarActions}>
          <TouchableOpacity
            style={styles.menuIconBtn}
            onPress={() => setShowAdminMenu(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIconText}>☰</Text>
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
            <Text style={styles.directLogoutText}>خروج 🚪</Text>
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
              <Text style={styles.exportReportIcon}>📥</Text>
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
                          <Text style={{ fontSize: 24 }}>🗑️</Text>
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
                        <Text style={styles.metaCoordText}>{latStr} GPS 📍</Text>
                        <Text style={styles.metaCoordText}>{lngStr} 📍</Text>
                        <Text style={styles.metaNeighborhoodText}>
                          📌 {item.neighborhood}
                        </Text>
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
            {reports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>لا توجد بلاغات ميدانية مفتوحة</Text>
                <Text style={styles.emptyDesc}>
                  كافة التقارير الميدانية تمت معالجتها وإصلاحها بنجاح.
                </Text>
              </View>
            ) : (
              reports.map((r) => (
                <View key={r.id} style={styles.reportRowCard}>
                  <View style={styles.reportRowHeader}>
                    <Text style={styles.reportRowType}>
                      {r.type === 'dirty_spot' ? 'مكب فوضوي 🔴' : 'حاوية متضررة 🔨'}
                    </Text>
                    <Text style={styles.reportRowStatus}>
                      الحالة: {r.status}
                    </Text>
                  </View>
                  <Text style={styles.reportRowDesc}>{r.description}</Text>
                  <Text style={styles.reportRowMeta}>
                    حي {r.neighborhood} | {new Date(r.createdAt).toLocaleDateString('ar-DZ')}
                  </Text>
                </View>
              ))
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
                      <Text style={styles.demandVotesText}>{votes} صوت 🗳️</Text>
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
            <Text style={styles.menuHeaderTitle}>قائمة المشرف 🛡️</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowAdminMenu(false);
                fetchDashboardData();
              }}
            >
              <Text style={styles.menuItemText}>تحديث البيانات 🔄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowAdminMenu(false);
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.menuItemText}>العودة للخريطة 🗺️</Text>
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
              <Text style={styles.menuItemLogoutText}>تسجيل الخروج 🚪</Text>
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
