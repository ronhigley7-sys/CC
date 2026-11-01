

// ════════════════════════════════════
//  ONBOARDING / OFFBOARDING
// ════════════════════════════════════

const OB_CHECKLISTS_DEFAULT = {
  onboarding: {
    HR: [
      'Offer letter signed and returned',
      'I-9 and employment eligibility verified',
      'Direct deposit / payroll setup',
      'Benefits enrollment completed (30-day window)',
      'Employee handbook acknowledged',
      'HIPAA confidentiality agreement signed',
      'Background check cleared',
      'Parking/badge/ID issued',
    ],
    IT: [
      'Network login and password created',
      'EMR / Epic access granted and tested',
      'Email account set up',
      'Timekeeping system (UKG) access confirmed',
      'Unit printer and scanner access',
      'Pyxis / medication dispensing access',
    ],
    Clinical: [
      'Unit tour with charge nurse',
      'Emergency equipment locations reviewed (crash cart, fire exits)',
      'Nurse call system training',
      'Fall prevention protocol reviewed',
      'Isolation precautions / PPE locations',
      'Chain of command / escalation process',
      'Shift handoff / SBAR review',
      'First scheduled shift confirmed with preceptor',
    ],
  },
  offboarding: {
    Admin: [
      'ELT submission',
      'Einstein/I-Solved submission',
    ],
    HR: [
      'Resignation / separation letter received',
      'Final paycheck and PTO payout processed',
      'Benefits termination date confirmed (COBRA notice sent)',
      'Exit interview scheduled / completed',
      'References policy reviewed with employee',
    ],
    IT: [
      'Network and email access deactivated',
      'EMR / Epic access removed',
      'UKG access removed',
      'Pyxis / medication dispensing access removed',
      'Hospital-issued devices returned',
    ],
    Clinical: [
      'Keys, badge, and parking pass returned',
      'Locker emptied and cleared',
      'Outstanding patient care tasks transitioned',
      'Schedule removed and replacement coverage arranged',
      'Final performance documentation completed',
      'Staff notified as appropriate',
    ],
  },
};

// Get checklist for specific employee — custom if set, else defaults
function getObChecklist(name, type) {
  const custom = ((state.onboarding[name] || state.offboarding[name] || {}).customChecklist || {})[type];
  return custom || OB_CHECKLISTS_DEFAULT[type];
}

// Save a custom item edit
function saveObItem(name, obType, section, idx, newText) {
  const store = obType === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].customChecklist) store[name].customChecklist = {};
  if (!store[name].customChecklist[obType]) {
    store[name].customChecklist[obType] = {};
    // Copy defaults
    Object.entries(OB_CHECKLISTS_DEFAULT[obType]).forEach(([sec, items]) => {
      store[name].customChecklist[obType][sec] = [...items];
    });
  }
  if (!store[name].customChecklist[obType][section]) {
    store[name].customChecklist[obType][section] = [...(OB_CHECKLISTS_DEFAULT[obType][section] || [])];
  }
  store[name].customChecklist[obType][section][idx] = newText;
  persistSave();
}

function addObItem(name, obType, section) {
  const text = prompt('Enter new checklist item:');
  if (!text || !text.trim()) return;
  const store = obType === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].customChecklist) store[name].customChecklist = {};
  if (!store[name].customChecklist[obType]) {
    store[name].customChecklist[obType] = {};
    Object.entries(OB_CHECKLISTS_DEFAULT[obType]).forEach(([sec, items]) => {
      store[name].customChecklist[obType][sec] = [...items];
    });
  }
  if (!store[name].customChecklist[obType][section]) {
    store[name].customChecklist[obType][section] = [...(OB_CHECKLISTS_DEFAULT[obType][section] || [])];
  }
  store[name].customChecklist[obType][section].push(text.trim());
  persistSave();
  renderOnboarding();
}

function deleteObItem(name, obType, section, idx) {
  const store = obType === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].customChecklist) store[name].customChecklist = {};
  if (!store[name].customChecklist[obType]) {
    store[name].customChecklist[obType] = {};
    Object.entries(OB_CHECKLISTS_DEFAULT[obType]).forEach(([sec, items]) => {
      store[name].customChecklist[obType][sec] = [...items];
    });
  }
  if (!store[name].customChecklist[obType][section]) {
    store[name].customChecklist[obType][section] = [...(OB_CHECKLISTS_DEFAULT[obType][section] || [])];
  }
  store[name].customChecklist[obType][section].splice(idx, 1);
  // Remove the done entry too
  const fullKey = section + '|' + idx;
  persistSave();
  renderOnboarding();
}

function syncOnboardingToOrientation() {
  if (!state.onboarding) return;
  const names = Object.keys(state.onboarding);
  if (!names.length) { showSaveBanner('No onboarding staff to sync'); return; }

  let added = 0, skipped = 0;

  names.forEach(name => {
    const ob  = state.onboarding[name];
    // Skip offboarded/completed entries
    if (!ob || ob.offDate) { skipped++; return; }

    if (!state.orientation) state.orientation = {};

    // Create orientation record if doesn't exist
    if (!state.orientation[name]) {
      const role = ob.role || 'RN';
      const startDate = ob.startDate || new Date().toISOString().split('T')[0];
      const isAgencyNw = !!(state.agencyDates && state.agencyDates[name]?.isAgency);
      const oriRole    = isAgencyNw ? 'Agency RN' : role;
      const defaultWk  = isAgencyNw ? 1 : (role === 'CA') ? 6 : 12;
      const targetDt   = new Date(startDate + 'T12:00:00');
      targetDt.setDate(targetDt.getDate() + (isAgencyNw ? 3 : defaultWk * 7));

      state.orientation[name] = {
        preceptor:  ob.buddy || '',
        buddy:      ob.buddy || '',
        buddyLater: !ob.buddy,
        startDate,
        targetDate: targetDt.toISOString().split('T')[0],
        offDate:    '',
        role:       oriRole,
        totalWeeks: defaultWk,
        weeks:      {},
        milestones: {},
        notes:      ob.notes || '',
        profile:    { food:'', movie:'', hobbies:'', proudOf:'', perfectDay:'' },
        meetingLogs: [],
      };
      added++;
    } else {
      // Update buddy/preceptor if not yet set
      const od = state.orientation[name];
      if (!od.preceptor && ob.buddy) { od.preceptor = ob.buddy; od.buddy = ob.buddy; od.buddyLater = false; }
      skipped++;
    }
  });

  persistSave();
  showSaveBanner(`🎓 Synced: ${added} added to Orientation${skipped ? `, ${skipped} already exist` : ''}`);
  if (added > 0) showToast(`${added} staff moved to Orientation tab`);
}

function initOnboarding() {
  const dl  = document.getElementById('ob-staff-dl');
  const bdl = document.getElementById('ob-buddy-dl');
  if (dl)  dl.innerHTML  = MASTER_STAFF.map(s => `<option value="${s.name}">`).join('');
  if (bdl) bdl.innerHTML = MASTER_STAFF.filter(s => s.job === 'RN' || s.job === 'LPN').map(s => `<option value="${s.name}">`).join('');
  const d = document.getElementById('ob-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
  // Auto-sync onboarding → orientation silently on load
  if (state.onboarding && Object.keys(state.onboarding).length) syncOnboardingToOrientation();
  if (document.getElementById('panel-onboarding')?.style.display !== 'none') renderOnboarding();
}

function openObModal(name, type) {
  type = type || document.getElementById('ob-view')?.value || 'onboarding';
  const m = document.getElementById('ob-modal'); if (!m) return;
  m.style.display = 'flex';
  document.getElementById('ob-edit-name').value = name || '';
  document.getElementById('ob-edit-type').value = type;
  document.getElementById('ob-modal-title').textContent = (name ? 'Edit' : 'Add') + ' — ' + (type === 'onboarding' ? 'Onboarding' : 'Offboarding');
  const isOff = type === 'offboarding';
  document.getElementById('ob-date-label').textContent  = isOff ? 'Last Day' : 'Start Date';
  document.getElementById('ob-buddy-wrap').style.display  = isOff ? 'none' : 'block';
  document.getElementById('ob-reason-wrap').style.display = isOff ? 'block' : 'none';
  if (name) {
    const rec = (isOff ? state.offboarding : state.onboarding)[name] || {};
    document.getElementById('ob-name').value    = name;
    document.getElementById('ob-role').value    = rec.role  || 'RN';
    document.getElementById('ob-date').value    = isOff ? (rec.lastDay || '') : (rec.startDate || '');
    document.getElementById('ob-buddy').value   = rec.buddy || '';
    document.getElementById('ob-reason').value  = rec.reason || 'Resignation';
    document.getElementById('ob-notes').value   = rec.notes || '';
  } else {
    ['ob-name','ob-buddy','ob-notes'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    document.getElementById('ob-date').value   = new Date().toISOString().split('T')[0];
  }
}

function closeObModal() { const m = document.getElementById('ob-modal'); if (m) m.style.display = 'none'; }

function saveObEntry() {
  const name = (document.getElementById('ob-name')?.value || '').trim();
  if (!name) { alert('Enter a name.'); return; }
  const type = document.getElementById('ob-edit-type')?.value || 'onboarding';
  const isOff = type === 'offboarding';
  const entry = {
    role:      document.getElementById('ob-role')?.value    || 'RN',
    notes:     document.getElementById('ob-notes')?.value   || '',
    ...(isOff
      ? { lastDay: document.getElementById('ob-date')?.value || '', reason: document.getElementById('ob-reason')?.value || '' }
      : { startDate: document.getElementById('ob-date')?.value || '', buddy: document.getElementById('ob-buddy')?.value || '' }),
  };
  const store = isOff ? state.offboarding : state.onboarding;
  if (!store[name]) entry.done = {};
  store[name] = Object.assign(store[name] || { done:{} }, entry);
  persistSave(); closeObModal(); renderOnboarding();
}

function toggleObCheck(name, type, section, key) {
  const store = type === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].done) store[name].done = {};
  const fullKey = section + '|' + key;
  if (store[name].done[fullKey]) delete store[name].done[fullKey];
  else store[name].done[fullKey] = new Date().toISOString().split('T')[0];
  persistSave(); renderOnboarding();
}

