# راهنمای توسعه‌دهندگان

## افزودن یک ابزار جدید

معماری ماژولار است؛ بدون بازنویسی هسته اپ می‌توانید ابزار اضافه کنید.

### ۱) ساخت فایل ابزار

در `tools/` یک فایل بسازید (مثلاً `tools/my-tool.js`) یا به یک فایل دسته موجود اضافه کنید:

```js
import { register } from '../js/registry.js';
import { el, field, textInput, readout } from '../js/ui.js';
import { faNum } from '../js/helpers.js';

register({
  id: 'my-tool',          // یکتا
  cat: 'text',            // یکی از دسته‌های registry.CATS
  icon: '✨',
  fa: 'ابزار من',
  en: 'My Tool',
  desc: 'توضیح یک‌خطی',
  keywords: ['my', 'tool'],
  mount(root) {
    const inp = textInput({ placeholder: 'چیزی وارد کن…' });
    const out = readout();
    inp.addEventListener('input', () => out.set(faNum(inp.value.length)));
    root.append(field('ورودی', inp), out.root);
  },
});
```

### ۲) ثبت در app.js

در `js/app.js`، فایل را یک‌بار import کنید:

```js
import '../tools/my-tool.js';
```

تمام.

جستجو، کارت‌ها، دسته‌بندی، علاقه‌مندی و پالت فرمان به‌صورت خودکار ابزار شما را می‌شناسند — هیچ داده ناوبری دیگری برای به‌روزرسانی نیست.

## کمکی‌های UI

از `js/ui.js` برای ساخت یکنواخت رابط استفاده کنید:

| تابع | کاربرد |
|---|---|
| `el(tag, attrs, ...children)` | ساخت عنصر DOM با `class`، `dataset`، `html` و event handler |
| `field(label, control)` | فیلد برچسب‌دار |
| `textInput(opts)` / `areaInput(opts)` | ورودی تک‌خط / چندخط |
| `readout(placeholder)` | باکس خروجی فقط‌خواندنی با دکمه کپی |
| `toast(msg, type)` | اعلان |
| `copyBtn(getText)` / `downloadBtn(getBlob, getName)` | دکمه کپی / دانلود |

## کمکی‌های عمومی

از `js/helpers.js`:

- `faNum(n)` / `faGroup(n)` — اعداد فارسی / جداکننده هزارگان.
- `escapeHTML(s)` — فرار کاراکترهای HTML (ضد XSS).
- `download(filename, blob)` — دانلود امن.
- `debounce(fn, ms)` — تأخیر ورودی.

## سبک‌ها

- از کلاس‌های موجود استفاده کنید: `.card`، `.btn`، `.input`، `.field`، `.readout`، `.stats`، `.badge`، `.hint`.
- مقادیر رنگ/فاصله را از متغیرهای `:root` (مثل `--primary`، `--surface`) بردارید تا با همه پوسته‌ها هماهنگ باشد.

## نکات مهم

- **هرگز داده کاربر را در localStorage ذخیره نکنید**؛ فقط شناسه‌ها و تنظیمات.
- **هرگز رمز عبور را ذخیره یا به جایی نفرستید.**
- خروجی‌های متن را قبل از درج با `escapeHTML` یا `el(..., {html})` امن کنید.
- برای تولید تصادفی امن از `crypto.getRandomValues` استفاده کنید، نه `Math.random`.

## ساخت آیکون‌ها

آیکون‌های PNG با یک اسکریپت بدون وابستگی ساخته می‌شوند:

```bash
node scripts/make-icons.mjs
```

این اسکریپت فایل‌های `icon-192.png`، `icon-512.png` و `icon-512-maskable.png` را در `assets/icons/` تولید می‌کند.
