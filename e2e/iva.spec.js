// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('home renders dashboard with categories and tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brand-name')).toHaveText('IVA');
  await expect(page.locator('.cat-card')).toHaveCount(9);
  expect(await page.locator('.tool-card').count()).toBeGreaterThanOrEqual(40);
});

test('json formatter validates and formats', async ({ page }) => {
  await page.goto('/#/t/json-formatter');
  await page.locator('textarea').first().fill('{"b":1,"a":{"x":2}}');
  await page.getByRole('button', { name: 'زیباسازی' }).click();
  await expect(page.locator('.readout').first()).toContainText('"x": 2');
  await page.locator('textarea').first().fill('{oops');
  await page.getByRole('button', { name: 'اعتبارسنجی' }).click();
  await expect(page.locator('.err-box')).toBeVisible();
  await expect(page.locator('.err-box')).toContainText('نامعتبر');
});

test('base64 round-trips persian text', async ({ page }) => {
  await page.goto('/#/t/base64');
  const ta = page.locator('textarea').first();
  await ta.fill('سلام آیوا');
  await page.getByRole('button', { name: /کدگذاری/ }).click();
  const enc = (await page.locator('.readout').first().textContent()).trim();
  expect(enc.length).toBeGreaterThan(0);
  await ta.fill(enc);
  await page.getByRole('button', { name: /رمزگشایی/ }).click();
  await expect(page.locator('.readout').first()).toContainText('سلام آیوا');
});

test('calculator uses thousands separators', async ({ page }) => {
  await page.goto('/#/t/calculator');
  await page.locator('input.input').first().fill('150000000');
  await expect(page.locator('.readout').first()).toContainText('۱۵۰٬۰۰۰٬۰');
});

test('hash checker verifies sha-256 and clears on empty input', async ({ page }) => {
  await page.goto('/#/t/hash-checker');
  const ta = page.locator('textarea').first();
  await ta.fill('abc');
  await expect(page.locator('.readout').first()).toContainText('ba7816bf');
  await page.locator('input[placeholder*="هش مورد انتظار"]').first().fill('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await expect(page.locator('.badge.ok')).toContainText('تطبیق دارد');
  await ta.fill('');
  await expect(page.locator('.readout').first()).not.toContainText('ba7816bf');
});

test('hash to text finds common value from local db', async ({ page }) => {
  await page.goto('/#/t/hash-checker');
  await page.locator('input[placeholder*="هش را این‌جا"]').fill('8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92');
  await expect(page.locator('.readout').last()).toContainText('123456');
});

test('vault text round-trip + wrong password + tamper (iva256)', async ({ page }) => {
  await page.goto('/#/t/vault');
  await page.locator('textarea').first().fill('متن محرمانه سلام');
  const pws = page.locator('input[type=password]');
  await pws.nth(0).fill('Test1234!');
  await pws.nth(1).fill('Test1234!');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /رمزنگاری و دانلود/ }).click(),
  ]);
  expect(download.suggestedFilename()).toContain('.iva256');
  const path = '/tmp/iva-e2e.iva256';
  await download.saveAs(path);
  const bytes = fs.readFileSync(path);
  expect(bytes.subarray(0, 4).toString()).toBe('IVA1');

  await page.getByRole('button', { name: '🔓 بازگشایی' }).first().click();
  await page.setInputFiles('input[type=file][accept=".iva256"]', path);
  await page.locator('input[type=password]').first().fill('Test1234!');
  await page.getByRole('button', { name: '🔓 بازگشایی' }).last().click();
  await expect(page.locator('.readout').last()).toContainText('متن محرمانه سلام');

  await page.locator('input[type=password]').first().fill('WrongPass1!');
  await page.getByRole('button', { name: '🔓 بازگشایی' }).last().click();
  await expect(page.locator('.readout').last()).toContainText('رمز عبور اشتباه');

  const tampered = Buffer.from(bytes);
  tampered[tampered.length - 20] ^= 0xff;
  const tPath = '/tmp/iva-e2e-tampered.iva256';
  fs.writeFileSync(tPath, tampered);
  await page.setInputFiles('input[type=file][accept=".iva256"]', tPath);
  await page.locator('input[type=password]').first().fill('Test1234!');
  await page.getByRole('button', { name: '🔓 بازگشایی' }).last().click();
  await expect(page.locator('.readout').last()).toContainText('رمز عبور اشتباه');
});

