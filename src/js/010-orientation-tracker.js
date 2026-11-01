

// ════════════════════════════════════
//  ORIENTATION TRACKER
// ════════════════════════════════════

const ORI_MILESTONES = [
  { key:'unit_tour',        label:'Unit Tour & Safety Orientation' },
  { key:'charting_emr',     label:'EMR / Charting System Validated' },
  { key:'med_admin',        label:'Medication Administration Observed' },
  { key:'tele_monitor',     label:'Telemetry Monitoring Demonstrated' },
  { key:'acls_bls_review',  label:'BLS/ACLS Skills Reviewed' },
  { key:'fall_prevention',  label:'Fall Prevention Bundle Reviewed' },
  { key:'hapi_prevention',  label:'HAPI Prevention Bundle Reviewed' },
  { key:'blood_admin',      label:'Blood Administration Policy Reviewed' },
  { key:'charge_shadow',    label:'Charge Nurse Shadow Shift Completed' },
  { key:'independent_shift',label:'First Independent Shift Completed' },
  { key:'off_orientation',  label:'Formally Released Off Orientation' },
];

const ORI_WEEK_GOALS = {
  'Agency RN': [
    'DAY 1 (Education): Hospital policies, safety protocols, EMR/Epic login & navigation, HIPAA, chain of command, code response, fire safety',
    'DAY 2 (Education): Telemetry monitoring, fall prevention bundle, HAPI prevention, medication administration policy, Pyxis access, documentation standards',
    'DAY 3 (Floor): Unit tour with charge nurse, meet team — Pyxis access confirmed, glucometer QC completed, shadow preceptor full shift — patient assignment, SBAR handoff, independent practice cleared',
  ],
  RN: [
    'Unit layout, safety protocols, EMR login, shift routine, preceptor introduction',
    'Medication administration, charting workflow, MAR review, 5 Rights',
    'Telemetry monitoring, rhythm recognition, alert management',
    'Patient assessment documentation, SBAR handoff, care planning',
    'IV therapy, blood administration policy, lab draws',
    'Fall prevention bundle, HAPI prevention, skin assessment',
    'Pain management, reassessment documentation, patient/family communication',
    'Time management with 4–5 patients, prioritization under preceptor guidance',
    'Charge nurse shadow — admit/discharge process, bed management',
    'Near-independent: full assignment with preceptor available for questions',
    'Full assignment independence — preceptor present but not hands-on',
    'Final validation, off-orientation meeting, transition to independent practice',
  ],
  LPN: [
    'Unit layout, safety protocols, EMR login, shift routine',
    'Medication administration, charting workflow, MAR review',
    'Telemetry monitoring, alert management, escalation protocol',
    'Patient assessment within LPN scope, documentation standards',
    'IV therapy within scope, blood administration support role',
    'Fall/HAPI prevention bundles, skin assessment documentation',
    'Pain management documentation, patient communication',
    'Time management, prioritization under preceptor guidance',
    'Near-independent assignment — preceptor available',
    'Full independent assignment — final validation',
  ],
  CA: [
    'Unit layout, equipment locations, call light response, team introductions',
    'ADLs, bed mobility, toileting assistance, fall prevention role',
    'Vital signs, glucose checks, documentation in EMR',
    'Isolation precautions, PPE donning/doffing, hand hygiene competency',
    'Hourly rounding documentation, patient communication standards',
    'Foley care, wound observation and reporting, skin integrity checks',
    'Telemetry observation (if applicable), alerting RN protocol',
    'Independent assignment — full patient load validation',
  ],
  UC: [
    'Phone etiquette, order transcription, unit communication tools',
    'Bed management board, admission/discharge/transfer workflow',
    'Physician/ancillary communication, STAT requests',
    'Supply management, scheduling support, independent shift',
  ],
};

let _oriActiveName = null;

function oriData(name) {
  if (!state.orientation) state.orientation = {};
  if (!state.orientation[name]) state.orientation[name] = {
    preceptor:'', buddy:'', buddyLater:false,
    startDate:'', targetDate:'', offDate:'', role:'RN', totalWeeks:12,
    weeks:{}, milestones:{}, notes:'',
    profile:{ food:'', movie:'', hobbies:'', proudOf:'', perfectDay:'' },
    meetingLogs:[]  // [{date, achievements, concerns, followUp}]
  };
  // Migrate older records
  if (!state.orientation[name].profile) state.orientation[name].profile = { food:'', movie:'', hobbies:'', proudOf:'', perfectDay:'' };
  if (!state.orientation[name].meetingLogs) state.orientation[name].meetingLogs = [];
  if (!state.orientation[name].checkins)    state.orientation[name].checkins    = { 30:{}, 60:{}, 90:{} };
  if (state.orientation[name].buddy === undefined) state.orientation[name].buddy = '';
  if (state.orientation[name].buddyLater === undefined) state.orientation[name].buddyLater = false;
  return state.orientation[name];
}

function initOrientation() {
  const dl = document.getElementById('ori-staff-dl');
  const pl = document.getElementById('ori-prec-dl');
  if (dl) dl.innerHTML = MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
  if (pl) pl.innerHTML = MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN').map(s=>`<option value="${s.name}">`).join('');
  const d = document.getElementById('ori-start');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
  renderOrientationList();
}

function openOrientationModal(name) {
  const m = document.getElementById('ori-modal');
  if (!m) return;
  m.style.display = 'flex';
  // Populate buddy datalist with all staff
  const bdl = document.getElementById('ori-buddy-dl');
  if (bdl) bdl.innerHTML = MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
  loadStaffDetails('ori-staff', name || '');
  document.getElementById('ori-edit-name').value = name || '';
  document.getElementById('ori-modal-title').textContent = name ? 'Edit Orientee' : 'Add Orientee';
  if (name) {
    const od = oriData(name);
    document.getElementById('ori-name').value        = name;
    document.getElementById('ori-preceptor').value   = od.preceptor  || '';
    document.getElementById('ori-buddy').value        = od.buddy      || '';
    document.getElementById('ori-buddy-later').checked = od.buddyLater || false;
    document.getElementById('ori-buddy').disabled    = od.buddyLater || false;
    document.getElementById('ori-buddy').style.opacity = od.buddyLater ? '0.4' : '1';
    document.getElementById('ori-start').value       = od.startDate  || '';
    document.getElementById('ori-target').value      = od.targetDate || '';
    document.getElementById('ori-role').value        = od.role       || 'RN';
    document.getElementById('ori-weeks').value       = od.totalWeeks || 12;
    const p = od.profile || {};
    document.getElementById('ori-fav-food').value    = p.food       || '';
    document.getElementById('ori-fav-movie').value   = p.movie      || '';
    document.getElementById('ori-fav-hobbies').value = p.hobbies    || '';
    document.getElementById('ori-proud-of').value    = p.proudOf    || '';
    document.getElementById('ori-perfect-day').value = p.perfectDay || '';
  } else {
    ['ori-name','ori-preceptor','ori-buddy','ori-target','ori-fav-food','ori-fav-movie','ori-fav-hobbies','ori-proud-of','ori-perfect-day'].forEach(id => {
      const e = document.getElementById(id); if(e) { e.value=''; e.disabled=false; e.style.opacity='1'; }
    });
    document.getElementById('ori-buddy-later').checked = false;
    document.getElementById('ori-start').value  = new Date().toISOString().split('T')[0];
    document.getElementById('ori-role').value   = 'RN';
    document.getElementById('ori-weeks').value  = 12;
  }
}

function closeOriModal() { const m=document.getElementById('ori-modal'); if(m) m.style.display='none'; }

function oriRoleChange(val) {
  if (val === 'Agency RN') {
    document.getElementById('ori-staff-agency').checked = true;
    toggleStaffAgencyFields('ori-staff');
  }
  const wkEl = document.getElementById('ori-weeks');
  if (!wkEl) return;
  if (val === 'Agency RN') { wkEl.value = 3; wkEl.min = 1; wkEl.max = 5; }
  else if (val === 'CA')   { wkEl.value = 6; wkEl.min = 4; wkEl.max = 26; }
  else                     { wkEl.value = 12; wkEl.min = 4; wkEl.max = 26; }
}
function clampOriWeeks() { /* called on weeks input change, no-op currently */ }

