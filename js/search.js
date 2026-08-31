/* IVA — command palette (Ctrl+K / Cmd+K) with debounced, highlighted search. */
import { el, toast } from './ui.js';
import * as registry from './registry.js';
import { highlight, debounce } from './helpers.js';

let back, input, list, items = [], sel = 0, onClose;

function close() {
  if (back) { back.remove(); back = null; onClose && onClose(); }
}

function open(onNavigate) {
  if (back) close();
  back = el('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(); } });
  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'جستجوی ابزار' });
  input = el('input', { class: 'm-input', placeholder: 'جستجوی ابزار… (Ctrl+K)', autocomplete: 'off' });
  list = el('div', { class: 'm-list' });
  modal.append(input, list);
  back.append(modal);
  document.body.appendChild(back);
  input.focus();

  const actions = [
    { icon: '🏠', fa: 'رفتن به خانه', run: () => location.hash = '#/' },
    { icon: '⭐', fa: 'علاقه‌مندی‌ها', run: () => location.hash = '#/fav' },
    { icon: '🧰', fa: 'گاوصندوق IVA', run: () => location.hash = '#/t/vault' },
    { icon: '⚙️', fa: 'تنظیمات', run: () => location.hash = '#/settings' },
    { icon: '🛡️', fa: 'اطلاعات امنیتی', run: () => location.hash = '#/sec' },
  ];

  const render = (q = '') => {
    const tools = registry.all().filter((t) =>
      !q || t.fa.includes(q) || t.en.toLowerCase().includes(q.toLowerCase()) || (t.keywords || []).some((k) => k.includes(q.toLowerCase())));
    const acts = q ? actions.filter((a) => a.fa.includes(q)) : actions;
    items = [...tools.map((t) => ({ icon: t.icon, label: t.fa, sub: t.en, run: () => { location.hash = `#/t/${t.id}`; } })),
             ...acts.map((a) => ({ icon: a.icon, label: a.fa, sub: '', run: a.run }))];
    sel = 0;
    draw(q);
  };
  const draw = (q) => {
    list.textContent = '';
    if (!items.length) { list.append(el('div', { class: 'm-item', style: 'color:var(--muted)' }, 'چیزی پیدا نشد')); return; }
    items.forEach((it, i) => {
      const b = el('button', { class: `m-item ${i === sel ? 'sel' : ''}`, onclick: () => { close(); it.run(); onNavigate && onNavigate(); } });
      b.append(el('span', { class: 'ico' }, it.icon), el('span', { html: highlight(it.label, q) }), it.sub ? el('span', { class: 'go' }, it.sub) : null);
      list.append(b);
    });
  };
  input.addEventListener('input', debounce(() => { render(input.value.trim()); }, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); draw(input.value.trim()); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(input.value.trim()); e.preventDefault(); }
    if (e.key === 'Enter' && items[sel]) { close(); items[sel].run(); }
    if (e.key === 'Escape') close();
  });
  render();
  return close;
}

export function initSearch() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
  });
  return { open, close };
}
