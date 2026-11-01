

// ══════════════════════════════════════════
// AUDIT ACKNOWLEDGMENT NOTIFICATIONS
// Checks Supabase (audit_acknowledgments) once per load for findings signed
// since the last check, and shows a banner. "Real" push notification isn't
// possible from a static site with no backend — this is the closest
// reliable substitute (checked every time CC is opened).
// ══════════════════════════════════════════
const AUDIT_ACK_SEEN_KEY = '_auditAckLastSeen';
async function checkAuditAcknowledgments(silent) {
  const cfg = (typeof getSBConfig === 'function') ? getSBConfig() : null;
  if (!cfg || !cfg.enabled || !cfg.url || !cfg.key) return;
  const lastSeen = localStorage.getItem(AUDIT_ACK_SEEN_KEY) || '1970-01-01T00:00:00Z';
  try {
    const r = await fetch(`${cfg.url}/rest/v1/audit_acknowledgments?select=staff_name,signed_at&status=eq.acknowledged&signed_at=gt.${encodeURIComponent(lastSeen)}&order=signed_at.desc`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    });
    if (!r.ok) return;
    const rows = await r.json();
    if (rows.length) {
      const names = [...new Set(rows.map(r => r.staff_name.split(',')[0]))].slice(0,3).join(', ');
      showSaveBanner(`✍️ ${rows.length} audit acknowledgment${rows.length>1?'s':''} returned — ${names}${rows.length>3?', …':''}`);
    }
    localStorage.setItem(AUDIT_ACK_SEEN_KEY, new Date().toISOString());
  } catch(e) { /* silent */ }
}
// Check once, shortly after load (gives Supabase config time to resolve)
setTimeout(() => checkAuditAcknowledgments(), 3000);



// Auto-populate huddle unit announcements with this week's birthdays and anniversaries
function huddleAutoPopulateWeek() {
  // Determine the week range from hud-week field or today
  const weekField = document.getElementById('hud-week');
  const weekVal   = weekField ? weekField.value.trim() : '';

  // Parse start date: try "M/D/YYYY" format from the week field, else use today
  let weekStart;
  const wm = weekVal.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (wm) {
    weekStart = new Date(parseInt(wm[3]), parseInt(wm[1])-1, parseInt(wm[2]));
  } else {
    weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  }
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const year = weekStart.getFullYear();

  // Helper: does a MM/DD date fall in this week?
  function inWeek(mmdd) {
    if (!mmdd) return false;
    const parts = mmdd.split('/');
    if (parts.length < 2) return false;
    const mo = parseInt(parts[0]) - 1;
    const dy = parseInt(parts[1]);
    const d = new Date(year, mo, dy);
    // Also check next year in case week spans year boundary
    return (d >= weekStart && d <= weekEnd);
  }

  // Helper: years since hire date
  function yearsSince(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return year - d.getFullYear();
  }

  // Helper: format display date from MM/DD
  function fmtMMDD(mmdd) {
    const parts = mmdd.split('/');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(parts[0])-1] + ' ' + parseInt(parts[1]);
  }

  const lines = [];

  // Birthdays this week
  const bdayStaff = MASTER_STAFF.filter(s => inWeek(state.birthdays[s.name]));
  if (bdayStaff.length) {
    lines.push('🎂 Birthdays This Week:');
    bdayStaff.forEach(s => {
      const mmdd = state.birthdays[s.name];
      lines.push('  ' + s.name.split(',')[0].trim() + ' — ' + fmtMMDD(mmdd));
    });
  }

  // Hire anniversaries this week
  const hireStaff = MASTER_STAFF.filter(s => {
    const hd = state.hireDates && state.hireDates[s.name];
    if (!hd) return false;
    const d = new Date(hd);
    if (isNaN(d)) return false;
    const mmdd = (d.getMonth()+1) + '/' + d.getDate();
    return inWeek(mmdd);
  });
  if (hireStaff.length) {
    if (lines.length) lines.push('');
    lines.push('📅 Work Anniversaries This Week:');
    hireStaff.forEach(s => {
      const yrs = yearsSince(state.hireDates[s.name]);
      lines.push('  ' + s.name.split(',')[0].trim() + (yrs ? ' — ' + yrs + ' year' + (yrs===1?'':'s') : ''));
    });
  }

  if (!lines.length) {
    showSaveBanner('No birthdays or anniversaries found for this week');
    return;
  }

  const el = document.getElementById('hud-unit');
  if (el) {
    const existing = el.value.trim();
    el.value = existing ? existing + '\n\n' + lines.join('\n') : lines.join('\n');
    huddleAutoSave();
    showSaveBanner('🎂 Added ' + bdayStaff.length + ' birthday(s) and ' + hireStaff.length + ' anniversary(ies)');
  }
}

function saveCert(name, field, val) {
  if (!state.certs[name]) state.certs[name] = {};
  if (state.certs[name][field] === val) return;
  state.certs[name][field] = val;
  persistSave();
  // Debounce banner and re-render so typing isn't interrupted
  clearTimeout(saveCert._timer);
  saveCert._timer = setTimeout(() => {
    showSaveBanner(`💾 ${field} saved`);
  }, 600);
}

function updateCertInputStyle(el, name, field) {
  const val = el.value;
  el.className = 'cert-input';
  if (val) {
    const cls = certClass(val);
    if (cls !== 'missing') el.classList.add('exp-' + cls);
  }
}

// ── Education Excel/CSV Import ──
function clearAllEdu() {
  if (!confirm('Clear all pending education items for all staff?\n\nThis will not affect certifications, certs, or other data. You can re-import from CSV at any time.')) return;
  state.pendingEdu = {};
  persistSave();
  showSaveBanner('✓ All pending education cleared');
  renderEducation();
}
function handleEduImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      let rows;
      if (file.name.toLowerCase().endsWith('.csv')) {
        rows = parseCSVText(ev.target.result);
      } else {
        if (typeof XLSX === 'undefined') { alert('XLSX library not loaded. Please use a CSV file.'); return; }
        const wb = XLSX.read(ev.target.result, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      }
      parseEduRows(rows);
    } catch(err) { alert('Error reading file: ' + err.message); }
  };
  if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

// Proper CSV parser that handles quoted fields containing commas
function parseCSVText(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let inQuote = false;
    let cur = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { cur += '"'; i++; } // escaped quote
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function parseEduRows(rows) {
  if (!rows.length) return;

  // Detect columns
  const header = rows[0].map(c => String(c||'').toLowerCase().trim());
  const empIdx  = header.findIndex(h => h.includes('employee') || h.includes('name') || h.includes('staff'));
  const itemIdx = header.findIndex(h => h.includes('learning') || h.includes('item') || h.includes('course') || h.includes('module') || h.includes('education'));
  const dueIdx  = header.findIndex(h => h.includes('due') || h.includes('date') || h.includes('expir'));

  const empCol  = empIdx  >= 0 ? empIdx  : 0;
  const itemCol = itemIdx >= 0 ? itemIdx : 1;
  const dueCol  = dueIdx  >= 0 ? dueIdx  : -1;
  const startRow = (empIdx >= 0 || itemIdx >= 0) ? 1 : 0;

  // Build map from this import: { name: [items] }
  const imported = {};
  for (let i = startRow; i < rows.length; i++) {
    const row  = rows[i];
    const name = String(row[empCol] || '').trim().replace(/\.$/, ''); // strip trailing period
    const item = String(row[itemCol] || '').trim();
    const due  = dueCol >= 0 ? String(row[dueCol] || '').trim() : '';
    if (!name || !item) continue;
    if (!imported[name]) imported[name] = [];
    const entry = due ? `${item} (Due: ${due})` : item;
    if (!imported[name].includes(entry)) imported[name].push(entry);
  }

  const importedCount = Object.keys(imported).length;
  if (!importedCount) {
    alert('No education data found. Check that your file has Employee and Learning Item columns.');
    return;
  }

  // Merge: only update staff who appear in this import
  // Staff not in the import keep their existing education list untouched
  let updatedCount = 0;
  let addedCount = 0;
  Object.entries(imported).forEach(([name, items]) => {
    const prev = state.pendingEdu[name] || [];
    state.pendingEdu[name] = items; // replace this person's items
    if (prev.length !== items.length || JSON.stringify(prev) !== JSON.stringify(items)) updatedCount++;
    addedCount += items.length;
  });

  persistSave();
  const totalItems = Object.values(state.pendingEdu).reduce((s, a) => s + a.length, 0);
  showSaveBanner(`✓ Education updated: ${importedCount} staff · ${addedCount} items imported · ${totalItems} total in system`);
  renderEducation();
}

// ── NOTIFY MODAL ──
let _notifyName = '';

function openNotifyModal(name) {
  _notifyName = name;
  const phone = state.phones[name] || '';
  const email = state.emails[name] || '';
  const items = getEduItems(name);
  const certs = state.certs[name] || {};

  // Build expiring certs list
  const expCerts = CERT_FIELDS.filter(f => {
    const cls = certClass(certs[f]);
    return cls === 'critical' || cls === 'soon';
  }).map(f => `${f}: expires ${certs[f]} (${certLabel(certs[f])})`);

  // Build default message
  let msg = `Hi ${name.split(',')[1]?.trim() || name},\n\nThis is a reminder that you have the following items requiring attention:\n\n`;
  if (items.length) {
    msg += `📚 PENDING EDUCATION (${items.length} items):\n`;
    items.forEach(i => msg += `  • ${i}\n`);
    msg += '\n';
  }
  if (expCerts.length) {
    msg += `⚠️ EXPIRING CERTIFICATIONS:\n`;
    expCerts.forEach(c => msg += `  • ${c}\n`);
    msg += '\n';
  }
  msg += `Please complete these items as soon as possible.\n\nThank you,\n3B Tele Med Surg Management`;

  document.getElementById('notify-message').value = msg;
  document.getElementById('notify-status').textContent = '';
  document.getElementById('notify-staff-info').innerHTML = `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:10px 14px;">
      <div style="font-weight:700;color:var(--white);font-size:13px;margin-bottom:6px;">${name}</div>
      <div style="font-size:11px;color:var(--text2);">
        📞 ${phone || '<span style="color:var(--text3)">No phone on file</span>'}
        &nbsp;&nbsp;·&nbsp;&nbsp;
        ✉️ ${email || '<span style="color:var(--text3)">No email on file</span>'}
      </div>
    </div>`;

  const modal = document.getElementById('notify-modal');
  modal.style.display = 'flex';
}

function closeNotifyModal() {
  document.getElementById('notify-modal').style.display = 'none';
  _notifyName = '';
}

function doNotify(type) {
  const name  = _notifyName;
  const phone = state.phones[name]  || '';
  const email = state.emails[name]  || '';
  const msg   = document.getElementById('notify-message').value;
  const status = document.getElementById('notify-status');

  if (type === 'sms') {
    if (!phone) { status.style.color='var(--red2)'; status.textContent='⚠ No phone number on file. Add it in the Directory tab.'; return; }
    const clean = phone.replace(/\D/g,'');
    const smsUrl = `sms:${clean}${/iPhone|iPad|iPod|Mac/i.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(msg)}`;
    window.open(smsUrl, '_self');
    status.style.color='var(--green2)';
    status.textContent=`✓ SMS opened for ${phone}`;
  } else if (type === 'email') {
    if (!email) { status.style.color='var(--red2)'; status.textContent='⚠ No email address on file. Add it in the Directory tab.'; return; }
    const subject = encodeURIComponent(`Education & Compliance Reminder — ${name}`);
    const body    = encodeURIComponent(msg);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self');
    status.style.color='var(--green2)';
    status.textContent=`✓ Email client opened for ${email}`;
  } else if (type === 'print') {
    const printWin = window.open('','_blank','width=700,height=800');
    const styleTag = '<st'+'yle>';
    const styleEnd = '</st'+'yle>';
    const scriptTag = '<scr'+'ipt>';
    const scriptEnd = '</scr'+'ipt>';
    printWin.document.write(
      '<!DOCTYPE html><html><head><title>Education Notice \u2014 ' + name + '</title>' +
      styleTag +
      'body{font-family:Arial,sans-serif;font-size:11pt;padding:40px;color:#000;}' +
      'h2{font-size:14pt;margin-bottom:4px;}.sub{color:#555;font-size:10pt;margin-bottom:20px;}' +
      'pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;}' +
      '.footer{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;font-size:9pt;color:#777;}' +
      styleEnd +
      '</head><body>' +
      '<h2>3B Tele Med Surg \u2014 Education &amp; Compliance Notice</h2>' +
      '<div class="sub">Printed: ' + new Date().toLocaleString() + '</div>' +
      '<pre>' + msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>' +
      '<div class="footer">3B Tele Med Surg &middot; AOMC Nursing Operations</div>' +
      scriptTag + 'window.onload=function(){window.print();}' + scriptEnd +
      '</body></html>'
    );
    printWin.document.close();
    status.style.color='var(--green2)';
    status.textContent='✓ Print window opened';
  }
}

// Close modal on backdrop click
document.getElementById('notify-modal').addEventListener('click', function(e) {
  if (e.target === this) closeNotifyModal();
});


//  NOTES
// ════════════════════════════════════
function initNotes() {
  state.activeNotesDate = state.dates[0] || null;
  renderNotesTabs();
  renderNotes();
}

function renderNotesTabs() {
  buildDateTabs('notes-date-tabs', state.activeNotesDate, 'selectNotesDate', renderNotes);
}

function selectNotesDate(d) {
  state.activeNotesDate = d;
  renderNotesTabs();
  renderNotes();
}

function renderNotes() {
  const dateKey = state.activeNotesDate;
  const cont = document.getElementById('notes-panels');
  if (!dateKey) { cont.innerHTML = '<div class="card" style="color:var(--text3);text-align:center;padding:30px;">No data loaded</div>'; return; }

  const shiftLabels = [
    {key:'DAY', label:'Day Shift (0700-1500)', icon:'☀️'},
    {key:'EVE', label:'Evening Shift (1500-1900)', icon:'🌆'},
    {key:'NIGHT', label:'Night Shift (1900-0700)', icon:'🌙'},
    {key:'GENERAL', label:'General / Unit Notes', icon:'📋'},
  ];

  cont.innerHTML = shiftLabels.map(s => {
    const noteKey = `${dateKey}|${s.key}`;
    const val = state.notes[noteKey] || '';
    return `<div class="card mb-10">
      <div class="card-header">
        <span class="card-title">${s.icon} ${s.label}</span>
        <span class="notes-saved" id="saved-${s.key}">✓ Saved</span>
      </div>
      <textarea class="notes-area" id="note-${s.key}" oninput="saveNote('${noteKey}','${s.key}',this.value)" placeholder="Enter notes, callouts, alerts, or reminders for this shift...">${val}</textarea>
    </div>`;
  }).join('');
}

function saveNote(noteKey, shiftKey, val) {
  state.notes[noteKey] = val;
  const saved = document.getElementById(`saved-${shiftKey}`);
  if (saved) { saved.classList.add('show'); setTimeout(()=>saved.classList.remove('show'), 1500); }
}

// ════════════════════════════════════
//  IMPORT / PARSER
// ════════════════════════════════════
const uploadZone = document.getElementById('upload-zone');
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

// Float Response drop zone
const floatZone = document.getElementById('float-upload-zone');
floatZone.addEventListener('dragover', e => { e.preventDefault(); floatZone.classList.add('drag-over'); });
floatZone.addEventListener('dragleave', () => floatZone.classList.remove('drag-over'));
floatZone.addEventListener('drop', e => { e.preventDefault(); floatZone.classList.remove('drag-over'); handleFloatFiles(e.dataTransfer.files); });

function handleFloatImport(e) { handleFloatFiles(e.target.files); e.target.value = ''; }

function handleFloatFiles(files) {
  if (!files.length) return;
  const file = files[0];
  logFloat(`Loading: ${file.name}`);
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let rows;
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = e.target.result;
        rows = text.split('\n').map(line => {
          const cols = []; let cur = '', inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
            else cur += ch;
          }
          cols.push(cur.trim().replace(/^"|"$/g,''));
          return cols;
        });
      } else {
        if (typeof XLSX === 'undefined') { logFloat('⚠ XLSX library not loaded.'); return; }
        const wb = XLSX.read(e.target.result, {type:'array'});

        // Log available sheets for debugging
        logFloat(`Sheets found: ${wb.SheetNames.join(', ')}`);

        // Try to find the raw data sheet — prefer the one with form responses
        const preferredNames = ['pub_gid', 'Form_Responses', 'Form Responses', 'FloatSitter', 'Data', 'Responses'];
        let sheetName = null;

        // First: look for a sheet whose name or first row contains Timestamp + Assignment Type
        for (const name of wb.SheetNames) {
          const ws = wb.Sheets[name];
          const testRows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', range:0});
          if (testRows.length > 0) {
            const hdr = testRows[0].map(c => String(c||'').toLowerCase());
            if (hdr.some(h=>h.includes('timestamp')) && hdr.some(h=>h.includes('assign'))) {
              sheetName = name;
              logFloat(`Using sheet: "${name}" (has Timestamp + Assignment columns)`);
              break;
            }
          }
        }

        // Fallback: sheet whose name includes known keywords
        if (!sheetName) {
          for (const pref of preferredNames) {
            const found = wb.SheetNames.find(n => n.toLowerCase().includes(pref.toLowerCase()));
            if (found) { sheetName = found; break; }
          }
        }

        // Last fallback: second sheet (index 1) which is often the raw data
        if (!sheetName) {
          sheetName = wb.SheetNames[1] || wb.SheetNames[0];
          logFloat(`Falling back to sheet: "${sheetName}"`);
        }

        const ws = wb.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
        logFloat(`Read ${rows.length} rows from "${sheetName}"`);
      }
      parseFloatRows(rows);
    } catch(err) { logFloat('Error: ' + err.message); }
  };
  if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function parseFloatRows(rows) {
  if (!rows || rows.length < 2) { logFloat('⚠ No data found.'); return; }

  // Find header row — matches either "date"/"timestamp" + "assign"/"type", or "name" + "role"
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i].map(c => String(c||'').toLowerCase().trim());
    const hasDateOrTs  = row.some(c => c.includes('date') || c.includes('timestamp'));
    const hasAssignOrType = row.some(c => c.includes('assign') || c.includes('type'));
    const hasName      = row.some(c => c === 'name' || c.includes('staff'));
    if ((hasDateOrTs && hasAssignOrType) || (hasName && hasAssignOrType)) {
      headerIdx = i; break;
    }
  }
  const header = rows[headerIdx].map(c => String(c||'').toLowerCase().trim());
  logFloat(`Header row ${headerIdx}: ${header.slice(0,12).join(' | ')}`);

  // Detect columns — handle your format: Name | Timestamp | Shift | Assignment | Role | Unit
  // and the original Google Form format with separate RN/CA/LPN name columns
  const ci = (keywords) => header.findIndex(h => keywords.some(k => h.includes(k)));

  const colDate    = ci(['timestamp','date']);
  const colRole    = ci(['role']);
  const colAsgn    = ci(['assignement type', 'assignment type', 'assignemnt', 'assignment', 'type']);
  const colDest    = ci(['destination', 'dest unit', 'unit']);

  // Simple single-name column (your format: col A = "Name" or "Staff Name")
  const colNameSimple = header.findIndex(h => h === 'name' || h === 'staff name' || h === 'staff');

  // Legacy Google Form multi-column name detection
  const colNameRN  = header.findIndex(h => h.includes('staff') && !h.includes('name'));
  const colNameCA  = header.findIndex((h,i) => h === 'name' && i > 5 && i < 10);
  const colNameLPN = header.findIndex((h,i) => (h === 'name_1' || h === 'name1') || (h === 'name' && i >= 9));
  const colNameAll = header.findIndex(h => h.includes('name_all'));

  logFloat(`Cols — Date:${colDate} Role:${colRole} Assign:${colAsgn} Dest:${colDest} NameSimple:${colNameSimple} NameRN:${colNameRN} NameCA:${colNameCA} NameLPN:${colNameLPN} NameAll:${colNameAll}`);

  // Build per-staff LAST float/sitter summary (MAXIFS equivalent)
  const summary = {}; // { name: { role, lastFloat, lastSitter, lastLPN2CA } }

  const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => c));

  dataRows.forEach(row => {
    // Get date
    let dateVal = row[colDate] || '';
    let dateStr = '';
    if (dateVal instanceof Date || (typeof dateVal === 'object' && dateVal && dateVal.getTime)) {
      const d = new Date(dateVal);
      dateStr = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
    } else {
      dateStr = String(dateVal).trim();
      // Normalize M/D/YYYY or MM/DD/YYYY
      const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) dateStr = `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
    }
    if (!dateStr || dateStr === 'undefined') return;

    const role  = String(row[colRole]||'').trim().toUpperCase();
    const asgn  = String(row[colAsgn]||'').trim().toLowerCase();
    const dest  = String(row[colDest]||'').trim().toLowerCase();

    // Resolve name — try simple "Name" column first (your format)
    let name = '';
    const tryCol = (c) => c >= 0 && row[c] ? String(row[c]).trim() : '';

    // Priority 1: simple Name column (col A in your hx float file)
    if (colNameSimple >= 0) {
      name = tryCol(colNameSimple);
    }

    // Priority 2: Name_All combined column (original Google Form format)
    if (!name) {
      const nameAllVal = tryCol(colNameAll >= 0 ? colNameAll : 12);
      if (nameAllVal && !nameAllVal.startsWith('=') && nameAllVal !== 'undefined') {
        name = nameAllVal;
      }
    }

    // Priority 3: role-specific columns (legacy format)
    if (!name) {
      if (role === 'RN')        name = tryCol(colNameRN);
      else if (role === 'LPN')  name = tryCol(colNameLPN) || tryCol(colNameCA);
      else if (role === 'CA')   name = tryCol(colNameCA)  || tryCol(colNameLPN);
      if (!name) name = tryCol(colNameRN) || tryCol(colNameCA) || tryCol(colNameLPN);
    }
    if (!name || name.startsWith('=') || name.toLowerCase() === 'undefined') return;

    if (!summary[name]) summary[name] = {
      role,
      lastFloat:'', floatCount:0,
      lastSitter:'', sitterCount:0,
      lastLPN2CA:'', lpn2caCount:0,
      lastCallOff:'', callOffCount:0,
      lastMandation:'', mandationCount:0,
      destCounts: {}, // { 'unit': count }
    };

    // Keep most recent date and increment count
    function isNewer(a, b) {
      if (!a) return false;
      if (!b) return true;
      const toYMD = s => { const p=s.split('/'); return p.length===3?`${p[2]}-${p[0]}-${p[1]}`:''; };
      return toYMD(a) > toYMD(b);
    }

    const destNorm = String(row[colDest]||'').trim() || 'Unknown';

    if (asgn === 'float') {
      if (isNewer(dateStr, summary[name].lastFloat)) summary[name].lastFloat = dateStr;
      summary[name].floatCount++;
      summary[name].destCounts[destNorm] = (summary[name].destCounts[destNorm]||0) + 1;
    } else if (asgn === 'sitter') {
      if (isNewer(dateStr, summary[name].lastSitter)) summary[name].lastSitter = dateStr;
      summary[name].sitterCount++;
      summary[name].destCounts[destNorm] = (summary[name].destCounts[destNorm]||0) + 1;
    } else if (asgn.includes('lpn') || asgn.includes('lpn to ca') || asgn.includes('lpn as ca')) {
      if (isNewer(dateStr, summary[name].lastLPN2CA)) summary[name].lastLPN2CA = dateStr;
      summary[name].lpn2caCount++;
    } else if (asgn === 'called off' || asgn === 'call off' || asgn === 'calledoff' || asgn === 'called_off' || asgn.includes('call')) {
      if (isNewer(dateStr, summary[name].lastCallOff)) summary[name].lastCallOff = dateStr;
      summary[name].callOffCount++;
    } else if (asgn === 'mandated' || asgn === 'mandation' || asgn.includes('mandat')) {
      if (isNewer(dateStr, summary[name].lastMandation)) summary[name].lastMandation = dateStr;
      summary[name].mandationCount++;
    }
  });

  // Store summary globally
  window._floatSummary = summary;
  // Also store raw rows for date-filtered tracking grid
  window._floatColMap = { colDate, colRole, colAsgn, colDest, colNameSimple, colNameRN, colNameCA, colNameLPN, colNameAll };
  sheetRows = dataRows;
  sheetLoadStatus = 'loaded';

  // Persist float summary — localStorage cache + Supabase
  try {
    localStorage.setItem('_floatSummaryData', JSON.stringify(summary));
    localStorage.setItem('_floatSheetRowCount', dataRows.length.toString());
  } catch(e) {}
  // Push to Supabase so it loads on next startup without re-importing
  const _fsCfg = getSBConfig();
  if (_fsCfg.enabled && _fsCfg.url && _fsCfg.key) {
    fetch(`${_fsCfg.url}/rest/v1/tracker_state`, {
      method: 'POST',
      headers: { apikey: _fsCfg.key, Authorization: `Bearer ${_fsCfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: 'float_summary', value: JSON.stringify(summary),
        updated_at: new Date().toISOString(), updated_by: _sbUserId || 'cc' })
    }).catch(() => {});
  }

  const staffCount = Object.keys(summary).length;
  logFloat(`✓ Processed ${dataRows.length} rows → ${staffCount} staff members with activity`);

  const statusEl = document.getElementById('float-import-status');
  if (statusEl) { statusEl.style.display = 'inline'; statusEl.textContent = `✓ ${staffCount} staff · ${dataRows.length} records`; }
  const subEl = document.getElementById('float-upload-sub');
  if (subEl) subEl.textContent = `✓ ${dataRows.length} records loaded — drop a new file to update`;

  renderTrackingGrid();
  showSaveBanner(`✓ Float Dashboard loaded — ${staffCount} staff records`);

  // ── Sync to Float & Sitter Board (fsb_3b3c_data) ──────────────
  syncFloatSummaryToBoard(summary);
}

