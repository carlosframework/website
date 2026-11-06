// 🤖 Keeps the docs nav's own scroll position as you move between pages
// (progressive enhancement: without it the nav simply starts at the top).
// On a first visit it brings the current page's link into view instead.
(() => {
  const key = "carlos-docs-nav-scroll";
  const nav = document.querySelector(".docs-nav .nav-groups");
  if (!nav) return;
  const saved = sessionStorage.getItem(key);
  if (saved !== null) {
    nav.scrollTop = Number(saved);
  } else {
    const active = nav.querySelector('[aria-current="page"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }
  const save = () => sessionStorage.setItem(key, String(nav.scrollTop));
  document.querySelector(".docs-nav").addEventListener("click", (e) => { if (e.target.closest("a")) save(); });
  addEventListener("pagehide", save);
  // "/" focuses search, as on most docs sites, unless you are typing.
  const search = document.querySelector(".docs-search");
  addEventListener("keydown", (e) => {
    if (e.key !== "/" || !search || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    e.preventDefault();
    search.focus();
  });
})();
