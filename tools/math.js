/* IR-Toolbox — محاسبات / Math tools */
import { register } from '../js/registry.js';
import { el, field, textInput, readout, selectInput, stat } from '../js/ui.js';
import { faNum, faGroup } from '../js/helpers.js';

/* Safe math: whitelist tokens, then evaluate. */
export function safeEval(input) {
  let s = input
    .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/[\s,،٬]/g, '')
    .replace(/\^/g, '**');
  const words = 'sqrt|sin|cos|tan|asin|acos|atan|log10|log2|log|abs|pow|min|max|floor|ceil|round|pi|e';
  let stripped = s.replace(new RegExp(words, 'g'), '');
  if (!/^[\d+\-*/().*]*$/.test(stripped)) throw new Error('عبارت نامعتبر');
  s = s.replace(/log10\(/g, 'Math.log10(').replace(/log2\(/g, 'Math.log2(').replace(/log\(/g, 'Math.log(')
    .replace(/sqrt\(/g, 'Math.sqrt(').replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(').replace(/tan\(/g, 'Math.tan(')
    .replace(/asin\(/g, 'Math.asin(').replace(/acos\(/g, 'Math.acos(').replace(/atan\(/g, 'Math.atan(')
    .replace(/abs\(/g, 'Math.abs(').replace(/pow\(/g, 'Math.pow(').replace(/min\(/g, 'Math.min(').replace(/max\(/g, 'Math.max(')
    .replace(/floor\(/g, 'Math.floor(').replace(/ceil\(/g, 'Math.ceil(').replace(/round\(/g, 'Math.round(')
    .replace(/pi/g, 'Math.PI').replace(/(^|[^.a-zA-Z])e/g, '$1Math.E');
  const v = new Function(`"use strict"; return (${s});`)();
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
    const a = textInput({ mono: true, value: '20' });
    const b = textInput({ mono: true, value: '150' });
    const out = el('div', { class: 'stats' });
    const run = () => {
      if (a.value.trim() === '' || b.value.trim() === '') { out.textContent = ''; return; }
      const x = Number(a.value), y = Number(b.value);
      out.textContent = '';
      out.append(
        stat(`${faGroup(a.value)}٪ از ${faGroup(b.value)}`, faGroup(+(x * y / 100).toFixed(4))),
        stat('افزایش', faGroup(+(y * (1 + x / 100)).toFixed(4))),
        stat('کاهش', faGroup(+(y * (1 - x / 100)).toFixed(4))),
        stat('تغییر از b به a', faGroup(+(((x - y) / y) * 100).toFixed(2)) + '٪'),
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
    const val = textInput({ mono: true, value: '1' });
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
      const r = conv(Number(val.value), fromSel.value, toSel.value);
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
    const w = textInput({ mono: true, value: '70' });
    const h = textInput({ mono: true, value: '175' });
    const out = el('div', { class: 'stats' });
    const run = () => {
      const wm = Number(w.value), hm = Number(h.value) / 100;
      if (!wm || !hm) { out.textContent = ''; return; }
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
    const min = textInput({ mono: true, value: '1' });
    const max = textInput({ mono: true, value: '100' });
    const out = readout();
    const gen = () => {
      const lo = Number(min.value), hi = Number(max.value);
      if (!(hi > lo)) { out.set('❌ بازه نامعتبر'); return; }
      const range = hi - lo + 1;
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      out.set(faGroup(lo + (buf[0] % range)));
    };
    root.append(el('div', { class: 'grid2' }, field('از', min), field('تا', max)),
      el('button', { class: 'btn primary', onclick: gen }, '🎲 تولید'), out.root);
  }
});
