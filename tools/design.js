/* IR-Toolbox — طراحی / Design tools */
import { register } from '../js/registry.js';
import { el, field, textInput, readout, selectInput, stat } from '../js/ui.js';
import { faNum } from '../js/helpers.js';

function hexToRgb(hex) {
  const m = hex.trim().replace(/^#/, '');
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-f]{6}$/i.test(v)) return null;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrast = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/* ── تبدیل رنگ ── */
register({
  id: 'color-conv', cat: 'design', icon: '🎨',
  fa: 'تبدیل رنگ', en: 'Color Converter',
  desc: 'HEX ↔ RGB ↔ HSL با پیش‌نمایش زنده',
  keywords: ['color', 'hex', 'rgb', 'hsl', 'رنگ'],
  mount(root) {
    const color = el('input', { type: 'color', value: '#12b98b', style: 'width:56px;height:44px;border:0;background:none;cursor:pointer' });
    const hexIn = textInput({ mono: true, value: '#12b98b' });
    const swatch = el('div', { style: 'height:56px;border-radius:12px;border:1px solid var(--line)' });
    const out = readout();
    const run = (hex) => {
      const rgb = hexToRgb(hex);
      if (!rgb) { out.set('❌ HEX نامعتبر'); return; }
      const [h, s, l] = rgbToHsl(rgb);
      swatch.style.background = hex;
      out.set(`HEX: ${hex.toUpperCase()}\nRGB: rgb(${rgb.join(', ')})\nHSL: hsl(${h}, ${s}%, ${l}%)`);
    };
    color.addEventListener('input', () => { hexIn.value = color.value; run(color.value); });
    hexIn.addEventListener('input', () => { if (hexToRgb(hexIn.value)) { color.value = '#' + hexToRgb(hexIn.value).map((x) => x.toString(16).padStart(2, '0')).join(''); run(hexIn.value); } });
    run('#12b98b');
    root.append(el('div', { class: 'grid2' }, field('انتخاب رنگ', color), field('HEX', hexIn)), swatch, out.root);
  }
});

/* ── کنتراست WCAG ── */
register({
  id: 'contrast', cat: 'design', icon: '🌓',
  fa: 'بررسی کنتراست', en: 'Contrast Checker (WCAG)',
  desc: 'نسبت کنتراست و قبولی AA/AAA برای متن معمولی و بزرگ',
  keywords: ['contrast', 'wcag', 'accessibility', 'کنتراست'],
  mount(root) {
    const fg = el('input', { type: 'color', value: '#132019' });
    const bg = el('input', { type: 'color', value: '#f4f7f5' });
    const prev = el('div', { style: 'border-radius:12px;padding:18px;text-align:center;font-weight:700;border:1px solid var(--line)' }, 'نمونه متن — Sample Text');
    const ratio = el('div', { class: 'stats' });
    const run = () => {
      const a = hexToRgb(fg.value), b = hexToRgb(bg.value);
      if (!a || !b) return;
      const r = contrast(a, b);
      prev.style.color = fg.value; prev.style.background = bg.value;
      const pass = (min) => r >= min;
      ratio.textContent = '';
      ratio.append(
        stat('نسبت', faNum(r.toFixed(2)) + ':1'),
        el('span', { class: `badge ${pass(4.5) ? 'ok' : 'bad'}` }, `AA متن معمولی ${pass(4.5) ? '✔' : '✘'}`),
        el('span', { class: `badge ${pass(3) ? 'ok' : 'bad'}` }, `AA متن بزرگ ${pass(3) ? '✔' : '✘'}`),
        el('span', { class: `badge ${pass(7) ? 'ok' : 'bad'}` }, `AAA ${pass(7) ? '✔' : '✘'}`),
      );
    };
    fg.addEventListener('input', run); bg.addEventListener('input', run); run();
    root.append(el('div', { class: 'grid2' }, field('رنگ متن', fg), field('رنگ پس‌زمینه', bg)), prev, ratio);
  }
});

/* ── گرادیان ── */
register({
  id: 'gradient', cat: 'design', icon: '🌈',
  fa: 'گرادیان‌ساز CSS', en: 'CSS Gradient Builder',
  desc: 'دو رنگ + زاویه → کد CSS آماده',
  keywords: ['gradient', 'css', 'گرادیان'],
  mount(root) {
    const c1 = el('input', { type: 'color', value: '#12b98b' });
    const c2 = el('input', { type: 'color', value: '#0a6e57' });
    const ang = el('input', { type: 'range', min: 0, max: 360, value: 140, style: 'width:100%' });
    const prev = el('div', { style: 'height:90px;border-radius:14px;border:1px solid var(--line)' });
    const out = readout();
    const run = () => {
      const css = `linear-gradient(${ang.value}deg, ${c1.value}, ${c2.value})`;
      prev.style.background = css;
      out.set(`background: ${css};`);
    };
    [c1, c2, ang].forEach((x) => x.addEventListener('input', run)); run();
    root.append(el('div', { class: 'grid2' }, field('رنگ اول', c1), field('رنگ دوم', c2)), field(`زاویه: ${''}درجه`, ang), prev, out.root);
  }
});

/* ── سایه ── */
register({
  id: 'shadow', cat: 'design', icon: '🌫️',
  fa: 'سایه‌ساز CSS', en: 'Box Shadow Builder',
  desc: 'تنظیم افکت سایه با خروجی CSS',
  keywords: ['shadow', 'css', 'سایه'],
  mount(root) {
    const mk = (label, min, max, val) => field(label, el('input', { type: 'range', min, max, value: val, style: 'width:100%', dataset: { k: label } }));
    const x = mk('افقی X', -50, 50, 0), y = mk('عمودی Y', -50, 50, 8);
    const bl = mk('تاری', 0, 100, 24), sp = mk('گستردگی', -50, 50, 0);
    const op = mk('شفافیت', 0, 100, 15);
    const prev = el('div', { style: 'height:90px;margin:10px auto;width:60%;border-radius:14px;background:var(--surface)' });
    const out = readout();
    const run = () => {
      const g = (r) => +r.querySelector('input').value;
      const css = `box-shadow: ${g(x)}px ${g(y)}px ${g(bl)}px ${g(sp)}px rgba(0,0,0,${(g(op) / 100).toFixed(2)});`;
      prev.style.boxShadow = css.replace('box-shadow: ', '').replace(';', '');
      out.set(css);
    };
    [x, y, bl, sp, op].forEach((f) => f.querySelector('input').addEventListener('input', run));
    run();
    root.append(x, y, bl, sp, op, prev, out.root);
  }
});

/* ── rem/px ── */
register({
  id: 'rem-px', cat: 'design', icon: '📏',
  fa: 'تبدیل px ↔ rem', en: 'PX / REM Converter',
  desc: 'با پایه 16px (قابل تغییر)',
  keywords: ['rem', 'px', 'font-size'],
  mount(root) {
    const base = textInput({ mono: true, value: '16' });
    const px = textInput({ mono: true, value: '16' });
    const remOut = readout();
    const run = () => {
      if (px.value.trim() === '') { remOut.clear(); return; }
      const b = Number(base.value) || 16;
      remOut.set(`${(Number(px.value) / b).toFixed(4)}rem`);
    };
    [base, px].forEach((x) => x.addEventListener('input', run)); run();
    root.append(el('div', { class: 'grid2' }, field('پایه (px)', base), field('مقدار (px)', px)), remOut.root);
  }
});
