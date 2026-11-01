
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