test('vault file encryption produces iva256 and decrypts back', async ({ page }) => {
  fs.writeFileSync('/tmp/iva-plain.txt', 'سلام فایل متنی تست');
  await page.goto('/#/t/vault');
  await page.getByRole('button', { name: '📁 رمزنگاری فایل' }).click();
  await page.setInputFiles('div.card input[type=file]', '/tmp/iva-plain.txt');
  const pws = page.locator('input[type=password]');
  await pws.nth(0).fill('FilePass123!');
  await pws.nth(1).fill('FilePass123!');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /رمزنگاری و دانلود/ }).click(),
  ]);
  const path = '/tmp/iva-file.iva256';
  await download.saveAs(path);
  expect(fs.readFileSync(path).subarray(0, 4).toString()).toBe('IVA1');

  // decrypt and confirm restored file chip appears
  await page.getByRole('button', { name: '🔓 بازگشایی' }).first().click();
  await page.setInputFiles('input[type=file][accept=".iva256"]', path);
  await page.locator('input[type=password]').first().fill('FilePass123!');
  await page.getByRole('button', { name: '🔓 بازگشایی' }).last().click();
  await expect(page.locator('.readout').last()).toContainText('سلام فایل متنی تست');

  // copy button (content only) + download with original name
  await expect(page.getByRole('button', { name: /کپی متن/ })).toBeVisible();
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /دانلود با نام اصلی/ }).click(),
  ]);
  expect(dl.suggestedFilename()).toBe('iva-plain.txt');

  // file action cards must sit ABOVE the (possibly long) text preview
  const btnY = (await page.getByRole('button', { name: /دانلود با نام اصلی/ }).boundingBox()).y;
  const outY = (await page.locator('.readout').last().boundingBox()).y;
  expect(btnY).toBeLessThan(outY);
});

test('jalali picker month names have no digits', async ({ page }) => {
  await page.goto('/#/t/date-conv');
  const firstMonth = await page.locator('select').nth(1).locator('option').first().textContent();
  expect(firstMonth.trim()).toBe('فروردین');
});

test('favorites persist across reload', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.tool-card', { hasText: 'شمارنده متن' }).first();
  await card.locator('.fav').click();
  await page.goto('/#/fav');
  await expect(page.locator('.tool-card', { hasText: 'شمارنده متن' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.tool-card', { hasText: 'شمارنده متن' })).toBeVisible();
});

test('theme persists across reload', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'تاریک', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('ctrl+k palette searches and navigates', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.locator('.modal-back')).toBeVisible();
  await page.locator('.m-input').fill('هش');
  await expect(page.locator('.m-item').first()).toContainText('بررسی هش');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tool-head h1')).toContainText('بررسی هش');
});

test('changelog page lists v1.3 first', async ({ page }) => {
  await page.goto('/#/changelog');
  await expect(page.locator('.badge.ok').first()).toContainText('v1.3');
  await expect(page.locator('body')).toContainText('پاک شدن خودکار خروجی');
});

test('dev tools spot check: slug, uuid, url codec', async ({ page }) => {
  await page.goto('/#/t/slug');
  await page.locator('input.input').first().fill('سلام علی');
  await expect(page.locator('.readout').first()).toContainText('slam-aly');
  await page.goto('/#/t/uuid');
  await page.getByRole('button', { name: /تولید ۱ عدد/ }).click();
  const v = (await page.locator('.readout').first().textContent()).trim();
  expect(v).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await page.goto('/#/t/url-codec');
  await page.locator('textarea').first().fill('سلام');
  await page.getByRole('button', { name: 'کدگذاری' }).click();
  await expect(page.locator('.readout').first()).toContainText('%D8%B3%D9%84%D8%A7%D9%85');
});

test('tool page shows help card', async ({ page }) => {
  await page.goto('/#/t/age');
  await expect(page.locator('body')).toContainText('توضیحات');
  await expect(page.locator('body')).toContainText('شمسی (با پیکر جلالی)');
});


test('clearing input clears outputs (calculator + base64 + json)', async ({ page }) => {
  await page.goto('/#/t/calculator');
  const cin = page.locator('input.input').first();
  await cin.fill('2+2');
  await expect(page.locator('.readout').first()).toContainText('۴');
  await cin.fill('');
  await expect(page.locator('.readout').first()).not.toContainText('۴');

  await page.goto('/#/t/base64');
  const ta = page.locator('textarea').first();
  await ta.fill('سلام');
  await page.getByRole('button', { name: /کدگذاری/ }).click();
  await expect(page.locator('.readout').first()).toContainText('2LPZhNin');
  await ta.fill('');
  await expect(page.locator('.readout').first()).not.toContainText('2LPZhNin');

  await page.goto('/#/t/json-formatter');
  const jta = page.locator('textarea').first();
  await jta.fill('{"a":1}');
  await page.getByRole('button', { name: 'زیباسازی' }).click();
  await expect(page.locator('.readout').first()).toContainText('"a": 1');
  await jta.fill('');
  await expect(page.locator('.readout').first()).not.toContainText('"a": 1');
});

test('service worker registers on http', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => !!r), null, { timeout: 10000 });
});

test('mobile: no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(ok).toBe(true);
  await expect(page.locator('.bottomnav')).toBeVisible();
});
