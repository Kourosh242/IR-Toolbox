/* IR-Toolbox — تست‌های هسته، بدون هیچ وابستگی خارجی.
 * اجرا:  node --test test/
 *
 * فقط ماژول‌های خالص (بدون DOM) تست می‌شوند؛ مقادیر مرجع از منابع مستقل گرفته شده‌اند
 * (node:crypto برای هش‌ها، تاریخ‌های شناخته‌شده برای جلالی) تا تست، کد را دور نزند.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { analyzeUrl } from '../js/url-safety.js';
import { faNum, faGroup, faBytes, escapeHTML, highlight } from '../js/helpers.js';
import { gregorianToJalali, jalaliToGregorian, isJalaliLeap, jalaliMonthLength } from '../js/jalaali.js';
import { md5hex, sha1hex, sha256hex } from '../js/hashes-sync.js';
import { safeEval } from '../tools/math.js';
import { packContainer, unpackContainer, EXT, MAGIC } from '../vault/file-format.js';

/* ═══ بررسی ایمنی لینک (js/url-safety.js) ═══ */

test('ترفند «@» در هر سه حالت پرچم می‌گیرد', () => {
  // باگ رفع‌شده: userinfo خالی قبلاً هیچ پرچمی نمی‌گرفت (سطح «ایمن» برمی‌گشت)
  for (const u of ['https://@evil.com/', 'https://google.com@evil.com/', 'https://user:pass@evil.com/']) {
    const r = analyzeUrl(u);
    assert.ok(r.flags.some((f) => f.fa.includes('«@»')), `${u} باید پرچم «@» بگیرد`);
    assert.notEqual(r.level, 'ok', `${u} نباید «ایمن» باشد`);
  }
});

test('«@» در مسیر/کوئری، پرچم اشتباه نمی‌گیرد', () => {
  for (const u of ['https://example.com/a@b', 'https://example.com/?to=a@b.com', 'mailto:a@b.com']) {
    const r = analyzeUrl(u);
    assert.ok(!r.flags.some((f) => f.fa.includes('«@»')), `${u} نباید پرچم «@» بگیرد`);
  }
});

test('پروتکل‌های اجرایی «خطرناک» و لینک سالم درست حکم می‌گیرند', () => {
  assert.equal(analyzeUrl('javascript:alert(1)').level, 'bad');
  assert.equal(analyzeUrl('data:text/html,<script>x</script>').level, 'bad');
  const ok = analyzeUrl('https://example.com/');
  assert.equal(ok.level, 'ok');
  assert.equal(ok.score, 0);
  assert.equal(ok.flags.length, 0, 'پرچم‌های با sev منفی نباید به کاربر نشان داده شوند');
});

test('ورودی غیرلینک، بدون پرتاب خطا «خطرناک» است', () => {
  const r = analyzeUrl('این اصلاً لینک نیست');
  assert.equal(r.level, 'bad');
  assert.equal(r.url, null);
});

/* ═══ قالب‌بندی فارسی (js/helpers.js) ═══ */

test('faGroup جداکنندهٔ هزارگان فارسی می‌سازد', () => {
  assert.equal(faGroup(150000), '۱۵۰٬۰۰۰');
  assert.equal(faGroup(1234567.891), '۱٬۲۳۴٬۵۶۷٫۸۹۱');
  assert.equal(faGroup('1,000'), '۱٬۰۰۰', 'ورودیِ از قبل جداشده هم پذیرفته می‌شود');
});

test('faNum ارقام را فارسی می‌کند و faBytes واحد فارسی می‌دهد', () => {
  assert.equal(faNum(1996), '۱۹۹۶');
  assert.equal(faBytes(0), '۰ بایت');
  assert.equal(faBytes(2048), '۲.۰ کیلوبایت', 'مقادیر زیر ۱۰ در واحدهای غیر بایت، یک رقم اعشار دارند');
  assert.equal(faBytes(10240), '۱۰ کیلوبایت');
  assert.equal(faBytes(NaN), '—');
});

test('escapeHTML و highlight خروجی امن می‌دهند', () => {
  assert.equal(escapeHTML(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(highlight('<b>سلام</b>', 'سلام'), '&lt;b&gt;<mark>سلام</mark>&lt;/b&gt;');
  assert.equal(highlight('a+b', '+'), 'a<mark>+</mark>b', 'نویسهٔ regex در پرس‌وجو escape می‌شود');
});

/* ═══ تقویم جلالی (js/jalaali.js) ═══ */

test('تبدیل دوطرفهٔ جلالی/میلادی برای تاریخ‌های شناخته‌شده', () => {
  assert.deepEqual(jalaliToGregorian(1403, 1, 1), { gy: 2024, gm: 3, gd: 20 });
  assert.deepEqual(gregorianToJalali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 });
  assert.deepEqual(jalaliToGregorian(1405, 6, 23), { gy: 2026, gm: 9, gd: 14 });
});

test('سال کبیسه و طول اسفند', () => {
  assert.equal(isJalaliLeap(1403), true);
  assert.equal(isJalaliLeap(1402), false);
  assert.equal(isJalaliLeap(1408), true);
  assert.equal(jalaliMonthLength(1403, 12), 30);
  assert.equal(jalaliMonthLength(1402, 12), 29);
  assert.equal(jalaliMonthLength(1403, 6), 31);
  assert.equal(jalaliMonthLength(1403, 7), 30);
});

test('رفت‌وبرگشت ۱۰۰۰ روز پیوسته بدون خطا', () => {
  for (let i = 0; i < 1000; i++) {
    const d = new Date(Date.UTC(2020, 0, 1) + i * 864e5);
    const gy = d.getUTCFullYear(), gm = d.getUTCMonth() + 1, gd = d.getUTCDate();
    const j = gregorianToJalali(gy, gm, gd);
    const back = jalaliToGregorian(j.jy, j.jm, j.jd);
    assert.deepEqual(back, { gy, gm, gd }, `روز ${i}: ${gy}/${gm}/${gd}`);
  }
});

/* ═══ هش‌های آفلاین (js/hashes-sync.js) در برابر node:crypto ═══ */

test('md5hex با پیاده‌سازی مرجع یکی است', () => {
  for (const s of ['', 'a', 'سلام', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)]) {
    assert.equal(md5hex(s), createHash('md5').update(s, 'utf8').digest('hex'), `md5(${JSON.stringify(s.slice(0, 8))}…)`);
  }
});