function deleteObEntry(name, type) {
  if (!confirm('Remove ' + name + ' from ' + type + '?')) return;
  const store = type === 'offboarding' ? state.offboarding : state.onboarding;
  delete store[name]; persistSave(); renderOnboarding();
}

function renderOnboarding() {
  const type = document.getElementById('ob-view')?.value || 'onboarding';
  const store = type === 'offboarding' ? (state.offboarding || {}) : (state.onboarding || {});
  // Checklist is fetched per-employee inside the loop
  const isOff = type === 'offboarding';
  const el = document.getElementById('ob-list'); if (!el) return;

  if (!Object.keys(store).length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text3);">
      <div style="font-size:36px;margin-bottom:12px;">${isOff ? '🚪' : '🟢'}</div>
      <div style="font-size:13px;color:var(--white);margin-bottom:6px;">No ${type} records</div>
      <button onclick="openObModal()" class="btn btn-primary" style="font-size:12px;margin-top:8px;">+ Add Employee</button>
    </div>`; return;
  }

  el.innerHTML = Object.entries(store).map(([name, rec]) => {
    const rCol = IV_ROLE_COLOR[rec.role] || 'var(--text2)';
    const initials = name.split(',').map(p => p.trim()[0] || '').join('');
    const dateLabel = isOff ? rec.lastDay : rec.startDate;
    const dateStr = dateLabel ? new Date(dateLabel + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';

    // Count completed items — use per-employee checklist
    const empChecklist = getObChecklist(name, type);
    const done = rec.done || {};
    const totalItems = Object.values(empChecklist).flat().length;
    const doneCount  = Object.keys(done).length;
    const pct = totalItems ? Math.round(doneCount / totalItems * 100) : 0;

    const sections = Object.entries(empChecklist).map(([section, items]) => {
      const sColor = { Admin:'var(--purple2)', HR:'var(--amber2)', IT:'var(--teal2)', Clinical:'var(--accent2)' }[section] || 'var(--text2)';
      const safeN = name.replace(/'/g, "\\'");
      const rows = items.map((item, idx) => {
        const key  = section + '|' + item;
        const isDone = !!done[key];
        const dDate  = done[key] ? new Date(done[key] + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
        return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);group">
          <input type="checkbox" ${isDone ? 'checked' : ''}
            onchange="toggleObCheck('${safeN}','${type}','${section}','${item.replace(/'/g,"\\'")}',this)"
            style="width:14px;height:14px;cursor:pointer;accent-color:var(--green2);flex-shrink:0;">
          <input type="text" value="${item.replace(/"/g,'&quot;')}"
            onblur="saveObItem('${safeN}','${type}','${section}',${idx},this.value);renderOnboarding();"
            style="flex:1;background:transparent;border:none;border-bottom:1px dashed rgba(255,255,255,${isDone?'0.05':'0.12'});color:${isDone?'var(--text3)':'var(--text2)'};font-size:11px;outline:none;padding:1px 3px;${isDone?'text-decoration:line-through;':''}">
          ${isDone ? `<span style="font-size:11px;color:var(--green2);white-space:nowrap;">✓ ${dDate}</span>` : ''}
          <button onclick="deleteObItem('${safeN}','${type}','${section}',${idx})" style="background:none;border:none;color:rgba(255,255,255,0.12);cursor:pointer;font-size:11px;padding:0 2px;flex-shrink:0;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='rgba(255,255,255,0.12)'" title="Remove item">✕</button>
        </div>`;
      }).join('');
      const sectionDone = items.filter(i => !!done[section + '|' + i]).length;
      return `<div style="flex:1;min-width:220px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:11px;font-weight:700;color:${sColor};text-transform:uppercase;letter-spacing:.4px;">${section} (${sectionDone}/${items.length})</div>
          <button onclick="addObItem('${safeN}','${type}','${section}')" style="font-size:11px;padding:1px 6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:3px;color:var(--text3);cursor:pointer;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">+ Add</button>
        </div>
        ${rows}
      </div>`;
    }).join('');

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,0.04);border-bottom:1px solid var(--border);">
        <div style="width:38px;height:38px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${name}</div>
          <div style="font-size:11px;color:${rCol};">${rec.role}${isOff && rec.reason ? ' · ' + rec.reason : ''}${!isOff && rec.buddy ? ' · Buddy: ' + rec.buddy.split(',')[0] : ''} · ${isOff ? 'Last Day' : 'Start'}: ${dateStr}</div>
        </div>
        <div style="text-align:center;margin-right:8px;">
          <div style="font-size:16px;font-weight:700;color:${pct===100?'var(--green2)':'var(--accent2)'};">${pct}%</div>
          <div style="font-size:11px;color:var(--text3);">${doneCount}/${totalItems}</div>
        </div>
        <button onclick="openObModal('${name.replace(/'/g,"\\'")}','${type}')" style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎</button>
        ${!isOff && state.orientation && state.orientation[name.replace(/'/g,"\\'")] ? `<button onclick="switchTab('orientation');setTimeout(()=>renderOrientationDetail('${name.replace(/'/g,"\\'")}'),100)" style="font-size:11px;padding:3px 8px;background:rgba(46,125,209,0.12);border:1px solid rgba(46,125,209,0.35);border-radius:4px;color:var(--accent2);cursor:pointer;" title="View orientation tracker">🎓</button>` : ''}
        <button onclick="deleteObEntry('${name.replace(/'/g,"\\'")}','${type}')" style="font-size:11px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;gap:16px;padding:14px 16px;flex-wrap:wrap;">${sections}</div>
      ${rec.notes ? `<div style="padding:8px 16px 12px;font-size:11px;color:var(--text3);border-top:1px solid rgba(255,255,255,0.05);">📝 ${ccEsc(rec.notes)}</div>` : ''}
    </div>`;
  }).join('');
}

// ════════════════════════════════════
//  COACHING TAB
// ════════════════════════════════════

const COACH_AREA_CFG = {
  Attendance:    { icon:'📅', color:'var(--amber2)',  threshold: (d) => d.callouts >= 3 || d.tardies >= 3 },
  Falls:         { icon:'🚶', color:'var(--red2)',    threshold: (d) => d.falls > 0 },
  HAPI:          { icon:'🩹', color:'var(--red2)',    threshold: (d) => d.hapIs > 0 },
  Scanning:      { icon:'💊', color:'var(--accent2)', threshold: (d) => d.scanPct !== null && d.scanPct < 95 },
  Pain:          { icon:'💔', color:'var(--purple2)', threshold: (d) => d.painPct !== null && d.painPct < 90 },
  PLATO:         { icon:'🔄', color:'var(--teal2)',   threshold: (d) => d.platoPct !== null && d.platoPct < 90 },
  Documentation: { icon:'📝', color:'var(--text2)',   threshold: () => false },
  Communication: { icon:'🗣', color:'var(--teal2)',   threshold: () => false },
  Conduct:       { icon:'⚠️', color:'var(--amber2)',  threshold: () => false },
  Clinical:      { icon:'🩺', color:'var(--green2)',  threshold: () => false },
  Other:         { icon:'📋', color:'var(--text3)',   threshold: () => false },
};

function initCoaching() {
  const yrSel = document.getElementById('coach-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    for (let y = cur - 1; y <= cur + 1; y++) {
      const o = document.createElement('option'); o.value = y; o.textContent = y;
      if (y === cur) o.selected = true; yrSel.appendChild(o);
    }
  }
  if (document.getElementById('panel-coaching')?.style.display !== 'none') renderCoaching();
}

// ════════════════════════════════════
//  FALL ROUNDING COMPLIANCE (PLATO)
//  state.fallRoundData: array of per-round observations pasted in from the
//  unit's fall-rounding audit sheet — { id, staff, date, compliant, items:{...}, notes }
// ════════════════════════════════════

const FALL_ROUND_ITEMS = [
  { key:'signIn',       label:'Sign In Place' },
  { key:'lightOn',      label:'Light On' },
  { key:'bracelet',     label:'Fall Bracelet On' },
  { key:'footwear',     label:'Non-Skid Footwear' },
  { key:'clutterFree',  label:'Clutter-Free Room' },
  { key:'alarmOn',      label:'Bed/Chair Alarm On' },
  { key:'callLight',    label:'Call Light Within Reach' },
  { key:'bedLowLocked', label:'Bed Low & Locked' },
  { key:'gaitBelt',     label:'Gait Belt in Room' },
  { key:'ambAid',       label:'Ambulation Aid Available' },
  { key:'nearStation',  label:'Near Nurses Station' },
];

function parseUSDate(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, mo, da, yr] = m;
  if (yr.length === 2) yr = '20' + yr;
  const d = new Date(parseInt(yr), parseInt(mo) - 1, parseInt(da), 12);
  return isNaN(d.getTime()) ? null : d;
}

// Parses tab-delimited text pasted directly from Excel (header row required,
// column order doesn't matter — matched by header text).
function parseFallRoundPaste(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const findCol = (...patterns) => header.findIndex(h => patterns.some(p => h.includes(p)));
  const idx = {
    staff:        findCol('staff'),
    staff2:       findCol('second nurse assigned', 'second nurse'),
    ca:           findCol('ca / pct', 'ca/pct', 'ca / pct / ema', 'pct / ema assigned', 'ca pct ema'),
    compliance:   findCol('fall complian', 'complian'),
    date:         findCol('date'),
    signIn:       findCol('sign in'),
    lightOn:      findCol('light on', 'light'),
    bracelet:     findCol('bracelet'),
    footwear:     findCol('footwear'),
    clutterFree:  findCol('clutter'),
    alarmOn:      findCol('alarm'),
    callLight:    findCol('call light'),
    bedLowLocked: findCol('bed low'),
    gaitBelt:     findCol('gait belt'),
    ambAid:       findCol('ambulation'),
    nearStation:  findCol('near nurse', 'nurses station'),
  };
  // Notes/comment column: last non-empty header cell that isn't already matched above
  const matchedIdx = new Set(Object.values(idx).filter(i => i >= 0));
  let notesIdx = -1;
  for (let i = header.length - 1; i >= 0; i--) { if (!matchedIdx.has(i)) { notesIdx = i; break; } }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const staff = idx.staff >= 0 ? (cells[idx.staff] || '').trim() : '';
    if (!staff) continue;
    const complianceRaw = idx.compliance >= 0 ? (cells[idx.compliance] || '').trim().toLowerCase() : '';
    const compliant = complianceRaw.startsWith('compliant');
    const items = {};
    FALL_ROUND_ITEMS.forEach(it => { items[it.key] = idx[it.key] >= 0 ? (cells[idx[it.key]] || '').trim() : ''; });
    rows.push({
      id: 'fr_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
      staff,
      staff2: idx.staff2 >= 0 ? (cells[idx.staff2] || '').trim() : '',
      ca: idx.ca >= 0 ? (cells[idx.ca] || '').trim() : '',
      date: idx.date >= 0 ? (cells[idx.date] || '').trim() : '',
      compliant,
      items,
      notes: notesIdx >= 0 ? (cells[notesIdx] || '').trim() : '',
    });
  }
  return rows;
}

// All staff jointly assigned to a round (primary, second nurse, CA/PCT/EMA) share
// accountability for that round's compliance outcome. Raw names are resolved through
// state.staffNameMap (built via the Unmatched Names review panel below) so typos and
// role-suffix variants in the source export ("Kelly Dean RN" → "Kelly Dean") map
// correctly to the directory without editing the underlying imported rows.
function roundStaffNames(r) {
  const map = state.staffNameMap || {};
  return [r.staff, r.staff2, r.ca].filter(Boolean).map(n => map[n] || n);
}

// Simple Levenshtein distance for name-similarity suggestions.
function levenshtein(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]);
    }
  }
  return d[m][n];
}

// Best-guess directory match for a raw (unmatched) name, e.g. "Kelly Dean RN" → "Kelly Dean",
// "Jessica Alexendar" → "Jessica Alexander". Returns top 2 candidates with a similarity score.
function suggestStaffMatch(rawName) {
  const norm = s => s.toLowerCase().replace(/\b(rn|lpn|ca|pct|ema)\b\.?/g, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  const rawNorm = norm(rawName);
  const scored = MASTER_STAFF.map(s => {
    const candNorm = norm(s.name);
    if (candNorm === rawNorm) return { name: s.name, score: 100 };
    const dist = levenshtein(rawNorm, candNorm);
    const maxLen = Math.max(rawNorm.length, candNorm.length) || 1;
    const startsWith = candNorm.startsWith(rawNorm) || rawNorm.startsWith(candNorm);
    let score = Math.round((1 - dist / maxLen) * 100);
    if (startsWith) score = Math.max(score, 85);
    return { name: s.name, score };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).filter(s => s.score >= 50);
}

// Collects every raw staff/staff2/ca name across both PLATO round datasets that isn't
// already a directory name, isn't already mapped, and hasn't been dismissed as "not staff."
function getUnmatchedRoundNames() {
  const map = state.staffNameMap || {};
  const ignored = new Set(state.staffNameIgnored || []);
  const dirNames = new Set(MASTER_STAFF.map(s => s.name));
  const counts = {};
  [...(state.fallRoundData || []), ...(state.hapiRoundData || [])].forEach(r => {
    [r.staff, r.staff2, r.ca].filter(Boolean).forEach(raw => {
      if (dirNames.has(raw) || map[raw] || ignored.has(raw)) return;
      counts[raw] = (counts[raw] || 0) + 1;
    });
  });
  return Object.keys(counts).map(raw => ({
    raw, count: counts[raw], suggestions: suggestStaffMatch(raw),
  })).sort((a, b) => b.count - a.count);
}

function confirmStaffNameMatch(rawName, canonicalName) {
  if (!state.staffNameMap) state.staffNameMap = {};
  state.staffNameMap[rawName] = canonicalName;
  persistSave();
  renderFallRounding(); renderHapiRounding();
  showSaveBanner(`💾 Mapped "${rawName}" → ${canonicalName}`);
}

function ignoreStaffNameMatch(rawName) {
  if (!state.staffNameIgnored) state.staffNameIgnored = [];
  state.staffNameIgnored.push(rawName);
  persistSave();
  renderFallRounding(); renderHapiRounding();
}

function renderUnmatchedNamesPanel(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const unmatched = getUnmatchedRoundNames();
  if (!unmatched.length) { el.innerHTML = ''; return; }
  const allStaffSorted = MASTER_STAFF.map(s => s.name).slice().sort();
  el.innerHTML = `
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:8px;">⚠ ${unmatched.length} Name${unmatched.length===1?'':'s'} Not Matching the Staff Directory</div>
      ${unmatched.map(u => {
        const suggestedNames = new Set(u.suggestions.map(s => s.name));
        const selId = 'unmatch-sel-' + btoa(unescape(encodeURIComponent(u.raw))).replace(/[^a-zA-Z0-9]/g, '');
        return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:1px solid rgba(245,158,11,0.15);">
          <div style="flex:1;min-width:140px;font-size:12px;color:var(--white);">"${u.raw}" <span style="color:var(--text3);">(${u.count} round${u.count===1?'':'s'})</span></div>
          <select id="${selId}" style="background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:3px 6px;color:var(--white);font-size:11px;outline:none;max-width:220px;">
            ${u.suggestions.length ? `<optgroup label="Suggested">${u.suggestions.map(s => `<option value="${s.name.replace(/"/g,'&quot;')}">${s.name} (${s.score}% match)</option>`).join('')}</optgroup>` : ''}
            <optgroup label="All Staff">${allStaffSorted.filter(n => !suggestedNames.has(n)).map(n => `<option value="${n.replace(/"/g,'&quot;')}">${n}</option>`).join('')}</optgroup>
          </select>
          <button onclick="confirmStaffNameMatch('${u.raw.replace(/'/g,"\\'")}', document.getElementById('${selId}').value)"
            style="font-size:11px;padding:4px 10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:5px;color:var(--green2);cursor:pointer;">✓ Confirm</button>
          <button onclick="ignoreStaffNameMatch('${u.raw.replace(/'/g,"\\'")}')"
            style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:5px;color:var(--text3);cursor:pointer;">Not Staff — Dismiss</button>
        </div>`;
      }).join('')}
    </div>`;
}

const HAPI_ROUND_ITEMS = [
  { key:'foamMepilex',    label:'Foam/Mepilex in Place' },
  { key:'heelOffload',    label:'Heel Offloading' },
  { key:'heelOffloadDev', label:'Heel Offloading Device' },
  { key:'hob30',          label:'HOB </= 30 Degrees' },
  { key:'posMatchClock',  label:'Position Matches Clock' },
  { key:'sacrumOffload',  label:'Sacrum Offloaded' },
  { key:'offloadDevice',  label:'Offloading Device' },
  { key:'waffleCushion',  label:'Waffle Cushion' },
  { key:'specialtyBed',   label:'Specialty Bed' },
];

// Parses tab-delimited text pasted directly from Excel (header row required,
// column order doesn't matter — matched by header text). Mirrors parseFallRoundPaste.
function parseHapiRoundPaste(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const findCol = (...patterns) => header.findIndex(h => patterns.some(p => h.includes(p)));
  const findColExcl = (excludeIdx, ...patterns) => header.findIndex((h, i) => i !== excludeIdx && patterns.some(p => h.includes(p)));
  const heelOffloadDevIdx = findCol('heel offloading device');
  const specialtyBedTypeIdx = findCol('what specialty');
  const staff2Idx = findCol('second nurse assigned', 'second nurse');
  const idx = {
    staff:          findColExcl(staff2Idx, 'staff', 'nurse assigned'),
    staff2:         staff2Idx,
    ca:             findCol('ca / pct', 'ca/pct', 'ca / pct / ema', 'pct / ema assigned', 'ca pct ema'),
    compliance:     findCol('hapi complian', 'complian'),
    date:           findCol('date'),
    foamMepilex:    findCol('foam', 'mepilex'),
    heelOffload:    findColExcl(heelOffloadDevIdx, 'heel offload'),
    heelOffloadDev: heelOffloadDevIdx,
    hob30:          findCol('hob'),
    posMatchClock:  findCol('position', 'match'),
    sacrumOffload:  findCol('sacrum'),
    offloadDevice:  findCol('offloading device'),
    waffleCushion:  findCol('waffle'),
    specialtyBed:   findColExcl(specialtyBedTypeIdx, 'specialty bed'),
  };
  // "What specialty bed?" is a free-text type column, not a Yes/No item — deliberately excluded from HAPI_ROUND_ITEMS matching
  const matchedIdx = new Set(Object.values(idx).filter(i => i >= 0));
  let notesIdx = -1;
  for (let i = header.length - 1; i >= 0; i--) { if (!matchedIdx.has(i)) { notesIdx = i; break; } }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const staff = idx.staff >= 0 ? (cells[idx.staff] || '').trim() : '';
    if (!staff) continue;
    const complianceRaw = idx.compliance >= 0 ? (cells[idx.compliance] || '').trim().toLowerCase() : '';
    const compliant = complianceRaw.startsWith('compliant');
    const items = {};
    HAPI_ROUND_ITEMS.forEach(it => { items[it.key] = idx[it.key] >= 0 ? (cells[idx[it.key]] || '').trim() : ''; });
    rows.push({
      id: 'hr_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
      staff,
      staff2: idx.staff2 >= 0 ? (cells[idx.staff2] || '').trim() : '',
      ca: idx.ca >= 0 ? (cells[idx.ca] || '').trim() : '',
      date: idx.date >= 0 ? (cells[idx.date] || '').trim() : '',
      compliant,
      items,
      notes: notesIdx >= 0 ? (cells[notesIdx] || '').trim() : '',
    });
  }
  return rows;
}

