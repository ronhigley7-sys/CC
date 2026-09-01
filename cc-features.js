
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

(function() {

  // ── HPPD Paste Importer ──────────────────────────────────────
  window.hppd_runImport = function() {
    var area   = document.getElementById('hppd-paste-area');
    var status = document.getElementById('hppd-import-status');
    if (!area || !area.value.trim()) { status.textContent = 'Paste data first.'; status.style.color = 'var(--red2)'; return; }

    var yearEl   = document.getElementById('hppd-import-year');
    var targetEl = document.getElementById('hppd-import-target');
    var year     = yearEl && yearEl.value ? parseInt(yearEl.value) : new Date().getFullYear();
    var targetHppd = targetEl && targetEl.value ? parseFloat(targetEl.value) : 9.71;

    var monthAbbr = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

    function parseDate(raw) {
      // Formats: "1-May", "May 1", "5/1", "2026-05-01", "01-May-2026"
      raw = String(raw).trim();
      var m;
      // "1-May" or "01-May-2026"
      m = raw.match(/^(\d{1,2})[- ]([A-Za-z]{3})(?:[- ](\d{4}))?$/);
      if (m) {
        var mo = monthAbbr[m[2].toLowerCase()];
        var yr = m[3] ? parseInt(m[3]) : year;
        if (mo) return yr + '-' + String(mo).padStart(2,'0') + '-' + String(parseInt(m[1])).padStart(2,'0');
      }
      // "May 1" or "May 1, 2026"
      m = raw.match(/^([A-Za-z]{3})[- ](\d{1,2})(?:,?\s*(\d{4}))?$/);
      if (m) {
        var mo = monthAbbr[m[1].toLowerCase()];
        var yr = m[3] ? parseInt(m[3]) : year;
        if (mo) return yr + '-' + String(mo).padStart(2,'0') + '-' + String(parseInt(m[2])).padStart(2,'0');
      }
      // "YYYY-MM-DD"
      m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return raw;
      // "M/D" or "M/D/YYYY"
      m = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (m) {
        var yr = m[3] ? (parseInt(m[3]) < 100 ? 2000 + parseInt(m[3]) : parseInt(m[3])) : year;
        return yr + '-' + String(parseInt(m[1])).padStart(2,'0') + '-' + String(parseInt(m[2])).padStart(2,'0');
      }
      return null;
    }

    var lines   = area.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
    var imported = 0, skipped = 0;
    if (!state.productivity) state.productivity = {};

    // Detect which month to switch to after import
    var importedMonth = null;

    lines.forEach(function(line) {
      var cols = line.split('\t').map(function(c) { return c.trim(); });
      if (cols.length < 10) { skipped++; return; }

      var dateKey = parseDate(cols[0]);
      if (!dateKey) { skipped++; return; }

      // Skip header rows
      if (cols[0].toLowerCase().indexOf('date') !== -1) { skipped++; return; }
      if (cols[1] && isNaN(parseFloat(cols[1])) && cols[1] !== '') { skipped++; return; }

      // FULL format (20+ cols):
      // 0:Date 1:7-3#pts 2:7-3Staff 3:7-3Hrs 4:3-7p#pts 5:3-7pStaff 6:3-7Hrs
      // 7:7-11p#pts 8:7-11pStaff 9:7-11Hrs 10:11-7#pts 11:11-7Staff 12:11-7Hrs
      // 13:ADC 14:HrsUsed 15:TargetHrs 16:HrsNoSafety 17:TargetHPPD 18:ActualHPPD 19:Variance
      //
      // SHORT format (13 cols):
      // 0:Date 1:7-3#pts 2:7-3Staff 3:3-7p#pts 4:3-7pStaff 5:7-11p#pts 6:7-11pStaff
      // 7:11-7#pts 8:11-7Staff 9:ADC 10:TargetHPPD 11:ActualHPPD 12:Variance

      var n = cols.length;
      var day73pts,day73staff,day73hrs,eve37pts,eve37staff,eve37hrs;
      var eve711pts,eve711stf,eve711hrs,ngt117pts,ngt117stf,ngt117hrs;
      var census,hrsUsed,targetHrs,hrsNoSafety,tHppd,actualHppd,variance;

      if (n >= 18) {
        // FULL format with shift hours columns
        day73pts    = parseFloat(cols[1])  || 0;
        day73staff  = parseFloat(cols[2])  || 0;
        day73hrs    = parseFloat(cols[3])  || 0;
        eve37pts    = parseFloat(cols[4])  || 0;
        eve37staff  = parseFloat(cols[5])  || 0;
        eve37hrs    = parseFloat(cols[6])  || 0;
        eve711pts   = parseFloat(cols[7])  || 0;
        eve711stf   = parseFloat(cols[8])  || 0;
        eve711hrs   = parseFloat(cols[9])  || 0;
        ngt117pts   = parseFloat(cols[10]) || 0;
        ngt117stf   = parseFloat(cols[11]) || 0;
        ngt117hrs   = parseFloat(cols[12]) || 0;
        census      = parseFloat(cols[13]) || 0;
        hrsUsed     = parseFloat(cols[14]) || 0;
        targetHrs   = parseFloat(cols[15]) || 0;
        hrsNoSafety = parseFloat(cols[16]) || 0;
        tHppd       = parseFloat(cols[17]) || targetHppd;
        actualHppd  = parseFloat(cols[18]) || 0;
        variance    = parseFloat(cols[19]) || 0;
      } else if (n >= 13) {
        // SHORT format — no shift hour totals, no safety monitor column
        day73pts    = parseFloat(cols[1])  || 0;
        day73staff  = parseFloat(cols[2])  || 0;
        eve37pts    = parseFloat(cols[3])  || 0;
        eve37staff  = parseFloat(cols[4])  || 0;
        eve711pts   = parseFloat(cols[5])  || 0;
        eve711stf   = parseFloat(cols[6])  || 0;
        ngt117pts   = parseFloat(cols[7])  || 0;
        ngt117stf   = parseFloat(cols[8])  || 0;
        census      = parseFloat(cols[9])  || 0;
        tHppd       = parseFloat(cols[10]) || targetHppd;
        actualHppd  = parseFloat(cols[11]) || 0;
        variance    = parseFloat(cols[12]) || 0;
        hrsUsed     = census > 0 && actualHppd > 0 ? Math.round(actualHppd * census * 10) / 10 : 0;
        targetHrs   = census > 0 && tHppd > 0 ? Math.round(tHppd * census * 10) / 10 : 0;
        hrsNoSafety = hrsUsed;
      } else { skipped++; return; }

      if (!census && !actualHppd) { skipped++; return; }

      state.productivity[dateKey] = {
        census:        census,
        productiveHrs: hrsUsed,
        targetHppd:    tHppd,
        targetHrs:     targetHrs,
        hrsNoSafety:   hrsNoSafety || 0,
        actualHppd:    actualHppd,
        variance:      variance,
        shiftDay:      day73staff  || 0,
        shiftDayHrs:   day73hrs   || 0,
        shiftEve1:     eve37staff  || 0,
        shiftEve1Hrs:  eve37hrs   || 0,
        shiftEve2:     eve711stf   || 0,
        shiftEve2Hrs:  eve711hrs  || 0,
        shiftNight:    ngt117stf   || 0,
        shiftNightHrs: ngt117hrs  || 0,
        day73pts:      day73pts   || 0,
        eve37pts:      eve37pts   || 0,
        eve711pts:     eve711pts  || 0,
        ngt117pts:     ngt117pts  || 0,
        imported:      true
      };

      if (!importedMonth) importedMonth = dateKey.slice(0,7);
      imported++;
    });

    if (typeof persistSave === 'function') persistSave();

    status.textContent = imported + ' days imported' + (skipped ? ', ' + skipped + ' skipped' : '');
    status.style.color = imported > 0 ? 'var(--green2)' : 'var(--amber2)';

    // Switch month dropdown to imported month
    if (importedMonth) {
      var mSel = document.getElementById('prod-month');
      if (mSel) {
        var found = false;
        for (var i = 0; i < mSel.options.length; i++) {
          if (mSel.options[i].value === importedMonth) { mSel.value = importedMonth; found = true; break; }
        }
        if (!found) {
          var d = new Date(importedMonth + '-01T12:00:00');
          var opt = document.createElement('option');
          opt.value = importedMonth;
          opt.textContent = d.toLocaleDateString('en-US', {month:'long', year:'numeric'});
          mSel.appendChild(opt);
          mSel.value = importedMonth;
        }
      }
    }

    if (typeof renderProductivity === 'function') renderProductivity();
  };

  // ── File Drop / Pick Handler ──────────────────────────────────
  var _hppd_pendingRows = null;

  window.hppd_togglePaste = function() {
    var wrap = document.getElementById('hppd-paste-area-wrap');
    var zone = document.getElementById('hppd-drop-zone');
    var btn  = document.getElementById('hppd-paste-toggle');
    if (!wrap) return;
    var showing = wrap.style.display !== 'none';
    wrap.style.display = showing ? 'none' : 'block';
    if (zone) zone.style.display = showing ? 'block' : 'none';
    if (btn)  btn.textContent = showing ? 'Paste Instead' : 'Hide Paste';
  };

  window.hppd_handleDrop = function(event) {
    event.preventDefault();
    var zone = document.getElementById('hppd-drop-zone');
    if (zone) { zone.style.borderColor = 'var(--border)'; zone.style.background = 'var(--slate)'; }
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) hppd_readFile(file);
  };

  window.hppd_handleFileInput = function(input) {
    var file = input && input.files && input.files[0];
    if (file) hppd_readFile(file);
  };

  function hppd_readFile(file) {
    var status = document.getElementById('hppd-import-status');
    var fnEl   = document.getElementById('hppd-drop-filename');
    if (fnEl) { fnEl.textContent = file.name; fnEl.style.display = 'block'; }
    if (status) { status.textContent = 'Reading ' + file.name + '...'; status.style.color = 'var(--accent2)'; }

    // CSV path
    if (file.name.toLowerCase().endsWith('.csv')) {
      var rdrC = new FileReader();
      rdrC.onload = function(e) {
        var lines = e.target.result.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
        _hppd_pendingRows = lines.map(function(l){ return l.split(',').map(function(c){ return c.replace(/^"|"$/g,'').trim(); }); });
        if (status) { status.textContent = _hppd_pendingRows.length + ' rows loaded from CSV - click Import'; status.style.color = 'var(--accent2)'; }
      };
      rdrC.readAsText(file);
      return;
    }

    // Excel path
    if (typeof XLSX === 'undefined') {
      if (status) { status.textContent = 'XLSX library not ready - use paste mode instead'; status.style.color = 'var(--red2)'; }
      return;
    }

    var rdrX = new FileReader();
    rdrX.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var wb   = XLSX.read(data, { type: 'array', cellDates: true });

        // Sheet selection
        var sheetPref = document.getElementById('hppd-sheet-name') ? document.getElementById('hppd-sheet-name').value.trim() : '';
        var sheetName = sheetPref || wb.SheetNames.find(function(n){ return /hppd|working|productivity/i.test(n); }) || wb.SheetNames[0];
        var ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
        sheetName = ws ? sheetName : wb.SheetNames[0];
        if (!ws) { throw new Error('Could not find sheet'); }

        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        _hppd_pendingRows = raw.map(function(row) {
          return row.map(function(cell) {
            if (cell instanceof Date) {
              return cell.getDate() + '-' + months[cell.getMonth()];
            }
            return String(cell === null || cell === undefined ? '' : cell).trim();
          });
        });

        var dataRows = _hppd_pendingRows.filter(function(r){ return r.length > 5 && r[0] && r[0] !== ''; }).length;
        if (status) {
          status.textContent = file.name + ' | sheet: "' + sheetName + '" | ' + dataRows + ' rows ready - click Import';
          status.style.color = 'var(--green2)';
        }

        // Auto-fill year from filename
        var yrMatch = file.name.match(/20\d{2}/);
        var yrEl = document.getElementById('hppd-import-year');
        if (yrMatch && yrEl && !yrEl.value) yrEl.value = yrMatch[0];

      } catch(err) {
        if (status) { status.textContent = 'Read error: ' + err.message; status.style.color = 'var(--red2)'; }
      }
    };
    rdrX.readAsArrayBuffer(file);
  }

  // Override runImport to use file rows if available
  var _orig_hppd_runImport = window.hppd_runImport;
  window.hppd_runImport = function() {
    var status = document.getElementById('hppd-import-status');
    var rows = null;

    if (_hppd_pendingRows && _hppd_pendingRows.length) {
      rows = _hppd_pendingRows;
    } else {
      var area = document.getElementById('hppd-paste-area');
      if (area && area.value.trim()) {
        rows = area.value.split('\n').map(function(l){
          return l.split('\t').map(function(c){ return c.trim(); });
        }).filter(function(r){ return r.length > 2; });
      }
    }

    if (!rows || !rows.length) {
      if (status) { status.textContent = 'Drop a file or paste data first.'; status.style.color = 'var(--red2)'; }
      return;
    }

    // Feed rows into paste area for original importer to process
    var pasteArea = document.getElementById('hppd-paste-area');
    if (pasteArea) pasteArea.value = rows.map(function(r){ return r.join('\t'); }).join('\n');

    _hppd_pendingRows = null;
    _orig_hppd_runImport();

    var fnEl = document.getElementById('hppd-drop-filename');
    if (fnEl) { fnEl.textContent = ''; fnEl.style.display = 'none'; }
  };

  // ── Enhanced renderProductivity override ─────────────────────

  // Store reference to original
  var _origRender = window.renderProductivity;

  window.renderProductivity = function() {
    var monthKey = document.getElementById('prod-month') ? document.getElementById('prod-month').value : '';
    if (!monthKey) monthKey = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    var parts = monthKey.split('-').map(Number);
    var yr = parts[0], mo = parts[1];
    var daysInMonth = new Date(yr, mo, 0).getDate();
    var days = [];
    for (var i = 1; i <= daysInMonth; i++) {
      days.push(yr + '-' + String(mo).padStart(2,'0') + '-' + String(i).padStart(2,'0'));
    }

    var prod = state.productivity || {};
    var entries = days.map(function(d) { return Object.assign({ date: d }, prod[d] || {}); });
    var withData = entries.filter(function(e) { return e.census || e.productiveHrs; });

    var totalHrs  = withData.reduce(function(s,e) { return s + (e.productiveHrs||0); }, 0);
    var totalCens = withData.reduce(function(s,e) { return s + (e.census||0); }, 0);
    var avgCensus = withData.length ? Math.round(totalCens/withData.length*10)/10 : 0;
    var avgHppd   = totalCens > 0 ? Math.round(totalHrs/totalCens*100)/100 : null;
    var targetHppd = withData.length ? withData.reduce(function(s,e){return s+(e.targetHppd||9.71);},0)/withData.length : 9.71;
    targetHppd = Math.round(targetHppd*100)/100;

    // Variance analysis
    var overDays  = withData.filter(function(e) { return (e.variance||0) > 0.5; });
    var underDays = withData.filter(function(e) { return (e.variance||0) < -0.5; });
    var highVar   = withData.filter(function(e) { return Math.abs(e.variance||0) > 1.0; });
    var totalVar  = withData.reduce(function(s,e) { return s+(e.variance||0); }, 0);

    // ── Summary cards ──
    var sumEl = document.getElementById('prod-summary');
    if (sumEl) {
      var hppdColor = avgHppd ? (avgHppd > targetHppd ? 'var(--red2)' : 'var(--green2)') : 'var(--text3)';
      var varColor  = totalVar > 0 ? 'var(--green2)' : totalVar < 0 ? 'var(--red2)' : 'var(--text3)';
      sumEl.innerHTML =
        '<div style="display:flex;gap:10px;flex-wrap:wrap;width:100%;">' +

        '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;flex:1;min-width:130px;">' +
          '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Avg Census</div>' +
          '<div style="font-size:26px;font-weight:700;color:var(--white);">' + avgCensus + '</div>' +
          '<div style="font-size:10px;color:var(--text3);">' + withData.length + ' of ' + daysInMonth + ' days</div>' +
        '</div>' +

        '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;flex:1;min-width:130px;">' +
          '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Hrs Used (MTD)</div>' +
          '<div style="font-size:26px;font-weight:700;color:var(--accent2);">' + totalHrs.toFixed(0) + '</div>' +
          '<div style="font-size:10px;color:var(--text3);">productive hours</div>' +
        '</div>' +

        '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;flex:1;min-width:130px;">' +
          '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Avg HPPD</div>' +
          '<div style="font-size:26px;font-weight:700;color:' + hppdColor + ';">' + (avgHppd||'—') + '</div>' +
          '<div style="font-size:10px;color:var(--text3);">target ' + targetHppd.toFixed(2) + '</div>' +
        '</div>' +

        '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;flex:1;min-width:130px;">' +
          '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">MTD Variance</div>' +
          '<div style="font-size:26px;font-weight:700;color:' + varColor + ';">' + (totalVar > 0 ? '+' : '') + totalVar.toFixed(2) + '</div>' +
          '<div style="font-size:10px;color:var(--text3);">' + overDays.length + ' over · ' + underDays.length + ' under target</div>' +
        '</div>' +

        '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;flex:1;min-width:130px;">' +
          '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">High Variance Days</div>' +
          '<div style="font-size:26px;font-weight:700;color:' + (highVar.length > 3 ? 'var(--red2)' : 'var(--amber2)') + ';">' + highVar.length + '</div>' +
          '<div style="font-size:10px;color:var(--text3);">&gt;1.0 variance</div>' +
        '</div>' +

        '</div>';
    }

    // ── Variance Insights ──
    var insEl = document.getElementById('hppd-insights');
    if (insEl && withData.length > 0) {
      insEl.style.display = 'block';
      var chips = [];

      var avgVar = totalVar / (withData.length || 1);

      // Overall trend
      if (avgVar > 0.3) chips.push({ color:'var(--green2)', bg:'rgba(26,122,74,0.12)', border:'rgba(26,122,74,0.3)',
        icon:'✓', text:'Avg HPPD below target by ' + Math.abs(avgVar).toFixed(2) + ' — unit is operating efficiently' });
      else if (avgVar < -0.3) chips.push({ color:'var(--red2)', bg:'rgba(179,35,24,0.12)', border:'rgba(179,35,24,0.3)',
        icon:'⚠', text:'Avg HPPD exceeds target by ' + Math.abs(avgVar).toFixed(2) + ' — review staffing levels and census alignment' });
      else chips.push({ color:'var(--accent2)', bg:'rgba(46,125,209,0.1)', border:'rgba(46,125,209,0.25)',
        icon:'≈', text:'HPPD tracking close to target — good staffing balance' });

      // High variance days
      if (highVar.length > 0) {
        var hv = highVar.slice(0,3).map(function(e) {
          var d = new Date(e.date+'T12:00:00');
          return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' (' + (e.variance>0?'+':'') + (e.variance||0).toFixed(2) + ')';
        }).join(', ');
        chips.push({ color:'var(--amber2)', bg:'rgba(180,83,9,0.1)', border:'rgba(245,158,11,0.3)',
          icon:'📅', text:'High variance days: ' + hv + (highVar.length > 3 ? ' + ' + (highVar.length-3) + ' more' : '') });
      }

      // Negative variance explanation
      var negDays = withData.filter(function(e) { return (e.variance||0) < 0; });
      if (negDays.length > 0) chips.push({ color:'var(--red2)', bg:'rgba(179,35,24,0.08)', border:'rgba(179,35,24,0.2)',
        icon:'📖', text:'Negative variance = HPPD exceeded target — more hrs used per patient than budgeted. May reflect low census with fixed staffing, overtime, or extra staff for safety.' });

      var posDays = withData.filter(function(e) { return (e.variance||0) > 0; });
      if (posDays.length > 0) chips.push({ color:'var(--green2)', bg:'rgba(26,122,74,0.08)', border:'rgba(26,122,74,0.2)',
        icon:'📖', text:'Positive variance = HPPD below target — fewer hrs used per patient than budgeted. May reflect high census efficiently covered, or leaner staffing that day.' });

      // Best and worst day
      if (withData.length > 1) {
        var sorted = withData.slice().filter(function(e){return e.variance!==undefined;}).sort(function(a,b){return (b.variance||0)-(a.variance||0);});
        if (sorted.length > 0) {
          var best = sorted[0];
          var worst = sorted[sorted.length-1];
          var bestD = new Date(best.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
          var worstD = new Date(worst.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
          chips.push({ color:'var(--teal2)', bg:'rgba(14,116,144,0.1)', border:'rgba(6,182,212,0.25)',
            icon:'📊', text:'Best day: ' + bestD + ' (var +' + (best.variance||0).toFixed(2) + ', census ' + (best.census||'—') + ') · Worst day: ' + worstD + ' (var ' + (worst.variance||0).toFixed(2) + ', census ' + (worst.census||'—') + ')' });
        }
      }

      insEl.innerHTML = '<div style="margin-bottom:6px;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;">&#128161; Variance Insights</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;">' +
        chips.map(function(c) {
          return '<div style="background:' + c.bg + ';border:1px solid ' + c.border + ';border-radius:6px;padding:8px 12px;font-size:11px;color:' + c.color + ';display:flex;gap:8px;align-items:flex-start;">' +
            '<span style="flex-shrink:0;font-weight:700;">' + c.icon + '</span>' +
            '<span>' + c.text + '</span>' +
            '</div>';
        }).join('') + '</div>';
    } else if (insEl) {
      insEl.style.display = 'none';
    }

    // ── Table with Variance column ──
    var tEl = document.getElementById('prod-table');
    if (!tEl) return;

    tEl.innerHTML = '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:8px;">' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr style="background:rgba(255,255,255,0.05);">' +
        '<th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--text3);">Date</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);">ADC</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--amber2);">Day Stf</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--amber2);">Day Hrs</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent2);">Eve Stf</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent2);">Eve Hrs</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--teal2);">Ngt Stf</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--teal2);">Ngt Hrs</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent2);">Hrs Used</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);">Target Hrs</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--purple2);">No Safety</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);">Tgt HPPD</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);">Act HPPD</th>' +
        '<th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--white);">Variance</th>' +
        '<th style="padding:8px 10px;"></th>' +
      '</tr></thead><tbody>' +
      entries.map(function(e) {
        var hasData   = e.census || e.productiveHrs;
        var variance  = e.variance !== undefined ? e.variance : (e.census && e.productiveHrs && e.targetHppd ? Math.round((e.targetHppd - e.productiveHrs/e.census)*100)/100 : null);
        var actualH   = e.actualHppd || (e.census && e.productiveHrs ? Math.round(e.productiveHrs/e.census*100)/100 : null);
        var varColor  = variance === null ? 'var(--text3)' : variance > 0 ? 'var(--green2)' : variance < 0 ? 'var(--red2)' : 'var(--text3)';
        var varBg     = variance === null ? '' : variance > 1.0 ? 'rgba(26,122,74,0.1)' : variance < -1.0 ? 'rgba(179,35,24,0.1)' : '';
        var varStr    = variance !== null ? (variance > 0 ? '+' : '') + variance.toFixed(2) : '—';
        var dateStr   = new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        var safeDt    = e.date;

        return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);' + (!hasData?'opacity:0.35;':'') + varBg + '">' +
          '<td style="padding:8px 10px;font-size:11px;color:var(--white);">' + dateStr + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:12px;font-weight:600;color:var(--text2);">' + (e.census||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--amber2);">' + (e.shiftDay||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--amber2);opacity:.75;">' + (e.shiftDayHrs||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--accent2);">' + (e.shiftEve1||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--accent2);opacity:.75;">' + ((e.shiftEve1Hrs||0)+(e.shiftEve2Hrs||0)||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--teal2);">' + (e.shiftNight||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--teal2);opacity:.75;">' + (e.shiftNightHrs||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:12px;font-weight:600;color:var(--accent2);">' + (e.productiveHrs||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text3);">' + (e.targetHrs||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--purple2);">' + (e.hrsNoSafety||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text3);">' + (e.targetHppd||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:12px;font-weight:700;color:' + varColor + ';">' + (actualH||'—') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;font-size:13px;font-weight:700;color:' + varColor + ';">' + varStr + '</td>' +
          '<td style="padding:8px 10px;white-space:nowrap;">' +
            '<button onclick="openProdModal(\'' + safeDt + '\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color=\'var(--accent2)\'" onmouseout="this.style.color=\'var(--text3)\'">' + (hasData?'✎':'+') + '</button>' +
            (hasData ? '<button onclick="deleteProdEntry(\'' + safeDt + '\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color=\'var(--red2)\'" onmouseout="this.style.color=\'var(--text3)\'">✕</button>' : '') +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  };

})();


(function() {

  function parseHrs(val) {
    if (!val) return 0;
    val = String(val).trim();
    if (!val || val === '-') return 0;
    var parts = val.split(':');
    if (parts.length >= 2) {
      return Math.round((parseFloat(parts[0]) + parseFloat(parts[1]) / 60 + (parts[2] ? parseFloat(parts[2]) / 3600 : 0)) * 100) / 100;
    }
    return Math.round((parseFloat(val) || 0) * 100) / 100;
  }

  window.ot_runPasteImport = function() {
    var area   = document.getElementById('ot-paste-area');
    var status = document.getElementById('ot-import-status');
    if (!area || !area.value.trim()) {
      status.textContent = 'Paste UKG data first.';
      status.style.color = 'var(--red2)';
      return;
    }

    var ppEl = document.getElementById('ot-import-pp');
    var pp   = ppEl ? ppEl.value.trim() : '';
    if (!pp) {
      status.textContent = 'Enter a pay period date.';
      status.style.color = 'var(--amber2)';
      return;
    }

    var lines    = area.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
    var imported = 0;
    var skipped  = 0;

    // Ensure state.otLog exists
    if (typeof state === 'undefined' || !state) { status.textContent = 'State not ready.'; return; }
    if (!state.otLog) state.otLog = {};

    lines.forEach(function(line) {
      var cols = line.split('\t');
      if (cols.length < 3) { skipped++; return; }

      // Detect if col 0 is Early-In % (small number or %)
      var offset = 0;
      var first  = (cols[0] || '').trim().replace('%','');
      if (first !== '' && !isNaN(parseFloat(first)) && parseFloat(first) < 100 && cols[0].indexOf(',') === -1) {
        offset = 1;
      }

      var name     = (cols[offset]   || '').trim();
      // cols[offset+1] = Employee ID — skip
      var otHrs    = parseHrs((cols[offset+2] || '').trim());
      // cols[offset+3] = OT% — skip
      // cols[offset+4] = Location path — skip
      var prodRaw  = (cols[offset+5] || '').trim();   // Productivity HH:MM:SS
      var schedOT  = parseHrs((cols[offset+6] || '').trim());
      var unschedOT = parseHrs((cols[offset+7] || '').trim());

      // Validate name: must contain comma (Last, First format)
      if (!name || name.indexOf(',') === -1) { skipped++; return; }
      // Skip header rows
      if (name.toLowerCase().indexOf('employee') !== -1 || name.toLowerCase() === 'name') { skipped++; return; }
      // Skip rows with no OT at all
      if (otHrs <= 0 && schedOT <= 0 && unschedOT <= 0) { skipped++; return; }

      var totalOT = otHrs > 0 ? otHrs : (schedOT + unschedOT);

      var noteParts = [];
      if (schedOT > 0)   noteParts.push('Sched OT: ' + schedOT.toFixed(2) + 'h');
      if (unschedOT > 0) noteParts.push('Unsched OT: ' + unschedOT.toFixed(2) + 'h');
      if (prodRaw)        noteParts.push('Productivity: ' + prodRaw);
      noteParts.push('Imported from UKG');

      var entry = {
        payPeriod:  pp,
        regularHrs: 0,
        otHrs:      totalOT,
        premiumType: 'OT',
        approved:   false,
        notes:      noteParts.join(' | ')
      };

      if (!state.otLog[name]) state.otLog[name] = [];
      var idx = state.otLog[name].findIndex(function(r) { return r.payPeriod === pp; });
      if (idx >= 0) {
        state.otLog[name][idx] = entry;
      } else {
        state.otLog[name].unshift(entry);
      }
      imported++;
    });

    // Save using the same method as the rest of the app
    if (typeof persistSave === 'function') persistSave();

    status.textContent = imported + ' staff imported' + (skipped ? ', ' + skipped + ' skipped' : '') + ' \u2014 PP: ' + pp;
    status.style.color = imported > 0 ? 'var(--green2)' : 'var(--amber2)';

    // Refresh OT view and pay period dropdown
    if (typeof renderOtTab === 'function') renderOtTab();
    if (typeof populateOtPP === 'function') populateOtPP();
  };

})();
