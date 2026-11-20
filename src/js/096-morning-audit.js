/* ─────────────────────────────────────────────────────────────────────────
   Morning Audit tracker (Quality tab)
   Log a morning-audit miss: pick the event + the staff member (or provider for MOLST),
   it lands in the open list; tick "Completed" when it's fixed and the time it took is recorded.
   Summaries show who is missing what, and how long items take to close.

   state.morningAudits = [{ id, date:'YYYY-MM-DD', event, who, role, loggedAt:ISO, completed:bool, completedAt:ISO|null }]
   De-identified: staff/provider names only, never patient info.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var EVENTS = [
    { key: 'molst',      label: 'MOLST forms',             who: 'provider' },
    { key: 'admit',      label: 'Admissions not complete', who: 'nurse' },
    { key: 'weight',     label: 'Daily weight',            who: 'both' },
    { key: 'io',         label: 'I&O',                     who: 'both' },
    { key: 'admitpaper', label: 'Admission paperwork',     who: 'nurse' },
    { key: 'valuables',  label: 'Valuables',               who: 'nurse' },
    { key: 'painadmit',  label: 'Pain on admission',       who: 'nurse' },
    { key: 'painreas',   label: 'Pain reassessments',      who: 'nurse' },
    { key: 'careplan',   label: 'Care plan',               who: 'nurse' },
    { key: 'si',         label: 'SI',                      who: 'both' }
  ];

  function ev(key) { for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].key === key) return EVENTS[i]; return EVENTS[0]; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function list() { if (!state.morningAudits) state.morningAudits = []; return state.morningAudits; }
  function save() { try { persistSave(); } catch (e) { console.error(e); } }
  function banner(m) { try { showSaveBanner(m); } catch (e) {} }

  function dur(ms) {
    if (ms == null || isNaN(ms) || ms < 0) return '—';
    var m = Math.round(ms / 60000);
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return h + 'h' + (r ? ' ' + r + 'm' : '');
    var d = Math.floor(h / 24);
    return d + 'd' + (h % 24 ? ' ' + (h % 24) + 'h' : '');
  }
  function fmtTime(iso) {
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + pad(d.getMinutes());
  }
  function disp(name) {
    var p = String(name || '').split(',');
    return p.length > 1 ? p[0].trim() + ', ' + p[1].trim() : name;
  }

  function staffFor(who) {
    var roles = who === 'nurse' ? ['RN', 'LPN'] : ['RN', 'LPN', 'CA'];
    return (MASTER_STAFF || []).filter(function (s) { return roles.indexOf(s.job) >= 0; });
  }
  function providerHistory() {
    var seen = {}, out = [];
    list().forEach(function (r) { var pv = r.event === 'molst' ? r.who : r.provider; if (pv && !seen[pv]) { seen[pv] = 1; out.push(pv); } });
    return out.sort();
  }

  /* ── actions ── */
  function add() {
    var evKey = document.getElementById('ma-event').value;
    var e = ev(evKey), who = '', role = '';
    if (e.who === 'provider') {
      who = (document.getElementById('ma-provider').value || '').trim();
      role = 'Provider';
    } else {
      who = document.getElementById('ma-staff').value;
      var s = (MASTER_STAFF || []).filter(function (x) { return x.name === who; })[0];
      role = s ? s.job : '';
    }
    var provEl = document.getElementById('ma-prov');
    var provider = e.who === 'provider' ? who : (provEl ? provEl.value.trim() : '');
    var roomEl = document.getElementById('ma-room');
    var room = roomEl ? roomEl.value.trim() : '';
    if (!who) { alert(e.who === 'provider' ? 'Enter the provider.' : 'Select a staff member.'); return; }
    var date = document.getElementById('ma-date').value || dayKey(new Date());
    var now = new Date();
    // logged time = now (when it was found); for a back-dated entry use that day at the current clock time
    var parts = date.split('-');
    var logged = new Date(+parts[0], +parts[1] - 1, +parts[2], now.getHours(), now.getMinutes());
    list().push({ id: 'ma' + now.getTime() + Math.floor(Math.random() * 1000), date: date, event: evKey, who: who, role: role,
      loggedAt: logged.toISOString(), completed: false, completedAt: null, provider: provider, room: room });
    save(); render();
    banner('📝 Logged: ' + e.label + ' — ' + disp(who));
  }
  function complete(id, val) {
    list().forEach(function (r) {
      if (r.id !== id) return;
      r.completed = !!val;
      r.completedAt = val ? new Date().toISOString() : null;
    });
    save(); render();
  }
  function remove(id) {
    if (!confirm('Delete this audit entry?')) return;
    state.morningAudits = list().filter(function (r) { return r.id !== id; });
    save(); render();
  }

  /* ── summaries ── */
  function inRange(r, days) {
    if (days === 'all') return true;
    var cut = new Date(); cut.setDate(cut.getDate() - parseInt(days, 10));
    return r.date >= dayKey(cut);
  }
  function stats(rows) {
    var done = rows.filter(function (r) { return r.completed && r.completedAt; });
    var total = 0;
    done.forEach(function (r) { total += new Date(r.completedAt) - new Date(r.loggedAt); });
    return { n: rows.length, open: rows.filter(function (r) { return !r.completed; }).length,
      avg: done.length ? total / done.length : null };
  }

  var TH = 'text-align:left;padding:6px 8px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);';
  var TD = 'padding:6px 8px;font-size:12px;border-bottom:1px solid var(--border);';

  function render() {
    var host = document.getElementById('morning-audit-card');
    if (!host) return;
    var prev = { ev: (document.getElementById('ma-event') || {}).value, rng: (document.getElementById('ma-range') || {}).value };
    var evKey = prev.ev || EVENTS[0].key, rng = prev.rng || '30';
    var e = ev(evKey);
    var inputStyle = 'background:var(--slate);border:1px solid var(--border);color:var(--white);padding:6px 8px;border-radius:4px;font-size:12px;';

    var staffCtl = e.who === 'provider'
      ? '<input id="ma-provider" list="ma-provider-list" placeholder="Provider name" style="' + inputStyle + 'min-width:170px;"><datalist id="ma-provider-list">' +
        providerHistory().map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>'
      : '<select id="ma-staff" style="' + inputStyle + 'min-width:200px;"><option value="">Select staff…</option>' +
        staffFor(e.who).map(function (s) { return '<option value="' + esc(s.name) + '">' + esc(disp(s.name)) + ' (' + s.job + ')</option>'; }).join('') + '</select>';

    var extraCtl = (e.who === 'provider' ? '' :
      '<input id="ma-prov" list="ma-provider-list" placeholder="Provider" style="' + inputStyle + 'min-width:150px;"><datalist id="ma-provider-list">' +
      providerHistory().map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>') +
      '<input id="ma-room" placeholder="Room #" style="' + inputStyle + 'width:80px;">';

    var rows = list().filter(function (r) { return inRange(r, rng); });
    var open = list().filter(function (r) { return !r.completed; }).sort(function (a, b) { return a.loggedAt < b.loggedAt ? -1 : 1; });
    var recent = rows.filter(function (r) { return r.completed; }).sort(function (a, b) { return a.completedAt < b.completedAt ? 1 : -1; }).slice(0, 15);
    var now = Date.now();

    function line(r, isOpen) {
      var age = isOpen ? dur(now - new Date(r.loggedAt)) : dur(new Date(r.completedAt) - new Date(r.loggedAt));
      return '<tr><td style="' + TD + 'width:34px;"><input type="checkbox" data-ma-done="' + r.id + '"' + (r.completed ? ' checked' : '') +
        ' title="Completed" style="width:16px;height:16px;accent-color:var(--green2);cursor:pointer;"></td>' +
        '<td style="' + TD + 'font-weight:600;">' + esc(ev(r.event).label) + '</td>' +
        '<td style="' + TD + '">' + esc(disp(r.who)) + ' <span style="color:var(--text3);font-size:10px;">' + esc(r.role) + '</span>' +
        (r.room ? ' <span style="color:var(--text3);font-size:11px;">· Rm ' + esc(r.room) + '</span>' : '') +
        (r.provider && r.event !== 'molst' ? ' <span style="color:var(--text3);font-size:11px;">· ' + esc(r.provider) + '</span>' : '') + '</td>' +
        '<td style="' + TD + 'color:var(--text3);">' + esc(fmtTime(r.loggedAt)) + '</td>' +
        '<td style="' + TD + 'color:' + (isOpen ? 'var(--amber2)' : 'var(--green2)') + ';font-weight:600;">' + age + (isOpen ? ' open' : '') + '</td>' +
        '<td style="' + TD + 'text-align:right;"><button class="btn btn-ghost btn-sm" data-ma-del="' + r.id + '" style="padding:1px 7px;font-size:11px;" title="Delete">✕</button></td></tr>';
    }
    function tbl(head, body) {
      return '<table style="width:100%;border-collapse:collapse;"><thead><tr>' + head.map(function (h) { return '<th style="' + TH + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table>';
    }

    // by event
    var byEvent = EVENTS.map(function (x) {
      var s = stats(rows.filter(function (r) { return r.event === x.key; }));
      return '<tr><td style="' + TD + 'font-weight:600;">' + esc(x.label) + '</td><td style="' + TD + '">' + s.n + '</td><td style="' + TD + 'color:' + (s.open ? 'var(--amber2)' : 'var(--text3)') + ';">' + s.open + '</td><td style="' + TD + '">' + dur(s.avg) + '</td></tr>';
    }).join('');

    // by staff
    var map = {};
    rows.forEach(function (r) { (map[r.who] = map[r.who] || []).push(r); });
    var staffRows = Object.keys(map).map(function (k) { return { who: k, rows: map[k], s: stats(map[k]) }; })
      .sort(function (a, b) { return b.s.n - a.s.n; })
      .map(function (g) {
        var chips = EVENTS.map(function (x) {
          var c = g.rows.filter(function (r) { return r.event === x.key; }).length;
          return c ? '<span style="display:inline-block;background:rgba(255,255,255,0.07);border-radius:10px;padding:1px 8px;margin:1px 3px 1px 0;font-size:11px;">' + esc(x.label) + ' ×' + c + '</span>' : '';
        }).join('');
        return '<tr><td style="' + TD + 'font-weight:600;white-space:nowrap;">' + esc(disp(g.who)) + '</td><td style="' + TD + '">' + g.s.n + '</td><td style="' + TD + 'color:' + (g.s.open ? 'var(--amber2)' : 'var(--text3)') + ';">' + g.s.open + '</td><td style="' + TD + '">' + dur(g.s.avg) + '</td><td style="' + TD + '">' + chips + '</td></tr>';
      }).join('');

    // by provider
    var pmap = {};
    rows.forEach(function (r) { var pv = r.event === 'molst' ? r.who : r.provider; if (pv) (pmap[pv] = pmap[pv] || []).push(r); });
    var provRows = Object.keys(pmap).map(function (k) { return { who: k, rows: pmap[k], s: stats(pmap[k]) }; })
      .sort(function (a, b) { return b.s.n - a.s.n; })
      .map(function (g) {
        var chips = EVENTS.map(function (x) {
          var c = g.rows.filter(function (r) { return r.event === x.key; }).length;
          return c ? '<span style="display:inline-block;background:rgba(255,255,255,0.07);border-radius:10px;padding:1px 8px;margin:1px 3px 1px 0;font-size:11px;">' + esc(x.label) + ' ×' + c + '</span>' : '';
        }).join('');
        return '<tr><td style="' + TD + 'font-weight:600;white-space:nowrap;">' + esc(g.who) + '</td><td style="' + TD + '">' + g.s.n + '</td><td style="' + TD + 'color:' + (g.s.open ? 'var(--amber2)' : 'var(--text3)') + ';">' + g.s.open + '</td><td style="' + TD + '">' + dur(g.s.avg) + '</td><td style="' + TD + '">' + chips + '</td></tr>';
      }).join('');

    host.innerHTML =
      '<div class="card" style="margin-bottom:14px;"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div class="card-title">🌅 Morning Audits</div>' +
      '<select id="ma-range" style="' + inputStyle + '"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">' +
      '<select id="ma-event" style="' + inputStyle + '">' + EVENTS.map(function (x) { return '<option value="' + x.key + '">' + esc(x.label) + '</option>'; }).join('') + '</select>' +
      staffCtl + extraCtl +
      '<input id="ma-date" type="date" value="' + dayKey(new Date()) + '" style="' + inputStyle + '">' +
      '<button class="btn btn-primary btn-sm" id="ma-add" type="button">＋ Log</button></div>' +
      '<div style="font-size:12px;font-weight:700;margin:6px 0;">Open (' + open.length + ')</div>' +
      (open.length ? tbl(['✔', 'Event', 'Staff', 'Logged', 'Open for', ''], open.map(function (r) { return line(r, true); }).join('')) : '<div style="color:var(--text3);font-size:12px;padding:6px 0;">Nothing open.</div>') +
      '<div style="font-size:12px;font-weight:700;margin:14px 0 6px;">Recently completed</div>' +
      (recent.length ? tbl(['✔', 'Event', 'Staff', 'Logged', 'Took', ''], recent.map(function (r) { return line(r, false); }).join('')) : '<div style="color:var(--text3);font-size:12px;padding:6px 0;">None in this range.</div>') +
      '<div class="grid-2" style="align-items:start;margin-top:14px;gap:14px;"><div><div style="font-size:12px;font-weight:700;margin-bottom:6px;">By event</div>' +
      tbl(['Event', 'Logged', 'Open', 'Avg time to complete'], byEvent) + '</div>' +
      '<div><div style="font-size:12px;font-weight:700;margin-bottom:6px;">By staff / provider</div>' +
      (staffRows ? tbl(['Name', 'Logged', 'Open', 'Avg time', 'Events'], staffRows) : '<div style="color:var(--text3);font-size:12px;">No entries in this range.</div>') + '</div></div>' +
      '<div style="margin-top:14px;"><div style="font-size:12px;font-weight:700;margin-bottom:6px;">By provider</div>' +
      (provRows ? tbl(['Provider', 'Logged', 'Open', 'Avg time', 'Events'], provRows) : '<div style="color:var(--text3);font-size:12px;">No provider entries in this range.</div>') + '</div></div>';

    document.getElementById('ma-event').value = evKey;
    document.getElementById('ma-range').value = rng;
    document.getElementById('ma-event').onchange = render;
    document.getElementById('ma-range').onchange = render;
    document.getElementById('ma-add').onclick = add;
    host.querySelectorAll('[data-ma-done]').forEach(function (el) { el.onchange = function () { complete(el.getAttribute('data-ma-done'), el.checked); }; });
    host.querySelectorAll('[data-ma-del]').forEach(function (el) { el.onclick = function () { remove(el.getAttribute('data-ma-del')); }; });
  }

  function arm() {
    if (typeof renderQualityTab === 'function' && !renderQualityTab._maWrapped) {
      var orig = renderQualityTab;
      window.renderQualityTab = renderQualityTab = function () { var r = orig.apply(this, arguments); try { render(); } catch (e) { console.error(e); } return r; };
      renderQualityTab._maWrapped = true;
    }
    render();
  }
  if (document.readyState === 'complete') setTimeout(arm, 3200); else window.addEventListener('load', function () { setTimeout(arm, 3200); });
})();
