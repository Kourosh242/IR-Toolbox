/* IVA — app shell, routes, pages. */
import * as registry from './registry.js';
import * as router from './router.js';
import * as store from './storage.js';
import { el, toast } from './ui.js';
import { faNum, faDate, timeAgo, highlight } from './helpers.js';
import { initSearch } from './search.js';
import * as pwa from './pwa.js';
import { HELPS } from './helps.js';
import { CHANGELOG, VERSION } from './changelog.js';

/* Tool modules (self-registering) */
import '../tools/text.js';
import '../tools/dev.js';
import '../tools/design.js';
import '../tools/files.js';
import '../tools/math.js';
import '../tools/time.js';
import '../tools/security.js';
import '../tools/fun.js';
import '../tools/brain.js';
import '../vault/vault.js';

const SPARK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/><circle cx="19" cy="5" r="2.2" fill="#E0A458"/></svg>';

/* ── Theme & motion ── */
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyPrefs() {
  const s = store.getSettings();
  let t = s.theme;
  if (t === 'system') t = mq.matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.motion = s.motion === 'reduced' ? 'reduced' : 'auto';
}
mq.addEventListener?.('change', applyPrefs);

/* ── Shell ── */
const view = () => document.getElementById('view');

const NAV_MAIN = [
  { hash: '#/', icon: '🏠', fa: 'خانه', test: (p) => p.length === 0 },
  { hash: '#/fav', icon: '⭐', fa: 'علاقه‌مندی‌ها', test: (p) => p[0] === 'fav' },
  { hash: '#/t/vault', icon: '🧰', fa: 'گاوصندوق IVA', test: (p) => p[0] === 't' && p[1] === 'vault' },
];
const NAV_FOOT = [
  { hash: '#/changelog', icon: '🗂️', fa: 'تغییرات ورژن', test: (p) => p[0] === 'changelog' },
  { hash: '#/settings', icon: '⚙️', fa: 'تنظیمات', test: (p) => p[0] === 'settings' },
  { hash: '#/sec', icon: '🛡️', fa: 'امنیت و حریم', test: (p) => p[0] === 'sec' },
];

function buildShell() {
  const sidebar = el('aside', { class: 'sidebar', id: 'sidebar' });
  const brand = el('div', { class: 'brand' },
    el('div', { class: 'brand-logo', html: SPARK }),
    el('div', {}, el('div', { class: 'brand-name' }, 'IVA'), el('div', { class: 'brand-sub' }, 'جعبه ابزار آیوا')));
  sidebar.append(brand);

  const navFor = (items) => items.map((n) =>
    el('button', { class: 'nav-item', dataset: { hash: n.hash }, onclick: () => { location.hash = n.hash; } },
      el('span', { class: 'ico' }, n.icon), n.fa));

  sidebar.append(...navFor(NAV_MAIN));
  sidebar.append(el('div', { class: 'hint', style: 'padding:12px 14px 4px;font-size:.68rem;letter-spacing:.12em' }, 'دسته‌ها'));
  sidebar.append(...navFor(registry.CATS.map((c) => ({ hash: `#/c/${c.id}`, icon: c.icon, fa: c.fa, test: (p) => p[0] === 'c' && p[1] === c.id }))));
  sidebar.append(el('div', { style: 'flex:1' }), ...navFor(NAV_FOOT));

  const searchBtn = el('button', { class: 'searchbox', id: 'searchbtn', 'aria-label': 'جستجو (Ctrl+K)' },
    el('span', {}, '🔍'), el('span', {}, 'جستجوی ابزار…'), el('kbd', {}, 'Ctrl K'));

  const themeBtn = el('button', { class: 'btn tonal icon', 'aria-label': 'تغییر روشن/تاریک', onclick: () => {
    const cur = document.documentElement.dataset.theme;
    store.setSettings({ theme: cur === 'dark' ? 'light' : 'dark' });
    applyPrefs(); markNav();
  } }, '🌓');

  const topbar = el('header', { class: 'topbar' }, searchBtn,
    el('div', { class: 'topbar-actions' }, themeBtn));

  const bottom = el('nav', { class: 'bottomnav', 'aria-label': 'ناوبری اصلی' }, el('div', { class: 'inner' },
    [...NAV_MAIN, NAV_FOOT[1], NAV_FOOT[0]].map((n) =>
      el('button', { dataset: { hash: n.hash }, onclick: () => { location.hash = n.hash; } },
        el('span', { class: 'ico' }, n.icon), n.fa))));

  const app = el('div', { class: 'app' }, sidebar,
    el('div', { class: 'main' }, topbar, el('main', { class: 'view', id: 'view' })));
  document.body.append(app, bottom, el('div', { id: 'toasts' }));
}

