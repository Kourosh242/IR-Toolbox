#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 * IR-Toolbox — ژنراتور صفحات استاتیک SEO/GEO
 * ───────────────────────────────────────────────────────────────────────────
 * اجرا:  npm run build:seo          راستی‌آزمایی:  npm run validate:seo
 *
 * خروجی:
 *   about/index.html            صفحهٔ هویت (Entity Profile)
 *   tools/index.html            هاب همهٔ ۵۲ ابزار
 *   tools/<دسته>/index.html     ۹ صفحهٔ دسته
 *   tools/<اسلاگ>/index.html    ۵۲ صفحهٔ ابزار
 *   404.html                    صفحهٔ خطای GitHub Pages
 *   sitemap.xml · robots.txt · llms.txt
 *   پچ بلوک‌های SEO:HEAD و SEO:JSONLD در index.html
 *
 * اصول:
 *   • منبع حقیقت متادیتای ابزارها خودِ tools/*.js است (استخراج + راستی‌آزمایی)
 *   • همهٔ آدرس‌های مطلق از seo/site.mjs می‌آیند — هیچ آدرس سخت‌کدشده‌ای اینجا نیست
 *   • لینک‌های داخلی root-relative از basePath مشتق می‌شوند
 *   • فقط واقعیت: متن راهنما از js/helps.js، آمار از شمارش واقعی کد
 * ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, BASE, abs, ENTITY_EN, ENTITY_FA } from '../seo/site.mjs';
import { CATS_SEO, TOOLS_SEO } from '../seo/tools-meta.mjs';
import { HELPS } from '../js/helps.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BP = SITE.basePath.replace(/\/+$/, '');                 // '' یا '/IR-Toolbox'
const p = (x = '') => `${BP}/${String(x).replace(/^\/+/, '')}`;  // مسیر root-relative
/* مسیر عمومی (که خودش basePath دارد) → مطلق. هرگز abs() را روی p() اعمال نکنید! */
const up = (x) => `${SITE.origin}${String(x).startsWith('/') ? x : `/${x}`}`;
const fa = (n) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const TF = fa(SITE.toolCount), CF = fa(SITE.catCount);

const A_ID = `${abs()}#author`;
const A_WEB = `${abs()}#website`;
const A_APP = `${abs()}#application`;

/* متن حریم خصوصی: پیش‌فرض + استثناهای واقعی (مبتنی بر کد، نه ادعا) */
const PRIVACY_DEFAULT = 'این ابزار کاملاً داخل مرورگر اجرا می‌شود. ورودی شما به هیچ سروری ارسال نمی‌شود و هیچ درخواست شبکه‌ای برای پردازش آن انجام نمی‌گیرد.';
const PRIVACY_OVERRIDE = {
  passman: 'ورودی‌ها با AES-256-GCM رمزنگاری می‌شوند و کلید با PBKDF2 (۲۵۰٬۰۰۰ تکرار) از رمز اصلی مشتق می‌شود. رمز اصلی هرگز ذخیره نمی‌شود و پس از هر بستن یا رفرش صفحه، گنجینه قفل است. داده‌ها فقط در localStorage همین مرورگر می‌مانند و هیچ‌جا ارسال نمی‌شوند. رمزنگاری نیازمند محیط امن (HTTPS یا localhost) است.',
  vault: 'فایل و متن شما با AES-256-GCM رمزنگاری می‌شود و فایل .ir256 برای دانلود ساخته می‌شود؛ کلید با PBKDF2 (۲۵۰٬۰۰۰ تکرار) از رمز عبور شما مشتق می‌شود و هرگز ذخیره نمی‌گردد. هیچ فایلی آپلود نمی‌شود و پردازش کاملاً محلی است. رمزنگاری نیازمند محیط امن (HTTPS یا localhost) است.',
  'hash-checker': 'متن و فایل فقط داخل مرورگر هَش می‌شوند و جایی فرستاده نمی‌شوند. بخش «هش ← متن» از یک دیتابیس محلی برای حدس مقادیر بسیار رایج استفاده می‌کند؛ این یک جست‌وجوی محلی است، نه شکستن هش.',
  'qr-reader': 'تصویر آپلودشده و فریم‌های دوربین فقط داخل مرورگر با jsQR پردازش می‌شوند و هرگز آپلود نمی‌شوند. دسترسی به دوربین تنها در محیط امن (HTTPS یا localhost) ممکن است. تاریخچهٔ اسکن فقط روی همین دستگاه و در localStorage ذخیره می‌شود و هر زمان قابل پاک‌کردن است.',
  pomodoro: 'رکوردهای روزانهٔ پومودورو فقط در localStorage همین مرورگر (با پیشوند ir:) ذخیره می‌شوند و هیچ‌جا ارسال نمی‌شوند.',
  brain: 'رکوردهای بازی فقط در localStorage همین مرورگر ذخیره می‌شوند؛ نه حساب کاربری وجود دارد و نه امتیازی به جایی فرستاده می‌شود.',
};
const privacyOf = (id) => PRIVACY_OVERRIDE[id] || PRIVACY_DEFAULT;

const CAT_APP_CATEGORY = {
  text: 'UtilityApplication', dev: 'DeveloperApplication', design: 'DesignApplication',
  files: 'UtilityApplication', math: 'EducationalApplication', time: 'UtilityApplication',
  security: 'UtilityApplication', fun: 'LifestyleApplication', brain: 'GameApplication',
};

/* ═══════════ ۱) استخراج متادیتای واقعی ابزارها از کد منبع ═══════════ */
const SRC_FILES = [
  ...['text', 'dev', 'design', 'files', 'math', 'time', 'security', 'fun', 'fun-data', 'brain',
    'qr', 'qr-reader', 'cron', 'pomodoro', 'lorem', 'passman'].map((f) => `tools/${f}.js`),
  'vault/vault.js',
];
const TOOLS = [];
for (const f of SRC_FILES) {
  const src = readFileSync(join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/register\(\{([\s\S]*?)\n\s*\}\)/g)) {
    const b = m[1];
    const g = (k) => { const r = new RegExp(`${k}:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`).exec(b); return r ? r[2] : null; };
    const id = g('id');
    if (!id) throw new Error(`id پیدا نشد در ${f}`);
    TOOLS.push({ id, cat: g('cat'), icon: g('icon') || '🔧', fa: g('fa'), en: g('en'), desc: g('desc') || '' });
  }
}