// Write _floatSummary into the Float & Sitter Board's localStorage key
// so the board tab auto-updates without needing a separate import
function syncFloatSummaryToBoard(summary) {
  try {
    const BOARD_KEY = 'fsb_3b3c_data';
    const stored = localStorage.getItem(BOARD_KEY);
    if (!stored) return; // board hasn't been opened yet

    const boardData = JSON.parse(stored);

    const fieldMap = {
      lastFloat:     'float',
      lastSitter:    'sitter',
      lastCallOff:   'calloff',
      lastMandation: 'mandation',
      lastLPN2CA:    'lpnca',
    };

    // Format date M/D/YYYY → M/D/YYYY (already in that format from parseFloatRows)
    const fmtDate = d => d || '';

    // Update each role group
    ['rn','lpn','ca'].forEach(rk => {
      if (!boardData[rk]) return;
      boardData[rk].forEach(person => {
        // Try exact match first, then fuzzy (last name only)
        const lastName = person.name.split(',')[0].trim().toLowerCase();
        const match = summary[person.name]
          || Object.entries(summary).find(([k]) => k.split(',')[0].trim().toLowerCase() === lastName)?.[1];
        if (!match) return;

        Object.entries(fieldMap).forEach(([sumKey, boardKey]) => {
          if (match[sumKey]) {
            person[boardKey] = fmtDate(match[sumKey]);
          }
        });
      });

      // Rebuild update panels from most recent entries for this role
      const roleEntries = Object.entries(summary)
        .filter(([,v]) => v.role === rk.toUpperCase())
        .flatMap(([name, v]) => [
          v.lastFloat    ? {name, type:'Float',      time:v.lastFloat}    : null,
          v.lastSitter   ? {name, type:'Sitter',     time:v.lastSitter}   : null,
          v.lastCallOff  ? {name, type:'Call Off',   time:v.lastCallOff}  : null,
          v.lastLPN2CA   ? {name, type:'LPN as CA',  time:v.lastLPN2CA}   : null,
          v.lastMandation? {name, type:'Mandation',  time:v.lastMandation}: null,
        ])
        .filter(Boolean)
        .sort((a,b) => (b.time > a.time ? 1 : -1))
        .slice(0, 6);

      boardData[rk + 'Updates'] = roleEntries.map(e => ({
        name: e.name,
        type: e.type,
        time: e.time,
      }));
    });

    boardData.lastUpdated = new Date().toLocaleString('en-US',{month:'numeric',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
    localStorage.setItem(BOARD_KEY, JSON.stringify(boardData));

    // Also write to float_board key for Supabase sync
    localStorage.setItem('float_sitter_log_3b', localStorage.getItem('float_sitter_log_3b') || '[]');

    // Push to Supabase if connected
    if (typeof fsmSbPush === 'function') fsmSbPush();
    if (typeof fsbPush === 'function')   fsbPush();

    logFloat(`✓ Float & Sitter Board synced with ${Object.keys(summary).length} staff records`);
  } catch(e) {
    console.warn('syncFloatSummaryToBoard error:', e);
  }
}

function logFloat(msg) {
  const el = document.getElementById('float-import-log');
  if (!el) return;
  el.style.display = 'block';
  el.textContent += msg + '\n';
  el.scrollTop = el.scrollHeight;
}



function handleFileUpload(e) { handleFiles(e.target.files); }

function handleFiles(files) {
  if (!files.length) return;
  const file = files[0];
  logImport(`Loading: ${file.name}`);
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (typeof XLSX === 'undefined') { logImport('⚠ XLSX library not available in offline mode. Use paste method.'); return; }
      const wb = XLSX.read(e.target.result, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      parseUKGRows(rows);
    } catch(err) { logImport('Error: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

function parsePastedData() {
  const text = document.getElementById('paste-area').value.trim();
  if (!text) return;
  const rows = text.split('\n').map(r=>r.split('\t'));
  parseUKGRows(rows);
}

// ── Non-standard shift time helpers ──────────────────────────────
function shiftHours(shiftKey) {
  // Standard hours for each shift key; used to compute non-standard end times
  const h = {
    '0700-1500':8,'1500-1900':4,'1900-0700':12,
    '0630-1430':8,'1430-1830':4,'1830-2230':4,'2230-0630':8,
    '1500-2300':8,'2300-0700':8,'1100-2300':12,'1500-0300':12,
  };
  return h[shiftKey] || 8;
}
function computeEndTime(startNorm, hours) {
  // startNorm is "HHMM" 24hr; returns "HHMM" string
  if (!startNorm || startNorm.length < 4) return null;
  const h = parseInt(startNorm.slice(0,2),10);
  const m = parseInt(startNorm.slice(2,4),10);
  const total = (h*60 + m + hours*60) % (24*60);
  const eh = Math.floor(total/60), em = total%60;
  return String(eh).padStart(2,'0') + String(em).padStart(2,'0');
}
function fmtShiftTime(t) {
  // "1430" → "14:30"
  if (!t || t.length < 4) return t||'';
  return t.slice(0,2) + ':' + t.slice(2,4);
}

function parseUKGRows(rows) {
  logImport('Parsing ' + rows.length + ' rows...');

  // ── Exact UKG Condensed Staffing column map (26 cols) ──
  // Day:   col 0=Name, col 3=Start, col 5=JobTitle
  // Eve1:  col 8=Name, col 11=Start, col 12=JobTitle
  // Eve2:  col 15=Name, col 16=Start, col 17=JobTitle
  // Night: col 20=Name, col 23=Start, col 24=JobTitle
  const COLS = {
    Day:   { name:0,  start:3,  job:5  },
    Eve1:  { name:8,  start:11, job:12 },
    Eve2:  { name:15, start:16, job:17 },
    Night: { name:20, start:23, job:24 },
  };

  const SKIP_JOBS = ['NURSE MGR','NURSE MGR.'];
  const SKIP_NAMES = ['higley, ronald'];

  // Map UKG job title + shift section → internal shift key
  function resolveShift(section, job, startRaw) {
    const start = String(startRaw||'').replace(/[:\s]/g,'').replace(/^(\d{1,2})(\d{2}).*$/,'$1$2');
    const j = String(job||'').toUpperCase();
    if (j === 'CA') {
      if (section==='Day')   return '0630-1430';
      if (section==='Eve1')  return '1430-1830';
      if (section==='Eve2')  return '1830-2230';
      if (section==='Night') return '2230-0630';
    }
    if (j === 'UC') {
      if (section==='Day')   return '0700-1500';
      if (section==='Eve1' || section==='Eve2') return '1500-2300';
      if (section==='Night') return '2300-0700';
    }
    // RN / LPN
    if (section==='Day')   return '0700-1500';
    if (section==='Eve1')  return '1500-1900';
    // Eve2 and Night: both go 1900-0700 regardless of start
    return '1900-0700';
  }

  const newPlacements = {};
  const newDates = [];
  let currentDate = null;
  const seen = {}; // dedupe: "date|shift|name"

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // ── Detect date line: col 14 contains "Date: Mon 5/11/2026" ──
    const dateCell = String(row[14]||'').trim();
    const dateMatch = dateCell.match(/Date:\s*\w+\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dateMatch) {
      currentDate = normalizeDate(dateMatch[1]);
      if (!newDates.includes(currentDate)) newDates.push(currentDate);
      if (!newPlacements[currentDate]) newPlacements[currentDate] = {};
      logImport('  Date: ' + currentDate);
      continue;
    }

    // ── Skip header/meta rows ──
    if (!currentDate) continue;
    const first = String(row[0]||'').trim();
    if (!first) {
      // might still have Night-only entries (cols 20+)
    }
    const SKIP_FIRST_VALS = ['Employee','Day','Eve1','Eve2','Night'];
    if (first.startsWith('Location:') || first.startsWith('Unit:') || SKIP_FIRST_VALS.includes(first)) continue;
    // Skip rows where Eve1 name col is a header word (catches row-7 style header rows)
    if (String(row[8]||'').trim() === 'Employee') continue;

    // ── Parse each of the 4 sections from this row ──
    Object.entries(COLS).forEach(([section, c]) => {
      const name = String(row[c.name]||'').trim();
      const start = row[c.start];
      const job   = String(row[c.job]||'').trim().toUpperCase();

      if (!name) return;
      if (SKIP_JOBS.includes(job)) return;
      if (SKIP_NAMES.includes(name.toLowerCase())) return;

      const shift = resolveShift(section, job, start);
      const dedupeKey = `${currentDate}|${shift}|${name}`;
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;

      const role = job || (MASTER_STAFF.find(m=>m.name===name)||{}).job || 'RN';
      if (!newPlacements[currentDate][shift]) newPlacements[currentDate][shift] = [];

      // Store raw start time; flag if non-standard for this shift key
      const STANDARD_STARTS = {
        '0700-1500':'0700','1500-1900':'1500','1900-0700':'1900',
        '0630-1430':'0630','1430-1830':'1430','1830-2230':'1830','2230-0630':'2230',
        '1500-2300':'1500','2300-0700':'2300','1100-2300':'1100','1500-0300':'1500',
      };
      const SHIFT_END = {
        '0700-1500':'1500','1500-1900':'1900','1900-0700':'0700',
        '0630-1430':'1430','1430-1830':'1830','1830-2230':'2230','2230-0630':'0630',
        '1500-2300':'2300','2300-0700':'0700','1100-2300':'2300','1500-0300':'0300',
      };
      const startNorm = String(start||'').replace(/[:\s]/g,'').replace(/^(\d{1,2})(\d{2}).*$/,
        (_,h,m)=>h.padStart(2,'0')+m);
      const stdStart  = STANDARD_STARTS[shift];
      const isNonStd  = startNorm && stdStart && startNorm !== stdStart;
      const endNorm   = isNonStd ? computeEndTime(startNorm, (role === 'RN' || role === 'LPN') ? 12 : shiftHours(shift)) : null;

      const entry = {name, role};
      if (isNonStd && startNorm) { entry.customStart = startNorm; entry.customEnd = endNorm; }
      newPlacements[currentDate][shift].push(entry);
    });
  }

  if (newDates.length > 0) {
    state.dates = newDates.sort();
    state.placements = newPlacements;
    state.activeBoardDate = state.dates[0];
    state.activeChargeDate = state.dates[0];
    state.activeNotesDate = state.dates[0];
    const total = Object.values(newPlacements).reduce((a,d)=>a+Object.values(d).reduce((b,s)=>b+s.length,0),0);
    logImport(`✓ Loaded ${newDates.length} date(s), ${total} placements`);
    initAll();
  } else {
    logImport('⚠ No date data found. Ensure UKG format with dates in first column.');
  }
}

function normalizeDate(str) {
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
  const [m,d,y] = str.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

function logImport(msg) {
  const el = document.getElementById('import-log');
  el.style.display = 'block';
  el.textContent += msg + '\n';
  el.scrollTop = el.scrollHeight;
}

// ════════════════════════════════════
//  EXPORT CSV
// ════════════════════════════════════
function exportCSV() {
  let csv = 'Date,Shift,Role,Name,Charge\n';
  state.dates.forEach(d => {
    const shifts = state.placements[d] || {};
    Object.entries(shifts).forEach(([shift, placements]) => {
      placements.forEach(p => {
        const isCharge = state.chargeNurses[`${d}|${shift}`] === p.name ? 'YES' : '';
        csv += `"${d}","${shift}","${p.role}","${p.name}","${isCharge}"\n`;
      });
    });
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '3B_Staffing_Export.csv';
  a.click();
}

// ════════════════════════════════════
//  DEMO DATA (so app isn't empty)
// ════════════════════════════════════
function loadDemoData() {
  // Use current week's dates so demo board is always current
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const makeDateKey = d => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + d);
    return dt.toISOString().split('T')[0];
  };
  const d0 = makeDateKey(0), d1 = makeDateKey(1), d2 = makeDateKey(2), d3 = makeDateKey(3);
  const dates = [d0, d1, d2, d3];

  const placements = {
    [d0]: {
      '0700-1500': [{name:'Chaves Garcia, Tabata',role:'RN'},{name:'Hunsinger, Jennifer J',role:'RN'},{name:'Kitching, Jill',role:'RN'},{name:'Murphy, Stephanie',role:'RN'},{name:'San Li, Jin',role:'RN'},{name:'Tye, Amber M',role:'RN'}],
      '1500-1900': [{name:'Chaves Garcia, Tabata',role:'RN'},{name:'Hunsinger, Jennifer J',role:'RN'},{name:'Kitching, Jill',role:'RN'},{name:'Murphy, Stephanie',role:'RN'},{name:'San Li, Jin',role:'RN'},{name:'Tye, Amber M',role:'RN'}],
      '1900-0700': [{name:'Barringer, Heather',role:'RN'},{name:'Caswell, Kaleigh',role:'RN'},{name:'Condame, Robin E',role:'RN'},{name:'Goree, Kadian O',role:'RN'},{name:'Muller, Laurel A',role:'RN'},{name:'Robenson, Jean-Pierre',role:'RN'}],
      '0630-1430': [],
      '1430-1830': [{name:'Barnhart, Adriana C',role:'CA'},{name:'Riedl, Sarah E',role:'CA'}],
      '1830-2230': [{name:'Barnhart, Adriana C',role:'CA'},{name:'Batario, John Richard Craig',role:'CA'},{name:'Donohoe, Nicola',role:'CA'},{name:'Fitzgerald, Kimberly A',role:'CA'},{name:'Riedl, Sarah E',role:'CA'}],
      '2230-0630': [{name:'Donohoe, Nicola',role:'CA'},{name:'Fitzgerald, Kimberly A',role:'CA'},{name:'Mosher, Cassie L',role:'CA'},{name:'Michaels, Alex J',role:'CA'}],
      '0700-1500_uc': [],
      '1500-2300': [{name:'Armstrong, Katelyn N',role:'UC'}],
      '2300-0700': [],
    },
    [d1]: {
      '0700-1500': [{name:'Alexander, Jessica L',role:'RN'},{name:'Cannon, Kelly',role:'RN'},{name:'Dean, Kelly L',role:'RN'},{name:'Dibble, Martha',role:'RN'},{name:'Hatala, Carrie A',role:'RN'}],
      '1500-1900': [{name:'Alexander, Jessica L',role:'RN'},{name:'Cannon, Kelly',role:'RN'}],
      '1900-0700': [{name:'Cole, Curtiss K',role:'RN'},{name:'Comiso, Deejay',role:'RN'},{name:'Fombe, Rose',role:'RN'},{name:'Hanyon, Sean',role:'RN'}],
      '1430-1830': [{name:'Christiansen, Deanna M',role:'CA'},{name:'Cook, Mark',role:'CA'}],
      '1830-2230': [{name:'Christiansen, Deanna M',role:'CA'},{name:'Hunter, Tyree',role:'CA'}],
      '2230-0630': [{name:'Kathan, Jenna L',role:'CA'},{name:'King, Lakya',role:'CA'}],
      '1500-2300': [{name:'Armstrong, Katelyn N',role:'UC'}],
    },
    [d2]: {
      '0700-1500': [{name:'Hopkins, Sharon',role:'RN'},{name:'Irwin, Riley',role:'RN'},{name:'Johnson, Alyssa',role:'RN'},{name:'Jones, Samantha F',role:'RN'}],
      '1900-0700': [{name:'Knight, Robin V',role:'RN'},{name:'Kratzberg, Jade A',role:'RN'},{name:'Lee, Olajumoke M',role:'RN'}],
      '1430-1830': [{name:'Mansour, Ryma N',role:'CA'}],
      '1830-2230': [{name:'Morton, Madison A',role:'CA'},{name:'Pierce, Wesley J',role:'CA'}],
      '2230-0630': [{name:'Porter, Alannah R',role:'CA'}],
      '0700-1500_uc': [{name:'Armstrong, Katelyn N',role:'UC'}],
    },
    [d3]: {
      '0700-1500': [{name:'Quinlan, Meghan M',role:'RN'},{name:'Robinson, Miranda J',role:'RN'},{name:'Thomas, Jamie',role:'RN'},{name:'Walker, Katie L',role:'RN'}],
      '1500-1900': [{name:'Robinson, Miranda J',role:'RN'}],
      '1900-0700': [{name:'Wingler, Matthew',role:'RN'},{name:'Burkhart, Danielle M',role:'RN'},{name:'Diederich, Sherry L',role:'RN'}],
      '1430-1830': [{name:'Satterlee, Morgan M',role:'CA'}],
      '1830-2230': [{name:'Schilling, Saria M',role:'CA'},{name:'Stoyle, Carmella',role:'CA'}],
      '2230-0630': [{name:'VanAlstine, Alexa M',role:'CA'}],
      '1500-2300': [{name:'Armstrong, Katelyn N',role:'UC'}],
    }
  };
  state.dates = dates;
  state.placements = placements;
  state.activeBoardDate = dates[0];
  state.activeChargeDate = dates[0];
  state.activeNotesDate = dates[0];
}

// ════════════════════════════════════
//  INIT ALL
// ════════════════════════════════════
// ════════════════════════════════════
//  RISK ASSESSMENT
// ════════════════════════════════════

// Minimum staffing requirements per shift
const RISK_REQS_DEFAULT = {
  // RN/LPN shifts
  '0700-1500': { RN: 6, LPN: 1, CA: 0, UC: 1 },
  '1500-1900': { RN: 6, LPN: 1, CA: 0, UC: 0 },
  '1900-0700': { RN: 6, LPN: 1, CA: 0, UC: 0 },
  // CA shifts
  '0630-1430': { RN: 0, LPN: 0, CA: 4, UC: 0 },
  '1430-1830': { RN: 0, LPN: 0, CA: 4, UC: 0 },
  '1830-2230': { RN: 0, LPN: 0, CA: 4, UC: 0 },
  '2230-0630': { RN: 0, LPN: 0, CA: 4, UC: 0 },
  // UC shifts
  '0700-1500_uc': { RN: 0, LPN: 0, CA: 0, UC: 1 },
  '1500-2300':    { RN: 0, LPN: 0, CA: 0, UC: 1 },
  '2300-0700':    { RN: 0, LPN: 0, CA: 0, UC: 1 },
  // Extended CA shifts
  '0630-1830': { RN: 0, LPN: 0, CA: 1, UC: 0 },
  '1430-0300': { RN: 0, LPN: 0, CA: 1, UC: 0 },
  '1830-0630': { RN: 0, LPN: 0, CA: 1, UC: 0 },
};

// Live getter — merges state overrides on top of defaults
function getRiskReqs() {
  const overrides = state.shiftTargets || {};
  const result = {};
  Object.entries(RISK_REQS_DEFAULT).forEach(([shift, def]) => {
    const merged = Object.assign({}, def, overrides[shift] || {});
    // 3B/3C hard minimums: never allow saved/custom targets below baseline.
    Object.keys(def).forEach(role => {
      if (typeof def[role] === 'number' && typeof merged[role] === 'number') {
        merged[role] = Math.max(def[role], merged[role]);
      }
    });
    result[shift] = merged;
  });
  return result;
}

// Backwards-compat alias used by existing risk/nineBox code
const RISK_REQS = RISK_REQS_DEFAULT;

const RISK_SHIFT_LABELS = {
  '0700-1500': 'Day (0700–1500)',
  '1430-1830': 'Eve Early (1430–1830)',
  '1830-2230': 'Eve Late (1830–2230)',
  '2230-0630': 'Night (2230–0630)',
};

function renderRisk() {
  const content = document.getElementById('risk-content');
  const statsDiv = document.getElementById('risk-summary-stats');
  const badge    = document.getElementById('risk-overall-badge');

  if (!content) return;

  if (!state.dates.length) {
    content.innerHTML = `<div class="risk-no-data"><div class="risk-no-data-icon">📋</div>No staffing data loaded.<br>Use the Import tab to load a UKG file.</div>`;
    statsDiv.innerHTML = '';
    badge.className = 'risk-overall-badge';
    badge.textContent = '';
    return;
  }

  let totalFlags = 0;
  let totalCrit = 0;
  let datesWithIssues = 0;
  let html = '';

  state.dates.forEach(dateKey => {
    const shifts = state.placements[dateKey] || {};
    const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    let dateFlags = [];
    let dateHasIssues = false;
    let shiftRowsHtml = '';

    Object.entries(getRiskReqs()).forEach(([shift, req]) => {
      const staff = shifts[shift] || [];
      const rnCount  = staff.filter(p => p.role === 'RN').length;
      const lpnCount = staff.filter(p => p.role === 'LPN').length;
      const caCount  = staff.filter(p => p.role === 'CA').length;

      const roles = [
        { key: 'RN',  got: rnCount,  need: req.RN,  label: 'RN',  colorClass: 'rr-rn'  },
        { key: 'LPN', got: lpnCount, need: req.LPN, label: 'LPN', colorClass: 'rr-lpn' },
        { key: 'CA',  got: caCount,  need: req.CA,  label: 'CA',  colorClass: 'rr-ca'  },
      ];

      // Build flags for this shift
      let shiftFlags = [];
      roles.forEach(r => {
        const deficit = r.need - r.got;
        if (deficit > 0) {
          const isCrit = deficit >= 2 || (r.key === 'RN' && deficit >= 1);
          shiftFlags.push({
            severity: isCrit ? 'crit' : 'warn',
            icon: isCrit ? '🚨' : '⚠️',
            text: `<strong>${RISK_SHIFT_LABELS[shift]}</strong>: ${r.key} short by <strong>${deficit}</strong> (have ${r.got}, need ${r.need})`,
          });
          if (isCrit) totalCrit++;
          totalFlags++;
          dateHasIssues = true;
        }
      });

      dateFlags = dateFlags.concat(shiftFlags);

      // Build bar visualisation for this shift — skip if all roles are fully staffed (green)
      const allGreen = roles.every(r => r.got >= r.need);
      if (allGreen) return; // skip fully staffed shifts entirely

      const barRowsHtml = roles.map(r => {
        const pct = Math.min(100, r.need > 0 ? (r.got / r.need) * 100 : 100);
        const targetPct = 100; // target line always at 100%
        const cls = r.got >= r.need ? 'safe' : (r.got >= r.need - 1 && r.need > 1) ? 'warn' : 'crit';
        const countCls = cls;
        const suffix = `${r.got}/${r.need}`;
        return `<div class="risk-role-bar">
          <span class="risk-role-label ${r.colorClass}">${r.label}</span>
          <div class="risk-bar-track">
            <div class="risk-bar-fill ${cls}" style="width:${pct}%"></div>
            <div class="risk-bar-target-line" style="left:${targetPct}%;display:${targetPct<=100?'block':'none'}"></div>
          </div>
          <span class="risk-count-label ${countCls}">${suffix}</span>
        </div>`;
      }).join('');

      const flagsHtml = shiftFlags.map(f =>
        `<div class="risk-flag ${f.severity}"><span class="risk-flag-icon">${f.icon}</span><span class="risk-flag-text">${f.text}</span></div>`
      ).join('');

      shiftRowsHtml += `<div class="risk-shift-row">
        <div class="risk-shift-name">${RISK_SHIFT_LABELS[shift]}</div>
        <div><div class="risk-role-bars">${barRowsHtml}</div>${flagsHtml}</div>
      </div>`;
    });

    if (dateHasIssues) datesWithIssues++;

    const issueCount = dateFlags.length;
    const critCount = dateFlags.filter(f => f.severity === 'crit').length;
    const issueCls = issueCount === 0 ? 'zero' : 'has-issues';
    const issueLabel = issueCount === 0 ? '✓ Fully staffed' : `${issueCount} issue${issueCount > 1 ? 's' : ''}${critCount ? ' · ' + critCount + ' critical' : ''}`;
    const bodyContent = issueCount === 0
      ? `<div class="risk-all-clear"><span style="font-size:16px;">✅</span> All shifts meet minimum requirements for this date.</div>`
      : shiftRowsHtml;

    html += `<div class="risk-date-card">
      <div class="risk-date-header" onclick="toggleRiskCard(this)">
        <div>
          <span class="risk-date-label">${dateLabel}</span>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text3);margin-left:10px;">${dateKey}</span>
        </div>
        <div class="risk-date-meta">
          <span class="risk-issue-count ${issueCls}">${issueLabel}</span>
          <span style="color:var(--text3);font-size:12px;" class="risk-chevron">▾</span>
        </div>
      </div>
      <div class="risk-date-body ${issueCount > 0 ? 'open' : ''}">
        ${bodyContent}
      </div>
    </div>`;
  });

  content.innerHTML = html;

  // Summary stats
  const totalDates = state.dates.length;
  statsDiv.innerHTML = `
    <div class="stat-chip"><div class="stat-num" style="color:${totalCrit > 0 ? 'var(--red2)' : 'var(--green2)'}">${totalCrit}</div><div class="stat-label">Critical Gaps</div></div>
    <div class="stat-chip"><div class="stat-num" style="color:${totalFlags > 0 ? 'var(--amber2)' : 'var(--green2)'}">${totalFlags}</div><div class="stat-label">Total Flags</div></div>
    <div class="stat-chip"><div class="stat-num" style="color:${datesWithIssues > 0 ? 'var(--amber2)' : 'var(--green2)'}">${datesWithIssues}/${totalDates}</div><div class="stat-label">Dates w/ Issues</div></div>
    <div class="stat-chip"><div class="stat-num" style="color:var(--green2)">${totalDates - datesWithIssues}</div><div class="stat-label">Fully Staffed Days</div></div>
  `;

  if (badge) {
    badge.className = 'risk-overall-badge ' + (totalCrit > 0 ? 'critical' : totalFlags > 0 ? 'warn' : 'safe');
    badge.textContent = totalCrit > 0 ? '🚨 CRITICAL GAPS' : totalFlags > 0 ? '⚠️ UNDERSTAFFED' : '✓ ALL CLEAR';
  }
}

function toggleRiskCard(header) {
  const body = header.nextElementSibling;
  body.classList.toggle('open');
  header.querySelector('.risk-chevron').textContent = body.classList.contains('open') ? '▴' : '▾';
}

// ════════════════════════════════════
//  LOCAL STORAGE PERSISTENCE
// ════════════════════════════════════
const LS_KEY = '3B_StaffApp_v1';

// ══════════════════════════════════════════
// SHAREPOINT SYNC — Multi-user live updates
// ══════════════════════════════════════════
// Setup: In SharePoint, create a List named "3BTrackerSync" with one column:
//   Column name: "AppData" (Multiple lines of text — Plain text, unlimited)
// Then paste your SharePoint site URL below and enable sync.

// ════════════════════════════════════════════════════════════════
//  SUPABASE REAL-TIME SYNC
//  Free at supabase.com — replaces localStorage with cloud backend
// ════════════════════════════════════════════════════════════════

const SB_CONFIG_KEY = '_sbConfig';
let _sbClient    = null;   // Supabase JS client
let _sbChannel   = null;   // realtime channel
let _sbConnected = false;
let _sbSaving    = false;
let _sbUserId    = null;   // this browser's user ID
let _sbSaveTimer = null;

// Load saved config
// Fallback Supabase project — used whenever this browser has no saved
// sync config (e.g. right after a cache clear / new device / private window).
// This is the same project already used elsewhere in this file as a
// hardcoded fallback (float sheet restore, orientation sheets, etc), so
// it's safe to treat it as this app's real "home" project.
const SB_DEFAULT_CONFIG = {
  enabled: true,
  url: 'https://xnsdvdfceflmagfhpycw.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhuc2R2ZGZjZWZsbWFnZmhweWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTk1NjgsImV4cCI6MjA5NDk5NTU2OH0.UzKZQj4BLxPpH_OCwQR8LyDUeP9YlKn5UtXRFUFaYKA'
};

function getSBConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SB_CONFIG_KEY) || '{}');
    if (saved && saved.enabled && saved.url && saved.key) return saved;
    return { ...SB_DEFAULT_CONFIG, ...saved };
  } catch(e) { return SB_DEFAULT_CONFIG; }
}

// ════════════════════════════════════════════════════════════════
//  SUPABASE STORAGE — file uploads (contracts, staff documents)
//  Bucket: cc-docs — must be created once in the Supabase dashboard
//  (Storage → New bucket → name "cc-docs" → Public bucket = ON), with
//  anon insert/select/delete/update policies on storage.objects.
// ════════════════════════════════════════════════════════════════
const SB_DOCS_BUCKET = 'cc-docs';

function sbSanitizePathPart(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/_{2,}/g, '_').slice(0, 120);
}

