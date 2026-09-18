/* IR-Toolbox — محاسبات / Math tools */
import { register } from '../js/registry.js';
import { el, field, textInput, readout, selectInput, stat, liveGroup, numOf } from '../js/ui.js';
import { faNum, faGroup, groupInt } from '../js/helpers.js';

/* Safe math: whitelist tokens, then evaluate.
 * v1.3.3: تابع‌های معکوس مثل asin( دیگر توسط جایگزینی sin( خراب نمی‌شوند (تک‌گذشته با alternation)،
 * نماد علمی 1e5 پشتیبانی می‌شود و کاما هم جداکننده آرگومان است و هم جداکننده هزارگانِ چسبیده. */
/* v1.3.7 (یافتهٔ ۱): پارسر واقعی recursive-descent به‌جای new Function —
 * فقط عدد، + - * / ** ، پرانتز، کامای آرگومان و جدول ثابت توابع Math پذیرفته می‌شود.
 * این کلاس آسیب‌پذیری (eval روی ورودی کاربر) برای همیشه حذف شد. */
export function safeEval(input) {
  let s = input
    .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/(\d)[,،٬](?=\d{3}(?!\d))/g, '$1')   // جداکنندهٔ هزارگان
    .replace(/[\s،٬]/g, '')
    .replace(/(\d+(?:\.\d+)?|\.\d+)e([+-]?\d+)/gi, '($1*10**$2)'); // نماد علمی
  const toks = [];
  const re = /(\d+\.?\d*|\.\d+)|([a-zA-Z]+)|(\*\*|\^|[-+*/(),])/g;
  let m2, last = 0;
  while ((m2 = re.exec(s))) {
    if (m2.index !== last) throw new Error('عبارت نامعتبر');
    last = re.lastIndex;
    if (m2[1] !== undefined) toks.push({ t: 'num', v: parseFloat(m2[1]) });
    else if (m2[2] !== undefined) toks.push({ t: 'id', v: m2[2].toLowerCase() });
    else toks.push({ t: 'op', v: m2[3] === '^' ? '**' : m2[3] });
  }
  if (last !== s.length || !toks.length) throw new Error('عبارت نامعتبر');
  const FUN1 = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, log: Math.log, log2: Math.log2, log10: Math.log10, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round };
  const FUN2 = { pow: Math.pow, min: Math.min, max: Math.max };
  let i = 0;
  const peek = () => toks[i];
  const eat = (v) => { const t = toks[i]; if (!t || t.t !== 'op' || t.v !== v) throw new Error('عبارت نامعتبر'); i++; };
  function expr() { let v = term(); while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) { const op = toks[i++].v; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
  function term() { let v = unary(); while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) { const op = toks[i++].v; const r = unary(); v = op === '*' ? v * r : v / r; } return v; }
  function unary() { if (peek() && peek().t === 'op' && (peek().v === '-' || peek().v === '+')) { const op = toks[i++].v; const v = unary(); return op === '-' ? -v : v; } return power(); }
  function power() { const b = atom(); if (peek() && peek().t === 'op' && peek().v === '**') { i++; return b ** unary(); } return b; } // v1.3.7 (یافتهٔ ۱۳): -2^2 = -(2^2)
  function atom() {
    const t = peek();
    if (!t) throw new Error('عبارت نامعتبر');
    if (t.t === 'num') { i++; return t.v; }
    if (t.t === 'id') {
      i++;
      if (t.v === 'pi') return Math.PI;
      if (t.v === 'e') return Math.E;
      if (FUN1[t.v]) { eat('('); const a = expr(); eat(')'); return FUN1[t.v](a); }
      if (FUN2[t.v]) { eat('('); const a = expr(); eat(','); const b = expr(); eat(')'); return FUN2[t.v](a, b); }
      throw new Error('عبارت نامعتبر');
    }
    if (t.t === 'op' && t.v === '(') { i++; const v = expr(); eat(')'); return v; }
    throw new Error('عبارت نامعتبر');
  }
  const v = expr();
  if (i !== toks.length) throw new Error('عبارت نامعتبر');
  if (typeof v !== 'number' || !isFinite(v)) throw new Error('نتیجه عددی نیست');
  return v;
}

/* ── ماشین‌حساب ── */
register({
  id: 'calculator', cat: 'math', icon: '🧮',
  fa: 'ماشین‌حساب علمی', en: 'Scientific Calculator',
  desc: 'عبارت ریاضی با sqrt، sin، pow و… — ارزیابی امن',
  keywords: ['calc', 'calculator', 'ماشین', 'حساب'],
  mount(root) {
    const inp = textInput({ mono: true, value: '(12+8)*2 - sqrt(16)' });
    const out = readout();
    const run = () => {
      if (inp.value.trim() === '') { out.clear(); return; }
      try { out.set(faGroup(safeEval(inp.value))); }
      catch (e) { out.set('❌ ' + e.message); }
    };
    inp.addEventListener('input', run); run();
    const quick = (t) => { inp.value += t; run(); };
    root.append(field('عبارت (مثال: 2^10 یا sqrt(144))', inp),
      el('div', { class: 'dash-actions' },
        ['sqrt(', 'sin(', 'cos(', 'pow(', 'pi', '(', ')'].map((t) =>
          el('button', { class: 'btn tonal sm mono', onclick: () => quick(t) }, t))),
      out.root);
  }
});