/* ═══════════ ۲) راستی‌آزمایی: دادهٔ SEO باید دقیقاً با کد بخواند ═══════════ */
const errs = [];
if (TOOLS.length !== SITE.toolCount) errs.push(`تعداد ابزارها ${TOOLS.length} است ولی SITE.toolCount=${SITE.toolCount}`);
const ids = new Set(TOOLS.map((t) => t.id));
for (const t of TOOLS_SEO) if (!ids.has(t.id)) errs.push(`TOOLS_SEO ابزار ناشناخته دارد: ${t.id}`);
for (const id of ids) if (!TOOLS_SEO.some((t) => t.id === id)) errs.push(`ابزار ${id} در TOOLS_SEO تعریف نشده`);
const catIds = new Set(CATS_SEO.map((c) => c.id));
for (const t of TOOLS) if (!catIds.has(t.cat)) errs.push(`دستهٔ ناشناخته برای ${t.id}: ${t.cat}`);
if (CATS_SEO.length !== SITE.catCount) errs.push(`تعداد دسته‌ها ${CATS_SEO.length} است ولی SITE.catCount=${SITE.catCount}`);
const slugs = [...CATS_SEO.map((c) => c.slug), ...TOOLS_SEO.map((t) => t.slug)];
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length) errs.push(`slug تکراری: ${[...new Set(dupes)].join('، ')}`);
for (const t of TOOLS_SEO) if (t.faq.length !== 2) errs.push(`faq ابزار ${t.id} باید دقیقاً ۲ مورد باشد`);
if (errs.length) { console.error('❌ ناسازگاری داده:\n  • ' + errs.join('\n  • ')); process.exit(1); }

const catById = Object.fromEntries(CATS_SEO.map((c) => [c.id, c]));
const seoById = Object.fromEntries(TOOLS_SEO.map((t) => [t.id, t]));
const ALL = TOOLS.map((t) => ({ ...t, ...seoById[t.id], catSeo: catById[t.cat] }));
const toolById = Object.fromEntries(ALL.map((t) => [t.id, t]));
const toolUrl = (t) => p(`tools/${t.slug}/`);
const catUrl = (c) => p(`tools/${c.slug}/`);
const appUrl = (t) => `${BP}/#/t/${t.id}`;
const catTools = (c) => ALL.filter((t) => t.cat === c);

/* ═══════════ ۳) ابزارهای HTML ═══════════ */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

const HEAD_ASSETS = `
<link rel="preload" href="${p('assets/fonts/Vazirmatn-var.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${p('css/themes.css')}">
<link rel="stylesheet" href="${p('css/main.css')}">
<link rel="stylesheet" href="${p('css/components.css')}">
<link rel="stylesheet" href="${p('css/static.css')}">
<link rel="manifest" href="${p('manifest.json')}">
<link rel="icon" type="image/png" href="${p('assets/icons/icon-192.png')}">
<link rel="apple-touch-icon" href="${p('assets/icons/icon-192.png')}">
<link rel="sitemap" type="application/xml" href="${p('sitemap.xml')}">
<meta name="theme-color" content="#0a6e57">`.trim();

const GEN_NOTE = `<!-- ─────────────────────────────────────────────────────────────────────
     تولیدشده توسط scripts/build-seo.mjs — این فایل را دستی ویرایش نکنید.
     منبع محتوا: seo/site.mjs · seo/tools-meta.mjs · js/helps.js · tools/*.js
     بازسازی: npm run build:seo        راستی‌آزمایی: npm run validate:seo
     ───────────────────────────────────────────────────────────────────── -->`;

const SITE_HEADER = `<header class="topbar">
  <div class="topbar-in wrap">
    <a class="brand" href="${p()}"><span class="logo" aria-hidden="true">IR</span>
      <span class="brand-txt"><b>${SITE.name}</b><small>جعبه‌ابزار آفلاین فارسی</small></span></a>
    <nav class="topnav" aria-label="ناوبری اصلی">
      <a href="${p()}">خانه</a>
      <a href="${p('tools/')}">ابزارها</a>
      <a href="${p('about/')}">درباره</a>
      <a class="btn btn-pri" href="${p('#/')}">باز کردن اپ</a>
    </nav>
  </div>
</header>`;