// Uploads a File object to Supabase Storage. Returns { ok, path, url, error }.
async function sbUploadFile(path, file) {
  const cfg = getSBConfig();
  if (!cfg.url || !cfg.key) return { ok:false, error:'Supabase not configured' };
  try {
    const r = await fetch(`${cfg.url}/storage/v1/object/${SB_DOCS_BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    });
    if (!r.ok) {
      const msg = await r.text().catch(()=> '');
      return { ok:false, error: `Upload failed (${r.status}): ${msg.slice(0,200)}` };
    }
    return { ok:true, path, url: sbFileUrl(path) };
  } catch(e) {
    return { ok:false, error: e.message || 'Upload error' };
  }
}

// Public URL for a stored file (bucket must be public — see setup note above).
function sbFileUrl(path) {
  const cfg = getSBConfig();
  return `${cfg.url}/storage/v1/object/public/${SB_DOCS_BUCKET}/${path}`;
}

// Deletes a stored file. Returns { ok, error }.
async function sbDeleteFile(path) {
  const cfg = getSBConfig();
  if (!cfg.url || !cfg.key) return { ok:false, error:'Supabase not configured' };
  try {
    const r = await fetch(`${cfg.url}/storage/v1/object/${SB_DOCS_BUCKET}/${path}`, {
      method: 'DELETE',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
    });
    return r.ok ? { ok:true } : { ok:false, error:`Delete failed (${r.status})` };
  } catch(e) {
    return { ok:false, error: e.message || 'Delete error' };
  }
}

// ════════════════════════════════════════════════════════════════
//  P&L BUDGET VS ACTUAL — synced from Supabase budget_income_statement
//  (populated by periodic "Income Statement - Repeat By Report" imports —
//  see Budget tab)
// ════════════════════════════════════════════════════════════════
let _pnlRows = [];

async function loadPnlBudget() {
  const cfg = getSBConfig();
  const tblEl = document.getElementById('pnl-budget-table');
  if (!cfg.enabled || !cfg.url || !cfg.key) {
    if (tblEl) tblEl.innerHTML = '<div style="color:var(--text3);font-size:12px;">Supabase not connected.</div>';
    return;
  }
  try {
    const r = await fetch(`${cfg.url}/rest/v1/budget_income_statement?select=*&order=period.desc,line_seq.asc`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    _pnlRows = await r.json();
  } catch(e) {
    if (tblEl) tblEl.innerHTML = `<div style="color:var(--red2);font-size:12px;">⚠️ Load failed: ${e.message}</div>`;
    return;
  }
  const periods = [...new Set(_pnlRows.map(r => r.period))].sort().reverse();
  const sel = document.getElementById('pnl-period-select');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = periods.map(p => `<option value="${p}">${p}</option>`).join('');
    if (periods.includes(cur)) sel.value = cur;
  }
  renderPnlBudget();
}

function renderPnlBudget() {
  const sel = document.getElementById('pnl-period-select');
  const period = sel ? sel.value : null;
  const rows = _pnlRows.filter(r => !period || r.period === period);
  const summaryEl = document.getElementById('pnl-budget-summary');
  const tblEl = document.getElementById('pnl-budget-table');
  if (!tblEl) return;
  if (!rows.length) {
    tblEl.innerHTML = '<div style="color:var(--text3);font-size:12px;">No budget data imported yet — see memory/notes for the Supabase import steps.</div>';
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }

  const fmt = n => (n === null || n === undefined) ? '—' : Number(n).toLocaleString('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
  const pct = n => (n === null || n === undefined) ? '—' : (Number(n)*100).toFixed(1) + '%';

  const KEY_LINES = ['Overtime', 'Salaries and Wages', 'Regular Pay', 'Contract Labor - Clinical Staff', 'Operating Expenses'];
  if (summaryEl) {
    summaryEl.innerHTML = KEY_LINES.map(name => {
      const row = rows.find(r => r.ledger_account === name);
      if (!row) return '';
      const over = Number(row.actuals) > Number(row.budget);
      return `<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:10px 14px;min-width:150px;">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.03em;">${name}</div>
        <div style="font-size:16px;font-weight:700;color:${over ? 'var(--red2)' : 'var(--green2)'};">${fmt(row.actuals)}</div>
        <div style="font-size:11px;color:var(--text3);">Budget ${fmt(row.budget)} · ${pct(row.pct_variance)} var</div>
      </div>`;
    }).join('');
  }

  tblEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:11px;min-width:560px;">
    <thead><tr style="border-bottom:1px solid var(--border);">
      <th style="text-align:left;padding:6px 8px;color:var(--text3);">Ledger Account</th>
      <th style="text-align:right;padding:6px 8px;color:var(--text3);">Actuals</th>
      <th style="text-align:right;padding:6px 8px;color:var(--text3);">Budget</th>
      <th style="text-align:right;padding:6px 8px;color:var(--text3);">Variance</th>
      <th style="text-align:right;padding:6px 8px;color:var(--text3);">% Var</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:5px 8px;color:var(--white);">${r.ledger_account}</td>
      <td style="padding:5px 8px;text-align:right;color:var(--text2);">${fmt(r.actuals)}</td>
      <td style="padding:5px 8px;text-align:right;color:var(--text2);">${fmt(r.budget)}</td>
      <td style="padding:5px 8px;text-align:right;color:${Number(r.variance) < 0 ? 'var(--red2)' : 'var(--green2)'};">${fmt(r.variance)}</td>
      <td style="padding:5px 8px;text-align:right;color:${Number(r.pct_variance) < 0 ? 'var(--red2)' : 'var(--green2)'};">${pct(r.pct_variance)}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// ════════════════════════════════════════════════════════════════
//  YTD OVERTIME BY EMPLOYEE — synced from Supabase employee_overtime_ytd
//  (populated by periodic "WFDA Overtime Analysis - Employee" imports —
//  see Overtime tab)
// ════════════════════════════════════════════════════════════════
async function loadOtYtd() {
  const cfg = getSBConfig();
  const tblEl = document.getElementById('ot-ytd-table');
  const rangeEl = document.getElementById('ot-ytd-range');
  if (!cfg.enabled || !cfg.url || !cfg.key) {
    if (tblEl) tblEl.innerHTML = '<div style="color:var(--text3);font-size:12px;">Supabase not connected.</div>';
    return;
  }
  try {
    const r = await fetch(`${cfg.url}/rest/v1/employee_overtime_ytd?select=*&order=report_end.desc,overtime_hours.desc`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const all = await r.json();
    if (!all.length) {
      if (tblEl) tblEl.innerHTML = '<div style="color:var(--text3);font-size:12px;">No OT data imported yet — see memory/notes for the Supabase import steps.</div>';
      if (rangeEl) rangeEl.textContent = '';
      return;
    }
    const latestEnd = all[0].report_end;
    const rows = all.filter(r => r.report_end === latestEnd).sort((a, b) => (b.overtime_hours || 0) - (a.overtime_hours || 0));
    if (rangeEl) rangeEl.textContent = `Showing ${rows[0].report_start} → ${latestEnd} (${rows.length} employees)`;
    tblEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:11px;min-width:560px;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="text-align:left;padding:6px 8px;color:var(--text3);">Employee</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text3);">OT Hours</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text3);">OT % of Paid</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text3);">Scheduled OT</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text3);">Sched % of Paid</th>
      </tr></thead>
      <tbody>${rows.map(r => {
        const over2pct = (r.ot_pct_of_paid || 0) > 0.02;
        return `<tr style="border-bottom:1px solid var(--border);${over2pct ? 'background:rgba(255,90,90,0.08);' : ''}">
          <td style="padding:5px 8px;color:var(--white);"><span onclick="openEmployeeHub('${r.employee_name_raw.replace(/'/g,"\\'")}')" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px;">${r.employee_name_raw}</span>${r.match_status !== 'matched' ? ' <span style="color:var(--text3);font-size:11px;">(unmatched)</span>' : ''}</td>
          <td style="padding:5px 8px;text-align:right;color:var(--text2);">${(r.overtime_hours || 0).toFixed(2)}</td>
          <td style="padding:5px 8px;text-align:right;color:${over2pct ? 'var(--red2)' : 'var(--text2)'};">${((r.ot_pct_of_paid || 0) * 100).toFixed(1)}%</td>
          <td style="padding:5px 8px;text-align:right;color:var(--text2);">${r.scheduled_overtime_hours != null ? r.scheduled_overtime_hours.toFixed(2) : '—'}</td>
          <td style="padding:5px 8px;text-align:right;color:var(--text2);">${r.scheduled_ot_pct_of_paid != null ? (r.scheduled_ot_pct_of_paid * 100).toFixed(1) + '%' : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } catch(e) {
    if (tblEl) tblEl.innerHTML = `<div style="color:var(--red2);font-size:12px;">⚠️ Load failed: ${e.message}</div>`;
  }
}

// ════════════════════════════════════════════════════════════════
//  CONTRACT UPLOAD (Directory tab — single most-recent contract)
// ════════════════════════════════════════════════════════════════
function renderContractStatus() {
  const el = document.getElementById('contract-doc-status');
  if (!el) return;
  const doc = state.contractDoc;
  el.innerHTML = doc
    ? `📄 <strong style="color:var(--white);">${doc.fileName}</strong> — uploaded ${doc.uploadedDate} · <a href="${doc.url}" target="_blank" style="color:var(--accent2);">View</a> · <a href="javascript:void(0)" onclick="removeContractDoc()" style="color:var(--red2);">Remove</a>`
    : 'No contract uploaded yet.';
}

async function handleContractUpload(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf') { showSaveBanner('⚠️ PDF files only'); return; }

  const progress = document.getElementById('contract-upload-progress');
  if (progress) progress.textContent = '⏳ Uploading…';

  const path = `contract/${Date.now()}_${sbSanitizePathPart(file.name)}`;
  const res = await sbUploadFile(path, file);
  if (progress) progress.textContent = '';

  if (!res.ok) { showSaveBanner(`⚠️ ${res.error}`); return; }

  state.contractDoc = {
    fileName: file.name,
    path: res.path,
    url: res.url,
    uploadedDate: new Date().toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}),
  };
  persistSave();
  renderContractStatus();
  showSaveBanner('✅ Contract uploaded');
}

