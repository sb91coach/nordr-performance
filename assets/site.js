(function () {
  var bar = document.getElementById('scrollProgress');
  if (bar) {
    function update() {
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop;
      var height = doc.scrollHeight - doc.clientHeight;
      var pct = height > 0 ? (scrollTop / height) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  var topbar = document.querySelector('.topbar');
  var toggle = document.querySelector('.nav-toggle');
  if (topbar && toggle) {
    toggle.addEventListener('click', function () {
      var open = topbar.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    topbar.querySelectorAll('.mobile-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        topbar.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();
