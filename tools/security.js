/* IR-Toolbox — امنیت / Security tools */
import { register } from '../js/registry.js';
import { el, field, areaInput, textInput, selectInput, readout, fileInput, stat } from '../js/ui.js';
import { faNum, faBytes, debounce, hasCrypto, INSECURE_MSG } from '../js/helpers.js';
import { digest } from '../vault/crypto-utils.js';
import { md5hex, sha1hex, sha256hex } from '../js/hashes-sync.js';

const ALGS = [['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512'], ['SHA-1', 'SHA-1 (ناامن)']];
const algName = (v) => v.startsWith('SHA-1') ? 'SHA-1' : v;

/* ── بررسی هش (Hash Checker) ── */
register({
  id: 'hash-checker', cat: 'security', icon: '#️⃣',
  fa: 'بررسی هش', en: 'Hash Checker',
  desc: 'هش متن/فایل + تطبیق + شناسایی الگوریتم هش',
  keywords: ['hash', 'sha256', 'checksum', 'هش'],
  mount(root) {
    if (!hasCrypto()) { root.append(el('div', { class: 'warn-box' }, INSECURE_MSG)); return; } // v1.3.4
    const alg = selectInput(ALGS);
    const sha1warn = el('div', { class: 'warn-box', style: 'display:none' }, '⚠️ SHA-1 شکسته شده و برای کاربردهای امنیتی مناسب نیست؛ فقط برای سازگاری قدیمی.');
    alg.addEventListener('change', () => { sha1warn.style.display = algName(alg.value) === 'SHA-1' ? 'block' : 'none'; reText(); reFile(); });

    const verifyBadge = (exp, hex) => {
      if (!exp) return null;
      const ok = exp.trim().toLowerCase() === hex.toLowerCase();
      return el('span', { class: `badge ${ok ? 'ok' : 'bad'}`, style: 'margin-inline-start:8px' }, ok ? '✅ تطبیق دارد' : '❌ تطبیق ندارد');
    };

    /* ── متن ─ */
    const ta = areaInput({ rows: 4, placeholder: 'متن… (با پاک کردن ورودی، هش هم پاک می‌شود)' });
    const out = readout('هش متن این‌جا…');
    const expT = textInput({ mono: true, placeholder: 'هش مورد انتظار متن (اختیاری)' });
    const vT = el('div', { style: 'margin-top:8px' });
    let textToken = 0; // v1.3.3: نگهبان race — پاسخ دیرهنگام، خروجی تازه را بازنویسی نمی‌کند
    const reText = () => {
      vT.textContent = '';
      if (!ta.value) { out.clear(); return; }          // ← ورودی خالی = خروجی خالی
      const my = ++textToken;
      digest(algName(alg.value), ta.value).then((h) => {
        if (my !== textToken) return;
        out.set(h);
        vT.textContent = '';
        const b = verifyBadge(expT.value, h); if (b) vT.append(b);
      });
    };
    ta.addEventListener('input', debounce(reText, 150));
    expT.addEventListener('input', reText);

    /* ── فایل ── */
    const fOut = readout('هش فایل این‌جا…');
    const fExp = textInput({ mono: true, placeholder: 'هش مورد انتظار فایل (اختیاری)' });
    const vF = el('div', { style: 'margin-top:8px' });
    let lastFile = null;
    let fileToken = 0; // v1.3.3: نگهبان race برای هش فایل
    const reFile = async () => {
      vF.textContent = '';
      if (!lastFile) { fOut.clear(); return; }
      const my = ++fileToken;
      const h = await digest(algName(alg.value), await lastFile.arrayBuffer());
      if (my !== fileToken) return;
      fOut.set(h);
      const b = verifyBadge(fExp.value, h); if (b) vF.append(b);
    };
    const fi = fileInput({ onFiles: ([f]) => { lastFile = f || null; reFile(); } });
    fExp.addEventListener('input', debounce(reFile, 150));

    /* ── هش ← متن (حدس با دیتابیس محلی) ── */
    const hIn = textInput({ mono: true, placeholder: 'هش را این‌جا بچسبانید…' });
    const guess = el('div', { class: 'stats' });
    const foundOut = readout('متن پیدا‌شده این‌جا…');
    const status = el('div', { class: 'hint' });
    const WORDS = ['', 'a', 'abc', 'abcd', 'admin', 'admin123', 'password', 'password1', 'passw0rd', '123456', '1234567', '12345678', '123456789', '1234567890', 'qwerty', 'qwerty123', 'letmein', 'test', 'test123', 'hello', 'world', 'ok', 'okay', 'yes', 'no', 'null', 'undefined', 'true', 'false', 'user', 'username', 'root', 'toor', 'pass', 'guest', 'master', 'changeme', 'secret', 'token', 'api', 'key', 'love', 'god', 'ali', 'reza', 'sara', 'maryam', 'hossein', 'zahra', 'mohammad', 'fateme', 'amir', 'negin', 'سلام', 'خدا', 'عشق', 'ایران', 'تهران', '1234', '121212', '112233', '123123', '123321', '654321', '55555', '7777777', '1q2w3e4r', 'zaq12wsx', 'p@ssw0rd', 'iloveyou', 'sunshine', 'princess', 'football', 'baseball', 'dragon', 'monkey', 'shadow', 'superman', 'batman', 'trustno1', 'welcome', 'login', 'asdf', 'asdfgh', 'zxcvbn', 'qazwsx', 'asd123', 'qwe123', '1qaz2wsx', 'starwars', 'whatever', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    const LENFN = { 32: ['MD5', md5hex], 40: ['SHA-1', sha1hex], 64: ['SHA-256', sha256hex] };
    let searchToken = 0;
    const reMatch = debounce(() => {
      guess.textContent = ''; foundOut.clear(); status.textContent = '';
      const h = hIn.value.trim().toLowerCase();
      if (!h) return;
      if (!/^[0-9a-f]+$/.test(h)) { guess.append(el('span', { class: 'badge bad' }, 'هش معتبر نیست (فقط hex)')); return; }
      const known = { 32: 'MD5 / NTLM', 40: 'SHA-1', 56: 'SHA-224', 64: 'SHA-256', 96: 'SHA-384', 128: 'SHA-512' };
      guess.append(el('span', { class: 'badge info' }, `طول: ${faNum(h.length)} → احتمالاً ${known[h.length] || 'ناشناخته'}`));
      const fn = LENFN[h.length];
      if (!fn) { status.textContent = 'برای این طول هش، دیتابیس محلی نداریم؛ هش یک‌طرفه است و قابل برگشت نیست.'; return; }
      const my = ++searchToken;
      status.textContent = 'در حال جست‌وجو در دیتابیس محلی…';
      setTimeout(() => {
        if (my !== searchToken) return;
        let found = null;
        for (const w of WORDS) { if (fn[1](w) === h) { found = w; break; } }
        if (found == null) { for (let i = 0; i < 10000 && found == null; i++) { if (fn[1](String(i)) === h) found = String(i); } }
        if (my !== searchToken) return;
        status.textContent = '';
        if (found != null) foundOut.set(found === '' ? '(رشته خالی)' : found);
        else { foundOut.clear(); status.textContent = 'در دیتابیس محلی (۱۰٬۰۰۰ عدد + کلمات رایج) پیدا نشد؛ هش یک‌طرفه است و فقط مقادیر رایج از این راه قابل حدس‌اند.'; }
      }, 30);
    }, 200);
    hIn.addEventListener('input', reMatch);

    root.append(
      field('الگوریتم', alg), sha1warn,
      el('div', { class: 'card', style: 'padding:16px' },
        el('div', { class: 'lbl', style: 'font-weight:700' }, '۱) هش متن'),
        field('متن', ta), out.root, field('تطبیق با هش مورد انتظار', expT), vT),
      el('div', { class: 'card', style: 'padding:16px' },
        el('div', { class: 'lbl', style: 'font-weight:700' }, '۲) هش فایل'),
        fi.root, fOut.root, field('تطبیق با هش مورد انتظار فایل', fExp), vF),
      el('div', { class: 'card', style: 'padding:16px' },
        el('div', { class: 'lbl', style: 'font-weight:700' }, '۳) هش ← متن (حدس با دیتابیس محلی)'),
        field('هش ورودی', hIn), guess, foundOut.root, status),
      el('div', { class: 'hint' }, 'هش یعنی «اثر انگشت» داده — رمزنگاری نیست و قابل برگشت نیست. برای ذخیره محرمانه از گاوصندوق IR استفاده کنید.')
    );
  }
});

/* ── تولید رمز عبور ── */
register({
  id: 'password-gen', cat: 'security', icon: '🔑',
  fa: 'تولید رمز عبور', en: 'Password Generator',
  desc: 'رمز امن با crypto + نشانگر قدرت',
  keywords: ['password', 'رمز', 'generator'],
  mount(root) {
    const len = el('input', { type: 'range', min: 8, max: 64, value: 16, style: 'width:100%' });
    const lenLbl = el('b', {}, faNum(16));
    const opts = {
      lower: el('input', { type: 'checkbox', checked: '' }),
      upper: el('input', { type: 'checkbox', checked: '' }),
      digit: el('input', { type: 'checkbox', checked: '' }),
      symbol: el('input', { type: 'checkbox', checked: '' }),
    };
    const out = readout('رمز تولیدشده…');
    const meter = el('div', { class: 'meter' }, el('div', {}));
    const mLabel = el('div', { class: 'hint' });

    const entropy = () => {
      let pool = 0;
      if (opts.lower.checked) pool += 26;
      if (opts.upper.checked) pool += 26;
      if (opts.digit.checked) pool += 10;
      if (opts.symbol.checked) pool += 30;
      return pool ? Math.log2(pool) * Number(len.value) : 0;
    };
    const gen = () => {
      const sets = [];
      if (opts.lower.checked) sets.push('abcdefghijklmnopqrstuvwxyz');
      if (opts.upper.checked) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      if (opts.digit.checked) sets.push('0123456789');
      if (opts.symbol.checked) sets.push('!@#$%^&*()-_=+[]{}<>?/');
      if (!sets.length) { out.set('❌ حداقل یک مجموعه لازم است'); return; }
      const all = sets.join('');
      const L = Number(len.value);
      // v1.3.3: تضمین حداقل یک نویسه از هر مجموعه تیک‌خورده + برزدن Fisher–Yates با crypto
      const chars = [];
      for (const set of sets) {
        const r1 = new Uint32Array(1); crypto.getRandomValues(r1);
        chars.push(set[r1[0] % set.length]);
      }
      const rest = new Uint32Array(Math.max(0, L - chars.length));
      crypto.getRandomValues(rest);
      for (let i = 0; i < rest.length; i++) chars.push(all[rest[i] % all.length]);
      for (let i = chars.length - 1; i > 0; i--) {
        const rj = new Uint32Array(1); crypto.getRandomValues(rj);
        const j = rj[0] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      out.set(chars.join(''));
      const e = entropy();
      const pct = Math.min(100, (e / 100) * 100);
      const bar = meter.firstChild;
      bar.style.width = pct + '%';
      const [label, color] = e < 45 ? ['ضعیف 😟', 'var(--danger)'] : e < 70 ? ['متوسط 🙂', 'var(--warn)'] : e < 100 ? ['قوی 💪', 'var(--primary)'] : ['عالی 🛡️', 'var(--primary)'];
      bar.style.background = color;
      mLabel.textContent = `قدرت: ${label} — آنتروپی تقریبی ${faNum(Math.round(e))} بیت`;
    };
    len.addEventListener('input', () => { lenLbl.textContent = faNum(len.value); gen(); });
    Object.values(opts).forEach((c) => c.addEventListener('change', gen));
    gen();
    root.append(
      el('div', { class: 'field' }, el('div', { class: 'lbl' }, 'طول: ', lenLbl), len),
      el('div', { class: 'stats', style: 'margin-bottom:12px' },
        el('label', { class: 'stat' }, opts.lower, ' a-z'),
        el('label', { class: 'stat' }, opts.upper, ' A-Z'),
        el('label', { class: 'stat' }, opts.digit, ' 0-9'),
        el('label', { class: 'stat' }, opts.symbol, ' !@#')),
      el('button', { class: 'btn primary', onclick: gen }, '🎲 تولید رمز'),
      meter, mLabel, out.root
    );
  }
});

/* ── توکن امن ── */
register({
  id: 'token-gen', cat: 'security', icon: '🧬',
  fa: 'توکن امن', en: 'Secure Token Generator',
  desc: 'Hex / Base64 با crypto.getRandomValues',
  keywords: ['token', 'hex', 'secret'],
  mount(root) {
    const bytes = selectInput([['16', '16 بایت'], ['32', '32 بایت'], ['64', '64 بایت']], '32');
    const fmt = selectInput([['hex', 'Hex'], ['b64', 'Base64']]);
    const out = readout();
    const gen = () => {
      const b = crypto.getRandomValues(new Uint8Array(Number(bytes.value)));
      out.set(fmt.value === 'hex'
        ? [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
        : btoa(String.fromCharCode(...b)));
    };
    root.append(el('div', { class: 'grid2' }, field('طول', bytes), field('قالب', fmt)),
      el('button', { class: 'btn primary', onclick: gen }, 'تولید توکن'), out.root);
  }
});
