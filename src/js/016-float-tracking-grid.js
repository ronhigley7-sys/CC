

// ════════════════════════════════════
//  FLOAT / SITTER / CALLOFF TRACKING GRID
//  Live data from Google Sheet (Float Response)
// ════════════════════════════════════

// Float Sheet URL — configurable from UI, falls back to built-in default
let sheetLoadStatus = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'
let sheetRows = [];


// Normalize any date string to YYYY-MM-DD for reliable comparison
function _normDate(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // already ISO
  const parts = d.split('/');
  if (parts.length === 3) {
    const [m, day, y] = parts;
    return `${y}-${m.padStart(2,'0')}-${day.padStart(2,'0')}`;
  }
  return d;
}

// Restore float summary from Supabase on startup, merge with live float_history
(async () => {
  // Try CC's configured Supabase first, then fall back to the shared Dash project
  const DASH_SB_URL = 'https://xnsdvdfceflmagfhpycw.supabase.co';
  const DASH_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhuc2R2ZGZjZWZsbWFnZmhweWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTk1NjgsImV4cCI6MjA5NDk5NTU2OH0.UzKZQj4BLxPpH_OCwQR8LyDUeP9YlKn5UtXRFUFaYKA';

  async function fetchFloatRows(url, key) {
    const r = await fetch(
      `${url}/rest/v1/tracker_state?key=in.(float_summary,float_history,float_board,float_roster)&select=key,value`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!r.ok) return null;
    return await r.json();
  }

  try {
    const cfg = getSBConfig();
    let rows = null;
    if (cfg.enabled && cfg.url && cfg.key) {
      rows = await fetchFloatRows(cfg.url, cfg.key).catch(() => null);
    }
    // Fallback to shared Dash Supabase project
    if (!rows || !rows.length) {
      rows = await fetchFloatRows(DASH_SB_URL, DASH_SB_KEY).catch(() => null);
    }
    if (rows && rows.length) {
        let summary = null;
        let history = [];
        let board = null;
        rows.forEach(row => {
          try {
            if (row.key === 'float_summary' && row.value) summary = JSON.parse(row.value);
            if (row.key === 'float_history' && row.value) history = JSON.parse(row.value);
            if (row.key === 'float_board'   && row.value) board   = JSON.parse(row.value);
            if (row.key === 'float_roster'  && row.value && !board) board = JSON.parse(row.value); // Dash key alias
          } catch(e) {}
        });
        if (summary) {
          // Merge live history on top of summary — history wins if newer
          const fieldMap = {Float:'lastFloat',Sitter:'lastSitter','Call Off':'lastCallOff',
            Mandation:'lastMandation','Refused Mandation':'lastCallOff','LPN in CS':'lastLPN2CA'};
          history.forEach(e => {
            if (!e.staff || !e.date) return;
            const field = fieldMap[e.assign];
            if (!field) return;
            if (!summary[e.staff]) summary[e.staff] = {};
            const existing = summary[e.staff][field];
            if (!existing || _normDate(e.date) > _normDate(existing)) {
              const nd = _normDate(e.date);
              const [y,m,d] = nd.split('-');
              summary[e.staff][field] = `${+m}/${+d}/${y}`;
            }
          });
          // Also merge float_board dates — these come from staff form submissions
          if (board) {
            const boardFieldMap = {float:'lastFloat',sitter:'lastSitter',calloff:'lastCallOff',
              mandation:'lastMandation',refusal:'lastCallOff',lpnca:'lastLPN2CA'};
            ['rn','lpn','ca'].forEach(rk => {
              if (!board[rk]) return;
              board[rk].forEach(person => {
                if (!person.name) return;
                Object.entries(boardFieldMap).forEach(([boardKey, sumKey]) => {
                  const boardDate = person[boardKey];
                  if (!boardDate || boardDate === '-') return;
                  if (!summary[person.name]) summary[person.name] = {};
                  const existing = summary[person.name][sumKey];
                  if (!existing || _normDate(boardDate) > _normDate(existing)) {
                    summary[person.name][sumKey] = boardDate;
                  }
                });
              });
            });
          }
          window._floatSummary = summary;
          sheetLoadStatus = 'loaded';
          renderTrackingGrid();
          console.log(`✓ Float summary loaded from Supabase: ${Object.keys(summary).length} staff`);
          return;
        }
    }
  } catch(e) {}
  // Fallback: localStorage cache
  try {
    const saved = localStorage.getItem('_floatSummaryData');
    if (saved) {
      window._floatSummary = JSON.parse(saved);
      sheetLoadStatus = 'loaded';
      renderTrackingGrid();
    }
  } catch(e) {}
})();