function saveOrientee() {
  const name = (document.getElementById('ori-name')?.value||'').trim();
  if (!name) { alert('Enter staff name.'); return; }
  const buddyLater = document.getElementById('ori-buddy-later')?.checked || false;
  const buddy      = buddyLater ? '' : (document.getElementById('ori-buddy')?.value||'').trim();
  if (!buddyLater && !buddy) {
    alert('Please select an Onboarding Buddy or check "Assign Later".');
    return;
  }
  if (document.getElementById('ori-role').value === 'Agency RN') document.getElementById('ori-staff-agency').checked = true;
  if (!saveStaffDetails('ori-staff', name)) return;
  const od = oriData(name);
  od.preceptor   = document.getElementById('ori-preceptor')?.value  || '';
  od.buddy       = buddy;
  od.buddyLater  = buddyLater;
  od.startDate   = document.getElementById('ori-start')?.value      || '';
  od.targetDate  = document.getElementById('ori-target')?.value     || '';
  const roleVal = document.getElementById('ori-role')?.value || 'RN';
  od.role        = roleVal;
  od.totalWeeks  = parseInt(document.getElementById('ori-weeks')?.value) || (roleVal === 'Agency RN' ? 3 : 12);
  od.profile = {
    food:       document.getElementById('ori-fav-food')?.value      || '',
    movie:      document.getElementById('ori-fav-movie')?.value     || '',
    hobbies:    document.getElementById('ori-fav-hobbies')?.value   || '',
    proudOf:    document.getElementById('ori-proud-of')?.value      || '',
    perfectDay: document.getElementById('ori-perfect-day')?.value   || '',
  };
  _oriActiveName = name;

  // ── Auto-add to Directory if not already there ──────────────
  const alreadyInDir = MASTER_STAFF.some(s => s.name.toLowerCase() === name.toLowerCase());
  if (!alreadyInDir) {
    const dirRole = roleVal === 'Agency RN' ? 'RN' : roleVal; // map Agency RN → RN for directory
    if (!state.customStaff) state.customStaff = [];
    state.customStaff.push({ name, job: dirRole });
    rebuildMasterStaff();
    buildStaffDatalist();
    showSaveBanner(`➕ ${name} added to Orientation + Directory`);
  }
  // ────────────────────────────────────────────────────────────

  persistSave();
  closeOriModal();
  renderDirectory();
  renderOrientationList();
  renderOrientationDetail(name);
}

function deleteOrientee(name) {
  if (!confirm(`Remove ${name} from orientation tracker?`)) return;
  delete state.orientation[name];
  if (_oriActiveName === name) {
    _oriActiveName = null;
    const d = document.getElementById('ori-detail');
    if (d) d.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text3);">Select an orientee</div>';
  }
  persistSave();
  renderOrientationList();
}

function renderOrientationList() {
  const el = document.getElementById('ori-list');
  if (!el) return;
  const filter = document.getElementById('ori-filter')?.value || 'ALL';
  const all = Object.keys(state.orientation || {});
  const list = all.filter(name => {
    const od = state.orientation[name];
    const done = !!od.offDate;
    if (filter === 'active') return !done;
    if (filter === 'completed') return done;
    return true;
  });
  if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:11px;">No orientees</div>'; return; }
  el.innerHTML = list.map(name => {
    const od = state.orientation[name];
    const isAct = name === _oriActiveName;
    const weeksCompleted = Object.keys(od.weeks || {}).length;
    const pct = od.totalWeeks ? Math.round(weeksCompleted / od.totalWeeks * 100) : 0;
    const rCol = IV_ROLE_COLOR[od.role] || 'var(--text2)';
    const initials = name.split(',').map(p=>p.trim()[0]||'').join('');
    const statusLabel = od.offDate ? '✓ Complete' : `Wk ${weeksCompleted}/${od.totalWeeks}`;
    const statusCol   = od.offDate ? 'var(--green2)' : 'var(--accent2)';
    return `<div onclick="renderOrientationDetail('${name.replace(/'/g,"\\'")}')"
      style="padding:10px;margin-bottom:4px;border-radius:6px;cursor:pointer;border:1px solid;transition:all 0.15s;
      ${isAct?'background:rgba(46,125,209,0.15);border-color:var(--accent2);':'background:rgba(255,255,255,0.03);border-color:transparent;'}">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:30px;height:30px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name.split(',')[0]}</div>
          <div style="font-size:11px;color:var(--text3);">${od.role} · ${od.preceptor ? od.preceptor.split(',')[0] : 'No preceptor'}</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${statusCol};">${statusLabel}</span>
      </div>
      <div style="margin-top:5px;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
        <div style="height:3px;background:${od.offDate?'var(--green2)':'var(--accent2)'};width:${pct}%;border-radius:2px;"></div>
      </div>
    </div>`;
  }).join('');
}

function saveOriWeek(name, week, field, val) {
  const od = oriData(name);
  if (!od.weeks[week]) od.weeks[week] = { passed:null, notes:'' };
  od.weeks[week][field] = val;
  persistSave();
}

function saveOriMilestone(name, key, val) {
  const od = oriData(name);
  od.milestones[key] = val ? new Date().toISOString().split('T')[0] : null;
  persistSave();
  renderOrientationDetail(name);
}

function saveOriNote(name, val) {
  oriData(name).notes = val;
  persistSave();
}

function saveOriField(name, field, val) {
  oriData(name)[field] = val;
  persistSave();
  renderOrientationList();
}