test('sha1hex با پیاده‌سازی مرجع یکی است', () => {
  for (const s of ['', 'a', 'سلام', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)]) {
    assert.equal(sha1hex(s), createHash('sha1').update(s, 'utf8').digest('hex'), `sha1(${JSON.stringify(s.slice(0, 8))}…)`);
  }
});

test('sha256hex با پیاده‌سازی مرجع یکی است', () => {
  for (const s of ['', 'a', 'سلام', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)]) {
    assert.equal(sha256hex(s), createHash('sha256').update(s, 'utf8').digest('hex'), `sha256(${JSON.stringify(s.slice(0, 8))}…)`);
  }
});

/* ═══ ارزیابی امن ریاضی (tools/math.js) ═══ */

test('safeEval عبارت‌های معتبر را درست حساب می‌کند', () => {
  assert.equal(safeEval('(12+8)*2 - sqrt(16)'), 36);
  assert.equal(safeEval('2^10'), 1024);
  assert.equal(safeEval('12e3'), 12000, 'نماد علمی با مانتیس چندرقمی');
  assert.equal(safeEval('pow(2,10)'), 1024);
  assert.equal(safeEval('max(3,7)'), 7);
  assert.equal(safeEval('۲+۳'), 5, 'ارقام فارسی');
  assert.equal(safeEval('1,000+1'), 1001, 'جداکنندهٔ هزارگان');
  assert.ok(Math.abs(safeEval('pi') - Math.PI) < 1e-12);
  assert.ok(Math.abs(safeEval('asin(1)') - Math.PI / 2) < 1e-12, 'asin نباید با sin اشتباه شود');
});

test('safeEval ورودی نامعتبر/غیرریاضی را رد می‌کند', () => {
  for (const bad of ['alert(1)', 'process.exit()', 'fetch("x")', '1+', '[]', '{}', 'constructor']) {
    assert.throws(() => safeEval(bad), /نامعتبر|عددی نیست/, `${bad} باید رد شود`);
  }
});

/* ═══ کانتینر گاوصندوق (vault/file-format.js) ═══ */

const enc = new TextEncoder(), dec = new TextDecoder();

test('pack/unpack رفت‌وبرگشت متن و نام/نوع فایل را حفظ می‌کند', async () => {
  const payload = 'سلام IR-Toolbox — متن محرمانه با نویسهٔ فارسی 🇮🇷'.repeat(20);
  const files = [{ name: 'یادداشت.txt', mime: 'text/plain', bytes: enc.encode(payload) }];
  const out = await packContainer(files, 'correct horse battery');
  assert.equal(String.fromCharCode(...out.slice(0, 4)), MAGIC);
  const back = await unpackContainer(out.buffer, 'correct horse battery');
  assert.equal(back.length, 1);
  assert.equal(back[0].name, 'یادداشت.txt');
  assert.equal(back[0].mime, 'text/plain');
  assert.equal(dec.decode(back[0].bytes), payload);
});

test('خروجی فشرده‌سازی می‌شود و آمار حجم درست است', async () => {
  const bytes = enc.encode('AAAA'.repeat(5000)); // بسیار فشرده‌پذیر
  const out = await packContainer([{ name: 'a.bin', mime: 'application/octet-stream', bytes }], 'pw-pw-pw-pw');
  assert.equal(out.compressed, true);
  assert.ok(out.compLen < out.plainLen, 'حجم فشرده باید کمتر از ورودی باشد');
});

test('چند فایل با ترتیب درست برمی‌گردند', async () => {
  const files = [1, 2, 3].map((i) => ({ name: `f${i}.txt`, mime: 'text/plain', bytes: enc.encode('content-' + i) }));
  const out = await packContainer(files, 'pw-pw-pw-pw');
  const back = await unpackContainer(out.buffer, 'pw-pw-pw-pw');
  assert.deepEqual(back.map((f) => f.name), ['f1.txt', 'f2.txt', 'f3.txt']);
  assert.deepEqual(back.map((f) => dec.decode(f.bytes)), ['content-1', 'content-2', 'content-3']);
});

test('رمز اشتباه و فایل دستکاری‌شده رد می‌شوند', async () => {
  const out = await packContainer([{ name: 'a.txt', mime: 'text/plain', bytes: enc.encode('secret') }], 'right-password');
  await assert.rejects(() => unpackContainer(out.buffer, 'wrong-password'));
  const tampered = Uint8Array.from(out);
  tampered[tampered.length - 1] ^= 0xff; // یک بیت از متن رمزشده
  await assert.rejects(() => unpackContainer(tampered.buffer, 'right-password'));
});

test('فایل با magic ناشناخته رد می‌شود', async () => {
  const out = await packContainer([{ name: 'a.txt', mime: 'text/plain', bytes: enc.encode('x') }], 'right-password');
  const bad = Uint8Array.from(out);
  bad[0] = 'X'.charCodeAt(0);
  await assert.rejects(() => unpackContainer(bad.buffer, 'right-password'));
  assert.equal(EXT, '.ir256');
});
