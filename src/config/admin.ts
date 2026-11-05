/**
 * قائمة المشرفين المصرح لهم (Admin Allowlist)
 * 
 * المالك الأساسي للنظام محدد عبر البريد الإلكتروني.
 * تُستخدم هذه القائمة لتأكيد صلاحيات الإدارة في AuthContext وعند مزامنة الحسابات.
 */

export const ADMIN_EMAILS: readonly string[] = [
  'abdedz20192020@gmail.com', // Primary Owner Admin Email
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized);
}