// Google Sheet float import removed: tracking grid is manual entry + Supabase float data.
async function loadFloatSheet() { sheetLoadStatus = 'loaded'; renderTrackingGrid(); }
function sendSMSToStaff(phone, body) { openSMSOrCopy(phone, body); }







// Column indices (0-based) from the sheet
const COL_DATE    = 1;
const COL_SHIFT   = 2;
const COL_ROLE    = 3;
const COL_NAME_RN = 4;   // RN names
const COL_ASGN    = 5;   // Assignment Type: Float, Sitter, LPN to CA
const COL_DEST    = 6;   // Destination Unit: 3b/3c, 4d, ED...
const COL_NAME_CA = 7;   // CA names
const COL_NAME_LPN= 8;   // LPN / payroll names

// Cache of parsed sheet rows — declared at top of file
// sheetRows and sheetLoadStatus are declared near LS_KEY above

const TRACKING_COL_LABELS = {
  floatDate:     'Float Dates',
  sitterDate:    'Sitter Dates',
  lastCallOff:   'Last Call Off',
  lpn2ca:        'LPN 2 CA',
  lastMandation: 'Last Mandation',
};

function saveTracking(name, field, val) {
  if (!state.trackingData[name]) state.trackingData[name] = {};
  state.trackingData[name][field] = val;
  persistSave();
}

// Parse a date string from sheet to YYYY-MM-DD for comparison
function normalizeSheetDate(str) {
  if (!str) return '';
  str = str.trim();
  // M/D/YYYY or MM/DD/YYYY
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return str;
}

// Get the name from a sheet row — uses dynamic col map if available, else defaults
function getSheetName(row) {
  const cm = window._floatColMap;
  const rnCol  = cm ? cm.colNameRN  : COL_NAME_RN;
  const caCol  = cm ? cm.colNameCA  : COL_NAME_CA;
  const lpnCol = cm ? cm.colNameLPN : COL_NAME_LPN;
  const roleCol= cm ? cm.colRole    : COL_ROLE;

  const role = (row[roleCol]||'').trim().toUpperCase();
  let name = '';
  if (role === 'RN')      name = String(row[rnCol] ||'').trim();
  else if (role === 'CA') name = String(row[caCol] ||'').trim();
  else                    name = String(row[lpnCol]||'').trim();
  if (!name) name = String(row[rnCol]||row[caCol]||row[lpnCol]||'').trim();
  return name;
}

function getSheetDate(row) {
  const cm = window._floatColMap;
  return cm ? String(row[cm.colDate]||'').trim() : String(row[COL_DATE]||'').trim();
}

function getSheetAsgn(row) {
  const cm = window._floatColMap;
  return cm ? String(row[cm.colAsgn]||'').trim().toLowerCase() : String(row[COL_ASGN]||'').trim().toLowerCase();
}

function getSheetDest(row) {
  const cm = window._floatColMap;
  return cm ? String(row[cm.colDest]||'').trim().toLowerCase() : String(row[COL_DEST]||'').trim().toLowerCase();
}

// Fetch and parse the Google Sheet CSV

