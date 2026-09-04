/* IR-Toolbox — زمان / Time tools — با تقویم فارسی شمسی (پیکر جلالی) */
import { register, setCleanup } from '../js/registry.js';

/* v1.3.4: تاریخ پیش‌فرض محلی (UTC حوالی نیمه‌شب یک روز عقب بود) */
const localISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
import { el, field, textInput, selectInput, readout, stat } from '../js/ui.js';
import { faNum, faGroup } from '../js/helpers.js';
import { gregorianToJalali, jalaliToGregorian, jalaliMonthName, jalaliMonthLength } from '../js/jalaali.js';

const MONTHS = Array.from({ length: 12 }, (_, i) => jalaliMonthName(i + 1));

/* ── پیکر تاریخ شمسی (سال/ماه/روز با اعداد فارسی) ── */
export function jalaaliPicker(defaults = {}) {
  const now = gregorianToJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  // fix: بازهٔ ۱۳۵۰ تا ۱۴۵۰ اجازهٔ واردکردن تاریخ تولد پیش از ۱۳۵۰ را در «محاسبه سن» نمی‌داد
  const y0 = 1300, y1 = Math.max(1450, now.jy + 20);
  const year = selectInput(Array.from({ length: y1 - y0 + 1 }, (_, i) => [String(y0 + i), faNum(y0 + i)]), String(defaults.y ?? now.jy));
  const month = selectInput(MONTHS.map((m, i) => [String(i + 1), m]), String(defaults.m ?? now.jm));
  const day = selectInput([]);
  const cbs = new Set();
  let desired = defaults.d ?? now.jd;

  function fillDays() {
    const len = jalaliMonthLength(+year.value, +month.value);
    const cur = desired || +day.value || 1;
    day.textContent = '';
    for (let i = 1; i <= len; i++) day.append(el('option', { value: String(i) }, faNum(i)));
    day.value = String(Math.min(cur, len));
    desired = +day.value;
  }
  year.addEventListener('change', () => { fillDays(); cbs.forEach((f) => f()); });
  month.addEventListener('change', () => { fillDays(); cbs.forEach((f) => f()); });
  // fix: روزِ انتخابی کاربر حفظ می‌شود؛ قبلاً با تغییر ماه/سال، روز به مقدار اولیه برمی‌گشت
  day.addEventListener('change', () => { desired = +day.value; cbs.forEach((f) => f()); });
  fillDays();

  const root = el('div', { class: 'grid2', style: 'grid-template-columns:1fr 1fr 1fr' },
    field('سال', year), field('ماه', month), field('روز', day));
  return {
    root,
    get: () => ({ jy: +year.value, jm: +month.value, jd: +day.value }),
    onChange: (fn) => cbs.add(fn),
  };
}

/* ورودی تاریخ دوحالته: شمسی (پیکر) یا میلادی (date) */
function dualDate(label) {
  const pick = jalaaliPicker();
  const g = el('input', { type: 'date', class: 'input', value: localISO() });
  const seg = el('div', { class: 'seg', style: 'margin-bottom:8px' });
  const box = el('div', {});
  let mode = 'j';
  const cbs = new Set();
  const draw = () => {
    box.textContent = '';
    box.append(mode === 'j' ? pick.root : field('تاریخ میلادی', g));
    [...seg.children].forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
    cbs.forEach((f) => f());
  };
  seg.append(
    el('button', { dataset: { m: 'j' }, onclick: () => { mode = 'j'; draw(); } }, 'شمسی 🇮🇷'),
    el('button', { dataset: { m: 'g' }, onclick: () => { mode = 'g'; draw(); } }, 'میلادی'));
  pick.onChange(() => cbs.forEach((f) => f()));
  g.addEventListener('change', () => cbs.forEach((f) => f()));
  draw();
  return {
    root: field(label, el('div', {}, seg, box)),
    onChange: (fn) => cbs.add(fn),
    /* برمی‌گرداند {jy,jm,jd} */
    getJalali: () => {
      if (mode === 'j') return pick.get();
      if (!g.value) return null;
      const [gy, gm, gd] = g.value.split('-').map(Number);
      return gregorianToJalali(gy, gm, gd);
    },
  };
}

