/**
 * مكوّن الخريطة التفاعلية الحرة (Free OpenStreetMap / Leaflet Component)
 * 
 * بالدارجة: هذه الخريطة مجانية 100% مبنية على بلاطات CartoDB Voyager / OpenStreetMap
 * عبر Leaflet ومحمية بـ User-Agent مخصص باش ما يتبلوكاش السيرفر في الـ WebView.
 * وفيها تحديث سلس بلا فلاشينغ (injectJavaScript)، وحدود جغرافية مقفولة على الأغواط (minZoom & maxBounds).
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LAGHOUAT_CENTER } from '../constants/laghouat';
import { colors } from '../theme/colors';
import { Place } from '../types';

export interface FreeMapRef {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  updateMarkers: (places: Place[]) => void;
}

interface FreeMapProps {
  places?: Place[];
  onSelectPlace?: (place: Place) => void;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  center?: { latitude: number; longitude: number };
  zoom?: number;
}

export const FreeMap = React.forwardRef<FreeMapRef, FreeMapProps>(
  (
    {
      places = [],
      onSelectPlace,
      onMapClick,
      center = LAGHOUAT_CENTER,
      zoom = 14,
    },
    ref
  ) => {
    const webViewRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // حدود الأغواط لمنع الخروج لمساحات فارغة
    const LAGHOUAT_BOUNDS = {
      southWest: [33.65, 2.70],
      northEast: [33.95, 3.05],
    };

    // القالب الثابت لـ HTML لا يعاد تحميله لتجنب الوميض الأبيض (No Flashing)
    const initialHtml = useMemo(() => {
      return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>خريطة الأغواط - التويزة</title>
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
      L.latLng(${LAGHOUAT_BOUNDS.southWest[0]}, ${LAGHOUAT_BOUNDS.southWest[1]}),
      L.latLng(${LAGHOUAT_BOUNDS.northEast[0]}, ${LAGHOUAT_BOUNDS.northEast[1]})
    );

    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      minZoom: 11,
      maxZoom: 19,
      maxBounds: bounds,
      maxBoundsViscosity: 0.8
    }).setView([${center.latitude}, ${center.longitude}], ${zoom});

    // استخدام بلاطات CartoDB Voyager السريعة والودية مع تطبيقات الموبايل وبدون حظر
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
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
    }, []);

    // تحديث العلامات بسلاسة فور تغير الفلتر دون إعادة تحميل الصفحة (Zero-Flicker)
    useEffect(() => {
      const markersPayload = JSON.stringify(places);
      const script = `
        if (window.updateMarkers) {
          window.updateMarkers(${markersPayload});
        }
        true;
      `;

      if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
        (iframeRef.current.contentWindow as any).updateMarkers?.(places);
      } else if (webViewRef.current) {
        webViewRef.current.injectJavaScript(script);
      }
    }, [places]);

    // دعم استدعاء دالة الطيران لموقع المستخدم عبر ref
    React.useImperativeHandle(ref, () => ({
      flyTo: (latitude: number, longitude: number, zoomLevel = 16) => {
        const script = `
          if (window.flyToLocation) {
            window.flyToLocation(${latitude}, ${longitude}, ${zoomLevel});
          }
          true;
        `;
        if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
          (iframeRef.current.contentWindow as any).flyToLocation?.(latitude, longitude, zoomLevel);
        } else if (webViewRef.current) {
          webViewRef.current.injectJavaScript(script);
        }
      },
      updateMarkers: (newPlaces: Place[]) => {
        const script = `
          if (window.updateMarkers) {
            window.updateMarkers(${JSON.stringify(newPlaces)});
          }
          true;
        `;
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(script);
        }
      },
    }));

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'SELECT_PLACE' && onSelectPlace) {
          onSelectPlace(data.payload);
        } else if (data.type === 'MAP_CLICK' && onMapClick) {
          onMapClick(data.payload);
        }
      } catch (e) {
        console.error('خطأ في استقبال رسالة الخريطة:', e);
      }
    };

    // دعم الويب (Expo Web) باستخدام iframe دون خطأ عدم دعم WebView
    if (Platform.OS === 'web') {
      return (
        <View style={styles.mapContainer}>
          <iframe
            ref={iframeRef}
            srcDoc={initialHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Al-Twiza Map"
          />
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: initialHtml }}
          style={styles.webView}
          userAgent="AlTwizaApp/1.0 (https://altwiza.dz)"
          onMessage={handleMessage}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
