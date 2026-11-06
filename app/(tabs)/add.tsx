/**
 * شاشة إضافة بلاغ أو مكان جديد (Screen 4 - Add Report / Place)
 * 
 * بالدارجة: هادي الشاشة مخصصة 100% لإرسال بلاغ أو إضافة حاوية أو مكب،
 * مطابقة للموك آب المرجعي (Screen 4):
 * - ترويسة علوية: ‹ Add Report
 * - بطاقة إضافة صورة (Add a photo) بالكاميرا أو المعرض
 * - اختيار الفئة (Category: سلة نفايات، نقطة تجميع، نقطة سوداء)
 * - الموقع الجغرافي التلقائي مع زر GPS والخريطة المصغرة
 * - الوصف والملاحظات (Description)
 * - زر الإرسال الأخضر (Send Report)
 * - فور الإرسال: يتم توجيه المواطن مباشرة إلى صفحة تقاريري (/reports) لمتابعة البلاغ!
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { FreeMap, FreeMapRef } from '../../src/components/FreeMap';
import { AppIcon } from '../../src/components/AppIcon';
import { GuestLoginPrompt } from '../../src/components/GuestLoginPrompt';
import {
  ACTIVE_REGION,
  isLocationInRegion,
  OUT_OF_SERVICE_MESSAGE,
  getApproximateNeighborhood,
} from '../../src/constants/regions';
import { Place, PlaceKind, GeoLocation, Severity } from '../../src/types';
import { StorageService } from '../../src/services/storageService';
import { PlaceService } from '../../src/services/placeService';

export default function AddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ presetLat?: string; presetLng?: string; presetTitle?: string }>();
  const { user } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const mapRef = useRef<FreeMapRef>(null);

  // حقول النموذج
  const [kind, setKind] = useState<PlaceKind>('bin');
  const [location, setLocation] = useState<GeoLocation>({
    latitude: params.presetLat ? parseFloat(params.presetLat) : ACTIVE_REGION.center.latitude,
    longitude: params.presetLng ? parseFloat(params.presetLng) : ACTIVE_REGION.center.longitude,
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState(params.presetTitle ? `بخصوص: ${params.presetTitle}\n` : '');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [schedule, setSchedule] = useState('');
  const [acceptsText, setAcceptsText] = useState('بلاستيك، ورق، نفايات منزلية');

  // حالات التحميل
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (err: any) {
      console.warn('تعذر جلب موقع GPS:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // النقر على الخريطة لتعديل الإحداثيات
  const handleMapClick = (coords: { latitude: number; longitude: number }) => {
    const { latitude: lat, longitude: lng } = coords;
    if (!isLocationInRegion(lat, lng, ACTIVE_REGION)) {
      Alert.alert('تنبيه النطاق الجغرافي', OUT_OF_SERVICE_MESSAGE);
      return;
    }
    setLocation(coords);
    mapRef.current?.flyTo(lat, lng, 16);
  };

  // التقاط صورة بالكاميرا
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

  // إرسال البلاغ / المكان
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('تسجيل الدخول مطلوب', 'يجب تسجيل الدخول لإرسال بلاغ أو إضافة مكان.');
      router.push('/(auth)/login');
      return;
    }

    if (!isLocationInRegion(location.latitude, location.longitude, ACTIVE_REGION)) {
      Alert.alert('موقع غير مقبول', OUT_OF_SERVICE_MESSAGE);
      return;
    }

    try {
      setIsSubmitting(true);

      let uploadedPhotoURL: string | null = null;
      if (photoUri) {
        try {
          uploadedPhotoURL = await StorageService.uploadPlacePhoto(photoUri, user.uid);
        } catch (uploadErr) {
          console.warn('تنبيه: تعذر رفع الصورة للسحابة، سيتم الحفظ بدونها:', uploadErr);
        }
      }

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

      // تفريغ المدخلات والتحويل الفوري إلى صفحة تقاريري لمتابعة الحالة
      setPhotoUri(null);
      setNotes('');
      setSchedule('');

      Alert.alert(
        'تم إرسال البلاغ بنجاح! 🙌',
        'شكراً لمساهمتك في نظافة الأغواط. تم نقلك لصفحة تقاريري لمتابعة حالة التدخل والمعالجة.',
        [
          {
            text: 'حسناً',
            onPress: () => router.replace('/(tabs)/reports'),
          },
        ]
      );
      router.replace('/(tabs)/reports');
    } catch (err: any) {
      console.error('فشل إرسال البلاغ:', err);
      Alert.alert('خطأ في الإرسال', err.message || 'تعذر حفظ البلاغ، يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // إذا لم يكن المستخدم مسجلاً
  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <GuestLoginPrompt redirectTo="/(tabs)/add" />
      </SafeAreaView>
    );
  }

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* 1. الترويسة العلوية النظيفة المطابقة لـ Screen 4 */}
      <View style={[styles.headerBar, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <AppIcon name="chevron_right" size={20} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('add.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. بطاقة إضافة الصورة المطابقة لـ Mockup Screen 4 */}
        <View style={[styles.photoUploadCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          {photoUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => setPhotoUri(null)}
              >
                <Text style={styles.removePhotoText}>✕ {t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={[styles.cameraIconCircle, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}>
                <AppIcon name="camera" size={32} color={themeColors.primary} />
              </View>
              <Text style={[styles.addPhotoTitle, { color: themeColors.text }]}>{t('add.add_photo')}</Text>
              <Text style={[styles.addPhotoSubtitle, { color: themeColors.textSecondary }]}>
                {t('add.photo_desc')}
              </Text>
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.photoActionBtn, { backgroundColor: themeColors.primary }]}
                  onPress={handlePickCamera}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.photoActionText, { color: isDark ? '#061C12' : '#FFFFFF' }]}>
                    {t('add.camera')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoActionBtn, styles.photoActionGallery, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}
                  onPress={handlePickGallery}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.photoActionText, styles.photoActionGalleryText, { color: themeColors.text }]}>
                    {t('add.gallery')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 3. اختيار الفئة (Category) */}
        <Text style={[styles.fieldLabel, { color: themeColors.text }]}>{t('add.category')}</Text>
        <View style={styles.kindRow}>
          <TouchableOpacity
            style={[
              styles.kindCard,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
              kind === 'bin' && { borderColor: themeColors.primary, backgroundColor: isDark ? '#143D2D' : '#F0FDF4' },
            ]}
            onPress={() => setKind('bin')}
            activeOpacity={0.8}
          >
            <AppIcon name="bin" size={24} color={kind === 'bin' ? themeColors.primary : themeColors.textMuted} />
            <Text style={[styles.kindLabel, { color: kind === 'bin' ? themeColors.primary : themeColors.textSecondary }]}>
              {t('kinds.bin')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kindCard,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
              kind === 'collection_point' && { borderColor: themeColors.primary, backgroundColor: isDark ? '#143D2D' : '#F0FDF4' },
            ]}
            onPress={() => setKind('collection_point')}
            activeOpacity={0.8}
          >
            <AppIcon name="collection_point" size={24} color={kind === 'collection_point' ? themeColors.primary : themeColors.textMuted} />
            <Text style={[styles.kindLabel, { color: kind === 'collection_point' ? themeColors.primary : themeColors.textSecondary }]}>
              {t('kinds.collection_point')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kindCard,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
              kind === 'wild_dump' && { borderColor: '#EF4444', backgroundColor: isDark ? '#3D1414' : '#FEF2F2' },
            ]}
            onPress={() => setKind('wild_dump')}
            activeOpacity={0.8}
          >
            <AppIcon name="wild_dump" size={24} color={kind === 'wild_dump' ? '#EF4444' : themeColors.textMuted} />
            <Text style={[styles.kindLabel, { color: kind === 'wild_dump' ? '#EF4444' : themeColors.textSecondary }]}>
              {t('kinds.wild_dump')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. الموقع الجغرافي (Location) */}
        <View style={styles.locationHeaderRow}>
          <Text style={[styles.fieldLabel, { color: themeColors.text }]}>{t('add.location')}</Text>
          <TouchableOpacity
            style={[styles.gpsSmallBtn, { backgroundColor: isDark ? '#143D2D' : '#EAF4ED' }]}
            onPress={handleGetCurrentLocation}
            disabled={isLocating}
            activeOpacity={0.8}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon name="gps" size={14} color={themeColors.primary} />
                <Text style={[styles.gpsSmallBtnText, { color: themeColors.primary }]}>{t('add.gps_detect')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.locationCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={[styles.locationInfoRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
            <AppIcon name="pin" size={16} color={themeColors.primary} />
            <Text style={[styles.locationNeighborhoodText, { color: themeColors.text }]}>
              {getApproximateNeighborhood(location.latitude, location.longitude)} ({t('pilot_city')})
            </Text>
          </View>
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
          <Text style={[styles.coordsText, { color: themeColors.textSecondary }]}>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
        </View>

        {/* حقول إضافية للنقاط السوداء */}
        {kind === 'wild_dump' && (
          <View style={styles.dynamicSection}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>{t('add.severity')}</Text>
            <View style={styles.severityRow}>
              <TouchableOpacity
                style={[
                  styles.severityBtn,
                  { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border },
                  severity === 'small' && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                ]}
                onPress={() => setSeverity('small')}
              >
                <Text style={[styles.severityText, { color: severity === 'small' ? (isDark ? '#061C12' : '#FFFFFF') : themeColors.textSecondary }]}>
                  {t('add.severity_small')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.severityBtn,
                  { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border },
                  severity === 'medium' && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
                ]}
                onPress={() => setSeverity('medium')}
              >
                <Text style={[styles.severityText, { color: severity === 'medium' ? '#FFFFFF' : themeColors.textSecondary }]}>
                  {t('add.severity_medium')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.severityBtn,
                  { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border },
                  severity === 'large' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                ]}
                onPress={() => setSeverity('large')}
              >
                <Text style={[styles.severityText, { color: severity === 'large' ? '#FFFFFF' : themeColors.textSecondary }]}>
                  {t('add.severity_large')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. الوصف والملاحظات (Description) */}
        <Text style={[styles.fieldLabel, { color: themeColors.text }]}>{t('add.notes')}</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          placeholder={t('add.notes_placeholder')}
          placeholderTextColor={themeColors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* زر الإرسال الرئيسي المطابق لـ Mockup Screen 4 */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: themeColors.primary }, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator color={isDark ? '#061C12' : '#FFF'} />
          ) : (
            <Text style={[styles.submitBtnText, { color: isDark ? '#061C12' : '#FFF' }]}>{t('add.submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  headerBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAF8',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackIcon: {
    fontSize: 28,
    color: '#1F2937',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 95,
  },
  photoUploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 180,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  cameraIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EAF4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  addPhotoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  addPhotoSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontFamily: theme.fontFamily,
  },
  photoActionsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 14,
  },
  photoActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  photoActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  photoActionGallery: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  photoActionGalleryText: {
    color: '#374151',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
  },
  removePhotoBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    fontFamily: theme.fontFamily,
    marginBottom: 8,
    textAlign: 'left',
  },
  kindRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 20,
  },
  kindCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  kindCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EAF4ED',
  },
  kindCardActiveDanger: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  kindLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: theme.fontFamily,
  },
  kindLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  kindLabelActiveDanger: {
    color: '#DC2626',
    fontWeight: '700',
  },
  locationHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsSmallBtn: {
    backgroundColor: '#EAF4ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7E9DC',
  },
  gpsSmallBtnText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 20,
  },
  locationInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locationNeighborhoodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
  },
  miniMapWrapper: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coordsText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'left',
    marginTop: 6,
    fontFamily: theme.fontFamily,
  },
  dynamicSection: {
    marginBottom: 20,
  },
  severityRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  severityBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  severityBtnActiveDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  severityText: {
    fontSize: 11.5,
    color: '#4B5563',
    fontWeight: '600',
    fontFamily: theme.fontFamily,
  },
  severityTextActive: {
    color: '#B45309',
    fontWeight: '700',
  },
  severityTextActiveDanger: {
    color: '#DC2626',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 13.5,
    color: '#1F2937',
    fontFamily: theme.fontFamily,
    marginBottom: 24,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#23703F', // أخضر الموك آب الغابي
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#23703F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: theme.fontFamily,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: theme.fontFamily,
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: theme.fontFamily,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#23703F',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
});
