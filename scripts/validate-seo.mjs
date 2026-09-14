#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 * IR-Toolbox — راستی‌آزمای SEO/GEO (npm run validate:seo)
 * ───────────────────────────────────────────────────────────────────────────
 * همهٔ ادعاهای سئو را روی فایل‌های واقعیِ تولیدشده بررسی می‌کند:
 *   ۱. صفحات: title/description/canonical یکتا، یک H1، OG/Twitter کامل
 *   ۲. JSON-LD: پارس‌شدنی، بدون اسکیمای منسوخ/محدود، @id یکتا و سازگار
 *   ۳. sitemap.xml: XML معتبر، هر آدرس واقعاً وجود دارد، بدون تکرار
 *   ۴. robots.txt: نحو درست + خط Sitemap صحیح + دسترسی خزنده‌های AI
 *   ۵. llms.txt: هویت، شمارش ابزارها، و وجود همهٔ آدرس‌های ذکرشده
 *   ۶. لینک داخلی: هر href به فایل واقعی می‌رسد (بدون لینک شکسته)
 *   ۷. صفحات یتیم: هر صفحهٔ ایندکس‌شدنی دست‌کم یک لینک ورودی دارد
 *   ۸. basePath: هیچ آدرس مطلق/مسیر دارایی بدون /IR-Toolbox/ نیست
 *
 * کد خروج: ۰ = همه‌چیز درست، ۱ = دست‌کم یک خطا.
 * ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, BASE } from '../seo/site.mjs';
import { CATS_SEO, TOOLS_SEO } from '../seo/tools-meta.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BP = SITE.basePath.replace(/\/+$/, '');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const exists = (f) => existsSync(join(ROOT, f));

const errors = [];
const warns = [];
const ok = [];
const fail = (m) => errors.push(m);
const pass = (m) => ok.push(m);

/* ── نگاشت آدرس عمومی → مسیر فایل ── */
const urlToFile = (u) => {
  if (!u.startsWith(BASE)) return null;
  let rel = u.slice(BASE.length);
  if (rel === '') return 'index.html';
  return rel.endsWith('/') ? `${rel}index.html` : rel;
};

/* ═══════════ جمع‌آوری صفحات ═══════════ */
const pages = [];
const walk = (dir) => {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const f = `${dir}/${e.name}`.replace(/^\/+/, '');
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.html')) pages.push(f);
  }
};
walk('');
/* این فایل‌ها صفحهٔ محتوا نیستند (تأیید مالکیت جست‌وجو) — از بازرسی صفحه مستثنا */
const NOT_PAGES = ['googlec599a5dbc4ef5c74.html'];
const allFiles = pages.slice();
pages.length = 0; pages.push(...allFiles.filter((f) => !NOT_PAGES.includes(f)));
const staticPages = pages.filter((f) => f !== 'index.html');

/* ═══════════ ۱+۲+۶: بازرسی هر صفحه ═══════════ */
const seen = { title: new Map(), desc: new Map(), canon: new Map() };
const inbound = new Map();          // فایل → تعداد لینک ورودی
const inboundFrom = new Map();
const addInbound = (to, from) => { inbound.set(to, (inbound.get(to) || 0) + 1); if (!inboundFrom.has(to)) inboundFrom.set(to, new Set()); inboundFrom.get(to).add(from); };
const FORBIDDEN_TYPES = ['FAQPage', 'HowTo', 'Review', 'AggregateRating'];
const ldIds = new Map();            // @id → صفحاتی که تعریفش کرده‌اند

