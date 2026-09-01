/* IR-Toolbox — توسعه‌دهنده / Developer tools */
import { register } from '../js/registry.js';
import { el, field, areaInput, textInput, readout, copyBtn, stat } from '../js/ui.js';
import { faNum, escapeHTML } from '../js/helpers.js';

/* v1.3.3: رمزگذاری تکه‌تکه — متن‌های بزرگ دیگر استک را سرریز نمی‌کنند */
const utf8b64encode = (s) => {
  const u8 = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCodePoint(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
};
const utf8b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0)));

/* ── فرمت‌کننده JSON ── */
register({
  id: 'json-formatter', cat: 'dev', icon: '🧾',
  fa: 'فرمت‌کننده JSON', en: 'JSON Formatter',
  desc: 'زیباسازی، فشرده‌سازی و اعتبارسنجی با نمایش خطای دقیق',
  keywords: ['json', 'format', 'validate'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 8, placeholder: '{ "example": true }' });
    const out = readout('نتیجه این‌جا…');
    const errBox = el('div', { class: 'err-box', style: 'display:none' });
    const indent = el('select', { class: 'input', style: 'width:auto' },
      el('option', { value: '2' }, '2 فضای خالی'),
      el('option', { value: '4' }, '4 فضای خالی'),
      el('option', { value: 'tab' }, 'Tab'));
    const parse = () => {
      errBox.style.display = 'none';
      try { return JSON.parse(ta.value); }
      catch (e) {
        const m = e.message.match(/position (\d+)/);
        let loc = '';
        if (m) {
          const pos = +m[1];
          const upto = ta.value.slice(0, pos);
          loc = ` — خط ${faNum((upto.match(/\n/g) || []).length + 1)}، ستون ${faNum(pos - upto.lastIndexOf('\n'))}`;
        }
        errBox.textContent = `JSON نامعتبر است: ${e.message}${loc}`;
        errBox.style.display = 'block';
        return undefined;
      }
    };
    const fmt = () => { const v = parse(); if (v !== undefined) out.set(JSON.stringify(v, null, indent.value === 'tab' ? '\t' : +indent.value)); };
    const min = () => { const v = parse(); if (v !== undefined) out.set(JSON.stringify(v)); };
    const val = () => { if (parse() !== undefined) { errBox.style.display = 'none'; out.box.innerHTML = ''; out.box.append(el('span', { class: 'ok-box', style: 'display:inline-block' }, '✅ JSON معتبر است')); } };
    ta.addEventListener('input', () => { if (!ta.value.trim()) { out.clear(); errBox.style.display = 'none'; } });
    root.append(
      field('JSON ورودی', ta),
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary sm', onclick: fmt }, 'زیباسازی'),
        el('button', { class: 'btn tonal sm', onclick: min }, 'فشرده‌سازی'),
        el('button', { class: 'btn tonal sm', onclick: val }, 'اعتبارسنجی'),
        el('span', {}, indent)),
      errBox, out.root
    );
  }
});

/* ── Base64 ── */
register({
  id: 'base64', cat: 'dev', icon: '📦',
  fa: 'Base64', en: 'Base64 Encode/Decode',
  desc: 'کدگذاری و رمزگشایی متن با پشتیبانی UTF-8 (فارسی)',
  keywords: ['base64', 'encode', 'decode'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 5, placeholder: 'متن یا Base64…' });
    const out = readout();
    const err = el('div', { class: 'err-box', style: 'display:none' });
    const enc = () => { err.style.display = 'none'; out.set(utf8b64encode(ta.value)); };
    const dec = () => {
      try { out.set(utf8b64decode(ta.value)); err.style.display = 'none'; }
      catch { err.textContent = 'ورودی Base64 معتبر نیست'; err.style.display = 'block'; }
    };
    ta.addEventListener('input', () => { if (!ta.value) { out.clear(); err.style.display = 'none'; } });
    root.append(field('ورودی', ta),
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary sm', onclick: enc }, 'کدگذاری ←'),
        el('button', { class: 'btn tonal sm', onclick: dec }, '→ رمزگشایی')),
      err, out.root);
  }
});

