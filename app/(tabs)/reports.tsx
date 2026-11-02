/**
 * شاشة تقاريري ومتابعة الشكاوى (My Reports Screen)
 * 
 * بالدارجة: هادي الشاشة تسمح للمواطن يشوف كامل البلاغات لي بعثهم (حاوية مكسورة، معمرة، نقطة نفايات)
 * ويتبع الحالة تاعهم في مسار واضح: أُرسل ← استُلم ← قيد الإصلاح ← تم الإصلاح.
 * وإذا فاتت 14 يوم وما تحركش التقرير تخرجلو الرسالة الصريحة "وصل تقريرك ولم يتم الرد بعد".
 * وكي تفرى المشكلة ويولي 'fixed'، هو لي يأكد: "هل تم الإصلاح فعلاً؟ نعم / لا".
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { PlaceReport, ReportType, ReportStatus, GeoLocation } from '../../src/types';
import { ReportService } from '../../src/services/reportService';
import { StorageService } from '../../src/services/storageService';
import { ACTIVE_REGION, getApproximateNeighborhood } from '../../src/constants/regions';
import { Neighborhood } from '../../src/constants/laghouat';

const REPORT_TYPE_LABELS: Record<ReportType, { title: string; emoji: string }> = {
  broken: { title: 'حاوية متضررة / مكسورة', emoji: '🔨' },
  full: { title: 'حاوية ممتلئة وتفيض', emoji: '⚠️' },
  dirty_spot: { title: 'نقطة نفايات سوداء', emoji: '🗑️' },
};

const STATUS_STEPS: { key: ReportStatus; label: string }[] = [
  { key: 'sent', label: 'أُرسل' },
  { key: 'received', label: 'استُلم' },
  { key: 'in_repair', label: 'قيد الإصلاح' },
  { key: 'fixed', label: 'تم الإصلاح' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [reports, setReports] = useState<PlaceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'fixed' | 'rejected'>('all');

  // نافذة إضافة تقرير جديد
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newType, setNewType] = useState<ReportType>('broken');
  const [newDesc, setNewDesc] = useState('');
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // جلب تقارير المستخدم
  const loadReports = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await ReportService.getMyReports(user.uid);
      setReports(data);
    } catch (err) {
      console.error('فشل في جلب التقارير:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  // تصفية التقارير حسب الفلتر المختار
  const filteredReports = reports.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['sent', 'received', 'in_repair'].includes(r.status);
    if (filter === 'fixed') return r.status === 'fixed';
    if (filter === 'rejected') return r.status === 'rejected';
    return true;
  });

  // إرسال تقرير جديد
  const handleSubmitReport = async () => {
    if (!user) return;
    if (!newDesc.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة وصف موجز للمشكلة.');
      return;
    }

    try {
      setIsSubmitting(true);

      let uploadedPhotoURL: string | null = null;
      if (newPhotoUri) {
        try {
          uploadedPhotoURL = await StorageService.uploadPlacePhoto(newPhotoUri, user.uid);
        } catch (uploadErr) {
          console.warn('تنبيه: تعذر رفع صورة التقرير للسحابة، سيتم حفظ التقرير بدونها:', uploadErr);
        }
      }

      await ReportService.createReport(
        {
          type: newType,
          description: newDesc.trim(),
          photoURL: uploadedPhotoURL,
          neighborhood: getApproximateNeighborhood(ACTIVE_REGION.center.latitude, ACTIVE_REGION.center.longitude),
          location: ACTIVE_REGION.center, // مركز المنطقة افتراضياً للتقرير العام
        },
        user.uid
      );

      setShowCreateModal(false);
      setNewDesc('');
      setNewPhotoUri(null);
      Alert.alert('تم الإرسال بنجاح 🚀', 'تم إرسال بلاغك وسيتم البدء في معالجته.');
      loadReports();
    } catch (err: any) {
      Alert.alert('خطأ في الإرسال', err.message || 'تعذر إرسال التقرير.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // التقاط صورة للتقرير
  const handlePickCamera = async () => {
    try {
      const uri = await StorageService.pickFromCamera();
      if (uri) setNewPhotoUri(uri);
    } catch (err: any) {
      Alert.alert('الكاميرا', err.message || 'تعذر تشغيل الكاميرا.');
    }
  };

  // اختيار صورة من المعرض
  const handlePickGallery = async () => {
    try {
      const uri = await StorageService.pickFromGallery();
      if (uri) setNewPhotoUri(uri);
    } catch (err: any) {
      Alert.alert('معرض الصور', err.message || 'تعذر الوصول للصور.');
    }
  };

  // حساب مؤشر خطوات دورة الحياة (0: sent, 1: received, 2: in_repair, 3: fixed)
  const getStepIndex = (status: ReportStatus): number => {
    switch (status) {
      case 'sent':
        return 0;
      case 'received':
        return 1;
      case 'in_repair':
        return 2;
      case 'fixed':
        return 3;
      default:
        return -1;
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.iconBig}>🔒</Text>
          <Text style={styles.title}>تسجيل الدخول مطلوب</Text>
          <Text style={styles.desc}>
            لمتابعة حالة بلاغاتك وشكاويك ومعرفة متى تم إصلاحها من قِبل مصالح النظافة،
            يرجى تسجيل الدخول بحساب مواطن.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryBtnText}>تسجيل الدخول 🔑</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* شريط الإجراءات والفلترة */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.newReportBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.newReportBtnText}>إرسال تقرير جديد ✍️</Text>
        </TouchableOpacity>

        {/* فلاتر الحالات */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              الكل ({reports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              قيد المعالجة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'fixed' && styles.filterChipActive]}
            onPress={() => setFilter('fixed')}
          >
            <Text style={[styles.filterText, filter === 'fixed' && styles.filterTextActive]}>
              تم الإصلاح ✅
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'rejected' && styles.filterChipActive]}
            onPress={() => setFilter('rejected')}
          >
            <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>
              مرفوضة ✕
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* قائمة التقارير */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل التقارير...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>لا توجد تقارير في هذا التصنيف</Text>
          <Text style={styles.emptyDesc}>
            إذا لاحظت حاوية مكسورة أو متراكمة في حيك، أرسل تقريراً وسيصل للبلدية فوراً.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.primaryBtnText}>إرسال أول تقرير ✍️</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const typeInfo = REPORT_TYPE_LABELS[item.type] || {
              title: item.type,
              emoji: '📌',
            };
            const isOverdue = ReportService.isReportOverdue(item);
            const currentStepIdx = getStepIndex(item.status);
            const isRejected = item.status === 'rejected';

            return (
              <View style={styles.reportCard}>
                {/* رأس البطاقة: النوع والتاريخ والحي */}
                <View style={styles.reportHeader}>
                  <Text style={styles.reportDate}>
                    {new Date(item.createdAt).toLocaleDateString('ar-DZ')}
                  </Text>
                  <View style={styles.reportTitleBox}>
                    <Text style={styles.reportTypeTitle}>
                      {typeInfo.title} {typeInfo.emoji}
                    </Text>
                    <Text style={styles.reportNeighborhood}>حي: {item.neighborhood}</Text>
                  </View>
                </View>

                {/* نص الوصف */}
                <Text style={styles.reportDesc}>{item.description}</Text>

                {/* صورة التقرير إن وجدت */}
                {item.photoURL ? (
                  <Image source={{ uri: item.photoURL }} style={styles.reportPhoto} />
                ) : null}

                {/* شريط تتبع دورة الحياة (Progress Timeline) */}
                {!isRejected ? (
                  <View style={styles.timelineWrapper}>
                    <View style={styles.timelineRow}>
                      {STATUS_STEPS.map((step, idx) => {
                        const isReached = currentStepIdx >= idx;
                        const isCurrent = currentStepIdx === idx;
                        return (
                          <React.Fragment key={step.key}>
                            <View style={styles.timelineStep}>
                              <View
                                style={[
                                  styles.stepCircle,
                                  isReached && styles.stepCircleReached,
                                  isCurrent && styles.stepCircleCurrent,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.stepNumber,
                                    isReached && styles.stepNumberReached,
                                  ]}
                                >
                                  {isReached ? '✓' : idx + 1}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.stepLabel,
                                  isReached && styles.stepLabelReached,
                                  isCurrent && styles.stepLabelCurrent,
                                ]}
                              >
                                {step.label}
                              </Text>
                            </View>

                            {/* خط الربط بين الخطوات */}
                            {idx < STATUS_STEPS.length - 1 ? (
                              <View
                                style={[
                                  styles.stepLine,
                                  currentStepIdx > idx && styles.stepLineReached,
                                ]}
                              />
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  /* في حالة الرفض */
                  <View style={styles.rejectedBox}>
                    <Text style={styles.rejectedTitle}>✕ تم رفض هذا التقرير</Text>
                    {item.history?.find((h) => h.status === 'rejected')?.note ? (
                      <Text style={styles.rejectedReason}>
                        السبب: {item.history.find((h) => h.status === 'rejected')?.note}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* رسالة الـ 14 يوماً الصريحة (14-day Honest Overdue Message) */}
                {isOverdue ? (
                  <View style={styles.overdueBox}>
                    <Text style={styles.overdueTitle}>⚠️ وصل تقريرك ولم يتم الرد بعد</Text>
                    <Text style={styles.overdueDesc}>
                      مر أكثر من 14 يوماً على إرسال التقرير وهو مسجل لدى المصالح المعنية للمتابعة والتدخل.
                    </Text>
                  </View>
                ) : null}

                {/* إشعار إتمام الإصلاح النهائي من البلدية */}
                {item.status === 'fixed' ? (
                  <View style={styles.fixedSuccessBadge}>
                    <Text style={styles.fixedSuccessText}>
                      ✅ تم التدخل وإصلاح المشكلة بنجاح من قِبل مصالح النظافة
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}

      {/* نافذة إرسال تقرير جديد */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إرسال تقرير جديد ✍️</Text>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* نوع المشكلة */}
              <Text style={styles.fieldLabel}>نوع المشكلة</Text>
              <View style={styles.typeSelectorRow}>
                {(['broken', 'full', 'dirty_spot'] as ReportType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeSelectorBtn,
                      newType === t && styles.typeSelectorBtnActive,
                    ]}
                    onPress={() => setNewType(t)}
                  >
                    <Text style={styles.typeSelectorEmoji}>
                      {REPORT_TYPE_LABELS[t].emoji}
                    </Text>
                    <Text
                      style={[
                        styles.typeSelectorText,
                        newType === t && styles.typeSelectorTextActive,
                      ]}
                    >
                      {REPORT_TYPE_LABELS[t].title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* صورة توضيحية */}
              <Text style={styles.fieldLabel}>صورة المشكلة (اختياري)</Text>
              {newPhotoUri ? (
                <View style={styles.modalPhotoPreview}>
                  <Image source={{ uri: newPhotoUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoSmall}
                    onPress={() => setNewPhotoUri(null)}
                  >
                    <Text style={styles.removePhotoSmallText}>✕ حذف الصورة</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoRow}>
                  <TouchableOpacity
                    style={styles.modalPhotoBtn}
                    onPress={handlePickCamera}
                  >
                    <Text style={styles.modalPhotoBtnText}>الكاميرا 📸</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPhotoBtn}
                    onPress={handlePickGallery}
                  >
                    <Text style={styles.modalPhotoBtnText}>المعرض 🖼️</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* وصف المشكلة */}
              <Text style={styles.fieldLabel}>وصف المشكلة</Text>
              <TextInput
                style={styles.descInput}
                placeholder="صف المشكلة بدقة ومكان تواجدها بالتحديد..."
                value={newDesc}
                onChangeText={setNewDesc}
                maxLength={1000}
                multiline
                numberOfLines={4}
                textAlign="right"
              />
              <Text style={styles.charCount}>{newDesc.length} / 1000 حرف</Text>

              {/* زر الإرسال */}
              <TouchableOpacity
                style={[styles.submitReportBtn, isSubmitting && styles.submitDisabled]}
                onPress={handleSubmitReport}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitReportBtnText}>إرسال التقرير للبلدية 🚀</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7F9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconBig: {
    fontSize: 54,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 14,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 10,
  },
  topBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  newReportBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  newReportBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportTitleBox: {
    alignItems: 'flex-end',
  },
  reportTypeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  reportNeighborhood: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  reportDate: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  reportDesc: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 10,
  },
  reportPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
  },
  timelineWrapper: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  timelineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleReached: {
    backgroundColor: colors.primary,
  },
  stepCircleCurrent: {
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 2,
  },
  stepNumber: {
    fontSize: 11,
    color: '#757575',
    fontWeight: 'bold',
  },
  stepNumberReached: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  stepLabelReached: {
    color: colors.text,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  stepLine: {
    height: 2,
    backgroundColor: '#E0E0E0',
    flex: 0.8,
    marginHorizontal: -4,
    marginBottom: 18,
  },
  stepLineReached: {
    backgroundColor: colors.primary,
  },
  rejectedBox: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  rejectedTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#C62828',
    textAlign: 'right',
  },
  rejectedReason: {
    fontSize: 12,
    color: '#B71C1C',
    textAlign: 'right',
    marginTop: 4,
  },
  overdueBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  overdueTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57F17',
    textAlign: 'right',
    marginBottom: 2,
  },
  overdueDesc: {
    fontSize: 11,
    color: '#6D4C41',
    textAlign: 'right',
    lineHeight: 16,
  },
  fixedSuccessBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  fixedSuccessText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 30,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'right',
  },
  typeSelectorRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  typeSelectorBtn: {
    flex: 1,
    backgroundColor: '#F7F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  typeSelectorBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5E9',
  },
  typeSelectorEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  typeSelectorText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  typeSelectorTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  neighborhoodChipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  neighborhoodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  neighborhoodChipText: {
    fontSize: 12,
    color: colors.text,
  },
  neighborhoodChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  photoRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  modalPhotoBtn: {
    flex: 1,
    backgroundColor: '#F7F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPhotoBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalPhotoPreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  removePhotoSmall: {
    marginTop: 6,
    padding: 4,
  },
  removePhotoSmallText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: 'bold',
  },
  descInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: colors.text,
    height: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#9E9E9E',
    textAlign: 'left',
    marginTop: 4,
  },
  submitReportBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 18,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitReportBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