for (const f of pages) {
  const html = read(f);
  const where = `[${f}]`;

  /* title */
  const t = /<title>([\s\S]*?)<\/title>/.exec(html);
  if (!t || !t[1].trim()) fail(`${where} عنوان (<title>) ندارد`);
  else {
    const v = t[1].trim();
    if (v.length > 70) warns.push(`${where} عنوان ${v.length} نویسه است (>70)`);
    if (seen.title.has(v)) fail(`${where} عنوان تکراری با ${seen.title.get(v)}: «${v}»`);
    else seen.title.set(v, f);
  }

  /* description */
  const d = /<meta name="description" content="([^"]*)"/.exec(html);
  if (!d || d[1].trim().length < 50) fail(`${where} توضیح متا ندارد یا کوتاه است`);
  else {
    if (d[1].length > 300) warns.push(`${where} توضیح متا ${d[1].length} نویسه است (>300)`);
    if (seen.desc.has(d[1])) fail(`${where} توضیح متای تکراری با ${seen.desc.get(d[1])}`);
    else seen.desc.set(d[1], f);
  }

  /* canonical */
  const c = /<link rel="canonical" href="([^"]+)"/.exec(html);
  const noindex = /name="robots" content="noindex/.test(html);
  if (!c) { if (!noindex) fail(`${where} canonical ندارد`); }
  else {
    if (!c[1].startsWith(BASE)) fail(`${where} canonical basePath درست ندارد: ${c[1]}`);
    if (seen.canon.has(c[1])) fail(`${where} canonical تکراری با ${seen.canon.get(c[1])}: ${c[1]}`);
    else seen.canon.set(c[1], f);
    const expect = BASE + (f === 'index.html' ? '' : f.replace(/index\.html$/, '').replace(/\.html$/, '.html'));
    if (!noindex && c[1] !== expect) fail(`${where} canonical با مسیر واقعی نمی‌خواند: ${c[1]} ≠ ${expect}`);
  }

  /* یک H1 */
  const h1 = html.match(/<h1[\s>]/g) || [];
  if (h1.length !== 1) fail(`${where} تعداد H1 = ${h1.length} (باید دقیقاً ۱ باشد)`);

  /* سلسله‌مراتب تیترها: هیچ پرشی از h1 به h3 */
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) fail(`${where} پرش تیتر h${levels[i - 1]} → h${levels[i]}`);

  /* OG / Twitter */
  for (const prop of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image']) {
    const m = new RegExp(`<meta property="${prop}" content="([^"]*)"`).exec(html);
    if (!m || !m[1].trim()) fail(`${where} ${prop} ندارد`);
    else if (prop === 'og:image' && !m[1].startsWith(BASE)) fail(`${where} og:image مطلق/درست نیست: ${m[1]}`);
    else if (prop === 'og:url' && !m[1].startsWith(BASE)) fail(`${where} og:url basePath ندارد: ${m[1]}`);
  }
  for (const prop of ['twitter:card', 'twitter:title', 'twitter:image']) {
    const m = new RegExp(`<meta name="${prop}" content="([^"]*)"`).exec(html);
    if (!m || !m[1].trim()) fail(`${where} ${prop} ندارد`);
  }
  const ogImg = /<meta property="og:image" content="([^"]+)"/.exec(html);
  if (ogImg && !exists(urlToFile(ogImg[1]) || '__none__')) fail(`${where} og:image به فایل موجود اشاره نمی‌کند: ${ogImg[1]}`);

  /* JSON-LD */
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { fail(`${where} JSON-LD پارس نشد: ${e.message}`); continue; }
    const nodes = data['@graph'] || [data];
    for (const n of nodes) {
      const ty = n['@type'];
      if (FORBIDDEN_TYPES.includes(ty)) fail(`${where} اسکیمای ممنوع/منسوخ: ${ty}`);
      if (n['@id']) {
        if (ldIds.has(n['@id'])) {
          const prev = ldIds.get(n['@id']);
          if (JSON.stringify(prev.def) !== JSON.stringify(n)) {
            /* تعریف ناسازگار یک موجودیت = مشکل واقعی */
            if (ty === 'Person' || ty === 'WebSite') {
              const k1 = Object.keys(prev.def).sort().join(), k2 = Object.keys(n).sort().join();
              if (k1 !== k2) fail(`${where} تعریف ناسازگار ${ty} با ${prev.where}`);
            }
          }
        } else ldIds.set(n['@id'], { def: n, where: f });
      }
      /* URLهای داخل اسکیما باید basePath درست داشته باشند */
      for (const key of ['url', 'item', 'image', 'screenshot', 'license']) {
        const v = n[key];
        if (typeof v === 'string' && v.includes('github.io') && !v.startsWith(BASE) && key !== 'license')
          fail(`${where} ${ty}.${key} basePath ندارد: ${v}`);
      }
      if (Array.isArray(n.itemListElement)) {
        for (const it of n.itemListElement) {
          if (it.url && !it.url.startsWith(BASE)) fail(`${where} itemListElement.url basePath ندارد: ${it.url}`);
          if (it.url) { const fl = urlToFile(it.url); if (fl && !exists(fl)) fail(`${where} itemListElement به فایل ناموجود: ${it.url}`); }
        }
      }
      if (Array.isArray(n.featureList)) {
        for (const ft of n.featureList) if (!ft || String(ft).length < 5) fail(`${where} featureList خالی/کوتاه`);
      }
    }
  }

  /* لینک‌های داخلی */
  for (const m of html.matchAll(/(?:href)="([^"#][^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (/^https?:/.test(href)) {
      if (href.includes('github.io')) {
        const fl = urlToFile(href.split('#')[0]);
        if (fl === null) fail(`${where} آدرس داخلی با basePath نادرست: ${href}`);
        else if (!exists(fl)) fail(`${where} لینک شکسته: ${href}`);
      }
      continue; // بقیهٔ دامنه‌ها بیرونی‌اند (بررسی شبکه‌ای نمی‌کنیم)
    }
    if (href.startsWith(BP + '/') || href === BP) {
      /* فرگمنت (#/t/x مسیر اپ است) پیش از resolve حذف می‌شود */
      const noHash = href.split('#')[0];
      const rel2 = noHash.slice(BP.length).replace(/^\/+/, '');
      const target = rel2 === '' ? 'index.html' : (rel2.endsWith('/') ? `${rel2}index.html` : rel2);
      if (!exists(target)) fail(`${where} لینک داخلی شکسته: ${href} → ${target}`);
      else addInbound(target, f);
      continue;
    }
    if (href.startsWith('/') && !href.startsWith(BP + '/')) fail(`${where} مسیر ریشه‌ای بدون basePath: ${href}`);
    else if (!href.startsWith('/') && !href.startsWith('#')) {
      /* مسیر نسبی: نسبت به پوشهٔ همان صفحه resolve می‌شود */
      const base = dirname(f) === '.' ? '' : `${dirname(f)}/`;
      const target = `${base}${href.split('#')[0]}`.replace(/^\.\//, '');
      if (!exists(target)) fail(`${where} مسیر نسبی شکسته: ${href} → ${target}`);
    }
  }
}
pass(`بازرسی ${pages.length} صفحهٔ HTML انجام شد`);

