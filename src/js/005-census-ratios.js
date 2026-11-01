

// ════════════════════════════════════
//  CENSUS & RATIOS
// ════════════════════════════════════
function updateRatios() {
  const day = parseInt(document.getElementById('census-day').value) || 0;
  const eve = parseInt(document.getElementById('census-eve').value) || 0;
  const night = parseInt(document.getElementById('census-night').value) || 0;
  const dateKey = state.activeBoardDate;
  if (!dateKey) return;
  const shifts = state.placements[dateKey] || {};
  const chips = [];

  function countRole(shiftKeys, role) {
    let n = 0;
    shiftKeys.forEach(sk => {
      (shifts[sk]||[]).forEach(p => { if(p.role===role) n++; });
    });
    return n;
  }

  const dayRNs = countRole(["0700-1500"], "RN") + countRole(["0700-1500"],"LPN");
  const eveRNs = countRole(["1500-1900"],"RN") + countRole(["1500-1900"],"LPN");
  const nightRNs = countRole(["1900-0700"],"RN") + countRole(["1900-0700"],"LPN");

  function ratioChip(label, census, nurses) {
    if (!census || !nurses) return `<span class="ratio-chip">${label}: —</span>`;
    const r = (census / nurses).toFixed(1);
    let cls = 'good';
    if (parseFloat(r) > 5) cls = 'bad';
    else if (parseFloat(r) > 4) cls = 'warn';
    return `<span class="ratio-chip ${cls}" data-tip="${label}: ${census} pts / ${nurses} nurses">${label}: ${r}:1</span>`;
  }
  if (day) chips.push(ratioChip('Day', day, dayRNs));
  if (eve) chips.push(ratioChip('Eve', eve, eveRNs));
  if (night) chips.push(ratioChip('Night', night, nightRNs));
  if (!day && !eve && !night) chips.push('<span class="ratio-chip">Enter census above</span>');
  document.getElementById('ratio-display').innerHTML = chips.join('');
}

// ════════════════════════════════════
//  DATE TABS HELPER
// ════════════════════════════════════
function buildDateTabs(containerId, activeKey, setter, renderFn) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  if (!state.dates.length) { cont.innerHTML = '<span style="color:var(--text3);font-size:12px;">No data loaded — use Import tab</span>'; return; }
  cont.innerHTML = state.dates.map(d => {
    const label = new Date(d + 'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'});
    return `<div class="date-tab ${d===activeKey?'active':''}" onclick="${setter}('${d}')">${label}</div>`;
  }).join('');
}

// ════════════════════════════════════
//  BOARD
// ════════════════════════════════════
function initBoard() {
  // Make board panel visible and mark as active
  const boardPanel = document.getElementById('panel-board');
  if (boardPanel) { boardPanel.style.display = 'block'; boardPanel.classList.add('active'); boardPanel.setAttribute('data-active','1'); }
  // Also mark the board tab as active
  const boardTab = document.querySelector('[data-panel="board"]');
  if (boardTab) boardTab.classList.add('active');
  // Safety net: if no UKG data has been imported yet, ensure demo data is loaded
  if (!state.dates || !state.dates.length) loadDemoData();
  state.activeChargeDate = state.activeBoardDate = state.dates[0] || null;
  renderBoardDateTabs();
  autoApplyAlwaysCharge();
  renderBoard();
  renderBoardCertAlerts();
  renderBoardCompAlerts();
  renderBoardMessages();
  renderBoardWeeklyEdu();
  renderBoardPolicyAlerts();
}

