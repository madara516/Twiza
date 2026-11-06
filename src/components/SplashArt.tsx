/**
 * رسومات شاشة البداية بدقة فيكتور عالية (Ultra-Sharp SVG Splash Art)
 * 
 * المكونات:
 * 1. TwizaEmblemSvg: شعار التويزة (الدرع والورقة) بدقة فيكتور نقية 100% بدون أي تشويش
 * 2. LaghouatSkylineSvg: رسم تراثي أنيق لمعالم مدينة الأغواط (المئذنة، النخيل الواحاتي، القبة المعمارية)
 */

import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

interface EmblemProps {
  size?: number;
  isDark?: boolean;
}

/**
 * 1. شعار التويزة الفيكتوري الصافي (The Twiza Logo Emblem)
 */
export const TwizaEmblemSvg: React.FC<EmblemProps> = ({ size = 110, isDark = false }) => {
  const darkGreen = isDark ? '#4ADE80' : '#1B4D3E';
  const midGreen = isDark ? '#22C55E' : '#2A7A48';
  const lightGreen = isDark ? '#86EFAC' : '#3E965C';

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size * (191 / 196), justifyContent: 'center', alignItems: 'center' }}>
        <svg
          width={size}
          height={size * (191 / 196)}
          viewBox="0 0 196 191"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          {/* الجناح العلوي الأيسر لحرف T */}
          <path
            d="M5 18H86V36H24V82C24 108 42 135 98 178L98 186C35 140 5 110 5 82V18Z"
            fill={darkGreen}
          />

          {/* الجناح العلوي الأيمن لحرف T */}
          <path
            d="M191 18H110V36H172V82C172 110 142 140 98 186L98 178C154 135 172 108 172 82V36H110V18H191Z"
            fill={midGreen}
          />

          {/* الإطار الداخلي البيضاوي / حلقة الدبوس */}
          <path
            d="M98 34C66 34 46 58 46 88C46 122 75 148 98 170C121 148 150 122 150 88C150 58 130 34 98 34ZM98 52C118 52 132 70 132 88C132 112 112 134 98 150C84 134 64 112 64 88C64 70 78 52 98 52Z"
            fill={lightGreen}
          />

          {/* الورقة المركزية الصاعدة (The Central Leaf) */}
          <path
            d="M98 54C80 72 80 102 98 126C116 102 116 72 98 54Z"
            fill={midGreen}
          />
          {/* ساق وعرق الورقة الوسطي */}
          <line
            x1="98"
            y1="64"
            x2="98"
            y2="136"
            stroke={darkGreen}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M98 84L90 92M98 98L106 106M98 108L91 115"
            stroke={darkGreen}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </View>
    );
  }

  // على الهاتف (Native fallback)
  return (
    <View style={{ width: size, height: size * (191 / 196) }} />
  );
};

interface SkylineProps {
  color?: string;
  isDark?: boolean;
}

/**
 * 2. رسم الخطوط الأثرية لمدينة الأغواط بدقة فيكتور نقية (Ultra-Crisp Laghouat Skyline SVG)
 * يضم: المئذنة الصحراوية الشهيرة، واحات النخيل، القباب، والأسوار القديمة
 */
