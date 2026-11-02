/**
 * Al-Twiza Comprehensive Logic & Integration Test Runner
 */

const { calculateDistance, formatDistance, sortPlacesByDistance } = require('../dist-test/utils/haversine');
const { ACTIVE_REGION, isLocationInRegion, getApproximateNeighborhood, OUT_OF_SERVICE_MESSAGE } = require('../dist-test/constants/regions');

// Firestore undefined sanitizer
function sanitizeForFirestore(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// 14-day overdue calculator logic
function isReportOverdue(report) {
  const isPending = report.status === 'sent' || report.status === 'received';
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const age = Date.now() - report.createdAt;
  return isPending && age > fourteenDaysMs;
}

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'w0xj56ua',
  uploadPreset: 'twizza_uploads',
  apiUrl: 'https://api.cloudinary.com/v1_1/w0xj56ua/image/upload',
};

function run() {
  console.log('========================================================');
  console.log('🚀 بدء الفحص الشامل لجميع طبقات تطبيق "التويزة"');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [نجح] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [فشل] ${testName}`);
      failed++;
    }
  }

  // 1. حساب المسافات Haversine والترتيب
  console.log('--- 1. اختبارات Haversine الرياضية وحساب المسافات ---');
  const userLoc = { latitude: 33.8000, longitude: 2.8650 };
  const pointNearby = { latitude: 33.8010, longitude: 2.8650 }; // ~111 meters
  const pointFar = { latitude: 33.8500, longitude: 2.8650 }; // ~5.5 km

  const distNear = calculateDistance(userLoc, pointNearby);
  const distFar = calculateDistance(userLoc, pointFar);

  assert(distNear > 90 && distNear < 130, `حساب المسافة القريبة بدقة (~111m): النتيجة = ${distNear}م`);
  assert(formatDistance(distNear).includes('م'), `تنسيق المسافة بالأمتار: ${formatDistance(distNear)}`);
  assert(formatDistance(distFar).includes('كم'), `تنسيق المسافة بالكيلومترات: ${formatDistance(distFar)}`);

  const mockPlaces = [
    {
      id: 'p-far',
      kind: 'bin',
      location: pointFar,
      neighborhood: 'وسط المدينة (البلاد)',
      photoURL: null,
      owner: 'municipality',
      verified: true,
      addedBy: 'admin',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'p-near',
      kind: 'bin',
      location: pointNearby,
      neighborhood: 'وسط المدينة (البلاد)',
      photoURL: null,
      owner: 'municipality',
      verified: true,
      addedBy: 'admin',
      createdAt: 1,
      updatedAt: 1,
    },
  ];

  const sorted = sortPlacesByDistance(userLoc, mockPlaces);
  assert(sorted[0].id === 'p-near', 'ترتيب الأماكن تلقائياً من الأقرب إلى الأبعد');
  assert(sorted[0].distance < sorted[1].distance, `المكان الأقرب (${sorted[0].distance}م) يسبق الأبعد (${sorted[1].distance}م)`);

  // 2. النطاق الجغرافي والمنطقة التجريبية
  console.log('\n--- 2. اختبارات النطاق الجغرافي والحدود الخدمية ---');
  assert(ACTIVE_REGION.id === 'laghouat', `المنطقة النشطة الحالية: ${ACTIVE_REGION.nameAr} (${ACTIVE_REGION.id})`);
  assert(isLocationInRegion(33.80, 2.865), 'إحداثيات مركز الأغواط ضمن نطاق الخدمة التجريبي (Pass)');
  assert(!isLocationInRegion(36.75, 3.05), 'إحداثيات الجزائر العاصمة خارج نطاق خدمة الأغواط (Blocked)');
  assert(!isLocationInRegion(0, 0), 'نقطة خط الاستواء خارج النطاق تماماً');
  assert(OUT_OF_SERVICE_MESSAGE.includes('الأغواط'), `رسالة التنبيه للمستخدم خارج المنطقة واضحة ومهذبة: "${OUT_OF_SERVICE_MESSAGE}"`);

  // 3. تحديد أقرب حي تلقائياً دون إدخال يدوي
  console.log('\n--- 3. اختبار التحديد التلقائي لأقرب حي حسب إحداثيات الخريطة ---');
  const nh1 = getApproximateNeighborhood(33.8015, 2.8640);
  assert(nh1 === 'وسط المدينة (البلاد)', `تحديد "وسط المدينة (البلاد)" تلقائياً بنجاح: ${nh1}`);
  const nh2 = getApproximateNeighborhood(33.8050, 2.8685);
  assert(nh2 === 'الواحات', `تحديد "الواحات" تلقائياً بنجاح: ${nh2}`);
  const nh3 = getApproximateNeighborhood(33.8080, 2.8710);
  assert(nh3 === 'المقام', `تحديد "المقام" تلقائياً بنجاح: ${nh3}`);

  // 4. اختبار تعقيم بيانات Firestore وتفادي الـ undefined القاتل
  console.log('\n--- 4. اختبار تعقيم وتطهير كائنات Firestore (sanitizeForFirestore) ---');
  const rawData = {
    kind: 'bin',
    location: userLoc,
    notes: 'حاوية جديدة',
    severity: undefined, // الحقل المسبب للخطأ
    photoURL: undefined,
  };
  const sanitized = sanitizeForFirestore(rawData);
  assert(!('severity' in sanitized), 'تم استبعاد severity: undefined بنجاح لتجنب FirebaseError');
  assert(!('photoURL' in sanitized), 'تم استبعاد photoURL: undefined بنجاح');
  assert(sanitized.kind === 'bin' && sanitized.notes === 'حاوية جديدة', 'الحفاظ على بقية الحقول المكتملة دون تشويه');

  // 5. احتساب مهلة الـ 14 يوماً الصريحة للتقارير
  console.log('\n--- 5. اختبار مهلة الـ 14 يوماً الصريحة لبلاغات المواطنين ---');
  const now = Date.now();
  const freshReport = {
    id: 'r-fresh',
    status: 'sent',
    createdAt: now - (3 * 24 * 60 * 60 * 1000), // 3 days ago
  };
  const overdueReport = {
    id: 'r-overdue',
    status: 'sent',
    createdAt: now - (15 * 24 * 60 * 60 * 1000), // 15 days ago (> 14 days)
  };
  const resolvedOldReport = {
    id: 'r-resolved',
    status: 'fixed',
    createdAt: now - (25 * 24 * 60 * 60 * 1000), // 25 days ago but fixed
  };

  assert(!isReportOverdue(freshReport), 'تقرير جديد (3 أيام) ليس متأخراً (Overdue = false)');
  assert(isReportOverdue(overdueReport), 'تقرير تجاوز 14 يوماً يظهر تنبيه الصراحة للبلدية (Overdue = true)');
  assert(!isReportOverdue(resolvedOldReport), 'تقرير تم إصلاحه (fixed) لا يظهر كتأخر حتى لو مر شهر');

  // 6. تكوين سحابة Cloudinary المجانية 100%
  console.log('\n--- 6. اختبار تكوين وبيانات Cloudinary Unsigned API ---');
  assert(CLOUDINARY_CONFIG.cloudName === 'w0xj56ua', `اسم الحساب السحابي مطابق: ${CLOUDINARY_CONFIG.cloudName}`);
  assert(CLOUDINARY_CONFIG.uploadPreset === 'twizza_uploads', `اسم الـ Preset للرفع غير الموقع مطابق: ${CLOUDINARY_CONFIG.uploadPreset}`);
  assert(CLOUDINARY_CONFIG.apiUrl === 'https://api.cloudinary.com/v1_1/w0xj56ua/image/upload', `رابط API الرفع مطابق للمواصفات: ${CLOUDINARY_CONFIG.apiUrl}`);

  // 7. اختبارات ميزة "نحتاجو حاوية هنا" وحساب الطلب حسب الحي
  console.log('\n--- 7. اختبارات "نحتاجو حاوية هنا" وتجميع الأصوات (Phase 5) ---');
  const getVoteDocId = (neighborhood, uid) => `${neighborhood}_${uid}`;
  const vote1Id = getVoteDocId('الواحات', 'citizen-123');
  assert(vote1Id === 'الواحات_citizen-123', `تنسيق معرّف وثيقة التصويت مطابق للضوابط: ${vote1Id}`);

  // محاكاة تجميع الأصوات
  const mockVotes = [
    { neighborhood: 'وسط المدينة (البلاد)', uid: 'user-1' },
    { neighborhood: 'الواحات', uid: 'user-2' },
    { neighborhood: 'وسط المدينة (البلاد)', uid: 'user-3' },
    { neighborhood: 'المقام', uid: 'user-4' },
    { neighborhood: 'وسط المدينة (البلاد)', uid: 'user-5' },
  ];
  const demandAggregation = mockVotes.reduce((acc, v) => {
    acc[v.neighborhood] = (acc[v.neighborhood] || 0) + 1;
    return acc;
  }, {});

  assert(demandAggregation['وسط المدينة (البلاد)'] === 3, 'تجميع أصوات وسط المدينة: 3 أصوات');
  assert(demandAggregation['الواحات'] === 1, 'تجميع أصوات الواحات: صوت واحد');
  assert(demandAggregation['المقام'] === 1, 'تجميع أصوات المقام: صوت واحد');

  // 8. اختبارات دورة معالجة البلاغات من قبل المشرف وتوثيق الملاحظات
  console.log('\n--- 8. اختبارات انتقالات حالات البلاغات وسجل التاريخ (Admin Actions) ---');
  const initialHistory = [{ status: 'sent', by: 'user-1', at: now - 5000 }];
  const receivedHistory = [
    ...initialHistory,
    { status: 'received', by: 'admin-1', at: now - 3000, note: 'تم استلام التقرير وتوجيهه لفريق النظافة' },
  ];
  const inRepairHistory = [
    ...receivedHistory,
    { status: 'in_repair', by: 'admin-1', at: now - 1000, note: 'شاحنة البلدية في الطريق إلى الموقع' },
  ];
  const fixedHistory = [
    ...inRepairHistory,
    { status: 'fixed', by: 'admin-1', at: now, note: 'تم تنظيف النقطة ووضع حاوية جديدة بنجاح' },
  ];

  assert(fixedHistory.length === 4, 'اكتمال تسلسل المراحل الأربعة في سجل التاريخ');
  assert(fixedHistory[3].status === 'fixed', 'الحالة النهائية للبلاغ المعالج هي fixed');
  assert(fixedHistory[3].note.includes('حاوية جديدة'), 'الملاحظة الإدارية مسجلة بنجاح داخل سجل التاريخ');

  // 9. اختبارات حماية لوحة تحكم المشرف (Admin Authorization Guard)
  console.log('\n--- 9. اختبارات حماية لوحة التحكم وصلاحيات المشرف ---');
  const isAdminRole = (role) => role === 'admin';
  assert(isAdminRole('admin') === true, 'المشرف يملك الصلاحية الكاملة للوحة التحكم (Access Granted)');
  assert(isAdminRole('citizen') === false, 'المواطن العادي محجوب عن لوحة المشرف (Access Denied)');
  assert(isAdminRole(null) === false, 'الزائر غير المسجل محجوب تماماً (Access Denied)');

  console.log('\n========================================================');
  console.log(`📊 النتيجة النهائية: ${passed} فحص ناجح ✅ | ${failed} فاشل ❌`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
