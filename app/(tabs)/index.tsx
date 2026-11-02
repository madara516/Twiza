/**
 * شاشة الخريطة المتكاملة (Phase 2 Map Screen - Al-Twiza Laghouat)
 * 
 * بالدارجة: شاشة الخريطة الكاملة للمرحلة 2:
 * 1. الخريطة الحرة (OpenStreetMap) بدون أي API key.
 * 2. فلاتر الأنواع (سلات، نقاط تجميع، نقاط سوداء).
 * 3. ميزة "أقرب الأماكن لي" بحساب المسافات بنظام Haversine الدقيق.
 * 4. التعامل مع إذن الـ GPS (إذا رُفض يتيح اختيار الحي يدوياً).
 * 5. بطاقة المكان الكاملة مع زر الاتجاهات وتفاصيل المواعيد.
 * 6. ميزة Seeding للأدمن لبذر الأماكن الأولية.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { FreeMap, FreeMapRef } from '../../src/components/FreeMap';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import {
  ACTIVE_REGION,
  isLocationInRegion,
  OUT_OF_SERVICE_MESSAGE,
} from '../../src/constants/regions';
import { Neighborhood } from '../../src/constants/laghouat';
import { useAuth } from '../../src/context/AuthContext';
import { usePlaces } from '../../src/hooks/usePlaces';
import { Place, PlaceKind, GeoLocation } from '../../src/types';
import { PlaceWithDistance } from '../../src/utils/haversine';
import { PlaceService } from '../../src/services/placeService';

// إحداثيات تقريبية للأحياء لتمكين التمركز اليدوي عند رفض الـ GPS
const NEIGHBORHOOD_COORDS: Record<Neighborhood, GeoLocation> = {
  'وسط المدينة (البلاد)': { latitude: 33.8015, longitude: 2.8640 },
  'الواحات': { latitude: 33.8050, longitude: 2.8685 },
  'الوئام': { latitude: 33.7960, longitude: 2.8610 },
  'المقام': { latitude: 33.8080, longitude: 2.8710 },
};

export default function MapScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const mapRef = useRef<FreeMapRef>(null);

  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | PlaceKind>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showNearestModal, setShowNearestModal] = useState<boolean>(false);
  const [showNeighborhoodModal, setShowNeighborhoodModal] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // جلب الأماكن الحية عبر الـ Hook
  const { places, nearestPlaces, loading, error, refresh } = usePlaces(userLocation);

  // تصفية الأماكن المعروضة حسب الفلتر المختار
  const filteredPlaces = useMemo(() => {
    if (selectedFilter === 'all') return places;
    return places.filter((p) => p.kind === selectedFilter);
  }, [places, selectedFilter]);

  // طلب إذن الـ GPS وجلب الإحداثيات
  const handleGetCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'إذن الموقع غير مفعّل',
          'يمكنك اختيار الحي يدوياً للتمركز عليه في الخريطة.',
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'اختيار حي 📍',
              onPress: () => setShowNeighborhoodModal(true),
            },
          ]
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

      // إذا كان المستخدم خارج المنطقة التجريبية النشطة، نظهر تنبيهاً لبقاً
      if (!isLocationInRegion(coords.latitude, coords.longitude, ACTIVE_REGION)) {
        Alert.alert(
          'منطقة خارج التغطية حالياً',
          OUT_OF_SERVICE_MESSAGE,
          [
            { text: 'حسناً', style: 'default' },
            {
              text: `استعراض ${ACTIVE_REGION.nameAr}`,
              onPress: () => {
                mapRef.current?.flyTo(ACTIVE_REGION.center.latitude, ACTIVE_REGION.center.longitude, 14);
              },
            },
          ]
        );
        return;
      }

      setUserLocation(coords);
      mapRef.current?.flyTo(coords.latitude, coords.longitude, 16);
    } catch (err) {
      console.error('فشل جلب الموقع:', err);
      Alert.alert(
        'تعذر جلب الموقع',
        'تأكد من تشغيل خدمة الموقع (GPS) في هاتفك أو اختر حياً يدوياً.',
        [
          { text: 'حسناً', style: 'cancel' },
          {
            text: 'اختيار حي يدوياً',
            onPress: () => setShowNeighborhoodModal(true),
          },
        ]
      );
    } finally {
      setIsLocating(false);
    }
  };

  // التمركز اليدوي على حي معين
  const handleSelectNeighborhood = (nh: Neighborhood) => {
    const coords = NEIGHBORHOOD_COORDS[nh];
    if (coords) {
      setUserLocation(coords);
      mapRef.current?.flyTo(coords.latitude, coords.longitude, 15);
      setShowNeighborhoodModal(false);
    }
  };

  // فتح الاتجاهات في تطبيق الملاحة الخارجي
  const handleOpenDirections = (place: Place) => {
    const lat = place.location.latitude;
    const lng = place.location.longitude;
    const label = encodeURIComponent(`التويزة - ${place.neighborhood}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });

    if (url) {
      Linking.openURL(url).catch((err) =>
        console.error('فشل فتح تطبيق الملاحة:', err)
      );
    }
  };

  // التمركز على مكان من قائمة الأقرب إليّ
  const handleSelectNearestPlace = (item: PlaceWithDistance) => {
    setShowNearestModal(false);
    setSelectedPlace(item);
    mapRef.current?.flyTo(item.location.latitude, item.location.longitude, 17);
  };

  // بذر الأماكن للأدمن (Seeding)
  const handleSeedPlaces = async () => {
    if (!user) return;
    try {
      setIsSeeding(true);
      const count = await PlaceService.seedInitialPlaces(user.uid);
      Alert.alert('نجاح', `تمت إضافة ${count} مكان موثق بنجاح في قاعدة البيانات.`);
      await refresh();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'فشل بذر الأماكن.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* شريط الفلاتر العلوي */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'all' && styles.filterTextActive,
              ]}
            >
              الكل ({places.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'bin' && { backgroundColor: colors.kind.bin },
            ]}
            onPress={() => setSelectedFilter('bin')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'bin' && styles.filterTextActive,
              ]}
            >
              سلات 🟢
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'collection_point' && {
                backgroundColor: colors.kind.collection_point,
              },
            ]}
            onPress={() => setSelectedFilter('collection_point')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'collection_point' && styles.filterTextActive,
              ]}
            >
              نقاط تجميع 🌲
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'wild_dump' && {
                backgroundColor: colors.kind.wild_dump,
              },
            ]}
            onPress={() => setSelectedFilter('wild_dump')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'wild_dump' && styles.filterTextActive,
              ]}
            >
              نقاط سوداء 🔴
            </Text>
          </TouchableOpacity>
        </View>

        {/* الخريطة المجانية المتكاملة */}
        <FreeMap
          ref={mapRef}
          places={filteredPlaces}
          initialCenter={ACTIVE_REGION.center}
          serviceBounds={ACTIVE_REGION.bounds}
          onSelectPlace={(place) => setSelectedPlace(place)}
        />

        {/* الأزرار العائمة على الخريطة */}
        <View style={styles.fabColumn}>
          {/* زر الموقع الحالي GPS */}
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={handleGetCurrentLocation}
            activeOpacity={0.85}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.fabIcon}>📍</Text>
            )}
          </TouchableOpacity>

          {/* زر قائمة "أقرب الأماكن لي" */}
          <TouchableOpacity
            style={[styles.fabBtn, styles.nearestFab]}
            onPress={() => {
              if (!userLocation) {
                handleGetCurrentLocation();
              }
              setShowNearestModal(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>🎯</Text>
          </TouchableOpacity>

          {/* زر التمركز اليدوي على الأحياء */}
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => setShowNeighborhoodModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>🏙️</Text>
          </TouchableOpacity>
        </View>

        {/* زر Seeding للأدمن فقط */}
        {role === 'admin' ? (
          <TouchableOpacity
            style={styles.adminSeedBtn}
            onPress={handleSeedPlaces}
            disabled={isSeeding}
          >
            <Text style={styles.adminSeedText}>
              {isSeeding ? 'جاري البذر...' : '🌱 إضافة بيانات تجريبية (Admin)'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* حالة الخريطة الفارغة (Empty State) */}
        {filteredPlaces.length === 0 && !loading ? (
          <View style={styles.emptyNotice}>
            <Text style={styles.emptyText}>
              لا توجد أماكن مسجلة في هذا التصنيف حالياً.
            </Text>
          </View>
        ) : null}

        {/* بطاقة تفاصيل المكان المنبثقة */}
        {selectedPlace ? (
          <View style={styles.placeCard}>
            <View style={styles.placeCardHeader}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedPlace(null)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.placeTitleBox}>
                <Text style={styles.placeTitle}>
                  {selectedPlace.kind === 'bin' && 'سلة نفايات فردية 🟢'}
                  {selectedPlace.kind === 'collection_point' && 'نقطة تجميع رئيسية 🌲'}
                  {selectedPlace.kind === 'wild_dump' && 'نقطة سوداء (مكب فوضوي) 🔴'}
                </Text>
                <Text style={styles.placeNeighborhood}>
                  حي: {selectedPlace.neighborhood}
                </Text>
              </View>
            </View>

            {selectedPlace.notes ? (
              <Text style={styles.placeNotes}>{selectedPlace.notes}</Text>
            ) : null}

            {selectedPlace.schedule ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>مواعيد التفريغ: </Text>
                <Text style={styles.metaValue}>{selectedPlace.schedule}</Text>
              </View>
            ) : null}

            <View style={styles.placeActions}>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => handleOpenDirections(selectedPlace)}
              >
                <Text style={styles.directionsBtnText}>الاتجاهات 🧭</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => {
                  if (!user) {
                    router.push('/(auth)/login');
                  } else {
                    router.push('/(tabs)/reports');
                  }
                }}
              >
                <Text style={styles.reportBtnText}>تبليغ عن مشكلة ⚠️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* نافذة "أقرب الأماكن لي" المنبثقة (Nearest to Me Modal) */}
        <Modal
          visible={showNearestModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNearestModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowNearestModal(false)}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>أقرب الأماكن إليك 🎯</Text>
              </View>

              {!userLocation ? (
                <View style={styles.locationPrompt}>
                  <Text style={styles.locationPromptText}>
                    لم يتم تحديد موقعك عبر GPS بعد لحساب المسافات بدقة.
                  </Text>
                  <TouchableOpacity
                    style={styles.locateActionBtn}
                    onPress={handleGetCurrentLocation}
                  >
                    <Text style={styles.locateActionBtnText}>
                      تحديد موقعي الآن 📍
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : nearestPlaces.length === 0 ? (
                <Text style={styles.emptyModalText}>لا توجد أماكن قريبة مسجلة.</Text>
              ) : (
                <FlatList
                  data={nearestPlaces}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.nearestItem}
                      onPress={() => handleSelectNearestPlace(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>
                          {item.formattedDistance}
                        </Text>
                      </View>
                      <View style={styles.nearestInfo}>
                        <Text style={styles.nearestTitle}>
                          {item.kind === 'bin' && 'سلة 🟢'}
                          {item.kind === 'collection_point' && 'نقطة تجميع 🌲'}
                          {item.kind === 'wild_dump' && 'نقطة سوداء 🔴'}
                          {' — '}
                          {item.neighborhood}
                        </Text>
                        <Text
                          style={styles.nearestNotes}
                          numberOfLines={1}
                        >
                          {item.notes || 'لا توجد ملاحظات إضافية'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* نافذة اختيار الحي يدوياً في حالة رفض الـ GPS */}
        <Modal
          visible={showNeighborhoodModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowNeighborhoodModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentSmall}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowNeighborhoodModal(false)}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>اختر الحي للتمركز 🏙️</Text>
              </View>

              <View style={styles.neighborhoodGrid}>
                {ACTIVE_REGION.neighborhoods.map((nh) => (
                  <TouchableOpacity
                    key={nh}
                    style={styles.neighborhoodBtn}
                    onPress={() => handleSelectNeighborhood(nh)}
                  >
                    <Text style={styles.neighborhoodBtnText}>{nh}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#F0F0F0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  fabColumn: {
    position: 'absolute',
    top: 65,
    left: 16,
    gap: 10,
    zIndex: 20,
  },
  fabBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nearestFab: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  fabIcon: {
    fontSize: 20,
  },
  adminSeedBtn: {
    position: 'absolute',
    top: 65,
    right: 16,
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    zIndex: 20,
  },
  adminSeedText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyNotice: {
    position: 'absolute',
    top: 130,
    left: 30,
    right: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 15,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  placeCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 30,
  },
  placeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  placeTitleBox: {
    alignItems: 'flex-end',
    flex: 1,
  },
  placeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeNeighborhood: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  placeNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    marginVertical: 6,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 11,
    color: colors.primary,
  },
  placeActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 6,
  },
  directionsBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionsBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  reportBtn: {
    flex: 1,
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  reportBtnText: {
    color: '#E65100',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.md,
    maxHeight: '70%',
  },
  modalContentSmall: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.md,
    maxHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  locationPrompt: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  locationPromptText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  locateActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  locateActionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyModalText: {
    textAlign: 'center',
    padding: 20,
    color: colors.textSecondary,
  },
  nearestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  distanceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  nearestInfo: {
    alignItems: 'flex-end',
    flex: 1,
    marginRight: 10,
  },
  nearestTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  nearestNotes: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  neighborhoodGrid: {
    gap: 8,
    paddingBottom: 16,
  },
  neighborhoodBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  neighborhoodBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
});
