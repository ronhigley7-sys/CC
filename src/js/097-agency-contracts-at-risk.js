/* ─────────────────────────────────────────────────────────────────────────
   Agency contracts at risk (top of the Directory tab)
   Live list built from the Directory's agency dates (state.agencyDates):
   active contracts with no extension entered, soonest end date first.
   Also flags contracts already past their end with nothing recorded, and bad extension dates.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pd(raw) {
    if (!raw) return null;
    var t = String(raw).trim(), m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; var d = new Date(y, +m[1] - 1, +m[2]); return isNaN(d) ? null : d; }
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }
  function fmt(d) { return (d.getMonth() + 1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2); }
  function disp(n) { var p = String(n).split(','); return p.length > 1 ? p[0].trim() + ', ' + p[1].trim() : n; }
  var TD = 'padding:5px 8px;font-size:12px;border-bottom:1px solid var(--border);';
  var TH = 'text-align:left;padding:5px 8px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);';

  function render() {
    var host = document.getElementById('agency-risk-card');
    if (!host || typeof state === 'undefined') return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var active = [], ended = [], bad = [];
    Object.keys(state.agencyDates || {}).forEach(function (name) {
      var v = state.agencyDates[name];
      if (!v || !v.isAgency) return;
      var end = pd(v.contractEnd), start = pd(v.contractStart), ext = pd(v.extensionEnd);
      if (v.extensionEnd && !ext) { bad.push({ name: name, raw: v.extensionEnd }); return; }
      if (ext && ext >= today) return;                 // extended and still current
      if (!end) return;
      var row = { name: name, end: end, start: start, email: (state.emails || {})[name] || '' };
      if (end >= today) active.push(row); else if (!ext) ended.push(row);
    });
    active.sort(function (a, b) { return a.end - b.end; });
    ended.sort(function (a, b) { return b.end - a.end; });
    if (!active.length && !ended.length && !bad.length) { host.innerHTML = ''; return; }

    var rows = active.map(function (r) {
      var days = Math.round((r.end - today) / 86400000);
      var mid = r.start ? fmt(new Date(r.start.getTime() + (r.end - r.start) / 2)) : '—';
      var col = days <= 30 ? 'var(--red2)' : days <= 60 ? 'var(--amber2)' : 'var(--text2)';
      return '<tr><td style="' + TD + 'font-weight:600;">' + fmt(r.end) + '</td><td style="' + TD + '">' + esc(disp(r.name)) +
        '</td><td style="' + TD + 'color:' + col + ';font-weight:600;">' + days + 'd</td><td style="' + TD + 'color:var(--text3);">' + mid +
        '</td><td style="' + TD + (r.email ? 'color:var(--green2);">✓' : 'color:var(--red2);">no email') + '</td></tr>';
    }).join('');
    var endedHtml = ended.length
      ? '<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:12px;color:var(--text3);">Contract already ended, no extension recorded (' + ended.length + ')</summary><div style="font-size:12px;padding:6px 0;">' +
        ended.map(function (r) { return esc(disp(r.name)) + ' — ' + fmt(r.end); }).join(' · ') + '</div></details>' : '';
    var badHtml = bad.length
      ? '<div style="margin-top:8px;font-size:12px;color:var(--amber2);">⚠ Extension date unreadable: ' + bad.map(function (b) { return esc(disp(b.name)) + ' (“' + esc(b.raw) + '”)'; }).join(', ') + '</div>' : '';

    host.innerHTML = '<details open class="card" style="margin-bottom:14px;padding:10px 14px;"><summary style="cursor:pointer;font-weight:700;font-size:13px;">🧳 Agency contracts at risk of not extending (' + active.length + ')</summary>' +
      '<div style="font-size:11px;color:var(--text3);margin:4px 0 8px;">Active contracts with no extension entered, soonest end first. Enter the extension end date on the staff row to remove someone.</div>' +
      (rows ? '<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="' + TH + '">Ends</th><th style="' + TH + '">Staff</th><th style="' + TH + '">Left</th><th style="' + TH + '">Midpoint</th><th style="' + TH + '">Email</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div style="font-size:12px;color:var(--text3);">None.</div>') +
      endedHtml + badHtml + '</details>';
  }

  function arm() {
    if (typeof renderDirectory === 'function' && !renderDirectory._arWrapped) {
      var orig = renderDirectory;
      window.renderDirectory = renderDirectory = function () { var r = orig.apply(this, arguments); try { render(); } catch (e) { console.error(e); } return r; };
      renderDirectory._arWrapped = true;
    }
    render();
  }
  if (document.readyState === 'complete') setTimeout(arm, 3300); else window.addEventListener('load', function () { setTimeout(arm, 3300); });
})();