function removeContractDoc() {
  if (!state.contractDoc) return;
  if (!confirm('Remove the uploaded contract PDF?')) return;
  const path = state.contractDoc.path;
  state.contractDoc = null;
  persistSave();
  renderContractStatus();
  if (path) sbDeleteFile(path);
  showSaveBanner('🗑 Contract removed');
}

// ════════════════════════════════════════════════════════════════
//  PER-STAFF DOCUMENTS (Directory tab — 📎 Docs column)
//  Three slots per staff member: orientation, xensys, offboard
// ════════════════════════════════════════════════════════════════
let _empDocsName = null;
const EMP_DOC_SLOTS = [
  { key: 'contract',    label: 'Most Recent Contract' },
  { key: 'orientation', label: 'Orientation Packet' },
  { key: 'xensys',      label: 'Xensys Onboarding' },
  { key: 'offboard',    label: 'Offboarding' },
];

function openEmpDocs(name) {
  _empDocsName = name;
  const existing = document.getElementById('emp-docs-overlay');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'emp-docs-overlay';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center;';
  div.onclick = e => { if (e.target === div) div.remove(); };
  div.innerHTML = `
    <div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:24px;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-size:15px;font-weight:700;color:var(--white);">📎 Documents — ${name}</div>
        <button class="move-btn remove-btn" onclick="document.getElementById('emp-docs-overlay').remove()" title="Close">✕</button>
      </div>
      <div id="emp-docs-slots"></div>
    </div>`;
  document.body.appendChild(div);
  renderEmpDocsSlots();
}

