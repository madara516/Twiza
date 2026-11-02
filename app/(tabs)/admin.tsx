/**
 * لوحة تحكم المشرف (Admin Dashboard - Phase 5)
 * 
 * بالدارجة: هذه هي لوحة التحكم المخصصة للمشرفين والبلدية:
 * 1. مراجعة وقبول أو رفض الأماكن المقترحة من المواطنين.
 * 2. متابعة وتحديث حالات الشكاوى (استلام، قيد الإصلاح، تم الإصلاح، مرفوض) مع تدوين ملاحظات في سجل التاريخ.
 * 3. متابعة إحصائيات الطلب على الحاويات في كل حي (الأصوات الناتجة عن "نحتاجو حاوية هنا").
 * 4. إدارة وحظر أو فك حظر المستخدمين المخالفين.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { AdminService, AdminOverviewStats } from '../../src/services/adminService';
import { VoteService } from '../../src/services/voteService';
import { ReportService } from '../../src/services/reportService';
import { Place, PlaceReport, ReportStatus, UserProfile } from '../../src/types';

type AdminTab = 'places' | 'reports' | 'demand' | 'users';

export default function AdminScreen() {
  const router = useRouter();
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('places');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // إحصائيات عامة
  const [stats, setStats] = useState<AdminOverviewStats>({
    pendingPlacesCount: 0,
    openReportsCount: 0,
    overdueReportsCount: 0,
    totalVotesCount: 0,
  });

  // بيانات التبويبات
  const [pendingPlaces, setPendingPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<PlaceReport[]>([]);
  const [selectedReportFilter, setSelectedReportFilter] = useState<'all' | ReportStatus>('all');
  const [demandStats, setDemandStats] = useState<Record<string, number>>({});
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // حالة نافذة تحديث التقرير بملاحظة
  const [selectedReportForAction, setSelectedReportForAction] = useState<PlaceReport | null>(null);
  const [actionNextStatus, setActionNextStatus] = useState<ReportStatus | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // جلب كافة بيانات لوحة التحكم
  const fetchDashboardData = useCallback(async () => {
    try {
      const [overview, places, allReports, demand, users] = await Promise.all([
        AdminService.getOverviewStats(),
        AdminService.getPendingPlaces(),
        AdminService.getAllReports(),
        VoteService.getDemandStats(),
        AdminService.getUsersList(),
      ]);

      setStats(overview);
      setPendingPlaces(places);
      setReports(allReports);
      setDemandStats(demand);
      setUsersList(users);
    } catch (error) {
      console.error('فشل في جلب بيانات لوحة تحكم المشرف:', error);
      Alert.alert('خطأ', 'تعذر تحميل بعض بيانات لوحة التحكم.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [role, fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // 1. إجراءات الأماكن المعلقة
  const handleApprovePlace = (place: Place) => {
    Alert.alert(
      'تأكيد قبول المكان',
      `هل أنت متأكد من توثيق هذا المكان (${place.kind}) بحي ${place.neighborhood} ليكون معتمداً للجميع؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'قبول وتوثيق ✅',
          onPress: async () => {
            try {
              await AdminService.approvePlace(place.id);
              Alert.alert('تم بنجاح', 'تم توثيق المكان وأصبح متاحاً للجميع على الخريطة.');
              fetchDashboardData();
            } catch (err: any) {
              Alert.alert('خطأ', err.message || 'فشل قبول المكان.');
            }
          },
        },
      ]
    );
  };

  const handleRejectPlace = (place: Place) => {
    Alert.alert(
      'تأكيد رفض المكان',
      'سيتم حذف هذا المكان نهائياً من قاعدة البيانات، هل تريد المتابعة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف ورفض ❌',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.rejectPlace(place.id);
              Alert.alert('تم الحذف', 'تم رفض وحذف المكان المعلق.');
              fetchDashboardData();
            } catch (err: any) {
              Alert.alert('خطأ', err.message || 'فشل حذف المكان.');
            }
          },
        },
      ]
    );
  };

  // 2. إجراءات البلاغات والشكاوى
  const openStatusUpdateModal = (report: PlaceReport, nextStatus: ReportStatus) => {
    setSelectedReportForAction(report);
    setActionNextStatus(nextStatus);
    setAdminNote('');
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedReportForAction || !actionNextStatus || !user) return;

    try {
      setIsUpdatingStatus(true);
      await AdminService.updateReportStatus(
        selectedReportForAction.id,
        actionNextStatus,
        user.uid,
        adminNote.trim() || undefined
      );

      Alert.alert('تم التحديث', 'تم تغيير حالة البلاغ وتوثيق العملية في سجل التاريخ بنجاح.');
      setSelectedReportForAction(null);
      setActionNextStatus(null);
      setAdminNote('');
      fetchDashboardData();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر تحديث حالة البلاغ.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 3. إجراءات حظر وفك حظر المستخدمين
  const handleToggleUserBan = (targetUser: UserProfile) => {
    const willBan = !targetUser.isBanned;
    const actionText = willBan ? 'حظر' : 'فك حظر';

    Alert.alert(
      `تأكيد ${actionText} الحساب`,
      `هل أنت متأكد من ${actionText} المستخدم "${targetUser.displayName}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: `${actionText} الآن`,
          style: willBan ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await AdminService.setUserBanStatus(targetUser.uid, willBan);
              Alert.alert('تم بنجاح', `تم ${actionText} الحساب بنجاح.`);
              fetchDashboardData();
            } catch (err: any) {
              Alert.alert('خطأ', err.message || `تعذر ${actionText} المستخدم.`);
            }
          },
        },
      ]
    );
  };

  // الحماية الصارمة: إذا لم يكن المستخدم أدمن
  if (!loading && role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedIcon}>🔒</Text>
          <Text style={styles.deniedTitle}>صفحة مخصصة للمشرفين</Text>
          <Text style={styles.deniedMessage}>
            هذا القسم متاح فقط للمشرفين وممثلي البلدية المعتمدين لإدارة البيانات ومتابعة تقارير المواطنين.
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

  // فلترة البلاغات حسب الحالة المختارة
  const filteredReports = reports.filter((r) => {
    if (selectedReportFilter === 'all') return true;
    return r.status === selectedReportFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ترويسة لوحة التحكم */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>لوحة تحكم المشرف 🛡️</Text>
          <Text style={styles.headerSubtitle}>
            إدارة الأماكن المقترحة، البلاغات الميدانية، وأصوات المواطنين
          </Text>
        </View>

        {/* بطاقات الإحصائيات السريعة */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#FFA000' }]}>
            <Text style={styles.statNumber}>{stats.pendingPlacesCount}</Text>
            <Text style={styles.statLabel}>أماكن معلقة</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: colors.primary }]}>
            <Text style={styles.statNumber}>{stats.openReportsCount}</Text>
            <Text style={styles.statLabel}>بلاغات مفتوحة</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#D32F2F' }]}>
            <Text style={[styles.statNumber, { color: '#D32F2F' }]}>
              {stats.overdueReportsCount}
            </Text>
            <Text style={styles.statLabel}>متأخرة (&gt; 14 يوم)</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#2E7D32' }]}>
            <Text style={styles.statNumber}>{stats.totalVotesCount}</Text>
            <Text style={styles.statLabel}>طلبات حاويات</Text>
          </View>
        </View>

        {/* شريط أزرار التبويبات الداخلية */}
        <View style={styles.tabButtons}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'places' && styles.tabBtnActive]}
            onPress={() => setActiveTab('places')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'places' && styles.tabBtnTextActive]}>
              الأماكن ({pendingPlaces.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'reports' && styles.tabBtnActive]}
            onPress={() => setActiveTab('reports')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'reports' && styles.tabBtnTextActive]}>
              البلاغات ({reports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'demand' && styles.tabBtnActive]}
            onPress={() => setActiveTab('demand')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'demand' && styles.tabBtnTextActive]}>
              الطلب (الأحياء)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'users' && styles.tabBtnTextActive]}>
              المستخدمين ({usersList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل بيانات الإدارة...</Text>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* 1. قسم الأماكن المعلقة */}
            {activeTab === 'places' && (
              <View>
                <Text style={styles.sectionTitle}>
                  الأماكن المقترحة بانتظار الاعتماد ({pendingPlaces.length})
                </Text>
                {pendingPlaces.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>🎉</Text>
                    <Text style={styles.emptyTitle}>لا توجد أماكن معلقة</Text>
                    <Text style={styles.emptyDesc}>
                      جميع الأماكن المقترحة من المواطنين تمت مراجعتها وتوثيقها.
                    </Text>
                  </View>
                ) : (
                  pendingPlaces.map((place) => (
                    <View key={place.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.kindTag}>
                          <Text style={styles.kindTagText}>
                            {place.kind === 'bin' && 'سلة نفايات 🟢'}
                            {place.kind === 'collection_point' && 'نقطة تجميع 🌲'}
                            {place.kind === 'wild_dump' && 'مكب فوضوي 🔴'}
                          </Text>
                        </View>
                        <Text style={styles.cardNeighborhood}>حي: {place.neighborhood}</Text>
                      </View>

                      {place.photoURL ? (
                        <Image source={{ uri: place.photoURL }} style={styles.cardImage} />
                      ) : null}

                      {place.notes ? (
                        <Text style={styles.cardNotes}>ملاحظات: {place.notes}</Text>
                      ) : null}

                      <Text style={styles.cardMeta}>
                        الإحداثيات: {place.location.latitude.toFixed(4)}, {place.location.longitude.toFixed(4)}
                      </Text>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleApprovePlace(place)}
                        >
                          <Text style={styles.actionBtnText}>اعتماد وقبول ✅</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => handleRejectPlace(place)}
                        >
                          <Text style={styles.actionBtnText}>رفض وحذف ❌</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 2. قسم إدارة البلاغات والشكاوى */}
            {activeTab === 'reports' && (
              <View>
                <Text style={styles.sectionTitle}>
                  إدارة البلاغات ومتابعة الصيانة ({filteredReports.length})
                </Text>

                {/* فلاتر الحالات */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <TouchableOpacity
                    style={[styles.statusChip, selectedReportFilter === 'all' && styles.statusChipActive]}
                    onPress={() => setSelectedReportFilter('all')}
                  >
                    <Text style={[styles.statusChipText, selectedReportFilter === 'all' && styles.statusChipTextActive]}>
                      الكل ({reports.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, selectedReportFilter === 'sent' && styles.statusChipActive]}
                    onPress={() => setSelectedReportFilter('sent')}
                  >
                    <Text style={[styles.statusChipText, selectedReportFilter === 'sent' && styles.statusChipTextActive]}>
                      أُرسل
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, selectedReportFilter === 'received' && styles.statusChipActive]}
                    onPress={() => setSelectedReportFilter('received')}
                  >
                    <Text style={[styles.statusChipText, selectedReportFilter === 'received' && styles.statusChipTextActive]}>
                      استُلم
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, selectedReportFilter === 'in_repair' && styles.statusChipActive]}
                    onPress={() => setSelectedReportFilter('in_repair')}
                  >
                    <Text style={[styles.statusChipText, selectedReportFilter === 'in_repair' && styles.statusChipTextActive]}>
                      قيد الإصلاح
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, selectedReportFilter === 'fixed' && styles.statusChipActive]}
                    onPress={() => setSelectedReportFilter('fixed')}
                  >
                    <Text style={[styles.statusChipText, selectedReportFilter === 'fixed' && styles.statusChipTextActive]}>
                      تم الإصلاح
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, selectedReportFilter === 'rejected' && styles.statusChipActive]}
                    onPress={() => setSelectedReportFilter('rejected')}
                  >
                    <Text style={[styles.statusChipText, selectedReportFilter === 'rejected' && styles.statusChipTextActive]}>
                      مرفوض
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {filteredReports.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>لا توجد بلاغات في هذا التصنيف</Text>
                  </View>
                ) : (
                  filteredReports.map((report) => {
                    const isOverdue = ReportService.isReportOverdue(report);
                    return (
                      <View key={report.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>
                              {report.status === 'sent' && 'أُرسل 📨'}
                              {report.status === 'received' && 'استُلم 📥'}
                              {report.status === 'in_repair' && 'قيد الإصلاح 🛠️'}
                              {report.status === 'fixed' && 'تم الإصلاح ✅'}
                              {report.status === 'rejected' && 'مرفوض ❌'}
                            </Text>
                          </View>
                          <Text style={styles.cardNeighborhood}>حي: {report.neighborhood}</Text>
                        </View>

                        {isOverdue && (
                          <View style={styles.overdueAlert}>
                            <Text style={styles.overdueAlertText}>
                              ⚠️ هذا البلاغ تجاوز 14 يوماً دون إنهاء، يرجى إعطاء الأولوية للبلدية!
                            </Text>
                          </View>
                        )}

                        <Text style={styles.reportDesc}>{report.description}</Text>

                        {report.photoURL ? (
                          <Image source={{ uri: report.photoURL }} style={styles.cardImage} />
                        ) : null}

                        {/* سجل التاريخ */}
                        {report.history && report.history.length > 0 ? (
                          <View style={styles.historyBox}>
                            <Text style={styles.historyTitle}>سجل المعالجة:</Text>
                            {report.history.map((h, idx) => (
                              <Text key={idx} style={styles.historyItem}>
                                • {h.status} ({new Date(h.at).toLocaleDateString('ar-DZ')})
                                {h.note ? ` - ملاحظة: ${h.note}` : ''}
                              </Text>
                            ))}
                          </View>
                        ) : null}

                        {/* أزرار الانتقال بالحالة */}
                        <View style={styles.actionButtonsRow}>
                          {report.status === 'sent' && (
                            <>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.primaryActionBtn]}
                                onPress={() => openStatusUpdateModal(report, 'received')}
                              >
                                <Text style={styles.actionBtnText}>تسجيل الاستلام 📥</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.rejectBtn]}
                                onPress={() => openStatusUpdateModal(report, 'rejected')}
                              >
                                <Text style={styles.actionBtnText}>رفض ❌</Text>
                              </TouchableOpacity>
                            </>
                          )}

                          {report.status === 'received' && (
                            <>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.inRepairBtn]}
                                onPress={() => openStatusUpdateModal(report, 'in_repair')}
                              >
                                <Text style={styles.actionBtnText}>بدء الإصلاح 🛠️</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.rejectBtn]}
                                onPress={() => openStatusUpdateModal(report, 'rejected')}
                              >
                                <Text style={styles.actionBtnText}>رفض ❌</Text>
                              </TouchableOpacity>
                            </>
                          )}

                          {report.status === 'in_repair' && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.approveBtn]}
                              onPress={() => openStatusUpdateModal(report, 'fixed')}
                            >
                              <Text style={styles.actionBtnText}>اكتمل الإصلاح بنجاح ✅</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 3. قسم حجم الطلب في الأحياء (أصوات الحاويات) */}
            {activeTab === 'demand' && (
              <View>
                <Text style={styles.sectionTitle}>
                  ترتيب الأحياء حسب حجم الطلب على الحاويات 📊
                </Text>
                <Text style={styles.sectionSubtitle}>
                  هذه الأرقام تمثل تصويت المواطنين عبر زر "نحتاجو حاوية هنا"، وتعد الدليل الأقوى لتوزيع الحاويات البلدية الجديدة.
                </Text>

                {Object.keys(demandStats).length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>لا توجد أصوات مسجلة بعد</Text>
                    <Text style={styles.emptyDesc}>
                      عندما يضغط المواطنون على "نحتاجو حاوية هنا"، ستظهر الإحصائيات هنا مرتبة تنازلياً.
                    </Text>
                  </View>
                ) : (
                  Object.entries(demandStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([neighborhood, count], index) => (
                      <View key={neighborhood} style={styles.demandRow}>
                        <View style={styles.demandRankBadge}>
                          <Text style={styles.demandRankText}>#{index + 1}</Text>
                        </View>
                        <View style={styles.demandInfo}>
                          <Text style={styles.demandNeighborhood}>{neighborhood}</Text>
                          <Text style={styles.demandCountText}>
                            {count} مواطن طلبوا حاوية في هذا الحي
                          </Text>
                        </View>
                        <View style={styles.demandVotesBadge}>
                          <Text style={styles.demandVotesText}>{count} صوت</Text>
                        </View>
                      </View>
                    ))
                )}
              </View>
            )}

            {/* 4. قسم إدارة المستخدمين والحظر */}
            {activeTab === 'users' && (
              <View>
                <Text style={styles.sectionTitle}>
                  إدارة المستخدمين والحسابات ({usersList.length})
                </Text>
                {usersList.map((u) => (
                  <View key={u.uid} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.userName}>{u.displayName || 'مستخدم'}</Text>
                        <Text style={styles.userRole}>
                          الرتبة: {u.role === 'admin' ? 'مشرف 👑' : 'مواطن 👤'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.userStatusBadge,
                          u.isBanned ? styles.bannedBadge : styles.activeBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.userStatusText,
                            u.isBanned ? styles.bannedText : styles.activeText,
                          ]}
                        >
                          {u.isBanned ? 'محظور 🚫' : 'نشط ✅'}
                        </Text>
                      </View>
                    </View>

                    {u.role !== 'admin' ? (
                      <TouchableOpacity
                        style={[
                          styles.banBtn,
                          u.isBanned ? styles.unbanBtn : styles.banBtnDanger,
                        ]}
                        onPress={() => handleToggleUserBan(u)}
                      >
                        <Text style={styles.banBtnText}>
                          {u.isBanned ? 'فك حظر الحساب 🟢' : 'حظر هذا المستخدم 🚫'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* نافذة تحديث حالة التقرير مع ملاحظة المشرف */}
        <Modal
          visible={selectedReportForAction !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedReportForAction(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>تحديث حالة البلاغ</Text>
              <Text style={styles.modalSub}>
                الحالة الجديدة:{' '}
                <Text style={{ fontWeight: 'bold', color: colors.primary }}>
                  {actionNextStatus === 'received' && 'استُلم 📥'}
                  {actionNextStatus === 'in_repair' && 'قيد الإصلاح 🛠️'}
                  {actionNextStatus === 'fixed' && 'تم الإصلاح بنجاح ✅'}
                  {actionNextStatus === 'rejected' && 'مرفوض ❌'}
                </Text>
              </Text>

              <Text style={styles.inputLabel}>ملاحظة المشرف أو البلدية (اختياري):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: تم إرسال فريق الصيانة إلى الموقع..."
                value={adminNote}
                onChangeText={setAdminNote}
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalConfirmBtn]}
                  onPress={handleConfirmStatusUpdate}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.modalActionText}>تأكيد التحديث ✅</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalCancelBtn]}
                  onPress={() => setSelectedReportForAction(null)}
                  disabled={isUpdatingStatus}
                >
                  <Text style={styles.modalCancelText}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    padding: theme.spacing.sm,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  tabButtons: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#E8F5E9',
  },
  tabBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    padding: theme.spacing.md,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 14,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kindTag: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kindTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#33691E',
  },
  cardNeighborhood: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: '#EEEEEE',
  },
  cardNotes: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    marginVertical: 4,
  },
  cardMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#2E7D32',
  },
  rejectBtn: {
    backgroundColor: '#D32F2F',
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
  },
  inRepairBtn: {
    backgroundColor: '#F57C00',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterScroll: {
    flexDirection: 'row-reverse',
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
    marginLeft: 6,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
  },
  statusChipText: {
    fontSize: 11,
    color: colors.text,
  },
  statusChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#00695C',
  },
  overdueAlert: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginVertical: 6,
  },
  overdueAlertText: {
    color: '#C62828',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  reportDesc: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    marginVertical: 4,
  },
  historyBox: {
    backgroundColor: '#FAFAFA',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 4,
  },
  historyItem: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 16,
  },
  demandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demandRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  demandRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  demandInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  demandNeighborhood: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  demandCountText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  demandVotesBadge: {
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demandVotesText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  userRole: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  userStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  bannedBadge: {
    backgroundColor: '#FFEBEE',
  },
  userStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeText: {
    color: '#2E7D32',
  },
  bannedText: {
    color: '#D32F2F',
  },
  banBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  banBtnDanger: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  unbanBtn: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  banBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  deniedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  deniedMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmBtn: {
    backgroundColor: colors.primary,
  },
  modalCancelBtn: {
    backgroundColor: '#EEEEEE',
  },
  modalActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
