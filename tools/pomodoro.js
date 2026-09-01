/* IR-Toolbox — پومودورو: تایمر تمرکز با چرخه‌های استاندارد و رکورد روزانه محلی */
import { register } from '../js/registry.js';
import { el, field, textInput, toast, stat } from '../js/ui.js';
import { faNum } from '../js/helpers.js';
import { read, write } from '../js/storage.js';

const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.27);
    });
  } catch {}
  if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
};

register({
  id: 'pomodoro', cat: 'time', icon: '🍅',
  fa: 'پومودورو', en: 'Pomodoro Focus Timer',
  desc: 'چرخه تمرکز/استراحت با شمارنده دور و رکورد روزانه',
  keywords: ['pomodoro', 'focus', 'تمرکز', 'پومودورو'],
  mount(root) {
    const DUR = { focus: 25, short: 5, long: 15 };
    const fIn = textInput({ mono: true, value: '25', type: 'number', min: 1, max: 180 });
    const sIn = textInput({ mono: true, value: '5', type: 'number', min: 1, max: 60 });
    const lIn = textInput({ mono: true, value: '15', type: 'number', min: 1, max: 90 });
    const autoNext = el('input', { type: 'checkbox' });

    let mode = 'focus', left = 25 * 60, total = left, cycles = 0, endAt = null, tick = null;
    const disp = el('div', { class: 'game-stage mono', style: 'font-size:3rem;direction:ltr' }, '25:00');
    const bar = el('div', { class: 'meter' }, el('div', { style: 'width:0%' }));
    const info = el('div', { class: 'stats', style: 'margin-top:10px' });
    const modeLbl = el('div', { class: 'badge ok', style: 'font-size:.9rem' }, '🎯 تمرکز');

    const todayKey = () => new Date().toISOString().slice(0, 10);
    const getPomo = () => (read('pomo', {})[todayKey()] || 0);

    const show = () => {
      const m = Math.floor(left / 60), s = left % 60;
      disp.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      bar.firstChild.style.width = Math.round(((total - left) / total) * 100) + '%';
      if (tick) document.title = `${disp.textContent} — ${mode === 'focus' ? 'تمرکز' : 'استراحت'} | IR-Toolbox`;
      info.textContent = '';
      info.append(
        stat('دورهای تمرکز این نشست', faNum(cycles)),
        stat('پومودورهای امروز', faNum(getPomo())),
      );
    };
    const setMode = (m) => {
      mode = m;
      const mins = m === 'focus' ? +fIn.value || 25 : m === 'short' ? +sIn.value || 5 : +lIn.value || 15;
      total = left = mins * 60;
      modeLbl.textContent = m === 'focus' ? '🎯 تمرکز' : m === 'short' ? '☕ استراحت کوتاه' : '🌴 استراحت بلند';
      modeLbl.className = `badge ${m === 'focus' ? 'ok' : 'info'}`;
      show();
    };
    const stop = () => { clearInterval(tick); tick = null; endAt = null; document.title = 'IR-Toolbox — جعبه ابزار IR'; };
    const phaseEnd = () => {
      stop(); beep();
      if (mode === 'focus') {
        cycles += 1;
        const all = read('pomo', {}); all[todayKey()] = getPomo() + 1; write('pomo', all);
        toast(`🍅 آفرین! یک پومودور تمام شد (${faNum(getPomo())} امروز)`, 'ok');
        setMode(cycles % 4 === 0 ? 'long' : 'short');
      } else {
        toast('⏳ استراحت تمام شد — بریم سراغ تمرکز', 'info');
        setMode('focus');
      }
      if (autoNext.checked) start();
    };
    const start = () => {
      stop();
      endAt = Date.now() + left * 1000;
      tick = setInterval(() => {
        left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        show();
        if (left <= 0) phaseEnd();
      }, 250);
      show();
    };

    setMode('focus');
    root.append(
      el('div', { style: 'display:flex;gap:10px;align-items:center;justify-content:center' }, modeLbl),
      disp, bar,
      el('div', { class: 'dash-actions', style: 'justify-content:center;margin-top:12px' },
        el('button', { class: 'btn primary', onclick: start }, '▶ شروع'),
        el('button', { class: 'btn tonal', onclick: () => { stop(); show(); } }, '⏸ مکث'),
        el('button', { class: 'btn tonal', onclick: () => { stop(); setMode(mode); } }, '↺ بازنشانی'),
        el('button', { class: 'btn tonal', onclick: () => { stop(); setMode(mode === 'focus' ? 'short' : 'focus'); } }, '⏭ رد شدن')),
      el('div', { class: 'grid2', style: 'margin-top:14px' },
        field('دقیقه تمرکز', fIn), field('استراحت کوتاه', sIn), field('استراحت بلند', lIn),
        field('شروع خودکار مرحله بعد', autoNext)),
      info,
      el('div', { class: 'hint' }, 'روش پومودورو: ۲۵ دقیقه تمرکز متمرکز + ۵ دقیقه استراحت؛ بعد از هر ۴ دور، یک استراحت بلند. تعداد پومودورهای هر روز به‌صورت محلی ذخیره می‌شود.'),
    );
  }
});
