// Optional enhancement: collapse the sidebar on narrow screens and mark the section in view.
(function () {
  var box = document.querySelector('.attribute-sidebar');
  if (!box) return;
  var wide = window.matchMedia('(min-width: 60rem)');
  function sync() { box.open = wide.matches; }
  sync();
  if (wide.addEventListener) wide.addEventListener('change', sync);

  var links = {};
  box.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var sections = Array.prototype.slice.call(document.querySelectorAll('.attribute-detail'));
  if (!('IntersectionObserver' in window) || !sections.length) return;
  var current = null;
  function mark(id) {
    if (current === id || !links[id]) return;
    if (current && links[current]) links[current].removeAttribute('aria-current');
    links[id].setAttribute('aria-current', 'location');
    current = id;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
  }, { rootMargin: '-15% 0px -70% 0px' });
  sections.forEach(function (s) { io.observe(s); });
})();
