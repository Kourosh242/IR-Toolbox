/* IR-Toolbox — modular tool registry.
 * New tool = one registration call (in any module). No app rewrite needed.
 */

export const CATS = [
  { id: 'text',     fa: 'متن',          en: 'Text',       icon: '📝', desc: 'شمارنده، تبدیل و پاک‌سازی متن' },
  { id: 'dev',      fa: 'توسعه‌دهنده',  en: 'Developer',  icon: '💻', desc: 'JSON، Base64، URL، رنگ و کد' },
  { id: 'design',   fa: 'طراحی',        en: 'Design',     icon: '🎨', desc: 'رنگ، کنتراست و تایپوگرافی' },
  { id: 'files',    fa: 'فایل',         en: 'Files',      icon: '📁', desc: 'هش فایل، تصویر و داده — همه محلی' },
  { id: 'math',     fa: 'محاسبات',      en: 'Math',       icon: '🧮', desc: 'ماشین‌حساب، درصد و تبدیل واحد' },
  { id: 'time',     fa: 'زمان',         en: 'Time',       icon: '⏰', desc: 'تاریخ شمسی/میلادی، کرنومتر و تایمر' },
  { id: 'security', fa: 'امنیت',        en: 'Security',   icon: '🔐', desc: 'هش، رمزساز و گاوصندوق IR' },
  { id: 'fun',      fa: 'سرگرمی',       en: 'Fun',        icon: '🎉', desc: 'جوک، ایده و چالش — کاملاً آفلاین' },
  { id: 'brain',    fa: 'بازی فکری',    en: 'Brain',      icon: '🧠', desc: 'بازی‌های حافظه و سرعت با رکورد محلی' },
];

const tools = new Map();

export function register(tool) {
  if (!tool.id || !tool.mount) throw new Error('tool needs id + mount');
  tools.set(tool.id, tool);
}

export const all = () => [...tools.values()];
export const get = (id) => tools.get(id);
export const byCat = (cat) => all().filter((t) => t.cat === cat);
export const cat = (id) => CATS.find((c) => c.id === id);
