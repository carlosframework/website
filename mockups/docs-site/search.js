// 🤖 Search for the docs mockup (progressive enhancement). Without this
// file the search box is a link to the page index. With it, clicking the
// box or pressing "/" opens a search dialog over the page, without moving
// the page; typing filters every page in the nav; Enter opens the first
// result; Escape closes it. The real site would search page text from a
// build-time index; the mockup searches page titles.
document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.querySelector(".docs-search");
  if (!trigger || !window.HTMLDialogElement) return;

  const seen = new Set();
  const pages = [...document.querySelectorAll(".docs-nav .nav-groups a")]
    .map((a) => ({ label: a.textContent.trim(), href: a.getAttribute("href"), section: a.closest(".nav-group")?.querySelector(".nav-top")?.textContent.trim() || "" }))
    .filter((p) => p.label && !p.label.startsWith("…") && !seen.has(p.label) && seen.add(p.label));

  const dialog = document.createElement("dialog");
  dialog.className = "search-dialog";
  dialog.setAttribute("aria-label", "Search the docs");
  dialog.innerHTML = '<form method="dialog"><input type="search" placeholder="Search the docs" aria-label="Search the docs" autocomplete="off"><button type="button" class="search-close" aria-label="Close search">&times;</button></form><ul></ul><p class="search-hint">Enter opens the first result. Escape closes.</p>';
  document.body.append(dialog);
  const input = dialog.querySelector("input");
  const list = dialog.querySelector("ul");

  const render = () => {
    const q = input.value.trim().toLowerCase();
    const hits = q ? pages.filter((p) => p.label.toLowerCase().includes(q)) : pages.slice(0, 8);
    list.replaceChildren(...hits.slice(0, 10).map((p) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = p.href;
      a.textContent = p.label;
      const s = document.createElement("span");
      s.textContent = p.section;
      li.append(a, s);
      return li;
    }));
    if (q && !hits.length) {
      const li = document.createElement("li");
      li.className = "search-empty";
      li.textContent = "No page matches that yet.";
      list.append(li);
    }
  };

  const open = () => {
    input.value = "";
    render();
    dialog.showModal();
    input.focus();
  };

  trigger.addEventListener("click", (e) => { e.preventDefault(); open(); });
  addEventListener("keydown", (e) => {
    if (e.key !== "/" || dialog.open || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    e.preventDefault();
    open();
  });
  input.addEventListener("input", render);
  // In a search field, Chrome's first Escape only clears the text. Close
  // in one press instead.
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); dialog.close(); } });
  dialog.querySelector("form").addEventListener("submit", (e) => {
    const first = list.querySelector("a");
    if (first) { e.preventDefault(); location.href = first.href; }
  });
  dialog.querySelector(".search-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
});
