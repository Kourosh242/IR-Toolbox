/* IR-Toolbox — DOM helpers, toasts, shared tool widgets. */
import { $ } from './helpers.js';
import { copyText } from './clipboard.js';

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}

export function toast(msg, type = 'ok', ms = 2600) {
  const root = $('#toasts') || el('div', { id: 'toasts' }, );
  if (!root.parentNode) document.body.appendChild(root);
  const t = el('div', { class: `toast ${type}`, role: 'status' }, msg);
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, ms);
  return t;
}

/* A labelled field: label + control + hint */
let fieldSeq = 0;
export function field(labelText, control, hint) {
  // اتصال برنامه‌ای label به کنترل برای دسترس‌پذیری (screen reader)
  if (control && ['INPUT', 'SELECT', 'TEXTAREA'].includes(control.tagName)) {
    if (!control.id) control.id = 'fld' + (++fieldSeq);
    const lbl = el('label', { class: 'lbl', for: control.id }, labelText);
    return el('div', { class: 'field' }, lbl, control, hint ? el('div', { class: 'hint' }, hint) : null);
  }
  return el('div', { class: 'field' },
    el('label', { class: 'lbl' }, labelText),
    control,
    hint ? el('div', { class: 'hint' }, hint) : null
  );
}

export function textInput(opts = {}) {
  // fix: گزینه‌های min/max/step که ابزارها (تایمر، پومودورو، لورم…) می‌فرستادند نادیده گرفته می‌شد
  return el('input', {
    class: `input ${opts.mono ? 'code' : ''}`, type: opts.type || 'text', placeholder: opts.placeholder || '', value: opts.value || '',
    min: opts.min ?? null, max: opts.max ?? null, step: opts.step ?? null, inputmode: opts.inputmode ?? null,
  });
}
export function areaInput(opts = {}) {
  const t = el('textarea', { class: `input ${opts.mono ? 'code' : ''}`, placeholder: opts.placeholder || '', rows: opts.rows || 5 });
  if (opts.value) t.value = opts.value;
  return t;
}
export function selectInput(options, selected) {
  const s = el('select', { class: 'input' });
  for (const [val, label] of options) {
    const o = el('option', { value: val }, label);
    if (val === selected) o.selected = true;
    s.appendChild(o);
  }
  return s;
}

/* Read-only output box with a copy button */
export function readout(placeholder = 'خروجی این‌جا نمایش داده می‌شود') {
  const box = el('div', { class: 'readout empty' }, el('span', { class: 'placeholder' }, placeholder));
  const wrap = el('div', {},
    el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px' },
      el('span', { class: 'lbl', style: 'font-weight:700;font-size:.84rem' }, 'خروجی'),
      el('span', { style: 'flex:1' }),
      copyBtn(() => current())
    ),
    box
  );
  let current = () => box.dataset.raw || '';
  function clear() {
    box.dataset.raw = '';
    box.textContent = '';
    box.classList.add('empty');
    box.appendChild(el('span', { class: 'placeholder' }, placeholder));
  }
  function set(val) {
    val = val == null ? '' : String(val);
    if (!val) { clear(); return; } // fix: خروجی خالی، جعبهٔ سفید بدون placeholder نمی‌گذاشت
    box.dataset.raw = val;
    box.textContent = val;
    box.classList.remove('empty');
  }
  return { root: wrap, box, set, clear, get: () => box.dataset.raw || '' };
}

export function copyBtn(getText, label = 'کپی') {
  return el('button', {
    class: 'btn tonal sm',
    onclick: async () => {
      const t = typeof getText === 'function' ? getText() : getText;
      if (!t) { toast('چیزی برای کپی نیست', 'warn'); return; }
      const ok = await copyText(t);
      toast(ok ? 'کپی شد ✔' : 'کپی ممکن نشد', ok ? 'ok' : 'err');
    }
  }, '⧉ ', label);
}

export function downloadBtn(getBlob, getName, label = 'دانلود') {
  return el('button', {
    class: 'btn tonal sm',
    onclick: () => {
      const b = typeof getBlob === 'function' ? getBlob() : getBlob;
      if (!b) { toast('چیزی برای دانلود نیست', 'warn'); return; }
      import('./helpers.js').then(({ download }) => download(getName(), b));
    }
  }, '⬇ ', label);
}

/* File picker styled as a drop-ish button */
export function fileInput({ multiple = false, accept = '', onFiles }) {
  const input = el('input', { type: 'file', multiple: multiple ? '' : false, accept, style: 'display:none' });
  input.addEventListener('change', () => { onFiles([...input.files]); input.value = ''; });
  const btn = el('button', { class: 'btn tonal', onclick: () => input.click() }, '📂 انتخاب فایل');
  return { root: el('span', {}, input, btn), input, btn };
}

/* Stat chip */
export function stat(label, value) {
  return el('span', { class: 'stat' }, `${label}: `, el('b', {}, value));
}
