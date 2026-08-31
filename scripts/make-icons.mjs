// Generates crisp PNG icons (192/512) for the PWA manifest.
// Dependency-free: manual PNG encoding via node:zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

const hex = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const TOP = hex('#12b98b'), BOT = hex('#0a6e57'), WHITE=[250,251,250], AMBER=[224,164,88];

function draw(size, maskable = false) {
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2, r = size * 0.22, s = size / 512;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // vertical emerald gradient
      const t = y / size;
      let R = TOP[0] + (BOT[0]-TOP[0])*t;
      let G = TOP[1] + (BOT[1]-TOP[1])*t;
      let B = TOP[2] + (BOT[2]-TOP[2])*t;
      let A = 255;

      // rounded corners (skip for maskable full-bleed)
      if (!maskable) {
        const qx = Math.abs(x-c), qy = Math.abs(y-c);
        if (qx > c-r && qy > c-r) {
          const dx = qx-(c-r), dy = qy-(c-r);
          if (dx*dx + dy*dy > r*r) A = 0;
        }
      }

      if (A) {
        // 4-point sparkle = union of two thin diamonds
        const ax = Math.abs(x-c)/s, ay = Math.abs(y-c)/s;
        if (ax/46 + ay/150 < 1 || ax/150 + ay/46 < 1) [R,G,B] = WHITE;
        // amber spark dot (top-right)
        if (Math.hypot((x-c)/s - 118, (y-c)/s + 118) < 30) [R,G,B] = AMBER;
      }
      px[i]=R; px[i+1]=G; px[i+2]=B; px[i+3]=A;
    }
  }
  return px;
}

function encodePNG(size, maskable=false) {
  const data = draw(size, maskable);
  const stride = size*4 + 1;
  const raw = Buffer.alloc(size*stride);
  for (let y=0;y<size;y++){
    raw[y*stride]=0;
    data.copy(raw, y*stride+1, y*size*4, (y+1)*size*4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4);
  ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw,{level:9})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('assets/icons', { recursive: true });
writeFileSync('assets/icons/icon-192.png', encodePNG(192));
writeFileSync('assets/icons/icon-512.png', encodePNG(512));
writeFileSync('assets/icons/icon-512-maskable.png', encodePNG(512, true));
console.log('icons written');