/* ── درصد ── */
register({
  id: 'percent', cat: 'math', icon: '٪',
  fa: 'ماشین‌حساب درصد', en: 'Percentage Calculator',
  desc: 'X٪ از Y، تغییر درصدی، افزایش/کاهش',
  keywords: ['percent', 'درصد'],
  mount(root) {
    const a = liveGroup(textInput({ mono: true, value: '20' }));
    const b = liveGroup(textInput({ mono: true, value: '150' }));
    const out = el('div', { class: 'stats' });
    const run = () => {
      if (a.value.trim() === '' || b.value.trim() === '') { out.textContent = ''; return; }
      const x = numOf(a.value), y = numOf(b.value);
      out.textContent = '';
      // v1.3.4: ورودی غیرعددی یا بی‌نهایت = پیام خطا به‌جای «ناعدد»/∞
      if (!isFinite(x) || !isFinite(y)) { out.append(el('span', { class: 'badge bad' }, '❌ عدد نامعتبر')); return; }
      out.append(
        stat(`${faGroup(a.value)}٪ از ${faGroup(b.value)}`, faGroup(+(x * y / 100).toFixed(4))),
        stat('افزایش', faGroup(+(y * (1 + x / 100)).toFixed(4))),
        stat('کاهش', faGroup(+(y * (1 - x / 100)).toFixed(4))),
        stat('تغییر از b به a', y === 0 ? '—' : faGroup(+(((x - y) / y) * 100).toFixed(2)) + '٪'),
      );
    };
    [a, b].forEach((i) => i.addEventListener('input', run)); run();
    root.append(el('div', { class: 'grid2' }, field('درصد (X)', a), field('مقدار (Y)', b)), out);
  }
});

/* ── تبدیل واحد ── */
const UNITS = {
  length: { fa: 'طول', u: { 'میلی‌متر': 0.001, 'سانتی‌متر': 0.01, 'متر': 1, 'کیلومتر': 1000, 'اینچ': 0.0254, 'فوت': 0.3048, 'مایل': 1609.34 } },
  weight: { fa: 'وزن', u: { 'میلی‌گرم': 1e-6, 'گرم': 0.001, 'کیلوگرم': 1, 'تن': 1000, 'اونس': 0.0283495, 'پوند': 0.453592 } },
  data: { fa: 'داده', u: { 'بایت': 1, 'کیلوبایت': 1024, 'مگابایت': 1024 ** 2, 'گیگابایت': 1024 ** 3, 'ترابایت': 1024 ** 4 } },
  temp: { fa: 'دما', u: { 'سلسیوس': 1, 'فارنهایت': 1, 'کلوین': 1 } },
};
register({
  id: 'units', cat: 'math', icon: '⚖️',
  fa: 'تبدیل واحد', en: 'Unit Converter',
  desc: 'طول، وزن، داده و دما',
  keywords: ['unit', 'convert', 'واحد', 'تبدیل'],
  mount(root) {
    const catSel = selectInput(Object.entries(UNITS).map(([k, v]) => [k, v.fa]));
    const val = liveGroup(textInput({ mono: true, value: '1' }));
    const fromSel = selectInput(Object.keys(UNITS.length.u).map((u) => [u, u]));
    const toSel = selectInput(Object.keys(UNITS.length.u).map((u) => [u, u]));
    const out = readout();
    const fill = () => {
      const u = Object.keys(UNITS[catSel.value].u);
      for (const s of [fromSel, toSel]) { s.textContent = ''; u.forEach((k) => s.append(el('option', { value: k }, k))); }
      toSel.selectedIndex = Math.min(1, u.length - 1);
      run();
    };
    const conv = (v, f, t) => {
      if (catSel.value === 'temp') {
        let c = f === 'سلسیوس' ? v : f === 'فارنهایت' ? (v - 32) * 5 / 9 : v - 273.15;
        return t === 'سلسیوس' ? c : t === 'فارنهایت' ? c * 9 / 5 + 32 : c + 273.15;
      }
      const u = UNITS[catSel.value].u;
      return v * u[f] / u[t];
    };
    const run = () => {
      if (val.value.trim() === '') { out.clear(); return; }
      const v = numOf(val.value);
      if (!isFinite(v)) { out.set('❌ عدد نامعتبر'); return; } // v1.3.4
      const r = conv(v, fromSel.value, toSel.value);
      out.set(`${faGroup(+r.toPrecision(8))} ${toSel.value}`);
    };
    catSel.addEventListener('change', fill);
    [val, fromSel, toSel].forEach((x) => x.addEventListener('input', run));
    fill();
    root.append(field('دسته', catSel), field('مقدار', val), el('div', { class: 'grid2' }, field('از', fromSel), field('به', toSel)), out.root);
  }
});

