/* IR-Toolbox — مترجم Cron: عبارت زمان‌بندی ← زبان آدمیزاد فارسی + اجراهای بعدی */
import { register } from '../js/registry.js';
import { el, field, textInput, readout, stat } from '../js/ui.js';
import { faNum } from '../js/helpers.js';

const WD = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']; // cron: 0=Sun
const MO = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];

/* یک فیلد را به مجموعه مجاز + توضیح فارسی تبدیل می‌کند */
function parseField(expr, min, max, names) {
  const val = (t) => {
    if (names && /^\D+$/.test(t)) {
      const i = names.findIndex((n) => n.toLowerCase().startsWith(t.toLowerCase().slice(0, 3)));
      if (i >= 0) return min + i;
    }
    const n = Number(t);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`مقدار «${t}» خارج از بازه ${min}-${max} است`);
    return n;
  };
  const set = new Set();
  const parts = [];
  for (const part of expr.split(',')) {
    let m = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
    if (names && !/^\*|^(\d)/.test(part)) m = part.match(/^([A-Za-z]+(?:-[A-Za-z]+)?)(?:\/(\d+))?$/);
    if (!m) throw new Error(`بخش «${part}» معتبر نیست`);
    let lo, hi;
    if (m[1] === '*') { lo = min; hi = max; }
    else if (m[1].includes('-') || (names && /^\D/.test(m[1]))) {
      const [a, b] = m[1].split('-').map((x) => val(x));
      lo = a; hi = b;
    } else { lo = hi = val(m[1]); if (m[2]) hi = max; }
    const step = m[2] ? Number(m[2]) : 1;
    if (step < 1) throw new Error('گام باید ≥۱ باشد');
    for (let v = lo; v <= hi; v += step) set.add(v === 7 && names === WD ? 0 : v);
    if (m[1] === '*' && step > 1) parts.push(`هر ${faNum(step)} تا`);
    else if (lo === hi) parts.push(names ? names[lo - min] ?? faNum(lo) : faNum(lo));
    else parts.push(`${names?.[lo - min] ?? faNum(lo)} تا ${names?.[hi - min] ?? faNum(hi)}`);
  }
  return { set, desc: parts.join('، ') };
}

function describe(c) {
  try {
    const [mi, h, d, mo, wd] = c.trim().split(/\s+/);
    if (!h) throw new Error('عبارت کامل نیست — ۵ بخش لازم است');
    const F = [
      parseField(mi, 0, 59), parseField(h, 0, 23), parseField(d, 1, 31),
      parseField(mo, 1, 12, MO), parseField(wd, 0, 7, WD),
    ];
    const s = [];
    // v1.3.4: قیدهای تاریخ در همهٔ حالت‌ها (حتی میان‌برهای دقیقه‌ای) ذکر می‌شوند
    const dateParts = [];
    if (wd !== '*') dateParts.push(`روزهای ${F[4].desc}`);
    if (mo !== '*') dateParts.push(`ماه‌های ${F[3].desc}`);
    if (d !== '*') dateParts.push(`روز ${F[2].desc} ماه`);
    if (mi === '*' && h === '*') s.push('هر دقیقه');
    else if (h === '*' && /^\*\/\d+$/.test(mi)) s.push(`هر ${faNum(Number(mi.slice(2)))} دقیقه`);
    else {
      if (h !== '*') s.push(`ساعت ${F[1].desc}`);
      s.push(mi === '*' ? 'در هر دقیقه' : `دقیقه ${F[0].desc}`);
    }
    s.push(...dateParts);
    return { ok: true, text: s.join('، '), F };
  } catch (e) {
    return { ok: false, text: '❌ ' + e.message, F: null };
  }
}

/* تطبیق یک تاریخ با عبارت — طبق استاندارد cron: اگر هر دو «روز ماه» و «روز هفته» محدود باشند OR، وگرنه AND */
function matches(F, d) {
  const [mi, h, dom, mo, wd] = F;
  if (!mi.set.has(d.getMinutes()) || !h.set.has(d.getHours()) || !mo.set.has(d.getMonth() + 1)) return false;
  const domStar = dom.set.size === 31, wdStar = wd.set.size === 8;
  const domOk = dom.set.has(d.getDate()), wdOk = wd.set.has(d.getDay());
  if (domStar && wdStar) return true;
  if (domStar) return wdOk;
  if (wdStar) return domOk;
  return domOk || wdOk;
}

function nextRuns(F, count = 5) {
  const out = [];
  const d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  const limit = 366 * 24 * 60 * 2;
  for (let i = 0; i < limit && out.length < count; i++, d.setMinutes(d.getMinutes() + 1)) {
    if (matches(F, d)) out.push(new Date(d));
  }
  return out;
}

const PRESETS = [
  ['* * * * *', 'هر دقیقه'], ['*/5 * * * *', 'هر ۵ دقیقه'], ['0 * * * *', 'سر هر ساعت'],
  ['30 8 * * *', 'هر روز ۸:۳۰'], ['0 9 * * 1-5', 'روزهای کاری ۹:۰۰'], ['0 0 1 * *', 'اول هر ماه'],
];

register({
  id: 'cron', cat: 'dev', icon: '⏰',
  fa: 'مترجم Cron', en: 'Cron Translator',
  desc: 'عبارت زمان‌بندی سرور ← توضیح فارسی + اجراهای بعدی',
  keywords: ['cron', 'schedule', 'زمان‌بندی', 'کرون'],
  mount(root) {
    const inp = textInput({ mono: true, value: '*/5 * * * *' });
    const out = el('div', { class: 'stats', style: 'margin-top:10px' });
    const nextBox = el('div', { class: 'card', style: 'padding:14px 16px;margin-top:10px' });
    const run = () => {
      out.textContent = ''; nextBox.textContent = '';
      const r = describe(inp.value);
      out.append(el('span', { class: `stat ${r.ok ? '' : 'bad'}`, style: r.ok ? '' : 'color:var(--danger)' }, r.text));
      if (!r.ok) return;
      nextBox.append(el('div', { class: 'lbl', style: 'font-weight:700;margin-bottom:8px' }, '۵ اجرای بعدی:'));
      const runs = nextRuns(r.F);
      if (!runs.length) { nextBox.append(el('div', { class: 'hint' }, 'در دو سال آینده اجرایی پیدا نشد.')); return; }
      runs.forEach((d) => nextBox.append(el('div', { class: 'hint', style: 'margin:2px 0' },
        '• ' + new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(d))));
    };
    inp.addEventListener('input', run); run();
    root.append(
      field('عبارت Cron (۵ بخش: دقیقه ساعت روز ماه روزِ هفته)', inp),
      el('div', { class: 'dash-actions' }, PRESETS.map(([c, l]) =>
        el('button', { class: 'btn tonal sm', onclick: () => { inp.value = c; run(); } }, l))),
      out, nextBox,
      el('div', { class: 'hint' }, 'راهنما: * یعنی «هر»، */n یعنی «هر n تا»، a-b بازه، و a,b فهرست. روز هفته: 0=یکشنبه … 6=شنبه (7 هم یکشنبه).'),
    );
  }
});
