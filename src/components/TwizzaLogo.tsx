import React from 'react';
import { Image, View, Text, ViewStyle, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';

interface TwizzaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'vertical' | 'horizontal' | 'icon-only';
  showTagline?: boolean;
  style?: ViewStyle;
}

export const TwizzaLogo: React.FC<TwizzaLogoProps> = ({
  size = 'lg',
  variant = 'vertical',
  style,
}) => {
  const dimensions = {
    sm: { shieldW: 34, shieldH: 34, fontSize: 18, marginTop: 4 },
    md: { shieldW: 60, shieldH: 60, fontSize: 26, marginTop: 6 },
    lg: { shieldW: 85, shieldH: 85, fontSize: 36, marginTop: 6 },
    xl: { shieldW: 110, shieldH: 110, fontSize: 46, marginTop: 8 },
  }[size];

  if (variant === 'icon-only') {
    return (
      <View style={[styles.cropContainer, { width: dimensions.shieldW, height: dimensions.shieldH }, style]}>
        <Image
          source={require('../../assets/images/shield_clean.png')}
          style={{
            width: dimensions.shieldW,
            height: dimensions.shieldH,
            resizeMode: 'contain',
            ...(Platform.OS === 'web' ? ({ mixBlendMode: 'multiply' } as any) : {}),
          }}
        />
      </View>
    );
  }

  if (variant === 'horizontal') {
    return (
      <View style={[styles.horizontalContainer, style]}>
        <View style={[styles.cropContainer, { width: dimensions.shieldW, height: dimensions.shieldH }]}>
          <Image
            source={require('../../assets/images/shield.png')}
            style={{
              width: dimensions.shieldW,
              height: dimensions.shieldH,
              resizeMode: 'contain',
              ...(Platform.OS === 'web' ? ({ mixBlendMode: 'multiply' } as any) : {}),
            }}
          />
        </View>
        <Text style={[styles.title, { fontSize: dimensions.fontSize }]}>
          التويزة
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.verticalContainer, style]}>
      <View style={[styles.cropContainer, { width: dimensions.shieldW, height: dimensions.shieldH }]}>
        <Image
          source={require('../../assets/images/shield_clean.png')}
          style={{
            width: dimensions.shieldW,
            height: dimensions.shieldH,
            resizeMode: 'contain',
            ...(Platform.OS === 'web' ? ({ mixBlendMode: 'multiply' } as any) : {}),
          }}
        />
      </View>
      <Text style={[styles.title, { fontSize: dimensions.fontSize, marginTop: dimensions.marginTop }]}>
        التويزة
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cropContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  verticalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Cairo-Bold',
    fontWeight: '900',
    color: '#1B4D3E',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
});