function renderEmpDocsSlots() {
  const wrap = document.getElementById('emp-docs-slots');
  if (!wrap || !_empDocsName) return;
  const safe = _empDocsName.replace(/'/g, "\\'");
  const rec = (state.empDocs || {})[_empDocsName] || {};

  wrap.innerHTML = EMP_DOC_SLOTS.map(slot => {
    const doc = rec[slot.key];
    return `
      <div style="background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:6px;">${slot.label}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">
          ${doc
            ? `📄 <strong style="color:var(--white);">${doc.fileName}</strong> — ${doc.uploadedDate} · <a href="${doc.url}" target="_blank" style="color:var(--accent2);">View</a> · <a href="javascript:void(0)" onclick="removeEmpDoc('${safe}','${slot.key}')" style="color:var(--red2);">Remove</a>`
            : 'No file uploaded yet.'}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('emp-doc-input-${slot.key}').click()">📤 Upload / Replace</button>
        <input type="file" id="emp-doc-input-${slot.key}" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none" onchange="handleEmpDocUpload(event,'${safe}','${slot.key}')">
      </div>`;
  }).join('');
}

async function handleEmpDocUpload(event, name, docType) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  const path = `staff/${sbSanitizePathPart(name)}/${docType}_${Date.now()}_${sbSanitizePathPart(file.name)}`;
  showSaveBanner('⏳ Uploading…');
  const res = await sbUploadFile(path, file);
  if (!res.ok) { showSaveBanner(`⚠️ ${res.error}`); return; }

  if (!state.empDocs) state.empDocs = {};
  if (!state.empDocs[name]) state.empDocs[name] = {};
  state.empDocs[name][docType] = {
    fileName: file.name,
    path: res.path,
    url: res.url,
    uploadedDate: new Date().toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}),
  };
  persistSave();
  renderEmpDocsSlots();
  renderDirectory(); // refresh badge count
  showSaveBanner('✅ Document uploaded');
}

function removeEmpDoc(name, docType) {
  const rec = (state.empDocs || {})[name];
  if (!rec || !rec[docType]) return;
  if (!confirm('Remove this document?')) return;
  const path = rec[docType].path;
  delete rec[docType];
  persistSave();
  renderEmpDocsSlots();
  renderDirectory();
  if (path) sbDeleteFile(path);
  showSaveBanner('🗑 Document removed');
}

// ── Setup Modal ──────────────────────────────────────────────────
function showSPSetup() {
  const cfg = getSBConfig();
  const existing = document.getElementById('sb-setup-overlay');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'sb-setup-overlay';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center;';
  div.onclick = e => { if(e.target===div) div.remove(); };
  div.innerHTML = `
    <div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:24px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
      <div style="font-size:15px;font-weight:700;color:var(--white);margin-bottom:4px;">☁️ Supabase Live Sync Setup</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:16px;">Free real-time sync · Multiple users · No IT approval needed</div>

      <div style="background:rgba(46,125,209,0.08);border:1px solid rgba(46,125,209,0.25);border-radius:8px;padding:14px;margin-bottom:16px;font-size:11px;line-height:1.8;color:var(--text2);">
        <strong style="color:var(--accent2);">One-time setup (5 minutes):</strong><br>
        1. Go to <a href="https://supabase.com" target="_blank" style="color:var(--accent2);">supabase.com</a> → Sign up free (no credit card)<br>
        2. Click <strong>New Project</strong> → name it <strong>3b-tracker</strong> → pick any password → Create<br>
        3. Wait ~1 min for project to spin up, then go to <strong>SQL Editor</strong> (left sidebar)<br>
        4. Paste and run this query:<br>
        <div style="background:rgba(0,0,0,0.3);border-radius:4px;padding:8px;margin:6px 0;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--green2);cursor:pointer;" onclick="navigator.clipboard.writeText(this.textContent.trim()).then(()=>showSaveBanner('📋 SQL copied'))">
create table if not exists tracker_state (
  key text primary key,
  value text,
  updated_at timestamptz default now(),
  updated_by text
);
alter table tracker_state enable row level security;
create policy "allow all" on tracker_state for all using (true) with check (true);
-- Float/Sitter data uses same table with keys: float_history, float_board, float_roster</div>
        5. Go to <strong>Settings → API</strong> → copy <strong>Project URL</strong> and <strong>anon public key</strong><br>
        6. Paste them below and click <strong>Connect</strong>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">Your Name / Identifier (shown to other users)</div>
          <input id="sb-username" type="text" value="${cfg.username||''}" placeholder="e.g. Ron H"
            style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">Supabase Project URL</div>
          <input id="sb-url" type="text" value="${cfg.url||''}" placeholder="https://xxxxxxxxxxxx.supabase.co"
            style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">Supabase Anon Public Key</div>
          <input id="sb-key" type="text" value="${cfg.key||''}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;">
        </div>
      </div>

      <div id="sb-test-result" style="font-size:11px;min-height:18px;margin-bottom:12px;"></div>

      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
        <button onclick="document.getElementById('sb-setup-overlay').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>
        <button onclick="testSBConnection()" style="background:rgba(46,125,209,0.12);border:1px solid rgba(46,125,209,0.35);border-radius:5px;padding:6px 14px;color:var(--accent2);font-size:12px;cursor:pointer;">🔍 Test Connection</button>
        <button onclick="saveSBConfig()" class="btn btn-primary" style="font-size:12px;padding:6px 18px;">☁️ Connect & Sync</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

function closeSPSetup() {
  const el = document.getElementById('sb-setup-overlay');
  if (el) el.remove();
}

async function testSBConnection() {
  const url = document.getElementById('sb-url')?.value?.trim();
  const key = document.getElementById('sb-key')?.value?.trim();
  const res = document.getElementById('sb-test-result');
  if (!url || !key) { if(res) res.innerHTML='<span style="color:var(--red2);">Enter URL and key first.</span>'; return; }
  if(res) res.innerHTML = '<span style="color:var(--accent2);">Testing...</span>';
  try {
    const r = await fetch(`${url}/rest/v1/tracker_state?limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (r.ok) {
      if(res) res.innerHTML = '<span style="color:var(--green2);">✅ Connection successful! Table found.</span>';
    } else {
      const err = await r.text();
      if (err.includes('tracker_state') || err.includes('does not exist')) {
        if(res) res.innerHTML = '<span style="color:var(--amber2);">⚠ Connected but table not found — run the SQL query first.</span>';
      } else {
        if(res) res.innerHTML = `<span style="color:var(--red2);">❌ Error ${r.status}: check your URL and key.</span>`;
      }
    }
  } catch(e) {
    if(res) res.innerHTML = `<span style="color:var(--red2);">❌ Cannot reach Supabase — check URL.</span>`;
  }
}

async function saveSBConfig() {
  const url      = document.getElementById('sb-url')?.value?.trim();
  const key      = document.getElementById('sb-key')?.value?.trim();
  const username = document.getElementById('sb-username')?.value?.trim() || 'User';
  if (!url || !key) { alert('Enter both URL and key.'); return; }
  const cfg = { url, key, username, enabled: true };
  localStorage.setItem(SB_CONFIG_KEY, JSON.stringify(cfg));
  closeSPSetup();
  await initSPSync();
  if (_sbConnected) {
    showSaveBanner('☁️ Supabase connected — live sync active');
    await sbPush();  // push current state
    updateSyncBadge();
  }
}

// ── Initialize / Connect ─────────────────────────────────────────
async function initSPSync() {
  const cfg = getSBConfig();
  if (!cfg.enabled || !cfg.url || !cfg.key) {
    updateSyncBadge();
    return;
  }

  _sbUserId = cfg.username || ('User-' + Math.random().toString(36).slice(2,6));

  // Use supabase-js v2 from CDN if available, else raw REST
  await sbConnect(cfg);
}

async function sbConnect(cfg) {
  try {
    // Try to load latest state on connect
    const r = await fetch(`${cfg.url}/rest/v1/tracker_state?key=eq.app_state&select=value,updated_at,updated_by`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' }
    });
    if (!r.ok) { _sbConnected = false; updateSyncBadge(); return; }
    const rows = await r.json();
    if (rows && rows.length && rows[0].value) {
      // Merge remote state into local
      try {
        const remote = JSON.parse(rows[0].value);
        const localTs = parseInt(localStorage.getItem('_3bTrackerTs') || '0');
        const remoteTs = new Date(rows[0].updated_at).getTime();
        if (remoteTs > localTs) {
          // Remote is newer — load it
          Object.assign(state, remote);
          localStorage.setItem('_3bTracker', rows[0].value);
          localStorage.setItem('_3bTrackerTs', remoteTs.toString());
          rebuildMasterStaff();
          // Full re-render of all visible panels
          renderBoard();
          renderDirectory();
          renderVacancy();
          if (document.getElementById('panel-quality')?.style.display !== 'none') {
            renderQualityTab();
            renderUnitGoals2026('unit-goals-2026-section');
            renderUnitFalls('falls-section');
            renderUPC('upc-section');
          }
          const syncTime = new Date(rows[0].updated_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
          showSaveBanner(`☁️ Synced from cloud · last saved ${syncTime}`);
        }
      } catch(e) { console.warn('Merge error', e); }
    }
    _sbConnected = true;
    updateSyncBadge();

    // Set up polling (every 8s) — simpler than WebSocket for this use case
    if (_sbSaveTimer) clearInterval(_sbSaveTimer);
    _sbSaveTimer = setInterval(function () { if (!document.hidden) sbPoll(); }, 8000);

  } catch(e) {
    console.warn('Supabase connect error', e);
    _sbConnected = false;
    updateSyncBadge();
  }
}

// Pull latest from Supabase and merge if newer
async function sbPoll() {
  const cfg = getSBConfig();
  if (!cfg.enabled || !cfg.url || !cfg.key) return;
  try {
    const r = await fetch(`${cfg.url}/rest/v1/tracker_state?key=eq.app_state&select=value,updated_at,updated_by`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    });
    if (!r.ok) return;
    const rows = await r.json();
    if (!rows || !rows.length || !rows[0].value) return;

    const localTs = parseInt(localStorage.getItem('_3bTrackerTs') || '0');
    const remoteTs = new Date(rows[0].updated_at).getTime();
    const remoteBy = rows[0].updated_by || '';

    if (remoteTs > localTs + 1000 && remoteBy !== _sbUserId) {
      // Another user saved something newer
      try {
        const remote = JSON.parse(rows[0].value);
        try { if (window.ccRemoteApplied) window.ccRemoteApplied(remote, remoteBy); } catch (_e) {}
        Object.assign(state, remote);
        localStorage.setItem('_3bTracker', rows[0].value);
        localStorage.setItem('_3bTrackerTs', remoteTs.toString());
        rebuildMasterStaff();
        // Refresh active tab
        const activePanel = document.querySelector('.tab-panel.active');
        if (activePanel) {
          const pid = activePanel.id.replace('panel-','');
          if (window['render'+pid.charAt(0).toUpperCase()+pid.slice(1)]) {
            try { window['render'+pid.charAt(0).toUpperCase()+pid.slice(1)](); } catch(e){}
          }
        }
        renderBoard();
        showSyncToast(remoteBy);
      } catch(e) { console.warn('Poll merge error', e); }
    }
  } catch(e) { /* silent fail — offline */ }
}

// Push current state to Supabase
async function sbPush() {
  const cfg = getSBConfig();
  if (!cfg.enabled || !cfg.url || !cfg.key || _sbSaving) return;
  _sbSaving = true;
  const ts = Date.now();
  try {
    const payload = JSON.stringify(buildSavePayload());
    const r = await fetch(`${cfg.url}/rest/v1/tracker_state`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        key: 'app_state',
        value: payload,
        updated_at: new Date().toISOString(),
        updated_by: _sbUserId
      })
    });
    if (r.ok) {
      localStorage.setItem('_3bTrackerTs', ts.toString());
      updateSyncBadge(true);
    }
  } catch(e) { /* offline — localStorage still saved */ }
  finally { _sbSaving = false; }
}

function showSyncToast(user) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:60px;right:16px;background:rgba(46,125,209,0.9);color:#fff;font-size:11px;padding:7px 14px;border-radius:6px;z-index:3000;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  t.textContent = `☁️ ${user} made updates — synced`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Stub for legacy SP references
function disableSPSync() { localStorage.setItem(SB_CONFIG_KEY, JSON.stringify({ enabled:false })); _sbConnected = false; updateSyncBadge(); showSaveBanner('☁️ Sync disabled'); }







// ── Open Shifts ──────────────────────────────────────────────────────
// ── Recipient Picker Modal ──────────────────────────────────────────
// recipients: [{ name, job, phone, preview }]  — preview = the message they'll get
// onSend: async function(selectedRecipients) — called when user confirms


function updateTPickCount() {
  const checked = document.querySelectorAll('.tpick-cb:checked').length;
  const el = document.getElementById('tpick-count');
  if (el) el.textContent = `${checked} selected`;
}


// ── Open Shifts ──────────────────────────────────────────────────────

// ── Education Overdue ────────────────────────────────────────────────

// ── Policy Sign-Off Reminders ────────────────────────────────────────

// ── Cert Expiring Alerts ─────────────────────────────────────────────



// ── Float Stats YTD / 30-day Enhancements ────────────────────────────
function renderFloatYtdCards() {
  const el = document.getElementById('float-ytd-cards');
  if (!el) return;
  const logEntries = (typeof history !== 'undefined' && Array.isArray(history)) ? history : [];
  const now = new Date();
  const cut30 = new Date(now); cut30.setDate(now.getDate()-30);
  const cutYtd = new Date(now.getFullYear(), 0, 1);

  let ytdFloat=0, ytdSitter=0, ytdCallOff=0, ytdMandate=0;
  let d30Float=0, d30Sitter=0;

  logEntries.forEach(e => {
    if (!e.date) return;
    const date = new Date(e.date+'T12:00:00');
    if (isNaN(date)) return;
    const inYtd = date >= cutYtd, in30 = date >= cut30;
    if (e.assign === 'Float') { if (inYtd) ytdFloat++; if (in30) d30Float++; }
    else if (e.assign === 'Sitter') { if (inYtd) ytdSitter++; if (in30) d30Sitter++; }
    else if (e.assign === 'Call Off') { if (inYtd) ytdCallOff++; }
    else if (e.assign === 'Mandation' || e.assign === 'Refused Mandation') { if (inYtd) ytdMandate++; }
  });

  function card(icon, label, ytd, d30, col) {
    return `<div class="card" style="padding:12px;text-align:center;border-color:rgba(${col},0.3);">
      <div style="font-size:16px;margin-bottom:4px;">${icon}</div>
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px;">${label}</div>
      <div style="font-size:22px;font-weight:700;color:rgba(${col},1);">${ytd}</div>
      <div style="font-size:11px;color:var(--text3);">YTD</div>
      <div style="font-size:14px;font-weight:600;color:rgba(${col},0.8);margin-top:4px;">${d30}</div>
      <div style="font-size:11px;color:var(--text3);">Last 30d</div>
    </div>`;
  }

  el.innerHTML = [
    card('🏃','Total Floats', ytdFloat, d30Float, '46,125,209'),
    card('👁','Total Sitters', ytdSitter, d30Sitter, '139,92,246'),
    card('📞','Call-Offs', ytdCallOff, '—', '239,68,68'),
    card('⚡','Mandations', ytdMandate, '—', '245,158,11'),
  ].join('');
}

