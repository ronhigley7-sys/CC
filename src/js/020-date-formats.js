
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

