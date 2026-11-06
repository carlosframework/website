// 🤖 Progressive enhancement for .stepper sections (docs site mockup).
// Without this file the page shows every frame, numbered, with its
// caption. With it, each stepper shows one frame at a time with Back and
// Next buttons, a "Step n of N" label and a caption region announced to
// screen readers. Nothing auto-plays. Reduced motion is handled in CSS.
document.addEventListener("DOMContentLoaded", () => {
  for (const stepper of document.querySelectorAll(".stepper")) {
    const frames = [...stepper.querySelectorAll("li.frame")];
    if (frames.length < 2) continue;

    const controls = document.createElement("div");
    controls.className = "stepper-controls";
    const back = button("Back");
    const next = button("Next");
    const count = document.createElement("span");
    count.className = "stepper-count";
    const caption = document.createElement("p");
    caption.className = "stepper-caption";
    caption.setAttribute("aria-live", "polite");
    controls.append(back, next, count, caption);
    stepper.append(controls);

    let current = 0;
    const show = (i) => {
      current = Math.max(0, Math.min(frames.length - 1, i));
      frames.forEach((f, n) => f.classList.toggle("is-current", n === current));
      const focused = document.activeElement;
      back.disabled = current === 0;
      next.disabled = current === frames.length - 1;
      // A focused button that becomes disabled drops focus to the page,
      // and the arrow keys stop reaching the viewer. Hand focus across.
      if (focused === back && back.disabled) next.focus();
      if (focused === next && next.disabled) back.focus();
      count.textContent = `Step ${current + 1} of ${frames.length}`;
      const cap = frames[current].querySelector("figcaption");
      caption.textContent = cap ? cap.textContent.trim() : "";
    };

    back.addEventListener("click", () => show(current - 1));
    next.addEventListener("click", () => show(current + 1));
    stepper.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { show(current - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { show(current + 1); e.preventDefault(); }
    });
    if (!stepper.hasAttribute("tabindex")) stepper.tabIndex = -1;
    stepper.classList.add("is-enhanced");
    show(0);
  }

  function button(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    return b;
  }
});