// "No" is a genuine miss; "N/A" / "Pt Refused" / blank are excluded from the denominator
// rather than counted against compliance — mirrors how HAPI PLATO items work clinically
// (e.g. heel offloading N/A for a patient who is up in a chair).
function getHapiRoundStats(name, yr) {
  const recs = (state.hapiRoundData || []).filter(r => {
    if (!roundStaffNames(r).includes(name)) return false;
    if (!yr) return true;
    const d = parseUSDate(r.date);
    return d ? d.getFullYear() === yr : true;
  });
  const total = recs.length;
  const compliantCount = recs.filter(r => r.compliant).length;
  const pct = total > 0 ? Math.round(compliantCount / total * 100) : null;
  const missedCounts = {};
  HAPI_ROUND_ITEMS.forEach(it => missedCounts[it.key] = 0);
  recs.forEach(r => HAPI_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') missedCounts[it.key]++; }));
  const missedList = HAPI_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:missedCounts[it.key] })).filter(m => m.count > 0).sort((a, b) => b.count - a.count);
  return { total, compliantCount, pct, missedList, recs };
}

function getHapiRoundLeaderboard(yr) {
  const counts = {}; HAPI_ROUND_ITEMS.forEach(it => counts[it.key] = 0);
  let total = 0;
  (state.hapiRoundData || []).forEach(r => {
    if (yr) { const d = parseUSDate(r.date); if (d && d.getFullYear() !== yr) return; }
    total++;
    HAPI_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') counts[it.key]++; });
  });
  const missed = HAPI_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:counts[it.key] })).sort((a, b) => b.count - a.count);
  return { total, missed };
}

