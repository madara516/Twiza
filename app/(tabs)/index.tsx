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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { FreeMap, FreeMapRef } from '../../src/components/FreeMap';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import {
  ACTIVE_REGION,
  isLocationInRegion,
  getApproximateNeighborhood,
  OUT_OF_SERVICE_MESSAGE,
} from '../../src/constants/regions';
import { Neighborhood } from '../../src/constants/laghouat';
import { useAuth } from '../../src/context/AuthContext';
import { usePlaces } from '../../src/hooks/usePlaces';
import { Place, PlaceKind, GeoLocation } from '../../src/types';
import { PlaceWithDistance } from '../../src/utils/haversine';
import { PlaceService } from '../../src/services/placeService';
import { VoteService } from '../../src/services/voteService';

export default function MapScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const mapRef = useRef<FreeMapRef>(null);

  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | PlaceKind>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showNearestModal, setShowNearestModal] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // حالات التصويت لميزة "نحتاجو حاوية هنا"
  const [showNeedBinModal, setShowNeedBinModal] = useState<boolean>(false);
  const [selectedVoteNeighborhood, setSelectedVoteNeighborhood] = useState<Neighborhood>(
    ACTIVE_REGION.neighborhoods[0] as Neighborhood
  );
  const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);

  // حالة معاينة الصورة بحجم كامل
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<string | null>(null);

  // حالات تأكيدات "ما زالت هنا" للمكان المختار
  const [confirmStats, setConfirmStats] = useState<{ count: number; lastConfirmedAt: number | null }>({
    count: 0,
    lastConfirmedAt: null,
  });
  const [hasConfirmed, setHasConfirmed] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  useEffect(() => {
    if (selectedPlace) {
      PlaceService.getPlaceConfirmationsStats(selectedPlace.id).then(setConfirmStats);
      if (user) {
        PlaceService.hasUserConfirmedPlace(selectedPlace.id, user.uid).then(setHasConfirmed);
      } else {
        setHasConfirmed(false);
      }
    }
  }, [selectedPlace, user]);

  const handleConfirmStillThere = async () => {
    if (!user) {
      Alert.alert('تسجيل الدخول مطلوب', 'يرجى تسجيل الدخول لتأكيد وجود هذا المكان.');
      router.push('/(auth)/login');
      return;
    }
    if (!selectedPlace || hasConfirmed || isConfirming) return;

    try {
      setIsConfirming(true);
      await PlaceService.confirmPlace(selectedPlace.id, user.uid);
      setHasConfirmed(true);
      setConfirmStats((prev) => ({
        count: prev.count + 1,
        lastConfirmedAt: Date.now(),
      }));
      Alert.alert('شكراً لك! 🤝', 'تم تسجيل تأكيدك "ما زالت هنا" بنجاح.');
    } catch (err: any) {
      Alert.alert('تنبيه', err.message || 'تعذر تسجيل التأكيد.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleNeedBinPress = () => {
    if (!user) {
      Alert.alert('تسجيل الدخول مطلوب', 'يرجى تسجيل الدخول للتصويت على طلب حاوية في حيك.');
      router.push('/(auth)/login');
      return;
    }
    // تحديد الحي تلقائياً من موقع الـ GPS إذا كان متاحاً
    if (userLocation) {
      const autoNh = getApproximateNeighborhood(userLocation.latitude, userLocation.longitude);
      setSelectedVoteNeighborhood(autoNh as Neighborhood);
    } else {
      setSelectedVoteNeighborhood(ACTIVE_REGION.neighborhoods[0] as Neighborhood);
    }
    setShowNeedBinModal(true);
  };

  const handleSubmitBinVote = async () => {
    if (!user || !selectedVoteNeighborhood) return;
    try {
      setIsSubmittingVote(true);
      await VoteService.voteForBin(selectedVoteNeighborhood, user.uid);
      setShowNeedBinModal(false);
      Alert.alert('شكراً لك! 🎉', `تم تسجيل صوتك لطلب حاوية في حي "${selectedVoteNeighborhood}" بنجاح. صوتك يوصل للبلدية!`);
    } catch (err: any) {
      Alert.alert('تنبيه', err.message || 'تعذر تسجيل التصويت.');
    } finally {
      setIsSubmittingVote(false);
    }
  };

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
          'يمكنك التنقل يدوياً في الخريطة واستعراض كافة النقاط المحيطة بك.'
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
        'تأكد من تشغيل خدمة الموقع (GPS) في هاتفك أو تحرك بحرية على الخريطة.'
      );
    } finally {
      setIsLocating(false);
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

        {/* زر "نحتاجو حاوية هنا" التفاعلي */}
        {!selectedPlace ? (
          <TouchableOpacity
            style={styles.needBinFab}
            onPress={handleNeedBinPress}
            activeOpacity={0.85}
          >
            <Text style={styles.needBinFabText}>نحتاجو حاوية هنا 🗑️</Text>
          </TouchableOpacity>
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

            {/* صورة المكان أو النقطة السوداء لتوضيح الحالة والمخاطر */}
            {selectedPlace.photoURL ? (
              <TouchableOpacity
                style={styles.placeImageContainer}
                onPress={() => setSelectedImageForPreview(selectedPlace.photoURL)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: selectedPlace.photoURL }}
                  style={styles.placeCardImage}
                  resizeMode="cover"
                />
                <View style={styles.imageZoomBadge}>
                  <Text style={styles.imageZoomText}>🔍 اضغط لتكبير الصورة</Text>
                </View>
              </TouchableOpacity>
            ) : selectedPlace.kind === 'wild_dump' ? (
              <View style={styles.noPhotoNotice}>
                <Text style={styles.noPhotoText}>📷 لم تُرفع صورة لهذا المكب بعد</Text>
              </View>
            ) : null}

            {/* توضيح درجة الخطورة للنقاط السوداء والمكبات الفوضوية */}
            {selectedPlace.kind === 'wild_dump' && selectedPlace.severity ? (
              <View
                style={[
                  styles.severityBox,
                  selectedPlace.severity === 'large' && styles.severityLarge,
                  selectedPlace.severity === 'medium' && styles.severityMedium,
                  selectedPlace.severity === 'small' && styles.severitySmall,
                ]}
              >
                <Text style={styles.severityTitle}>
                  {selectedPlace.severity === 'large' && '⚠️ درجة الخطورة: مكب نفايات عالي (كبير)'}
                  {selectedPlace.severity === 'medium' && '⚠️ درجة الخطورة: مكب متوسط (تراكم ملحوظ)'}
                  {selectedPlace.severity === 'small' && '⚠️ درجة الخطورة: بقعة نفايات صغيرة'}
                </Text>
                <Text style={styles.severityDescription}>
                  {selectedPlace.severity === 'large' && 'يشكل خطراً صحياً وتلوثاً كبيراً على سكان الحي وبحاجة لتدخل عاجل من البلدية.'}
                  {selectedPlace.severity === 'medium' && 'تجمع للنفايات الصلبة يهدد بنمو الحشرات والروائح، يرجى الحذر والتصويت لحاوية.'}
                  {selectedPlace.severity === 'small' && 'بداية تجمع نفايات يمكن تداركه سريعاً قبل تفاقمه.'}
                </Text>
              </View>
            ) : null}

            {selectedPlace.notes ? (
              <Text style={styles.placeNotes}>{selectedPlace.notes}</Text>
            ) : null}

            {selectedPlace.schedule ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>مواعيد التفريغ: </Text>
                <Text style={styles.metaValue}>{selectedPlace.schedule}</Text>
              </View>
            ) : null}

            {/* صف تأكيدات المواطنين "ما زالت هنا" */}
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  hasConfirmed && styles.confirmBtnActive,
                ]}
                onPress={handleConfirmStillThere}
                disabled={hasConfirmed || isConfirming}
                activeOpacity={0.8}
              >
                {isConfirming ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text
                    style={[
                      styles.confirmBtnText,
                      hasConfirmed && styles.confirmBtnTextActive,
                    ]}
                  >
                    {hasConfirmed ? '✅ أكدت وجودها' : '👍 ما زالت هنا'} ({confirmStats.count})
                  </Text>
                )}
              </TouchableOpacity>

              {confirmStats.lastConfirmedAt ? (
                <Text style={styles.lastConfirmedText}>
                  آخر تأكيد: {new Date(confirmStats.lastConfirmedAt).toLocaleDateString('ar-DZ')}
                </Text>
              ) : (
                <Text style={styles.lastConfirmedText}>كن أول من يؤكد</Text>
              )}
            </View>

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
                <Text style={styles.reportBtnText}>تبليغ ⚠️</Text>
              </TouchableOpacity>

              {/* تصويت مباشر لوضع حاوية بديلة للنقطة السوداء */}
              {selectedPlace.kind === 'wild_dump' ? (
                <TouchableOpacity
                  style={styles.voteFromCardBtn}
                  onPress={() => {
                    setSelectedVoteNeighborhood(selectedPlace.neighborhood);
                    setShowNeedBinModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.voteFromCardBtnText}>طلب حاوية 🗑️</Text>
                </TouchableOpacity>
              ) : null}
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

        {/* نافذة التصويت لطلب حاوية في الحي ("نحتاجو حاوية هنا") */}
        <Modal
          visible={showNeedBinModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNeedBinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowNeedBinModal(false)}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>نحتاجو حاوية هنا 🗑️</Text>
              </View>

              <Text style={styles.needBinDescription}>
                صوتك يوصل للبلدية! نجمعو أصوات المواطنين في كل حي باش نبيّنو للمسؤولين وين كاين نقص حقيقي في الحاويات ونقاط الجمع.
              </Text>

              <Text style={styles.needBinSectionTitle}>اختر الحي المراد التصويت له:</Text>
              <View style={styles.needBinChipsGrid}>
                {ACTIVE_REGION.neighborhoods.map((nh) => {
                  const isSelected = selectedVoteNeighborhood === nh;
                  return (
                    <TouchableOpacity
                      key={nh}
                      style={[
                        styles.needBinChip,
                        isSelected && styles.needBinChipActive,
                      ]}
                      onPress={() => setSelectedVoteNeighborhood(nh as Neighborhood)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.needBinChipText,
                          isSelected && styles.needBinChipTextActive,
                        ]}
                      >
                        {nh}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitVoteBtn,
                  isSubmittingVote && styles.submitVoteBtnDisabled,
                ]}
                onPress={handleSubmitBinVote}
                disabled={isSubmittingVote}
                activeOpacity={0.85}
              >
                {isSubmittingVote ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitVoteBtnText}>تأكيد التصويت الآن ✍️</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* نافذة معاينة صورة المكان بحجم كامل (Full-Screen Image Modal) */}
        <Modal
          visible={selectedImageForPreview !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImageForPreview(null)}
        >
          <View style={styles.previewModalOverlay}>
            <TouchableOpacity
              style={styles.closePreviewBtn}
              onPress={() => setSelectedImageForPreview(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.closePreviewBtnText}>✕ إغلاق</Text>
            </TouchableOpacity>

            {selectedImageForPreview ? (
              <Image
                source={{ uri: selectedImageForPreview }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            ) : null}
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
  confirmRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  confirmBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmBtnActive: {
    backgroundColor: '#E8F5E9',
  },
  confirmBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmBtnTextActive: {
    color: '#2E7D32',
  },
  lastConfirmedText: {
    fontSize: 11,
    color: colors.textSecondary,
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
  needBinFab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 25,
  },
  needBinFabText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  needBinDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 16,
  },
  needBinSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 10,
  },
  needBinChipsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  needBinChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  needBinChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  needBinChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  needBinChipTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  submitVoteBtn: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitVoteBtnDisabled: {
    opacity: 0.6,
  },
  submitVoteBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  placeImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 6,
    position: 'relative',
    backgroundColor: '#EEEEEE',
  },
  placeCardImage: {
    width: '100%',
    height: '100%',
  },
  imageZoomBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageZoomText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noPhotoNotice: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  noPhotoText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  severityBox: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
  },
  severityLarge: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF5350',
  },
  severityMedium: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFA726',
  },
  severitySmall: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFEE58',
  },
  severityTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B71C1C',
    textAlign: 'right',
  },
  severityDescription: {
    fontSize: 11,
    color: '#424242',
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 16,
  },
  voteFromCardBtn: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  voteFromCardBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  closePreviewBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fullPreviewImage: {
    width: '100%',
    height: '80%',
  },
});
