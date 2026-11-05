/**
 * شاشة شات الحومة (Exclusive GPS-Only Neighborhood Chat)
 * 
 * بالدارجة: هادي الشاشة تعرض حصرياً وفقط شات الحي الحالي للمستخدم حسب الـ GPS:
 * 1. بدون أي قوائم للأحياء الأخرى نهائياً (إخفاء وحذف كل القوائم المنسدلة والأشرطة).
 * 2. ربط تلقائي فوري بالغرفة الجغرافية الحالية مع شريط الحالة:
 *    "📍 أنت الآن متصل بشات حومتك الحالية: {اسم الحي}".
 * 3. زر تثبيت بسيط (Pin / Unpin 📌) لتجميد الحي الحالي ومنع الانتقال التلقائي،
 *    أو فك التثبيت للمتابعة التلقائية المباشرة بالـ GPS عند التنقل.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { ACTIVE_REGION, getApproximateNeighborhood } from '../../src/constants/regions';
import { ChatService } from '../../src/services/chatService';
import { ChatMessage } from '../../src/types';
import { AppIcon } from '../../src/components/AppIcon';

const STORAGE_PINNED_KEY = '@twizza_chat_is_pinned';
const STORAGE_PINNED_ROOM_KEY = '@twizza_chat_pinned_neighborhood';

export default function ChatScreen() {
  const router = useRouter();
  const { user, profile, role } = useAuth();

  // حالة التثبيت (Pin / Unpin)
  const [isPinned, setIsPinned] = useState<boolean>(false);

  // الحي النشط الحالي للشات (الحي الوحيد المعروض على الشاشة)
  const [currentNeighborhood, setCurrentNeighborhood] = useState<string>(
    ACTIVE_REGION.neighborhoods[0] || 'وسط المدينة (البلاد)'
  );

  // حالة كشف الموقع
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // قائمة الرسائل
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);

  // نص الرسالة قيد الكتابة
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // 1. تهيئة الشات عند فتح الشاشة
  useEffect(() => {
    initChat();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const initChat = async () => {
    try {
      const savedPinned = await AsyncStorage.getItem(STORAGE_PINNED_KEY);
      const savedRoom = await AsyncStorage.getItem(STORAGE_PINNED_ROOM_KEY);

      if (savedPinned === 'true' && savedRoom) {
        // إذا كان مثبتاً مسبقاً، التزم بالغرفة المثبتة
        setIsPinned(true);
        setCurrentNeighborhood(savedRoom);
      } else {
        // الوضع الافتراضي: رصد الـ GPS الفوري وربطه مباشرة بالشات
        setIsPinned(false);
        await autoDetectAndConnectGPS();
      }

      // تفعيل مراقبة الموقع الحية للتحديث عند التنقل
      setupLiveLocationWatcher();
    } catch {
      await autoDetectAndConnectGPS();
    }
  };

  /**
   * الرصد التلقائي للـ GPS والاتصال بشات الحي الأقرب افتراضياً
   */
  const autoDetectAndConnectGPS = async () => {
    try {
      setIsDetectingLocation(true);
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsDetectingLocation(false);
        setLocationError('يرجى السماح بصلاحية الموقع لتحديد حومتك');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const approx = getApproximateNeighborhood(loc.coords.latitude, loc.coords.longitude);
      setCurrentNeighborhood(approx);
    } catch (err: any) {
      console.warn('GPS detection failed:', err);
      setLocationError('تعذر تحديد الموقع الجغرافي');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  /**
   * مراقبة التغير في موقع المستخدم بالـ GPS أثناء التحرك بين الأحياء
   */
  const setupLiveLocationWatcher = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 100, // فحص كل 100 متر تحرك
          timeInterval: 30000,   // أو كل 30 ثانية
        },
        (loc) => {
          // إذا كان الشات مثبتاً أو المستخدم يكتب حالياً في رسالة، لا نقوم بقطع محادثته
          if (isPinned || inputText.trim().length > 0) return;

          const newNeighborhood = getApproximateNeighborhood(
            loc.coords.latitude,
            loc.coords.longitude
          );

          if (newNeighborhood && newNeighborhood !== currentNeighborhood) {
            setCurrentNeighborhood(newNeighborhood);
          }
        }
      );
    } catch (err) {
      console.warn('Live location watch failed:', err);
    }
  };

  // 2. الاستماع اللحظي لرسائل الحي المختار عبر Firestore
  useEffect(() => {
    setLoadingMessages(true);
    const unsubscribe = ChatService.subscribeToNeighborhood(
      currentNeighborhood,
      (newMessages) => {
        setMessages(newMessages);
        setLoadingMessages(false);
      },
      () => {
        setLoadingMessages(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentNeighborhood]);

  /**
   * تبديل حالة التثبيت (Pin / Unpin Toggle)
   */
  const handleTogglePin = async () => {
    if (isPinned) {
      // فك التثبيت: العودة للربط التلقائي بالـ GPS فوراً
      setIsPinned(false);
      await AsyncStorage.setItem(STORAGE_PINNED_KEY, 'false');
      await autoDetectAndConnectGPS();
    } else {
      // تثبيت الشات على الحي الحالي
      setIsPinned(true);
      await AsyncStorage.setItem(STORAGE_PINNED_KEY, 'true');
      await AsyncStorage.setItem(STORAGE_PINNED_ROOM_KEY, currentNeighborhood);
    }
  };

  /**
   * إرسال رسالة جديدة
   */
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend) return;

    if (!user) {
      Alert.alert(
        'تسجيل الدخول مطلوب',
        'يجب تسجيل الدخول بحساب مواطن أو مشرف للمشاركة في شات الحومة.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تسجيل الدخول', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    try {
      setIsSending(true);
      setInputText('');

      const senderDisplayName =
        profile?.displayName || user.displayName || user.email?.split('@')[0] || 'مواطن';

      await ChatService.sendMessage({
        neighborhood: currentNeighborhood,
        senderId: user.uid,
        senderName: senderDisplayName,
        senderRole: role === 'admin' ? 'admin' : 'citizen',
        text: textToSend,
      });
    } catch (err: any) {
      console.error('Failed to send message:', err);
      Alert.alert('خطأ في الإرسال', err.message || 'تعذر إرسال الرسالة.');
    } finally {
      setIsSending(false);
    }
  };

  // تنسيق توقيت الرسالة
  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} د`;

    return date.toLocaleTimeString('ar-DZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. ترويسة الشات النظيفة والمبسطة */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {/* زر التثبيت البسيط (Pin / Unpin) */}
          <TouchableOpacity
            style={[styles.pinToggleBtn, isPinned ? styles.pinToggleBtnPinned : styles.pinToggleBtnAuto]}
            onPress={handleTogglePin}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <AppIcon
                name={isPinned ? 'pin' : 'gps'}
                size={12}
                color={isPinned ? '#B45309' : '#15803D'}
              />
              <Text style={[styles.pinToggleBtnText, isPinned ? styles.pinToggleTextPinned : styles.pinToggleTextAuto]}>
                {isPinned ? 'مثبت' : 'تلقائي (GPS)'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* عنوان الشاشة الصريح */}
          <View style={styles.headerTitleContainer}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <AppIcon name="chat" size={18} color="#FFFFFF" />
              <Text style={styles.headerTitle}>شات الحومة</Text>
            </View>
          </View>
        </View>

        {/* 2. شريط الحالة البارز المحدد للموقع التلقائي */}
        <View style={[styles.statusBar, isPinned ? styles.statusBarPinned : styles.statusBarAuto]}>
          {isPinned ? (
            <View style={styles.statusBarPinnedRow}>
              <TouchableOpacity
                style={styles.unpinInlineBtn}
                onPress={handleTogglePin}
                activeOpacity={0.8}
              >
                <Text style={styles.unpinInlineBtnText}>فك التثبيت</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <AppIcon name="pin" size={13} color="#B45309" />
                <Text style={styles.statusBarPinnedText}>
                  الشات مثبت على: {currentNeighborhood}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusBarAutoRow}>
              {isDetectingLocation ? (
                <ActivityIndicator size="small" color="#15803D" style={{ marginLeft: 6 }} />
              ) : null}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <AppIcon name="pin" size={13} color="#15803D" />
                <Text style={styles.statusBarAutoText}>
                  أنت الآن متصل بشات حومتك الحالية: {currentNeighborhood}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* تنبيه في حالة تعذر قراءة الـ GPS مع زر إعادة المحاولة */}
        {locationError && !isPinned ? (
          <View style={styles.errorBanner}>
            <TouchableOpacity
              style={styles.retryGpsBtn}
              onPress={autoDetectAndConnectGPS}
              activeOpacity={0.8}
            >
              <Text style={styles.retryGpsText}>تحديث الموقع</Text>
            </TouchableOpacity>
            <Text style={styles.errorBannerText}>{locationError}</Text>
          </View>
        ) : null}
      </View>

      {/* 3. منطقة المحادثة مع لوحة المفاتيح التفاعلية */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل رسائل الجيران في {currentNeighborhood}...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AppIcon name="chat" size={44} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>لا توجد رسائل بعد في {currentNeighborhood}</Text>
            <Text style={styles.emptyDesc}>
              كن أول من يبدأ المحادثة وينسق حملة تويزة ونظافة مع جيران هذا الحي!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => {
              const isMine = user && item.senderId === user.uid;
              const isAdmin = item.senderRole === 'admin';

              return (
                <View
                  style={[
                    styles.messageRow,
                    isMine ? styles.messageRowMine : styles.messageRowOther,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
                      isAdmin && !isMine && styles.messageBubbleAdmin,
                    ]}
                  >
                    {/* معلومات المرسل */}
                    <View style={styles.senderHeader}>
                      <Text
                        style={[
                          styles.senderName,
                          isMine ? styles.senderNameMine : styles.senderNameOther,
                        ]}
                      >
                        {isMine ? 'أنت' : item.senderName}
                      </Text>
                      {isAdmin && (
                        <View style={styles.adminBadge}>
                          <AppIcon name="shield" size={11} color="#B45309" />
                          <Text style={styles.adminBadgeText}>مشرف بلدية</Text>
                        </View>
                      )}
                    </View>

                    {/* نص الرسالة */}
                    <Text
                      style={[
                        styles.messageText,
                        isMine ? styles.messageTextMine : styles.messageTextOther,
                      ]}
                    >
                      {item.text}
                    </Text>

                    {/* توقيت الرسالة */}
                    <Text
                      style={[
                        styles.messageTime,
                        isMine ? styles.messageTimeMine : styles.messageTimeOther,
                      ]}
                    >
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* 4. شريط إدخال الرسالة */}
        {user ? (
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || isSending) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.sendBtnText}>إرسال</Text>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={`اكتب رسالة لجيران ${currentNeighborhood}...`}
              placeholderTextColor="#9E9E9E"
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
        ) : (
          <View style={styles.guestPromptContainer}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AppIcon name="shield" size={16} color="#64748B" />
              <Text style={styles.guestPromptText}>
                سجّل الدخول بحساب مواطن للمشاركة في شات الحي
              </Text>
            </View>
            <TouchableOpacity
              style={styles.guestLoginBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.guestLoginBtnText}>تسجيل الدخول</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FBF9',
  },
  header: {
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitleContainer: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.fontFamily,
  },
  pinToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  pinToggleBtnPinned: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  pinToggleBtnAuto: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  pinToggleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  pinToggleTextPinned: {
    color: '#B45309',
  },
  pinToggleTextAuto: {
    color: '#FFFFFF',
  },
  statusBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  statusBarAuto: {
    backgroundColor: '#E8F5E9',
    borderTopColor: '#C8E6C9',
  },
  statusBarPinned: {
    backgroundColor: '#FEF9C3',
    borderTopColor: '#FDE047',
  },
  statusBarAutoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBarAutoText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
    fontFamily: theme.fontFamily,
    textAlign: 'center',
  },
  statusBarPinnedRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBarPinnedText: {
    fontSize: 12,
    color: '#854D0E',
    fontWeight: '700',
    fontFamily: theme.fontFamily,
  },
  unpinInlineBtn: {
    backgroundColor: '#FDE047',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  unpinInlineBtnText: {
    fontSize: 11,
    color: '#713F12',
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  errorBannerText: {
    fontSize: 11,
    color: '#991B1B',
    fontFamily: theme.fontFamily,
  },
  retryGpsBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  retryGpsText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F9FBF9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: theme.fontFamily,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: theme.fontFamily,
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  messageBubbleMine: {
    backgroundColor: '#E8F5E9',
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  messageBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageBubbleAdmin: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
  },
  senderHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  senderNameMine: {
    color: '#1B4D3E',
  },
  senderNameOther: {
    color: '#374151',
  },
  adminBadge: {
    backgroundColor: '#1B4D3E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fontFamily,
    textAlign: 'right',
  },
  messageTextMine: {
    color: '#1B4D3E',
  },
  messageTextOther: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'left',
  },
  messageTimeMine: {
    color: '#4B7764',
  },
  messageTimeOther: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    fontFamily: theme.fontFamily,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
  guestPromptContainer: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestPromptText: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: theme.fontFamily,
    flex: 1,
    textAlign: 'right',
  },
  guestLoginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  guestLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fontFamily,
  },
});
