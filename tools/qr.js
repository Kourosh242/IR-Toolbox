/* IR-Toolbox — QR‌کدساز آفلاین (کتابخانه: qrcode-generator © Kazuhiko Arase، MIT) */
import { register } from '../js/registry.js';
import { el, field, areaInput, selectInput, readout } from '../js/ui.js';
import { faNum, download, textBlob } from '../js/helpers.js';
import qrcode from '../vendor/qrcode.js';

/* UTF-8 واقعی — تا فارسی/اموجی/هر زبانی درست کد بشه */
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

register({
  id: 'qr', cat: 'dev', icon: '🔳',
  fa: 'QR‌کدساز', en: 'QR Code Generator',
  desc: 'متن/لینک/شماره به QR — فارسی و هر زبانی، کاملاً آفلاین',
  keywords: ['qr', 'barcode', 'کیوار', 'بارکد'],
  mount(root) {
    const ta = areaInput({ rows: 4, value: 'سلام IR-Toolbox 🇷\nhttps://example.com' });
    const ecc = selectInput([['L', 'L — سریع (۷٪)'], ['M', 'M — متعادل (۱۵٪)'], ['Q', 'Q — خوب (۲۵٪)'], ['H', 'H — بیشترین تحمل (۳۰٪)']], 'M');
    const size = el('input', { type: 'range', min: 3, max: 10, value: 6, style: 'width:100%' });
    const sizeField = field(`اندازه: ${faNum(size.value)}`, size);
    const sizeLbl = sizeField.querySelector('.lbl');
    const box = el('div', { class: 'card', style: 'padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px' });
    const status = el('div', { class: 'hint' });
    let lastSvg = '';
    let lastPx = 0;

    const run = () => {
      box.textContent = ''; lastSvg = ''; status.textContent = '';
      const text = ta.value;
      if (!text.trim()) { status.textContent = 'متنی بنویسید تا QR ساخته شود.'; return; }
      try {
        const qr = qrcode(0, ecc.value); // type 0 = تشخیص خودکار ظرفیت
        qr.addData(text);
        qr.make();
        const cell = +size.value;
        lastPx = cell * (qr.getModuleCount() + 8); // حاشیهٔ ۴ ماژول دوطرف
        lastSvg = qr.createSvgTag({ cellSize: cell, margin: 4 });
        const wrap = el('div', { style: 'background:#fff;border-radius:12px;padding:8px;line-height:0;max-width:100%;overflow:auto' });
        wrap.innerHTML = lastSvg;
        const svg = wrap.querySelector('svg');
        if (svg) { svg.setAttribute('style', `width:min(${lastPx}px,80vw);height:auto;display:block`); svg.removeAttribute('width'); svg.removeAttribute('height'); }
        box.append(wrap);
        const bytes = new TextEncoder().encode(text).length;
        status.textContent = `اسکن با هر اپی کار می‌کند · ${faNum(bytes)} بایت UTF-8 · سطح تصحیح ${ecc.value} · خروجی ${faNum(lastPx)}px`;
      } catch (e) {
        status.textContent = '❌ متن برای یک QR خیلی بلند است؛ کوتاه‌ترش کنید.';
      }
    };
    ta.addEventListener('input', run);
    ecc.addEventListener('change', run);
    size.addEventListener('input', () => { sizeLbl.textContent = `اندازه: ${faNum(size.value)}`; run(); });

    const dlSvg = () => { if (lastSvg) download('qr.svg', textBlob(lastSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml')); };
    const dlPng = () => {
      if (!lastSvg) return;
      const svg = lastSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const px = Math.min(2048, Math.max(64, lastPx || 1024));
        c.width = c.height = px;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, px, px);
        ctx.drawImage(img, 0, 0, px, px);
        c.toBlob((b) => b && download('qr.png', b), 'image/png');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    };

    run();
    root.append(
      field('متن، لینک، شماره یا هر چیزی (فارسی/انگلیسی/هر زبانی)', ta),
      el('div', { class: 'grid2' }, field('سطح تصحیح خطا', ecc), sizeField),
      box, status,
      el('div', { class: 'dash-actions' },
        el('button', { class: 'btn tonal sm', onclick: dlSvg }, '⬇ دانلود SVG'),
        el('button', { class: 'btn tonal sm', onclick: dlPng }, '⬇ دانلود PNG')),
    );
  }
});
