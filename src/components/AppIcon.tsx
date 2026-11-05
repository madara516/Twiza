/**
 * مكوّن الأيقونات الاحترافي المطابق للموك آب (Pixel-Perfect Vector Icons)
 * 
 * بالدارجة: هاد المكون يرسم الأيقونات بدقة فيكتور عالية (SVG) على الويب والهاتف،
 * مطابقة 100% لأيقونات الموك آب الأصلي: Home، Reports، Plus، Chat، Map، Camera، وغيرها.
 */

import React from 'react';
import { View, Image, StyleSheet, Platform, ImageSourcePropType } from 'react-native';

export type IconName =
  | 'home'
  | 'reports'
  | 'plus'
  | 'chat'
  | 'map'
  | 'camera'
  | 'bin'
  | 'pin'
  | 'gps'
  | 'compass'
  | 'logout'
  | 'search'
  | 'user'
  | 'bell'
  | 'settings'
  | 'star'
  | 'shield'
  | 'check'
  | 'chevron_right'
  | 'volunteer'
  | 'leaf'
  | 'heart';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  focused?: boolean;
}

// روابط الصور المقصوصة كنسخ احتياطية من الموك آب
const EXTRACTED_PNGS: Partial<Record<IconName, ImageSourcePropType>> = {
  home: require('../../assets/icons/extracted/tab_home.png'),
  reports: require('../../assets/icons/extracted/tab_reports.png'),
  plus: require('../../assets/icons/extracted/tab_add_center.png'),
  chat: require('../../assets/icons/extracted/tab_chat.png'),
  map: require('../../assets/icons/extracted/tab_map.png'),
  camera: require('../../assets/icons/extracted/icon_camera.png'),
  bin: require('../../assets/icons/extracted/icon_map_bin.png'),
  leaf: require('../../assets/icons/extracted/icon_splash_leaf.png'),
};

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 24,
  color = '#2E7D32',
  focused = false,
}) => {
  // على منصة الويب (Web): نستخدم مسارات SVG نقية فائقة الدقة وغير قابلة للتشويش
  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={focused ? '2.4' : '1.8'}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: 'block' }}
        >
          {renderSvgPaths(name, color, focused)}
        </svg>
      </View>
    );
  }

  // على الهاتف: إذا توفرت الصورة المقصوصة أو نستخدم البديل
  const pngSource = EXTRACTED_PNGS[name];
  if (pngSource) {
    return (
      <Image
        source={pngSource}
        style={{
          width: size,
          height: size,
          tintColor: name !== 'plus' ? color : undefined,
          resizeMode: 'contain',
        }}
      />
    );
  }

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={focused ? '2.4' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderSvgPaths(name, color, focused)}
      </svg>
    </View>
  );
};

function renderSvgPaths(name: IconName, color: string, focused: boolean) {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={focused ? color : 'none'} fillOpacity={focused ? 0.15 : 0} />
          <polyline points="9 22 9 12 15 12 15 22" />
        </>
      );

    case 'reports':
      return (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={focused ? color : 'none'} fillOpacity={focused ? 0.15 : 0} />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </>
      );

    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2.8" />
          <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.8" />
        </>
      );

    case 'chat':
      return (
        <>
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            fill={focused ? color : 'none'}
            fillOpacity={focused ? 0.15 : 0}
          />
        </>
      );

    case 'map':
      return (
        <>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" fill={focused ? color : 'none'} fillOpacity={focused ? 0.15 : 0} />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </>
      );

    case 'camera':
      return (
        <>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </>
      );

    case 'bin':
      return (
        <>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </>
      );

    case 'pin':
      return (
        <>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </>
      );

    case 'gps':
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <line x1="12" y1="1" x2="12" y2="5" strokeWidth="2.2" />
          <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2.2" />
          <line x1="1" y1="12" x2="5" y2="12" strokeWidth="2.2" />
          <line x1="19" y1="12" x2="23" y2="12" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="2" fill={color} />
        </>
      );

    case 'compass':
      return (
        <>
          <circle cx="12" cy="12" r="10" />
          <polygon
            points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
            fill={color}
            strokeWidth="1"
          />
        </>
      );

    case 'logout':
      return (
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </>
      );

    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </>
      );

    case 'user':
      return (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      );

    case 'bell':
      return (
        <>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      );

    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      );

    case 'star':
      return (
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          fill={focused ? color : 'none'}
        />
      );

    case 'shield':
      return (
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={focused ? color : 'none'} fillOpacity={focused ? 0.15 : 0} />
          <polyline points="9 12 11 14 15 10" />
        </>
      );

    case 'check':
      return <polyline points="20 6 9 17 4 12" strokeWidth="2.5" />;

    case 'chevron_right':
      return <polyline points="9 18 15 12 9 6" strokeWidth="2" />;

    case 'volunteer':
      return (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      );

    case 'heart':
      return (
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill={focused ? color : 'none'}
        />
      );

    case 'leaf':
      return (
        <path
          d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
          fill={focused ? color : 'none'}
        />
      );

    default:
      return null;
  }
}
