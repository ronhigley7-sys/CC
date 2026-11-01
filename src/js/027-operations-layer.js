
/* ═══ OPERATIONS LAYER — cover finder, schedule check, census trend, import diff, change log, digest, calendar, 1:1 prep, home layout, offline ═══ */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('vf')) return;
  var START = Date.now();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var esc = function (v) { return window.ccEsc ? window.ccEsc(v) : String(v == null ? '' : v); };
  var toast = function (m, o) { if (window.ccToast) window.ccToast(m, o); };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return fmt(new Date()); }
  function addDays(dk, n) { var d = new Date(dk + 'T12:00:00'); d.setDate(d.getDate() + n); return fmt(d); }
  function nice(dk) { return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function tabEl(p) { return $('.nav-dropdown-item[data-panel="' + p + '"]') || $('.tab[data-panel="' + p + '"]'); }
  function go(p) { var el = tabEl(p); if (el && window.switchTab) window.switchTab(el); return !!el; }
  function rerender() { var cur = $('.tab.active, .nav-dropdown-item.active'); if (cur && window.switchTab) window.switchTab(cur); }
  function human(s) { return String(s).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function modal(html, cls) {
    var bg = document.createElement('div'); bg.className = 'cc-modal-bg';
    bg.innerHTML = '<div class="cc-modal cc-wide ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(bg);
    function close() { bg.remove(); document.removeEventListener('keydown', onKey, true); }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(); });
    var c = $('.cc-close', bg); if (c) c.onclick = close;
    return { el: bg, close: close };
  }
  function dl(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function copy(text) { try { return navigator.clipboard.writeText(text).then(function () { toast('Copied.', { type: 'ok' }); }); } catch (e) { toast('Copy failed.', { type: 'err' }); } }
  function printText(title, text) {
    var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print, or use Copy.', { type: 'err' }); return; }
    w.document.write('<!DOCTYPE html><html><head><title>' + esc(title) + '</title><style>body{font:13px/1.45 "Courier New",monospace;padding:24px;white-space:pre-wrap}</style></head><body></body></html>');
    w.document.body.textContent = text; w.document.close(); setTimeout(function () { w.print(); }, 200);
  }
  var LABEL = { absenceLog: 'Absence log', placements: 'Board placements', dates: 'Board dates', certs: 'Certifications', coaching: 'Coaching', todoList: 'To-do list', staffIncidents: 'Staff incidents', phones: 'Phone numbers', emails: 'Emails', empShifts: 'Shift preferences', empFTE: 'FTE', empVacation: 'Vacation', chargeNurses: 'Charge nurses', staff3C: '3C staff', charge3C: '3C charge', trackingData: 'Tracking data', notes: 'Notes', empNotes: 'Employee notes', pendingEdu: 'Pending education', customStaff: 'Custom staff', removedStaff: 'Removed staff', vacancyBudgets: 'Vacancy budgets', scheduleOverrides: 'Schedule overrides', hireDates: 'Hire dates' };
  function lab(k) { return LABEL[k] || human(k); }

  /* ═════ shared data helpers ═════ */
  var placedCache = {};
  function placed(dk) {
    var key = dk + '|' + (window.__ccVer || 0);
    if (placedCache[key]) return placedCache[key];
    placedCache = {}; var s = {}; var pl = ((window.state || {}).placements || {})[dk] || {};
    Object.keys(pl).forEach(function (sh) { (pl[sh] || []).forEach(function (p) { if (p && p.name) s[p.name] = sh; }); });
    return (placedCache[key] = s);
  }
  function absent(name, dk) { return (((state.absenceLog || {})[name]) || []).some(function (e) { return e && e.date === dk && e.type !== 'tardy'; }); }
  function onVac(name, dk) { return (((state.empVacation || {})[name]) || []).some(function (e) { e = typeof e === 'string' ? { date: e } : e; return e && e.date === dk; }); }
  function workedDays(name, dk, span) { var c = 0; for (var i = 1; i <= span; i++) if (placed(addDays(dk, -i))[name]) c++; return c; }

  /* ═════ 1 + 2. COVER FINDER + TEXT OFFERS ═════ */
  function coverNeeds(dk) {
    var mins = typeof MGR_MIN !== 'undefined' ? MGR_MIN : { RN: 6, LPN: 1, CA: 4 };
    var out = [];
    mgrCoverage(dk).forEach(function (r) {
      ['RN', 'LPN', 'CA'].forEach(function (role) {
        var short = mins[role] - (r[role] || 0); if (short <= 0) return;
        var here = placed(dk);
        var cands = (MASTER_STAFF || []).filter(function (s) { return String(s.job || s.role || '').toUpperCase() === role && !here[s.name] && !absent(s.name, dk) && !onVac(s.name, dk); })
          .map(function (s) { return { name: s.name, worked: workedDays(s.name, dk, 6), phone: (state.phones || {})[s.name] || '' }; })
          .filter(function (c) { return c.worked < 5; })
          .sort(function (a, b) { return a.worked - b.worked || a.name.localeCompare(b.name); }).slice(0, 6);
        out.push({ label: r.label, time: r.time, role: role, short: short, cands: cands });
      });
    });
    return out;
  }
  function offerKey(dk, name, n) { return dk + '|' + n.label + '|' + n.role + '|' + name; }
  function coverFinder() {
    var dk; try { dk = mgrBoardDate(); } catch (e) { dk = todayKey(); }
    var needs; try { needs = coverNeeds(dk); } catch (e) { toast('Cover finder needs the board data loaded first.', { type: 'err' }); return; }
    var offers = LS.get('_ccOffers', {});
    var html = '<h3>Cover finder — ' + esc(nice(dk)) + '</h3><p>Staff not on the board that day, not absent or on vacation, and under 5 shifts in the last 6 days. Fewest recent shifts first.</p><div class="cc-cover">';
    if (!needs.length) html += '<div class="cc-pal-empty">Every window meets the minimum.</div>';
    needs.forEach(function (n, i) {
      html += '<div class="cc-cv-need"><b>' + esc(n.label) + ' ' + esc(n.time) + '</b> — ' + n.role + ' short ' + n.short + '</div>';
      if (!n.cands.length) html += '<div class="cc-cv-none">No eligible ' + n.role + ' found. Consider float pool, agency or OT.</div>';
      n.cands.forEach(function (c, j) {
        var st = offers[offerKey(dk, c.name, n)] || '';
        var digits = String(c.phone).replace(/[^\d+]/g, '');
        var first = c.name.split(/[ ,]+/).filter(Boolean)[0] || '';
        var body = 'Hi ' + first + ', 3B needs a ' + n.role + ' for ' + n.label + ' (' + n.time + ') on ' + nice(dk) + '. Can you cover? Please reply yes or no. Thank you.';
        html += '<div class="cc-cv-row"><div class="cc-cv-name"><b>' + esc(c.name) + '</b><small>worked ' + c.worked + ' of last 6 days' + (c.phone ? ' · ' + esc(c.phone) : ' · no phone on file') + '</small></div><div class="cc-cv-act">' +
          (digits ? '<a class="btn btn-ghost btn-sm" data-sms="' + i + '|' + j + '" href="sms:' + esc(digits) + '?&body=' + encodeURIComponent(body) + '">Text</a><a class="btn btn-ghost btn-sm" href="tel:' + esc(digits) + '">Call</a>' : '') +
          '<button type="button" class="btn btn-ghost btn-sm cc-cv-st" data-st="' + i + '|' + j + '">' + (st ? esc(st) : 'Mark offered') + '</button></div></div>';
      });
    });
    html += '</div><div class="cc-row"><button type="button" class="btn btn-primary cc-close">Close</button></div>';
    var m = modal(html);
    function setSt(i, j, v) { var n = needs[i], c = n.cands[j]; offers[offerKey(dk, c.name, n)] = v; var keys = Object.keys(offers); while (keys.length > 300) delete offers[keys.shift()]; LS.set('_ccOffers', offers); var b = $('[data-st="' + i + '|' + j + '"]', m.el); if (b) b.textContent = v || 'Mark offered'; }
    $$('[data-st]', m.el).forEach(function (b) { b.addEventListener('click', function () {
      var p = b.dataset.st.split('|'), cur = b.textContent;
      setSt(+p[0], +p[1], cur === 'Mark offered' ? 'Offered' : cur === 'Offered' ? 'Accepted' : cur === 'Accepted' ? 'Declined' : '');
    }); });
    $$('[data-sms]', m.el).forEach(function (a) { a.addEventListener('click', function () { var p = a.dataset.sms.split('|'); setSt(+p[0], +p[1], 'Offered'); }); });
  }

  /* ═════ 4. SCHEDULE RULE CHECK ═════ */
  function scheduleCheck() {
    var dates = (state.dates || []).slice().sort(); var issues = [];
    var by = {};
    dates.forEach(function (dk) {
      var pl = (state.placements || {})[dk] || {};
      Object.keys(pl).forEach(function (sh) { (pl[sh] || []).forEach(function (p) { if (!p || !p.name) return; ((by[p.name] = by[p.name] || {})[dk] = by[p.name][dk] || []).push(sh); }); });
    });
    Object.keys(by).forEach(function (name) {
      var ds = Object.keys(by[name]).sort();
      ds.forEach(function (dk) {
        if (by[name][dk].length > 1) issues.push({ sev: 'warn', name: name, dk: dk, msg: 'Placed in ' + by[name][dk].length + ' shifts the same day (' + by[name][dk].join(', ') + ')' });
        if (absent(name, dk)) issues.push({ sev: 'bad', name: name, dk: dk, msg: 'Placed on the board but has an absence logged' });
        if (onVac(name, dk)) issues.push({ sev: 'bad', name: name, dk: dk, msg: 'Placed on the board but is on vacation' });
      });
      var run = 1;
      for (var i = 1; i <= ds.length; i++) {
        if (i < ds.length && addDays(ds[i - 1], 1) === ds[i]) run++;
        else { if (run >= 6) issues.push({ sev: 'warn', name: name, dk: ds[i - 1], msg: run + ' days in a row ending ' + nice(ds[i - 1]) }); run = 1; }
      }
    });
    var order = { bad: 0, warn: 1 };
    issues.sort(function (a, b) { return order[a.sev] - order[b.sev] || a.name.localeCompare(b.name); });
    var html = '<h3>Schedule check</h3><p>' + dates.length + ' board date(s) checked: double shifts, 6+ days in a row, and people placed while absent or on vacation.</p><div class="cc-chk">';
    if (!issues.length) html += '<div class="cc-pal-empty">No problems found.</div>';
    issues.slice(0, 200).forEach(function (x) { html += '<div class="cc-chk-row ' + x.sev + '"><span class="cc-chk-tag">' + (x.sev === 'bad' ? 'FIX' : 'CHECK') + '</span><div><b>' + esc(x.name) + '</b> · ' + esc(nice(x.dk)) + '<small>' + esc(x.msg) + '</small></div></div>'; });
    html += '</div><div class="cc-row"><button type="button" class="btn btn-ghost cc-board">Open Board</button><button type="button" class="btn btn-primary cc-close">Close</button></div>';
    var m = modal(html); $('.cc-board', m.el).onclick = function () { m.close(); go('board'); };
  }

  /* ═════ 5. CENSUS TREND + WEEKDAY FORECAST ═════ */
  function renderTrend() {
    var card = $('#cc-trend'); if (!card) return;
    var all = LS.get('_ccCensus', {}); var keys = Object.keys(all).sort();
    var n = keys.length;
    var html = '<div class="card-title">Census trend</div>';
    if (n < 2) {
      html += '<div class="cc-cl-sub">Census history started today (' + n + ' day saved). Enter census each shift and a 14-day trend plus a weekday forecast appear after two weeks.</div>';
    } else {
      var last = keys.slice(-14), vals = last.map(function (k) { return all[k][0] || 0; }), max = Math.max.apply(null, vals.concat([1]));
      var bars = vals.map(function (v, i) { var h = Math.round(v / max * 44); return '<rect x="' + (i * 18) + '" y="' + (48 - h) + '" width="14" height="' + h + '" rx="2"><title>' + last[i] + ': ' + v + '</title></rect>'; }).join('');
      var wd = {}; keys.forEach(function (k) { var w = new Date(k + 'T12:00:00').getDay(); (wd[w] = wd[w] || []).push(all[k][0] || 0); });
      var tmr = new Date(); tmr.setDate(tmr.getDate() + 1); var tw = tmr.getDay(), arr = wd[tw] || [];
      var fc = arr.length >= 2 ? Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length) : null;
      var avg = Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
      html += '<div class="cc-trend-body"><svg class="cc-spark" width="' + (last.length * 18) + '" height="52" role="img" aria-label="Day census, last ' + last.length + ' days">' + bars + '</svg><div><div class="cc-trend-big">' + avg + '</div><div class="cc-cl-sub">avg day census, last ' + last.length + ' days</div></div><div><div class="cc-trend-big">' + (fc == null ? '—' : fc) + '</div><div class="cc-cl-sub">' + (fc == null ? 'forecast needs 2+ ' + tmr.toLocaleDateString('en-US', { weekday: 'long' }) + 's' : 'expected ' + tmr.toLocaleDateString('en-US', { weekday: 'long' }) + ' (' + arr.length + ' past)') + '</div></div></div>';
    }
    card.innerHTML = html;
  }

  /* ═════ 6. IMPORT SUMMARY + UNDO ═════ */
  function pmap() { var p = buildSavePayload(), m = {}; Object.keys(p).forEach(function (k) { try { m[k] = JSON.stringify(p[k]); } catch (e) {} }); return m; }
  function summ(a, b) {
    try {
      var x = a ? JSON.parse(a) : null, y = b ? JSON.parse(b) : null;
      if (Array.isArray(x) && Array.isArray(y)) return x.length === y.length ? 'edited' : (y.length > x.length ? '+' : '−') + Math.abs(y.length - x.length);
      if (x && y && typeof x === 'object' && typeof y === 'object') {
        var ka = Object.keys(x), kb = Object.keys(y);
        var add = kb.filter(function (k) { return !(k in x); }).length, rem = ka.filter(function (k) { return !(k in y); }).length;
        var chg = kb.filter(function (k) { return (k in x) && JSON.stringify(x[k]) !== JSON.stringify(y[k]); }).length;
        var p = []; if (add) p.push('+' + add); if (rem) p.push('−' + rem); if (chg) p.push(chg + ' changed'); return p.join(', ') || 'edited';
      }
    } catch (e) {}
    return 'changed';
  }
  function diffMaps(a, b) { var out = []; Object.keys(b).forEach(function (k) { if (a[k] !== b[k]) out.push(k); }); return out; }
  function localApply(obj) { window.__ccLocalApply = true; try { applyLoadedData(obj); } finally { window.__ccLocalApply = false; } try { lastMap = null; setTimeout(baseline, 800); } catch (e) {} }
  window.ccLocalApply = localApply;
  function wrapImports() {
    ['handleFileUpload', 'handleImpAbsFile', 'handleFloatImport', 'handleAbsenceImport', 'handleEduImport', 'hppd_handleFileInput', 'importBackup'].forEach(function (name) {
      var fn = window[name]; if (typeof fn !== 'function' || fn.__ccImp) return;
      var w = function () {
        var before = null; try { before = pmap(); } catch (e) {}
        var r = fn.apply(this, arguments);
        if (before) setTimeout(function () {
          try {
            var after = pmap(), ch = diffMaps(before, after);
            if (!ch.length) { toast('Import finished. No saved data changed (some imports need a confirm step first).'); return; }
            var rows = ch.map(function (k) { return '<div class="cc-chk-row"><span class="cc-chk-tag">' + esc(summ(before[k], after[k])) + '</span><div><b>' + esc(lab(k)) + '</b></div></div>'; }).join('');
            var m = modal('<h3>Import applied</h3><p>These sections changed. Keep them, or undo the whole import.</p><div class="cc-chk">' + rows + '</div><div class="cc-row"><button type="button" class="btn btn-ghost cc-undo">Undo import</button><button type="button" class="btn btn-primary cc-close">Keep</button></div>');
            $('.cc-undo', m.el).onclick = function () {
              var part = {}; ch.forEach(function (k) { part[k] = before[k] === undefined ? null : JSON.parse(before[k]); });
              try { localApply(part); persistSave(); rerender(); toast('Import undone.', { type: 'ok' }); } catch (e) { toast('Undo failed.', { type: 'err' }); }
              m.close();
            };
          } catch (e) {}
        }, 2800);
        return r;
      };
      w.__ccImp = true; window[name] = w;
    });
  }

  /* ═════ 7. "UPDATED FROM ANOTHER DEVICE" ═════ */
  window.ccRemoteApplied = function (remote, by) {
    try {
      if (!lastMap) return;
      var keys = Object.keys(lastMap).filter(function (k) { return remote && (k in remote) && JSON.stringify(remote[k]) !== lastMap[k]; });
      if (keys.length) toast('Updated from another device' + (by ? ' (' + by + ')' : '') + ': ' + keys.slice(0, 5).map(lab).join(', ') + (keys.length > 5 ? ' +' + (keys.length - 5) + ' more' : '') + '.', { ms: 9000 });
      setTimeout(function () { lastMap = null; baseline(); }, 500);
    } catch (e) {}
  };

  /* ═════ 8. CHANGE LOG (IndexedDB) ═════ */
  var lastMap = null, logTimer;
  function baseline() { try { lastMap = pmap(); } catch (e) {} }
  function ldb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var r = indexedDB.open('cc-log', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('log', { keyPath: 'id', autoIncrement: true }); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function logAll() { return ldb().then(function (db) { return new Promise(function (res) { var q = db.transaction('log').objectStore('log').getAll(); q.onsuccess = function () { res(q.result || []); }; }); }); }
  function logAdd(entry) {
    return ldb().then(function (db) { return new Promise(function (res) {
      var tx = db.transaction('log', 'readwrite'), st = tx.objectStore('log'); st.add(entry);
      var q = st.getAllKeys(); q.onsuccess = function () { var ks = q.result || []; while (ks.length > 100) st.delete(ks.shift()); };
      tx.oncomplete = res;
    }); });
  }
  function logChange() {
    try {
      if (!lastMap) { baseline(); return; }
      var cur = pmap(), ch = diffMaps(lastMap, cur); if (!ch.length) return;
      var budget = 600000;
      var keys = ch.map(function (k) { var b = lastMap[k] == null ? null : lastMap[k]; if (b && b.length <= budget) budget -= b.length; else if (b) b = null; return { k: k, s: summ(lastMap[k], cur[k]), b: b }; });
      lastMap = cur; logAdd({ ts: Date.now(), keys: keys }).catch(function () {});
    } catch (e) {}
  }
  function openLog() {
    logAll().then(function (all) {
      all.sort(function (a, b) { return b.ts - a.ts; }); all = all.slice(0, 60);
      var html = '<h3>Change log</h3><p>Recent saves on this device, newest first. Revert puts those sections back to how they were before that save (including any later edits to the same sections).</p><div class="cc-chk">';
      if (!all.length) html += '<div class="cc-pal-empty">Nothing logged yet. Changes appear here after your next edit.</div>';
      all.forEach(function (e) {
        var can = e.keys.every(function (x) { return x.b != null || x.s === '' ; }) && e.keys.some(function (x) { return x.b != null; });
        html += '<div class="cc-chk-row"><span class="cc-chk-tag">' + esc(new Date(e.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })) + '</span><div><b>' + e.keys.map(function (x) { return esc(lab(x.k)) + ' <small style="display:inline">(' + esc(x.s) + ')</small>'; }).join(' · ') + '</b><small>' + esc(new Date(e.ts).toLocaleDateString()) + '</small></div>' +
          (can ? '<button type="button" class="btn btn-ghost btn-sm" data-rv="' + e.id + '">Revert</button>' : '') + '</div>';
      });
      html += '</div><div class="cc-row"><button type="button" class="btn btn-primary cc-close">Close</button></div>';
      var m = modal(html);
      $$('[data-rv]', m.el).forEach(function (b) { b.onclick = function () {
        var e = all.filter(function (x) { return String(x.id) === b.dataset.rv; })[0]; if (!e) return;
        if (!window.confirm('Revert ' + e.keys.map(function (x) { return lab(x.k); }).join(', ') + ' to before this change?')) return;
        var part = {}; e.keys.forEach(function (x) { if (x.b != null) part[x.k] = JSON.parse(x.b); });
        try { localApply(part); persistSave(); rerender(); m.close(); toast('Reverted.', { type: 'ok' }); } catch (err) { toast('Revert failed.', { type: 'err' }); }
      }; });
    }).catch(function () { toast('Change log is not available in this browser.', { type: 'err' }); });
  }
  function hookSave() {
    var orig = window.persistSave; if (typeof orig !== 'function' || orig.__ccLog) return;
    window.persistSave = async function () { var r = await orig.apply(this, arguments); clearTimeout(logTimer); logTimer = setTimeout(logChange, 1800); return r; };
    window.persistSave.__ccLog = true;
  }

  /* ═════ 10. VERIFY A BACKUP ═════ */
  window.ccVerify = function (json) {
    try {
      var snap = JSON.parse(json), live = JSON.parse(JSON.stringify(buildSavePayload()));
      var sk = Object.keys(snap), lk = Object.keys(live), missing = lk.filter(function (k) { return !(k in snap); });
      var sz = Math.round(json.length / 1024), lz = Math.round(JSON.stringify(live).length / 1024);
      var ratio = lz ? sz / lz : 1;
      var msg = (missing.length || ratio < 0.5 ? 'CHECK' : 'OK') + ': ' + sk.length + ' sections, ' + sz + ' KB (live ' + lz + ' KB)' + (missing.length ? '. Missing: ' + missing.slice(0, 6).join(', ') : '') + (ratio < 0.5 ? '. Much smaller than live data.' : '');
      toast(msg, { type: missing.length || ratio < 0.5 ? 'err' : 'ok', ms: 9000 });
    } catch (e) { toast('Backup could not be read: ' + e.message, { type: 'err' }); }
  };

  /* ═════ 11. DAILY OVERDUE DIGEST ═════ */
  function certItems() {
    var out = [], now = new Date(); now.setHours(0, 0, 0, 0);
    var names = {}; (MASTER_STAFF || []).forEach(function (s) { names[s.name] = s.job || ''; });
    Object.keys(state.certs || {}).forEach(function (name) {
      if (!(name in names)) return;
      var row = state.certs[name] || {};
      Object.keys(row).forEach(function (f) {
        var v = row[f]; if (!v || typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return;
        var d = new Date(v.slice(0, 10) + 'T12:00:00'); if (isNaN(d)) return;
        out.push({ name: name, job: names[name], field: f, date: v.slice(0, 10), diff: Math.ceil((d - now) / 86400000) });
      });
    });
    return out.sort(function (a, b) { return a.diff - b.diff; });
  }
  function digest(force) {
    var today = todayKey();
    if (!force && LS.get('_ccDigestDay', '') === today) return;
    var key = typeof todoDateKey === 'function' ? todoDateKey() : today;
    var od = (state.todoList || []).filter(function (x) { return !(x.archived || x.status === 'Complete' || x.done === true || x.complete === true || x.completed === true) && x.dueDate && x.dueDate < key; });
    var certs = certItems().filter(function (c) { return c.diff <= 14 && c.diff >= -30; });
    var coach = []; Object.keys(state.coaching || {}).forEach(function (n) { (state.coaching[n] || []).forEach(function (s) { if (s && s.followUp && s.followUp <= today && !['complete', 'closed'].includes(String(s.status || '').toLowerCase())) coach.push({ n: n, s: s }); }); });
    var comps = 0; try { comps = mgrPendingCompetencyCount(); } catch (e) {}
    if (!force && !od.length && !certs.length && !coach.length && !comps) return;
    LS.set('_ccDigestDay', today);
    var html = '<h3>Needs attention today</h3><div class="cc-chk">';
    od.slice(0, 8).forEach(function (x) { html += '<div class="cc-chk-row bad"><span class="cc-chk-tag">TASK</span><div><b>' + esc(x.text) + '</b><small>due ' + esc(x.dueDate) + '</small></div></div>'; });
    certs.slice(0, 10).forEach(function (c) { html += '<div class="cc-chk-row ' + (c.diff < 0 ? 'bad' : 'warn') + '"><span class="cc-chk-tag">CERT</span><div><b>' + esc(c.name) + '</b> · ' + esc(human(c.field)) + '<small>' + (c.diff < 0 ? 'expired ' + (-c.diff) + ' days ago' : c.diff === 0 ? 'expires today' : 'expires in ' + c.diff + ' days') + ' (' + esc(c.date) + ')</small></div></div>'; });
    coach.slice(0, 6).forEach(function (c) { html += '<div class="cc-chk-row warn"><span class="cc-chk-tag">COACH</span><div><b>' + esc(c.n) + '</b><small>follow-up due ' + esc(c.s.followUp) + '</small></div></div>'; });
    if (comps) html += '<div class="cc-chk-row warn"><span class="cc-chk-tag">COMP</span><div><b>' + comps + ' competencies pending</b></div></div>';
    if (!html.match(/cc-chk-row/)) html += '<div class="cc-pal-empty">Nothing overdue.</div>';
    html += '</div><div class="cc-row"><button type="button" class="btn btn-ghost cc-todo">Open To-Do</button><button type="button" class="btn btn-ghost cc-cal">Expirations calendar</button><button type="button" class="btn btn-primary cc-close">Dismiss</button></div>';
    var m = modal(html);
    $('.cc-todo', m.el).onclick = function () { m.close(); go('todo'); };
    $('.cc-cal', m.el).onclick = function () { m.close(); certCalendar(); };
  }

  /* ═════ 12. EXPIRATIONS CALENDAR + ICS ═════ */
  function certCalendar() {
    var items = certItems().filter(function (c) { return c.diff >= -90 && c.diff <= 180; });
    var m = modal('<h3>Expirations calendar</h3><div class="cc-cal-bar"><label>Role <select class="cc-role"><option value="">All</option><option>RN</option><option>LPN</option><option>CA</option></select></label><span class="cc-cl-sub cc-cal-n"></span></div><div class="cc-chk cc-cal-list"></div><div class="cc-row"><button type="button" class="btn btn-ghost cc-ics">Export .ics</button><button type="button" class="btn btn-primary cc-close">Close</button></div>');
    var list = $('.cc-cal-list', m.el), sel = $('.cc-role', m.el);
    function draw() {
      var role = sel.value, rows = items.filter(function (c) { return !role || String(c.job).toUpperCase() === role; }), html = '', last = '';
      rows.forEach(function (c) {
        var g = c.diff < 0 ? 'Already expired (last 90 days)' : new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (g !== last) { html += '<div class="cc-pal-group">' + esc(g) + '</div>'; last = g; }
        html += '<div class="cc-chk-row ' + (c.diff < 0 ? 'bad' : c.diff <= 30 ? 'warn' : '') + '"><span class="cc-chk-tag">' + esc(c.date.slice(5)) + '</span><div><b>' + esc(c.name) + '</b> · ' + esc(human(c.field)) + '<small>' + esc(c.job) + ' · ' + (c.diff < 0 ? (-c.diff) + ' days ago' : 'in ' + c.diff + ' days') + '</small></div></div>';
      });
      list.innerHTML = html || '<div class="cc-pal-empty">Nothing in this window.</div>'; $('.cc-cal-n', m.el).textContent = rows.length + ' items';
      m.rows = rows;
    }
    sel.onchange = draw; draw();
    $('.cc-ics', m.el).onclick = function () {
      var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//3B Command Center//EN'], stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      (m.rows || []).forEach(function (c, i) {
        var d = c.date.replace(/-/g, '');
        L.push('BEGIN:VEVENT', 'UID:cc-' + i + '-' + d + '-' + c.name.replace(/\W/g, '') + '@3b', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'SUMMARY:' + ('Cert expires: ' + c.name + ' — ' + human(c.field)).replace(/[,;]/g, ' '), 'END:VEVENT');
      });
      L.push('END:VCALENDAR'); dl('cert-expirations.ics', L.join('\r\n'), 'text/calendar');
    };
  }

  /* ═════ 14. INCIDENT → FOLLOW-UP TASK ═════ */
  function wrapIncidents() {
    [['logIncident', 'Incident', 7], ['saveFall', 'Fall', 3], ['saveRrtEvent', 'RRT / Code', 3]].forEach(function (d) {
      var fn = window[d[0]]; if (typeof fn !== 'function' || fn.__ccInc) return;
      var w = function () {
        var before = null, who = '', what = d[1];
        try { before = pmap(); who = (document.getElementById('inc-name') || {}).value || ''; var t = document.getElementById('inc-type'); if (d[0] === 'logIncident' && t) what = t.value || what; } catch (e) {}
        var r = fn.apply(this, arguments);
        if (before) setTimeout(function () {
          try {
            if (!diffMaps(before, pmap()).length) return;
            toast(d[1] + ' logged.', { ms: 11000, action: { label: 'Add follow-up task', fn: function () {
              var text = 'Follow up: ' + what + (who ? ' — ' + who : '') + ' (' + nice(todayKey()) + ')';
              state.todoList = state.todoList || [];
              state.todoList.push({ id: 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), text: text, freq: 'weekly', weight: 4, category: 'Quality / Safety', dueDate: addDays(todayKey(), d[2]), done: {}, created: Date.now() });
              persistSave(); try { renderTodo(); } catch (e) {} toast('Task added, due ' + addDays(todayKey(), d[2]) + '.', { type: 'ok' });
            } } });
          } catch (e) {}
        }, 700);
        return r;
      };
      w.__ccInc = true; window[d[0]] = w;
    });
  }

  /* ═════ 15 + 16. 1:1 PREP + YEAR SUMMARY ═════ */
  function prepText(name) {
    var L = [], now = new Date(), yr = new Date(now.getTime() - 365 * 86400000), yk = fmt(yr), tk = todayKey();
    var s = (MASTER_STAFF || []).filter(function (x) { return x.name === name; })[0] || {};
    L.push('1:1 PREP — ' + name + '   (' + nice(tk) + ')'); L.push('Role: ' + (s.job || s.role || '—') + '   FTE: ' + ((state.empFTE || {})[name] || '—') + '   Hired: ' + ((state.hireDates || {})[name] || '—')); L.push('');
    var ab = (((state.absenceLog || {})[name]) || []).filter(function (e) { return e && e.date >= yk; }), cnt = {};
    ab.forEach(function (e) { cnt[e.type || 'other'] = (cnt[e.type || 'other'] || 0) + 1; });
    L.push('ATTENDANCE (last 12 months): ' + (ab.length ? ab.length + ' events — ' + Object.keys(cnt).map(function (k) { return cnt[k] + ' ' + k; }).join(', ') : 'none'));
    ab.sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5).forEach(function (e) { L.push('  ' + e.date + '  ' + (e.type || '') + (e.note ? ' — ' + e.note : '')); });
    var inc = (state.staffIncidents || {})[name] || {}, ik = Object.keys(inc).filter(function (k) { return Array.isArray(inc[k]) && inc[k].length; });
    L.push(''); L.push('INCIDENTS: ' + (ik.length ? ik.map(function (k) { return inc[k].length + ' ' + k; }).join(', ') : 'none'));
    ik.forEach(function (k) { inc[k].slice(0, 3).forEach(function (e) { L.push('  ' + e.date + '  ' + k + (e.note ? ' — ' + e.note : '')); }); });
    var cr = (state.certs || {})[name] || {}, ck = Object.keys(cr).filter(function (k) { return typeof cr[k] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cr[k]); });
    L.push(''); L.push('CERTIFICATIONS:'); if (!ck.length) L.push('  none on file');
    ck.forEach(function (k) { var d = Math.ceil((new Date(cr[k].slice(0, 10) + 'T12:00:00') - now) / 86400000); L.push('  ' + human(k) + ': ' + cr[k].slice(0, 10) + (d < 0 ? '  EXPIRED' : d <= 60 ? '  due in ' + d + ' days' : '')); });
    var co = ((state.coaching || {})[name]) || [];
    L.push(''); L.push('COACHING: ' + (co.length ? co.length + ' session(s)' : 'none'));
    co.slice(0, 5).forEach(function (c) { L.push('  ' + (c.date || '') + '  ' + ((c.areas || [c.area]).filter(Boolean).join(', ')) + (c.status ? ' [' + c.status + ']' : '') + (c.followUp ? ' follow-up ' + c.followUp : '')); });
    var en = (state.empNotes || {})[name], notes = Array.isArray(en) ? en : (en ? [en] : []);
    if (notes.length) { L.push(''); L.push('NOTES (latest):'); notes.slice(0, 3).forEach(function (n) { L.push('  ' + (typeof n === 'string' ? n : (n.date ? n.date + ' — ' : '') + (n.text || n.note || '')).replace(/\s+/g, ' ').slice(0, 220)); }); }
    L.push(''); L.push('DISCUSS:'); L.push('  '); L.push(''); L.push('GOALS / ACTIONS:'); L.push('  ');
    return L.join('\n');
  }
  function prepSheet() {
    var names = (MASTER_STAFF || []).map(function (s) { return s.name; }).sort();
    var m = modal('<h3>1:1 prep sheet</h3><label class="cc-cal-bar">Employee <select class="cc-who"><option value="">Choose…</option>' + names.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></label><textarea class="cc-report" aria-label="1:1 prep" spellcheck="false" placeholder="Pick an employee to build the sheet"></textarea><div class="cc-row"><button type="button" class="btn btn-ghost cc-copy">Copy</button><button type="button" class="btn btn-ghost cc-print">Print</button><button type="button" class="btn btn-primary cc-close">Close</button></div>');
    var sel = $('.cc-who', m.el), ta = $('.cc-report', m.el);
    sel.onchange = function () { ta.value = sel.value ? prepText(sel.value) : ''; };
    $('.cc-copy', m.el).onclick = function () { copy(ta.value); }; $('.cc-print', m.el).onclick = function () { printText('1:1 prep', ta.value); };
    sel.focus();
  }

  /* ═════ 18. CHARGE VIEW + CUSTOMISE HOME ═════ */
  function applyView() { document.body.classList.toggle('cc-charge', !!LS.get('_ccChargeView', false)); }
  function toggleCharge() { LS.set('_ccChargeView', !LS.get('_ccChargeView', false)); applyView(); toast(LS.get('_ccChargeView', false) ? 'Charge nurse view on: simplified menu and Home.' : 'Manager view on.', { type: 'ok' }); }
  function homeItems() { return $$('#panel-home > *').filter(function (el) { return el.id || el.classList.contains('mgr-hero') || el.classList.contains('mgr-kpi-grid'); }); }
  function homeId(el) { return el.id || (el.classList.contains('mgr-hero') ? 'mgr-hero' : 'mgr-kpi-grid'); }
  function homeLabel(el) { var t = $('.card-title', el); var id = homeId(el); return id === 'mgr-hero' ? 'Page title and minimums' : id === 'mgr-kpi-grid' ? 'Coverage tiles' : id === 'cc-home-row' ? 'Priority brief + action plan' : t ? t.textContent.trim() : human(id.replace(/^mgr-|-card$/g, '')); }
  function applyHome() {
    var cfg = LS.get('_ccHome', { order: [], hidden: [] });
    homeItems().forEach(function (el) {
      var id = homeId(el), i = cfg.order.indexOf(id);
      el.style.order = i >= 0 ? String(i) : '999'; el.classList.toggle('cc-home-hidden', cfg.hidden.indexOf(id) >= 0);
    });
  }
  function customiseHome() {
    var items = homeItems(), cfg = LS.get('_ccHome', { order: [], hidden: [] });
    var ids = items.map(homeId).sort(function (a, b) { var ia = cfg.order.indexOf(a), ib = cfg.order.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || items.map(homeId).indexOf(a) - items.map(homeId).indexOf(b); });
    var labels = {}; items.forEach(function (el) { labels[homeId(el)] = homeLabel(el); });
    var hidden = cfg.hidden.slice();
    var m = modal('<h3>Customize Home</h3><p>Show or hide cards and move them up or down. Saved on this device.</p><div class="cc-home-list"></div><div class="cc-row"><button type="button" class="btn btn-ghost cc-reset">Reset</button><button type="button" class="btn btn-primary cc-save">Save</button></div>');
    var box = $('.cc-home-list', m.el);
    function draw() {
      box.innerHTML = ids.map(function (id, i) { return '<div class="cc-hl-row"><label><input type="checkbox" data-id="' + esc(id) + '"' + (hidden.indexOf(id) < 0 ? ' checked' : '') + '> ' + esc(labels[id]) + '</label><span><button type="button" class="btn btn-ghost btn-sm" data-up="' + i + '" aria-label="Move up">▲</button><button type="button" class="btn btn-ghost btn-sm" data-dn="' + i + '" aria-label="Move down">▼</button></span></div>'; }).join('');
      $$('[data-id]', box).forEach(function (cb) { cb.onchange = function () { var id = cb.dataset.id, k = hidden.indexOf(id); if (cb.checked && k >= 0) hidden.splice(k, 1); if (!cb.checked && k < 0) hidden.push(id); }; });
      $$('[data-up]', box).forEach(function (b) { b.onclick = function () { var i = +b.dataset.up; if (i > 0) { var t = ids[i]; ids[i] = ids[i - 1]; ids[i - 1] = t; draw(); } }; });
      $$('[data-dn]', box).forEach(function (b) { b.onclick = function () { var i = +b.dataset.dn; if (i < ids.length - 1) { var t = ids[i]; ids[i] = ids[i + 1]; ids[i + 1] = t; draw(); } }; });
    }
    draw();
    $('.cc-save', m.el).onclick = function () { LS.set('_ccHome', { order: ids, hidden: hidden }); applyHome(); m.close(); toast('Home layout saved.', { type: 'ok' }); };
    $('.cc-reset', m.el).onclick = function () { LS.set('_ccHome', { order: [], hidden: [] }); applyHome(); m.close(); toast('Home layout reset.', { type: 'ok' }); };
  }

  /* ═════ 19. OFFLINE / INSTALL ═════ */
  var deferredInstall = null;
  function initPwa() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js').catch(function () {});
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; var b = $('[data-a="install"]'); if (b) b.hidden = false; });
  }

  /* ── Actions menu ── */
  function extendMenu() {
    var menu = $('#print-menu'); if (!menu || $('#cc-menu-ops')) return;
    var box = document.createElement('div'); box.id = 'cc-menu-ops';
    box.innerHTML = '<div class="cc-menu-sep"></div><div class="cc-menu-label">Staffing</div>' +
      '<button class="cc-menu-item" role="menuitem" data-o="cover"><b>Cover finder</b><small>Who can fill a short shift · F</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-o="check"><b>Schedule check</b><small>Double shifts, long runs, absent but placed</small></button>' +
      '<div class="cc-menu-label">People and compliance</div>' +
      '<button class="cc-menu-item" role="menuitem" data-o="prep"><b>1:1 prep sheet</b><small>Attendance, incidents, certs, coaching</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-o="cal"><b>Expirations calendar</b><small>Certs coming due, export to Outlook</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-o="digest"><b>Needs attention</b><small>Overdue tasks, certs, coaching</small></button>' +
      '<div class="cc-menu-label">Data and view</div>' +
      '<button class="cc-menu-item" role="menuitem" data-o="log"><b>Change log</b><small>See and revert recent saves</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-o="home"><b>Customize Home</b><small>Show, hide and reorder cards</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-o="charge"><b>Charge nurse view</b><small>Simplified menu and Home (toggle)</small></button>' +
      '<button class="cc-menu-item" role="menuitem" data-a="install" hidden><b>Install as app</b><small>Add to your device</small></button>';
    menu.appendChild(box);
    var map = { cover: coverFinder, check: scheduleCheck, prep: prepSheet, cal: certCalendar, digest: function () { digest(true); }, log: openLog, home: customiseHome, charge: toggleCharge };
    $$('[data-o]', box).forEach(function (b) { b.addEventListener('click', function () { if (window.hidePrintMenu) window.hidePrintMenu(); map[b.dataset.o](); }); });
    var ins = $('[data-a="install"]', box); if (ins) ins.addEventListener('click', function () { if (window.hidePrintMenu) window.hidePrintMenu(); if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } });
    if (deferredInstall && ins) ins.hidden = false;
  }
  window.ccCoverFinder = coverFinder; window.ccScheduleCheck = scheduleCheck; window.ccCertCalendar = certCalendar; window.ccChangeLog = openLog; window.ccPrepSheet = prepSheet; window.ccDigest = digest;

  /* ── key: F for cover finder ── */
  document.addEventListener('keydown', function (e) {
    var t = e.target; if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (document.querySelector('.cc-modal-bg,#cc-palette.open')) return;
    if (e.key === 'f') { e.preventDefault(); coverFinder(); }
  });

  /* ── init ── */
  /* Home tidy: keep KPI row, priorities, exceptions, vacancy trends; collapse the rest under "More" */
  var HOME_MORE = ['cc-checklist', 'cc-trend', 'mgr-daily-action-card', 'mgr-task-pulse-card', 'mgr-data-health-card', 'mgr-people-pulse-card', 'mgr-exec-snapshot-card', 'mgr-quality-pulse-card'];
  function tidyHome() {
    var hp = $('#panel-home'); if (!hp) return;
    var det = $('#cc-home-more');
    if (!det) {
      det = document.createElement('details'); det.id = 'cc-home-more'; det.className = 'card cc-home-more';
      det.innerHTML = '<summary><span class="card-title">More</span><small>Coverage grid, checklist, task pulse, people pulse, snapshots, quality</small></summary><div class="cc-more-body"></div>';
      try { det.open = localStorage.getItem('_ccHomeMoreOpen') === '1'; } catch (e) {}
      det.addEventListener('toggle', function () { try { localStorage.setItem('_ccHomeMoreOpen', det.open ? '1' : '0'); } catch (e) {} });
      hp.appendChild(det);
    }
    var body = det.querySelector('.cc-more-body');
    var list = HOME_MORE.map(function (id) { return document.getElementById(id); }).concat(Array.prototype.slice.call(hp.children).filter(function (c) { return c.classList.contains('mgr-layout'); }));
    list.forEach(function (el) { if (el && el.parentNode !== body) body.appendChild(el); });
    if (hp.lastElementChild !== det) hp.appendChild(det);
  }
  function init() {
    extendMenu(); initPwa(); applyView();
    var row = $('#panel-home .cc-home-row');
    if (row && !$('#cc-trend')) { var c = document.createElement('div'); c.id = 'cc-trend'; c.className = 'card cc-trend'; var cl = $('#cc-checklist'); row.parentNode.insertBefore(c, cl ? cl.nextSibling : row); renderTrend(); }
    applyHome(); wrapImports(); wrapIncidents(); hookSave();
    var brief = $('#mgr-priority-brief-card button'); if (brief && !$('#cc-cover-btn')) { var b = document.createElement('button'); b.id = 'cc-cover-btn'; b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Find cover'; b.onclick = coverFinder; brief.parentNode.insertBefore(b, brief); brief.parentNode.style.gap = '6px'; }
    ['census-day', 'census-eve', 'census-night'].forEach(function (id) { var el = $('#' + id); if (el) el.addEventListener('input', function () { setTimeout(renderTrend, 50); }); });
    setTimeout(baseline, 12000);
    setTimeout(function () { try { digest(false); } catch (e) {} }, 7000);
    setTimeout(function () { wrapImports(); wrapIncidents(); hookSave(); applyHome(); tidyHome(); }, 3500);
    setTimeout(tidyHome, 6000);
    try { var hp = $('#panel-home'); if (hp && window.MutationObserver) { var tt; new MutationObserver(function () { clearTimeout(tt); tt = setTimeout(tidyHome, 300); }).observe(hp, { childList: true }); } } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 400); }); else setTimeout(init, 400);
})();

