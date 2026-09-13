/* IR-Toolbox — موتور بررسی ایمنی لینک (کاملاً محلی و آفلاین).
 * هیوریستیک ساختاری بر اساس پرچم‌های قرمز رایج فیشینگ:
 * punycode/همگلیف، IP، ترفند @، کوتاه‌کننده‌ها، TLD پرریسک، typosquat، و…
 * نکتهٔ صادقانه: این بررسی ساختاری است؛ بلک‌لیست زنده (Safe Browsing و…) فقط آنلاین ممکن است.
 */

const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'goo.gl', 'cutt.ly', 'rb.gy', 'ow.ly', 'buff.ly',
  'short.io', 's.id', 'rebrand.ly', 'bl.ly', 'yun.ir', 'b2n.ir', 'opn.to', 'lnkd.in', 'adf.ly',
];
const RISKY_TLDS = [
  'xyz', 'top', 'click', 'link', 'gq', 'tk', 'ml', 'cf', 'buzz', 'rest', 'work', 'zip', 'mov',
  'icu', 'cam', 'lol', 'mom', 'beauty', 'quest', 'skin', 'monster',
];
const BRANDS = [
  'google', 'apple', 'microsoft', 'paypal', 'amazon', 'instagram', 'whatsapp', 'telegram',
  'facebook', 'twitter', 'divar', 'digikala', 'snapp', 'aparat', 'sheypoor', 'cafebazaar',
  'aliexpress', 'ebay', 'linkedin', 'github', 'mellat', 'saman',
];
const SECURITY_WORDS = ['secure', 'login', 'verify', 'account', 'confirm', 'update', 'signin', 'wallet', 'support'];

const lookalikeMap = (s) => s
  .replace(/0/g, 'o').replace(/1/g, 'l').replace(/rn/g, 'm').replace(/vv/g, 'w')
  .replace(/۰/g, 'o').replace(/١/g, 'l');

/**
 * @param {string} input
 * @returns {{score:number, level:'ok'|'warn'|'bad', flags:{fa:string, sev:number}[], url:URL|null}}
 */
export function analyzeUrl(input) {
  const flags = [];
  const add = (sev, fa) => flags.push({ sev, fa });

  let url;
  try { url = new URL(String(input).trim()); } catch { url = null; }
  if (!url) return { score: 100, level: 'bad', flags: [{ sev: 100, fa: 'این مقدار اصلاً یک لینک معتبر نیست' }], url: null };

  const scheme = url.protocol.replace(':', '');
  if (scheme === 'javascript' || scheme === 'data' || scheme === 'vbscript') add(100, `پروتکل «${scheme}» می‌تواند کد اجرا کند — هرگز باز نکن`);
  else if (scheme === 'http') add(25, 'بدون رمزنگاری (http) — اطلاعات شما در مسیر قابل شنود است؛ https ترجیح بده');
  else if (scheme !== 'https') add(10, `پروتکل غیرمعمول «${scheme}»`);
  else add(-8, 'رمزنگاری HTTPS دارد');

  const host = url.hostname;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes('[')) add(30, 'آدرس IP خام به‌جای دامنه — شرکت‌های معتبر این‌کار را نمی‌کنند');
  if (url.username || (url.href.includes('@') && url.host.includes('@'))) add(30, 'ترفند «@»: مرورگر فقط بخش بعد از @ را باز می‌کند');
  if (host.startsWith('xn--')) add(30, 'پیشوند Punycode (xn--) — حروف غیرانگلیسی شبیه به حروف اصلی (هموگلیف)');
  if (/[^\x00-\x7F]/.test(host)) add(25, 'حروف غیرانگلیسی در دامنه — احتمال حملهٔ هموگلیف');

  const parts = host.split('.');
  const tld = parts[parts.length - 1];
  if (RISKY_TLDS.includes(tld)) add(18, `دامنهٔ سطح‌بالای پرریسک «.${tld}» (پرمصرف در کمپین‌های فیشینگ)`);
  else if (['gov', 'edu', 'ac'].includes(tld)) add(-4, 'دامنهٔ سازمانی/دولتی');

  if (SHORTENERS.some((s) => host === s || host.endsWith('.' + s))) add(15, 'کوتاه‌کنندهٔ لینک — مقصد واقعی پنهان است');

  const registered = parts.length >= 2 ? parts.slice(-2).join('.') : host;
  const subdomains = parts.slice(0, -2);
  for (const b of BRANDS) {
    if (subdomains.includes(b) || subdomains.includes('www.' + b)) {
      add(22, `برند «${b}» فقط در زیردامنه آمده — دامنهٔ واقعی (${registered}) متعلق به برند نیست`);
      break;
    }
  }
  for (const b of BRANDS) {
    if (parts.some((lab) => lab !== b && lookalikeMap(lab) === b)) {
      add(20, `جایگذاری حروف/ارقام مشابه برند «${b}» (مثل paypa1)`);
      break;
    }
  }

  if (SECURITY_WORDS.some((w) => host.includes(w))) add(10, 'کلمهٔ فریبندهٔ امنیتی (secure/login/verify…) در خود دامنه');
  if ((host.match(/-/g) || []).length >= 3) add(8, 'خط‌های تیرهٔ زیاد در دامنه');
  if (parts.length > 5) add(8, 'زیردامنه‌های زیاد برای پنهان‌کردن دامنهٔ اصلی');
  if (url.port && url.port !== '80' && url.port !== '443') add(8, `پورت غیرمعمول :${url.port}`);
  if (/%2[fF]|%40/.test(url.pathname + url.search)) add(6, 'نویسه‌های کدگذاری‌شده برای گمراهی در مسیر');

  const score = Math.max(0, flags.reduce((s, f) => s + f.sev, 0));
  const level = score >= 30 ? 'bad' : score >= 10 ? 'warn' : 'ok';
  return { score, level, flags: flags.filter((f) => f.sev > 0), url };
}

export const SAFETY_HINT = 'این بررسی کاملاً محلی و ساختاری است؛ برای اطمینان کامل، بلک‌لیست‌های زنده (مثل Safe Browsing) لازم است که فقط آنلاین کار می‌کنند.';
