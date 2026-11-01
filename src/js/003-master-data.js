
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
  codeResponseTeam: {},
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
  if (el.dataset.panel === 'ninebox')    renderNineBox();
  if (el.dataset.panel === 'incidents')  renderIncidents();
  if (el.dataset.panel === 'interview')   renderInterviewList();
  if (el.dataset.panel === 'orientation') renderOrientationList();
  if (el.dataset.panel === 'onboarding')  renderOnboarding();
  if (el.dataset.panel === 'coaching')    renderCoaching();
  if (el.dataset.panel === 'monthlyfu')   initMonthlyFollowUp();
  if (el.dataset.panel === 'fallround')   initFallRounding();
  if (el.dataset.panel === 'hapiround')   initHapiRounding();
  if (el.dataset.panel === 'platoweekly') initPlatoWeekly();
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

const PWT_HAPI_ITEMS = [
  { key:'mepilex', label:'Mepilex' },
  { key:'heelOffloading', label:'Heel offloading' },
  { key:'sacrumOffloading', label:'Sacrum offloading' },
  { key:'hob30', label:'HOB 30' },
  { key:'waffle', label:'Waffle' },
  { key:'specialtyOrdered', label:'Specialty ordered' },
  { key:'vsInPlace', label:'VS in place' }
];
const PWT_WEEK_START_DAY = 4;
const PWT_DEFAULT_START = '2026-10-01';
let pwtBound = false;
let pwtOpenPickers = {};

function initPlatoWeekly() {
  pwtEnsureState();
  if (!pwtBound) {
    pwtBind();
    pwtBound = true;
  }
  pwtRender();
}

function pwtEnsureState() {
  state.platoWeekly = state.platoWeekly && typeof state.platoWeekly === 'object' ? state.platoWeekly : {};
  state.platoWeekly.weeks = state.platoWeekly.weeks || {};
  state.platoWeekly.currentWeekStart = state.platoWeekly.currentWeekStart || PWT_DEFAULT_START;
  if (state.platoWeekly.weekStartDay !== PWT_WEEK_START_DAY || state.platoWeekly.defaultStart !== PWT_DEFAULT_START) pwtMigrateThursdayWeeks();
  pwtEnsureWeek(state.platoWeekly.currentWeekStart);
  Object.keys(state.platoWeekly.weeks).forEach(k => {
    const wk = state.platoWeekly.weeks[k] || { days:[] };
    wk.days = Array.isArray(wk.days) ? wk.days : [];
    wk.days.forEach(pwtNormalizeDay);
    state.platoWeekly.weeks[k] = wk;
  });
}

function pwtMigrateThursdayWeeks() {
  const migrated = {};
  Object.keys(state.platoWeekly.weeks || {}).forEach(k => {
    const week = state.platoWeekly.weeks[k] || {};
    const days = Array.isArray(week.days) ? week.days : [];
    days.forEach(day => {
      pwtNormalizeDay(day);
      const start = pwtWeekStartISO(pwtDate(day.date));
      if (!migrated[start]) migrated[start] = { days:Array.from({ length:7 }, (_, i) => pwtBlankDay(pwtAddDays(start, i))) };
      const offset = Math.round((pwtDate(day.date) - pwtDate(start)) / 86400000);
      if (offset >= 0 && offset < 7) migrated[start].days[offset] = pwtMergeDay(migrated[start].days[offset], day);
    });
  });
  state.platoWeekly.weeks = migrated;
  state.platoWeekly.currentWeekStart = PWT_DEFAULT_START;
  state.platoWeekly.weekStartDay = PWT_WEEK_START_DAY;
  state.platoWeekly.defaultStart = PWT_DEFAULT_START;
}

function pwtBlankDay(dateISO) {
  const checks = {};
  const variances = {};
  PWT_HAPI_ITEMS.forEach(i => checks[i.key] = false);
  PWT_HAPI_ITEMS.forEach(i => variances[i.key] = 0);
  return { date:dateISO, total:0, hapiPass:0, hapiChecks:checks, hapiVariances:variances, fallPass:0, rnFails:[], caFails:[], issues:[], missed:'' };
}