/* ── URL ── */
register({
  id: 'url-codec', cat: 'dev', icon: '🔗',
  fa: 'کدگذاری URL', en: 'URL Encode/Decode',
  desc: 'encodeURIComponent و برعکس',
  keywords: ['url', 'encode', 'query'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 4 });
    const out = readout();
    ta.addEventListener('input', () => { if (!ta.value) out.clear(); });
    root.append(field('ورودی', ta),
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary sm', onclick: () => out.set(encodeURIComponent(ta.value)) }, 'کدگذاری'),
        el('button', { class: 'btn tonal sm', onclick: () => { try { out.set(decodeURIComponent(ta.value)); } catch { out.set('❌ نامعتبر'); } } }, 'رمزگشایی')),
      out.root);
  }
});

/* ── اسلاگ ── */
register({
  id: 'slug', cat: 'dev', icon: '🐌',
  fa: 'اسلاگ‌ساز', en: 'Slug Generator',
  desc: 'تبدیل عنوان فارسی/انگلیسی به slug خوانا',
  keywords: ['slug', 'url', 'permalink'],
  mount(root) {
    const inp = textInput({ placeholder: 'عنوان مقاله یا محصول…' });
    const out = readout();
    const run = () => {
      const faMap = { 'ا':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l','م':'m','ن':'n','و':'v','ه':'h','ی':'y','آ':'a','ئ':'y','ء':'' };
      let s = inp.value.trim().toLowerCase();
      s = [...s].map((ch) => faMap[ch] !== undefined ? faMap[ch] : ch).join('');
      s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      out.set(s);
    };
    inp.addEventListener('input', run);
    root.append(field('عنوان', inp), out.root);
  }
});

/* ── UUID ─ */
register({
  id: 'uuid', cat: 'dev', icon: '🪪',
  fa: 'تولیدکننده UUID', en: 'UUID v4 Generator',
  desc: 'شناسه یکتا با crypto.getRandomValues',
  keywords: ['uuid', 'guid', 'id'],
  mount(root) {
    const out = readout('روی «تولید» بزنید…');
    const gen = (n) => {
      const list = [];
      for (let i = 0; i < n; i++) {
        const b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
        const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
        list.push(`${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`);
      }
      out.set(list.join('\n'));
    };
    root.append(
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary', onclick: () => gen(1) }, 'تولید ۱ عدد'),
        el('button', { class: 'btn tonal', onclick: () => gen(10) }, 'تولید ۱۰ عدد')),
      out.root);
  }
});

/* ── JWT ── */
register({
  id: 'jwt', cat: 'dev', icon: '🎫',
  fa: 'رمزگشای JWT', en: 'JWT Decoder',
  desc: 'نمایش header و payload — بدون اعتبارسنجی امضا',
  keywords: ['jwt', 'token', 'decode'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 4, placeholder: 'eyJhbGciOi…' });
    const head = readout('header');
    const pay = readout('payload');
    const warn = el('div', { class: 'warn-box' }, '⚠️ این ابزار فقط توکن را باز می‌کند؛ امضا را بررسی نمی‌کند. برای اعتبارسنجی امنیتی استفاده نکنید.');
    const run = () => {
      try {
        const [h, p] = ta.value.trim().split('.');
        const dec = (s) => JSON.stringify(JSON.parse(utf8b64decode(s.replace(/-/g, '+').replace(/_/g, '/'))), null, 2);
        head.set(dec(h)); pay.set(dec(p));
      } catch { head.set('❌ توکن نامعتبر'); pay.clear(); }
    };
    ta.addEventListener('input', () => { if (!ta.value.trim()) { head.clear(); pay.clear(); } });
    root.append(field('توکن JWT', ta), warn, el('button', { class: 'btn primary', onclick: run }, 'رمزگشایی'), head.root, pay.root);
  }
});