const SITE_FOOTER = `<footer class="site-foot">
  <div class="wrap foot-grid">
    <div>
      <p class="foot-brand"><b>${SITE.name}</b> — ${esc(SITE.taglineFa)}</p>
      <p>${esc(SITE.factFa)}</p>
    </div>
    <div>
      <h2>ابزارها</h2>
      <ul>${CATS_SEO.map((c) => `<li><a href="${catUrl(c)}">${esc(c.fa)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2>پروژه</h2>
      <ul>
        <li><a href="${p('about/')}">درباره و حریم خصوصی</a></li>
        <li><a href="${p('tools/')}">فهرست ${TF} ابزار</a></li>
        <li><a href="${p('sitemap.xml')}">نقشهٔ سایت</a></li>
        <li><a href="${SITE.repo}" rel="noopener">مخزن GitHub</a></li>
        <li><a href="${SITE.issues}" rel="noopener">گزارش مشکل</a></li>
      </ul>
    </div>
    <div>
      <h2>واقعیت‌ها</h2>
      <ul class="foot-facts">
        <li>نسخهٔ ${SITE.version} · لایسنس ${SITE.license}</li>
        <li>${TF} ابزار · ${CF} دسته · بدون فریم‌ورک</li>
        <li>پردازش محلی، بدون سرور و بدون ردیابی</li>
      </ul>
    </div>
  </div>
  <div class="wrap foot-note">
    <p>ساخته‌شده توسط <a href="${SITE.author.url}" rel="noopener">${SITE.author.name}</a> ·
      لایسنس <a href="${SITE.licenseUrl}" rel="noopener">${SITE.license}</a> ·
      ${esc(SITE.disambiguationFa)}</p>
  </div>
</footer>`;

const crumbs = (items) => `<nav class="crumbs" aria-label="مسیر صفحه"><ol>${items.map(([label, href], i) =>
  `<li>${href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}${i < items.length - 1 ? ' <span aria-hidden="true">‹</span>' : ''}</li>`).join('')}</ol></nav>`;

const bcLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.filter(([, h]) => h).map(([label, href], i) => ({
    '@type': 'ListItem', position: i + 1, name: label, item: up(href),
  })),
});

const faqBlock = (faq, idp) => `<section class="faq" aria-labelledby="${idp}">
<h2 id="${idp}">پرسش‌های پرتکرار</h2>
${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</section>`;

/** پوستهٔ مشترک همهٔ صفحات استاتیک */
function page({ title, description, canonical, graph, body, noindex = false }) {
  const og = `<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(ENTITY_EN)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(abs(SITE.ogImage))}">
<meta property="og:image:width" content="${SITE.ogImageWidth}">
<meta property="og:image:height" content="${SITE.ogImageHeight}">
<meta property="og:image:alt" content="${esc(ENTITY_EN)}">
<meta property="og:locale" content="fa_IR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs(SITE.ogImage))}">`;

  return `<!DOCTYPE html>
${GEN_NOTE}
<html lang="${SITE.lang}" dir="rtl" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
<meta name="author" content="${esc(SITE.author.name)}">
<meta name="application-name" content="${esc(SITE.name)}">
<meta name="color-scheme" content="light dark">
${og}
${HEAD_ASSETS}
${graph.map(ld).join('\n')}
</head>
<body>
<a class="skip" href="#main">پرش به محتوای اصلی</a>
${SITE_HEADER}
<main id="main" class="wrap">
${body}
</main>
${SITE_FOOTER}
</body>
</html>
`;
}

function writePage(urlPath, o) {
  /* urlPath مسیر عمومی است (شامل basePath) — مسیر فایل از آن استخراج می‌شود */
  const rel = urlPath.startsWith(`${BP}/`) ? urlPath.slice(BP.length + 1) : urlPath.replace(/^\/+/, '');
  const file = rel === '' ? 'index.html' : (rel.endsWith('/') ? `${rel}index.html` : rel);
  const f = join(ROOT, file);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, page(o));
  return f;
}

/* ═══════════ ۴) گره‌های مشترک JSON-LD (باید در همهٔ صفحات یکسان باشند) ═══════════ */
const PERSON_NODE = { '@type': 'Person', '@id': A_ID, name: SITE.author.name, url: SITE.author.url, sameAs: [SITE.repo] };
const websiteNode = () => ({
  '@type': 'WebSite', '@id': A_WEB, url: abs(), name: ENTITY_EN,
  alternateName: [SITE.name, ...SITE.alternateNames],
  inLanguage: `${SITE.lang}-IR`, publisher: { '@id': A_ID }, description: SITE.shortEn,
});
const appNode = () => ({
  '@type': 'WebApplication', '@id': A_APP, name: SITE.name,
  alternateName: [ENTITY_EN, ...SITE.alternateNames], url: abs(),
  applicationCategory: 'UtilityApplication', applicationSubCategory: 'Persian offline web toolbox',
  operatingSystem: 'Any modern web browser (Chrome, Edge, Firefox, Safari) on desktop, Android and iOS',
  browserRequirements: 'Requires JavaScript for interactive tools (static content is readable without JavaScript); Web Crypto features require a secure context (HTTPS or localhost)',
  softwareVersion: SITE.version, softwareHelp: abs('about/'),
  datePublished: SITE.datePublished, dateModified: SITE.dateModified,
  license: SITE.licenseUrl, isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  inLanguage: `${SITE.lang}-IR`,
  author: { '@id': A_ID }, publisher: { '@id': A_ID }, creator: { '@id': A_ID },
  isPartOf: { '@id': A_WEB }, sameAs: [SITE.repo], screenshot: abs(SITE.ogImage),
  description: SITE.factEn,
  featureList: CATS_SEO.map((c) => `${c.en} (${catTools(c.id).length} tools): ${catTools(c.id).map((t) => t.en).join(', ')}`),
  hasPart: ALL.map((t) => ({
    '@type': 'SoftwareApplication', name: `${t.fa} (${t.en})`, url: up(toolUrl(t)),
    applicationCategory: CAT_APP_CATEGORY[t.cat], isAccessibleForFree: true,
  })),
});

/* ═══════════ ۵) صفحهٔ درباره (Entity Profile) ═══════════ */
const ABOUT_URL = p('about/');
const aboutBody = `
${crumbs([['خانه', p()], ['دربارهٔ IR-Toolbox', null]])}
<article class="prose">
  <h1>${esc(ENTITY_FA)}</h1>
  <p class="lead">${esc(SITE.citationFa)}</p>
  <p>${esc(SITE.factFa)} همهٔ ابزارها در مرورگر اجرا می‌شوند؛ نه سروری در میان است، نه حساب کاربری و نه ردیابی. پروژه متن‌باز است و با لایسنس ${SITE.license} منتشر شده.</p>

  <section class="facts" aria-labelledby="h-glance">
    <h2 id="h-glance">در یک نگاه</h2>
    <ul class="fact-grid">
      <li><b>${TF}</b><span>ابزار</span></li>
      <li><b>${CF}</b><span>دسته</span></li>
      <li><b>${SITE.version}</b><span>نسخهٔ فعلی</span></li>
      <li><b>۰</b><span>سرور و درخواست داده</span></li>
      <li><b>${SITE.license}</b><span>لایسنس</span></li>
      <li><b>Vanilla JS</b><span>بدون فریم‌ورک و بدون build</span></li>
    </ul>
  </section>

  <section aria-labelledby="h-why">
    <h2 id="h-why">${SITE.name} چه مشکلی را حل می‌کند؟</h2>
    <p>بیشتر ابزارهای آنلاینِ تبدیل JSON، تولید رمز عبور، تبدیل تاریخ شمسی یا ساخت QR، متن و فایل شما را به سرور شخص دیگری می‌فرستند. برای داده‌های حساس — رمز عبور، سند، توکن، تصویر شخصی — این یعنی ریسک واقعی. راه‌حل‌های نصبی هم روی هر دستگاهی در دسترس نیستند.</p>
    <p>${SITE.name} همان ابزارها را به‌صورت وب‌اپلیکیشن آفلاین ارائه می‌دهد: یک‌بار باز می‌شود، بعد از آن بدون اینترنت کار می‌کند، و پردازش کاملاً در مرورگر انجام می‌شود.</p>
  </section>

  <section aria-labelledby="h-cats">
    <h2 id="h-cats">${CF} دستهٔ ابزار</h2>
    <ul class="cat-list">
      ${CATS_SEO.map((c) => `<li><a href="${catUrl(c)}"><b>${esc(c.fa)}</b> <span class="muted">(${fa(catTools(c.id).length)} ابزار)</span></a><p>${esc(c.intro)}</p></li>`).join('\n      ')}
    </ul>
  </section>

  <section aria-labelledby="h-tools">
    <h2 id="h-tools">همهٔ ${TF} ابزار</h2>
    ${CATS_SEO.map((c) => `<h3>${esc(c.fa)}</h3>
    <ul class="tool-chips">${catTools(c.id).map((t) => `<li><a href="${toolUrl(t)}">${t.icon} ${esc(t.fa)}</a></li>`).join('')}</ul>`).join('\n    ')}
  </section>

  <section aria-labelledby="h-offline">
    <h2 id="h-offline">آفلاین‌اول و نصب‌شدنی (PWA)</h2>
    <p>${SITE.name} یک <abbr title="Progressive Web App">PWA</abbr> است. Service Worker فایل‌های لازم را در اولین بازدید ذخیره می‌کند؛ پس از آن اپ بدون اینترنت باز می‌شود و کار می‌کند. می‌توانید آن را روی گوشی یا دسکتاپ نصب کنید و مثل اپ بومی استفاده کنید.</p>
    <ul>
      <li>به‌روزرسانی با تغییر نسخهٔ کش Service Worker انجام می‌شود، بدون نیاز به نصب مجدد.</li>
      <li>ماژول ابزارها به‌صورت پویا و فقط هنگام نیاز بارگذاری می‌شود؛ حجم اولیهٔ صفحه کوچک می‌ماند.</li>
    </ul>
  </section>

  <section aria-labelledby="h-privacy">
    <h2 id="h-privacy">حریم خصوصی — دقیقاً چه اتفاقی می‌افتد</h2>
    <ul>
      <li>هیچ سرور، API، کوکی ردیابی یا اسکریپت تحلیل بیرونی وجود ندارد.</li>
      <li>متن، تصویر و فایل‌ها هرگز از مرورگر شما خارج نمی‌شوند.</li>
      <li>تنها داده‌های ماندگار، تنظیمات و رکوردهای شما در localStorage همین مرورگر است (با پیشوند <code>ir:</code>) و هر زمان قابل پاک‌کردن است.</li>
      <li>اسکریپت‌ها و فونت‌ها همگی داخل خود پروژه هستند؛ هیچ منبع شخص ثالثی بارگذاری نمی‌شود.</li>
    </ul>
    <p class="note">صادقانه: ابزارهایی که ذاتاً به دسترسی مرورگر نیاز دارند — مثل <a href="${toolUrl(toolById['qr-reader'])}">اسکن زندهٔ دوربین در QR‌خوان</a> — از همان دسترسی‌ها استفاده می‌کنند، اما خودِ داده جایی فرستاده نمی‌شود. ادعای «۱۰۰٪ خصوصی» یا «کاملاً آفلاین» برای چنین قابلیت‌هایی مطرح نمی‌شود.</p>
  </section>

  <section aria-labelledby="h-sec">
    <h2 id="h-sec">امنیت و رمزنگاری</h2>
    <ul>
      <li><a href="${toolUrl(toolById.passman)}">مدیر رمز عبور</a> و <a href="${toolUrl(toolById.vault)}">گاوصندوق IR</a> از AES-256-GCM با مشتق کلید PBKDF2-HMAC-SHA-256 (۲۵۰٬۰۰۰ تکرار) استفاده می‌کنند.</li>
      <li>کلید یا رمز اصلی هرگز ذخیره نمی‌شود؛ بدون آن، داده‌ها قابل بازیابی نیستند.</li>
      <li>رمز عبور و توکن‌ها با مولد تصادفی رمزنگاری مرورگر ساخته می‌شوند، نه <code>Math.random</code>.</li>
      <li>رمزنگاری مرورگر فقط در محیط امن (HTTPS یا localhost) در دسترس است؛ در غیر این صورت ابزار به‌جای رفتار ناامن، هشدار می‌دهد.</li>
      <li>برای گزارش آسیب‌پذیری، <a href="${p('SECURITY.md')}">SECURITY.md</a> را ببینید.</li>
    </ul>
  </section>

  <section aria-labelledby="h-browsers">
    <h2 id="h-browsers">پشتیبانی مرورگرها و زبان</h2>
    <p>اپ روی مرورگرهای مدرن (کرومیوم، فایرفاکس، سافاری، اج) و هم روی موبایل و دسکتاپ کار می‌کند. رابط کاربری فارسی (راست‌به‌چپ) است و ابزارهای متنی، هم فارسی و هم انگلیسی را درست پردازش می‌کنند. تقویم جلالی (شمسی) به‌صورت بومی پشتیبانی می‌شود.</p>
  </section>

  <section aria-labelledby="h-project">
    <h2 id="h-project">پروژه، نسخه‌ها و مشارکت</h2>
    <ul>
      <li>نسخهٔ فعلی: <b>${SITE.version}</b> — آخرین به‌روزرسانی ${SITE.dateModified}</li>
      <li>مخزن کد: <a href="${SITE.repo}" rel="noopener">${SITE.repo}</a></li>
      <li>راهنمای مشارکت: <a href="${p('CONTRIBUTING.md')}">CONTRIBUTING.md</a></li>
      <li>پشتیبانی: <a href="${p('SUPPORT.md')}">SUPPORT.md</a> · منشور رفتاری: <a href="${p('CODE_OF_CONDUCT.md')}">CODE_OF_CONDUCT.md</a></li>
      <li>لایسنس: <a href="${SITE.licenseUrl}" rel="noopener">${SITE.license}</a></li>
      <li>استناد: <a href="${p('CITATION.cff')}">CITATION.cff</a></li>
    </ul>
  </section>

  <section aria-labelledby="h-limits">
    <h2 id="h-limits">محدودیت‌ها و دامنهٔ پروژه</h2>
    <ul>
      <li>این یک مجموعه ابزار عمومی است، نه یک سرویس ابری: همگام‌سازی بین دستگاه‌ها، حساب کاربری و ذخیره‌سازی سمت سرور وجود ندارد.</li>
      <li>داده‌های ذخیره‌شده در localStorage با پاک‌کردن دادهٔ مرورگر از بین می‌روند؛ برای دادهٔ مهم از پشتیبان رمزنگاری‌شده استفاده کنید.</li>
      <li>ابزارهای امنیتی جایگزین مشاورهٔ تخصصی نیستند و هش، ذاتاً یک‌طرفه است.</li>
      <li>پروژه هیچ سرویس آنلاین، پرداخت یا تبلیغاتی ندارد.</li>
    </ul>
  </section>

  <section aria-labelledby="h-disamb">
    <h2 id="h-disamb">ابهام‌زدایی از نام</h2>
    <p>${esc(SITE.disambiguationFa)} اگر به دنبال کتابخانهٔ بازیابی اطلاعات (Information Retrieval) یا بستهٔ MATLAB با نام مشابه هستید، این پروژه آن نیست.</p>
  </section>

  ${faqBlock([
    ['IR-Toolbox چیست و چه کسی آن را ساخته است؟', `${SITE.name} یک وب‌اپلیکیشن متن‌باز و آفلاین با ${TF} ابزار مرورگری در ${CF} دسته است که توسط ${SITE.author.name} ساخته و با لایسنس ${SITE.license} منتشر شده است.`],
    ['آیا استفاده از آن رایگان است؟', 'بله؛ کاملاً رایگان و متن‌باز است. هیچ پرداخت، اشتراک یا تبلیغاتی وجود ندارد.'],
    ['آیا واقعاً بدون اینترنت کار می‌کند؟', 'بله. بعد از اولین بارگذاری، Service Worker فایل‌ها را کش می‌کند و اپ آفلاین باز می‌شود. پردازش داده همیشه محلی است.'],
    ['آیا دادهٔ من به سروری فرستاده می‌شود؟', 'خیر. هیچ سرور، API یا اسکریپت تحلیل بیرونی در پروژه وجود ندارد.'],
    ['آیا نیاز به نصب دارد؟', 'خیر؛ در مرورگر باز می‌شود. به‌دلخواه می‌توانید آن را به‌عنوان PWA نصب کنید.'],
    ['چطور می‌توانم به پروژه کمک کنم؟', 'از طریق مخزن GitHub: گزارش باگ، پیشنهاد ابزار جدید یا ارسال Pull Request. راهنما در CONTRIBUTING.md است.'],
  ], 'h-faq')}
</article>`;

writePage(ABOUT_URL, {
  title: ENTITY_FA,
  description: SITE.shortFa,
  canonical: abs('about/'),
  body: aboutBody,
  graph: [{ '@context': 'https://schema.org', '@graph': [websiteNode(), appNode(), PERSON_NODE, bcLd([['خانه', p()], ['دربارهٔ IR-Toolbox', ABOUT_URL]])] }],
});

/* ═══════════ ۶) صفحات ابزار ═══════════ */
for (const t of ALL) {
  const url = toolUrl(t);
  const related = catTools(t.cat).filter((x) => x.id !== t.id);
  const others = ALL.filter((x) => x.cat !== t.cat);
  const title = `${t.fa} — ${SITE.name}`;
  const desc = `${t.lead} بخشی از ${SITE.name}: جعبه‌ابزار آفلاین فارسی با ${TF} ابزار مرورگری، بدون سرور و بدون ردیابی.`;
  const body = `
${crumbs([['خانه', p()], [t.catSeo.fa, catUrl(t.catSeo)], [t.fa, null]])}
<article class="prose">
  <h1>${t.icon} ${esc(t.fa)}</h1>
  <p class="tool-en muted">${esc(t.en)}</p>
  <p class="lead">${esc(t.lead)}</p>
  <p class="cta"><a class="btn btn-pri" href="${appUrl(t)}">باز کردن «${esc(t.fa)}» در ${SITE.name}</a></p>

  <section aria-labelledby="h-feat">
    <h2 id="h-feat">قابلیت‌ها</h2>
    <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join('\n    ')}</ul>
  </section>

  <section aria-labelledby="h-use">
    <h2 id="h-use">راهنمای استفاده</h2>
    <p>${esc(HELPS[t.id] || t.desc)}</p>
  </section>

  <section aria-labelledby="h-priv">
    <h2 id="h-priv">حریم خصوصی این ابزار</h2>
    <p>${esc(privacyOf(t.id))}</p>
  </section>

  ${faqBlock(t.faq, 'h-faq')}

  <section aria-labelledby="h-rel">
    <h2 id="h-rel">ابزارهای مرتبط در دستهٔ ${esc(t.catSeo.fa)}</h2>
    <ul class="tool-chips">${related.map((x) => `<li><a href="${toolUrl(x)}">${x.icon} ${esc(x.fa)}</a></li>`).join('')}</ul>
    <p><a href="${catUrl(t.catSeo)}">همهٔ ابزارهای ${esc(t.catSeo.fa)} ←</a> · <a href="${p('tools/')}">فهرست کامل ${TF} ابزار</a></p>
  </section>

  <section aria-labelledby="h-other">
    <h2 id="h-other">از دسته‌های دیگر</h2>
    <ul class="tool-chips">${others.slice(0, 8).map((x) => `<li><a href="${toolUrl(x)}">${x.icon} ${esc(x.fa)}</a></li>`).join('')}</ul>
  </section>