function pwtNormalizeDay(day) {
  day.date = day.date || pwtISO(new Date());
  day.total = pwtNum(day.total);
  day.hapiPass = Math.min(pwtNum(day.hapiPass), day.total);
  day.fallPass = Math.min(pwtNum(day.fallPass), day.total);
  const hadVarianceCounts = day.hapiVariances && typeof day.hapiVariances === 'object';
  day.hapiChecks = day.hapiChecks && typeof day.hapiChecks === 'object' ? day.hapiChecks : {};
  day.hapiVariances = hadVarianceCounts ? day.hapiVariances : {};
  const hadChecklistData = PWT_HAPI_ITEMS.some(i => !!day.hapiChecks[i.key]);
  PWT_HAPI_ITEMS.forEach(i => {
    day.hapiChecks[i.key] = !!day.hapiChecks[i.key];
    let varianceCount = pwtNum(day.hapiVariances[i.key]);
    if (!hadVarianceCounts && hadChecklistData && !day.hapiChecks[i.key]) varianceCount = 1;
    day.hapiVariances[i.key] = varianceCount;
    if (varianceCount > 0) day.hapiChecks[i.key] = false;
  });
  day.rnFails = pwtNameList(day.rnFails || []);
  day.caFails = pwtNameList(day.caFails || []);
  day.issues = Array.isArray(day.issues) ? pwtIssueList(day.issues, true) : [];
  const legacyIssues = pwtIssueList(day.missed || '');
  if (!day.issues.length && legacyIssues.length) day.issues = legacyIssues;
  day.missed = pwtIssueText(day);
  return day;
}

function pwtEnsureWeek(weekISO) {
  if (!state.platoWeekly.weeks[weekISO]) {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(pwtBlankDay(pwtAddDays(weekISO, i)));
    state.platoWeekly.weeks[weekISO] = { days };
  }
  state.platoWeekly.currentWeekStart = weekISO;
  return state.platoWeekly.weeks[weekISO];
}

