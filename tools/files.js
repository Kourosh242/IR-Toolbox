/* IR-Toolbox — فایل / Files tools (همه محلی، بدون آپلود) */
import { register } from '../js/registry.js';
import { el, field, areaInput, readout, fileInput, stat, downloadBtn } from '../js/ui.js';
import { faNum, faBytes, escapeHTML, download, textBlob, debounce } from '../js/helpers.js';

/* ── اطلاعات فایل ── */
register({
  id: 'file-info', cat: 'files', icon: '📄',
  fa: 'اطلاعات فایل', en: 'File Info',
  desc: 'نام، حجم، نوع و تاریخ — بدون خروج از مرورگر',
  keywords: ['file', 'info', 'size', 'فایل'],
  mount(root) {
    const out = el('div', { class: 'stats' });
    const fi = fileInput({ multiple: true, onFiles: (files) => {
      out.textContent = '';
      files.forEach((f) => out.append(
        el('div', { class: 'card', style: 'padding:12px 16px;width:100%' },
          el('b', {}, f.name),
          el('div', { class: 'stats' },
            stat('حجم', faBytes(f.size)),
            stat('نوع', f.type || 'نامشخص'),
            stat('تغییر', new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(f.lastModified)),
          ))));
    } });
    root.append(fi.root, el('div', { class: 'hint' }, 'فایل‌ها فقط در حافظه مرورگر شما خوانده می‌شوند.'), out);
  }
});

/* ── تصویر → Base64 ── */
register({
  id: 'img-b64', cat: 'files', icon: '🖼️',
  fa: 'تصویر به Base64', en: 'Image → Base64 / Data URL',
  desc: 'برای جاسازی تصویر در HTML/CSS',
  keywords: ['image', 'base64', 'dataurl'],
  mount(root) {
    const out = readout('Data URL این‌جا…');
    const prev = el('img', { style: 'max-width:100%;max-height:220px;border-radius:12px;display:none;margin-top:10px;border:1px solid var(--line)' });
    const fi = fileInput({ accept: 'image/*', onFiles: ([f]) => {
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { out.set(r.result); prev.src = r.result; prev.style.display = 'block'; };
      r.readAsDataURL(f);
    } });
    root.append(fi.root, prev, out.root);
  }
});

/* ── Base64 → فایل (با پیش‌نمایش) ── */
register({
  id: 'b64-file', cat: 'files', icon: '📥',
  fa: 'Base64 به فایل', en: 'Base64 → File',
  desc: 'پیش‌نمایش زنده + دانلود Data URL یا Base64',
  keywords: ['base64', 'download', 'file'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 5, placeholder: 'data:image/png;base64,… یا Base64 خالی (خط‌شکسته هم قبول است)' });
    const prevBox = el('div', { class: 'card', style: 'padding:14px;margin-top:10px;display:none' });
    let blob = null, mime = 'application/octet-stream';
    const name = el('input', { class: 'input', value: 'output.bin' });
    const status = el('div', { class: 'hint' });

    let urls = [];
    const preview = () => {
      prevBox.style.display = 'none'; prevBox.textContent = ''; blob = null; status.textContent = '';
      urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; // fix: آزادسازی object URL های پیش‌نمایش قبلی
      mime = 'application/octet-stream'; // fix: نوع فایل از Data URL قبلی به ورودی بعدی «نشت» می‌کرد
      let data = ta.value.replace(/\s+/g, '');
      if (!data) return;
      const m = data.match(/^data:([^;,]+)(?:;[^,]*?)?;base64,([\s\S]+)$/); // v1.3.3: پارامترهایی مثل charset هم قبول است
      if (m) { mime = m[1]; data = m[2]; }
      try {
        const bin = atob(data);
        const u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        blob = new Blob([u8], { type: mime });
        prevBox.style.display = 'block';
        if (mime.startsWith('image/')) {
          const img = el('img', { style: 'max-width:100%;max-height:240px;border-radius:10px;border:1px solid var(--line)' });
          img.src = URL.createObjectURL(blob); urls.push(img.src);
          prevBox.append(el('div', { class: 'lbl', style: 'font-weight:700' }, 'پیش‌نمایش تصویر'), img);
        } else if (mime.startsWith('audio/')) {
          const a = el('audio', { controls: '', style: 'width:100%' }); a.src = URL.createObjectURL(blob); urls.push(a.src);
          prevBox.append(el('div', { class: 'lbl', style: 'font-weight:700' }, 'پیش‌نمایش صدا'), a);
        } else if (mime.startsWith('video/')) {
          const v = el('video', { controls: '', style: 'width:100%;max-height:240px;border-radius:10px' }); v.src = URL.createObjectURL(blob); urls.push(v.src);
          prevBox.append(el('div', { class: 'lbl', style: 'font-weight:700' }, 'پیش‌نمایش ویدیو'), v);
        } else if (mime.startsWith('text/') || /json|javascript|xml/.test(mime) || mime === 'application/octet-stream') {
          const txt = new TextDecoder().decode(u8.slice(0, 4000));
          prevBox.append(el('div', { class: 'lbl', style: 'font-weight:700' }, 'پیش‌نمایش متن'), el('div', { class: 'readout' }, txt));
        } else {
          prevBox.append(el('div', { class: 'lbl', style: 'font-weight:700' }, 'فایل'), el('div', { class: 'stats' }, stat('نوع', mime), stat('حجم', faBytes(u8.length))));
        }
        status.textContent = `نوع: ${mime} — حجم: ${faBytes(u8.length)} — اول پیش‌نمایش را ببین، بعد دانلود کن.`;
      } catch { status.textContent = '❌ Base64 نامعتبر است'; }
    };
    ta.addEventListener('input', debounce(preview, 200));
    const btn = el('button', { class: 'btn primary', onclick: () => {
      if (!blob) { preview(); }
      if (!blob) { import('../js/ui.js').then(({ toast }) => toast('چیزی برای دانلود نیست', 'warn')); return; }
      download(name.value || 'output.bin', blob);
    } }, '⬇ دانلود فایل');
    root.append(field('Base64 / Data URL', ta), prevBox, status, field('نام فایل', name), btn,
      el('div', { class: 'hint' }, 'خروجی ابزار «تصویر به Base64» را این‌جا بچسبانید تا پیش‌نمایش و دانلود بگیرید.'));
  }
});