function initHapiRounding() {
  const yrSel = document.getElementById('hr-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    let html = '<option value="ALL">All Years</option>';
    for (let y = cur; y >= cur - 3; y--) html += `<option value="${y}"${y===cur?' selected':''}>${y}</option>`;
    yrSel.innerHTML = html;
  }
  renderHapiRounding();
}

function importHapiRoundPaste() {
  const ta = document.getElementById('hr-paste');
  const statusEl = document.getElementById('hr-import-status');
  const text = ta?.value || '';
  if (!text.trim()) { if (statusEl) statusEl.textContent = 'Paste some rows first.'; return; }
  const rows = parseHapiRoundPaste(text);
  if (!rows.length) { if (statusEl) { statusEl.textContent = '⚠ No valid rows found — check that a "Staff" column is present.'; statusEl.style.color = 'var(--red2)'; } return; }
  if (!state.hapiRoundData) state.hapiRoundData = [];
  state.hapiRoundData.push(...rows);
  persistSave();
  if (ta) ta.value = '';
  if (statusEl) { statusEl.textContent = `✓ Imported ${rows.length} round${rows.length===1?'':'s'}.`; statusEl.style.color = 'var(--green2)'; }
  renderHapiRounding();
  showSaveBanner('💾 Imported ' + rows.length + ' HAPI rounding record' + (rows.length===1?'':'s'));
}

function clearHapiRoundData() {
  if (!confirm('Delete ALL imported HAPI rounding compliance data? This cannot be undone.')) return;
  state.hapiRoundData = [];
  persistSave();
  renderHapiRounding();
}

function renderHapiRounding() {
  const yrVal = document.getElementById('hr-year')?.value || String(new Date().getFullYear());
  const yr = yrVal === 'ALL' ? null : parseInt(yrVal);

  renderUnmatchedNamesPanel('hr-unmatched-names');

  const totalEl = document.getElementById('hr-total-rounds');
  const allRounds = (state.hapiRoundData || []).length;
  if (totalEl) totalEl.textContent = allRounds + ' round' + (allRounds===1?'':'s') + ' on file (all years)';

  const lb = getHapiRoundLeaderboard(yr);
  const lbEl = document.getElementById('hr-leaderboard');
  if (lbEl) {
    if (!lb.total) {
      lbEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No rounds imported for this period yet.</div>';
    } else {
      const maxCount = Math.max(1, lb.missed[0]?.count || 0);
      lbEl.innerHTML = lb.missed.filter(m => m.count > 0).slice(0, 9).map(m => {
        const pct = Math.round(m.count / lb.total * 100);
        const barW = Math.round(m.count / maxCount * 100);
        return `<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
            <span style="color:var(--white);">${m.label}</span>
            <span style="color:var(--text3);">${m.count} miss${m.count===1?'':'es'} · ${pct}% of rounds</span>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:7px;overflow:hidden;">
            <div style="background:var(--red2);height:100%;width:${barW}%;"></div>
          </div>
        </div>`;
      }).join('') || '<div style="font-size:11px;color:var(--text3);">No missed elements — 100% compliance across all audited rounds. 🎉</div>';
    }
  }

  const staffEl = document.getElementById('hr-staff-list');
  if (staffEl) {
    const names = [...new Set((state.hapiRoundData || []).flatMap(roundStaffNames))]
      .filter(name => MASTER_STAFF.some(s => s.name === name))
      .sort();
    if (!names.length) {
      staffEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No staff data yet — import rounds above.</div>';
    } else {
      const rows = names.map(name => {
        const stats = getHapiRoundStats(name, yr);
        const staffRec = MASTER_STAFF.find(s => s.name === name);
        return { name, job: staffRec?.job || '—', stats };
      }).filter(r => r.stats.total > 0).sort((a, b) => (a.stats.pct ?? 100) - (b.stats.pct ?? 100));

      staffEl.innerHTML = rows.map(r => {
        const warn = r.stats.pct !== null && r.stats.pct < 90;
        const topMissed = r.stats.missedList.slice(0, 2).map(m => m.label).join(', ');
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${warn?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${warn?'var(--red2)':'var(--border)'};border-radius:8px;padding:10px 14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--white);">${r.name}</div>
              <div style="font-size:11px;color:var(--text3);">${r.job} · ${r.stats.total} audited round${r.stats.total===1?'':'s'}</div>
            </div>
            <span style="font-size:14px;font-weight:700;padding:3px 10px;border-radius:8px;${warn?'background:rgba(239,68,68,0.12);color:var(--red2);':'background:rgba(16,185,129,0.12);color:var(--green2);'}">${r.stats.pct}%</span>
            ${r.stats.total>0 ? `<button onclick="openCoachModal('${r.name.replace(/'/g,"\\'")}','');setCoachAreaChecked('HAPIPLATO',true);"
              style="font-size:11px;padding:4px 10px;background:rgba(46,125,209,0.1);border:1px solid rgba(46,125,209,0.3);border-radius:5px;color:var(--accent2);cursor:pointer;white-space:nowrap;">→ Coach</button>` : ''}
          </div>
          ${topMissed ? `<div style="font-size:11px;color:var(--text3);margin-top:6px;">Most missed: ${topMissed}</div>` : ''}
        </div>`;
      }).join('');
    }
  }
}

function getFallRoundStats(name, yr) {
  const recs = (state.fallRoundData || []).filter(r => {
    if (!roundStaffNames(r).includes(name)) return false;
    if (!yr) return true;
    const d = parseUSDate(r.date);
    return d ? d.getFullYear() === yr : true; // keep unparsable dates rather than silently dropping them
  });
  const total = recs.length;
  const compliantCount = recs.filter(r => r.compliant).length;
  const pct = total > 0 ? Math.round(compliantCount / total * 100) : null;
  const missedCounts = {};
  FALL_ROUND_ITEMS.forEach(it => missedCounts[it.key] = 0);
  recs.forEach(r => FALL_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') missedCounts[it.key]++; }));
  const missedList = FALL_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:missedCounts[it.key] })).filter(m => m.count > 0).sort((a, b) => b.count - a.count);
  return { total, compliantCount, pct, missedList, recs };
}

function getFallRoundLeaderboard(yr) {
  const counts = {}; FALL_ROUND_ITEMS.forEach(it => counts[it.key] = 0);
  let total = 0;
  (state.fallRoundData || []).forEach(r => {
    if (yr) { const d = parseUSDate(r.date); if (d && d.getFullYear() !== yr) return; }
    total++;
    FALL_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') counts[it.key]++; });
  });
  const missed = FALL_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:counts[it.key] })).sort((a, b) => b.count - a.count);
  return { total, missed };
}

function initFallRounding() {
  const yrSel = document.getElementById('fr-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    let html = '<option value="ALL">All Years</option>';
    for (let y = cur; y >= cur - 3; y--) html += `<option value="${y}"${y===cur?' selected':''}>${y}</option>`;
    yrSel.innerHTML = html;
  }
  renderFallRounding();
}

function importFallRoundPaste() {
  const ta = document.getElementById('fr-paste');
  const statusEl = document.getElementById('fr-import-status');
  const text = ta?.value || '';
  if (!text.trim()) { if (statusEl) statusEl.textContent = 'Paste some rows first.'; return; }
  const rows = parseFallRoundPaste(text);
  if (!rows.length) { if (statusEl) { statusEl.textContent = '⚠ No valid rows found — check that a "Staff" column is present.'; statusEl.style.color = 'var(--red2)'; } return; }
  if (!state.fallRoundData) state.fallRoundData = [];
  state.fallRoundData.push(...rows);
  persistSave();
  if (ta) ta.value = '';
  if (statusEl) { statusEl.textContent = `✓ Imported ${rows.length} round${rows.length===1?'':'s'}.`; statusEl.style.color = 'var(--green2)'; }
  renderFallRounding();
  showSaveBanner('💾 Imported ' + rows.length + ' fall rounding record' + (rows.length===1?'':'s'));
}

function clearFallRoundData() {
  if (!confirm('Delete ALL imported fall rounding compliance data? This cannot be undone.')) return;
  state.fallRoundData = [];
  persistSave();
  renderFallRounding();
}

function renderFallRounding() {
  const yrVal = document.getElementById('fr-year')?.value || String(new Date().getFullYear());
  const yr = yrVal === 'ALL' ? null : parseInt(yrVal);

  renderUnmatchedNamesPanel('fr-unmatched-names');

  const totalEl = document.getElementById('fr-total-rounds');
  const allRounds = (state.fallRoundData || []).length;
  if (totalEl) totalEl.textContent = allRounds + ' round' + (allRounds===1?'':'s') + ' on file (all years)';

  // Leaderboard — most missed interventions across all staff
  const lb = getFallRoundLeaderboard(yr);
  const lbEl = document.getElementById('fr-leaderboard');
  if (lbEl) {
    if (!lb.total) {
      lbEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No rounds imported for this period yet.</div>';
    } else {
      const maxCount = Math.max(1, lb.missed[0]?.count || 0);
      lbEl.innerHTML = lb.missed.filter(m => m.count > 0).slice(0, 11).map(m => {
        const pct = Math.round(m.count / lb.total * 100);
        const barW = Math.round(m.count / maxCount * 100);
        return `<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
            <span style="color:var(--white);">${m.label}</span>
            <span style="color:var(--text3);">${m.count} miss${m.count===1?'':'es'} · ${pct}% of rounds</span>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:7px;overflow:hidden;">
            <div style="background:var(--red2);height:100%;width:${barW}%;"></div>
          </div>
        </div>`;
      }).join('') || '<div style="font-size:11px;color:var(--text3);">No missed elements — 100% compliance across all audited rounds. 🎉</div>';
    }
  }

  // Per-staff compliance list — directory staff only (excludes typos/name mismatches from the raw export)
  const staffEl = document.getElementById('fr-staff-list');
  if (staffEl) {
    const names = [...new Set((state.fallRoundData || []).flatMap(roundStaffNames))]
      .filter(name => MASTER_STAFF.some(s => s.name === name))
      .sort();
    if (!names.length) {
      staffEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No staff data yet — import rounds above.</div>';
    } else {
      const rows = names.map(name => {
        const stats = getFallRoundStats(name, yr);
        const staffRec = MASTER_STAFF.find(s => s.name === name);
        const rCol = IV_ROLE_COLOR[staffRec?.job] || 'var(--text2)';
        return { name, job: staffRec?.job || '—', stats };
      }).filter(r => r.stats.total > 0).sort((a, b) => (a.stats.pct ?? 100) - (b.stats.pct ?? 100));

      staffEl.innerHTML = rows.map(r => {
        const warn = r.stats.pct !== null && r.stats.pct < 90;
        const topMissed = r.stats.missedList.slice(0, 2).map(m => m.label).join(', ');
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${warn?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${warn?'var(--red2)':'var(--border)'};border-radius:8px;padding:10px 14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--white);">${r.name}</div>
              <div style="font-size:11px;color:var(--text3);">${r.job} · ${r.stats.total} audited round${r.stats.total===1?'':'s'}</div>
            </div>
            <span style="font-size:14px;font-weight:700;padding:3px 10px;border-radius:8px;${warn?'background:rgba(239,68,68,0.12);color:var(--red2);':'background:rgba(16,185,129,0.12);color:var(--green2);'}">${r.stats.pct}%</span>
            ${r.stats.total>0 ? `<button onclick="openCoachModal('${r.name.replace(/'/g,"\\'")}','');setCoachAreaChecked('PLATO',true);"
              style="font-size:11px;padding:4px 10px;background:rgba(46,125,209,0.1);border:1px solid rgba(46,125,209,0.3);border-radius:5px;color:var(--accent2);cursor:pointer;white-space:nowrap;">→ Coach</button>` : ''}
          </div>
          ${topMissed ? `<div style="font-size:11px;color:var(--text3);margin-top:6px;">Most missed: ${topMissed}</div>` : ''}
        </div>`;
      }).join('');
    }
  }
}

