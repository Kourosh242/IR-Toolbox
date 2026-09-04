/* IR Vault — Web Crypto primitives.
 * KDF: PBKDF2-HMAC-SHA-256 (250,000 iters) → AES-256-GCM.
 * Password and keys never leave memory; never persisted.
 */

export const KDF_ITER = 250000;

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: KDF_ITER, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']);
}

export async function encryptBytes(bytes, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { salt, iv, ct: new Uint8Array(ct) };
}

export async function decryptBytes(ct, password, salt, iv) {
  const key = await deriveKey(password, salt);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(pt);
}

/* Hashing helper used by Hash Checker too. */
export async function digest(alg, data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const h = await crypto.subtle.digest(alg, buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
