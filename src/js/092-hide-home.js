/* ═══ Hide the Home tab (not used). The Home panel still exists internally; it just isn't shown. ═══
 * Start on the last tab used, else Board. To bring Home back: set localStorage._ccShowHome = '1'. */
(function () {
  'use strict';
  var show = false; try { show = localStorage.getItem('_ccShowHome') === '1'; } catch (e) {}
  if (show) return;
  var st = document.createElement('style');
  st.textContent = '.tab[data-panel="home"], #cc-bottombar button[data-panel="home"] { display: none !important; }';
  document.head.appendChild(st);
  function leaveHome() {
    var home = document.querySelector('#panel-home.active');
    if (!home) return;
    var target = document.querySelector('.tab[data-panel="board"]');
    try {
      var last = JSON.parse(localStorage.getItem('_ccLastTab') || 'null');
      var el = last && last !== 'home' && document.querySelector('.tab[data-panel="' + last + '"], .nav-dropdown-item[data-panel="' + last + '"]');
      if (el) target = el;
    } catch (e) {}
    if (target && typeof switchTab === 'function') switchTab(target);
  }
  if (document.readyState === 'complete') setTimeout(leaveHome, 900); else window.addEventListener('load', function () { setTimeout(leaveHome, 900); });
  setTimeout(leaveHome, 2500);
})();
