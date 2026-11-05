/* ═══ Daily Staffing Sheet (3B / 3C) — fill-in form, handwriting style ═══
 * Blank-form layout (Unit Clerk / RNs / LPNs / CAs / Sitters) pre-filled from the board for the active date.
 * Print menu → "Nursing Services". */
(function () {
  'use strict';
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function ensureFont() {
    if (document.getElementById('ds-font')) return Promise.resolve();
    var l = document.createElement('link'); l.id = 'ds-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap';
    document.head.appendChild(l);
    return (document.fonts && document.fonts.load) ? document.fonts.load('16pt "Caveat"').catch(function () {}) : Promise.resolve();
  }
  function uniq(list) { var seen = {}; return list.filter(function (p) { if (seen[p.name]) return false; seen[p.name] = 1; return true; }); }

  window.printDailyStaffingSheet = async function () {
    var dateKey = state.activeBoardDate;
    if (!dateKey) { alert('No staffing date loaded.'); return; }
    var shifts = state.placements[dateKey] || {};
    function get(role, keys) {
      var out = [];
      keys.forEach(function (k) { (shifts[k] || []).forEach(function (p) { if (p.role === role) out.push(p); }); });
      return uniq(out).map(function (p) { return p.name; });
    }
    function cell(label, name) {
      return '<span class="ds-n">' + esc(label) + '</span>' + (name ? '<span class="ds-w">' + esc(name) + '</span>' : '');
    }
    // cols: array of name arrays; numbered = how many numbered rows; orient = label for the extra orient row
    function table(headers, cols, minRows, numbered, orient) {
      var max = Math.max(minRows, numbered + (orient ? 1 : 0));
      cols.forEach(function (c) { if (c.length > max - (orient ? 1 : 0)) max = c.length + (orient ? 1 : 0); });
      var h = '<table class="ds-t" style="--cols:' + cols.length + '">';
      if (headers) h += '<thead><tr>' + headers.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead>';
      h += '<tbody>';
      for (var i = 0; i < max; i++) {
        var isOrient = orient && i === max - 1;
        h += '<tr>';
        cols.forEach(function (c) {
          var label = isOrient ? orient : (i < numbered ? String(i + 1) : '');
          h += '<td>' + cell(label, isOrient ? '' : (c[i] || '')) + '</td>';
        });
        h += '</tr>';
      }
      return h + '</tbody></table>';
    }
    var d = new Date(dateKey + 'T12:00:00');
    var dateTxt = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();

    var uc = [get('UC', ['0700-1500']), get('UC', ['1500-2300']), get('UC', ['2300-0700'])];
    var rn = [get('RN', ['0700-1500', '0700-1900', '1500-1900']), get('RN', ['1900-0700'])];
    var lpn = [get('LPN', ['0700-1500', '0700-1900', '1500-1900']), get('LPN', ['1900-0700'])];
    var ca = [get('CA', ['0630-1430']), get('CA', ['1430-1830']), get('CA', ['1830-2230']), get('CA', ['2230-0630'])];

    var css = '<style>' +
      '.ds-page{font-family:Arial,Helvetica,sans-serif;color:#111;padding:6px 8px;}' +
      '.ds-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;}' +
      '.ds-top .ds-title{font-size:20pt;font-weight:700;}' +
      '.ds-top .ds-unit{font-size:18pt;font-weight:700;}' +
      '.ds-top .ds-date{font-size:18pt;font-weight:700;}' +
      '.ds-hand{font-family:"Caveat","Segoe Script","Bradley Hand",cursive;font-weight:700;font-size:22pt;border-bottom:1.5px solid #111;padding:0 8px;}' +
      '.ds-sec{font-size:10.5pt;font-weight:700;margin:12px 0 3px;}' +
      '.ds-t{width:100%;border-collapse:collapse;table-layout:fixed;}' +
      '.ds-t th{font-size:9.5pt;font-weight:700;text-align:left;border:1px solid #111;padding:2px 5px;}' +
      '.ds-t td{border:1px solid #111;height:21px;padding:0 5px;vertical-align:middle;font-size:9pt;overflow:hidden;white-space:nowrap;}' +
      '.ds-n{font-size:8.5pt;color:#111;display:inline-block;min-width:34px;}' +
      '.ds-w{font-family:"Caveat","Segoe Script","Bradley Hand",cursive;font-weight:700;font-size:15pt;line-height:1;}' +
      '</style>';

    var html = css + '<div class="ds-page">' +
      '<div class="ds-top"><span class="ds-title">Daily Staffing Sheet</span>' +
      '<span class="ds-unit">Unit <span class="ds-hand" style="font-size:20pt;">3B / 3C</span></span>' +
      '<span class="ds-date">Date <span class="ds-hand">' + esc(dateTxt) + '</span></span></div>' +
      '<div class="ds-sec">Unit Clerk</div>' + table(['Day', 'Evening', 'Night'], uc, 2, 0, null) +
      '<div class="ds-sec">RNs</div>' + table(['Days 0700-1900', 'Nights 1900-0700'], rn, 9, 8, 'orient') +
      '<div class="ds-sec">LPNs</div>' + table(['Days', 'Nights'], lpn, 3, 0, null) +
      '<div class="ds-sec">Clinical Assistants</div>' + table(['0630-1430', '1430-1830', '1830-2230', '2230-0630'], ca, 7, 4, 'orient') +
      '<div class="ds-sec">Sitters</div>' + table(['Days', 'Nights'], [[], []], 4, 3, null) +
      '</div>';

    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups for this site to print the Daily Staffing Sheet.'); return; }
    w.document.open();
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Daily Staffing Sheet ' + esc(dateTxt) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap">' +
      '<style>@page{size:letter portrait;margin:0.4in;}body{margin:0;background:#fff;}</style></head><body>' + html +
      '<script>(function(){function go(){setTimeout(function(){window.print();},250);}' +
      'if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load("700 16pt Caveat"),document.fonts.ready]).then(go,go);}else{go();}})();<\/script>' +
      '</body></html>');
    w.document.close();
  };

  // Nursing Services print now uses this form; the previous layout stays available as "old layout".
  if (typeof window.printNursingServices === 'function' && !window.printNursingServicesOld) {
    window.printNursingServicesOld = window.printNursingServices;
  }
  window.printNursingServices = window.printDailyStaffingSheet;

  function addMenuItem() {
    var menu = document.getElementById('print-menu');
    if (!menu || document.getElementById('cc-ns-old')) return;
    var anchor = menu.querySelector('button[onclick*="printNursingServices"]');
    if (anchor) anchor.innerHTML = '<b>Nursing Services</b><small>Daily Staffing Sheet · 3B / 3C fill-in form</small>';
    if (!window.printNursingServicesOld) return;
    var b = document.createElement('button');
    b.id = 'cc-ns-old'; b.className = 'cc-menu-item'; b.setAttribute('role', 'menuitem');
    b.setAttribute('onclick', 'hidePrintMenu();printNursingServicesOld()');
    b.innerHTML = '<b>Nursing Services (old layout)</b><small>Previous full-screen staff assignments print</small>';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor.nextSibling); else menu.appendChild(b);
  }
  if (document.readyState === 'complete') setTimeout(addMenuItem, 500); else window.addEventListener('load', function () { setTimeout(addMenuItem, 500); });
})();
