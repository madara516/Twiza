/**
 * خدمة تصدير التقارير الأسبوعية للبلدية (CSV Export Service)
 * 
 * بالدارجة: هذه الخدمة تجمع كل الشكاوى والبلاغات وترتبها:
 * 1. الشكاوى المتأخرة أولاً (Overdue > 14 days) باش البلدية تشوف الأولويات المستعجلة.
 * 2. مجمعة حسب الأحياء.
 * 3. إضافة علامة UTF-8 BOM (\uFEFF) في أول الملف باش يفتح في Excel بالعربية بدون رموز مخربة.
 * 4. مشاركة الملف أو حفظه عبر expo-sharing.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PlaceReport } from '../types';
import { ReportService } from './reportService';

export class CsvExportService {
  /**
   * ترجمة نوع البلاغ للعربية البسيطة
   */
  private static formatReportType(type: string): string {
    switch (type) {
      case 'broken':
        return 'حاوية مكسورة / متضررة';
      case 'full':
        return 'حاوية ممتلئة وفائضة';
      case 'dirty_spot':
        return 'تراكم نفايات (نقطة سوداء)';
      default:
        return type;
    }
  }

  /**
   * ترجمة حالة البلاغ للعربية
   */
  private static formatReportStatus(status: string): string {
    switch (status) {
      case 'sent':
        return 'تم الإرسال (جديد)';
      case 'received':
        return 'تم الاستلام';
      case 'in_repair':
        return 'قيد التدخل والإصلاح';
      case 'fixed':
        return 'تم الحل والإصلاح';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  }

  /**
   * تنسيق التاريخ إلى صيغة واضحة
   */
  private static formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * تنظيف النص وتأمينه داخل حقول الـ CSV لتفادي كسر الأعمدة
   */
  private static escapeCsvCell(text: string | null | undefined): string {
    if (!text) return '""';
    const cleaned = String(text).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${cleaned}"`;
  }

  /**
   * تحويل قائمة البلاغات إلى نص CSV منظم مع ترتيب المتأخر أولاً والتجميع حسب الحي
   */
  static generateReportsCsvContent(reports: PlaceReport[]): string {
    // فرز البلاغات: المتأخر أولاً، ثم حسب الحي، ثم حسب تاريخ الإنشاء الأحدث
    const sortedReports = [...reports].sort((a, b) => {
      const aOverdue = ReportService.isReportOverdue(a) ? 1 : 0;
      const bOverdue = ReportService.isReportOverdue(b) ? 1 : 0;

      if (aOverdue !== bOverdue) {
        return bOverdue - aOverdue; // 1 قبل 0
      }

      // ثانياً حسب الحي أبجدياً
      const neighborhoodCompare = (a.neighborhood || '').localeCompare(b.neighborhood || '', 'ar');
      if (neighborhoodCompare !== 0) {
        return neighborhoodCompare;
      }

      // ثالثاً الأحدث تاريخاً
      return b.createdAt - a.createdAt;
    });

    const headers = [
      'معرف البلاغ',
      'الحي',
      'نوع البلاغ',
      'الحالة الحالية',
      'حالة التأخر (> 14 يوم)',
      'تاريخ الإرسال',
      'آخر تحديث',
      'خط العرض (Latitude)',
      'خط الطول (Longitude)',
      'الوصف',
      'تأكيد المواطن بعد الحل',
      'رابط الصورة',
    ];

    const rows = sortedReports.map((r) => {
      const isOverdue = ReportService.isReportOverdue(r);
      return [
        this.escapeCsvCell(r.id),
        this.escapeCsvCell(r.neighborhood),
        this.escapeCsvCell(this.formatReportType(r.type)),
        this.escapeCsvCell(this.formatReportStatus(r.status)),
        this.escapeCsvCell(isOverdue ? '⚠️ متأخر (بحاجة لتدخل مستعجل)' : 'طبيعي'),
        this.escapeCsvCell(this.formatDate(r.createdAt)),
        this.escapeCsvCell(this.formatDate(r.updatedAt)),
        this.escapeCsvCell(r.location?.latitude?.toString() || ''),
        this.escapeCsvCell(r.location?.longitude?.toString() || ''),
        this.escapeCsvCell(r.description || ''),
        this.escapeCsvCell(
          r.reporterConfirmed === true
            ? 'نعم (مؤكد تم الحل)'
            : r.reporterConfirmed === false
            ? 'لا (المشكل ما زال قائماً)'
            : 'في انتظار المعاينة'
        ),
        this.escapeCsvCell(r.photoURL || 'لا توجد صورة'),
      ].join(',');
    });

    // إضافة UTF-8 BOM (\uFEFF) في البداية حتى يتعرف Excel على الحروف العربية تلقائياً
    const utf8Bom = '\uFEFF';
    return utf8Bom + [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * حفظ الملف محلياً ومشاركته عبر نافذة المشاركة الرسمية للهاتف
   */
  static async exportAndShareWeeklyReports(reports: PlaceReport[]): Promise<string> {
    const csvContent = this.generateReportsCsvContent(reports);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `twizza_weekly_report_${dateStr}.csv`;
    
    // إنشاء كائن الملف في مجلد التخزين المؤقت (Cache Directory)
    const file = new File(Paths.cache, fileName);
    
    // كتابة محتوى الـ CSV
    await file.write(csvContent);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'مشاركة التقرير الأسبوعي لبلاغات النظافة (بلدية الأغواط)',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return file.uri;
  }
}