function buildManualGrid() {
  const dateKey = state.activeBoardDate;
  const shifts = dateKey ? (state.placements[dateKey] || {}) : {};
  const allPlaced = Object.values(shifts).flat();

  // If we have placed staff use them, otherwise fall back to full master list
  let rnNames, lpnNames, caNames;
  if (allPlaced.length > 0) {
    rnNames  = [...new Set(allPlaced.filter(p=>p.role==='RN').map(p=>p.name))].sort();
    lpnNames = [...new Set(allPlaced.filter(p=>p.role==='LPN').map(p=>p.name))].sort();
    caNames  = [...new Set(allPlaced.filter(p=>p.role==='CA').map(p=>p.name))].sort();
  } else {
    rnNames  = MASTER_STAFF.filter(s=>s.job==='RN').map(s=>s.name).sort();
    lpnNames = MASTER_STAFF.filter(s=>s.job==='LPN').map(s=>s.name).sort();
    caNames  = MASTER_STAFF.filter(s=>s.job==='CA').map(s=>s.name).sort();
  }

  const summary = window._floatSummary || {};

  // Find matching summary entry with fuzzy name matching
  function getSummary(name) {
    if (!summary) return null;
    // Exact match first
    if (summary[name]) return summary[name];

    const nameLower = name.toLowerCase();
    const nameParts = nameLower.split(',').map(s => s.trim());
    const lastName  = nameParts[0] || '';
    const firstPart = (nameParts[1] || '').split(' ')[0]; // first name only, no middle

    // Try each summary key
    for (const [key, val] of Object.entries(summary)) {
      const keyLower  = key.toLowerCase();
      const keyParts  = keyLower.split(',').map(s => s.trim());
      const keyLast   = keyParts[0] || '';
      const keyFirst  = (keyParts[1] || '').split(' ')[0];

      // Match if last name AND first name start match
      if (keyLast === lastName && keyFirst && firstPart && keyFirst.startsWith(firstPart.substring(0,4))) {
        return val;
      }
      // Also match reversed (sheet might have "Barrington" for "Barringer")
      if (lastName && keyLast && (lastName.startsWith(keyLast.substring(0,6)) || keyLast.startsWith(lastName.substring(0,6)))) {
        if (keyFirst && firstPart && (keyFirst.startsWith(firstPart.substring(0,3)) || firstPart.startsWith(keyFirst.substring(0,3)))) {
          return val;
        }
      }
    }
    return null;
  }

  function buildT(names, cols) {
    const hdr = cols.map(c=>`<th>${TRACKING_COL_LABELS[c]}</th>`).join('');
    const rows = names.map(name => {
      const td  = state.trackingData[name] || {};
      const sum = getSummary(name);
      const safe = name.replace(/'/g,"\\'");

      // Auto-fill from summary if no manual override
      const floatVal  = td.floatDate    || (sum ? sum.lastFloat      : '');
      const sitterVal = td.sitterDate   || (sum ? sum.lastSitter     : '');
      const lpn2caVal = td.lpn2ca       || (sum ? sum.lastLPN2CA    : '');
      const callVal   = td.lastCallOff  || (sum ? sum.lastCallOff   : '');
      const mandVal   = td.lastMandation|| (sum ? sum.lastMandation : '');

      const valMap = {
        floatDate: floatVal, sitterDate: sitterVal,
        lastCallOff: callVal, lpn2ca: lpn2caVal, lastMandation: mandVal,
      };

      // Highlight cells auto-filled from sheet
      const cells = cols.map(c => {
        const v = valMap[c] || '';
        const fromSheet = v && !td[c];
        const style = fromSheet ? 'color:var(--accent2);' : '';
        return `<td><input type="text" class="tracking-input" value="${v}" placeholder="MM/DD/YYYY"
          style="${style}"
          onblur="saveTracking('${safe}','${c}',this.value)"
          onkeydown="if(event.key==='Enter')this.blur()"></td>`;
      }).join('');

      return `<tr><td class="tracking-name-cell">${name}</td>${cells}</tr>`;
    }).join('');
    return `<table class="tracking-table"><thead><tr><th style="min-width:160px;">Name</th>${hdr}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  const fromSheet = Object.keys(summary).length > 0;
  const label = fromSheet
    ? `<span style="color:var(--accent2);">🔵 Blue = auto-filled from Float Dashboard</span>`
    : allPlaced.length > 0
      ? `Showing ${allPlaced.length} scheduled staff · Import Float Dashboard .xlsm to auto-fill dates`
      : `Showing full roster · Import UKG data to filter by date · Import Float Dashboard to auto-fill`;

  return `
    <div style="font-size:11px;margin-bottom:10px;">${label}</div>
    <div class="tracking-section">
      <div class="tracking-section-header"><span class="tag tag-rn">RN</span> RN — Last Float · Last Sitter · Last Call Off</div>
      ${buildT(rnNames, ['floatDate','sitterDate','lastCallOff'])}
    </div>
    <div class="tracking-section">
      <div class="tracking-section-header"><span class="tag tag-lpn">LPN</span> LPN — Last Float · Last Sitter · Last Call Off · LPN 2 CA</div>
      ${buildT(lpnNames, ['floatDate','sitterDate','lastCallOff','lpn2ca'])}
    </div>
    <div class="tracking-section">
      <div class="tracking-section-header"><span class="tag tag-ca">CA</span> CA — Last Float · Last Sitter · Last Call Off · Last Mandation</div>
      ${buildT(caNames, ['floatDate','sitterDate','lastCallOff','lastMandation'])}
    </div>`;
}

function renderTrackingGrid() {
  const el = document.getElementById('tracking-grid');
  if (!el) return;

  const dateKey = state.activeBoardDate;

  // Always show manual grid — with status banner on top
  if (sheetLoadStatus === 'loading') {
    el.innerHTML = `
      <div style="background:rgba(46,125,209,0.1);border:1px solid rgba(46,125,209,0.3);border-radius:6px;padding:8px 14px;margin-bottom:12px;font-size:11px;color:var(--accent2);display:flex;align-items:center;gap:8px;">
        <span>⏳</span> Loading Float Response sheet in background — manual entry available below.
      </div>
      ${buildManualGrid()}`;
    return;
  }
  if (sheetLoadStatus === 'error') {
    el.innerHTML = `
      <div style="background:rgba(179,35,24,0.08);border:1px solid rgba(230,57,70,0.2);border-radius:6px;padding:8px 14px;margin-bottom:12px;font-size:11px;color:var(--text2);display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span>Showing scheduled staff for manual entry.</span>
      </div>
      ${buildManualGrid()}`;
    return;
  }
  if (sheetLoadStatus === 'idle') { el.innerHTML = buildManualGrid(); return; }

  if (!dateKey) {
    el.innerHTML = buildManualGrid();
    return;
  }

  // If sheet loaded — show full staff with last float/sitter from summary
  // (not filtered by date — shows LAST activity across all history like the Excel dashboard)
  el.innerHTML = `
    <div class="tracking-grid-header">
      <div>
        <div class="tracking-grid-title">📊 3B/3C Float · Sitter · Tracking</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${sheetRows.length} records loaded · Last Float/Sitter dates shown · 🔵 Blue = from Float Dashboard</div>
      </div>
    </div>
    ${buildManualGrid()}`;
}


loadDemoData();       // load demo board data (replaced by UKG import)

// NOTE: persistLoad() is now async and called inside startApp() below
// via Supabase first. The synchronous call below loads localStorage cache
// only as an instant first paint — Supabase overwrites it on connect.
(async () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      applyLoadedData(JSON.parse(raw));
    }
  } catch(e) {}
})();

// Clean any duplicate absenceLog entries (name+date+type) from previous imports
(function cleanAbsenceLogDuplicates() {
  let cleaned = 0;
  Object.keys(state.absenceLog).forEach(name => {
    const entries = state.absenceLog[name];
    if (!entries?.length) return;
    const seen = new Set();
    state.absenceLog[name] = entries.filter(e => {
      const key = `${e.date}|${e.type}`;
      if (seen.has(key)) { cleaned++; return false; }
      seen.add(key); return true;
    });
  });
  if (cleaned > 0) {
    console.log(`✓ Cleaned ${cleaned} duplicate absenceLog entries`);
  }
})();
seedDataIfEmpty();    // restore baked-in data if localStorage is empty
rebuildMasterStaff(); // merge base + custom staff into MASTER_STAFF

// Immediately hide all non-active panels before any rendering
document.querySelectorAll('.tab-panel').forEach(p => {
  p.style.display = p.classList.contains('active') ? 'block' : 'none';
});

// Initialize SharePoint sync (loads saved config)
// ── Cloud-First Startup ─────────────────────────────────────────────
async function startApp() {
  const cfg = getSBConfig();
  const hasSBConfig = cfg.enabled && cfg.url && cfg.key;

  if (hasSBConfig) {
    // Show loading overlay while we fetch from cloud
    const overlay = document.createElement('div');
    overlay.id = 'startup-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;';
    overlay.innerHTML = `
      <div style="font-size:36px;">🏥</div>
      <div style="font-size:20px;font-weight:700;color:#e2e8f0;">3B Tele Med Surg</div>
      <div style="font-size:13px;color:#64748b;">Staff Command Center</div>
      <div style="margin-top:12px;display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div id="startup-status" style="font-size:12px;color:#38bdf8;">☁️ Syncing from cloud...</div>
        <div style="width:200px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
          <div id="startup-bar" style="height:3px;background:#38bdf8;border-radius:2px;width:0%;transition:width 0.3s;"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Absolute failsafe: no matter what goes wrong below, this overlay
    // must never stay on screen forever and lock the user out of the app.
    const failsafe = setTimeout(() => {
      const stuck = document.getElementById('startup-overlay');
      if (stuck) stuck.remove();
    }, 12000);

    const bar  = document.getElementById('startup-bar');
    const stat = document.getElementById('startup-status');

    try {
      if (bar) bar.style.width = '30%';
      if (stat) stat.textContent = '☁️ Connecting to Supabase...';

      // Hard timeout — a slow/unreachable Supabase call must never block
      // the app from opening. If it doesn't finish in time, fall through
      // to local data instead of hanging forever.
      const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('sync-timeout')), ms));
      await Promise.race([
        (async () => { await initSPSync(); await persistLoad(); })(),
        timeout(8000)
      ]);

      if (bar) bar.style.width = '70%';
      if (_sbConnected) {
        if (stat) stat.textContent = '✅ Cloud data loaded — starting app...';
      } else {
        if (stat) stat.textContent = '⚠️ Cloud offline — using local data...';
      }
    } catch(e) {
      if (stat) stat.textContent = '⚠️ Sync error — using local data';
      console.warn('Startup sync error:', e);
    }

    if (bar) bar.style.width = '100%';
    await new Promise(r => setTimeout(r, 400)); // brief pause to show result

    // Remove overlay
    clearTimeout(failsafe);
    overlay.style.transition = 'opacity 0.3s';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);

  } else {
    // No Supabase — just init normally but warn that data is local only
    initSPSync();
    // Show persistent warning after 2s
    setTimeout(() => {
      const existing = document.getElementById('sb-not-configured-banner');
      if (existing) return;
      const banner = document.createElement('div');
      banner.id = 'sb-not-configured-banner';
      banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9000;background:#7c2d12;color:#fed7aa;font-size:12px;font-weight:600;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:2px solid #c2410c;';
      banner.innerHTML = `
        <span>⚠️ <strong>Supabase not configured</strong> — data is saved locally only and will not sync between devices or users.</span>
        <button onclick="setupSPSync()" style="background:#c2410c;border:none;color:white;padding:5px 14px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">☁️ Connect Now</button>
        <button onclick="this.parentElement.remove()" style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fed7aa;padding:5px 10px;border-radius:5px;font-size:11px;cursor:pointer;">Dismiss</button>`;
      document.body.appendChild(banner);
    }, 2000);
  }

  initAll();
  loadFloatSheet();
  setTimeout(updateStickyTop, 100);
  window.addEventListener('resize', updateStickyTop);
  setTimeout(() => { renderBoardCompAlerts(); renderBoardPolicyAlerts(); updateCallInSummary(); }, 200);
}

