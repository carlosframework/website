// 🤖 Clipboard enhancement; the account pathways remain native radio controls.
document.querySelectorAll('[data-copy-target]').forEach(button => {
  const code = document.getElementById(button.dataset.copyTarget);
  if (!code) return;
  const label = button.querySelector('span');
  const status = document.getElementById(button.dataset.copyStatus);
  let reset;
  button.hidden = false;
  button.dataset.copyReady = 'true';
  button.addEventListener('click', async () => {
    clearTimeout(reset);
    if (status) status.textContent = '';
    try {
      await navigator.clipboard.writeText(code.textContent);
      label.textContent = button.dataset.copied;
      if (status) status.textContent = button.dataset.copied;
      reset = setTimeout(() => { label.textContent = button.dataset.original; }, 1600);
    } catch {
      label.textContent = button.dataset.original;
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      if (status) status.textContent = button.dataset.copyFallback;
    }
  });
});
