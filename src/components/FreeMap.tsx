/**
 * مكوّن الخريطة التفاعلية الحرة (Free OpenStreetMap / Leaflet Component)
 * 
 * بالدارجة: هذه الخريطة مجانية 100% مبنية على بلاطات OpenStreetMap الرسمية
 * عبر Leaflet ومصممة بعلامات بصرية مطابقة لنموذج التصميم المرجعي:
 * - سلات بلون أخضر حيوي (#22C55E) واسم "سلة"
 * - نقاط تجميع بلون أخضر غابي (#1B4D3E) واسم "نقطة تجميع"
 * - نقاط سوداء بلون أحمر (#DC2626) واسم "نقطة سوداء"
 * - هالة نبضية تفاعلية لموقع المستخدم في مركز المدينة
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { ACTIVE_REGION, RegionBounds } from '../constants/regions';
import { colors } from '../theme/colors';
import { Place, GeoLocation } from '../types';

export interface FreeMapRef {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  updateMarkers: (places: Place[]) => void;
  setUserLocation: (location: GeoLocation | null) => void;
}

export interface FreeMapProps {
  places?: Place[];
  userLocation?: GeoLocation | null;
  onSelectPlace?: (place: Place) => void;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  initialCenter?: { latitude: number; longitude: number };
  center?: { latitude: number; longitude: number };
  serviceBounds?: RegionBounds;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export const FreeMap = React.forwardRef<FreeMapRef, FreeMapProps>(
  (
    {
      places = [],
      userLocation = null,
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

    const swLat = activeBounds.minLat - 0.05;
    const swLng = activeBounds.minLng - 0.05;
    const neLat = activeBounds.maxLat + 0.05;
    const neLng = activeBounds.maxLng + 0.05;

    const initialHtml = useMemo(() => {
      return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>خريطة التويزة - Al-Twiza Map</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background-color: #F6F5EE;
      font-family: 'Cairo', sans-serif;
    }
    .leaflet-control-zoom {
      display: none !important;
    }

    /* علامات الخريطة المطابقة للتصميم */
    .tw-pin-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transform: translate(-50%, -50%);
      transition: transform 0.15s ease-out;
    }
    .tw-pin-wrapper:hover, .tw-pin-wrapper:active {
      transform: translate(-50%, -50%) scale(1.18);
      z-index: 1000 !important;
    }
    .tw-pin-circle {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2.5px solid #ffffff;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tw-pin-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ffffff;
    }
    .tw-pin-bin .tw-pin-circle {
      background-color: #22C55E;
    }
    .tw-pin-collection_point .tw-pin-circle {
      background-color: #1B4D3E;
    }
    .tw-pin-wild_dump .tw-pin-circle {
      background-color: #DC2626;
    }
    .tw-pin-wild_dump .tw-pin-dot {
      background-color: #17221E;
    }
    .tw-pin-label {
      margin-top: 3px;
      background-color: #ffffff;
      padding: 1px 7px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      color: #17221E;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      line-height: 1.4;
      pointer-events: none;
    }

    /* مؤشر موقع المستخدم بالهالة النبضية */
    .user-location-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      transform: translate(-50%, -50%);
    }
    .user-halo {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: rgba(27, 77, 62, 0.18);
      border: 1.5px solid rgba(27, 77, 62, 0.35);
      animation: pulse 2.2s infinite ease-out;
    }
    .user-core {
      position: relative;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: #1B4D3E;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      z-index: 2;
    }
    @keyframes pulse {
      0% {
        transform: scale(0.6);
        opacity: 0.9;
      }
      70% {
        transform: scale(1.4);
        opacity: 0.15;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
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
      zoomControl: false,
      attributionControl: false,
      minZoom: ${minZoom},
      maxZoom: ${maxZoom},
      maxBounds: bounds,
      maxBoundsViscosity: 0.8
    }).setView([${activeCenter.latitude}, ${activeCenter.longitude}], ${zoom});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: ${maxZoom},
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var markersGroup = L.layerGroup().addTo(map);
    var userMarker = null;

    function getKindLabel(kind) {
      if (kind === 'bin') return 'سلة';
      if (kind === 'collection_point') return 'نقطة تجميع';
      if (kind === 'wild_dump') return 'نقطة سوداء';
      return '';
    }

    function createIcon(kind) {
      var label = getKindLabel(kind);
      var html = '<div class="tw-pin-wrapper tw-pin-' + kind + '">' +
                 '  <div class="tw-pin-circle">' +
                 '    <div class="tw-pin-dot"></div>' +
                 '  </div>' +
                 '  <div class="tw-pin-label">' + label + '</div>' +
                 '</div>';

      return L.divIcon({
        className: '',
        html: html,
        iconSize: [60, 48],
        iconAnchor: [30, 16],
        popupAnchor: [0, -20]
      });
    }

    function createUserIcon() {
      var html = '<div class="user-location-marker">' +
                 '  <div class="user-halo"></div>' +
                 '  <div class="user-core"></div>' +
                 '</div>';

      return L.divIcon({
        className: '',
        html: html,
        iconSize: [50, 50],
        iconAnchor: [25, 25]
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

    window.setUserLocation = function(loc) {
      if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }
      if (loc && loc.latitude && loc.longitude) {
        userMarker = L.marker([loc.latitude, loc.longitude], {
          icon: createUserIcon(),
          zIndexOffset: 1000
        }).addTo(map);
      }
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

    // تحميل العلامات والموقع الابتدائية
    window.updateMarkers(${JSON.stringify(places)});
    ${userLocation ? `window.setUserLocation(${JSON.stringify(userLocation)});` : ''}
  </script>
</body>
</html>
      `;
    }, [activeCenter.latitude, activeCenter.longitude, swLat, swLng, neLat, neLng, minZoom, maxZoom, zoom]);

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

    React.useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number, zoomLevel = 16) => {
        const js = `window.flyToLocation && window.flyToLocation(${lat}, ${lng}, ${zoomLevel}); true;`;
        if (Platform.OS === 'web') {
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
      setUserLocation: (loc: GeoLocation | null) => {
        const locJson = JSON.stringify(loc);
        const js = `window.setUserLocation && window.setUserLocation(${locJson}); true;`;
        if (Platform.OS === 'web') {
          try {
            (iframeRef.current?.contentWindow as any)?.setUserLocation?.(loc);
          } catch {}
        } else {
          webViewRef.current?.injectJavaScript(js);
        }
      },
    }));

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.updateMarkers(places);
      }
    }, [places]);

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.setUserLocation(userLocation);
      }
    }, [userLocation]);

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
              backgroundColor: '#F6F5EE',
            }}
            title="خريطة التويزة الأغواط"
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
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 TwizzaLaghouat/1.0"
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
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F6F5EE',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F6F5EE',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F5EE',
    zIndex: 99,
  },
});