function renderOrientationDetail(name) {
  _oriActiveName = name;
  renderOrientationList();
  const dp = document.getElementById('ori-detail');
  if (!dp) return;
  const od = oriData(name);
  const rCol = IV_ROLE_COLOR[od.role] || 'var(--text2)';
  const weekGoals = (ORI_WEEK_GOALS[od.role] || ORI_WEEK_GOALS.RN);
  const weeksCompleted = Object.values(od.weeks||{}).filter(w=>w.passed===true).length;
  const pct = od.totalWeeks ? Math.round(weeksCompleted/od.totalWeeks*100) : 0;
  const startStr = od.startDate ? new Date(od.startDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const targetStr = od.targetDate ? new Date(od.targetDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  const safeN = name.replace(/'/g,"\\'");

  // Week rows
  const weekRows = Array.from({length: od.totalWeeks}, (_,i) => {
    const wk = i+1;
    const wd = (od.weeks||{})[wk] || {};
    const goal = weekGoals[i] || 'Review week objectives with preceptor.';
    const passed = wd.passed === true;
    const failed = wd.passed === false;
    const assessed = wd.passed !== null && wd.passed !== undefined;
    const statusCol = passed ? 'var(--green2)' : failed ? 'var(--red2)' : 'var(--text3)';
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:8px 10px;font-size:11px;font-weight:700;color:var(--accent2);white-space:nowrap;">Wk ${wk}</td>
      <td style="padding:8px 10px;font-size:11px;color:var(--text2);">${goal}</td>
      <td style="padding:8px 10px;white-space:nowrap;">
        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;margin-right:8px;font-size:11px;">
          <input type="radio" name="ori-wk-${name}-${wk}" value="pass" ${passed?'checked':''} onchange="saveOriWeek('${safeN}',${wk},'passed',true)" style="accent-color:var(--green2);">
          <span style="color:var(--green2);">✓</span></label>
        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;">
          <input type="radio" name="ori-wk-${name}-${wk}" value="remediate" ${failed?'checked':''} onchange="saveOriWeek('${safeN}',${wk},'passed',false)" style="accent-color:var(--red2);">
          <span style="color:var(--red2);">↺</span></label>
      </td>
      <td style="padding:8px 10px;"><input type="text" value="${wd.notes||''}" placeholder="Notes..."
        onblur="saveOriWeek('${safeN}',${wk},'notes',this.value)"
        style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:4px;padding:3px 6px;color:var(--white);font-size:11px;outline:none;"></td>
    </tr>`;
  }).join('');

  // Milestones
  const msHtml = ORI_MILESTONES.map(ms => {
    const done = !!((od.milestones||{})[ms.key]);
    const doneDate = (od.milestones||{})[ms.key];
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <input type="checkbox" ${done?'checked':''} onchange="saveOriMilestone('${safeN}','${ms.key}',this.checked)"
        style="width:16px;height:16px;cursor:pointer;accent-color:var(--green2);flex-shrink:0;">
      <span style="flex:1;font-size:11px;color:${done?'var(--green2)':'var(--text2)'};${done?'text-decoration:line-through;':''}">${ms.label}</span>
      ${done && doneDate ? `<span style="font-size:11px;color:var(--text3);">${new Date(doneDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
    </div>`;
  }).join('');

  dp.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border);">
      <div style="width:44px;height:44px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--navy);flex-shrink:0;">${name.split(',').map(p=>p.trim()[0]||'').join('')}</div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:700;color:var(--white);">${name}</div>
        <div style="font-size:11px;color:var(--text3);">🎓 ${od.role} Orientation · Preceptor: ${od.preceptor||'Not assigned'} · Start: ${startStr} · Target Off: ${targetStr}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="openOrientationModal('${safeN}')" style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
        <button onclick="deleteOrientee('${safeN}')" style="font-size:11px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${weeksCompleted}/${od.totalWeeks}</div>
        <div style="font-size:11px;color:var(--text3);">Weeks Passed</div>
        <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;margin-top:8px;"><div style="height:4px;background:var(--accent2);width:${pct}%;border-radius:2px;"></div></div>
      </div>
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${Object.values(od.milestones||{}).filter(Boolean).length}/${ORI_MILESTONES.length}</div>
        <div style="font-size:11px;color:var(--text3);">Milestones</div>
      </div>
      <div style="flex:2;min-width:180px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Off-Orientation Date</div>
        <input type="date" value="${od.offDate||''}" onchange="saveOriField('${safeN}','offDate',this.value)"
          style="background:transparent;border:none;color:var(--green2);font-size:16px;font-weight:700;outline:none;width:100%;">
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">Set when formally released</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:8px;">📋 Weekly Progress</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">✓ = Passed &nbsp;·&nbsp; ↺ = Needs Remediation</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:rgba(255,255,255,0.04);">
              <th style="padding:7px 10px;font-size:11px;color:var(--text3);text-align:left;">Wk</th>
              <th style="padding:7px 10px;font-size:11px;color:var(--text3);text-align:left;">Goal / Focus Area</th>
              <th style="padding:7px 10px;font-size:11px;color:var(--text3);">Status</th>
              <th style="padding:7px 10px;font-size:11px;color:var(--text3);text-align:left;">Notes</th>
            </tr></thead>
            <tbody>${weekRows}</tbody>
          </table>
        </div>
      </div>
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:8px;">🏁 Completion Milestones</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px 14px;">${msHtml}</div>
        <div style="margin-top:12px;">
          <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:6px;">📝 Preceptor Notes</div>
          <textarea onblur="saveOriNote('${safeN}',this.value)" rows="6"
            style="width:100%;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--white);font-size:11px;font-family:'IBM Plex Sans',sans-serif;resize:vertical;outline:none;box-sizing:border-box;"
            placeholder="Preceptor observations, areas of strength, areas for growth, remediation plans...">${od.notes||''}</textarea>
        </div>
      </div>
    </div>`;
}

// ════════════════════════════════════
//  COMPETENCY & SKILLS VALIDATION
// ════════════════════════════════════

const COMP_SKILLS = {
  RN: [
    { key:'bls',            label:'BLS/CPR',                   section:'Certifications' },
    { key:'acls',           label:'ACLS',                      section:'Certifications' },
    { key:'nihss',          label:'NIHSS Certification',       section:'Certifications' },
    { key:'iv_insertion',   label:'Peripheral IV Insertion',   section:'Clinical Skills' },
    { key:'blood_admin',    label:'Blood/Blood Product Admin',  section:'Clinical Skills' },
    { key:'tele_interpret', label:'Telemetry Interpretation',  section:'Clinical Skills' },
    { key:'12lead',         label:'12-Lead ECG Acquisition',   section:'Clinical Skills' },
    { key:'foley',          label:'Foley Catheter Insertion',  section:'Clinical Skills' },
    { key:'ng_tube',        label:'NG Tube Insertion/Care',    section:'Clinical Skills' },
    { key:'wound_care',     label:'Wound Care/Dressing Change',section:'Clinical Skills' },
    { key:'pain_reassess',  label:'Pain Reassessment Protocol',section:'Quality & Safety' },
    { key:'fall_bundle',    label:'Fall Prevention Bundle',    section:'Quality & Safety' },
    { key:'hapi_bundle',    label:'HAPI Prevention Bundle',    section:'Quality & Safety' },
    { key:'sepsis_screen',  label:'Sepsis Screening & SBAR',   section:'Quality & Safety' },
    { key:'med_scanning',   label:'Medication Scanning (5 Rights)', section:'Quality & Safety' },
    { key:'charge_mgmt',    label:'Charge Nurse Responsibilities', section:'Leadership' },
    { key:'preceptor',      label:'Preceptor Skills',          section:'Leadership' },
  ],
  CA: [
    { key:'bls',            label:'BLS/CPR',                   section:'Certifications' },
    { key:'vitals',         label:'Vital Signs & Documentation', section:'Clinical Skills' },
    { key:'glucose',        label:'Glucose Monitoring (POC)',  section:'Clinical Skills' },
    { key:'adl_assist',     label:'ADL Assistance & Mobility', section:'Clinical Skills' },
    { key:'foley_care',     label:'Foley Catheter Care',       section:'Clinical Skills' },
    { key:'skin_integrity', label:'Skin Integrity Observation & Reporting', section:'Clinical Skills' },
    { key:'tele_obs',       label:'Telemetry Observation & Alert Response', section:'Clinical Skills' },
    { key:'fall_bundle',    label:'Fall Prevention Bundle',    section:'Quality & Safety' },
    { key:'hapi_bundle',    label:'HAPI Prevention Bundle',    section:'Quality & Safety' },
    { key:'isolation_ppe',  label:'Isolation Precautions & PPE', section:'Quality & Safety' },
    { key:'rounding',       label:'Hourly Rounding Protocol',  section:'Quality & Safety' },
    { key:'restraint',      label:'Restraint Monitoring',      section:'Quality & Safety' },
  ],
};

let _compModalName = '', _compModalKey = '';

function initCompetency() {
  const yrSel = document.getElementById('comp-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    for (let y = cur-1; y <= cur+1; y++) {
      const o = document.createElement('option'); o.value=y; o.textContent=y;
      if (y===cur) o.selected=true; yrSel.appendChild(o);
    }
  }
  renderCompetency();
}

function openCompModal(name, key, label) {
  _compModalName = name; _compModalKey = key;
  const m = document.getElementById('comp-modal');
  if (m) m.style.display = 'flex';
  document.getElementById('comp-modal-title').textContent = 'Validate: ' + label;
  document.getElementById('comp-modal-sub').textContent   = name;
  document.getElementById('comp-m-name').value  = name;
  document.getElementById('comp-m-key').value   = key;
  document.getElementById('comp-m-date').value  = new Date().toISOString().split('T')[0];
  document.getElementById('comp-m-validator').value = '';
  document.getElementById('comp-m-notes').value = '';
  const existing = ((state.competency||{})[name]||{})[key];
  if (existing) {
    document.getElementById('comp-m-date').value      = existing.date      || '';
    document.getElementById('comp-m-validator').value = existing.validator || '';
    document.getElementById('comp-m-notes').value     = existing.notes     || '';
    const radios = document.querySelectorAll('input[name="comp-pass"]');
    radios.forEach(r => { r.checked = (r.value === (existing.passed ? 'pass' : 'fail')); });
  } else {
    document.querySelector('input[name="comp-pass"][value="pass"]').checked = true;
  }
}

function closeCompModal() { const m=document.getElementById('comp-modal'); if(m) m.style.display='none'; }

function saveCompetency() {
  const name      = document.getElementById('comp-m-name')?.value || _compModalName;
  const key       = document.getElementById('comp-m-key')?.value  || _compModalKey;
  const date      = document.getElementById('comp-m-date')?.value      || '';
  const validator = document.getElementById('comp-m-validator')?.value || '';
  const notes     = document.getElementById('comp-m-notes')?.value     || '';
  const passed    = document.querySelector('input[name="comp-pass"]:checked')?.value === 'pass';
  const yr        = parseInt(document.getElementById('comp-year')?.value) || new Date().getFullYear();

  if (!state.competency) state.competency = {};
  if (!state.competency[name]) state.competency[name] = {};
  state.competency[name][key] = { date, validator, passed, notes, yr };
  persistSave();
  closeCompModal();
  renderCompetency();
}

function renderCompetency() {
  const roleFilter   = document.getElementById('comp-role')?.value   || 'RN';
  const yr           = parseInt(document.getElementById('comp-year')?.value) || new Date().getFullYear();
  const statusFilter = document.getElementById('comp-filter')?.value || 'ALL';
  const skills       = COMP_SKILLS[roleFilter] || COMP_SKILLS.RN;
  const sections     = [...new Set(skills.map(s=>s.section))];

  const staffList = MASTER_STAFF.filter(s => roleFilter==='RN' ? (s.job==='RN'||s.job==='LPN') : s.job===roleFilter);

  // Summary
  const sumEl = document.getElementById('comp-summary');
  if (sumEl) {
    let totalCells=0, doneCells=0;
    staffList.forEach(s => {
      skills.forEach(sk => {
        const v = ((state.competency||{})[s.name]||{})[sk.key];
        totalCells++;
        if (v && v.passed && v.yr === yr) doneCells++;
      });
    });
    const compPct = totalCells ? Math.round(doneCells/totalCells*100) : 0;
    sumEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 18px;display:flex;align-items:center;gap:12px;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${compPct}%</div>
        <div><div style="font-size:11px;color:var(--text2);">Unit Completion ${yr}</div>
          <div style="font-size:11px;color:var(--text3);">${doneCells} / ${totalCells} validations done</div></div>
        <div style="flex:1;height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
          <div style="height:6px;background:${compPct>=80?'var(--green2)':compPct>=50?'var(--amber2)':'var(--red2)'};width:${compPct}%;border-radius:3px;"></div>
        </div>
      </div>`;
  }

  // Filter staff
  let displayStaff = staffList;
  if (statusFilter !== 'ALL') {
    displayStaff = staffList.filter(s => {
      const done = skills.every(sk => { const v=((state.competency||{})[s.name]||{})[sk.key]; return v&&v.passed&&v.yr===yr; });
      return statusFilter==='complete' ? done : !done;
    });
  }

  const tableEl = document.getElementById('comp-table');
  if (!tableEl) return;
  if (!displayStaff.length) { tableEl.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);">No staff match filter</div>'; return; }

  const headerCols = skills.map(sk => `<th style="padding:6px 8px;font-size:11px;font-weight:700;color:var(--text3);text-align:center;min-width:60px;white-space:nowrap;border-left:1px solid rgba(255,255,255,0.05);">${sk.label.replace(' ','<br>')}</th>`).join('');

  const rows = displayStaff.map(s => {
    const rCol = IV_ROLE_COLOR[s.job]||'var(--text2)';
    const cells = skills.map(sk => {
      const v = ((state.competency||{})[s.name]||{})[sk.key];
      const thisYr = v && v.yr === yr;
      const status = thisYr && v.passed ? '✓' : thisYr && !v.passed ? '↺' : '—';
      const col    = thisYr && v.passed ? 'var(--green2)' : thisYr ? 'var(--amber2)' : 'var(--text3)';
      const bg     = thisYr && v.passed ? 'rgba(37,168,104,0.1)' : thisYr ? 'rgba(245,158,11,0.1)' : '';
      const tip    = v ? `${v.passed?'Passed':'Needs Remediation'} · ${v.date} · ${v.validator||''}${v.notes?' · '+v.notes:''}` : 'Click to validate';
      return `<td style="padding:6px 8px;text-align:center;border-left:1px solid rgba(255,255,255,0.05);background:${bg};">
        <span onclick="openCompModal('${s.name.replace(/'/g,"\\'")}','${sk.key}','${sk.label}')"
          title="${tip}" style="font-size:12px;cursor:pointer;color:${col};font-weight:700;">${status}</span></td>`;
    }).join('');
    const staffDone = skills.filter(sk=>{ const v=((state.competency||{})[s.name]||{})[sk.key]; return v&&v.passed&&v.yr===yr; }).length;
    const staffPct  = Math.round(staffDone/skills.length*100);
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:8px 10px;white-space:nowrap;position:sticky;left:0;background:var(--card);z-index:1;">
        <div style="font-size:11px;font-weight:700;color:var(--white);">${s.name.split(',')[0]}</div>
        <div style="font-size:11px;color:${rCol};">${s.job} · ${staffDone}/${skills.length} · ${staffPct}%</div>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  tableEl.innerHTML = `<div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;">
    <table style="width:100%;border-collapse:collapse;min-width:600px;">
      <thead style="position:sticky;top:var(--sticky-top);z-index:10;background:var(--card);">
        <tr style="background:var(--navy2);">
          <th style="padding:8px 10px;font-size:11px;color:var(--text3);text-align:left;position:sticky;left:0;background:var(--navy2);z-index:3;min-width:130px;">Staff</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="margin-top:8px;font-size:11px;color:var(--text3);">✓ = Passed &nbsp;·&nbsp; ↺ = Needs Remediation &nbsp;·&nbsp; — = Not yet validated &nbsp;·&nbsp; Click any cell to validate</div>`;
}

// ════════════════════════════════════
//  RECOGNITION
// ════════════════════════════════════

const REC_TYPES = {
  DAISY:      { label:'DAISY',                icon:'🌼', color:'var(--amber2)',  bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.35)'  },
  EOM:        { label:'Employee of Month',    icon:'🥇', color:'var(--green2)',  bg:'rgba(37,168,104,0.12)', border:'rgba(37,168,104,0.35)'  },
  Compliment: { label:'Patient Compliment',   icon:'💬', color:'var(--accent2)', bg:'rgba(79,163,232,0.10)', border:'rgba(79,163,232,0.3)'   },
  Director:   { label:'Director Recognition', icon:'⭐', color:'var(--purple2)', bg:'rgba(139,92,246,0.10)', border:'rgba(139,92,246,0.3)'   },
  Peer:       { label:'Peer Shout-Out',       icon:'🤝', color:'var(--teal2)',   bg:'rgba(6,182,212,0.08)',  border:'rgba(6,182,212,0.25)'   },
  Other:      { label:'Other',                icon:'📌', color:'var(--text2)',   bg:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.12)'  },
};

function initRecognition() {
  const dl = document.getElementById('rec-staff-dl');
  if (dl) dl.innerHTML = MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
  const yrSel = document.getElementById('rec-filter-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    for (let y=cur-1; y<=cur+1; y++) {
      const o=document.createElement('option'); o.value=y; o.textContent=y;
      if (y===cur) o.selected=true; yrSel.appendChild(o);
    }
  }
  const d = document.getElementById('rec-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
  renderRecognition();
}

function openRecModal(id) {
  const m = document.getElementById('rec-modal');
  if (!m) return;
  m.style.display = 'flex';
  document.getElementById('rec-edit-id').value = id || '';
  if (id) {
    const rec = (state.recognition||[]).find(r=>r.id===id);
    if (rec) {
      document.getElementById('rec-name').value = rec.name  ||'';
      document.getElementById('rec-type').value = rec.type  ||'DAISY';
      document.getElementById('rec-date').value = rec.date  ||'';
      document.getElementById('rec-by').value   = rec.submittedBy||'';
      document.getElementById('rec-desc').value = rec.description||'';
    }
  } else {
    document.getElementById('rec-name').value = '';
    document.getElementById('rec-type').value = 'DAISY';
    document.getElementById('rec-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('rec-by').value   = '';
    document.getElementById('rec-desc').value = '';
  }
  setTimeout(()=>{ const e=document.getElementById('rec-name'); if(e) e.focus(); },50);
}

function closeRecModal() { const m=document.getElementById('rec-modal'); if(m) m.style.display='none'; }

function saveRecognition() {
  const name = (document.getElementById('rec-name')?.value||'').trim();
  if (!name) { alert('Enter staff name.'); return; }
  const type  = document.getElementById('rec-type')?.value || 'DAISY';
  const date  = document.getElementById('rec-date')?.value || '';
  const by    = document.getElementById('rec-by')?.value   || '';
  const desc  = document.getElementById('rec-desc')?.value || '';
  const editId= document.getElementById('rec-edit-id')?.value || '';
  if (!state.recognition) state.recognition = [];
  if (editId) {
    const r = state.recognition.find(r=>r.id===editId);
    if (r) Object.assign(r, {name,type,date,submittedBy:by,description:desc});
  } else {
    state.recognition.unshift({ id:'rec_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), name, type, date, submittedBy:by, description:desc, ts:Date.now() });
  }
  persistSave();
  closeRecModal();
  renderRecognition();
}

function deleteRecognition(id) {
  if (!confirm('Delete this recognition entry?')) return;
  state.recognition = (state.recognition||[]).filter(r=>r.id!==id);
  persistSave();
  renderRecognition();
}

function renderRecognition() {
  const typeFilter = document.getElementById('rec-filter-type')?.value || 'ALL';
  const yr         = parseInt(document.getElementById('rec-filter-year')?.value) || new Date().getFullYear();

  let list = (state.recognition||[]).filter(r => new Date((r.date||'2000-01-01')+'T12:00:00').getFullYear() === yr);
  if (typeFilter !== 'ALL') list = list.filter(r => r.type === typeFilter);

  // Leaderboard
  const lbEl = document.getElementById('rec-leaderboard');
  if (lbEl) {
    const counts = {};
    (state.recognition||[]).filter(r => new Date((r.date||'2000-01-01')+'T12:00:00').getFullYear() === yr)
      .forEach(r => { counts[r.name] = (counts[r.name]||0) + 1; });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    lbEl.innerHTML = top.length ? top.map(([name, count], i) => {
      const medal = ['🥇','🥈','🥉','4️⃣','5️⃣'][i];
      const rCol = IV_ROLE_COLOR[MASTER_STAFF.find(s=>s.name===name)?.job]||'var(--text2)';
      return `<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:8px 14px;">
        <span style="font-size:18px;">${medal}</span>
        <div><div style="font-size:12px;font-weight:700;color:var(--white);">${name.split(',')[0]}</div>
          <div style="font-size:11px;color:var(--text3);">${count} recognition${count>1?'s':''}</div></div>
      </div>`;
    }).join('') : '<div style="font-size:11px;color:var(--text3);">No recognitions logged for '+yr+' yet</div>';
  }

  const listEl = document.getElementById('rec-list');
  if (!listEl) return;
  if (!list.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:50px;color:var(--text3);">
      <div style="font-size:32px;margin-bottom:10px;">🏆</div>
      <div style="font-size:13px;color:var(--white);margin-bottom:4px;">No recognitions logged yet</div>
      <div style="font-size:11px;margin-bottom:16px;">Start recognizing your team's outstanding work.</div>
      <button onclick="openRecModal()" class="btn btn-primary" style="font-size:12px;">+ Log First Recognition</button>
    </div>`; return;
  }

  listEl.innerHTML = list.map(r => {
    const t = REC_TYPES[r.type] || REC_TYPES.Other;
    const rCol = IV_ROLE_COLOR[MASTER_STAFF.find(s=>s.name===r.name)?.job]||'var(--text2)';
    const initials = r.name.split(',').map(p=>p.trim()[0]||'').join('');
    const dateStr  = r.date ? new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '—';
    return `<div style="display:flex;gap:12px;background:rgba(255,255,255,0.03);border:1px solid ${t.border};border-left:3px solid ${t.color};border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="width:38px;height:38px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:700;color:var(--white);">${r.name.split(',')[0]}, ${r.name.split(',')[1]||''}</span>
          <span style="background:${t.bg};border:1px solid ${t.border};border-radius:8px;padding:1px 8px;font-size:11px;color:${t.color};">${t.icon} ${t.label}</span>
          <span style="font-size:11px;color:var(--text3);">${dateStr}</span>
          ${r.submittedBy ? `<span style="font-size:11px;color:var(--text3);">from ${r.submittedBy}</span>` : ''}
        </div>
        ${r.description ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:4px;">${r.description}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button onclick="emailRecognition('${r.id}')" style="background:none;border:1px solid var(--border);border-radius:4px;padding:2px 7px;color:var(--accent2);cursor:pointer;font-size:11px;" title="Share / Print / Email">📤 Share</button>
        <button onclick="openRecModal('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" title="Edit" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button>
        <button onclick="deleteRecognition('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" title="Delete" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════
//  CUSTOM COMPETENCY SKILLS
// ════════════════════════════════════

function allCompSkills(role) {
  const hidden = (state.hiddenCompSkills || {})[role] || [];
  const base   = (COMP_SKILLS[role] || []).filter(s => !hidden.includes(s.key));
  const custom = ((state.customCompSkills || {})[role] || []);
  return [...base, ...custom];
}

function openCustomCompModal(role, editKey) {
  if (!state.customCompSkills) state.customCompSkills = { RN:[], CA:[] };
  const m = document.getElementById('custom-comp-modal');
  if (!m) return;
  m.style.display = 'flex';
  document.getElementById('csk-role').value    = role || 'RN';
  document.getElementById('csk-edit-key').value= editKey || '';
  if (editKey) {
    const sk = ((state.customCompSkills[role]||[])).find(s=>s.key===editKey);
    document.getElementById('csk-label').value   = sk ? sk.label   : '';
    document.getElementById('csk-section').value = sk ? sk.section : '';
  } else {
    document.getElementById('csk-label').value   = '';
    document.getElementById('csk-section').value = 'Clinical Skills';
  }
  setTimeout(()=>{ const e=document.getElementById('csk-label'); if(e) e.focus(); }, 50);
}

function closeCustomCompModal() {
  const m = document.getElementById('custom-comp-modal');
  if (m) m.style.display = 'none';
}

function saveCustomCompSkill() {
  const role    = document.getElementById('csk-role')?.value     || 'RN';
  const editKey = document.getElementById('csk-edit-key')?.value || '';
  const label   = (document.getElementById('csk-label')?.value   || '').trim();
  const section = (document.getElementById('csk-section')?.value || 'Clinical Skills').trim();
  if (!label) { alert('Enter a skill name.'); return; }
  if (!state.customCompSkills) state.customCompSkills = { RN:[], CA:[] };
  if (!state.customCompSkills[role]) state.customCompSkills[role] = [];
  if (editKey) {
    const sk = state.customCompSkills[role].find(s=>s.key===editKey);
    if (sk) { sk.label=label; sk.section=section; }
  } else {
    const key = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]/g,'_') + '_' + Date.now();
    state.customCompSkills[role].push({ key, label, section, custom:true });
  }
  persistSave();
  closeCustomCompModal();
  renderCompetency();
}

function deleteCustomCompSkill(role, key) {
  if (!confirm('Remove this competency from the list?')) return;
  if (!state.customCompSkills?.[role]) return;
  state.customCompSkills[role] = state.customCompSkills[role].filter(s=>s.key!==key);
  persistSave();
  renderCompetency();
}

// Remove any skill — built-in skills get added to a "hidden" list, custom ones get deleted
function removeCompSkill(role, key) {
  if (!confirm('Remove "' + key + '" from the competency list for ' + role + '?')) return;
  // Check if custom
  if ((state.customCompSkills?.[role] || []).find(s => s.key === key)) {
    state.customCompSkills[role] = state.customCompSkills[role].filter(s => s.key !== key);
  } else {
    // Hide built-in skill
    if (!state.hiddenCompSkills) state.hiddenCompSkills = {};
    if (!state.hiddenCompSkills[role]) state.hiddenCompSkills[role] = [];
    if (!state.hiddenCompSkills[role].includes(key)) state.hiddenCompSkills[role].push(key);
  }
  persistSave();
  renderCompetency();
}

function restoreHiddenCompSkills() {
  const role = document.getElementById('comp-role')?.value || 'RN';
  const hiddenCount = ((state.hiddenCompSkills || {})[role] || []).length;
  if (!hiddenCount) { showSaveBanner('No hidden skills to restore for ' + role); return; }
  if (!confirm('Restore ' + hiddenCount + ' hidden skill(s) for ' + role + '?')) return;
  if (state.hiddenCompSkills) delete state.hiddenCompSkills[role];
  persistSave();
  renderCompetency();
}

// Override renderCompetency to use allCompSkills and show delete buttons for custom skills
const _origRenderCompetency = renderCompetency;
function renderCompetency() {
  const roleFilter   = document.getElementById('comp-role')?.value   || 'RN';
  const yr           = parseInt(document.getElementById('comp-year')?.value) || new Date().getFullYear();
  const statusFilter = document.getElementById('comp-filter')?.value || 'ALL';
  const skills       = allCompSkills(roleFilter);

  const staffList = MASTER_STAFF.filter(s => roleFilter==='RN' ? (s.job==='RN'||s.job==='LPN') : s.job===roleFilter);

  const sumEl = document.getElementById('comp-summary');
  if (sumEl) {
    let totalCells=0, doneCells=0;
    staffList.forEach(s => skills.forEach(sk => {
      const v = ((state.competency||{})[s.name]||{})[sk.key];
      totalCells++;
      if (v && v.passed && v.yr === yr) doneCells++;
    }));
    const compPct = totalCells ? Math.round(doneCells/totalCells*100) : 0;
    const customCount = ((state.customCompSkills||{})[roleFilter]||[]).length;
    sumEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${compPct}%</div>
        <div><div style="font-size:11px;color:var(--text2);">Unit Completion ${yr}</div>
          <div style="font-size:11px;color:var(--text3);">${doneCells} / ${totalCells} validations · ${skills.length} skills (${customCount} custom)</div></div>
        <div style="flex:1;min-width:100px;height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
          <div style="height:6px;background:${compPct>=80?'var(--green2)':compPct>=50?'var(--amber2)':'var(--red2)'};width:${compPct}%;border-radius:3px;"></div>
        </div>
      </div>
      ${customCount > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span style="font-size:11px;color:var(--text3);font-weight:600;">Custom skills:</span>
        ${((state.customCompSkills||{})[roleFilter]||[]).map(sk=>
          `<span style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:10px;padding:2px 8px;font-size:11px;color:var(--purple2);display:inline-flex;align-items:center;gap:4px;">
            ${sk.label}
            <span onclick="deleteCustomCompSkill('${roleFilter}','${sk.key}')" style="cursor:pointer;color:var(--text3);font-size:11px;" title="Remove" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</span>
          </span>`
        ).join('')}
      </div>` : ''}`;
  }

  let displayStaff = staffList;
  if (statusFilter !== 'ALL') {
    displayStaff = staffList.filter(s => {
      const done = skills.every(sk => { const v=((state.competency||{})[s.name]||{})[sk.key]; return v&&v.passed&&v.yr===yr; });
      return statusFilter==='complete' ? done : !done;
    });
  }

  const tableEl = document.getElementById('comp-table');
  if (!tableEl) return;
  if (!displayStaff.length) { tableEl.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);">No staff match filter</div>'; return; }

  const headerCols = skills.map(sk => {
    const isCustom = sk.custom;
    return `<th style="padding:6px 8px;font-size:11px;font-weight:700;color:${isCustom?'var(--purple2)':'var(--text3)'};text-align:center;min-width:60px;white-space:normal;border-left:1px solid rgba(255,255,255,0.05);max-width:80px;">
      ${sk.label.replace(/\s+/g,' ').split(' ').join('<br>')}
      <br><span onclick="removeCompSkill('${roleFilter}','${sk.key}')" style="font-size:11px;cursor:pointer;color:rgba(255,255,255,0.2);" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='rgba(255,255,255,0.2)'" title="Remove skill">✕</span>
    </th>`;
  }).join('');

  const rows = displayStaff.map(s => {
    const rCol = IV_ROLE_COLOR[s.job]||'var(--text2)';
    const cells = skills.map(sk => {
      const v = ((state.competency||{})[s.name]||{})[sk.key];
      const thisYr = v && v.yr === yr;
      const status = thisYr && v.passed ? '✓' : thisYr && !v.passed ? '↺' : '—';
      const col    = thisYr && v.passed ? 'var(--green2)' : thisYr ? 'var(--amber2)' : 'var(--text3)';
      const bg     = thisYr && v.passed ? 'rgba(37,168,104,0.1)' : thisYr ? 'rgba(245,158,11,0.08)' : '';
      const tip    = v ? `${v.passed?'Passed':'Needs Remediation'} · ${v.date||''} · ${v.validator||''}` : 'Click to validate';
      return `<td style="padding:6px 8px;text-align:center;border-left:1px solid rgba(255,255,255,0.05);background:${bg};">
        <span onclick="openCompModal('${s.name.replace(/'/g,"\\'")}','${sk.key}','${sk.label}')"
          title="${tip}" style="font-size:13px;cursor:pointer;color:${col};font-weight:700;">${status}</span></td>`;
    }).join('');
    const staffDone = skills.filter(sk=>{const v=((state.competency||{})[s.name]||{})[sk.key];return v&&v.passed&&v.yr===yr;}).length;
    const staffPct  = skills.length ? Math.round(staffDone/skills.length*100) : 0;
    const incomplete = skills.length - staffDone;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:8px 10px;white-space:nowrap;position:sticky;left:0;background:var(--card);z-index:1;">
        <div style="font-size:11px;font-weight:700;color:var(--white);">${s.name.split(',')[0]}</div>
        <div style="font-size:11px;color:${rCol};">${s.job} · ${staffDone}/${skills.length}${incomplete>0?` · <span style="color:var(--amber2);">${incomplete} pending</span>`:' <span style="color:var(--green2);">✓ complete</span>'}</div>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  tableEl.innerHTML = `<div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;">
    <table style="width:100%;border-collapse:collapse;min-width:600px;">
      <thead style="position:sticky;top:var(--sticky-top);z-index:10;background:var(--card);">
        <tr style="background:var(--navy2);">
          <th style="padding:8px 10px;font-size:11px;color:var(--text3);text-align:left;position:sticky;left:0;background:var(--navy2);z-index:3;min-width:130px;">Staff</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="margin-top:8px;font-size:11px;color:var(--text3);">✓ Passed &nbsp;·&nbsp; ↺ Needs Remediation &nbsp;·&nbsp; — Not yet validated &nbsp;·&nbsp; Click any cell to validate · Purple = custom skill</div>`;
}

// ════════════════════════════════════
//  BOARD: PENDING COMPETENCY WIDGET
// ════════════════════════════════════

function toggleCompCollapse(checked) {
  localStorage.setItem('_compCollapsed', checked ? '1' : '0');
  const list = document.getElementById('board-comp-list');
  if (list) list.style.display = checked ? 'none' : '';
  const card = document.getElementById('board-comp-alerts');
  if (card) card.style.opacity = checked ? '0.5' : '1';
  // Update checkbox state in case called programmatically
  const cb = document.getElementById('comp-collapse-cb');
  if (cb) cb.checked = checked;
}

// ── "No competencies currently due" toggle ──────────────────────
// Hides competency alerts on the Board, collapses from print, shows green banner
function setCompNoneDue(checked) {
  localStorage.setItem('_compNoneDue', checked ? '1' : '0');
  applyCompNoneDue(checked);
  // Also collapse the board widget if marking none due
  toggleCompCollapse(checked);
  showSaveBanner(checked
    ? '✅ Competencies marked as none due — Board alert hidden'
    : 'Competency alerts restored'
  );
}

function isCompNoneDue() {
  return localStorage.getItem('_compNoneDue') === '1';
}

function applyCompNoneDue(checked) {
  // Update checkbox
  const cb = document.getElementById('comp-none-due-cb');
  if (cb) cb.checked = checked;
  // Show/hide green banner in competency tab
  const banner = document.getElementById('comp-none-due-banner');
  if (banner) banner.style.display = checked ? 'flex' : 'none';
  // Dim the comp table when none-due is active
  const table = document.getElementById('comp-table');
  if (table) table.style.opacity = checked ? '0.4' : '1';
  // Also keep board widget in sync
  const card = document.getElementById('board-comp-alerts');
  if (card) {
    card.style.display = checked ? 'none' : '';
  }
  // Show override message on board if none-due
  const boardList = document.getElementById('board-comp-list');
  if (boardList && checked) {
    boardList.innerHTML = '<div style="color:var(--green2);font-size:11px;padding:6px 0;">✅ No competencies currently due</div>';
    boardList.style.display = '';
  }
}

function isCompCollapsed() {
  return localStorage.getItem('_compCollapsed') === '1';
}

function renderBoardCompAlerts() {
  const el = document.getElementById('board-comp-list');
  if (!el) return;
  const yr = new Date().getFullYear();
  const dateKey = state.activeBoardDate;
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};
  const scheduledNames = new Set(Object.values(shifts).flat().map(p => p.name));

  // Only show when a date is loaded and staff are scheduled
  if (scheduledNames.size === 0) {
    el.innerHTML = '<span style="color:var(--text3);font-size:11px;">Load a staffing date to see pending competencies for scheduled staff.</span>';
    return;
  }

  const staffToCheck = MASTER_STAFF.filter(s => scheduledNames.has(s.name));
  const alerts = [];
  staffToCheck.forEach(s => {
    const role = (s.job === 'RN' || s.job === 'LPN') ? 'RN' : s.job === 'CA' ? 'CA' : null;
    if (!role) return;
    const skills = allCompSkills(role);
    const pending = skills.filter(sk => {
      const v = ((state.competency||{})[s.name]||{})[sk.key];
      return !(v && v.passed && v.yr === yr);
    });
    if (pending.length > 0) {
      alerts.push({ name: s.name, job: s.job, pending });
    }
  });

  if (!alerts.length) {
    el.innerHTML = '<span style="color:var(--green2);font-size:11px;">✓ All scheduled staff competencies validated for ' + yr + '</span>';
    return;
  }

  alerts.sort((a,b) => b.pending.length - a.pending.length);
  el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
    alerts.map(a => {
      const jobCol = a.job==='RN'?'var(--accent2)':a.job==='LPN'?'var(--purple2)':'var(--teal2)';
      const criticalCount = a.pending.filter(sk=>sk.section==='Certifications').length;
      const borderCol = criticalCount > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(139,92,246,0.35)';
      const topColor  = criticalCount > 0 ? 'var(--red2)' : 'var(--purple2)';
      return `<div style="background:rgba(255,255,255,0.04);border:1px solid ${borderCol};border-left:3px solid ${topColor};border-radius:6px;padding:8px 10px;min-width:160px;cursor:pointer;" onclick="switchTab(document.querySelector('[data-panel=competency]'))">
        <div style="font-size:11px;font-weight:700;color:var(--white);">${a.name.split(',')[0]}</div>
        <div style="font-size:11px;color:${jobCol};margin-bottom:4px;">${a.job}</div>
        <div style="font-size:11px;color:${topColor};font-weight:600;">${a.pending.length} pending</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${a.pending.slice(0,3).map(s=>s.label).join(', ')}${a.pending.length>3?'…':''}</div>
      </div>`;
    }).join('') + '</div>';
  // Restore collapse state after re-render
  if (isCompCollapsed()) toggleCompCollapse(true);
  if (isCompNoneDue()) applyCompNoneDue(true);
}

// ════════════════════════════════════
//  POLICY ACKNOWLEDGMENT
// ════════════════════════════════════

const POL_CAT_CFG = {
  Policy:        { icon:'📋', color:'var(--accent2)',  bg:'rgba(79,163,232,0.1)'   },
  Procedure:     { icon:'📝', color:'var(--teal2)',    bg:'rgba(6,182,212,0.08)'   },
  Safety:        { icon:'⚠️', color:'var(--red2)',     bg:'rgba(239,68,68,0.1)'    },
  Regulatory:    { icon:'🏛', color:'var(--amber2)',   bg:'rgba(245,158,11,0.1)'   },
  Communication: { icon:'📣', color:'var(--purple2)',  bg:'rgba(139,92,246,0.1)'   },
  Education:     { icon:'🎓', color:'var(--green2)',   bg:'rgba(37,168,104,0.1)'   },
};

let _polActiveId = null;

function polById(id) { return (state.policies||[]).find(p=>p.id===id); }

function initPolicies() {
  const d = document.getElementById('pol-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
  renderPolicyList();
}

function openPolicyModal(id) {
  const m = document.getElementById('pol-modal');
  if (!m) return;
  m.style.display = 'flex';
  document.getElementById('pol-edit-id').value = id || '';
  document.getElementById('pol-modal-title').textContent = id ? 'Edit Policy' : 'Add Policy / Communication';
  if (id) {
    const p = polById(id);
    if (p) {
      document.getElementById('pol-title').value    = p.title       || '';
      document.getElementById('pol-category').value = p.category    || 'Policy';
      document.getElementById('pol-date').value     = p.effectiveDate || '';
      document.getElementById('pol-roles').value    = p.roles       || 'ALL';
      document.getElementById('pol-desc').value     = p.description || '';
    }
  } else {
    document.getElementById('pol-title').value    = '';
    document.getElementById('pol-category').value = 'Policy';
    document.getElementById('pol-date').value     = new Date().toISOString().split('T')[0];
    document.getElementById('pol-roles').value    = 'ALL';
    document.getElementById('pol-desc').value     = '';
  }
  setTimeout(()=>{ const e=document.getElementById('pol-title'); if(e) e.focus(); }, 50);
}

function closePolicyModal() { const m=document.getElementById('pol-modal'); if(m) m.style.display='none'; }

function savePolicyItem() {
  const title    = (document.getElementById('pol-title')?.value    || '').trim();
  if (!title) { alert('Enter a policy title.'); return; }
  const category = document.getElementById('pol-category')?.value  || 'Policy';
  const date     = document.getElementById('pol-date')?.value      || '';
  const roles    = document.getElementById('pol-roles')?.value     || 'ALL';
  const desc     = document.getElementById('pol-desc')?.value      || '';
  const editId   = document.getElementById('pol-edit-id')?.value   || '';
  if (!state.policies) state.policies = [];
  if (editId) {
    const p = polById(editId);
    if (p) Object.assign(p, { title, category, effectiveDate:date, roles, description:desc });
  } else {
    state.policies.unshift({
      id: 'pol_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
      title, category, effectiveDate:date, roles, description:desc,
      acks: {}, created: Date.now()
    });
    _polActiveId = state.policies[0].id;
  }
  persistSave();
  closePolicyModal();
  renderPolicyList();
  if (_polActiveId) renderPolicyDetail(_polActiveId);
}

function deletePolicy(id) {
  if (!confirm('Delete this policy record?')) return;
  state.policies = (state.policies||[]).filter(p=>p.id!==id);
  if (_polActiveId === id) {
    _polActiveId = null;
    const dp = document.getElementById('pol-detail');
    if (dp) dp.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text3);">Select a policy</div>';
  }
  persistSave();
  renderPolicyList();
}

function toggleAck(policyId, staffName, checked) {
  const p = polById(policyId);
  if (!p) return;
  if (!p.acks) p.acks = {};
  const shouldAck = checked !== undefined ? checked : !p.acks[staffName];
  if (shouldAck) p.acks[staffName] = new Date().toISOString().split('T')[0];
  else delete p.acks[staffName];
  persistSave();
  renderPolicyDetail(policyId);
  renderPolicyList();
}

function ackAll(policyId) {
  const p = polById(policyId);
  if (!p) return;
  if (!p.acks) p.acks = {};
  const today = new Date().toISOString().split('T')[0];
  getPolicyStaff(p).forEach(s => { if (!p.acks[s.name]) p.acks[s.name] = today; });
  persistSave();
  renderPolicyDetail(policyId);
  renderPolicyList();
}

function getPolicyStaff(p) {
  if (!p.roles || p.roles === 'ALL') return MASTER_STAFF;
  if (p.roles === 'RN') return MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN');
  return MASTER_STAFF.filter(s=>s.job===p.roles);
}

function renderPolicyList() {
  const el = document.getElementById('pol-list');
  if (!el) return;
  const filter = document.getElementById('pol-filter')?.value || 'ALL';
  let list = (state.policies||[]).slice();
  if (filter !== 'ALL') {
    list = list.filter(p => {
      const staff = getPolicyStaff(p);
      const ackCount = Object.keys(p.acks||{}).length;
      const complete = ackCount >= staff.length;
      return filter === 'complete' ? complete : !complete;
    });
  }
  if (!list.length) { el.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3);font-size:11px;">No policies match filter</div>'; return; }
  el.innerHTML = list.map(p => {
    const cfg = POL_CAT_CFG[p.category] || POL_CAT_CFG.Policy;
    const staff = getPolicyStaff(p);
    const ackCount = Object.keys(p.acks||{}).length;
    const pct = staff.length ? Math.round(ackCount/staff.length*100) : 0;
    const isAct = p.id === _polActiveId;
    const dateStr = p.effectiveDate ? new Date(p.effectiveDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
    return `<div onclick="renderPolicyDetail('${p.id}')"
      style="padding:10px;margin-bottom:4px;border-radius:6px;cursor:pointer;border:1px solid;transition:all 0.15s;
      ${isAct?'background:rgba(46,125,209,0.15);border-color:var(--accent2);':'background:rgba(255,255,255,0.03);border-color:transparent;'}">
      <div style="display:flex;align-items:flex-start;gap:8px;">
        <span style="font-size:16px;flex-shrink:0;">${cfg.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;color:var(--white);word-break:break-word;">${p.title}</div>
          <div style="font-size:11px;color:${cfg.color};margin-top:1px;">${p.category}${dateStr?' · '+dateStr:''}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:5px;">
            <div style="flex:1;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
              <div style="height:3px;background:${pct===100?'var(--green2)':pct>0?'var(--amber2)':'var(--text3)'};width:${pct}%;border-radius:2px;"></div>
            </div>
            <span style="font-size:11px;color:${pct===100?'var(--green2)':'var(--text3)'};">${ackCount}/${staff.length}</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderPolicyDetail(id) {
  _polActiveId = id;
  renderPolicyList();
  const dp = document.getElementById('pol-detail');
  if (!dp) return;
  const p = polById(id);
  if (!p) return;
  const cfg = POL_CAT_CFG[p.category] || POL_CAT_CFG.Policy;
  const staff = getPolicyStaff(p);
  const ackd = p.acks || {};
  const ackCount = Object.keys(ackd).length;
  const pct = staff.length ? Math.round(ackCount/staff.length*100) : 0;
  const dateStr = p.effectiveDate ? new Date(p.effectiveDate+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '—';

  // Group staff: not acked first, then acked
  const pending = staff.filter(s => !ackd[s.name]);
  const done    = staff.filter(s => !!ackd[s.name]);

  const staffRows = (arr, isDone) => arr.map(s => {
    const jobCol  = IV_ROLE_COLOR[s.job]||'var(--text2)';
    const ackDate = ackd[s.name] ? new Date(ackd[s.name]+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
    const phone   = (state.phones?.[s.name]||'').replace(/\D/g,'');
    const smsMsg  = `Hi ${s.name.split(',')[1]?.trim()||s.name.split(',')[0]} — please sign off on "${p.title}" in the 3B Staff Command Center. Go to Education → Read & Sign → enter your name → find the policy → Sign. Thank you, 3B Management`;
    const smsLink = phone.length>=10 ? `sms:${phone}?body=${encodeURIComponent(smsMsg)}` : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <input type="checkbox" ${isDone?"checked":""} onchange="toggleAck('${id}','${s.name.replace(/'/g,"\\'")}',this.checked)" data-name="${s.name}"
      <div style="flex:1;">
        <span style="font-size:11px;font-weight:600;color:${isDone?'var(--text2)':'var(--white)'}">${s.name}</span>
        <span style="font-size:11px;color:${jobCol};margin-left:6px;">${s.job}</span>
      </div>
      ${isDone
        ? `<span style="font-size:11px;color:var(--green2);">✓ ${ackDate}</span>`
        : `<div style="display:flex;gap:4px;align-items:center;">
            <span style="font-size:11px;color:var(--amber2);">Pending</span>
            ${smsLink ? `<a href="${smsLink}" style="font-size:11px;padding:2px 7px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.35);border-radius:4px;color:var(--purple2);text-decoration:none;font-weight:700;">💬</a>` : ''}
           </div>`}
    </div>`;
  }).join('');

  dp.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border);">
      <span style="font-size:28px;flex-shrink:0;">${cfg.icon}</span>
      <div style="flex:1;">
        <div style="font-size:17px;font-weight:700;color:var(--white);margin-bottom:4px;">${p.title}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--text3);">
          <span style="color:${cfg.color};font-weight:600;">${p.category}</span>
          <span>Effective: ${dateStr}</span>
          <span>Required: ${p.roles==='ALL'?'All Staff':p.roles==='RN'?'RN / LPN':'CA'}</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button onclick="openPolicyModal('${id}')" style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
        <button onclick="deletePolicy('${id}')" style="font-size:11px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
      </div>
    </div>

    ${p.description ? `<div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-left:3px solid var(--purple2);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:var(--purple2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;">✨ Summary / Key Points</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.75;white-space:pre-wrap;">${p.description}</div>
    </div>` : ''}


    <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:${pct===100?'var(--green2)':'var(--accent2)'};">${pct}%</div>
        <div style="font-size:11px;color:var(--text3);">Acknowledged</div>
      </div>
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${ackCount}</div>
        <div style="font-size:11px;color:var(--text3);">Signed Off</div>
      </div>
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:${pending.length>0?'var(--amber2)':'var(--green2)'};">${pending.length}</div>
        <div style="font-size:11px;color:var(--text3);">Pending</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${pending.length > 0 ? `<button onclick="sendPolicyToPhones('${id}')" style="padding:8px 14px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:6px;color:var(--purple2);font-size:11px;font-weight:700;cursor:pointer;">📱 Send to Phones (${pending.length})</button>` : ''}
        <button onclick="ackAll('${id}')" style="padding:8px 14px;background:rgba(37,168,104,0.15);border:1px solid rgba(37,168,104,0.4);border-radius:6px;color:var(--green2);font-size:11px;font-weight:700;cursor:pointer;">✓ Mark All</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:8px;">⏳ Pending (${pending.length})</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 12px;max-height:400px;overflow-y:auto;">
          ${pending.length ? staffRows(pending,false) : '<div style="font-size:11px;color:var(--green2);padding:8px 0;">All acknowledged ✓</div>'}
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--green2);margin-bottom:8px;">✓ Acknowledged (${done.length})</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 12px;max-height:400px;overflow-y:auto;">
          ${done.length ? staffRows(done,true) : '<div style="font-size:11px;color:var(--text3);padding:8px 0;">None yet</div>'}
        </div>
      </div>
    </div>`;
}