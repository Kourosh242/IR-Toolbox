/* IR-Toolbox — QR‌خوان آفلاین (کتابخانه: jsQR © Apache-2.0، vendor شده) */
import { register, setCleanup } from '../js/registry.js';
import { el, field, readout, toast } from '../js/ui.js';
import { faNum, timeAgo } from '../js/helpers.js';
import { analyzeUrl, SAFETY_HINT } from '../js/url-safety.js';

const HIST_KEY = 'ir:qrhist';
const getHist = () => { try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch { return []; } };
const pushHist = (text) => {
  const h = getHist().filter((x) => x.t !== text);
  h.unshift({ t: text.slice(0, 300), ts: Date.now() });
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 10))); } catch {}
};

/* ── بارگذاری تنبل jsQR (۲۵۱KB) ──
 * قبلاً vendor/jsQR.js با یک تگ <script> معمولی (بدون defer/async) در index.html
 * بارگذاری می‌شد و چون بلاک‌کنندهٔ رندر است، کل اپ منتظر دانلود/اجرای آن می‌ماند —
 * درحالی‌که فقط همین ابزار به آن نیاز دارد. حالا تنها وقتی که کاربر QR‌خوان را باز
 * کند، با import پویا گرفته می‌شود؛ نتیجه یک‌بار کش می‌شود و برای همهٔ دیکدها به کار می‌رود.
 * فایل UMD است و خودش را روی self/window می‌نشاند، پس بعد از resolve همان
 * window.jsQR را می‌خوانیم. (آدرس با import.meta.url ساخته می‌شود تا به مسیر صفحه
 * وابسته نباشد و در هر عمق نصبی درست کار کند.) */
const JSQR_URL = new URL('../vendor/jsQR.js', import.meta.url).href;
let jsQRLoading = null;
export function loadJsQR() {
  if (typeof window.jsQR === 'function') return Promise.resolve(window.jsQR);
  if (!jsQRLoading) {
    jsQRLoading = import(JSQR_URL)
      .then(() => {
        if (typeof window.jsQR !== 'function') throw new Error('jsQR بارگذاری نشد');
        return window.jsQR;
      })
      .catch((e) => { jsQRLoading = null; throw e; }); // شکست = تلاش دوباره در کلیک بعدی
  }
  return jsQRLoading;
}

