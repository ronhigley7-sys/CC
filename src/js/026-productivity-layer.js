
/* ═══ PRODUCTIVITY LAYER — census memory, checklist, quick add, drop-import, save state, backups, undo, tables, badges, shift report, shortcuts ═══ */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('vf')) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var esc = function (v) { return window.ccEsc ? window.ccEsc(v) : String(v == null ? '' : v); };
  var toast = function (m, o) { if (window.ccToast) window.ccToast(m, o); };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function shiftKey() { var h = new Date().getHours(); return h >= 7 && h < 15 ? 'day' : (h >= 15 && h < 23 ? 'eve' : 'night'); }
  function tabEl(p) { return $('.nav-dropdown-item[data-panel="' + p + '"]') || $('.tab[data-panel="' + p + '"]'); }
  function go(p) { var el = tabEl(p); if (el && window.switchTab) window.switchTab(el); return !!el; }
  function rerenderCurrent() { var cur = $('.tab.active, .nav-dropdown-item.active'); if (cur && window.switchTab) window.switchTab(cur); }
  function focusFirstField(panel) {
    setTimeout(function () {
      var root = $('#panel-' + panel); if (!root) return;
      var f = $$('input,textarea,select', root).filter(function (x) { return x.offsetParent !== null && !/hidden|checkbox|radio|file|button|submit/.test(x.type || ''); })[0];
      if (f) { try { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus(); } catch (e) {} }
    }, 320);
  }
  function modal(html, onClose) {
    var bg = document.createElement('div'); bg.className = 'cc-modal-bg'; bg.setAttribute('role', 'presentation');
    bg.innerHTML = '<div class="cc-modal cc-wide" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(bg);
    function close() { bg.remove(); document.removeEventListener('keydown', onKey, true); if (onClose) onClose(); }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(); });
    return { el: bg, close: close };
  }

  /* ── data version (for memoised renders + staleness) ── */
  window.__ccVer = 0;
  function bump() { window.__ccVer++; }
  document.addEventListener('input', bump, true);
  document.addEventListener('change', bump, true);

  /* ═════ 1. CENSUS MEMORY ═════ */
  var CIDS = ['census-day', 'census-eve', 'census-night'];
  function saveCensus() {
    var all = LS.get('_ccCensus', {});
    all[todayKey()] = CIDS.map(function (id) { var el = $('#' + id); return el ? (+el.value || 0) : 0; });
    var keys = Object.keys(all).sort(); while (keys.length > 45) delete all[keys.shift()];
    LS.set('_ccCensus', all);
  }
  function applyCensus(vals) {
    CIDS.forEach(function (id, i) { var el = $('#' + id); if (el) el.value = vals[i] || 0; });
    try { window.updateRatios(); } catch (e) {}
    saveCensus();
  }
  function initCensus() {
    var cur = LS.get('_ccCensus', {})[todayKey()];
    var empty = CIDS.every(function (id) { var el = $('#' + id); return !el || !(+el.value); });
    if (cur && empty) applyCensus(cur);
    CIDS.forEach(function (id) { var el = $('#' + id); if (el) el.addEventListener('input', saveCensus); });
    var grp = $('#census-bar .census-group');
    if (grp && !$('#cc-census-yday')) {
      var b = document.createElement('button'); b.id = 'cc-census-yday'; b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
      b.textContent = '↩'; b.title = 'Copy the most recent saved census'; b.setAttribute('aria-label', 'Copy the most recent saved census');
      b.onclick = function () {
        var all = LS.get('_ccCensus', {}), t = todayKey();
        var prev = Object.keys(all).filter(function (k) { return k < t; }).sort().pop();
        if (!prev) { toast('No earlier census saved yet.'); return; }
        applyCensus(all[prev]); toast('Census copied from ' + prev + '.', { type: 'ok' });
      };
      grp.appendChild(b);
    }
  }

  /* ═════ 2. START-OF-SHIFT CHECKLIST ═════ */
  var CHECK = [
    ['census', 'Enter census and check ratios', null],
    ['callins', 'Review call-ins and cover open shifts', 'board'],
    ['brief', 'Read the Priority Brief below', null],
    ['tasks', 'Clear overdue tasks', 'todo'],
    ['plato', 'PLATO weekly entry saved', 'platoweekly'],
    ['huddle', 'Prepare huddle topics', 'huddle']
  ];
  function checklistKey() { return todayKey() + '-' + shiftKey(); }
  function renderChecklist() {
    var box = $('#cc-checklist'); if (!box) return;
    var all = LS.get('_ccChecklist', {}); var st = all[checklistKey()] || {};
    var censusDone = CIDS.some(function (id) { var el = $('#' + id); return el && +el.value > 0; });
    if (censusDone) st.census = true;
    var done = CHECK.filter(function (c) { return st[c[0]]; }).length;
    var sk = { day: 'Day', eve: 'Evening', night: 'Night' }[shiftKey()];
    box.innerHTML = '<div class="cc-cl-head"><div><div class="card-title">' + sk + ' shift start</div><div class="cc-cl-sub">' + done + ' of ' + CHECK.length + ' done · resets each shift</div></div><div class="cc-cl-bar"><span style="width:' + Math.round(done / CHECK.length * 100) + '%"></span></div></div>' +
      '<div class="cc-cl-items">' + CHECK.map(function (c) {
        return '<label class="cc-cl-item' + (st[c[0]] ? ' done' : '') + '"><input type="checkbox" data-id="' + c[0] + '"' + (st[c[0]] ? ' checked' : '') + '><span>' + esc(c[1]) + '</span>' +
          (c[2] ? '<button type="button" class="btn btn-ghost btn-sm" data-go="' + c[2] + '">Open</button>' : '') + '</label>';
      }).join('') + '</div>';
    $$('input[type=checkbox]', box).forEach(function (cb) {
      cb.addEventListener('change', function () {
        var a = LS.get('_ccChecklist', {}); var k = checklistKey(); a[k] = a[k] || {}; a[k][cb.dataset.id] = cb.checked;
        var keys = Object.keys(a).sort(); while (keys.length > 30) delete a[keys.shift()];
        LS.set('_ccChecklist', a); renderChecklist();
      });
    });
    $$('[data-go]', box).forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); go(b.dataset.go); }); });
  }
  function initChecklist() {
    var row = $('#panel-home .cc-home-row'); if (!row || $('#cc-checklist')) return;
    var card = document.createElement('div'); card.id = 'cc-checklist'; card.className = 'card cc-checklist';
    row.parentNode.insertBefore(card, row); renderChecklist();
    CIDS.forEach(function (id) { var el = $('#' + id); if (el) el.addEventListener('input', renderChecklist); });
  }

  /* ═════ 3. QUICK ADD (+) ═════ */
  function initFab() {
    var fab = document.createElement('div'); fab.id = 'cc-fab';
    fab.innerHTML = '<div class="cc-fab-menu" id="cc-fab-menu" role="menu" hidden>' +
      '<button role="menuitem" data-q="todo">New to-do</button><button role="menuitem" data-q="absence">Log call-in / absence</button>' +
      '<button role="menuitem" data-q="incidents">Record incident</button><button role="menuitem" data-q="huddle">Huddle note</button>' +
      '<button role="menuitem" data-q="report">Shift report</button></div>' +
      '<button id="cc-fab-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Quick add">+</button>';
    document.body.appendChild(fab);
    var menu = $('#cc-fab-menu'), btn = $('#cc-fab-btn');
    function set(open) { menu.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); fab.classList.toggle('open', open); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(menu.hidden); });
    document.addEventListener('click', function (e) { if (!fab.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    $$('[data-q]', menu).forEach(function (b) {
      b.addEventListener('click', function () { set(false); quick(b.dataset.q); });
    });
  }
  function quick(q) {
    if (q === 'report') { shiftReport(); return; }
    if (q === 'todo' && typeof openTodoModal === 'function') {
      if (go('todo')) setTimeout(function () {
        try { openTodoModal(); } catch (e) {}
        setTimeout(function () { var f = $('#todo-modal textarea, #todo-modal input:not([type=hidden])'); if (f) f.focus(); }, 120);
      }, 250);
      return;
    }
    if (go(q)) focusFirstField(q);
  }

  /* ═════ 4. TILE KEYBOARD ACCESS ═════ */
  function a11yTiles() {
    $$('#panel-home [onclick*="switchTab"]').forEach(function (el) {
      if (el.getAttribute('role')) return;
      el.setAttribute('role', 'button'); el.tabIndex = 0;
    });
  }
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.matches && t.matches('#panel-home [role=button][onclick*="switchTab"]')) { e.preventDefault(); t.click(); }
  });

  /* ═════ 5. DROP-ANYWHERE IMPORT ═════ */
  var IMPORTS = [
    ['Staffing schedule (UKG)', 'file-input', 'import', /staff|sched|ukg|condensed/i],
    ['Absences / call-ins', 'imp-abs-file-input', 'import', /absen|call.?(in|out)|attend/i],
    ['Absence history', 'absence-file-input', 'absence', /history|log/i],
    ['Float response', 'float-file-input', 'import', /float/i],
    ['Education / certifications', 'edu-file-input', 'education', /edu|cert|learn|comp/i],
    ['Productivity (HPPD)', 'hppd-file-input', 'hppd', /hppd|product/i],
    ['Restore backup (.json)', 'backup-file-input', 'import', /\.json$/i]
  ];
  function initDrop() {
    var ov = document.createElement('div'); ov.id = 'cc-drop'; ov.innerHTML = '<div>Drop a file to import it</div>'; document.body.appendChild(ov);
    var depth = 0;
    function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
    function ownZone(e) { return e.target && e.target.closest && e.target.closest('#abs-drop-zone,[ondrop],[data-own-drop]'); }
    document.addEventListener('dragenter', function (e) { if (!hasFiles(e) || ownZone(e)) return; depth++; ov.classList.add('show'); });
    document.addEventListener('dragleave', function (e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) ov.classList.remove('show'); });
    document.addEventListener('dragover', function (e) { if (hasFiles(e) && !ownZone(e)) e.preventDefault(); });
    document.addEventListener('drop', function (e) {
      depth = 0; ov.classList.remove('show');
      if (!hasFiles(e) || ownZone(e) || e.defaultPrevented) return;
      e.preventDefault();
      var file = e.dataTransfer.files && e.dataTransfer.files[0]; if (!file) return;
      var ext = (file.name.split('.').pop() || '').toLowerCase();
      var opts = IMPORTS.filter(function (o) { var inp = document.getElementById(o[1]); if (!inp) return false; var acc = (inp.accept || '').toLowerCase(); return !acc || acc.indexOf('.' + ext) >= 0; });
      if (!opts.length) { toast('No import accepts a .' + ext + ' file.', { type: 'err' }); return; }
      var guess = opts.filter(function (o) { return o[3].test(file.name); })[0] || opts[0];
      opts.sort(function (a, b) { return (b === guess) - (a === guess); });
      var m = modal('<h3>Import ' + esc(file.name) + '</h3><p>Choose where this file goes. The best match is first.</p><div class="cc-imp-list">' +
        opts.map(function (o, i) { return '<button type="button" class="btn ' + (i === 0 ? 'btn-primary' : 'btn-ghost') + '" data-i="' + IMPORTS.indexOf(o) + '">' + esc(o[0]) + '</button>'; }).join('') +
        '</div><div class="cc-row"><button type="button" class="btn btn-ghost cc-cancel">Cancel</button></div>');
      $('.cc-cancel', m.el).onclick = m.close;
      var first = $('[data-i]', m.el); if (first) first.focus();
      $$('[data-i]', m.el).forEach(function (b) {
        b.onclick = function () {
          var o = IMPORTS[+b.dataset.i], inp = document.getElementById(o[1]); m.close();
          if (!inp) return;
          go(o[2]);
          try { var dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); toast('Importing ' + file.name + ' as: ' + o[0]); }
          catch (err) { toast('Could not hand the file to that importer. Use its Choose File button instead.', { type: 'err' }); }
        };
      });
    });
  }

  /* ═════ 6. SYNC POLL CATCH-UP WHEN TAB RETURNS ═════ */
  document.addEventListener('visibilitychange', function () {
    try { if (!document.hidden && typeof _sbConnected !== 'undefined' && _sbConnected && typeof sbPoll === 'function') sbPoll(); } catch (e) {}
  });

  /* ═════ 7. SAVE-STATE INDICATOR ═════ */
  var saveEl, inflight = 0, lastSaved = 0;
  function setSave(kind) {
    if (!saveEl) return;
    var t = '', cls = '';
    if (kind === 'saving') { t = 'Saving…'; cls = 'busy'; }
    else if (kind === 'saved') { lastSaved = Date.now(); t = 'Saved ' + new Date(lastSaved).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); cls = 'ok'; }
    else if (kind === 'error') { t = 'Save failed — will retry on next change'; cls = 'err'; }
    else if (kind === 'offline') { t = 'Offline — saved on this device'; cls = 'warn'; }
    saveEl.textContent = t; saveEl.className = 'cc-save ' + cls;
  }
  function initSaveState() {
    var anchor = $('#sp-status-badge'); if (!anchor) return;
    saveEl = document.createElement('div'); saveEl.id = 'cc-save-state'; saveEl.setAttribute('role', 'status'); saveEl.setAttribute('aria-live', 'polite');
    anchor.parentNode.insertBefore(saveEl, anchor);
    var orig = window.persistSave;
    if (typeof orig === 'function') {
      window.persistSave = async function () {
        inflight++; bump(); setSave('saving');
        try { var r = await orig.apply(this, arguments); setSave(navigator.onLine ? 'saved' : 'offline'); setTimeout(updateBadges, 50); return r; }
        catch (e) { setSave('error'); throw e; }
        finally { inflight--; }
      };
    }
    window.addEventListener('beforeunload', function (e) { if (inflight > 0) { e.preventDefault(); e.returnValue = ''; return ''; } });
    window.addEventListener('offline', function () { setSave('offline'); });
  }

  /* ═════ 8. DAILY LOCAL BACKUPS (IndexedDB, 14 days) ═════ */
  var DB = 'cc-backups', STORE = 'snap';
  function dbOpen() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'date' }); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function dbAll() { return dbOpen().then(function (db) { return new Promise(function (res, rej) { var q = db.transaction(STORE).objectStore(STORE).getAll(); q.onsuccess = function () { res(q.result || []); }; q.onerror = function () { rej(q.error); }; }); }); }
  function dbPut(rec) { return dbOpen().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(rec); tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; }); }); }
  function dbDel(date) { return dbOpen().then(function (db) { return new Promise(function (res) { var tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(date); tx.oncomplete = res; }); }); }
  function snapNow(force) {
    try {
      if (typeof buildSavePayload !== 'function') return Promise.resolve(false);
      var json = JSON.stringify(buildSavePayload());
      if (json.length < 2000) return Promise.resolve(false); // data not loaded yet
      return dbAll().then(function (all) {
        var t = todayKey();
        if (!force && all.some(function (r) { return r.date === t; })) return false;
        return dbPut({ date: t, ts: Date.now(), json: json }).then(function () {
          var old = all.filter(function (r) { return r.date !== t; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(13);
          return Promise.all(old.map(function (r) { return dbDel(r.date); })).then(function () { return true; });
        });
      });
    } catch (e) { return Promise.resolve(false); }
  }
  function initBackups() {
    setTimeout(function () { snapNow(false).catch(function () {}); }, 15000);
    document.addEventListener('visibilitychange', function () { if (document.hidden) snapNow(false).catch(function () {}); });
  }
  function openBackups() {
    dbAll().then(function (all) {
      all.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var m = modal('<h3>Local backups</h3><p>One snapshot is kept per day for 14 days, stored in this browser only.</p><div class="cc-bk-list">' +
        (all.length ? all.map(function (r) { return '<div class="cc-bk-row"><div><b>' + esc(r.date) + '</b><small>' + Math.round(r.json.length / 1024) + ' KB · ' + new Date(r.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '</small></div><div><button type="button" class="btn btn-ghost btn-sm" data-dl="' + esc(r.date) + '">Download</button> <button type="button" class="btn btn-ghost btn-sm" data-vf="' + esc(r.date) + '">Verify</button> <button type="button" class="btn btn-ghost btn-sm" data-rs="' + esc(r.date) + '">Restore</button></div></div>'; }).join('') : '<div class="cc-pal-empty">No snapshots yet.</div>') +
        '</div><div class="cc-row"><button type="button" class="btn btn-ghost cc-now">Back up now</button><button type="button" class="btn btn-primary cc-close">Close</button></div>');
      $('.cc-close', m.el).onclick = m.close;
      $('.cc-now', m.el).onclick = function () { snapNow(true).then(function (ok) { toast(ok ? 'Backup saved.' : 'Nothing to back up yet.', { type: ok ? 'ok' : '' }); m.close(); if (ok) openBackups(); }); };
      $$('[data-dl]', m.el).forEach(function (b) { b.onclick = function () {
        var r = all.filter(function (x) { return x.date === b.dataset.dl; })[0]; if (!r) return;
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.json], { type: 'application/json' })); a.download = 'command-center-backup-' + r.date + '.json'; document.body.appendChild(a); a.click(); a.remove();
      }; });
      $$('[data-vf]', m.el).forEach(function (b) { b.onclick = function () {
        var r = all.filter(function (x) { return x.date === b.dataset.vf; })[0]; if (r && window.ccVerify) window.ccVerify(r.json);
      }; });
      $$('[data-rs]', m.el).forEach(function (b) { b.onclick = function () {
        var r = all.filter(function (x) { return x.date === b.dataset.rs; })[0]; if (!r) return;
        if (!window.confirm('Restore the ' + r.date + ' backup? Current data will be replaced (a safety copy of right now is saved first).')) return;
        snapNow(true).then(function () {
          try { (window.ccLocalApply || window.applyLoadedData)(JSON.parse(r.json)); window.persistSave(); m.close(); rerenderCurrent(); toast('Restored backup from ' + r.date + '.', { type: 'ok' }); }
          catch (e) { toast('Restore failed: ' + e.message, { type: 'err' }); }
        });
      }; });
    }).catch(function () { toast('Backups are not available in this browser.', { type: 'err' }); });
  }

  /* ═════ 9. UNDO FOR DELETES ═════ */
  function wrapDeletes() {
    if (typeof buildSavePayload !== 'function' || typeof applyLoadedData !== 'function') return;
    Object.keys(window).forEach(function (k) {
      if (!/^(delete|remove)[A-Z]/.test(k) || typeof window[k] !== 'function' || window[k].__ccUndo) return;
      var fn = window[k];
      var w = function () {
        var before; try { before = JSON.stringify(buildSavePayload()); } catch (e) { return fn.apply(this, arguments); }
        var r = fn.apply(this, arguments);
        var check = function () {
          setTimeout(function () {
            try {
              if (JSON.stringify(buildSavePayload()) === before) return;
              toast('Deleted.', { ms: 10000, action: { label: 'Undo', fn: function () {
                try { (window.ccLocalApply || applyLoadedData)(JSON.parse(before)); persistSave(); rerenderCurrent(); toast('Restored.', { type: 'ok' }); } catch (e) { toast('Undo failed.', { type: 'err' }); }
              } } });
            } catch (e) {}
          }, 400);
        };
        if (r && typeof r.then === 'function') r.then(check, function () {}); else check();
        return r;
      };
      w.__ccUndo = true; window[k] = w;
    });
  }

  /* ═════ 10. MEMOISED HEAVY RENDERS ═════ */
  function memo() {
    ['renderStaffingIntelligence', 'renderQualityIntelligence'].forEach(function (name) {
      var fn = window[name]; if (typeof fn !== 'function' || fn.__ccMemo) return;
      var last = null;
      var w = function () {
        var key = window.__ccVer + '|' + todayKey() + '|' + CIDS.map(function (id) { var el = $('#' + id); return el ? el.value : ''; }).join(',');
        var panel = $('#panel-' + (name.indexOf('Staffing') >= 0 ? 'staffintel' : 'qualityintel'));
        if (last === key && panel && panel.textContent.trim().length > 200) return;
        last = key; return fn.apply(this, arguments);
      };
      w.__ccMemo = true; window[name] = w;
    });
    if (typeof window.applyLoadedData === 'function' && !window.applyLoadedData.__ccBump) {
      var al = window.applyLoadedData;
      window.applyLoadedData = function () { bump(); return al.apply(this, arguments); };
      window.applyLoadedData.__ccBump = true;
    }
  }

  /* ═════ 12. SORT / FILTER / CSV ON TABLES ═════ */
  var NO_TABLE_PANELS = { board: 1, charge: 1, schedule: 1, staffprefs: 1, huddle: 1, attendsheet: 1, readsign: 1, 'import': 1, directory: 0 };
  function cellText(td) { var inp = $('input,select,textarea', td); return ((inp ? inp.value : td.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function num(s) { var n = parseFloat(String(s).replace(/[$,%\s]/g, '')); return isNaN(n) ? null : n; }
  function enhanceTables() {
    var panel = $('.tab-panel.active'); if (!panel) return;
    var pid = (panel.id || '').replace('panel-', ''); if (NO_TABLE_PANELS[pid]) return;
    $$('table', panel).forEach(function (t) {
      if (t.dataset.ccTbl || t.closest('[data-cc-no-table]') || t.closest('#cc-checklist')) return;
      var body = t.tBodies[0], head = t.tHead; if (!body || !head || head.rows.length !== 1 || body.rows.length < 6) return;
      var cols = head.rows[0].cells.length; if (cols < 2) return;
      if (t.querySelector('td[colspan],td[rowspan],th[colspan]')) return;
      if ($$('tr', body).some(function (r) { return r.cells.length !== cols || r.draggable || r.getAttribute('contenteditable'); })) return;
      t.dataset.ccTbl = '1';
      var bar = document.createElement('div'); bar.className = 'cc-tbl-bar';
      bar.innerHTML = '<input type="search" placeholder="Filter rows…" aria-label="Filter table rows"><span class="cc-tbl-count"></span><button type="button" class="btn btn-ghost btn-sm">CSV</button>';
      var wrap = t.parentNode; wrap.insertBefore(bar, t);
      var inp = $('input', bar), cnt = $('.cc-tbl-count', bar);
      function rows() { return $$('tr', body); }
      function count() { var v = rows().filter(function (r) { return r.style.display !== 'none'; }).length; cnt.textContent = v + ' of ' + rows().length; }
      inp.addEventListener('input', function () { var q = inp.value.toLowerCase(); rows().forEach(function (r) { r.style.display = !q || r.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; }); count(); });
      $('button', bar).addEventListener('click', function () {
        var lines = [$$('th', head).map(function (th) { return th.textContent.replace(/\s+/g, ' ').trim(); })];
        rows().filter(function (r) { return r.style.display !== 'none'; }).forEach(function (r) { lines.push($$('td', r).map(cellText)); });
        var csv = lines.map(function (l) { return l.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = pid + '-' + todayKey() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
      });
      $$('th', head).forEach(function (th, ci) {
        th.classList.add('cc-sortable'); th.tabIndex = 0; th.setAttribute('role', 'columnheader'); th.setAttribute('aria-sort', 'none');
        function sort() {
          var asc = th.getAttribute('aria-sort') !== 'ascending';
          $$('th', head).forEach(function (o) { o.setAttribute('aria-sort', 'none'); });
          th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
          var arr = rows().map(function (r) { return { r: r, v: cellText(r.cells[ci]) }; });
          var numeric = arr.every(function (x) { return x.v === '' || num(x.v) !== null; });
          arr.sort(function (a, b) {
            var c = numeric ? ((num(a.v) == null ? -Infinity : num(a.v)) - (num(b.v) == null ? -Infinity : num(b.v))) : a.v.localeCompare(b.v, undefined, { numeric: true, sensitivity: 'base' });
            return asc ? c : -c;
          });
          arr.forEach(function (x) { body.appendChild(x.r); });
        }
        th.addEventListener('click', sort);
        th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } });
      });
      count();
    });
  }

  /* ═════ 13. NAV BADGES ═════ */
  function overdueTodos() {
    try {
      var key = typeof todoDateKey === 'function' ? todoDateKey() : todayKey();
      return (Array.isArray(state.todoList) ? state.todoList : []).filter(function (x) {
        var done = x.archived || x.status === 'Complete' || x.done === true || x.complete === true || x.completed === true;
        return !done && x.dueDate && x.dueDate < key;
      }).length;
    } catch (e) { return 0; }
  }
  function safe(fn) { try { return typeof fn === 'function' ? (+fn() || 0) : 0; } catch (e) { return 0; } }
  function setBadge(el, n, level) {
    if (!el) return;
    if (n > 0) { el.setAttribute('data-badge', n > 99 ? '99+' : String(n)); el.setAttribute('data-level', level || 'warn'); el.classList.add('cc-has-badge'); el.setAttribute('title', n + ' need attention'); }
    else { el.removeAttribute('data-badge'); el.classList.remove('cc-has-badge'); el.removeAttribute('title'); }
  }
  function updateBadges() {
    var certs = safe(function () { return mgrCertDueCount(30); });
    var comps = safe(function () { return mgrPendingCompetencyCount(); });
    var coach = safe(function () { return mgrCoachingFollowupCount(); });
    var od = overdueTodos();
    setBadge(tabEl('education'), certs, 'warn'); setBadge(tabEl('competency'), comps, 'warn');
    setBadge(tabEl('coaching'), coach, 'warn'); setBadge(tabEl('todo'), od, 'bad');
    setBadge($('#ng-edu .nav-group-btn'), certs + comps, 'warn');
    setBadge($('#ng-people .nav-group-btn'), coach, 'warn');
    setBadge($('#ng-tools .nav-group-btn'), od, 'bad');
  }

  /* ═════ 14. SHIFT REPORT ═════ */
  function shiftReport() {
    var L = [], dk = todayKey();
    try { dk = mgrBoardDate(); } catch (e) {}
    var d = new Date(dk + 'T12:00:00');
    var sk = { day: 'Day', eve: 'Evening', night: 'Night' }[shiftKey()];
    L.push('3B/3C SHIFT REPORT — ' + d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + ' · ' + sk + ' shift');
    L.push('');
    var cv = CIDS.map(function (id) { var el = $('#' + id); return el ? (el.value || 0) : 0; });
    L.push('CENSUS: Day ' + cv[0] + ' · Eve ' + cv[1] + ' · Night ' + cv[2]);
    var chips = $$('#ratio-display .ratio-chip').map(function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); }).filter(function (x) { return x && !/enter census/i.test(x); });
    if (chips.length) L.push('Ratios: ' + chips.join(' · '));
    L.push('');
    try {
      var mins = typeof MGR_MIN !== 'undefined' ? MGR_MIN : { RN: 6, LPN: 1, CA: 4 };
      L.push('COVERAGE (minimum ' + mins.RN + ' RN / ' + mins.LPN + ' LPN / ' + mins.CA + ' CA)');
      mgrCoverage(dk).forEach(function (r) {
        var short = [];
        if (r.RN < mins.RN) short.push('RN short ' + (mins.RN - r.RN)); if (r.LPN < mins.LPN) short.push('LPN short ' + (mins.LPN - r.LPN)); if (r.CA < mins.CA) short.push('CA short ' + (mins.CA - r.CA));
        L.push('  ' + r.label + ' ' + r.time + ': RN ' + r.RN + ' · LPN ' + r.LPN + ' · CA ' + r.CA + (short.length ? '   << ' + short.join(', ') : '   OK'));
      });
    } catch (e) { L.push('  (coverage unavailable)'); }
    L.push('');
    try {
      var calls = [];
      Object.keys(state.absenceLog || {}).forEach(function (n) { (state.absenceLog[n] || []).forEach(function (e) { if (e && e.date === dk && e.type !== 'tardy') calls.push('  ' + n + ' — ' + (e.type || 'call-in') + (e.note ? ' (' + e.note + ')' : '')); }); });
      L.push('CALL-INS: ' + (calls.length || 'none')); calls.forEach(function (c) { L.push(c); });
    } catch (e) {}
    L.push('');
    var od = overdueTodos(), open = safe(function () { return mgrTodoCount(); });
    L.push('TASKS: ' + open + ' open, ' + od + ' overdue');
    try {
      var key = typeof todoDateKey === 'function' ? todoDateKey() : todayKey();
      (state.todoList || []).filter(function (x) { return !(x.archived || x.status === 'Complete' || x.done === true || x.complete === true || x.completed === true) && x.dueDate && x.dueDate < key; }).slice(0, 6).forEach(function (x) { L.push('  - ' + x.text + ' (due ' + x.dueDate + ')'); });
    } catch (e) {}
    L.push('');
    L.push('EDUCATION / FOLLOW-UP: certs due ≤30 days ' + safe(function () { return mgrCertDueCount(30); }) + ' · competencies pending ' + safe(function () { return mgrPendingCompetencyCount(); }) + ' · coaching follow-ups ' + safe(function () { return mgrCoachingFollowupCount(); }));
    try {
      var h = typeof huddleGetData === 'function' ? huddleGetData() : null;
      if (h && (h.announcements || h.recognitions || h.cnoContent)) {
        L.push(''); L.push('HUDDLE');
        if (h.cnoContent) L.push('  ' + (h.cnoTitle || 'CNO message') + ': ' + h.cnoContent.replace(/\s+/g, ' ').slice(0, 300));
        if (h.announcements) L.push('  Announcements: ' + h.announcements.replace(/\s+/g, ' ').slice(0, 300));
        if (h.recognitions) L.push('  Recognitions: ' + h.recognitions.replace(/\s+/g, ' ').slice(0, 300));
      }
    } catch (e) {}
    L.push(''); L.push('MANAGER NOTES:'); L.push('');
    var text = L.join('\n');
    var m = modal('<h3>Shift report</h3><p>Edit the notes if you like, then copy, print or email.</p><textarea class="cc-report" aria-label="Shift report text" spellcheck="false"></textarea><div class="cc-row"><button type="button" class="btn btn-ghost cc-copy">Copy</button><button type="button" class="btn btn-ghost cc-print">Print</button><button type="button" class="btn btn-ghost cc-mail">Email</button><button type="button" class="btn btn-primary cc-close">Close</button></div>');
    var ta = $('.cc-report', m.el); ta.value = text;
    $('.cc-close', m.el).onclick = m.close;
    $('.cc-copy', m.el).onclick = function () { try { navigator.clipboard.writeText(ta.value).then(function () { toast('Report copied.', { type: 'ok' }); }, function () { ta.select(); document.execCommand('copy'); toast('Report copied.', { type: 'ok' }); }); } catch (e) { ta.select(); document.execCommand('copy'); toast('Report copied.', { type: 'ok' }); } };
    $('.cc-print', m.el).onclick = function () {
      var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print, or use Copy.', { type: 'err' }); return; }
      w.document.write('<!DOCTYPE html><html><head><title>Shift report</title><style>body{font:13px/1.45 "Courier New",monospace;padding:24px;white-space:pre-wrap}</style></head><body></body></html>');
      w.document.body.textContent = ta.value; w.document.close(); setTimeout(function () { w.print(); }, 200);
    };
    $('.cc-mail', m.el).onclick = function () { location.href = 'mailto:?subject=' + encodeURIComponent('3B/3C shift report ' + dk) + '&body=' + encodeURIComponent(ta.value.slice(0, 1800)); };
    ta.focus();
  }
  window.ccShiftReport = shiftReport; window.ccOpenBackups = openBackups;

  /* ═════ 15. KEYBOARD SHORTCUTS ═════ */
  var GO = { h: ['home', 'Home'], b: ['board', 'Board'], c: ['charge', 'Charge'], d: ['directory', 'Directory'], t: ['todo', 'To-Do'], i: ['incidents', 'Incidents'], p: ['platoweekly', 'PLATO Weekly'], q: ['quality', 'Quality'], o: ['openshifts', 'Open Shifts'], u: ['huddle', 'Huddle'], s: ['schedule', 'Schedule'], e: ['education', 'Education'] };
  function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
  var gArm = 0;
  function cheat() {
    var rows = Object.keys(GO).map(function (k) { return '<div><kbd>g</kbd> <kbd>' + k + '</kbd><span>' + GO[k][1] + '</span></div>'; }).join('');
    var m = modal('<h3>Keyboard shortcuts</h3><div class="cc-keys">' + rows +
      '<div><kbd>Ctrl</kbd> <kbd>K</kbd><span>Search tabs and staff</span></div><div><kbd>/</kbd><span>Search tabs and staff</span></div><div><kbd>n</kbd><span>New to-do</span></div><div><kbd>r</kbd><span>Shift report</span></div><div><kbd>F</kbd><span>Find cover</span></div><div><kbd>?</kbd><span>This list</span></div></div><div class="cc-row"><button type="button" class="btn btn-primary cc-close">Close</button></div>');
    $('.cc-close', m.el).onclick = m.close; $('.cc-close', m.el).focus();
  }
  window.ccShortcuts = cheat;
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('.cc-modal-bg,#cc-palette.open')) return;
    var k = e.key;
    if (gArm && Date.now() - gArm < 1300 && GO[k.toLowerCase()]) { gArm = 0; e.preventDefault(); go(GO[k.toLowerCase()][0]); return; }
    gArm = 0;
    if (k === 'g') { gArm = Date.now(); return; }
    if (k === '?') { e.preventDefault(); cheat(); }
    else if (k === '/') { e.preventDefault(); if (window.openPalette) window.openPalette(); }
    else if (k === 'n') { e.preventDefault(); quick('todo'); }
    else if (k === 'r') { e.preventDefault(); shiftReport(); }
  });

  /* ── Actions menu additions ── */
  function extendMenu() {
    var menu = $('#print-menu'); if (!menu || $('#cc-menu-extra')) return;
    var box = document.createElement('div'); box.id = 'cc-menu-extra';
    box.innerHTML = '<div class="cc-menu-sep"></div><div class="cc-menu-label">Tools</div>' +
      '<button class="cc-menu-item" role="menuitem" data-a="report"><b>Shift report</b><small>Census, coverage, call-ins, tasks · R</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-a="backups"><b>Local backups</b><small>Daily snapshots, download or restore</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-a="keys"><b>Keyboard shortcuts</b><small>Press ? any time</small></button>';
    menu.appendChild(box);
    $$('[data-a]', box).forEach(function (b) { b.addEventListener('click', function () {
      if (window.hidePrintMenu) window.hidePrintMenu();
      if (b.dataset.a === 'report') shiftReport(); else if (b.dataset.a === 'backups') openBackups(); else cheat();
    }); });
  }

  /* ── init ── */
  function init() {
    initCensus(); initChecklist(); initFab(); initDrop(); initSaveState(); initBackups(); extendMenu();
    wrapDeletes(); memo(); a11yTiles(); updateBadges();
    var main = $('#cc-main') || document.body, tm;
    new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(function () { a11yTiles(); enhanceTables(); }, 450); }).observe(main, { childList: true, subtree: true });
    setInterval(updateBadges, 60000); setInterval(function () { renderChecklist(); }, 300000);
    setTimeout(function () { wrapDeletes(); memo(); updateBadges(); enhanceTables(); }, 3000);
    var sw = window.switchTab;
    window.switchTab = function () { var r = sw.apply(this, arguments); setTimeout(function () { enhanceTables(); updateBadges(); if ($('#panel-home.active')) { renderChecklist(); } }, 500); return r; };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); }); else setTimeout(init, 200);
})();

