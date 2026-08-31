/* IVA Vault — .iva256 binary container (versioned, self-describing).
 *
 * Layout (little-endian):
 *   [4]   magic   "IVA1"
 *   [1]   version (1)
 *   [1]   kdfId   (1 = PBKDF2-HMAC-SHA256, 250k)
 *   [1]   algId   (1 = AES-256-GCM)
 *   [2]   saltLen, [saltLen] salt
 *   [2]   ivLen,   [ivLen]   iv
 *   [4]   ctLen,   [ctLen]   ciphertext (AES-GCM; includes auth tag)
 *
 * Decrypted plaintext blob:
 *   [4] metaLen, [metaLen] JSON meta {files:[{name,mime}]}
 *   then per file: [4] len, [len] bytes  (same order as meta.files)
 */
import { encryptBytes, decryptBytes } from './crypto-utils.js';

export const MAGIC = 'IVA1';
export const VERSION = 1;

const te = new TextEncoder();
const td = new TextDecoder();

export const EXT = '.iva256';

export async function packContainer(files, password) {
  // files: [{name, mime, bytes:Uint8Array}]
  const meta = te.encode(JSON.stringify({ v: 1, files: files.map(({ name, mime }) => ({ name, mime })) }));
  let total = 4 + meta.length;
  for (const f of files) total += 4 + f.bytes.length;
  const plain = new Uint8Array(total);
  const dv = new DataView(plain.buffer);
  let o = 0;
  dv.setUint32(o, meta.length, true); o += 4;
  plain.set(meta, o); o += meta.length;
  for (const f of files) {
    dv.setUint32(o, f.bytes.length, true); o += 4;
    plain.set(f.bytes, o); o += f.bytes.length;
  }

  const { salt, iv, ct } = await encryptBytes(plain, password);

  const out = new Uint8Array(4 + 1 + 1 + 1 + 2 + salt.length + 2 + iv.length + 4 + ct.length);
  const v = new DataView(out.buffer);
  let p = 0;
  for (const c of MAGIC) out[p++] = c.charCodeAt(0);
  v.setUint8(p++, VERSION);
  v.setUint8(p++, 1); // kdf
  v.setUint8(p++, 1); // alg
  v.setUint16(p, salt.length, true); p += 2; out.set(salt, p); p += salt.length;
  v.setUint16(p, iv.length, true); p += 2; out.set(iv, p); p += iv.length;
  v.setUint32(p, ct.length, true); p += 4; out.set(ct, p);
  return out;
}

export async function unpackContainer(buf, password) {
  const u8 = new Uint8Array(buf);
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.length < 13 || String.fromCharCode(...u8.slice(0, 4)) !== MAGIC)
    throw new Error('bad');
  const version = v.getUint8(4);
  if (version !== VERSION) throw new Error('bad');
  let p = 7;
  const saltLen = v.getUint16(p, true); p += 2;
  const salt = u8.slice(p, p + saltLen); p += saltLen;
  const ivLen = v.getUint16(p, true); p += 2;
  const iv = u8.slice(p, p + ivLen); p += ivLen;
  const ctLen = v.getUint32(p, true); p += 4;
  const ct = u8.slice(p, p + ctLen);

  // Throws OperationError on wrong password / tamper → caller shows generic msg.
  const plain = await decryptBytes(ct, password, salt, iv);
  const dv = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
  let o = 0;
  const metaLen = dv.getUint32(o, true); o += 4;
  const meta = JSON.parse(td.decode(plain.slice(o, o + metaLen))); o += metaLen;
  const files = meta.files.map((m) => {
    const len = dv.getUint32(o, true); o += 4;
    const bytes = plain.slice(o, o + len); o += len;
    return { name: m.name, mime: m.mime, bytes };
  });
  return files;
}
