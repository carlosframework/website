(() => {
  const dialog = document.getElementById("ai-disclaimer");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const reopen = document.querySelector("[data-ai-disclaimer-open]");
  let returnFocus;

  function show() {
    returnFocus = document.activeElement;
    dialog.showModal();
    dialog.querySelector("h2").focus();
  }

  dialog.addEventListener("close", () => {
    const target = returnFocus && returnFocus !== document.body
      ? returnFocus
      : document.querySelector("h1");
    if (!target) return;
    if (!target.hasAttribute("tabindex") && target.tagName === "H1") {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  });

  dialog.querySelector("[data-ai-disclaimer-continue]").addEventListener("click", () => {
    dialog.close();
  });

  if (reopen) {
    reopen.hidden = false;
    reopen.addEventListener("click", show);
  }
})();
