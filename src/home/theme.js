// 🤖 Theme for the homepage: Auto follows the system; Light or Dark is remembered
// on this device. Loaded first in <head>, without defer, so the theme is set
// before the first paint and the page never flashes the wrong one.
(() => {
  const KEY = 'carlos-theme', root = document.documentElement;
  const read = () => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch { return 'auto'; } };
  const apply = theme => { if (theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme); };
  apply(read());
  const wire = () => {
    const group = document.querySelector('.theme-switch');
    if (!group) return;
    const buttons = [...group.querySelectorAll('[data-theme-set]')];
    const show = theme => buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)));
    buttons.forEach(b => b.addEventListener('click', () => {
      const theme = b.dataset.themeSet;
      try { if (theme === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, theme); } catch { /* private mode: this page only */ }
      apply(theme); show(theme);
    }));
    // Another tab changed it.
    addEventListener('storage', e => { if (e.key === KEY || e.key === null) { apply(read()); show(read()); } });
    show(read());
    group.hidden = false;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