// ── 2026 Unit Goals ───────────────────────────────────────────────────
const UNIT_GOALS_2026 = [
  { key:'falls',          label:'Patient Falls',         target:30,     unit:'events/yr', icon:'🚶', lower:true  },
  { key:'hapi',           label:'HAPI Events',           target:9,      unit:'events/yr', icon:'🩹', lower:true  },
  { key:'painPct',        label:'Pain Reassessment',     target:95,     unit:'%',         icon:'💔'             },
  { key:'carePlanPct',    label:'Care Plans',            target:100,    unit:'%',         icon:'📋'             },
  { key:'mislabeledSpec', label:'Mislabeled Specimens',  target:10,     unit:'events/yr', icon:'🧪', lower:true  },
  { key:'chgBathPct',     label:'CHG Bathing',           target:100,    unit:'%',         icon:'🛁'             },
  { key:'pivPct',         label:'PIV Insertion',         target:90,     unit:'%',         icon:'💉'             },
  { key:'curosPct',       label:'Curos Cap',             target:90,     unit:'%',         icon:'🔵'             },
  { key:'centralLinePct', label:'Central Line Audits',   target:90,     unit:'%',         icon:'🏥'             },
  { key:'pgHospital',     label:'Press Ganey (Hospital)',target:73.34,  unit:'%',         icon:'⭐'             },
  { key:'rnTurnover',     label:'RN Turnover',           target:22,     unit:'%/yr',      icon:'👤', lower:true  },
  { key:'lpnCaTurnover',  label:'LPN/CA Turnover',       target:15,     unit:'%/yr',      icon:'👤', lower:true  },
];

function renderUnitGoals2026(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const goals = state.unitGoals2026 || {};

  el.innerHTML = `<div style="margin-bottom:12px;font-size:13px;font-weight:700;color:var(--white);">🎯 2026 Unit Goals</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
    ${UNIT_GOALS_2026.map(g => {
      const actual = goals['actual_'+g.key];
      const target = g.target;
      let status = 'var(--text3)', pct = null;
      if (actual !== undefined && actual !== null && actual !== '') {
        const a = parseFloat(actual);
        if (g.lower) { status = a <= target ? 'var(--green2)' : a <= target*1.2 ? 'var(--amber2)' : 'var(--red2)'; }
        else         { status = a >= target ? 'var(--green2)' : a >= target*0.9  ? 'var(--amber2)' : 'var(--red2)'; }
        pct = g.unit==='%' ? a : null;
      }
      return `<div class="card" style="padding:10px;border-left:3px solid ${status};">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:14px;">${g.icon}</span>
          <span style="font-size:11px;color:var(--text3);">${g.label}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px;">
          <input type="number" value="${actual!==undefined?actual:''}" placeholder="—"
            style="width:60px;background:var(--slate);border:1px solid var(--border);color:${status};border-radius:4px;padding:3px 5px;font-size:12px;font-weight:700;outline:none;"
            onchange="saveGoalActual('${g.key}',this.value)">
          <span style="font-size:11px;color:var(--text3);">/ ${target} ${g.unit}</span>
        </div>
        ${actual!==undefined && pct!==null ? `<div style="height:3px;background:rgba(255,255,255,0.08);border-radius:2px;"><div style="height:3px;background:${status};border-radius:2px;width:${Math.min(100,pct)}%;"></div></div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function saveGoalActual(key, val) {
  if (!state.unitGoals2026) state.unitGoals2026 = {};
  state.unitGoals2026['actual_'+key] = val;
  persistSave();
}

// ── Unit Falls Tracking ───────────────────────────────────────────────
function renderUnitFalls(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const falls = state.unitFalls || [];
  const yr    = new Date().getFullYear();
  const ytd   = falls.filter(f => new Date(f.date+'T12:00:00').getFullYear()===yr);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;color:var(--white);">🚶 Patient Falls</div>
      <button onclick="openFallModal()" class="btn btn-primary btn-sm">+ Log Fall</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
      <div class="card" style="padding:10px;text-align:center;border-color:rgba(239,68,68,0.3);">
        <div style="font-size:22px;font-weight:700;color:var(--red2);">${ytd.length}</div>
        <div style="font-size:11px;color:var(--text3);">YTD Falls</div>
        <div style="font-size:11px;color:${ytd.length<=30?'var(--green2)':'var(--red2)'};">Target: ≤30</div>
      </div>
      <div class="card" style="padding:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--amber2);">${ytd.filter(f=>f.category==='injury').length}</div>
        <div style="font-size:11px;color:var(--text3);">With Injury</div>
      </div>
      <div class="card" style="padding:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${ytd.filter(f=>f.category==='repeat').length}</div>
        <div style="font-size:11px;color:var(--text3);">Repeat Falls</div>
      </div>
    </div>
    ${ytd.length ? `<div style="max-height:200px;overflow-y:auto;">
      <table style="width:100%;font-size:11px;border-collapse:collapse;">
        <thead><tr style="background:rgba(255,255,255,0.04);">
          <th style="padding:5px 8px;text-align:left;color:var(--text3);">Date</th>
          <th style="padding:5px 8px;text-align:left;color:var(--text3);">Room</th>
          <th style="padding:5px 8px;text-align:left;color:var(--text3);">Staff</th>
          <th style="padding:5px 8px;text-align:left;color:var(--text3);">Category</th>
          <th style="padding:5px 8px;text-align:left;color:var(--text3);">Notes</th>
          <th></th>
        </tr></thead>
        <tbody>${[...ytd].reverse().map((f,i)=>`<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:5px 8px;">${f.date}</td>
          <td style="padding:5px 8px;">${f.room||'—'}</td>
          <td style="padding:5px 8px;color:var(--accent2);">${f.staff||'—'}</td>
          <td style="padding:5px 8px;"><span style="font-size:11px;padding:1px 6px;border-radius:8px;background:${f.category==='injury'?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.08)'};">${f.category||'no injury'}</span></td>
          <td style="padding:5px 8px;color:var(--text3);">${f.desc||''}</td>
          <td style="padding:5px 8px;"><button onclick="deleteFall(${falls.indexOf(f)})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;">✕</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : '<div style="color:var(--text3);font-style:italic;font-size:11px;">No falls logged this year</div>'}

    <!-- Add fall modal inline -->
    <div id="fall-modal" style="display:none;margin-top:14px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:14px;">
      <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:10px;">Log Patient Fall</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div><label style="font-size:11px;color:var(--text3);">Date</label><input type="date" id="fall-date" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;"></div>
        <div><label style="font-size:11px;color:var(--text3);">Room</label><input type="text" id="fall-room" placeholder="Room #" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;"></div>
        <div><label style="font-size:11px;color:var(--text3);">Primary Nurse</label>
          <select id="fall-staff" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;">
            <option value="">— Select staff —</option>
            ${MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN').map(s=>`<option value="${s.name}">${s.name} (${s.job})</option>`).join('')}
          </select>
        </div>
        <div><label style="font-size:11px;color:var(--text3);">Category</label>
          <select id="fall-cat" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;">
            <option value="no injury">No Injury</option>
            <option value="injury">With Injury</option>
            <option value="repeat">Repeat Fall</option>
            <option value="near miss">Near Miss</option>
          </select>
        </div>
        <div style="grid-column:1/-1;"><label style="font-size:11px;color:var(--text3);">Description / Actions Taken</label>
          <textarea id="fall-desc" rows="2" placeholder="Circumstances, interventions..." style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;resize:vertical;"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('fall-modal').style.display='none'" class="btn btn-ghost btn-sm">Cancel</button>
        <button onclick="saveFall()" class="btn btn-primary btn-sm">💾 Log Fall</button>
      </div>
    </div>`;
}

function openFallModal() {
  const m = document.getElementById('fall-modal');
  if (!m) return;
  m.style.display = m.style.display==='none' ? 'block' : 'none';
  const d = document.getElementById('fall-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
}

function saveFall() {
  const date = document.getElementById('fall-date')?.value;
  if (!date) { alert('Enter a date'); return; }
  if (!state.unitFalls) state.unitFalls = [];
  state.unitFalls.push({
    date,
    room:     document.getElementById('fall-room')?.value || '',
    staff:    document.getElementById('fall-staff')?.value || '',
    category: document.getElementById('fall-cat')?.value || 'no injury',
    desc:     document.getElementById('fall-desc')?.value || '',
  });
  persistSave();
  showSaveBanner('💾 Fall logged');
  const el = document.getElementById('falls-section') || document.getElementById('falls-content');
  if (el) renderUnitFalls(el.id);
}

function deleteFall(idx) {
  if (!confirm('Remove this fall record?')) return;
  (state.unitFalls||[]).splice(idx,1);
  persistSave();
  const el = document.getElementById('falls-section') || document.getElementById('falls-content');
  if (el) renderUnitFalls(el.id);
}

// ── Unit Practice Council ─────────────────────────────────────────────
function renderUPC(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const meetings = (state.upc||{}).meetings || [];

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;color:var(--white);">🏛️ Unit Practice Council</div>
      <button onclick="openUPCMeetingModal()" class="btn btn-primary btn-sm">+ New Meeting</button>
    </div>
    ${meetings.length===0 ? '<div style="color:var(--text3);font-size:11px;font-style:italic;">No meetings logged yet</div>' :
      [...meetings].reverse().map((m,ri) => {
        const i = meetings.length-1-ri;
        const dateStr = m.date ? new Date(m.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}) : m.date;
        return `<div class="card" style="padding:12px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--white);">${dateStr}</div>
              <div style="font-size:11px;color:var(--text3);">${m.attendees?.length||0} attendees</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button onclick="openUPCMeetingModal(${i})" class="btn btn-ghost btn-sm" style="font-size:11px;">✏️ Edit</button>
              <button onclick="deleteUPCMeeting(${i})" class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--red2);">✕</button>
            </div>
          </div>
          ${m.attendees?.length ? `<div style="font-size:11px;color:var(--text3);margin-bottom:6px;">Attendees: ${m.attendees.join(', ')}</div>` : ''}
          ${m.goals?.length ? `<div style="margin-bottom:6px;"><div style="font-size:11px;color:var(--accent2);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Goals</div>${m.goals.map(g=>`<div style="font-size:11px;color:var(--white);">• ${g}</div>`).join('')}</div>` : ''}
          ${m.notes ? `<div style="margin-bottom:6px;"><div style="font-size:11px;color:var(--amber2);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Meeting Notes</div><div style="font-size:11px;color:var(--text2);white-space:pre-wrap;">${ccEsc(m.notes)}</div></div>` : ''}
          ${m.outcomes?.length ? `<div><div style="font-size:11px;color:var(--green2);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Outcomes / Action Items</div>${m.outcomes.map(o=>`<div style="font-size:11px;color:var(--white);">✓ ${o}</div>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}

    <!-- UPC Meeting Modal -->
    <div id="upc-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;overflow-y:auto;display:none;align-items:flex-start;justify-content:center;padding:20px;">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;width:96%;max-width:600px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;font-weight:700;color:var(--white);">🏛️ UPC Meeting</div>
          <button onclick="closeUPCModal()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;">✕</button>
        </div>
        <input type="hidden" id="upc-edit-idx" value="-1">
        <div style="display:grid;gap:10px;">
          <div><label style="font-size:11px;color:var(--text3);">Meeting Date</label>
            <input type="date" id="upc-date" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;">
          </div>
          <div><label style="font-size:11px;color:var(--text3);">Attendees (comma-separated names)</label>
            <input type="text" id="upc-attendees" placeholder="Smith, John; Jones, Mary..." style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;">
          </div>
          <div><label style="font-size:11px;color:var(--text3);">Goals (one per line)</label>
            <textarea id="upc-goals" rows="3" placeholder="Goal 1&#10;Goal 2" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;resize:vertical;"></textarea>
          </div>
          <div><label style="font-size:11px;color:var(--text3);">Meeting Notes</label>
            <textarea id="upc-notes" rows="4" placeholder="Discussion points, decisions..." style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;resize:vertical;"></textarea>
          </div>
          <div><label style="font-size:11px;color:var(--text3);">Outcomes / Action Items (one per line)</label>
            <textarea id="upc-outcomes" rows="3" placeholder="Action 1&#10;Action 2" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;resize:vertical;"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
          <button onclick="closeUPCModal()" class="btn btn-ghost btn-sm">Cancel</button>
          <button onclick="saveUPCMeeting()" class="btn btn-primary">💾 Save Meeting</button>
        </div>
      </div>
    </div>`;
}

function openUPCMeetingModal(idx) {
  const m = document.getElementById('upc-modal');
  if (!m) return;
  m.style.display = 'flex';
  const meetings = (state.upc||{}).meetings || [];
  const meet = idx !== undefined ? meetings[idx] : null;
  document.getElementById('upc-edit-idx').value = idx !== undefined ? idx : -1;
  document.getElementById('upc-date').value      = meet?.date || new Date().toISOString().split('T')[0];
  document.getElementById('upc-attendees').value = meet?.attendees?.join('; ') || '';
  document.getElementById('upc-goals').value     = meet?.goals?.join('\n') || '';
  document.getElementById('upc-notes').value     = meet?.notes || '';
  document.getElementById('upc-outcomes').value  = meet?.outcomes?.join('\n') || '';
}

function closeUPCModal() {
  const m = document.getElementById('upc-modal');
  if (m) m.style.display = 'none';
}

function saveUPCMeeting() {
  if (!state.upc) state.upc = { meetings: [] };
  if (!state.upc.meetings) state.upc.meetings = [];
  const idx = parseInt(document.getElementById('upc-edit-idx')?.value ?? -1);
  const meeting = {
    date:      document.getElementById('upc-date')?.value || '',
    attendees: document.getElementById('upc-attendees')?.value.split(/[;,\n]/).map(s=>s.trim()).filter(Boolean) || [],
    goals:     document.getElementById('upc-goals')?.value.split('\n').map(s=>s.trim()).filter(Boolean) || [],
    notes:     document.getElementById('upc-notes')?.value || '',
    outcomes:  document.getElementById('upc-outcomes')?.value.split('\n').map(s=>s.trim()).filter(Boolean) || [],
  };
  if (idx >= 0) state.upc.meetings[idx] = meeting;
  else state.upc.meetings.push(meeting);
  persistSave();
  closeUPCModal();
  showSaveBanner('💾 UPC meeting saved');
  const el = document.getElementById('upc-section') || document.getElementById('upc-content');
  if (el) renderUPC(el.id);
}

function deleteUPCMeeting(idx) {
  if (!confirm('Delete this meeting record?')) return;
  (state.upc?.meetings||[]).splice(idx,1);
  persistSave();
  const el = document.getElementById('upc-section') || document.getElementById('upc-content');
  if (el) renderUPC(el.id);
}

// ── Weekend Summary (Fri–Sun by shift) ───────────────────────────────
function renderWeekendSummary(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Get the last 3 Fridays
  const weekends = [];
  const now = new Date(); now.setHours(0,0,0,0);
  for (let w=0; w<3; w++) {
    const fri = new Date(now);
    // Go back to find Friday
    const dayOfWeek = fri.getDay();
    const daysToFri = (dayOfWeek >= 5) ? dayOfWeek - 5 : dayOfWeek + 2;
    fri.setDate(fri.getDate() - daysToFri - (w * 7));
    const days = [new Date(fri), new Date(fri.getTime()+86400000), new Date(fri.getTime()+172800000)];
    weekends.push({ fri: days[0], sat: days[1], sun: days[2] });
  }

  const WEEKEND_SHIFTS = {
    'RN Day':    { shifts:['0700-1500'], role:'RN'  },
    'RN Night':  { shifts:['1900-0700'], role:'RN'  },
    'LPN Day':   { shifts:['0700-1500'], role:'LPN' },
    'LPN Night': { shifts:['1900-0700'], role:'LPN' },
    'CA Day':    { shifts:['0630-1430'], role:'CA'  },
    'CA Eve':    { shifts:['1430-1830','1830-2230'], role:'CA'  },
    'CA Night':  { shifts:['2230-0630'], role:'CA'  },
    'UC':        { shifts:['0700-1500','1500-2300','2300-0700'], role:'UC' },
  };

  el.innerHTML = weekends.map(wk => {
    const friKey = wk.fri.toISOString().split('T')[0];
    const satKey = wk.sat.toISOString().split('T')[0];
    const sunKey = wk.sun.toISOString().split('T')[0];
    const friStr = wk.fri.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const satStr = wk.sat.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const sunStr = wk.sun.toLocaleDateString('en-US',{month:'short',day:'numeric'});

    function getStaffForDay(dateKey, shiftKeys, role) {
      const placements = state.placements[dateKey] || {};
      return shiftKeys.flatMap(sk => (placements[sk]||[]).filter(p=>p.role===role)).map(p=>p.name.split(',')[0]).join(', ') || '—';
    }

    const tableRows = Object.entries(WEEKEND_SHIFTS).map(([label, cfg]) => {
      const fri = getStaffForDay(friKey, cfg.shifts, cfg.role);
      const sat = getStaffForDay(satKey, cfg.shifts, cfg.role);
      const sun = getStaffForDay(sunKey, cfg.shifts, cfg.role);
      const hasData = fri!=='—' || sat!=='—' || sun!=='—';
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:5px 8px;font-size:11px;color:var(--text3);white-space:nowrap;">${label}</td>
        <td style="padding:5px 8px;font-size:11px;color:${fri!=='—'?'var(--white)':'var(--text3)'};">${fri}</td>
        <td style="padding:5px 8px;font-size:11px;color:${sat!=='—'?'var(--white)':'var(--text3)'};">${sat}</td>
        <td style="padding:5px 8px;font-size:11px;color:${sun!=='—'?'var(--white)':'var(--text3)'};">${sun}</td>
      </tr>`;
    }).join('');

    const note = (state.weekendSummary||{})[friKey] || {};
    return `<div class="card" style="padding:14px;margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:10px;">📅 Weekend of ${friStr}–${sunStr}</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:rgba(255,255,255,0.04);">
          <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--text3);">Shift</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;color:${wk.fri.getDay()===5?'var(--amber2)':'var(--text3)'};">Fri ${friStr}</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--amber2);">Sat ${satStr}</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--amber2);">Sun ${sunStr}</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div style="margin-top:10px;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:3px;">Weekend Notes / Incidents</div>
        <textarea rows="2" placeholder="Notes for this weekend..." style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;resize:vertical;"
          onblur="saveWeekendNote('${friKey}',this.value)">${note.notes||''}</textarea>
      </div>
    </div>`;
  }).join('');
}

function saveWeekendNote(dateKey, val) {
  if (!state.weekendSummary) state.weekendSummary = {};
  if (!state.weekendSummary[dateKey]) state.weekendSummary[dateKey] = {};
  state.weekendSummary[dateKey].notes = val;
  persistSave();
}

function updateSyncBadge(justSaved) {
  const el = document.getElementById('sp-status-badge');
  if (!el) return;
  const cfg = getSBConfig();
  const lastTs = parseInt(localStorage.getItem('_3bTrackerTs') || '0');
  const lastTime = lastTs ? new Date(lastTs).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '';
  if (!cfg.enabled) {
    el.innerHTML = `<button onclick="showSPSetup()" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:5px;padding:4px 10px;color:var(--text3);font-size:11px;cursor:pointer;">☁️ Sync Off</button>`;
  } else if (_sbConnected) {
    const by = cfg.username || 'you';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:5px;cursor:pointer;" onclick="showSPSetup()">
      <span style="width:7px;height:7px;border-radius:50%;background:${justSaved?'#22c55e':'#3b82f6'};display:inline-block;box-shadow:0 0 6px ${justSaved?'#22c55e':'#3b82f6'};flex-shrink:0;"></span>
      <span style="font-size:11px;color:${justSaved?'var(--green2)':'var(--accent2)'};">☁️ ${justSaved?'Saved · '+by:'Synced'} ${lastTime?'· '+lastTime:''}</span>
    </div>`;
  } else {
    el.innerHTML = `<button onclick="showSPSetup()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:5px;padding:4px 10px;color:var(--red2);font-size:11px;cursor:pointer;">☁️ Offline — reconnect</button>`;
  }
}
function testSPConnection() { testSBConnection(); }
function saveSPConfig() { saveSBConfig(); }
function spPullAndMerge() { sbPoll(); }


// Build save payload for both localStorage and Supabase
function buildSavePayload() {
  return {
    phones: state.phones, emails: state.emails, birthdays: state.birthdays,
    anniversaries: state.anniversaries, hireDates: state.hireDates, notes: state.notes,
    chargeNurses: state.chargeNurses, charge3C: state.charge3C, staff3C: state.staff3C, codeResponseTeam: state.codeResponseTeam,
    trackingData: state.trackingData, vacancyBudgets: state.vacancyBudgets,
    empShifts: state.empShifts, empFTE: state.empFTE, empNotes: state.empNotes,
    emp48hr: state.emp48hr, empWeekend: state.empWeekend,
    scheduleOverrides: state.scheduleOverrides, empOrientation: state.empOrientation, orientAssign: state.orientAssign,
    empPreceptor: state.empPreceptor, empPayEligible: state.empPayEligible, empPayGuarHigh: state.empPayGuarHigh, empPayHighInc: state.empPayHighInc, empPayHighCA: state.empPayHighCA, empCAHours: state.empCAHours,
     empPayEligible: state.empPayEligible, empPayGuarHigh: state.empPayGuarHigh,
     empPayHighInc: state.empPayHighInc, empPayHighCA: state.empPayHighCA,
    empAlwaysCharge: state.empAlwaysCharge, absenceLog: state.absenceLog,
    qualityData: state.qualityData, unitGoals: state.unitGoals,
    strokeKPI: state.strokeKPI, weeklyEdu: state.weeklyEdu,
    platoWeekly: state.platoWeekly || {},
    varianceLog: state.varianceLog, pressGaney: state.pressGaney,
    yearReview: state.yearReview, empVacation: state.empVacation,
    empSetSchedule: state.empSetSchedule, certs: state.certs,
    pendingEdu: state.pendingEdu, customStaff: state.customStaff,
    removedStaff: state.removedStaff, agencyDates: state.agencyDates,
    empProfile: state.empProfile || {},
    empDocs: state.empDocs || {},
    contractDoc: state.contractDoc || null,
    alwaysRNCharge: state.alwaysRNCharge,
    _scheduleSuggestions: state._scheduleSuggestions,
    _scheduleStart: state._scheduleStart,
    todoList: state.todoList, nineBox: state.nineBox,
    staffIncidents: state.staffIncidents, interviews: state.interviews,
    orientation: state.orientation, competency: state.competency,
    customCompSkills: state.customCompSkills, hiddenCompSkills: state.hiddenCompSkills,
    recognition: state.recognition, policies: state.policies,
    messages: state.messages, rrtLog: state.rrtLog, otLog: state.otLog,
    incidentReports: state.incidentReports, productivity: state.productivity,
    hppdCheckins: state.hppdCheckins,
    equipmentLog: state.equipmentLog, shiftTargets: state.shiftTargets,
    customOriMilestones: state.customOriMilestones, customOriGoals: state.customOriGoals,
    onboarding: state.onboarding, offboarding: state.offboarding,
    coaching: state.coaching, placements: state.placements, dates: state.dates,
    docOpps: state.docOpps || {},
    fallRoundData: state.fallRoundData || [],
    staffNameMap: state.staffNameMap || {},
    staffNameIgnored: state.staffNameIgnored || [],
    hapiRoundData: state.hapiRoundData || [],
    dailyEduLog: state.dailyEduLog || {},
  };
}

// Build tag — bump this string whenever persistSave()'s conflict-guard logic
// changes, so a stale open tab can be identified via the header or console.
const CC_BUILD = '2026-10-09-tabs-plato-save';
console.log('CC build:', CC_BUILD);

async function persistSave() {
  try {
    const data = buildSavePayload();
    const cfg = getSBConfig();

    if (cfg.enabled && cfg.url && cfg.key && _sbConnected) {
      // ── PRIMARY: Supabase ──────────────────────────────────────
      // Write immediately — no debounce — Supabase is the source of truth
      _sbSaving = true;
      const ts = Date.now();
      try {
        // ── Staleness guard ───────────────────────────────────────
        // Check what's actually live right now before overwriting it.
        // If another device saved something after this tab last synced,
        // merge their changes in first instead of blindly clobbering
        // them — this is what was reverting the directory/phones.
        try {
          const checkR = await fetch(
            `${cfg.url}/rest/v1/tracker_state?key=eq.app_state&select=value,updated_at,updated_by`,
            { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
          );
          if (checkR.ok) {
            const checkRows = await checkR.json();
            if (checkRows && checkRows.length && checkRows[0].value) {
              const localTs  = parseInt(localStorage.getItem('_3bTrackerTs') || '0');
              const remoteTs = new Date(checkRows[0].updated_at).getTime();
              if (remoteTs > localTs && checkRows[0].updated_by !== _sbUserId) {
                const remote = JSON.parse(checkRows[0].value);
                // Any top-level section this tab never touched this session
                // (still undefined locally) — take remote's copy wholesale.
                Object.keys(remote).forEach(k => {
                  if (state[k] === undefined) state[k] = remote[k];
                });
                // Person-keyed dictionaries: merge entry-by-entry so a
                // number/date added on another device isn't discarded —
                // local (this tab's in-flight edit) wins per-key on top.
                ['phones','emails','birthdays','anniversaries','hireDates','notes'].forEach(k => {
                  if (remote[k] && typeof remote[k] === 'object') {
                    state[k] = Object.assign({}, remote[k], state[k] || {});
                  }
                });
                // Roster add/remove lists: union instead of one side winning.
                if (Array.isArray(remote.removedStaff)) {
                  const have = new Set((state.removedStaff || []).map(s => s.name || s));
                  remote.removedStaff.forEach(r => { if (!have.has(r.name || r)) (state.removedStaff = state.removedStaff || []).push(r); });
                }
                if (Array.isArray(remote.customStaff)) {
                  const have = new Set((state.customStaff || []).map(s => s.name));
                  remote.customStaff.forEach(r => { if (!have.has(r.name)) (state.customStaff = state.customStaff || []).push(r); });
                }
                data.phones = state.phones; data.emails = state.emails;
                data.birthdays = state.birthdays; data.anniversaries = state.anniversaries;
                data.hireDates = state.hireDates; data.notes = state.notes;
                data.removedStaff = state.removedStaff; data.customStaff = state.customStaff;
                Object.keys(remote).forEach(k => { if (data[k] === undefined) data[k] = state[k]; });
                showSaveBanner(`☁️ Merged another device\u2019s changes before saving (build ${CC_BUILD})`);
              }
            }
          }
        } catch (e) { console.warn('Staleness check failed — saving without merge:', e); }

        const r = await fetch(`${cfg.url}/rest/v1/tracker_state`, {
          method: 'POST',
          headers: {
            apikey: cfg.key,
            Authorization: `Bearer ${cfg.key}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            key: 'app_state',
            value: JSON.stringify(data),
            updated_at: new Date().toISOString(),
            updated_by: _sbUserId
          })
        });
        if (r.ok) {
          localStorage.setItem('_3bTrackerTs', ts.toString());
          // Also cache locally so page loads instantly next time
          localStorage.setItem(LS_KEY, JSON.stringify(data));
          updateSyncBadge(true);
        } else {
          console.warn('Supabase write failed:', r.status);
          // Fall back to localStorage
          localStorage.setItem(LS_KEY, JSON.stringify(data));
          showSaveBanner('⚠ Cloud save failed — saved locally only');
        }
      } catch(e) {
        // Offline — save locally until reconnected
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        localStorage.setItem('_sbPendingSync', '1'); // flag to push when reconnected
        showSaveBanner('⚠ Offline — saved locally, will sync when reconnected');
      } finally {
        _sbSaving = false;
      }
    } else {
      // ── FALLBACK: localStorage only (Supabase not configured) ──
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      if (!cfg.enabled || !cfg.url || !cfg.key) {
        // Show warning once per session
        if (!window._sbWarnShown) {
          window._sbWarnShown = true;
          showSaveBanner('⚠ Supabase not connected — data saved locally only (not shared between devices)');
        }
      }
    }
  } catch(e) { console.warn('persistSave failed:', e); }
}


