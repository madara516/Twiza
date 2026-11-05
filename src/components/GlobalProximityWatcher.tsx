/**
 * المراقب الجغرافي الشامل للتطبيق (Global Proximity Watcher)
 * 
 * بالدارجة: هاد المكوّن يخدم في الخلفية داخل التطبيق،
 * يطلب إذن الإشعارات، ويراقب موقع الـ GPS للمواطن،
 * وأول ما يقرب أقل من 15 متر من بلاغ أو حاوية أو مكب، يطلق إشعار المتصفح
 * ويظهر كارت التحقق الذكي (Google Maps Style) أسفل الشاشة.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { Place, PlaceReport } from '../types';
import { PlaceService } from '../services/placeService';
import { ReportService } from '../services/reportService';
import {
  ProximityVerificationService,
  ProximityPromptItem,
} from '../services/proximityVerificationService';
import { ProximityVerificationPrompt } from './ProximityVerificationPrompt';

export const GlobalProximityWatcher: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [activePrompt, setActivePrompt] = useState<ProximityPromptItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const placesRef = useRef<Place[]>([]);
  const reportsRef = useRef<PlaceReport[]>([]);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // 1. طلب إذن إشعارات المتصفح وتحميل بيانات الأماكن والبلاغات
  useEffect(() => {
    // طلب إذن الإشعارات تلقائياً في المتصفح
    ProximityVerificationService.requestNotificationPermission();

    const loadSurroundings = async () => {
      try {
        const [places, reports] = await Promise.all([
          PlaceService.getVerifiedPlaces().catch(() => []),
          ReportService.getRecentReports(50).catch(() => []),
        ]);
        placesRef.current = places;
        reportsRef.current = reports;
      } catch (err) {
        console.warn('تعذر تحميل بيانات الأماكن للمراقب الجغرافي:', err);
      }
    };

    loadSurroundings();
    const interval = setInterval(loadSurroundings, 60000); // تحديث دوري كل دقيقة

    return () => clearInterval(interval);
  }, []);

  // 2. مراقبة موقع GPS وفحص المسافة (<= 15m)
  useEffect(() => {
    let isMounted = true;

    const startLocationWatch = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locationSubRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 3, // تحديث كل 3 أمتار حركة
            timeInterval: 5000,   // أو كل 5 ثوانٍ
          },
          (loc) => {
            if (!isMounted || activePrompt) return;

            const userCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };

            const eligibleItem = ProximityVerificationService.findNearestEligibleItem(
              userCoords,
              placesRef.current,
              reportsRef.current,
              15 // مسافة 15 متراً كحد أقصى
            );

            if (eligibleItem) {
              setActivePrompt(eligibleItem);
              ProximityVerificationService.dispatchBrowserNotification(eligibleItem);
            }
          }
        );
      } catch (err) {
        console.warn('تعذر تفعيل مراقب الموقع:', err);
      }
    };

    startLocationWatch();

    return () => {
      isMounted = false;
      if (locationSubRef.current) {
        locationSubRef.current.remove();
      }
    };
  }, [activePrompt]);

  // معالجة تصويت المواطن
  const handleAnswer = async (vote: 'still_there' | 'resolved') => {
    if (!activePrompt) return;
    setSubmitting(true);

    try {
      const res = await ProximityVerificationService.submitVerificationVote({
        itemId: activePrompt.id,
        category: activePrompt.category,
        vote,
        userId: user?.uid || 'anonymous-citizen',
        userName: user?.displayName || 'مواطن حواطي',
      });

      if (res.reachedThreshold) {
        Alert.alert(
          'عمل جماعي رائع! 🌟',
          'بفضل تأكيدك وتأكيدات الجيران، تم حل المشكلة واعتماد نظافة المكان رسمياً!'
        );
      } else {
        Alert.alert(
          'شكراً لمساهمتك! 🙌',
          vote === 'resolved'
            ? 'تم تسجيل تأكيدك بنجاح، وستغلق المشكلة فور اكتمال بقية التأكيدات.'
            : 'تم تسجيل ملاحظتك لمتابعة الحالة من طرف فريق النظافة.'
        );
      }
    } catch (err: any) {
      console.warn('فشل تسجيل التأكيد:', err);
    } finally {
      setSubmitting(false);
      setActivePrompt(null);
    }
  };

  // التبليغ السريع عن مشكلة في الحاوية أو المكان
  const handleReportIssue = () => {
    if (!activePrompt) return;
    ProximityVerificationService.markItemCooldown(activePrompt.id);
    setActivePrompt(null);
    router.push({
      pathname: '/(tabs)/add',
      params: {
        presetLat: activePrompt.location.latitude.toString(),
        presetLng: activePrompt.location.longitude.toString(),
        presetTitle: activePrompt.title,
      },
    });
  };

  // تجاهل التنبيه وإغلاق الكارت
  const handleDismiss = () => {
    if (activePrompt) {
      ProximityVerificationService.markItemCooldown(activePrompt.id);
    }
    setActivePrompt(null);
  };

  if (!activePrompt) {
    return null;
  }

  return (
    <ProximityVerificationPrompt
      prompt={activePrompt}
      onAnswer={handleAnswer}
      onReportIssue={handleReportIssue}
      onDismiss={handleDismiss}
      submitting={submitting}
    />
  );
};
