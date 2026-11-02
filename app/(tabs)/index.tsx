/**
 * شاشة الخريطة الحية (Live Interactive Map - Al-Twiza Laghouat)
 * 
 * بالدارجة: هذي هي شاشة الخريطة الحية، مبنية على مزود الخرائط المجاني،
 * فيها أزرار الفلترة الأربعة، زر تحديد الموقع الحالي عبر الـ GPS، وبطاقة معلومات المكان.
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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { FreeMap, FreeMapRef } from '../../src/components/FreeMap';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { LAGHOUAT_CENTER } from '../../src/constants/laghouat';
import { useAuth } from '../../src/context/AuthContext';
import { Place, PlaceKind } from '../../src/types';

// عينات واقعية للأماكن المعتمدة داخل أحياء الأغواط
const INITIAL_DEMO_PLACES: Place[] = [
  {
    id: 'bin-1',
    kind: 'bin',
    location: { latitude: 33.8015, longitude: 2.8640 },
    neighborhood: 'وسط المدينة (البلاد)',
    photoURL: null,
    notes: 'حاوية بلاستيكية خضراء جديدة بجانب ساحة الشهداء.',
    owner: 'municipality',
    verified: true,
    addedBy: 'admin',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    status: 'ok',
  },
  {
    id: 'point-1',
    kind: 'collection_point',
    location: { latitude: 33.8050, longitude: 2.8685 },
    neighborhood: 'الواحات',
    photoURL: null,
    notes: 'نقطة تجميع كبرى بحي الواحات، تفريغ الحاويات كل يوم صباحاً.',
    owner: 'municipality',
    verified: true,
    addedBy: 'admin',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now(),
    status: 'ok',
  },
  {
    id: 'dump-1',
    kind: 'wild_dump',
    location: { latitude: 33.7960, longitude: 2.8610 },
    neighborhood: 'الوئام',
    photoURL: null,
    notes: 'تراكم نفايات صلبة عند المخرج الخلفي للحي، بحاجة لتدخل.',
    owner: 'informal',
    verified: true,
    addedBy: 'citizen',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    severity: 'medium',
  },
  {
    id: 'bin-2',
    kind: 'bin',
    location: { latitude: 33.8080, longitude: 2.8710 },
    neighborhood: 'المقام',
    photoURL: null,
    notes: 'حاوية معدنية قرب مسجد المقام.',
    owner: 'municipality',
    verified: true,
    addedBy: 'admin',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
    status: 'ok',
  },
];

export default function MapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const mapRef = useRef<FreeMapRef>(null);

  const [selectedFilter, setSelectedFilter] = useState<'all' | PlaceKind>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // تصفية الأماكن المحددة حسب الفلتر
  const filteredPlaces = useMemo(() => {
    if (selectedFilter === 'all') return INITIAL_DEMO_PLACES;
    return INITIAL_DEMO_PLACES.filter((p) => p.kind === selectedFilter);
  }, [selectedFilter]);

  // تحديد موقع المستخدم الحالي بالـ GPS والتنقل إليه بسلاسة
  const handleGetCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'إذن الموقع غير مفعّل',
          'يمكنك تصفح الخريطة يدوياً واختيار الأحياء دون الحاجة للـ GPS.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      mapRef.current?.flyTo(
        location.coords.latitude,
        location.coords.longitude,
        16
      );
    } catch (err) {
      console.error('فشل جلب الموقع:', err);
      Alert.alert('تنبيه', 'تعذر جلب موقعك الحالي، تأكد من تشغيل الـ GPS.');
    } finally {
      setIsLocating(false);
    }
  };

  // فتح الاتجاهات في تطبيق الخرائط الخارجي للهاتف
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
        console.error('فشل فتح تطبيق الخرائط:', err)
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* أزرار الفلترة العلوية السريعة */}
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
              الكل ({INITIAL_DEMO_PLACES.length})
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

        {/* الخريطة التفاعلية المجانية المحمية من الحظر */}
        <FreeMap
          ref={mapRef}
          places={filteredPlaces}
          center={LAGHOUAT_CENTER}
          onSelectPlace={(place) => setSelectedPlace(place)}
        />

        {/* زر التموضع وتحديد الموقع الحالي */}
        <TouchableOpacity
          style={styles.gpsFab}
          onPress={handleGetCurrentLocation}
          activeOpacity={0.85}
        >
          <Text style={styles.gpsFabText}>{isLocating ? '⌛' : '📍'}</Text>
        </TouchableOpacity>

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
  gpsFab: {
    position: 'absolute',
    top: 65,
    left: 16,
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
    zIndex: 20,
  },
  gpsFabText: {
    fontSize: 22,
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
    marginVertical: 8,
    lineHeight: 18,
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
});
