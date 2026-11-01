
/* ═══ REDESIGN LAYER — nav a11y, Ctrl K, toasts, PIN lock, offline bar, mobile bar, PWA ═══ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var isVariance = new URLSearchParams(location.search).get('vf');

  /* ── ICONS (stroke, 24 viewBox) ── */
  var P = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 5 5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
    megaphone: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h6"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
    wrench: '<path d="M14.5 6a4 4 0 0 0 4.9 4.9l-8.6 8.6a2.1 2.1 0 0 1-3-3l8.6-8.6A4 4 0 0 0 14.5 6z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    dollar: '<path d="M12 3v18M16 7.5c0-1.5-2-2.5-4-2.5s-4 1-4 3 2 2.5 4 3 4 1.5 4 3.5-2 3-4 3-4-1-4-2.5"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    scale: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-3 7a3 3 0 0 0 6 0zM19 8l-3 7a3 3 0 0 0 6 0z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 5v4h4M4 13a8 8 0 0 0 14 4M20 19v-4h-4"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
  };
  function svg(name, size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.file) + '</svg>';
  }
  var PANEL_ICON = {
    home: 'home', board: 'grid', charge: 'star', directory: 'phone', staffprefs: 'user', schedule: 'calendar', absence: 'calendar', overtime: 'clock',
    education: 'cap', competency: 'check', policies: 'file', readsign: 'pen', broadcast: 'megaphone', attendsheet: 'clipboard',
    quality: 'chart', stroke: 'activity', platoweekly: 'clipboard', variance: 'alert', painaudit: 'activity', txaudit: 'droplet',
    incidents: 'alert', rrtlog: 'alert', inclog: 'folder', equipment: 'wrench', staffintel: 'compass', qualityintel: 'shield',
    vacancy: 'dollar', hppd: 'trend', staffanalysis: 'search', staffbalance: 'scale', openshifts: 'clipboard',
    yearreview: 'clipboard', ninebox: 'target', coaching: 'chat', monthlyfu: 'calendar', fallround: 'refresh', hapiround: 'shield',
    interview: 'briefcase', orientation: 'cap', onboarding: 'clipboard', recognition: 'star', todo: 'check', import: 'download',
    floatsitter: 'clipboard', huddle: 'chat'
  };
  var GROUP_ICON = { 'ng-staff': 'user', 'ng-edu': 'cap', 'ng-quality': 'chart', 'ng-analytics': 'trend', 'ng-people': 'users', 'ng-tools': 'wrench' };

  /* ── TOAST (replaces blocking alert) ── */
  var toastBox;
  function ccToast(msg, opts) {
    opts = opts || {};
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.id = 'cc-toasts';
      toastBox.setAttribute('role', 'status');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastBox);
    }
    var text = String(msg == null ? '' : msg);
    var type = opts.type || (/(error|fail|could not|couldn't|invalid|unable|not found|denied)/i.test(text) ? 'err' : (/(saved|success|done|copied|exported|sent|added|updated)/i.test(text) ? 'ok' : ''));
    var t = document.createElement('div');
    t.className = 'cc-toast ' + type;
    var m = document.createElement('div'); m.className = 'cc-t-msg'; m.textContent = text; t.appendChild(m);
    if (opts.action) {
      var a = document.createElement('button'); a.textContent = opts.action.label;
      a.onclick = function () { try { opts.action.fn(); } catch (e) {} t.remove(); };
      t.appendChild(a);
    }
    var x = document.createElement('button'); x.className = 'cc-t-x'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×'; x.onclick = function () { t.remove(); }; t.appendChild(x);
    toastBox.appendChild(t);
    while (toastBox.children.length > 4) toastBox.firstChild.remove();
    setTimeout(function () { if (t.parentNode) t.remove(); }, opts.ms || Math.min(12000, 4000 + text.length * 40));
  }
  window.ccToast = ccToast;
  window.__nativeAlert = window.alert.bind(window);
  if (!isVariance) window.alert = function (m) { ccToast(m); };

  /* ── NAV: roles, icons, keyboard ── */
  function initNav() {
    var tabs = $('#tabs');
    if (!tabs) return;
    tabs.setAttribute('role', 'navigation');
    tabs.setAttribute('aria-label', 'Main');
    $$('.tab', tabs).forEach(function (el) {
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      var ic = $('.tab-icon', el); if (ic && PANEL_ICON[el.dataset.panel]) ic.innerHTML = svg(PANEL_ICON[el.dataset.panel]);
    });
    $$('.nav-group', tabs).forEach(function (g) {
      var b = $('.nav-group-btn', g);
      b.setAttribute('role', 'button'); b.tabIndex = 0; b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
      var ic = $('.tab-icon', b); if (ic && GROUP_ICON[g.id]) ic.innerHTML = svg(GROUP_ICON[g.id]);
      var dd = $('.nav-dropdown', g); if (dd) dd.setAttribute('role', 'menu');
    });
    $$('.nav-dropdown-item', tabs).forEach(function (el) {
      el.setAttribute('role', 'menuitem'); el.tabIndex = -1;
      var ic = $('.di-icon', el); if (ic && PANEL_ICON[el.dataset.panel]) ic.innerHTML = svg(PANEL_ICON[el.dataset.panel]);
    });
    tabs.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t.matches) return;
      if ((e.key === 'Enter' || e.key === ' ') && t.matches('.tab,.nav-group-btn,.nav-dropdown-item')) { e.preventDefault(); t.click(); if (t.matches('.nav-group-btn')) focusFirstItem(t.parentNode); return; }
      if (e.key === 'Escape') { var open = $('.nav-group.open', tabs); if (open) { open.classList.remove('open'); $('.nav-group-btn', open).focus(); e.preventDefault(); } return; }
      if (t.matches('.nav-dropdown-item')) {
        var items = $$('.nav-dropdown-item', t.closest('.nav-dropdown')); var i = items.indexOf(t);
        if (e.key === 'ArrowDown') { items[(i + 1) % items.length].focus(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { items[(i - 1 + items.length) % items.length].focus(); e.preventDefault(); }
        if (e.key === 'Home') { items[0].focus(); e.preventDefault(); }
        if (e.key === 'End') { items[items.length - 1].focus(); e.preventDefault(); }
        return;
      }
      if (t.matches('.tab,.nav-group-btn')) {
        var tops = $$('.tab,.nav-group-btn', tabs); var j = tops.indexOf(t);
        if (e.key === 'ArrowRight') { tops[(j + 1) % tops.length].focus(); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { tops[(j - 1 + tops.length) % tops.length].focus(); e.preventDefault(); }
        if (e.key === 'ArrowDown' && t.matches('.nav-group-btn')) { if (!t.parentNode.classList.contains('open')) t.click(); focusFirstItem(t.parentNode); e.preventDefault(); }
      }
    });
    function focusFirstItem(g) { setTimeout(function () { var f = $('.nav-dropdown-item', g); if (f) f.focus(); }, 0); }
    function sync() {
      $$('.nav-group', tabs).forEach(function (g) { $('.nav-group-btn', g).setAttribute('aria-expanded', g.classList.contains('open') ? 'true' : 'false'); });
      $$('.tab,.nav-dropdown-item', tabs).forEach(function (el) { if (el.classList.contains('active')) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
      $$('#cc-bottombar button').forEach(function (b) { var tg = $('.tab[data-panel="' + b.dataset.panel + '"]'); b.classList.toggle('active', !!(tg && tg.classList.contains('active'))); });
    }
    new MutationObserver(sync).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
    sync();
  }

  /* ── sticky stack height ── */
  window.ccMeasure = function () { measure(); };
  function measure() {
    var h = $('header'); if (!h) return;
    var hh = h.offsetHeight;
    var mobile = window.matchMedia('(max-width:760px)').matches;
    document.documentElement.style.setProperty('--hdr-h', (mobile ? 0 : hh) + 'px');
    var tabs = $('#tabs');
    var total = (mobile ? 0 : hh) + (tabs && !mobile ? tabs.offsetHeight : 0);
    document.documentElement.style.setProperty('--sticky-top', total + 'px');
  }

  /* ── recents / pins / last tab ── */
  var LOCKED = { yearreview: 1, ninebox: 1, coaching: 1 };
  function remember(pid) {
    if (!pid) return;
    var r = LS.get('_ccRecent', []).filter(function (x) { return x !== pid; });
    r.unshift(pid); LS.set('_ccRecent', r.slice(0, 6));
    if (!LOCKED[pid]) LS.set('_ccLastTab', pid);
  }
  function tabEl(pid) { return $('.nav-dropdown-item[data-panel="' + pid + '"]') || $('.tab[data-panel="' + pid + '"]'); }
  function labelOf(el) { return (el.textContent || '').replace(/[▾▼]/g, '').replace(/\s+/g, ' ').trim(); }
  function groupOf(el) { var g = el.closest && el.closest('.nav-group'); return g ? labelOf($('.nav-group-btn', g)) : 'Main'; }

  function allTabs() {
    var seen = {}, out = [];
    $$('.tab[data-panel], .nav-dropdown-item[data-panel]').forEach(function (el) {
      var p = el.dataset.panel; if (seen[p]) return; seen[p] = 1;
      out.push({ panel: p, label: labelOf(el), group: groupOf(el) });
    });
    return out;
  }
  function renderPins() {
    var tabs = $('#tabs'); if (!tabs) return;
    var box = $('#cc-pins'); if (!box) { box = document.createElement('div'); box.id = 'cc-pins'; box.setAttribute('aria-label', 'Pinned tabs'); tabs.appendChild(box); }
    var pins = LS.get('_ccPins', ['huddle', 'todo']);
    var info = {}; allTabs().forEach(function (t) { info[t.panel] = t; });
    box.innerHTML = '';
    pins.forEach(function (p) {
      if (!info[p]) return;
      var b = document.createElement('button'); b.className = 'cc-pin'; b.dataset.panel = p; b.textContent = info[p].label;
      b.onclick = function () { window.switchTab(tabEl(p)); };
      box.appendChild(b);
    });
    var cur = $('.tab.active, .nav-dropdown-item.active'); var cp = cur && cur.dataset.panel;
    $$('.cc-pin', box).forEach(function (b) { b.classList.toggle('active', b.dataset.panel === cp); });
  }
  function togglePin(p) {
    var pins = LS.get('_ccPins', ['huddle', 'todo']);
    var i = pins.indexOf(p); if (i >= 0) pins.splice(i, 1); else pins.push(p);
    LS.set('_ccPins', pins); renderPins();
  }

  /* ── COMMAND PALETTE ── */
  var pal, palInput, palList, palItems = [], palSel = 0;
  function buildPalette() {
    pal = document.createElement('div'); pal.id = 'cc-palette'; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Jump to');
    pal.innerHTML = '<div class="cc-pal-box"><input class="cc-pal-input" type="text" placeholder="Jump to a tab or a staff member…" aria-label="Search tabs and staff" autocomplete="off"><div class="cc-pal-list" role="listbox"></div><div class="cc-pal-foot"><span><span class="cc-kbd">↑↓</span> move</span><span><span class="cc-kbd">Enter</span> open</span><span><span class="cc-kbd">Alt+Enter</span> pin / unpin</span><span><span class="cc-kbd">Esc</span> close</span></div></div>';
    document.body.appendChild(pal);
    palInput = $('.cc-pal-input', pal); palList = $('.cc-pal-list', pal);
    pal.addEventListener('mousedown', function (e) { if (e.target === pal) closePalette(); });
    palInput.addEventListener('input', function () { palSel = 0; renderPalette(); });
    palInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closePalette(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { palSel = Math.min(palSel + 1, palItems.length - 1); paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { palSel = Math.max(palSel - 1, 0); paint(); e.preventDefault(); }
      else if (e.key === 'Enter') {
        var it = palItems[palSel]; if (!it) return; e.preventDefault();
        if (e.altKey && it.panel) { togglePin(it.panel); renderPalette(); } else choose(it);
      }
    });
  }
  function choose(it) {
    closePalette();
    if (it.staff) {
      window.switchTab($('.tab[data-panel="directory"]'));
      var s = $('#dir-search'); if (s) { s.value = it.staff; try { window.renderDirectory(); } catch (e) {} }
      return;
    }
    var el = tabEl(it.panel); if (el) window.switchTab(el);
  }
  function renderPalette() {
    var q = palInput.value.trim().toLowerCase();
    var tabs = allTabs(); var recent = LS.get('_ccRecent', []); var pins = LS.get('_ccPins', []);
    var rows = [];
    function row(t, tag) { rows.push({ panel: t.panel, label: t.label, meta: t.group, tag: tag }); }
    if (!q) {
      var info = {}; tabs.forEach(function (t) { info[t.panel] = t; });
      var rc = recent.filter(function (p) { return info[p]; }).slice(0, 5);
      rc.forEach(function (p) { row(info[p], 'Recent'); });
      tabs.forEach(function (t) { row(t, t.group); });
    } else {
      tabs.forEach(function (t) {
        var hay = (t.label + ' ' + t.group).toLowerCase();
        var score = hay.indexOf(q) === 0 ? 0 : (hay.indexOf(q) > 0 ? 1 : (isSubseq(q, hay) ? 2 : 9));
        if (score < 9) rows.push({ panel: t.panel, label: t.label, meta: t.group, tag: 'Tabs', score: score });
      });
      rows.sort(function (a, b) { return a.score - b.score; });
      try {
        if (q.length >= 2 && typeof MASTER_STAFF !== 'undefined') {
          MASTER_STAFF.filter(function (s) { return s && s.name && s.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 5).forEach(function (s) {
            rows.push({ staff: s.name, label: s.name, meta: 'Directory', tag: 'Staff' });
          });
        }
      } catch (e) {}
    }
    palItems = rows;
    if (!rows.length) { palList.innerHTML = '<div class="cc-pal-empty">No matches</div>'; return; }
    var html = '', last = null;
    rows.forEach(function (r, i) {
      if (r.tag !== last) { html += '<div class="cc-pal-group">' + esc(r.tag) + '</div>'; last = r.tag; }
      var pinned = r.panel && pins.indexOf(r.panel) >= 0;
      html += '<div class="cc-pal-row" role="option" data-i="' + i + '"><span class="cc-pal-ic">' + svg(r.staff ? 'user' : (PANEL_ICON[r.panel] || 'file')) + '</span><span class="cc-pal-label">' + esc(r.label) + '</span><span class="cc-pal-meta">' + (pinned ? 'Pinned · ' : '') + esc(r.meta) + '</span></div>';
    });
    palList.innerHTML = html;
    $$('.cc-pal-row', palList).forEach(function (el) {
      el.addEventListener('click', function () { choose(palItems[+el.dataset.i]); });
      el.addEventListener('mousemove', function () { palSel = +el.dataset.i; paint(); });
    });
    paint();
  }
  function paint() {
    $$('.cc-pal-row', palList).forEach(function (el) {
      var on = +el.dataset.i === palSel; el.classList.toggle('sel', on); el.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  }
  function isSubseq(q, s) { var i = 0; for (var k = 0; k < s.length && i < q.length; k++) if (s[k] === q[i]) i++; return i === q.length; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  window.ccEsc = esc;
  var palPrevFocus;
  function openPalette() {
    if (!pal) buildPalette();
    palPrevFocus = document.activeElement;
    pal.classList.add('open'); palInput.value = ''; palSel = 0; renderPalette(); palInput.focus();
  }
  function closePalette() { if (pal) pal.classList.remove('open'); if (palPrevFocus && palPrevFocus.focus) try { palPrevFocus.focus(); } catch (e) {} }
  window.openPalette = openPalette;
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openPalette(); }
  });

  /* ── switchTab wrapper: PIN gate, recents, pins ── */
  var _switch = window.switchTab;
  window.switchTab = function (el) {
    var e2 = el && el.closest ? (el.closest('.tab') || el.closest('.nav-dropdown-item') || el) : el;
    var pid = e2 && e2.dataset && e2.dataset.panel;
    if (pid && LOCKED[pid] && !pinUnlocked()) { pinGate(function () { window.switchTab(el); }); return; }
    var r = _switch.apply(this, arguments);
    if (pid) { remember(pid); try { window.scrollTo(0, 0); } catch (x) {} renderPins(); }
    return r;
  };

  /* ── PIN lock for sensitive tabs (client-side deterrent) ── */
  function hashPin(pin, salt) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 2166136261; var s = salt + ':' + pin;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return Promise.resolve('f' + (h >>> 0).toString(16));
  }
  function pinUnlocked() { try { return +sessionStorage.getItem('_ccPinUntil') > Date.now(); } catch (e) { return false; } }
  function setUnlocked() { try { sessionStorage.setItem('_ccPinUntil', String(Date.now() + 15 * 60 * 1000)); } catch (e) {} }
  window.ccLockNow = function () { try { sessionStorage.removeItem('_ccPinUntil'); } catch (e) {} ccToast('Sensitive tabs locked.'); var cur = $('.tab.active, .nav-dropdown-item.active'); if (cur && LOCKED[cur.dataset.panel]) window.switchTab($('.tab[data-panel="home"]')); };
  var fails = 0, lockedUntil = 0;
  function pinGate(onOk) {
    var cfg = LS.get('_ccPin', null); var setup = !cfg;
    var bg = document.createElement('div'); bg.className = 'cc-modal-bg';
    bg.innerHTML = '<div class="cc-modal" role="dialog" aria-modal="true" aria-label="PIN"><h3>' + (setup ? 'Set a PIN' : 'Enter PIN') + '</h3><p>' + (setup ? 'Year Review, 9-Box and Coaching hold staff performance data. Choose a PIN (4+ digits) to protect them on this device.' : 'Year Review, 9-Box and Coaching are PIN-protected.') + '</p><input type="password" inputmode="numeric" autocomplete="off" aria-label="PIN" class="cc-pin-a">' + (setup ? '<input type="password" inputmode="numeric" autocomplete="off" aria-label="Confirm PIN" placeholder="confirm" class="cc-pin-b">' : '') + '<div class="cc-err" role="alert"></div><div class="cc-row"><button class="btn btn-ghost cc-cancel">Cancel</button><button class="btn btn-primary cc-ok">' + (setup ? 'Save PIN' : 'Unlock') + '</button></div></div>';
    document.body.appendChild(bg);
    var a = $('.cc-pin-a', bg), b = $('.cc-pin-b', bg), err = $('.cc-err', bg);
    a.focus();
    function close() { bg.remove(); }
    $('.cc-cancel', bg).onclick = close;
    bg.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); if (e.key === 'Enter') ok(); });
    $('.cc-ok', bg).onclick = ok;
    function ok() {
      var v = a.value;
      if (setup) {
        if (!/^\d{4,12}$/.test(v)) { err.textContent = 'Use 4 to 12 digits.'; return; }
        if (b.value !== v) { err.textContent = 'PINs do not match.'; return; }
        var salt = Math.random().toString(36).slice(2);
        hashPin(v, salt).then(function (h) { LS.set('_ccPin', { s: salt, h: h }); setUnlocked(); close(); ccToast('PIN set. Use Actions → Lock sensitive tabs to lock again.'); onOk(); });
      } else {
        if (Date.now() < lockedUntil) { err.textContent = 'Too many tries. Wait ' + Math.ceil((lockedUntil - Date.now()) / 1000) + 's.'; return; }
        hashPin(v, cfg.s).then(function (h) {
          if (h === cfg.h) { fails = 0; setUnlocked(); close(); onOk(); }
          else { fails++; a.value = ''; if (fails >= 5) { lockedUntil = Date.now() + 30000; fails = 0; err.textContent = 'Too many tries. Wait 30s.'; } else err.textContent = 'Wrong PIN.'; }
        });
      }
    }
  }

  /* ── theme ── */
  function applyTheme(t) { if (t === 'light') document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme'); var m = $('meta[name="theme-color"]'); if (m) m.content = t === 'light' ? '#eef2f8' : '#0a1628'; }
  window.ccToggleTheme = function () { var t = LS.get('_ccTheme', 'dark') === 'light' ? 'dark' : 'light'; LS.set('_ccTheme', t); applyTheme(t); };

  /* ── offline bar ── */
  function initOffline() {
    var bar = document.createElement('div'); bar.id = 'cc-offline'; bar.setAttribute('role', 'alert');
    bar.textContent = 'You are offline. Changes are kept on this device and may not sync until you reconnect.';
    document.body.insertBefore(bar, document.body.firstChild);
    function upd() { bar.classList.toggle('show', !navigator.onLine); }
    window.addEventListener('online', function () { upd(); ccToast('Back online.', { type: 'ok' }); });
    window.addEventListener('offline', upd); upd();
  }

  /* ── Home: reorder + collapsible Data Health + strip emoji ── */
  function initHome() {
    var ph = $('#panel-home'); if (!ph) return;
    var stripRe = /^[←-⯿☀-➿️‍\s]*(?:[\uD83C-\uDBFF][\uDC00-\uDFFF][️‍\s]*)*/;
    $$('.card-title', ph).forEach(function (t) { if (t.children.length === 0) t.textContent = t.textContent.replace(stripRe, ''); });
    var dh = $('#mgr-data-health-card'); if (!dh) return;
    var collapsed = LS.get('_ccDhCollapsed', true);
    dh.classList.toggle('cc-collapsed', collapsed);
    var head = dh.firstElementChild; var btn = $('button', head);
    var tog = document.createElement('button'); tog.className = 'btn btn-ghost btn-sm'; tog.setAttribute('aria-controls', 'mgr-data-health');
    var dot = document.createElement('span'); dot.className = 'cc-dot';
    function labelTog() { tog.setAttribute('aria-expanded', String(!dh.classList.contains('cc-collapsed'))); tog.textContent = dh.classList.contains('cc-collapsed') ? 'Show details' : 'Hide details'; }
    tog.onclick = function () { dh.classList.toggle('cc-collapsed'); LS.set('_ccDhCollapsed', dh.classList.contains('cc-collapsed')); labelTog(); };
    labelTog();
    var wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:6px;align-items:center'; wrap.appendChild(dot); wrap.appendChild(tog);
    head.insertBefore(wrap, btn);
    function health() { var tx = ($('#mgr-data-health') || {}).textContent || ''; dot.classList.toggle('warn', /(stale|old|missing|no data|not loaded|days ago|never|outdated)/i.test(tx)); dot.title = dot.classList.contains('warn') ? 'Some data needs attention' : 'Data looks current'; }
    var tgt = $('#mgr-data-health'); if (tgt) new MutationObserver(health).observe(tgt, { childList: true, subtree: true, characterData: true }); health();
  }

  /* ── bottom bar (phone) ── */
  function initBottomBar() {
    var bar = document.createElement('nav'); bar.id = 'cc-bottombar'; bar.setAttribute('aria-label', 'Quick navigation');
    [['home', 'Home', 'home'], ['board', 'Board', 'grid'], ['charge', 'Charge', 'star'], ['directory', 'Directory', 'phone']].forEach(function (d) {
      var b = document.createElement('button'); b.dataset.panel = d[0]; b.innerHTML = svg(d[2], 22) + d[1];
      b.onclick = function () { window.switchTab($('.tab[data-panel="' + d[0] + '"]')); };
      bar.appendChild(b);
    });
    var more = document.createElement('button'); more.innerHTML = svg('dots', 22) + 'More'; more.onclick = openPalette; bar.appendChild(more);
    document.body.appendChild(bar);
  }

  /* ── PWA bits ── */
  function initPwa() {
    try {
      var icon = window.__CC_ICON_192;
      var man = { name: '3B Staff Command Center', short_name: '3B Command', start_url: location.origin + location.pathname, display: 'standalone', background_color: '#0a1628', theme_color: '#0a1628', icons: icon ? [{ src: icon, sizes: '192x192', type: 'image/png' }] : [] };
      var l = document.createElement('link'); l.rel = 'manifest'; l.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/manifest+json' })); document.head.appendChild(l);
    } catch (e) {}
  }

  /* ── init ── */
  function init() {
    if (isVariance) return; // staff variance links stay untouched
    applyTheme(LS.get('_ccTheme', 'dark'));
    initNav(); renderPins(); initHome(); initBottomBar(); initOffline(); initPwa();
    var trig = $('#cmdk-open'); if (trig) trig.addEventListener('click', openPalette);
    measure();
    if (window.ResizeObserver) { var ro = new ResizeObserver(measure); var h = $('header'), t = $('#tabs'); if (h) ro.observe(h); if (t) ro.observe(t); }
    window.addEventListener('resize', measure);
    setTimeout(function () {
      var last = LS.get('_ccLastTab', null);
      var active = $('.tab.active, .nav-dropdown-item.active');
      if (last && last !== 'home' && !LOCKED[last] && (!active || active.dataset.panel === 'home')) { var el = tabEl(last); if (el) window.switchTab(el); }
      renderPins(); measure();
    }, 700);
  }
  // applyTheme early to avoid flash
  try { applyTheme(LS.get('_ccTheme', 'dark')); } catch (e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

