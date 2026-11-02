/**
 * خدمة تخزين ورفع الصور (Storage Service)
 * 
 * بالدارجة: هذا السيرفيس مسؤول على التقاط الصور من الكاميرا ولا من الـ Galerie،
 * والتأكد بلي الحجم تاعها أقل من 5 ميغابايت (كما تفرضه Storage Rules)،
 * ومن بعد يرفعها في مجلد المستخدم الخاص places/{uid}/... ويرجع رابط التحميل الرسمي.
 */

import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export class StorageService {
  /**
   * طلب إذن والتقاط صورة عبر الكاميرا
   */
  static async pickFromCamera(): Promise<string | null> {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('يرجى منح صلاحية الكاميرا لالتقاط صورة للمكان.');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // ضغط الصورة لتسريع الرفع وتوفير البيانات
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      // فحص الحجم إذا كان متاحاً (أقل من 5 ميغابايت)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('حجم الصورة كبير جداً (يجب أن يكون أقل من 5 ميغابايت).');
      }

      return asset.uri;
    } catch (error: any) {
      console.error('خطأ أثناء التقاط الصورة:', error);
      throw error;
    }
  }

  /**
   * طلب إذن واختيار صورة من المعرض (Gallery)
   */
  static async pickFromGallery(): Promise<string | null> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('يرجى منح صلاحية الوصول إلى الصور لاختيار صورة للمكان.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('حجم الصورة كبير جداً (يجب أن يكون أقل من 5 ميغابايت).');
      }

      return asset.uri;
    } catch (error: any) {
      console.error('خطأ أثناء اختيار الصورة:', error);
      throw error;
    }
  }

  /**
   * رفع صورة المكان إلى Firebase Storage تحت مسار places/{uid}/{filename}
   */
  static async uploadPlacePhoto(uri: string, uid: string): Promise<string> {
    if (!storage) {
      console.warn('Firebase Storage غير مهيأ، سيتم إرجاع الرابط المحلي.');
      return uri;
    }

    try {
      // قراءة محتوى الصورة كـ Blob متوافق مع React Native
      const response = await fetch(uri);
      const blob = await response.blob();

      // التحقق الصارم من الحجم (< 5MB)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميغابايت).');
      }

      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, `places/${uid}/${fileName}`);

      // حماية بمهلة 8 ثوانٍ لتفادي تعليق التطبيق إذا لم تكن خدمة Storage مفعلة بعد في Console
      const uploadPromise = uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('تجاوزت محاولة رفع الصورة المهلة المحددة (Storage timeout).')), 8000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error: any) {
      console.warn('تعذر رفع الصورة إلى Firebase Storage:', error?.message || error);
      throw error;
    }
  }
}