</article>`;

  writePage(url, {
    title, description: desc, canonical: abs(`tools/${t.slug}/`), body,
    graph: [{
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication', '@id': `${up(url)}#tool`, name: `${t.fa} (${t.en})`,
          alternateName: [t.en, t.fa], url: up(url),
          applicationCategory: CAT_APP_CATEGORY[t.cat] || 'UtilityApplication',
          applicationSuite: SITE.name, applicationSubCategory: t.catSeo.en,
          operatingSystem: 'Any modern web browser',
          browserRequirements: 'Requires JavaScript; works offline as a PWA',
          softwareVersion: SITE.version, isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          inLanguage: `${SITE.lang}-IR`, license: SITE.licenseUrl,
          author: { '@id': A_ID }, publisher: { '@id': A_ID }, creator: { '@id': A_ID },
          isPartOf: { '@id': A_WEB }, sameAs: [SITE.repo],
          description: t.lead, featureList: t.features,
        },
        PERSON_NODE,
        bcLd([['خانه', p()], [t.catSeo.fa, catUrl(t.catSeo)], [t.fa, url]]),
      ],
    }],
  });
}

/* ═══════════ ۷) صفحات دسته ═══════════ */
for (const c of CATS_SEO) {
  const list = catTools(c.id);
  const url = catUrl(c);
  const title = `${c.fa} (${fa(list.length)} ابزار) — ${SITE.name}`;
  const desc = `${c.intro} ${fa(list.length)} ابزار آفلاین از ${TF} ابزار ${SITE.name}.`;
  const body = `
${crumbs([['خانه', p()], ['ابزارها', p('tools/')], [c.fa, null]])}
<article class="prose">
  <h1>${esc(c.fa)} <span class="muted">— ${esc(c.en)}</span></h1>
  <p class="lead">${esc(c.intro)}</p>
  <ul class="tool-cards">
    ${list.map((t) => `<li>
      <a href="${toolUrl(t)}" class="tcard">
        <span class="ticon" aria-hidden="true">${t.icon}</span>
        <span class="tbody"><b>${esc(t.fa)}</b><small>${esc(t.desc)}</small></span>
      </a>
      <a class="topen" href="${appUrl(t)}" aria-label="باز کردن ${esc(t.fa)} در اپ">باز کردن ↗</a>
    </li>`).join('\n    ')}
  </ul>
  <p><a href="${p('tools/')}">همهٔ ${TF} ابزار در ${CF} دسته ←</a></p>
</article>`;
  writePage(url, {
    title, description: desc, canonical: abs(`tools/${c.slug}/`), body,
    graph: [{
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage', '@id': `${up(url)}#cat`, url: up(url),
          name: `${c.fa} — ${SITE.name}`, inLanguage: `${SITE.lang}-IR`,
          isPartOf: { '@id': A_WEB }, about: { '@id': A_APP }, description: c.intro,
          mainEntity: {
            '@type': 'ItemList', numberOfItems: list.length,
            itemListElement: list.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.fa, url: up(toolUrl(t)) })),
          },
        },
        bcLd([['خانه', p()], ['ابزارها', p('tools/')], [c.fa, url]]),
      ],
    }],
  });
}

