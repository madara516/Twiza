/**
 * خدمة تخزين ورفع الصور عبر Cloudinary (100% Free Unsigned Upload API)
 * 
 * بالدارجة: استغنينا تماماً على Firebase Storage لي يتطلب خطة مدفوعة،
 * وبدلناه بخدمة Cloudinary المجانية 100% والسريعة جداً.
 * نرفعو الصورة مباشرة بـ POST FormData ونحفظو رابط data.secure_url في Firestore.
 */

import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'w0xj56ua',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'twizza_uploads',
  apiUrl: 'https://api.cloudinary.com/v1_1/w0xj56ua/image/upload',
};

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
   * رفع الصورة عبر Cloudinary Unsigned Upload API
   * وإرجاع الرابط الآمن (data.secure_url) لحفظه مباشرة في وثيقة Firestore
   */
  static async uploadPlacePhoto(uri: string, uid?: string): Promise<string> {
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, `twizza_${Date.now()}.jpg`);
      } else {
        formData.append('file', {
          uri,
          type: 'image/jpeg',
          name: `twizza_${Date.now()}.jpg`,
        } as any);
      }

      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

      const response = await fetch(CLOUDINARY_CONFIG.apiUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.secure_url) {
        const errMsg = data.error?.message || 'فشل رفع الصورة إلى Cloudinary.';
        console.error('فشل في استجابة Cloudinary:', errMsg);
        throw new Error(errMsg);
      }

      return data.secure_url;
    } catch (error: any) {
      console.error('خطأ أثناء رفع الصورة إلى Cloudinary:', error?.message || error);
      throw error;
    }
  }
}