function getStaffMetrics(name, job, yr) {
  const log = (state.absenceLog[name] || []).filter(e => new Date(e.date + 'T12:00:00').getFullYear() === yr);
  const callouts = log.filter(e => e.type !== 'tardy' && e.type !== 'TARDY').length;
  const tardies  = log.filter(e => e.type === 'tardy'  || e.type === 'TARDY').length;
  const writeUps = log.filter(e => e.writeUp).length;
  let scanPct = null, painPct = null;
  if (job === 'RN' || job === 'LPN') {
    let tS = 0, tST = 0, tP = 0, tPT = 0;
    for (let mo = 1; mo <= 12; mo++) {
      const k = yr + '-' + String(mo).padStart(2, '0');
      const q = ((state.qualityData[name] || {})[k]) || {};
      tS += q.scans || 0; tST += q.scanTotal || 0;
      tP += q.pain  || 0; tPT += q.painTotal || 0;
    }
    if (tST > 0) scanPct = Math.round(tS / tST * 100);
    if (tPT > 0) painPct = Math.round(tP / tPT * 100);
  }
  const si = (state.staffIncidents || {})[name] || {};
  const filterYr = arr => (arr || []).filter(e => new Date(e.date + 'T12:00:00').getFullYear() === yr);
  const falls = filterYr(si.falls).length;
  const hapIs = filterYr(si.hapis).length;

  const fr = getFallRoundStats(name, yr);
  const platoPct = fr.pct;
  const platoTopMissed = fr.missedList[0] ? fr.missedList[0].label : '';
  const platoRounds = fr.total;

  const hr = getHapiRoundStats(name, yr);
  const hapiPlatoPct = hr.pct;
  const hapiPlatoTopMissed = hr.missedList[0] ? hr.missedList[0].label : '';
  const hapiPlatoRounds = hr.total;

  return { callouts, tardies, writeUps, scanPct, painPct, falls, hapIs, platoPct, platoTopMissed, platoRounds, hapiPlatoPct, hapiPlatoTopMissed, hapiPlatoRounds };
}

function getStaffFlags(metrics, job) {
  const flags = [];
  if (metrics.callouts >= 3)  flags.push({ area:'Attendance', reason: `${metrics.callouts} call-outs YTD` });
  if (metrics.tardies  >= 3)  flags.push({ area:'Attendance', reason: `${metrics.tardies} tardies YTD` });
  if (metrics.falls    >  0)  flags.push({ area:'Falls',      reason: `${metrics.falls} patient fall${metrics.falls > 1 ? 's' : ''} logged` });
  if (metrics.hapIs    >  0)  flags.push({ area:'HAPI',       reason: `${metrics.hapIs} HAPI${metrics.hapIs > 1 ? 's' : ''} logged` });
  if ((job === 'RN' || job === 'LPN') && metrics.scanPct !== null && metrics.scanPct < 95)
    flags.push({ area:'Scanning', reason: `Scan compliance ${metrics.scanPct}% (goal 95%)` });
  if ((job === 'RN' || job === 'LPN') && metrics.painPct !== null && metrics.painPct < 90)
    flags.push({ area:'Pain', reason: `Pain reassessment ${metrics.painPct}% (goal 90%)` });
  if (metrics.platoPct !== null && metrics.platoPct < 90)
    flags.push({ area:'PLATO', reason: `Fall rounding compliance ${metrics.platoPct}% (goal 90%)${metrics.platoTopMissed ? ' — most missed: ' + metrics.platoTopMissed : ''}` });
  if (metrics.hapiPlatoPct !== null && metrics.hapiPlatoPct < 90)
    flags.push({ area:'HAPIPLATO', reason: `HAPI prevention rounding compliance ${metrics.hapiPlatoPct}% (goal 90%)${metrics.hapiPlatoTopMissed ? ' — most missed: ' + metrics.hapiPlatoTopMissed : ''}` });
  return flags;
}

function toggleAreaPill(chk) {
  const pill = chk.closest('.coach-area-pill');
  if (pill) pill.classList.toggle('checked', chk.checked);
}

function setCoachAreaChecked(area, checked) {
  const chk = document.getElementById('coach-area-' + area);
  if (chk) { chk.checked = checked; toggleAreaPill(chk); }
}

function getCheckedCoachAreas() {
  return Array.from(document.querySelectorAll('.coach-area-chk:checked')).map(c => c.value);
}

