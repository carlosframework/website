// 🤖 Keeps the docs nav's own scroll position as you move between pages
// (progressive enhancement: without it the nav simply starts at the top).
// On a first visit it brings the current page's link into view instead.
(() => {
  const key = "carlos-docs-nav-scroll";
  const nav = document.querySelector(".docs-nav");
  if (!nav) return;
  const saved = sessionStorage.getItem(key);
  if (saved !== null) {
    nav.scrollTop = Number(saved);
  } else {
    const active = nav.querySelector('[aria-current="page"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }
  const save = () => sessionStorage.setItem(key, String(nav.scrollTop));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) save(); });
  addEventListener("pagehide", save);
})();
