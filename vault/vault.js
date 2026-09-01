/* IR Vault — encrypt/decrypt text & files into .ir256 containers. */
import { register } from '../js/registry.js';
import { el, field, areaInput, textInput, fileInput, readout, downloadBtn } from '../js/ui.js';
import { faNum, faBytes, download } from '../js/helpers.js';
import { copyText } from '../js/clipboard.js';
import { toast } from '../js/ui.js';
import { packContainer, unpackContainer, EXT, LEGACY_EXT } from './file-format.js';

const te = new TextEncoder();
const td = new TextDecoder();
const GENERIC_ERR = '❌ بازگشایی ممکن نشد — رمز عبور اشتباه است یا فایل دستکاری شده.';

function savedPanel(blob, name) {
  return el('div', { class: 'ok-box', style: 'display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap' },
    el('span', {}, '✅ فایل ', el('b', { class: 'mono' }, name), ' آماده شد.'),
    el('button', { class: 'btn tonal sm', onclick: () => download(name, blob) }, '⬇ دانلود دوباره'));
}

function pwField(label = 'رمز عبور') {
  const p = textInput({ type: 'password', placeholder: 'رمز عبور…' });
  const show = el('button', { class: 'btn tonal sm', onclick: () => { p.type = p.type === 'password' ? 'text' : 'password'; } }, '👁');
  return { input: p, root: field(label, el('div', { style: 'display:flex;gap:8px' }, p, show)) };
}