/* ═══════════ ۸) هاب ابزارها ═══════════ */
{
  const url = p('tools/');
  const title = `${TF} ابزار مرورگری در ${CF} دسته — ${SITE.name}`;
  const desc = `فهرست کامل ${TF} ابزار ${SITE.name}: متن، توسعه‌دهنده، طراحی، فایل، محاسبات، تقویم شمسی، امنیت، سرگرمی و بازی فکری — همه آفلاین و رایگان.`;
  const body = `
${crumbs([['خانه', p()], ['ابزارها', null]])}
<article class="prose">
  <h1>${TF} ابزار مرورگری در ${CF} دسته</h1>
  <p class="lead">همهٔ ابزارهای ${SITE.name}، دسته‌بندی‌شده. هر ابزار کاملاً در مرورگر اجرا می‌شود و بعد از اولین بارگذاری، آفلاین کار می‌کند.</p>
  <p class="cta"><a class="btn btn-pri" href="${p('#/')}">باز کردن اپ ${SITE.name}</a> · <a class="btn" href="${p('about/')}">دربارهٔ پروژه و حریم خصوصی</a></p>
  ${CATS_SEO.map((c) => `<section aria-labelledby="cat-${c.id}">
    <h2 id="cat-${c.id}"><a href="${catUrl(c)}">${esc(c.fa)}</a> <span class="muted">(${fa(catTools(c.id).length)})</span></h2>
    <p>${esc(c.intro)}</p>
    <ul class="tool-chips">${catTools(c.id).map((t) => `<li><a href="${toolUrl(t)}">${t.icon} ${esc(t.fa)}</a></li>`).join('')}</ul>
  </section>`).join('\n  ')}
  ${faqBlock([
    ['IR-Toolbox چند ابزار دارد؟', `${TF} ابزار در ${CF} دسته: ${CATS_SEO.map((c) => c.fa).join('، ')}.`],
    ['آیا ابزارها بدون اینترنت کار می‌کنند؟', 'بله. بعد از اولین بارگذاری، همه‌چیز از کش Service Worker خوانده می‌شود و پردازش داده همیشه در مرورگر انجام می‌شود.'],
    ['آیا ابزارها رایگان‌اند؟', `بله؛ پروژه متن‌باز با لایسنس ${SITE.license} است و هیچ پرداختی ندارد.`],
  ], 'h-faq')}
</article>`;
  writePage(url, {
    title, description: desc, canonical: abs('tools/'), body,
    graph: [{
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage', '@id': `${up(url)}#hub`, url: up(url),
          name: `${TF} ابزار مرورگری — ${SITE.name}`, inLanguage: `${SITE.lang}-IR`,
          isPartOf: { '@id': A_WEB }, about: { '@id': A_APP }, description: desc,
          mainEntity: {
            '@type': 'ItemList', numberOfItems: ALL.length,
            itemListElement: ALL.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.fa} (${t.en})`, url: up(toolUrl(t)) })),
          },
        },
        bcLd([['خانه', p()], ['ابزارها', url]]),
      ],
    }],
  });
}

/* ═══════════ ۹) صفحهٔ ۴۰۴ ═══════════ */
writePage(p('404.html'), {
  title: `صفحه پیدا نشد — ${SITE.name}`,
  description: `این آدرس در ${SITE.name} وجود ندارد. از فهرست ${TF} ابزار یا صفحهٔ درباره ادامه دهید.`,
  canonical: abs('404.html'), noindex: true,
  body: `
<article class="prose center">
  <h1>۴۰۴ — صفحه پیدا نشد</h1>
  <p class="lead">آدرسی که دنبال آن بودید در ${SITE.name} وجود ندارد.</p>
  <ul class="inline-links">
    <li><a class="btn btn-pri" href="${p()}">صفحهٔ اصلی</a></li>
    <li><a class="btn" href="${p('tools/')}">فهرست ${TF} ابزار</a></li>
    <li><a class="btn" href="${p('about/')}">دربارهٔ پروژه</a></li>
  </ul>
  <p class="muted">اگر از داخل اپ لینکی خراب بود، لطفاً در <a href="${SITE.issues}" rel="noopener">مخزن GitHub</a> گزارش دهید.</p>
</article>`,
  graph: [],
});

/* ═══════════ ۱۰) sitemap.xml ═══════════ */
const docDate = (f) => { try { return statSync(join(ROOT, f)).mtime.toISOString().slice(0, 10); } catch { return SITE.dateModified; } };
const URLS = [
  [p(), SITE.dateModified, '1.0', 'weekly'],
  [ABOUT_URL, SITE.dateModified, '0.9', 'monthly'],
  [p('tools/'), SITE.dateModified, '0.9', 'weekly'],
  ...CATS_SEO.map((c) => [catUrl(c), SITE.dateModified, '0.7', 'monthly']),
  ...ALL.map((t) => [toolUrl(t), SITE.dateModified, '0.6', 'monthly']),
  ...['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'SUPPORT.md', 'CODE_OF_CONDUCT.md', 'CITATION.cff']
    .filter((f) => existsSync(join(ROOT, f))).map((f) => [p(f), docDate(f), '0.4', 'yearly']),
];
writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  URLS.map(([loc, lm, pr, cf]) => `  <url>\n    <loc>${up(loc)}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`).join('\n') +
  `\n</urlset>\n`);

/* ═══════════ ۱۱) robots.txt ═══════════ */
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Amazonbot',
  'cohere-ai', 'MistralAI-User', 'YouBot', 'DuckAssistBot', 'Meta-ExternalAgent', 'Bytespider'];
writeFileSync(join(ROOT, 'robots.txt'),
  `# ${SITE.name} — ${SITE.taglineEn}\n` +
  `# ${SITE.factEn}\n` +
  `# خزیدن برای ایندکس‌شدن و استخراج توسط موتورهای جستجو و دستیارهای هوش مصنوعی آزاد است.\n\n` +
  `User-agent: *\nAllow: /\nDisallow: /assets/icons/\n\n` +
  `# ── دستیارهای هوش مصنوعی (محتوای این سایت عمومی و قابل استناد است) ──\n` +
  AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join('\n') +
  `\n\n# ── نقشهٔ سایت ──\nSitemap: ${abs('sitemap.xml')}\n`);

/* ═══════════ ۱۲) llms.txt ═══════════ */
writeFileSync(join(ROOT, 'llms.txt'),
  `# ${SITE.name} — ${SITE.taglineEn}\n\n` +
  `> ${SITE.factEn}\n\n` +
  `${SITE.name} (${SITE.taglineFa}) یک وب‌اپلیکیشن رایگان، متن‌باز، حریم‌محور و آفلاین‌اول است که ${TF} ابزار مرورگری را در ${CF} دسته ارائه می‌دهد. ساخته‌شده توسط ${SITE.author.name}، با لایسنس ${SITE.license} و بدون هیچ سرور، ردیاب یا وابستگی به سرویس شخص ثالث.\n\n` +
  `## لینک‌های کلیدی\n\n` +
  `- [صفحهٔ اصلی](${abs()}): اپلیکیشن (SPA آفلاین با مسیرهای هش‌محور)\n` +
  `- [درباره و حریم خصوصی](${abs('about/')}): هویت پروژه، قابلیت‌ها، حریم خصوصی، امنیت، محدودیت‌ها\n` +
  `- [فهرست ابزارها](${abs('tools/')}): ${TF} ابزار در ${CF} دسته\n` +
  `- [مخزن GitHub](${SITE.repo}) · [گزارش مشکل](${SITE.issues}) · [لایسنس ${SITE.license}](${SITE.licenseUrl})\n` +
  `- [CITATION.cff](${abs('CITATION.cff')}) برای استناد\n\n` +
  `## واقعیت‌های پروژه\n\n` +
  `- ابزارها: ${SITE.toolCount} · دسته‌ها: ${SITE.catCount} · نسخه: ${SITE.version} · لایسنس: ${SITE.license}\n` +
  `- زمان انتشار: ${SITE.datePublished} · آخرین به‌روزرسانی: ${SITE.dateModified}\n` +
  `- فناوری: ${SITE.runtime}\n` +
  `- حریم خصوصی: پردازش کاملاً محلی؛ بدون سرور، API، کوکی ردیابی یا اسکریپت تحلیل. تنظیمات کاربر در localStorage همان مرورگر ذخیره می‌شود.\n` +
  `- رمزنگاری: AES-256-GCM با PBKDF2-HMAC-SHA-256 (۲۵۰٬۰۰۰ تکرار) در مدیر رمز عبور و گاوصندوق IR؛ کلید هرگز ذخیره نمی‌شود.\n` +
  `- آفلاین: PWA با Service Worker؛ پس از اولین بارگذاری بدون اینترنت کار می‌کند.\n\n` +
  `## دسته‌ها و ابزارها\n\n` +
  CATS_SEO.map((c) => `### ${c.fa} (${c.en}) — ${fa(catTools(c.id).length)} ابزار\n\n${c.intro}\n\n` +
    catTools(c.id).map((t) => `- [${t.fa}](${up(toolUrl(t))}): ${t.lead}`).join('\n') + '\n').join('\n') +
  `\n## پرسش‌های پرتکرار\n\n` +
  `- IR-Toolbox چیست؟ ${SITE.citationEn}\n` +
  `- آیا رایگان است؟ بله؛ متن‌باز با لایسنس ${SITE.license}، بدون پرداخت و تبلیغات.\n` +
  `- آیا داده‌ها به سرور فرستاده می‌شوند؟ خیر؛ پردازش کاملاً در مرورگر انجام می‌شود.\n` +
  `- آیا بدون اینترنت کار می‌کند؟ بله؛ به‌عنوان PWA پس از اولین بارگذاری آفلاین است.\n` +
  `- آیا نصب لازم است؟ خیر؛ در مرورگر باز می‌شود و به‌دلخواه قابل نصب است.\n\n` +
  `## ابهام‌زدایی از نام\n\n` +
  `${SITE.disambiguationEn}\n` +
  `${SITE.disambiguationFa}\n\n` +
  `## اسناد\n\n` +
  `- [README](${abs('README.md')}) · [مشارکت](${abs('CONTRIBUTING.md')}) · [امنیت](${abs('SECURITY.md')}) · [پشتیبانی](${abs('SUPPORT.md')}) · [منشور رفتاری](${abs('CODE_OF_CONDUCT.md')})\n` +
  `- [نقشهٔ سایت](${abs('sitemap.xml')})\n`);

/* ═══════════ ۱۳) پچ بلوک‌های SEO در index.html ═══════════ */
const idxPath = join(ROOT, 'index.html');
const patch = (marker, content) => {
  const src = readFileSync(idxPath, 'utf8');
  const re = new RegExp(`<!-- SEO:${marker}:start -->[\\s\\S]*?<!-- SEO:${marker}:end -->`);
  if (!re.test(src)) { console.error(`❌ نشانگر SEO:${marker} در index.html پیدا نشد`); process.exit(1); }
  writeFileSync(idxPath, src.replace(re, `<!-- SEO:${marker}:start -->\n${content}\n<!-- SEO:${marker}:end -->`));
};

patch('HEAD', `<!-- ⚠️ تولیدشده توسط scripts/build-seo.mjs — دستی ویرایش نکنید.
     برای تغییر آدرس پایه، seo/site.mjs را ویرایش و «npm run build:seo» را اجرا کنید. -->
<link rel="canonical" href="${abs()}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(ENTITY_EN)}">
<meta property="og:title" content="${esc(ENTITY_FA)}">
<meta property="og:description" content="${esc(SITE.shortFa)}">
<meta property="og:url" content="${abs()}">
<meta property="og:image" content="${abs(SITE.ogImage)}">
<meta property="og:image:width" content="${SITE.ogImageWidth}">
<meta property="og:image:height" content="${SITE.ogImageHeight}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${esc(ENTITY_EN)}">
<meta property="og:locale" content="fa_IR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ENTITY_FA)}">
<meta name="twitter:description" content="${esc(SITE.shortFa)}">
<meta name="twitter:image" content="${abs(SITE.ogImage)}">
<link rel="sitemap" type="application/xml" href="${p('sitemap.xml')}">
<link rel="alternate" type="application/rss+xml" title="${esc(ENTITY_EN)}" href="${SITE.repo}/releases.atom">`);

patch('JSONLD', `<!-- ⚠️ تولیدشده توسط scripts/build-seo.mjs — دستی ویرایش نکنید. -->
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': [websiteNode(), appNode(), PERSON_NODE] }, null, 2)}
</script>`);

/* ═══════════ ۱۴) لینک‌های داخلی واقعی در بلوک #seo-static صفحهٔ اصلی ═══════════ */
/* این بخش idempotent است: h3 از قبل لینک‌شده را هم بازمی‌نویسد. */
{
  const norm = (x) => String(x).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  /* تطبیق: برابری کامل، یا پیشوند «fa (»، یا پسوند «(en)» — و فقط اگر یکتا باشد */
  const findTool = (label) => {
    const hits = ALL.filter((t) => {
      const faN = norm(t.fa), enN = norm(t.en);
      return label === norm(`${t.fa} (${t.en})`) || label === faN || label === enN
        || label.startsWith(`${faN} (`) || label.endsWith(`(${enN})`);
    });
    return hits.length === 1 ? hits[0] : null;
  };
  const linked = new Set();
  let idxSrc = readFileSync(idxPath, 'utf8');
  idxSrc = idxSrc.replace(/<h3>(?:<a [^>]*>)?([^<]*?)(?:<\/a>)?<\/h3>/g, (m, label0) => {
    const label = norm(label0);
    const t = findTool(label);
    if (!t) return m;
    linked.add(t.id);
    return `<h3><a href="${toolUrl(t)}">${label}</a></h3>`;
  });
  const unlinked = ALL.filter((t) => !linked.has(t.id));

  /* نوار ناوبری استاتیک: خانه → ابزارها → دسته‌ها → درباره (برای خزندهٔ بدون JS) */
  const NAV_MARK = '<!-- SEO:STATICNAV -->';
  const navHtml = `${NAV_MARK}
    <p class="badges"><span>صفحه‌های مرجع:</span>
      <a href="${p('tools/')}">فهرست ${TF} ابزار</a> ·
      <a href="${p('about/')}">درباره، حریم خصوصی و امنیت</a> ·
      ${CATS_SEO.map((c) => `<a href="${catUrl(c)}">${esc(c.fa)}</a>`).join(' · ')}
    </p>`;
  if (idxSrc.includes(NAV_MARK)) {
    idxSrc = idxSrc.replace(/<!-- SEO:STATICNAV -->[\s\S]*?<\/p>/, navHtml);
  } else {
    const h2 = '<h2>دسته‌های ابزار: ۹ دسته، ۵۲ ابزار</h2>';
    if (!idxSrc.includes(h2)) { console.error('❌ نقطهٔ درج نوار ناوبری در #seo-static پیدا نشد'); process.exit(1); }
    idxSrc = idxSrc.replace(h2, `${navHtml}\n\n    ${h2}`);
  }
  writeFileSync(idxPath, idxSrc);
  if (unlinked.length) {
    console.warn(`⚠ ${unlinked.length} ابزار در #seo-static لینک نگرفت (برچسب عوض شده): ${unlinked.map((t) => t.id).join('، ')}`);
  } else {
    console.log(`✅ بلوک #seo-static: هر ${TF} ابزار + ${CF} دسته + درباره لینک واقعی گرفت`);
  }
}

/* ═══════════ گزارش ═══════════ */
console.log(`✅ صفحات استاتیک: ۱ درباره + ۱ هاب + ${CATS_SEO.length} دسته + ${ALL.length} ابزار + ۴۰۴`);
console.log(`✅ sitemap.xml: ${URLS.length} آدرس`);
console.log(`✅ robots.txt · llms.txt · بلوک‌های SEO:HEAD و SEO:JSONLD در index.html`);
console.log(`✅ پایه: ${BASE}`);