function markNav() {
  const parts = router.parse();
  document.querySelectorAll('[data-hash]').forEach((b) => {
    const item = [...NAV_MAIN, ...NAV_FOOT, ...registry.CATS.map((c) => ({ hash: `#/c/${c.id}`, test: (p) => p[0] === 'c' && p[1] === c.id }))]
      .find((n) => n.hash === b.dataset.hash);
    b.classList.toggle('active', !!item && item.test(parts));
  });
}

/* ── Cards ── */
function toolCard(t, q = '') {
  const fav = store.getFavs().includes(t.id);
  const card = el('div', { class: 'tool-card card lift', role: 'button', tabindex: '0', onclick: () => { location.hash = `#/t/${t.id}`; }, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = `#/t/${t.id}`; } } });
  card.append(
    el('button', {
      class: `fav ${fav ? 'on' : ''}`, 'aria-label': 'علاقه‌مندی',
      onclick: (e) => {
        e.stopPropagation();
        const on = store.toggleFav(t.id);
        toast(on ? 'به علاقه‌مندی‌ها اضافه شد ⭐' : 'از علاقه‌مندی‌ها حذف شد', 'ok');
        renderCurrent();
      }
    }, fav ? '★' : '☆'),
    el('div', { class: 'row' }, el('div', { class: 'ico' }, t.icon),
      el('div', {}, el('h3', { html: highlight(t.fa, q) }), el('span', { class: 'en' }, t.en))),
    el('p', { class: 'desc', html: highlight(t.desc, q) }),
  );
  return card;
}

/* ── Pages ─ */
function pageHome() {
  document.title = 'IVA — جعبه ابزار آیوا';
  const favs = store.getFavs().map(registry.get).filter(Boolean);
  const recents = store.getRecents().map((r) => ({ t: registry.get(r.id), ts: r.ts })).filter((r) => r.t);

  const install = el('div', {});
  const addInstall = () => {
    install.textContent = '';
    if (pwa.canInstall()) {
      install.append(el('button', { class: 'btn primary', onclick: async () => { if (await pwa.promptInstall()) toast('نصب شد 🎉'); } }, '📲 نصب اپ'));
    } else if (pwa.isIOS() && !pwa.isStandalone()) {
      install.append(el('button', { class: 'btn tonal', onclick: () => toast('در سافاری: Share ← سپس Add to Home Screen', 'info', 5000) }, '📲 نصب روی iOS'));
    }
  };
  pwa.onInstallAvailable(addInstall); addInstall();

  const hero = el('div', { class: 'hero-dash' },
    el('span', { class: 'eyebrow' }, '✦ کاملاً محلی · بدون سرور · آفلاین'),
    el('h1', {}, 'جعبه ابزار آیوا'),
    el('p', {}, `${faNum(registry.all().length)} ابزار کاربردی در جیب شما — متن، کد، فایل، امنیت و سرگرمی. همه‌چیز روی دستگاه خودتان می‌ماند.`),
    el('div', { class: 'hint', style: 'margin-top:6px' }, faDate()),
    el('div', { class: 'dash-actions' },
      el('button', { class: 'btn primary', onclick: () => location.hash = '#/t/vault' }, '🧰 گاوصندوق IVA'),
      el('button', { class: 'btn tonal', onclick: () => search.open() }, '🔍 جستجو'),
      install),
    el('div', { class: 'stats', style: 'margin-top:16px' },
      el('span', { class: 'stat' }, el('b', {}, faNum(registry.all().length)), ' ابزار'),
      el('span', { class: 'stat' }, el('b', {}, faNum(registry.CATS.length)), ' دسته'),
      el('span', { class: 'stat' }, ' AES-256-GCM'),
      el('span', { class: 'stat' }, '📴 کار در آفلاین')));

  const sec = (title, body, more) => el('section', {},
    el('div', { class: 'section-title' }, el('h2', {}, title), more || null), body);

  const cats = el('div', { class: 'cat-grid' }, registry.CATS.map((c) =>
    el('button', { class: 'cat-card card lift', onclick: () => location.hash = `#/c/${c.id}` },
      el('div', { class: 'ico' }, c.icon),
      el('h3', {}, c.fa),
      el('p', {}, c.desc),
      el('span', { class: 'count' }, `${faNum(registry.byCat(c.id).length)} ابزار`))));

  const frag = el('div', {}, hero);
  if (favs.length) frag.append(sec('⭐ علاقه‌مندی‌ها', el('div', { class: 'tool-grid' }, favs.map((t) => toolCard(t)))));
  if (recents.length) frag.append(sec('🕘 اخیراً استفاده‌شده', el('div', { class: 'chip-row' },
    recents.map((r) => el('button', { class: 'chip', onclick: () => location.hash = `#/t/${r.t.id}` },
      r.t.icon, ' ', r.fa, ' · ', timeAgo(r.ts))))));
  frag.append(sec('دسته‌بندی‌ها', cats),
    sec('همه ابزارها', el('div', { class: 'tool-grid' }, registry.all().map((t) => toolCard(t)))));
  return frag;
}

