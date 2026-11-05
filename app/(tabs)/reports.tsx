/**
 * شاشة تقاريري وتتبع البلاغات والأماكن المضافة (Screen 3: 'My Reports' Tab)
 * 
 * مطابقة للمخطط المرجعي:
 * - ترويسة خضراء داكنة (#1B4D3E) مع زر العودة وعنوان "My Reports"
 * - بطاقة بيضاء نظيفة تعرض:
 *   1. صورة التقرير أو المكان المضاف أو أيقونة الكاميرا الاحتياطية
 *   2. العنوان والحي
 *   3. الإحداثيات الجغرافية الدقيقة (GPS)
 *   4. شارة حالة صريحة مثل "قيد المراجعة" (Pending moderation)
 *   5. مسار تتبع رأسي مكون من 4 مراحل دقيقة:
 *      (1) أرسل ➔ (2) استلم ➔ (3) قيد الإصلاح ➔ (4) تم الإصلاح مع الطوابع الزمنية
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { PlaceReport, ReportType, ReportStatus, Place } from '../../src/types';
import { ReportService } from '../../src/services/reportService';
import { PlaceService } from '../../src/services/placeService';
import { StorageService } from '../../src/services/storageService';
import { ACTIVE_REGION } from '../../src/constants/regions';

interface UnifiedTrackingItem {
  id: string;
  sourceType: 'report' | 'place';
  title: string;
  category: string;
  neighborhood: string;
  description?: string;
  photoURL?: string | null;
  latitude: number;
  longitude: number;
  createdAt: number;
  status: 'pending' | 'sent' | 'received' | 'in_repair' | 'fixed' | 'rejected';
  history?: any[];
  verified?: boolean;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { user, logout, setGuestMode } = useAuth();

  const [reports, setReports] = useState<PlaceReport[]>([]);
  const [myPlaces, setMyPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'reports' | 'places'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'in_progress' | 'solved'>('all');

  // نافذة إضافة تقرير سريع
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newType, setNewType] = useState<ReportType>('dirty_spot');
  const [newDesc, setNewDesc] = useState('');
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // جلب كافة بيانات التتبع للمستخدم
  const loadTrackingData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [userReports, userPlaces] = await Promise.all([
        ReportService.getMyReports(user.uid),
        PlaceService.getMyPlaces(user.uid),
      ]);
      setReports(userReports);
      setMyPlaces(userPlaces);
    } catch (err) {
      console.error('فشل في جلب بيانات التتبع:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrackingData();
  };

  // دمج وتحويل البيانات لقائمة موحدة مطابقة للتصميم
  const unifiedItems: UnifiedTrackingItem[] = React.useMemo(() => {
    const list: UnifiedTrackingItem[] = [];

    // 1. البلاغات الميدانية
    reports.forEach((r) => {
      let title = 'بلاغ عن مشكلة بيئية';
      if (r.type === 'dirty_spot') title = `كومة نفايات في ${r.neighborhood}`;
      else if (r.type === 'broken') title = `حاوية مكسورة في ${r.neighborhood}`;
      else if (r.type === 'full') title = `حاوية ممتلئة في ${r.neighborhood}`;

      list.push({
        id: `rep-${r.id}`,
        sourceType: 'report',
        title,
        category: r.type === 'dirty_spot' ? 'نقطة سوداء' : 'حاوية نفايات',
        neighborhood: r.neighborhood,
        description: r.description,
        photoURL: r.photoURL,
        latitude: r.location?.latitude || ACTIVE_REGION.center.latitude,
        longitude: r.location?.longitude || ACTIVE_REGION.center.longitude,
        createdAt: r.createdAt,
        status: r.status,
        history: r.history,
      });
    });

    // 2. الأماكن المضافة من المستخدم
    myPlaces.forEach((p) => {
      let kindLabel = 'سلة نفايات';
      if (p.kind === 'collection_point') kindLabel = 'نقطة تجميع';
      if (p.kind === 'wild_dump') kindLabel = 'نقطة سوداء';

      list.push({
        id: `plc-${p.id}`,
        sourceType: 'place',
        title: `${kindLabel} في ${p.neighborhood}`,
        category: kindLabel,
        neighborhood: p.neighborhood,
        description: p.notes,
        photoURL: p.photoURL,
        latitude: p.location.latitude,
        longitude: p.location.longitude,
        createdAt: p.createdAt,
        status: p.verified ? 'fixed' : 'pending',
        verified: p.verified,
      });
    });

    // ترتيب زمني من الأحدث إلى الأقدم
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [reports, myPlaces]);

  // التصفية حسب الحالة ونوع التبويب المطابقة للموك آب
  const filteredItems = unifiedItems.filter((item) => {
    if (activeTab === 'reports' && item.sourceType !== 'report') return false;
    if (activeTab === 'places' && item.sourceType !== 'place') return false;

    if (statusFilter === 'processing' && item.status !== 'sent' && item.status !== 'received') return false;
    if (statusFilter === 'in_progress' && item.status !== 'in_repair' && item.status !== 'pending') return false;
    if (statusFilter === 'solved' && item.status !== 'fixed') return false;

    return true;
  });

  // تنسيق التاريخ والوقت كما في النموذج (YYYY-MM-DD HH:mm:ss)
  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // إرسال تقرير جديد
  const handleSubmitReport = async () => {
    if (!user) return;
    if (!newDesc.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة وصف موجز للبلاغ.');
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedPhotoURL: string | null = null;
      if (newPhotoUri) {
        try {
          uploadedPhotoURL = await StorageService.uploadPlacePhoto(newPhotoUri, user.uid);
        } catch (uploadErr) {
          console.warn('تعذر رفع الصورة للسحابة، جاري الإرسال بدونها:', uploadErr);
        }
      }

      await ReportService.createReport(
        {
          placeId: null,
          type: newType,
          description: newDesc.trim(),
          photoURL: uploadedPhotoURL,
          neighborhood: ACTIVE_REGION.neighborhoods[0],
          location: ACTIVE_REGION.center,
        },
        user.uid
      );

      setShowCreateModal(false);
      setNewDesc('');
      setNewPhotoUri(null);
      Alert.alert('شكراً لك', 'تم إرسال بلاغك وسيظهر فوراً في سجل التتبع.');
      await loadTrackingData();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر إرسال البلاغ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. الترويسة العلوية الخضراء الداكنة المطابقة لـ Screen 3 */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.headerBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerLogoutBtn}
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
            <Text style={styles.headerLogoutText}>خروج 🚪</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.headerAddBtnText}>+ جديد</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. شريط فلاتر الحالات المطابق تماماً لـ Screen 3 في الموك آب */}
      <View style={styles.statusPillsRow}>
        <TouchableOpacity
          style={[styles.statusPill, statusFilter === 'all' && styles.statusPillActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.statusPillText, statusFilter === 'all' && styles.statusPillTextActive]}>
            All ({unifiedItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusPill, statusFilter === 'processing' && styles.statusPillActiveBlue]}
          onPress={() => setStatusFilter('processing')}
        >
          <Text style={[styles.statusPillText, statusFilter === 'processing' && styles.statusPillTextActiveBlue]}>
            Processing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusPill, statusFilter === 'in_progress' && styles.statusPillActiveAmber]}
          onPress={() => setStatusFilter('in_progress')}
        >
          <Text style={[styles.statusPillText, statusFilter === 'in_progress' && styles.statusPillTextActiveAmber]}>
            In Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusPill, statusFilter === 'solved' && styles.statusPillActiveGreen]}
          onPress={() => setStatusFilter('solved')}
        >
          <Text style={[styles.statusPillText, statusFilter === 'solved' && styles.statusPillTextActiveGreen]}>
            Solved
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. قائمة التتبع والبطاقات */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل سجل البلاغات...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>لا توجد بلاغات مسجلة حالياً</Text>
          <Text style={styles.emptyDesc}>
            إذا لاحظت نقطة نفايات سوداء أو حاوية بحاجة لصيانة في حيك، ساهم في تحسين مدينتنا وأرسل بلاغك الآن.
          </Text>
          <TouchableOpacity
            style={styles.createReportBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.createReportBtnText}>إرسال أول بلاغ ✍️</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const isPlace = item.sourceType === 'place';
            const isPending = item.status === 'pending';
            const isRejected = item.status === 'rejected';
            const isFixed = item.status === 'fixed';

            // حساب درجات المراحل الأربعة
            // 1: أرسل | 2: استلم | 3: قيد الإصلاح | 4: تم الإصلاح
            let currentStep = 1;
            if (item.status === 'received') currentStep = 2;
            else if (item.status === 'in_repair') currentStep = 3;
            else if (item.status === 'fixed') currentStep = 4;
            else if (isPlace && item.verified) currentStep = 4;

            // تواريخ المراحل من سجل التاريخ أو الحساب النسبي
            const createdTime = formatDateTime(item.createdAt);
            const receivedTime = formatDateTime(item.createdAt + 60000);
            const inRepairTime = formatDateTime(item.createdAt + 120000);
            const fixedTime = formatDateTime(item.createdAt + 180000);

            return (
              <View style={styles.trackingCard}>
                {/* الجزء العلوي: الصورة والعنوان والإحداثيات وشارة الحالة */}
                <View style={styles.cardTopRow}>
                  {/* حاوية الصورة أو الأيقونة على اليسار */}
                  <View style={styles.photoContainer}>
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={styles.thumbnailPhoto} />
                    ) : (
                      <View style={styles.cameraPlaceholder}>
                        <Text style={styles.cameraIcon}>📷</Text>
                      </View>
                    )}
                  </View>

                  {/* التفاصيل والمعلومات على اليمين */}
                  <View style={styles.detailsContainer}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                    </View>

                    <View style={styles.badgeRow}>
                      <Text style={styles.categoryBadge}>{item.neighborhood}</Text>
                      {/* شارة قيد المراجعة للأماكن أو الحالات المعلقة */}
                      {isPending && (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>قيد المراجعة ⏳</Text>
                        </View>
                      )}
                      {isFixed && (
                        <View style={styles.fixedBadge}>
                          <Text style={styles.fixedBadgeText}>معتمد / تم الإصلاح ✅</Text>
                        </View>
                      )}
                      {isRejected && (
                        <View style={styles.rejectedBadge}>
                          <Text style={styles.rejectedBadgeText}>مرفوض ✕</Text>
                        </View>
                      )}
                    </View>

                    {/* الإحداثيات الجغرافية كما في المخطط */}
                    <View style={styles.gpsRow}>
                      <Text style={styles.gpsCoord}>
                        {item.latitude.toFixed(6)}° 📍
                      </Text>
                      <Text style={styles.gpsCoord}>
                        {item.longitude.toFixed(6)}° 📍
                      </Text>
                    </View>
                  </View>
                </View>

                {/* فاصل ناعم */}
                <View style={styles.cardDivider} />

                {/* متتبع المسار الرأسي المكون من 4 خطوات (Vertical 4-Step Tracker) */}
                <View style={styles.trackerContainer}>
                  {/* خطوة 1: أرسل */}
                  <View style={styles.stepRow}>
                    <View style={styles.stepTimelineCol}>
                      <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
                        <Text style={styles.stepCircleText}>1</Text>
                      </View>
                      <View style={[styles.stepVerticalLine, currentStep > 1 && styles.stepLineActive]} />
                    </View>
                    <View style={styles.stepInfoRow}>
                      <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>
                        أرسل
                      </Text>
                      <Text style={styles.stepTimestamp}>{createdTime}</Text>
                    </View>
                  </View>

                  {/* خطوة 2: استلم */}
                  <View style={styles.stepRow}>
                    <View style={styles.stepTimelineCol}>
                      <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
                        <Text style={styles.stepCircleText}>2</Text>
                      </View>
                      <View style={[styles.stepVerticalLine, currentStep > 2 && styles.stepLineActive]} />
                    </View>
                    <View style={styles.stepInfoRow}>
                      <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>
                        استلم
                      </Text>
                      <Text style={styles.stepTimestamp}>
                        {currentStep >= 2 ? receivedTime : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* خطوة 3: قيد الإصلاح */}
                  <View style={styles.stepRow}>
                    <View style={styles.stepTimelineCol}>
                      <View style={[styles.stepCircle, currentStep >= 3 && styles.stepCircleActive]}>
                        <Text style={styles.stepCircleText}>3</Text>
                      </View>
                      <View style={[styles.stepVerticalLine, currentStep > 3 && styles.stepLineActive]} />
                    </View>
                    <View style={styles.stepInfoRow}>
                      <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>
                        قيد الإصلاح
                      </Text>
                      <Text style={styles.stepTimestamp}>
                        {currentStep >= 3 ? inRepairTime : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* خطوة 4: تم الإصلاح */}
                  <View style={styles.stepRow}>
                    <View style={styles.stepTimelineCol}>
                      <View
                        style={[
                          styles.stepCircle,
                          currentStep >= 4 && styles.stepCircleSuccess,
                        ]}
                      >
                        <Text style={styles.stepCircleText}>
                          {currentStep >= 4 ? '✓' : '4'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.stepInfoRow}>
                      <Text
                        style={[
                          styles.stepLabel,
                          currentStep >= 4 && styles.stepLabelSuccess,
                        ]}
                      >
                        تم الإصلاح
                      </Text>
                      <Text style={styles.stepTimestamp}>
                        {currentStep >= 4 ? fixedTime : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* نافذة إنشاء بلاغ جديد السريع */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إرسال بلاغ ميداني جديد ✍️</Text>
            <Text style={styles.modalSubtitle}>
              حدد نوع المشكلة واكتب وصفاً موجزاً ليصل مباشرة لفرق النظافة بالأغواط.
            </Text>

            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeOption, newType === 'dirty_spot' && styles.typeOptionActive]}
                onPress={() => setNewType('dirty_spot')}
              >
                <Text style={styles.typeOptionText}>نقطة سوداء 🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, newType === 'broken' && styles.typeOptionActive]}
                onPress={() => setNewType('broken')}
              >
                <Text style={styles.typeOptionText}>حاوية مكسورة 🔨</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, newType === 'full' && styles.typeOptionActive]}
                onPress={() => setNewType('full')}
              >
                <Text style={styles.typeOptionText}>حاوية ممتلئة ⚠️</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.descInput}
              placeholder="اكتب تفاصيل الموقع والمشكلة هنا..."
              placeholderTextColor={colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={4}
              textAlign="right"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleSubmitReport}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>إرسال البلاغ الآن</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    height: 56,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: theme.fontFamily,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoutBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerLogoutText: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily,
    fontSize: 11,
    fontWeight: '800',
  },
  headerAddBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerAddBtnText: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  statusPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusPillActive: {
    backgroundColor: '#23703F',
    borderColor: '#23703F',
  },
  statusPillActiveBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  statusPillActiveAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  statusPillActiveGreen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#22C55E',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: theme.fontFamily,
  },
  statusPillTextActive: {
    color: '#FFFFFF',
  },
  statusPillTextActiveBlue: {
    color: '#2563EB',
  },
  statusPillTextActiveAmber: {
    color: '#D97706',
  },
  statusPillTextActiveGreen: {
    color: '#16A34A',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontFamily: theme.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  trackingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  photoContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#EBEAE4',
    overflow: 'hidden',
  },
  thumbnailPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBEAE4',
  },
  cameraIcon: {
    fontSize: 26,
    opacity: 0.7,
  },
  detailsContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  itemTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.warning,
  },
  pendingBadgeText: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  fixedBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.success,
  },
  fixedBadgeText: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.success,
    fontWeight: '700',
  },
  rejectedBadge: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.error,
  },
  rejectedBadgeText: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.error,
    fontWeight: '700',
  },
  gpsRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  gpsCoord: {
    fontFamily: theme.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14,
  },
  trackerContainer: {
    paddingHorizontal: 4,
  },
  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    minHeight: 46,
  },
  stepTimelineCol: {
    alignItems: 'center',
    width: 28,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleSuccess: {
    backgroundColor: colors.success,
  },
  stepCircleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepInfoRow: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
    paddingTop: 1,
  },
  stepLabel: {
    fontFamily: theme.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepLabelActive: {
    color: colors.text,
  },
  stepLabelSuccess: {
    color: colors.success,
  },
  stepTimestamp: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: colors.textSecondary,
    writingDirection: 'ltr',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontFamily: theme.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  emptyDesc: {
    fontFamily: theme.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  createReportBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createReportBtnText: {
    color: '#FFF',
    fontFamily: theme.fontFamily,
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontFamily: theme.fontFamily,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },
  modalSubtitle: {
    fontFamily: theme.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  typeSelectorRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontFamily: theme.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  descInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontFamily: theme.fontFamily,
    fontSize: 13,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFF',
    fontFamily: theme.fontFamily,
    fontSize: 14,
    fontWeight: '800',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontFamily: theme.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