/* ── تبدیل تاریخ ── */
register({
  id: 'date-conv', cat: 'time', icon: '📅',
  fa: 'تبدیل تاریخ شمسی ↔ میلادی', en: 'Jalali ↔ Gregorian',
  desc: 'تبدیل دوطرفه دقیق + نام روز هفته',
  keywords: ['date', 'jalali', 'shamsi', 'تاریخ', 'شمسی', 'تقویم'],
  mount(root) {
    const pick = jalaaliPicker();
    const out1 = readout();
    const run1 = () => {
      const { jy, jm, jd } = pick.get();
      const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
      const d = new Date(Date.UTC(gy, gm - 1, gd));
      out1.set(`میلادی: ${gy}/${String(gm).padStart(2, '0')}/${String(gd).padStart(2, '0')}\n${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(d)}\nروز هفته: ${new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(d)}`);
    };
    pick.onChange(run1); run1();

    const g = el('input', { type: 'date', class: 'input', value: localISO() });
    const out2 = readout();
    const run2 = () => {
      const [gy, gm, gd] = g.value.split('-').map(Number);
      if (!gy) { out2.clear(); return; }
      const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
      const d = new Date(Date.UTC(gy, gm - 1, gd));
      out2.set(`شمسی: ${faNum(jd)} ${MONTHS[jm - 1]} ${faNum(jy)}\nروز هفته: ${new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(d)}`);
    };
    g.addEventListener('change', run2); run2();

    root.append(
      el('div', { class: 'card', style: 'padding:16px' },
        el('div', { class: 'lbl', style: 'font-weight:700;margin-bottom:10px' }, 'شمسی ← میلادی (تقویم جلالی)'),
        pick.root, out1.root),
      el('div', { class: 'card', style: 'padding:16px' },
        el('div', { class: 'lbl', style: 'font-weight:700;margin-bottom:10px' }, 'میلادی ← شمسی'),
        field('تاریخ میلادی', g), out2.root),
    );
  }
});

/* ── سن ── */
register({
  id: 'age', cat: 'time', icon: '🎂',
  fa: 'محاسبه سن', en: 'Age Calculator',
  desc: 'ورودی شمسی یا میلادی — سن دقیق سال/ماه/روز شمسی',
  keywords: ['age', 'سن', 'تولد'],
  mount(root) {
    const inp = dualDate('تاریخ تولد');
    const out = el('div', { class: 'stats' });
    const run = () => {
      const b = inp.getJalali();
      if (!b) { out.textContent = ''; return; }
      const now = new Date();
      const t = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
      let y = t.jy - b.jy, m = t.jm - b.jm, d = t.jd - b.jd;
      // fix: قرض‌گرفتن روز از «ماه قبل از ماه جاری» با سالِ درست (فروردین ← اسفندِ سال قبل)
      if (d < 0) { m -= 1; const pm = t.jm === 1 ? 12 : t.jm - 1; const py = t.jm === 1 ? t.jy - 1 : t.jy; d += jalaliMonthLength(py, pm); }
      if (m < 0) { y -= 1; m += 12; }
      if (y < 0) { out.textContent = ''; out.append(el('span', { class: 'badge warn' }, 'تاریخ تولد در آینده است!')); return; }
      const gOf = jalaliToGregorian(b.jy, b.jm, b.jd);
      // v1.3.3: «کل روز» از تفاوت نیمه‌شب UTC دو تاریخ — بدون خطای ±۱ ناشی از ساعت محلی
      const tgg = jalaliToGregorian(t.jy, t.jm, t.jd);
      const days = Math.round((Date.UTC(tgg.gy, tgg.gm - 1, tgg.gd) - Date.UTC(gOf.gy, gOf.gm - 1, gOf.gd)) / 864e5);
      out.textContent = '';
      out.append(
        stat('سن', `${faNum(y)} سال و ${faNum(m)} ماه و ${faNum(d)} روز`),
        stat('کل روز', faGroup(days)),
        stat('تولد', `${faNum(b.jd)} ${MONTHS[b.jm - 1]}`));
    };
    inp.onChange(run); run();
    root.append(inp.root, out,
      el('div', { class: 'hint' }, 'تاریخ تولد را شمسی یا میلادی وارد کنید؛ سن بر اساس تقویم شمسی محاسبه می‌شود.'));
  }
});

/* ── اختلاف دو تاریخ ── */
register({
  id: 'date-diff', cat: 'time', icon: '⏳',
  fa: 'اختلاف دو تاریخ', en: 'Date Difference',
  desc: 'روز/هفته/ماه بین دو تاریخ شمسی یا میلادی',
  keywords: ['diff', 'اختلاف', 'روز'],
  mount(root) {
    const a = dualDate('از تاریخ');
    const b = dualDate('تا تاریخ');
    const out = el('div', { class: 'stats' });
    const run = () => {
      const ja = a.getJalali(), jb = b.getJalali();
      if (!ja || !jb) { out.textContent = ''; return; }
      const ga = jalaliToGregorian(ja.jy, ja.jm, ja.jd);
      const gb = jalaliToGregorian(jb.jy, jb.jm, jb.jd);
      const days = Math.abs(Math.round((Date.UTC(gb.gy, gb.gm - 1, gb.gd) - Date.UTC(ga.gy, ga.gm - 1, ga.gd)) / 864e5)); // fix: gb.jd/ga.jd وجود نداشت → خروجی NaN
      out.textContent = '';
      out.append(stat('روز', faGroup(days)), stat('هفته', `${faGroup(Math.floor(days / 7))} و ${faNum(days % 7)}`), stat('ماه تقریبی', faGroup(Math.round(days / 30.44))));
    };
    a.onChange(run); b.onChange(run); run();
    root.append(a.root, b.root, out);
  }
});