// Suggested observation/action-plan text per coaching area, informed by the
// staff member's current metrics where relevant. Used by the "💡 Suggest"
// button in the coaching modal — never auto-applied without a click.
const COACH_AREA_SUGGESTIONS = {
  Attendance:    { observation: m => `Attendance record shows ${m.callouts} call-out${m.callouts===1?'':'s'} and ${m.tardies} tardy occurrence${m.tardies===1?'':'s'} year-to-date.`,
                   plan: `Reviewed attendance policy and trigger points together. Employee will notify charge/manager per policy timeframe for any future absence. Re-check attendance record in 30 days.` },
  Falls:         { observation: m => `${m.falls} patient fall${m.falls===1?'':'s'} logged under this staff member's care this year.`,
                   plan: `Reviewed fall risk assessment and hourly rounding expectations. Re-education on bed alarm and fall precautions completed. Will follow up on next assigned high-risk patient.` },
  HAPI:          { observation: m => `${m.hapIs} hospital-acquired pressure injury event${m.hapIs===1?'':'s'} logged this year.`,
                   plan: `Reviewed skin assessment and turning/repositioning protocol. Re-education on Braden scale documentation and skin rounds provided.` },
  Scanning:      { observation: m => `BCMA scanning compliance at ${m.scanPct!==null?m.scanPct+'%':'no data on file'} against the unit goal of 95%.`,
                   plan: `Reviewed 5 rights / 2 identifier scanning workflow and discussed barriers to bedside scanning. Will re-audit scan log next month.` },
  Pain:          { observation: m => `Pain reassessment compliance at ${m.painPct!==null?m.painPct+'%':'no data on file'} against the unit goal of 90%.`,
                   plan: `Reviewed 30/60-minute post-intervention reassessment requirement and documentation timing in Epic. Will re-check compliance at next audit cycle.` },
  PLATO:         { observation: m => `Fall rounding (PLATO) compliance at ${m.platoPct!==null?m.platoPct+'%':'no data on file'} against the unit goal of 90% across ${m.platoRounds||0} audited round${m.platoRounds===1?'':'s'} this year.${m.platoTopMissed?' Most frequently missed element: '+m.platoTopMissed+'.':''}`,
                   plan: `Reviewed hourly rounding expectations and the specific fall-prevention elements most often missed on audit. Will re-audit rounds next cycle.` },
  HAPIPLATO:     { observation: m => `HAPI prevention rounding (PLATO) compliance at ${m.hapiPlatoPct!==null?m.hapiPlatoPct+'%':'no data on file'} against the unit goal of 90% across ${m.hapiPlatoRounds||0} audited round${m.hapiPlatoRounds===1?'':'s'} this year.${m.hapiPlatoTopMissed?' Most frequently missed element: '+m.hapiPlatoTopMissed+'.':''}`,
                   plan: `Reviewed pressure-injury prevention rounding expectations (offloading, positioning, HOB, specialty surfaces) and the elements most often missed on audit. Will re-audit rounds next cycle.` },
  Transfusion:   { observation: () => `Blood transfusion process deviation identified.`,
                   plan: `Reviewed two-person verification and transfusion monitoring requirements. Re-education completed.` },
  Documentation: { observation: () => `Documentation gaps identified during chart review.`,
                   plan: `Reviewed charting expectations and timeliness standards. Will spot-check documentation over the next two weeks.` },
  Communication: { observation: () => `Communication concern identified (handoff, team, or patient/family interaction).`,
                   plan: `Reviewed SBAR/handoff expectations and professional communication standards. Will observe next shift handoff.` },
  Conduct:       { observation: m => `${m.writeUps>0?m.writeUps+' write-up'+(m.writeUps===1?'':'s')+' on file. ':''}Professional conduct concern discussed.`,
                   plan: `Reviewed expectations outlined in policy. Employee acknowledged understanding. Progressive discipline steps explained if pattern continues.` },
  Clinical:      { observation: () => `Clinical performance concern identified.`,
                   plan: `Reviewed clinical expectations and available competency resources. Scheduled skills validation/precepting as needed.` },
  Other:         { observation: () => `Performance concern discussed.`,
                   plan: `Expectations reviewed and agreed upon together. Follow-up scheduled to reassess.` },
};

function applyCoachSuggestions() {
  const areas = getCheckedCoachAreas();
  if (!areas.length) { alert('Select at least one coaching area first.'); return; }
  const name = document.getElementById('coach-m-name')?.value || '';
  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || 'RN';
  const yr  = parseInt(document.getElementById('coach-year')?.value) || new Date().getFullYear();
  const metrics = getStaffMetrics(name, job, yr);
  const obsLines = [], planLines = [];
  areas.forEach(a => {
    const cfg = COACH_AREA_SUGGESTIONS[a] || COACH_AREA_SUGGESTIONS.Other;
    obsLines.push(typeof cfg.observation === 'function' ? cfg.observation(metrics) : cfg.observation);
    planLines.push(typeof cfg.plan === 'function' ? cfg.plan(metrics) : cfg.plan);
  });
  const notesEl = document.getElementById('coach-m-notes');
  const planEl  = document.getElementById('coach-m-plan');
  if (notesEl) notesEl.value = obsLines.join(' ');
  if (planEl)  planEl.value  = [...new Set(planLines)].join(' ');
}

function populateCoachAreaMetrics(name, job, yr) {
  const metrics = getStaffMetrics(name, job, yr);
  const yrEl = document.getElementById('coach-m-kpi-year');
  if (yrEl) yrEl.textContent = yr + (yr === new Date().getFullYear() ? ' (YTD)' : '');

  let txCount = 0;
  for (let mo = 1; mo <= 12; mo++) {
    const k = yr + '-' + String(mo).padStart(2, '0');
    const q = ((state.qualityData[name] || {})[k]) || {};
    txCount += q.transfusions || 0;
  }

  const set = (area, text, cls) => {
    const el = document.getElementById('coach-area-metric-' + area);
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('warn', 'ok');
    if (cls) el.classList.add(cls);
  };

  set('Attendance', `${metrics.callouts}CO · ${metrics.tardies}T`, (metrics.callouts >= 3 || metrics.tardies >= 3) ? 'warn' : 'ok');
  set('Falls', `${metrics.falls} YTD`, metrics.falls > 0 ? 'warn' : 'ok');
  set('HAPI',  `${metrics.hapIs} YTD`, metrics.hapIs > 0 ? 'warn' : 'ok');
  if (job === 'RN' || job === 'LPN') {
    set('Scanning', metrics.scanPct !== null ? metrics.scanPct + '%' : '—', metrics.scanPct !== null ? (metrics.scanPct < 95 ? 'warn' : 'ok') : '');
    set('Pain',     metrics.painPct !== null ? metrics.painPct + '%' : '—', metrics.painPct !== null ? (metrics.painPct < 90 ? 'warn' : 'ok') : '');
  } else {
    set('Scanning', '', ''); set('Pain', '', '');
  }
  set('Transfusion', txCount > 0 ? txCount + ' YTD' : '', '');
  set('Conduct', metrics.writeUps > 0 ? metrics.writeUps + ' write-up' + (metrics.writeUps === 1 ? '' : 's') : '', metrics.writeUps > 0 ? 'warn' : '');
  set('PLATO', metrics.platoPct !== null ? metrics.platoPct + '% (' + metrics.platoRounds + ' rounds)' : '—', metrics.platoPct !== null ? (metrics.platoPct < 90 ? 'warn' : 'ok') : '');
  set('HAPIPLATO', metrics.hapiPlatoPct !== null ? metrics.hapiPlatoPct + '% (' + metrics.hapiPlatoRounds + ' rounds)' : '—', metrics.hapiPlatoPct !== null ? (metrics.hapiPlatoPct < 90 ? 'warn' : 'ok') : '');
  // Documentation, Communication, Clinical, Other have no single quantifiable KPI tracked — left blank
  set('Documentation', ''); set('Communication', ''); set('Clinical', ''); set('Other', '');
}

