/**
 * خدمة شات الحومة في الوقت الفعلي (Real-time Neighborhood Chat Service)
 * 
 * بالدارجة: هادي الخدمة تسير رسائل الجيران في كل حي لحظياً عبر Firestore:
 * - حفظ الرسالة في subcollection: neighborhood_chats/{neighborhood}/messages
 * - الاستماع الفوري للرسائل الجديدة عبر onSnapshot
 * - ترتيب الرسائل حسب التاريخ والحد الأقصى 50 رسالة
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage } from '../types';

export const ChatService = {
  /**
   * إرسال رسالة جديدة لشات الحي
   */
  async sendMessage(params: {
    neighborhood: string;
    senderId: string;
    senderName: string;
    senderRole?: 'citizen' | 'admin';
    text: string;
  }): Promise<string> {
    const text = params.text.trim();
    if (!text) {
      throw new Error('لا يمكن إرسال رسالة فارغة');
    }
    if (!params.neighborhood) {
      throw new Error('يجب تحديد الحي');
    }
    if (!params.senderId) {
      throw new Error('يجب تسجيل الدخول لإرسال رسالة');
    }

    if (!db) {
      console.warn('Firebase db is not initialized, mock sending');
      return 'mock-msg-' + Date.now();
    }

    const messagesCol = collection(db, 'neighborhood_chats', params.neighborhood, 'messages');
    const docRef = await addDoc(messagesCol, {
      neighborhood: params.neighborhood,
      senderId: params.senderId,
      senderName: params.senderName || 'مواطن',
      senderRole: params.senderRole === 'admin' ? 'admin' : 'citizen',
      text,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  },

  /**
   * الاستماع اللحظي للرسائل في حي معين
   */
  subscribeToNeighborhood(
    neighborhood: string,
    onMessages: (messages: ChatMessage[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!neighborhood) {
      onMessages([]);
      return () => {};
    }

    if (!db) {
      // رسائل توضيحية افتراضية في وضع العرض
      onMessages([
        {
          id: 'welcome-1',
          neighborhood,
          senderId: 'system',
          senderName: 'فريق التويزة 🌿',
          senderRole: 'admin',
          text: `مرحباً بك في شات ${neighborhood}! هذا الفضاء مخصص لتبادل أخبار النظافة وتنظيم حملات التطوع بين الجيران.`,
          createdAt: Date.now() - 3600000,
        },
      ]);
      return () => {};
    }

    try {
      const messagesCol = collection(db, 'neighborhood_chats', neighborhood, 'messages');
      const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(50));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messages: ChatMessage[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              neighborhood: data.neighborhood || neighborhood,
              senderId: data.senderId || '',
              senderName: data.senderName || 'مواطن',
              senderRole: data.senderRole === 'admin' ? 'admin' : 'citizen',
              text: data.text || '',
              createdAt:
                data.createdAt?.toMillis
                  ? data.createdAt.toMillis()
                  : typeof data.createdAt === 'number'
                  ? data.createdAt
                  : Date.now(),
            };
          });
          onMessages(messages);
        },
        (error) => {
          console.error(`Error in chat subscription for ${neighborhood}:`, error);
          onError?.(error);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.error('Failed to setup chat subscription:', err);
      onError?.(err);
      return () => {};
    }
  },
};