/* ── تشخیص نوع خروجی ── */
function detectType(text) {
  if (/^https?:\/\//i.test(text)) return 'url';
  if (/^tel:/i.test(text)) return 'tel';
  if (/^mailto:/i.test(text)) return 'mail';
  if (/^WIFI:/i.test(text)) return 'wifi';
  if (/BEGIN:VCARD/i.test(text)) return 'vcard';
  return 'text';
}
const TYPE_FA = { url: '🔗 لینک', tel: '📞 شماره تماس', mail: '✉️ ایمیل', wifi: '📶 شبکهٔ WiFi', vcard: '👤 کارت ویزیت', text: '📝 متن' };

function parseWifi(text) {
  const un = (s) => (s || '').replace(/\\(.)/g, '$1');
  const g = (k) => { const m = text.match(new RegExp(k + ':((?:[^\\\\;]|\\\\.)*);')); return m ? un(m[1]) : ''; };
  return { ssid: g('S'), pass: g('P'), type: g('T') || '—', hidden: /H:true/i.test(text) };
}

export function mountQrReader(root) {
  const resBox = el('div', { class: 'card', style: 'padding:18px;display:none' });
  const status = el('div', { class: 'hint' });
  const video = el('video', { style: 'width:100%;max-height:300px;border-radius:14px;border:1px solid var(--line);display:none;background:#000', playsinline: '', muted: '', 'aria-label': 'پیش‌نمایش دوربین' });
  let stream = null, raf = 0, scanning = false;

  /* jsQR از شبکه/SW کش گرفته می‌شود؛ اگر نبود، پیام صادقانه + تلاش دوبارهٔ خودکار
   * در اقدام بعدی (loadJsQR در صورت شکست، promise کش‌شده را دور می‌اندازد). */
  const LIB_MSG = '⚠️ کتابخانهٔ QR (jsQR) بارگذاری نشد — اتصال را بررسی کن؛ در اقدام بعدی دوباره تلاش می‌شود.';
  let libFailed = false;
  const retryHint = () => {
    libFailed = true;
    status.textContent = LIB_MSG;
    toast(LIB_MSG, 'err', 5000);
  };
  // پیش‌بارگذاری در پس‌زمینه تا نخستین اسکن معطل نماند (بی‌صدا: اگر نشد، اقدام بعدی دوباره تلاش می‌کند)
  loadJsQR()
    .then(() => { if (libFailed) { libFailed = false; status.textContent = ''; } })
    .catch(() => { libFailed = true; status.textContent = LIB_MSG; });

  const stopCam = () => {
    scanning = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.style.display = 'none';
    stopBtn.style.display = 'none';
    camBtn.style.display = '';
  };
  setCleanup(stopCam);

  /* ── نمایش نتیجه ── */
  const show = (text) => {
    resBox.style.display = '';
    resBox.textContent = '';
    pushHist(text);
    drawHistory();
    const type = detectType(text);
    /* v1.3.7 (یافتهٔ ۶): اسکیم‌های خطرناک هرگز به دکمهٔ باز/تماس نمی‌رسند — فقط کپی */
    if (/^(javascript|data|vbscript):/i.test(text.trim())) {
      const out0 = readout();
      resBox.append(out0.root,
        el('div', { class: 'warn-box', style: 'margin-top:10px' }, '⚠️ محتوای این QR یک اسکیم خطرناک (javascript:/data:/vbscript:) است — اجرا و بازشدن غیرفعال است؛ فقط کپی متن در دسترس است.'),
        el('div', { class: 'dash-actions', style: 'margin-top:8px' },
          el('button', { class: 'btn tonal sm', onclick: async () => { try { await navigator.clipboard.writeText(text); toast('کپی شد 📋'); } catch { toast('کپی ممکن نشد', 'err'); } } }, '📋 کپی')));
      out0.set(text);
      return;
    }
    const out = readout();
    resBox.append(
      el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px' },
        el('span', { class: 'badge info' }, TYPE_FA[type]),
        el('span', { class: 'hint', style: 'margin:0' }, `${faNum(text.length)} نویسه`)),
      out.root,
    );
    out.set(text);

    const actions = el('div', { class: 'dash-actions' });
    actions.append(el('button', { class: 'btn tonal sm', onclick: async () => { try { await navigator.clipboard.writeText(text); toast('کپی شد 📋'); } catch { toast('کپی ممکن نشد', 'err'); } } }, '📋 کپی'));

    if (type === 'url') {
      const rep = analyzeUrl(text);
      const badge = rep.level === 'ok' ? ['badge ok', '✅ به‌نظر ایمن'] : rep.level === 'warn' ? ['badge warn', '⚠️ مشکوک'] : ['badge bad', '🚫 خطرناک'];
      const card = el('div', { class: rep.level === 'ok' ? 'ok-box' : rep.level === 'warn' ? 'warn-box' : 'err-box', style: 'margin-top:12px' });
      card.append(
        el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
          el('span', { class: badge[0] }, badge[1]),
          el('span', { class: 'hint', style: 'margin:0' }, `امتیاز ریسک: ${faNum(rep.score)}`)),
      );
      if (rep.flags.length) {
        card.append(el('ul', { style: 'margin:8px 0 0;padding-inline-start:18px;font-size:.78rem;line-height:2' },
          ...rep.flags.map((f) => el('li', {}, f.fa))));
      } else {
        card.append(el('div', { style: 'font-size:.78rem;margin-top:6px' }, 'هیچ پرچم قرمز ساختاری پیدا نشد.'));
      }
      card.append(el('div', { class: 'hint', style: 'margin-top:8px' }, SAFETY_HINT));
      resBox.append(card);

      const open = () => {
        if (rep.level !== 'ok' && !confirm(rep.level === 'bad' ? '🚫 این لینک خطرناک به نظر می‌رسد! باز هم باز شود؟' : '⚠️ این لینک مشکوک است. باز هم باز شود؟')) return;
        window.open(rep.url.href, '_blank', 'noopener');
      };
      actions.append(el('button', { class: rep.level === 'bad' ? 'btn danger sm' : 'btn primary sm', onclick: open }, '🌐 باز کردن لینک'));
    }
    if (type === 'tel') actions.append(el('button', { class: 'btn primary sm', onclick: () => { location.href = text; } }, '📞 تماس'));
    if (type === 'mail') actions.append(el('button', { class: 'btn primary sm', onclick: () => { location.href = text; } }, '✉️ ارسال ایمیل'));
    if (type === 'wifi') {
      const w = parseWifi(text);
      resBox.append(el('div', { class: 'stats' },
        el('span', { class: 'stat' }, 'SSID: ', el('b', {}, w.ssid || '—')),
        el('span', { class: 'stat' }, 'رمز: ', el('b', {}, w.pass || 'ندارد')),
        el('span', { class: 'stat' }, 'نوع: ', el('b', {}, w.type))));
    }
    resBox.append(actions);
  };

  /* ── decode ── */
  const decodeCanvas = async (canvas) => {
    const jsQR = await loadJsQR(); // تنها نقطهٔ وابستگی به کتابخانه — تنبل
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  };
  const handleDecoded = (text) => { if (text) { show(text); status.textContent = '✅ QR خوانده شد'; } };

  const loadBitmap = async (file) => {
    try { return await createImageBitmap(file); }
    catch { // مرورگرهای قدیمی‌تر: fallback به Image
      const u = URL.createObjectURL(file);
      try {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = u; });
        return img;
      } finally { URL.revokeObjectURL(u); }
    }
  };
  const fromFile = async (file) => {
    status.textContent = 'در حال خواندن…';
    let bmp;
    try { bmp = await loadBitmap(file); }
    catch { status.textContent = ''; toast('❌ فایل تصویر باز نشد', 'err'); return; }
    const canvas = document.createElement('canvas');
    const max = 1200;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    canvas.width = Math.max(1, Math.round(bmp.width * k));
    canvas.height = Math.max(1, Math.round(bmp.height * k));
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    let r;
    // جدا از catch بالا: شکستِ بارگذاری jsQR نباید «فایل باز نشد» گزارش شود
    try { r = await decodeCanvas(canvas); }
    catch { status.textContent = ''; retryHint(); return; }
    if (r && r.data) handleDecoded(r.data);
    else { resBox.style.display = 'none'; status.textContent = ''; toast('❌ QR در این تصویر پیدا نشد — تصویر واضح‌تری آپلود کن', 'err', 4000); }
  };

  const fi = el('input', { type: 'file', accept: 'image/*', class: 'input', style: 'padding:8px' });
  fi.addEventListener('change', () => { if (fi.files[0]) fromFile(fi.files[0]); fi.value = ''; });

  /* ── دوربین ── */
  const camBtn = el('button', { class: 'btn primary sm', onclick: async () => {
    if (!navigator.mediaDevices || !window.isSecureContext) { toast('❌ دوربین فقط در محیط امن (https یا localhost) کار می‌کند', 'err', 5000); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch { toast('❌ دسترسی دوربین داده نشد', 'err'); return; }
    video.srcObject = stream; video.style.display = '';
    camBtn.style.display = 'none'; stopBtn.style.display = '';
    await video.play().catch(() => {});
    scanning = true;
    const canvas = document.createElement('canvas');
    let busy = false; // دیکد حالا async است؛ بدون این نگهبان فریم‌ها روی هم تلنبار می‌شدند
    const loop = async () => {
      if (!scanning) return;
      raf = requestAnimationFrame(loop);
      if (busy || video.readyState < 2 || !video.videoWidth) return;
      busy = true;
      try {
        const k = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * k); canvas.height = Math.round(video.videoHeight * k);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const r = await decodeCanvas(canvas);
        if (!scanning) return; // کاربر در فاصلهٔ دیکد دوربین را بسته است
        if (r && r.data) { stopCam(); handleDecoded(r.data); toast('✅ QR اسکن شد'); }
      } catch {
        if (!scanning) return;
        stopCam(); retryHint();
      } finally { busy = false; }
    };
    loop();
  } }, '📷 اسکن با دوربین');
  const stopBtn = el('button', { class: 'btn danger sm', style: 'display:none', onclick: stopCam }, '⏹ توقف دوربین');

  /* ── تاریخچه ── */
  const histBox = el('div', { class: 'chip-row', style: 'margin-top:8px' });
  const drawHistory = () => {
    histBox.textContent = '';
    const h = getHist();
    if (!h.length) return;
    h.slice(0, 6).forEach((x) => histBox.append(el('button', { class: 'chip', title: x.t, onclick: () => show(x.t) }, '🕘 ', x.t.slice(0, 28), ' · ', timeAgo(x.ts))));
    histBox.append(el('button', { class: 'chip', style: 'color:var(--danger)', onclick: () => { localStorage.removeItem(HIST_KEY); drawHistory(); } }, '🗑 پاک کردن'));
  };

  root.append(
    field('ورودی ۱ — آپلود تصویر QR (گالری/فایل)', fi),
    el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
      el('div', {}, el('div', { class: 'lbl', style: 'font-weight:700' }, 'ورودی ۲ — اسکن زنده'), el('div', { style: 'display:flex;gap:8px' }, camBtn, stopBtn)),
    ),
    video,
    status,
    resBox,
    el('div', { class: 'lbl', style: 'font-weight:700;margin-top:14px' }, 'اسکن‌های اخیر (فقط روی همین دستگاه)'),
    histBox,
  );
  drawHistory();
}

register({
  id: 'qr-reader', cat: 'dev', icon: '📷',
  fa: 'QR‌خوان', en: 'QR Reader',
  desc: 'خواندن QR از آپلود تصویر یا اسکن زندهٔ دوربین + بررسی ایمنی لینک',
  keywords: ['qr', 'scan', 'اسکن', 'کیوار', 'دوربین'],
  mount: mountQrReader,
});