function pageCat(id) {
  const c = registry.cat(id);
  if (!c) return notFound();
  document.title = `${c.fa} — IVA`;
  return el('div', {},
    el('div', { class: 'tool-head' },
      el('div', { class: 'ico' }, c.icon),
      el('div', {}, el('h1', {}, c.fa), el('div', { class: 'en' }, c.en + ' — ' + c.desc))),
    el('div', { class: 'tool-grid' }, registry.byCat(id).map((t) => toolCard(t))));
}

function pageTool(id) {
  const t = registry.get(id);
  if (!t) return notFound();
  document.title = `${t.fa} — IVA`;
  store.pushRecent(id);
  const fav = store.getFavs().includes(id);
  const body = el('div', { class: 'tool-body' });
  const head = el('div', { class: 'tool-head' },
    el('div', { class: 'ico' }, t.icon),
    el('div', {},
      el('h1', {}, t.fa),
      el('div', { class: 'en' }, t.en),
      el('a', { href: `#/c/${t.cat}`, style: 'font-size:.75rem' }, registry.cat(t.cat)?.icon + ' ' + registry.cat(t.cat)?.fa)),
    el('div', { class: 'actions' },
      el('button', {
        class: `btn icon tonal ${fav ? '' : ''}`, 'aria-label': 'علاقه‌مندی', style: fav ? 'color:var(--accent)' : '',
        onclick: (e) => { store.toggleFav(id); renderCurrent(); }
      }, fav ? '★' : '☆')));
  t.mount(body);
  const help = HELPS[t.id] || t.desc;
  const helpCard = el('div', { class: 'card', style: 'padding:16px 20px;margin-top:16px' },
    el('div', { class: 'lbl', style: 'font-weight:800;margin-bottom:6px' }, 'ℹ️ توضیحات'),
    el('p', { style: 'margin:0;font-size:.85rem;color:var(--muted)' }, help));
  const page = el('div', {}, head, body, helpCard);
  return page;
}

function pageFav() {
  document.title = 'علاقه‌مندی‌ها — IVA';
  const favs = store.getFavs().map(registry.get).filter(Boolean);
  if (!favs.length) return el('div', { class: 'empty' }, el('span', { class: 'big' }, '☆'), 'هنوز ابزاری را ستاره‌دار نکرده‌اید.', el('div', {}, el('button', { class: 'btn primary', style: 'margin-top:12px', onclick: () => location.hash = '#/' }, 'مشاهده ابزارها')));
  return el('div', {}, el('div', { class: 'tool-head' }, el('div', { class: 'ico' }, '⭐'), el('div', {}, el('h1', {}, 'علاقه‌مندی‌ها'))),
    el('div', { class: 'tool-grid' }, favs.map((t) => toolCard(t))));
}

function segBtns(value, options, onPick) {
  const seg = el('div', { class: 'seg' });
  options.forEach(([v, l]) => seg.append(el('button', { class: v === value ? 'on' : '', onclick: () => { onPick(v); } }, l)));
  return seg;
}

