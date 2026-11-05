/**
 * بطاقة التحقق الجغرافي الذكي على طريقة Google Maps
 * (Floating Proximity Verification Card)
 * 
 * بالدارجة: تظهر أسفل الشاشة أول ما يقرب المواطن أقل من 15 متر من بلاغ أو حاوية أو مكب،
 * تسأله بشكل مباشر وسهل للتأكيد، مع إمكانية التبليغ المباشر إذا كاين مشكل آخر.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { ProximityPromptItem } from '../services/proximityVerificationService';
import { AppIcon } from './AppIcon';

interface ProximityVerificationPromptProps {
  prompt: ProximityPromptItem;
  onAnswer: (vote: 'still_there' | 'resolved') => void;
  onReportIssue: () => void;
  onDismiss: () => void;
  submitting?: boolean;
}

export const ProximityVerificationPrompt: React.FC<ProximityVerificationPromptProps> = ({
  prompt,
  onAnswer,
  onReportIssue,
  onDismiss,
  submitting = false,
}) => {
  const isBin = prompt.category === 'bin';
  const isWildDump = prompt.category === 'wild_dump';

  const badgeColor = isBin ? colors.primary : isWildDump ? '#DC2626' : '#D97706';
  const badgeBg = isBin ? '#DCFCE7' : isWildDump ? '#FEE2E2' : '#FEF3C7';
  const iconName = isBin ? 'bin' : isWildDump ? 'reports' : 'reports';

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.card}>
        {/* شريط العنوان وزر الإغلاق */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.tagGroup}>
            <View style={[styles.distancePill, { backgroundColor: badgeBg }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <AppIcon name="pin" size={11} color={badgeColor} />
                <Text style={[styles.distanceText, { color: badgeColor }]}>
                  على بعد {prompt.distanceMeters}م
                </Text>
              </View>
            </View>
            <View style={styles.categoryPill}>
              <AppIcon name={iconName as any} size={13} color="#475569" />
              <Text style={styles.categoryText}>
                {isBin ? 'حاوية' : isWildDump ? 'نقطة سوداء' : 'بلاغ نشط'}
              </Text>
            </View>
          </View>
        </View>

        {/* السؤال الرئيسي الموجه للمواطن */}
        <Text style={styles.questionText}>
          {prompt.question}
        </Text>

        {/* أزرار الإجابة السريعة (نعم / لا أو ما زالت / نظيفة) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.secondaryBtn,
              submitting && styles.btnDisabled,
            ]}
            onPress={() => onAnswer('resolved')}
            disabled={submitting}
          >
            <Text style={styles.secondaryBtnText}>
              {prompt.secondaryActionLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.primaryBtn,
              submitting && styles.btnDisabled,
            ]}
            onPress={() => onAnswer('still_there')}
            disabled={submitting}
          >
            <Text style={styles.primaryBtnText}>
              {prompt.primaryActionLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* زر التبليغ السريع في حال وجود مشكلة أخرى في الحاوية أو المكان */}
        <TouchableOpacity
          style={styles.reportIssueLink}
          onPress={onReportIssue}
          disabled={submitting}
        >
          <Text style={styles.reportIssueLinkText}>
            {prompt.reportActionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 85, // يعلو شريط التبويبات السفلي
    left: 14,
    right: 14,
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
      },
    }),
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  distancePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Cairo_700Bold',
  },
  categoryPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Cairo_600SemiBold',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Cairo_700Bold',
    textAlign: 'right',
    marginVertical: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo_700Bold',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo_700Bold',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  reportIssueLink: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  reportIssueLinkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'Cairo_700Bold',
    textAlign: 'center',
  },
});