function openCoachModal(name, existingId) {
  const m = document.getElementById('coach-modal'); if (!m) return;
  m.style.display = 'flex';
  document.getElementById('coach-m-name').value = name;
  document.getElementById('coach-m-id').value   = existingId || '';
  document.getElementById('coach-modal-title').textContent = existingId ? 'Edit Coaching Session' : 'Add Coaching Session';
  document.getElementById('coach-modal-sub').textContent   = name;
  document.querySelectorAll('.coach-area-chk').forEach(c => setCoachAreaChecked(c.value, false));

  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || 'RN';
  let yr = parseInt(document.getElementById('coach-year')?.value) || new Date().getFullYear();

  if (existingId) {
    const session = ((state.coaching || {})[name] || []).find(s => s.id === existingId);
    if (session) {
      if (session.date) { const dYr = new Date(session.date + 'T12:00:00').getFullYear(); if (!isNaN(dYr)) yr = dYr; }
      populateCoachAreaMetrics(name, job, yr);
      document.getElementById('coach-m-date').value    = session.date    || '';
      const areas = (session.areas && session.areas.length) ? session.areas : (session.area ? [session.area] : ['Attendance']);
      areas.forEach(a => setCoachAreaChecked(a, true));
      document.getElementById('coach-m-notes').value   = session.notes   || '';
      document.getElementById('coach-m-plan').value    = session.plan    || '';
      document.getElementById('coach-m-followup').value= session.followUp|| '';
      document.getElementById('coach-m-status').value  = session.status  || 'Active';
      return;
    }
  }
  populateCoachAreaMetrics(name, job, yr);
  document.getElementById('coach-m-date').value    = new Date().toISOString().split('T')[0];
  document.getElementById('coach-m-followup').value = '';
  ['coach-m-notes','coach-m-plan'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
}

function closeCoachModal() { const m = document.getElementById('coach-modal'); if (m) m.style.display = 'none'; }

function saveCoachSession() {
  const name = document.getElementById('coach-m-name')?.value || '';
  if (!name) return;
  const editId = document.getElementById('coach-m-id')?.value || '';
  let areas = getCheckedCoachAreas();
  if (!areas.length) areas = ['Other'];
  const session = {
    id:       editId || 'coach_' + Date.now(),
    date:     document.getElementById('coach-m-date')?.value    || '',
    areas:    areas,
    area:     areas[0], // kept for backward compatibility with older records/readers
    notes:    document.getElementById('coach-m-notes')?.value   || '',
    plan:     document.getElementById('coach-m-plan')?.value    || '',
    followUp: document.getElementById('coach-m-followup')?.value|| '',
    status:   document.getElementById('coach-m-status')?.value  || 'Active',
    ts: Date.now(),
  };
  if (!state.coaching) state.coaching = {};
  if (!state.coaching[name]) state.coaching[name] = [];
  if (editId) {
    const idx = state.coaching[name].findIndex(s => s.id === editId);
    if (idx >= 0) state.coaching[name][idx] = session; else state.coaching[name].unshift(session);
  } else {
    state.coaching[name].unshift(session);
  }
  persistSave(); closeCoachModal(); renderCoaching();
}

function deleteCoachSession(name, id) {
  if (!confirm('Delete this coaching session?')) return;
  state.coaching[name] = (state.coaching[name] || []).filter(s => s.id !== id);
  persistSave(); renderCoaching();
}

const COACH_PRINT_STYLES = '@page{size:letter;margin:0.85in}'
  + 'body{font-family:Arial,sans-serif;font-size:11px;color:#222;margin:0}'
  + '.hb{background:#1e3a5f;color:white;padding:14px 20px;border-radius:6px;margin-bottom:18px}'
  + '.hb h1{font-size:18px;margin:0 0 2px}.hb .sub{font-size:11px;opacity:.75}'
  + '.ig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px}'
  + '.ib{border:1px solid #ddd;border-radius:5px;padding:8px 12px}'
  + '.ib .l{font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-bottom:2px}'
  + '.ib .v{font-size:13px;font-weight:700;color:#1e3a5f}'
  + 'h2{font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin:16px 0 10px;text-transform:uppercase;letter-spacing:.04em}'
  + '.box{border:1px solid #ddd;border-radius:5px;padding:10px 12px;font-size:11px;color:#333;min-height:44px;white-space:pre-wrap;margin-bottom:14px;}'
  + '.sr{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}'
  + '.sb .l{font-size:11px;text-transform:uppercase;color:#888;margin-bottom:4px}'
  + '.sb .ln{border-bottom:1px solid #555;height:28px}'
  + '@media print{.np{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

function coachPrintDate(v) {
  return v ? new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—';
}

// Print the coaching session currently open in the modal (including unsaved edits)
function printCoachSession() {
  const name = document.getElementById('coach-m-name')?.value || '';
  if (!name) return;
  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || '';
  const areas    = getCheckedCoachAreas();
  const dateVal  = document.getElementById('coach-m-date')?.value || '';
  const status   = document.getElementById('coach-m-status')?.value || '';
  const followUp = document.getElementById('coach-m-followup')?.value || '';
  const notes = (document.getElementById('coach-m-notes')?.value || '').replace(/</g, '&lt;');
  const plan  = (document.getElementById('coach-m-plan')?.value  || '').replace(/</g, '&lt;');

  const areaRows = areas.length ? areas.map(a => {
    const cfg = COACH_AREA_CFG[a] || COACH_AREA_CFG.Other;
    const metricEl = document.getElementById('coach-area-metric-' + a);
    const metricTxt = metricEl ? metricEl.textContent.trim() : '';
    return '<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #ddd;border-radius:5px;padding:7px 10px;margin-bottom:6px;">'
      + '<span style="font-size:12px;font-weight:700;color:#1e3a5f;">' + cfg.icon + ' ' + a + '</span>'
      + (metricTxt ? '<span style="font-size:11px;color:#555;">' + metricTxt + '</span>' : '')
      + '</div>';
  }).join('') : '<div style="font-size:11px;color:#888;">No areas selected</div>';

  const html = '<!DOCTYPE html><html><head><title>Coaching Session — ' + name + '</title><style>' + COACH_PRINT_STYLES + '</style></head><body>'
    + '<div class="np" style="text-align:center;padding:10px;background:#f0f4f8;margin-bottom:16px;">'
    + '<button onclick="window.print()" style="padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Print / Save PDF</button></div>'
    + '<div class="hb"><h1>Staff Coaching Session</h1><div class="sub">3B Tele Med-Surg / 3C · Arnot Ogden Medical Center</div></div>'
    + '<div class="ig">'
    + '<div class="ib"><div class="l">Staff Name</div><div class="v">' + name + '</div></div>'
    + '<div class="ib"><div class="l">Role</div><div class="v">' + (job || '—') + '</div></div>'
    + '<div class="ib"><div class="l">Session Date</div><div class="v">' + coachPrintDate(dateVal) + '</div></div>'
    + '<div class="ib"><div class="l">Status</div><div class="v">' + (status || '—') + '</div></div>'
    + '<div class="ib"><div class="l">Follow-Up Date</div><div class="v">' + coachPrintDate(followUp) + '</div></div>'
    + '<div class="ib"><div class="l">Printed</div><div class="v">' + new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + '</div></div>'
    + '</div>'
    + '<h2>Coaching Area(s)</h2>' + areaRows
    + '<h2>Observation / Notes</h2><div class="box">' + (notes || '—') + '</div>'
    + '<h2>Action Plan / Expectation Set</h2><div class="box">' + (plan || '—') + '</div>'
    + '<div class="sr">'
    + '<div class="sb"><div class="l">Leader Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Leader Signature / Date</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Employee Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Employee Signature / Date</div><div class="ln"></div></div>'
    + '</div></body></html>';

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// Print a staff member's full logged coaching history
function printCoachHistory(name) {
  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || '';
  const sessions = ((state.coaching || {})[name] || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const rows = sessions.length ? sessions.map(sess => {
    const sessAreas = (sess.areas && sess.areas.length) ? sess.areas : (sess.area ? [sess.area] : ['Other']);
    const areaLabel = sessAreas.map(a => (COACH_AREA_CFG[a] || COACH_AREA_CFG.Other).icon + ' ' + a).join(', ');
    return '<div style="border:1px solid #ddd;border-radius:6px;padding:10px 12px;margin-bottom:10px;break-inside:avoid;">'
      + '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px;">'
      + '<span style="font-size:12px;font-weight:700;color:#1e3a5f;">' + areaLabel + '</span>'
      + '<span style="font-size:10px;color:#555;">' + coachPrintDate(sess.date) + (sess.status ? ' · ' + sess.status : '') + '</span>'
      + '</div>'
      + (sess.notes ? '<div style="font-size:10px;color:#333;margin-bottom:4px;"><strong>Observation:</strong> ' + sess.notes.replace(/</g, '&lt;') + '</div>' : '')
      + (sess.plan  ? '<div style="font-size:10px;color:#333;margin-bottom:4px;"><strong>Action Plan:</strong> ' + sess.plan.replace(/</g, '&lt;') + '</div>' : '')
      + (sess.followUp ? '<div style="font-size:9px;color:#888;">Follow-up: ' + coachPrintDate(sess.followUp) + '</div>' : '')
      + '</div>';
  }).join('') : '<div style="font-size:11px;color:#888;">No coaching sessions logged.</div>';

  const html = '<!DOCTYPE html><html><head><title>Coaching History — ' + name + '</title><style>' + COACH_PRINT_STYLES + '</style></head><body>'
    + '<div class="np" style="text-align:center;padding:10px;background:#f0f4f8;margin-bottom:16px;">'
    + '<button onclick="window.print()" style="padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Print / Save PDF</button></div>'
    + '<div class="hb"><h1>Coaching History</h1><div class="sub">3B Tele Med-Surg / 3C · Arnot Ogden Medical Center</div></div>'
    + '<div class="ig">'
    + '<div class="ib"><div class="l">Staff Name</div><div class="v">' + name + '</div></div>'
    + '<div class="ib"><div class="l">Role</div><div class="v">' + (job || '—') + '</div></div>'
    + '<div class="ib"><div class="l">Sessions on File</div><div class="v">' + sessions.length + '</div></div>'
    + '</div>'
    + '<h2>Session Log</h2>' + rows
    + '<div class="sr">'
    + '<div class="sb"><div class="l">Leader Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Leader Signature / Date</div><div class="ln"></div></div>'
    + '</div></body></html>';

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// Build auto-suggestions from all available data across tabs
function buildCoachingSuggestions(name, job, yr, metrics) {
  const suggestions = [];

  // Quality tab — scan and pain (already in flags if below threshold but suggest milder warnings too)
  if ((job === 'RN' || job === 'LPN') && metrics.scanPct !== null && metrics.scanPct >= 95 && metrics.scanPct < 98) {
    suggestions.push({ area:'Scanning', icon:'💊', reason:`Scan rate ${metrics.scanPct}% — near goal (95%). Reinforce before it dips.` });
  }
  if ((job === 'RN' || job === 'LPN') && metrics.painPct !== null && metrics.painPct >= 90 && metrics.painPct < 93) {
    suggestions.push({ area:'Pain', icon:'💔', reason:`Pain reassessment ${metrics.painPct}% — just above goal (90%). Monitor closely.` });
  }
  if (metrics.platoPct !== null && metrics.platoPct >= 90 && metrics.platoPct < 93) {
    suggestions.push({ area:'PLATO', icon:'🔄', reason:`Fall rounding compliance ${metrics.platoPct}% — just above goal (90%).${metrics.platoTopMissed ? ' Most frequently missed: ' + metrics.platoTopMissed + '.' : ''}` });
  }

  // Incidents tab — missed barcode scans or pain reassessment events logged
  const si = (state.staffIncidents || {})[name] || {};
  const filterYr = arr => (arr || []).filter(e => new Date(e.date+'T12:00:00').getFullYear() === yr);
  const scannEvents = filterYr(si.scanning).length;
  const painEvents  = filterYr(si.painReassess).length;
  if (scannEvents > 0) suggestions.push({ area:'Scanning', icon:'💊', reason:`${scannEvents} missed scan event${scannEvents>1?'s':''} logged in Incidents tab.` });
  if (painEvents  > 0) suggestions.push({ area:'Pain',     icon:'💔', reason:`${painEvents} pain reassessment event${painEvents>1?'s':''} logged in Incidents tab.` });

  // Absence tab — single callout or tardy before threshold
  if (metrics.callouts === 2) suggestions.push({ area:'Attendance', icon:'📅', reason:`2 call-outs YTD — proactive conversation before triggering attendance policy.` });
  if (metrics.tardies  === 2) suggestions.push({ area:'Attendance', icon:'📅', reason:`2 tardies YTD — early coaching before pattern escalates.` });

  // Write-ups from absence log
  const writeUps = (state.absenceLog[name] || []).filter(e => e.writeUp && new Date(e.date+'T12:00:00').getFullYear()===yr).length;
  if (writeUps > 0) suggestions.push({ area:'Conduct', icon:'✍️', reason:`${writeUps} write-up${writeUps>1?'s':''} on file — follow-up coaching conversation recommended.` });

  // Competency tab — staff with incomplete competencies
  const compSkills = allCompSkills(job==='CA'?'CA':'RN');
  const incomplete = compSkills.filter(sk => {
    const v = ((state.competency||{})[name]||{})[sk.key];
    return !(v && v.passed && v.yr === yr);
  });
  if (incomplete.length > 0) {
    const critCerts = incomplete.filter(s => s.section === 'Certifications');
    if (critCerts.length > 0) suggestions.push({ area:'Clinical', icon:'🩺', reason:`${critCerts.length} cert${critCerts.length>1?'s':''} not yet validated: ${critCerts.map(s=>s.label).slice(0,2).join(', ')}${critCerts.length>2?'…':''}` });
  }

  // Recognition — positive note: high recognition can surface high performers worth developing
  const recCount = (state.recognition||[]).filter(r=>r.name===name && new Date((r.date||'2000-01-01')+'T12:00:00').getFullYear()===yr).length;
  if (recCount >= 3) suggestions.push({ area:'Clinical', icon:'🏆', reason:`${recCount} recognitions this year — consider for preceptor, charge, or leadership development.` });

  // Orientation flag — if still on orientation, coaching may be orientation-driven
  if (state.empOrientation && state.empOrientation[name]) {
    suggestions.push({ area:'Clinical', icon:'🎓', reason:`Currently on orientation — weekly preceptor coaching check-in recommended.` });
  }

  // Coaching sessions — if last active session is old (>60 days) and status was "Active"
  const sessions = (state.coaching||{})[name]||[];
  const lastActive = sessions.filter(s=>s.status==='Active').sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (lastActive) {
    const daysSince = Math.round((new Date()-new Date(lastActive.date+'T12:00:00'))/86400000);
    if (daysSince > 60) suggestions.push({ area:lastActive.area, icon:'🔔', reason:`Active coaching plan (${lastActive.area}) — ${daysSince} days since last session. Follow-up overdue.` });
  }

  // Deduplicate by area
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.area+s.reason)) return false;
    seen.add(s.area+s.reason); return true;
  });
}