function pageSettings() {
  document.title = 'تنظیمات — IVA';
  const s = store.getSettings();
  const box = el('div', { class: 'card', style: 'padding:8px 20px' });

  const themeRow = el('div', { class: 'set-row' },
    el('div', {}, el('div', { class: 't' }, 'پوسته'), el('div', { class: 'd' }, 'روشن، تاریک، سیستم یا پوسته‌های IVA')),
    el('div', { class: 'ctrl' }, segBtns(s.theme, [['light', 'روشن'], ['dark', 'تاریک'], ['system', 'سیستم'], ['midnight', 'نیمه‌شب'], ['glass', 'شیشه‌ای']], (v) => { store.setSettings({ theme: v }); applyPrefs(); renderCurrent(); })));

  const motionSwitch = el('button', { class: 'switch', role: 'switch', 'aria-checked': s.motion === 'reduced', onclick: (e) => {
    const v = store.getSettings().motion === 'reduced' ? 'auto' : 'reduced';
    store.setSettings({ motion: v }); applyPrefs(); e.currentTarget.setAttribute('aria-checked', v === 'reduced');
  } });
  const motionRow = el('div', { class: 'set-row' },
    el('div', {}, el('div', { class: 't' }, 'کاهش حرکت'), el('div', { class: 'd' }, 'حذف انیمیشن‌ها برای حساسیت به حرکت')),
    el('div', { class: 'ctrl' }, motionSwitch));

  const fileImp = el('input', { type: 'file', accept: '.json', style: 'display:none' });
  fileImp.addEventListener('change', async () => {
    const f = fileImp.files[0]; if (!f) return;
    try { store.importSettings(await f.text()); toast('تنظیمات وارد شد ✔'); applyPrefs(); renderCurrent(); }
    catch { toast('فایل تنظیمات نامعتبر است', 'err'); }
  });

  const dataRow = el('div', { class: 'set-row' },
    el('div', {}, el('div', { class: 't' }, 'داده‌های محلی'), el('div', { class: 'd' }, 'خروجی/ورودی iva-settings.json — بدون رمز گاوصندوق')),
    el('div', { class: 'ctrl' },
      el('button', { class: 'btn tonal sm', onclick: () => import('./helpers.js').then(({ download, textBlob }) => download('iva-settings.json', textBlob(store.exportSettings(), 'application/json'))) }, 'خروجی'),
      el('button', { class: 'btn tonal sm', onclick: () => fileImp.click() }, 'ورودی'),
      el('button', { class: 'btn danger sm', onclick: () => { if (confirm('همه داده‌های محلی IVA پاک شود؟')) { store.clearAll(); applyPrefs(); renderCurrent(); toast('پاک شد'); } } }, 'پاک‌سازی')));

  const pwaRow = el('div', { class: 'set-row' },
    el('div', {}, el('div', { class: 't' }, 'نصب به‌صورت اپ'), el('div', { class: 'd' }, pwa.isIOS() ? 'iOS: در سافاری Share سپس Add to Home Screen' : 'با پشتیبانی مرورگر، IVA مثل اپ نصب می‌شود')),
    el('div', { class: 'ctrl' }, pwa.canInstall()
      ? el('button', { class: 'btn primary sm', onclick: async () => { await pwa.promptInstall(); } }, 'نصب')
      : el('span', { class: 'badge info' }, pwa.isStandalone() ? 'نصب شده ✔' : 'در دسترس نیست')));

  box.append(themeRow, motionRow, dataRow, pwaRow, fileImp);

  return el('div', {},
    el('div', { class: 'tool-head' }, el('div', { class: 'ico' }, '⚙️'), el('div', {}, el('h1', {}, 'تنظیمات'))),
    box,
    el('div', { class: 'hint', style: 'margin-top:14px' }, 'IVA v1.3 — همه داده‌ها فقط روی دستگاه شما (localStorage). بدون سرور، بدون ردیابی.'));
}

function pageChangelog() {
  document.title = 'تغییرات ورژن — IVA';
  const list = el('div', {}, CHANGELOG.map((c) =>
    el('div', { class: 'card', style: 'padding:16px 20px;margin-bottom:14px' },
      el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:8px' },
        el('span', { class: 'badge ok', style: 'font-size:.8rem' }, 'v' + c.v),
        el('span', { class: 'hint', style: 'margin:0' }, c.date)),
      el('ul', { style: 'margin:0;padding-inline-start:18px;font-size:.86rem' },
        c.items.map((it) => el('li', { style: 'margin-bottom:4px' }, it))))));
  return el('div', {},
    el('div', { class: 'tool-head' }, el('div', { class: 'ico' }, '🗂️'),
      el('div', {}, el('h1', {}, 'تغییرات ورژن'), el('div', { class: 'en' }, 'نسخه فعلی: v' + VERSION))),
    list,
    el('div', { class: 'hint' }, 'بعد از هر به‌روزرسانی، فهرست تغییرات/افزوده‌ها/حذف‌ها این‌جا ثبت می‌شود.'));
}

