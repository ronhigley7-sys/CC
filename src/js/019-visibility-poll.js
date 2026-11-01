
(function() {
  var as_roleFilter = 'ALL';
  var as_selected   = {};

  function as_getStaff() {
    if (typeof MASTER_STAFF === 'undefined' || !MASTER_STAFF.length) return [];
    return MASTER_STAFF
      .filter(function(s) { return s.job !== 'NURSE MGR'; })
      .sort(function(a, b) { return a.name.localeCompare(b.name); });
  }

  function as_filtered() {
    var searchEl = document.getElementById('as-search');
    var q = searchEl ? searchEl.value.toLowerCase() : '';
    return as_getStaff().filter(function(s) {
      return (as_roleFilter === 'ALL' || s.job === as_roleFilter)
          && (!q || s.name.toLowerCase().indexOf(q) !== -1);
    });
  }

  window.as_setFilter = function(btn, role) {
    as_roleFilter = role;
    document.querySelectorAll('.as-fbtn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    as_render();
  };

  window.as_render = function() {
    var list  = as_filtered();
    var tbody = document.getElementById('as-tbody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3);font-style:italic;">No staff match.</td></tr>';
      as_updateCount(); return;
    }
    var roleColors = { RN: 'var(--accent2)', LPN: 'var(--green2)', CA: 'var(--amber2)', UC: 'var(--purple2)' };
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var s   = list[i];
      var chk = !!as_selected[s.name];
      var clr = roleColors[s.job] || 'var(--text3)';
      var safeName = s.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      html += '<tr' + (chk ? ' style="background:rgba(46,125,209,0.08)"' : '') + '>';
      html += '<td><input type="checkbox" data-staffname="' + safeName + '"';
      html += chk ? ' checked' : '';
      html += ' onchange="as_toggleByEl(this)" style="accent-color:var(--accent2);width:14px;height:14px;"></td>';
      html += '<td style="font-family:monospace;font-size:11px;color:var(--text3);text-align:center;">' + (i+1) + '</td>';
      html += '<td style="font-weight:600;font-size:13px;">' + s.name + '</td>';
      html += '<td><span style="font-family:monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(255,255,255,0.07);color:' + clr + ';">' + s.job + '</span></td>';
      html += '<td style="color:var(--text3);font-size:11px;font-style:italic;">_______________________________</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
    var chkAll = document.getElementById('as-chk-all');
    if (chkAll) chkAll.checked = list.every(function(s) { return !!as_selected[s.name]; });
    as_updateCount();
  };

  window.as_toggleByEl = function(el) {
    var name = el.getAttribute('data-staffname');
    if (!name) return;
    if (el.checked) { as_selected[name] = true; } else { delete as_selected[name]; }
    var row = el.closest('tr');
    if (row) row.style.background = el.checked ? 'rgba(46,125,209,0.08)' : '';
    as_updateCount();
  };

  window.as_toggleAll = function(checked) {
    as_filtered().forEach(function(s) {
      if (checked) { as_selected[s.name] = true; } else { delete as_selected[s.name]; }
    });
    as_render();
  };

  window.as_selectAll  = function() { as_getStaff().forEach(function(s) { as_selected[s.name] = true;  }); as_render(); };
  window.as_selectNone = function() { as_selected = {}; as_render(); };

  function as_updateCount() {
    var vis = as_filtered().filter(function(s) { return !!as_selected[s.name]; }).length;
    var el  = document.getElementById('as-sel-count');
    if (el) el.textContent = vis + ' selected';
  }

  function as_val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  window.as_print = function() {
    var toprint = as_getStaff().filter(function(s) { return !!as_selected[s.name]; });
    if (!toprint.length) { alert('Select at least one staff member to print.'); return; }

    var pname   = as_val('as-progname') || '________________________________';
    var loc     = as_val('as-location') || '________________________________';
    var len     = as_val('as-length')   || '___________';
    var ceus    = as_val('as-ceus')     || '___';
    var dept    = as_val('as-dept')     || '3B Tele Med Surg';
    var spk     = as_val('as-speaker')  || '________________________________';
    var mandEl  = document.getElementById('as-mandatory');
    var mand    = mandEl ? mandEl.value : 'YES';
    var dateEl  = document.getElementById('as-date');
    var dateStr = '________________';
    if (dateEl && dateEl.value) {
      var d = new Date(dateEl.value + 'T00:00:00');
      dateStr = d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
    }
    var mandHtml = mand === 'YES' ? '&#9745; YES &nbsp; &#9744; NO' : '&#9744; YES &nbsp; &#9745; NO';

    var total = Math.max(25, toprint.length);
    var rows  = '';
    var i, j;
    for (i = 0; i < toprint.length; i++) {
      rows += '<tr><td class="pnum">' + (i+1) + '</td>';
      rows += '<td class="pdate">' + dateStr + '</td>';
      rows += '<td>' + toprint[i].name + '</td>';
      rows += '<td class="pdept">3B</td>';
      rows += '<td class="psig"></td></tr>';
    }
    for (j = toprint.length; j < total; j++) {
      rows += '<tr><td class="pnum">' + (j+1) + '</td>';
      rows += '<td class="pdate"></td><td></td><td class="pdept"></td><td class="psig"></td></tr>';
    }

    var css = [
      '*{box-sizing:border-box;margin:0;padding:0;}',
      'body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#000;padding:.4in .5in .3in;background:#fff;}',
      '.ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;}',
      '.ph-org{font-size:15pt;font-weight:bold;letter-spacing:-.02em;line-height:1.1;}',
      '.ph-org em{font-style:normal;}',
      '.ph-addr{text-align:right;font-size:7.5pt;color:#444;line-height:1.5;}',
      '.pdiv{border:none;border-top:2pt solid #000;margin:5px 0;}',
      '.ptitle{text-align:center;font-size:12.5pt;font-weight:bold;margin:5px 0 7px;letter-spacing:.02em;}',
      '.pmeta{width:100%;border-collapse:collapse;margin-bottom:5px;font-size:8.5pt;}',
      '.pmeta td{padding:3px 6px;border:1px solid #aaa;vertical-align:top;}',
      '.lbl{font-weight:bold;}',
      '.pedu{background:#e8e8e8;border:1px solid #aaa;text-align:center;font-size:7pt;font-weight:bold;',
        'letter-spacing:.07em;text-transform:uppercase;padding:2px 0;margin:4px 0 2px;}',
      '.pedu-row{width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:5px;}',
      '.pedu-row td{border:1px solid #aaa;padding:2px 5px;color:#555;}',
      '.psign{width:100%;border-collapse:collapse;font-size:8.5pt;}',
      '.psign th{border:1px solid #000;padding:4px 5px;background:#e0e0e0;font-size:7pt;',
        'text-align:left;letter-spacing:.04em;text-transform:uppercase;}',
      '.psign td{border:1px solid #999;padding:3px 5px;height:21pt;vertical-align:middle;}',
      '.pnum{width:18pt;text-align:center;color:#666;font-size:7.5pt;}',
      '.pdate{width:50pt;}',
      '.pdept{width:40pt;}',
      '.psig{width:115pt;}',
      '.pfoot{margin-top:18pt;display:flex;justify-content:space-between;}',
      '.pline{border-top:1px solid #000;padding-top:3pt;font-size:7.5pt;color:#555;}',
      '.pline:first-child{width:55%;} .pline:last-child{width:30%;}',
      '.pformnum{text-align:center;font-size:7pt;color:#777;margin-top:7pt;}'
    ].join('');

    var w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked. Please allow pop-ups for this page.'); return; }
    w.document.open();
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8">');
    w.document.write('<title>Attendance</title><style>' + css + '</style></head><body>');
    w.document.write('<div class="ph">');
    w.document.write('<div><div class="ph-org">Arnot<em>Health</em></div>');
    w.document.write('<div style="font-size:7.5pt;color:#555;margin-top:2pt">Arnot Ogden Medical Center</div></div>');
    w.document.write('<div class="ph-addr"><strong>DEPARTMENT OF EDUCATION</strong><br>');
    w.document.write('600 Roe Avenue, Elmira, NY 14905<br>See reverse side for instructor comment.</div></div>');
    w.document.write('<div class="pdiv"></div>');
    w.document.write('<div class="ptitle">Attendance Record &mdash; Meetings / Programs</div>');
    w.document.write('<table class="pmeta">');
    w.document.write('<tr><td colspan="3"><span class="lbl">Program/Meeting Name: </span>' + pname + '</td>');
    w.document.write('<td><span class="lbl">Date: </span>' + dateStr + '</td></tr>');
    w.document.write('<tr><td colspan="2"><span class="lbl">Location: </span>' + loc + '</td>');
    w.document.write('<td><span class="lbl">Program Length: </span>' + len + '</td>');
    w.document.write('<td><span class="lbl">CEUs: </span>' + ceus + '</td></tr>');
    w.document.write('<tr><td colspan="2"><span class="lbl">Dept/Sponsoring Program: </span>' + dept + '</td>');
    w.document.write('<td colspan="2"><span class="lbl">Mandatory: </span>' + mandHtml + '</td></tr>');
    w.document.write('<tr><td colspan="4"><span class="lbl">Name &amp; Title of Speaker: </span>' + spk + '</td></tr>');
    w.document.write('</table>');
    w.document.write('<div class="pedu">Education Office Only</div>');
    w.document.write('<table class="pedu-row"><tr>');
    w.document.write('<td><strong>Computer Data Base Name</strong></td>');
    w.document.write('<td>Start Date: ___________</td><td>End Date: ___________</td>');
    w.document.write('<td>Attendee: _____</td><td>Self Learning: _____</td></tr></table>');
    w.document.write('<table class="psign"><thead><tr>');
    w.document.write('<th class="pnum">#</th><th class="pdate">Date</th>');
    w.document.write('<th>Print &mdash; Last Name, First Name, Initial</th>');
    w.document.write('<th class="pdept">Dept #</th><th class="psig">Signature</th>');
    w.document.write('</tr></thead><tbody>' + rows + '</tbody></table>');
    w.document.write('<div class="pfoot">');
    w.document.write('<div class="pline">Instructor Signature / Title</div>');
    w.document.write('<div class="pline">Date</div></div>');
    w.document.write('<div class="pformnum">Form 8751.28 s &nbsp;(11/15)&nbsp; POD</div>');
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function() { w.print(); }, 400);
  };

  // Poll for tab visibility and render when open
  var _as_wasHidden = true;
  function _as_poll() {
    var panel = document.getElementById('panel-attendsheet');
    if (!panel) return;
    var hidden = panel.style.display === 'none' || panel.style.display === '';
    if (!hidden && _as_wasHidden) {
      _as_wasHidden = false;
      var d = document.getElementById('as-date');
      if (d && !d.value) d.valueAsDate = new Date();
      as_render();
    } else if (hidden) {
      _as_wasHidden = true;
    }
  }
  setInterval(_as_poll, 300);

  document.addEventListener('DOMContentLoaded', function() {
    var d = document.getElementById('as-date');
    if (d) d.valueAsDate = new Date();
  });
})();