/* ── BMI ─ */
register({
  id: 'bmi', cat: 'math', icon: '🫀',
  fa: 'شاخص توده بدنی', en: 'BMI Calculator',
  desc: 'BMI + دسته‌بندی سازمان جهانی بهداشت',
  keywords: ['bmi', 'weight', 'سلامتی'],
  mount(root) {
    const w = liveGroup(textInput({ mono: true, value: '70' }));
    const h = liveGroup(textInput({ mono: true, value: '175' }));
    const out = el('div', { class: 'stats' });
    const run = () => {
      const wm = numOf(w.value), hm = numOf(h.value) / 100;
      if (!wm || !hm) { out.textContent = ''; return; }
      if (wm <= 0 || hm <= 0 || !isFinite(wm) || !isFinite(hm)) { out.textContent = ''; out.append(el('span', { class: 'badge bad' }, '❌ وزن و قد باید عدد مثبت باشند')); return; } // v1.3.4
      const bmi = wm / (hm * hm);
      const cat = bmi < 18.5 ? ['کمبود وزن', 'warn'] : bmi < 25 ? ['نرمال', 'ok'] : bmi < 30 ? ['اضافه وزن', 'warn'] : ['چاقی', 'bad'];
      out.textContent = '';
      out.append(stat('BMI', faNum(bmi.toFixed(1))), el('span', { class: `badge ${cat[1]}` }, cat[0]));
    };
    [w, h].forEach((i) => i.addEventListener('input', run)); run();
    root.append(el('div', { class: 'grid2' }, field('وزن (kg)', w), field('قد (cm)', h)), out,
      el('div', { class: 'hint' }, 'این ابزار صرفاً جنبه اطلاع‌رسانی دارد و جایگزین مشاوره پزشکی نیست.'));
  }
});

/* ── عدد تصادفی ── */
register({
  id: 'random', cat: 'math', icon: '🎲',
  fa: 'عدد تصادفی', en: 'Random Number',
  desc: 'بازه دلخواه با crypto (بدون تکرار اختیاری)',
  keywords: ['random', 'تصادفی'],
  mount(root) {
    const min = liveGroup(textInput({ mono: true, value: '1' }));
    const max = liveGroup(textInput({ mono: true, value: '100' }));
    const out = readout();
    const gen = () => {
      const lo = numOf(min.value), hi = numOf(max.value);
      if (!isFinite(lo) || !isFinite(hi) || hi < lo) { out.set('❌ بازه نامعتبر'); return; }
      if (hi === lo) { out.set(faGroup(lo)); return; } // v1.3.4: بازهٔ تک‌عدد = خود عدد
      const range = hi - lo + 1;
      if (range > 4294967296) { out.set('❌ بازه بزرگ‌تر از ۲^۳۲ پشتیبانی نمی‌شود'); return; }
      // v1.3.3: rejection sampling — بدون بایاس modulo
      const buf = new Uint32Array(1);
      const limit = Math.floor(4294967296 / range) * range;
      let x;
      do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      out.set(faGroup(lo + (x % range)));
    };
    root.append(el('div', { class: 'grid2' }, field('از', min), field('تا', max)),
      el('button', { class: 'btn primary', onclick: gen }, '🎲 تولید'), out.root);
  }
});

/* ── جداکنندهٔ ۳ رقمی ── */
register({
  id: 'num-group', cat: 'math', icon: '🧾',
  fa: 'جداکنندهٔ ۳ رقمی', en: 'Digit Grouping',
  desc: '150000 → 150,000 به‌همراه نسخهٔ فارسی',
  keywords: ['group', 'separator', 'جداکننده', 'سه رقم'],
  mount(root) {
    const inp = textInput({ mono: true, placeholder: '150000', inputmode: 'decimal' });
    const out = readout();
    const note = el('div', { style: 'margin-top:8px' });
    const run = () => {
      note.textContent = '';
      const raw = inp.value.trim();
      if (!raw) { out.clear(); return; }
      const hadSep = /[,،٬]/.test(raw) || /\d[,،٬ ]\d{3}/.test(raw);
      const clean = raw.replace(/[,،٬\s]/g, '')
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
      if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(clean)) { out.set('❌ ورودی عدد نیست'); return; }
      const [int, dec] = clean.split('.');
      const grouped = groupInt(int === '' ? '0' : int); // v1.3.7: خطی به‌جای رجکس O(n²)
      out.set(`${grouped}${dec !== undefined ? '.' + dec : ''}\n${faGroup(clean)}`);
      if (hadSep) note.append(el('span', { class: 'warn-box', style: 'display:inline-block' }, 'این ورودی از قبل جداکننده دارد؛ نیازی به جداسازی نبود 🙂'));
    };
    inp.addEventListener('input', run);
    root.append(field('عدد', inp), out.root, note);
  }
});
