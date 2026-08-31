# معماری و ساختار کد

IVA یک وب‌اپ استاتیک **بدون build** است؛ همه‌چیز با ES Modules بومی مرورگر کار می‌کند.

## ساختار پروژه

```
iva/
├─ index.html            پوسته RTL + لینک PWA
├─ manifest.json         متادیتای PWA (fa/rtl)
├─ service-worker.js     کش نسخه‌دار + آفلاین
├─ css/
│  ├─ themes.css         پوسته‌ها (light/dark/system/midnight/glass)
│  ├─ main.css           توکن‌ها، پایه و چیدمان
│  ├─ components.css     کامپوننت‌ها
│  └─ responsive.css     واکنش‌گرا
├─ js/
│  ├─ app.js             پوسته اپ، صفحات و مسیریابی
│  ├─ registry.js        رجیستری ماژولار ابزارها
│  ├─ router.js          روتر hash ساده
│  ├─ storage.js         localStorage با پیشوند iva:
│  ├─ ui.js              کمکی‌های DOM، toast و ویجت‌ها
│  ├─ search.js          پالت فرمان Ctrl+K
│  ├─ pwa.js             Service Worker و نصب PWA
│  ├─ helps.js           توضیحات هر ابزار
│  ├─ changelog.js       نسخه و تغییرات ورژن
│  ├─ jalaali.js         تبدیل تقویم جلالی/میلادی
│  ├─ hashes-sync.js     MD5 / SHA-1 / SHA-256 (برای دیتابیس محلی هش)
│  ├─ clipboard.js       کپی با fallback
│  └─ helpers.js         توابع مشترک (faNum، escapeHTML، download…)
├─ tools/                ماژول‌های ابزار (خودثبت)
├─ vault/                crypto-utils، file-format و UI گاوصندوق
├─ assets/               فونت وزیرمتن + آیکون‌ها
├─ scripts/make-icons.mjs  تولید آیکون PNG بدون وابستگی
└─ e2e/                  تست‌های Playwright
```

## رجیستری ماژولار

هسته اپ با **ابزارها آشنا نیست**؛ هر ابزار با یک فراخوانی `register` خودش را ثبت می‌کند:

```js
import { register } from '../js/registry.js';
register({
  id: 'my-tool',   // یکتا
  cat: 'text',     // یکی از دسته‌های registry.CATS
  icon: '✨',
  fa: 'ابزار من', en: 'My Tool',
  desc: 'توضیح یک‌خطی',
  keywords: ['my', 'tool'],
  mount(root) { … },
});
```

جستجو، کارت‌ها، دسته‌بندی، علاقه‌مندی و پالت فرمان **خودکار** ابزار جدید را می‌شناسند.

## جریان بوت

1. `index.html` → `js/app.js` (ماژول).
2. `app.js` پوسته می‌سازد، پوسته/حرکت را اعمال می‌کند و پالت جستجو را مقداردهی می‌کند.
3. همه ماژول‌های `tools/` و `vault/` import می‌شوند و ابزارهایشان را ثبت می‌کنند.
4. `pwa.register()` سرویس‌ورکر را ثبت می‌کند.
5. روتر روی `hashchange` گوش می‌دهد و صفحه مناسب را رندر می‌کند.

## مسیریابی (hash)

روتر ساده `#/…` است:

| مسیر | صفحه |
|---|---|
| `#/` | خانه |
| `#/c/{cat}` | دسته ابزارها |
| `#/t/{id}` | یک ابزار |
| `#/fav` | علاقه‌مندی‌ها |
| `#/settings` | تنظیمات |
| `#/sec` | امنیت و حریم |
| `#/changelog` | تغییرات ورژن |

## امنیت کد

- **بدون `eval`** در سطح کاربر؛ ماشین‌حساب از یک `safeEval` با **لیست سفید توکن** استفاده می‌کند.
- همه خروجی‌های متن قبل از درج در DOM **escape** می‌شوند (جلوگیری از XSS).
- رندر Markdown ابتدا escape و سپس فقط لینک‌های `http(s)` با `rel="noopener"` مجاز می‌شوند.
- رمزنگاری گاوصندوق فقط با Web Crypto بومی (`crypto.subtle`) انجام می‌شود.