/* ═══════════ ۳: sitemap.xml ═══════════ */
{
  const sm = read('sitemap.xml');
  if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(sm)) fail('[sitemap.xml] اعلامیهٔ XML ندارد');
  if (!/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(sm)) fail('[sitemap.xml] namespace نادرست');
  const open = (sm.match(/<url>/g) || []).length, close = (sm.match(/<\/url>/g) || []).length;
  if (open !== close) fail(`[sitemap.xml] تگ <url> نابسته: ${open} باز / ${close} بسته`);
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length !== open) fail(`[sitemap.xml] شمار <loc> (${locs.length}) با <url> (${open}) نمی‌خواند`);
  const dup = locs.filter((l, i) => locs.indexOf(l) !== i);
  if (dup.length) fail(`[sitemap.xml] آدرس تکراری: ${[...new Set(dup)].join('، ')}`);
  let missing = 0;
  for (const l of locs) {
    if (!l.startsWith(BASE)) { fail(`[sitemap.xml] basePath نادرست: ${l}`); continue; }
    const f = urlToFile(l);
    if (!f || !exists(f)) { fail(`[sitemap.xml] آدرس به فایل موجود نمی‌رسد: ${l}`); missing++; }
  }
  for (const l of locs) {
    const lm = new RegExp(`<loc>${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`).exec(sm);
    if (!lm) fail(`[sitemap.xml] lastmod ندارد: ${l}`);
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(lm[1])) fail(`[sitemap.xml] lastmod نامعتبر (${lm[1]}): ${l}`);
  }
  /* هر صفحهٔ ایندکس‌شدنی باید در sitemap باشد */
  for (const f of staticPages) {
    if (/name="robots" content="noindex/.test(read(f))) continue;
    const u = BASE + (f.endsWith('index.html') ? f.replace(/index\.html$/, '') : f);
    if (!locs.includes(u)) fail(`[sitemap.xml] صفحهٔ ایندکس‌شدنی در sitemap نیست: ${u}`);
  }
  pass(`sitemap.xml: ${locs.length} آدرس، همه به فایل واقعی می‌رسند`);
}

