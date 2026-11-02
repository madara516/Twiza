/**
 * مكوّن الخريطة التفاعلية الحرة (Free OpenStreetMap / Leaflet Component)
 * 
 * بالدارجة: هذه الخريطة مجانية 100% مبنية على بلاطات OpenStreetMap الرسمية
 * عبر Leaflet ومحمية بـ User-Agent مخصص باش ما يتبلوكاش السيرفر في الـ WebView.
 * تدعم استقبال مركز الانطلاق (initialCenter) وحدود الخدمة (serviceBounds) كـ Props
 * لتناسب أي منطقة دون التقيد باسم أو إحداثيات محددة داخل الكود.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { ACTIVE_REGION, RegionBounds } from '../constants/regions';
import { colors } from '../theme/colors';
import { Place } from '../types';

export interface FreeMapRef {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  updateMarkers: (places: Place[]) => void;
}

export interface FreeMapProps {
  places?: Place[];
  onSelectPlace?: (place: Place) => void;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  initialCenter?: { latitude: number; longitude: number };
  center?: { latitude: number; longitude: number }; // للتوافق العكسي
  serviceBounds?: RegionBounds;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export const FreeMap = React.forwardRef<FreeMapRef, FreeMapProps>(
  (
    {
      places = [],
      onSelectPlace,
      onMapClick,
      initialCenter,
      center,
      serviceBounds,
      zoom = 14,
      minZoom = 11,
      maxZoom = 19,
    },
    ref
  ) => {
    const webViewRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const activeCenter = initialCenter || center || ACTIVE_REGION.center;
    const activeBounds = serviceBounds || ACTIVE_REGION.bounds;

    // حساب حدود التحريك (Panning Bounds) مع هامش أمان طفيف
    const swLat = activeBounds.minLat - 0.05;
    const swLng = activeBounds.minLng - 0.05;
    const neLat = activeBounds.maxLat + 0.05;
    const neLng = activeBounds.maxLng + 0.05;

    // القالب الثابت لـ HTML لا يعاد تحميله لتجنب الوميض الأبيض (No Flashing)
    const initialHtml = useMemo(() => {
      return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>خريطة التويزة - Al-Twiza Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
    }
    .custom-pin {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      color: #fff;
      font-weight: bold;
      transition: transform 0.15s ease-in-out;
      cursor: pointer;
    }
    .custom-pin:active {
      transform: scale(1.2);
    }
    .pin-bin { background-color: ${colors.kind.bin}; }
    .pin-collection_point { background-color: ${colors.kind.collection_point}; }
    .pin-wild_dump { background-color: ${colors.kind.wild_dump}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var bounds = L.latLngBounds(
      L.latLng(${swLat}, ${swLng}),
      L.latLng(${neLat}, ${neLng})
    );

    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      minZoom: ${minZoom},
      maxZoom: ${maxZoom},
      maxBounds: bounds,
      maxBoundsViscosity: 0.8
    }).setView([${activeCenter.latitude}, ${activeCenter.longitude}], ${zoom});

    // استخدام بلاطات OpenStreetMap الرسمية المجانية تماماً وبدون أي مفتاح API
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: ${maxZoom},
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var markersGroup = L.layerGroup().addTo(map);

    function createIcon(kind) {
      var className = 'custom-pin pin-' + kind;
      var emoji = '🗑️';
      if (kind === 'collection_point') emoji = '📦';
      if (kind === 'wild_dump') emoji = '⚠️';

      return L.divIcon({
        className: '',
        html: '<div class="' + className + '">' + emoji + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    }

    function sendToNative(data) {
      var payload = JSON.stringify(data);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(payload, '*');
      }
    }

    window.updateMarkers = function(placesList) {
      markersGroup.clearLayers();
      if (!placesList || !placesList.length) return;

      placesList.forEach(function(place) {
        if (!place.location || !place.location.latitude || !place.location.longitude) return;

        var marker = L.marker([place.location.latitude, place.location.longitude], {
          icon: createIcon(place.kind)
        });

        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          sendToNative({
            type: 'SELECT_PLACE',
            payload: place
          });
        });

        markersGroup.addLayer(marker);
      });
    };

    window.flyToLocation = function(lat, lng, zoomLevel) {
      map.flyTo([lat, lng], zoomLevel || 16, {
        animate: true,
        duration: 1.2
      });
    };

    map.on('click', function(e) {
      sendToNative({
        type: 'MAP_CLICK',
        payload: { latitude: e.latlng.lat, longitude: e.latlng.lng }
      });
    });

    // تحميل العلامات الابتدائية
    window.updateMarkers(${JSON.stringify(places)});
  </script>
</body>
</html>
      `;
    }, [activeCenter.latitude, activeCenter.longitude, swLat, swLng, neLat, neLng, minZoom, maxZoom, zoom]);

    // معالجة الرسائل الواردة من WebView (نقر على الماركر أو الخريطة)
    const handleMessage = (event: any) => {
      try {
        const rawData =
          typeof event.data === 'string'
            ? event.data
            : event.nativeEvent?.data;
        if (!rawData) return;

        const data = JSON.parse(rawData);
        if (data.type === 'SELECT_PLACE' && onSelectPlace) {
          onSelectPlace(data.payload);
        } else if (data.type === 'MAP_CLICK' && onMapClick) {
          onMapClick(data.payload);
        }
      } catch (e) {
        console.warn('خطأ في معالجة رسالة الخريطة:', e);
      }
    };

    // الاستجابة لرسائل window على الويب (Expo Web iframe bridge)
    useEffect(() => {
      if (Platform.OS !== 'web') return;

      const handleWebMessage = (e: MessageEvent) => {
        handleMessage(e);
      };

      window.addEventListener('message', handleWebMessage);
      return () => {
        window.removeEventListener('message', handleWebMessage);
      };
    }, [onSelectPlace, onMapClick]);

    // تعريض الدوال للأب (Parent) للتحكم الخفيف وبدون وميض
    React.useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number, zoomLevel = 16) => {
        const js = `window.flyToLocation && window.flyToLocation(${lat}, ${lng}, ${zoomLevel}); true;`;
        if (Platform.OS === 'web') {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ type: 'FLY_TO', lat, lng, zoomLevel }),
            '*'
          );
          // تنفيذ مباشر إذا كان الـ iframe في نفس النطاق
          try {
            (iframeRef.current?.contentWindow as any)?.flyToLocation?.(lat, lng, zoomLevel);
          } catch {}
        } else {
          webViewRef.current?.injectJavaScript(js);
        }
      },
      updateMarkers: (newPlaces: Place[]) => {
        const placesJson = JSON.stringify(newPlaces);
        const js = `window.updateMarkers && window.updateMarkers(${placesJson}); true;`;
        if (Platform.OS === 'web') {
          try {
            (iframeRef.current?.contentWindow as any)?.updateMarkers?.(newPlaces);
          } catch {}
        } else {
          webViewRef.current?.injectJavaScript(js);
        }
      },
    }));

    // تحديث الماركرز بسلاسة عند تغيير مصفوفة الأماكن بدون إعادة تحميل الصفحة
    useEffect(() => {
      if (places) {
        const placesJson = JSON.stringify(places);
        const js = `window.updateMarkers && window.updateMarkers(${placesJson}); true;`;
        if (Platform.OS === 'web') {
          try {
            (iframeRef.current?.contentWindow as any)?.updateMarkers?.(places);
          } catch {}
        } else {
          webViewRef.current?.injectJavaScript(js);
        }
      }
    }, [places]);

    // عرض بديل للـ Web لتسهيل المعاينة على المتصفح
    if (Platform.OS === 'web') {
      return (
        <View style={styles.container}>
          <iframe
            ref={iframeRef}
            srcDoc={initialHtml}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            } as any}
            title="Al-Twiza Map"
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: initialHtml }}
          onMessage={handleMessage}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          // User-Agent مخصص لتفادي حظر بلاطات OpenStreetMap على الهواتف
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 AlTwizaApp/1.0"
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f4f6f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
