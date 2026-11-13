// 🤖 Keeps the docs nav's list at the same scroll position as you move
// between pages (progressive enhancement: without it the list starts at
// the top). On a first visit it brings the current page's link into view.
(() => {
  const key = "carlos-docs-nav-scroll";
  const list = document.querySelector(".docs-nav .nav-groups");
  if (!list) return;
  let saved = null;
  try { saved = sessionStorage.getItem(key); } catch { saved = null; }
  if (saved !== null) {
    list.scrollTop = Number(saved);
  } else {
    const active = list.querySelector('[aria-current="page"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }
  const save = () => { try { sessionStorage.setItem(key, String(list.scrollTop)); } catch { /* private mode */ } };
  document.querySelector(".docs-nav").addEventListener("click", (e) => { if (e.target.closest("a")) save(); });
  addEventListener("pagehide", save);
})();
