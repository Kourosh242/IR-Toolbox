/* IR-Toolbox — سرگرمی / Fun (built-in offline content, no API) */
import { register } from '../js/registry.js';
import { el, copyBtn } from '../js/ui.js';
import { faNum } from '../js/helpers.js';
import { JOKES, IDEAS, QUESTIONS, EMOJIS } from './fun-data.js';

function picker(root, list, label, icon, hint) {
  const box = el('div', { class: 'game-stage', style: 'font-size:1.15rem;padding:20px;cursor:pointer;line-height:2' }, `${icon} روی دکمه بزن!`);
  const counter = el('div', { class: 'hint' }, `${hint} — ${faNum(list.length)} مورد آفلاین`);
  let picked = '';
  const pick = () => {
    // fix: با یک مورد یا تکرار تصادفی، همان مورد قبلی دوباره نمایش داده می‌شد
    let next = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1) while (next === picked) next = list[Math.floor(Math.random() * list.length)];
    picked = next; box.textContent = picked;
  };
  const btn = el('button', { class: 'btn primary', onclick: pick }, `${icon} ${label}`);
  box.addEventListener('click', pick); // cursor:pointer داشت ولی کلیک روی جعبه کاری نمی‌کرد
  // fix: دکمهٔ کپی قبل از انتخاب، متن راهنما («روی دکمه بزن!») را کپی می‌کرد
  root.append(box, el('div', { class: 'dash-actions' }, btn, copyBtn(() => picked, 'کپی')), counter);
}

register({
  id: 'jokes', cat: 'fun', icon: '😄', fa: 'جوک‌سرا', en: 'Jokes', desc: 'بیش از ۹۰ جوک آفلاین فارسی', keywords: ['joke', 'جوک', 'خنده'],
  mount(root) { picker(root, JOKES, 'جوک بعدی', '😄', 'هر بار یک جوک تصادفی — بدون اینترنت'); }
});
register({
  id: 'ideas', cat: 'fun', icon: '💡', fa: 'ایده‌پرداز', en: 'Idea Generator', desc: 'حدود ۱۰۰ ایده پروژه و کار', keywords: ['idea', 'ایده'],
  mount(root) { picker(root, IDEAS, 'ایده بعدی', '💡', 'ایده‌های پروژه و سرگرمی'); }
});
register({
  id: 'questions', cat: 'fun', icon: '🗣️', fa: 'سوالات دورهمی', en: 'Icebreakers', desc: '۱۰۰ یخ‌شکن مهمونی و دورهمی', keywords: ['question', 'سوال'],
  mount(root) { picker(root, QUESTIONS, 'سوال بعدی', '🗣️', 'برای شکستن یخ مجلس و آشنا شدن'); }
});
register({
  id: 'emoji', cat: 'fun', icon: '\u{1F3AD}', fa: 'ایموجی تصادفی', en: 'Random Emoji', desc: 'بیش از ۱۳۰ ایموجی شانسی', keywords: ['emoji', 'ایموجی'],
  mount(root) { picker(root, EMOJIS, 'ایموجی بعدی', '🎭', 'برای پیام، بیو و هر جا که حال خوب لازم است'); }
});
register({
  id: 'coin', cat: 'fun', icon: '🪙', fa: 'شیر یا خط + تاس', en: 'Coin & Dice', desc: 'تصمیم‌گیر شانسی', keywords: ['coin', 'dice', 'تاس'],
  mount(root) {
    const box = el('div', { class: 'game-stage' }, '🪙');
    root.append(box, el('div', { class: 'dash-actions' },
      el('button', { class: 'btn primary', onclick: () => { box.textContent = Math.random() < 0.5 ? 'شیر 🦁' : 'خط ➖'; } }, '🪙 شیر یا خط'),
      el('button', { class: 'btn tonal', onclick: () => { const n = 1 + Math.floor(Math.random() * 6); box.textContent = ['\u{2680}','\u{2681}','\u{2682}','\u{2683}','\u{2684}','\u{2685}'][n - 1] + ' ' + faNum(n); } }, '🎲 تاس')),
      el('div', { class: 'hint' }, 'برای تصمیم‌های دوگانه و بازی‌های رومیزی — کاملاً تصادفی.'));
  }
});
