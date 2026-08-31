/* IVA — localStorage persistence (namespaced, never stores secrets). */

const NS = 'iva:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch {}
}

/* ── Settings ── */
export const getSettings = () => read('settings', { theme: 'light', motion: 'auto' });
export function setSettings(patch) {
  write('settings', { ...getSettings(), ...patch });
}

/* ── Favorites (tool ids) ── */
export const getFavs = () => read('favs', []);
export function toggleFav(id) {
  const f = getFavs();
  const on = f.includes(id);
  write('favs', on ? f.filter((x) => x !== id) : [id, ...f]);
  return !on;
}

/* ── Recents: tool ids + timestamp. Never stores user data/values. ── */
export const getRecents = () => read('recents', []);
export function pushRecent(id) {
  const r = getRecents().filter((x) => x.id !== id);
  r.unshift({ id, ts: Date.now() });
  write('recents', r.slice(0, 8));
}

/* ── Brain-game best scores ── */
export const getScores = () => read('scores', {});
export function setScore(game, score) {
  const s = getScores();
  const prev = s[game] || 0;
  if (score > prev) { s[game] = score; write('scores', s); return true; }
  return false;
}
/* lowerBetter: for reaction time / fewest moves (smaller = better). */
export function setBest(game, value, lowerBetter = false) {
  const s = getScores();
  const prev = s[game];
  if (prev == null || (lowerBetter ? value < prev : value > prev)) {
    s[game] = value; write('scores', s); return true;
  }
  return false;
}

/* ── Export / import iva-settings.json (no vault passwords — never stored) ── */
export function exportSettings() {
  return JSON.stringify({
    app: 'iva-toolbox',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    favorites: getFavs(),
    recents: getRecents(),
    scores: getScores(),
  }, null, 2);
}
export function importSettings(jsonText) {
  const data = JSON.parse(jsonText);
  if (data.app !== 'iva-toolbox') throw new Error('فایل تنظیمات IVA نیست');
  if (data.settings) write('settings', data.settings);
  if (Array.isArray(data.favorites)) write('favs', data.favorites);
  if (Array.isArray(data.recents)) write('recents', data.recents);
  if (data.scores) write('scores', data.scores);
}

export function clearAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(NS))
    .forEach((k) => localStorage.removeItem(k));
}
