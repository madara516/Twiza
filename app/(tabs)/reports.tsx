/**
 * شاشة تقاريري (My Reports Tab)
 * 
 * بالدارجة: هذه شاشة متابعة البلاغات والشكاوى التي أرسلها المواطن،
 * تتطلب تسجيل الدخول وتستعد للمرحلة 4 (Phase 4).
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>تسجيل الدخول مطلوب</Text>
          <Text style={styles.desc}>
            لمتابعة حالة بلاغاتك وشكاويك لمعرفة متى تم إصلاحها، يرجى تسجيل الدخول.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryBtnText}>تسجيل الدخول الآن</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.title}>متابعة تقاريري (Phase 4)</Text>
        <Text style={styles.desc}>
          أنت مسجل كمواطن. هنا ستظهر قائمة تقاريرك وحالاتها (أُرسل ← استُلم ←
          قيد الإصلاح ← تم الإصلاح) ورسالة الـ 14 يوماً الصريحة.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  icon: {
    fontSize: 56,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: theme.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: theme.spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
