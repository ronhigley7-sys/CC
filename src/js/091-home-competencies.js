/* ═══ HOME: Competencies overdue / due within 30 days (top of Home) ═══
 * Same data as the Manager Report section (imported Education items with "competency" + a due date). */
(function () {
  'use strict';
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function fmt(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

  function render() {
    var hp = document.getElementById('panel-home');
    if (!hp || typeof getCompetencyDueData !== 'function') return;
    var card = document.getElementById('mgr-comp-due-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'mgr-comp-due-card'; card.className = 'card';
      hp.insertBefore(card, hp.firstChild);
    }
    var d = getCompetencyDueData();
    var badge = d.over30 ? '<span style="color:var(--red2);">' + d.over30 + ' are 30+ days overdue</span>'
      : d.overdue ? '<span style="color:var(--amber2);">' + d.overdue + ' overdue</span>' : '';
    var head = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px;">' +
      '<div><div class="card-title">📋 Competencies — overdue / due within 30 days</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:2px;">From the Education import · ' + d.total + ' item' + (d.total === 1 ? '' : 's') + ' · ' + d.byStaff.length + ' staff' + (badge ? ' · ' + badge : '') + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" onclick="switchTab(document.querySelector(\'[data-panel=education]\'))">Open Education →</button></div>';
    if (!d.byStaff.length) {
      card.innerHTML = head.replace(/<button[\s\S]*?<\/button>/, '') + '<div style="font-size:12px;color:var(--green2);">✓ No competencies overdue or due in the next 30 days</div>';
      return;
    }
    var rows = d.byStaff.map(function (s) {
      var items = s.rows.map(function (r) {
        var st = r.over >= 30 ? '<b style="color:var(--red2);">' + r.over + 'd overdue</b>'
          : r.over > 0 ? '<b style="color:var(--amber2);">' + r.over + 'd overdue</b>'
          : r.over === 0 ? '<b style="color:var(--amber2);">due today</b>' : '<span style="color:var(--text3);">due in ' + (-r.over) + 'd</span>';
        return '<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:1px 0;"><span style="color:var(--text2);">' + esc(r.course) + '</span><span style="white-space:nowrap;">' + fmt(r.due) + ' · ' + st + '</span></div>';
      }).join('');
      var worstCol = s.worst >= 30 ? 'var(--red2)' : s.worst > 0 ? 'var(--amber2)' : 'var(--border)';
      return '<div style="border-left:3px solid ' + worstCol + ';background:rgba(255,255,255,0.03);border-radius:6px;padding:6px 10px;min-width:280px;flex:1 1 320px;">' +
        '<div style="font-size:12px;font-weight:700;color:var(--white);">' + esc(s.name) + (s.job ? ' <span style="font-weight:400;color:var(--text3);font-size:11px;">' + esc(s.job) + '</span>' : '') + '</div>' + items + '</div>';
    }).join('');
    card.innerHTML = head + '<div style="display:flex;flex-wrap:wrap;gap:8px;max-height:260px;overflow-y:auto;">' + rows + '</div>';
  }

  window.renderHomeCompetencies = render;
  var st = document.createElement('style');
  st.textContent = '#mgr-comp-due-card{order:-1 !important;margin-bottom:10px;padding:9px 12px;}';
  document.head.appendChild(st);

  function arm() {
    render();
    setTimeout(render, 3800); setTimeout(render, 6500);
    setInterval(function () { if (!document.hidden) render(); }, 30000);
    // refresh right after an education import or any save
    ['renderEducation', 'persistSave'].forEach(function (fn) {
      var orig = window[fn];
      if (typeof orig !== 'function' || orig._ccComp) return;
      var w = function () { var r = orig.apply(this, arguments); try { Promise.resolve(r).then(render); } catch (e) {} return r; };
      w._ccComp = true; window[fn] = w;
    });
  }
  if (document.readyState === 'complete') setTimeout(arm, 500); else window.addEventListener('load', function () { setTimeout(arm, 500); });
})();