/* ── Regex ─ */
register({
  id: 'regex', cat: 'dev', icon: '🧲',
  fa: 'آزمایش Regex', en: 'Regex Tester',
  desc: 'تست الگو روی متن با هایلایت نتیجه',
  keywords: ['regex', 'regular', 'expression'],
  mount(root) {
    const pat = textInput({ mono: true, placeholder: '\\d+' });
    const flags = textInput({ mono: true, value: 'g' });
    const ta = areaInput({ rows: 5, placeholder: 'متن آزمایش…' });
    const res = el('div', { class: 'readout', style: 'direction:rtl;text-align:start' });
    const run = () => {
      if (!pat.value || !ta.value) { res.textContent = ''; return; }
      // v1.3.3: سقف طول متن — جلوگیری از فریز شدن با الگوهای بیمار (ReDoS)
      if (ta.value.length > 20000) { res.textContent = '❌ برای جلوگیری از فریز شدن، متن آزمایش حداکثر ۲۰٬۰۰۰ کاراکتر است.'; return; }
      try {
        const re = new RegExp(pat.value, flags.value);
        const matches = ta.value.match(re);
        res.textContent = '';
        res.append(el('div', {}, matches ? `${faNum(matches.length)} تطبیق: ` : 'تطبیقی یافت نشد'),
          matches ? el('div', { class: 'stats' }, matches.slice(0, 40).map((m) => el('span', { class: 'stat' }, m || '∅'))) : '');
      } catch (e) { res.textContent = '❌ ' + e.message; }
    };
    [pat, flags, ta].forEach((x) => x.addEventListener('input', run));
    root.append(field('الگو', pat), field('پرچم‌ها', flags), field('متن', ta), el('div', { class: 'lbl' }, 'نتیجه'), res);
  }
});

/* ── HTML entities ── */
register({
  id: 'html-ent', cat: 'dev', icon: '🏷️',
  fa: 'HTML Entities', en: 'HTML Escape/Unescape',
  desc: 'تبدیل < > & و غیره به entity و برعکس',
  keywords: ['html', 'escape', 'entities'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 4 });
    const out = readout();
    ta.addEventListener('input', () => { if (!ta.value) out.clear(); });
    root.append(field('ورودی', ta),
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary sm', onclick: () => out.set(escapeHTML(ta.value)) }, 'Escape'),
        el('button', { class: 'btn tonal sm', // v1.3.3: رمزگشایی امن موجودیت‌ها با DOMParser — هیچ اسکریپت/عنصری اجرا یا بارگذاری نمی‌شود
        onclick: () => { out.set(new DOMParser().parseFromString(ta.value, 'text/html').body.textContent); } }, 'Unescape')),
      out.root);
  }
});

/* ── Timestamp ── */
register({
  id: 'timestamp', cat: 'dev', icon: '🕰️',
  fa: 'تبدیل Timestamp', en: 'Unix Timestamp Converter',
  desc: 'unix ↔ تاریخ میلادی و شمسی',
  keywords: ['timestamp', 'unix', 'epoch'],
  mount(root) {
    const now = Math.floor(Date.now() / 1000);
    const inp = textInput({ mono: true, value: String(now) });
    const out = readout();
    const run = () => {
      if (inp.value.trim() === '') { out.clear(); return; }
      const n = Number(inp.value);
      if (!isFinite(n)) { out.set('❌ عدد نامعتبر'); return; }
      // v1.3.3: آستانه ۱e۱۱ — میلی‌ثانیه‌های قبل از ۲۰۰۱ دیگر به‌اشتباه «ثانیه» خوانده نمی‌شوند
      const ms = Math.abs(n) >= 1e11 ? n : n * 1000;
      const d = new Date(ms);
      if (isNaN(d.getTime())) { out.set('❌ خارج از محدوده مجاز تاریخ'); return; } // v1.3.3: بدون کرش
      out.set(
        `ISO: ${d.toISOString()}\nمیلادی: ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'medium' }).format(d)}\nشمسی: ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'medium' }).format(d)}`
      );
    };
    inp.addEventListener('input', run); run();
    root.append(
      el('button', { class: 'btn tonal sm', onclick: () => { inp.value = String(Math.floor(Date.now() / 1000)); run(); } }, 'الان'),
      field('Unix timestamp', inp), out.root);
  }
});
