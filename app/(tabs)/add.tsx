/**
 * شاشة إضافة مكان جديد وأماكني (Add Place Screen & My Places)
 * 
 * بالدارجة: هادي الشاشة تسمح للمواطن يسجل سلة، نقطة تجميع، ولا يبلغ على نقطة سوداء.
 * يحدد موقعها عبر GPS ولا بالنقر على الخريطة، ياخذ صورة بالكاميرا ولا Galerie،
 * ويكتب ملاحظات ومواعيد الرفع ودرجة الخطورة.
 * والطلب يروح بـ verified=false حتى تراجعه البلدية، ويقدر يشوف كامل البلايص لي زادهم في تبويب "أماكني".
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { FreeMap, FreeMapRef } from '../../src/components/FreeMap';
import {
  ACTIVE_REGION,
  isLocationInRegion,
  OUT_OF_SERVICE_MESSAGE,
  getApproximateNeighborhood,
} from '../../src/constants/regions';
import { Neighborhood } from '../../src/constants/laghouat';
import { Place, PlaceKind, GeoLocation, Severity } from '../../src/types';
import { StorageService } from '../../src/services/storageService';
import { PlaceService } from '../../src/services/placeService';

export default function AddScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const mapRef = useRef<FreeMapRef>(null);

  // التبويب النشط: "إضافة مكان" أو "أماكني"
  const [activeTab, setActiveTab] = useState<'form' | 'my_places'>('form');

  // حقول النموذج
  const [kind, setKind] = useState<PlaceKind>('bin');
  const [location, setLocation] = useState<GeoLocation>({
    latitude: ACTIVE_REGION.center.latitude,
    longitude: ACTIVE_REGION.center.longitude,
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [schedule, setSchedule] = useState('');
  const [acceptsText, setAcceptsText] = useState('بلاستيك، ورق، نفايات منزلية');

  // حالات التحميل
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // قائمة أماكني
  const [myPlaces, setMyPlaces] = useState<Place[]>([]);
  const [loadingMyPlaces, setLoadingMyPlaces] = useState(false);

  // جلب أماكن المستخدم عند التبديل لتبويب "أماكني"
  const loadMyPlaces = async () => {
    if (!user) return;
    try {
      setLoadingMyPlaces(true);
      const data = await PlaceService.getMyPlaces(user.uid);
      setMyPlaces(data);
    } catch (err) {
      console.error('فشل في جلب أماكني:', err);
    } finally {
      setLoadingMyPlaces(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_places') {
      loadMyPlaces();
    }
  }, [activeTab]);

  // جلب إحداثيات الـ GPS الحالية
  const handleGetCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'إذن الموقع غير مفعّل',
          'يمكنك النقر مباشرة على الخريطة لتحديد مكان النقطة يدوياً.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: GeoLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      if (!isLocationInRegion(coords.latitude, coords.longitude, ACTIVE_REGION)) {
        Alert.alert('تنبيه النطاق الجغرافي', OUT_OF_SERVICE_MESSAGE);
        return;
      }

      setLocation(coords);
      mapRef.current?.flyTo(coords.latitude, coords.longitude, 16);
    } catch (err) {
      console.error('خطأ في جلب الموقع:', err);
      Alert.alert('تعذر جلب الموقع', 'تأكد من تفعيل الـ GPS أو حدد الموقع بالنقر على الخريطة.');
    } finally {
      setIsLocating(false);
    }
  };

  // النقر على الخريطة لتحديد موقع الدبوس
  const handleMapClick = (coords: { latitude: number; longitude: number }) => {
    if (!isLocationInRegion(coords.latitude, coords.longitude, ACTIVE_REGION)) {
      Alert.alert('خارج النطاق', OUT_OF_SERVICE_MESSAGE);
      return;
    }
    setLocation(coords);
  };

  // التقاط صورة من الكاميرا
  const handlePickCamera = async () => {
    try {
      const uri = await StorageService.pickFromCamera();
      if (uri) setPhotoUri(uri);
    } catch (err: any) {
      Alert.alert('تنبيه الكاميرا', err.message || 'تعذر تشغيل الكاميرا.');
    }
  };

  // اختيار صورة من المعرض
  const handlePickGallery = async () => {
    try {
      const uri = await StorageService.pickFromGallery();
      if (uri) setPhotoUri(uri);
    } catch (err: any) {
      Alert.alert('تنبيه الصور', err.message || 'تعذر الوصول للصور.');
    }
  };

  // إرسال المكان الجديد
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('تسجيل الدخول مطلوب', 'يجب تسجيل الدخول لإضافة مكان جديد.');
      router.push('/(auth)/login');
      return;
    }

    if (!isLocationInRegion(location.latitude, location.longitude, ACTIVE_REGION)) {
      Alert.alert('موقع غير مقبول', OUT_OF_SERVICE_MESSAGE);
      return;
    }

    try {
      setIsSubmitting(true);

      // محاولة رفع الصورة مع معالجة مرنة في حالة عدم تفعيل Storage بعد
      let uploadedPhotoURL: string | null = null;
      if (photoUri) {
        try {
          uploadedPhotoURL = await StorageService.uploadPlacePhoto(photoUri, user.uid);
        } catch (uploadErr) {
          console.warn('تنبيه: تعذر رفع الصورة للسحابة، سيتم حفظ المكان بدونها:', uploadErr);
        }
      }

      // تحضير المواد المقبولة إن كانت نقطة تجميع
      const acceptsArray =
        kind === 'collection_point' && acceptsText
          ? acceptsText.split(/[،,]+/).map((s) => s.trim()).filter(Boolean)
          : undefined;

      await PlaceService.createPlace(
        {
          kind,
          location,
          neighborhood: getApproximateNeighborhood(location.latitude, location.longitude),
          photoURL: uploadedPhotoURL,
          notes: notes.trim() || undefined,
          severity: kind === 'wild_dump' ? severity : undefined,
          schedule: kind === 'collection_point' && schedule.trim() ? schedule.trim() : undefined,
          accepts: acceptsArray,
        },
        user.uid
      );

      // إفراغ النموذج وإظهار نافذة النجاح
      setShowSuccessModal(true);
      setPhotoUri(null);
      setNotes('');
      setSchedule('');
    } catch (err: any) {
      console.error('فشل حفظ المكان:', err);
      Alert.alert('خطأ في الإرسال', err.message || 'تعذر حفظ المكان، يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // إذا لم يكن المستخدم مسجلاً
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.iconBig}>🔒</Text>
          <Text style={styles.title}>تسجيل الدخول مطلوب للمساهمة</Text>
          <Text style={styles.desc}>
            لإضافة حاوية جديدة أو نقطة تجميع أو التبليغ عن نقطة سوداء، يجب
            تسجيل الدخول بحساب مواطن حتى تكون البيانات موثوقة ونحافظ على نظافة المدينة معاً.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>تسجيل الدخول 🔑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>إنشاء حساب جديد 🤝</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // العلامة الحالية المعروضة على الخريطة
  const currentPinMarker: Place = {
    id: 'current-pin',
    kind,
    location,
    neighborhood: getApproximateNeighborhood(location.latitude, location.longitude),
    photoURL: null,
    owner: 'informal',
    verified: false,
    addedBy: user.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* شريط التبديل العلوي */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'form' && styles.tabButtonActive]}
          onPress={() => setActiveTab('form')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'form' && styles.tabButtonTextActive,
            ]}
          >
            ➕ إضافة مكان جديد
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'my_places' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('my_places')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'my_places' && styles.tabButtonTextActive,
            ]}
          >
            📋 أماكني المضافة ({myPlaces.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'form' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. اختيار نوع المكان */}
          <Text style={styles.sectionTitle}>1. نوع المكان 🏷️</Text>
          <View style={styles.kindRow}>
            <TouchableOpacity
              style={[
                styles.kindCard,
                kind === 'bin' && { borderColor: colors.kind.bin, backgroundColor: '#E8F5E9' },
              ]}
              onPress={() => setKind('bin')}
              activeOpacity={0.8}
            >
              <Text style={styles.kindEmoji}>🟢</Text>
              <Text style={styles.kindLabel}>سلة نفايات</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.kindCard,
                kind === 'collection_point' && {
                  borderColor: colors.kind.collection_point,
                  backgroundColor: '#E8F0FE',
                },
              ]}
              onPress={() => setKind('collection_point')}
              activeOpacity={0.8}
            >
              <Text style={styles.kindEmoji}>📦</Text>
              <Text style={styles.kindLabel}>نقطة تجميع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.kindCard,
                kind === 'wild_dump' && {
                  borderColor: colors.kind.wild_dump,
                  backgroundColor: '#FFEBEE',
                },
              ]}
              onPress={() => setKind('wild_dump')}
              activeOpacity={0.8}
            >
              <Text style={styles.kindEmoji}>🔴</Text>
              <Text style={styles.kindLabel}>نقطة سوداء</Text>
            </TouchableOpacity>
          </View>

          {/* 2. تحديد الموقع الجغرافي */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>2. الموقع الجغرافي 📍</Text>
            <TouchableOpacity
              style={styles.gpsSmallBtn}
              onPress={handleGetCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.gpsSmallBtnText}>موقعي الحالي 🎯</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.hintText}>
            انقر على أي نقطة في الخريطة المصغرة لتحريك الدبوس وتحديد المكان بدقة:
          </Text>

          <View style={styles.miniMapWrapper}>
            <FreeMap
              ref={mapRef}
              places={[currentPinMarker]}
              initialCenter={location}
              serviceBounds={ACTIVE_REGION.bounds}
              onMapClick={handleMapClick}
              zoom={15}
            />
          </View>

          <Text style={styles.coordsText}>
            الإحداثيات: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>

          {/* 3. حقول مخصصة حسب النوع */}
          {kind === 'wild_dump' && (
            <View style={styles.dynamicSection}>
              <Text style={styles.sectionTitle}>درجة الخطورة ⚠️</Text>
              <View style={styles.severityRow}>
                <TouchableOpacity
                  style={[
                    styles.severityBtn,
                    severity === 'small' && { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' },
                  ]}
                  onPress={() => setSeverity('small')}
                >
                  <Text style={styles.severityText}>صغيرة 🟡</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.severityBtn,
                    severity === 'medium' && { backgroundColor: '#FFE0B2', borderColor: '#FB8C00' },
                  ]}
                  onPress={() => setSeverity('medium')}
                >
                  <Text style={styles.severityText}>متوسطة 🟠</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.severityBtn,
                    severity === 'large' && { backgroundColor: '#FFCDD2', borderColor: '#E53935' },
                  ]}
                  onPress={() => setSeverity('large')}
                >
                  <Text style={styles.severityText}>كبيرة / حرجة 🔴</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {kind === 'collection_point' && (
            <View style={styles.dynamicSection}>
              <Text style={styles.sectionTitle}>مواعيد الرفع ومواد التجميع ⏰</Text>
              <TextInput
                style={styles.textInput}
                placeholder="أوقات الرفع (مثال: يومياً من 19:00 إلى 21:00)"
                value={schedule}
                onChangeText={setSchedule}
                textAlign="right"
              />
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                placeholder="المواد المقبولة (مثال: بلاستيك، كرتون، زجاج)"
                value={acceptsText}
                onChangeText={setAcceptsText}
                textAlign="right"
              />
            </View>
          )}

          {/* 3. صورة المكان */}
          <Text style={styles.sectionTitle}>3. صورة توضيحية 📷</Text>
          {photoUri ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => setPhotoUri(null)}
              >
                <Text style={styles.removePhotoText}>✕ حذف الصورة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickCamera}
              >
                <Text style={styles.photoActionText}>الكاميرا 📸</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickGallery}
              >
                <Text style={styles.photoActionText}>معرض الصور 🖼️</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 4. ملاحظات إضافية */}
          <Text style={styles.sectionTitle}>4. ملاحظات إضافية ✍️</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="اكتب أي تفاصيل تساعد في العثور على المكان أو وصف الحالة..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
          />

          {/* زر الإرسال الرئيسي */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>إرسال المكان للتوثيق 🚀</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* تبويب "أماكني المضافة" */
        <View style={styles.myPlacesContainer}>
          {loadingMyPlaces ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>جاري تحميل أماكنك المضافة...</Text>
            </View>
          ) : myPlaces.length === 0 ? (
            <View style={styles.emptyMyPlaces}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>لم تقم بإضافة أي مكان بعد</Text>
              <Text style={styles.emptyDesc}>
                ساهم في تنظيف وتطوير المدينة بإضافة أول حاوية أو التبليغ عن نقطة سوداء.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setActiveTab('form')}
              >
                <Text style={styles.primaryBtnText}>إضافة مكان جديد الآن ➕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={myPlaces}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={styles.myPlaceCard}>
                  <View style={styles.myPlaceCardHeader}>
                    <View
                      style={[
                        styles.statusBadge,
                        item.verified ? styles.statusBadgeVerified : styles.statusBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.verified ? styles.statusTextVerified : styles.statusTextPending,
                        ]}
                      >
                        {item.verified ? '✅ موثق ومعتمد' : '⏳ قيد المراجعة'}
                      </Text>
                    </View>
                    <Text style={styles.myPlaceKind}>
                      {item.kind === 'bin' && 'سلة 🟢'}
                      {item.kind === 'collection_point' && 'نقطة تجميع 📦'}
                      {item.kind === 'wild_dump' && 'نقطة سوداء 🔴'}
                    </Text>
                  </View>

                  <Text style={styles.myPlaceNeighborhood}>
                    الحي: {item.neighborhood}
                  </Text>

                  {item.notes ? (
                    <Text style={styles.myPlaceNotes} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  ) : null}

                  <Text style={styles.myPlaceDate}>
                    تاريخ الإضافة: {new Date(item.createdAt).toLocaleDateString('ar-DZ')}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* نافذة "في انتظار الموافقة والتوثيق" */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>تم استلام مساهمتك بنجاح!</Text>
            <View style={styles.statusBoxNotice}>
              <Text style={styles.statusBoxNoticeTitle}>⏳ في انتظار مراجعة وتوثيق البلدية</Text>
              <Text style={styles.statusBoxNoticeDesc}>
                المكان تم حفظه برتبة "غير موثق" (Pending Verification).
                سيقوم المشرفون بمراجعته والموافقة عليه ليصبح ظاهراً لجميع المواطنين على الخريطة العامة.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalActionPrimary}
              onPress={() => {
                setShowSuccessModal(false);
                setActiveTab('my_places');
              }}
            >
              <Text style={styles.modalActionPrimaryText}>عرض أماكني المضافة 📋</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionSecondary}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.modalActionSecondaryText}>العودة إلى الخريطة 🗺️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconBig: {
    fontSize: 56,
    marginBottom: 16,
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
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  tabsHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    marginTop: 14,
    textAlign: 'right',
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  kindRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 8,
  },
  kindCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  kindEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  kindLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  gpsSmallBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  gpsSmallBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'right',
  },
  miniMapWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 6,
  },
  coordsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  neighborhoodRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  neighborhoodChip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  neighborhoodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  neighborhoodChipText: {
    fontSize: 13,
    color: colors.text,
  },
  neighborhoodChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  dynamicSection: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  severityRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  severityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  photoActionsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  photoPreviewWrapper: {
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  removePhotoBtn: {
    marginTop: 8,
    padding: 6,
  },
  removePhotoText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 13,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 75,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  myPlacesContainer: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyMyPlaces: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
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
    marginVertical: 12,
  },
  myPlaceCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  myPlaceCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  myPlaceKind: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgePending: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeVerified: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextPending: {
    color: '#E65100',
  },
  statusTextVerified: {
    color: '#2E7D32',
  },
  myPlaceNeighborhood: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  myPlaceNotes: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    marginTop: 6,
  },
  myPlaceDate: {
    fontSize: 11,
    color: '#9E9E9E',
    textAlign: 'right',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 52,
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  statusBoxNotice: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 10,
    padding: 12,
    marginVertical: 16,
    width: '100%',
  },
  statusBoxNoticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57F17',
    textAlign: 'right',
    marginBottom: 4,
  },
  statusBoxNoticeDesc: {
    fontSize: 12,
    color: '#5D4037',
    textAlign: 'right',
    lineHeight: 18,
  },
  modalActionPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalActionPrimaryText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalActionSecondary: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalActionSecondaryText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
