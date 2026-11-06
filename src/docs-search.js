// 🤖 Docs search (progressive enhancement). Without this file the search
// box links to the page index on /docs/. With it, a click on the box or
// "/" opens a dialog over the page without moving it. Typing searches
// /docs/search-index.json (built by Eleventy): page titles first, then
// headings (which link straight to that heading), then page text. Enter
// opens the first result; one Escape, a click outside or the close
// button closes it.
document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.querySelector(".docs-search");
  if (!trigger || !window.HTMLDialogElement) return;

  const dialog = document.createElement("dialog");
  dialog.className = "search-dialog";
  dialog.setAttribute("aria-label", "Search the docs");
  dialog.innerHTML =
    '<form method="dialog"><input type="text" role="searchbox" enterkeyhint="search" placeholder="Search the docs" aria-label="Search the docs" autocomplete="off" spellcheck="false">' +
    '<button type="button" class="search-close" aria-label="Close search">&times;</button></form>' +
    '<ul></ul><p class="search-hint">Enter opens the first result. Escape closes.</p>';
  document.body.append(dialog);
  const input = dialog.querySelector("input");
  const list = dialog.querySelector("ul");

  let index = null;
  const load = () => index || (index = fetch("/docs/search-index.json").then((r) => (r.ok ? r.json() : [])).catch(() => []));

  const search = (entries, q) => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const has = (s) => terms.every((t) => s.toLowerCase().includes(t));
    const hits = [];
    for (const e of entries) {
      if (has(e.title)) hits.push({ rank: 0, href: e.url, label: e.title, where: e.section });
      for (const h of e.headings) if (has(h.title)) hits.push({ rank: 1, href: `${e.url}#${h.anchor}`, label: h.title, where: e.title });
      if (!has(e.title) && has(e.text)) hits.push({ rank: 2, href: e.url, label: e.title, where: e.section });
    }
    return hits.sort((a, b) => a.rank - b.rank).slice(0, 10);
  };

  const render = async () => {
    const q = input.value.trim();
    const entries = await load();
    if (q !== input.value.trim()) return;
    const hits = q ? search(entries, q) : entries.slice(0, 8).map((e) => ({ href: e.url, label: e.title, where: e.section }));
    list.replaceChildren(...hits.map((h) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = h.href;
      a.textContent = h.label;
      const s = document.createElement("span");
      s.textContent = h.where;
      li.append(a, s);
      return li;
    }));
    if (q && !hits.length) {
      const li = document.createElement("li");
      li.className = "search-empty";
      li.textContent = "No pages match that.";
      list.append(li);
    }
  };

  const open = () => {
    input.value = "";
    dialog.showModal();
    input.focus();
    render();
  };

  trigger.addEventListener("click", (e) => { e.preventDefault(); open(); });
  addEventListener("keydown", (e) => {
    if (e.key !== "/" || dialog.open || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    e.preventDefault();
    open();
  });
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); dialog.close(); } });
  dialog.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const first = list.querySelector("a");
    if (first) location.href = first.href;
  });
  dialog.querySelector(".search-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
});
