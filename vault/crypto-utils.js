/* IR Vault — Web Crypto primitives.
 * KDF: PBKDF2-HMAC-SHA-256 (600,000 iters since v1.3.7; KDF_ITERS keeps the
 *      legacy 250,000 mapping so old files still open) → AES-256-GCM.
 * Password and keys never leave memory; never persisted.
 */

export const KDF_ITER = 600000; // v1.3.7: توصیهٔ به‌روز OWASP برای PBKDF2-HMAC-SHA256
/* v1.3.7 (یافتهٔ ۹): شمارش تکرار در خود خروجی ذخیره می‌شود تا بالا بردن آن داده‌های قدیمی را نشکند.
   kdfId=1 → فایل‌های پیش از ۱.۳.۷ (۲۵۰k) · kdfId=2 → از ۱.۳.۷ به بعد (۶۰۰k) */
export const KDF_ITERS = { 1: 250000, 2: 600000 };
export const KDF_ID = 2;

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function deriveKey(password, salt, iterations = KDF_ITER) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']);
}

export async function encryptBytes(bytes, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { salt, iv, ct: new Uint8Array(ct), kdfId: KDF_ID };
}

export async function decryptBytes(ct, password, salt, iv, iterations = KDF_ITER) {
  const key = await deriveKey(password, salt, iterations);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(pt);
}

/* Hashing helper used by Hash Checker too. */
export async function digest(alg, data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const h = await crypto.subtle.digest(alg, buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