/* ── پیش‌نمایش Markdown ── */
register({
  id: 'markdown', cat: 'files', icon: 'Ⓜ️',
  fa: 'پیش‌نمایش Markdown', en: 'Markdown Preview',
  desc: 'رندر محلی Markdown با خروجی امن (escape شده)',
  keywords: ['markdown', 'md', 'preview'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 8, value: '# سلام IR-Toolbox\n\nمتن **ضخیم** و *کج* و `کد`.\n\n- مورد اول\n- مورد دوم\n\n> نقل‌قول\n\n[لینک](https://example.com)' });
    const prev = el('div', { class: 'card', style: 'padding:20px' });
    const md = (src) => {
      let s = escapeHTML(src);
      s = s.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
        .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>') // fix: بعد از escapeHTML، «>» به &gt; تبدیل شده بود و نقل‌قول هرگز رندر نمی‌شد
        .replace(/^- (.*)$/gm, '<li>$1</li>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => /^https?:\/\//.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t);
      s = s.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
      return s.replace(/\n{2,}/g, '<br><br>');
    };
    const run = () => { prev.innerHTML = md(ta.value); };
    ta.addEventListener('input', run); run();
    root.append(field('Markdown', ta), el('div', { class: 'lbl' }, 'پیش‌نمایش'), prev);
  }
});

/* ── CSV ↔ JSON ── */
/* v1.3.3: CSV parser واقعی با پشتیبانی از گیومه، کامای داخل فیلد و خط‌شکستگی داخل گیومه */
function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
register({
  id: 'csv-json', cat: 'files', icon: '🧺',
  fa: 'CSV ↔ JSON', en: 'CSV / JSON Converter',
  desc: 'تبدیل دوطرفه با تشخیص سرستون',
  keywords: ['csv', 'json', 'table'],
  mount(root) {
    const ta = areaInput({ mono: true, rows: 7, placeholder: 'name,age\nali,20' });
    const out = readout();
    const csv2json = () => {
      const rows = parseCSV(ta.value);
      if (rows.length < 2) { out.set('❌ حداقل سرستون + یک ردیف لازم است'); return; }
      const head = rows[0].map((s) => s.trim());
      out.set(JSON.stringify(rows.slice(1).map((v) =>
        Object.fromEntries(head.map((h, i) => [h, (v[i] ?? '').trim()]))), null, 2));
    };
    const csvCell = (s) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    const json2csv = () => {
      try {
        const arr = JSON.parse(ta.value);
        if (!Array.isArray(arr) || !arr.length) throw 0;
      const head = [...new Set(arr.flatMap((o) => Object.keys(o)))];
      // v1.3.4: مقدارهای تودرتو به‌جای [object Object] به JSON تبدیل می‌شوند
      const cellVal = (v) => v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      out.set([head.map(csvCell).join(','), ...arr.map((o) => head.map((h) => csvCell(cellVal(o[h]))).join(','))].join('\n')); // fix: سرستون‌های دارای کاما/گیومه هم escape می‌شوند
      } catch { out.set('❌ JSON ورودی باید آرایه‌ای از آبجکت‌ها باشد'); }
    };
    ta.addEventListener('input', () => { if (!ta.value.trim()) out.clear(); });
    root.append(field('ورودی', ta),
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn primary sm', onclick: csv2json }, 'CSV ← JSON'),
        el('button', { class: 'btn tonal sm', onclick: json2csv }, 'JSON ← CSV')),
      out.root);
  }
});
