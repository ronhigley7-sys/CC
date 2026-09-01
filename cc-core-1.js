
// ════════════════════════════════════
//  MASTER DATA
// ════════════════════════════════════

// Base staff list — never modified directly
const BASE_STAFF = [
  {name:"Arnold, Carly E",job:"CA"},{name:"Banks, Breonica N",job:"CA"},
  {name:"Bantin, Trinity H",job:"CA"},{name:"Barnhart, Adriana C",job:"CA"},
  {name:"Batario, John Richard Craig",job:"CA"},{name:"Christiansen, Deanna M",job:"CA"},
  {name:"Cook, Mark",job:"CA"},{name:"Delacruz, Alysson",job:"CA"},
  {name:"Donohoe, Nicola",job:"CA"},{name:"Fitzgerald, Kimberly A",job:"CA"},
  {name:"Gray, Catima",job:"CA"},{name:"Handsom, Jenifer",job:"CA"},
  {name:"Hoff, Lorraine",job:"CA"},{name:"Holmes, Elizabeth N",job:"CA"},
  {name:"Hunter, Tyree",job:"CA"},{name:"Kathan, Jenna L",job:"CA"},
  {name:"King, Lakya",job:"CA"},{name:"King, Travonne J",job:"CA"},
  {name:"Mansour, Ryma N",job:"CA"},{name:"Morton, Madison A",job:"CA"},
  {name:"Mosher, Cassie L",job:"CA"},{name:"Pierce, Wesley J",job:"CA"},
  {name:"Porter, Alannah R",job:"CA"},{name:"Riedl, Sarah E",job:"CA"},
  {name:"Satterlee, Morgan M",job:"CA"},{name:"Schilling, Saria M",job:"CA"},
  {name:"Stoyle, Carmella",job:"CA"},{name:"VanAlstine, Alexa M",job:"CA"},
  {name:"Fox, Laura S",job:"LPN"},{name:"Kelly, Lindsey N",job:"LPN"},
  {name:"Shafer, Wayne A",job:"LPN"},{name:"Stebbins, Danielle L",job:"LPN"},
  {name:"Alexander, Jessica L",job:"RN"},{name:"Barringer, Heather",job:"RN"},
  {name:"Burkhart, Danielle M",job:"RN"},{name:"Cannon, Kelly",job:"RN"},
  {name:"Caswell, Kaleigh",job:"RN"},{name:"Chaves Garcia, Tabata",job:"RN"},
  {name:"Cole, Curtiss K",job:"RN"},{name:"Comiso, Deejay",job:"RN"},
  {name:"Condame, Robin E",job:"RN"},{name:"Dean, Kelly L",job:"RN"},
  {name:"Dibble, Martha",job:"RN"},{name:"Diederich, Sherry L",job:"RN"},
  {name:"Fombe, Rose",job:"RN"},{name:"Goree, Kadian O",job:"RN"},
  {name:"Hanyon, Sean",job:"RN"},{name:"Hatala, Carrie A",job:"RN"},
  {name:"Hopkins, Sharon",job:"RN"},{name:"Hunsinger, Jennifer J",job:"RN"},
  {name:"Irwin, Riley",job:"RN"},{name:"Johnson, Alyssa",job:"RN"},
  {name:"Jones, Samantha F",job:"RN"},{name:"Kitching, Jill",job:"RN"},
  {name:"Knight, Robin V",job:"RN"},{name:"Kratzberg, Jade A",job:"RN"},
  {name:"Lee, Olajumoke M",job:"RN"},{name:"Muller, Laurel A",job:"RN"},
  {name:"Murphy, Stephanie",job:"RN"},{name:"Quinlan, Meghan M",job:"RN"},
  {name:"Robenson, Jean-Pierre",job:"RN"},{name:"Robinson, Miranda J",job:"RN"},
  {name:"San Li, Jin",job:"RN"},{name:"Thomas, Jamie",job:"RN"},
  {name:"Tye, Amber M",job:"RN"},{name:"Walker, Katie L",job:"RN"},
  {name:"Wingler, Matthew",job:"RN"},{name:"Armstrong, Katelyn N",job:"UC"}
];

// MASTER_STAFF is the live merged list — rebuilt at startup and whenever staff are added/removed
let MASTER_STAFF = [...BASE_STAFF];

function rebuildMasterStaff() {
  const removed = new Set(state.removedStaff || []);
  const combined = [...BASE_STAFF, ...(state.customStaff || [])];
  const seen = new Set();
  MASTER_STAFF = combined.filter(s => {
    if (seen.has(s.name)) return false;
    if (removed.has(s.name)) return false;
    seen.add(s.name);
    return true;
  }).sort((a, b) => {
    if (a.job !== b.job) return a.job.localeCompare(b.job);
    return a.name.localeCompare(b.name);
  });
  buildStaffDatalist();

  // Push roster to Supabase so staff form and float board always use CC as source of truth
  const EXCLUDED = ['Ron Higley', 'Ronald Higley'];
  const roster = MASTER_STAFF
    .filter(s => s.job !== 'UC' && s.job !== 'NM' && !EXCLUDED.includes(s.name))
    .map(s => ({ name: s.name, role: s.job, status: 'active' }));

  const cfg = getSBConfig();
  if (cfg.enabled && cfg.url && cfg.key) {
    fetch(`${cfg.url}/rest/v1/tracker_state`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        key: 'float_roster',
        value: JSON.stringify(roster),
        updated_at: new Date().toISOString(),
        updated_by: _sbUserId || 'cc'
      })
    }).catch(() => {}); // silent fail — not critical
  }
}

const PENDING_EDUCATION = {}; // Cleared — education is now upload-only via Import tab

// ════════════════════════════════════
//  APP STATE
// ════════════════════════════════════
let state = {
  dates: [],
  placements: {},   // { "dateKey": { "shiftKey": [{name, role}] } }
  activeBoardDate: null,
  activeChargeDate: null,
  activeNotesDate: null,
  chargeNurses: {},  // { "dateKey|shiftKey": name }  — 3B charge
  charge3C: {},      // { "dateKey|shiftKey": name }  — 3C charge
  staff3C: {},       // { "dateKey|shiftKey": {lpn, rn1, rn2} } — 3C staff assignments
  trackingData: {},  // { name: {floatDate, sitterDate, lastCallOff, extra} }
  vacancyBudgets: {}, // { 'rn-total': 20, 'rn-day': 10, ... }
  empShifts: {},      // { name: 'DAY' | 'EVE' | 'NIGHT' | 'BOTH' }
  empFTE: {},         // { name: 1 | 0.9 | 0.5 | 0.25 }
  empNotes: {},       // { name: [{ts, text}] }
  empProfile: {},     // { name: { food, movie, hobbies, proudOf, perfectDay, signedDate } }
  empDocs: {},         // { name: { orientation:{...}, xensys:{...}, offboard:{...} } }
  contractDoc: null,   // { fileName, path, url, uploadedDate } — most recent contract PDF
  emp48hr: {},        // { name: true } — RNs approved for 48-hr scheduling
  empWeekend: {},     // { name: 'W1'|'W2' } — preferred weekend rotation (W1=odd, W2=even)
  scheduleOverrides: {}, // { "YYYY-MM-DD|shiftKey|name": 'ON'|'OFF'|'48H' }
  empOrientation: {}, // { name: true } — staff currently on orientation
  orientAssign: {}, // { "dateKey|shiftKey|orienteeName": preceptorName } — who each orientee trains with
  upc: { meetings: [] }, // Unit Practice Council — { meetings: [{date,attendees:[],goals:[],notes,outcomes:[]}] }
  weekendSummary: {}, // { dateKey: { notes, incidents } }
  unitFalls: [], // [ { date, room, staff, desc, category } ]
  twilioConfig: { accountSid:'', authToken:'', fromNumber:'' }, // Twilio credentials
  empPreceptor:   {}, // { name: true } — certified preceptors
  empPayEligible: {}, // { name: true } — RN/LPN: Eligible Pay
  empPayGuarHigh: {}, // { name: true } — RN/LPN: Guaranteed High Pay
  empPayHighInc:  {}, // { name: true } — RN/LPN: High Pay + Incentive
  empPayHighCA:   {}, // { name: true } — CA: High Pay
  empCAHours: {},     // { name: '8' | '12' }
  absenceLog: {},     // { name: [{date, hours, type, note, writeUp},...] }
  unitGoals: {},      // { year: { goalText, scanTarget, painTarget, txTarget, pgTarget, strokeTarget } }
  strokeKPI: {},      // { 'YYYY-MM': { tPA, thrombectomy, nihss, doorToNeedle, doorToPuncture, dischargeEdu } }
  pressGaney: {},     // { 'YYYY-MM': { overall, recommend, communication, responsiveness, pain, quietness, cleanliness } }
  yearReview: {},      // { name: { year: { managerNotes, strengths, opportunities, goals } } }
  docOpps: {},         // { dateKey: [{ name, category, note, ts }] }
  qualityData: {}, unitGoals2026: { falls:30, hapi:9, painPct:95, carePlanPct:100, mislabeledSpec:10, chgBathPct:100, pivPct:90, curosPct:90, centralLinePct:90, pgHospital:73.34, rnTurnover:22, lpnCaTurnover:15, scanTarget:95 },    // { name: { year: { month: { scans, scanTotal, painReass, painTotal, transfusions} } } }
  empVacation: {},    // { name: [{date:'YYYY-MM-DD', type:'VAC'|'EDU'|'RES'|'LOA'|'OTH'},...] } — per-staff unavailable dates
  empSkipSchedule: {}, // { name: true } — skip from auto-scheduling
  empSetSchedule: {}, // { name: { weekA:{Mon:'CA_D',Tue:'CA_N12',...}, weekB:{...} } } — per-day shift assignments
  notes: {},         // { "dateKey|shiftKey": text }
  phones: {},        // { name: phone }
  emails: {},        // { name: email }
  birthdays: {},     // { name: "MM/DD" }
  anniversaries: {}, // { name: "MM/DD/YYYY" }
  hireDates: {},     // { name: "YYYY-MM-DD" } — date of hire
  certs: {},         // { name: { ACLS: "MM/DD/YYYY", BLS: "...", NIHSS: "...", License: "..." } }
  pendingEdu: {},    // { name: [items...] }  — overrides PENDING_EDUCATION when imported
  eduRole: 'ALL',
  certDisplayMode: 'expDate', // 'expDate' | 'dueNow'
  dirShiftTab: 'ALL',  // ALL | DAY_SHIFT | EVE_SHIFT | NGT_SHIFT | WORKING | OFF_ALL
  dirRoleTab: 'ALL',   // ALL | RN | LPN | CA
  customStaff: [],   // [{name, job}] — user-added employees saved to localStorage
  removedStaff: [],  // [name] — base staff hidden from all views
  agencyDates: {},   // { name: { contractStart, contractEnd, extensionEnd } }
  alwaysRNCharge: false, // auto-set charge to highest-seniority RN on board
  empAlwaysCharge: {}, // { name: true } — this person is always charge when scheduled
  weeklyEdu: {},   // { 'YYYY-WW': { nurseTopics:[], caTopics:[], notes:'' } }
  varianceLog: {}, // { name: [{ts, date, time, type, correction, returnBy, manager, notes, cpChecks}] }
  todoList: [],    // [{ id, text, freq:'daily'|'weekly'|'monthly', weight:1-5, done:{}, created }]
  nineBox: {},     // { name: { perf:1-3, potential:1-3 } } — 1=low,2=mid,3=high
  staffIncidents: {}, // { name: { falls:[{date,note}], hapis:[{date,note}], missedTx:[{date,note}] } }
  interviews: [],     // [{ id, name, role, date, interviewer, status, scores, notes, created }]
  orientation: {},    // { name: { preceptor, startDate, targetDate, offDate, weeks:[{week,skills,passed,notes}], milestones:{} } }
  competency: {},     // { name: { [skillKey]: { date, validator, passed, notes } } }
  customCompSkills: { RN:[], CA:[] }, // [{ key, label, section }] — user-added skills
  hiddenCompSkills: { RN:[], CA:[] }, // keys of built-in skills to hide
  recognition: [],    // [{ id, name, type, date, submittedBy, description, ts }]
  policies: [],       // [{ id, title, category, effectiveDate, description, acks:{name:date} }]
  messages: [],       // [{ id, subject, body, type, urgency, audience, postedBy, postedAt, reads:{name:ts}, pinned }]
  rrtLog: [],         // [{ id, date, time, room, patient, type, responders, outcome, debrief, notes, ts }]
  otLog: {},          // { name: [{ payPeriod, regularHrs, otHrs, premiumType, approved, notes }] }
  incidentReports: [],// [{ id, date, time, room, patient, type, severity, rlNumber, status, followUp, staff, notes, ts }]
  productivity: {},   // { 'YYYY-MM-DD': { census, productiveHrs, nonProductiveHrs, staffedHrs, notes } }
  hppdCheckins: {},   // { 'YYYY-MM-DD': { '0700': {census, staff, notes, savedAt}, '1100': {...}, ... } }
  equipmentLog: [],   // [{ id, item, location, issue, reportedBy, reportedDate, status, resolvedDate, workOrder, notes, ts }]
  shiftTargets: {},   // { shift: { RN:n, LPN:n, CA:n, UC:n } } — overrides RISK_REQS defaults
  customOriMilestones: [], // [{ key, label }] — user-added milestones appended to ORI_MILESTONES
  customOriGoals: {},      // { 'RN'|'LPN'|'CA'|'UC': [weekGoalStr, ...] } — overrides ORI_WEEK_GOALS
  onboarding: {},          // { name: { startDate, role, buddy, hrDone:{key:date}, itDone:{key:date}, clinicalDone:{key:date}, notes } }
  offboarding: {},         // { name: { lastDay, role, reason, hrDone:{key:date}, itDone:{key:date}, notes } }
  coaching: {},            // { name: [{ id, date, area, notes, plan, followUp, status, ts }] }
  monthlyFollowUp: {},     // { 'YYYY-MM': { name: { date, status, notes, ts } } }
  fallRoundData: [],       // [{ id, staff, date, compliant, items:{...}, notes }] — PLATO fall-rounding audit rows
  staffNameMap: {},        // { rawNameFromImport: canonicalDirectoryName } — confirmed via Unmatched Names panel
  staffNameIgnored: [],    // raw names explicitly dismissed as "not staff" in the Unmatched Names panel
  dailyEduLog: {},         // { 'YYYY-MM-DD': { category, title, time, points:[], ref, savedAt } } — daily huddle education picks
};

const SHIFT_ORDER = ["0700-1500","1500-1900","1900-0700","0630-1430","1430-1830","1830-2230","2230-0630","1500-2300","2300-0700"];
const RN_LPN_SHIFTS = ["0700-1900","1900-0700"];
const CA_SHIFTS = ["0630-1430","1430-1830","1830-2230","2230-0630"];
const UC_SHIFTS = ["0700-1500","1500-2300","2300-0700"];

function shiftGroup(shift) {
  if (["0700-1500"].includes(shift)) return 'DAY';
  if (["1500-1900","0630-1430","1430-1830"].includes(shift)) return 'EVE';
  if (["1900-0700","1830-2230","2230-0630","1500-2300","2300-0700"].includes(shift)) return 'NIGHT';
  return 'OTHER';
}

// ════════════════════════════════════
//  CLOCK
// ════════════════════════════════════
function updateClock() {
  const now = new Date();
  document.getElementById('live-clock').textContent =
    now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) + ' ' +
    now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
setInterval(updateClock, 1000);
updateClock();

// ════════════════════════════════════
//  TAB SWITCHING
// ════════════════════════════════════
// ── Dropdown Navigation ──────────────────────────────────────────
function toggleNavGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const isOpen = group.classList.contains('open');
  // Close all open groups
  document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
  if (!isOpen) {
    group.classList.add('open');
    // Position the dropdown below the button using fixed coords
    const btn = group.querySelector('.nav-group-btn');
    const dd  = group.querySelector('.nav-dropdown');
    if (btn && dd) {
      const rect = btn.getBoundingClientRect();
      dd.style.left = Math.min(rect.left, window.innerWidth - 210) + 'px';
      dd.style.top  = (rect.bottom + 2) + 'px';
    }
  }
}

function switchTabFromDD(ddItem, groupId) {
  // Close the dropdown
  const group = document.getElementById(groupId);
  if (group) group.classList.remove('open');
  // Switch to the panel using existing switchTab logic
  switchTab(ddItem);
  // Mark the group as has-active
  updateNavGroupActive();
}

function updateNavGroupActive() {
  // Check each dropdown group — if any item inside is active, mark group
  document.querySelectorAll('.nav-group').forEach(g => {
    const hasActive = g.querySelector('.nav-dropdown-item.active');
    g.classList.toggle('has-active', !!hasActive);
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.nav-group')) {
    document.querySelectorAll('.nav-group.open').forEach(g => g.classList.remove('open'));
  }
});

function switchTab(el) {
  // Resolve to the .tab or .nav-dropdown-item even if icon was clicked
  el = el.closest('.tab') || el.closest('.nav-dropdown-item') || el;

  // Hide ALL panels and remove all active states
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-dropdown-item').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
    p.removeAttribute('data-active');
    p.style.display = 'none';
  });

  // Show only the target panel
  el.classList.add('active');
  const panelId = el.dataset.panel;
  const target = document.getElementById('panel-' + panelId);
  if (target) {
    target.classList.add('active');
    target.setAttribute('data-active', '1');
    target.style.display = 'block';
  }

  // Mark any matching items (tab or dropdown) active
  document.querySelectorAll(`[data-panel="${panelId}"]`).forEach(e => e.classList.add('active'));

  // Update dropdown group active state
  updateNavGroupActive();

  if (el.dataset.panel === 'home')       renderManagerHome();
  if (el.dataset.panel === 'vacancy')    { loadVacancyBudgets(); loadPnlBudget(); }
  if (el.dataset.panel === 'overtime')   loadOtYtd();
  if (el.dataset.panel === 'schedule')   { renderSchedule(); renderBlockedDays(); renderVacationList(); populateVacStaffSelect(); renderShiftTargets(); }
  if (el.dataset.panel === 'staffprefs') renderSetScheduleGrid();
  if (el.dataset.panel === 'absence')    { renderAbsenceTab(); renderAbsenceDowCharts(); }
  if (el.dataset.panel === 'quality')    { renderQualityTab(); renderUnitGoals2026('unit-goals-2026-section'); renderUnitFalls('falls-section'); renderUPC('upc-section'); }
  if (el.dataset.panel === 'floatstats') {
    // Force a fresh read of the float/sitter log from localStorage before
    // rendering — fixes a race where this panel could render before the
    // Float & Sitter Manager script had loaded its data.
    if (typeof fsm_load === 'function') fsm_load();
    renderFloatStats();
    renderFloatYtdCards();
  }
  if (el.dataset.panel === 'stroke')     renderStrokeTab();
  if (el.dataset.panel === 'yearreview') { initStrokeYears(); renderYearReview(); }
  if (el.dataset.panel === 'variance')   initVarianceTab();
  if (el.dataset.panel === 'painaudit' || el.dataset.panel === 'txaudit') initAuditDates();
  if (el.dataset.panel === 'todo')       renderTodo();
  if (el.dataset.panel === 'import')     initTwilioUI();
  if (el.dataset.panel === 'ninebox')    renderNineBox();
  if (el.dataset.panel === 'incidents')  renderIncidents();
  if (el.dataset.panel === 'interview')   renderInterviewList();
  if (el.dataset.panel === 'orientation') renderOrientationList();
  if (el.dataset.panel === 'onboarding')  renderOnboarding();
  if (el.dataset.panel === 'coaching')    renderCoaching();
  if (el.dataset.panel === 'monthlyfu')   initMonthlyFollowUp();
  if (el.dataset.panel === 'fallround')   initFallRounding();
  if (el.dataset.panel === 'hapiround')   initHapiRounding();
  if (el.dataset.panel === 'competency')  renderCompetency();
  if (el.dataset.panel === 'recognition') renderRecognition();
  if (el.dataset.panel === 'policies')    renderPolicyList();
  if (el.dataset.panel === 'readsign')    { renderReadSign(); initReadSign(); }
  if (el.dataset.panel === 'broadcast')   { renderBroadcastList(); renderBoardMessages(); }
  if (el.dataset.panel === 'rrtlog')      renderRrtLog();
  if (el.dataset.panel === 'overtime')    renderOtTab();
  if (el.dataset.panel === 'inclog')      renderIncLog();
  if (el.dataset.panel === 'hppd')        renderProductivity();
  if (el.dataset.panel === 'equipment')   renderEquipmentLog();
}

function saveEmpFTE(name, val) {
  state.empFTE[name] = val;
  persistSave();
  showSaveBanner(`💾 FTE saved for ${name.split(',')[0]}`);
}

function toggle48hr(name) {
  state.emp48hr[name] = !state.emp48hr[name];
  persistSave();
  showSaveBanner(`💾 48hr preference ${state.emp48hr[name] ? 'enabled' : 'removed'} for ${name.split(',')[0]}`);
  renderDirectory();
}

function toggleOrientation(name, val) {
  state.empOrientation[name] = val;
  persistSave();
  showSaveBanner(`💾 Orientation ${val ? 'enabled' : 'removed'} for ${name.split(',')[0]}`);
  renderDirectory();
  renderBoard();
}

function togglePreceptor(name, val) {
  if (!state.empPreceptor) state.empPreceptor = {};
  if (val) state.empPreceptor[name] = true;
  else delete state.empPreceptor[name];
  persistSave();
  showSaveBanner(`💾 Preceptor ${val ? 'enabled' : 'removed'} for ${name.split(',')[0]}`);
  renderDirectory();
}

function togglePayFlag(name, key, val) {
  if (!state[key]) state[key] = {};
  if (val) state[key][name] = true;
  else delete state[key][name];
  persistSave();
  renderDirectory();
}

function toggleAgency(name, val) {
  if (!state.agencyDates[name]) state.agencyDates[name] = {};
  state.agencyDates[name].isAgency = val;
  if (!val) {
    // When unchecking agency, clear contract dates too
    delete state.agencyDates[name].contractStart;
    delete state.agencyDates[name].contractEnd;
    delete state.agencyDates[name].extensionEnd;
    if (!Object.keys(state.agencyDates[name]).length) delete state.agencyDates[name];
  }
  persistSave();
  showSaveBanner(`💾 Agency ${val ? 'enabled' : 'removed'} for ${name.split(',')[0]}`);
  renderDirectory();
  renderBoard();
}

function saveEmpWeekend(name, pref) {
  if (state.empWeekend[name] === pref) {
    delete state.empWeekend[name];
  } else {
    state.empWeekend[name] = pref;
  }
  persistSave();
  showSaveBanner(`💾 Weekend preference saved for ${name.split(',')[0]}`);
  renderDirectory();
}

// ── Set Schedule (Bi-Weekly, per-day shift type) ──
const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_MAP = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

const CA_SHIFT_CYCLE  = ['', 'CA_D', 'CA_E', 'CA_E13', 'CA_N', 'CA_D12', 'CA_N12'];
const RN_SHIFT_CYCLE  = ['', 'DAY', 'NIGHT'];
const LPN_SHIFT_CYCLE = ['', 'DAY', 'NIGHT'];

const SHIFT_DISPLAY = {
  CA_D:   { label:'8D',  color:'var(--amber2)', bg:'rgba(180,83,9,0.3)' },
  CA_E:   { label:'8E',  color:'var(--teal2)',  bg:'rgba(14,116,144,0.3)' },
  CA_N:   { label:'8N',  color:'var(--accent2)',bg:'rgba(46,125,209,0.3)' },
  CA_E13: { label:'E13', color:'#d946ef',       bg:'rgba(217,70,239,0.3)' },
  CA_D12: { label:'12D', color:'var(--amber2)', bg:'rgba(180,83,9,0.5)' },
  CA_N12: { label:'12N', color:'var(--accent2)',bg:'rgba(46,125,209,0.5)' },
  DAY:    { label:'D',   color:'var(--amber2)', bg:'rgba(180,83,9,0.3)' },
  NIGHT:  { label:'N',   color:'var(--accent2)',bg:'rgba(46,125,209,0.3)' },
};

const SHIFT_OPTIONS_BY_ROLE = {
  RN:  [{ val:'DAY', label:'☀️ Day 0700-1900' },{ val:'NIGHT', label:'🌙 Night 1900-0700' }],
  LPN: [{ val:'DAY', label:'☀️ Day 0700-1900' },{ val:'NIGHT', label:'🌙 Night 1900-0700' }],
  CA:  [
    { val:'CA_D',   label:'☀️ 8hr Day 0630-1430' },
    { val:'CA_E',   label:'🌆 8hr Eve 1430-2230' },
    { val:'CA_N',   label:'🌙 8hr Ngt 2230-0630' },
     { val:'CA_E13', label:'🌆 13hr Eve 1430-0300' },
   { val:'CA_D12', label:'☀️ 12hr Day 0630-1830' },
    { val:'CA_N12', label:'🌙 12hr Ngt 1830-0630' },
  ],
};

let _schedFilterRole = 'ALL';

function getCycleFor(job) {
  if (job === 'CA')  return CA_SHIFT_CYCLE;
  if (job === 'LPN') return LPN_SHIFT_CYCLE;
  return RN_SHIFT_CYCLE;
}

function setSchedFilter(role) {
  _schedFilterRole = role;
  document.querySelectorAll('[id^="sched-filter-"]').forEach(b => {
    const active = b.id === `sched-filter-${role}`;
    b.style.borderColor = active ? 'var(--accent2)' : '';
    b.style.color       = active ? 'var(--accent2)' : '';
  });
  renderSetScheduleGrid();
}

function renderSetScheduleGrid() {
  const el = document.getElementById('set-schedule-grid');
  if (!el) return;
  const staff = MASTER_STAFF.filter(s => {
    if (s.job === 'NURSE MGR') return false;
    if (_schedFilterRole !== 'ALL' && s.job !== _schedFilterRole) return false;
    return true;
  });
  const roleColors = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)' };

  // ── Weekend counter with day/night split ──────────────────────────────
  const WE_DAYS = ['Fri','Sat','Sun'];
  const wkndCount = {
    RN:  { Fri:{day:new Set(),night:new Set()}, Sat:{day:new Set(),night:new Set()}, Sun:{day:new Set(),night:new Set()} },
    LPN: { Fri:{day:new Set(),night:new Set()}, Sat:{day:new Set(),night:new Set()}, Sun:{day:new Set(),night:new Set()} },
    CA:  { Fri:{h8:new Set(),h12:new Set()},   Sat:{h8:new Set(),h12:new Set()},   Sun:{h8:new Set(),h12:new Set()} },
  };
  MASTER_STAFF.forEach(s => {
    if (!wkndCount[s.job] || state.empSkipSchedule?.[s.name]) return;
    const sched = state.empSetSchedule[s.name] || {};
    ['weekA','weekB'].forEach(wk => {
      const w = sched[wk] || {};
      WE_DAYS.forEach(d => {
        const v = w[d];
        if (!v) return;
        if (s.job === 'RN' || s.job === 'LPN') {
          const isDay = v === 'RN_D' || v === 'LPN_D';
          wkndCount[s.job][d][isDay?'day':'night'].add(s.name);
        } else if (s.job === 'CA') {
          const is12 = v === 'CA_D12' || v === 'CA_N12';
          wkndCount['CA'][d][is12?'h12':'h8'].add(s.name);
        }
      });
    });
  });

  // Update weekend counter display
  const wkndEl = document.getElementById('sched-weekend-counter');
  if (wkndEl) {
    wkndEl.innerHTML = WE_DAYS.map(d => {
      const rD = wkndCount.RN[d].day.size,   rN = wkndCount.RN[d].night.size;
      const lD = wkndCount.LPN[d].day.size,  lN = wkndCount.LPN[d].night.size;
      const c8 = wkndCount.CA[d].h8.size,    c12= wkndCount.CA[d].h12.size;
      const isWE = d==='Sat'||d==='Sun';
      return `<div style="text-align:center;${d==='Fri'?'border-right:1px solid rgba(255,255,255,0.08);padding-right:8px;':''}">
        <div style="font-size:9px;color:${isWE?'var(--amber2)':'var(--text3)'};font-weight:${isWE?'700':'400'};text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">${d}</div>
        <div style="font-size:10px;color:var(--accent2);margin-bottom:2px;">RN: <b>${rD}</b>☀ <b>${rN}</b>🌙</div>
        <div style="font-size:10px;color:var(--purple2);margin-bottom:2px;">LPN: <b>${lD}</b>☀ <b>${lN}</b>🌙</div>
        <div style="font-size:10px;color:var(--teal2);">CA: <b>${c8}</b>×8h <b>${c12}</b>×12h</div>
      </div>`;
    }).join('');
  }

  el.innerHTML = staff.map((s, si) => {
    const sched  = state.empSetSchedule[s.name] || { weekA:{}, weekB:{} };
    const weekA  = sched.weekA || {};
    const weekB  = sched.weekB || {};
    const safe   = s.name.replace(/'/g, "\\'");
    const totalDays = Object.keys(weekA).length + Object.keys(weekB).length;
    const rowBg  = si%2 ? '' : 'rgba(255,255,255,0.01)';

    // ── CA .9 FTE validation badge ───────────────────────────
    let caValidBadge = '';
    if (s.job === 'CA' && (parseFloat(state.empFTE[s.name]) || 0.9) >= 0.9) {
      function validateCaWeek(wk) {
        const vals = Object.values(wk);
        const h8  = vals.filter(v => v==='CA_D'||v==='CA_E'||v==='CA_N').length;
        const h12 = vals.filter(v => v==='CA_D12'||v==='CA_N12').length;
        return { h8, h12, ok: (h8>=5 && h12===0) || (h12>=2 && h8>=2) };
      }
      const noA = Object.keys(weekA).length === 0;
      const noB = Object.keys(weekB).length === 0;
      if (!noA || !noB) {
        const vA = validateCaWeek(weekA), vB = validateCaWeek(weekB);
        const ok = (noA || vA.ok) && (noB || vB.ok);
        const tipA = noA ? 'Wk A: no data' : `Wk A: ${vA.h12}×12h + ${vA.h8}×8h ${vA.ok?'✓':'✗'}`;
        const tipB = noB ? 'Wk B: no data' : `Wk B: ${vB.h12}×12h + ${vB.h8}×8h ${vB.ok?'✓':'✗'}`;
        caValidBadge = `<span title=".9 FTE: 2×12h+2×8h or 5×8h per week&#10;${tipA}&#10;${tipB}"
          style="font-size:8px;padding:1px 5px;border-radius:8px;font-weight:700;cursor:help;
            background:${ok?'rgba(37,168,104,0.15)':'rgba(239,68,68,0.15)'};
            color:${ok?'var(--green2)':'var(--red2)'};
            border:1px solid ${ok?'rgba(37,168,104,0.3)':'rgba(239,68,68,0.3)'};">
          ${ok?'✓ .9ok':'⚠ .9 hrs'}</span>`;
      }
    }

    function dayBtn(week, day) {
      const assigned = (week === 'A' ? weekA : weekB)[day] || '';
      const disp   = SHIFT_DISPLAY[assigned] || null;
      const isWE   = day === 'Sat' || day === 'Sun' || day === 'Fri';
      const label  = disp ? disp.label : '·';
      const bg     = disp ? disp.bg : (isWE ? 'rgba(255,255,255,0.04)' : 'transparent');
      const col    = disp ? disp.color : (isWE ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)');
      const border = disp ? disp.color : (isWE ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)');
      return `<div style="display:flex;justify-content:center;">
        <button onclick="cycleSetSchedDay('${safe}','${week}','${day}')"
          title="${assigned || 'Off — click to cycle'}"
          style="width:30px;height:26px;border-radius:4px;border:2px solid ${border};background:${bg};color:${col};font-size:9px;font-weight:700;cursor:pointer;">${label}</button>
      </div>`;
    }

    const wkABtns = DAYS_OF_WEEK.map(d => dayBtn('A', d)).join('');
    const wkBBtns = DAYS_OF_WEEK.map(d => dayBtn('B', d)).join('');
    const daysColor = totalDays>=8?'var(--green2)':totalDays>=6?'var(--accent2)':totalDays>0?'var(--amber2)':'var(--text3)';

    const isSkipped = !!((state.empSkipSchedule||{})[s.name]);

    return `<div
      onmouseenter="this.style.background='rgba(46,125,209,0.12)';this.style.borderRadius='6px';"
      onmouseleave="this.style.background='${rowBg}';this.style.borderRadius='4px';"
      style="display:grid;grid-template-columns:22px 170px repeat(7,1fr) repeat(7,1fr) 60px;gap:2px;align-items:center;padding:3px 2px;background:${rowBg};border-radius:4px;margin-bottom:1px;${isSkipped?'opacity:0.4;':''}">
      <div title="${isSkipped?'Click to include in schedule':'Click to skip from auto-scheduling'}">
        <input type="checkbox" ${isSkipped?'checked':''} title="${isSkipped?'Excluded from scheduling':'Include in scheduling'}"
          onchange="toggleSkipSchedule('${safe}',this.checked)"
          style="width:14px;height:14px;accent-color:var(--red2);cursor:pointer;"
          title="${isSkipped?'Skip: excluded from auto-schedule':'Include in auto-schedule'}">
      </div>
      <div style="display:flex;align-items:center;gap:5px;overflow:hidden;padding-right:4px;flex-wrap:wrap;">
        <span style="color:${roleColors[s.job]||'var(--text2)'};font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;border:1px solid currentColor;flex-shrink:0;">${s.job}</span>
        <span style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isSkipped?'text-decoration:line-through;color:var(--text3);':''}">${s.name.split(',')[0]}</span>
        ${caValidBadge}
      </div>
      ${wkABtns}
      ${wkBBtns}
      <div style="text-align:center;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;color:${daysColor};">${totalDays}</div>
    </div>`;
  }).join('');
}

function toggleSkipSchedule(name, skip) {
  if (!state.empSkipSchedule) state.empSkipSchedule = {};
  if (skip) state.empSkipSchedule[name] = true;
  else delete state.empSkipSchedule[name];
  persistSave();
  renderSetScheduleGrid();
}

function updateSetSchedStatus(ok) {
  const el = document.getElementById('set-sched-save-status');
  if (!el) return;
  const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  el.innerHTML = ok
    ? `<span style="color:var(--green2);">✓ Saved to cloud · ${time}</span>`
    : `<span style="color:var(--red2);">⚠ Local only — cloud not connected · ${time}</span>`;
}

async function saveSetSchedules() {
  const el = document.getElementById('set-sched-save-status');
  if (el) el.innerHTML = `<span style="color:var(--text3);">💾 Saving…</span>`;
  await persistSave();
  const cfg = getSBConfig();
  const ok  = !!(cfg.enabled && cfg.url && cfg.key && _sbConnected);
  updateSetSchedStatus(ok);
  showSaveBanner(ok ? '💾 Set schedules saved to cloud' : '⚠ Set schedules saved locally only — cloud sync is off, reconnect to keep this device in sync with others');
}

function cycleSetSchedDay(name, week, day) {
  if (!state.empSetSchedule[name]) state.empSetSchedule[name] = { weekA:{}, weekB:{} };
  if (!state.empSetSchedule[name].weekA) state.empSetSchedule[name].weekA = {};
  if (!state.empSetSchedule[name].weekB) state.empSetSchedule[name].weekB = {};
  const s     = MASTER_STAFF.find(st => st.name === name);
  const cycle = getCycleFor(s?.job || 'RN');
  const wk    = week === 'A' ? state.empSetSchedule[name].weekA : state.empSetSchedule[name].weekB;
  const curr  = wk[day] || '';
  const next  = cycle[(cycle.indexOf(curr) + 1) % cycle.length];
  if (next === '') { delete wk[day]; } else { wk[day] = next; }
  persistSave().then(() => {
    const cfg = getSBConfig();
    updateSetSchedStatus(!!(cfg.enabled && cfg.url && cfg.key && _sbConnected));
  });
  renderSetScheduleGrid();
}

function setEmpSchedShift(name, shift) {} // legacy stub

function toggleSetSchedDay(name, week, day) { cycleSetSchedDay(name, week, day); }

function clearAllSetSchedules() {
  if (!confirm('Clear all set schedules?')) return;
  state.empSetSchedule = {};
  persistSave();
  renderSetScheduleGrid();
  showSaveBanner('\u2713 Set schedules cleared');
}

// ════════════════════════════════════
//  6-WEEK SCHEDULE GENERATOR
// ════════════════════════════════════
// RN/LPN shifts: 0700-1900 (Day 12hr) and 1900-0700 (Night 12hr)
// CA shifts: 0630-1430 (8hr Day), 1430-2230 (8hr Eve), 2230-0630 (8hr Night)
//            OR 0630-1830 (12hr Day), 1830-0630 (12hr Night)
// Max 6 RNs per shift group; grouped together

const CA_8HR_SHIFTS  = ['0630-1430','1430-2230','2230-0630'];
const CA_EVE_13HR = '1430-0300';
const CA_12HR_SHIFTS = ['0630-1830','1830-0630'];

function fteShiftsPerCycle(fte, role) {
  // role-aware shift counts per 2-week cycle
  const f = parseFloat(fte) || 1;
  if (role === 'CA') {
    // CA shifts per 2-week cycle (mix of 8h and 12h)
    // .9 FTE = 80h/2wk = 4 shifts/wk (2x12h + 2x8h) = 16 shifts/cycle
    // .5 FTE = every other weekend = ~2 shifts/wk avg = 10 shifts/cycle
    if (f >= 0.9) return 16;  // 80h/2wk target
    if (f >= 0.8) return 14;
    if (f >= 0.6) return 12;
    if (f >= 0.5) return 10;  // ~40h/2wk (every other weekend + some days)
    if (f >= 0.25) return 6;
    return Math.round(f * 16);
  }
  // RN / LPN (12h shifts)
  if (f >= 1)    return 10;
  if (f >= 0.9)  return 9;
  if (f >= 0.8)  return 8;
  if (f >= 0.6)  return 6;
  if (f >= 0.5)  return 5;
  if (f >= 0.25) return 3;
  return Math.round(f * 10);
}

let _schedRoleFilter = 'ALL';

function setSchedRoleFilter(filter) {
  _schedRoleFilter = filter;
  ['ALL','RN','LPN','RN_LPN','CA'].forEach(f => {
    const btn = document.getElementById(`sf-${f}`);
    if (!btn) return;
    const active = f === filter;
    btn.style.borderColor = active ? 'var(--accent2)' : 'var(--border)';
    btn.style.background  = active ? 'rgba(46,125,209,0.3)' : 'transparent';
    btn.style.color       = active ? 'var(--accent2)' : 'var(--text3)';
  });
  renderSchedule();
}

// ── Staff Unavailability (vacation, education, residency, etc.) ──
function populateVacStaffSelect() {
  const sel = document.getElementById('vac-staff-select');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select —</option>' +
    MASTER_STAFF.filter(s=>s.job!=='NURSE MGR').map(s =>
      `<option value="${s.name}" ${s.name===current?'selected':''}>${s.name} (${s.job})</option>`
    ).join('');
}

// Normalize a vacation entry to {date, type} object regardless of storage format
function normalizeVacEntry(x) {
  if (typeof x === 'string') return { date: x, type: 'VAC' };
  return x;
}

// Migrate any old string-format vacation data to object format
function migrateVacationData() {
  let changed = false;
  Object.keys(state.empVacation || {}).forEach(name => {
    const arr = state.empVacation[name];
    if (!Array.isArray(arr)) return;
    const hasOldFormat = arr.some(x => typeof x === 'string');
    if (hasOldFormat) {
      state.empVacation[name] = arr.map(normalizeVacEntry);
      changed = true;
    }
  });
  if (changed) persistSave();
}

const VAC_TYPE_INFO = {
  VAC: { icon:'🏖', label:'Vacation',        color:'var(--amber2)',  bg:'rgba(180,83,9,0.2)' },
  EDU: { icon:'📚', label:'Education',        color:'var(--accent2)', bg:'rgba(46,125,209,0.2)' },
  RES: { icon:'🎓', label:'Residency',        color:'var(--teal2)',   bg:'rgba(14,116,144,0.2)' },
  LOA: { icon:'🏥', label:'Leave of Absence', color:'var(--purple2)', bg:'rgba(91,33,182,0.2)' },
  OTH: { icon:'📋', label:'Other',            color:'var(--text2)',   bg:'rgba(255,255,255,0.08)' },
};

function addVacation() {
  const name  = document.getElementById('vac-staff-select').value;
  const start = document.getElementById('vac-start-input').value;
  const end   = document.getElementById('vac-end-input').value || start;
  const type  = document.getElementById('vac-type-select')?.value || 'VAC';
  if (!name || !start) { alert('Select a staff member and start date.'); return; }

  if (!state.empVacation[name]) state.empVacation[name] = [];

  // Normalize existing entries first
  state.empVacation[name] = state.empVacation[name].map(normalizeVacEntry);

  const s = new Date(start+'T12:00:00'), e = new Date(end+'T12:00:00');
  let added = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
    const dk = d.toISOString().split('T')[0];
    if (!state.empVacation[name].some(x => normalizeVacEntry(x).date === dk)) {
      state.empVacation[name].push({ date: dk, type });
      added++;
    }
  }
  state.empVacation[name].sort((a,b) => normalizeVacEntry(a).date.localeCompare(normalizeVacEntry(b).date));

  persistSave();
  renderVacationList();
  renderSchedule();
  document.getElementById('vac-start-input').value = '';
  document.getElementById('vac-end-input').value = '';
  const typeInfo = VAC_TYPE_INFO[type] || VAC_TYPE_INFO.OTH;
  showSaveBanner(`${typeInfo.icon} ${typeInfo.label} added for ${name.split(',')[0]}: ${added} day${added>1?'s':''}`);
}

function removeVacDay(name, date) {
  if (!state.empVacation[name]) return;
  state.empVacation[name] = state.empVacation[name].filter(x => normalizeVacEntry(x).date !== date);
  if (!state.empVacation[name].length) delete state.empVacation[name];
  persistSave();
  renderVacationList();
  renderSchedule();
}

function removeAllVac(name) {
  delete state.empVacation[name];
  persistSave();
  renderVacationList();
  renderSchedule();
}

function renderVacationList() {
  try {
    // Migrate old format first
    migrateVacationData();

  const el = document.getElementById('vacation-list');

  // Update header badge
  const badge = document.getElementById('unavail-badge');
  const allEntries = Object.entries(state.empVacation || {}).filter(([,days]) => Array.isArray(days) && days.length > 0);
  const totalDays = allEntries.reduce((sum, [,days]) => sum + days.length, 0);
  if (badge) {
    badge.textContent = allEntries.length > 0
      ? `${allEntries.length} staff · ${totalDays} days blocked`
      : 'Vacation, residency, education — click to expand';
    badge.style.color = allEntries.length > 0 ? 'var(--amber2)' : 'var(--text3)';
  }

  if (!el) return;

  if (!allEntries.length) {
    el.innerHTML = '<div style="color:var(--text3);font-style:italic;padding:4px 0;">No unavailability set. Use the form above to block dates for individual staff.</div>';
    return;
  }

  el.innerHTML = allEntries.sort((a,b)=>a[0].localeCompare(b[0])).map(([name, days]) => {
    const lastName = name.split(',')[0];
    const safe = name.replace(/'/g,"\\'");
    const normalized = days.map(normalizeVacEntry);

    const byType = {};
    normalized.forEach(e => {
      const t = e.type || 'VAC';
      if (!byType[t]) byType[t] = [];
      byType[t].push(e.date);
    });

    const typeBlocks = Object.entries(byType).map(([type, dates]) => {
      const info = VAC_TYPE_INFO[type] || VAC_TYPE_INFO.OTH;
      const sorted = [...dates].sort();
      const ranges = [];
      let rs = sorted[0], re = sorted[0];
      for (let i=1; i<sorted.length; i++) {
        const prev = new Date(sorted[i-1]+'T12:00:00');
        prev.setDate(prev.getDate()+1);
        if (prev.toISOString().split('T')[0] === sorted[i]) { re = sorted[i]; }
        else { ranges.push(rs===re?rs:`${rs}→${re}`); rs=sorted[i]; re=sorted[i]; }
      }
      ranges.push(rs===re?rs:`${rs}→${re}`);
      return `<span style="background:${info.bg};color:${info.color};border-radius:3px;padding:1px 6px;font-size:9px;margin-right:4px;">${info.icon} ${info.label}: ${ranges.join(', ')}</span>`;
    }).join('');

    return `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
      <div>
        <span style="font-weight:600;font-size:11px;color:var(--white);">${lastName}</span>
        <span style="font-size:9px;color:var(--text3);margin-left:4px;">(${days.length}d total)</span>
        <div style="margin-top:3px;flex-wrap:wrap;">${typeBlocks}</div>
      </div>
      <button onclick="removeAllVac('${safe}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 4px;white-space:nowrap;flex-shrink:0;">Clear all</button>
    </div>`;
  }).join('');
  } catch(err) {
    console.error('renderVacationList error:', err);
    const el2 = document.getElementById('vacation-list');
    if (el2) el2.innerHTML = '<div style="color:var(--amber2);font-size:11px;">⚠ Error loading unavailability data. Use Clear all to reset.</div>';
  }
}

// ── UKG Absence Import ──
// ── Import Tab — UKG Attendance handlers (reuse core absence parser) ──
function showImpAbsStatus(msg, color, bg) {
  const el = document.getElementById('imp-abs-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = color;
  el.style.background = bg;
  el.textContent = msg;
}

function handleImpAbsFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  showImpAbsStatus(`⏳ Reading ${file.name}…`, 'var(--accent2)', 'rgba(46,125,209,0.1)');
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      let rows;
      if (file.name.toLowerCase().endsWith('.csv')) {
        rows = parseCSVText(ev.target.result);
      } else {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type:'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
      }
      const result = parseAbsenceRows(rows);
      showImpAbsStatus(result.msg, result.ok ? 'var(--green2)' : 'var(--red2)', result.ok ? 'rgba(26,122,74,0.15)' : 'rgba(179,35,24,0.15)');
      if (result.ok) renderAbsenceTab();
    } catch(err) {
      showImpAbsStatus('❌ Error: ' + err.message, 'var(--red2)', 'rgba(179,35,24,0.15)');
    }
  };
  if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function handleImpAbsDrop(e) {
  e.preventDefault();
  const zone = document.getElementById('imp-abs-drop-zone');
  if (zone) { zone.style.borderColor = 'rgba(245,158,11,0.4)'; zone.style.background = 'rgba(245,158,11,0.08)'; }
  const file = e.dataTransfer.files[0];
  if (!file) return;
  showImpAbsStatus(`⏳ Reading ${file.name}…`, 'var(--accent2)', 'rgba(46,125,209,0.1)');
  handleImpAbsFile({ target: { files: [file], value: '' } });
}

function handleImpAbsPaste() {
  const ta = document.getElementById('imp-abs-paste-area');
  if (!ta || !ta.value.trim()) return;
  const text = ta.value;
  showImpAbsStatus('⏳ Parsing pasted data…', 'var(--accent2)', 'rgba(46,125,209,0.1)');
  try {
    let rows;
    if (text.includes('\t')) {
      rows = text.split('\n').map(line => line.split('\t').map(c => c.trim().replace(/^"|"$/g, '')));
    } else {
      rows = parseCSVText(text);
    }
    const result = parseAbsenceRows(rows);
    showImpAbsStatus(result.msg, result.ok ? 'var(--green2)' : 'var(--red2)', result.ok ? 'rgba(26,122,74,0.15)' : 'rgba(179,35,24,0.15)');
    if (result.ok) {
      renderAbsenceTab();
      ta.value = '';
      const btn = document.getElementById('imp-abs-paste-btn');
      if (btn) btn.style.display = 'none';
    }
  } catch(err) {
    showImpAbsStatus('❌ Parse error: ' + err.message, 'var(--red2)', 'rgba(179,35,24,0.15)');
  }
}

function handleAbsenceImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  processAbsenceFile(file);
}

function handleAbsenceDrop(e) {
  e.preventDefault();
  const zone = document.getElementById('abs-drop-zone');
  if (zone) { zone.style.borderColor='rgba(46,125,209,0.4)'; zone.style.background='rgba(46,125,209,0.08)'; }
  const file = e.dataTransfer.files[0];
  if (!file) return;
  processAbsenceFile(file);
}

function absShowPasteBtn() {
  const ta = document.getElementById('abs-paste-area');
  const btn = document.getElementById('abs-paste-btn');
  if (btn) btn.style.display = ta && ta.value.trim() ? 'inline-flex' : 'none';
}

function handleAbsencePaste() {
  const ta = document.getElementById('abs-paste-area');
  if (!ta || !ta.value.trim()) return;
  const text = ta.value;
  showAbsenceImportStatus('⏳ Parsing pasted data…', 'var(--accent2)', 'rgba(46,125,209,0.1)');
  try {
    // Parse tab-separated (from Excel copy) or CSV
    let rows;
    if (text.includes('\t')) {
      // Tab-separated from Excel copy/paste
      rows = text.split('\n').map(line => line.split('\t').map(c => c.trim().replace(/^"|"$/g,'')));
    } else {
      rows = parseCSVText(text);
    }
    const result = parseAbsenceRows(rows);
    showAbsenceImportStatus(result.msg, result.ok ? 'var(--green2)' : 'var(--red2)', result.ok ? 'rgba(26,122,74,0.15)' : 'rgba(179,35,24,0.15)');
    if (result.ok) { renderAbsenceTab(); ta.value=''; absShowPasteBtn(); }
  } catch(err) {
    showAbsenceImportStatus('❌ Parse error: ' + err.message, 'var(--red2)', 'rgba(179,35,24,0.15)');
  }
}

function processAbsenceFile(file) {
  showAbsenceImportStatus(`⏳ Reading ${file.name}…`, 'var(--accent2)', 'rgba(46,125,209,0.1)');
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      let rows;
      if (file.name.toLowerCase().endsWith('.csv')) {
        rows = parseCSVText(ev.target.result);
      } else {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type:'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
      }
      const result = parseAbsenceRows(rows);
      showAbsenceImportStatus(result.msg, result.ok ? 'var(--green2)' : 'var(--red2)', result.ok ? 'rgba(26,122,74,0.15)' : 'rgba(179,35,24,0.15)');
      if (result.ok) renderAbsenceTab();
    } catch(err) {
      showAbsenceImportStatus('❌ Error: ' + err.message, 'var(--red2)', 'rgba(179,35,24,0.15)');
    }
  };
  if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function showAbsenceImportStatus(msg, color, bg) {
  const el = document.getElementById('absence-import-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = color;
  el.style.background = bg;
  el.textContent = msg;
}

function parseAbsenceRows(rows) {
  if (!rows.length) return { ok:false, msg:'❌ File is empty.' };
  // Scan first 10 rows, all cells, for report title
  let topText = '';
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    if (Array.isArray(rows[i])) {
      rows[i].forEach(c => { topText += ' ' + String(c||'').toLowerCase(); });
    }
  }
  if (topText.includes('attendance action detail'))   return parseActionDetail(rows);
  if (topText.includes('attendance incident detail')) return parseIncidentDetail(rows);
  if (topText.includes('incident detail'))            return parseIncidentDetail(rows);
  if (topText.includes('action detail'))              return parseActionDetail(rows);

  // Check for the 4-column date/name/hours/hours format
  // Detect: col 0 = date, col 1 = name (Last, First), col 2 = hours or empty, col 3 = hours or empty
  const firstDataRow = rows.find(r => r && r.length >= 2 && String(r[0]||'').match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && String(r[1]||'').trim().length > 2);
  if (firstDataRow) return parseAbsenceLogFormat(rows);

  return parseGenericAbsence(rows);
}

// ─── Custom absence log format ──────────────────────────────────────────────
// Format A (with header): Date | Employee | Tardy | PSL | UPT
// Format B (no header):   Date | Name | DayHours | NightHours
function parseAbsenceLogFormat(rows) {
  let imported=0, skipped=0;
  const unmatched = new Set();
  const seen = new Set();

  // Detect if there's a header row by checking if any cell contains 'tardy','psl','upt','employee'
  let headerRow = -1;
  let dateCol=0, nameCol=1, tardyCol=-1, pslCol=-1, uptCol=-1, dayCol=-1, nightCol=-1;

  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i].map(c => String(c||'').trim().toLowerCase());
    const hasEmployee = row.some(c => c === 'employee' || c === 'employee name');
    const hasTardy    = row.some(c => c === 'tardy');
    const hasDate     = row.some(c => c === 'date');
    if ((hasEmployee || hasTardy) && hasDate) {
      headerRow = i;
      dateCol   = row.findIndex(c => c === 'date');
      nameCol   = row.findIndex(c => c === 'employee' || c === 'employee name' || c === 'name');
      tardyCol  = row.findIndex(c => c === 'tardy');
      pslCol    = row.findIndex(c => c === 'psl');
      uptCol    = row.findIndex(c => c === 'upt');
      if (nameCol < 0) nameCol = 1;
      break;
    }
  }

  const dataStart = headerRow >= 0 ? headerRow + 1 : 0;
  const hasHeader = headerRow >= 0;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[dateCol]) continue;

    const rawDate = String(row[dateCol]||'').trim();
    const rawName = String(row[nameCol]||'').trim().replace(/\s*-\s*Ag\w*$/i,'').trim();

    if (!rawDate || !rawName) continue;
    const date = parseUKGDateStr(rawDate);
    if (!date) { skipped++; continue; }

    const staffName = fuzzyMatchStaff(rawName);
    if (!staffName) { unmatched.add(rawName.split(',')[0].trim()); skipped++; continue; }

    let entries = []; // may produce multiple entries per row

    if (hasHeader) {
      // Format A: header-based — each type column is separate
      // Tardy column: value of 1 = one tardy
      const tardyVal = tardyCol >= 0 ? parseFloat(row[tardyCol]||0)||0 : 0;
      const pslVal   = pslCol   >= 0 ? parseFloat(row[pslCol]  ||0)||0 : 0;
      const uptVal   = uptCol   >= 0 ? parseFloat(row[uptCol]  ||0)||0 : 0;

      if (tardyVal > 0) {
        // Each 1 in Tardy = one tardy occurrence
        for (let t = 0; t < tardyVal; t++) {
          entries.push({ type:'tardy', hours:0, note:'UKG: Tardy' });
        }
      }
      if (pslVal > 0) {
        // PSL = Paid Sick Leave — value IS hours (not units)
        entries.push({ type:'call', hours:pslVal, note:'UKG: PSL ('+pslVal+' hrs)' });
      }
      if (uptVal > 0) {
        // UPT = Unpaid Time — value IS hours (not units)
        entries.push({ type:'call', hours:uptVal, note:'UKG: UPT ('+uptVal+' hrs)' });
      }
      // If nothing recognized, skip
      if (!entries.length) { skipped++; continue; }
    } else {
      // Format B: headerless — col 2 = day hours, col 3 = night hours
      const col2 = String(row[2]||'').trim();
      const col3 = String(row[3]||'').trim();
      const dayHours   = parseFloat(col2)||0;
      const nightHours = parseFloat(col3)||0;
      const totalHours = dayHours + nightHours;
      const noteParts  = [];
      if (dayHours)   noteParts.push('Day: '+dayHours+'h');
      if (nightHours) noteParts.push('Night: '+nightHours+'h');
      entries.push({
        type: 'call',
        hours: totalHours,
        note: noteParts.length ? noteParts.join(', ') : 'No hours recorded'
      });
    }

    // Add each entry — deduplicate strictly on name+date+type (note variations don't matter)
    entries.forEach(entry => {
      const dedupKey = staffName+'|'+date+'|'+entry.type;
      if (seen.has(dedupKey)) { skipped++; return; }
      // Also check absenceLog itself for existing entries (cross-session dedup)
      if (!state.absenceLog[staffName]) state.absenceLog[staffName] = [];
      if (state.absenceLog[staffName].some(e => e.date===date && e.type===entry.type)) { skipped++; return; }
      seen.add(dedupKey);
      const { writeUp, writeUpReason } = calcWriteUp(staffName, date, entry.type, entry.hours);
      state.absenceLog[staffName].push({
        date, type:entry.type, hours:entry.hours,
        note: entry.note, writeUp, writeUpReason, ts:Date.now()+imported
      });
      state.absenceLog[staffName].sort((a,b)=>a.date.localeCompare(b.date));
      imported++;
    });
  }

  persistSave();
  return buildImportResult(imported, skipped, unmatched);
}

function parseActionDetail(rows) {
  let dataStart=0;
  for (let i=0;i<Math.min(10,rows.length);i++) {
    const r=rows[i].map(c=>String(c||'').toLowerCase());
    if (r.some(c=>c.includes('action'))&&r.some(c=>c.includes('name')||c.includes('triggered'))) { dataStart=i+1; break; }
  }
  function mapAction(a,p) {
    const s=(a+' '+p).toLowerCase();
    if (/no.?call|ncns/.test(s)) return 'ncns';
    if (/tardy|late/.test(s)) return 'tardy';
    return 'call';
  }
  let currentName=null, imported=0, skipped=0;
  const unmatched=new Set();
  for (let i=dataStart;i<rows.length;i++) {
    const row=rows[i];
    const colA=String(row[0]||'').trim();
    const colD=String(row[3]||row[4]||'').trim();
    const rawDate=row[8]||row[9]||row[10]||'';
    const colT=String(row[19]||row[20]||'').trim();
    if (colA&&!colD) {
      const s=fuzzyMatchStaff(colA); if(s){currentName=s;}else{unmatched.add(colA.split(',')[0]);currentName=null;}
      continue;
    }
    if (!currentName||!colD) continue;
    const date=parseUKGDateStr(rawDate); if(!date){skipped++;continue;}
    const type=mapAction(colD,colT), hours=type==='tardy'?0:12;
    if (!state.absenceLog[currentName]) state.absenceLog[currentName]=[];
    if (state.absenceLog[currentName].some(e=>e.date===date&&e.type===type)){skipped++;continue;}
    const {writeUp,writeUpReason}=calcWriteUp(currentName,date,type,hours);
    state.absenceLog[currentName].push({date,type,hours,note:`UKG Action: ${colD}${colT?' ('+colT+')':''}`,writeUp,writeUpReason,ts:Date.now()+imported});
    state.absenceLog[currentName].sort((a,b)=>a.date.localeCompare(b.date));
    imported++;
  }
  persistSave();
  return buildImportResult(imported,skipped,unmatched);
}

function parseIncidentDetail(rows) {
  // Find header row containing "Employee Name" and "Date" anywhere in the row
  let dataStart = 0;
  let nameColIdx = 0, dateColIdx = 1, typeColIdx = 3, incidentColIdx = 4, codeColIdx = 5;

  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const rowLower = rows[i].map(c => String(c||'').trim().toLowerCase());
    const nC = rowLower.findIndex(c => c === 'employee name' || c === 'employee' || c === 'name');
    const dC = rowLower.findIndex(c => c === 'date');
    if (nC >= 0 && dC >= 0) {
      dataStart     = i + 1;
      nameColIdx    = nC;
      dateColIdx    = dC;
      // Find Type, Name, Code columns
      const tC = rowLower.findIndex(c => c === 'type');
      const iC = rowLower.findIndex(c => c === 'name' && rowLower.indexOf('name') !== nC);
      const cC = rowLower.findIndex(c => c === 'code');
      if (tC >= 0) typeColIdx    = tC;
      if (iC >= 0) incidentColIdx = iC;
      if (cC >= 0) codeColIdx    = cC;
      break;
    }
  }

  function mapCode(name, code) {
    const s = (name + ' ' + code).toLowerCase();
    if (/tardy/.test(s))                          return 'tardy';
    if (/no.?call|ncns/.test(s))                  return 'ncns';
    if (/missed.*punch/.test(s))                  return 'tardy';
    if (/partial|left.?early|early.?out/.test(s)) return 'early';
    if (/unexcused|absent|\bua\b/.test(s))       return 'call';
    return 'call';
  }

  let currentName = null, currentDate = null, imported = 0, skipped = 0;
  const unmatched = new Set();

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const colA = String(row[nameColIdx]    || '').trim();
    const colB = String(row[dateColIdx]    || '').trim();
    const colD = String(row[typeColIdx]    || '').trim(); // "Event"
    const colE = String(row[incidentColIdx]|| '').trim(); // "Tardy"
    const colF = String(row[codeColIdx]    || '').trim(); // "TARDY"

    // Also check adjacent cols for incidents (some UKG exports shift cols)
    const colE2 = String(row[(incidentColIdx||4)+1] || '').trim();
    const incident = colE || colF || colE2;

    // Skip completely empty rows (separator rows between date groups)
    if (!colA && !colB && !colD && !incident) continue;

    // Employee name row: nameCol has text, dateCol empty, typeCol empty
    // Exclude metadata rows like "Policies", "Events", "Combined Events" etc.
    if (colA && !colB && !colD && !/^(policies|events|combined|lost.?time|patterns|actions?|other|\()/i.test(colA)) {
      const st = fuzzyMatchStaff(colA);
      if (st) { currentName = st; currentDate = null; }
      else { unmatched.add(colA.split(',')[0] || colA); currentName = null; }
      continue;
    }

    // Date row: nameCol empty, dateCol has a date value, typeCol empty
    if (!colA && colB && !colD) {
      const d = parseUKGDateStr(colB);
      if (d) currentDate = d;
      continue;
    }

    // Event row: typeCol = "Event", incidentCol = incident name
    if (!currentName || !currentDate) { skipped++; continue; }
    if (!incident) { skipped++; continue; }
    // Only process "Event" type rows (skip Pattern, Action, Combined)
    if (colD && !/^event$/i.test(colD)) { skipped++; continue; }

    const type  = mapCode(colE || colE2, colF);
    const hours = type === 'tardy' ? 0 : 12;

    if (!state.absenceLog[currentName]) state.absenceLog[currentName] = [];
    if (state.absenceLog[currentName].some(e => e.date === currentDate && e.type === type)) { skipped++; continue; }

    const { writeUp, writeUpReason } = calcWriteUp(currentName, currentDate, type, hours);
    state.absenceLog[currentName].push({
      date: currentDate, type, hours,
      note: 'UKG: ' + (colE||colE2) + (colF && colF !== colE ? ' (' + colF + ')' : ''),
      writeUp, writeUpReason, ts: Date.now() + imported
    });
    state.absenceLog[currentName].sort((a, b) => a.date.localeCompare(b.date));
    imported++;
  }

  persistSave();
  return buildImportResult(imported, skipped, unmatched);
}

function parseGenericAbsence(rows) {
  let headerRow=-1,nameCol=-1,dateCol=-1,typeCol=-1,hoursCol=-1;
  for (let i=0;i<Math.min(8,rows.length);i++) {
    const r=rows[i].map(c=>String(c||'').toLowerCase().trim());
    const nC=r.findIndex(h=>h.includes('employee')||(h.includes('name')&&!h.includes('pay')));
    const dC=r.findIndex(h=>h.includes('date')||h.includes('occurrence'));
    const tC=r.findIndex(h=>h.includes('pay code')||h.includes('type')||h.includes('absence')||h.includes('code')||h.includes('exception'));
    const hC=r.findIndex(h=>h.includes('hours')||h.includes('duration'));
    if (nC>=0&&dC>=0){headerRow=i;nameCol=nC;dateCol=dC;typeCol=tC<0?-1:tC;hoursCol=hC<0?-1:hC;break;}
  }
  if (headerRow===-1){headerRow=0;nameCol=0;dateCol=1;typeCol=2;hoursCol=3;}
  function mapCode(raw) {
    const s=String(raw||'').toLowerCase();
    if (/tardy|late/.test(s)) return 'tardy';
    if (/ncns|no.?call|no.?show/.test(s)) return 'ncns';
    if (/early.?out|left.?early/.test(s)) return 'early';
    return 'call';
  }
  let imported=0,skipped=0; const unmatched=new Set();
  for (let i=headerRow+1;i<rows.length;i++) {
    const row=rows[i]; if(!row||row.every(c=>!String(c||'').trim())) continue;
    const rawName=String(row[nameCol]||'').trim(); if(!rawName){skipped++;continue;}
    const staffName=fuzzyMatchStaff(rawName); if(!staffName){unmatched.add(rawName.split(',')[0]);skipped++;continue;}
    const date=parseUKGDateStr(row[dateCol]); if(!date){skipped++;continue;}
    const type=mapCode(typeCol>=0?row[typeCol]:'');
    const hours=type==='tardy'?0:(parseFloat(hoursCol>=0?row[hoursCol]:0)||0);
    if (!state.absenceLog[staffName]) state.absenceLog[staffName]=[];
    if (state.absenceLog[staffName].some(e=>e.date===date&&e.type===type)){skipped++;continue;}
    const {writeUp,writeUpReason}=calcWriteUp(staffName,date,type,hours);
    state.absenceLog[staffName].push({date,type,hours,note:'UKG import',writeUp,writeUpReason,ts:Date.now()+imported});
    state.absenceLog[staffName].sort((a,b)=>a.date.localeCompare(b.date));
    imported++;
  }
  persistSave();
  return buildImportResult(imported,skipped,unmatched);
}

function fuzzyMatchStaff(rawName) {
  if (!rawName) return null;
  const norm=s=>String(s).toLowerCase().replace(/[^a-z]/g,'');
  const target=norm(rawName);
  let found=MASTER_STAFF.find(s=>norm(s.name)===target);
  if (found) return found.name;
  const rawLast=String(rawName).split(',')[0].trim();
  const lastNorm=norm(rawLast);
  const byLast=MASTER_STAFF.filter(s=>norm(s.name.split(',')[0])===lastNorm);
  if (byLast.length===1) return byLast[0].name;
  const rawFirst=(String(rawName).split(',')[1]||'').trim().split(' ')[0];
  const firstNorm=norm(rawFirst);
  if (firstNorm.length>=2) {
    const byBoth=byLast.filter(s=>{const fn=norm((s.name.split(',')[1]||'').trim().split(' ')[0]);return fn.startsWith(firstNorm.slice(0,3));});
    if (byBoth.length===1) return byBoth[0].name;
  }
  return null;
}

function parseUKGDateStr(raw) {
  if (!raw&&raw!==0) return null;
  if (typeof raw==='number') { const d=new Date((raw-25569)*86400*1000); return d.toISOString().split('T')[0]; }
  const s=String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) { let yr=parseInt(m1[3]); if(yr<100) yr+=yr<50?2000:1900; return `${yr}-${String(m1[1]).padStart(2,'0')}-${String(m1[2]).padStart(2,'0')}`; }
  const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const m2=s.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m2) { const mo=MONTHS[m2[1].toLowerCase()]; if(mo) return `${m2[3]}-${String(mo).padStart(2,'0')}-${String(m2[2]).padStart(2,'0')}`; }
  return null;
}

function calcWriteUp(staffName,date,type,hours) {
  const year=new Date(date+'T12:00:00').getFullYear();
  const yearLog=(state.absenceLog[staffName]||[]).filter(e=>new Date(e.date+'T12:00:00').getFullYear()===year);
  const bankUsed=yearLog.filter(e=>e.type!=='tardy').reduce((s,e)=>s+e.hours,0);
  const tardyCount=yearLog.filter(e=>e.type==='tardy').length;
  if (type==='tardy'&&tardyCount>=TARDY_WRITEUP_COUNT) return {writeUp:true,writeUpReason:`Tardy #${tardyCount+1}`};
  if (type==='ncns') return {writeUp:true,writeUpReason:'No Call No Show'};
  if (type!=='tardy'&&bankUsed+hours>ANNUAL_BANK_HOURS) return {writeUp:true,writeUpReason:`Over ${ANNUAL_BANK_HOURS}hr bank (${bankUsed+hours}h)`};
  return {writeUp:false,writeUpReason:''};
}

function buildImportResult(imported,skipped,unmatched) {
  if (!imported) return {ok:false,msg:`❌ No records imported (${skipped} rows skipped). Check that the file is Attendance Action Detail or Attendance Incident Detail from UKG.`};
  let msg=`✅ Imported ${imported} record${imported>1?'s':''}`;
  if (skipped) msg+=` · ${skipped} skipped`;
  if (unmatched&&unmatched.size) msg+=` · Unmatched: ${[...unmatched].slice(0,4).join(', ')}${unmatched.size>4?'…':''}`;
  return {ok:true,msg};
}

// Stubs kept for legacy references
function addBlockedDay() {}
function renderBlockedDays() {}

// ══════════════════════════════════════════
// ABSENCE MANAGEMENT
// ══════════════════════════════════════════
const ANNUAL_BANK_HOURS = 56; // hours per year before write-up threshold
const TARDY_WRITEUP_COUNT = 3; // tardies before write-up

function absenceYearOptions() {
  const yr = new Date().getFullYear();
  return [yr-1, yr, yr+1].map(y => `<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('');
}

function initAbsenceTab() {
  const ySel = document.getElementById('absence-year-filter');
  if (ySel && !ySel.innerHTML) ySel.innerHTML = absenceYearOptions();
  const qYSel = document.getElementById('qual-year');
  if (qYSel && !qYSel.innerHTML) qYSel.innerHTML = absenceYearOptions();
  const qM = document.getElementById('qual-month');
  if (qM) qM.value = new Date().getMonth() + 1;

  // Populate staff select
  const sel = document.getElementById('abs-staff-sel');
  if (sel && sel.options.length <= 1) {
    sel.innerHTML = '<option value="">— Select —</option>' +
      MASTER_STAFF.filter(s=>s.job!=='NURSE MGR').map(s=>
        `<option value="${s.name}">${s.name} (${s.job})</option>`).join('');
  }
}

function updateAbsHoursField() {
  const type = document.getElementById('abs-type')?.value;
  const wrap = document.getElementById('abs-hours-wrap');
  if (wrap) wrap.style.display = type === 'tardy' ? 'none' : 'flex';
}

function addAbsence() {
  const name  = document.getElementById('abs-staff-sel')?.value;
  const date  = document.getElementById('abs-date')?.value;
  const type  = document.getElementById('abs-type')?.value || 'call';
  const hours = type === 'tardy' ? 0 : parseFloat(document.getElementById('abs-hours')?.value || 12);
  const note  = document.getElementById('abs-note')?.value.trim() || '';
  if (!name || !date) { alert('Select a staff member and date.'); return; }

  if (!state.absenceLog[name]) state.absenceLog[name] = [];
  const year = new Date(date+'T12:00:00').getFullYear();

  // Check if write-up triggered
  const yearLog = state.absenceLog[name].filter(e => new Date(e.date+'T12:00:00').getFullYear() === year);
  const bankUsed = yearLog.filter(e=>e.type!=='tardy').reduce((s,e)=>s+e.hours, 0);
  const tardyCount = yearLog.filter(e=>e.type==='tardy').length;
  let writeUp = false;
  let writeUpReason = '';

  if (type === 'tardy') {
    if (tardyCount >= TARDY_WRITEUP_COUNT) { writeUp = true; writeUpReason = `Tardy #${tardyCount+1} — exceeded ${TARDY_WRITEUP_COUNT} tardy limit`; }
  } else {
    const newTotal = bankUsed + hours;
    if (newTotal > ANNUAL_BANK_HOURS && bankUsed <= ANNUAL_BANK_HOURS) {
      writeUp = true; writeUpReason = `Exceeded ${ANNUAL_BANK_HOURS}hr annual bank (${newTotal}h used)`;
    } else if (bankUsed > ANNUAL_BANK_HOURS) {
      writeUp = true; writeUpReason = `Already over bank — ${bankUsed+hours}h used of ${ANNUAL_BANK_HOURS}h`;
    }
    if (type === 'ncns') { writeUp = true; writeUpReason = 'No Call No Show — automatic write-up'; }
  }

  const entry = { date, type, hours, note, writeUp, writeUpReason, ts: Date.now() };
  state.absenceLog[name].push(entry);
  state.absenceLog[name].sort((a,b)=>a.date.localeCompare(b.date));

  persistSave();
  document.getElementById('abs-note').value = '';
  renderAbsenceTab();
  showSaveBanner(writeUp
    ? `⚠️ Write-up triggered for ${name.split(',')[0]}`
    : `✓ Absence logged for ${name.split(',')[0]}`);
}

function deleteAbsence(name, ts) {
  if (!state.absenceLog[name]) return;
  state.absenceLog[name] = state.absenceLog[name].filter(e => e.ts !== ts);
  if (!state.absenceLog[name].length) delete state.absenceLog[name];
  persistSave();
  renderAbsenceTab();
}

function initQualityYears() {
  const yr = new Date().getFullYear();
  const opts = [yr-1,yr,yr+1].map(y=>`<option value="${y}" ${y===yr?"selected":""}>${y}</option>`).join("");
  const qs = document.getElementById("qual-year"); if(qs && !qs.innerHTML) qs.innerHTML = opts;
  const as = document.getElementById("absence-year-filter"); if(as && !as.innerHTML) as.innerHTML = opts;
}

function purgeOldAbsences() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  let purged = 0;
  Object.keys(state.absenceLog).forEach(name => {
    const before = state.absenceLog[name].length;
    state.absenceLog[name] = state.absenceLog[name].filter(e => e.date >= cutoffStr);
    purged += before - state.absenceLog[name].length;
    if (!state.absenceLog[name].length) delete state.absenceLog[name];
  });
  persistSave();
  renderAbsenceTab();
  showSaveBanner(`🗑 Purged ${purged} absence record${purged!==1?'s':''} older than ${cutoffStr}`);
}

function renderAbsenceKPI(year, roleFilter) {
  const el = document.getElementById('absence-kpi');
  if (!el) return;
  // Only render if absence panel is active
  const panel = document.getElementById('panel-absence');
  if (!panel || !panel.classList.contains('active')) return;
  const now = new Date();
  const staff = MASTER_STAFF.filter(s =>
    s.job !== 'NURSE MGR' && (roleFilter === 'ALL' || s.job === roleFilter)
  );
  let totalCallOuts=0, totalHours=0, totalTardies=0, totalNCNS=0, totalWriteUps=0;
  let staffWithOccurrences=0, staffOverBank=0;
  const monthTrend = {};
  staff.forEach(s => {
    const log = (state.absenceLog[s.name]||[]).filter(e =>
      new Date(e.date+'T12:00:00').getFullYear() === year
    );
    if (!log.length) return;
    staffWithOccurrences++;
    const absLog = log.filter(e=>e.type!=='tardy');
    const hrs = absLog.reduce((s,e)=>s+e.hours,0);
    totalCallOuts += absLog.length;
    totalTardies  += log.filter(e=>e.type==='tardy').length;
    totalNCNS     += log.filter(e=>e.type==='ncns').length;
    totalHours    += hrs;
    totalWriteUps += log.filter(e=>e.writeUp).length;
    if (hrs > ANNUAL_BANK_HOURS) staffOverBank++;
    log.forEach(e => {
      const mo = e.date.slice(0,7);
      monthTrend[mo] = (monthTrend[mo]||0) + 1;
    });
  });
  const avgHrs = staffWithOccurrences > 0 ? (totalHours/staffWithOccurrences).toFixed(1) : 0;
  const attRate = staff.length > 0 ? Math.round((1 - staffWithOccurrences/staff.length)*100) : 100;
  const ranked = staff.map(s => {
    const log = (state.absenceLog[s.name]||[]).filter(e=>new Date(e.date+'T12:00:00').getFullYear()===year);
    return { name:s.name.split(',')[0], hrs:log.filter(e=>e.type!=='tardy').reduce((a,e)=>a+e.hours,0), count:log.length };
  }).filter(s=>s.count>0).sort((a,b)=>b.hrs-a.hrs).slice(0,5);
  const months6 = [];
  for (let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    months6.push({ label:d.toLocaleString('en-US',{month:'short'}), count:monthTrend[key]||0 });
  }
  const maxCount = Math.max(...months6.map(m=>m.count), 1);
  function attColor(r) { return r>=90?'var(--green2)':r>=80?'var(--amber2)':'var(--red2)'; }

  // Build KPI cards
  const cards = [
    { icon:'📵', label:'Call-Outs',       val:totalCallOuts,    color:'var(--amber2)',   sub:year },
    { icon:'⏰', label:'Tardies',          val:totalTardies,     color:'var(--accent2)',  sub:year },
    { icon:'🚫', label:'No Call/No Show',  val:totalNCNS,        color:'var(--red2)',     sub:year },
    { icon:'⚠️', label:'Write-Ups',        val:totalWriteUps,    color:'var(--red2)',     sub:year },
    { icon:'🏦', label:'Hours Lost',       val:totalHours+'h',   color:'var(--amber2)',   sub:'56h bank/person' },
    { icon:'👥', label:'Over Bank',        val:staffOverBank,    color:staffOverBank>0?'var(--red2)':'var(--green2)', sub:'staff over 56h' },
    { icon:'📈', label:'Attendance Rate',  val:attRate+'%',      color:attColor(attRate), sub:'no absences' },
    { icon:'⚡', label:'Avg Hrs/Staff',    val:avgHrs+'h',       color:'var(--text2)',    sub:'affected staff' },
  ];

  let html = '';
  cards.forEach(k => {
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;">';
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:4px;">'+k.icon+' '+k.label+'</div>';
    html += '<div style="font-size:26px;font-weight:700;color:'+k.color+';line-height:1;">'+k.val+'</div>';
    html += '<div style="font-size:10px;color:var(--text3);margin-top:3px;">'+k.sub+'</div>';
    html += '</div>';
  });

  // Monthly trend chart
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;grid-column:span 2;">';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">📅 Monthly Trend (occurrences)</div>';
  html += '<div style="display:flex;align-items:flex-end;gap:4px;height:52px;">';
  months6.forEach(m => {
    const h = Math.max(4, Math.round((m.count/maxCount)*40));
    const col = m.count===0?'rgba(255,255,255,0.1)':m.count>5?'var(--red2)':m.count>2?'var(--amber2)':'var(--green2)';
    html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">';
    html += '<div style="font-size:9px;color:var(--text3);">'+(m.count||'')+'</div>';
    html += '<div style="height:'+h+'px;background:'+col+';border-radius:3px 3px 0 0;width:100%;min-width:18px;"></div>';
    html += '<div style="font-size:9px;color:var(--text3);">'+m.label+'</div>';
    html += '</div>';
  });
  html += '</div></div>';

  // Top 5 most absent
  if (ranked.length) {
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;grid-column:span 2;">';
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">🏆 Most Absent (hours) — '+year+'</div>';
    ranked.forEach((s,i) => {
      const pct = Math.min(100, Math.round(s.hrs/ANNUAL_BANK_HOURS*100));
      const col = s.hrs>ANNUAL_BANK_HOURS?'var(--red2)':s.hrs>ANNUAL_BANK_HOURS*0.75?'var(--amber2)':'var(--accent2)';
      html += '<div style="margin-bottom:7px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;">';
      html += '<span>'+(i+1)+'. '+s.name+'</span>';
      html += '<span style="color:'+col+';">'+s.hrs+'h / '+ANNUAL_BANK_HOURS+'h bank</span>';
      html += '</div>';
      html += '<div style="background:rgba(255,255,255,0.08);border-radius:3px;height:6px;">';
      html += '<div style="width:'+pct+'%;background:'+col+';height:6px;border-radius:3px;"></div>';
      html += '</div></div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

function renderAbsenceDowCharts() {
  const el = document.getElementById('absence-dow-charts');
  if (!el) return;

  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const CALL_TYPES = new Set(['call','calledoff','NCNS','ncns','sick','family','other','call-out']);
  const ROLES = ['RN','LPN','CA'];
  const ROLE_COLORS = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)' };
  const ROLE_BG     = { RN:'rgba(46,125,209,', LPN:'rgba(139,92,246,', CA:'rgba(6,182,212,' };

  const now   = new Date();
  const cut30  = new Date(now); cut30.setDate(now.getDate()-30);
  const cut365 = new Date(now); cut365.setDate(now.getDate()-365);
  const cut30s  = cut30.toISOString().split('T')[0];
  const cut365s = cut365.toISOString().split('T')[0];

  // Build counts: { role: { period: { dow: count } } }
  const counts = {};
  ROLES.forEach(role => {
    counts[role] = { d30: [0,0,0,0,0,0,0], d365: [0,0,0,0,0,0,0] };
  });

  MASTER_STAFF.forEach(s => {
    if (!ROLES.includes(s.job)) return;
    (state.absenceLog[s.name] || []).forEach(e => {
      if (!CALL_TYPES.has(e.type)) return;
      if (!e.date) return;
      const dow = new Date(e.date + 'T12:00:00').getDay();
      if (e.date >= cut365s) counts[s.job].d365[dow]++;
      if (e.date >= cut30s)  counts[s.job].d30[dow]++;
    });
  });

  function buildHeatBar(roleCounts, period, role) {
    const data = roleCounts[period];
    const max  = Math.max(...data, 1);
    const total = data.reduce((a,b)=>a+b,0);
    const bg   = ROLE_BG[role];
    const col  = ROLE_COLORS[role];

    return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">
      ${DAYS.map((d,i) => {
        const count = data[i];
        const pct   = count / max;
        const opacity = count === 0 ? 0.06 : 0.1 + pct * 0.8;
        const isWE  = i === 0 || i === 5 || i === 6; // Sun/Fri/Sat
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
          <div style="width:100%;border-radius:6px;padding:8px 4px;text-align:center;
            background:${bg}${opacity.toFixed(2)});
            border:1px solid ${bg}${(opacity+0.15).toFixed(2)});
            ${isWE?'border-top:2px solid '+col+';':''}"
            title="${d}: ${count} call-in${count!==1?'s':''}">
            <div style="font-size:15px;font-weight:700;color:${count>0?col:'var(--text3)'};">${count}</div>
          </div>
          <div style="font-size:9px;color:${isWE?col:'var(--text3)'};font-weight:${isWE?'700':'400'};">${d}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:9px;color:var(--text3);">
      <span>${total} total call-in${total!==1?'s':''}</span>
      <span>Weekend days (Fri/Sat/Sun) highlighted</span>
    </div>`;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:8px;">
      ${ROLES.map(role => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-left:3px solid ${ROLE_COLORS[role]};border-radius:8px;padding:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:11px;font-weight:700;color:${ROLE_COLORS[role]};">${role} — Last 30 Days</span>
            <span style="font-size:9px;color:var(--text3);">${cut30.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – Today</span>
          </div>
          ${buildHeatBar(counts[role],'d30',role)}
        </div>`).join('')}
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.08);margin:8px 0;"></div>
    <div style="font-size:11px;font-weight:700;color:var(--white);margin-bottom:12px;">📆 Last 365 Days</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      ${ROLES.map(role => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-left:3px solid ${ROLE_COLORS[role]};border-radius:8px;padding:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:11px;font-weight:700;color:${ROLE_COLORS[role]};">${role} — Last 365 Days</span>
            <span style="font-size:9px;color:var(--text3);">${cut365.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} – Today</span>
          </div>
          ${buildHeatBar(counts[role],'d365',role)}
        </div>`).join('')}
    </div>`;
}

function renderAbsenceTab() {
  // Only render if the absence panel is currently active
  const panel = document.getElementById('panel-absence');
  if (!panel || !panel.classList.contains('active')) return;

  // Update last-entered date badge
  (function() {
    const badge = document.getElementById('absence-last-entered');
    if (!badge) return;
    let latestTs = 0, latestDate = '';
    Object.values(state.absenceLog || {}).forEach(entries => {
      (entries || []).forEach(e => {
        if ((e.ts || 0) > latestTs) { latestTs = e.ts; latestDate = e.date; }
      });
    });
    if (latestDate) {
      const d = new Date(latestDate + 'T12:00:00');
      const fmt = d.toLocaleDateString('en-US', {month:'2-digit', day:'2-digit', year:'numeric'});
      badge.textContent = 'Last entered: ' + fmt;
      badge.style.color = 'var(--amber2)';
    } else {
      badge.textContent = 'Last entered: —';
      badge.style.color = 'var(--text2)';
    }
  })();

  initAbsenceTab();

  // Ensure filter selects use event listeners not inline onchange
  ['absence-role-filter','absence-year-filter'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && !sel._absListenerAdded) {
      sel._absListenerAdded = true;
      sel.addEventListener('change', () => {
        if (document.getElementById('panel-absence')?.classList.contains('active')) renderAbsenceTab();
      });
    }
  });
  const el = document.getElementById('absence-staff-list');
  if (!el) return;
  const roleFilter = document.getElementById('absence-role-filter')?.value || 'ALL';
  const year = parseInt(document.getElementById('absence-year-filter')?.value || new Date().getFullYear());
  // Auto-purge records older than 1 year
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear()-1);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  let autoPurged = 0;
  Object.keys(state.absenceLog).forEach(name => {
    const before = (state.absenceLog[name]||[]).length;
    state.absenceLog[name] = (state.absenceLog[name]||[]).filter(e => e.date >= cutoffStr);
    autoPurged += before - state.absenceLog[name].length;
    if (!state.absenceLog[name].length) delete state.absenceLog[name];
  });
  if (autoPurged > 0) persistSave();
  renderAbsenceKPI(year, roleFilter);
  const TYPE_INFO = {
    call:  { icon:'📵', label:'Call-Out',       color:'var(--amber2)' },
    tardy: { icon:'⏰', label:'Tardy',           color:'var(--accent2)' },
    ncns:  { icon:'🚫', label:'No Call/No Show', color:'var(--red2)' },
    early: { icon:'🚪', label:'Left Early',      color:'var(--teal2)' },
  };
  const staff = MASTER_STAFF.filter(s => s.job !== 'NURSE MGR' && (roleFilter === 'ALL' || s.job === roleFilter));
  el.innerHTML = staff.map(s => {
    const log = (state.absenceLog[s.name]||[]).filter(e => new Date(e.date+'T12:00:00').getFullYear()===year);
    const absHours = log.filter(e=>e.type!=='tardy').reduce((sum,e)=>sum+e.hours,0);
    const tardyCount = log.filter(e=>e.type==='tardy').length;
    const writeUps = log.filter(e=>e.writeUp).length;
    const bankLeft = Math.max(0, ANNUAL_BANK_HOURS-absHours);
    const overBank = absHours > ANNUAL_BANK_HOURS;
    const safe = s.name.replace(/'/g,"\\'");
    if (!log.length) return `<div class="card" style="margin-bottom:6px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;"><span onclick="openEmployeeHub('${safe}')" style="cursor:pointer;font-weight:600;font-size:12px;text-decoration:underline dotted;text-underline-offset:2px;">${s.name}</span><span style="font-size:10px;color:var(--text3);">${s.job}</span></div>
      <span style="font-size:10px;color:var(--green2);">✓ No occurrences in ${year}</span></div>`;
    return `<div class="card" style="margin-bottom:12px;padding:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span onclick="openEmployeeHub('${safe}')" style="cursor:pointer;font-weight:700;font-size:13px;text-decoration:underline dotted;text-underline-offset:2px;">${s.name}</span>
          <span style="font-size:10px;color:var(--text3);">${s.job}</span>
          ${writeUps>0?`<span style="background:rgba(179,35,24,0.2);color:var(--red2);border:1px solid rgba(179,35,24,0.4);border-radius:4px;padding:1px 8px;font-size:10px;font-weight:700;">⚠ ${writeUps} Write-Up${writeUps>1?'s':''}</span>`:''}
        </div>
        <div style="display:flex;gap:10px;font-size:11px;">
          <span style="color:${overBank?'var(--red2)':'var(--green2)'};">🏦 ${bankLeft}h left / ${ANNUAL_BANK_HOURS}h (${absHours}h used)</span>
          ${tardyCount>0?`<span style="color:${tardyCount>=TARDY_WRITEUP_COUNT?'var(--red2)':'var(--amber2)'};">⏰ Tardies: ${tardyCount}/${TARDY_WRITEUP_COUNT}</span>`:''}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead class="sticky-thead"><tr style="background:var(--card);">
          <th style="padding:4px 8px;text-align:left;color:var(--text3);">Date</th>
          <th style="padding:4px 8px;text-align:left;color:var(--text3);">Type</th>
          <th style="padding:4px 8px;text-align:center;color:var(--text3);">Hours</th>
          <th style="padding:4px 8px;text-align:left;color:var(--text3);">Note</th>
          <th style="padding:4px 8px;text-align:center;color:var(--text3);">Write-Up</th>
          <th></th>
        </tr></thead>
        <tbody>${log.map(e => {
          const ti = TYPE_INFO[e.type]||TYPE_INFO.call;
          const dt = new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
          return `<tr style="border-top:1px solid rgba(255,255,255,0.06);">
            <td style="padding:4px 8px;font-family:'IBM Plex Mono',monospace;">${dt}</td>
            <td style="padding:4px 8px;"><span style="color:${ti.color};">${ti.icon} ${ti.label}</span></td>
            <td style="padding:4px 8px;text-align:center;">${e.hours||'—'}</td>
            <td style="padding:4px 8px;color:var(--text3);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.note||''}</td>
            <td style="padding:4px 8px;text-align:center;">${e.writeUp?`<span style="color:var(--red2);font-weight:700;" title="${e.writeUpReason||''}">⚠ YES</span>`:'<span style="color:var(--text3);">—</span>'}</td>
            <td><button onclick="deleteAbsence('${safe}',${e.ts})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;">✕</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  }).join('');
}


// ── Absence dedup: don't show same date more than once per type ──
// (handled in renderAbsenceTab by grouping)

// ══════════════════════════════════════════
// STROKE KPI + PRESS GANEY + UNIT GOALS
// ══════════════════════════════════════════
function initStrokeYears() {
  const yr = new Date().getFullYear();
  const opts = [yr-1,yr,yr+1].map(y=>'<option value="'+y+'"'+(y===yr?' selected':'')+'>'+y+'</option>').join('');
  const sy = document.getElementById('stroke-year');
  if (sy && !sy.innerHTML) sy.innerHTML = opts;
  const sm = document.getElementById('stroke-month');
  if (sm && !sm.value) sm.value = new Date().getMonth()+1;
  const ry = document.getElementById('review-year');
  if (ry && !ry.innerHTML) ry.innerHTML = opts;
  // Always repopulate staff select, preserving current selection
  const rs = document.getElementById('review-staff');
  if (rs) {
    const prev = rs.value;
    rs.innerHTML = '<option value="">— Select Staff —</option>' +
      MASTER_STAFF.filter(s=>s.job!=='NURSE MGR').map(s=>'<option value="'+s.name+'">'+s.name+' ('+s.job+')</option>').join('');
    if (prev) rs.value = prev;
  }
}

function saveStrokeField(field, val) {
  const yr = parseInt(document.getElementById('stroke-year')?.value || new Date().getFullYear());
  const mo = parseInt(document.getElementById('stroke-month')?.value || new Date().getMonth()+1);
  const key = yr+'-'+String(mo).padStart(2,'0');
  if (!state.strokeKPI[key]) state.strokeKPI[key] = {};
  state.strokeKPI[key][field] = val;
  persistSave();
}

function savePGField(field, val) {
  const yr = parseInt(document.getElementById('stroke-year')?.value || new Date().getFullYear());
  const mo = parseInt(document.getElementById('stroke-month')?.value || new Date().getMonth()+1);
  const key = yr+'-'+String(mo).padStart(2,'0');
  if (!state.pressGaney[key]) state.pressGaney[key] = {};
  state.pressGaney[key][field] = val;
  persistSave();
}

function saveGoalField(field, val) {
  const yr = parseInt(document.getElementById('stroke-year')?.value || new Date().getFullYear());
  if (!state.unitGoals[yr]) state.unitGoals[yr] = {};
  state.unitGoals[yr][field] = val;
  persistSave();
}

function renderStrokeTab() {
  initStrokeYears();
  const el = document.getElementById('stroke-content');
  if (!el) return;
  const yr  = parseInt(document.getElementById('stroke-year')?.value  || new Date().getFullYear());
  const mo  = parseInt(document.getElementById('stroke-month')?.value || new Date().getMonth()+1);
  const key = yr+'-'+String(mo).padStart(2,'0');
  const MON = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
  const sk  = state.strokeKPI[key]   || {};
  const pg  = state.pressGaney[key]  || {};
  const goals = state.unitGoals[yr]  || {};

  function inp(id, field, val, placeholder, saveFn, type) {
    type = type||'number';
    return '<input id="'+id+'" type="'+type+'" value="'+(val||'')+'" placeholder="'+(placeholder||'')+'" '+
      'oninput="'+saveFn+'(\''+field+'\',this.value)" '+
      'style="width:90px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:3px 6px;text-align:center;font-size:11px;">';
  }
  function pctBadge(num, den, target) {
    if (!den) return '<span style="color:var(--text3);">—</span>';
    const p = Math.round(num/den*100);
    const col = target ? (p>=target?'var(--green2)':p>=target-5?'var(--amber2)':'var(--red2)') : 'var(--accent2)';
    return '<span style="font-weight:700;color:'+col+';">'+p+'%</span>';
  }

  let html = '';

  // ── Unit Goals (annual) ──
  html += '<div class="card" style="margin-bottom:14px;padding:16px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--white);">🎯 Unit Goals — '+yr+'</div>';
  html += '<span style="font-size:10px;color:var(--text3);">Updates annually · shared across all months</span></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px;">';
  [
    {label:'💊 Scan % Target',   field:'scanTarget',   unit:'%',  val:goals.scanTarget},
    {label:'💔 Pain Reassess %', field:'painTarget',   unit:'%',  val:goals.painTarget},
    {label:'📈 Press Ganey',     field:'pgTarget',     unit:'',   val:goals.pgTarget},
    {label:'🎯 Custom Goal 1',   field:'custom1',      unit:'',   val:goals.custom1},
    {label:'🎯 Custom Goal 2',   field:'custom2',      unit:'',   val:goals.custom2},
  ].forEach(g => {
    html += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px 12px;">';
    html += '<div style="font-size:10px;color:var(--text3);margin-bottom:4px;">'+g.label+'</div>';
    html += inp('goal-'+g.field, g.field, g.val, g.unit?'e.g. 95'+g.unit:'Enter goal', 'saveGoalField', 'text');
    html += '</div>';
  });
  html += '</div>';
  html += '<div style="margin-top:8px;">';
  html += '<div style="font-size:10px;color:var(--text3);margin-bottom:4px;">📝 Annual goals / narrative</div>';
  html += '<textarea oninput="saveGoalField(\'goalText\',this.value)" placeholder="Describe unit goals, priorities, focus areas for '+yr+'..." '+
    'style="width:100%;height:70px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:6px;padding:8px;font-size:11px;resize:vertical;">'+
    (goals.goalText||'')+'</textarea>';
  html += '</div></div>';

  // ── Stroke Metrics ──
  html += '<div class="card" style="margin-bottom:14px;padding:16px;">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:12px;">🧠 Stroke Metrics — '+MON[mo]+' '+yr+'</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">';

  const jcMeasures = [
    { label:'VTE Prophylaxis',           field:'vte',          goal:95, numNote:'Patients compliant',                         denNote:'Eligible stroke patients'               },
    { label:'Antithrombotic at Discharge',field:'antiDischarge',goal:95, numNote:'Discharged on therapy',                     denNote:'Eligible ischemic stroke/TIA patients'  },
    { label:'Anticoagulation for A-Fib', field:'antiAfib',     goal:95, numNote:'Plan/med ordered',                          denNote:'Ischemic stroke + A-fib/flutter'        },
    { label:'Antithrombotic by Day 2',   field:'antiDay2',     goal:95, numNote:'Receiving therapy by day 2',                 denNote:'Eligible ischemic stroke patients'      },
    { label:'Statin at Discharge',       field:'statin',       goal:95, numNote:'Discharged on statin',                      denNote:'Eligible ischemic stroke/TIA patients'  },
    { label:'Stroke Education',          field:'strokeEdu',    goal:95, numNote:'Education completed',                       denNote:'Eligible stroke patients'               },
    { label:'Rehab Assessment',          field:'rehabAssess',  goal:95, numNote:'Rehab assessment completed',                denNote:'Eligible stroke patients'               },
  ];

  html += '<div class="card" style="margin-bottom:14px;padding:16px;">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:12px;">📐 Joint Commission Stroke Measures — '+MON[mo]+' '+yr+'</div>';
  html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;">';
  html += '<thead class="sticky-thead"><tr style="background:rgba(255,255,255,0.06);">';
  html += '<th style="padding:8px 10px;text-align:left;color:var(--text3);">Measure</th>';
  html += '<th style="padding:8px 6px;text-align:center;color:var(--text3);">Numerator</th>';
  html += '<th style="padding:8px 6px;text-align:center;color:var(--text3);">Denominator</th>';
  html += '<th style="padding:8px 6px;text-align:center;color:var(--text3);">%</th>';
  html += '<th style="padding:8px 6px;text-align:center;color:var(--text3);">Goal</th>';
  html += '<th style="padding:8px 6px;text-align:center;color:var(--text3);">Status</th>';
  html += '</tr></thead><tbody>';
  jcMeasures.forEach((m, i) => {
    const numVal = parseInt(sk[m.field+'Num'])||0;
    const denVal = parseInt(sk[m.field+'Den'])||0;
    const pct    = denVal > 0 ? Math.round(numVal/denVal*100) : null;
    const col    = pct===null ? 'var(--text3)' : pct>=m.goal ? 'var(--green2)' : pct>=m.goal-5 ? 'var(--amber2)' : 'var(--red2)';
    const status = pct===null ? '—' : pct>=m.goal ? '✓ Met' : '⚠ Below';
    const rb     = i%2 ? '' : 'rgba(255,255,255,0.02)';
    html += '<tr style="background:'+rb+';border-bottom:1px solid rgba(255,255,255,0.05);">';
    html += '<td style="padding:6px 10px;font-weight:600;">'+m.label+'</td>';
    const numId = m.field+'Num', denId = m.field+'Den';
    html += '<td style="padding:6px 6px;text-align:center;">';
    html += '<input type="number" min="0" value="'+(sk[numId]||'')+'" placeholder="0" oninput="saveStrokeField(\'' + numId + '\',this.value)" title="'+m.numNote+'" style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:10px;">';
    html += '</td><td style="padding:6px 6px;text-align:center;">';
    html += '<input type="number" min="0" value="'+(sk[denId]||'')+'" placeholder="0" oninput="saveStrokeField(\'' + denId + '\',this.value)" title="'+m.denNote+'" style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:10px;">';
    html += '</td><td style="padding:6px 6px;text-align:center;font-weight:700;font-size:12px;color:'+col+';">'+(pct!==null?pct+'%':'—')+'</td>';
    html += '<td style="padding:6px 6px;text-align:center;font-size:10px;color:var(--text3);">≥'+m.goal+'%</td>';
    html += '<td style="padding:6px 6px;text-align:center;font-size:10px;color:'+col+';">'+status+'</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';

  // ── Clinical Stroke Metrics ──
  html += '<div class="card" style="margin-bottom:14px;padding:16px;">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:12px;">🧠 Clinical Stroke Metrics — '+MON[mo]+' '+yr+'</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">';
  [
   {label:'tPA Administered',      field:'tPA',          unit:'count',  val:sk.tPA,          note:'Number of tPA doses given'},
    {label:'Thrombectomy',          field:'thrombectomy', unit:'count',  val:sk.thrombectomy,  note:'Mechanical thrombectomy cases'},
    {label:'Avg NIHSS on Admit',    field:'nihss',        unit:'score',  val:sk.nihss,         note:'Avg NIH Stroke Scale at admission'},
    {label:'Door-to-Needle (min)',  field:'doorToNeedle', unit:'min',    val:sk.doorToNeedle,  note:'Avg door-to-needle time'},
    {label:'Door-to-Puncture (min)',field:'doorToPuncture',unit:'min',   val:sk.doorToPuncture,note:'Avg door-to-puncture time'},
    {label:'Discharge Edu Given',   field:'dischargeEdu', unit:'count',  val:sk.dischargeEdu,  note:'Patients receiving stroke discharge education'},
    {label:'Stroke Patients Total', field:'strokeTotal',  unit:'count',  val:sk.strokeTotal,   note:'Total stroke patients this month'},
    {label:'30-Day Readmissions',   field:'readmissions', unit:'count',  val:sk.readmissions,  note:'Stroke readmissions within 30 days'},
    {label:'Patient Falls (Unit)',   field:'falls',        unit:'count',  val:sk.falls,         note:'Total patient falls on 3B this month'},
    {label:'HAPIs (Pressure Injuries)',field:'hapis',     unit:'count',  val:sk.hapis,         note:'Hospital-acquired pressure injuries this month'},
  ].forEach(m => {
    html += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;">';
    html += '<div style="font-size:10px;color:var(--text3);margin-bottom:2px;">'+m.label+'</div>';
    html += '<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:6px;">'+m.note+'</div>';
    html += inp('sk-'+m.field, m.field, m.val, m.unit, 'saveStrokeField');
    html += '</div>';
  });
  html += '</div></div>';

  // ── Quality tie-in ──
  const qualKey = yr+'-'+String(mo).padStart(2,'0');
  const qStaff = MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN');
  let tS=0,tST=0,tP=0,tPT=0,tTx=0;
  qStaff.forEach(s=>{const q=((state.qualityData[s.name]||{})[qualKey])||{};tS+=q.scans||0;tST+=q.scanTotal||0;tP+=q.pain||0;tPT+=q.painTotal||0;tTx+=q.transfusions||0;});
  const sP = tST>0?Math.round(tS/tST*100):null;
  const pP = tPT>0?Math.round(tP/tPT*100):null;
  html += '<div class="card" style="margin-bottom:14px;padding:16px;">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:12px;">📊 Quality Metrics — '+MON[mo]+' '+yr+'</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">';
  [
    {icon:'💊',label:'Scan %',  val:sP!==null?sP+'%':'—', target:goals.scanTarget, col:sP===null?'var(--text3)':sP>=(goals.scanTarget||95)?'var(--green2)':sP>=(goals.scanTarget||95)-5?'var(--amber2)':'var(--red2)'},
    {icon:'💔',label:'Pain Reassess %',val:pP!==null?pP+'%':'—',target:goals.painTarget,col:pP===null?'var(--text3)':pP>=(goals.painTarget||90)?'var(--green2)':pP>=(goals.painTarget||90)-5?'var(--amber2)':'var(--red2)'},
    {icon:'🩸',label:'Blood Transfusions',val:tTx,col:'var(--accent2)'},
  ].forEach(k=>{
    html += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;text-align:center;">';
    html += '<div style="font-size:10px;color:var(--text3);">'+k.icon+' '+k.label+'</div>';
    html += '<div style="font-size:28px;font-weight:700;color:'+k.col+';margin:4px 0;">'+k.val+'</div>';
    if (k.target) html += '<div style="font-size:9px;color:var(--text3);">Goal: '+k.target+(k.label.includes('%')?'%':'')+'</div>';
    html += '</div>';
  });
  html += '</div></div>';

  // ── Press Ganey ──
  html += '<div class="card" style="margin-bottom:14px;padding:16px;">';
  html += '<div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:12px;">⭐ Press Ganey — '+MON[mo]+' '+yr+'</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;">';
  [
    {label:'Overall Score',          field:'overall',         note:'Overall patient satisfaction (0-100)'},
    {label:'Likelihood to Recommend',field:'recommend',       note:'Would recommend hospital (0-100)'},
    {label:'Nurse Communication',    field:'communication',   note:'Nurse communication score (0-100)'},
    {label:'Responsiveness',         field:'responsiveness',  note:'Staff responsiveness (0-100)'},
    {label:'Pain Management',        field:'pain',            note:'Pain management score (0-100)'},
    {label:'Quiet at Night',         field:'quietness',       note:'Quiet environment score (0-100)'},
    {label:'Room Cleanliness',       field:'cleanliness',     note:'Room cleanliness score (0-100)'},
    {label:'National Percentile',    field:'percentile',      note:'Overall national ranking (1-99)'},
  ].forEach(m => {
    const val = pg[m.field];
    const numVal = parseFloat(val)||0;
    const pgGoal = parseFloat(goals.pgTarget)||0;
    const col = !val?'var(--text3)':numVal>=(pgGoal||80)?'var(--green2)':numVal>=(pgGoal||80)-5?'var(--amber2)':'var(--red2)';
    html += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;">';
    html += '<div style="font-size:10px;color:var(--text3);margin-bottom:2px;">'+m.label+'</div>';
    html += '<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:5px;">'+m.note+'</div>';
    html += '<div style="display:flex;align-items:center;gap:6px;">';
    html += inp('pg-'+m.field, m.field, val, '0-100', 'savePGField');
    if (val) html += '<span style="font-weight:700;font-size:13px;color:'+col+';">'+numVal+'</span>';
    html += '</div></div>';
  });
  html += '</div></div>';

  el.innerHTML = html;
}

function printStrokeKPI() {
  const yr  = parseInt(document.getElementById('stroke-year')?.value  || new Date().getFullYear());
  const mo  = parseInt(document.getElementById('stroke-month')?.value || new Date().getMonth()+1);
  const MON = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
  const key = yr+'-'+String(mo).padStart(2,'0');
  const sk  = state.strokeKPI[key]  || {};
  const pg  = state.pressGaney[key] || {};
  const goals = state.unitGoals[yr] || {};
  const qualStaff = MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN');
  let tS=0,tST=0,tP=0,tPT=0,tTx=0;
  qualStaff.forEach(s=>{const q=((state.qualityData[s.name]||{})[key])||{};tS+=q.scans||0;tST+=q.scanTotal||0;tP+=q.pain||0;tPT+=q.painTotal||0;tTx+=q.transfusions||0;});
  const sP=tST>0?Math.round(tS/tST*100):null;
  const pP=tPT>0?Math.round(tP/tPT*100):null;

  function row(label, val, goal) {
    return '<tr><td style="padding:5px 10px;border-bottom:1px solid #eee;font-weight:600;">'+label+'</td>'+
      '<td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:center;">'+(val||'—')+'</td>'+
      '<td style="padding:5px 10px;border-bottom:1px solid #eee;text-align:center;color:#666;">'+(goal||'—')+'</td></tr>';
  }

  const w = window.open('','_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write('<!DOCTYPE html><html><head><title>3B KPI Report '+MON[mo]+' '+yr+'</title><style>'+
    'body{font-family:Arial,sans-serif;font-size:10pt;margin:20px;color:#111}'+
    'h1{font-size:14pt;margin-bottom:2px}h2{font-size:11pt;background:#1a3a5c;color:#fff;padding:4px 10px;margin:14px 0 6px}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:10px}'+
    'th{background:#f0f4ff;padding:5px 10px;text-align:left;font-size:9pt}'+
    '@page{size:letter;margin:0.5in}@media print{.no-print{display:none}}'+
    '</style></head><body>'+
    '<h1>🏥 3B Tele Med Surg — Unit KPI Report</h1>'+
    '<div style="font-size:9pt;color:#666;margin-bottom:12px;">'+MON[mo]+' '+yr+' &nbsp;·&nbsp; Printed '+new Date().toLocaleDateString()+'</div>'+

    '<h2>🎯 Unit Goals — '+yr+'</h2>'+
    (goals.goalText?'<p style="font-size:9pt;padding:0 10px;margin-bottom:8px;">'+goals.goalText+'</p>':'')+
    '<table><thead><tr><th>Goal</th><th>Target</th></tr></thead><tbody>'+
    (goals.scanTarget?row('💊 Scan %',goals.scanTarget+'%',''):'')+''+
    (goals.painTarget?row('💔 Pain Reassessment %',goals.painTarget+'%',''):'')+''+
    (goals.pgTarget?row('⭐ Press Ganey',goals.pgTarget,''):'')+''+
    (goals.strokeTarget?row('🧠 tPA Rate',goals.strokeTarget+'%',''):'')+''+
    (goals.custom1?row('🎯 Goal 1',goals.custom1,''):'')+''+
    (goals.custom2?row('🎯 Goal 2',goals.custom2,''):'')+'</tbody></table>'+

    '<h2>📊 Quality Metrics</h2>'+
    '<table><thead><tr><th>Metric</th><th>Actual</th><th>Goal</th></tr></thead><tbody>'+
    row('💊 Medication Scanning %', sP!==null?sP+'%':'—', goals.scanTarget?goals.scanTarget+'%':'—')+
    row('💔 Pain Reassessment %', pP!==null?pP+'%':'—', goals.painTarget?goals.painTarget+'%':'—')+
    row('🩸 Blood Transfusions', tTx, '—')+
    '</tbody></table>'+

    '<h2>🧠 Stroke Metrics</h2>'+
    '<table><thead><tr><th>Metric</th><th>Value</th><th>Benchmark</th></tr></thead><tbody>'+
    row('tPA Administered',sk.tPA||'—','')+''+row('Thrombectomy',sk.thrombectomy||'—','')+''+
    row('Avg NIHSS on Admit',sk.nihss||'—','')+''+row('Door-to-Needle (min)',sk.doorToNeedle||'—','≤60 min target')+''+
    row('Door-to-Puncture (min)',sk.doorToPuncture||'—','≤90 min target')+''+
    row('Discharge Education Given',sk.dischargeEdu||'—','')+''+row('Total Stroke Patients',sk.strokeTotal||'—','')+''+
    row('30-Day Readmissions',sk.readmissions||'—','')+
    '</tbody></table>'+

    '<h2>⭐ Press Ganey</h2>'+
    '<table><thead><tr><th>Domain</th><th>Score</th><th>Goal</th></tr></thead><tbody>'+
    row('Overall Score',pg.overall||'—',goals.pgTarget||'—')+
    row('Likelihood to Recommend',pg.recommend||'—','')+
    row('Nurse Communication',pg.communication||'—','')+
    row('Responsiveness',pg.responsiveness||'—','')+
    row('Pain Management',pg.pain||'—','')+
    row('Quiet at Night',pg.quietness||'—','')+
    row('Room Cleanliness',pg.cleanliness||'—','')+
    row('National Percentile',pg.percentile||'—','')+
    '</tbody></table>'+
    '</body></html>');
  w.document.close();
  setTimeout(()=>w.print(),500);
}

// ══════════════════════════════════════════
// YEAR REVIEW
// ══════════════════════════════════════════
function renderYearReview() {
  const el = document.getElementById('yearreview-content');
  if (!el) return;
  const name = document.getElementById('review-staff')?.value || '';
  const yr   = parseInt(document.getElementById('review-year')?.value || new Date().getFullYear());

  if (!name) {
    el.innerHTML = '<div style="color:var(--text3);text-align:center;padding:40px;">Select a staff member to view their annual review.</div>';
    return;
  }

  const s = MASTER_STAFF.find(x=>x.name===name) || {name,job:''};
  const rv = ((state.yearReview[name]||{})[yr]) || {};

  function saveRV(field,val) {
    if (!state.yearReview[name]) state.yearReview[name]={};
    if (!state.yearReview[name][yr]) state.yearReview[name][yr]={};
    state.yearReview[name][yr][field]=val;
    persistSave();
  }
  window._saveRV = saveRV;

  // Absence stats for year
  const absLog = (state.absenceLog[name]||[]).filter(e=>new Date(e.date+'T12:00:00').getFullYear()===yr);
  const absHrs = absLog.filter(e=>e.type!=='tardy').reduce((s,e)=>s+e.hours,0);
  const tardies = absLog.filter(e=>e.type==='tardy').length;
  const writeUps = absLog.filter(e=>e.writeUp).length;
  const ncns = absLog.filter(e=>e.type==='ncns').length;

  // Quality data for year (all months)
  let totScans=0,totScanT=0,totPain=0,totPainT=0,totTx=0,totTxNum=0,totTxDen=0,monthsTracked=0;
  const scanByMonth=[], painByMonth=[];
  for (let m=1;m<=12;m++) {
    const key = yr+'-'+String(m).padStart(2,'0');
    const q = ((state.qualityData[name]||{})[key])||{};
    if (q.scanTotal>0) { totScans+=q.scans||0; totScanT+=q.scanTotal||0; monthsTracked++; }
    if (q.painTotal>0) { totPain+=q.pain||0; totPainT+=q.painTotal||0; }
    totTx    += q.transfusions||0;
    totTxNum += q.txNum||0;
    totTxDen += q.txDen||0;
    scanByMonth.push({ m, pct: q.scanTotal>0?Math.round(q.scans/q.scanTotal*100):null });
    painByMonth.push({ m, pct: q.painTotal>0?Math.round(q.pain/q.painTotal*100):null });
  }
  const sP = totScanT>0?Math.round(totScans/totScanT*100):null;
  const pP = totPainT>0?Math.round(totPain/totPainT*100):null;
  const txP = totTxDen>0?Math.round(totTxNum/totTxDen*100):null;

  // Unit goals for year
  const goals = state.unitGoals[yr] || {};

  // Press Ganey (avg across year)
  let pgSum=0, pgCount=0;
  for (let m=1;m<=12;m++) {
    const key = yr+'-'+String(m).padStart(2,'0');
    const pg = state.pressGaney[key]||{};
    if (pg.overall) { pgSum+=parseFloat(pg.overall)||0; pgCount++; }
  }
  const pgAvg = pgCount>0 ? Math.round(pgSum/pgCount) : null;

  // Float / Sitter totals from float summary (if sheet was loaded this session)
  const floatSummaryEntry = (window._floatSummary || {})[name];
  const totalFloats  = floatSummaryEntry ? (floatSummaryEntry.floatCount  || 0) : null;
  const totalSitters = floatSummaryEntry ? (floatSummaryEntry.sitterCount || 0) : null;
  const totalCallOff = floatSummaryEntry ? (floatSummaryEntry.callOffCount || 0) : null;
  const hasFloatData = floatSummaryEntry !== undefined;

  // Stroke KPI / falls / HAPIs / monthly quality trends — computed once below

  function statBox(icon,label,val,col,sub) {
    return '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;text-align:center;">'+
      '<div style="font-size:9px;color:var(--text3);">'+icon+' '+label+'</div>'+
      '<div style="font-size:22px;font-weight:700;color:'+(col||'var(--text2)')+';margin:2px 0;">'+val+'</div>'+
      (sub?'<div style="font-size:9px;color:var(--text3);">'+sub+'</div>':'')+
      '</div>';
  }
  function textarea(field, placeholder, val) {
    return '<textarea oninput="_saveRV(\''+field+'\',this.value)" placeholder="'+placeholder+'" '+
      'style="width:100%;height:80px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:6px;padding:8px;font-size:11px;resize:vertical;">'+
      (val||'')+'</textarea>';
  }

  const bankLeft = Math.max(0,56-absHrs);
  const bankCol  = absHrs>56?'var(--red2)':absHrs>40?'var(--amber2)':'var(--green2)';
  const sCol = sP===null?'var(--text3)':sP>=(goals.scanTarget||95)?'var(--green2)':sP>=(goals.scanTarget||95)-5?'var(--amber2)':'var(--red2)';
  const pCol = pP===null?'var(--text3)':pP>=(goals.painTarget||90)?'var(--green2)':pP>=(goals.painTarget||90)-5?'var(--amber2)':'var(--red2)';

  let html = '';

  // Header
  html += '<div class="card" style="padding:16px;margin-bottom:14px;border-color:rgba(46,125,209,0.4);">';
  html += '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">';
  html += '<div style="width:48px;height:48px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;">'+name.split(',')[0][0]+'</div>';
  html += '<div><div style="font-size:18px;font-weight:700;">'+name+'</div>';
  html += '<div style="font-size:11px;color:var(--text3);">'+s.job+' &nbsp;·&nbsp; 3B Tele Med Surg &nbsp;·&nbsp; Annual Review '+yr+'</div></div>';
  html += '</div></div>';

  // Stroke KPI totals / falls / HAPIs — computed here so all stat boxes can use them
  let totTPA=0, totThromb=0, totStroke=0, totReadmit=0, totFalls=0, totHAPIs=0;
  for (let m=1;m<=12;m++) {
    const strokeKey = yr+'-'+String(m).padStart(2,'0');
    const sk = state.strokeKPI[strokeKey]||{};
    totTPA     += parseInt(sk.tPA)||0;
    totThromb  += parseInt(sk.thrombectomy)||0;
    totStroke  += parseInt(sk.strokeTotal)||0;
    totReadmit += parseInt(sk.readmissions)||0;
    totFalls   += parseInt(sk.falls)||0;
    totHAPIs   += parseInt(sk.hapis)||0;
  }

  // Stats overview
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px;">';
  html += statBox('📵','Call-Outs',absLog.filter(e=>e.type!=='tardy').length,absHrs>56?'var(--red2)':'var(--amber2)','this year');
  html += statBox('⏰','Tardies',tardies,tardies>=3?'var(--red2)':tardies>0?'var(--amber2)':'var(--green2)','of 3 allowed');
  html += statBox('🏦','Bank Used',absHrs+'h',bankCol,bankLeft+'h remaining');
  html += statBox('⚠️','Write-Ups',writeUps,writeUps>0?'var(--red2)':'var(--green2)','this year');
  if (s.job === 'CA') {
    // CA-specific: hours and scheduling compliance
    const caTarget = Math.round(fteShiftsPerCycle(parseFloat(state.empFTE[name])||0.9,'CA') * 2 * 8);
    html += statBox('📅','Shifts Target',fteShiftsPerCycle(parseFloat(state.empFTE[name])||0.9,'CA')*2,'var(--accent2)','per 4 weeks');
    html += statBox('⏱','Hours Target',caTarget+'h','var(--accent2)','per 4 weeks');
    html += statBox('🗓','Weekend Req','Every Other','var(--teal2)',parseFloat(state.empFTE[name])>=0.9?'.9 FTE':'.5 FTE');
  } else {
    html += statBox('💊','Scan %',sP!==null?sP+'%':'—',sCol,goals.scanTarget?'Goal: '+goals.scanTarget+'%':'');
    html += statBox('💔','Pain %',pP!==null?pP+'%':'—',pCol,goals.painTarget?'Goal: '+goals.painTarget+'%':'');
    html += statBox('🩸','Blood Tx %',txP!==null?txP+'%':'—',txP===null?'var(--text3)':txP>=90?'var(--green2)':txP>=75?'var(--amber2)':'var(--red2)',totTxNum+'/'+totTxDen+' assessments');
    html += statBox('⭐','Press Ganey',pgAvg!==null?pgAvg:'—','var(--amber2)',goals.pgTarget?'Goal: '+goals.pgTarget:'');
    if (s.job !== 'CA' && (totTPA > 0 || totStroke > 0)) {
      html += statBox('🧠','Stroke Pts',totStroke,'var(--purple2)','unit total');
      html += statBox('💉','tPA Admin',totTPA,'var(--accent2)','unit total');
    }
  }
  // Float & Sitter totals (all roles)
  if (hasFloatData) {
    html += statBox('🚌','Total Floats',totalFloats,'var(--teal2)','from float sheet');
    html += statBox('👁','Total Sitters',totalSitters,'var(--accent2)','from float sheet');
    if (totalCallOff > 0) html += statBox('📵','Floated Call-Off',totalCallOff,'var(--amber2)','from float sheet');
  } else {
    html += statBox('🚌','Floats','—','var(--text3)','load float sheet');
    html += statBox('👁','Sitters','—','var(--text3)','load float sheet');
  }
  html += '</div>';

  // ── Missing / Needs Attention card ──
  const alerts = [];
  if (s.job === 'RN' || s.job === 'LPN') {
    if (sP === null) alerts.push({ icon:'💊', col:'var(--text3)', text:'Medication scanning: <strong>not tracked</strong> — no data entered for '+yr });
    else if (sP < (goals.scanTarget||95)) alerts.push({ icon:'💊', col:'var(--red2)', text:'Medication scanning: <strong>'+sP+'%</strong> — below goal of '+(goals.scanTarget||95)+'%' });
    if (pP === null) alerts.push({ icon:'💔', col:'var(--text3)', text:'Pain reassessment: <strong>not tracked</strong> — no data entered for '+yr });
    else if (pP < (goals.painTarget||90)) alerts.push({ icon:'💔', col:'var(--amber2)', text:'Pain reassessment: <strong>'+pP+'%</strong> — below goal of '+(goals.painTarget||90)+'%' });
    if (txP === null) alerts.push({ icon:'🩸', col:'var(--text3)', text:'Blood transfusion compliance: <strong>not tracked</strong> — enter numerator/denominator in Quality tab' });
    else if (txP < 90) alerts.push({ icon:'🩸', col:'var(--amber2)', text:'Blood transfusion compliance: <strong>'+txP+'%</strong> — review protocol adherence' });
  }
  if (tardies >= 3) alerts.push({ icon:'⏰', col:'var(--red2)', text:'<strong>'+tardies+' tardies</strong> this year — write-up triggered at 3' });
  if (writeUps > 0) alerts.push({ icon:'⚠️', col:'var(--red2)', text:'<strong>'+writeUps+' write-up'+(writeUps>1?'s':'')+' on file</strong> — review corrective action compliance' });
  if (absHrs > 56) alerts.push({ icon:'🏦', col:'var(--red2)', text:'Absence bank <strong>exceeded</strong> ('+absHrs+'h used / 56h annual bank)' });
  const certs = state.certs[name] || {};
  const today = new Date();
  const in90 = new Date(); in90.setDate(today.getDate()+90);
  ['BLS','ACLS','NIHSS','License','HealthEval','FitTest'].forEach(cert => {
    if (certs[cert]) {
      const exp = parseDate(certs[cert]);
      if (exp && exp <= in90) {
        const days = Math.round((exp-today)/86400000);
        alerts.push({ icon:'🏅', col:days<0?'var(--red2)':'var(--amber2)', text:cert+' '+(days<0?'<strong>EXPIRED</strong>':'expiring in <strong>'+days+'d</strong>')});
      }
    }
  });
  // Custom certs
  [1,2,3,4,5].forEach(n => {
    const label = certs['custom'+n+'_label'];
    const dateStr = certs['custom'+n+'_date'];
    if (label && dateStr) {
      const exp = parseDate(dateStr);
      if (exp && exp <= in90) {
        const days = Math.round((exp-today)/86400000);
        alerts.push({ icon:'🏅', col:days<0?'var(--red2)':'var(--amber2)', text:label+' '+(days<0?'<strong>EXPIRED</strong>':'expiring in <strong>'+days+'d</strong>')});
      }
    }
  });

  if (alerts.length > 0) {
    html += '<div class="card" style="padding:14px;margin-bottom:14px;border-color:rgba(239,68,68,0.4);">';
    html += '<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--red2);">⚠️ Needs Attention — '+yr+'</div>';
    alerts.forEach(a => {
      html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:10px;">';
      html += '<span style="font-size:13px;">'+a.icon+'</span>';
      html += '<span style="color:'+a.col+';">'+a.text+'</span>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Unit goals contribution
  html += '<div class="card" style="padding:14px;margin-bottom:14px;">';
  html += '<div style="font-size:12px;font-weight:700;margin-bottom:10px;">🎯 Unit Goals '+yr+' — Staff Contribution</div>';
  if (goals.goalText) {
    html += '<div style="font-size:10px;color:var(--text3);background:rgba(255,255,255,0.04);border-radius:6px;padding:10px;margin-bottom:10px;">'+goals.goalText+'</div>';
  }
  // CA-specific goals callout
  if (s.job === 'CA') {
    const fte = parseFloat(state.empFTE[name])||0.9;
    html += '<div style="background:rgba(14,116,144,0.1);border:1px solid rgba(14,116,144,0.3);border-radius:6px;padding:10px;margin-bottom:10px;font-size:10px;">';
    html += '<strong style="color:var(--teal2);">📋 CA Scheduling Requirements</strong><br>';
    html += `<span style="color:var(--text2);">
      FTE ${fte} → <strong>${fteShiftsPerCycle(fte,'CA')*2} shifts / 4 weeks</strong> · 
      <strong>${Math.round(fteShiftsPerCycle(fte,'CA')*2*8)}h target</strong> · 
      Mix: 2×12h + 2×8h per week · 
      Weekend: <strong>Every other weekend required</strong>
    </span>`;
    html += '</div>';
  }
  html += '<div style="font-size:10px;color:var(--text3);">How '+name.split(',')[0]+' contributed to unit goals this year:</div>';
  html += '<div style="margin-top:8px;">'+textarea('contribution','Describe how this staff member contributed to unit goals, initiatives, and outcomes...', rv.contribution)+'</div>';
  html += '</div>';

  // ── Auto-generate AI suggestions — must be computed before sections forEach ──
  const MON2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function genSuggestions() {
    const sug = { strengths:[], opportunities:[], goals:[], pressGaney:[] };
    const calloutCount = absLog.filter(e=>e.type!=='tardy').length;
    if (calloutCount === 0) sug.strengths.push('Maintained perfect attendance for '+yr+' with zero call-outs — demonstrated exceptional reliability.');
    else if (calloutCount <= 2) sug.strengths.push('Strong attendance record with only '+calloutCount+' call-out(s) this year.');
    else sug.opportunities.push('Attendance: '+calloutCount+' call-out(s) used this year. Review attendance expectations and support plan if needed.');
    if (tardies >= 3) sug.opportunities.push('Tardiness pattern identified ('+tardies+' occurrences). Discuss punctuality expectations and potential barriers.');
    if (writeUps > 0) sug.opportunities.push(writeUps+' write-up(s) on file. Review documentation and corrective action plan compliance.');
    if (s.job === 'RN' || s.job === 'LPN') {
      if (sP !== null) {
        if (sP >= (goals.scanTarget||95)) sug.strengths.push('Medication scanning compliance: '+sP+'% — at or above the '+(goals.scanTarget||95)+'% unit goal. Excellent medication safety performance.');
        else sug.opportunities.push('Medication scanning at '+sP+'% (goal: '+(goals.scanTarget||95)+'%). Reinforce the 5 Rights and scanning policy at each administration.');
      }
      if (pP !== null) {
        if (pP >= (goals.painTarget||90)) sug.strengths.push('Pain reassessment rate: '+pP+'% — meets the '+(goals.painTarget||90)+'% goal. Demonstrates consistent patient comfort follow-through.');
        else sug.opportunities.push('Pain reassessment at '+pP+'% (goal: '+(goals.painTarget||90)+'%). Document reassessment within 30 minutes of every pain intervention.');
      }
    }
    if (totFalls > 0) sug.opportunities.push('Unit had '+totFalls+' patient fall(s) in '+yr+'. Reinforce hourly rounding, bed alarm compliance, and fall bundle adherence.');
    if (totFalls === 0) sug.strengths.push('Unit achieved zero patient falls for '+yr+'. Excellent team fall prevention efforts.');
    if (totHAPIs > 0) sug.opportunities.push('Unit had '+totHAPIs+' HAPI(s) in '+yr+'. Focus on Q2H turn documentation, CHG bathing compliance, and skin assessment at admission.');
    if (totHAPIs === 0) sug.strengths.push('Zero hospital-acquired pressure injuries on the unit for '+yr+'. Demonstrates strong skin integrity practices.');
    if (pgAvg !== null) {
      if (pgAvg >= (goals.pgTarget||80)) sug.pressGaney.push('Unit Press Ganey average of '+pgAvg+' meets the goal of '+(goals.pgTarget||80)+'. Strong nurse communication and responsiveness scores reflect well on daily practice.');
      else sug.pressGaney.push('Unit Press Ganey at '+pgAvg+' (goal: '+(goals.pgTarget||80)+'). Focus on AIDET communication, call-light responsiveness, and anticipating patient needs.');
    }
    sug.pressGaney.push('Reinforce bedside manner with AIDET — acknowledge, introduce, duration, explanation, thank you.');
    if (hasFloatData) {
      if (totalFloats > 0) sug.strengths.push('Floated '+totalFloats+' time(s) this year — demonstrates flexibility and willingness to support other units.');
      if (totalSitters > 0) sug.strengths.push('Completed '+totalSitters+' sitter assignment(s) — reliable for 1:1 patient observation.');
    }
    sug.goals.push('Complete annual BLS/ACLS/'+(s.job==='RN'?'NIHSS ':'')+'recertification by due date.');
    if (sP!==null && sP<(goals.scanTarget||95)) sug.goals.push('Achieve ≥'+(goals.scanTarget||95)+'% medication scanning compliance in '+(yr+1)+'.');
    if (pP!==null && pP<(goals.painTarget||90)) sug.goals.push('Achieve ≥'+(goals.painTarget||90)+'% pain reassessment rate in '+(yr+1)+'.');
    sug.goals.push('Participate in at least 1 unit quality improvement initiative or committee in '+(yr+1)+'.');
    if (s.job==='CA') sug.goals.push('Maintain scheduling compliance: '+fteShiftsPerCycle(parseFloat(state.empFTE[name])||0.9,'CA')*2+' shifts/4wk with required weekend rotation.');
    return sug;
  }
  const sug = genSuggestions();

  function sugBubbles(items) {
    if (!items.length) return '';
    return '<div style="margin-bottom:8px;">' + items.map(t =>
      '<div style="font-size:9px;background:rgba(46,125,209,0.12);border-left:2px solid var(--accent2);border-radius:4px;padding:4px 8px;margin-bottom:4px;color:var(--text2);">💡 '+t+'</div>'
    ).join('') + '</div>';
  }

  // Manager notes sections with AI suggestions
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">';
  [
    {field:'strengths',    label:'💪 Strengths',           ph:'Key strengths observed this year...', sugKey:'strengths'},
    {field:'opportunities',label:'📈 Areas for Growth',    ph:'Opportunities for development...', sugKey:'opportunities'},
    {field:'goals',        label:'🎯 Goals for Next Year', ph:'Goals and action items for '+(yr+1)+'...', sugKey:'goals'},
    {field:'managerNotes', label:'📝 Manager Notes',       ph:'Additional observations, commendations, or concerns...', sugKey:null},
  ].forEach(sec => {
    html += '<div class="card" style="padding:14px;">';
    html += '<div style="font-size:11px;font-weight:700;margin-bottom:6px;">'+sec.label+'</div>';
    if (sec.sugKey && sug[sec.sugKey] && sug[sec.sugKey].length) {
      html += sugBubbles(sug[sec.sugKey]);
    }
    html += textarea(sec.field, sec.ph, rv[sec.field]);
    html += '</div>';
  });
  html += '</div>';

  // ── Scan/Pain trend bars ──
  function trendBars(data, label, goal, color) {
    const hasData = data.some(d => d.pct !== null);
    if (!hasData) return '<div style="font-size:10px;color:var(--text3);font-style:italic;">No data recorded for '+yr+'</div>';
    const max = 100;
    return '<div style="margin-bottom:12px;">'+
      '<div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:4px;">'+label+(goal?' <span style="color:var(--text3);font-weight:400;font-size:9px;">(Goal: '+goal+'%)</span>':'')+'</div>'+
      '<div style="display:flex;align-items:flex-end;gap:3px;height:48px;">'+
      data.map(d => {
        const h = d.pct !== null ? Math.round(d.pct/max*48) : 0;
        const c = d.pct === null ? 'rgba(255,255,255,0.08)' : d.pct>=(goal||95)?color:'rgba(245,158,11,0.7)';
        const label2 = d.pct !== null ? d.pct+'%' : '';
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;" title="'+MON2[d.m-1]+': '+label2+'">'+
          '<div style="font-size:7px;color:var(--text3);">'+label2+'</div>'+
          '<div style="width:100%;height:'+h+'px;background:'+c+';border-radius:2px 2px 0 0;min-height:'+(d.pct!==null?'3':'1')+'px;"></div>'+
          '<div style="font-size:7px;color:var(--text3);">'+MON2[d.m-1]+'</div>'+
        '</div>';
      }).join('')+
      '</div>'+
      (goal?'<div style="border-top:1px dashed rgba(255,255,255,0.15);margin-top:2px;font-size:8px;color:var(--text3);">Goal '+goal+'%</div>':'')
    +'</div>';
  }

  // ── Scan/Pain trend card ──
  if (s.job === 'RN' || s.job === 'LPN') {
    html += '<div class="card" style="padding:14px;margin-bottom:14px;">';
    html += '<div style="font-size:12px;font-weight:700;margin-bottom:10px;">📊 Quality Trends — '+yr+'</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
    html += trendBars(scanByMonth, '💊 Barcode Scanning %', goals.scanTarget||95, 'var(--green2)');
    html += trendBars(painByMonth, '💔 Pain Reassessment %', goals.painTarget||90, 'var(--teal2)');
    html += '</div>';
    // Falls & HAPIs unit totals
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">';
    html += statBox('🚨','Unit Falls ('+yr+')',totFalls,totFalls===0?'var(--green2)':totFalls<=3?'var(--amber2)':'var(--red2)','all patients');
    html += statBox('🩹','Unit HAPIs ('+yr+')',totHAPIs,totHAPIs===0?'var(--green2)':totHAPIs<=1?'var(--amber2)':'var(--red2)','pressure injuries');
    html += '</div>';
    html += '</div>';
  }

  // ── Press Ganey context ──
  html += '<div class="card" style="padding:14px;margin-bottom:14px;">';
  html += '<div style="font-size:12px;font-weight:700;margin-bottom:6px;">⭐ Press Ganey Context</div>';
  html += '<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Unit avg Press Ganey for '+yr+': <strong style="color:var(--amber2);">'+(pgAvg!==null?pgAvg:'No data')+'</strong>'+(goals.pgTarget?' (Goal: '+goals.pgTarget+')':'')+'</div>';
  html += sugBubbles(sug.pressGaney);
  html += textarea('pressGaneyNotes','How does this staff member\'s behavior and patient interactions contribute to Press Ganey scores?', rv.pressGaneyNotes);
  html += '</div>';

  el.innerHTML = html;
}

function printYearReview() {
  const name = document.getElementById('review-staff')?.value || '';
  const yr   = parseInt(document.getElementById('review-year')?.value || new Date().getFullYear());
  if (!name) { alert('Select a staff member first.'); return; }

  const s = MASTER_STAFF.find(x=>x.name===name)||{job:''};
  const rv = ((state.yearReview[name]||{})[yr])||{};
  const goals = state.unitGoals[yr]||{};
  const absLog = (state.absenceLog[name]||[]).filter(e=>new Date(e.date+'T12:00:00').getFullYear()===yr);
  const absHrs = absLog.filter(e=>e.type!=='tardy').reduce((s,e)=>s+e.hours,0);
  const tardies = absLog.filter(e=>e.type==='tardy').length;
  const writeUps = absLog.filter(e=>e.writeUp).length;
  const floatEntry = (window._floatSummary||{})[name];
  const pFloats  = floatEntry ? (floatEntry.floatCount||0)  : null;
  const pSitters = floatEntry ? (floatEntry.sitterCount||0) : null;

  // Monthly quality for print trend
  const pScanByMonth=[], pPainByMonth=[];
  for (let m=1;m<=12;m++){
    const key=yr+'-'+String(m).padStart(2,'0');
    const q=((state.qualityData[name]||{})[key])||{};
    pScanByMonth.push({m,pct:q.scanTotal>0?Math.round(q.scans/q.scanTotal*100):null});
    pPainByMonth.push({m,pct:q.painTotal>0?Math.round(q.pain/q.painTotal*100):null});
  }
  const MON2P=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let tS=0,tST=0,tP=0,tPT=0,tTx=0;
  for (let m=1;m<=12;m++) {
    const key=yr+'-'+String(m).padStart(2,'0');
    const q=((state.qualityData[name]||{})[key])||{};
    tS+=q.scans||0; tST+=q.scanTotal||0;
    tP+=q.pain||0;  tPT+=q.painTotal||0;
    tTx+=q.transfusions||0;
  }
  const sP=tST>0?Math.round(tS/tST*100):null;
  const pP=tPT>0?Math.round(tP/tPT*100):null;
  let pgSum=0,pgCount=0;
  for(let m=1;m<=12;m++){const key=yr+'-'+String(m).padStart(2,'0');const pg=state.pressGaney[key]||{};if(pg.overall){pgSum+=parseFloat(pg.overall)||0;pgCount++;}}
  const pgAvg=pgCount>0?Math.round(pgSum/pgCount):null;

  function sec(title, content) {
    return '<h2>'+title+'</h2><div style="padding:0 4px;">'+content+'</div>';
  }
  function kv(label,val) { return '<p><strong>'+label+':</strong> '+(val||'—')+'</p>'; }

  const w = window.open('','_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write('<!DOCTYPE html><html><head><title>Annual Review — '+name+' '+yr+'</title><style>'+
    'body{font-family:Arial,sans-serif;font-size:10pt;margin:24px;color:#111}'+
    'h1{font-size:15pt;margin-bottom:4px}h2{font-size:11pt;background:#1a3a5c;color:#fff;padding:4px 10px;margin:14px 0 6px}'+
    'p{margin:4px 0;font-size:9.5pt}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}'+
    '.box{border:1px solid #ccc;border-radius:6px;padding:10px}.stat{display:inline-block;margin:4px 8px;text-align:center}'+
    '.stat .v{font-size:20pt;font-weight:700}.stat .l{font-size:7pt;color:#666}'+
    '@page{size:letter;margin:0.5in}'+
    '</style></head><body>'+
    '<h1>Annual Staff Review — '+name+'</h1>'+
    '<p style="color:#666;font-size:9pt;">'+s.job+' · 3B Tele Med Surg · '+yr+' · Printed '+new Date().toLocaleDateString()+'</p>'+

    sec('📊 Performance Summary',
      '<div class="grid">'+
      '<div class="box">'+
        '<strong>Attendance</strong><br>'+
        kv('Call-Outs',absLog.filter(e=>e.type!=='tardy').length)+
        kv('Tardies',tardies+' / 3 allowed')+
        kv('Hours Used',absHrs+'h / 56h bank')+
        kv('Write-Ups',writeUps)+
      '</div>'+
      '<div class="box">'+
        '<strong>Quality Metrics (Year Total)</strong><br>'+
        kv('Medication Scanning',sP!==null?sP+'% (Goal: '+(goals.scanTarget||95)+'%)':'Not tracked')+
        kv('Pain Reassessment',pP!==null?pP+'% (Goal: '+(goals.painTarget||90)+'%)':'Not tracked')+
        kv('Blood Transfusions',tTx)+
        kv('Press Ganey (Unit Avg)',pgAvg!==null?pgAvg:'No data')+
      '</div></div>'+
      '<div class="grid">'+
      '<div class="box">'+
        '<strong>Float &amp; Sitter Activity</strong><br>'+
        kv('Total Floats',pFloats!==null?pFloats:'—  (import float sheet for data)')+
        kv('Total Sitters',pSitters!==null?pSitters:'—')+
      '</div>'+
      '<div class="box">'+
        '<strong>Unit Safety ('+yr+')</strong><br>'+
        kv('Patient Falls',totFalls)+
        kv('HAPIs',totHAPIs)+
        kv('Stroke Patients',totStroke)+
        kv('tPA Administered',totTPA)+
      '</div></div>'
    )+''+
    // Scan & Pain trend table
    ((s.job==='RN'||s.job==='LPN') ? sec('📈 Quality Trends by Month',
      '<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px;">'+
      '<thead><tr style="background:#f0f4ff;"><th style="padding:3px 6px;text-align:left;">Month</th>'+
      pScanByMonth.map(d=>'<th style="padding:3px 4px;text-align:center;">'+MON2P[d.m-1]+'</th>').join('')+
      '</tr></thead><tbody>'+
      '<tr><td style="padding:3px 6px;font-weight:600;">💊 Scan %</td>'+
      pScanByMonth.map(d=>{
        const c=d.pct===null?'#ccc':d.pct>=(goals.scanTarget||95)?'#166534':d.pct>=85?'#92400e':'#991b1b';
        return '<td style="padding:3px 4px;text-align:center;color:'+c+';font-weight:600;">'+(d.pct!==null?d.pct+'%':'—')+'</td>';
      }).join('')+'</tr>'+
      '<tr><td style="padding:3px 6px;font-weight:600;">💔 Pain %</td>'+
      pPainByMonth.map(d=>{
        const c=d.pct===null?'#ccc':d.pct>=(goals.painTarget||90)?'#166534':d.pct>=80?'#92400e':'#991b1b';
        return '<td style="padding:3px 4px;text-align:center;color:'+c+';font-weight:600;">'+(d.pct!==null?d.pct+'%':'—')+'</td>';
      }).join('')+'</tr>'+
      '</tbody></table>'
    ) : '')+

    (goals.goalText?sec('🎯 Unit Goals '+yr,'<p>'+goals.goalText+'</p>'):'')+''+
    (rv.contribution?sec('🤝 Unit Goals Contribution','<p>'+rv.contribution+'</p>'):'')+''+
    '<div class="grid">'+
    (rv.strengths?'<div class="box"><strong>💪 Strengths</strong><p>'+rv.strengths+'</p></div>':'<div class="box"><strong>💪 Strengths</strong><p style="color:#999;">—</p></div>')+
    (rv.opportunities?'<div class="box"><strong>📈 Areas for Growth</strong><p>'+rv.opportunities+'</p></div>':'<div class="box"><strong>📈 Areas for Growth</strong><p style="color:#999;">—</p></div>')+
    (rv.goals?'<div class="box"><strong>🎯 Goals for '+(yr+1)+'</strong><p>'+rv.goals+'</p></div>':'<div class="box"><strong>🎯 Goals for '+(yr+1)+'</strong><p style="color:#999;">—</p></div>')+
    (rv.managerNotes?'<div class="box"><strong>📝 Manager Notes</strong><p>'+rv.managerNotes+'</p></div>':'<div class="box"><strong>📝 Manager Notes</strong><p style="color:#999;">—</p></div>')+
    '</div>'+

    sec('⭐ Press Ganey',
      '<p>Unit average '+yr+': <strong>'+(pgAvg!==null?pgAvg:'No data')+'</strong>'+(goals.pgTarget?' (Goal: '+goals.pgTarget+')':'')+'</p>'+
      (rv.pressGaneyNotes?'<p>'+rv.pressGaneyNotes+'</p>':'<p style="color:#999;">—</p>')
    )+

    '<div style="margin-top:30px;border-top:1px solid #ccc;padding-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">'+
    '<div><div style="border-bottom:1px solid #333;margin-bottom:4px;height:32px;"></div><div style="font-size:8pt;color:#666;">Staff Signature / Date</div></div>'+
    '<div><div style="border-bottom:1px solid #333;margin-bottom:4px;height:32px;"></div><div style="font-size:8pt;color:#666;">Manager Signature / Date</div></div>'+
    '</div>'+
    '</body></html>');
  w.document.close();
  setTimeout(()=>w.print(),500);
}


// ── Bulk Quality Entry ───────────────────────────────────────────────
function openBulkQualEntry() {
  const modal = document.getElementById('bulk-qual-modal');
  if (!modal) return;

  // Populate staff selector
  const sel = document.getElementById('bulk-qual-staff');
  const staff = MASTER_STAFF.filter(s => s.job === 'RN' || s.job === 'LPN');
  sel.innerHTML = staff.map(s =>
    `<option value="${s.name}">${s.name} (${s.job})</option>`
  ).join('');

  modal.style.display = 'block';
  renderBulkQualTable();
}

function closeBulkQualEntry() {
  const modal = document.getElementById('bulk-qual-modal');
  if (modal) modal.style.display = 'none';
}

function renderBulkQualTable() {
  const el   = document.getElementById('bulk-qual-table');
  const name = document.getElementById('bulk-qual-staff')?.value;
  if (!el || !name) return;

  const showScan = document.getElementById('bq-scan')?.checked;
  const showPain = document.getElementById('bq-pain')?.checked;
  const showTx   = document.getElementById('bq-tx')?.checked;

  // Build last 12 months (newest first)
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ yr: d.getFullYear(), mo: d.getMonth() + 1 });
  }

  const MON_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sid = name.replace(/[^a-z]/gi,'_');

  function fldStyle(accent) {
    return `width:60px;background:var(--slate);border:1px solid rgba(${accent},0.35);color:var(--white);border-radius:4px;padding:3px 5px;font-size:11px;text-align:center;outline:none;`;
  }
  const scanStyle = fldStyle('46,125,209');
  const painStyle = fldStyle('245,158,11');
  const txStyle   = fldStyle('239,68,68');

  // Build header
  let scanCols = showScan ? `<th colspan="3" style="padding:6px 8px;color:var(--accent2);text-align:center;border-bottom:2px solid var(--accent2);">💊 BCMA Scanning</th>` : '';
  let painCols = showPain ? `<th colspan="3" style="padding:6px 8px;color:var(--amber2);text-align:center;border-bottom:2px solid var(--amber2);">💔 Pain Reassessment</th>` : '';
  let txCols   = showTx   ? `<th colspan="2" style="padding:6px 8px;color:var(--red2);text-align:center;border-bottom:2px solid var(--red2);">🩸 Transfusions</th>` : '';

  let scanSub = showScan ? `<th style="padding:4px 6px;font-size:9px;color:var(--text3);">Scanned</th><th style="padding:4px 6px;font-size:9px;color:var(--text3);">Total</th><th style="padding:4px 6px;font-size:9px;color:var(--accent2);">%</th>` : '';
  let painSub = showPain ? `<th style="padding:4px 6px;font-size:9px;color:var(--text3);">Reassessed</th><th style="padding:4px 6px;font-size:9px;color:var(--text3);">Opps</th><th style="padding:4px 6px;font-size:9px;color:var(--amber2);">%</th>` : '';
  let txSub   = showTx   ? `<th style="padding:4px 6px;font-size:9px;color:var(--text3);">Done</th><th style="padding:4px 6px;font-size:9px;color:var(--text3);">Total</th>` : '';

  function pctDisp(num, den) {
    if (!den || !num) return '<span style="color:var(--text3);">—</span>';
    const p = Math.round(num/den*100);
    const c = p >= 95 ? 'var(--green2)' : p >= 85 ? 'var(--amber2)' : 'var(--red2)';
    return `<span style="font-weight:700;color:${c};">${p}%</span>`;
  }

  const rows = months.map(({ yr, mo }) => {
    const key = `${yr}-${String(mo).padStart(2,'0')}`;
    const msid = `${sid}_${key.replace('-','_')}`;
    const q = ((state.qualityData[name] || {})[key]) || {};
    const label = `${MON_NAMES[mo]} ${yr}`;
    const isThisMonth = yr === now.getFullYear() && mo === now.getMonth()+1;

    let scanInputs = showScan ? `
      <td style="padding:4px 6px;"><input type="number" id="bq_${msid}_scans" value="${q.scans||''}" placeholder="0" min="0" style="${scanStyle}" oninput="bqUpdatePct('${msid}','scan')"></td>
      <td style="padding:4px 6px;"><input type="number" id="bq_${msid}_scant" value="${q.scanTotal||''}" placeholder="0" min="0" style="${scanStyle}" oninput="bqUpdatePct('${msid}','scan')"></td>
      <td style="padding:4px 6px;text-align:center;" id="bq_${msid}_scanpct">${pctDisp(q.scans,q.scanTotal)}</td>` : '';
    let painInputs = showPain ? `
      <td style="padding:4px 6px;"><input type="number" id="bq_${msid}_pain" value="${q.pain||''}" placeholder="0" min="0" style="${painStyle}" oninput="bqUpdatePct('${msid}','pain')"></td>
      <td style="padding:4px 6px;"><input type="number" id="bq_${msid}_paint" value="${q.painTotal||''}" placeholder="0" min="0" style="${painStyle}" oninput="bqUpdatePct('${msid}','pain')"></td>
      <td style="padding:4px 6px;text-align:center;" id="bq_${msid}_painpct">${pctDisp(q.pain,q.painTotal)}</td>` : '';
    let txInputs = showTx ? `
      <td style="padding:4px 6px;"><input type="number" id="bq_${msid}_txn" value="${q.txNum||''}" placeholder="0" min="0" style="${txStyle}"></td>
      <td style="padding:4px 6px;"><input type="number" id="bq_${msid}_txd" value="${q.txDen||''}" placeholder="0" min="0" style="${txStyle}"></td>` : '';

    return `<tr style="${isThisMonth?'background:rgba(46,125,209,0.08);':''}border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:6px 10px;font-size:11px;font-weight:${isThisMonth?'700':'400'};color:${isThisMonth?'var(--accent2)':'var(--white)'};white-space:nowrap;">${label}${isThisMonth?' ◀':''}</td>
      ${scanInputs}${painInputs}${txInputs}
    </tr>`;
  }).join('');

  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead>
      <tr style="background:rgba(255,255,255,0.05);">
        <th style="padding:6px 10px;text-align:left;color:var(--text3);">Month</th>
        ${scanCols}${painCols}${txCols}
      </tr>
      <tr style="background:rgba(255,255,255,0.03);">
        <th></th>
        ${scanSub}${painSub}${txSub}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function bqUpdatePct(msid, type) {
  const pctEl = document.getElementById(`bq_${msid}_${type}pct`);
  if (!pctEl) return;
  const num = parseFloat(document.getElementById(`bq_${msid}_${type==='scan'?'scans':'pain'}`)?.value) || 0;
  const den = parseFloat(document.getElementById(`bq_${msid}_${type==='scan'?'scant':'paint'}`)?.value) || 0;
  if (!den) { pctEl.innerHTML = '<span style="color:var(--text3);">—</span>'; return; }
  const p = Math.round(num/den*100);
  const c = p >= 95 ? 'var(--green2)' : p >= 85 ? 'var(--amber2)' : 'var(--red2)';
  pctEl.innerHTML = `<span style="font-weight:700;color:${c};">${p}%</span>`;
}

function saveBulkQualEntry() {
  const name = document.getElementById('bulk-qual-staff')?.value;
  if (!name) return;

  const showScan = document.getElementById('bq-scan')?.checked;
  const showPain = document.getElementById('bq-pain')?.checked;
  const showTx   = document.getElementById('bq-tx')?.checked;
  const sid = name.replace(/[^a-z]/gi,'_');

  const now = new Date();
  let saved = 0;

  for (let i = 0; i < 12; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr  = d.getFullYear();
    const mo  = d.getMonth() + 1;
    const key = `${yr}-${String(mo).padStart(2,'0')}`;
    const msid = `${sid}_${key.replace('-','_')}`;

    if (!state.qualityData[name]) state.qualityData[name] = {};
    if (!state.qualityData[name][key]) state.qualityData[name][key] = { scans:0,scanTotal:0,pain:0,painTotal:0,transfusions:0,txNum:0,txDen:0 };
    const q = state.qualityData[name][key];

    let changed = false;
    if (showScan) {
      const s = document.getElementById(`bq_${msid}_scans`)?.value;
      const t = document.getElementById(`bq_${msid}_scant`)?.value;
      if (s !== '') { q.scans = parseFloat(s)||0; changed = true; }
      if (t !== '') { q.scanTotal = parseFloat(t)||0; changed = true; }
    }
    if (showPain) {
      const p = document.getElementById(`bq_${msid}_pain`)?.value;
      const pt = document.getElementById(`bq_${msid}_paint`)?.value;
      if (p !== '') { q.pain = parseFloat(p)||0; changed = true; }
      if (pt !== '') { q.painTotal = parseFloat(pt)||0; changed = true; }
    }
    if (showTx) {
      const tn = document.getElementById(`bq_${msid}_txn`)?.value;
      const td = document.getElementById(`bq_${msid}_txd`)?.value;
      if (tn !== '') { q.txNum = parseFloat(tn)||0; q.transfusions = q.txNum; changed = true; }
      if (td !== '') { q.txDen = parseFloat(td)||0; changed = true; }
    }
    if (changed) saved++;
  }

  persistSave();
  showSaveBanner(`💾 Saved ${saved} month${saved!==1?'s':''} of quality data for ${name.split(',')[0]}`);
  closeBulkQualEntry();
  renderQualityTab();
}

function saveQuality(name, field, val, pctCellId, numId, denId) {
  const yr  = parseInt(document.getElementById('qual-year')?.value  || new Date().getFullYear());
  const mo  = parseInt(document.getElementById('qual-month')?.value || new Date().getMonth()+1);
  const key = `${yr}-${String(mo).padStart(2,'0')}`;

  if (!state.qualityData[name]) state.qualityData[name] = {};
  if (!state.qualityData[name][key]) state.qualityData[name][key] = { scans:0, scanTotal:0, pain:0, painTotal:0, transfusions:0, txNum:0, txDen:0 };

  state.qualityData[name][key][field] = parseFloat(val) || 0;
  persistSave();

  // Update % cell live without re-rendering the whole table
  if (pctCellId) {
    const numEl = document.getElementById(numId);
    const denEl = document.getElementById(denId);
    const pctEl = document.getElementById(pctCellId);
    if (numEl && denEl && pctEl) {
      const num = parseFloat(numEl.value) || 0;
      const den = parseFloat(denEl.value) || 0;
      const p   = den > 0 ? Math.round(num/den*100) : null;
      pctEl.textContent = p !== null ? p + '%' : '—';
      pctEl.style.color = p === null ? 'var(--text3)' : p >= 95 ? 'var(--green2)' : p >= 85 ? 'var(--amber2)' : 'var(--red2)';
    }
    // Update unit totals row
    updateQualityTotals(key);
  }
}

function updateQualityTotals(key) {
  const staff = MASTER_STAFF.filter(s => s.job === 'RN' || s.job === 'LPN');
  let tS=0, tST=0, tP=0, tPT=0, tTx=0;
  staff.forEach(s => {
    const q = ((state.qualityData[s.name]||{})[key]) || {};
    tS  += q.scans        || 0;
    tST += q.scanTotal    || 0;
    tP  += q.pain         || 0;
    tPT += q.painTotal    || 0;
    tTx += q.transfusions || 0;
  });
  const sp = tST > 0 ? Math.round(tS/tST*100) : null;
  const pp = tPT > 0 ? Math.round(tP/tPT*100) : null;
  const setCell = (id, val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
  const setPct  = (id, p) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.textContent = p !== null ? p+'%' : '—';
    e.style.color = p===null?'var(--text3)':p>=95?'var(--green2)':p>=85?'var(--amber2)':'var(--red2)';
  };
  setCell('qtot-scans',  tS);
  setCell('qtot-scant',  tST);
  setPct ('qtot-scanpct', sp);
  setCell('qtot-pain',   tP);
  setCell('qtot-paint',  tPT);
  setPct ('qtot-painpct', pp);
  setCell('qtot-tx',     tTx);

  // Update summary badges too
  const sumEl = document.getElementById('quality-summary');
  if (sumEl && sp !== undefined) {
    const badges = sumEl.querySelectorAll('[data-qual]');
    badges.forEach(b => {
      if (b.dataset.qual === 'scan') { b.textContent = sp !== null ? sp+'%' : '—'; b.style.color = sp===null?'var(--text3)':sp>=95?'var(--green2)':sp>=85?'var(--amber2)':'var(--red2)'; }
      if (b.dataset.qual === 'pain') { b.textContent = pp !== null ? pp+'%' : '—'; b.style.color = pp===null?'var(--text3)':pp>=95?'var(--green2)':pp>=85?'var(--amber2)':'var(--red2)'; }
      if (b.dataset.qual === 'tx')   { b.textContent = tTx; }
    });
  }
}

function renderQualityTab() {
  const el   = document.getElementById('quality-table');
  const sumEl = document.getElementById('quality-summary');
  if (!el) return;

  const yr  = parseInt(document.getElementById('qual-year')?.value  || new Date().getFullYear());
  const mo  = parseInt(document.getElementById('qual-month')?.value || new Date().getMonth()+1);
  const key = `${yr}-${String(mo).padStart(2,'0')}`;
  const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const staff = MASTER_STAFF.filter(s => s.job === 'RN' || s.job === 'LPN');

  function getQ(name) {
    return ((state.qualityData[name] || {})[key]) || { scans:0, scanTotal:0, pain:0, painTotal:0, transfusions:0, txNum:0, txDen:0 };
  }

  function pct(num, den) { return den > 0 ? Math.round(num/den*100) : null; }
  function pctColor(p) {
    if (p === null) return 'var(--text3)';
    if (p >= 95) return 'var(--green2)';
    if (p >= 85) return 'var(--amber2)';
    return 'var(--red2)';
  }

  // Summary totals
  let totScans=0, totScanT=0, totPain=0, totPainT=0, totTx=0;
  staff.forEach(s => {
    const q = getQ(s.name);
    totScans += q.scans; totScanT += q.scanTotal;
    totPain  += q.pain;  totPainT += q.painTotal;
    totTx    += q.transfusions;
  });
  const scanPct = pct(totScans, totScanT);
  const painPct = pct(totPain, totPainT);

  if (sumEl) sumEl.innerHTML = [
    { label:'Unit Scan %',          val: scanPct !== null ? scanPct+'%' : '—', color: pctColor(scanPct), icon:'💊', qual:'scan' },
    { label:'Unit Pain Reassess %', val: painPct !== null ? painPct+'%' : '—', color: pctColor(painPct), icon:'💔', qual:'pain' },
    { label:'Blood Transfusions',   val: totTx,  color: 'var(--accent2)',  icon:'🩸', qual:'tx' },
    { label:'Staff Tracked',        val: staff.filter(s=>getQ(s.name).scanTotal>0).length+'/'+staff.length, color:'var(--text2)', icon:'👤', qual:'' },
  ].map(b=>`<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 18px;min-width:140px;">
    <div style="font-size:20px;font-weight:700;color:${b.color};">${b.icon} <span${b.qual?' data-qual="'+b.qual+'"':''}>${b.val}</span></div>
    <div style="font-size:10px;color:var(--text3);margin-top:2px;">${b.label} · ${MONTHS[mo]} ${yr}</div>
  </div>`).join('');

  el.innerHTML = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:rgba(255,255,255,0.06);">
          <th style="padding:8px 10px;text-align:left;color:var(--text3);position:sticky;left:0;background:var(--card);">Staff</th>
          <th style="padding:8px 6px;text-align:center;color:var(--text3);">Role</th>
          <th style="padding:8px 6px;text-align:center;color:var(--accent2);" colspan="3">💊 Scanning</th>
          <th style="padding:8px 6px;text-align:center;color:var(--amber2);" colspan="3">💔 Pain Reassessment</th>
          <th style="padding:8px 6px;text-align:center;color:var(--red2);">🩸 Blood Tx</th>
        </tr>
        <tr style="background:rgba(255,255,255,0.03);">
          <th style="padding:4px 10px;position:sticky;left:0;background:var(--card);"></th>
          <th></th>
          <th style="padding:4px 6px;text-align:center;font-size:10px;color:var(--text3);">Scanned</th>
          <th style="padding:4px 6px;text-align:center;font-size:10px;color:var(--text3);">Total Meds</th>
          <th style="padding:4px 6px;text-align:center;font-size:10px;color:var(--text3);">%</th>
          <th style="padding:4px 6px;text-align:center;font-size:10px;color:var(--text3);">Reassessed</th>
          <th style="padding:4px 6px;text-align:center;font-size:10px;color:var(--text3);">Total Opps</th>
          <th style="padding:4px 6px;text-align:center;font-size:10px;color:var(--text3);">%</th>
          <th style="padding:4px 6px;text-align:center;font-size:10px;color:var(--text3);">Count</th>
        </tr>
      </thead>
      <tbody>
        ${staff.map((s,i) => {
          const q = getQ(s.name);
          const sP = pct(q.scans, q.scanTotal);
          const pP = pct(q.pain, q.painTotal);
          const safe = s.name.replace(/'/g,"\\'");
          const sid  = s.name.replace(/[^a-z]/gi,'_'); // safe DOM id
          const rowBg = i%2 ? '' : 'rgba(255,255,255,0.01)';
          return `<tr style="background:${rowBg};border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:6px 10px;font-weight:600;position:sticky;left:0;background:${rowBg||'var(--card)'};">${s.name.split(',')[0]}</td>
            <td style="padding:6px 6px;text-align:center;color:${s.job==='RN'?'var(--accent2)':'var(--purple2)'};font-size:10px;font-weight:700;">${s.job}</td>
            <td style="padding:4px 6px;text-align:center;">
              <input type="number" id="q_${sid}_scans" min="0" value="${q.scans||''}" placeholder="0"
                oninput="saveQuality('${safe}','scans',this.value,'q_${sid}_scanpct','q_${sid}_scans','q_${sid}_scant')"
                style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:11px;">
            </td>
            <td style="padding:4px 6px;text-align:center;">
              <input type="number" id="q_${sid}_scant" min="0" value="${q.scanTotal||''}" placeholder="0"
                oninput="saveQuality('${safe}','scanTotal',this.value,'q_${sid}_scanpct','q_${sid}_scans','q_${sid}_scant')"
                style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:11px;">
            </td>
            <td id="q_${sid}_scanpct" style="padding:4px 6px;text-align:center;font-weight:700;font-size:13px;color:${pctColor(sP)};">${sP!==null?sP+'%':'—'}</td>
            <td style="padding:4px 6px;text-align:center;">
              <input type="number" id="q_${sid}_pain" min="0" value="${q.pain||''}" placeholder="0"
                oninput="saveQuality('${safe}','pain',this.value,'q_${sid}_painpct','q_${sid}_pain','q_${sid}_paint')"
                style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:11px;">
            </td>
            <td style="padding:4px 6px;text-align:center;">
              <input type="number" id="q_${sid}_paint" min="0" value="${q.painTotal||''}" placeholder="0"
                oninput="saveQuality('${safe}','painTotal',this.value,'q_${sid}_painpct','q_${sid}_pain','q_${sid}_paint')"
                style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:11px;">
            </td>
            <td id="q_${sid}_painpct" style="padding:4px 6px;text-align:center;font-weight:700;font-size:13px;color:${pctColor(pP)};">${pP!==null?pP+'%':'—'}</td>
            <td style="padding:4px 6px;text-align:center;">
              <div style="display:flex;flex-direction:column;gap:2px;align-items:center;">
                <div style="display:flex;gap:2px;align-items:center;">
                  <input type="number" id="q_${sid}_txn" min="0" value="${q.txNum||''}" placeholder="#"
                    oninput="saveQuality('${safe}','txNum',this.value,'q_${sid}_txpct','q_${sid}_txn','q_${sid}_txd')"
                    style="width:44px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 3px;text-align:center;font-size:10px;" title="Patients assessed">
                  <span style="color:var(--text3);font-size:9px;">/</span>
                  <input type="number" id="q_${sid}_txd" min="0" value="${q.txDen||''}" placeholder="#"
                    oninput="saveQuality('${safe}','txDen',this.value,'q_${sid}_txpct','q_${sid}_txn','q_${sid}_txd')"
                    style="width:44px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 3px;text-align:center;font-size:10px;" title="Patients requiring transfusion">
                </div>
                <div id="q_${sid}_txpct" style="font-size:11px;font-weight:700;color:${q.txDen>0?pctColor(Math.round((q.txNum||0)/q.txDen*100)):'var(--text3)'};">${q.txDen>0?Math.round((q.txNum||0)/q.txDen*100)+'%':'—'}</div>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr style="background:rgba(255,255,255,0.06);font-weight:700;border-top:2px solid var(--border);">
          <td style="padding:6px 10px;position:sticky;left:0;background:var(--slate);">Unit Total</td>
          <td></td>
          <td id="qtot-scans"  style="padding:6px 6px;text-align:center;">${totScans}</td>
          <td id="qtot-scant"  style="padding:6px 6px;text-align:center;">${totScanT}</td>
          <td id="qtot-scanpct" style="padding:6px 6px;text-align:center;color:${pctColor(scanPct)};">${scanPct!==null?scanPct+'%':'—'}</td>
          <td id="qtot-pain"   style="padding:6px 6px;text-align:center;">${totPain}</td>
          <td id="qtot-paint"  style="padding:6px 6px;text-align:center;">${totPainT}</td>
          <td id="qtot-painpct" style="padding:6px 6px;text-align:center;color:${pctColor(painPct)};">${painPct!==null?painPct+'%':'—'}</td>
          <td id="qtot-tx"     style="padding:6px 6px;text-align:center;color:var(--red2);">${totTx}</td>
        </tr>
      </tfoot>
    </table>
  </div>`;
}

function toggleUnavailPanel() {
  const body    = document.getElementById('unavail-body');
  const chevron = document.getElementById('unavail-chevron');
  const header  = document.getElementById('unavail-header');
  if (!body) return;
  const open = body.style.display === 'none';
  body.style.display    = open ? 'block' : 'none';
  chevron.textContent   = open ? '▼' : '▶';
  header.style.borderBottomColor = open ? 'var(--border)' : 'transparent';
  if (open) {
    populateVacStaffSelect();
    renderVacationList();
  }
}

// ── Global date parser (MM/DD/YYYY or MM/DD/YY or YYYY-MM-DD) ──
function parseDate(str) {
  if (!str) return null;
  str = String(str).trim();
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + 'T12:00:00');
  // MM/DD/YYYY or MM/DD/YY
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let yr = parseInt(m[3]);
    if (yr < 100) yr += yr < 50 ? 2000 : 1900;
    return new Date(yr, parseInt(m[1])-1, parseInt(m[2]), 12, 0, 0);
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function generateSchedule() {
  try {
    _generateScheduleInner();
  } catch(err) {
    console.error('[generateSchedule] ERROR:', err);
    alert('Schedule generation error: ' + err.message + '\n\nCheck browser console (F12) for details.');
  }
}

function _generateScheduleInner() {
  const startEl = document.getElementById('schedule-start-date');
  if (!startEl.value) {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay()); // start on Sunday
    startEl.value = now.toISOString().split('T')[0];
  }
  const start = new Date(startEl.value + 'T12:00:00');
  const DAYS  = 28; // 4-week schedule (2 bi-weekly pay periods)

   const skipSet = new Set(Object.keys(state.empSkipSchedule || {}));
   const rns  = MASTER_STAFF.filter(s => s.job === 'RN'  && !skipSet.has(s.name));
   const lpns = MASTER_STAFF.filter(s => s.job === 'LPN' && !skipSet.has(s.name));
   const cas  = MASTER_STAFF.filter(s => s.job === 'CA'  && !skipSet.has(s.name));
    const all  = [...rns, ...lpns, ...cas];
  // Clear stale schedule suggestions if app version changed
  if (state._scheduleVersion !== '4wk-v4') {
    state._scheduleSuggestions = {};
    state._scheduleStart = '';
  }
  state._scheduleVersion = '4wk-v4';

  const worked = {};
  const workedByWeek = {}; // { name: { 0:count, 1:count, 2:count, 3:count } } — per week-of-schedule
  all.forEach(s => {
    worked[s.name] = 0;
    workedByWeek[s.name] = { 0:0, 1:0, 2:0, 3:0 };
  });

  // Max shifts per week per person
  function maxShiftsPerWeek(name, role) {
    if (role === 'RN' || role === 'LPN') {
      return state.emp48hr[name] ? 4 : 3; // 48hr contract = 4 shifts/wk
    }
    return 5; // CA max shifts per week (5×8h or 2×12h+2×8h)
  }

  // Which week-of-schedule (0–3) does this date fall in?
  function schedWeekOf(dt) {
    return Math.floor((dt - start) / (7 * 24 * 3600 * 1000));
  }

  // Target shifts per person over 28 days (2 bi-weekly pay cycles = 4 weeks)
  // fteShiftsPerCycle returns shifts per 14-day cycle, so ×2 for 28 days
  function getTarget(name, role) {
    const fte = state.empFTE[name];
    return fteShiftsPerCycle(fte, role||'RN') * 2; // exact target for 4 weeks (2 bi-weekly cycles)
  }

  // Hours per shift per role (for tracking total hours)
  function shiftHours(job, shiftKey) {
    if (job === 'RN' || job === 'LPN') return 12;
    if (shiftKey === 'CA_E13') return 13;
    if (shiftKey && (shiftKey === 'CA_D12' || shiftKey === 'CA_N12')) return 12;
    return 8;
  }

  // Helper: is this date a weekend day?
  function isWeekend(dt) { return dt.getDay() === 0 || dt.getDay() === 6; }

  // Weekend number within the month (1–5), and whether it's odd/even week of the year
  function weekendNum(dt) {
    // Count which weekend of the month this is
    const d = new Date(dt.getFullYear(), dt.getMonth(), 1);
    let count = 0;
    while (d <= dt) {
      if (d.getDay() === 6 || d.getDay() === 0) count++;
      d.setDate(d.getDate() + 1);
    }
    return Math.ceil(count / 2); // 1,2,3,4 weekends per month
  }

  // Absolute week number from epoch (for odd/even determination)
  function absWeekNum(dt) {
    const startOfYear = new Date(dt.getFullYear(), 0, 1);
    return Math.floor((dt - startOfYear) / (7 * 24 * 3600 * 1000));
  }

  // Should this staff member work this weekend day?
  function shouldWorkWeekend(name, dt) {
    if (!isWeekend(dt)) return null;
    const fte  = parseFloat(state.empFTE[name]) || 1;
    const role = (MASTER_STAFF.find(s=>s.name===name)||{}).job || 'RN';
    const pref = state.empWeekend[name] || '';

    // .9 FTE (all roles) and .5 FTE MUST work every other weekend
    if (fte >= 0.9 || (fte >= 0.5 && fte < 0.6)) {
      const weekNum = absWeekNum(dt);
      const isOdd  = weekNum % 2 === 1;
      if (pref === 'W1') return isOdd;
      if (pref === 'W2') return !isOdd;
      // Default: hash-based alternation (ensures even split)
      const hash = name.split('').reduce((a,c)=>a+c.charCodeAt(0), 0);
      return (weekNum + hash) % 2 === 0;
    }

    // .25 FTE: one specific weekend per month
    if (fte <= 0.25) {
      const wkNum = weekendNum(dt);
      if (!pref) return wkNum === 1;
      const prefNum = parseInt(pref.replace('W',''));
      return wkNum === prefNum;
    }

    // Other FTEs (.6, .8): every other weekend
    const weekNum = absWeekNum(dt);
    const isOdd  = weekNum % 2 === 1;
    if (pref === 'W1') return isOdd;
    if (pref === 'W2') return !isOdd;
    const hash = name.split('').reduce((a,c)=>a+c.charCodeAt(0), 0);
    return (weekNum + hash) % 2 === 0;
  }

  // Is staff unavailable on this day? Handles both old string format and new object format
  function isOnVacation(name, dateKey) {
    try {
      return (state.empVacation[name] || []).some(x => {
        if (!x) return false;
        if (typeof x === 'string') return x === dateKey;
        if (typeof x === 'object' && x.date) return x.date === dateKey;
        return false;
      });
    } catch(e) { return false; }
  }

  // Is staff outside their agency contract window?
  function isOutsideAgencyWindow(name, dt) {
    const ag = state.agencyDates[name];
    if (!ag || !ag.isAgency) return false; // not agency staff
    const dateKey = dt.toISOString().split('T')[0];

    // Effective end = extensionEnd if set, else contractEnd
    const effectiveEnd = ag.extensionEnd || ag.contractEnd;

    if (ag.contractStart) {
      const start = parseDate(ag.contractStart);
      if (start && dt < start) return true; // before contract starts
    }
    if (effectiveEnd) {
      const end = parseDate(effectiveEnd);
      if (end && dt > end) return true; // after contract ends
    }
    return false;
  }


  // Is this a Fri/Sat/Sun/Mon (weekend bridge) day?
  function isWeekendBridge(dt) {
    const dow = dt.getDay(); // 0=Sun,1=Mon,5=Fri,6=Sat
    return dow === 0 || dow === 1 || dow === 5 || dow === 6;
  }

  // Build locked assignments from empSetSchedule (bi-weekly: weekA=odd, weekB=even)
  // Determine week parity relative to the schedule start date
  const startAbsWeek = Math.floor((start - new Date(2020,0,6)) / (7*24*3600*1000));
  const lockedAssignments = {};

  for (let d = 0; d < DAYS; d++) {
    const dt = new Date(start); dt.setDate(start.getDate()+d);
    const dateKey  = dt.toISOString().split('T')[0];
    const dowName  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
    const absWeek  = Math.floor((dt - new Date(2020,0,6)) / (7*24*3600*1000));
    const isWeekA  = absWeek % 2 === startAbsWeek % 2; // same parity as start = Week A

    Object.entries(state.empSetSchedule || {}).forEach(([name, sched]) => {
      const wkDays = isWeekA ? (sched.weekA||{}) : (sched.weekB||{});
      const assignedShift = wkDays[dowName];
      if (!assignedShift) return;
      const key = `${dateKey}|${assignedShift}`;
      if (!lockedAssignments[key]) lockedAssignments[key] = new Set();
      lockedAssignments[key].add(name);
      // Note: don't pre-count toward worked[] — locked staff count when actually placed below
    });

    // Block-scheduled agency staff (e.g. 7-on/7-off) — treated as locked-in just like Set Schedule staff,
    // so they flow through the same capacity cap and conflict-warning logic below.
    Object.entries(state.agencyDates || {}).forEach(([name, ag]) => {
      const bs = ag && ag.blockSchedule;
      if (!bs || !bs.enabled) return;
      const anchor = parseDate(bs.startDate || ag.contractStart);
      if (!anchor) return;
      const onDays  = Math.max(1, parseInt(bs.on, 10)  || 7);
      const offDays = Math.max(1, parseInt(bs.off, 10) || 7);
      const cycle = onDays + offDays;
      const daysSinceAnchor = Math.round((dt - anchor) / (24*3600*1000));
      if (daysSinceAnchor < 0) return; // block hasn't started yet
      if ((daysSinceAnchor % cycle) >= onDays) return; // currently in the "off" portion of the cycle

      const staffMember = MASTER_STAFF.find(m => m.name === name);
      if (!staffMember) return;
      let assignedShift;
      if (staffMember.job === 'CA') {
        const desig = state.empShifts[name] || 'DAY';
        const hrs   = state.empCAHours[name] || '8';
        assignedShift = desig === 'NIGHT' ? (hrs==='12'?'CA_N12':'CA_N')
                       : desig === 'EVE'   ? (hrs==='12'?'CA_N12':'CA_E')
                       : (hrs==='12'?'CA_D12':'CA_D');
      } else {
        assignedShift = state.empShifts[name] === 'NIGHT' ? 'NIGHT' : 'DAY';
      }
      const key = `${dateKey}|${assignedShift}`;
      if (!lockedAssignments[key]) lockedAssignments[key] = new Set();
      lockedAssignments[key].add(name);
    });
  }

  const suggestions = {};
  const RN_CAP = 6, LPN_CAP = 2, CA_CAP = 4; // real unit capacity per shift — never exceeded even by locked/set schedules
  const scheduleConflicts = []; // { dateKey, shiftGrp, role, name } — locked staff bumped because the shift was already at capacity


  // Ensure empVacation data is safe
  Object.keys(state.empVacation || {}).forEach(n => {
    if (!Array.isArray(state.empVacation[n])) {
      delete state.empVacation[n];
    }
  });

  for (let d = 0; d < DAYS; d++) {
    const dt = new Date(start); dt.setDate(start.getDate()+d);
    const dateKey  = dt.toISOString().split('T')[0];
    const weekend  = isWeekend(dt);
    const isBridge = [0,1,5,6].includes(dt.getDay());
    const schedWeek = schedWeekOf(dt); // 0–3

    function underWeeklyCap(name, role) {
      return (workedByWeek[name]?.[schedWeek] || 0) < maxShiftsPerWeek(name, role);
    }
    function addWorked(name, role) {
      worked[name] = (worked[name]||0) + 1;
      if (workedByWeek[name]) workedByWeek[name][schedWeek] = (workedByWeek[name][schedWeek]||0) + 1;
    }

    ['DAY','NIGHT'].forEach(shiftGrp => {
      const key = `${dateKey}|${shiftGrp}`;
      let lockedRN  = lockedAssignments[key] ? [...lockedAssignments[key]].filter(n => rns.some(r=>r.name===n)) : [];
      let lockedLPN = lockedAssignments[key] ? [...lockedAssignments[key]].filter(n => lpns.some(r=>r.name===n)) : [];

      // Never exceed real unit capacity, even when Set Schedules collide — bump the least-worked-so-far
      // and surface the rest as a conflict to resolve rather than silently over-scheduling the shift.
      if (lockedRN.length > RN_CAP) {
        lockedRN.sort((a,b) => (worked[a]||0) - (worked[b]||0));
        lockedRN.slice(RN_CAP).forEach(n => scheduleConflicts.push({ dateKey, shiftGrp, role:'RN', name:n }));
        lockedRN = lockedRN.slice(0, RN_CAP);
      }
      if (lockedLPN.length > LPN_CAP) {
        lockedLPN.sort((a,b) => (worked[a]||0) - (worked[b]||0));
        lockedLPN.slice(LPN_CAP).forEach(n => scheduleConflicts.push({ dateKey, shiftGrp, role:'LPN', name:n }));
        lockedLPN = lockedLPN.slice(0, LPN_CAP);
      }

      const eligLPN = lpns.filter(s => {
        const sh = state.empShifts[s.name];
        if (sh && sh !== shiftGrp && sh !== 'BOTH') return false;
        if (weekend && shouldWorkWeekend(s.name, dt) === false) return false;
        if (isOnVacation(s.name, dateKey)) return false;
        if (isOutsideAgencyWindow(s.name, dt)) return false;
        return true;
      }).sort((a,b) => worked[a.name] - worked[b.name]);

      const pickedLPN = [...lockedLPN];
      lockedLPN.forEach(n => addWorked(n, 'LPN'));
      for (const s of eligLPN) {
        if (pickedLPN.length >= 1) break;
        if (!pickedLPN.includes(s.name) && worked[s.name] < getTarget(s.name, s.job) && underWeeklyCap(s.name, s.job)) {
          pickedLPN.push(s.name); addWorked(s.name, s.job);
        }
      }

      const rnNormalTarget = pickedLPN.length > 0 ? 5 : 6;
      const eligRN = rns.filter(s => {
        const sh = state.empShifts[s.name];
        if (sh && sh !== shiftGrp && sh !== 'BOTH') return false;
        if (weekend && shouldWorkWeekend(s.name, dt) === false) return false;
        if (isOnVacation(s.name, dateKey)) return false;
        if (isOutsideAgencyWindow(s.name, dt)) return false;
        return true;
      }).sort((a,b) => worked[a.name] - worked[b.name]);

      const pickedRN = [...lockedRN];
      lockedRN.forEach(n => addWorked(n, 'RN'));

      // First pass: fill to normal target — respect both FTE total AND weekly cap
      for (const s of eligRN) {
        if (pickedRN.length >= rnNormalTarget) break;
        if (!pickedRN.includes(s.name) && worked[s.name] < getTarget(s.name, s.job) && underWeeklyCap(s.name, s.job)) {
          pickedRN.push(s.name); addWorked(s.name, s.job);
        }
      }
      // Second pass: ensure minimum 5 even if over FTE target (but still respect weekly cap)
      for (const s of eligRN) {
        if (pickedRN.length >= Math.min(rnNormalTarget, 5)) break;
        if (!pickedRN.includes(s.name) && underWeeklyCap(s.name, s.job)) {
          pickedRN.push(s.name); addWorked(s.name, s.job);
        }
      }
      // Bridge day: top up toward capacity (not past it) — still respect weekly cap
      if (isBridge) {
        for (const s of eligRN) {
          if (pickedRN.length >= RN_CAP) break;
          if (!pickedRN.includes(s.name) && worked[s.name] < getTarget(s.name, s.job) && underWeeklyCap(s.name, s.job)) {
            pickedRN.push(s.name); addWorked(s.name, s.job);
          }
        }
      }

      suggestions[key] = { RN: pickedRN, LPN: pickedLPN };
    });

    ['CA_D','CA_E','CA_E13','CA_N','CA_D12','CA_N12'].forEach(shiftGrp => {
      const key = `${dateKey}|${shiftGrp}`;
      const desigMap = { CA_D:'DAY', CA_E:'EVE', CA_E13:'EVE', CA_N:'NIGHT', CA_D12:'DAY', CA_N12:'NIGHT' };
      const desig    = desigMap[shiftGrp];
      let lockedCA = lockedAssignments[key] ? [...lockedAssignments[key]].filter(n => cas.some(r=>r.name===n)) : [];
      if (lockedCA.length > CA_CAP) {
        lockedCA.sort((a,b) => (worked[a]||0) - (worked[b]||0));
        lockedCA.slice(CA_CAP).forEach(n => scheduleConflicts.push({ dateKey, shiftGrp, role:'CA', name:n }));
        lockedCA = lockedCA.slice(0, CA_CAP);
      }

      const eligCA = cas.filter(s => {
        const sh    = state.empShifts[s.name];
        const hours = state.empCAHours[s.name] || '';
        if (sh && sh !== desig && sh !== 'BOTH') return false;
        if (weekend && shouldWorkWeekend(s.name, dt) === false) return false;
        if (isOnVacation(s.name, dateKey)) return false;
        if (isOutsideAgencyWindow(s.name, dt)) return false;
        const is12hrShift = shiftGrp === 'CA_D12' || shiftGrp === 'CA_N12';
        if (hours === '8'  &&  is12hrShift) return false;
        if (hours === '12' && !is12hrShift) return false;
        return true;
      }).sort((a,b) => worked[a.name] - worked[b.name]);

      const pickedCA = [...lockedCA];
      lockedCA.forEach(n => addWorked(n, 'CA'));
      for (const s of eligCA) {
        if (pickedCA.length >= 4) break;
        if (!pickedCA.includes(s.name) && worked[s.name] < getTarget(s.name, s.job) && underWeeklyCap(s.name, s.job)) {
          pickedCA.push(s.name); addWorked(s.name, s.job);
        }
      }
      for (const s of eligCA) {
        if (pickedCA.length >= 4) break;
        if (!pickedCA.includes(s.name) && underWeeklyCap(s.name, s.job)) pickedCA.push(s.name);
      }
      // Bridge day: top up toward capacity (not past it) — still respect weekly cap
      if (isBridge) {
        for (const s of eligCA) {
          if (pickedCA.length >= CA_CAP) break;
          if (!pickedCA.includes(s.name) && worked[s.name] < getTarget(s.name, s.job) && underWeeklyCap(s.name, s.job)) {
            pickedCA.push(s.name); addWorked(s.name, s.job);
          }
        }
      }
      suggestions[key] = { CA: pickedCA };
    });
  }

  // ── Rebalance pass: guarantee at least RN_MIN (5) RNs on every Day/Night shift wherever real capacity allows ──
  // The day-by-day fill above can legitimately leave a day short if earlier days already used up people's
  // weekly shift allowance; this second pass looks across the whole 4 weeks for anyone who still has room,
  // rather than only whoever happened to be left over on that specific day.
  const RN_MIN = 5;
  const understaffedRNShifts = [];
  for (let d = 0; d < DAYS; d++) {
    const dt = new Date(start); dt.setDate(start.getDate()+d);
    const dateKey = dt.toISOString().split('T')[0];
    const schedWeek = schedWeekOf(dt);

    ['DAY','NIGHT'].forEach(shiftGrp => {
      const key = `${dateKey}|${shiftGrp}`;
      const sug = suggestions[key];
      if (!sug) return;

      if (sug.RN.length < RN_MIN) {
        // Who's already working ANY RN shift this date (don't double-book the same person same day)
        const already = new Set();
        ['DAY','NIGHT'].forEach(sg => (suggestions[`${dateKey}|${sg}`]?.RN || []).forEach(n => already.add(n)));

        const candidates = rns.filter(s => {
          if (already.has(s.name)) return false;
          const sh = state.empShifts[s.name];
          if (sh && sh !== shiftGrp && sh !== 'BOTH') return false;
          if (isOnVacation(s.name, dateKey)) return false;
          if (isOutsideAgencyWindow(s.name, dt)) return false;
          if ((workedByWeek[s.name]?.[schedWeek] || 0) >= maxShiftsPerWeek(s.name, 'RN')) return false;
          return true;
        }).sort((a,b) => (worked[a.name]||0) - (worked[b.name]||0));

        for (const s of candidates) {
          if (sug.RN.length >= RN_MIN) break;
          sug.RN.push(s.name);
          worked[s.name] = (worked[s.name]||0) + 1;
          if (workedByWeek[s.name]) workedByWeek[s.name][schedWeek] = (workedByWeek[s.name][schedWeek]||0) + 1;
        }
      }

      if (sug.RN.length < RN_MIN) {
        understaffedRNShifts.push({ dateKey, shiftGrp, count: sug.RN.length });
      }
    });
  }
  if (understaffedRNShifts.length) {
    console.warn(`[Schedule] ${understaffedRNShifts.length} RN shift(s) still under the 5-RN floor after rebalancing — not enough RNs with unused weekly capacity that day:`, understaffedRNShifts);
  }
  state._scheduleSuggestions = suggestions;
  state._scheduleStart = startEl.value;
  state._scheduleVersion = '4wk-v4';
  state._scheduleConflicts = scheduleConflicts;
  state._scheduleUnderstaffed = understaffedRNShifts;
  persistSave();

  const totalPlacements = Object.values(suggestions).reduce((t,s)=>t+(s.RN||[]).length+(s.LPN||[]).length+(s.CA||[]).length, 0);
  console.log(`[Schedule] Generated: ${Object.keys(suggestions).length} slots, ${totalPlacements} placements`);
  if (scheduleConflicts.length) {
    console.warn(`[Schedule] ${scheduleConflicts.length} locked-schedule conflicts (Set Schedule collided over capacity):`, scheduleConflicts);
  }

  renderSchedule();
  showSaveBanner(scheduleConflicts.length
    ? `⚠ Schedule generated with ${scheduleConflicts.length} Set Schedule conflict(s) over capacity — see warning above the grid`
    : '✓ 4-week schedule generated');
  setTimeout(() => {
    const grid = document.getElementById('schedule-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
} // end _generateScheduleInner

function renderSchedule() {
  const el = document.getElementById('schedule-grid');
  if (!el) return;
  const startEl = document.getElementById('schedule-start-date');

  // Use stored start date as fallback if input is empty
  const startValue = (startEl?.value) || state._scheduleStart || '';

  // Sync input if we have a stored date
  if (!startEl?.value && startValue && startEl) {
    startEl.value = startValue;
  }

  if (!startValue || !state._scheduleSuggestions || Object.keys(state._scheduleSuggestions).length === 0) {
    el.innerHTML = `<div style="color:var(--text3);text-align:center;padding:40px;font-size:13px;">Set a start date and click ⚡ Generate to build the schedule.</div>`;
    return;
  }

  const start = new Date(startValue + 'T12:00:00');
  const DAYS  = 28; // 4-week schedule
  const dates = Array.from({length:DAYS}, (_,d) => { const dt=new Date(start); dt.setDate(start.getDate()+d); return dt; });
  const suggestions = state._scheduleSuggestions || {};
  const overrides   = state.scheduleOverrides || {};

  const SHIFT_LABELS = {
    DAY:'☀️ 0700-1900', NIGHT:'🌙 1900-0700',
    CA_D:'☀️ 0630-1430', CA_E:'🌆 1430-2230', CA_N:'🌙 2230-0630',
    CA_D12:'☀️ 0630-1830', CA_N12:'🌙 1830-0630', CA_E13:'🌆 1430-0300'
  };
  // For CA, only show shift rows that have at least one staff member assigned or eligible
  // This prevents showing 6 empty shift rows for every CA
  const caShiftKeys = ['CA_D','CA_E','CA_E13','CA_N','CA_D12','CA_N12'].filter(sk => {
    // Include shift if any CA has this in their set schedule OR any suggestion has it
    const hasSugg = dates.some(d => {
      const dk = d.toISOString().split('T')[0];
      const s = (state._scheduleSuggestions||{})[`${dk}|${sk}`];
      return s && (s.CA||[]).length > 0;
    });
    const hasPref = MASTER_STAFF.filter(s=>s.job==='CA').some(s => {
      const ss = state.empSetSchedule[s.name];
      if (!ss) return false;
      return Object.values(ss.weekA||{}).includes(sk) || Object.values(ss.weekB||{}).includes(sk);
    });
    return hasSugg || hasPref;
  });

  const ALL_ROLE_GROUPS = [
    { role:'RN',  shiftKeys:['DAY','NIGHT'],   target:'5-6 (max 6)', color:'var(--accent2)', hrs:12 },
    { role:'LPN', shiftKeys:['DAY','NIGHT'],   target:'1',           color:'var(--purple2)', hrs:12 },
    { role:'CA',  shiftKeys: caShiftKeys.length ? caShiftKeys : ['CA_D','CA_E','CA_N'], target:'4', color:'var(--teal2)', hrs:null },
  ];
  const ROLE_GROUPS = ALL_ROLE_GROUPS.filter(grp => {
    if (_schedRoleFilter === 'ALL')    return true;
    if (_schedRoleFilter === 'RN')     return grp.role === 'RN';
    if (_schedRoleFilter === 'LPN')    return grp.role === 'LPN';
    if (_schedRoleFilter === 'RN_LPN') return grp.role === 'RN' || grp.role === 'LPN';
    if (_schedRoleFilter === 'CA')     return grp.role === 'CA';
    return true;
  });

  // Count scheduled per day/shift for coverage indicator
  function countForDay(dateKey, shiftGrp, role) {
    const sugg = suggestions[`${dateKey}|${shiftGrp}`] || {};
    const over = overrides;
    const staffOfRole = MASTER_STAFF.filter(s=>s.job===role);
    return staffOfRole.filter(s => {
      const ck  = `${dateKey}|${shiftGrp}|${s.name}`;
      const ov  = over[ck];
      const sug = role==='RN' ? (sugg.RN||[]).includes(s.name) : role==='LPN' ? (sugg.LPN||[]).includes(s.name) : (sugg.CA||[]).includes(s.name);
      if (ov === 'ON' || ov === '48H') return true;
      if (ov === 'OFF') return false;
      return sug;
    }).length;
  }

  // Week headers — 4 weeks
  const weekHeaders = Array.from({length:4}, (_,w) => {
    const wStart = dates[w*7];
    const wEnd   = dates[w*7+6];
    const payPeriod = w < 2 ? 'Pay Period 1' : 'Pay Period 2';
    return `<th colspan="7" style="position:sticky;top:0;z-index:5;padding:4px 8px;text-align:center;background:var(--navy);border:1px solid var(--border);border-bottom:3px solid ${w<2?'var(--accent2)':'var(--green2)'};color:${w<2?'var(--accent2)':'var(--green2)'};font-size:10px;font-weight:700;">Week ${w+1} — ${wStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})}–${wEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})} <span style="font-size:8px;font-weight:400;opacity:0.7;">${payPeriod}</span></th>`;
  }).join('');

  const dayHeaders = dates.map(d => {
    const dow    = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];
    const dk     = d.toISOString().split('T')[0];
    const isBridge  = [0,1,5,6].includes(d.getDay()); // Sun/Mon/Fri/Sat
    const isWE   = d.getDay()===0||d.getDay()===6;
    const hdrBg  = 'var(--navy)';
    const dowCol = isBridge ? 'var(--amber2)' : 'var(--text3)';
    return `<th style="position:sticky;top:26px;z-index:5;padding:2px 3px;text-align:center;min-width:32px;background:${hdrBg};border-left:1px solid rgba(255,255,255,0.06);${isBridge?'border-bottom:2px solid var(--amber2);':isWE?'border-bottom:2px solid rgba(255,255,255,0.15);':''}">
      <div style="color:${dowCol};font-size:9px;">${dow}</div>
      <div style="color:var(--white);font-weight:700;font-size:10px;">${d.getDate()}</div>
    </th>`;
  }).join('');

  let rows = '';
  // CA 8/12-hr shift codes bucketed into Day vs Night for section grouping.
  // CA_E (1430-2230) is grouped with Day; CA_E13 (1430-0300) runs deep into night so it's grouped with Night.
  const CA_DESIG = { CA_D:'DAY', CA_E:'DAY', CA_E13:'NIGHT', CA_N:'NIGHT', CA_D12:'DAY', CA_N12:'NIGHT' };
  const SHIFT_SECTIONS = [
    { key:'DAY',   label:'☀️ DAY SHIFT · 0700–1900' },
    { key:'NIGHT', label:'🌙 NIGHT SHIFT · 1900–0700' },
  ];

  SHIFT_SECTIONS.forEach(section => {
    const sectionGroups = ROLE_GROUPS.map(grp => {
      const sectionShiftKeys = grp.role === 'CA'
        ? grp.shiftKeys.filter(sk => CA_DESIG[sk] === section.key)
        : grp.shiftKeys.filter(sk => sk === section.key);
      return Object.assign({}, grp, { sectionShiftKeys });
    }).filter(g => g.sectionShiftKeys.length);

    if (!sectionGroups.length) return;

    rows += `<tr><td colspan="${DAYS+3}" style="padding:7px 10px;background:rgba(255,255,255,0.06);color:var(--white);font-weight:800;font-size:13px;border-top:3px solid var(--accent2);border-bottom:2px solid var(--border);letter-spacing:0.4px;">${section.label}</td></tr>`;

    sectionGroups.forEach(grp => {
      const sectionShiftKeys = grp.sectionShiftKeys;

      // Role group separator
      rows += `<tr><td colspan="${DAYS+3}" style="padding:4px 10px;background:rgba(46,125,209,0.08);color:var(--text2);font-weight:700;font-size:11px;border-top:2px solid var(--border);border-bottom:1px solid var(--border);">
        <span style="color:${grp.color};">${grp.role}</span> · Target: ${grp.target} per shift
      </td></tr>`;

      const staffList = MASTER_STAFF.filter(s=>s.job===grp.role).filter(s => {
        return dates.some(d => {
          const dk = d.toISOString().split('T')[0];
          return sectionShiftKeys.some(sk => {
            const ck = `${dk}|${sk}|${s.name}`;
            const ov = overrides[ck];
            if (ov === 'ON' || ov === '48H') return true;
            if (ov === 'OFF') return false;
            const sugg = suggestions[`${dk}|${sk}`];
            return sugg ? (grp.role==='RN'?(sugg.RN||[]).includes(s.name):grp.role==='LPN'?(sugg.LPN||[]).includes(s.name):(sugg.CA||[]).includes(s.name)) : false;
          });
        });
      });

      staffList.forEach((s,si) => {
        const fteLbl  = state.empFTE[s.name]   ? `FTE ${state.empFTE[s.name]}` : '';
        const shLbl   = state.empShifts[s.name] || '';
        const is48    = state.emp48hr[s.name];

        // Count scheduled shifts and hours for 4-week period — across the person's FULL shift set
        // (not just this section) so the hours badge reflects their whole 4-week schedule either way.
        let scheduledHours = 0;
        dates.forEach(d => {
          const dk = d.toISOString().split('T')[0];
          grp.shiftKeys.forEach(sk => {
            const ck   = `${dk}|${sk}|${s.name}`;
            const ov   = overrides[ck];
            const sugg = suggestions[`${dk}|${sk}`];
            const sug  = sugg ? (grp.role==='RN'?(sugg.RN||[]).includes(s.name):grp.role==='LPN'?(sugg.LPN||[]).includes(s.name):(sugg.CA||[]).includes(s.name)) : false;
            if (ov==='ON'||ov==='48H'||(ov!=='OFF'&&sug)) {
              scheduledHours += sk==='CA_E13' ? 13 : (sk==='CA_D12'||sk==='CA_N12') ? 12 : (grp.role==='CA' ? 8 : 12);
            }
          });
        });

        // Hours target over 4 weeks
        // RN/LPN: standard is 36h/wk (3x12h); 48hr-box staff target 48h/wk (4x12h) — not FTE-driven
        // CA: mix of 8h/12h shifts — estimate avg shift length from set schedule, scaled by FTE-based shift count
        const fte = parseFloat(state.empFTE[s.name]) || 1;
        const caAvgHrs = grp.role === 'CA' ? (() => {
          const ss = state.empSetSchedule[s.name];
          if (ss) {
            const allDays = [...Object.values(ss.weekA||{}), ...Object.values(ss.weekB||{})];
            const hrs12 = allDays.filter(v=>v==='CA_D12'||v==='CA_N12').length;
            const hrs8  = allDays.length - hrs12;
            const total = allDays.length;
            return total > 0 ? (hrs12*12 + hrs8*8) / total : 8;
          }
          return 8;
        })() : 12;
        let targetHours;
        if (grp.role === 'RN' || grp.role === 'LPN') {
          targetHours = (is48 ? 48 : 36) * 4; // 4-week target: 144h standard, 192h if 48hr box checked
        } else {
          const targetShifts = fteShiftsPerCycle(fte, 'CA') * 2; // 2 bi-weekly cycles = 4 weeks
          targetHours = Math.round(targetShifts * caAvgHrs);
        }
        const hoursColor  = scheduledHours > targetHours ? 'var(--amber2)' :
                            scheduledHours >= targetHours ? 'var(--green2)' : 'var(--red2)';
        const hoursLabel  = fteLbl
          ? `${scheduledHours}h / ${targetHours}h`
          : `${scheduledHours}h scheduled`;

        sectionShiftKeys.forEach((shiftGrp, sgi) => {
          rows += `<tr style="${si%2===0?'background:rgba(255,255,255,0.01)':''}">`;

          if (sgi === 0) {
            rows += `<td rowspan="${sectionShiftKeys.length}" style="padding:4px 10px;position:sticky;left:0;background:var(--card);z-index:2;border-right:1px solid var(--border);border-bottom:1px solid rgba(255,255,255,0.06);vertical-align:middle;min-width:160px;">
              <div style="font-weight:600;font-size:11px;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px;" onclick="openEmployeeHub('${s.name.replace(/'/g,"\\'")}')">${s.name}</div>
              <div style="font-size:9px;color:var(--text3);margin-top:2px;">${[fteLbl,shLbl,is48?'↔48hr':''].filter(Boolean).join(' · ')}</div>
              <div style="font-size:9px;font-family:'IBM Plex Mono',monospace;color:${hoursColor};margin-top:2px;font-weight:700;">${hoursLabel}${scheduledHours<targetHours?' ⚠':''}${scheduledHours>targetHours?' ↑':''}</div>
            </td>`;
          }

          rows += `<td style="padding:3px 8px;position:sticky;left:160px;background:var(--card);z-index:2;border-right:2px solid var(--border);border-bottom:1px solid rgba(255,255,255,0.04);color:var(--text3);font-size:10px;white-space:nowrap;">${SHIFT_LABELS[shiftGrp]}</td>`;

          // Coverage count cell
          rows += `<td style="padding:2px 4px;text-align:center;border-right:2px solid var(--accent);border-bottom:1px solid rgba(255,255,255,0.04);font-size:10px;font-family:'IBM Plex Mono',monospace;background:rgba(46,125,209,0.05);" title="Coverage count placeholder"></td>`;

          dates.forEach(d => {
            const dateKey = d.toISOString().split('T')[0];
            const cellKey = `${dateKey}|${shiftGrp}|${s.name}`;
            const override  = overrides[cellKey];
            const sugg      = suggestions[`${dateKey}|${shiftGrp}`];
            const sugOn     = sugg ? (grp.role==='RN'?(sugg.RN||[]).includes(s.name):grp.role==='LPN'?(sugg.LPN||[]).includes(s.name):(sugg.CA||[]).includes(s.name)) : false;
            const finalState = override || (sugOn ? 'ON' : 'OFF');
            const isWE      = d.getDay()===0||d.getDay()===6;
            const isBridge  = [0,1,5,6].includes(d.getDay());
            const isVacation = (state.empVacation[s.name]||[]).some(x =>
              typeof x === 'string' ? x === dateKey : x.date === dateKey
            );
            const vacEntry = isVacation ? ((state.empVacation[s.name]||[]).find(x =>
              typeof x === 'string' ? x === dateKey : x.date === dateKey
            )) : null;
            const vacType = vacEntry && typeof vacEntry === 'object' ? vacEntry.type : (vacEntry ? 'VAC' : null);
            const vacInfo = vacType ? (VAC_TYPE_INFO[vacType]||VAC_TYPE_INFO.OTH) : null;
            const safe = cellKey.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

            let bg, color, lbl, clickable = true, title = `${s.name} · ${shiftGrp} · ${dateKey}`;

            if (isVacation && vacInfo) {
              bg=vacInfo.bg; color=vacInfo.color; lbl=vacInfo.icon; clickable=false;
              title=`${vacInfo.label}`;
            } else if ((() => { const ag=state.agencyDates[s.name]; if(!ag||!ag.isAgency)return false; const eff=ag.extensionEnd||ag.contractEnd; const startD=ag.contractStart?parseDate(ag.contractStart):null; const endD=eff?parseDate(eff):null; return (startD&&d<startD)||(endD&&d>endD); })()) {
              bg='rgba(91,33,182,0.1)'; color='rgba(139,92,246,0.5)'; lbl='🏥'; clickable=false;
              title='Outside agency contract window';
            } else {
              const isLocked = (() => {
                const ss = state.empSetSchedule[s.name];
                if (ss) {
                  const dowName   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
                  const startDate = new Date(startValue + 'T12:00:00');
                  const startAbsW = Math.floor((startDate - new Date(2020,0,6)) / (7*24*3600*1000));
                  const dateAbsW  = Math.floor((d - new Date(2020,0,6)) / (7*24*3600*1000));
                  const isWkA     = dateAbsW % 2 === startAbsW % 2;
                  const wkDays    = isWkA ? (ss.weekA||{}) : (ss.weekB||{});
                  if (wkDays[dowName] === shiftGrp) return true;
                }
                const bs = state.agencyDates[s.name]?.blockSchedule;
                if (bs && bs.enabled) {
                  const anchor = parseDate(bs.startDate || state.agencyDates[s.name].contractStart);
                  if (anchor) {
                    const onDays = Math.max(1, parseInt(bs.on,10)||7), offDays = Math.max(1, parseInt(bs.off,10)||7);
                    const daysSince = Math.round((d - anchor) / (24*3600*1000));
                    if (daysSince >= 0 && (daysSince % (onDays+offDays)) < onDays) return true;
                  }
                }
                return false;
              })();
              if (finalState==='ON') {
                if (override)      { bg='rgba(46,125,209,0.35)'; color='var(--accent2)'; lbl='★'; }
                else if (isLocked) { bg='rgba(91,33,182,0.35)';  color='var(--purple2)'; lbl='📌'; }
                else               { bg='rgba(26,122,74,0.28)';  color='var(--green2)';  lbl='✓'; }
              } else if (finalState==='48H') {
                bg='rgba(180,83,9,0.35)'; color='var(--amber2)'; lbl='48';
              } else {
                bg = isBridge ? 'rgba(180,83,9,0.04)' : (isWE?'rgba(255,255,255,0.03)':'');
                color='var(--text3)'; lbl='·';
              }
            }

            rows += `<td ${clickable?`onclick="toggleScheduleCell('${safe}')"`:''}
              style="text-align:center;padding:1px;border-left:1px solid rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.04);${clickable?'cursor:pointer;':'cursor:default;'}background:${bg};color:${color};font-weight:700;font-size:11px;min-width:32px;"
              title="${title}">${lbl}</td>`;
          });
          rows += `</tr>`;
        });
      });

      // Coverage count row — once per role, at the bottom of that role's staff list within this section
      sectionShiftKeys.forEach(shiftGrp => {
        rows += `<tr style="background:rgba(46,125,209,0.04);">
          <td style="padding:1px 10px;position:sticky;left:0;background:var(--card2);z-index:2;border-right:1px solid var(--border);font-size:9px;color:var(--text3);">Coverage</td>
          <td style="padding:1px 8px;position:sticky;left:160px;background:var(--card2);z-index:2;border-right:2px solid var(--border);font-size:9px;color:var(--text3);">${SHIFT_LABELS[shiftGrp]}</td>
          <td style="border-right:2px solid var(--accent);background:var(--card2);"></td>
          ${dates.map(d => {
            const dk = d.toISOString().split('T')[0];
            const cnt = countForDay(dk, shiftGrp, grp.role);
            const tgt = grp.role==='CA' ? 4 : grp.role==='LPN' ? 1 : 5;
            const isBridge = [0,1,5,6].includes(d.getDay());
            const col = cnt >= tgt ? 'var(--green2)' : cnt === tgt-1 ? 'var(--amber2)' : 'var(--red2)';
            const bg  = isBridge && cnt >= tgt ? 'rgba(180,83,9,0.05)' : '';
            return `<td style="text-align:center;font-size:10px;font-family:'IBM Plex Mono',monospace;font-weight:700;color:${col};background:${bg};border-left:1px solid rgba(255,255,255,0.04);">${cnt}</td>`;
          }).join('')}
        </tr>`;
      });
    });
  });

  const conflicts = state._scheduleConflicts || [];
  const conflictsBanner = conflicts.length ? `
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);border-radius:6px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:var(--red2);margin-bottom:4px;">⚠ ${conflicts.length} Set Schedule conflict(s) — capacity exceeded</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">These staff have overlapping fixed schedules beyond real unit capacity (RN max 6, LPN max 2, CA max 4 per shift). They were left off this suggested schedule — resolve by adjusting their Set Schedule day/shift.</div>
      <div style="font-size:10px;color:var(--text2);max-height:120px;overflow-y:auto;">
        ${conflicts.map(c => `<div>${c.dateKey} · ${SHIFT_LABELS[c.shiftGrp]||c.shiftGrp} · ${c.role} · <b>${c.name}</b></div>`).join('')}
      </div>
    </div>` : '';

  const understaffed = state._scheduleUnderstaffed || [];
  const understaffedBanner = understaffed.length ? `
    <div style="background:rgba(180,83,9,0.1);border:1px solid rgba(180,83,9,0.35);border-radius:6px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:4px;">⚠ ${understaffed.length} RN shift(s) still below the 5-RN floor</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">Not enough RNs had unused weekly hours left on these dates to reach 5 — this reflects real capacity, not a fill bug. Consider approving overtime, adding a 48hr-contract RN, or picking up agency coverage for these shifts.</div>
      <div style="font-size:10px;color:var(--text2);max-height:120px;overflow-y:auto;">
        ${understaffed.map(u => `<div>${u.dateKey} · ${SHIFT_LABELS[u.shiftGrp]||u.shiftGrp} · only ${u.count} RN(s)</div>`).join('')}
      </div>
    </div>` : '';

  el.innerHTML = `${conflictsBanner}${understaffedBanner}<div style="overflow-x:auto;">
    <table style="border-collapse:collapse;font-size:10px;white-space:nowrap;">
      <thead>
        <tr>
          <th style="position:sticky;left:0;top:0;background:var(--navy);z-index:6;min-width:160px;padding:4px 8px;border-bottom:1px solid var(--border);">Staff</th>
          <th style="position:sticky;left:160px;top:0;background:var(--navy);z-index:6;min-width:60px;padding:4px 8px;border-bottom:1px solid var(--border);">Shift</th>
          <th style="position:sticky;top:0;background:var(--navy);z-index:6;padding:4px 6px;border-bottom:1px solid var(--border);font-size:9px;color:var(--text3);">#</th>
          ${weekHeaders}
        </tr>
        <tr>
          <th style="position:sticky;left:0;top:26px;background:var(--navy);z-index:6;border-bottom:2px solid var(--border);"></th>
          <th style="position:sticky;left:160px;top:26px;background:var(--navy);z-index:6;border-bottom:2px solid var(--border);"></th>
          <th style="position:sticky;top:26px;background:var(--navy);z-index:6;border-bottom:2px solid var(--border);"></th>
          ${dayHeaders}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function toggleScheduleCell(cellKey) {
  const overrides = state.scheduleOverrides;
  const current   = overrides[cellKey];
  const parts     = cellKey.split('|');
  const staffName = parts[2];
  const isRN      = MASTER_STAFF.find(s=>s.name===staffName)?.job === 'RN';
  const approved48 = isRN && state.emp48hr[staffName];

  if (!current)           { overrides[cellKey] = 'ON'; }
  else if (current==='ON')  { overrides[cellKey] = 'OFF'; }
  else if (current==='OFF') { overrides[cellKey] = approved48 ? '48H' : null; if(!overrides[cellKey]) delete overrides[cellKey]; }
  else if (current==='48H') { delete overrides[cellKey]; }

  persistSave();
  renderSchedule();
}

function clearScheduleOverrides() {
  if (!confirm('Clear all manual overrides? The generated schedule will remain.')) return;
  state.scheduleOverrides = {};
  persistSave();
  renderSchedule();
  showSaveBanner('✓ Overrides cleared');
}

// ── Employee Notes ──
let _empNotesName = '';

function openEmpNotes(name) {
  _empNotesName = name;
  document.getElementById('emp-notes-title').textContent = `📝 Notes — ${name}`;
  document.getElementById('emp-notes-input').value = '';
  renderEmpNotesList();
  const modal = document.getElementById('emp-notes-modal');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('emp-notes-input').focus(), 100);
}

function closeEmpNotes() {
  document.getElementById('emp-notes-modal').style.display = 'none';
}

function renderEmpNotesList() {
  const el = document.getElementById('emp-notes-list');
  const notes = (state.empNotes[_empNotesName] || []).slice().reverse();
  if (notes.length === 0) {
    el.innerHTML = '<div style="color:var(--text3);font-size:12px;font-style:italic;padding:8px;">No notes yet.</div>';
    return;
  }
  el.innerHTML = notes.map((n, i) => {
    const idx = notes.length - 1 - i; // reverse index for delete
    const safeN = _empNotesName.replace(/'/g, "\\'");
    return `<div style="background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--text3);">${n.ts}</span>
        <button class="move-btn remove-btn" style="font-size:10px;padding:1px 6px;" onclick="deleteEmpNote('${safeN}',${idx})" title="Delete note">✕</button>
      </div>
      <div style="font-size:12px;color:var(--text);white-space:pre-wrap;">${n.text}</div>
    </div>`;
  }).join('');
}

function saveEmpNote() {
  const text = document.getElementById('emp-notes-input').value.trim();
  if (!text) return;
  if (!state.empNotes[_empNotesName]) state.empNotes[_empNotesName] = [];
  const ts = new Date().toLocaleString('en-US', {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  state.empNotes[_empNotesName].push({ ts, text });
  persistSave();
  document.getElementById('emp-notes-input').value = '';
  renderEmpNotesList();
  renderDirectory(); // refresh note count badge
}

function deleteEmpNote(name, idx) {
  if (!state.empNotes[name]) return;
  state.empNotes[name].splice(idx, 1);
  persistSave();
  renderEmpNotesList();
  renderDirectory();
}

// ── Float Stats — sourced from the live float_history log (same data as the
// Float & Sitter Dashboard app), NOT the old .xlsm import, so numbers match. ──
function renderFloatStats() {
  const el = document.getElementById('float-stats-content');
  const roleLbEl = document.getElementById('float-role-leaderboard');

  const roleColors = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)' };
  const roleBg     = { RN:'rgba(46,125,209,0.15)', LPN:'rgba(91,33,182,0.15)', CA:'rgba(14,116,144,0.15)' };
  const logEntries = (typeof history !== 'undefined' && Array.isArray(history)) ? history : [];

  // Build count-based leaderboard from log entries
  function leaderboard(role, assignType, color) {
    const counts = {}, lastDate = {};
    logEntries.forEach(e => {
      if (e.role !== role || e.assign !== assignType || !e.staff) return;
      counts[e.staff] = (counts[e.staff]||0) + 1;
      if (!lastDate[e.staff] || e.date > lastDate[e.staff]) lastDate[e.staff] = e.date;
    });
    const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 15);
    if (entries.length === 0) return `<div style="color:var(--text3);font-size:11px;padding:8px;">No data</div>`;

    const maxCount = entries[0][1] || 1;
    return `<table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr>
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:9px;width:24px;">#</th>
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:9px;">Name</th>
        <th style="text-align:center;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:9px;width:50px;">Total</th>
        <th style="padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:9px;">Last Date</th>
      </tr></thead>
      <tbody>${entries.map(([name, cnt], i) => {
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
        return `<tr style="${i%2?'background:rgba(255,255,255,0.02)':''}">
          <td style="padding:4px 8px;text-align:center;">${medal}</td>
          <td style="padding:4px 8px;font-weight:${i<3?'700':'400'};">${name}</td>
          <td style="padding:4px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;font-weight:700;color:${color};">${cnt}</td>
          <td style="padding:4px 8px;font-size:10px;color:var(--text3);font-family:'IBM Plex Mono',monospace;">${lastDate[name]||''}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // ── Role-filtered leaderboard at top of panel (dropdown-driven) ──
  if (roleLbEl) {
    const selectedRole = document.getElementById('fs-role-select')?.value || 'RN';
    roleLbEl.innerHTML = `
      <div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px;">${selectedRole} — Most Floats</div>
        ${leaderboard(selectedRole,'Float',roleColors[selectedRole])}
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px;">${selectedRole} — Most Sitters</div>
        ${leaderboard(selectedRole,'Sitter',roleColors[selectedRole])}
      </div>`;
  }

  if (!el) return;

  if (!logEntries.length) {
    el.innerHTML = `<div style="color:var(--text3);text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:10px;">📋</div>
      No float/sitter log entries yet. Add entries in <strong>Tools → Float &amp; Sitter</strong> or wait for the board to sync.
    </div>`;
    return;
  }

  // Build unit destination frequency breakdown from log entries
  let unitHtml = '<div style="color:var(--text3);font-size:11px;">No destination data available.</div>';
  {
    // { "dest|role|shift": { Float:N, Sitter:N, total:N } }
    const unitMap = {};
    const unitTotals = {};

    logEntries.forEach(e => {
      const dest  = String(e.unit||'').trim() || 'Unknown';
      const role  = String(e.role||'').trim().toUpperCase() || '?';
      const asgn  = String(e.assign||'').trim();
      const shift = String(e.shift||'').trim() || '?';
      if (!asgn || dest === 'Unknown') return;

      const k = `${dest}|||${role}|||${shift}`;
      if (!unitMap[k]) unitMap[k] = { dest, role, shift, Float:0, Sitter:0, LPNtoCA:0, CallOff:0, Other:0, total:0 };

      if (asgn === 'Float')                 { unitMap[k].Float++;    unitMap[k].total++; }
      else if (asgn === 'Sitter')            { unitMap[k].Sitter++;   unitMap[k].total++; }
      else if (asgn === 'LPN in CS')         { unitMap[k].LPNtoCA++;  unitMap[k].total++; }
      else if (asgn === 'Call Off')          { unitMap[k].CallOff++;  unitMap[k].total++; }
      else                                    { unitMap[k].Other++;    unitMap[k].total++; }

      unitTotals[dest] = (unitTotals[dest]||0) + 1;
    });

    const sortedRows = Object.values(unitMap).sort((a,b) => {
      const ta = unitTotals[a.dest]||0, tb = unitTotals[b.dest]||0;
      if (ta !== tb) return tb - ta;
      if (a.dest !== b.dest) return a.dest.localeCompare(b.dest);
      if (a.role !== b.role) return a.role.localeCompare(b.role);
      return a.shift.localeCompare(b.shift);
    });

    const topUnit = Object.entries(unitTotals).sort((a,b)=>b[1]-a[1])[0];

    if (sortedRows.length) {
      unitHtml = `
        ${topUnit ? `<div style="background:rgba(46,125,209,0.1);border:1px solid rgba(46,125,209,0.3);border-radius:6px;padding:8px 14px;margin-bottom:12px;font-size:12px;">
          🏆 Most floated to: <strong style="color:var(--accent2);">${topUnit[0]}</strong> — <span style="font-family:'IBM Plex Mono',monospace;">${topUnit[1]}</span> total assignments
        </div>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr>
            <th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--text3);">Destination Unit</th>
            <th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--text3);">Role</th>
            <th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--text3);">Shift</th>
            <th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--accent2);">Float</th>
            <th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--purple2);">Sitter</th>
            <th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--teal2);">LPN→CA</th>
            <th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--red2);">Call Off</th>
            <th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--white);font-weight:700;">Total</th>
          </tr></thead>
          <tbody>
            ${sortedRows.map((r,i) => `<tr style="${i%2?'background:rgba(255,255,255,0.02)':''}">
              <td style="padding:5px 8px;font-weight:600;">${r.dest}</td>
              <td style="padding:4px 8px;"><span style="background:${roleBg[r.role]||'rgba(100,100,100,0.1)'};color:${roleColors[r.role]||'var(--text2)'};font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;">${r.role}</span></td>
              <td style="padding:4px 8px;font-size:10px;color:var(--text2);">${r.shift}</td>
              <td style="padding:4px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;color:var(--accent2);">${r.Float||0}</td>
              <td style="padding:4px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;color:var(--purple2);">${r.Sitter||0}</td>
              <td style="padding:4px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;color:var(--teal2);">${r.LPNtoCA||0}</td>
              <td style="padding:4px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;color:var(--red2);">${r.CallOff||0}</td>
              <td style="padding:4px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--white);">${r.total}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    }
  }

  // Total counts summary — straight tallies of log entries by type
  const totals = { Float:0, Sitter:0, LPN:0, CallOff:0 };
  logEntries.forEach(e => {
    if (e.assign === 'Float')          totals.Float++;
    else if (e.assign === 'Sitter')    totals.Sitter++;
    else if (e.assign === 'LPN in CS') totals.LPN++;
    else if (e.assign === 'Call Off')  totals.CallOff++;
  });

  el.innerHTML = `
    <!-- Summary counts -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
      ${[
        {label:'Total Floats',   count:totals.Float,   color:'var(--accent2)', bg:'rgba(46,125,209,0.12)'},
        {label:'Total Sitters',  count:totals.Sitter,  color:'var(--purple2)', bg:'rgba(91,33,182,0.12)'},
        {label:'LPN→CA',         count:totals.LPN,     color:'var(--teal2)',   bg:'rgba(14,116,144,0.12)'},
        {label:'Call Offs',      count:totals.CallOff, color:'var(--red2)',    bg:'rgba(179,35,24,0.12)'},
      ].map(s=>`<div style="background:${s.bg};border-radius:8px;padding:10px 16px;min-width:110px;">
        <div style="font-size:22px;font-weight:700;color:${s.color};font-family:'IBM Plex Mono',monospace;">${s.count}</div>
        <div style="font-size:11px;color:var(--text2);">${s.label}</div>
      </div>`).join('')}
    </div>

    <!-- Unit breakdown -->
    <div class="card">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px;">📍 Float by Destination Unit · Role · Shift</div>
      ${unitHtml}
    </div>
  `;
}

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
      + '<div style="font-size:10px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.04em;margin-top:1px;">' + o.category + '</div>'
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
        <div style="font-size:10px;font-weight:700;color:var(--white);">${a.name.split(',')[0]}</div>
        <div style="font-size:9px;color:${roleCol};">${a.job}</div>
        <div style="font-size:10px;margin-top:2px;"><span style="color:var(--text3);">${a.cert}</span> <span style="color:${col};font-weight:700;">${label}</span></div>
        <div style="font-size:9px;color:var(--text3);">${a.exp.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
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
  html += '<div><div style="font-size:10px;font-weight:700;color:var(--accent2);margin-bottom:6px;">🩺 Nurse Topics (RN / LPN)</div>';
  if (edu.nurseTopics && edu.nurseTopics.length) {
    html += '<ul style="margin:0;padding-left:16px;">' +
      edu.nurseTopics.map(t=>`<li style="font-size:11px;color:var(--text2);margin-bottom:3px;">${t}</li>`).join('') + '</ul>';
  } else {
    html += '<span style="font-size:10px;color:var(--text3);">None set</span>';
  }
  html += '</div><div><div style="font-size:10px;font-weight:700;color:var(--teal2);margin-bottom:6px;">🏥 CA Topics</div>';
  if (edu.caTopics && edu.caTopics.length) {
    html += '<ul style="margin:0;padding-left:16px;">' +
      edu.caTopics.map(t=>`<li style="font-size:11px;color:var(--text2);margin-bottom:3px;">${t}</li>`).join('') + '</ul>';
  } else {
    html += '<span style="font-size:10px;color:var(--text3);">None set</span>';
  }
  html += '</div></div>';
  if (edu.notes) {
    html += '<div style="margin-top:8px;font-size:10px;color:var(--text3);background:rgba(255,255,255,0.04);border-radius:6px;padding:8px;">'+edu.notes+'</div>';
  }
  disp.innerHTML = html;
}

function renderEduTopicList(role, topics) {
  const el = document.getElementById(role+'-topics-list');
  if (!el) return;
  if (!topics.length) { el.innerHTML = '<div style="font-size:10px;color:var(--text3);font-style:italic;">No topics yet</div>'; return; }
  el.innerHTML = topics.map((t,i) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:10px;">${t}</span>
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
    box.innerHTML = `<span style="color:var(--red2);font-weight:700;">❌ Deficiency — ${checked}/${total} criteria met</span>${missed.length ? '<ul style="margin:6px 0 0 14px;color:var(--red2);">'+missed.map(m=>`<li style="font-size:10px;">${m}</li>`).join('')+'</ul>' : ''}`;
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
      ${r.comments ? `<div style="color:var(--text3);margin-top:3px;font-size:10px;">${r.comments}</div>` : ''}
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
    box.innerHTML = `<span style="color:var(--red2);font-weight:700;">❌ Deficiency — ${checked}/${total} criteria met</span>${missed.length ? '<ul style="margin:6px 0 0 14px;color:var(--red2);">'+missed.map(m=>`<li style="font-size:10px;">${m}</li>`).join('')+'</ul>' : ''}`;
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
      ${r.comments ? `<div style="color:var(--text3);margin-top:3px;font-size:10px;">${r.comments}</div>` : ''}
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
      `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;padding:4px 6px;border:1px solid rgba(255,255,255,0.1);border-radius:5px;">
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
        <div style="font-size:10px;color:var(--text2);margin-bottom:4px;"><strong>Type:</strong> ${(v.types||[v.type||'—']).join(', ')}</div>
        <div style="font-size:10px;color:var(--text3);">${v.correction || '—'}</div>
        ${v.returnBy ? `<div style="font-size:9px;color:var(--text3);margin-top:4px;">Return by: ${v.returnBy} · Manager: ${v.manager||'—'}</div>` : ''}
        ${v.staffSignature
          ? `<div style="margin-top:6px;display:flex;align-items:center;gap:6px;">
               <span style="font-size:9px;color:var(--green2);font-weight:700;">✍ Signed ${v.staffSignedAt ? new Date(v.staffSignedAt).toLocaleString() : ''}</span>
               <button onclick="viewVarianceStatement('${name.replace(/'/g,"\\'")}',${i})" style="background:none;border:1px solid var(--border);color:var(--text2);border-radius:4px;padding:2px 8px;font-size:9px;cursor:pointer;">View</button>
             </div>`
          : `<div style="margin-top:6px;font-size:9px;color:var(--text3);">✎ Awaiting staff statement/signature</div>`}
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
  ${v.notes ? `<div style="margin-top:8px;font-size:9pt;color:#444;"><strong>Additional Notes:</strong> ${v.notes}</div>` : ''}

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


// Keyed by topic text → { points, objectives, duration, references }
// ══════════════════════════════════════════
const EDU_TOPICS = {
  // ── Stroke & Neuro ──
  'Acute Ischemic Stroke: Recognition & FAST Protocol': {
    duration: '15 min', objectives: 'Staff will identify stroke warning signs and activate stroke code within 5 minutes.',
    points: [
      'FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 911 / activate code',
      'Additional signs: sudden severe headache, vision changes, dizziness, loss of balance',
      'Last known well time — why it matters for tPA eligibility window (4.5 hours)',
      'Immediate actions: activate Stroke Code, obtain IV access, draw stat labs, 12-lead EKG',
      'Do NOT give anything by mouth until swallow screen completed',
      'Document neuro checks every 15 minutes during acute phase',
    ],
    references: 'AHA/ASA Stroke Guidelines 2023 · AOMC Stroke Code Policy'
  },
  'NIH Stroke Scale (NIHSS): Competency & Documentation': {
    duration: '20 min', objectives: 'Staff will accurately administer and document the NIHSS.',
    points: [
      '11 items: LOC, gaze, visual fields, facial palsy, motor arm/leg, limb ataxia, sensory, language, dysarthria, extinction',
      'Score 0 = no deficit; higher scores indicate greater severity',
      'Score every 15 min during first 2 hours post-tPA; hourly for next 22 hours',
      'Worsening ≥4 points from baseline = notify provider immediately',
      'Use certified NIH Stroke Scale training — certification required annually',
      'Document in EHR at admission, 24h, discharge, and with any neuro change',
    ],
    references: 'NIHstrokescale.org · AOMC Stroke Protocol'
  },
  'tPA Administration: Eligibility Criteria & Nursing Responsibilities': {
    duration: '20 min', objectives: 'Staff will state tPA eligibility criteria and monitor for complications.',
    points: [
      'Inclusion: ischemic stroke, age ≥18, deficit measurable on NIHSS, onset within 4.5 hours',
      'Key exclusions: active bleeding, BP >185/110 uncontrolled, recent surgery, anticoagulation',
      'Dose: 0.9 mg/kg (max 90 mg) — 10% bolus over 1 min, remainder over 60 min',
      'During infusion: BP q15 min, neuro checks q15 min, NO anticoagulants for 24h',
      'STOP infusion if: BP >180/105 unresponsive, neuro worsening, angioedema, severe headache',
      'Post-tPA: no Foley, NG, arterial lines for 30 min; no IM injections',
    ],
    references: 'AOMC tPA Administration Policy · AHA 2023 Guidelines'
  },
  'Blood Transfusion Administration & Reaction Management': {
    duration: '15 min', objectives: 'Staff will safely administer blood products and manage transfusion reactions.',
    points: [
      'Verify: two RN identifiers, patient armband + blood product label match at bedside',
      'Start slowly: 25-50 mL/hr for first 15 min — stay at bedside',
      'Vital signs: baseline, 15 min after start, 30 min, hourly, completion',
      'Signs of reaction: fever, chills, back pain, hypotension, hives, SOB — STOP transfusion',
      'Reaction management: stop blood, keep IV open with NS, notify provider, send unit back to blood bank',
      'Transfuse within 4 hours of issue; most products expire 4h after leaving blood bank',
    ],
    references: 'AOMC Blood Administration Policy · AABB Standards'
  },
  'Sepsis Recognition: qSOFA, SIRS Criteria & Lactate': {
    duration: '15 min', objectives: 'Staff will identify early sepsis and initiate the 3-hour bundle.',
    points: [
      'qSOFA (quick screen): RR ≥22, AMS, SBP ≤100 — 2 of 3 = suspect sepsis',
      'SIRS criteria: temp >38 or <36, HR >90, RR >20, WBC >12k or <4k or >10% bands',
      'Sepsis = infection + organ dysfunction (SOFA score increase ≥2)',
      '3-hour bundle: obtain blood cultures x2, lactate, broad-spectrum antibiotics, 30 mL/kg NS if hypotensive',
      'Lactate >2 = tissue hypoperfusion; lactate >4 = high mortality, trigger septic shock protocol',
      'Time matters: 1-hour delay in antibiotics increases mortality by 7%',
    ],
    references: 'Surviving Sepsis Campaign 2021 · AOMC Sepsis Protocol'
  },
  'Central Line Maintenance & CLABSI Bundle Compliance': {
    duration: '15 min', objectives: 'Staff will perform central line care per CLABSI prevention bundle.',
    points: [
      'Daily: assess line necessity — remove if no longer indicated (document indication)',
      'Dressing change: sterile technique, CHG-impregnated sponge, change q7 days or if soiled/loose',
      'Cap changes: needleless connectors q96h and after blood draw or anytime grossly contaminated',
      'CHG bath: daily for all central line patients — document in EHR',
      'Hand hygiene: before and after any line access — no exceptions',
      'Report any insertion site erythema, drainage, or fever to provider — culture before antibiotics',
    ],
    references: 'CDC CLABSI Guidelines · AOMC Central Line Bundle Policy'
  },
  'Pain Assessment: Numeric, FACES, CPOT for Non-Verbal': {
    duration: '10 min', objectives: 'Staff will select the appropriate pain tool and document reassessment.',
    points: [
      'Numeric (0-10): use for alert, oriented patients — ask patient to rate',
      'FACES: use for pediatric, cognitive impairment, or language barriers',
      'CPOT (Critical Care Pain Observation Tool): facial expression, body movements, muscle tension, ventilator compliance',
      'Reassessment: within 30 minutes of any pain intervention — document in EHR',
      'Non-verbal signs: grimacing, guarding, restlessness, elevated HR/BP — treat and reassess',
      'Goal: pain controlled to functional level — not necessarily 0',
    ],
    references: 'AOMC Pain Management Policy · TJC Pain Standards'
  },
  'Pain Management: Multimodal Approach & Opioid Safety': {
    duration: '15 min', objectives: 'Staff will apply multimodal pain strategies and monitor for opioid adverse effects.',
    points: [
      'Multimodal: combine non-opioid (acetaminophen, NSAIDs, ice, positioning) with opioids when needed',
      'Non-pharmacologic: repositioning, distraction, heat/cold, guided breathing, music therapy',
      'Opioid safety: assess sedation level (POSS scale) before each dose',
      'Hold opioid if: POSS score 3-4, RR <8, SpO2 <92% — notify provider',
      'Naloxone: know location on unit, indication, dose (0.4 mg IV/IM), call rapid response',
      'Document: pain score before, intervention given, pain score 30 min after — every time',
    ],
    references: 'AOMC Pain Management Policy · CDC Opioid Prescribing Guidelines'
  },
  'Fall Prevention: ABCDE Bundle & Bed Alarm Compliance': {
    duration: '10 min', objectives: 'Staff will implement fall prevention interventions for high-risk patients.',
    points: [
      'Morse Scale: score ≥45 = high fall risk — implement all precautions',
      'ABCDE: Awareness (yellow armband/magnet), Bed alarm on, Call light within reach, Door open, Environment clear',
      'Hourly rounding: round every hour, ask about pain, position, potty, possessions, proximity',
      'High-risk medications: opioids, benzodiazepines, antihypertensives, diuretics — extra vigilance',
      'Post-fall: do NOT move patient, assess for injury, notify provider, complete incident report',
      'Bed alarm compliance: check alarm is active every time you leave the room',
    ],
    references: 'AOMC Fall Prevention Policy · Morse Fall Scale'
  },
  'Medication Scanning Compliance: 5 Rights & 2 Identifiers': {
    duration: '10 min', objectives: 'Staff will achieve ≥95% medication scanning compliance.',
    points: [
      '5 Rights: Right patient, drug, dose, route, time — verify EVERY administration',
      '2 Identifiers: full name + date of birth — confirm before every medication',
      'Scan the medication AND the patient armband — both required, no exceptions',
      'Override alerts: only override for emergencies — document reason; report patterns to pharmacy',
      'Do not scan for another nurse or batch-scan — this circumvents safety checks',
      'Scanning rate target: ≥95% — unit performance tracked monthly and reported to leadership',
    ],
    references: 'AOMC Medication Administration Policy · TJC NPSG 3.06'
  },
  'Pressure Injury Prevention: Staging & Braden Scale': {
    duration: '15 min', objectives: 'Staff will accurately stage pressure injuries and implement prevention bundle.',
    points: [
      'Braden Scale: <18 = at risk; 15-18 moderate, 13-14 high, ≤12 very high risk',
      'Staging: Stage 1 (non-blanchable erythema), 2 (partial thickness), 3 (full thickness), 4 (bone/tendon), Unstageable, DTI',
      'Prevention bundle: turn q2h, moisture management, nutrition consult, offloading heels',
      'Document skin assessment on admission and each shift — photograph any wounds',
      'Pressure relief: specialty mattress, heel boots, wedge pillow for 30° lateral turn',
      'Report any new skin breakdown to provider and Wound Care team immediately',
    ],
    references: 'NPUAP Pressure Injury Staging · AOMC Skin Integrity Policy'
  },
  'Hand Hygiene Compliance: WHO 5 Moments': {
    duration: '10 min', objectives: 'Staff will perform hand hygiene at all 5 WHO moments.',
    points: [
      'Moment 1: BEFORE touching a patient',
      'Moment 2: BEFORE a clean/aseptic procedure',
      'Moment 3: AFTER body fluid exposure risk',
      'Moment 4: AFTER touching a patient',
      'Moment 5: AFTER touching patient surroundings',
      'Use alcohol-based hand rub for most situations; soap and water for C. diff, norovirus, visible soil',
      'Compliance target: ≥90% — observed compliance is reported monthly',
    ],
    references: 'WHO Hand Hygiene Guidelines · CDC Hand Hygiene'
  },
  'Press Ganey: Nurse Communication Strategies': {
    duration: '10 min', objectives: 'Staff will apply communication techniques that improve patient satisfaction.',
    points: [
      'AIDET: Acknowledge, Introduce, Duration, Explanation, Thank you — use every interaction',
      'Sit at eye level when possible — 1 minute sitting = patient perceives 20 more minutes of care',
      'Explain before you do it: "I am going to take your blood pressure now"',
      'Close the loop: "Is there anything else I can do for you before I leave?"',
      'Respond to call lights within 3 minutes — even if just to say "I\'ll be right with you"',
      'Nurse communication score directly tied to overall satisfaction and CMS reimbursement',
    ],
    references: 'HCAHPS Communication Domain · Press Ganey Nurse Communication'
  },
  // ── CA Topics ──
  'Vital Signs: BP, Pulse, SpO2, Temperature, Respiration Rate': {
    duration: '10 min', objectives: 'CA will obtain accurate vital signs and report abnormal values immediately.',
    points: [
      'Blood pressure: correct cuff size, patient resting 5 min, arm at heart level',
      'Report immediately: SBP >180 or <90, DBP >110, HR >120 or <50, SpO2 <92%, RR <8 or >28',
      'Temperature: oral (most accurate), axillary (add 1°F), tympanic (add 0.5°F)',
      'Report fever ≥38.0°C (100.4°F) or hypothermia <36°C (96.8°F) to nurse',
      'Pulse oximetry: warm fingertip, no nail polish, steady waveform before recording',
      'Document accurately — do not estimate or guess — alert nurse before charting abnormals',
    ],
    references: 'AOMC CA Scope of Practice · Vital Signs Documentation Policy'
  },
  'Proper Lifting & Transfer Techniques: Gait Belt, Hoyer Lift': {
    duration: '15 min', objectives: 'CA will safely transfer patients using appropriate equipment.',
    points: [
      'No-lift policy: use mechanical lift for non-weight bearing or maximum assist patients',
      'Gait belt: position 2 inches above waist, snug but one hand fits under — buckle secured',
      'Hoyer lift: verify weight limit, check sling for tears, lower patient slowly, never leave unattended',
      'Two-person assist: communicate before moving, count together, move on "3"',
      'Patient positioning: HOB ≥30° for aspiration risk patients, 30° lateral turn for skin',
      'Report any patient pain, resistance, or adverse event during transfer to nurse immediately',
    ],
    references: 'AOMC No-Lift Policy · Safe Patient Handling Program'
  },
  'Recognizing Stroke Warning Signs: FAST (Face, Arm, Speech, Time)': {
    duration: '10 min', objectives: 'CA will identify stroke signs and notify nurse immediately.',
    points: [
      'F — Face: ask patient to smile — is one side drooping?',
      'A — Arms: ask patient to raise both arms — does one drift down?',
      'S — Speech: ask patient to repeat a phrase — is speech slurred or strange?',
      'T — Time: if ANY of these are present — call the nurse IMMEDIATELY, note the time',
      'DO NOT leave the patient alone — stay and keep them calm',
      'CA cannot diagnose — but CA is often first to notice a change — early recognition saves brains',
    ],
    references: 'AHA FAST Campaign · AOMC Stroke Code Policy'
  },
  'AIDET Communication Framework: Acknowledge, Introduce, Duration...': {
    duration: '10 min', objectives: 'CA will use AIDET in every patient interaction.',
    points: [
      'A — Acknowledge: make eye contact, greet by name, knock before entering',
      'I — Introduce: state your name and role: "Hi, I\'m [Name], your care assistant today"',
      'D — Duration: set expectations: "Your bath should take about 15 minutes"',
      'E — Explanation: explain what you are doing before you do it — no surprises',
      'T — Thank you: "Thank you for letting me help you today. Is there anything else?"',
      'Patients judge their entire hospital experience on staff communication — you are the face of 3B',
    ],
    references: 'Studer Group AIDET · Press Ganey CA Communication'
  },
  'CA Scope of Practice: What CAs Can & Cannot Do at AOMC': {
    duration: '10 min', objectives: 'CA will identify tasks within and outside their scope.',
    points: [
      'CAN DO: vital signs, ADLs, ambulation assist, I&O, glucometry per training, positioning, skin assessment reporting',
      'CANNOT DO: medication administration, IV access, catheter insertion, interpretation of assessment findings',
      'Gray zone: blood glucose — trained CAs may perform, must report result to nurse before acting',
      'When in doubt: ask your nurse — never perform a task you have not been trained and validated for',
      'Scope violations: patient safety risk, liability, and disciplinary action',
      'Your job is to be the extra eyes and ears — report early, communicate often',
    ],
    references: 'AOMC CA Job Description · NYS Nurse Practice Act'
  },
  'Hand Hygiene: 5 Moments – When, How, Why': {
    duration: '10 min', objectives: 'CA will perform hand hygiene at correct moments.',
    points: [
      '5 Moments: Before patient contact, Before procedure, After body fluid exposure, After patient contact, After patient surroundings',
      'Alcohol gel: 2-3 pumps, rub all surfaces including thumbs and fingernails, 20 seconds',
      'Soap and water: wet hands, soap, 20 seconds, rinse down, dry with paper towel, use towel to turn off faucet',
      'Soap and water required: C. diff, norovirus, visible soil, after restroom',
      'Rings and nail polish harbor bacteria — check unit policy on jewelry',
      'You touch 50–100 patients per shift — your hands are the most common vector for HAIs',
    ],
    references: 'WHO 5 Moments for Hand Hygiene · AOMC Infection Control Policy'
  },
};

// ── Print Education Sheet (page 3) ──────────────────────────────────────────
function printEduSheet() {
  const wk  = getWeekKey(new Date());
  const edu = (state.weeklyEdu[wk]) || { nurseTopics:[], caTopics:[], notes:'' };
  const now = new Date();
  const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  const weekRange = sun.toLocaleDateString('en-US',{month:'short',day:'numeric'}) +
    ' – ' + sat.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  function buildTopicHTML(topic, role) {
    const info = EDU_TOPICS[topic];
    const roleColor = role === 'nurse' ? '#1a3a5c' : '#0e7490';
    const roleLabel = role === 'nurse' ? '🩺 NURSE / LPN TOPIC' : '🏥 CA TOPIC';
    let html = `<div style="page-break-inside:avoid;margin-bottom:24px;border:1px solid #ddd;border-radius:8px;overflow:hidden;">`;
    html += `<div style="background:${roleColor};color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;">
      <strong style="font-size:11pt;">${topic}</strong>
      <span style="font-size:8pt;opacity:0.8;">${roleLabel} · ${info ? info.duration : '10 min'}</span>
    </div>`;
    html += `<div style="padding:12px 14px;">`;
    if (info) {
      html += `<p style="font-size:9pt;color:#444;margin:0 0 10px;font-style:italic;border-left:3px solid ${roleColor};padding-left:8px;"><strong>Objective:</strong> ${info.objectives}</p>`;
      html += `<strong style="font-size:9pt;color:#222;">Discussion Points:</strong><ul style="margin:6px 0 0 0;padding-left:20px;">`;
      info.points.forEach(p => {
        html += `<li style="font-size:9.5pt;margin-bottom:5px;line-height:1.4;">${p}</li>`;
      });
      html += `</ul>`;
      if (info.references) {
        html += `<div style="margin-top:10px;font-size:8pt;color:#888;border-top:1px solid #eee;padding-top:6px;"><strong>References:</strong> ${info.references}</div>`;
      }
    } else {
      // Custom topic with no library entry — print a blank discussion guide
      html += `<strong style="font-size:9pt;color:#222;">Discussion Points:</strong>
      <ul style="margin:6px 0 0 0;padding-left:20px;">
        <li style="font-size:9.5pt;margin-bottom:8px;color:#999;font-style:italic;">Review current policy and procedure with staff.</li>
        <li style="font-size:9.5pt;margin-bottom:8px;color:#999;font-style:italic;">Identify 3 key takeaways relevant to 3B practice.</li>
        <li style="font-size:9.5pt;margin-bottom:8px;color:#999;font-style:italic;">Ask staff: "What would you do if...?" — scenario-based discussion.</li>
      </ul>`;
    }
    // Sign-off grid
    html += `<div style="margin-top:12px;"><div style="font-size:8pt;font-weight:700;color:#555;margin-bottom:6px;">Staff Acknowledgment — I received this education:</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">`;
    for (let i=0; i<8; i++) {
      html += `<div style="border:1px solid #ccc;border-radius:4px;padding:5px 6px;font-size:7.5pt;">
        <div style="border-bottom:1px dotted #ccc;margin-bottom:4px;height:14px;"></div>
        <div style="color:#999;font-size:7pt;">Name / Initials</div>
      </div>`;
    }
    html += `</div></div>`;
    html += `</div></div>`;
    return html;
  }

  const allTopics = [
    ...(edu.nurseTopics||[]).map(t => ({ topic: t, role: 'nurse' })),
    ...(edu.caTopics||[]).map(t => ({ topic: t, role: 'ca' })),
  ];

  if (!allTopics.length) {
    alert('No education topics selected for this week. Click ✏ Edit to add topics first.');
    return;
  }

  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>3B Weekly Education — ${weekRange}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:10pt; color:#111; background:#fff; margin:20px; }
    h1 { font-size:14pt; font-weight:bold; margin-bottom:2px; }
    h2 { font-size:11pt; color:#1a3a5c; border-bottom:2px solid #1a3a5c; padding-bottom:4px; margin:16px 0 10px; }
    @page { size:letter; margin:0.5in; }
    @media print { body { margin:0; } }
  </style></head><body>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:3px solid #1a3a5c;padding-bottom:10px;">
    <div>
      <h1>📚 3B Tele Med Surg — Weekly Education</h1>
      <div style="font-size:9pt;color:#666;margin-top:2px;">Week of ${weekRange} · Printed ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
      <div style="font-size:9pt;color:#666;">AOMC Nursing Operations · 3B Tele Med Surg</div>
    </div>
    <div style="text-align:right;font-size:8pt;color:#888;">
      <div>${allTopics.length} topic${allTopics.length>1?'s':''} this week</div>
      <div>${(edu.nurseTopics||[]).length} Nurse · ${(edu.caTopics||[]).length} CA</div>
    </div>
  </div>

  ${edu.notes ? `<div style="background:#f8f8f8;border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:9pt;"><strong>Notes / Resources:</strong> ${edu.notes}</div>` : ''}

  ${allTopics.map(({topic, role}) => buildTopicHTML(topic, role)).join('')}

  <div style="margin-top:24px;border-top:1px solid #ccc;padding-top:10px;font-size:8pt;color:#888;text-align:center;">
    3B Tele Med Surg · AOMC Nursing Operations · Weekly Staff Education Document
  </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}


const EDU_LIBRARY = {
  nurse: {
    // ── Stroke / Neuro ──
    'Stroke & Neuro': [
      'Acute Ischemic Stroke: Recognition & FAST Protocol',
      'Hemorrhagic Stroke vs. Ischemic Stroke: Key Differences',
      'tPA Administration: Eligibility Criteria & Nursing Responsibilities',
      'NIH Stroke Scale (NIHSS): Competency & Documentation',
      'Post-tPA Monitoring: Hemorrhagic Transformation Signs',
      'Mechanical Thrombectomy: Pre & Post-procedure Nursing Care',
      'Stroke Code Activation: Unit Protocol & Timelines',
      'Door-to-Needle Time: Nursing Role in Achieving <60 Minutes',
      'Dysphagia Screening Post-Stroke: Bedside Assessment',
      'Stroke Discharge Education: What Patients Need to Know',
      'Transient Ischemic Attack (TIA): Management & Secondary Prevention',
      'Anticoagulation Therapy in Atrial Fibrillation & Stroke Prevention',
      'Carotid Artery Disease: Nursing Care & Monitoring',
      '30-Day Readmission Prevention: Stroke Patient Follow-Up',
    ],
    // ── Med-Surg Clinical Skills ──
    'Clinical Skills': [
      'Central Line Maintenance & CLABSI Bundle Compliance',
      'PICC Line Care: Dressing Change & Troubleshooting',
      'IV Access: Peripheral IV Insertion & Phlebitis Assessment',
      'Foley Catheter Insertion & CAUTI Prevention Bundle',
      'Wound Assessment & Dressing Change Technique',
      'Pressure Injury Prevention: Staging & Braden Scale',
      'Nasogastric Tube Insertion & Verification',
      'Blood Transfusion Administration & Reaction Management',
      'Cardiac Telemetry: Rhythm Recognition (Afib, SVT, V-Tach, V-Fib)',
      'Chest Tube Management: Drainage Assessment & Troubleshooting',
      'Arterial Line Management & Waveform Interpretation',
      'Tracheostomy Care & Suctioning Technique',
      'PEG Tube Care & Enteral Feeding Administration',
      'Insulin Administration & Hypoglycemia Management',
      'Subcutaneous Injection & Anticoagulant Administration',
    ],
    // ── Medication Safety ──
    'Medication Safety': [
      'High-Alert Medications: Heparin, Insulin, Opioids',
      'Medication Scanning Compliance: 5 Rights & 2 Identifiers',
      'Anticoagulation Monitoring: INR, aPTT, Anti-Xa Levels',
      'Pain Management: Multimodal Approach & Opioid Safety',
      'Antibiotic Stewardship: Culture Before Treat, SBAR Reporting',
      'IV Medication Compatibility & Infusion Rate Safety',
      'Look-Alike/Sound-Alike (LASA) Drug Errors Prevention',
      'Controlled Substance Wasting & Documentation Compliance',
      'Oral Medication Crushing: Do Not Crush List',
      'Patient-Controlled Analgesia (PCA) Pump Safety',
    ],
    // ── Assessment ──
    'Patient Assessment': [
      'Neurological Assessment: Glasgow Coma Scale & Pupillary Response',
      'Respiratory Assessment: Breath Sounds & O2 Titration',
      'Cardiac Assessment: S3/S4 Gallop, JVD, Edema Grading',
      'Pain Assessment: Numeric, FACES, CPOT for Non-Verbal',
      'Fall Risk Assessment: Morse Scale & Hourly Rounding',
      'SBAR Communication: Reporting Changes to Provider',
      'Sepsis Recognition: qSOFA, SIRS Criteria & Lactate',
      'Rapid Response Activation: When & How to Call',
      'Head-to-Toe Assessment: Prioritization Techniques',
      'Skin Integrity Assessment: Moisture-Associated Skin Damage',
    ],
    // ── Quality & Safety ──
    'Quality & Safety': [
      'Pain Reassessment: 30-Minute Post-Intervention Documentation',
      'Hand Hygiene Compliance: WHO 5 Moments',
      'Isolation Precautions: Contact, Droplet, Airborne, Protective',
      'Patient Identification: Two Identifiers Before All Interventions',
      'Falls Prevention: ABCDE Bundle & Bed Alarm Compliance',
      'Pressure Injury Prevention: Turn & Reposition Documentation',
      'CLABSI Bundle: CHG Bathing, Line Necessity Review',
      'CAUTI Bundle: Foley Indication, Perineal Care',
      'Restraint Use: Indications, Assessment & Alternatives',
      'Event Reporting: RL Solutions & Near-Miss Culture',
      'Hand-off Communication: I-PASS & SBAR Bedside Handoff',
      'Press Ganey: Nurse Communication Strategies',
      'Quiet Hours Protocol: HCAHPS Impact',
    ],
    // ── Policies & Procedures ──
    'Policies & Procedures': [
      'AOMC Stroke Protocol — Door-to-Needle Policy',
      'Blood Administration Policy: Type & Screen, Consent, Monitoring',
      'Rapid Response & Code Blue: AOMC Activation Policy',
      'Restraint Policy: Indications, Documentation, Release Q2H',
      'Fall Prevention Policy: Risk Categories & Interventions',
      'Patient Rights & Grievance: Reporting & Resolution Process',
      'Medication Administration Policy: 5 Rights & Override Policy',
      'Advance Directive / DNR: Documentation & Communication',
      'Discharge Planning Policy: INTERACT, 30-Day Readmission',
      'Mandatory Reporting Policy: Abuse, Neglect, Sentinel Events',
      'Bed Placement & Telemetry Monitoring Policy',
      'Skin Integrity & Wound Care Formulary Policy',
      'Labor & Delivery Diversion & Surge Capacity Policy',
      'HIPAA: Patient Privacy & Social Media Policy',
    ],
  },

  ca: {
    // ── Direct Care Skills ──
    'Direct Care Skills': [
      'Vital Signs: BP, Pulse, SpO2, Temperature, Respiration Rate',
      'Proper Lifting & Transfer Techniques: Gait Belt, Hoyer Lift',
      'Repositioning & Turning: 2-Hour Turn Schedule & Documentation',
      'Oral Care: Toothbrushing, Suction Toothette, Chlorhexidine',
      'Peri-Care & Foley Catheter Hygiene',
      'Incontinence Care & Skin Barrier Application',
      'Bathing: Bed Bath, CHG Bath, Basin Protocol',
      'AM & PM Care: Grooming, Linen Change, Mouth Care',
      'Intake & Output: Accurate Measurement & Documentation',
      'Glucometry: Fingerstick Technique & Reporting Critical Values',
      'Urinal & Bedpan Use: Dignity & Proper Technique',
      'Feeding Assistance: Aspiration Precautions & Positioning',
      'Ambulation Assist: Safe Distance, Gait Belt, Reporting Falls',
      'Compression Device (SCD) Application & Maintenance',
      'Anti-embolism Stockings: Application & Skin Check',
      'Bed Alarm Activation & Fall Prevention Measures',
    ],
    // ── Safety & Observation ──
    'Safety & Observation': [
      'Patient Identification: Two Identifiers Before All Care',
      'Hand Hygiene: 5 Moments – When, How, Why',
      'Isolation Precautions: Contact, Droplet, Airborne — PPE Steps',
      'Fall Prevention: Hourly Rounding, Call Light Within Reach',
      'Restraint Monitoring: Q2H Assessment & Documentation',
      'Reporting Changes: When to Notify the Nurse Immediately',
      'Elopement Risk: Identifying & Responding to Wandering Patients',
      'Sitter Responsibilities: 1:1 Observation Standards',
      'Environmental Safety: Clutter-Free Path, Wet Floors',
      'Fire Safety: RACE & PASS — Extinguisher Use',
      'Emergency Codes: Code Blue, Code Red, Code Gray Roles',
    ],
    // ── Stroke & Neuro Awareness ──
    'Stroke & Neuro Awareness': [
      'Recognizing Stroke Warning Signs: FAST (Face, Arm, Speech, Time)',
      'Your Role in a Stroke Code: Notify, Prepare, Support',
      'Post-Stroke Care: Swallowing Precautions & Aspiration Risk',
      'Neurological Changes: What to Report to the Nurse',
      'Range of Motion (ROM) Exercises: Passive & Active Assist',
      'Positioning the Stroke Patient: HOB, Side-Lying, Contracture Prevention',
    ],
    // ── Communication ──
    'Communication & Teamwork': [
      'Therapeutic Communication: Dignity, Empathy, Active Listening',
      'AIDET Communication Framework: Acknowledge, Introduce, Duration...',
      'Press Ganey & Patient Satisfaction: Your Role in Scores',
      'Responding to Patient Call Lights Within 3 Minutes',
      'Quiet Time Protocol: Reducing Nighttime Disruptions',
      'Cultural Sensitivity & Language Access Services',
      'Workplace Conflict: De-escalation & Reporting Chain',
      'Teamwork & SBAR Lite: Giving Brief Report to the Nurse',
    ],
    // ── Policies & Procedures ──
    'Policies & Procedures': [
      'CA Scope of Practice: What CAs Can & Cannot Do at AOMC',
      'Restraint Policy: CA Role in Q2H Monitoring & Documentation',
      'Fall Prevention Policy: CA Responsibilities & Bed Alarm Use',
      'Patient Rights: Dignity, Privacy, Choice in Daily Care',
      'Abuse & Neglect: Mandatory Reporting Obligation',
      'HIPAA for CAs: What Not to Say, Share, or Post',
      'Incident Reporting: How to File a Report in RL Solutions',
      'Dress Code & Professionalism Policy',
      'Overtime & Scheduling Policy: Call-In, Tardy, NCNS',
      'Workplace Violence Prevention & De-escalation Policy',
      'Hand-Off Communication: CA-to-CA Safe Shift Change',
      'No Lift Policy & Body Mechanics Compliance',
    ],
  },
};

function initEduPickers() {
  renderEduPickerList('nurse', '');
  renderEduPickerList('ca', '');
}

function filterEduPicker(role, query) {
  // Auto-fill the custom input with search text
  const inp = document.getElementById(role+'-topic-input');
  if (inp && query) inp.value = query;
  renderEduPickerList(role, query);
}

function renderEduPickerList(role, query) {
  const el = document.getElementById(role+'-picker-list');
  if (!el) return;
  const lib = EDU_LIBRARY[role] || {};
  const q = (query||'').toLowerCase().trim();
  const edu = getWeekEdu();
  const selected = role === 'nurse' ? (edu.nurseTopics||[]) : (edu.caTopics||[]);

  let html = '';
  let anyShown = false;

  Object.entries(lib).forEach(([category, topics]) => {
    const filtered = topics.filter(t =>
      !q || t.toLowerCase().includes(q)
    );
    if (!filtered.length) return;
    anyShown = true;
    html += `<div style="padding:4px 8px;font-size:9px;font-weight:700;color:var(--text3);background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.06);letter-spacing:0.5px;text-transform:uppercase;">${category}</div>`;
    filtered.forEach(topic => {
      const isAdded = selected.includes(topic);
      const c = role === 'nurse' ? 'var(--accent2)' : 'var(--teal2)';
      html += `<div onclick="${isAdded?'':'quickAddEduTopic(\''+role+'\',\''+topic.replace(/'/g,"\\'")+'\')'}" 
        style="padding:5px 10px;font-size:10px;cursor:${isAdded?'default':'pointer'};display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);${isAdded?'opacity:0.4;':''}hover:background:rgba(255,255,255,0.08);"
        onmouseover="if(!${isAdded})this.style.background='rgba(255,255,255,0.06)'"
        onmouseout="this.style.background=''">
        <span style="flex:1;">${topic}</span>
        ${isAdded
          ? '<span style="color:var(--green2);font-size:9px;margin-left:8px;">✓ Added</span>'
          : `<span style="color:${c};font-size:9px;margin-left:8px;font-weight:700;">+ Add</span>`}
      </div>`;
    });
  });

  if (!anyShown && q) {
    html = `<div style="padding:8px 10px;font-size:10px;color:var(--text3);">No matches — use the custom input below to add "${query}"</div>`;
  } else if (!anyShown) {
    html = `<div style="padding:8px 10px;font-size:10px;color:var(--text3);">Search above to find topics</div>`;
  }

  el.innerHTML = html;
}

function quickAddEduTopic(role, topic) {
  const edu = getWeekEdu();
  const key = role === 'nurse' ? 'nurseTopics' : 'caTopics';
  if (!edu[key]) edu[key] = [];
  if (edu[key].includes(topic)) return;
  edu[key].push(topic);
  persistSave();
  renderBoardWeeklyEdu();
  // Refresh the picker to show it as added
  const searchEl = document.getElementById(role+'-topic-search');
  renderEduPickerList(role, searchEl ? searchEl.value : '');
}

function toggleBoardEduEdit() {
  const ed = document.getElementById('board-edu-edit');
  if (!ed) return;
  const isOpen = ed.style.display !== 'none';
  ed.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    renderBoardWeeklyEdu();
    initEduPickers();
  }
}

function renderBoardDateTabs() {
  buildDateTabs('date-tabs', state.activeBoardDate, 'selectBoardDate', renderBoard);
}

function renderOpenShifts() { /* removed — open shifts widget removed */ }

function selectBoardDate(d) {
  state.activeBoardDate = d;
  renderBoardDateTabs();
  renderBoard();
  updateRatios();
  renderTrackingGrid();
  renderVacancy();
  renderOpenShifts();
}

function renderBoard() {
  const dateKey = state.activeBoardDate;
  const bv = document.getElementById('board-view');

  if (!dateKey) {
    bv.innerHTML = `<div class="card" style="text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:12px;">📋</div>
      <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:8px;">No Staffing Data Loaded</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:16px;">Import your UKG Daily Staffing Condensed export to see the board</div>
      <button class="btn btn-primary" onclick="switchTab(document.querySelector('[data-panel=import]'))">⬆ Go to Import</button>
    </div>`;
    renderBoardCertAlerts();
    renderBoardCompAlerts();
    renderBoardWeeklyEdu();
    renderDocOpps();
    return;
  }

  const shifts = state.placements[dateKey] || {};

  // Group by role category
  const sections = [
    { label:'Unit Clerk', shifts: UC_SHIFTS },
    { label:'RN', shifts: RN_LPN_SHIFTS },
    { label:'Team Nursing', special:'team3c' },
    { label:'LPN', shifts: RN_LPN_SHIFTS },
    { label:'Clinical Assistant', shifts: CA_SHIFTS },
  ];

  let html = '';
  sections.forEach(sec => {
    if (sec.special === 'team3c') {
      html += renderTeamNursingSection(dateKey);
      return;
    }
    const roleFilter = sec.label === 'Unit Clerk' ? 'UC' : sec.label === 'Clinical Assistant' ? 'CA' : sec.label;
    html += `<div style="margin-bottom:18px;">
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">${sec.label}</div>
      <div class="shift-grid">`;
    sec.shifts.forEach(shift => {
      // For RN/LPN: 0700-1900 is a merged display of 0700-1500 + 1500-1900
      const mergedShifts = (shift === '0700-1900' && (roleFilter === 'RN' || roleFilter === 'LPN'))
        ? ['0700-1500', '1500-1900']
        : [shift];

      const allPlaced = mergedShifts.flatMap(s => (shifts[s]||[]).filter(p => p.role === roleFilter));
      // Deduplicate by name — keep first occurrence
      const seenNames = new Set();
      const dedupedPlaced = allPlaced.filter(p => {
        if (seenNames.has(p.name)) return false;
        seenNames.add(p.name);
        return true;
      });
      // Sort: orientation staff go to the bottom of each shift group
      const placements = [
        ...dedupedPlaced.filter(p => !state.empOrientation[p.name]),
        ...dedupedPlaced.filter(p =>  state.empOrientation[p.name]),
      ];
      // Always show all shift columns (empty columns display with 0 count)
      const alwaysShow = true;
      if (placements.length === 0 && !alwaysShow) return;
      // For remove button we need the actual shift key each person is in
      const placementShiftMap = new Map();
      mergedShifts.forEach(s => (shifts[s]||[]).filter(p => p.role === roleFilter)
        .forEach(p => { if (!placementShiftMap.has(p.name)) placementShiftMap.set(p.name, s); }));
      const chargeKey = `${dateKey}|${shift}`;
      const chargeNurse = state.chargeNurses[chargeKey] || null;
      const shiftDisplayLabel = shift;
      html += `<div class="shift-block">
        <div class="shift-block-header">
          <span class="shift-time">${shiftDisplayLabel}</span>
          <span class="shift-count">${placements.length}</span>
        </div>
        <div class="shift-body">`;
      const fullArr = shifts[shift] || []; // kept for charge nurse lookup compatibility
      placements.forEach((p) => {
          const actualShift = placementShiftMap.get(p.name) || shift;
          const actualArr   = shifts[actualShift] || [];
          const originalIdx = actualArr.findIndex(x => x.name === p.name && x.role === p.role);
          const isCharge3B = chargeNurse === p.name;
          const isCharge3C = state.charge3C[chargeKey] === p.name;
          const s3c        = state.staff3C[chargeKey] || {};
          const is3CStaff  = s3c.rn1 === p.name || s3c.rn2 === p.name || s3c.lpn === p.name;
          const eduItems = getEduItems(p.name);
          const eduCount = eduItems.length;
          const eduBadge = eduCount > 0
            ? `<span title="📚 ${eduCount} pending education item${eduCount>1?'s':''}: ${eduItems.slice(0,3).join(' · ')}${eduCount>3?' +more':''}"
                style="background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.5);border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;color:var(--amber2);font-family:'IBM Plex Mono',monospace;cursor:help;flex-shrink:0;">📚 ${eduCount}</span>`
            : '';
          const isOrient = state.empOrientation[p.name] || false;
          const orientAssignKey = `${dateKey}|${shift}|${p.name}`;
          const orientPreceptor = isOrient && state.orientAssign && state.orientAssign[orientAssignKey]
            ? state.orientAssign[orientAssignKey].split(',')[0].trim() : '';
          const orientBadge = isOrient
            ? `<span style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.5);border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700;color:var(--amber2);font-family:'IBM Plex Mono',monospace;flex-shrink:0;letter-spacing:0.3px;" title="${orientPreceptor ? 'Training with: '+orientPreceptor : 'No preceptor assigned'}">ORIENT${orientPreceptor ? ' → '+orientPreceptor : ' ⚠'}</span>`
            : '';
          const isAgencyStaff = !!(state.agencyDates[p.name]?.isAgency);
          const agencyBadge = isAgencyStaff
            ? `<span style="background:rgba(91,33,182,0.15);border:1px solid rgba(139,92,246,0.5);border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700;color:var(--purple2);font-family:'IBM Plex Mono',monospace;flex-shrink:0;letter-spacing:0.3px;">AGENCY</span>`
            : '';
          const isRNLPN = roleFilter === 'RN' || roleFilter === 'LPN';
          const isCA    = roleFilter === 'CA';

          // RN/LPN: only show badge if actual start is 1100
          // Only badge: CA in 2230-0630 who also appears in 1430-1830 (12hr shift, ends 0300)
          const startsAt1430 = isCA && actualShift === '2230-0630'
            && (shifts['1430-1830']||[]).some(x => x.name === p.name && x.role === 'CA');
          const timeBadge = startsAt1430
            ? `<span title="Started 1430 — shift ends 03:00" style="background:rgba(14,116,144,0.15);border:1px solid rgba(14,116,144,0.4);border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700;color:var(--teal2);font-family:'IBM Plex Mono',monospace;flex-shrink:0;">–03:00</span>`
            : '';
          html += `<div class="staff-row${isOrient?' orient-row':''}">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
              <span class="staff-name"${isOrient?' style="color:rgba(245,158,11,0.85);"':''}>${p.name}</span>
              ${isCharge3B ? '<span class="charge-badge">⭐ 3B CHARGE</span>' : ''}
              ${isCharge3C ? '<span class="charge-badge" style="background:rgba(139,92,246,0.2);color:var(--purple2);border:1px solid rgba(139,92,246,0.4);">⭐ 3C CHARGE</span>' : ''}
              ${is3CStaff  ? '<span class="charge-badge" style="background:rgba(91,33,182,0.15);color:var(--purple2);border:1px solid rgba(139,92,246,0.35);font-size:9px;">3C</span>' : ''}
              ${orientBadge}
              ${agencyBadge}
              ${timeBadge}
              ${eduBadge}
            </div>
            <div class="staff-actions">
              <button class="move-btn remove-btn" onclick="removeStaff('${dateKey}','${actualShift}',${originalIdx},'${roleFilter}')" title="Remove">✕</button>
            </div>
          </div>`;
      });
      html += `</div></div>`;
    });
    html += `</div></div>`;
  });

  bv.innerHTML = html;
  updateRatios();
  renderBoardCertAlerts();
  renderBoardCompAlerts();
  renderBoardMessages();
  renderBoardWeeklyEdu();
  renderDocOpps();
}
// Team Nursing (3C triad) — shows the 3C Charge, RN 1, RN 2, and LPN for each
// merged shift column on the Daily Staffing Board, between the RN and LPN sections.
function renderTeamNursingSection(dateKey) {
  let html = `<div style="margin-bottom:18px;">
    <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">🤝 Team Nursing <span style="font-size:9px;color:var(--text3);text-transform:none;letter-spacing:0;font-weight:400;">— 3C Triad</span></div>
    <div class="shift-grid">`;

  RN_LPN_SHIFTS.forEach(shift => {
    const mergedShifts = (shift === '0700-1900') ? ['0700-1500','1500-1900'] : [shift];
    const primaryKey = `${dateKey}|${mergedShifts[0]}`;
    const charge3C = state.charge3C[primaryKey] || '';
    const s3c      = state.staff3C[primaryKey]  || {};

    const slots = [
      { slot:'charge', roleLabel:'3C CHARGE', name: charge3C, badgeStyle:'background:rgba(139,92,246,0.2);color:var(--purple2);border:1px solid rgba(139,92,246,0.4);' },
      { slot:'rn1',    roleLabel:'RN 1',       name: s3c.rn1 || '', badgeStyle:'background:rgba(46,125,209,0.15);color:var(--accent2);border:1px solid rgba(46,125,209,0.35);' },
      { slot:'rn2',    roleLabel:'RN 2',       name: s3c.rn2 || '', badgeStyle:'background:rgba(46,125,209,0.15);color:var(--accent2);border:1px solid rgba(46,125,209,0.35);' },
      { slot:'lpn',    roleLabel:'LPN',        name: s3c.lpn || '', badgeStyle:'background:rgba(91,33,182,0.15);color:var(--purple2);border:1px solid rgba(139,92,246,0.35);' },
    ].filter(s => s.name);

    html += `<div class="shift-block">
      <div class="shift-block-header">
        <span class="shift-time">${shift}</span>
        <span class="shift-count">${slots.length}</span>
      </div>
      <div class="shift-body">`;
    if (slots.length === 0) {
      html += `<div style="padding:10px 0;font-size:11px;color:var(--text3);text-align:center;">— Not yet assigned —</div>`;
    } else {
      slots.forEach(s => {
        html += `<div class="staff-row">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <span class="staff-name">${s.name}</span>
            <span class="charge-badge" style="${s.badgeStyle}">${s.slot === 'charge' ? '⭐ ' : ''}${s.roleLabel}</span>
          </div>
          <div class="staff-actions">
            <button class="move-btn remove-btn" onclick="clearTeam3CSlot('${primaryKey}','${s.slot}')" title="Clear">✕</button>
          </div>
        </div>`;
      });
    }
    html += `</div></div>`;
  });

  html += `</div></div>`;
  return html;
}

function clearTeam3CSlot(key, slot) {
  if (slot === 'charge') {
    state.charge3C[key] = '';
  } else {
    if (!state.staff3C[key]) state.staff3C[key] = {};
    state.staff3C[key][slot] = '';
  }
  persistSave();
  renderBoard();
  renderCharge();
}

// Auto-assign the first available LPN on shift as the 3C LPN, for shifts that
// don't already have one set. Mirrors the "always RN charge" auto-assign pattern.
function autoAssignLPN3C() {
  const dateKey = state.activeChargeDate || state.activeBoardDate;
  if (!dateKey) return;
  const shifts = state.placements[dateKey] || {};
  const nursingShifts = ['0700-1500','1500-1900','1900-0700'];
  let assignedCount = 0;
  nursingShifts.forEach(shift => {
    const chargeKey = `${dateKey}|${shift}`;
    const charge3B  = state.chargeNurses[chargeKey] || '';
    const charge3C  = state.charge3C[chargeKey]     || '';
    if (!state.staff3C[chargeKey]) state.staff3C[chargeKey] = {};
    if (state.staff3C[chargeKey].lpn) return; // already assigned — don't overwrite
    const lpnPool = (shifts[shift]||[]).filter(p => p.role === 'LPN' && p.name !== charge3B && p.name !== charge3C);
    if (lpnPool.length) {
      state.staff3C[chargeKey].lpn = lpnPool[0].name;
      assignedCount++;
    }
  });
  persistSave();
  renderCharge();
  renderBoard();
  showSaveBanner(assignedCount ? `🏥 Assigned first LPN to 3C for ${assignedCount} shift${assignedCount>1?'s':''}` : `No unassigned LPN slots to fill`);
}

function removeStaff(dateKey, shift, idx, role) {
  if (!state.placements[dateKey]) return;
  const arr = (state.placements[dateKey][shift]||[]).filter(p=>p.role===role);
  const target = arr[idx];
  if (!target) return;
  const fullArr = state.placements[dateKey][shift];
  const fi = fullArr.findIndex((p,i) => p.role===role && p.name===target.name && i >= (fullArr.findIndex(x=>x.role===role)));
  // remove first matching
  let removed = false;
  state.placements[dateKey][shift] = fullArr.filter((p,i) => {
    if (!removed && p.role===role && p.name===target.name) { removed=true; return false; }
    return true;
  });
  renderBoard();
  renderDirectory();
}

function addStaffManual() {
  const name = document.getElementById('add-name').value.trim();
  const role = document.getElementById('add-role').value;
  const shift = document.getElementById('add-shift').value;
  const dateKey = state.activeBoardDate;
  if (!name || !dateKey) return;
  if (!state.placements[dateKey]) state.placements[dateKey] = {};
  if (!state.placements[dateKey][shift]) state.placements[dateKey][shift] = [];
  state.placements[dateKey][shift].push({name, role});
  document.getElementById('add-name').value = '';
  renderBoard();
  renderDirectory();
}

function buildStaffDatalist() {
  const dl = document.getElementById('staff-datalist');
  dl.innerHTML = MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
}

// ════════════════════════════════════
//  CHARGE NURSE
// ════════════════════════════════════
function initCharge() {
  state.activeChargeDate = state.dates[0] || null;
  renderChargeDateTabs();
  renderCharge();
  // Restore checkbox state
  const cb = document.getElementById('always-rn-charge');
  if (cb) cb.checked = state.alwaysRNCharge || false;
}

function renderChargeDateTabs() {
  buildDateTabs('charge-date-tabs', state.activeChargeDate, 'selectChargeDate', renderCharge);
}

function selectChargeDate(d) {
  state.activeChargeDate = d;
  renderChargeDateTabs();
  renderCharge();
}

function renderCharge() {
  const dateKey = state.activeChargeDate;
  const cont = document.getElementById('charge-assignments');
  if (!dateKey) { cont.innerHTML = '<div class="card" style="color:var(--text3);text-align:center;padding:30px;">No data loaded</div>'; return; }

  const shifts = state.placements[dateKey] || {};
  const nursingShifts = [
    { key: '0700-1500', label: '0700–1500', name: 'Day' },
    { key: '1500-1900', label: '1500–1900', name: 'Evening' },
    { key: '1900-0700', label: '1900–0700', name: 'Night' },
  ];

  // ── CHARGE NURSE SECTION ──
  let html = `
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">⭐ Charge Nurse Assignments</div>
    <div style="display:grid;grid-template-columns:90px 1fr 1fr;gap:6px;padding:0 14px 8px;margin-bottom:4px;">
      <div></div>
      <div style="font-size:11px;font-weight:700;color:var(--accent2);text-align:center;letter-spacing:0.5px;">🏥 3B CHARGE</div>
      <div style="font-size:11px;font-weight:700;color:var(--purple2);text-align:center;letter-spacing:0.5px;">🏥 3C CHARGE</div>
    </div>`;

  nursingShifts.forEach(({key: shift, label, name}) => {
    const rns       = (shifts[shift]||[]).filter(p => p.role === 'RN' || p.role === 'LPN');
    const chargeKey = `${dateKey}|${shift}`;
    const current3B = state.chargeNurses[chargeKey] || '';
    const current3C = state.charge3C[chargeKey]     || '';
    const rns3C     = rns.filter(r => r.name !== current3B);

    html += `<div class="charge-row">
      <div class="charge-shift-label">${label}<br><span style="font-size:9px;color:var(--text3);font-weight:400;">${name}</span></div>
      <div class="charge-unit-col">
        <select class="charge-select" onchange="setCharge3B('${chargeKey}',this.value)">
          <option value="">— Select 3B Charge —</option>
          ${(state.alwaysRNCharge ? rns.filter(r=>r.role==='RN') : rns).map(r=>`<option value="${r.name}" ${r.name===current3B?'selected':''}>${r.name} (${r.role})</option>`).join('')}
        </select>
        ${current3B ? `<span class="charge-indicator">⭐ ${current3B.split(',')[0].trim()}</span>` : ''}
      </div>
      <div class="charge-unit-col">
        <select class="charge-select" style="border-color:rgba(139,92,246,0.4);" onchange="setCharge3C('${chargeKey}',this.value)">
          <option value="">— Select 3C Charge —</option>
          ${rns3C.map(r=>`<option value="${r.name}" ${r.name===current3C?'selected':''}>${r.name} (${r.role})</option>`).join('')}
        </select>
        ${current3C ? `<span class="charge-indicator ind-3c">⭐ ${current3C.split(',')[0].trim()}</span>` : ''}
      </div>
    </div>`;
  });

  // ── 3C STAFFING SECTION ──
  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:18px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;">🏥 3C Staff Assignments</div>
      <button class="btn btn-ghost btn-sm" onclick="autoAssignLPN3C()" title="Fill any unassigned 3C LPN slot with the first available LPN on that shift">⚡ Auto-Assign First LPN</button>
    </div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px;">Designate LPN and up to 2 RNs working on 3C per shift</div>`;

  nursingShifts.forEach(({key: shift, label, name}) => {
    const rns        = (shifts[shift]||[]).filter(p => p.role === 'RN' || p.role === 'LPN');
    const chargeKey  = `${dateKey}|${shift}`;
    const charge3B   = state.chargeNurses[chargeKey] || '';
    const charge3C   = state.charge3C[chargeKey]     || '';
    const s3c        = state.staff3C[chargeKey]      || {};

    const curLPN = s3c.lpn  || '';
    const curRN1 = s3c.rn1  || '';
    const curRN2 = s3c.rn2  || '';

    // Available pool: scheduled RNs/LPNs, exclude 3B and 3C charge nurses
    const pool = rns.filter(r => r.name !== charge3B && r.name !== charge3C);

    // LPN pool: LPNs only from pool
    const lpnPool = pool.filter(r => r.role === 'LPN');
    // RN pool: RNs only from pool, exclude selected LPN for RN dropdowns
    const rnPool  = pool.filter(r => r.role === 'RN');

    // For RN1/RN2 exclude each other's current selection
    const rn1Pool = rnPool.filter(r => r.name !== curRN2);
    const rn2Pool = rnPool.filter(r => r.name !== curRN1);

    html += `
      <div class="charge-row" style="grid-template-columns:90px 1fr 1fr 1fr;">
        <div class="charge-shift-label">${label}<br><span style="font-size:9px;color:var(--text3);font-weight:400;">${name}</span></div>

        <!-- LPN -->
        <div class="charge-unit-col">
          <div style="font-size:9px;font-weight:700;color:var(--purple2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">LPN</div>
          <select class="charge-select" style="border-color:rgba(91,33,182,0.4);" onchange="setStaff3C('${chargeKey}','lpn',this.value)">
            <option value="">— Select LPN —</option>
            ${lpnPool.length === 0 ? `<option disabled style="color:var(--text3);">No LPN on shift</option>` : ''}
            ${lpnPool.map(r=>`<option value="${r.name}" ${r.name===curLPN?'selected':''}>${r.name}</option>`).join('')}
          </select>
          ${curLPN ? `<span class="charge-indicator ind-3c" style="font-size:9px;">${curLPN.split(',')[0].trim()}</span>` : ''}
        </div>

        <!-- RN 1 -->
        <div class="charge-unit-col">
          <div style="font-size:9px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">RN 1</div>
          <select class="charge-select" onchange="setStaff3C('${chargeKey}','rn1',this.value)">
            <option value="">— Select RN —</option>
            ${rn1Pool.map(r=>`<option value="${r.name}" ${r.name===curRN1?'selected':''}>${r.name}</option>`).join('')}
          </select>
          ${curRN1 ? `<span class="charge-indicator" style="font-size:9px;">${curRN1.split(',')[0].trim()}</span>` : ''}
        </div>

        <!-- RN 2 -->
        <div class="charge-unit-col">
          <div style="font-size:9px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">RN 2</div>
          <select class="charge-select" onchange="setStaff3C('${chargeKey}','rn2',this.value)">
            <option value="">— Select RN —</option>
            ${rn2Pool.map(r=>`<option value="${r.name}" ${r.name===curRN2?'selected':''}>${r.name}</option>`).join('')}
          </select>
          ${curRN2 ? `<span class="charge-indicator" style="font-size:9px;">${curRN2.split(',')[0].trim()}</span>` : ''}
        </div>
      </div>`;
  });

  // ── ORIENTATION ASSIGNMENTS SECTION ──────────────────────────
  // Collect all orientation staff scheduled today across all nursing shifts
  const allOrientees = [];
  nursingShifts.forEach(({key: shift}) => {
    const placed = (shifts[shift] || []).filter(p =>
      (p.role === 'RN' || p.role === 'LPN') && state.empOrientation[p.name]
    );
    placed.forEach(p => {
      if (!allOrientees.find(o => o.name === p.name && o.shift === shift)) {
        allOrientees.push({ name: p.name, role: p.role, shift });
      }
    });
  });

  if (allOrientees.length > 0) {
    html += `
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-top:22px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
        🎓 Orientation Assignments
      </div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:10px;">Assign which staff member each orientee will train with today</div>`;

    allOrientees.forEach(({ name: orientee, role, shift }) => {
      const assignKey = `${dateKey}|${shift}|${orientee}`;
      const current   = (state.orientAssign || {})[assignKey] || '';

      // Preceptor pool: same-shift RN/LPN, not on orientation themselves, exclude the orientee
      const preceptorPool = (shifts[shift] || []).filter(p =>
        (p.role === 'RN' || p.role === 'LPN') &&
        !state.empOrientation[p.name] &&
        p.name !== orientee
      );

      // Highlight certified preceptors
      const poolHtml = preceptorPool.map(p => {
        const isCert = !!(state.empPreceptor && state.empPreceptor[p.name]);
        const label  = isCert ? `${p.name} (${p.role}) 🎓` : `${p.name} (${p.role})`;
        return `<option value="${p.name}" ${p.name === current ? 'selected' : ''}>${label}</option>`;
      }).join('');

      const shiftLabel = nursingShifts.find(s => s.key === shift)?.label || shift;

      html += `
        <div style="display:grid;grid-template-columns:1fr 24px 1fr;align-items:center;gap:10px;padding:8px 14px;margin-bottom:6px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:8px;">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--amber2);">ORIENT · ${shiftLabel}</div>
            <div style="font-size:12px;font-weight:600;color:var(--white);margin-top:2px;">${orientee}</div>
            <div style="font-size:10px;color:var(--text3);">${role}</div>
          </div>
          <div style="text-align:center;font-size:16px;color:var(--text3);">→</div>
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Training With</div>
            <select class="charge-select" style="border-color:rgba(245,158,11,0.45);"
              onchange="setOrientAssign('${dateKey}','${shift}','${orientee.replace(/'/g,"\'")}',this.value)">
              <option value="">— Unassigned —</option>
              ${poolHtml}
            </select>
            ${current ? `<span class="charge-indicator" style="background:rgba(245,158,11,0.15);color:var(--amber2);border-color:rgba(245,158,11,0.35);margin-top:4px;">🎓 ${current.split(',')[0].trim()}</span>` : ''}
          </div>
        </div>`;
    });

    html += `<div style="font-size:9px;color:var(--text3);padding:0 14px;margin-top:4px;">🎓 = Certified Preceptor</div>`;
  }

  cont.innerHTML = html;
}

function setCharge3B(key, name) {
  state.chargeNurses[key] = name;
  // If the newly selected 3B charge was also the 3C charge, clear 3C
  if (name && state.charge3C[key] === name) {
    state.charge3C[key] = '';
  }
  persistSave();
  renderCharge();
  renderBoard();
}

function setOrientAssign(dateKey, shift, orienteeName, preceptorName) {
  if (!state.orientAssign) state.orientAssign = {};
  const key = `${dateKey}|${shift}|${orienteeName}`;
  state.orientAssign[key] = preceptorName;
  persistSave();
  renderCharge();
  renderBoard();
  showSaveBanner(`🎓 ${orienteeName.split(',')[0]} → ${preceptorName ? preceptorName.split(',')[0] : 'unassigned'}`);
}

function toggleDbl(name, val) {
  if (!state.empDbl) state.empDbl = {};
  if (!state.empDbl[name]) state.empDbl[name] = {};
  state.empDbl[name].onLeave = val;
  if (!val) {
    delete state.empDbl[name].startDate;
    delete state.empDbl[name].returnDate;
    if (!Object.keys(state.empDbl[name]).length) delete state.empDbl[name];
  }
  persistSave();
  renderDirectory();
  renderVacancy();
  showSaveBanner(`💾 DBL/Maternity ${val ? 'enabled' : 'removed'} for ${name.split(',')[0]}`);
}

function saveDbl(name, field, val) {
  if (!state.empDbl) state.empDbl = {};
  if (!state.empDbl[name]) state.empDbl[name] = {};
  state.empDbl[name][field] = val;
  persistSave();
}

function toggleAlwaysCharge(name, checked) {
  if (checked) {
    state.empAlwaysCharge[name] = true;
  } else {
    delete state.empAlwaysCharge[name];
  }
  persistSave();
  renderDirectory();
  // Auto-apply to current board date if they're working today
  autoApplyAlwaysCharge();
  renderBoard();
  renderCharge();
}

// Apply empAlwaysCharge flags to current date's charge assignments
function autoApplyAlwaysCharge() {
  const dateKey = state.activeBoardDate;
  if (!dateKey) return;
  const placements = state.placements[dateKey] || {};
  Object.entries(placements).forEach(([shift, staffList]) => {
    // Check if any always-charge RN is in this shift
    const chargeKey = dateKey + '|' + shift;
    const alwaysChargeInShift = (staffList || []).find(p =>
      p.role === 'RN' && state.empAlwaysCharge[p.name]
    );
    if (alwaysChargeInShift && !state.chargeNurses[chargeKey]) {
      state.chargeNurses[chargeKey] = alwaysChargeInShift.name;
    }
  });
  persistSave();
}

function toggleAlwaysRNCharge(checked) {
  state.alwaysRNCharge = checked;
  persistSave();
  if (checked) autoAssignRNCharges();
  renderCharge();
  renderBoard();
}

// Auto-assign charge: for each shift on active date, pick first available RN
function autoAssignRNCharges() {
  const dateKey = state.activeChargeDate || state.activeBoardDate;
  if (!dateKey) return;
  const shifts = ['DAY','EVE1','EVE2','NIGHT'];
  shifts.forEach(shift => {
    const key = dateKey + '|' + shift;
    const placements = state.placements[dateKey] || {};
    const shiftStaff = placements[shift] || [];
    // Find first RN in that shift
    const rn = shiftStaff.find(p => p.role === 'RN');
    if (rn && !state.chargeNurses[key]) {
      state.chargeNurses[key] = rn.name;
    }
  });
  persistSave();
}

function setCharge3C(key, name) {
  state.charge3C[key] = name;
  persistSave();
  renderCharge();
  renderBoard();
}

function setStaff3C(key, slot, name) {
  if (!state.staff3C[key]) state.staff3C[key] = {};
  state.staff3C[key][slot] = name;
  persistSave();
  renderCharge();
  renderBoard();
}

// Keep old setCharge as alias for backward compat
function setCharge(key, name) { setCharge3B(key, name); }

// ════════════════════════════════════
//  DIRECTORY
// ════════════════════════════════════
function getWorkingToday() {
  const dateKey = state.activeBoardDate || state.dates[0];
  if (!dateKey || !state.placements[dateKey]) return new Set();
  return new Set(Object.values(state.placements[dateKey]).flat().map(p=>p.name));
}

// ── Directory sub-tab switchers (shift/status + role are independent, combined with AND) ──
function setDirShiftTab(el) {
  document.querySelectorAll('#dir-shift-tabs .dir-subtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.dirShiftTab = el.dataset.dirshift;
  renderDirectory();
}
function setDirRoleTab(el) {
  document.querySelectorAll('#dir-role-tabs .dir-subtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.dirRoleTab = el.dataset.dirrole;
  renderDirectory();
}

// ── Vacancy Rate ──
function getStaffOnShift(role, shifts) {
  const dayShiftKeys = role==='CA' ? ['0630-1430','0630-1830'] : ['0700-1500'];
  const eveShiftKeys = role==='CA' ? ['1430-1830','1830-2230','1430-0300'] : ['1500-1900'];
  const ngtShiftKeys = role==='CA' ? ['2230-0630','1830-0630'] : ['1900-0700'];

  // Use FTE values instead of headcount
  function getFTE(name) {
    return parseFloat(state.empFTE[name]) || 1.0;
  }

  const dayNames = new Set();
  const eveNames = new Set();
  const ngtNames = new Set();

  dayShiftKeys.forEach(s => (shifts[s]||[]).filter(p=>p.role===role).forEach(p=>dayNames.add(p.name)));
  eveShiftKeys.forEach(s => (shifts[s]||[]).filter(p=>p.role===role).forEach(p=>eveNames.add(p.name)));
  ngtShiftKeys.forEach(s => (shifts[s]||[]).filter(p=>p.role===role).forEach(p=>ngtNames.add(p.name)));

  // Also count staff with empShifts designation
  MASTER_STAFF.filter(s => s.job === role).forEach(s => {
    const sh    = state.empShifts[s.name];
    const hours = role === 'CA' ? (state.empCAHours[s.name] || '') : '';
    if (sh === 'DAY'  || sh === 'BOTH') {
      if (!hours || hours === '8')  dayNames.add(s.name);
      if (hours === '12')           dayNames.add(s.name);
    }
    if (sh === 'EVE'  || sh === 'BOTH') eveNames.add(s.name);
    if (sh === 'NIGHT'|| sh === 'BOTH') {
      if (!hours || hours === '8')  ngtNames.add(s.name);
      if (hours === '12')           ngtNames.add(s.name);
    }
  });

  const allNames = new Set([...dayNames, ...eveNames, ...ngtNames]);

  // Sum FTE values — round to 1 decimal for display
  function sumFTE(nameSet) {
    return Math.round([...nameSet].reduce((sum, name) => sum + getFTE(name), 0) * 10) / 10;
  }

  return {
    day:   sumFTE(dayNames),
    eve:   sumFTE(eveNames),
    night: sumFTE(ngtNames),
    total: sumFTE(allNames),
  };
}

function renderVacancy() {
  const dateKey = state.activeBoardDate || state.dates[0];
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};

  // ── Working Budget vs Full Budget ─────────────────────────────
  const budgetSplitEl = document.getElementById('budget-split-summary');
  if (budgetSplitEl) {
    const roles = ['RN','LPN','CA'];
    const counts = { working:{RN:0,LPN:0,CA:0}, full:{RN:0,LPN:0,CA:0}, dbl:{RN:0,LPN:0,CA:0}, orient:{RN:0,LPN:0,CA:0} };

    MASTER_STAFF.forEach(s => {
      if (!roles.includes(s.job)) return;
      const onDbl    = !!(state.empDbl?.[s.name]?.onLeave);
      const onOrient = !!(state.empOrientation?.[s.name]);
      counts.full[s.job]++;
      if (onDbl)    counts.dbl[s.job]++;
      if (onOrient) counts.orient[s.job]++;
      if (!onDbl && !onOrient) counts.working[s.job]++;
    });

    const total = (obj) => Object.values(obj).reduce((a,b)=>a+b,0);
    const wTotal = total(counts.working);
    const fTotal = total(counts.full);
    const dTotal = total(counts.dbl);
    const oTotal = total(counts.orient);

    const roleRow = (label, cls, role) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span class="tag tag-${cls}" style="font-size:9px;">${label}</span>
        <span style="font-size:12px;font-weight:700;color:var(--white);">${counts.working[role]}</span>
      </div>`;
    const roleRowFull = (label, cls, role) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span class="tag tag-${cls}" style="font-size:9px;">${label}</span>
        <span style="font-size:12px;font-weight:700;color:var(--white);">${counts.full[role]}</span>
      </div>`;

    budgetSplitEl.innerHTML = `
      <div style="background:rgba(37,168,104,0.08);border:1px solid rgba(37,168,104,0.3);border-radius:10px;padding:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--green2);margin-bottom:2px;">💼 Working Budget</div>
        <div style="font-size:9px;color:var(--text3);margin-bottom:10px;">Excludes DBL/Maternity &amp; Orientation</div>
        ${roleRow('RN','rn','RN')}${roleRow('LPN','lpn','LPN')}${roleRow('CA','ca','CA')}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;margin-top:4px;">
          <span style="font-size:10px;font-weight:700;color:var(--white);">Total</span>
          <span style="font-size:16px;font-weight:700;color:var(--green2);">${wTotal}</span>
        </div>
        ${dTotal>0?`<div style="font-size:9px;color:var(--purple2);margin-top:4px;">🤱 ${dTotal} on DBL/Maternity</div>`:''}
        ${oTotal>0?`<div style="font-size:9px;color:var(--amber2);">🎓 ${oTotal} in Orientation</div>`:''}
      </div>
      <div style="background:rgba(46,125,209,0.08);border:1px solid rgba(46,125,209,0.3);border-radius:10px;padding:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:2px;">👥 Full Budget</div>
        <div style="font-size:9px;color:var(--text3);margin-bottom:10px;">All staff including leaves &amp; orientation</div>
        ${roleRowFull('RN','rn','RN')}${roleRowFull('LPN','lpn','LPN')}${roleRowFull('CA','ca','CA')}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;margin-top:4px;">
          <span style="font-size:10px;font-weight:700;color:var(--white);">Total</span>
          <span style="font-size:16px;font-weight:700;color:var(--accent2);">${fTotal}</span>
        </div>
        <div style="font-size:9px;color:var(--text3);margin-top:4px;">
          ${dTotal>0?`🤱 ${dTotal} DBL/Mat · `:''}${oTotal>0?`🎓 ${oTotal} Orient · `:''}${wTotal} active
        </div>
      </div>`;
  }

  const roleRows = [
    { role:'RN',  prefix:'rn',  periods:['total','day','ngt'] },
    { role:'LPN', prefix:'lpn', periods:['total','day','ngt'] },
    { role:'CA',  prefix:'ca',  periods:['total','day','eve','ngt'] },
  ];

  let hasOverBudget = false;
  let totalVacant = 0, totalBudget = 0;
  const summaryBadges = [];

  roleRows.forEach(({ role, prefix, periods }) => {
    const counts = getStaffOnShift(role, shifts);

    periods.forEach(period => {
      const budgetEl = document.getElementById(`vac-${prefix}-${period}-budget`);
      const filledEl = document.getElementById(`vac-${prefix}-${period}-filled`);
      const vacantEl = document.getElementById(`vac-${prefix}-${period}-vacant`);
      const pctEl    = document.getElementById(`vac-${prefix}-${period}-pct`);
      if (!filledEl) return;

      const budgetVal = budgetEl?.value ? parseInt(budgetEl.value) : null;
      if (budgetEl?.value) {
        if (!state.vacancyBudgets) state.vacancyBudgets = {};
        state.vacancyBudgets[`${prefix}-${period}`] = parseInt(budgetEl.value);
        persistSave();
      }

      const filledKey = period === 'total' ? 'total' : period === 'day' ? 'day' : period === 'eve' ? 'eve' : 'night';
      const filled = counts[filledKey] || 0;
      filledEl.textContent = filled;

      const cell = filledEl.closest('.vacancy-cell');

      if (budgetVal) {
        const diff   = budgetVal - filled; // positive = vacant, negative = over budget
        const isOver = diff < 0;
        const pct    = Math.abs((diff / budgetVal) * 100).toFixed(0);

        if (period === 'total') {
          totalBudget += budgetVal;
          if (!isOver) totalVacant += diff;
          summaryBadges.push({ role, period, filled, budgetVal, diff, isOver });
        }

        if (isOver) {
          hasOverBudget = true;
          vacantEl.textContent = `+${Math.abs(diff)} Over`;
          vacantEl.className   = 'vacancy-num vacancy-over';
          pctEl.textContent    = pct + '% Over';
          pctEl.className      = 'vacancy-num vacancy-over';
          if (cell) cell.style.background = 'rgba(179,35,24,0.15)';
        } else {
          vacantEl.textContent = diff;
          pctEl.textContent    = pct + '%';
          const cls = pct >= 20 ? 'vacancy-red' : pct >= 10 ? 'vacancy-amber' : 'vacancy-green';
          vacantEl.className   = `vacancy-num ${cls}`;
          pctEl.className      = `vacancy-num ${cls}`;
          if (cell) cell.style.background = '';
        }
      } else {
        vacantEl.textContent = '—'; pctEl.textContent = '—';
        vacantEl.className = 'vacancy-num'; pctEl.className = 'vacancy-num';
        if (cell) cell.style.background = '';
      }
    });
  });

  // Update panel border for over-budget
  const panel = document.getElementById('vacancy-panel');
  if (panel) panel.className = `vacancy-panel${hasOverBudget ? ' has-overbudget' : ''}`;

  // Summary badges
  const badgesEl = document.getElementById('vacancy-summary-badges');
  if (badgesEl) {
    badgesEl.innerHTML = summaryBadges.map(b => {
      const isOver = b.diff < 0;
      const pct    = Math.abs(((b.diff) / b.budgetVal) * 100).toFixed(0);
      const color  = isOver ? 'var(--red2)' : b.diff <= 1 ? 'var(--amber2)' : 'var(--green2)';
      const bg     = isOver ? 'rgba(179,35,24,0.15)' : b.diff <= 1 ? 'rgba(180,83,9,0.12)' : 'rgba(26,122,74,0.1)';
      const label  = isOver ? `🔴 ${b.role} OVER by ${Math.abs(b.diff)}` : `${b.diff === 0 ? '🟡' : '🟢'} ${b.role}: ${b.diff} open`;
      return `<span style="padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;color:${color};background:${bg};font-family:'IBM Plex Mono',monospace;">${label}</span>`;
    }).join('');
  }

  // 6-Week Forecast
  renderVacancyForecast(shifts);
}

function buildForecastPrintHtml() {
  // Builds the 6-week forecast as a print-friendly HTML string
  const today = new Date(); today.setHours(0,0,0,0);

  function parseDate(str) {
    if (!str) return null;
    const p = str.toString().split('/');
    if (p.length < 3) return null;
    const yr = parseInt(p[2]), mo = parseInt(p[0]), dy = parseInt(p[1]);
    if (!yr || !mo || !dy) return null;
    const fullYr = yr < 100 ? 2000 + yr : yr;
    const d = new Date(fullYr, mo - 1, dy);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDate(d) { return d ? `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear().toString().slice(2)}` : ''; }
  function fmtDateLong(d) { return d ? d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''; }

  const weeks = Array.from({length:6}, (_,w) => {
    const s = new Date(today); s.setDate(today.getDate() + w*7);
    const e = new Date(s); e.setDate(s.getDate()+6);
    return { start:s, end:e, contracts:[], certs:[] };
  });

  const budgets = state.vacancyBudgets || {};
  const roleKeys = ['RN','LPN','CA'];
  const departing = { RN:[0,0,0,0,0,0], LPN:[0,0,0,0,0,0], CA:[0,0,0,0,0,0] };

  const CERT_FIELDS = [
    {key:'acls',label:'ACLS'},{key:'bls',label:'BLS/CPR'},{key:'nihss',label:'NIHSS'},
    {key:'pivInsertion',label:'PIV'},{key:'bloodAdmin',label:'Blood Admin'},
    {key:'telemetry',label:'Telemetry'},{key:'ecgAcquisition',label:'12-Lead ECG'},
    {key:'tncc',label:'TNCC'},{key:'cen',label:'CEN'},{key:'pals',label:'PALS'},
    ...[1,2,3,4,5].map(n=>({key:`custom${n}_date`,label:`Custom ${n}`}))
  ];

  MASTER_STAFF.filter(s=>s.job!=='NURSE MGR').forEach(s => {
    const agency = state.agencyDates[s.name] || {};
    const certs  = state.certs[s.name] || {};
    const empShift = state.empShifts[s.name] || '';
    const shiftIcon = empShift==='DAY'?'☀️':empShift==='NIGHT'?'🌙':empShift==='BOTH'?'↔':'';

    ['contractEnd','extensionEnd'].forEach(field => {
      const d = parseDate(agency[field]);
      if (!d) return;
      weeks.forEach((wk,wi) => {
        if (d >= wk.start && d <= wk.end) {
          wk.contracts.push({name:s.name, role:s.job, type:field==='contractEnd'?'Contract End':'Extension End', date:agency[field], shift:shiftIcon});
          for (let fw=wi; fw<6; fw++) departing[s.job][fw]++;
        }
      });
    });

    CERT_FIELDS.forEach(({key,label}) => {
      const dt = certs[key];
      const d  = dt ? new Date(dt+'T12:00:00') : null;
      if (!d) return;
      const daysAway = Math.round((d-today)/86400000);
      if (daysAway < 0 || daysAway > 42) return;
      weeks.forEach((wk,wi) => {
        if (d >= wk.start && d <= wk.end)
          wk.certs.push({name:s.name,role:s.job,cert:label,date:dt,shift:shiftIcon,daysAway});
      });
    });
  });

  const activeShifts = (state.activeBoardDate ? state.placements[state.activeBoardDate] : null) || {};
  const baselineFilled = {
    RN:  getStaffOnShift('RN',  activeShifts).total,
    LPN: getStaffOnShift('LPN', activeShifts).total,
    CA:  getStaffOnShift('CA',  activeShifts).total,
  };

  const rColors = {RN:'#1d4ed8',LPN:'#7c3aed',CA:'#0e7490'};

  let rows = '';
  weeks.forEach((wk,wi) => {
    const isNow = wi === 0;
    const dateRange = `${fmtDate(wk.start)} – ${fmtDate(wk.end)}`;
    const weekLabel = isNow ? 'THIS WEEK' : `Week ${wi+1}`;
    const hasEvents = wk.contracts.length || wk.certs.length;

    let events = '';
    if (!hasEvents) {
      // Skip weeks with no events in the manager print
      return;
    } else {
      wk.contracts.forEach(ev => {
        events += `<div style="padding:2px 0;display:flex;align-items:center;gap:5px;">
          <span style="font-size:8pt;font-weight:700;padding:1px 5px;border-radius:3px;background:#fee2e2;color:#b91c1c;">CONTRACT</span>
          <span style="font-size:8pt;font-weight:700;color:${rColors[ev.role]};border:1px solid ${rColors[ev.role]};border-radius:3px;padding:1px 4px;">${ev.role}</span>
          ${ev.shift?`<span style="font-size:9pt;">${ev.shift}</span>`:''}
          <span style="font-weight:700;font-size:10pt;">${ev.name}</span>
          <span style="color:#6b7280;font-size:9pt;">${ev.type} · ${ev.date}</span>
        </div>`;
      });
      wk.certs.forEach(ev => {
        const urgBg  = ev.daysAway <= 7  ? '#fee2e2' : '#fef3c7';
        const urgCol = ev.daysAway <= 7  ? '#b91c1c' : '#b45309';
        events += `<div style="padding:2px 0;display:flex;align-items:center;gap:5px;">
          <span style="font-size:8pt;font-weight:700;padding:1px 5px;border-radius:3px;background:${urgBg};color:${urgCol};">${ev.cert}</span>
          <span style="font-size:8pt;font-weight:700;color:${rColors[ev.role]};border:1px solid ${rColors[ev.role]};border-radius:3px;padding:1px 4px;">${ev.role}</span>
          ${ev.shift?`<span style="font-size:9pt;">${ev.shift}</span>`:''}
          <span style="font-weight:700;font-size:10pt;">${ev.name}</span>
          <span style="color:#6b7280;font-size:9pt;">Exp: ${ev.date} · ${ev.daysAway}d</span>
        </div>`;
      });
    }

    let proj = roleKeys.map(role => {
      const budget = budgets[`${role.toLowerCase()}-total`] || null;
      if (!budget) return '';
      const dep    = departing[role]?.[wi] || 0;
      const filled = Math.round(Math.max(0, baselineFilled[role] - dep) * 10) / 10;
      const vacant = Math.round((budget - filled) * 10) / 10;
      const isOver = vacant < 0;
      const color  = isOver ? '#b91c1c' : vacant===0 ? '#b45309' : '#16a34a';
      const label  = isOver ? `+${Math.abs(vacant)} over` : `${vacant} open`;
      return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
        <span style="font-size:8pt;font-weight:700;color:${rColors[role]}">${role}</span>
        <span style="font-size:9pt;font-weight:700;color:${color};font-family:monospace;">${filled}/${budget} · ${label}</span>
      </div>`;
    }).filter(Boolean).join('') || '<span style="color:#9ca3af;font-size:9pt;">Enter budgets</span>';

    const rowBg = wk.contracts.length ? '#fff8f8' : wk.certs.length ? '#fffbeb' : '#fff';
    rows += `<tr style="background:${rowBg};${isNow?'font-weight:700;':''}">
      <td style="padding:7px 8px;border:1px solid #d1d5db;white-space:nowrap;font-size:9pt;font-weight:${isNow?'700':'400'};color:${isNow?'#1d4ed8':'#374151'};">${weekLabel}<br><span style="font-size:7.5pt;color:#9ca3af;font-weight:400;">${dateRange}</span></td>
      <td style="padding:7px 8px;border:1px solid #d1d5db;">${events}</td>
      <td style="padding:7px 8px;border:1px solid #d1d5db;min-width:150px;">${proj}</td>
    </tr>`;
  });

  return `
    <div style="font-size:12pt;font-weight:700;margin-bottom:6px;">📈 6-Week Forecast</div>
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
      <thead><tr style="background:#f0f0f0;">
        <th style="padding:6px 8px;border:1px solid #999;text-align:left;width:100px;">Week</th>
        <th style="padding:6px 8px;border:1px solid #999;text-align:left;">Departures &amp; Cert Expirations</th>
        <th style="padding:6px 8px;border:1px solid #999;text-align:left;width:170px;">Projected Vacancy (FTE)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderVacancyForecast(shifts) {
  const el = document.getElementById('vacancy-forecast');
  if (!el) return;

  const today = new Date(); today.setHours(0,0,0,0);

  function parseDate(str) {
    if (!str) return null;
    const p = str.toString().split('/');
    if (p.length < 3) return null;
    const yr = parseInt(p[2]); const mo = parseInt(p[0]); const dy = parseInt(p[1]);
    if (!yr || !mo || !dy) return null;
    // Handle 2-digit year
    const fullYr = yr < 100 ? 2000 + yr : yr;
    const d = new Date(fullYr, mo - 1, dy);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(d) {
    return d ? `${d.getMonth()+1}/${d.getDate()}` : '';
  }

  // Build 6 week slots
  const weeks = Array.from({length: 6}, (_, w) => {
    const start = new Date(today); start.setDate(today.getDate() + w * 7);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    return { start, end, contracts: [], certs: [], callouts: [] };
  });

  const budgets = state.vacancyBudgets || {};
  const roleColors = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)' };
  const roleBg     = { RN:'rgba(46,125,209,0.15)', LPN:'rgba(91,33,182,0.15)', CA:'rgba(14,116,144,0.15)' };

  // Track running vacancy delta per role per week (cumulative departures)
  const roleKeys = ['RN','LPN','CA'];
  const departing = { RN: [0,0,0,0,0,0], LPN: [0,0,0,0,0,0], CA: [0,0,0,0,0,0] };

  // Cert fields to track
  const CERT_FIELDS = [
    { key:'ACLS',       label:'ACLS'        },
    { key:'BLS',        label:'BLS'         },
    { key:'NIHSS',      label:'NIHSS'       },
    { key:'License',    label:'License'     },
    { key:'HealthEval', label:'Health Eval' },
    { key:'FitTest',    label:'Fit Test'    },
  ];

  MASTER_STAFF.filter(s => s.job !== 'NURSE MGR').forEach(s => {
    const agency   = state.agencyDates[s.name] || {};
    const certs    = state.certs[s.name] || {};
    const empShift = state.empShifts[s.name] || '';
    const shiftIcon = empShift === 'DAY' ? '☀️' : empShift === 'NIGHT' ? '🌙' : empShift === 'BOTH' ? '↔' : '';

    // Contract / extension end dates → budget departures
    ['contractEnd','extensionEnd'].forEach(field => {
      const d = parseDate(agency[field]);
      if (!d) return;
      weeks.forEach((wk, wi) => {
        if (d >= wk.start && d <= wk.end) {
          wk.contracts.push({ name: s.name, role: s.job, type: field === 'contractEnd' ? 'Contract End' : 'Extension End', date: agency[field], shift: shiftIcon });
          departing[s.job] = departing[s.job] || [0,0,0,0,0,0];
          for (let fw = wi; fw < 6; fw++) departing[s.job][fw]++;
        }
      });
    });

    // Cert expirations
    CERT_FIELDS.forEach(({ key, label }) => {
      const d = parseDate(certs[key]);
      if (!d) return;
      const daysAway = Math.round((d - today) / 86400000);
      if (daysAway < 0 || daysAway > 42) return;
      weeks.forEach((wk, wi) => {
        if (d >= wk.start && d <= wk.end) {
          wk.certs.push({ name: s.name, role: s.job, cert: label, date: certs[key], shift: shiftIcon, daysAway });
        }
      });
    });
  });

  // Current filled counts (baseline)
  const activeShifts = (state.activeBoardDate ? state.placements[state.activeBoardDate] : null) || {};
  const baselineFilled = {
    RN:  getStaffOnShift('RN',  activeShifts).total,
    LPN: getStaffOnShift('LPN', activeShifts).total,
    CA:  getStaffOnShift('CA',  activeShifts).total,
  };

  // Build table
  const hasAnyEvent = weeks.some(w => w.contracts.length || w.certs.length);

  let html = `<table class="forecast-table">
    <thead>
      <tr>
        <th style="width:90px;">Week</th>
        <th style="width:120px;">Dates</th>
        <th>Departures &amp; Cert Expirations</th>
        <th style="text-align:center;width:180px;">Projected Vacancy</th>
      </tr>
    </thead>
    <tbody>`;

  weeks.forEach((wk, wi) => {
    const isNow  = wi === 0;
    const dateRange = `${fmtDate(wk.start)} – ${fmtDate(wk.end)}`;
    const hasEvents = wk.contracts.length > 0 || wk.certs.length > 0;
    const rowBg  = wk.contracts.length ? 'rgba(179,35,24,0.06)' : wk.certs.length ? 'rgba(180,83,9,0.05)' : '';

    // Event HTML
    let eventHtml = '';
    if (!hasEvents) {
      eventHtml = `<span style="color:var(--green2);font-size:10px;">✓ No departures or expirations</span>`;
    } else {
      wk.contracts.forEach(ev => {
        eventHtml += `<div style="display:flex;align-items:center;gap:5px;padding:2px 0;">
          <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:rgba(179,35,24,0.25);color:var(--red2);">CONTRACT</span>
          <span style="background:${roleBg[ev.role]};color:${roleColors[ev.role]};font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;">${ev.role}</span>
          ${ev.shift?`<span>${ev.shift}</span>`:''}
          <span style="font-weight:600;font-size:11px;">${ev.name}</span>
          <span style="color:var(--text3);font-size:10px;">${ev.type} · ${ev.date}</span>
        </div>`;
      });
      wk.certs.forEach(ev => {
        const urgency = ev.daysAway <= 7 ? 'rgba(179,35,24,0.25);color:var(--red2)' : 'rgba(180,83,9,0.25);color:var(--amber2)';
        eventHtml += `<div style="display:flex;align-items:center;gap:5px;padding:2px 0;">
          <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${urgency};">${ev.cert}</span>
          <span style="background:${roleBg[ev.role]};color:${roleColors[ev.role]};font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;">${ev.role}</span>
          ${ev.shift?`<span>${ev.shift}</span>`:''}
          <span style="font-weight:600;font-size:11px;">${ev.name}</span>
          <span style="color:var(--text3);font-size:10px;">Exp: ${ev.date} · ${ev.daysAway}d</span>
        </div>`;
      });
    }

    // Projected vacancy per role
    let projHtml = roleKeys.map(role => {
      const budget = budgets[`${role.toLowerCase()}-total`] || null;
      if (!budget) return '';
      const dep      = departing[role]?.[wi] || 0;
      const filled   = Math.round(Math.max(0, baselineFilled[role] - dep) * 10) / 10;
      const vacant   = Math.round((budget - filled) * 10) / 10;
      const isOver   = vacant < 0;
      const color    = isOver ? 'var(--red2)' : vacant === 0 ? 'var(--amber2)' : 'var(--green2)';
      const label    = isOver ? `+${Math.abs(vacant)} over` : `${vacant} open`;
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;padding:2px 0;">
        <span style="background:${roleBg[role]};color:${roleColors[role]};font-weight:700;padding:1px 5px;border-radius:3px;font-size:9px;">${role}</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:${color};">${filled}/${budget} · ${label}</span>
      </div>`;
    }).filter(Boolean).join('') || '<span style="color:var(--text3);font-size:10px;">Enter budgets above</span>';

    html += `<tr style="background:${rowBg}">
      <td>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:${isNow?'700':'400'};color:${isNow?'var(--accent2)':'var(--text2)'};">${isNow?'THIS WEEK':`Week ${wi+1}`}</div>
      </td>
      <td><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text2);">${dateRange}</div></td>
      <td>${eventHtml}</td>
      <td>${projHtml}</td>
    </tr>`;
  });

  html += '</tbody></table>';

  // Cert summary section — all expirations in next 6 weeks sorted by date
  const allCerts = weeks.flatMap(w => w.certs).sort((a,b) => parseDate(a.date) - parseDate(b.date));
  if (allCerts.length > 0) {
    html += `<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
      <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:8px;">🏥 Certification Expirations (Next 6 Weeks)</div>
      <table class="forecast-table">
        <thead><tr>
          <th>Staff Member</th><th>Role</th><th>Shift</th><th>Certification</th><th>Expiration</th><th style="text-align:center;">Days Away</th>
        </tr></thead>
        <tbody>
        ${allCerts.map(ev => {
          const urgColor = ev.daysAway <= 7 ? 'var(--red2)' : ev.daysAway <= 14 ? 'var(--amber2)' : 'var(--text2)';
          return `<tr>
            <td style="font-weight:600;">${ev.name}</td>
            <td><span style="background:${roleBg[ev.role]};color:${roleColors[ev.role]};font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;">${ev.role}</span></td>
            <td>${ev.shift || '—'}</td>
            <td>${ev.cert}</td>
            <td style="font-family:'IBM Plex Mono',monospace;">${ev.date}</td>
            <td style="text-align:center;font-family:'IBM Plex Mono',monospace;font-weight:700;color:${urgColor};">${ev.daysAway}d</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
  }


  // CA Scheduling Requirements section
  const _caStaff = MASTER_STAFF.filter(s=>s.job==='CA');
  let _caSect = '<div style="margin-top:16px;"><div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:10px;">🏥 CA Scheduling Requirements</div><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:rgba(255,255,255,0.06);"><th style="padding:8px 10px;text-align:left;color:var(--teal2);">CA Staff</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">FTE</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Shifts/4wk</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Hrs Target</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Shift Mix</th><th style="padding:8px 6px;text-align:center;color:var(--text3);">Weekend</th></tr></thead><tbody>';
  _caStaff.forEach((s,i) => {
    const _fte=parseFloat(state.empFTE[s.name])||0.9, _shifts=fteShiftsPerCycle(_fte,'CA')*2, _hrs=Math.round(_shifts*8);
    const _mix=_fte>=0.9?'2×12h + 2×8h/wk':_fte>=0.5?'2×8h/wk avg':'1×8h/wk avg';
    const _wknd=(_fte>=0.9||(_fte>=0.5&&_fte<0.6))?'⟳ Every Other':'1×/month';
    const _rb=i%2?'':'rgba(255,255,255,0.02)', _wc=(_fte>=0.9||(_fte>=0.5&&_fte<0.6))?'var(--green2)':'var(--amber2)';
    _caSect+='<tr style="background:'+_rb+';border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:6px 10px;font-weight:600;">'+s.name.split(',')[0]+'</td><td style="padding:4px 6px;text-align:center;color:var(--text3);">'+_fte+'</td><td style="padding:4px 6px;text-align:center;font-weight:700;color:var(--teal2);">'+_shifts+'</td><td style="padding:4px 6px;text-align:center;font-weight:700;color:var(--accent2);">'+_hrs+'h</td><td style="padding:4px 6px;text-align:center;font-size:10px;">'+_mix+'</td><td style="padding:4px 6px;text-align:center;color:'+_wc+';">'+_wknd+'</td></tr>';
  });
  _caSect += '</tbody></table></div></div>';
  html += _caSect;
  el.innerHTML = html;
}

function loadVacancyBudgets() {
  const budgets = state.vacancyBudgets || {};
  Object.entries(budgets).forEach(([key, val]) => {
    const el = document.getElementById(`vac-${key}-budget`);
    if (el) el.value = val;
  });
  renderVacancy();
}

function saveCAHours(name, hours) {
  // Toggle off if already selected
  if (state.empCAHours[name] === hours) {
    delete state.empCAHours[name];
  } else {
    state.empCAHours[name] = hours;
  }
  persistSave();
  showSaveBanner(`💾 CA hours preference saved for ${name.split(',')[0]}`);
  renderDirectory();
}

function saveEmpShift(name, shift) {
  if (state.empShifts[name] === shift) {
    delete state.empShifts[name];
  } else {
    state.empShifts[name] = shift;
  }
  persistSave();
  showSaveBanner(`💾 Shift preference saved for ${name.split(',')[0]}`);
  renderDirectory();
  renderVacancy();
}

function getWorkingOnShift(shift) {
  const dateKey = state.activeBoardDate || state.dates[0];
  if (!dateKey) return new Set();
  const shifts = state.placements[dateKey] || {};
  return new Set((shifts[shift]||[]).map(p=>p.name));
}

const DIR_COLS_KEY = '_dirColsCollapsed';
function getDirColsCollapsed() {
  const v = localStorage.getItem(DIR_COLS_KEY);
  return v === null ? true : v === '1'; // collapsed by default
}
function applyDirColsState() {
  const table = document.getElementById('dir-table');
  const btn = document.getElementById('dir-col-toggle-btn');
  const collapsed = getDirColsCollapsed();
  if (table) table.classList.toggle('cols-collapsed', collapsed);
  if (btn) btn.textContent = collapsed ? '▸ More Columns' : '▾ Fewer Columns';
}
function toggleDirColumns() {
  localStorage.setItem(DIR_COLS_KEY, getDirColsCollapsed() ? '0' : '1');
  applyDirColsState();
}

function renderDirectory() {
  applyDirColsState();
  const search    = (document.getElementById('dir-search')?.value || '').toLowerCase();
  const shiftTab  = state.dirShiftTab || 'ALL';
  const roleTab   = state.dirRoleTab  || 'ALL';
  const working   = getWorkingToday();
  const tbody     = document.getElementById('dir-tbody');
  if (!tbody) return;

  const dateKey = state.activeBoardDate || state.dates[0];
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};

  // Day shift staff (0700-1500, 1500-1900, 0630-1430, 1430-1830)
  const dayWorking = new Set([
    ...(shifts['0700-1500']||[]).map(p=>p.name),
    ...(shifts['0630-1430']||[]).map(p=>p.name),
    ...(shifts['0630-1830']||[]).map(p=>p.name),
  ]);
  // Evening shift staff (1500-1900, 1430-1830, 1830-2230)
  const eveWorking = new Set([
    ...(shifts['1500-1900']||[]).map(p=>p.name),
    ...(shifts['1430-1830']||[]).map(p=>p.name),
    ...(shifts['1830-2230']||[]).map(p=>p.name),
    ...(shifts['1430-0300']||[]).map(p=>p.name),
  ]);
  // Night shift staff (1900-0700, 2230-0630, 1830-0630, 2300-0700)
  const ngtWorking = new Set([
    ...(shifts['1900-0700']||[]).map(p=>p.name),
    ...(shifts['2230-0630']||[]).map(p=>p.name),
    ...(shifts['1830-0630']||[]).map(p=>p.name),
    ...(shifts['2300-0700']||[]).map(p=>p.name),
  ]);

  let staff = [...MASTER_STAFF].filter(s => s.job !== 'NURSE MGR');

  // Apply shift/status filter
  switch(shiftTab) {
    case 'OFF_ALL':   staff = staff.filter(s => !working.has(s.name)); break;
    case 'WORKING':   staff = staff.filter(s =>  working.has(s.name)); break;
    case 'DAY_SHIFT':
      staff = staff.filter(s => {
        const sh = state.empShifts[s.name];
        return sh === 'DAY' || sh === 'BOTH' || dayWorking.has(s.name);
      }); break;
    case 'EVE_SHIFT':
      staff = staff.filter(s => {
        const sh = state.empShifts[s.name];
        return sh === 'EVE' || sh === 'BOTH' || eveWorking.has(s.name);
      }); break;
    case 'NGT_SHIFT':
      staff = staff.filter(s => {
        const sh = state.empShifts[s.name];
        return sh === 'NIGHT' || sh === 'BOTH' || ngtWorking.has(s.name);
      }); break;
  }

  // Apply role filter
  if (roleTab === 'RN' || roleTab === 'LPN' || roleTab === 'CA') {
    staff = staff.filter(s => s.job === roleTab);
  }

  if (search) staff = staff.filter(s => s.name.toLowerCase().includes(search));

  // Show/hide SMS panel — only when the Off Duty shift/status filter is active
  const smsPanel = document.getElementById('sms-broadcast-panel');
  if (smsPanel) smsPanel.style.display = (shiftTab === 'OFF_ALL') ? 'block' : 'none';

  tbody.innerHTML = staff.length === 0
    ? `<tr><td colspan="15" style="text-align:center;color:var(--text3);padding:20px;font-style:italic;">No staff match this filter.</td></tr>`
    : staff.map(s => {
        const isWorking = working.has(s.name);
        const cls       = isWorking ? 'working-today' : 'off-today';
        const dot       = isWorking
          ? '<span class="status-dot dot-working"></span>Working'
          : '<span class="status-dot dot-off"></span>Off Today';
        const phone     = state.phones[s.name]  || '';
        const email     = state.emails[s.name]  || '';
        const birthday  = state.birthdays[s.name]  || '';
        const hireDate  = (state.hireDates && state.hireDates[s.name]) || '';
        const empShift  = state.empShifts[s.name]    || '';
        const empFTE    = state.empFTE[s.name]        || '';
        const emp48     = state.emp48hr[s.name]       || false;
        const empWknd   = state.empWeekend[s.name]    || '';
        const empOrient = state.empOrientation[s.name]|| false;
        const empAgency = state.agencyDates[s.name]   || {};
        const isAgency  = !!empAgency.isAgency;
        const safe      = s.name.replace(/'/g, "\\'");
        const noteCount = (state.empNotes[s.name] || []).length;
        const fte025    = parseFloat(empFTE) === 0.25;

        // FTE selector
        const fteOptions = ['1','0.9','0.8','0.6','0.5','0.25'];
        const fteSelect = `<select style="background:var(--slate);border:1px solid var(--border);color:var(--white);font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 5px;border-radius:4px;outline:none;cursor:pointer;" onchange="saveEmpFTE('${safe}',this.value)">
          <option value="">—</option>
          ${fteOptions.map(o=>`<option value="${o}" ${empFTE===o?'selected':''}>${o}</option>`).join('')}
        </select>`;

        // Weekend preference toggle
        // .25 FTE = 1x/month (W1 or W2 or W3 or W4), others = every other (W1=odd weekends, W2=even weekends)
        const wkndToggle = fte025
          ? `<div class="shift-toggle" title="Which weekend of the month">
              <button class="${empWknd==='W1'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W1')">Wk1</button>
              <button class="${empWknd==='W2'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W2')">Wk2</button>
              <button class="${empWknd==='W3'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W3')">Wk3</button>
              <button class="${empWknd==='W4'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W4')">Wk4</button>
            </div>`
          : `<div class="shift-toggle" title="Preferred weekend rotation">
              <button class="${empWknd==='W1'?'active-day':''}" onclick="saveEmpWeekend('${safe}','W1')" title="Odd weekends (1st, 3rd…)">Odd</button>
              <button class="${empWknd==='W2'?'active-night':''}" onclick="saveEmpWeekend('${safe}','W2')" title="Even weekends (2nd, 4th…)">Even</button>
            </div>`;

        // 48hr button — RNs only
        const btn48 = s.job === 'RN'
          ? `<button onclick="toggle48hr('${safe}')" style="padding:3px 8px;border-radius:4px;border:1px solid ${emp48?'var(--amber2)':'var(--border)'};background:${emp48?'rgba(180,83,9,0.25)':'transparent'};color:${emp48?'var(--amber2)':'var(--text3)'};font-size:10px;font-weight:700;cursor:pointer;">${emp48?'✓ 48hr':'48hr'}</button>`
          : `<span style="color:var(--text3);font-size:10px;">—</span>`;

        // Shift toggle — CAs get Eve option + hours selector
        const isCA = s.job === 'CA';
        const caHours = state.empCAHours[s.name] || '';
        const shiftToggle = `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
          <div class="shift-toggle">
            <button class="${empShift==='DAY'?'active-day':''}" onclick="saveEmpShift('${safe}','DAY')" title="Day">☀️</button>
            ${isCA ? `<button class="${empShift==='EVE'?'active-eve':''}" onclick="saveEmpShift('${safe}','EVE')" title="Eve">🌆</button>` : ''}
            <button class="${empShift==='NIGHT'?'active-night':''}" onclick="saveEmpShift('${safe}','NIGHT')" title="Night">🌙</button>
            <button class="${empShift==='BOTH'?'active-both':''}" onclick="saveEmpShift('${safe}','BOTH')" title="All">↔</button>
          </div>
          ${isCA ? `<div class="shift-toggle" style="margin-top:1px;">
            <button class="${caHours==='8'?'active-eve':''}" onclick="saveCAHours('${safe}','8')" title="8-hour shifts" style="font-size:9px;padding:2px 6px;">8hr</button>
            <button class="${caHours==='12'?'active-night':''}" onclick="saveCAHours('${safe}','12')" title="12-hour shifts" style="font-size:9px;padding:2px 6px;">12hr</button>
          </div>` : ''}
        </div>`;

        // Float/sitter from summary
        let floatCell = '<span style="color:var(--text3);font-size:10px;">—</span>';
        if (window._floatSummary) {
          const key = Object.keys(window._floatSummary).find(k => {
            const kl=k.toLowerCase(); const nl=s.name.toLowerCase();
            const kp=kl.split(','); const np=nl.split(',');
            return kp[0].trim().substring(0,6)===np[0].trim().substring(0,6) &&
                   (kp[1]||'').trim().substring(0,3)===(np[1]||'').trim().substring(0,3);
          });
          const sum = key ? window._floatSummary[key] : null;
          if (sum) {
            const rows = [];
            if (sum.lastFloat  && sum.lastFloat  !=='-') rows.push(`<span style="color:var(--accent2);">Float</span> ${sum.lastFloat}`);
            if (sum.lastSitter && sum.lastSitter !=='-') rows.push(`<span style="color:var(--purple2);">Sitter</span> ${sum.lastSitter}`);
            if (sum.lastCallOff&& sum.lastCallOff!=='-') rows.push(`<span style="color:var(--red2);">Call Off</span> ${sum.lastCallOff}`);
            floatCell = rows.length
              ? `<div style="font-size:10px;font-family:'IBM Plex Mono',monospace;line-height:1.6;">${rows.map(r=>`<div>${r}</div>`).join('')}</div>`
              : '<span style="color:var(--text3);font-size:10px;">No activity</span>';
          }
        }

        const textBtn = isWorking
          ? `<span style="color:var(--text3);font-size:11px;">—</span>`
          : phone
            ? `<div style="display:flex;gap:4px;align-items:center;"><button class="sms-text-btn" onclick="sendSMSToOne('${safe}')">💬</button><button class="qr-btn" onclick="showQR('${safe}')" title="QR">📱</button></div>`
            : `<button class="sms-text-btn no-phone" disabled title="Add phone first">💬</button>`;

        const removeBtn = `<button class="move-btn remove-btn" onclick="removeEmployee('${safe}')" title="Remove">✕</button>`;
        const notesBtn  = `<button class="btn btn-ghost btn-sm" onclick="openEmpNotes('${safe}')" style="padding:3px 8px;font-size:10px;">📝${noteCount>0?` <span style="background:var(--accent);color:#fff;border-radius:8px;padding:0 4px;font-size:9px;">${noteCount}</span>`:''}</button>`;
        const empProf   = (state.empProfile || {})[s.name] || {};
        const profDone  = !!(empProf.food || empProf.movie || empProf.hobbies);
        const oriSigned = !!empProf.oriSheetSigned;
        const profileBtn = `<button class="btn btn-ghost btn-sm" onclick="openEmpProfile('${safe}')" style="padding:3px 8px;font-size:10px;${oriSigned?'color:var(--green2);':profDone?'color:var(--teal2);':''}" title="${oriSigned?'Ori Sheet signed ✓':'Profile — click to view/edit'}">👤${oriSigned?' 📋':profDone?' ✓':''}</button>`;
        const empDocsRec = (state.empDocs || {})[s.name] || {};
        const docsCount  = ['contract','orientation','xensys','offboard'].filter(k => empDocsRec[k] && empDocsRec[k].url).length;
        const docsBtn    = `<button class="btn btn-ghost btn-sm" onclick="openEmpDocs('${safe}')" style="padding:3px 8px;font-size:10px;${docsCount>0?'color:var(--teal2);':''}" title="Orientation / Xensys Onboarding / Offboarding documents">📎${docsCount>0?` <span style="background:var(--accent);color:#fff;border-radius:8px;padding:0 4px;font-size:9px;">${docsCount}</span>`:''}</button>`;
        const isCustom  = state.customStaff.some(c=>c.name===s.name);

        return `<tr class="${cls}">
          <td style="font-weight:600;"><span onclick="openEmployeeHub('${safe}')" style="cursor:pointer;color:var(--accent2);text-decoration:underline dotted;text-underline-offset:2px;" title="View full employee profile">${s.name}</span>${isCustom?' <span style="font-size:9px;color:var(--accent2);background:rgba(46,125,209,0.15);border-radius:3px;padding:1px 5px;">Custom</span>':''}${isAgency?`<div style="font-size:9px;color:var(--purple2);margin-top:2px;">🏥 Agency${empAgency.contractNum?' <span style="font-family:IBM Plex Mono,monospace;background:rgba(139,92,246,0.12);color:var(--accent2);padding:1px 5px;border-radius:3px;">#'+empAgency.contractNum+'</span>':''}</div>`:''}</td>
          <td><span class="tag tag-${s.job.toLowerCase()}">${s.job}</span></td>
          <td>${shiftToggle}</td>
          <td>${fteSelect}</td>
          <td class="dir-col-collapsible">${wkndToggle}</td>
          <td>${btn48}</td>
          <td><label style="display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-size:10px;color:${empOrient?'var(--amber2)':'var(--text3)'};">
            <input type="checkbox" ${empOrient?'checked':''} onchange="toggleOrientation('${safe}',this.checked)" style="accent-color:var(--amber2);cursor:pointer;">
            ${empOrient?'On':'—'}
          </label></td>
          <td class="dir-col-collapsible"><label style="display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-size:10px;color:${state.empPreceptor[s.name]?'var(--green2)':'var(--text3)'};" title="Certified preceptor">
            <input type="checkbox" ${state.empPreceptor[s.name]?'checked':''} onchange="togglePreceptor('${safe}',this.checked)" style="accent-color:var(--green2);cursor:pointer;">
            ${state.empPreceptor[s.name]?'🎓':'—'}
          </label></td>
          <td><label style="display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-size:10px;${state.empAlwaysCharge[s.name]?'color:gold;font-weight:700;':'color:var(--text3);'}" title="When checked, this person is automatically assigned as 3B charge when on the board">
            <input type="checkbox" ${state.empAlwaysCharge[s.name]?'checked':''} onchange="toggleAlwaysCharge('${safe}',this.checked)" style="accent-color:gold;cursor:pointer;width:14px;height:14px;" ${s.job!=='RN'?'disabled title="Only RNs can be charge nurses"':''}>
            ${state.empAlwaysCharge[s.name]?'⭐':'—'}
          </label></td>
          <td>
            ${(()=>{
              const dbl = (state.empDbl || {})[s.name] || {};
              const onDbl = !!dbl.onLeave;
              const inputStyle = "background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 4px;border-radius:3px;font-size:9px;width:76px;outline:none;margin-top:1px;";
              return `<div style="display:flex;flex-direction:column;gap:2px;min-width:100px;">
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;color:${onDbl?'var(--purple2)':'var(--text3)'};">
                  <input type="checkbox" ${onDbl?'checked':''} onchange="toggleDbl('${safe}',this.checked)" style="accent-color:var(--purple2);cursor:pointer;width:13px;height:13px;">
                  ${onDbl?'🤱 On Leave':'—'}
                </label>
                ${onDbl?`<input type="text" value="${dbl.startDate||''}" placeholder="Start MM/DD/YY"
                  style="${inputStyle}" title="Leave start date"
                  oninput="saveDbl('${safe}','startDate',this.value)"
                  onblur="saveDbl('${safe}','startDate',this.value)">
                <input type="text" value="${dbl.returnDate||''}" placeholder="Return MM/DD/YY"
                  style="${inputStyle}color:var(--green2);" title="Expected return date"
                  oninput="saveDbl('${safe}','returnDate',this.value)"
                  onblur="saveDbl('${safe}','returnDate',this.value)">`:''}</div>`;
            })()}
          </td>
          <td class="dir-col-collapsible"><label style="display:flex;align-items:center;justify-content:center;gap:4px;${s.job==='CA'?'cursor:not-allowed;opacity:0.35;':'cursor:pointer;'}font-size:10px;color:${state.empPayEligible[s.name]?'var(--green2)':'var(--text3)'};" title="RN/LPN: Eligible Pay">
            <input type="checkbox" ${state.empPayEligible[s.name]?'checked':''} ${s.job==='CA'?'disabled':''} onchange="togglePayFlag('${safe}','empPayEligible',this.checked)" style="accent-color:var(--green2);cursor:pointer;width:13px;height:13px;">
            ${state.empPayEligible[s.name]?'✓':'—'}
          </label></td>
          <td>
            <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:130px;">
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;${isAgency?'color:var(--purple2);font-weight:700;':'color:var(--text3);'}">
                <input type="checkbox" ${isAgency?'checked':''} onchange="toggleAgency('${safe}',this.checked)" style="accent-color:var(--purple2);cursor:pointer;width:13px;height:13px;">
                ${isAgency?'Agency':'Staff'}
              </label>
              ${isAgency ? `<div style="font-size:9px;font-family:'IBM Plex Mono',monospace;line-height:1.6;">
                <div style="display:flex;align-items:center;gap:3px;">
                  <span style="color:var(--text3);width:22px;">Strt</span>
                  <input type="text" value="${empAgency.contractStart||''}" placeholder="MM/DD/YY"
                    style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 4px;border-radius:3px;font-size:9px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','contractStart',this.value)"
                    onblur="saveAgency('${safe}','contractStart',this.value)">
                </div>
                <div style="display:flex;align-items:center;gap:3px;">
                  <span style="color:var(--text3);width:22px;">End</span>
                  <input type="text" value="${empAgency.contractEnd||''}" placeholder="MM/DD/YY"
                    style="background:var(--slate);border:1px solid var(--border);color:${empAgency.contractEnd?('exp-'+certClass(empAgency.contractEnd)==='exp-critical'?'var(--red2)':'exp-'+certClass(empAgency.contractEnd)==='exp-soon'?'var(--amber2)':'var(--green2)'):'var(--white)'};padding:1px 4px;border-radius:3px;font-size:9px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','contractEnd',this.value)"
                    onblur="saveAgency('${safe}','contractEnd',this.value)">
                </div>
                ${empAgency.extensionEnd ? `<div style="display:flex;align-items:center;gap:3px;">
                  <span style="color:var(--text3);width:22px;">Ext</span>
                  <input type="text" value="${empAgency.extensionEnd||''}" placeholder="MM/DD/YY"
                    style="background:var(--slate);border:1px solid var(--border);color:var(--green2);padding:1px 4px;border-radius:3px;font-size:9px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','extensionEnd',this.value)"
                    onblur="saveAgency('${safe}','extensionEnd',this.value)">
                </div>` : `<div style="display:flex;align-items:center;gap:3px;margin-top:1px;">
                  <span style="color:var(--text3);width:22px;font-size:8px;">Ext</span>
                  <input type="text" value="" placeholder="+Ext date"
                    style="background:transparent;border:1px dashed rgba(255,255,255,0.15);color:var(--text3);padding:1px 4px;border-radius:3px;font-size:9px;width:72px;font-family:'IBM Plex Mono',monospace;"
                    oninput="saveAgency('${safe}','extensionEnd',this.value)"
                    onblur="saveAgency('${safe}','extensionEnd',this.value)">
                </div>`}
                 <div style="display:flex;align-items:center;gap:3px;margin-top:2px;padding-top:2px;border-top:1px solid rgba(255,255,255,0.08);">
                   <span style="color:var(--accent2);width:22px;font-size:8px;">ID#</span>
                   <input type="text" value="${empAgency.contractNum||''}" placeholder="Contract #"
                     style="background:var(--slate);border:1px solid rgba(46,125,209,0.35);color:var(--accent2);padding:1px 4px;border-radius:3px;font-size:9px;width:88px;outline:none;font-family:'IBM Plex Mono',monospace;"
                     oninput="saveAgency('${safe}','contractNum',this.value)"
                     onblur="saveAgency('${safe}','contractNum',this.value)"
                     title="Agency contract number">
                 </div>
                 ${(()=>{
                   const bs = empAgency.blockSchedule || {};
                   return `<div style="margin-top:3px;padding-top:3px;border-top:1px solid rgba(255,255,255,0.08);">
                     <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:9px;color:${bs.enabled?'var(--purple2)':'var(--text3)'};">
                       <input type="checkbox" ${bs.enabled?'checked':''} onchange="saveAgencyBlock('${safe}','enabled',this.checked)" style="accent-color:var(--purple2);cursor:pointer;width:12px;height:12px;">
                       📦 Block Sched
                     </label>
                     ${bs.enabled ? `<div style="display:flex;align-items:center;gap:3px;margin-top:2px;">
                       <input type="number" min="1" max="28" value="${bs.on ?? 7}" title="Days On"
                         style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 3px;border-radius:3px;font-size:9px;width:30px;font-family:'IBM Plex Mono',monospace;"
                         onchange="saveAgencyBlock('${safe}','on',parseInt(this.value)||7)">
                       <span style="color:var(--text3);font-size:8px;">on</span>
                       <input type="number" min="1" max="28" value="${bs.off ?? 7}" title="Days Off"
                         style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 3px;border-radius:3px;font-size:9px;width:30px;font-family:'IBM Plex Mono',monospace;"
                         onchange="saveAgencyBlock('${safe}','off',parseInt(this.value)||7)">
                       <span style="color:var(--text3);font-size:8px;">off</span>
                     </div>
                     <input type="text" value="${bs.startDate||empAgency.contractStart||''}" placeholder="Block start MM/DD/YY"
                       style="background:var(--slate);border:1px solid var(--border);color:var(--white);padding:1px 4px;border-radius:3px;font-size:9px;width:110px;font-family:'IBM Plex Mono',monospace;margin-top:2px;"
                       onblur="saveAgencyBlock('${safe}','startDate',this.value)"
                       onkeydown="if(event.key==='Enter')saveAgencyBlock('${safe}','startDate',this.value)">` : ''}
                   </div>`;
                 })()}
              </div>` : ''}
            </div>
          </td>
          <td class="dir-col-collapsible" style="font-size:11px;">${dot}</td>
          <td class="dir-col-collapsible">${floatCell}</td>
          <td><input type="text" class="phone-input" style="width:80px;" value="${birthday}" placeholder="MM/DD" onblur="saveBday('${safe}',this.value)" title="Birthday (MM/DD)"></td>
          <td><input type="date" class="phone-input" style="width:120px;" value="${hireDate}" onblur="saveHireDate('${safe}',this.value)" title="Date of Hire"></td>
          <td><input type="tel" class="phone-input" value="${phone}" placeholder="(607) 555-0000" onblur="savePhone('${safe}',this.value)"></td>
          <td><input type="email" class="phone-input" style="width:150px;" value="${email}" placeholder="email@arnot.org" onblur="saveEmail('${safe}',this.value)"></td>
          <td>${textBtn}</td>
          <td>${profileBtn}</td>
          <td>${notesBtn}</td>
          <td>${docsBtn}</td>
          <td>${removeBtn}</td>
        </tr>`;
      }).join('');

  renderSMSPanel();
}

function renderSMSPanel() {
  const working = getWorkingToday();
  const roleFilter = ['RN','LPN','CA'].includes(state.dirRoleTab) ? state.dirRoleTab : null;
  const allOff = MASTER_STAFF.filter(s => {
    if (s.job === 'NURSE MGR') return false;
    if (working.has(s.name)) return false;
    if (roleFilter && s.job !== roleFilter) return false;
    return true;
  });
  const withPhone = allOff.filter(s => !!(state.phones?.[s.name]));

  // Labels
  const roleLabel = roleFilter ? roleFilter + ' ' : '';
  const countEl   = document.getElementById('sms-off-count');
  const subTitle  = document.getElementById('sms-panel-subtitle');
  const chipLabel = document.getElementById('sms-chip-label');
  const broadBtn  = document.getElementById('sms-broadcast-btn');

  if (countEl)  countEl.textContent  = `${allOff.length} ${roleLabel}off duty · ${withPhone.length} have phone`;
  if (subTitle) subTitle.textContent = `Send a message to ${roleLabel}off-duty staff — individually or broadcast to all`;
  if (chipLabel) chipLabel.textContent = `${roleLabel}Off-Duty Staff — Text Individually`;
  if (broadBtn) broadBtn.textContent = `💬 Text All ${roleLabel}Off-Duty`;

  // Chips
  const listEl = document.getElementById('sms-off-list');
  if (!listEl) return;

  if (allOff.length === 0) {
    listEl.innerHTML = `<span style="color:var(--text3);font-size:12px;font-style:italic;">All ${roleLabel}staff are working today.</span>`;
    return;
  }

  const roleColors = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)', UC:'var(--green2)' };
  const roleBg     = { RN:'rgba(46,125,209,0.2)', LPN:'rgba(91,33,182,0.2)', CA:'rgba(14,116,144,0.2)', UC:'rgba(26,122,74,0.2)' };

  listEl.innerHTML = allOff.map(s => {
    const hasPhone  = !!(state.phones?.[s.name]);
    const btnCls    = hasPhone ? 'chip-btn' : 'chip-btn no-phone';
    const btnTitle  = hasPhone ? '' : 'title="No phone number on file"';
    const btnOnclick = hasPhone ? `onclick="sendSMSToOne('${s.name}')"` : '';
    return `<div class="sms-off-chip">
      <span class="chip-role" style="background:${roleBg[s.job]||'rgba(100,116,139,0.2)'};color:${roleColors[s.job]||'var(--text2)'};">${s.job}</span>
      <span class="chip-name">${s.name}</span>
      <button class="${btnCls}" ${btnOnclick} ${btnTitle}>${hasPhone ? '💬' : '📵'}</button>
      ${hasPhone ? `<button class="chip-btn" onclick="showQR('${s.name}')" title="QR code for phone" style="background:rgba(46,125,209,0.2);color:var(--accent2);">📱</button>` : ''}
    </div>`;
  }).join('');
}

function toggleSmsPanel() {
  const body = document.getElementById('sms-panel-body');
  const btn  = document.querySelector('#sms-broadcast-panel .sms-broadcast-header .btn-ghost');
  if (!body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? 'block' : 'none';
  if (btn) btn.textContent = collapsed ? '▾ Collapse' : '▸ Expand';
}

function getSMSMessage() {
  const msg = (document.getElementById('sms-broadcast-msg')?.value || '').trim();
  if (!msg) { alert('Please enter a message before sending.'); return null; }
  return msg;
}

function openSMSOrCopy(phone, msg) {
  const clean = phone.replace(/\D/g,'');
  if (!clean || clean.length < 10) return;
  const isFile   = window.location.protocol === 'file:';
  const isApple  = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isFile && isMobile) {
    // On mobile browser — open SMS app directly
    const sep = isApple ? '&' : '?';
    window.open(`sms:+1${clean}${sep}body=${encodeURIComponent(msg)}`, '_self');
  } else {
    // Desktop or file:// — copy number + message
    const full = `To: +1${clean.replace(/(\d{3})(\d{3})(\d{4})/,'($1) $2-$3')}\n\n${msg}`;
    navigator.clipboard.writeText(full).then(() => {
      showSaveBanner('📋 Phone number + message copied — paste into your SMS app');
    }).catch(() => {
      prompt(`Copy this message to send via SMS to +1${clean}:`, msg);
    });
  }
}

function sendSMSToOne(name) {
  const msg = getSMSMessage();
  if (!msg) return;
  const phone = state.phones[name] || '';
  if (!phone) { alert(`No phone number on file for ${name}. Add it in the Phone column first.`); return; }
  const clean  = phone.replace(/\D/g, '');
  openSMSOrCopy(clean, msg);
}

function broadcastSMS() {
  const msg = getSMSMessage();
  if (!msg) return;
  const working = getWorkingToday();
  const roleFilter = ['RN','LPN','CA'].includes(state.dirRoleTab) ? state.dirRoleTab : null;

  const targets = MASTER_STAFF.filter(s => {
    if (s.job === 'NURSE MGR') return false;
    if (working.has(s.name)) return false;
    if (roleFilter && s.job !== roleFilter) return false;
    return !!(state.phones?.[s.name]);
  });

  if (targets.length === 0) {
    alert('No off-duty staff with phone numbers found for this filter. Add phone numbers in the Phone column first.');
    return;
  }

  const roleLabel = roleFilter ? roleFilter + ' ' : '';
  const names = targets.map(s => `• ${s.name} (${state.phones?.[s.name]||''})`).join('\n');
  if (!confirm(`Send to ${targets.length} ${roleLabel}off-duty staff?\n\n${names}\n\nNote: Some devices only support one recipient at a time via SMS link. Use individual 💬 buttons if needed.`)) return;

  const allNumbers = targets.map(s => (state.phones?.[s.name]||'').replace(/\D/g, '')).join(',');
  const isApple    = /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent);
  window.open(`sms:${allNumbers}${isApple ? '&' : '?'}body=${encodeURIComponent(msg)}`, '_self');
}

// ════════════════════════════════════
//  QR CODE MODAL
// ════════════════════════════════════

function buildSMSUrl(phone, msg) {
  const clean   = phone.replace(/\D/g, '');
  const isApple = /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent);
  return `sms:${clean}${isApple ? '&' : '?'}body=${encodeURIComponent(msg)}`;
}

function showQR(name) {
  const msg = getSMSMessage();
  if (!msg) return;
  const phone = state.phones[name] || '';
  if (!phone) {
    alert(`No phone number on file for ${name}. Add it in the Phone column first.`);
    return;
  }
  const url = buildSMSUrl(phone, msg);
  const firstName = name.split(',')[1]?.trim() || name;
  openQRModal(
    `📱 Text ${firstName}`,
    `Scan with your phone to open Messages pre-filled with this message.\n${phone}`,
    url,
    `QR_Text_${name.replace(/[^a-z0-9]/gi,'_')}.png`
  );
}

function showBroadcastQR() {
  const msg = getSMSMessage();
  if (!msg) return;
  const working  = getWorkingToday();
  const roleFilter = ['RN','LPN','CA'].includes(state.dirRoleTab) ? state.dirRoleTab : null;

  const targets = MASTER_STAFF.filter(s => {
    if (s.job === 'NURSE MGR') return false;
    if (working.has(s.name)) return false;
    if (roleFilter && s.job !== roleFilter) return false;
    return !!(state.phones?.[s.name]);
  });

  if (targets.length === 0) {
    alert('No off-duty staff with phone numbers found. Add phone numbers in the Phone column first.');
    return;
  }

  // SMS multi-recipient URI (works on iOS, varies on Android)
  const allNumbers = targets.map(s => (state.phones?.[s.name]||'').replace(/\D/g,'')).join(',');
  const isApple    = /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent);
  const url = `sms:${allNumbers}${isApple ? '&' : '?'}body=${encodeURIComponent(msg)}`;
  const roleLabel = roleFilter ? roleFilter + ' ' : '';

  openQRModal(
    `📱 Text All ${roleLabel}Off-Duty (${targets.length})`,
    `Scan with your phone to open Messages addressed to ${targets.length} staff members.`,
    url,
    `QR_Broadcast_${roleLabel.trim()||'All'}.png`
  );
}

function openQRModal(title, sub, url, filename) {
  if (typeof QRCode === 'undefined') {
    alert('QR library not loaded yet — please wait a moment and try again.');
    return;
  }

  document.getElementById('qr-modal-title').textContent = title;
  document.getElementById('qr-modal-sub').textContent   = sub;

  // Clear and rebuild QR div
  const wrap = document.getElementById('qr-canvas-wrap');
  wrap.innerHTML = '';
  const div = document.createElement('div');
  wrap.appendChild(div);

  const qr = new QRCode(div, {
    text: url,
    width: 240,
    height: 240,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });

  // Wire download — grab the img QRCode generates
  const dlBtn = document.getElementById('qr-download-btn');
  dlBtn.onclick = function() {
    setTimeout(() => {
      const img = wrap.querySelector('img');
      if (img) {
        const a = document.createElement('a');
        a.download = filename;
        a.href = img.src;
        a.click();
      }
    }, 200);
  };

  document.getElementById('qr-modal').classList.add('open');
}

function closeQRModal() {
  document.getElementById('qr-modal').classList.remove('open');
}


function addEmployee() {
  const nameInput = document.getElementById('new-emp-name');
  const roleInput = document.getElementById('new-emp-role');
  const statusEl  = document.getElementById('add-emp-status');
  const name = (nameInput?.value || '').trim();
  const job  = roleInput?.value || 'RN';

  if (!name) {
    showAddEmpStatus('⚠ Please enter a name in Last, First format.', 'warn');
    return;
  }

  // Check for duplicate
  if (MASTER_STAFF.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    showAddEmpStatus(`⚠ "${name}" already exists in the staff list.`, 'warn');
    return;
  }

  state.customStaff.push({ name, job });
  rebuildMasterStaff();

  // ── Auto-add to Orientation tab ──────────────────────────────
  if (!state.orientation) state.orientation = {};
  if (!state.orientation[name]) {
    const today      = new Date().toISOString().split('T')[0];
    const isAgencyNw = !!(state.agencyDates && state.agencyDates[name]?.isAgency);
    const oriRole    = isAgencyNw ? 'Agency RN' : job;
    const defaultWk  = isAgencyNw ? 1 : (job === 'CA') ? 6 : 12;
    // Target date: agency = 3 days, others = weeks
    const targetDt   = new Date();
    targetDt.setDate(targetDt.getDate() + (isAgencyNw ? 3 : defaultWk * 7));
    const targetDate = targetDt.toISOString().split('T')[0];
    state.orientation[name] = {
      preceptor: '', buddy: '', buddyLater: true,
      startDate: today, targetDate,
      offDate: '', role: oriRole, totalWeeks: defaultWk,
      weeks: {}, milestones: {}, notes: '',
      profile: { food:'', movie:'', hobbies:'', proudOf:'', perfectDay:'' },
      meetingLogs: []
    };
  }
  // ─────────────────────────────────────────────────────────────

  persistSave();
  updateBackupSummary();
  renderDirectory();
  buildStaffDatalist();
  if (typeof renderOrientationList === 'function') renderOrientationList();

  nameInput.value = '';
  showAddEmpStatus(`✓ ${name} (${job}) added & placed on Orientation tab.`, 'success');
  showSaveBanner(`➕ ${name} added → Orientation`);

  // Open orientation modal pre-filled so preceptor/dates can be set immediately
  if (typeof openOrientationModal === 'function') {
    setTimeout(() => openOrientationModal(name), 400);
  }
}

function removeEmployee(name) {
  const isCustom = state.customStaff.some(s => s.name === name);
  const msg = isCustom
    ? `Remove "${name}" from the staff list?\n\nThey can be re-added using the Add New Employee form.`
    : `Remove "${name}" from the roster?\n\nThey will be hidden from all views. You can restore them from the Import tab → Removed Staff section.`;

  if (!confirm(msg)) return;

  if (isCustom) {
    state.customStaff = state.customStaff.filter(s => s.name !== name);
  } else {
    if (!state.removedStaff) state.removedStaff = [];
    if (!state.removedStaff.includes(name)) state.removedStaff.push(name);
  }

  rebuildMasterStaff();
  persistSave();
  updateBackupSummary();
  renderDirectory();
  buildStaffDatalist();
  renderRemovedStaff();
  showSaveBanner(`🗑 ${name} removed from roster`);
}

function restoreEmployee(name) {
  state.removedStaff = (state.removedStaff || []).filter(n => n !== name);
  rebuildMasterStaff();
  persistSave();
  renderRemovedStaff();
  renderDirectory();
  showSaveBanner(`✓ ${name} restored to roster`);
}

function renderRemovedStaff() {
  const el = document.getElementById('removed-staff-list');
  if (!el) return;
  const removed = state.removedStaff || [];
  if (removed.length === 0) {
    el.innerHTML = '<div style="color:var(--text3);font-size:12px;font-style:italic;">No staff currently removed.</div>';
    return;
  }
  el.innerHTML = removed.map(name => {
    const staff = BASE_STAFF.find(s => s.name === name);
    const job   = staff ? staff.job : '?';
    const safe  = name.replace(/'/g, "\\'");
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--card2);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="tag tag-${job.toLowerCase()}">${job}</span>
        <span style="font-size:12px;font-weight:600;">${name}</span>
      </div>
      <button class="btn btn-success btn-sm" onclick="restoreEmployee('${safe}')">↩ Restore</button>
    </div>`;
  }).join('');
}

function showAddEmpStatus(msg, type) {
  const el = document.getElementById('add-emp-status');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = type === 'success' ? 'var(--green2)' : 'var(--amber2)';
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}



// ════════════════════════════════════
//  EDUCATION
// ════════════════════════════════════
function setEduRole(el) {
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  state.eduRole = el.dataset.role;
  renderEducation();
}

// ── Cert expiry helpers ──
const CERT_FIELDS = ['ACLS','BLS','NIHSS','License','HealthEval','FitTest'];
const CERT_WARN_DAYS = 60;
const CERT_CRIT_DAYS = 30;

function certDaysLeft(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length < 3) return null;
  const d = new Date(`${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`);
  if (isNaN(d)) return null;
  return Math.round((d - new Date()) / 86400000);
}

function certClass(dateStr) {
  const days = certDaysLeft(dateStr);
  if (days === null) return 'missing';
  if (days < 0) return 'critical';
  if (days <= CERT_CRIT_DAYS) return 'critical';
  if (days <= CERT_WARN_DAYS) return 'soon';
  return 'ok';
}

function certLabel(dateStr) {
  const days = certDaysLeft(dateStr);
  if (days === null) return '';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today!';
  return `${days}d left`;
}

function getEduItems(name) {
  return state.pendingEdu[name] || [];
}