function pageSec() {
  document.title = 'امنیت و حریم — IVA';
  const row = (i, t, d) => el('div', { class: 'set-row' }, el('div', { style: 'font-size:1.3rem' }, i), el('div', {}, el('div', { class: 't' }, t), el('div', { class: 'd' }, d)));
  return el('div', {},
    el('div', { class: 'tool-head' }, el('div', { class: 'ico' }, '🛡️'), el('div', {}, el('h1', {}, 'امنیت و حریم خصوصی'), el('div', { class: 'en' }, 'Security & Privacy'))),
    el('div', { class: 'card', style: 'padding:8px 20px' },
      row('🏠', 'همه‌چیز محلی', 'IVA هیچ سروری ندارد؛ هیچ داده‌ای از مرورگر شما خارج نمی‌شود. بدون آنالیتیکس، بدون کوکی ردیابی، بدون آپلود. حتی وقتی آفلاین باشید کامل کار می‌کند.'),
      row('🧰', 'گاوصندوق IVA', 'رمزنگاری با PBKDF2-HMAC-SHA-256 (۲۵۰٬۰۰ تکرار) برای مشتق کلید + AES-256-GCM برای رمزنگاری، با salt و IV تصادفی برای هر فایل. رمز عبور و کلید هرگز ذخیره نمی‌شوند؛ فراموشی رمز یعنی از دست رفتن داده — این یک ویژگی امنیتی است، نه باگ.'),
      row('📦', 'فایل ‎.iva256', 'کانتینر باینری نسخه‌دار: magic «IVA1» + شماره نسخه + شناسه الگوریتم‌ها + salt + IV + متن رمزنگاری‌شده. نام و نوع فایل‌ها هم رمزنگاری می‌شوند و هنگام بازگشایی دقیقاً برمی‌گردند.'),
      row('#️⃣', 'هش ≠ رمزنگاری', 'هش یک‌طرفه است («اثر انگشت» داده) و برای تشخیص تغییر فایل/متن استفاده می‌شود؛ با هش نمی‌توان چیزی را محرمانه نگه داشت و هش قابل برگشت به متن نیست.'),
      row('⚠️', 'SHA-1 ناامن', 'SHA-1 سال‌هاست شکسته شده؛ فقط برای سازگاری با سامانه‌های قدیمی ارائه شده و با هشدار نمایش داده می‌شود. برای هر کاربرد امنیتی SHA-256 یا بالاتر استفاده کنید.'),
      row('🗄️', 'چه چیزی محلی ذخیره می‌شود؟', 'فقط تنظیمات، علاقه‌مندی‌ها، فهرست ابزارهای اخیر (شناسه ابزار، نه مقدار ورودی‌ها) و رکورد بازی‌ها — با پیشوند iva: در localStorage. خروجی/ورودی تنظیمات هم شامل رمز گاوصندوق نیست.'),
      row('🔓', 'بدون ادعای شکست‌ناپذیری', 'هیچ ابزار رمزنگاری‌ای «غیرقابل شکستن» مطلق نیست؛ امنیت واقعی به قوی بودن رمز عبور شما هم بستگی دارد. رمز بلند و یکتا انتخاب کنید و آن را در جای امن نگه دارید.')),
    el('div', { class: 'hint', style: 'margin-top:12px' }, 'خلاصه فنی کامل‌تر (فرمت کانتینر و جزئیات الگوریتم‌ها) در README پروژه آمده است.'));
}

function notFound() {
  return el('div', { class: 'empty' }, el('span', { class: 'big' }, '🧭'), 'پیدا نشد!', el('div', {}, el('button', { class: 'btn primary', style: 'margin-top:12px', onclick: () => location.hash = '#/' }, 'بازگشت به خانه')));
}

/* ── Routing ── */
function renderCurrent() {
  const parts = router.parse();
  const v = view();
  v.textContent = '';
  let page;
  if (parts.length === 0) page = pageHome();
  else if (parts[0] === 'c') page = pageCat(parts[1]);
  else if (parts[0] === 't') page = pageTool(parts[1]);
  else if (parts[0] === 'fav') page = pageFav();
  else if (parts[0] === 'settings') page = pageSettings();
  else if (parts[0] === 'sec') page = pageSec();
  else if (parts[0] === 'changelog') page = pageChangelog();
  else page = notFound();
  v.append(page);
  markNav();
  window.scrollTo({ top: 0 });
}

let search;
function boot() {
  applyPrefs();
  buildShell();
  search = initSearch();
  document.getElementById('searchbtn').addEventListener('click', () => search.open());
  pwa.register();
  router.listen(renderCurrent);
}
boot();
