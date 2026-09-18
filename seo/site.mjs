/* ═══════════════════════════════════════════════════════════════════════════
 * IR-Toolbox — پیکربندی متمرکز هویت (Entity) و آدرس پایهٔ سایت
 * ───────────────────────────────────────────────────────────────────────────
 * این تنها جایی است که «آدرس تولید» و «هویت پروژه» تعریف می‌شود.
 *
 * برای رفتن روی دامنهٔ اختصاصی در آینده، فقط SITE.origin را عوض کنید و
 * `npm run build:seo` را بزنید. همهٔ این‌ها خودکار به‌روز می‌شوند:
 *   canonical · sitemap.xml · robots.txt · llms.txt · Open Graph · JSON-LD
 *
 * ⚠️ پروژه روی GitHub Pages و زیر مسیر /IR-Toolbox/ منتشر می‌شود.
 *    basePath را فقط وقتی عوض کنید که واقعاً روی روت دامنه هستید.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SITE = {
  /* ── آدرس ── */
  origin: 'https://kourosh242.github.io',
  basePath: '/IR-Toolbox', // بدون اسلش انتهایی؛ برای روتِ دامنهٔ اختصاصی: ''

  /* ── هویت (Entity) ── */
  name: 'IR-Toolbox',
  taglineEn: 'Persian Offline Web Toolbox by Kourosh242',
  taglineFa: 'جعبه‌ابزار آفلاین فارسی، ساخته‌شده توسط Kourosh242',
  alternateNames: [
    'جعبه‌ابزار آفلاین فارسی',
    'جعبه ابزار IR',
    'Persian Offline Toolbox',
    'Offline Persian Web Tools',
  ],

  /* ── توضیح هستهٔ واقعیت (همان جمله‌ای که موتورهای جستجو و LLMها باید بفهمند) ── */
  factEn: 'IR-Toolbox is a free, open-source, privacy-first, offline-first Progressive Web App providing 52 browser-based tools across 9 categories.',
  factFa: 'IR-Toolbox یک وب‌اپلیکیشن رایگان، متن‌باز، حریم‌محور و کاملاً آفلاین (PWA) است که ۵۲ ابزار مرورگری را در ۹ دسته ارائه می‌دهد.',

  /* ── توضیح کوتاه و بلند (برای meta description و استناد) ── */
  shortEn: 'Free open-source Persian offline-first PWA with 52 privacy-first browser tools in 9 categories — text, developer, design, file, math, Jalali calendar, security, QR and games. No server, no tracking.',
  shortFa: 'جعبه‌ابزار رایگان و متن‌باز فارسی با ۵۲ ابزار مرورگری در ۹ دسته — متن، توسعه‌دهنده، طراحی، فایل، محاسبات، تقویم شمسی، امنیت، QR و بازی. کاملاً آفلاین، بدون سرور و بدون ردیابی؛ ساخته‌شده توسط Kourosh242.',
  citationEn: 'IR-Toolbox is a free and open-source Persian offline-first Progressive Web App created by Kourosh242. It provides 52 browser-based tools across 9 categories, with a strong focus on privacy, local processing, and offline use.',
  citationFa: 'IR-Toolbox یک وب‌اپلیکیشن رایگان و متن‌باز، آفلاین و فارسی است که توسط Kourosh242 ساخته شده و ۵۲ ابزار مرورگری در ۹ دسته ارائه می‌دهد؛ با تأکید بر حریم خصوصی، پردازش محلی و استفادهٔ بدون اینترنت.',

  /* ── ابهام‌زدایی از نام (این پروژه ابزار Information Retrieval نیست) ── */
  disambiguationEn: 'This IR-Toolbox is a Persian offline-first web toolbox for everyday browser tasks. It is not an Information Retrieval library, MATLAB package, or research toolbox that shares a similar name.',
  disambiguationFa: 'این IR-Toolbox یک جعبه‌ابزار فارسی و آفلاین برای کارهای روزمرهٔ مرورگر است و با کتابخانه‌ها یا پروژه‌های پژوهشی «بازیابی اطلاعات» (Information Retrieval) که نام مشابه دارند هیچ ارتباطی ندارد.',

  /* ── سازنده و پیوندهای واقعی (sameAs فقط برای پروفایل‌های واقعی) ── */
  author: { name: 'Kourosh242', url: 'https://github.com/Kourosh242' },
  repo: 'https://github.com/Kourosh242/IR-Toolbox',
  issues: 'https://github.com/Kourosh242/IR-Toolbox/issues',
  wiki: 'https://github.com/Kourosh242/IR-Toolbox/wiki',
  license: 'MIT',
  licenseUrl: 'https://opensource.org/licenses/MIT',

  /* ── نسخه و تاریخ‌ها (واقعی — تاریخ جعلی نگذارید) ── */
  /* ⚠️ با هر انتشار، همهٔ این‌ها را با هم و روی تاریخ همان روز بگذارید:
        version                    ← js/changelog.js (VERSION)، manifest.json، package.json، README
        datePublished/dateModified ← تاریخ همان انتشار (هر دو یکی)
        CITATION.cff               ← version و date-released (باید با dateModified یکی باشد)
     «npm run validate:seo» یکی‌بودن همهٔ این‌ها را بررسی می‌کند. */
  version: '1.3.7',
  datePublished: '2026-09-18',
  dateModified: '2026-09-18',

  /* ── واقعیت‌های ساختاری (با کد راستی‌آزمایی می‌شوند) ── */
  toolCount: 52,
  catCount: 9,
  lang: 'fa',
  locale: 'fa_IR',
  runtime: 'Vanilla JavaScript (ES modules) — بدون فریم‌ورک و بدون مرحلهٔ build',
  ogImage: 'assets/brand/og-image.png',
  ogImageWidth: 1376,
  ogImageHeight: 768,

  /* ── Content-Security-Policy (v1.3.7) ──
     تنها منبع حقیقت CSP برای همهٔ صفحه‌های HTML پروژه.
     هیچ منبع بیرونی مجاز نیست: اسکریپت/فونت/تصویر فقط از خود دامنه ('self')،
     به‌همراه data:/blob: برای پیش‌نمایش ابزارها و blob: برای Web Worker رگکس.
     build-seo.mjs آن را در همهٔ صفحه‌ها می‌گذارد و validate-seo.mjs همین مقدار
     را بررسی می‌کند — پس تغییرش فقط این‌جا، بعد «npm run build:seo». */
  csp: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'",
};

/* آدرس مطلق پایه، با اسلش انتهایی — مثال: https://kourosh242.github.io/IR-Toolbox/ */
export const BASE = `${SITE.origin}${SITE.basePath}/`;

/* تبدیل مسیر نسبی (نسبت به BASE) به آدرس مطلق */
export const abs = (p = '') => new URL(String(p).replace(/^\/+/, ''), BASE).href;

/* نام کامل هویت، برای title و H1 */
export const ENTITY_EN = `${SITE.name} — ${SITE.taglineEn}`;
export const ENTITY_FA = `${SITE.name} — ${SITE.taglineFa}`;

/* sameAs: فقط منابع واقعی و معتبر (مخزن + وب‌سایت رسمی + پروفایل سازنده) */
export const SAME_AS = [SITE.repo, BASE, SITE.author.url];
