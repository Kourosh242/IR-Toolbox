/* IVA — tiny hash router */

const routes = [];

export function route(pattern, handler) {
  routes.push({ pattern, handler });
}

export function parse() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  return parts;
}

export function go(hash) { location.hash = hash; }

let onChange = null;
export function listen(fn) {
  onChange = fn;
  window.addEventListener('hashchange', () => fn(parse()));
  fn(parse());
}

export function match(parts) {
  for (const r of routes) {
    const p = r.pattern.split('/').filter(Boolean);
    if (p.length !== parts.length) continue;
    const params = {};
    let ok = true;
    p.forEach((seg, i) => {
      if (seg.startsWith(':')) params[seg.slice(1)] = parts[i];
      else if (seg !== parts[i]) ok = false;
    });
    if (ok) return { handler: r.handler, params };
  }
  return null;
}