// persistLoad is now async — called after sbConnect resolves
// Supabase is the source of truth; localStorage is a read-through cache
async function persistLoad() {
  const cfg = getSBConfig();

  // ── Try Supabase first ─────────────────────────────────────────
  if (cfg.enabled && cfg.url && cfg.key) {
    try {
      const r = await fetch(
        `${cfg.url}/rest/v1/tracker_state?key=eq.app_state&select=value,updated_at`,
        { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
      );
      if (r.ok) {
        const rows = await r.json();
        if (rows && rows.length && rows[0].value) {
          const data = JSON.parse(rows[0].value);
          applyLoadedData(data);
          // Update local cache
          localStorage.setItem(LS_KEY, rows[0].value);
          localStorage.setItem('_3bTrackerTs', new Date(rows[0].updated_at).getTime().toString());
          console.log('✓ Loaded from Supabase');
          // If there was a pending offline save, push it now
          if (localStorage.getItem('_sbPendingSync') === '1') {
            localStorage.removeItem('_sbPendingSync');
            await persistSave();
          }
          return; // success — don't fall through to localStorage
        }
      }
    } catch(e) {
      console.warn('Supabase load failed, falling back to localStorage:', e);
    }
  }

  // ── Fallback: localStorage cache ───────────────────────────────
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    applyLoadedData(data);
    console.log('✓ Loaded from localStorage cache');
  } catch(e) { console.warn('persistLoad failed:', e); }
}

