/* IR-Toolbox — localStorage persistence (namespaced, never stores secrets). */

const NS = 'ir:';
const LEGACY_NS = 'iva:'; // pre-1.3.2 brand (IVA) — migrated once, never written again.

/* One-time migration of pre-rename (IVA) local data so users keep their prefs. */
(function migrateLegacyKeys() {
  try {
    for (const key of ['settings', 'favs', 'recents', 'scores']) {
      if (localStorage.getItem(NS + key) == null) {
        const old = localStorage.getItem(LEGACY_NS + key);
        if (old != null) {
          localStorage.setItem(NS + key, old);
          localStorage.removeItem(LEGACY_NS + key);
        }
      }
    }
  } catch {}
})();

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

/* ── Export / import ir-settings.json (no vault passwords — never stored) ── */
export function exportSettings() {
  return JSON.stringify({
    app: 'ir-toolbox',
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
  if (data.app !== 'ir-toolbox' && data.app !== 'iva-toolbox') throw new Error('فایل تنظیمات IR-Toolbox نیست'); // accepts pre-1.3.2 (IVA) exports too
  // v1.3.3: اعتبارسنجی شکل داده — مقدارهای نامعتبر نادیده گرفته می‌شوند
  if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
    const st = {};
    if (['light', 'dark', 'system', 'midnight', 'glass'].includes(data.settings.theme)) st.theme = data.settings.theme;
    if (['auto', 'reduced'].includes(data.settings.motion)) st.motion = data.settings.motion;
    if (Object.keys(st).length) write('settings', { ...getSettings(), ...st });
  }
  const strArr = (a) => Array.isArray(a) ? a.filter((x) => typeof x === 'string') : null;
  const fav = strArr(data.favorites); if (fav) write('favs', fav);
  // v1.3.4: recents یعنی آبجکت‌های {id,ts} — قبلاً فیلتر رشته‌ها آن‌ها را دور می‌ریخت
  const rec = Array.isArray(data.recents)
    ? data.recents.filter((r) => r && typeof r === 'object' && typeof r.id === 'string' && typeof r.ts === 'number').slice(0, 8)
    : null;
  if (rec) write('recents', rec);
  if (data.scores && typeof data.scores === 'object' && !Array.isArray(data.scores)) {
    const sc = {};
    for (const [k, v] of Object.entries(data.scores)) if (typeof v === 'number' && isFinite(v)) sc[k] = v;
    write('scores', sc);
  }
}

export function clearAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(NS) || k.startsWith(LEGACY_NS))
    .forEach((k) => localStorage.removeItem(k));
}

/* v1.3.3: دسترسی داخلی برای ماژول‌های هم‌خانواده (پومودورو و مدیر رمز) */
export { read, write };
