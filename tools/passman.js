/* IR Vault — مدیر رمز عبور (Passman)
 * ورودی‌ها با AES-256-GCM + PBKDF2(250k) رمزنگاری و در localStorage ذخیره می‌شوند.
 * رمز اصلی هرگز ذخیره نمی‌شود؛ کلید فقط تا رفرش صفحه در حافظه است.
 */
import { register } from '../js/registry.js';
import { el, field, textInput, areaInput, toast, stat } from '../js/ui.js';
import { faNum, uid, download, textBlob, hasCrypto, INSECURE_MSG } from '../js/helpers.js';
import { copyText } from '../js/clipboard.js';
import { encryptBytes, decryptBytes } from '../vault/crypto-utils.js';

const LS = 'ir:passman';
// v1.3.4: تکه‌تکه — اسپرید روی آرایهٔ بزرگ RangeError می‌داد و ذخیره بی‌صدا می‌افتاد
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let master = null;      // رمز اصلی — فقط در حافظه
let entries = null;     // آرایه ورودی‌ها — فقط در حافظه

const loadBlob = () => { try { return JSON.parse(localStorage.getItem(LS)); } catch { return null; } };
const saveBlob = async () => {
  const { salt, iv, ct } = await encryptBytes(new TextEncoder().encode(JSON.stringify(entries)), master);
  localStorage.setItem(LS, JSON.stringify({ salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
};

const strength = (pw) => {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 30;
  const e = pool ? Math.log2(pool) * pw.length : 0;
  return e < 45 ? ['ضعیف 😟', 'var(--danger)'] : e < 70 ? ['متوسط 🙂', 'var(--warn)'] : ['قوی 🛡️', 'var(--primary)'];
};

const genPassword = (len = 16) => {
  const sets = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '!@#$%^&*()-_=+[]{}<>?/'];
  const all = sets.join('');
  const chars = [];
  for (const set of sets) { const r = new Uint32Array(1); crypto.getRandomValues(r); chars.push(set[r[0] % set.length]); }
  const rest = new Uint32Array(Math.max(0, len - chars.length));
  crypto.getRandomValues(rest);
  for (let i = 0; i < rest.length; i++) chars.push(all[rest[i] % all.length]);
  for (let i = chars.length - 1; i > 0; i--) { const r = new Uint32Array(1); crypto.getRandomValues(r); const j = r[0] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
};

const copyEphemeral = async (text, label) => {
  const ok = await copyText(text);
  if (!ok) { toast('کپی ممکن نشد', 'err'); return; }
  toast(`⧉ ${label} کپی شد — کلیپ‌بورد پس از ۲۰ ثانیه پاک می‌شود`, 'ok');
  setTimeout(() => copyText(' '), 20000);
};

register({
  id: 'passman', cat: 'security', icon: '🔑',
  fa: 'مدیر رمز عبور', en: 'Password Manager',
  desc: 'ورودی‌های رمزنگاری‌شده با رمز اصلی — کاملاً محلی',
  keywords: ['password', 'manager', 'رمز', 'مدیر رمز'],
  mount(root) {
    if (!hasCrypto()) { root.append(el('div', { class: 'warn-box' }, INSECURE_MSG)); return; } // v1.3.4
    const box = el('div', {});
    root.append(box);
    const rerender = () => { box.textContent = ''; (entries ? screenMain : loadBlob() ? screenUnlock : screenSetup)(box, rerender); };
    rerender();
  }
});

/* ── ساخت گاوصندوق رمزها (بار اول) ── */
function screenSetup(box, rerender) {
  const pw = textInput({ type: 'password', placeholder: 'رمز اصلی (حداقل ۸ کاراکتر)…' });
  const pw2 = textInput({ type: 'password', placeholder: 'تکرار رمز اصلی…' });
  const meter = el('div', { class: 'meter' }, el('div', {}));
  const mLbl = el('div', { class: 'hint' });
  pw.addEventListener('input', () => {
    const [l, c] = strength(pw.value);
    meter.firstChild.style.width = Math.min(100, pw.value.length * 5) + '%';
    meter.firstChild.style.background = c;
    mLbl.textContent = pw.value ? `قدرت: ${l}` : '';
  });
  const btn = el('button', { class: 'btn primary', onclick: async () => {
    if (pw.value.length < 8) { toast('❌ رمز اصلی حداقل ۸ کاراکتر', 'err'); return; }
    if (pw.value !== pw2.value) { toast('❌ تکرار رمز یکسان نیست', 'err'); return; }
    master = pw.value; entries = [];
    await saveBlob();
    toast('🔑 گاوصندوق رمزها ساخته شد', 'ok');
    rerender();
  } }, '🔑 ساخت گاوصندوق رمزها');
  box.append(
    el('div', { class: 'tool-head' }, el('div', { class: 'ico' }, '🔑'), el('div', {}, el('h1', {}, 'مدیر رمز عبور'), el('div', { class: 'en' }, 'اولین استفاده — رمز اصلی را بسازید'))),
    el('div', { class: 'warn-box', style: 'margin-bottom:12px' }, '🛡️ رمز اصلی هرگز ذخیره نمی‌شود و بدون آن داده‌ها قابل بازیابی نیستند. جای امن نگه‌ش دارید.'),
    field('رمز اصلی', pw), meter, mLbl, field('تکرار رمز اصلی', pw2), btn,
  );
}

/* ── باز کردن ── */
function screenUnlock(box, rerender) {
  const pw = textInput({ type: 'password', placeholder: 'رمز اصلی…' });
  const btn = el('button', { class: 'btn primary', onclick: async () => {
    btn.disabled = true; btn.textContent = 'در حال بازگشایی…';
    try {
      const b = loadBlob();
      const pt = await decryptBytes(unb64(b.ct), pw.value, unb64(b.salt), unb64(b.iv));
      entries = JSON.parse(new TextDecoder().decode(pt));
      master = pw.value;
      toast('🔓 باز شد', 'ok');
      rerender();
    } catch { toast('❌ رمز اصلی اشتباه است', 'err'); }
    btn.disabled = false; btn.textContent = '🔓 باز کردن';
  } }, '🔓 باز کردن');
  pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  box.append(
    el('div', { class: 'tool-head' }, el('div', { class: 'ico' }, '🔒'), el('div', {}, el('h1', {}, 'مدیر رمز عبور'), el('div', { class: 'en' }, 'قفل است — رمز اصلی را وارد کنید'))),
    field('رمز اصلی', pw), btn,
    el('div', { class: 'hint', style: 'margin-top:10px' }, 'بعد از هر بار بستن/رفرش صفحه، گنجینه قفل می‌شود — این یک ویژگی امنیتی است.'),
  );
}

/* ── صفحه اصلی ── */
function screenMain(box, rerender) {
  const q = textInput({ placeholder: 'جست‌وجو در عنوان، کاربر، آدرس، یادداشت…' });
  const list = el('div', { style: 'display:grid;gap:10px;margin-top:12px' });
  let editing = null;

  const form = el('div', { class: 'card', style: 'padding:16px 20px;margin-top:12px;display:none' });
  const fTitle = textInput({ placeholder: 'مثلاً: ایمیل دانشگاه' });
  const fUser = textInput({ placeholder: 'نام کاربری / ایمیل / شماره' });
  const fPass = textInput({ placeholder: 'رمز عبور (هر زبان/فرمتی)' });
  const fUrl = textInput({ placeholder: 'https://… (اختیاری)' });
  const fNotes = areaInput({ rows: 2, placeholder: 'یادداشت (اختیاری)' });
  const fStr = el('div', { class: 'hint' });
  fPass.addEventListener('input', () => {
    if (!fPass.value) { fStr.textContent = ''; return; }
    const [l] = strength(fPass.value);
    fStr.textContent = `قدرت رمز: ${l}`;
  });
  const showForm = (e) => {
    editing = e || null;
    fTitle.value = e?.title || ''; fUser.value = e?.user || ''; fPass.value = e?.pass || '';
    fUrl.value = e?.url || ''; fNotes.value = e?.notes || '';
    form.style.display = 'block';
    fTitle.focus();
  };
  form.append(
    el('div', { class: 'lbl', style: 'font-weight:800;margin-bottom:8px' }, 'ورودی جدید / ویرایش'),
    field('عنوان *', fTitle), field('نام کاربری', fUser),
    field('رمز عبور', el('div', { style: 'display:flex;gap:8px' }, fPass,
      el('button', { class: 'btn tonal sm', onclick: () => { fPass.value = genPassword(16); fPass.dispatchEvent(new Event('input')); } }, '🎲 تولید'),
      el('button', { class: 'btn tonal sm', onclick: () => { fPass.type = fPass.type === 'password' ? 'text' : 'password'; } }, '👁'))),
    fStr,
    field('آدرس', fUrl), field('یادداشت', fNotes),
    el('div', { class: 'dash-actions' },
      el('button', { class: 'btn primary sm', onclick: async () => {
        if (!fTitle.value.trim()) { toast('❌ عنوان لازم است', 'err'); return; }
        if (editing) Object.assign(editing, { title: fTitle.value.trim(), user: fUser.value, pass: fPass.value, url: fUrl.value, notes: fNotes.value, ts: Date.now() });
        else entries.push({ id: uid(), title: fTitle.value.trim(), user: fUser.value, pass: fPass.value, url: fUrl.value, notes: fNotes.value, ts: Date.now() });
        try { await saveBlob(); } catch { entries = entries.filter((x) => x.id !== (editing?.id ?? entries[entries.length - 1]?.id)); toast('❌ ذخیرهٔ محلی ممکن نشد — حافظهٔ مرورگر پر یا در دسترس نیست', 'err'); return; } // v1.3.4
        form.style.display = 'none'; editing = null; toast('💾 ذخیره و رمزنگاری شد', 'ok'); draw(); drawStats();
      } }, '💾 ذخیره'),
      el('button', { class: 'btn tonal sm', onclick: () => { form.style.display = 'none'; } }, 'انصراف')),
  );

  /* ── تغییر رمز اصلی: بازرمزنگاری همه داده‌ها با کلید جدید ── */
  const chBox = el('div', { class: 'card', style: 'padding:16px 20px;margin-top:12px;display:none' });
  const cNew = textInput({ type: 'password', placeholder: 'رمز اصلی جدید (حداقل ۸ کاراکتر)…' });
  const cNew2 = textInput({ type: 'password', placeholder: 'تکرار رمز جدید…' });
  chBox.append(
    el('div', { class: 'lbl', style: 'font-weight:800;margin-bottom:8px' }, '🔁 تغییر رمز اصلی'),
    field('رمز جدید', cNew), field('تکرار رمز جدید', cNew2),
    el('div', { class: 'dash-actions' },
      el('button', { class: 'btn primary sm', onclick: async () => {
        if (cNew.value.length < 8) { toast('❌ رمز جدید حداقل ۸ کاراکتر', 'err'); return; }
        if (cNew.value !== cNew2.value) { toast('❌ تکرار رمز یکسان نیست', 'err'); return; }
        const old = master; master = cNew.value;
        try { await saveBlob(); } catch { master = old; toast('❌ ذخیره محلی ممکن نشد', 'err'); return; } // v1.3.4
        chBox.style.display = 'none'; cNew.value = ''; cNew2.value = '';
        toast('🔁 رمز اصلی تغییر کرد و همه داده‌ها با کلید جدید رمزنگاری شدند', 'ok');
      } }, '💾 اعمال تغییر'),
      el('button', { class: 'btn tonal sm', onclick: () => { chBox.style.display = 'none'; } }, 'انصراف')),
  );

  /* ── v1.3.4: بازیابی پشتیبان رمزنگاری‌شده ── */
  const rsBox = el('div', { class: 'card', style: 'padding:16px 20px;margin-top:12px;display:none' });
  const rFile = el('input', { type: 'file', accept: '.json', style: 'display:none' });
  const rName = el('div', { class: 'hint' }, 'فایلی انتخاب نشده');
  const rPw = textInput({ type: 'password', placeholder: 'رمز اصلی این پشتیبان…' });
  let rData = null;
  rFile.addEventListener('change', async () => {
    const f = rFile.files[0]; if (!f) return;
    try { rData = JSON.parse(await f.text()); rName.textContent = 'فایل انتخابی: ' + f.name; }
    catch { rData = null; rName.textContent = '❌ فایل، JSON پشتیبان معتبر نیست'; }
    rFile.value = '';
  });
  rsBox.append(
    el('div', { class: 'lbl', style: 'font-weight:800;margin-bottom:8px' }, '⬆ بازیابی پشتیبان (جایگزین ورودی‌های فعلی می‌شود)'),
    rFile,
    el('button', { class: 'btn tonal sm', onclick: () => rFile.click() }, '📂 انتخاب فایل پشتیبان'), rName,
    field('رمز اصلی پشتیبان', rPw),
    el('div', { class: 'dash-actions' },
      el('button', { class: 'btn primary sm', onclick: async () => {
        if (!rData || !rData.salt || !rData.iv || !rData.ct) { toast('❌ اول یک فایل پشتیبان معتبر انتخاب کنید', 'err'); return; }
        try {
          const pt = await decryptBytes(unb64(rData.ct), rPw.value, unb64(rData.salt), unb64(rData.iv));
          const list = JSON.parse(new TextDecoder().decode(pt));
          if (!Array.isArray(list)) throw new Error('bad');
          entries = list; master = rPw.value;
          await saveBlob();
          toast(`⬆ بازیابی شد (${faNum(entries.length)} ورودی)`, 'ok');
          rerender();
        } catch { toast('❌ بازیابی ممکن نشد — رمز اصلی پشتیبان اشتباه است یا فایل خراب', 'err'); }
      } }, '⬆ بازیابی'),
      el('button', { class: 'btn tonal sm', onclick: () => { rsBox.style.display = 'none'; } }, 'انصراف')));

  const stats = el('div', { class: 'stats', style: 'margin:10px 0' });
  const drawStats = () => { stats.textContent = ''; stats.append(stat('ورودی‌ها', faNum(entries.length))); };

  const draw = () => {
    list.textContent = '';
    const t = q.value.trim().toLowerCase();
    const rows = entries
      .filter((e) => !t || [e.title, e.user, e.url, e.notes].some((v) => (v || '').toLowerCase().includes(t)))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (!rows.length) { list.append(el('div', { class: 'empty' }, '🗝️ ورودی‌ای پیدا نشد.')); return; }
    rows.forEach((e) => list.append(entryCard(e)));
  };

  function entryCard(e) {
    let shown = false;
    const passLbl = el('b', { class: 'mono', style: 'direction:ltr' }, '••••••••••');
    const title = el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
      el('b', {}, e.title),
      /^https?:\/\//i.test(e.url || '') ? el('a', { href: e.url, target: '_blank', rel: 'noopener', style: 'font-size:.75rem' }, '🌐 باز کردن') : null, // v1.3.4: فقط http/https
      el('span', { style: 'flex:1' }),
      el('button', { class: 'btn tonal sm', onclick: () => showForm(e) }, '✏️'),
      el('button', { class: 'btn danger sm', onclick: async () => {
        if (!confirm(`«${e.title}» حذف شود؟`)) return;
        entries = entries.filter((x) => x.id !== e.id);
        await saveBlob(); drawStats(); draw();
      } }, '🗑'));
    const userRow = el('div', { class: 'hint', style: 'margin:6px 0 2px' }, e.user ? `👤 ${e.user}` : '');
    const passRow = el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px' },
      passLbl,
      el('button', { class: 'btn tonal sm', onclick: () => { shown = !shown; passLbl.textContent = shown ? e.pass : '••••••••••'; } }, '👁'),
      e.pass ? el('button', { class: 'btn tonal sm', onclick: () => copyEphemeral(e.pass, 'رمز') }, '⧉ رمز') : null,
      e.user ? el('button', { class: 'btn tonal sm', onclick: () => copyEphemeral(e.user, 'نام کاربری') }, '⧉ کاربر') : null);
    const notesRow = e.notes ? el('div', { class: 'hint', style: 'margin-top:6px' }, '📝 ' + e.notes) : null;
    return el('div', { class: 'card', style: 'padding:14px 16px' }, title, userRow, passRow, notesRow);
  }

  q.addEventListener('input', draw);
  box.append(
    el('div', { class: 'tool-head' },
      el('div', { class: 'ico' }, '🔑'),
      el('div', {}, el('h1', {}, 'مدیر رمز عبور'), el('div', { class: 'en' }, 'رمزنگاری‌شده — فقط روی دستگاه شما')),
      el('div', { class: 'actions' },
        el('button', { class: 'btn tonal sm', onclick: () => { chBox.style.display = chBox.style.display === 'none' ? 'block' : 'none'; } }, '🔁 تغییر رمز اصلی'),
        el('button', { class: 'btn tonal sm', onclick: () => { download('ir-passman-backup.json', textBlob(localStorage.getItem(LS) || '{}', 'application/json')); toast('⬇ پشتیبان رمزنگاری‌شده دانلود شد', 'ok'); } }, '⬇ پشتیبان'),
        el('button', { class: 'btn tonal sm', onclick: () => { rsBox.style.display = rsBox.style.display === 'none' ? 'block' : 'none'; } }, '⬆ بازیابی پشتیبان'),
        el('button', { class: 'btn danger sm', onclick: async () => {
          if (!confirm('همه ورودی‌های مدیر رمز برای همیشه حذف شوند؟')) return;
          localStorage.removeItem(LS); master = null; entries = null;
          toast('🗑 همه داده‌های مدیر رمز حذف شد', 'ok'); rerender();
        } }, '🗑 حذف همه'),
        el('button', { class: 'btn danger sm', onclick: () => { master = null; entries = null; toast('🔒 قفل شد', 'ok'); rerender(); } }, '🔒 قفل'))),
    el('div', { class: 'warn-box', style: 'margin-bottom:10px' }, '🛡️ همه‌چیز با رمز اصلی شما رمزنگاری می‌شود؛ هیچ‌چیز جایی فرستاده نمی‌شود.'),
    stats,
    el('div', { class: 'dash-actions' },
      el('button', { class: 'btn primary', onclick: () => showForm(null) }, '➕ ورودی جدید')),
    field('جست‌وجو', q), form, chBox, rsBox, list,
    el('div', { class: 'hint', style: 'margin-top:12px' }, 'رمزهای کپی‌شده پس از ۲۰ ثانیه از کلیپ‌بورد پاک می‌شوند. پشتیبان هم رمزنگاری‌شده است و بدون رمز اصلی بی‌استفاده‌ست.'),
  );
  drawStats(); draw();
}