export const LaghouatSkylineSvg: React.FC<SkylineProps> = ({
  color,
  isDark = false,
}) => {
  const strokeColor = color || (isDark ? '#4ADE80' : '#2D6A4F');

  if (Platform.OS === 'web') {
    return (
      <View style={styles.skylineBox}>
        <svg
          viewBox="0 0 520 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax meet"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* 1. التلال الصحراوية الخلفية البعيدة (Distant Dunes) */}
          <path
            d="M0 155 Q80 135 180 152 T360 148 Q440 132 520 150"
            stroke={strokeColor}
            strokeWidth="1"
            strokeOpacity="0.35"
            strokeDasharray="4 2"
          />

          {/* 2. الأسوار والمباني الطينية العتيقة (Kasbah Ramparts & Buildings) */}
          {/* مجمع المباني الأيسر */}
          <path
            d="M40 170 V155 H65 V148 H80 V152 H110 V142 H135 V155 H165 V145 H195 V158 H220 V170"
            stroke={strokeColor}
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeOpacity="0.75"
          />
          {/* فتحات النوافذ والأبواب المقوسة */}
          <path
            d="M50 162 V168 M72 156 V162 M95 150 V156 M120 148 V155 M148 160 A4 4 0 0 1 156 160 V170 M178 152 V158 M205 162 V168"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />

          {/* 3. القبة التراثية المعمارية (Heritage Dome / Qubba) */}
          <path
            d="M172 145 C172 130 196 130 196 145"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeOpacity="0.85"
          />
          <line
            x1="184"
            y1="130"
            x2="184"
            y2="124"
            stroke={strokeColor}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <circle cx="184" cy="123" r="1.5" fill={strokeColor} fillOpacity="0.8" />

          {/* 4. صومعة مئذنة الأغواط الكبرى الشامخة (The Great Laghouat Minaret) */}
          {/* قاعدة الصومعة الرئيسية */}
          <path
            d="M236 170 V68 H268 V170"
            stroke={strokeColor}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* خطوط تقسيم الصومعة الرأسية والأفقية وزخارف النوافذ */}
          <line x1="236" y1="140" x2="268" y2="140" stroke={strokeColor} strokeWidth="1.2" strokeOpacity="0.6" />
          <line x1="236" y1="108" x2="268" y2="108" stroke={strokeColor} strokeWidth="1.2" strokeOpacity="0.6" />
          {/* نوافذ مقوسة داخل جسم المئذنة */}
          <path
            d="M248 132 V124 A4 4 0 0 1 256 124 V132 Z"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />
          <path
            d="M248 100 V92 A4 4 0 0 1 256 92 V100 Z"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />

          {/* شرفة المؤذن (The Upper Balcony) */}
          <rect
            x="232"
            y="62"
            width="40"
            height="6"
            stroke={strokeColor}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <line x1="236" y1="62" x2="236" y2="68" stroke={strokeColor} strokeWidth="1" />
          <line x1="244" y1="62" x2="244" y2="68" stroke={strokeColor} strokeWidth="1" />
          <line x1="252" y1="62" x2="252" y2="68" stroke={strokeColor} strokeWidth="1" />
          <line x1="260" y1="62" x2="260" y2="68" stroke={strokeColor} strokeWidth="1" />
          <line x1="268" y1="62" x2="268" y2="68" stroke={strokeColor} strokeWidth="1" />

          {/* جوسق المئذنة العلوي (The Upper Lantern Tower) */}
          <rect
            x="240"
            y="42"
            width="24"
            height="20"
            stroke={strokeColor}
            strokeWidth="1.4"
          />
          <path
            d="M248 54 V48 A4 4 0 0 1 256 48 V54 Z"
            stroke={strokeColor}
            strokeWidth="1"
          />

          {/* قبة الصومعة والهلال (Cupola & Crescent Spire) */}
          <path
            d="M240 42 C240 30 264 30 264 42"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <line
            x1="252"
            y1="30"
            x2="252"
            y2="18"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* هلال الصومعة */}
          <path
            d="M255 18 A3.5 3.5 0 1 1 252 14.5 A2.8 2.8 0 1 0 255 18 Z"
            fill={strokeColor}
          />

          {/* مباني المجمع الأيمن المتصل بالمئذنة */}
          <path
            d="M268 170 V152 H295 V144 H320 V156 H355 V150 H380 V170"
            stroke={strokeColor}
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeOpacity="0.75"
          />
          <path
            d="M280 160 A4 4 0 0 1 288 160 V170 M305 152 V158 M332 162 V168 M365 158 V164"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />

          {/* عمود إنارة تقليدي (Vintage Lantern Post) */}
          <path
            d="M106 170 V138 M102 138 H110 M104 135 H108 V138 M106 135 V130 Q106 126 112 126"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />

          {/* 5. نخلة الواحات الباسقة على اليسار (Majestic Oasis Palm - Left) */}
          {/* الجذع الرشيق المائل */}
          <path
            d="M32 170 Q28 135 36 100"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* سعف النخيل المنحني بأناقة طبيعية */}
          {/* سعفة 1 لليسار */}
          <path d="M36 100 Q15 88 0 102" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M25 93 L20 100 M18 92 L14 98 M12 91 L7 96 M6 94 L3 99" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          {/* سعفة 2 للأعلى واليسار */}
          <path d="M36 100 Q20 72 12 65" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M30 83 L22 84 M25 76 L18 78 M18 70 L13 74" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          {/* سعفة 3 المركزية للأعلى */}
          <path d="M36 100 Q36 65 38 52" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M36 82 L30 80 M37 82 L43 80 M36 70 L29 68 M37 70 L44 68 M37 60 L32 58 M38 60 L44 58" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          {/* سعفة 4 للأعلى واليمين */}
          <path d="M36 100 Q52 74 62 68" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M44 85 L51 84 M48 78 L56 79 M55 72 L61 75" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          {/* سعفة 5 لليمين والأسفل */}
          <path d="M36 100 Q62 90 75 106" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M48 93 L54 100 M55 94 L62 100 M64 96 L70 102 M70 101 L74 105" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />

          {/* 6. نخلة الواحات الباسقة على اليمين (Majestic Oasis Palm - Right) */}
          {/* الجذع الرشيق المائل لليمين */}
          <path
            d="M440 170 Q446 132 438 96"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* سعف النخيل الأيمن */}
          <path d="M438 96 Q415 82 398 94" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M426 88 L420 95 M418 87 L412 93 M408 88 L402 94" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M438 96 Q424 68 416 60" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M430 78 L422 80 M424 71 L418 75" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M438 96 Q440 62 442 48" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M439 78 L433 76 M440 78 L446 76 M439 66 L432 64 M440 66 L447 64 M440 56 L434 54 M441 56 L448 54" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M438 96 Q458 70 470 65" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M448 80 L455 80 M456 74 L463 76" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
          <path d="M438 96 Q465 86 482 100" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M452 90 L458 96 M462 92 L468 97 M470 94 L476 99" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />

          {/* نخلة ثانوية أصغر على أقصى اليمين */}
          <path
            d="M485 170 Q488 145 484 122"
            stroke={strokeColor}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          <path d="M484 122 Q468 112 458 120" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
          <path d="M484 122 Q476 100 470 92" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
          <path d="M484 122 Q486 98 488 88" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
          <path d="M484 122 Q498 102 508 98" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
          <path d="M484 122 Q505 116 518 126" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />

          {/* شجيرات خضراء كروية ناعمة عند قاعدة الجدران */}
          <path
            d="M360 170 Q370 162 380 170 M380 170 Q392 160 405 170 M405 170 Q415 163 425 170"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />

          {/* 7. خط الأرضية السفلي الصريح (The Horizon Ground Baseline) */}
          <line
            x1="0"
            y1="170"
            x2="520"
            y2="170"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </View>
    );
  }

  return <View style={styles.skylineBox} />;
};

const styles = StyleSheet.create({
  skylineBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