/* ═══════════ ۴: robots.txt ═══════════ */
{
  const r = read('robots.txt');
  const lines = r.split('\n');
  let ua = 0, bad = 0;
  for (const raw of lines) {
    const L = raw.replace(/#.*$/, '').trim();
    if (!L) continue;
    if (/^(User-agent|Allow|Disallow|Sitemap):/i.test(L)) { if (/^User-agent:/i.test(L)) ua++; continue; }
    bad++; fail(`[robots.txt] خط نامعتبر: «${raw}»`);
  }
  if (!ua) fail('[robots.txt] هیچ User-agent ندارد');
  const smLine = lines.find((l) => /^Sitemap:/i.test(l.trim()));
  if (!smLine) fail('[robots.txt] خط Sitemap ندارد');
  else if (smLine.trim() !== `Sitemap: ${BASE}sitemap.xml`) fail(`[robots.txt] Sitemap نادرست: ${smLine.trim()}`);
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'])
    if (!new RegExp(`^User-agent: ${bot}$`, 'm').test(r)) fail(`[robots.txt] خزندهٔ AI ذکر نشده: ${bot}`);
  if (!/User-agent: \*/.test(r)) fail('[robots.txt] قانون عمومی User-agent: * ندارد');
  pass(`robots.txt معتبر (${ua} بلوک User-agent، خط Sitemap درست)`);
}

/* ═══════════ ۵: llms.txt ═══════════ */
{
  const t = read('llms.txt');
  if (!t.startsWith('# ')) fail('[llms.txt] با «# » شروع نمی‌شود');
  if (!t.includes(SITE.name)) fail('[llms.txt] نام پروژه در آن نیست');
  if (!t.includes(SITE.author.name)) fail('[llms.txt] نام سازنده در آن نیست');
  if (!t.includes(SITE.repo)) fail('[llms.txt] آدرس مخزن در آن نیست');
  if (!t.includes(`${SITE.toolCount}`) && !t.includes(faNum(SITE.toolCount))) fail('[llms.txt] شمار ابزارها در آن نیست');
  const links = [...t.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
  let ext = 0;
  for (const l of links) {
    if (!l.includes('github.io')) { ext++; continue; }
    const f = urlToFile(l);
    if (!f || !exists(f)) fail(`[llms.txt] آدرس به فایل موجود نمی‌رسد: ${l}`);
  }
  if (links.length < SITE.toolCount) fail(`[llms.txt] فقط ${links.length} لینک دارد (< ${SITE.toolCount} ابزار)`);
  pass(`llms.txt: ${links.length} لینک (${links.length - ext} داخلی، همه موجود)`);
}

/* ═══════════ ۷: صفحات یتیم ═══════════ */
{
  const orphans = staticPages.filter((f) => {
    if (/name="robots" content="noindex/.test(read(f))) return false;
    return !inbound.has(f);
  });
  if (orphans.length) fail(`صفحات یتیم (بدون لینک ورودی): ${orphans.join('، ')}`);
  else pass('هیچ صفحهٔ یتیمی وجود ندارد — همه از صفحه‌های دیگر لینک گرفته‌اند');
}

/* ═══════════ ۸: سازگاری موجودیت (Entity) ═══════════ */
{
  const websites = [...ldIds.keys()].filter((k) => k.endsWith('#website'));
  const people = [...ldIds.keys()].filter((k) => k.endsWith('#author'));
  if (websites.length !== 1) fail(`تعداد WebSite @id = ${websites.length} (باید ۱ باشد)`);
  if (people.length !== 1) fail(`تعداد Person @id = ${people.length} (باید ۱ باشد)`);
  const w = ldIds.get(websites[0]);
  if (w && w.def.url !== BASE) fail(`WebSite.url = ${w.def.url} ≠ ${BASE}`);
  const app = ldIds.get(`${BASE}#application`);
  if (!app) fail('WebApplication با @id استاندارد پیدا نشد');
  else {
    if (app.def.softwareVersion !== SITE.version) fail(`softwareVersion = ${app.def.softwareVersion} ≠ ${SITE.version}`);
    if (!Array.isArray(app.def.featureList) || app.def.featureList.length !== SITE.catCount)
      fail(`featureList باید ${SITE.catCount} مورد باشد، هست ${app.def.featureList?.length}`);
    if (Array.isArray(app.def.hasPart) && app.def.hasPart.length !== SITE.toolCount)
      fail(`hasPart باید ${SITE.toolCount} مورد باشد، هست ${app.def.hasPart.length}`);
  }
  /* manifest باید با هویت یکی باشد */
  const man = JSON.parse(read('manifest.json'));
  if (man.version !== SITE.version) fail(`manifest.version = ${man.version} ≠ ${SITE.version}`);
  if (!man.name.includes(SITE.name)) fail(`manifest.name نام پروژه را ندارد: ${man.name}`);
  pass(`هویت سازگار: ۱ WebSite، ۱ Person، ۱ WebApplication (نسخهٔ ${SITE.version})`);
}

/* ═══════════ ۹: پوشش ۵۲ ابزار و ۹ دسته ═══════════ */
{
  const dirs = readdirSync(join(ROOT, 'tools'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const wantTools = new Set(TOOLS_SEO.map((t) => t.slug));
  const wantCats = new Set(CATS_SEO.map((c) => c.slug));
  const extra = dirs.filter((d) => !wantTools.has(d) && !wantCats.has(d));
  const missingT = [...wantTools].filter((d) => !dirs.includes(d));
  const missingC = [...wantCats].filter((d) => !dirs.includes(d));
  if (extra.length) fail(`پوشهٔ ناشناخته زیر tools/: ${extra.join('، ')}`);
  if (missingT.length) fail(`صفحهٔ ابزار ساخته نشده: ${missingT.join('، ')}`);
  if (missingC.length) fail(`صفحهٔ دسته ساخته نشده: ${missingC.join('، ')}`);
  const toolDirs = dirs.filter((d) => wantTools.has(d));
  const catDirs = dirs.filter((d) => wantCats.has(d));
  if (toolDirs.length !== SITE.toolCount) fail(`صفحات ابزار = ${toolDirs.length} (باید ${SITE.toolCount} باشد)`);
  else pass(`هر ${SITE.toolCount} ابزار صفحهٔ اختصاصی دارد`);
  if (catDirs.length !== SITE.catCount) fail(`صفحات دسته = ${catDirs.length} (باید ${SITE.catCount} باشد)`);
  else pass(`هر ${SITE.catCount} دسته صفحهٔ اختصاصی دارد`);
  /* slug دسته و ابزار نباید با هم برخورد کنند */
  const clash = [...wantTools].filter((x) => wantCats.has(x));
  if (clash.length) fail(`slug ابزار و دسته یکی است: ${clash.join('، ')}`);

  const hub = read('tools/index.html');
  for (const d of toolDirs) if (!hub.includes(`tools/${d}/`)) fail(`هاب به صفحهٔ ${d} لینک ندارد`);
  for (const d of catDirs) if (!hub.includes(`tools/${d}/`)) fail(`هاب به دستهٔ ${d} لینک ندارد`);
  pass('هاب ابزارها به همهٔ صفحات ابزار و دسته لینک دارد');

  /* صفحهٔ اصلی باید لینک <a> واقعی به about و tools داشته باشد (نه فقط در JSON-LD) */
  const home = read('index.html');
  const anchors = new Set([...home.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => m[1]));
  for (const must of [`${BP}/about/`, `${BP}/tools/`]) {
    if (!anchors.has(must)) fail(`[index.html] لینک <a> به ${must} ندارد`);
  }
  const linkedTools = [...anchors].filter((a) => a.startsWith(`${BP}/tools/`)).length;
  if (linkedTools < SITE.toolCount + SITE.catCount)
    fail(`[index.html] فقط ${linkedTools} لینک ابزار/دسته دارد (باید ≥ ${SITE.toolCount + SITE.catCount})`);
  else pass(`صفحهٔ اصلی ${linkedTools} لینک واقعی به ابزار/دسته و همچنین /about/ و /tools/ دارد`);
}

/* ═══════════ ۱۰: basePath در کل ریپو ═══════════ */
{
  let bad = 0;
  for (const f of [...pages, 'sitemap.xml', 'robots.txt', 'llms.txt']) {
    const txt = read(f);
    for (const m of txt.matchAll(/https:\/\/kourosh242\.github\.io(\/[^"'\s)<]*)?/g)) {
      const path = m[1] || '/';
      if (!path.startsWith(`${BP}/`) && path !== `${BP}/`) { fail(`[${f}] آدرس github.io بدون basePath: ${m[0]}`); bad++; }
      if (path.includes(`${BP}/${BP}/`)) { fail(`[${f}] basePath دوبار: ${m[0]}`); bad++; }
    }
    /* دارایی‌های ریشه‌ای باید با basePath شروع شوند */
    for (const m of txt.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      if (!m[1].startsWith(`${BP}/`)) { fail(`[${f}] مسیر ریشه‌ای بدون basePath: ${m[1]}`); bad++; }
    }
  }
  if (!bad) pass(`همهٔ آدرس‌ها basePath «${BP}/» را دارند`);
}

/* ═══════════ گزارش ═══════════ */
function faNum(n) { return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]); }
console.log('─'.repeat(74));
console.log(`راستی‌آزمای SEO/GEO — پایه: ${BASE}`);
console.log('─'.repeat(74));
for (const m of ok) console.log(`  ✔ ${m}`);
for (const m of warns) console.log(`  ⚠ ${m}`);
if (errors.length) {
  console.log(`\n❌ ${errors.length} خطا:`);
  for (const e of errors) console.log(`  • ${e}`);
}
console.log('─'.repeat(74));
console.log(errors.length ? `نتیجه: رد (${errors.length} خطا، ${warns.length} هشدار)` : `نتیجه: قبول ✔ (${ok.length} بررسی، ${warns.length} هشدار)`);
process.exit(errors.length ? 1 : 0);
