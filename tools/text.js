/* IVA — متن / Text tools */
import { register } from '../js/registry.js';
import { el, field, areaInput, readout, stat, copyBtn } from '../js/ui.js';
import { faNum, faBytes, debounce } from '../js/helpers.js';

/* ── شمارنده متن ── */
register({
  id: 'char-counter', cat: 'text', icon: '🔢',
  fa: 'شمارنده متن', en: 'Text Counter',
  desc: 'کاراکتر، کلمه، جمله، خط و زمان مطالعه',
  keywords: ['count', 'word', 'شمارش', 'کلمه'],
  mount(root) {
    const ta = areaInput({ placeholder: 'متن خود را بنویسید یا بچسبانید…', rows: 8 });
    const stats = el('div', { class: 'stats' });
    const calc = () => {
      const t = ta.value;
      if (!t) { stats.textContent = ''; return; }
      const chars = t.length;
      const noSpace = t.replace(/\s/g, '').length;
      const words = (t.trim().match(/\S+/g) || []).length;
      const sentences = (t.match(/[.!?؟۔]+/g) || []).length || (t.trim() ? 1 : 0);
      const lines = t ? t.split('\n').length : 0;
      const readMin = Math.ceil(words / 200);
      stats.textContent = '';
      stats.append(
        stat('کاراکتر', faNum(chars)),
        stat('بدون فاصله', faNum(noSpace)),
        stat('کلمه', faNum(words)),
        stat('جمله', faNum(sentences)),
        stat('خط', faNum(lines)),
        stat('بایت UTF-8', faBytes(new Blob([t]).size)),
        stat('زمان مطالعه', `${faNum(readMin)} دقیقه`),
      );
    };
    ta.addEventListener('input', debounce(calc, 120));
    calc();
    root.append(field('متن', ta), stats);
  }
});

/* ── تبدیل حروف ── */
register({
  id: 'case-converter', cat: 'text', icon: '🔠',
  fa: 'تبدیل حروف', en: 'Case Converter',
  desc: 'بزرگ، کوچک، عنوانی و معکوس',
  keywords: ['case', 'upper', 'lower', 'حروف'],
  mount(root) {
    const ta = areaInput({ rows: 5, placeholder: 'متن…' });
    const out = readout();
    const run = (mode) => {
      const t = ta.value;
      let r = '';
      if (mode === 'upper') r = t.toUpperCase();
      if (mode === 'lower') r = t.toLowerCase();
      if (mode === 'title') r = t.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
      if (mode === 'reverse') r = [...t].reverse().join('');
      out.set(r);
    };
    ta.addEventListener('input', () => { if (!ta.value) out.clear(); });
    root.append(
      field('متن ورودی', ta),
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn tonal sm', onclick: () => run('upper') }, 'UPPERCASE'),
        el('button', { class: 'btn tonal sm', onclick: () => run('lower') }, 'lowercase'),
        el('button', { class: 'btn tonal sm', onclick: () => run('title') }, 'Title Case'),
        el('button', { class: 'btn tonal sm', onclick: () => run('reverse') }, 'معکوس'),
      ),
      out.root
    );
  }
});

/* ── پاک‌سازی متن ── */
register({
  id: 'text-cleaner', cat: 'text', icon: '🧹',
  fa: 'پاک‌سازی متن', en: 'Text Cleaner',
  desc: 'حذف فاصله/خط خالی، تکراری و مرتب‌سازی',
  keywords: ['clean', 'trim', 'پاک', 'مرتب'],
  mount(root) {
    const ta = areaInput({ rows: 6, placeholder: 'متن نامرتب…' });
    const out = readout();
    const apply = (mode) => {
      let lines = ta.value.split('\n');
      if (mode === 'spaces') lines = lines.map((l) => l.replace(/[ \t]+/g, ' ').trim());
      if (mode === 'empty') lines = lines.filter((l) => l.trim() !== '');
      if (mode === 'both') lines = lines.map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter((l) => l);
      if (mode === 'dup') lines = [...new Set(lines)];
      if (mode === 'sort') lines.sort((a, b) => a.localeCompare(b, 'fa'));
      if (mode === 'rsort') lines.sort((a, b) => b.localeCompare(a, 'fa'));
      out.set(lines.join('\n'));
    };
    ta.addEventListener('input', () => { if (!ta.value) out.clear(); });
    root.append(
      field('متن', ta),
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn tonal sm', onclick: () => apply('both') }, 'حذف فاصله+خط خالی'),
        el('button', { class: 'btn tonal sm', onclick: () => apply('dup') }, 'حذف تکراری'),
        el('button', { class: 'btn tonal sm', onclick: () => apply('sort') }, 'مرتب‌سازی ↑'),
        el('button', { class: 'btn tonal sm', onclick: () => apply('rsort') }, 'مرتب‌سازی ↓'),
      ),
      out.root
    );
  }
});

/* ── جستجو و جایگزینی ── */
register({
  id: 'find-replace', cat: 'text', icon: '🔁',
  fa: 'جستجو و جایگزینی', en: 'Find & Replace',
  desc: 'جایگزینی متن با شمارش تعداد',
  keywords: ['replace', 'find', 'جایگزین'],
  mount(root) {
    const ta = areaInput({ rows: 6, placeholder: 'متن…' });
    const find = el('input', { class: 'input', placeholder: 'جستجو…' });
    const rep = el('input', { class: 'input', placeholder: 'جایگزین با…' });
    const out = readout();
    const count = el('div', { class: 'hint' });
    const run = () => {
      const f = find.value;
      if (!f) { out.set(ta.value); count.textContent = ''; return; }
      const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const n = (ta.value.match(re) || []).length;
      out.set(ta.value.replace(re, rep.value));
      count.textContent = `${faNum(n)} مورد جایگزین شد`;
    };
    ta.addEventListener('input', () => { if (!ta.value) { out.clear(); count.textContent = ''; } });
    root.append(
      field('متن', ta),
      el('div', { class: 'grid2' }, field('جستجو', find), field('جایگزینی', rep)),
      el('button', { class: 'btn primary', onclick: run }, 'جایگزین کن'),
      count, out.root
    );
  }
});
