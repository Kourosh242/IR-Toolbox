/* IR-Toolbox — لورم فارسی: متن جای‌نگهدار برای قالب و طراحی */
import { register } from '../js/registry.js';
import { el, field, textInput, readout } from '../js/ui.js';
import { faNum } from '../js/helpers.js';

const WORDS = 'طراحی، نمونه، قالب، رنگ، صفحه، متن، جای‌نگهدار، ابزار، ساده، زیبا، روشن، تازه، ایده، پروژه، کاربر، وب، اپ، محلی، آفلاین، سریع، امن، رایگان، سبک، مدرن، خوانا، تمیز، ترتیب، ساخت، توسعه، برنامه، خروجی، ورودی، فایل، داده، زمان، تاریخ، شماره، حساب، کتاب، قلم، کاغذ، دیوار، شهر، خیابان، آسمان، ستاره، ماه، خورشید، باران، باد، بهار، تابستان، پاییز، زمستان، صبح، شب، روز، هفته، ماه، سال، دقیقه، ثانیه'.split('، ').map((s) => s.trim());
const CONJ = ['و', 'اما', 'همچنین', 'بنابراین', 'در نتیجه', 'از طرفی'];

function sentence(minW = 6, maxW = 14) {
  const n = minW + Math.floor(Math.random() * (maxW - minW));
  const ws = [];
  for (let i = 0; i < n; i++) {
    let w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (i > 2 && Math.random() < 0.15) w = CONJ[Math.floor(Math.random() * CONJ.length)] + ' ' + w;
    ws.push(w);
  }
  const s = ws.join(' ');
  return s[0] + s.slice(1) + '.';
}

register({
  id: 'lorem', cat: 'text', icon: '📜',
  fa: 'لورم فارسی', en: 'Persian Lorem Ipsum',
  desc: 'متن جای‌نگهدار فارسی برای قالب و طراحی',
  keywords: ['lorem', 'placeholder', 'لورم', 'متن نمونه'],
  mount(root) {
    const p = textInput({ mono: true, value: '3', type: 'number', min: 1, max: 20 });
    const s = textInput({ mono: true, value: '4', type: 'number', min: 1, max: 12 });
    const out = readout('متن نمونه این‌جا…');
    const gen = () => {
      const paras = Math.min(20, Math.max(1, +p.value || 1));
      const sents = Math.min(12, Math.max(1, +s.value || 1));
      out.set(Array.from({ length: paras }, () =>
        Array.from({ length: sents }, () => sentence()).join(' ')).join('\n\n'));
    };
    root.append(
      el('div', { class: 'grid2' }, field('تعداد پاراگراف', p), field('جمله در هر پاراگراف', s)),
      el('button', { class: 'btn primary', onclick: gen }, '✨ تولید متن نمونه'),
      out.root,
      el('div', { class: 'hint' }, 'برای پر کردن موقت قالب، کارت و صفحه طراحی تا وقتی متن اصلی آماده نشده.'),
    );
  }
});