// Apply a loaded data object to state (extracted for reuse)
function applyLoadedData(data) {
  try {
    const has = k => Object.prototype.hasOwnProperty.call(data, k);
    if (has('phones'))        state.phones        = data.phones        || {};
    if (!state.phones)  state.phones = {};
    if (has('emails'))        state.emails        = data.emails        || {};
    if (has('birthdays'))     state.birthdays     = data.birthdays     || {};
    if (has('anniversaries')) state.anniversaries = data.anniversaries || {};
    if (has('hireDates'))    state.hireDates    = data.hireDates    || {};
    if (has('notes'))         state.notes         = data.notes         || {};
    if (has('chargeNurses'))  state.chargeNurses  = data.chargeNurses  || {};
    if (has('charge3C'))      state.charge3C      = data.charge3C      || {};
    if (has('staff3C'))       state.staff3C       = data.staff3C       || {};
    if (has('trackingData'))  state.trackingData  = data.trackingData  || {};
    if (has('vacancyBudgets')) state.vacancyBudgets = data.vacancyBudgets || {};
    if (has('empShifts'))     state.empShifts     = data.empShifts     || {};
    if (has('empFTE'))        state.empFTE        = data.empFTE        || {};
    if (has('empNotes'))      state.empNotes      = data.empNotes      || {};
    if (has('empProfile'))    state.empProfile    = data.empProfile    || {};
    if (has('docOpps'))       state.docOpps       = data.docOpps       || {};
    if (has('empDocs'))       state.empDocs       = data.empDocs       || {};
    if (has('contractDoc'))   state.contractDoc   = data.contractDoc   || null;
    if (has('emp48hr'))       state.emp48hr       = data.emp48hr       || {};
    if (has('empWeekend'))    state.empWeekend    = data.empWeekend    || {};
    if (has('scheduleOverrides')) state.scheduleOverrides = data.scheduleOverrides || {};
    if (has('empOrientation')) state.empOrientation = data.empOrientation || {};
    if (has('orientAssign'))    state.orientAssign    = data.orientAssign    || {};
    if (has('empDbl'))         state.empDbl         = data.empDbl         || {};
    if (has('empSkipSchedule')) state.empSkipSchedule = data.empSkipSchedule || {};
    if (!state.empDbl)          state.empDbl          = {};
    if (!state.empSkipSchedule) state.empSkipSchedule = {};
    if (!state.upc)             state.upc             = { meetings: [] };
    if (!state.unitFalls)       state.unitFalls       = [];
    if (!state.weekendSummary)  state.weekendSummary  = {};
    if (!state.unitGoals2026)   state.unitGoals2026   = {};
    if (!state.dailyEduLog)     state.dailyEduLog     = {};
    if (has('empPreceptor'))   state.empPreceptor   = data.empPreceptor   || {};
    if (has('empPayEligible')) state.empPayEligible = data.empPayEligible || {};
    if (has('empPayGuarHigh')) state.empPayGuarHigh = data.empPayGuarHigh || {};
    if (has('empPayHighInc'))  state.empPayHighInc  = data.empPayHighInc  || {};
    if (has('empPayHighCA'))   state.empPayHighCA   = data.empPayHighCA   || {};
    if (has('empCAHours'))     state.empCAHours     = data.empCAHours     || {};
    if (has('empAlwaysCharge')) state.empAlwaysCharge = data.empAlwaysCharge || {};
    if (has('absenceLog'))     state.absenceLog     = data.absenceLog     || {};
    if (has('qualityData'))    state.qualityData    = data.qualityData    || {};
    if (has('unitGoals'))      state.unitGoals      = data.unitGoals      || {};
    if (has('weeklyEdu'))      state.weeklyEdu      = data.weeklyEdu      || {};
    if (has('varianceLog'))    state.varianceLog    = data.varianceLog    || {};
    if (has('strokeKPI'))      state.strokeKPI      = data.strokeKPI      || {};
    if (has('pressGaney'))     state.pressGaney     = data.pressGaney     || {};
    if (has('yearReview'))     state.yearReview     = data.yearReview     || {};
    if (has('empVacation'))    state.empVacation    = data.empVacation    || {};
    if (has('empSetSchedule')) state.empSetSchedule = data.empSetSchedule || {};
    if (has('certs'))         state.certs         = data.certs         || {};
    if (has('todoList'))      state.todoList      = data.todoList      || [];
    if (has('nineBox'))       state.nineBox       = data.nineBox       || {};
    if (has('staffIncidents')) state.staffIncidents = data.staffIncidents || {};
    if (has('interviews'))     state.interviews     = data.interviews     || [];
    if (has('orientation'))    state.orientation    = data.orientation    || {};
    if (has('competency'))     state.competency     = data.competency     || {};
    if (has('customCompSkills')) state.customCompSkills = data.customCompSkills || { RN:[], CA:[] };
    if (has('hiddenCompSkills')) state.hiddenCompSkills = data.hiddenCompSkills || {};
    if (has('recognition'))    state.recognition    = data.recognition    || [];
    if (has('policies'))       state.policies       = data.policies       || [];
    if (has('messages'))       state.messages       = data.messages       || [];
    if (has('rrtLog'))         state.rrtLog         = data.rrtLog         || [];
    if (has('otLog'))          state.otLog          = data.otLog          || {};
    if (has('incidentReports'))state.incidentReports= data.incidentReports|| [];
    if (has('productivity'))   state.productivity   = data.productivity   || {};
    if (has('hppdCheckins'))   state.hppdCheckins   = data.hppdCheckins   || {};
    if (has('equipmentLog'))   state.equipmentLog   = data.equipmentLog   || [];
    if (has('shiftTargets'))   state.shiftTargets   = data.shiftTargets   || {};
    if (has('customOriMilestones')) state.customOriMilestones = data.customOriMilestones || [];
    if (has('customOriGoals')) state.customOriGoals  = data.customOriGoals  || {};
    if (has('onboarding'))     state.onboarding      = data.onboarding      || {};
    if (has('offboarding'))    state.offboarding     = data.offboarding     || {};
    if (has('coaching'))       state.coaching        = data.coaching        || {};
    if (has('placements'))     state.placements      = data.placements      || {};
    if (has('dates'))          state.dates           = data.dates           || [];
    if (has('pendingEdu'))    state.pendingEdu    = data.pendingEdu    || {};
    if (has('customStaff'))   state.customStaff   = data.customStaff   || [];
    // Guarded: only overwrite the baked-in default with what's stored in Supabase
    // when Supabase actually has rows — an empty stored array should never wipe
    // out real data that was loaded directly into Supabase via SQL.
    if (has('fallRoundData') && (data.fallRoundData || []).length) state.fallRoundData = data.fallRoundData;
    if (has('hapiRoundData') && (data.hapiRoundData || []).length) state.hapiRoundData = data.hapiRoundData;
    if (has('staffNameMap'))     state.staffNameMap     = data.staffNameMap     || {};
    if (has('staffNameIgnored')) state.staffNameIgnored = data.staffNameIgnored || [];
    if (has('removedStaff'))  state.removedStaff  = data.removedStaff  || [];
    if (has('dailyEduLog'))   state.dailyEduLog   = data.dailyEduLog   || {};
    if (has('agencyDates'))   state.agencyDates   = data.agencyDates   || {};
    rebuildMasterStaff();
  } catch(e) { console.warn('applyLoadedData failed:', e); }
}

function persistClear() {
  if (!confirm('Clear all saved data (phones, emails, birthdays, anniversaries, notes, charge assignments, certifications, education imports)? Staffing board data is not affected.')) return;
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem('_3bTrackerTs');
  state.phones = {}; state.emails = {}; state.birthdays = {};
  state.anniversaries = {}; state.notes = {}; state.chargeNurses = {}; state.charge3C = {}; state.staff3C = {}; state.trackingData = {}; state.vacancyBudgets = {}; state.empShifts = {}; state.empFTE = {}; state.empNotes = {}; state.emp48hr = {}; state.empWeekend = {}; state.scheduleOverrides = {}; state.empSetSchedule = {}; state.empOrientation = {}; state.empCAHours = {}; state.empVacation = {}; state.absenceLog = {}; state.qualityData = {}; state.empDocs = {}; state.contractDoc = null;
  state.certs = {}; state.pendingEdu = {}; state.customStaff = []; state.removedStaff = []; state.agencyDates = {};
  rebuildMasterStaff();
  // Also clear from Supabase
  const cfg = getSBConfig();
  if (cfg.enabled && cfg.url && cfg.key && _sbConnected) {
    fetch(`${cfg.url}/rest/v1/tracker_state?key=eq.app_state`, {
      method: 'DELETE',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    }).then(() => showSaveBanner('✓ Data cleared from cloud and local storage'))
      .catch(() => showSaveBanner('✓ Local data cleared (cloud delete failed)'));
  } else {
    showSaveBanner('✓ All data cleared');
  }
  initAll();
  updateBackupSummary();
}

// ── Backup / Restore ──
function exportBackup() {
  const data = {
    _version: '3B_v2',
    _exported: new Date().toISOString(),
    phones:           state.phones,
    emails:           state.emails,
    birthdays:        state.birthdays,
    anniversaries:    state.anniversaries,
    notes:            state.notes,
    chargeNurses:     state.chargeNurses,
    charge3C:         state.charge3C,
    staff3C:          state.staff3C,
    codeResponseTeam: state.codeResponseTeam,
    trackingData:     state.trackingData,
    vacancyBudgets:   state.vacancyBudgets,
    empShifts:        state.empShifts,
    empFTE:           state.empFTE,
    empNotes:         state.empNotes,
    emp48hr:          state.emp48hr,
    empWeekend:       state.empWeekend,
    empAlwaysCharge:  state.empAlwaysCharge,
    scheduleOverrides: state.scheduleOverrides,
    empOrientation:   state.empOrientation,
    empCAHours:       state.empCAHours,
    empVacation:      state.empVacation,
    empSetSchedule:   state.empSetSchedule,
    certs:            state.certs,
    pendingEdu:       state.pendingEdu,
    customStaff:      state.customStaff,
    removedStaff:     state.removedStaff,
    agencyDates:      state.agencyDates,
    alwaysRNCharge:   state.alwaysRNCharge,
    absenceLog:       state.absenceLog,
    qualityData:      state.qualityData,
    unitGoals:        state.unitGoals,
    strokeKPI:        state.strokeKPI,
    pressGaney:       state.pressGaney,
    weeklyEdu:        state.weeklyEdu,
    yearReview:       state.yearReview,
    varianceLog:      state.varianceLog,
    _scheduleSuggestions: state._scheduleSuggestions,
    _scheduleStart:   state._scheduleStart,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const ts = new Date().toISOString().slice(0,10);
  a.download = `3B_StaffApp_Backup_${ts}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showBackupStatus('✓ Backup downloaded — keep this file safe!', 'success');
  showSaveBanner('⬇ Backup exported');
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data._version || !data._version.startsWith('3B_')) {
        showBackupStatus('⚠ This does not appear to be a valid 3B Staff App backup file.', 'error');
        return;
      }
      // Confirm before overwriting
      const exported = data._exported ? new Date(data._exported).toLocaleString() : 'unknown date';
      if (!confirm(`Restore backup from ${exported}?\n\nThis will replace all your current saved data (phones, emails, certs, education, notes, charge assignments).`)) return;

      const has2 = k => Object.prototype.hasOwnProperty.call(data, k);
      if (has2('phones'))           state.phones           = data.phones           || {};
      if (has2('emails'))           state.emails           = data.emails           || {};
      if (has2('birthdays'))        state.birthdays        = data.birthdays        || {};
      if (has2('anniversaries'))    state.anniversaries    = data.anniversaries    || {};
      if (has2('notes'))            state.notes            = data.notes            || {};
      if (has2('chargeNurses'))     state.chargeNurses     = data.chargeNurses     || {};
      if (has2('charge3C'))         state.charge3C         = data.charge3C         || {};
      if (has2('staff3C'))          state.staff3C          = data.staff3C          || {};
      if (has2('trackingData'))     state.trackingData     = data.trackingData     || {};
      if (has2('vacancyBudgets'))   state.vacancyBudgets   = data.vacancyBudgets   || {};
      if (has2('empShifts'))        state.empShifts        = data.empShifts        || {};
      if (has2('empFTE'))           state.empFTE           = data.empFTE           || {};
      if (has2('empNotes'))         state.empNotes         = data.empNotes         || {};
      if (has2('emp48hr'))          state.emp48hr          = data.emp48hr          || {};
      if (has2('empWeekend'))       state.empWeekend       = data.empWeekend       || {};
      if (has2('empAlwaysCharge'))  state.empAlwaysCharge  = data.empAlwaysCharge  || {};
      if (has2('scheduleOverrides')) state.scheduleOverrides = data.scheduleOverrides || {};
      if (has2('empOrientation'))   state.empOrientation   = data.empOrientation   || {};
      if (has2('empCAHours'))       state.empCAHours       = data.empCAHours       || {};
      if (has2('empVacation'))      state.empVacation      = data.empVacation      || {};
      if (has2('empSetSchedule'))   state.empSetSchedule   = data.empSetSchedule   || {};
      if (has2('certs'))            state.certs            = data.certs            || {};
      if (has2('pendingEdu'))       state.pendingEdu       = data.pendingEdu       || {};
      if (has2('customStaff'))      state.customStaff      = data.customStaff      || [];
      if (has2('removedStaff'))     state.removedStaff     = data.removedStaff     || [];
      if (has2('agencyDates'))      state.agencyDates      = data.agencyDates      || {};
      if (has2('alwaysRNCharge'))   state.alwaysRNCharge   = data.alwaysRNCharge   || false;
      if (has2('absenceLog'))       state.absenceLog       = data.absenceLog       || {};
      if (has2('qualityData'))      state.qualityData      = data.qualityData      || {};
      if (has2('unitGoals'))        state.unitGoals        = data.unitGoals        || {};
      if (has2('strokeKPI'))        state.strokeKPI        = data.strokeKPI        || {};
      if (has2('pressGaney'))       state.pressGaney       = data.pressGaney       || {};
      if (has2('weeklyEdu'))        state.weeklyEdu        = data.weeklyEdu        || {};
      if (has2('yearReview'))       state.yearReview       = data.yearReview       || {};
      if (has2('varianceLog'))      state.varianceLog      = data.varianceLog      || {};
      if (has2('_scheduleSuggestions')) state._scheduleSuggestions = data._scheduleSuggestions || {};
      if (has2('_scheduleStart'))   state._scheduleStart   = data._scheduleStart   || '';ata.agencyDates   || {};
      rebuildMasterStaff();

      persistSave();
      initAll();
      updateBackupSummary();

      const phoneCount = Object.keys(state.phones).length;
      const certCount  = Object.keys(state.certs).length;
      const eduCount   = Object.keys(state.pendingEdu).length;
      showBackupStatus(`✓ Backup restored from ${exported} — ${phoneCount} contacts, ${certCount} cert records, ${eduCount} education records loaded.`, 'success');
      showSaveBanner('⬆ Backup restored successfully');
    } catch(err) {
      showBackupStatus('⚠ Could not read backup file: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function showBackupStatus(msg, type) {
  const el = document.getElementById('backup-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.background = type === 'success' ? 'rgba(26,122,74,0.15)' : 'rgba(179,35,24,0.15)';
  el.style.border = type === 'success' ? '1px solid rgba(37,168,104,0.4)' : '1px solid rgba(230,57,70,0.4)';
  el.style.color = type === 'success' ? 'var(--green2)' : 'var(--red2)';
  el.textContent = msg;
}

function updateBackupSummary() {
  const el = document.getElementById('backup-summary');
  if (!el) return;
  const counts = [
    { label: 'Phone/Email', count: Object.keys(state.phones).length + Object.keys(state.emails).length, icon: '📞' },
    { label: 'Certifications', count: Object.keys(state.certs).length, icon: '🏥' },
    { label: 'Education Records', count: Object.keys(state.pendingEdu).length, icon: '📚' },
    { label: 'Birthdays', count: Object.keys(state.birthdays).length, icon: '🎂' },
    { label: 'Anniversaries', count: Object.keys(state.anniversaries).length, icon: '🏅' },
    { label: 'Shift Notes', count: Object.keys(state.notes).length, icon: '📝' },
    { label: 'Charge Assignments', count: Object.keys(state.chargeNurses).length, icon: '⭐' },
    { label: 'Tracking Records',   count: Object.keys(state.trackingData).length,  icon: '📊' },
  ];
  el.innerHTML = counts.map(c => `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:6px 12px;text-align:center;min-width:100px;">
      <div style="font-size:16px;margin-bottom:2px;">${c.icon}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;color:${c.count>0?'var(--accent2)':'var(--text3)'};">${c.count}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:1px;">${c.label}</div>
    </div>`).join('');
}


function showSaveBanner(msg) {
  let banner = document.getElementById('save-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'save-banner';
    banner.style.cssText = `
      position:fixed; bottom:18px; right:18px;
      background:var(--slate2); border:1px solid var(--accent2);
      color:var(--white); font-family:'IBM Plex Sans',sans-serif;
      font-size:12px; font-weight:600; padding:8px 16px;
      border-radius:20px; z-index:9999;
      box-shadow:0 4px 16px rgba(0,0,0,0.4);
      transition:opacity 0.4s;
    `;
    document.body.appendChild(banner);
  }
  banner.textContent = msg;
  banner.style.opacity = '1';
  clearTimeout(banner._t);
  banner._t = setTimeout(() => { banner.style.opacity = '0'; }, 2500);
}

// ── Direct save functions — write to state AND persist ──
savePhone = function(name, val) {
  state.phones[name] = val;
  persistSave();
  showSaveBanner('💾 Phone saved');
};
saveEmail = function(name, val) {
  state.emails[name] = val;
  persistSave();
  showSaveBanner('💾 Email saved');
};
saveBday = function(name, val) {
  state.birthdays[name] = val;
  persistSave();
  showSaveBanner('💾 Birthday saved');
};
saveAnniv = function(name, val) {
  state.anniversaries[name] = val;
  persistSave();
  showSaveBanner('💾 Anniversary saved');
};
saveNote = function(noteKey, shiftKey, val) {
  state.notes[noteKey] = val;
  const saved = document.getElementById(`saved-${shiftKey}`);
  if (saved) { saved.classList.add('show'); setTimeout(()=>saved.classList.remove('show'), 1500); }
  persistSave();
};
setCharge = function(key, name) {
  state.chargeNurses[key] = name;
  persistSave();
  showSaveBanner('💾 Charge nurse saved');
};
addStaffManual = function() {
  const name = document.getElementById('add-name')?.value?.trim();
  const role = document.getElementById('add-role')?.value || 'RN';
  const shift = document.getElementById('add-shift')?.value || '0700-1500';
  const dateKey = state.activeBoardDate;
  if (!name || !dateKey) return;
  if (!state.placements[dateKey]) state.placements[dateKey] = {};
  if (!state.placements[dateKey][shift]) state.placements[dateKey][shift] = [];
  state.placements[dateKey][shift].push({name, role});
  const inp = document.getElementById('add-name');
  if (inp) inp.value = '';
  renderBoard();
  renderDirectory();
  persistSave();
  showSaveBanner('💾 Staff added & saved');
};