startApp();

setTimeout(() => { renderBoardCertAlerts(); renderBoardWeeklyEdu(); }, 50);

// Auto-refresh sheet every 5 minutes
setInterval(() => {
  if (sheetLoadStatus === 'loaded') loadFloatSheet();
}, 5 * 60 * 1000);

// ── Print Generated Schedule ──
function printSchedule() {
  const startValue = state._scheduleStart || document.getElementById('schedule-start-date')?.value || '';
  if (!startValue || !state._scheduleSuggestions || !Object.keys(state._scheduleSuggestions).length) {
    alert('Generate a schedule first before printing.');
    return;
  }
  const start = new Date(startValue + 'T12:00:00');
  const DAYS  = 28;
  const dates = Array.from({length:DAYS}, (_,d) => { const dt=new Date(start); dt.setDate(start.getDate()+d); return dt; });
  const suggs = state._scheduleSuggestions || {};
  const ovr   = state.scheduleOverrides || {};
  const DOW   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MON   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function placed(dk, sk, role) {
    const s = suggs[dk+'|'+sk] || {};
    const arr = role==='RN'?(s.RN||[]):role==='LPN'?(s.LPN||[]):(s.CA||[]);
    return arr.filter(name => ovr[dk+'|'+sk+'|'+name] !== 'OFF');
  }

  const shiftLabel = { DAY:'0700-1900', NIGHT:'1900-0700', CA_D:'0630-1430', CA_E:'1430-2230',
    CA_E13:'1430-0300', CA_N:'2230-0630', CA_D12:'0630-1830', CA_N12:'1830-0630' };
  const roleGroups = [
    { role:'RN',  shifts:['DAY','NIGHT'] },
    { role:'LPN', shifts:['DAY','NIGHT'] },
    { role:'CA',  shifts:['CA_D','CA_E','CA_E13','CA_N','CA_D12','CA_N12'].filter(sk =>
        dates.some(d => placed(d.toISOString().split('T')[0], sk, 'CA').length > 0)) },
  ];

  let html = `<html><head><title>3B 4-Week Schedule</title><style>
    body{font-family:Arial,sans-serif;font-size:8pt;margin:12px}
    h1{font-size:13pt;margin-bottom:2px} h2{font-size:10pt;background:#1a3a5c;color:#fff;padding:3px 8px;margin:10px 0 4px}
    h3{font-size:9pt;color:#1a3a5c;margin:6px 0 2px}
    table{border-collapse:collapse;width:100%;margin-bottom:8px;font-size:7.5pt}
    th{background:#1a3a5c;color:#fff;padding:2px 3px;text-align:center;white-space:nowrap}
    th.br{background:#7c4c00} td{border:1px solid #ddd;padding:1px 3px;text-align:center}
    td.br{background:#fff8f0} .cov{font-weight:bold} .ok{color:#1a7a1a} .lo{color:#cc0000} .nm{color:#c07000}
    .staff-name{text-align:left;white-space:nowrap;font-size:7pt;max-width:120px;overflow:hidden}
    .hrs{font-size:7pt;padding:1px 5px;border-radius:3px;display:inline-block;margin:1px}
    .hrs-ok{background:#d4edda} .hrs-ov{background:#fff3cd} .hrs-un{background:#f8d7da}
    @page{size:landscape;margin:0.5in} @media print{.no-print{display:none}}
  </style></head><body>
  <h1>3B Tele Med Surg — 4-Week Schedule</h1>
  <div style="font-size:8pt;color:#555;margin-bottom:8px">
    ${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${dates[27].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} &nbsp;·&nbsp;
    Printed ${new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
  </div>`;

  roleGroups.forEach(({role, shifts}) => {
    if (!shifts.length) return;
    const staff = MASTER_STAFF.filter(s=>s.job===role);
    html += `<h2>${role} — Target: ${role==='CA'?'4':role==='LPN'?'1':'5-6'} per shift</h2>`;
    shifts.forEach(sk => {
      html += `<h3>${shiftLabel[sk]||sk}</h3><table>`;
      // Header row with 4 weeks
      html += '<tr><th class="staff-name">Staff</th>';
      dates.forEach(d => {
        const br = [0,1,5,6].includes(d.getDay());
        html += `<th${br?' class="br"':''}>${DOW[d.getDay()]}<br>${d.getDate()}</th>`;
      });
      html += '<th>Hrs</th></tr>';
      // Staff rows
      staff.forEach(s => {
        const cells = dates.map(d => placed(d.toISOString().split('T')[0], sk, role).includes(s.name));
        if (!cells.some(Boolean)) return;
        const isOrientee = !!(state.empOrientation && state.empOrientation[s.name]);
        const orientLabel = isOrientee ? ' <span style="font-size:6.5pt;font-weight:700;color:#92400e;background:#fef3c7;padding:0 3px;border-radius:2px;">ORI</span>' : '';
        html += `<tr><td class="staff-name">${s.name.split(',')[0]}${orientLabel}</td>`;
        cells.forEach((on,i) => {
          const br = [0,1,5,6].includes(dates[i].getDay());
          html += `<td${br?' class="br"':''}>${on?'✓':''}</td>`;
        });
        // Hours this shift
        const hrs = cells.filter(Boolean).length * (sk==='CA_E13'?13:(sk==='CA_D12'||sk==='CA_N12')?12:role==='CA'?8:12);
        html += `<td>${hrs}</td></tr>`;
      });
      // Coverage row
      html += '<tr style="background:#f5f5f5"><td class="staff-name cov">Coverage</td>';
      dates.forEach(d => {
        const br = [0,1,5,6].includes(d.getDay());
        const cnt = placed(d.toISOString().split('T')[0], sk, role).length;
        const tgt = role==='CA'?4:role==='LPN'?1:5;
        const cls = cnt>=tgt?'ok':cnt===tgt-1?'nm':'lo';
        html += `<td class="cov ${cls}${br?' br':''}">${cnt}</td>`;
      });
      html += '<td></td></tr></table>';
    });
    // Hours summary row
    html += '<div style="margin-bottom:6px;font-size:7.5pt"><strong>Hours summary:</strong> ';
    staff.forEach(s => {
      let hrs = 0;
      shifts.forEach(sk => {
        dates.forEach(d => {
          if (placed(d.toISOString().split('T')[0], sk, role).includes(s.name))
            hrs += sk==='CA_E13'?13:(sk==='CA_D12'||sk==='CA_N12')?12:role==='CA'?8:12;
        });
      });
      const fte = parseFloat(state.empFTE[s.name])||1;
      const tgt = Math.round(fteShiftsPerCycle(fte)*2*(role==='CA'?8:12));
      const cls = hrs>tgt?'hrs-ov':hrs<tgt?'hrs-un':'hrs-ok';
      html += `<span class="hrs ${cls}">${s.name.split(',')[0]}: ${hrs}h / ${tgt}h</span>`;
    });
    html += '</div>';
  });

  html += '</body></html>';
  const w = window.open('','_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(), 600);
}


