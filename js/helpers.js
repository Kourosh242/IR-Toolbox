/* IR-Toolbox — small shared helpers */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const faNum = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[+d]);

/* Number with thousands separators + Persian digits (e.g. faGroup(150000) → «۱۵۰٬۰۰۰») */
const groupFmt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 6 });
export const faGroup = (n) => {
  const s = String(n).replace(/[،,٬\s]/g, '');
  /* v1.3.8 (یافتهٔ ۲): عدد صحیح بزرگ‌تر از دقت double (≥۱۶ رقم) قبلاً از Number()
   * رد می‌شد → بی‌صدا گِرد می‌شد (…۸۹۰ ← …۰۰۰) یا برای ورودی‌های خیلی بزرگ ∞ می‌داد.
   * حالا این حالت رقم‌به‌رقم و دقیق با groupInt خطی جدا می‌شود؛ بقیهٔ حالت‌ها
   * (اعشاری، منفی، محدودهٔ امن) همان مسیر قبلی Intl را می‌روند. */
  if (/^[+]?\d{16,}$/.test(s) || /^-\d{16,}$/.test(s)) return faNum(groupInt(s).replace(/,/g, '٬'));
  return groupFmt.format(Number(s));
};

export function faBytes(bytes) {
  if (!isFinite(bytes)) return '—';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${faNum(v.toFixed(v >= 10 || i === 0 ? 0 : 1))} ${units[i]}`;
}

export const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* Highlight query inside text, returning safe HTML with <mark>. */
export function highlight(text, q) {
  const safe = escapeHTML(text);
  if (!q) return safe;
  const qs = escapeHTML(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(qs, 'gi'), (m) => `<mark>${m}</mark>`);
}

export function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}

export function textBlob(s, mime = 'text/plain') {
  return new Blob([s], { type: `${mime};charset=utf-8` });
}

export function readFileAsText(file) {
  return file.text();
}
export function readFileAsArrayBuffer(file) {
  return file.arrayBuffer();
}

export const uid = () => Math.random().toString(36).slice(2, 9);

/* v1.3.4: Web Crypto فقط در محیط امن (https/localhost) — برای هشدار واضح به کاربر */
export const hasCrypto = () => !!(globalThis.crypto && globalThis.crypto.subtle);
export const INSECURE_MSG = '⚠️ ابزارهای رمزنگاری به محیط امن نیاز دارند: app را روی HTTPS یا localhost باز کنید (روی file:// یا http معمول، مرورگر اجازهٔ crypto نمی‌دهد).';

export function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'هم‌اکنون';
  if (m < 60) return `${faNum(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  return `${faNum(Math.floor(h / 24))} روز پیش`;
}

/* Jalali / Gregorian formatting via Intl (no external lib). */
export const faDate = (d = new Date()) =>
  new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(d);

/* v1.3.7 (یافتهٔ ۱۰): جداسازی هزارگان خطی O(n) — رجکس قبلی lookahead تودرتو O(n²) بود */
export function groupInt(int) {
  const neg = int.startsWith('-') || int.startsWith('+');
  const sign = neg ? int[0] : '';
  const d = neg ? int.slice(1) : int;
  let r = '';
  for (let i = 0, n = d.length; i < n; i++) {
    r += d[i];
    const left = n - 1 - i;
    if (left && left % 3 === 0) r += ',';
  }
  return sign + r;
}

/* v1.3.7 (یافتهٔ ۸): انتخاب یکنواخت با rejection sampling — بدون بایاس modulo */
export function randInt(max) {
  const limit = Math.floor(4294967296 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}
