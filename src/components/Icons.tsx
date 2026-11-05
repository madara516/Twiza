import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

export const MailIcon: React.FC<IconProps> = ({ size = 20, color = '#1B4D3E' }) => {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="4" width="20" height="16" rx="3" />
  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
</svg>
  `.trim();

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          alt="mail"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      </View>
    );
  }

  return <View style={{ width: size, height: size }} />;
};

export const LockIcon: React.FC<IconProps> = ({ size = 20, color = '#1B4D3E' }) => {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
</svg>
  `.trim();

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          alt="lock"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      </View>
    );
  }

  return <View style={{ width: size, height: size }} />;
};