register({
  id: 'vault', cat: 'security', icon: '🧰',
  fa: 'گاوصندوق IR', en: 'IR Vault',
  desc: 'رمزنگاری متن/فایل با AES-256-GCM — خروجی .ir256',
  keywords: ['vault', 'encrypt', 'decrypt', 'رمزنگاری', 'گاوصندوق'],
  mount(root) {
    const tabs = el('div', { class: 'seg' });
    const pane = el('div', { class: 'card', style: 'padding:20px' });
    const setTab = (t) => {
      [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      pane.textContent = '';
      ({ text: paneText, file: paneFile, dec: paneDec }[t])(pane);
    };
    [['text', '🔒 رمزنگاری متن'], ['file', '📁 رمزنگاری فایل'], ['dec', '🔓 بازگشایی']]
      .forEach(([t, l]) => tabs.append(el('button', { dataset: { t }, onclick: () => setTab(t) }, l)));
    setTab('text');
    root.append(tabs, el('div', { class: 'warn-box', style: 'margin:12px 0' },
      '🛡️ رمز عبور شما هرگز ذخیره نمی‌شود. اگر آن را فراموش کنید، بازیابی غیرممکن است.'), pane);

    /* ── encrypt text ── */
    function paneText(p) {
      const ta = areaInput({ rows: 6, placeholder: 'متن محرمانه…' });
      const pw = pwField(); const pw2 = pwField('تکرار رمز عبور');
      const info = el('div', { class: 'hint' });
      const btn = el('button', { class: 'btn primary', onclick: async () => {
        if (pw.input.value !== pw2.input.value) { info.textContent = '❌ تکرار رمز یکسان نیست'; return; }
        if (pw.input.value.length < 8) { info.textContent = '❌ رمز حداقل ۸ کاراکتر'; return; }
        btn.disabled = true; btn.textContent = 'در حال رمزنگاری…';
        try {
          const bytes = te.encode(ta.value);
          const out = await packContainer([{ name: 'secret.txt', mime: 'text/plain', bytes }], pw.input.value);
          const blob = new Blob([out], { type: 'application/octet-stream' });
          const name = `ir-vault-${Date.now()}${EXT}`;
          download(name, blob);
          info.textContent = '';
          info.append(savedPanel(blob, name));
          ta.value = ''; pw.input.value = ''; pw2.input.value = '';
        } catch { info.textContent = GENERIC_ERR; }
        btn.disabled = false; btn.textContent = '🔒 رمزنگاری و دانلود';
      } }, '🔒 رمزنگاری و دانلود');
      p.append(field('متن محرمانه', ta), pw.root, pw2.root, btn, info);
    }

    /* ── encrypt files ── */
    function paneFile(p) {
      let files = [];
      const list = el('div', { class: 'stats' });
      const fi = fileInput({ multiple: true, onFiles: (fs) => { files = fs; list.textContent = ''; fs.forEach((f) => list.append(el('span', { class: 'stat' }, `${f.name} · ${faBytes(f.size)}`))); } });
      const pw = pwField(); const pw2 = pwField('تکرار رمز عبور');
      const info = el('div', { class: 'hint' });
      const btn = el('button', { class: 'btn primary', onclick: async () => {
        if (!files.length) { info.textContent = '❌ فایلی انتخاب نشده'; return; }
        if (pw.input.value !== pw2.input.value) { info.textContent = '❌ تکرار رمز یکسان نیست'; return; }
        if (pw.input.value.length < 8) { info.textContent = '❌ رمز حداقل ۸ کاراکتر'; return; }
        btn.disabled = true; btn.textContent = 'در حال رمزنگاری…';
        try {
          const entries = [];
          for (const f of files) entries.push({ name: f.name, mime: f.type || 'application/octet-stream', bytes: new Uint8Array(await f.arrayBuffer()) });
          const out = await packContainer(entries, pw.input.value);
          const blob = new Blob([out], { type: 'application/octet-stream' });
          const name = `ir-vault-${files.length > 1 ? files.length + 'files-' : ''}${Date.now()}${EXT}`;
          download(name, blob);
          info.textContent = '';
          info.append(savedPanel(blob, name), el('div', { class: 'hint' }, `${faNum(files.length)} فایل رمزنگاری شد (${faBytes(out.length)})`));
          files = []; list.textContent = ''; pw.input.value = ''; pw2.input.value = '';
        } catch { info.textContent = GENERIC_ERR; }
        btn.disabled = false; btn.textContent = '🔒 رمزنگاری و دانلود';
      } }, '🔒 رمزنگاری و دانلود');
      p.append(fi.root, el('div', { class: 'hint' }, 'همه پسوند‌ها پشتیبانی می‌شوند: txt، js، json، md، csv، html و هر فایل متنی/باینری دیگر.'), list, pw.root, pw2.root, btn, info);
    }

    /* ── decrypt ── */
    const isText = (f) => (f.mime || '').startsWith('text/') || /\.(txt|md|json|js|mjs|css|html|csv|log|xml|yml|yaml)$/i.test(f.name);
    function paneDec(p) {
      let container = null;
      const fi = fileInput({ accept: EXT + ',' + LEGACY_EXT, onFiles: ([f]) => { if (f) f.arrayBuffer().then((b) => { container = b; fname.textContent = 'فایل انتخابی: ' + f.name; }); } });
      const fname = el('div', { class: 'hint' });
      const pw = pwField();
      const out = readout('پیش‌نمایش محتوای متنی (بدون نام فایل)…');
      const fileList = el('div', { style: 'margin-top:10px;display:grid;gap:8px' });
      const btn = el('button', { class: 'btn primary', onclick: async () => {
        if (!container) { out.set('❌ ابتدا فایل ' + EXT + ' را انتخاب کنید'); return; }
        btn.disabled = true; btn.textContent = 'در حال بازگشایی…';
        fileList.textContent = '';
        try {
          const files = await unpackContainer(container, pw.input.value);
          const texts = files.filter(isText);
          if (texts.length) out.set(texts.map((f) => td.decode(f.bytes)).join('\n\n'));
          else out.clear();
          files.forEach((f) => {
            fileList.append(el('div', { class: 'card', style: 'padding:10px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
              el('span', {}, '📄'),
              el('b', { class: 'mono', style: 'direction:ltr' }, f.name),
              el('span', { class: 'badge info' }, faBytes(f.bytes.length)),
              el('span', { style: 'flex:1' }),
              isText(f) ? el('button', {
                class: 'btn tonal sm',
                onclick: async () => { const ok = await copyText(td.decode(f.bytes)); toast(ok ? 'متن کپی شد ✔ (بدون نام فایل)' : 'کپی ممکن نشد', ok ? 'ok' : 'err'); }
              }, '⧉ کپی متن') : null,
              el('button', { class: 'btn primary sm', onclick: () => download(f.name, new Blob([f.bytes], { type: f.mime })) }, '⬇ دانلود با نام اصلی')));
          });
          fileList.append(el('div', { class: 'ok-box' }, `✅ ${faNum(files.length)} فایل بازگشایی شد. «کپی متن» فقط متن را کپی می‌کند و «دانلود» فایل را با نام و پسوند اصلی ذخیره می‌کند.`));
          pw.input.value = '';
        } catch { out.set(GENERIC_ERR); fileList.textContent = ''; }
        btn.disabled = false; btn.textContent = '🔓 بازگشایی';
      } }, '🔓 بازگشایی');
      out.box.style.maxHeight = '320px'; out.box.style.overflowY = 'auto';
      p.append(fi.root, fname, pw.root, btn, fileList, out.root);
    }
  }
});