// ── Expiring Certs Alert ──
// ── Agency Contract Expiration Alerts ──
function checkAgencyContractExpirations() {
  const today = new Date();
  const in45  = new Date(today); in45.setDate(today.getDate() + 45);
  const alerts = [];

  MASTER_STAFF.forEach(s => {
    const ag = state.agencyDates[s.name];
    if (!ag || !ag.isAgency) return;
    const effectiveEnd = ag.extensionEnd || ag.contractEnd;
    if (!effectiveEnd) return;
    const exp = parseDate(effectiveEnd);
    if (!exp) return;
    const daysLeft = Math.round((exp - today) / 86400000);
    if (daysLeft <= 45) {
      alerts.push({ name: s.name, job: s.job, daysLeft, exp, type: ag.extensionEnd ? 'Extension' : 'Contract' });
    }
  });

  if (!alerts.length) return;

  // Build mailto: for each alert
  const lines = alerts.map(a => {
    const label = a.daysLeft < 0 ? 'EXPIRED' : `${a.daysLeft} days`;
    return `• ${a.name} (${a.job}) — ${a.type} End: ${a.exp.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} (${label})`;
  }).join('\r\n');

  const subject = encodeURIComponent(`[3B] Agency Contract Expiration Alert — Action Required`);
  const body    = encodeURIComponent(
    `Agency Contract Expiration Notice\r\n` +
    `3B Tele Med-Surg · AOMC Nursing Operations\r\n` +
    `Generated: ${today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}\r\n\r\n` +
    `The following agency staff contracts are expiring within 45 days or have expired:\r\n\r\n` +
    lines +
    `\r\n\r\nPlease take action to extend, renew, or off-board as appropriate.\r\n\r\n— 3B Staff Command Center`
  );

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:4000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:24px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px;">📅 Agency Contract Expirations</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:14px;">${alerts.length} contract${alerts.length>1?'s':''} expiring within 45 days</div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin-bottom:14px;max-height:200px;overflow-y:auto;">
        ${alerts.sort((a,b)=>a.daysLeft-b.daysLeft).map(a=>{
          const col = a.daysLeft<0?'var(--red2)':a.daysLeft<=14?'var(--red2)':'var(--amber2)';
          const label = a.daysLeft<0?'EXPIRED':a.daysLeft+'d left';
          return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;">
            <span style="color:var(--white);font-weight:600;">${a.name}</span>
            <span style="color:var(--text3);">${a.type} · ${a.exp.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
            <span style="color:${col};font-weight:700;">${label}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="this.closest('[style]').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Dismiss</button>
        <a href="mailto:ronald.higley@arnothealth.org?subject=${subject}&body=${body}"
          onclick="this.closest('[style]').remove()"
          style="background:var(--accent);border:none;border-radius:5px;padding:6px 16px;color:var(--white);font-size:12px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
          📧 Email Ronald Higley
        </a>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

// ── Documentation Opportunities ────────────────────────────────
const DOC_OPP_CATEGORIES = [
  'Pain Reassessment Documentation',
  'Care Plan Documentation',
  'Fall Risk Assessment',
  'Skin/Wound Assessment',
  'Intake & Output Documentation',
  'Medication Administration Documentation',
  'Hourly Rounding Documentation',
  'Discharge Documentation',
  'Incident/Event Documentation',
  'Nursing Assessment Documentation',
  'Telemetry/Cardiac Documentation',
  'Other',
];

function renderDocOpps() {
  const panel = document.getElementById('doc-opps-list');
  if (!panel) return;
  const dateKey = state.activeBoardDate;
  if (!dateKey) { panel.innerHTML = '<div style="color:var(--text3);font-size:11px;">Load a board date to add documentation opportunities.</div>'; return; }
  const opps = (state.docOpps[dateKey] || []);
  if (!opps.length) {
    panel.innerHTML = '<div style="color:var(--text3);font-size:11px;padding:8px 0;">No documentation opportunities recorded for this date.</div>';
    return;
  }
  panel.innerHTML = opps.map(function(o, i) {
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'
      + '<div style="flex:1;">'
      + '<div style="font-size:12px;font-weight:600;color:var(--white);">' + o.name + '</div>'
      + '<div style="font-size:11px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.04em;margin-top:1px;">' + o.category + '</div>'
      + (o.note ? '<div style="font-size:11px;color:var(--text2);margin-top:3px;">' + o.note + '</div>' : '')
      + '</div>'
      + '<button onclick="deleteDocOpp(' + i + ')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 6px;" title="Remove" onmouseover="this.style.color=\'var(--red2)\'" onmouseout="this.style.color=\'var(--text3)\'">✕</button>'
      + '</div>';
  }).join('');
}

function openDocOppModal() {
  const dateKey = state.activeBoardDate;
  if (!dateKey) { showSaveBanner('⚠ Load a board date first'); return; }
  const existing = document.getElementById('doc-opp-overlay');
  if (existing) existing.remove();

  const staffOptions = MASTER_STAFF.map(s => '<option value="' + s.name + '">').join('');
  const catOptions = DOC_OPP_CATEGORIES.map(c => '<option value="' + c + '">' + c + '</option>').join('');

  const ov = document.createElement('div');
  ov.id = 'doc-opp-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;';
  ov.innerHTML =
    '<div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:24px;width:460px;max-width:95vw;box-shadow:0 24px 64px rgba(0,0,0,0.5);">'
    + '<div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:16px;">📋 Add Documentation Opportunity</div>'
    + '<datalist id="doc-opp-staff-dl">' + staffOptions + '</datalist>'
    + '<div style="display:grid;gap:10px;">'
    + '<div><div class="form-label" style="margin-bottom:3px;">Staff Name</div>'
    + '<input list="doc-opp-staff-dl" id="doc-opp-name" placeholder="Last, First" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:7px 10px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>'
    + '<div><div class="form-label" style="margin-bottom:3px;">Category</div>'
    + '<select id="doc-opp-cat" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:7px 10px;color:var(--white);font-size:12px;outline:none;">' + catOptions + '</select></div>'
    + '<div><div class="form-label" style="margin-bottom:3px;">Details / Note <span style="color:var(--text3);font-weight:400;">(optional)</span></div>'
    + '<textarea id="doc-opp-note" rows="3" placeholder="Describe the specific documentation gap or coaching opportunity..." style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:7px 10px;color:var(--white);font-size:12px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">'
    + '<button onclick="document.getElementById(\'doc-opp-overlay\').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>'
    + '<button onclick="saveDocOpp()" class="btn btn-primary" style="font-size:12px;padding:6px 18px;">Save</button>'
    + '</div></div>';
  document.body.appendChild(ov);
  setTimeout(() => document.getElementById('doc-opp-name')?.focus(), 100);
}

function saveDocOpp() {
  const dateKey = state.activeBoardDate;
  const name    = document.getElementById('doc-opp-name')?.value.trim();
  const category = document.getElementById('doc-opp-cat')?.value || '';
  const note    = document.getElementById('doc-opp-note')?.value.trim() || '';
  if (!name) { alert('Enter a staff name.'); return; }
  if (!state.docOpps) state.docOpps = {};
  if (!state.docOpps[dateKey]) state.docOpps[dateKey] = [];
  state.docOpps[dateKey].push({ name, category, note, ts: new Date().toISOString() });
  persistSave();
  document.getElementById('doc-opp-overlay')?.remove();
  renderDocOpps();
  showSaveBanner('📋 Documentation opportunity saved');
}

function deleteDocOpp(idx) {
  const dateKey = state.activeBoardDate;
  if (!state.docOpps?.[dateKey]) return;
  state.docOpps[dateKey].splice(idx, 1);
  persistSave();
  renderDocOpps();
}

function renderBoardCertAlerts() {
  const el = document.getElementById('board-cert-list');
  if (!el) return;
  const today = new Date();
  const in90  = new Date(today); in90.setDate(today.getDate() + 90);
  const CERT_LABELS = { ACLS:'ACLS', BLS:'BLS', NIHSS:'NIHSS', License:'License', HealthEval:'Health Eval', FitTest:'Fit Test' };
  const alerts = [];

  // Only check staff scheduled on the currently active board date
  const dateKey = state.activeBoardDate;
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};
  const scheduledNames = new Set(Object.values(shifts).flat().map(p => p.name));

  // Fall back to all staff if no date is loaded yet
  const staffToCheck = scheduledNames.size > 0
    ? MASTER_STAFF.filter(s => scheduledNames.has(s.name))
    : MASTER_STAFF;

  staffToCheck.forEach(s => {
    const certs = state.certs[s.name] || {};
    Object.entries(certs).forEach(([key, dateStr]) => {
      if (!dateStr) return;
      // Skip label fields (custom1_label, custom2_label) — only process date fields
      if (key.endsWith('_label')) return;
      const exp = parseDate(dateStr);
      if (!exp) return;
      const daysLeft = Math.round((exp - today) / 86400000);
      if (daysLeft <= 90) {
        // For custom certs, use the stored label; for standard certs use CERT_LABELS map
        const displayLabel = key.startsWith('custom') && certs[key.replace('_date','_label')]
          ? certs[key.replace('_date','_label')]
          : (CERT_LABELS[key] || key);
        alerts.push({ name: s.name, job: s.job, cert: displayLabel, exp, daysLeft });
      }
    });
  });
  if (!alerts.length) {
    el.innerHTML = '<span style="color:var(--green2);font-size:11px;">✓ No certifications expiring within 90 days</span>';
    return;
  }
  alerts.sort((a,b) => a.daysLeft - b.daysLeft);
  el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
    alerts.map(a => {
      const col = a.daysLeft < 0 ? 'var(--red2)' : a.daysLeft <= 14 ? 'var(--red2)' : a.daysLeft <= 30 ? 'var(--amber2)' : 'var(--text2)';
      const label = a.daysLeft < 0 ? 'EXPIRED' : a.daysLeft === 0 ? 'TODAY' : a.daysLeft+'d';
      const roleCol = a.job==='RN'?'var(--accent2)':a.job==='LPN'?'var(--purple2)':'var(--teal2)';
      return `<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-left:3px solid ${col};border-radius:6px;padding:6px 10px;min-width:160px;">
        <div style="font-size:11px;font-weight:700;color:var(--white);">${a.name.split(',')[0]}</div>
        <div style="font-size:11px;color:${roleCol};">${a.job}</div>
        <div style="font-size:11px;margin-top:2px;"><span style="color:var(--text3);">${a.cert}</span> <span style="color:${col};font-weight:700;">${label}</span></div>
        <div style="font-size:11px;color:var(--text3);">${a.exp.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
      </div>`;
    }).join('') + '</div>';
}

// ── Weekly Education ──
function getWeekKey(date) {
  const d = date || new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(wk).padStart(2,'0');
}

function renderBoardWeeklyEdu() {
  const wk  = getWeekKey(new Date());
  const now = new Date();
  const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  const weekLabel = 'Week of ' + sun.toLocaleDateString('en-US',{month:'short',day:'numeric'}) +
    ' – ' + sat.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' · ' + wk;

  const lbl = document.getElementById('board-edu-week-label');
  if (lbl) lbl.textContent = weekLabel;

  const edu = (state.weeklyEdu[wk]) || { nurseTopics:[], caTopics:[], notes:'' };

  // Restore edit fields if open
  const notesEl = document.getElementById('edu-notes-input');
  if (notesEl) notesEl.value = edu.notes || '';
  renderEduTopicList('nurse', edu.nurseTopics || []);
  renderEduTopicList('ca',    edu.caTopics    || []);

  // Display panel
  const disp = document.getElementById('board-edu-display');
  if (!disp) return;
  const hasContent = (edu.nurseTopics&&edu.nurseTopics.length) || (edu.caTopics&&edu.caTopics.length) || edu.notes;
  if (!hasContent) {
    disp.innerHTML = '<div style="color:var(--text3);font-size:11px;font-style:italic;">No education topics set for this week. Click ✏ Edit to add topics.</div>';
    return;
  }
  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  html += '<div><div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:6px;">🩺 Nurse Topics (RN / LPN)</div>';
  if (edu.nurseTopics && edu.nurseTopics.length) {
    html += '<ul style="margin:0;padding-left:16px;">' +
      edu.nurseTopics.map(t=>`<li style="font-size:11px;color:var(--text2);margin-bottom:3px;">${t}</li>`).join('') + '</ul>';
  } else {
    html += '<span style="font-size:11px;color:var(--text3);">None set</span>';
  }
  html += '</div><div><div style="font-size:11px;font-weight:700;color:var(--teal2);margin-bottom:6px;">🏥 CA Topics</div>';
  if (edu.caTopics && edu.caTopics.length) {
    html += '<ul style="margin:0;padding-left:16px;">' +
      edu.caTopics.map(t=>`<li style="font-size:11px;color:var(--text2);margin-bottom:3px;">${t}</li>`).join('') + '</ul>';
  } else {
    html += '<span style="font-size:11px;color:var(--text3);">None set</span>';
  }
  html += '</div></div>';
  if (edu.notes) {
    html += '<div style="margin-top:8px;font-size:11px;color:var(--text3);background:rgba(255,255,255,0.04);border-radius:6px;padding:8px;">'+edu.notes+'</div>';
  }
  disp.innerHTML = html;
}

function renderEduTopicList(role, topics) {
  const el = document.getElementById(role+'-topics-list');
  if (!el) return;
  if (!topics.length) { el.innerHTML = '<div style="font-size:11px;color:var(--text3);font-style:italic;">No topics yet</div>'; return; }
  el.innerHTML = topics.map((t,i) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:11px;">${t}</span>
      <button onclick="removeEduTopic('${role}',${i})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;">✕</button>
    </div>`
  ).join('');
}

function getWeekEdu() {
  const wk = getWeekKey(new Date());
  if (!state.weeklyEdu[wk]) state.weeklyEdu[wk] = { nurseTopics:[], caTopics:[], notes:'' };
  return state.weeklyEdu[wk];
}

function addEduTopic(role) {
  const inputId = role+'-topic-input';
  const inp = document.getElementById(inputId);
  if (!inp || !inp.value.trim()) return;
  const edu = getWeekEdu();
  const key = role==='nurse' ? 'nurseTopics' : 'caTopics';
  if (!edu[key]) edu[key] = [];
  edu[key].push(inp.value.trim());
  inp.value = '';
  persistSave();
  renderBoardWeeklyEdu();
}

function removeEduTopic(role, idx) {
  const edu = getWeekEdu();
  const key = role==='nurse' ? 'nurseTopics' : 'caTopics';
  if (edu[key]) edu[key].splice(idx, 1);
  persistSave();
  renderBoardWeeklyEdu();
}

function saveEduNotes(val) {
  const edu = getWeekEdu();
  edu.notes = val;
  persistSave();
}

// ══════════════════════════════════════════
// PERFORMANCE VARIANCE REPORT
// ══════════════════════════════════════════
// ══════════════════════════════════════════════════════
// PAIN REASSESSMENT AUDIT
// ══════════════════════════════════════════════════════
const painAuditRecords = [];

function calcPainAudit() {
  const med  = document.getElementById('pa-med-time').value;
  const reas = document.getElementById('pa-reass-time').value;
  const pre  = parseFloat(document.getElementById('pa-pre').value);
  const post = parseFloat(document.getElementById('pa-post').value);
  const diffEl = document.getElementById('pa-diff');
  const winEl  = document.getElementById('pa-window');

  let diff = null;
  if (med && reas) {
    const [mh,mm] = med.split(':').map(Number);
    const [rh,rm] = reas.split(':').map(Number);
    diff = (rh*60+rm) - (mh*60+mm);
    const abs = Math.abs(diff);
    const dur = (Math.floor(abs/60) > 0 ? Math.floor(abs/60)+'h ' : '') + (abs%60)+'m';
    diffEl.textContent = (diff < 0 ? '-' : '') + dur;
    diffEl.style.color = diff < 0 ? 'var(--red2)' : diff <= 60 ? 'var(--green2)' : diff <= 90 ? 'var(--amber2)' : 'var(--red2)';
    if (diff < 0)        { winEl.textContent = '⛔ Before med given';  winEl.style.color = 'var(--red2)'; }
    else if (diff <= 60) { winEl.textContent = '✅ Within 60 min';     winEl.style.color = 'var(--green2)'; }
    else if (diff <= 90) { winEl.textContent = '⚠ Slightly late';     winEl.style.color = 'var(--amber2)'; }
    else                 { winEl.textContent = '❌ Outside window';    winEl.style.color = 'var(--red2)'; }
  } else {
    diffEl.textContent = '—'; winEl.textContent = '—';
    diffEl.style.color = ''; winEl.style.color = '';
  }

  // ── Auto-check boxes when criteria are provably true ──
  // pac-baseline: med time entered = med was given, implies baseline was taken
  autoCheck('pac-baseline', !!med);
  // pac-60min: reassessment time entered AND within 60 min
  autoCheck('pac-60min', diff !== null && diff >= 0 && diff <= 60);
  // pac-compared: both pre and post scores entered
  autoCheck('pac-compared', !isNaN(pre) && !isNaN(post) && document.getElementById('pa-pre').value !== '' && document.getElementById('pa-post').value !== '');
  // pac-emr: reassessment time entered = charted with timestamp
  autoCheck('pac-emr', !!reas);

  evalPainAudit();
}

// Sets a checkbox only if condition is true — never unchecks one the user manually checked
function autoCheck(id, condition) {
  const el = document.getElementById(id);
  if (!el) return;
  if (condition && !el.checked) {
    el.checked = true;
    el.dataset.auto = '1'; // mark as auto-set so clear knows
  }
}

function evalPainAudit() {
  const ids = ['pac-baseline','pac-goal','pac-60min','pac-compared','pac-nonpharm','pac-discharge','pac-emr','pac-provider'];
  const checked = ids.filter(id => document.getElementById(id)?.checked).length;
  const total   = ids.length;
  const outcome = document.getElementById('pa-outcome')?.value || '';
  const box     = document.getElementById('pa-outcome-box');
  if (!box) return;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const row = el.closest('label');
    if (!row) return;
    if (!el.checked && checked > 0) {
      row.style.borderColor = 'rgba(239,68,68,0.5)';
      row.style.background  = 'rgba(239,68,68,0.06)';
    } else if (el.checked) {
      row.style.borderColor = 'rgba(62,207,122,0.4)';
      row.style.background  = 'rgba(62,207,122,0.06)';
    } else {
      row.style.borderColor = ''; row.style.background = '';
    }
  });
  if (outcome === 'met') {
    box.style.background = 'rgba(62,207,122,0.1)'; box.style.borderColor = 'rgba(62,207,122,0.3)';
    box.innerHTML = `<span style="color:var(--green2);font-weight:700;">✅ All Criteria Met</span> — ${checked}/${total} criteria confirmed. No deficiencies.`;
  } else if (outcome === 'deficient') {
    const missed = ids.filter(id => !document.getElementById(id)?.checked).map(id => document.getElementById(id)?.closest('label')?.textContent.trim()).filter(Boolean);
    box.style.background = 'rgba(239,68,68,0.1)'; box.style.borderColor = 'rgba(239,68,68,0.3)';
    box.innerHTML = `<span style="color:var(--red2);font-weight:700;">❌ Deficiency — ${checked}/${total} criteria met</span>${missed.length ? '<ul style="margin:6px 0 0 14px;color:var(--red2);">'+missed.map(m=>`<li style="font-size:11px;">${m}</li>`).join('')+'</ul>' : ''}`;
  } else {
    box.style.background = ''; box.style.borderColor = '';
    box.innerHTML = `${checked}/${total} criteria checked — select outcome to finalize.`;
  }
}

function savePainAuditRecord() {
  const nurse = document.getElementById('pa-nurse').value.trim();
  const date  = document.getElementById('pa-date').value;
  if (!date || !nurse) { alert('Please enter Date and Nurse before saving.'); return; }
  const rec = {
    date, nurse,
    room:    document.getElementById('pa-room').value,
    mrid:    document.getElementById('pa-mrid').value,
    med:     document.getElementById('pa-med').value,
    medTime: document.getElementById('pa-med-time').value,
    reassTime: document.getElementById('pa-reass-time').value,
    timeDiff: document.getElementById('pa-diff').textContent,
    inWindow: document.getElementById('pa-window').textContent,
    pre:  document.getElementById('pa-pre').value,
    post: document.getElementById('pa-post').value,
    outcome: document.getElementById('pa-outcome').value,
    comments: document.getElementById('pa-comments').value,
    savedAt: new Date().toLocaleString()
  };
  painAuditRecords.unshift(rec);
  renderPainAuditLog();
  showSaveBanner('Pain reassessment audit saved');
}

function renderPainAuditLog() {
  const el = document.getElementById('pa-log');
  const ct = document.getElementById('pa-count');
  if (ct) ct.textContent = painAuditRecords.length;
  if (!el) return;
  if (!painAuditRecords.length) { el.innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:16px;">No audits saved yet</div>'; return; }
  el.innerHTML = painAuditRecords.map((r,i) => {
    const oc = r.outcome==='met' ? '<span style="color:var(--green2)">✅ Met</span>' : r.outcome==='deficient' ? '<span style="color:var(--red2)">❌ Deficient</span>' : 'Pending';
    return `<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:11px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:var(--white);">${r.date} · ${r.nurse}</span>
        <span>${oc}</span>
      </div>
      <div style="color:var(--text3);">Room ${r.room||'—'} · ${r.med||'—'} · Gap: ${r.timeDiff} · ${r.inWindow}</div>
      ${r.comments ? `<div style="color:var(--text3);margin-top:3px;font-size:11px;">${ccEsc(r.comments)}</div>` : ''}
    </div>`;
  }).join('');
}

function clearPainAudit() {
  if (!confirm('Clear all pain audit form data?')) return;
  ['pa-date','pa-nurse','pa-room','pa-mrid','pa-pre','pa-med','pa-med-time','pa-route','pa-reass-time','pa-post','pa-outcome','pa-auditor','pa-comments']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('pa-diff').textContent = '—';
  document.getElementById('pa-window').textContent = '—';
  ['pac-baseline','pac-goal','pac-60min','pac-compared','pac-nonpharm','pac-discharge','pac-emr','pac-provider']
    .forEach(id => { const el = document.getElementById(id); if (el) { el.checked = false; delete el.dataset.auto; const r = el.closest('label'); if(r){r.style.borderColor='';r.style.background='';} } });
  const box = document.getElementById('pa-outcome-box');
  if (box) { box.style.background=''; box.style.borderColor=''; box.innerHTML='Complete form above to generate outcome summary.'; }
}

function sendPainToVariance() {
  const nurse   = document.getElementById('pa-nurse').value.trim();
  const room    = document.getElementById('pa-room').value.trim();
  const mrid    = document.getElementById('pa-mrid').value.trim();
  const med     = document.getElementById('pa-med').value.trim();
  const medTime = document.getElementById('pa-med-time').value;
  const reassTime = document.getElementById('pa-reass-time').value;
  const timeDiff  = document.getElementById('pa-diff').textContent;
  const inWindow  = document.getElementById('pa-window').textContent;
  const comments  = document.getElementById('pa-comments').value.trim();
  const pre  = document.getElementById('pa-pre').value;
  const post = document.getElementById('pa-post').value;

  // Switch to variance tab
  const varItem = document.querySelector('[data-panel="variance"]');
  if (varItem) switchTabFromDD(varItem, 'ng-quality');
  initVarianceTab();

  // Pre-fill staff if match found
  if (nurse) {
    const sel = document.getElementById('var-staff');
    if (sel) {
      [...sel.options].forEach(o => { if (o.value.toLowerCase().includes(nurse.split(',')[0].toLowerCase())) sel.value = o.value; });
    }
  }
  if (mrid) { const el = document.getElementById('var-mrid'); if (el) el.value = mrid; }

  // Check pain-reass type
  const painCB = document.querySelector('#var-type-grid input[value="pain-reass"]');
  if (painCB) { painCB.checked = true; onVarTypeChange(); }

  // Mirror checklist checks into variance form
  const map = { 'pac-baseline':'pr-baseline','pac-goal':'pr-goal','pac-60min':'pr-60min','pac-compared':'pr-compared','pac-nonpharm':'pr-nonpharm','pac-discharge':'pr-discharge','pac-emr':'pr-emr','pac-provider':'pr-provider' };
  Object.entries(map).forEach(([src,dst]) => {
    const srcEl = document.getElementById(src);
    const dstEl = document.getElementById(dst);
    if (srcEl && dstEl) dstEl.checked = srcEl.checked;
  });

  // Build correction text
  const corrEl = document.getElementById('var-correction');
  if (corrEl) {
    const lines = [`Pain Reassessment Audit — Room ${room||'N/A'} · ${med||'medication'}`];
    if (medTime) lines.push(`Med given: ${medTime} | Reassessment: ${reassTime||'—'} | Time between: ${timeDiff} | ${inWindow}`);
    if (pre||post) lines.push(`Pain score: ${pre||'—'} → ${post||'—'}`);
    if (comments) lines.push(comments);
    corrEl.value = lines.join('\n');
  }

  // Response field
  const respEl = document.getElementById('var-pain-response');
  if (respEl && comments) respEl.value = comments;

  showSaveBanner('Pain audit data sent to Variance form ✓');
  renderVarHistory();
}

// ══════════════════════════════════════════════════════
// BLOOD TRANSFUSION AUDIT
// ══════════════════════════════════════════════════════
const txAuditRecords = [];

function calcTxAudit() {
  const start = document.getElementById('ta-start').value;
  const end   = document.getElementById('ta-end').value;
  const durEl = document.getElementById('ta-duration');
  const winEl = document.getElementById('ta-4hr');

  // Helper: add minutes to HH:MM string, returns HH:MM
  function addMins(t, mins) {
    const [h, m] = t.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
    const nm = ((total % 1440) + 1440) % 1440 % 60;
    return String(nh).padStart(2,'0') + ':' + String(nm).padStart(2,'0');
  }

  // Auto-fill vital sign times from start (only if field is empty)
  if (start) {
    const preField   = document.getElementById('tv-pre-t');
    const after15    = document.getElementById('tv-15-t');
    const after1h    = document.getElementById('tv-1h-t');
    if (preField  && !preField.value)  preField.value  = addMins(start, -15);
    if (after15   && !after15.value)   after15.value   = addMins(start,  15);
    if (after1h   && !after1h.value)   after1h.value   = addMins(start,  60);
  }

  // Auto-fill end vitals and 4-hour post from end time (only if field is empty)
  if (end) {
    const endField  = document.getElementById('tv-end-t');
    const post4h    = document.getElementById('tv-4h-t');
    if (endField && !endField.value) endField.value = end;
    if (post4h   && !post4h.value)   post4h.value   = addMins(end, 240);
  }

  // Duration and 4-hour window
  if (start && end) {
    const [sh,sm] = start.split(':').map(Number);
    const [eh,em] = end.split(':').map(Number);
    const diff = (eh*60+em)-(sh*60+sm);
    const h = Math.floor(Math.abs(diff)/60), m = Math.abs(diff)%60;
    const dur = (h>0?h+'h ':'') + m+'m';
    durEl.textContent = diff < 0 ? 'Invalid' : dur;
    durEl.style.color = diff<=0 ? 'var(--red2)' : diff<=240 ? 'var(--green2)' : 'var(--red2)';
    if (diff <= 0)        { winEl.textContent = '⛔ Invalid';              winEl.style.color = 'var(--red2)'; }
    else if (diff <= 240) { winEl.textContent = '✅ Within 4 hours';       winEl.style.color = 'var(--green2)'; }
    else                  { winEl.textContent = '❌ Exceeds 4-hour limit';  winEl.style.color = 'var(--red2)'; }
  } else {
    durEl.textContent = '—'; winEl.textContent = '—';
    durEl.style.color = ''; winEl.style.color = '';
  }
  evalTxAudit();
}

function evalTxAudit() {
  const ids = ['tac-2rn','tac-2id','tac-consent','tac-baseline','tac-q15','tac-q30','tac-4hr','tac-rate','tac-rxprot','tac-postdoc','tac-label','tac-notify'];
  const checked = ids.filter(id => document.getElementById(id)?.checked).length;
  const total   = ids.length;
  const outcome = document.getElementById('ta-outcome')?.value || '';
  const box     = document.getElementById('ta-outcome-box');
  if (!box) return;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const row = el.closest('label');
    if (!row) return;
    if (!el.checked && checked > 0) { row.style.borderColor = 'rgba(239,68,68,0.5)'; row.style.background = 'rgba(239,68,68,0.06)'; }
    else if (el.checked)            { row.style.borderColor = 'rgba(62,207,122,0.4)'; row.style.background = 'rgba(62,207,122,0.06)'; }
    else                            { row.style.borderColor = ''; row.style.background = ''; }
  });
  if (outcome === 'met') {
    box.style.background = 'rgba(62,207,122,0.1)'; box.style.borderColor = 'rgba(62,207,122,0.3)';
    box.innerHTML = `<span style="color:var(--green2);font-weight:700;">✅ All Criteria Met</span> — ${checked}/${total} criteria confirmed.`;
  } else if (outcome === 'deficient') {
    const missed = ids.filter(id => !document.getElementById(id)?.checked).map(id => document.getElementById(id)?.closest('label')?.textContent.trim()).filter(Boolean);
    box.style.background = 'rgba(239,68,68,0.1)'; box.style.borderColor = 'rgba(239,68,68,0.3)';
    box.innerHTML = `<span style="color:var(--red2);font-weight:700;">❌ Deficiency — ${checked}/${total} criteria met</span>${missed.length ? '<ul style="margin:6px 0 0 14px;color:var(--red2);">'+missed.map(m=>`<li style="font-size:11px;">${m}</li>`).join('')+'</ul>' : ''}`;
  } else {
    box.style.background = ''; box.style.borderColor = '';
    box.innerHTML = `${checked}/${total} criteria checked — select outcome to finalize.`;
  }
}

function saveTxAuditRecord() {
  const nurse = document.getElementById('ta-nurse').value.trim();
  const date  = document.getElementById('ta-date').value;
  if (!date || !nurse) { alert('Please enter Date and Nurse before saving.'); return; }
  const rec = {
    date, nurse,
    room:     document.getElementById('ta-room').value,
    mrid:     document.getElementById('ta-mrid').value,
    product:  document.getElementById('ta-product').value,
    start:    document.getElementById('ta-start').value,
    end:      document.getElementById('ta-end').value,
    duration: document.getElementById('ta-duration').textContent,
    inWindow: document.getElementById('ta-4hr').textContent,
    reaction: document.getElementById('ta-rxyn').value,
    outcome:  document.getElementById('ta-outcome').value,
    comments: document.getElementById('ta-comments').value,
    savedAt:  new Date().toLocaleString()
  };
  txAuditRecords.unshift(rec);
  renderTxAuditLog();
  showSaveBanner('Transfusion audit saved');
}

function renderTxAuditLog() {
  const el = document.getElementById('ta-log');
  const ct = document.getElementById('ta-count');
  if (ct) ct.textContent = txAuditRecords.length;
  if (!el) return;
  if (!txAuditRecords.length) { el.innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:16px;">No audits saved yet</div>'; return; }
  el.innerHTML = txAuditRecords.map((r,i) => {
    const oc = r.outcome==='met' ? '<span style="color:var(--green2)">✅ Met</span>' : r.outcome==='deficient' ? '<span style="color:var(--red2)">❌ Deficient</span>' : 'Pending';
    const rx = r.reaction==='yes' ? '<span style="color:var(--red2)">⚠ Reaction</span>' : '';
    return `<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:11px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:var(--white);">${r.date} · ${r.nurse}</span>
        <span>${oc} ${rx}</span>
      </div>
      <div style="color:var(--text3);">Room ${r.room||'—'} · ${r.product||'—'} · ${r.start||'?'}→${r.end||'?'} (${r.duration}) · ${r.inWindow}</div>
      ${r.comments ? `<div style="color:var(--text3);margin-top:3px;font-size:11px;">${ccEsc(r.comments)}</div>` : ''}
    </div>`;
  }).join('');
}

function clearTxAudit() {
  if (!confirm('Clear all transfusion audit form data?')) return;
  ['ta-date','ta-nurse','ta-room','ta-mrid','ta-product','ta-unitnum','ta-2rn','ta-2rn-time',
   'ta-start','ta-start-rate','ta-rate-change','ta-new-rate','ta-end',
   'tv-pre-t','tv-pre-bp','tv-pre-hr','tv-pre-temp','tv-pre-spo2','tv-pre-rr',
   'tv-15-t','tv-15-bp','tv-15-hr','tv-15-temp','tv-15-spo2','tv-15-rr',
   'tv-1h-t','tv-1h-bp','tv-1h-hr','tv-1h-temp','tv-1h-spo2','tv-1h-rr',
   'tv-end-t','tv-end-bp','tv-end-hr','tv-end-temp','tv-end-spo2','tv-end-rr',
   'tv-4h-t','tv-4h-bp','tv-4h-hr','tv-4h-temp','tv-4h-spo2','tv-4h-rr',
   'ta-rxdesc','ta-outcome','ta-auditor','ta-comments']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('ta-rxyn').value = 'no';
  document.getElementById('ta-duration').textContent = '—';
  document.getElementById('ta-4hr').textContent = '—';
  ['tac-2rn','tac-2id','tac-consent','tac-baseline','tac-q15','tac-q30','tac-4hr','tac-rate','tac-rxprot','tac-postdoc','tac-label','tac-notify']
    .forEach(id => { const el = document.getElementById(id); if (el) { el.checked=false; const r=el.closest('label'); if(r){r.style.borderColor='';r.style.background='';} } });
  const box = document.getElementById('ta-outcome-box');
  if (box) { box.style.background=''; box.style.borderColor=''; box.innerHTML='Complete form above to generate outcome summary.'; }
}

// ---------- import a finding from the Audit tracker (?varImport=1&...) ----------
function importVarianceFromAudit() {
  const p = new URLSearchParams(location.search);

  const staff   = p.get('staff')   || '';
  const type    = p.get('type')    || '';
  const date    = p.get('date')    || '';
  const mrn     = p.get('mrn')     || '';
  const issue   = p.get('issue')   || '';
  const context = p.get('context') || '';

  // Switch to variance tab
  const varItem = document.querySelector('[data-panel="variance"]');
  if (varItem) switchTabFromDD(varItem, 'ng-quality');
  initVarianceTab();

  // Pre-fill staff
  if (staff) {
    const sel = document.getElementById('var-staff');
    if (sel) [...sel.options].forEach(o => { if (o.value.toLowerCase().includes(staff.split(',')[0].toLowerCase())) sel.value = o.value; });
  }
  if (mrn)  { const el = document.getElementById('var-mrid'); if (el) el.value = mrn; }
  if (date) { const el = document.getElementById('var-date'); if (el) el.value = date; }

  // Check variance type (if we have a confident mapping — otherwise leave for manual pick)
  if (type) {
    const cb = document.querySelector(`#var-type-grid input[value="${type}"]`);
    if (cb) { cb.checked = true; onVarTypeChange(); }
  }

  // Build correction/notes text from the audit finding
  const corrEl = document.getElementById('var-correction');
  if (corrEl) {
    const lines = [];
    if (context) lines.push(`Audit finding: ${context}`);
    if (issue)   lines.push(`Issue: ${issue}`);
    corrEl.value = lines.join('\n');
  }

  showSaveBanner('Audit finding loaded into Variance form ✓');
  renderVarHistory();

  // Clean the URL so a refresh/bookmark doesn't re-import
  history.replaceState(null, '', location.pathname);
}
(function watchForAuditImport() {
  if (!new URLSearchParams(location.search).get('varImport')) return;
  const iv = setInterval(function () {
    if (typeof initVarianceTab === 'function' && document.getElementById('var-staff')) {
      clearInterval(iv);
      importVarianceFromAudit();
    }
  }, 200);
  setTimeout(() => clearInterval(iv), 10000); // safety fallback
})();

function sendTxToVariance() {
  const nurse   = document.getElementById('ta-nurse').value.trim();
  const room    = document.getElementById('ta-room').value.trim();
  const mrid    = document.getElementById('ta-mrid').value.trim();
  const product = document.getElementById('ta-product').value;
  const start   = document.getElementById('ta-start').value;
  const end     = document.getElementById('ta-end').value;
  const duration = document.getElementById('ta-duration').textContent;
  const inWindow = document.getElementById('ta-4hr').textContent;
  const comments = document.getElementById('ta-comments').value.trim();
  const reaction = document.getElementById('ta-rxyn').value;
  const rxdesc   = document.getElementById('ta-rxdesc').value.trim();

  // Switch to variance tab
  const varItem = document.querySelector('[data-panel="variance"]');
  if (varItem) switchTabFromDD(varItem, 'ng-quality');
  initVarianceTab();

  // Pre-fill staff
  if (nurse) {
    const sel = document.getElementById('var-staff');
    if (sel) [...sel.options].forEach(o => { if (o.value.toLowerCase().includes(nurse.split(',')[0].toLowerCase())) sel.value = o.value; });
  }
  if (mrid) { const el = document.getElementById('var-mrid'); if (el) el.value = mrid; }

  // Check blood-tx type
  const txCB = document.querySelector('#var-type-grid input[value="blood-tx"]');
  if (txCB) { txCB.checked = true; onVarTypeChange(); }

  // Mirror checklist
  const map = { 'tac-2rn':'tx-2rn','tac-2id':'tx-2id','tac-consent':'tx-consent','tac-baseline':'tx-baseline','tac-q15':'tx-q15','tac-q30':'tx-q30','tac-4hr':'tx-4hr','tac-rate':'tx-rate','tac-rxprot':'tx-reaction-proto','tac-postdoc':'tx-postdoc','tac-label':'tx-label','tac-notify':'tx-notify' };
  Object.entries(map).forEach(([src,dst]) => {
    const srcEl = document.getElementById(src);
    const dstEl = document.getElementById(dst);
    if (srcEl && dstEl) dstEl.checked = srcEl.checked;
  });

  // Reaction
  const rxYN = document.getElementById('tx-reaction-yn');
  if (rxYN) rxYN.value = reaction;
  const rxDesc = document.getElementById('tx-reaction-desc');
  if (rxDesc && rxdesc) rxDesc.value = rxdesc;

  // Build correction text
  const corrEl = document.getElementById('var-correction');
  if (corrEl) {
    const lines = [`Blood Transfusion Audit — Room ${room||'N/A'} · ${product||'blood product'}`];
    if (start||end) lines.push(`Start: ${start||'—'} | End: ${end||'—'} | Duration: ${duration} | ${inWindow}`);
    if (reaction==='yes') lines.push(`⚠ REACTION REPORTED: ${rxdesc||'see notes'}`);
    if (comments) lines.push(comments);
    corrEl.value = lines.join('\n');
  }

  showSaveBanner('Transfusion audit data sent to Variance form ✓');
  renderVarHistory();
}

// ══════════════════════════════════════════════════════
// INIT AUDIT DATES
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// POST AUDIT RESULTS TO KPI / QUALITY DATA
// ══════════════════════════════════════════════════════

function postPainToKPI() {
  const nurse   = document.getElementById('pa-nurse').value.trim();
  const dateVal = document.getElementById('pa-date').value;  // YYYY-MM-DD
  const outcome = document.getElementById('pa-outcome').value;

  if (!nurse)   { alert('Enter the nurse name before posting to KPI.'); return; }
  if (!dateVal) { alert('Enter the audit date before posting to KPI.'); return; }
  if (!outcome) { alert('Select an outcome (All Criteria Met / Deficiency) before posting to KPI.'); return; }

  // Match nurse name to MASTER_STAFF
  const match = MASTER_STAFF.find(s =>
    s.name.toLowerCase().includes(nurse.split(',')[0].toLowerCase()) ||
    nurse.toLowerCase().includes(s.name.split(',')[0].toLowerCase())
  );
  const staffName = match ? match.name : nurse;

  // Build month key
  const [yr, mo] = dateVal.split('-').map(Number);
  const key = `${yr}-${String(mo).padStart(2,'0')}`;

  // Init quality data
  if (!state.qualityData[staffName]) state.qualityData[staffName] = {};
  if (!state.qualityData[staffName][key])
    state.qualityData[staffName][key] = { scans:0, scanTotal:0, pain:0, painTotal:0, transfusions:0, txNum:0, txDen:0 };

  const q = state.qualityData[staffName][key];
  q.painTotal += 1;
  if (outcome === 'met') q.pain += 1;

  persistSave();

  const pct = q.painTotal > 0 ? Math.round(q.pain / q.painTotal * 100) : 0;
  showSaveBanner(`📊 Pain KPI updated for ${staffName.split(',')[0]} — ${q.pain}/${q.painTotal} met (${pct}%) in ${key}`);

  // Also save the audit record
  savePainAuditRecord();
}

function postTxToKPI() {
  const nurse   = document.getElementById('ta-nurse').value.trim();
  const dateVal = document.getElementById('ta-date').value;
  const outcome = document.getElementById('ta-outcome').value;

  if (!nurse)   { alert('Enter the nurse name before posting to KPI.'); return; }
  if (!dateVal) { alert('Enter the audit date before posting to KPI.'); return; }
  if (!outcome) { alert('Select an outcome (All Criteria Met / Deficiency) before posting to KPI.'); return; }

  const match = MASTER_STAFF.find(s =>
    s.name.toLowerCase().includes(nurse.split(',')[0].toLowerCase()) ||
    nurse.toLowerCase().includes(s.name.split(',')[0].toLowerCase())
  );
  const staffName = match ? match.name : nurse;

  const [yr, mo] = dateVal.split('-').map(Number);
  const key = `${yr}-${String(mo).padStart(2,'0')}`;

  if (!state.qualityData[staffName]) state.qualityData[staffName] = {};
  if (!state.qualityData[staffName][key])
    state.qualityData[staffName][key] = { scans:0, scanTotal:0, pain:0, painTotal:0, transfusions:0, txNum:0, txDen:0 };

  const q = state.qualityData[staffName][key];
  q.txDen       += 1;
  q.transfusions += 1;
  if (outcome === 'met') q.txNum += 1;

  persistSave();

  const pct = q.txDen > 0 ? Math.round(q.txNum / q.txDen * 100) : 0;
  showSaveBanner(`📊 Transfusion KPI updated for ${staffName.split(',')[0]} — ${q.txNum}/${q.txDen} compliant (${pct}%) in ${key}`);

  saveTxAuditRecord();
}

function initAuditDates() {
  const today = new Date().toISOString().split('T')[0];
  const paDate = document.getElementById('pa-date');
  const taDate = document.getElementById('ta-date');
  if (paDate && !paDate.value) paDate.value = today;
  if (taDate && !taDate.value) taDate.value = today;
}

const VARIANCE_TYPES = [
  { id:'care-plan',   label:'Nurse Care Plans',          icon:'📋', showCP: true  },
  { id:'med-scan',    label:'Medication Scanning',        icon:'💊', showCP: false },
  { id:'fall',        label:'Fall / Fall Prevention',     icon:'🚨', showCP: false },
  { id:'blood-tx',    label:'Blood Transfusion',             icon:'🩸', showCP: false },
  { id:'pain-reass',  label:'Pain Reassessment',          icon:'💔', showCP: false },
  { id:'skin',        label:'Skin / Pressure Injury',     icon:'🩹', showCP: false },
  { id:'hand-hyg',    label:'Hand Hygiene',               icon:'🧼', showCP: false },
  { id:'documentation', label:'Documentation',            icon:'📝', showCP: false },
  { id:'isolation',   label:'Isolation Precautions',      icon:'🦠', showCP: false },
  { id:'behavior',    label:'Professional Conduct',       icon:'⚠️', showCP: false },
  { id:'attendance',  label:'Attendance / Tardiness',     icon:'⏰', showCP: false },
  { id:'restraint',   label:'Restraint Policy',           icon:'🔒', showCP: false },
  { id:'id-verify',   label:'Patient Identification',     icon:'🪪', showCP: false },
  { id:'hipaa',       label:'HIPAA / Confidentiality',    icon:'🔐', showCP: false },
  { id:'clabsi',      label:'CLABSI Bundle Compliance',   icon:'💉', showCP: false },
  { id:'cauti',       label:'CAUTI Bundle Compliance',    icon:'🏥', showCP: false },
];

function initVarianceTab() {
  // Populate staff dropdown
  const sel = document.getElementById('var-staff');
  if (sel && sel.options.length <= 1) {
    MASTER_STAFF.filter(s => s.job !== 'NURSE MGR').forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name + ' (' + s.job + ')';
      sel.appendChild(opt);
    });
  }
  // Auto-fill today's date and current time
  const now = new Date();
  const dateEl = document.getElementById('var-date');
  const timeEl = document.getElementById('var-time');
  if (dateEl && !dateEl.value) {
    dateEl.value = now.toISOString().split('T')[0];
  }
  if (timeEl && !timeEl.value) {
    timeEl.value = now.toTimeString().slice(0, 5);
  }
  // Build variance type checkboxes
  const grid = document.getElementById('var-type-grid');
  if (grid && !grid.querySelector('input')) {
    grid.innerHTML = VARIANCE_TYPES.map(v =>
      `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;padding:4px 6px;border:1px solid rgba(255,255,255,0.1);border-radius:5px;">
        <input type="checkbox" value="${v.id}" onchange="onVarTypeChange()" style="accent-color:var(--amber2);width:13px;height:13px;">
        <span>${v.icon} ${v.label}</span>
      </label>`
    ).join('');
  }
  // Default manager name
  const mgr = document.getElementById('var-manager');
  if (mgr && !mgr.value) mgr.value = 'Ron Higley';
  renderVarHistory();
}

function onVarTypeChange() {
  const careplanChecked   = document.querySelector('#var-type-grid input[value="care-plan"]')?.checked;
  const painChecked       = document.querySelector('#var-type-grid input[value="pain-reass"]')?.checked;
  const transfusionChecked= document.querySelector('#var-type-grid input[value="blood-tx"]')?.checked;
  const cpSection  = document.getElementById('var-careplan-section');
  const prSection  = document.getElementById('var-painreass-section');
  const txSection  = document.getElementById('var-transfusion-section');
  if (cpSection) cpSection.style.display  = careplanChecked    ? 'block' : 'none';
  if (prSection) prSection.style.display  = painChecked        ? 'block' : 'none';
  if (txSection) txSection.style.display  = transfusionChecked ? 'block' : 'none';
}

// Sync dropdown selection into the correction textarea
function syncVarianceDropdown(type) {
  const idMap = { careplan:'var-careplan-issue', pain:'var-pain-issue', transfusion:'var-transfusion-issue' };
  const sel = document.getElementById(idMap[type]);
  if (!sel || !sel.value) return;
  const corr = document.getElementById('var-correction');
  if (!corr) return;
  const existing = corr.value.trim();
  corr.value = existing ? existing + '\n' + sel.value : sel.value;
}

function onVarStaffChange() {
  renderVarHistory();
}

function renderVarHistory() {
  const name = document.getElementById('var-staff')?.value || '';
  const el = document.getElementById('var-history');
  if (!el) return;
  if (!name) { el.innerHTML = '<div style="color:var(--text3);">Select a staff member to view history.</div>'; return; }
  const log = (state.varianceLog[name] || []).slice().sort((a,b) => b.ts - a.ts);
  if (!log.length) {
    el.innerHTML = `<div style="color:var(--green2);font-size:11px;">✓ No variance reports on file for ${name.split(',')[0]}.</div>`;
    return;
  }
  el.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;">' +
    log.map((v, i) => {
      const d = v.date ? new Date(v.date + 'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) : '—';
      return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-left:3px solid var(--amber2);border-radius:6px;padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;font-weight:700;color:var(--amber2);">${d}${v.time ? ' · ' + v.time : ''}</span>
          <button onclick="deleteVariance('${name.replace(/'/g,"\\'")}',${i})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;" title="Delete">✕</button>
        </div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px;"><strong>Type:</strong> ${(v.types||[v.type||'—']).join(', ')}</div>
        <div style="font-size:11px;color:var(--text3);">${v.correction || '—'}</div>
        ${v.returnBy ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;">Return by: ${v.returnBy} · Manager: ${v.manager||'—'}</div>` : ''}
        ${v.staffSignature
          ? `<div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
               <span style="font-size:11px;color:var(--green2);font-weight:700;">✍ Signed ${v.staffSignedAt ? new Date(v.staffSignedAt).toLocaleString() : ''}</span>
               <button onclick="viewVarianceStatement('${name.replace(/'/g,"\\'")}',${i})" style="background:none;border:1px solid var(--border);color:var(--text2);border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;">View</button>
             </div>`
          : `<div style="margin-top:6px;font-size:11px;color:var(--text3);">✎ Awaiting staff statement/signature</div>`}
      </div>`;
    }).join('') + '</div>';
}

function viewVarianceStatement(name, idx) {
  const log = (state.varianceLog[name] || []).slice().sort((a,b) => b.ts - a.ts);
  const v = log[idx];
  if (!v) return;
  const initRows = Object.entries(v.staffInitials || {})
    .map(([k,val]) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #eee;"><span>${k}</span><strong>${val || '—'}</strong></div>`)
    .join('') || '<div style="font-size:11px;color:#999;">No itemized initials on this report.</div>';
  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Statement — ${name}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;max-width:600px;margin:0 auto;color:#222;}
  h1{font-size:16px;color:#1e3a5f;} h2{font-size:12px;text-transform:uppercase;color:#555;margin-top:20px;}
  .box{border:1px solid #ddd;border-radius:6px;padding:10px;font-size:13px;white-space:pre-wrap;}
  img{max-width:100%;border:1px solid #ddd;border-radius:6px;margin-top:6px;}</style></head><body>
  <h1>${name} — Signed Statement</h1>
  <div style="font-size:11px;color:#777;">Signed: ${v.staffSignedAt ? new Date(v.staffSignedAt).toLocaleString() : '—'}</div>
  <h2>Statement</h2><div class="box">${(v.staffStatement||'—').replace(/</g,'&lt;')}</div>
  <h2>Initials</h2>${initRows}
  <h2>Signature</h2>${v.staffSignature ? `<img src="${v.staffSignature}">` : '<div style="font-size:11px;color:#999;">No signature on file.</div>'}
  </body></html>`);
  w.document.close();
}

function deleteVariance(name, idx) {
  if (!confirm('Delete this variance report?')) return;
  const log = state.varianceLog[name];
  if (!log) return;
  // idx is from reversed array, un-reverse
  const realIdx = log.length - 1 - idx;
  log.splice(realIdx, 1);
  if (!log.length) delete state.varianceLog[name];
  persistSave();
  renderVarHistory();
  showSaveBanner('Variance report deleted');
}

function getVarFormData() {
  const name       = document.getElementById('var-staff')?.value || '';
  const date       = document.getElementById('var-date')?.value  || '';
  const time       = document.getElementById('var-time')?.value  || '';
  const mrid       = document.getElementById('var-mrid')?.value  || '';
  const correction = document.getElementById('var-correction')?.value || '';
  const returnBy   = document.getElementById('var-returnby')?.value  || '';
  const manager    = document.getElementById('var-manager')?.value   || '';
  const notes      = document.getElementById('var-notes')?.value     || '';
  const customType = document.getElementById('var-type-custom')?.value || '';

  const checkedTypes = [...document.querySelectorAll('#var-type-grid input:checked')]
    .map(cb => {
      const vt = VARIANCE_TYPES.find(v => v.id === cb.value);
      return vt ? vt.icon + ' ' + vt.label : cb.value;
    });
  if (customType) checkedTypes.push(customType);

  const cpChecks = {
    plans:    document.getElementById('cp-2plans')?.checked   || false,
    goals:    document.getElementById('cp-2goals')?.checked   || false,
    interv:   document.getElementById('cp-2interv')?.checked  || false,
    daily:    document.getElementById('cp-daily')?.checked    || false,
    reviewed: document.getElementById('cp-reviewed')?.checked || false,
    upGoals:  document.getElementById('cp-goals')?.checked    || false,
    inpat:    document.getElementById('cp-inpatient')?.checked|| false,
    within12: document.getElementById('cp-within12')?.checked || false,
  };

  // Pain reassessment checkboxes
  const painChecks = {
    baseline: document.getElementById('pr-baseline')?.checked || false,
    goal:     document.getElementById('pr-goal')?.checked     || false,
    min60:    document.getElementById('pr-60min')?.checked    || false,
    compared: document.getElementById('pr-compared')?.checked || false,
    nonpharm: document.getElementById('pr-nonpharm')?.checked || false,
    discharge:document.getElementById('pr-discharge')?.checked|| false,
    emr:      document.getElementById('pr-emr')?.checked      || false,
    provider: document.getElementById('pr-provider')?.checked || false,
  };
  const painResponse = document.getElementById('var-pain-response')?.value || '';

  // Blood transfusion checkboxes
  const txChecks = {
    twoRN:    document.getElementById('tx-2rn')?.checked          || false,
    twoID:    document.getElementById('tx-2id')?.checked          || false,
    consent:  document.getElementById('tx-consent')?.checked      || false,
    baseline: document.getElementById('tx-baseline')?.checked     || false,
    q15:      document.getElementById('tx-q15')?.checked          || false,
    q30:      document.getElementById('tx-q30')?.checked          || false,
    fourHr:   document.getElementById('tx-4hr')?.checked          || false,
    rate:     document.getElementById('tx-rate')?.checked         || false,
    rxProto:  document.getElementById('tx-reaction-proto')?.checked|| false,
    postDoc:  document.getElementById('tx-postdoc')?.checked      || false,
    label:    document.getElementById('tx-label')?.checked        || false,
    notify:   document.getElementById('tx-notify')?.checked       || false,
  };
  const txReactionYN   = document.getElementById('tx-reaction-yn')?.value   || 'no';
  const txReactionDesc = document.getElementById('tx-reaction-desc')?.value  || '';

  // Pain reassessment specific issue
  const painIssue = document.getElementById('var-pain-issue')?.value || '';

  // Blood transfusion specific issue
  const txIssue = document.getElementById('var-transfusion-issue')?.value || '';

  // Care plan specific issue
  const cpIssue = document.getElementById('var-careplan-issue')?.value || '';

  return { name, date, time, mrid, types: checkedTypes, correction, returnBy, manager, notes, cpChecks, painIssue, txIssue, cpIssue, painChecks, painResponse, txChecks, txReactionYN, txReactionDesc };
}

function saveVarianceToNotes() {
  const v = getVarFormData();
  if (!v.name) { alert('Please select a staff member.'); return; }
  if (!v.types.length && !document.getElementById('var-type-custom')?.value) {
    alert('Please select at least one variance type.'); return;
  }

  const ts = Date.now();
  if (!state.varianceLog[v.name]) state.varianceLog[v.name] = [];
  state.varianceLog[v.name].push({ ...v, ts });

  // Also add a summary note to empNotes
  if (!state.empNotes[v.name]) state.empNotes[v.name] = [];
  const noteText = `⚠ VARIANCE REPORT — ${v.date}${v.time?' '+v.time:''}: ${v.types.join(', ')}. ${v.correction ? 'Plan: ' + v.correction : ''}`;
  state.empNotes[v.name].push({ ts, text: noteText });

  persistSave();
  renderVarHistory();
  showSaveBanner('✅ Variance report saved to ' + v.name.split(',')[0] + "'s record");
}

// Label maps for itemized requirements — used to build the staff initial checklist
const VAR_CP_LABELS = {
  plans:'2 care plans required per patient', goals:'2 measurable goals per care plan', interv:'2 interventions per goal',
  daily:'Care plan updated daily', reviewed:'Care plan reviewed & marked this shift', upGoals:'Goals reflect current patient condition',
  inpat:'Inpatient template used (not LTC)', within12:'Initiated within 12h of admission'
};
const VAR_PAIN_LABELS = {
  baseline:'Baseline pain score documented before medication', goal:'Pain goal established and documented with patient',
  min60:'Reassessment completed within 60 min of intervention', compared:'Reassessment score compared to baseline',
  nonpharm:'Non-pharmacologic intervention attempted first', discharge:'Pre-discharge pain reassessment completed',
  emr:'Reassessment charted in EMR with timestamp', provider:'Provider notified if pain uncontrolled'
};
const VAR_TX_LABELS = {
  twoRN:'Two-RN verification completed before hang', twoID:'Two patient identifiers confirmed (name + DOB)',
  consent:'Pre-transfusion consent obtained and documented', baseline:'Baseline vital signs obtained within 30 min of start',
  q15:'Vitals q15 min × 2 during first 30 minutes', q30:'Vitals q30 min for remainder of transfusion',
  fourHr:'Product infused within 4-hour policy window', rate:'Rate of infusion verified per provider order',
  rxProto:'Transfusion reaction protocol followed if applicable', postDoc:'Post-transfusion vitals and documentation complete',
  label:'Blood product label matched to patient wristband', notify:'Provider notified of transfusion completion'
};

// Generate a mobile-friendly standalone page for the involved staff member:
// they add a written statement, initial each flagged requirement, and sign —
// then send the resulting link back so it imports into their variance record.
// pdf-lib's built-in fonts only support WinAnsi encoding — strip emoji/pictographs
// (variance type icons, etc.) before drawing any text, or PDF generation throws.
function pdfSafeText(s) {
  return String(s || '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapPdfText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Looks up a staff email tolerant of "Last, First" vs "First Last" naming,
// case, and stray whitespace — Directory can end up with duplicate records
// in different name formats for the same person.
function findStaffEmail(name) {
  if (!name) return '';
  if (state.emails[name]) return state.emails[name];
  const norm = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const swap = s => {
    const parts = s.split(',').map(x => x.trim());
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : s.split(' ').reverse().join(', ');
  };
  const target = norm(name);
  const targetSwapped = norm(swap(name));
  for (const key of Object.keys(state.emails)) {
    if (!state.emails[key]) continue;
    const k = norm(key);
    if (k === target || k === targetSwapped) return state.emails[key];
  }
  return '';
}

async function sendVarianceToStaff() {
  const v = getVarFormData();
  if (!v.name) { alert('Please select a staff member.'); return; }
  if (!v.types.length && !document.getElementById('var-type-custom')?.value) {
    alert('Please select at least one variance type.'); return;
  }

  saveVarianceToNotes();
  const log = state.varianceLog[v.name] || [];
  const entry = log[log.length - 1];
  const ts = entry.ts;

  showSaveBanner('📤 Preparing link for ' + v.name.split(',')[0] + '…');

  // Stage a snapshot of this report for the staff-facing fill-in/sign page
  // (the ?vf=<ts> overlay) — matches the shape renderStaffVarianceOverlay expects.
  const snapshot = {
    name: v.name, ts,
    date: entry.date, time: entry.time,
    types: entry.types, correction: entry.correction,
    cpChecks: entry.cpChecks, painChecks: entry.painChecks, txChecks: entry.txChecks
  };

  const cfg = getSBConfig();
  try {
    const res = await fetch(`${cfg.url}/rest/v1/tracker_state`, {
      method: 'POST',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: 'varform_' + ts, value: JSON.stringify(snapshot), updated_at: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('staging failed (' + res.status + ')');
  } catch(e) {
    alert('Could not prepare the link (' + (e.message || 'unknown error') + '). Please try again.');
    return;
  }

  const displayDate = entry.date
    ? new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  const ccUrl = window.location.href.split('?')[0];
  const link = `${ccUrl}?vf=${ts}`;
  const staffEmail = findStaffEmail(v.name);

  const subject = `Performance Variance Report — ${v.name.split(',')[0]}, ${displayDate}`;
  const body = [
    `Hi ${v.name.split(',')[0]},`,
    '',
    `A Performance Variance Report was completed regarding ${(entry.types||[]).join(', ') || 'a compliance finding'} on ${displayDate}.`,
    '',
    'Please open the link below to review it, add your statement, initial each item, and sign. It submits automatically back to me — nothing to print, scan, or email back:',
    link,
    '',
    'Thank you,',
    'Ron Higley'
  ].join('\n');

  if (staffEmail) {
    showSaveBanner('✅ Opening email to ' + v.name.split(',')[0] + '…');
    window.location.href = `mailto:${encodeURIComponent(staffEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } else {
    try { await navigator.clipboard.writeText(link); } catch(e) { /* clipboard may be blocked — link is still in the prompt below */ }
    showSaveBanner('✅ Link ready for ' + v.name.split(',')[0] + ' — copied to clipboard');
    prompt('No email on file for ' + v.name.split(',')[0] + ' (add one in Directory). Link copied to clipboard — text or send this to them:', link);
  }
}

function clearVarianceForm() {

  document.getElementById('var-staff').value    = '';
  document.getElementById('var-date').value     = new Date().toISOString().split('T')[0];
  document.getElementById('var-time').value     = new Date().toTimeString().slice(0,5);
  document.getElementById('var-mrid').value     = '';
  document.getElementById('var-correction').value = '';
  document.getElementById('var-returnby').value = '';
  document.getElementById('var-notes').value    = '';
  document.getElementById('var-type-custom').value = '';
  document.querySelectorAll('#var-type-grid input').forEach(cb => cb.checked = false);
  document.querySelectorAll('#var-careplan-section input[type=checkbox]').forEach(cb => cb.checked = false);
  document.getElementById('var-careplan-section').style.display = 'none';
  renderVarHistory();
}

function printVarianceForm() {
  const v = getVarFormData();
  if (!v.name) { alert('Please select a staff member.'); return; }
  const displayDate = v.date ? new Date(v.date + 'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '_______________';
  const hasCPVariance   = v.types.some(t => t.includes('Care Plan'));
  const hasPainVariance = v.types.some(t => t.includes('Pain'));
  const hasTxVariance   = v.types.some(t => t.includes('Transfusion') || t.includes('Blood'));
  const cpChecks = v.cpChecks;

  function chk(checked) {
    return `<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #333;border-radius:2px;text-align:center;line-height:11px;font-size:10px;margin-right:4px;">${checked?'✓':''}</span>`;
  }

  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Performance Variance Report — ${v.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial, sans-serif; font-size:10pt; color:#111; padding:40px; }
    h1 { font-size:13pt; text-align:center; font-weight:bold; margin-bottom:2px; letter-spacing:0.5px; }
    h2 { font-size:10pt; font-weight:bold; margin:14px 0 6px; border-bottom:1px solid #999; padding-bottom:3px; }
    .row { display:flex; gap:20px; margin-bottom:10px; }
    .field { flex:1; }
    .field label { font-size:8pt; color:#555; display:block; margin-bottom:2px; font-weight:bold; text-transform:uppercase; letter-spacing:0.3px; }
    .field .value { border-bottom:1.5px solid #333; min-height:22px; padding:2px 0; font-size:10pt; }
    .check-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; margin:6px 0; }
    .check-item { display:flex; align-items:center; font-size:9.5pt; gap:4px; }
    .type-tag { display:inline-block; border:1px solid #333; border-radius:3px; padding:1px 8px; font-size:9pt; margin:2px 3px 2px 0; }
    .sig-row { display:flex; gap:30px; margin-top:10px; }
    .sig-block { flex:1; }
    .sig-line { border-bottom:1.5px solid #333; margin-bottom:3px; height:30px; }
    .sig-label { font-size:8pt; color:#555; }
    .correction-lines { min-height:80px; border:1px solid #aaa; border-radius:4px; padding:8px; font-size:10pt; line-height:1.6; }
    @page { size:letter; margin:0.6in; }
    @media print { body { padding:0; } }
  </style></head><body>

  <h1>PERFORMANCE VARIANCE REPORT</h1>
  <div style="text-align:center;font-size:9pt;color:#555;margin-bottom:14px;">3B Tele Med Surg · AOMC Nursing Operations</div>

  <div class="row">
    <div class="field" style="flex:2;">
      <label>Staff Member</label>
      <div class="value" style="font-weight:bold;font-size:11pt;">${v.name}</div>
    </div>
    <div class="field">
      <label>Date</label>
      <div class="value">${displayDate}</div>
    </div>
    <div class="field">
      <label>Time</label>
      <div class="value">${v.time || '________'}</div>
    </div>
    <div class="field">
      <label>MR# / Patient ID</label>
      <div class="value">${v.mrid || ''}</div>
    </div>
  </div>

  <h2>Performance Variance</h2>
  <div style="margin-bottom:10px;">
    ${v.types.length ? v.types.map(t => `<span class="type-tag">${t}</span>`).join('') : '<span style="color:#999;font-style:italic;">Not specified</span>'}
  </div>

  ${hasCPVariance ? `
  <h2>Nurse Care Plan Requirements</h2>
  ${v.cpIssue ? `<div style="margin-bottom:8px;padding:6px 10px;background:#f0f4fb;border-left:3px solid #1a4480;font-size:9.5pt;"><strong>Specific Issue:</strong> ${v.cpIssue}</div>` : ''}
  <div class="check-grid">
    <div class="check-item">${chk(cpChecks.plans)} 2 care plans required per patient</div>
    <div class="check-item">${chk(cpChecks.goals)} 2 measurable goals per care plan</div>
    <div class="check-item">${chk(cpChecks.interv)} 2 interventions per goal</div>
    <div class="check-item">${chk(cpChecks.daily)} Care plan updated daily</div>
    <div class="check-item">${chk(cpChecks.reviewed)} Care plan reviewed &amp; marked this shift</div>
    <div class="check-item">${chk(cpChecks.upGoals)} Goals reflect current patient condition</div>
    <div class="check-item">${chk(cpChecks.inpat)} Inpatient template used (not LTC)</div>
    <div class="check-item">${chk(cpChecks.within12)} Initiated within 12h of admission</div>
  </div>` : ''}

  ${hasPainVariance ? `
  <h2>Pain Reassessment Requirements</h2>
  ${v.painIssue ? `<div style="margin-bottom:8px;padding:6px 10px;background:#fff0f2;border-left:3px solid #c0392b;font-size:9.5pt;"><strong>Specific Issue:</strong> ${v.painIssue}</div>` : ''}
  <div class="check-grid">
    <div class="check-item">${chk(v.painChecks.baseline)} Baseline pain score documented before medication</div>
    <div class="check-item">${chk(v.painChecks.goal)} Pain goal established and documented with patient</div>
    <div class="check-item">${chk(v.painChecks.min60)} Reassessment completed within 60 min of intervention</div>
    <div class="check-item">${chk(v.painChecks.compared)} Reassessment score compared to baseline</div>
    <div class="check-item">${chk(v.painChecks.nonpharm)} Non-pharmacologic intervention attempted first</div>
    <div class="check-item">${chk(v.painChecks.discharge)} Pre-discharge pain reassessment completed</div>
    <div class="check-item">${chk(v.painChecks.emr)} Reassessment charted in EMR with timestamp</div>
    <div class="check-item">${chk(v.painChecks.provider)} Provider notified if pain uncontrolled</div>
  </div>
  <div style="margin-top:8px;">
    <label style="font-size:8pt;font-weight:bold;color:#555;text-transform:uppercase;">Staff Response / Explanation:</label>
    <div style="border:1px solid #aaa;border-radius:4px;min-height:40px;margin-top:4px;padding:6px;font-size:9.5pt;">&nbsp;</div>
  </div>` : ''}

  ${hasTxVariance ? `
  <h2>Blood Transfusion Requirements</h2>
  ${v.txIssue ? `<div style="margin-bottom:8px;padding:6px 10px;background:#fff5f5;border-left:3px solid #c0392b;font-size:9.5pt;"><strong>Specific Issue:</strong> ${v.txIssue}</div>` : ''}
  <div class="check-grid">
    <div class="check-item">${chk(v.txChecks.twoRN)} Two-RN verification completed before hang</div>
    <div class="check-item">${chk(v.txChecks.twoID)} Two patient identifiers confirmed (name + DOB)</div>
    <div class="check-item">${chk(v.txChecks.consent)} Pre-transfusion consent obtained and documented</div>
    <div class="check-item">${chk(v.txChecks.baseline)} Baseline vital signs obtained within 30 min of start</div>
    <div class="check-item">${chk(v.txChecks.q15)} Vitals q15 min × 2 during first 30 minutes</div>
    <div class="check-item">${chk(v.txChecks.q30)} Vitals q30 min for remainder of transfusion</div>
    <div class="check-item">${chk(v.txChecks.fourHr)} Product infused within 4-hour policy window</div>
    <div class="check-item">${chk(v.txChecks.rate)} Rate of infusion verified per provider order</div>
    <div class="check-item">${chk(v.txChecks.rxProto)} Transfusion reaction protocol followed if applicable</div>
    <div class="check-item">${chk(v.txChecks.postDoc)} Post-transfusion vitals and documentation complete</div>
    <div class="check-item">${chk(v.txChecks.label)} Blood product label matched to patient wristband</div>
    <div class="check-item">${chk(v.txChecks.notify)} Provider notified of transfusion completion</div>
  </div>
  <div style="margin-top:8px;">
    <label style="font-size:8pt;font-weight:bold;color:#555;text-transform:uppercase;">Reaction / Adverse Event? &nbsp; <span style="display:inline-block;width:13px;height:13px;border:1.5px solid #333;border-radius:2px;vertical-align:middle;"></span> Yes &nbsp; <span style="display:inline-block;width:13px;height:13px;border:1.5px solid #333;border-radius:2px;vertical-align:middle;"></span> No</label>
    <div style="border:1px solid #aaa;border-radius:4px;min-height:40px;margin-top:4px;padding:6px;font-size:9.5pt;">If yes, describe:</div>
  </div>` : ''}

  <h2>Plan for Correction</h2>
  <div class="correction-lines">${v.correction || ''}</div>
  ${v.notes ? `<div style="margin-top:8px;font-size:9pt;color:#444;"><strong>Additional Notes:</strong> ${ccEsc(v.notes)}</div>` : ''}

  <div style="margin-top:16px;display:flex;gap:30px;align-items:flex-end;">
    <div style="flex:1;">
      <div style="font-size:8pt;color:#555;font-weight:bold;text-transform:uppercase;margin-bottom:3px;">Return By</div>
      <div style="border-bottom:1.5px solid #333;min-height:22px;padding:2px 0;font-size:10pt;">${v.returnBy ? new Date(v.returnBy+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''}</div>
    </div>
    <div style="flex:1;">
      <div style="font-size:8pt;color:#555;font-weight:bold;text-transform:uppercase;margin-bottom:3px;">Supervisor / Manager</div>
      <div style="border-bottom:1.5px solid #333;min-height:22px;padding:2px 0;">${v.manager || ''}</div>
    </div>
  </div>

  <div style="margin-top:28px;">
    <div class="sig-row">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Signature of Employee</div>
      </div>
      <div class="sig-block" style="flex:0.4;">
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>
    <div class="sig-row" style="margin-top:20px;">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Signature of Unit Director / Supervisor</div>
      </div>
      <div class="sig-block" style="flex:0.4;">
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>
  </div>

  <div style="margin-top:24px;border-top:1px solid #ccc;padding-top:8px;font-size:7.5pt;color:#888;text-align:center;">
    3B Tele Med Surg · AOMC Nursing Operations · Printed ${new Date().toLocaleString()}
  </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}