/* ── کرنومتر ── */
register({
  id: 'stopwatch', cat: 'time', icon: '⏱️',
  fa: 'کرنومتر', en: 'Stopwatch',
  desc: 'شروع/توقف دقیق با ثبت دور (lap)',
  keywords: ['stopwatch', 'کرنومتر'],
  mount(root) {
    const disp = el('div', { class: 'game-stage mono', style: 'font-size:2.6rem;direction:ltr' }, '00:00.0');
    const laps = el('div', { class: 'stats', style: 'margin-top:10px' });
    let t0 = 0, acc = 0, timer = null;
    const fmt = (ms) => {
      const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, d = Math.floor(ms / 100) % 10;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
    };
    const tick = () => { disp.textContent = fmt(acc + (timer ? Date.now() - t0 : 0)); };
    const start = () => { if (timer) return; t0 = Date.now(); timer = setInterval(tick, 80); };
    const stop = () => { if (!timer) return; acc += Date.now() - t0; clearInterval(timer); timer = null; disp.textContent = fmt(acc); };
    setCleanup(() => { clearInterval(timer); timer = null; }); // v1.3.4
    root.append(disp,
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary', onclick: start }, '▶ شروع'),
        el('button', { class: 'btn tonal', onclick: stop }, '⏸ توقف'),
        el('button', { class: 'btn tonal', onclick: () => { if (timer) laps.append(el('span', { class: 'stat' }, 'دور: ' + fmt(acc + Date.now() - t0))); } }, '🚩 دور'),
        el('button', { class: 'btn danger', onclick: () => { clearInterval(timer); timer = null; acc = 0; disp.textContent = '00:00.0'; laps.textContent = ''; } }, '↺ صفر')),
      laps,
      el('div', { class: 'hint' }, '«توقف» فقط وقتی کرنومتر در حال کار است زمان را ثبت می‌کند؛ کلیک تکراری زمان را تغییر نمی‌دهد.'));
  }
});

/* ── تایمر شمارش معکوس ── */
register({
  id: 'timer', cat: 'time', icon: '⏲️',
  fa: 'تایمر شمارش معکوس', en: 'Countdown Timer',
  desc: 'با هشدار صوتی و لرزشی در پایان',
  keywords: ['timer', 'countdown', 'تایمر'],
  mount(root) {
    const m = textInput({ mono: true, value: '5', type: 'number', min: 0 });
    const s = textInput({ mono: true, value: '0', type: 'number', min: 0 });
    const disp = el('div', { class: 'game-stage mono', style: 'font-size:2.6rem;direction:ltr' }, '--:--');
    let timer = null, actx = null;
    // fix: AudioContext ساخته‌شده خارج از کلیک کاربر، به‌خاطر سیاست autoplay مرورگر «معلق» می‌ماند و هشدار صدا نداشت؛
    // حالا هنگام کلیک «شروع» ساخته/فعال می‌شود و همان برای بیپ استفاده می‌شود.
    const armAudio = () => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!actx) actx = new AC();
        if (actx.state === 'suspended') actx.resume().catch(() => {});
      } catch {}
    };
    const beep = () => {
      try {
        const ctx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        [0, 0.25, 0.5].forEach((t) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
          g.gain.setValueAtTime(0.15, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
          o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
        });
      } catch {}
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    };
    const start = () => {
      clearInterval(timer); timer = null;
      armAudio();
      let left = Math.floor(Math.max(0, Number(m.value) || 0) * 60 + Math.max(0, Number(s.value) || 0)); // fix: مقدار منفی/اعشاری نمایش را خراب می‌کرد
      if (left <= 0) { disp.textContent = '--:--'; return; }
      const show = () => disp.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      show();
      timer = setInterval(() => {
        left -= 1; show();
        if (left <= 0) { clearInterval(timer); timer = null; disp.textContent = '⏰ تمام شد!'; beep(); }
      }, 1000);
    };
    setCleanup(() => { clearInterval(timer); timer = null; if (actx) { actx.close().catch(() => {}); actx = null; } }); // v1.3.4
    root.append(el('div', { class: 'grid2' }, field('دقیقه', m), field('ثانیه', s)), disp,
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary', onclick: start }, '▶ شروع'),
        el('button', { class: 'btn danger', onclick: () => { clearInterval(timer); timer = null; disp.textContent = '--:--'; } }, '⏹ توقف')));
  }
});
