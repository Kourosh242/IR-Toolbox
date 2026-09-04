/* IR-Toolbox — بازی فکری / Brain games (best scores stored locally) */
import { register, setCleanup } from '../js/registry.js';
import { el, stat, toast } from '../js/ui.js';
import { faNum } from '../js/helpers.js';
import { getScores, setBest } from '../js/storage.js';

/* ── حافظه (جفت‌یابی) ── */
register({
  id: 'memory', cat: 'brain', icon: '🧠',
  fa: 'بازی حافظه', en: 'Memory Match',
  desc: 'جفت‌یابی ایموجی — رکورد کمترین حرکت',
  keywords: ['memory', 'حافظه', 'game'],
  mount(root) {
    const best = el('div', { class: 'stats' });
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px' });
    let first = null, lock = false, moves = 0, done = 0;
    const showBest = () => {
      best.textContent = '';
      best.append(
        stat('بهترین (کمترین حرکت)', getScores().memory != null ? faNum(getScores().memory) : '—'),
        stat('حرکت فعلی', faNum(moves)));
    };
    const newGame = () => {
      const faces = ['\u{1F34E}', '\u{1F319}', '\u{2B50}', '\u{1F41F}', '\u{26BD}', '\u{1F3B5}', '\u{1F335}', '\u{1F697}'];
      const deck = [...faces, ...faces].sort(() => Math.random() - 0.5);
      grid.textContent = ''; first = null; lock = false; moves = 0; done = 0; showBest();
      deck.forEach((f) => {
        const card = el('button', { class: 'card', style: 'font-size:1.6rem;min-height:64px;cursor:pointer', dataset: { f, open: '0' } }, '❓');
        card.addEventListener('click', () => {
          if (lock || card.dataset.open === '1') return;
          card.textContent = f; card.dataset.open = '1';
          if (!first) { first = card; return; }
          moves += 1; showBest();
          if (first.dataset.f === f) {
            first.dataset.open = '1'; first = null; done += 2;
            if (done === deck.length) {
              const rec = setBest('memory', moves, true);
              toast(rec ? '🏆 رکورد جدید!' : 'تمام شد!', 'ok');
              showBest();
            }
          } else {
            lock = true;
            const a = first; first = null;
            setTimeout(() => { a.textContent = '❓'; a.dataset.open = '0'; card.textContent = '❓'; card.dataset.open = '0'; lock = false; }, 700);
          }
        });
        grid.append(card);
      });
    };
    newGame();
    root.append(best, grid,
      el('button', { class: 'btn primary', style: 'margin-top:12px', onclick: newGame }, '🔄 بازی جدید'),
      el('div', { class: 'hint' }, 'روی کارت‌ها بزن تا برگردن؛ دو کارت هم‌شکل یعنی یک جفت. رکورد کمترین حرکت به‌صورت محلی ذخیره می‌شود و با هر بازی بهتر قابل شکستن است.'));
  }
});

/* ── سرعت واکنش ── */
register({
  id: 'reaction', cat: 'brain', icon: '⚡',
  fa: 'سرعت واکنش', en: 'Reaction Time',
  desc: 'روی سبز کلیک کن — رکورد میلی‌ثانیه',
  keywords: ['reaction', 'واکنش', 'speed'],
  mount(root) {
    const stage = el('div', { class: 'game-stage', style: 'width:100%;cursor:pointer;background:var(--danger)' }, 'برای شروع کلیک کن');
    const best = el('div', { class: 'stats', style: 'margin-top:10px' });
    let t0 = 0, state = 'idle', timer = null;
    const showBest = () => {
      best.textContent = '';
      best.append(stat('بهترین', getScores().reaction != null ? faNum(getScores().reaction) + ' ms' : '—'));
    };
    showBest();
    setCleanup(() => clearTimeout(timer)); // v1.3.4
    stage.addEventListener('click', () => {
      if (state === 'idle' || state === 'done') {
        state = 'wait'; stage.style.background = 'var(--danger)'; stage.textContent = 'صبر کن… قرمز';
        timer = setTimeout(() => { state = 'go'; stage.style.background = 'var(--primary)'; stage.textContent = 'الآن کلیک کن!'; t0 = performance.now(); }, 900 + Math.random() * 2200);
      } else if (state === 'wait') {
        clearTimeout(timer); state = 'done'; stage.style.background = 'var(--warn)'; stage.textContent = 'زود بود! دوباره کلیک کن';
      } else if (state === 'go') {
        const ms = Math.round(performance.now() - t0);
        state = 'done'; stage.style.background = 'var(--info)';
        stage.textContent = `${faNum(ms)} ms — کلیک برای دوباره`;
        if (setBest('reaction', ms, true)) toast('🏆 رکورد جدید!', 'ok');
        showBest();
      }
    });
    root.append(stage, best,
      el('div', { class: 'hint' }, 'وقتی صفحه سبز شد کلیک کن. بهترین زمان (کمترین میلی‌ثانیه) همیشه به‌روز می‌شود — هر بار که بهتر شوی رکورد جابه‌جا می‌شود.'));
  }
});

/* ── ریاضی سرعتی ── */
register({
  id: 'math-speed', cat: 'brain', icon: '⏱️',
  fa: 'ریاضی سرعتی', en: 'Math Sprint',
  desc: '۳۰ ثانیه، بیشترین جواب درست — رکورد محلی',
  keywords: ['math', 'speed', 'ریاضی'],
  mount(root) {
    const q = el('div', { class: 'game-stage', style: 'font-size:2rem;direction:ltr' }, '؟ + ؟');
    const inp = el('input', { class: 'input code', inputmode: 'numeric', style: 'max-width:160px;margin:12px auto;display:block;text-align:center;font-size:1.2rem' });
    const info = el('div', { class: 'stats', style: 'justify-content:center' });
    let ans = 0, score = 0, left = 30, timer = null, playing = false;
    const show = () => {
      info.textContent = '';
      info.append(stat('امتیاز', faNum(score)), stat('زمان', faNum(left)), stat('بهترین', faNum(getScores().mathspeed || 0)));
    };
    const nextQ = () => {
      const a = 2 + Math.floor(Math.random() * 20), b = 2 + Math.floor(Math.random() * 20);
      const mul = Math.random() < 0.5;
      ans = mul ? a * b : a + b;
      q.textContent = mul ? `${a} × ${b}` : `${a} + ${b}`;
      inp.value = ''; inp.focus();
    };
    const start = () => {
      score = 0; left = 30; playing = true; show(); nextQ();
      clearInterval(timer);
      timer = setInterval(() => {
        left -= 1; show();
        if (left <= 0) {
          clearInterval(timer); playing = false;
          if (setBest('mathspeed', score)) toast('🏆 رکورد جدید!', 'ok');
          q.textContent = 'پایان! ' + faNum(score); show();
        }
      }, 1000);
    };
    // fix: اعداد فارسی/عربیِ کیبورد موبایل هم پذیرفته می‌شوند (قبلاً Number('۱۲') = NaN بود)
    const toLatin = (s) => s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    inp.addEventListener('input', () => { if (playing && inp.value.trim() !== '' && Number(toLatin(inp.value.trim())) === ans) { score += 1; show(); nextQ(); } });
    show();
    setCleanup(() => clearInterval(timer)); // v1.3.4
    root.append(q, inp,
      el('button', { class: 'btn primary', style: 'display:block;margin-inline:auto', onclick: start }, '▶ شروع'),
      info,
      el('div', { class: 'hint' }, 'جواب درست بنویس تا سوال بعدی بیاید. بیشترین جواب درست در ۳۰ ثانیه رکورد توست.'));
  }
});