function renderCoaching() {
  const roleFilter = document.getElementById('coach-role')?.value  || 'ALL';
  const yr         = parseInt(document.getElementById('coach-year')?.value) || new Date().getFullYear();
  const statusFilt = document.getElementById('coach-filter')?.value || 'ALL';
  const el = document.getElementById('coach-grid'); if (!el) return;

  let staffList = MASTER_STAFF.filter(s => roleFilter === 'ALL' || s.job === roleFilter);

  const staffData = staffList.map(s => {
    const metrics = getStaffMetrics(s.name, s.job, yr);
    const flags   = getStaffFlags(metrics, s.job);
    const sessions = (state.coaching || {})[s.name] || [];
    // Build auto-suggestions from all available data
    const suggestions = buildCoachingSuggestions(s.name, s.job, yr, metrics);
    return { ...s, metrics, flags, sessions, suggestions };
  });

  let display = staffData;
  if (statusFilt === 'needs')   display = display.filter(s => s.flags.length > 0 || s.suggestions.length > 0);
  if (statusFilt === 'coached') display = display.filter(s => s.sessions.length > 0);

  display.sort((a, b) => (b.flags.length + b.suggestions.length) - (a.flags.length + a.suggestions.length) || a.name.localeCompare(b.name));

  if (!display.length) { el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);">No staff match filter</div>'; return; }

  const statusColors = { Active:'var(--red2)', Improving:'var(--amber2)', Resolved:'var(--green2)' };

  el.innerHTML = display.map(s => {
    const rCol = IV_ROLE_COLOR[s.job] || 'var(--text2)';
    const initials = s.name.split(',').map(p => p.trim()[0] || '').join('');
    const m = s.metrics;
    const hasIssues = s.flags.length > 0 || s.suggestions.length > 0;

    const metricPills = [
      { label:`${m.callouts}CO`, warn:m.callouts>=3, title:'Call-outs' },
      { label:`${m.tardies}T`,   warn:m.tardies>=3,  title:'Tardies'   },
      { label:`${m.falls}F`,     warn:m.falls>0,     title:'Falls'     },
      { label:`${m.hapIs}H`,     warn:m.hapIs>0,     title:'HAPIs'     },
      ...(s.job==='RN'||s.job==='LPN' ? [
        { label:m.scanPct!==null?m.scanPct+'%S':'—S', warn:m.scanPct!==null&&m.scanPct<95, title:'Med Scanning' },
        { label:m.painPct!==null?m.painPct+'%P':'—P', warn:m.painPct!==null&&m.painPct<90, title:'Pain Reassess' },
      ] : []),
      ...(m.platoPct!==null ? [
        { label:m.platoPct+'%R', warn:m.platoPct<90, title:'Fall Rounding (PLATO) — '+m.platoRounds+' audited rounds' },
      ] : []),
    ].map(p => `<span title="${p.title}" style="font-size:11px;font-weight:700;padding:2px 6px;border-radius:8px;${p.warn?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${p.label}</span>`).join('');

    const flagsHtml = s.flags.length > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
      ${s.flags.map(f => {
        const cfg = COACH_AREA_CFG[f.area] || COACH_AREA_CFG.Other;
        return `<span style="font-size:11px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:5px;padding:2px 8px;color:var(--red2);">${cfg.icon} ${f.area}: ${ccEsc(f.reason)}</span>`;
      }).join('')}
    </div>` : '';

    // Auto-suggestions (yellow, less severe than red flags)
    const suggestHtml = s.suggestions.length > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
      <span style="font-size:11px;color:var(--text3);align-self:center;">💡 Suggested:</span>
      ${s.suggestions.map(sg => `<button onclick="openCoachModal('${s.name.replace(/'/g,"\\'")}','');setCoachAreaChecked('${sg.area}',true);document.getElementById('coach-m-notes').value='${sg.reason.replace(/'/g,"\\'")}'"
        style="font-size:11px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:5px;padding:2px 8px;color:var(--amber2);cursor:pointer;" title="Click to open coaching session pre-filled">
        ${sg.icon} ${sg.area}
      </button>`).join('')}
    </div>` : '';

    const sessionsHtml = s.sessions.length > 0 ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
      ${s.sessions.slice(0, 3).map(sess => {
        const sessAreas = (sess.areas && sess.areas.length) ? sess.areas : (sess.area ? [sess.area] : ['Other']);
        const areaBadges = sessAreas.map(a => {
          const c = COACH_AREA_CFG[a] || COACH_AREA_CFG.Other;
          return `<span style="font-size:11px;" title="${a}">${c.icon}</span><span style="font-size:11px;font-weight:700;color:var(--white);">${a}</span>`;
        }).join('<span style="color:var(--text3);font-size:11px;">·</span>');
        const sc  = statusColors[sess.status] || 'var(--text3)';
        const dateStr = sess.date ? new Date(sess.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:4px;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              ${areaBadges}
              <span style="font-size:11px;color:${sc};background:${sc}22;border-radius:8px;padding:1px 6px;">${sess.status}</span>
              <span style="font-size:11px;color:var(--text3);">${dateStr}</span>
            </div>
            <div style="display:flex;gap:4px;">
              <button onclick="openCoachModal('${s.name.replace(/'/g,"\\'")}','${sess.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button>
              <button onclick="deleteCoachSession('${s.name.replace(/'/g,"\\'")}','${sess.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>
            </div>
          </div>
          ${sess.notes ? `<div style="font-size:11px;color:var(--text2);margin-bottom:3px;">${sess.notes.slice(0,120)}${sess.notes.length>120?'…':''}</div>` : ''}
          ${sess.plan  ? `<div style="font-size:11px;color:var(--teal2);">→ ${sess.plan.slice(0,100)}${sess.plan.length>100?'…':''}</div>` : ''}
          ${sess.followUp ? `<div style="font-size:11px;color:var(--text3);margin-top:2px;">Follow-up: ${sess.followUp}</div>` : ''}
        </div>`;
      }).join('')}
      ${s.sessions.length > 3 ? `<div style="font-size:11px;color:var(--text3);text-align:center;">${s.sessions.length - 3} more session${s.sessions.length-3>1?'s':''}</div>` : ''}
    </div>` : '';

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${hasIssues?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${s.flags.length>0?'var(--red2)':s.suggestions.length>0?'var(--amber2)':'var(--border)'};border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="width:36px;height:36px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${s.name}</div>
          <div style="font-size:11px;color:${rCol};">${s.job}${s.sessions.length>0?` · ${s.sessions.length} session${s.sessions.length>1?'s':''} logged`:''}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">${metricPills}</div>
        <button onclick="openCoachModal('${s.name.replace(/'/g,"\\'")}','')"
          style="font-size:11px;padding:4px 12px;background:${s.flags.length?'rgba(239,68,68,0.1)':'rgba(46,125,209,0.1)'};border:1px solid ${s.flags.length?'rgba(239,68,68,0.35)':'rgba(46,125,209,0.3)'};border-radius:5px;color:${s.flags.length?'var(--red2)':'var(--accent2)'};cursor:pointer;white-space:nowrap;">
          ${s.sessions.length ? '+ Session' : '+ Coach'}
        </button>
        ${s.sessions.length > 0 ? `<button onclick="printCoachHistory('${s.name.replace(/'/g,"\\'")}')" title="Print full coaching history"
          style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:5px;color:var(--text2);cursor:pointer;white-space:nowrap;">🖨</button>` : ''}
      </div>
      ${flagsHtml}
      ${suggestHtml}
      ${sessionsHtml}
    </div>`;
  }).join('');
}