function pwtWeek() { return pwtEnsureWeek(state.platoWeekly.currentWeekStart); }
function pwtNum(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; }
function pwtPct(n,d) { return d ? Math.round((n / d) * 100) : 0; }
function pwtDate(iso) { const p = String(iso).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function pwtISO(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function pwtAddDays(iso, days) { const d = pwtDate(iso); d.setDate(d.getDate() + days); return pwtISO(d); }
function pwtWeekStartISO(date) { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const diff = (d.getDay() - PWT_WEEK_START_DAY + 7) % 7; d.setDate(d.getDate() - diff); return pwtISO(d); }
function pwtPretty(iso) { const d = pwtDate(iso); return (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear(); }
function pwtDow(iso) { return pwtDate(iso).toLocaleDateString(undefined, { weekday:'short' }); }
function pwtEsc(v) { return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function pwtClass(pct) { return pct >= 95 ? 'pwt-good' : pct >= 80 ? 'pwt-warn' : 'pwt-bad'; }

function pwtDayHasData(day) {
  pwtNormalizeDay(day);
  return !!(day.total || day.hapiPass || pwtVarianceTotal(day) || day.fallPass || day.rnFails.length || day.caFails.length || pwtIssueText(day) || PWT_HAPI_ITEMS.some(i => day.hapiChecks[i.key]));
}

function pwtMergeDay(existing, incoming) {
  pwtNormalizeDay(existing);
  pwtNormalizeDay(incoming);
  if (!pwtDayHasData(existing)) return incoming;
  if (!pwtDayHasData(incoming)) return existing;
  existing.total = Math.max(existing.total, incoming.total);
  existing.hapiPass = Math.max(existing.hapiPass, incoming.hapiPass);
  existing.fallPass = Math.max(existing.fallPass, incoming.fallPass);
  PWT_HAPI_ITEMS.forEach(item => existing.hapiChecks[item.key] = existing.hapiChecks[item.key] || incoming.hapiChecks[item.key]);
  PWT_HAPI_ITEMS.forEach(item => {
    existing.hapiVariances[item.key] = Math.max(pwtNum(existing.hapiVariances[item.key]), pwtNum(incoming.hapiVariances[item.key]));
    if (existing.hapiVariances[item.key] > 0) existing.hapiChecks[item.key] = false;
  });
  existing.rnFails = pwtNameList(existing.rnFails.concat(incoming.rnFails));
  existing.caFails = pwtNameList(existing.caFails.concat(incoming.caFails));
  existing.issues = pwtIssueList(existing.issues.concat(incoming.issues));
  existing.missed = pwtIssueText(existing);
  return existing;
}

function pwtNameList(values) {
  const src = Array.isArray(values) ? values : String(values || '').split(/[\n;,]+/);
  const map = {};
  src.forEach(v => {
    const name = String(v || '').replace(/\s+/g,' ').trim();
    if (name) map[name.toLowerCase()] = name;
  });
  return Object.keys(map).map(k => map[k]).sort((a,b) => a.localeCompare(b));
}

function pwtIssueList(values, keepBlank=false) {
  const src = Array.isArray(values) ? values : String(values || '').split(/[\n;,]+/);
  const out = [];
  src.forEach(v => {
    const issue = String(v || '').replace(/\s+/g,' ').trim();
    if (issue || keepBlank) out.push(issue);
  });
  return out;
}

function pwtIssueText(day) {
  return pwtIssueList(day.issues || day.missed || []).join('; ');
}

function pwtVarianceTotal(day) {
  pwtNormalizeDay(day);
  return PWT_HAPI_ITEMS.reduce((sum, item) => sum + pwtNum(day.hapiVariances[item.key]), 0);
}

function pwtVarianceSummary(day) {
  pwtNormalizeDay(day);
  const rows = [];
  PWT_HAPI_ITEMS.forEach(item => {
    const count = pwtNum(day.hapiVariances[item.key]);
    if (count > 0) rows.push(`${item.label} (${count}x)`);
  });
  return rows;
}

function pwtWeekVarianceSummary(week) {
  const counts = {};
  PWT_HAPI_ITEMS.forEach(item => counts[item.key] = 0);
  week.days.forEach(day => {
    pwtNormalizeDay(day);
    PWT_HAPI_ITEMS.forEach(item => counts[item.key] += pwtNum(day.hapiVariances[item.key]));
  });
  return PWT_HAPI_ITEMS.filter(item => counts[item.key] > 0).map(item => `${item.label} ${counts[item.key]}x`);
}

function pwtFailReasonEvents(day) {
  pwtNormalizeDay(day);
  const reasons = [];
  const varianceTotal = pwtVarianceTotal(day);
  PWT_HAPI_ITEMS.forEach(item => {
    let count = pwtNum(day.hapiVariances[item.key]);
    if (!varianceTotal && day.total > 0 && !day.hapiChecks[item.key]) count = 1;
    for (let i = 0; i < count; i++) reasons.push(item.label);
  });
  if (day.total > day.hapiPass && !reasons.length) reasons.push('HAPI compliance');
  if (day.total > day.fallPass) reasons.push('Fall compliance');
  pwtIssueList(day.issues && day.issues.length ? day.issues : day.missed).forEach(x => reasons.push(x));
  return reasons.length ? reasons : ['Unspecified'];
}

function pwtRoster(role) {
  let staff = [];
  try { staff = Array.isArray(MASTER_STAFF) ? MASTER_STAFF : []; } catch(e) { staff = []; }
  return pwtNameList(staff.filter(s => {
    const job = String(s.job || s.role || '').toUpperCase();
    if (role === 'ca') return job === 'CA';
    return job === 'RN' || job === 'LPN';
  }).map(s => s.name || s.display_name || ''));
}

function pwtHapiStats(day) {
  pwtNormalizeDay(day);
  const checked = PWT_HAPI_ITEMS.reduce((sum, item) => sum + (day.hapiChecks[item.key] ? 1 : 0), 0);
  const varianceTotal = pwtVarianceTotal(day);
  const active = day.total > 0 || checked > 0 || varianceTotal > 0;
  const checklistPossible = active ? PWT_HAPI_ITEMS.length : 0;
  return { pass:day.hapiPass, possible:day.total, pct:pwtPct(day.hapiPass, day.total), checked, checklistPossible, checklistPct:pwtPct(checked, checklistPossible), varianceTotal };
}

function pwtTotals(week) {
  const t = { total:0, hapiPass:0, hapiPossible:0, hapiChecklistChecked:0, hapiChecklistPossible:0, hapiVarianceTotal:0, fallPass:0, rnFails:0, caFails:0, missed:[] };
  week.days.forEach(day => {
    pwtNormalizeDay(day);
    const hs = pwtHapiStats(day);
    t.total += day.total;
    t.hapiPass += hs.pass;
    t.hapiPossible += hs.possible;
    t.hapiChecklistChecked += hs.checked;
    t.hapiChecklistPossible += hs.checklistPossible;
    t.hapiVarianceTotal += hs.varianceTotal;
    t.fallPass += day.fallPass;
    t.rnFails += day.rnFails.length;
    t.caFails += day.caFails.length;
    const issueText = pwtIssueText(day);
    if (issueText) t.missed.push(issueText);
  });
  t.hapiChecked = t.hapiPass;
  t.hapiPct = pwtPct(t.hapiPass, t.hapiPossible);
  t.fallPct = pwtPct(t.fallPass, t.total);
  return t;
}

function pwtKpi(label, value, sub, cls='') {
  return `<div class="pwt-kpi"><div class="pwt-kpi-label">${pwtEsc(label)}</div><div class="pwt-kpi-value ${cls}">${pwtEsc(value)}</div><div class="pwt-kpi-sub">${pwtEsc(sub || '')}</div></div>`;
}

function pwtStep(dayIndex, field, value) {
  return `<div class="pwt-step" data-day="${dayIndex}" data-field="${field}"><input type="number" min="0" step="1" value="${pwtNum(value)}"><div><button type="button" data-step="1">+</button><button type="button" data-step="-1">-</button></div></div>`;
}

function pwtChecklist(dayIndex, day) {
  const items = PWT_HAPI_ITEMS.map(item => `<div class="pwt-check-item">
    <label><input type="checkbox" data-hapi="${item.key}" ${day.hapiChecks[item.key] ? 'checked' : ''}> ${pwtEsc(item.label)}</label>
    ${pwtVarianceStep(dayIndex, item.key, day.hapiVariances[item.key])}
  </div>`).join('');
  return `<div class="pwt-checks" data-day="${dayIndex}">${items}<div class="pwt-check-actions"><button type="button" class="pwt-mini" data-hapi-all="1">Check All</button><button type="button" class="pwt-mini" data-hapi-all="0">Clear</button></div></div>`;
}

function pwtVarianceStep(dayIndex, key, value) {
  return `<div class="pwt-var-step" data-day="${dayIndex}" data-hapi-var="${pwtEsc(key)}"><input type="number" min="0" step="1" value="${pwtNum(value)}" title="Variance count"><div><button type="button" data-var-step="1">+</button><button type="button" data-var-step="-1">-</button></div></div>`;
}

function pwtStaffPicker(dayIndex, role, selectedNames) {
  const selected = pwtNameList(selectedNames);
  const selectedMap = {};
  selected.forEach(n => selectedMap[n.toLowerCase()] = true);
  const names = pwtNameList(pwtRoster(role).concat(selected));
  const roleLabel = role === 'ca' ? 'CA' : 'RN/LPN';
  const key = role + '-' + dayIndex;
  const open = pwtOpenPickers[key] ? ' open' : '';
  const summary = selected.length ? `${roleLabel}: ${selected.length} selected` : `${roleLabel}: Select staff`;
  const body = names.length ? names.map(name => `<label><input type="checkbox" data-staff-name="${pwtEsc(name)}" ${selectedMap[name.toLowerCase()] ? 'checked' : ''}> ${pwtEsc(name)}</label>`).join('') : `<div style="font-size:11px;color:var(--text3);">No ${roleLabel} names found in the directory.</div>`;
  return `<details class="pwt-staff-picker" data-day="${dayIndex}" data-role="${role}"${open}><summary>${pwtEsc(summary)}</summary><div class="pwt-staff">${body}</div></details>`;
}

function pwtIssues(dayIndex, day) {
  pwtNormalizeDay(day);
  const rows = day.issues.length ? day.issues.map((issue, issueIndex) => `<div class="pwt-issue-row">
    <input type="text" data-issue-index="${issueIndex}" value="${pwtEsc(issue)}" placeholder="Add issue or missed item">
    <button type="button" class="pwt-issue-remove" data-remove-issue="${issueIndex}" title="Remove issue">&times;</button>
  </div>`).join('') : '<div class="pwt-issue-empty">No issues added.</div>';
  return `<div class="pwt-issues" data-day="${dayIndex}">${rows}<button type="button" class="pwt-mini" data-add-issue="1">+ Issue</button></div>`;
}

function pwtFailReasons(day) {
  pwtNormalizeDay(day);
  const reasons = pwtVarianceSummary(day);
  if (!reasons.length && day.total > day.hapiPass) reasons.push('HAPI compliance');
  if (day.total > day.fallPass) reasons.push('Fall compliance');
  pwtIssueList(day.issues && day.issues.length ? day.issues : day.missed).forEach(x => reasons.push(x));
  return reasons.length ? reasons : ['Unspecified'];
}

function pwtStaffStats(week) {
  const total = pwtTotals(week).total;
  const map = {};
  function add(role, name, reasons) {
    const key = role + '|' + name.toLowerCase();
    if (!map[key]) map[key] = { role, name, fails:0, reasons:{} };
    map[key].fails++;
    reasons.forEach(r => map[key].reasons[r] = (map[key].reasons[r] || 0) + 1);
  }
  week.days.forEach(day => {
    const reasons = pwtFailReasonEvents(day);
    pwtNameList(day.rnFails).forEach(n => add('RN/LPN', n, reasons));
    pwtNameList(day.caFails).forEach(n => add('CA', n, reasons));
  });
  return Object.values(map).map(item => {
    let top = 'Unspecified', count = 0;
    Object.keys(item.reasons).forEach(r => {
      if (item.reasons[r] > count || (item.reasons[r] === count && r.localeCompare(top) < 0)) { top = r; count = item.reasons[r]; }
    });
    item.failPct = pwtPct(item.fails, total);
    item.topReason = top + (count ? ` (${count}x)` : '');
    return item;
  }).sort((a,b) => b.fails - a.fails || a.name.localeCompare(b.name));
}

function pwtRender() {
  pwtEnsureState();
  const week = pwtWeek();
  const totals = pwtTotals(week);
  const end = week.days.length ? week.days[week.days.length - 1].date : state.platoWeekly.currentWeekStart;
  const picker = document.getElementById('pwt-week-picker');
  if (picker) picker.value = state.platoWeekly.currentWeekStart;
  const range = document.getElementById('pwt-range');
  if (range) range.textContent = pwtPretty(state.platoWeekly.currentWeekStart) + ' through ' + pwtPretty(end);
  const summary = document.getElementById('pwt-summary');
  if (summary) summary.innerHTML = [
    pwtKpi('Total PLATO', totals.total, 'Weekly rounds entered'),
    pwtKpi('HAPI', totals.hapiPct + '%', `${totals.hapiPass}/${totals.total} passing; ${totals.hapiVarianceTotal} variances`, pwtClass(totals.hapiPct)),
    pwtKpi('Fall', totals.fallPct + '%', `${totals.fallPass}/${totals.total} passing`, pwtClass(totals.fallPct)),
    pwtKpi('RN/LPN Fails', totals.rnFails, 'Selected staff events'),
    pwtKpi('CA Fails', totals.caFails, 'Selected staff events')
  ].join('');
  pwtRenderDaily(week, totals);
  pwtRenderStaff(week);
  pwtRenderTrend();
}

function pwtRenderDaily(week, totals) {
  const rows = document.getElementById('pwt-daily-rows');
  if (!rows) return;
  rows.innerHTML = week.days.map((day, idx) => {
    pwtNormalizeDay(day);
    const hs = pwtHapiStats(day);
    const fallPct = pwtPct(day.fallPass, day.total);
    return `<tr>
      <td><div class="pwt-date">${pwtEsc(pwtPretty(day.date))}<span>${pwtEsc(pwtDow(day.date))}</span></div></td>
      <td>${pwtStep(idx,'total',day.total)}</td>
      <td>${pwtStep(idx,'hapiPass',day.hapiPass)}</td>
      <td>${pwtChecklist(idx,day)}</td>
      <td class="pwt-percent ${pwtClass(hs.pct)}">${hs.pct}%</td>
      <td>${pwtStep(idx,'fallPass',day.fallPass)}</td>
      <td class="pwt-percent ${pwtClass(fallPct)}">${fallPct}%</td>
      <td>${pwtStaffPicker(idx,'rn',day.rnFails)}</td>
      <td>${pwtStaffPicker(idx,'ca',day.caFails)}</td>
      <td>${pwtIssues(idx,day)}</td>
    </tr>`;
  }).join('');
  const foot = document.getElementById('pwt-daily-totals');
  if (foot) foot.innerHTML = `<tr><td>Total</td><td>${totals.total}</td><td>${totals.hapiPass}</td><td>${totals.hapiVarianceTotal} variances</td><td class="pwt-percent ${pwtClass(totals.hapiPct)}">${totals.hapiPct}%</td><td>${totals.fallPass}</td><td class="pwt-percent ${pwtClass(totals.fallPct)}">${totals.fallPct}%</td><td>${totals.rnFails}</td><td>${totals.caFails}</td><td>${pwtEsc(totals.missed.join('; '))}</td></tr>`;
}

function pwtRenderStaff(week) {
  const tbody = document.getElementById('pwt-staff-summary');
  if (!tbody) return;
  const stats = pwtStaffStats(week);
  if (!stats.length) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text3);">No staff fails selected for this week.</td></tr>'; return; }
  tbody.innerHTML = stats.map(s => `<tr><td>${pwtEsc(s.role)}</td><td>${pwtEsc(s.name)}</td><td>${s.fails}</td><td class="pwt-percent ${pwtClass(100 - s.failPct)}">${s.failPct}%</td><td>${pwtEsc(s.topReason)}</td></tr>`).join('');
}

function pwtRenderTrend() {
  const tbody = document.getElementById('pwt-trend-rows');
  if (!tbody) return;
  const keys = Object.keys(state.platoWeekly.weeks || {}).sort().reverse();
  if (!keys.length) { tbody.innerHTML = '<tr><td colspan="10" style="color:var(--text3);">No weeks saved yet.</td></tr>'; return; }
  tbody.innerHTML = keys.map(k => {
    const week = state.platoWeekly.weeks[k];
    const t = pwtTotals(week);
    const end = week.days.length ? week.days[week.days.length - 1].date : k;
    return `<tr><td><button class="pwt-mini" type="button" data-open-week="${k}">${pwtEsc(pwtPretty(k))} - ${pwtEsc(pwtPretty(end))}</button></td><td>${t.total}</td><td>${t.hapiPass}</td><td class="pwt-percent ${pwtClass(t.hapiPct)}">${t.hapiPct}%</td><td>${t.hapiVarianceTotal}</td><td>${t.fallPass}</td><td class="pwt-percent ${pwtClass(t.fallPct)}">${t.fallPct}%</td><td>${t.rnFails}</td><td>${t.caFails}</td><td>${pwtEsc(t.missed.join('; '))}</td></tr>`;
  }).join('');
}

function pwtSave() {
  try {
    if (typeof buildSavePayload === 'function' && typeof LS_KEY !== 'undefined') {
      const data = buildSavePayload();
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      localStorage.setItem('_3bTrackerTs', Date.now().toString());
      localStorage.setItem('_sbPendingSync', '1');
    }
  } catch(e) {
    console.warn('PLATO weekly local save failed:', e);
  }
  if (typeof persistSave === 'function') persistSave();
}

function pwtSetNum(dayIndex, field, value) {
  const day = pwtWeek().days[dayIndex];
  const next = pwtNum(value);
  day[field] = next;
  if (field === 'total') {
    day.hapiPass = Math.min(day.hapiPass, day.total);
    day.fallPass = Math.min(day.fallPass, day.total);
  }
  if (field === 'hapiPass' && next > day.total) day.total = next;
  if (field === 'fallPass' && next > day.total) day.total = next;
  pwtSave();
  pwtRender();
}

function pwtSetHapi(dayIndex, key, checked) {
  const day = pwtWeek().days[dayIndex];
  pwtNormalizeDay(day);
  day.hapiChecks[key] = !!checked;
  day.hapiVariances[key] = checked ? 0 : Math.max(1, pwtNum(day.hapiVariances[key]));
  pwtSave();
  pwtRender();
}

function pwtSetAllHapi(dayIndex, checked) {
  const day = pwtWeek().days[dayIndex];
  pwtNormalizeDay(day);
  PWT_HAPI_ITEMS.forEach(item => {
    day.hapiChecks[item.key] = !!checked;
    day.hapiVariances[item.key] = 0;
  });
  day.hapiPass = checked ? day.total : 0;
  pwtSave();
  pwtRender();
}

function pwtSetHapiVariance(dayIndex, key, value) {
  const day = pwtWeek().days[dayIndex];
  pwtNormalizeDay(day);
  const count = pwtNum(value);
  day.hapiVariances[key] = count;
  day.hapiChecks[key] = count === 0;
  pwtSave();
  pwtRender();
}

function pwtSetStaff(dayIndex, role, name, checked) {
  const day = pwtWeek().days[dayIndex];
  const key = role === 'ca' ? 'caFails' : 'rnFails';
  let list = pwtNameList(day[key]);
  if (checked && !list.includes(name)) list.push(name);
  if (!checked) list = list.filter(x => x !== name);
  day[key] = pwtNameList(list);
  pwtSave();
  pwtRender();
}

function pwtSetIssue(dayIndex, issueIndex, value) {
  const day = pwtWeek().days[dayIndex];
  pwtNormalizeDay(day);
  day.issues[issueIndex] = String(value || '');
  day.missed = pwtIssueText(day);
  pwtSave();
  pwtRenderStaff(pwtWeek());
  pwtRenderTrend();
}

function pwtAddIssue(dayIndex) {
  const day = pwtWeek().days[dayIndex];
  pwtNormalizeDay(day);
  day.issues.push('');
  pwtSave();
  pwtRender();
  setTimeout(() => {
    const input = document.querySelector(`#panel-platoweekly .pwt-issues[data-day="${dayIndex}"] [data-issue-index="${day.issues.length - 1}"]`);
    if (input) input.focus();
  }, 0);
}

function pwtRemoveIssue(dayIndex, issueIndex) {
  const day = pwtWeek().days[dayIndex];
  pwtNormalizeDay(day);
  day.issues.splice(issueIndex, 1);
  day.missed = pwtIssueText(day);
  pwtSave();
  pwtRender();
}

function pwtBind() {
  const panel = document.getElementById('panel-platoweekly');
  if (!panel) return;
  panel.addEventListener('click', e => {
    const all = e.target.closest('[data-hapi-all]');
    if (all) { const box = all.closest('.pwt-checks'); pwtSetAllHapi(Number(box.dataset.day), all.dataset.hapiAll === '1'); return; }
    const step = e.target.closest('[data-step]');
    if (step) { const box = step.closest('.pwt-step'); const day = pwtWeek().days[Number(box.dataset.day)]; pwtSetNum(Number(box.dataset.day), box.dataset.field, pwtNum(day[box.dataset.field]) + Number(step.dataset.step)); return; }
    const varStep = e.target.closest('[data-var-step]');
    if (varStep) { const box = varStep.closest('.pwt-var-step'); const day = pwtWeek().days[Number(box.dataset.day)]; pwtSetHapiVariance(Number(box.dataset.day), box.dataset.hapiVar, pwtNum(day.hapiVariances[box.dataset.hapiVar]) + Number(varStep.dataset.varStep)); return; }
    const addIssue = e.target.closest('[data-add-issue]');
    if (addIssue) { const box = addIssue.closest('.pwt-issues'); pwtAddIssue(Number(box.dataset.day)); return; }
    const removeIssue = e.target.closest('[data-remove-issue]');
    if (removeIssue) { const box = removeIssue.closest('.pwt-issues'); pwtRemoveIssue(Number(box.dataset.day), Number(removeIssue.dataset.removeIssue)); return; }
    const openWeek = e.target.closest('[data-open-week]');
    if (openWeek) { pwtEnsureWeek(openWeek.dataset.openWeek); pwtSave(); pwtRender(); window.scrollTo({ top:0, behavior:'smooth' }); }
  });
  panel.addEventListener('change', e => {
    const variance = e.target.closest('.pwt-var-step input');
    if (variance) { const box = variance.closest('.pwt-var-step'); pwtSetHapiVariance(Number(box.dataset.day), box.dataset.hapiVar, variance.value); return; }
    const num = e.target.closest('.pwt-step input');
    if (num) { const box = num.closest('.pwt-step'); pwtSetNum(Number(box.dataset.day), box.dataset.field, num.value); return; }
    const hapi = e.target.closest('[data-hapi]');
    if (hapi) { const box = hapi.closest('.pwt-checks'); pwtSetHapi(Number(box.dataset.day), hapi.dataset.hapi, hapi.checked); return; }
    const staff = e.target.closest('[data-staff-name]');
    if (staff) { const box = staff.closest('.pwt-staff-picker'); pwtOpenPickers[box.dataset.role + '-' + box.dataset.day] = true; pwtSetStaff(Number(box.dataset.day), box.dataset.role, staff.dataset.staffName, staff.checked); }
  });
  panel.addEventListener('input', e => {
    const issue = e.target.closest('[data-issue-index]');
    if (issue) { const box = issue.closest('.pwt-issues'); pwtSetIssue(Number(box.dataset.day), Number(issue.dataset.issueIndex), issue.value); return; }
    const notes = e.target.closest('[data-missed]');
    if (notes) { pwtWeek().days[Number(notes.dataset.missed)].missed = notes.value; pwtSave(); pwtRenderStaff(pwtWeek()); pwtRenderTrend(); }
  });
  panel.addEventListener('toggle', e => {
    if (e.target.classList && e.target.classList.contains('pwt-staff-picker')) pwtOpenPickers[e.target.dataset.role + '-' + e.target.dataset.day] = e.target.open;
  }, true);
}

function pwtShiftWeek(days) { pwtEnsureState(); pwtEnsureWeek(pwtAddDays(state.platoWeekly.currentWeekStart, days)); pwtSave(); pwtRender(); }
function pwtCurrentWeek() { pwtEnsureState(); pwtEnsureWeek(pwtWeekStartISO(new Date())); pwtSave(); pwtRender(); }
function pwtPickWeek(value) { if (!value) return; pwtEnsureState(); pwtEnsureWeek(pwtWeekStartISO(pwtDate(value))); pwtSave(); pwtRender(); }
function pwtAddDay() { const week = pwtWeek(); const last = week.days.length ? week.days[week.days.length - 1].date : pwtAddDays(state.platoWeekly.currentWeekStart, -1); week.days.push(pwtBlankDay(pwtAddDays(last, 1))); pwtSave(); pwtRender(); }
function pwtResetWeekDates() { const old = {}; pwtWeek().days.forEach(d => old[d.date] = d); const days = []; for (let i=0;i<7;i++){ const iso=pwtAddDays(state.platoWeekly.currentWeekStart,i); days.push(old[iso] || pwtBlankDay(iso)); } state.platoWeekly.weeks[state.platoWeekly.currentWeekStart] = { days }; pwtSave(); pwtRender(); }
function pwtClearWeek() { if (!confirm('Clear PLATO counts and staff fails for this week?')) return; const start = state.platoWeekly.currentWeekStart; delete state.platoWeekly.weeks[start]; pwtEnsureWeek(start); pwtSave(); pwtRender(); }

function pwtCopySummary() {
  const week = pwtWeek();
  const t = pwtTotals(week);
  const staff = pwtStaffStats(pwtWeek()).slice(0,5).map(s => `${s.name} ${s.fails}x, most often ${s.topReason}`).join('; ') || 'None selected';
  const hapiVariance = pwtWeekVarianceSummary(week).join('; ') || 'None entered';
  const text = [`PLATO weekly summary: ${pwtPretty(state.platoWeekly.currentWeekStart)}`, `Total PLATO: ${t.total}`, `HAPI: ${t.hapiPct}% (${t.hapiPass}/${t.total})`, `HAPI variances: ${hapiVariance}`, `Fall: ${t.fallPct}% (${t.fallPass}/${t.total})`, `RN/LPN fails: ${t.rnFails}`, `CA fails: ${t.caFails}`, `Top staff fails: ${staff}`, `Missed items: ${t.missed.join('; ') || 'None entered'}`].join('\n');
  navigator.clipboard?.writeText(text);
  if (typeof showSaveBanner === 'function') showSaveBanner('PLATO weekly summary copied');
}

function pwtExportCsv() {
  const rows = [['Week Start','Date','Total PLATO','HAPI Pass','HAPI %',...PWT_HAPI_ITEMS.map(i=>i.label + ' Variance #'),'Fall Pass','Fall %','RN Fails','CA Fails','Fail Reasons','Issues / What Was Missed']];
  Object.keys(state.platoWeekly.weeks || {}).sort().forEach(k => {
    state.platoWeekly.weeks[k].days.forEach(day => {
      const hs = pwtHapiStats(day);
      rows.push([k, day.date, day.total, hs.pass, hs.pct + '%', ...PWT_HAPI_ITEMS.map(i => pwtNum(day.hapiVariances[i.key])), day.fallPass, pwtPct(day.fallPass, day.total) + '%', pwtNameList(day.rnFails).join('; '), pwtNameList(day.caFails).join('; '), pwtFailReasons(day).join('; '), pwtIssueText(day)]);
    });
  });
  const csv = rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g,'""') + '"' : String(v)).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'plato-weekly-tracker.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
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
        <div style="font-size:11px;color:${isWE?'var(--amber2)':'var(--text3)'};font-weight:${isWE?'700':'400'};text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">${d}</div>
        <div style="font-size:11px;color:var(--accent2);margin-bottom:2px;">RN: <b>${rD}</b>☀ <b>${rN}</b>🌙</div>
        <div style="font-size:11px;color:var(--purple2);margin-bottom:2px;">LPN: <b>${lD}</b>☀ <b>${lN}</b>🌙</div>
        <div style="font-size:11px;color:var(--teal2);">CA: <b>${c8}</b>×8h <b>${c12}</b>×12h</div>
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
          style="font-size:11px;padding:1px 5px;border-radius:8px;font-weight:700;cursor:help;
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
          style="width:30px;height:26px;border-radius:4px;border:2px solid ${border};background:${bg};color:${col};font-size:11px;font-weight:700;cursor:pointer;">${label}</button>
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
        <span style="color:${roleColors[s.job]||'var(--text2)'};font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;border:1px solid currentColor;flex-shrink:0;">${s.job}</span>
        <span style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isSkipped?'text-decoration:line-through;color:var(--text3);':''}">${s.name.split(',')[0]}</span>
        ${caValidBadge}
      </div>
      ${wkABtns}
      ${wkBBtns}
      <div style="text-align:center;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;color:${daysColor};">${totalDays}</div>
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
      return `<span style="background:${info.bg};color:${info.color};border-radius:3px;padding:1px 6px;font-size:11px;margin-right:4px;">${info.icon} ${info.label}: ${ranges.join(', ')}</span>`;
    }).join('');

    return `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
      <div>
        <span style="font-weight:600;font-size:11px;color:var(--white);">${lastName}</span>
        <span style="font-size:11px;color:var(--text3);margin-left:4px;">(${days.length}d total)</span>
        <div style="margin-top:3px;flex-wrap:wrap;">${typeBlocks}</div>
      </div>
      <button onclick="removeAllVac('${safe}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:0 4px;white-space:nowrap;flex-shrink:0;">Clear all</button>
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