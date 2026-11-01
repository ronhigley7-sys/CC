

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
    html += '<div style="font-size:11px;color:var(--text3);margin-top:3px;">'+k.sub+'</div>';
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
    html += '<div style="font-size:11px;color:var(--text3);">'+(m.count||'')+'</div>';
    html += '<div style="height:'+h+'px;background:'+col+';border-radius:3px 3px 0 0;width:100%;min-width:18px;"></div>';
    html += '<div style="font-size:11px;color:var(--text3);">'+m.label+'</div>';
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
      html += '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">';
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
          <div style="font-size:11px;color:${isWE?col:'var(--text3)'};font-weight:${isWE?'700':'400'};">${d}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--text3);">
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
            <span style="font-size:11px;color:var(--text3);">${cut30.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – Today</span>
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
            <span style="font-size:11px;color:var(--text3);">${cut365.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} – Today</span>
          </div>
          ${buildHeatBar(counts[role],'d365',role)}
        </div>`).join('')}
    </div>`;
}

function filterAbsenceStaffLive() {
  // Reuse the existing attendance records, year and role filters; never change stored data.
  renderAbsenceTab();
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
  const searchText = (document.getElementById('absence-staff-search')?.value || '').trim().toLocaleLowerCase();
  const matchedStaff = searchText ? staff.filter(s => s.name.toLocaleLowerCase().includes(searchText)) : staff;
  const suggestions = document.getElementById('absence-staff-suggestions');
  if (suggestions) suggestions.replaceChildren(...MASTER_STAFF.filter(s=>s.job!=='NURSE MGR').map(s=>{const opt=document.createElement('option');opt.value=s.name;return opt;}));
  const summary = document.getElementById('absence-search-summary');
  if (summary) summary.textContent = searchText ? `${matchedStaff.length} matching staff member${matchedStaff.length===1?'':'s'} — occurrences shown below` : 'Start typing to find a staff member and review their occurrences.';
  el.innerHTML = matchedStaff.map(s => {
    const log = (state.absenceLog[s.name]||[]).filter(e => searchText ? e.date >= cutoffStr : new Date(e.date+'T12:00:00').getFullYear()===year);
    const absHours = log.filter(e=>e.type!=='tardy').reduce((sum,e)=>sum+e.hours,0);
    const tardyCount = log.filter(e=>e.type==='tardy').length;
    const writeUps = log.filter(e=>e.writeUp).length;
    const bankLeft = Math.max(0, ANNUAL_BANK_HOURS-absHours);
    const overBank = absHours > ANNUAL_BANK_HOURS;
    const safe = s.name.replace(/'/g,"\\'");
    if (!log.length) return `<div class="card" style="margin-bottom:6px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;"><span onclick="openEmployeeHub('${safe}')" style="cursor:pointer;font-weight:600;font-size:12px;text-decoration:underline dotted;text-underline-offset:2px;">${s.name}</span><span style="font-size:11px;color:var(--text3);">${s.job}</span></div>
      <span style="font-size:11px;color:var(--green2);">✓ No occurrences ${searchText ? "in the last 365 days" : "in " + year}</span></div>`;
    return `<div class="card" style="margin-bottom:12px;padding:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span onclick="openEmployeeHub('${safe}')" style="cursor:pointer;font-weight:700;font-size:13px;text-decoration:underline dotted;text-underline-offset:2px;">${s.name}</span>
          <span style="font-size:11px;color:var(--text3);">${s.job}</span>
          ${writeUps>0?`<span style="background:rgba(179,35,24,0.2);color:var(--red2);border:1px solid rgba(179,35,24,0.4);border-radius:4px;padding:1px 8px;font-size:11px;font-weight:700;">⚠ ${writeUps} Write-Up${writeUps>1?'s':''}</span>`:''}
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
  html += '<span style="font-size:11px;color:var(--text3);">Updates annually · shared across all months</span></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px;">';
  [
    {label:'💊 Scan % Target',   field:'scanTarget',   unit:'%',  val:goals.scanTarget},
    {label:'💔 Pain Reassess %', field:'painTarget',   unit:'%',  val:goals.painTarget},
    {label:'📈 Press Ganey',     field:'pgTarget',     unit:'',   val:goals.pgTarget},
    {label:'🎯 Custom Goal 1',   field:'custom1',      unit:'',   val:goals.custom1},
    {label:'🎯 Custom Goal 2',   field:'custom2',      unit:'',   val:goals.custom2},
  ].forEach(g => {
    html += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px 12px;">';
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:4px;">'+g.label+'</div>';
    html += inp('goal-'+g.field, g.field, g.val, g.unit?'e.g. 95'+g.unit:'Enter goal', 'saveGoalField', 'text');
    html += '</div>';
  });
  html += '</div>';
  html += '<div style="margin-top:8px;">';
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:4px;">📝 Annual goals / narrative</div>';
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
    html += '<input type="number" min="0" value="'+(sk[numId]||'')+'" placeholder="0" oninput="saveStrokeField(\'' + numId + '\',this.value)" title="'+m.numNote+'" style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:11px;">';
    html += '</td><td style="padding:6px 6px;text-align:center;">';
    html += '<input type="number" min="0" value="'+(sk[denId]||'')+'" placeholder="0" oninput="saveStrokeField(\'' + denId + '\',this.value)" title="'+m.denNote+'" style="width:60px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;text-align:center;font-size:11px;">';
    html += '</td><td style="padding:6px 6px;text-align:center;font-weight:700;font-size:12px;color:'+col+';">'+(pct!==null?pct+'%':'—')+'</td>';
    html += '<td style="padding:6px 6px;text-align:center;font-size:11px;color:var(--text3);">≥'+m.goal+'%</td>';
    html += '<td style="padding:6px 6px;text-align:center;font-size:11px;color:'+col+';">'+status+'</td>';
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
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:2px;">'+m.label+'</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:6px;">'+m.note+'</div>';
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
    html += '<div style="font-size:11px;color:var(--text3);">'+k.icon+' '+k.label+'</div>';
    html += '<div style="font-size:28px;font-weight:700;color:'+k.col+';margin:4px 0;">'+k.val+'</div>';
    if (k.target) html += '<div style="font-size:11px;color:var(--text3);">Goal: '+k.target+(k.label.includes('%')?'%':'')+'</div>';
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
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:2px;">'+m.label+'</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:5px;">'+m.note+'</div>';
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
      '<div style="font-size:11px;color:var(--text3);">'+icon+' '+label+'</div>'+
      '<div style="font-size:22px;font-weight:700;color:'+(col||'var(--text2)')+';margin:2px 0;">'+val+'</div>'+
      (sub?'<div style="font-size:11px;color:var(--text3);">'+sub+'</div>':'')+
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
      html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:11px;">';
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
    html += '<div style="font-size:11px;color:var(--text3);background:rgba(255,255,255,0.04);border-radius:6px;padding:10px;margin-bottom:10px;">'+goals.goalText+'</div>';
  }
  // CA-specific goals callout
  if (s.job === 'CA') {
    const fte = parseFloat(state.empFTE[name])||0.9;
    html += '<div style="background:rgba(14,116,144,0.1);border:1px solid rgba(14,116,144,0.3);border-radius:6px;padding:10px;margin-bottom:10px;font-size:11px;">';
    html += '<strong style="color:var(--teal2);">📋 CA Scheduling Requirements</strong><br>';
    html += `<span style="color:var(--text2);">
      FTE ${fte} → <strong>${fteShiftsPerCycle(fte,'CA')*2} shifts / 4 weeks</strong> · 
      <strong>${Math.round(fteShiftsPerCycle(fte,'CA')*2*8)}h target</strong> · 
      Mix: 2×12h + 2×8h per week · 
      Weekend: <strong>Every other weekend required</strong>
    </span>`;
    html += '</div>';
  }
  html += '<div style="font-size:11px;color:var(--text3);">How '+name.split(',')[0]+' contributed to unit goals this year:</div>';
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
      '<div style="font-size:11px;background:rgba(46,125,209,0.12);border-left:2px solid var(--accent2);border-radius:4px;padding:4px 8px;margin-bottom:4px;color:var(--text2);">💡 '+t+'</div>'
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
    if (!hasData) return '<div style="font-size:11px;color:var(--text3);font-style:italic;">No data recorded for '+yr+'</div>';
    const max = 100;
    return '<div style="margin-bottom:12px;">'+
      '<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:4px;">'+label+(goal?' <span style="color:var(--text3);font-weight:400;font-size:11px;">(Goal: '+goal+'%)</span>':'')+'</div>'+
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
      (goal?'<div style="border-top:1px dashed rgba(255,255,255,0.15);margin-top:2px;font-size:11px;color:var(--text3);">Goal '+goal+'%</div>':'')
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
  html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">Unit avg Press Ganey for '+yr+': <strong style="color:var(--amber2);">'+(pgAvg!==null?pgAvg:'No data')+'</strong>'+(goals.pgTarget?' (Goal: '+goals.pgTarget+')':'')+'</div>';
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

  let scanSub = showScan ? `<th style="padding:4px 6px;font-size:11px;color:var(--text3);">Scanned</th><th style="padding:4px 6px;font-size:11px;color:var(--text3);">Total</th><th style="padding:4px 6px;font-size:11px;color:var(--accent2);">%</th>` : '';
  let painSub = showPain ? `<th style="padding:4px 6px;font-size:11px;color:var(--text3);">Reassessed</th><th style="padding:4px 6px;font-size:11px;color:var(--text3);">Opps</th><th style="padding:4px 6px;font-size:11px;color:var(--amber2);">%</th>` : '';
  let txSub   = showTx   ? `<th style="padding:4px 6px;font-size:11px;color:var(--text3);">Done</th><th style="padding:4px 6px;font-size:11px;color:var(--text3);">Total</th>` : '';

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
    <div style="font-size:11px;color:var(--text3);margin-top:2px;">${b.label} · ${MONTHS[mo]} ${yr}</div>
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
          <th style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text3);">Scanned</th>
          <th style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text3);">Total Meds</th>
          <th style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text3);">%</th>
          <th style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text3);">Reassessed</th>
          <th style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text3);">Total Opps</th>
          <th style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text3);">%</th>
          <th style="padding:4px 6px;text-align:center;font-size:11px;color:var(--text3);">Count</th>
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
            <td style="padding:6px 6px;text-align:center;color:${s.job==='RN'?'var(--accent2)':'var(--purple2)'};font-size:11px;font-weight:700;">${s.job}</td>
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
                    style="width:44px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 3px;text-align:center;font-size:11px;" title="Patients assessed">
                  <span style="color:var(--text3);font-size:11px;">/</span>
                  <input type="number" id="q_${sid}_txd" min="0" value="${q.txDen||''}" placeholder="#"
                    oninput="saveQuality('${safe}','txDen',this.value,'q_${sid}_txpct','q_${sid}_txn','q_${sid}_txd')"
                    style="width:44px;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 3px;text-align:center;font-size:11px;" title="Patients requiring transfusion">
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
    return `<th colspan="7" style="position:sticky;top:0;z-index:5;padding:4px 8px;text-align:center;background:var(--navy);border:1px solid var(--border);border-bottom:3px solid ${w<2?'var(--accent2)':'var(--green2)'};color:${w<2?'var(--accent2)':'var(--green2)'};font-size:11px;font-weight:700;">Week ${w+1} — ${wStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})}–${wEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})} <span style="font-size:11px;font-weight:400;opacity:0.7;">${payPeriod}</span></th>`;
  }).join('');

  const dayHeaders = dates.map(d => {
    const dow    = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];
    const dk     = d.toISOString().split('T')[0];
    const isBridge  = [0,1,5,6].includes(d.getDay()); // Sun/Mon/Fri/Sat
    const isWE   = d.getDay()===0||d.getDay()===6;
    const hdrBg  = 'var(--navy)';
    const dowCol = isBridge ? 'var(--amber2)' : 'var(--text3)';
    return `<th style="position:sticky;top:26px;z-index:5;padding:2px 3px;text-align:center;min-width:32px;background:${hdrBg};border-left:1px solid rgba(255,255,255,0.06);${isBridge?'border-bottom:2px solid var(--amber2);':isWE?'border-bottom:2px solid rgba(255,255,255,0.15);':''}">
      <div style="color:${dowCol};font-size:11px;">${dow}</div>
      <div style="color:var(--white);font-weight:700;font-size:11px;">${d.getDate()}</div>
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
              <div style="font-size:11px;color:var(--text3);margin-top:2px;">${[fteLbl,shLbl,is48?'↔48hr':''].filter(Boolean).join(' · ')}</div>
              <div style="font-size:11px;font-family:'IBM Plex Mono',monospace;color:${hoursColor};margin-top:2px;font-weight:700;">${hoursLabel}${scheduledHours<targetHours?' ⚠':''}${scheduledHours>targetHours?' ↑':''}</div>
            </td>`;
          }

          rows += `<td style="padding:3px 8px;position:sticky;left:160px;background:var(--card);z-index:2;border-right:2px solid var(--border);border-bottom:1px solid rgba(255,255,255,0.04);color:var(--text3);font-size:11px;white-space:nowrap;">${SHIFT_LABELS[shiftGrp]}</td>`;

          // Coverage count cell
          rows += `<td style="padding:2px 4px;text-align:center;border-right:2px solid var(--accent);border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;font-family:'IBM Plex Mono',monospace;background:rgba(46,125,209,0.05);" title="Coverage count placeholder"></td>`;

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
          <td style="padding:1px 10px;position:sticky;left:0;background:var(--card2);z-index:2;border-right:1px solid var(--border);font-size:11px;color:var(--text3);">Coverage</td>
          <td style="padding:1px 8px;position:sticky;left:160px;background:var(--card2);z-index:2;border-right:2px solid var(--border);font-size:11px;color:var(--text3);">${SHIFT_LABELS[shiftGrp]}</td>
          <td style="border-right:2px solid var(--accent);background:var(--card2);"></td>
          ${dates.map(d => {
            const dk = d.toISOString().split('T')[0];
            const cnt = countForDay(dk, shiftGrp, grp.role);
            const tgt = grp.role==='CA' ? 4 : grp.role==='LPN' ? 1 : 5;
            const isBridge = [0,1,5,6].includes(d.getDay());
            const col = cnt >= tgt ? 'var(--green2)' : cnt === tgt-1 ? 'var(--amber2)' : 'var(--red2)';
            const bg  = isBridge && cnt >= tgt ? 'rgba(180,83,9,0.05)' : '';
            return `<td style="text-align:center;font-size:11px;font-family:'IBM Plex Mono',monospace;font-weight:700;color:${col};background:${bg};border-left:1px solid rgba(255,255,255,0.04);">${cnt}</td>`;
          }).join('')}
        </tr>`;
      });
    });
  });

  const conflicts = state._scheduleConflicts || [];
  const conflictsBanner = conflicts.length ? `
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);border-radius:6px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:var(--red2);margin-bottom:4px;">⚠ ${conflicts.length} Set Schedule conflict(s) — capacity exceeded</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">These staff have overlapping fixed schedules beyond real unit capacity (RN max 6, LPN max 2, CA max 4 per shift). They were left off this suggested schedule — resolve by adjusting their Set Schedule day/shift.</div>
      <div style="font-size:11px;color:var(--text2);max-height:120px;overflow-y:auto;">
        ${conflicts.map(c => `<div>${c.dateKey} · ${SHIFT_LABELS[c.shiftGrp]||c.shiftGrp} · ${c.role} · <b>${c.name}</b></div>`).join('')}
      </div>
    </div>` : '';

  const understaffed = state._scheduleUnderstaffed || [];
  const understaffedBanner = understaffed.length ? `
    <div style="background:rgba(180,83,9,0.1);border:1px solid rgba(180,83,9,0.35);border-radius:6px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:4px;">⚠ ${understaffed.length} RN shift(s) still below the 5-RN floor</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">Not enough RNs had unused weekly hours left on these dates to reach 5 — this reflects real capacity, not a fill bug. Consider approving overtime, adding a 48hr-contract RN, or picking up agency coverage for these shifts.</div>
      <div style="font-size:11px;color:var(--text2);max-height:120px;overflow-y:auto;">
        ${understaffed.map(u => `<div>${u.dateKey} · ${SHIFT_LABELS[u.shiftGrp]||u.shiftGrp} · only ${u.count} RN(s)</div>`).join('')}
      </div>
    </div>` : '';

  el.innerHTML = `${conflictsBanner}${understaffedBanner}<div style="overflow-x:auto;">
    <table style="border-collapse:collapse;font-size:11px;white-space:nowrap;">
      <thead>
        <tr>
          <th style="position:sticky;left:0;top:0;background:var(--navy);z-index:6;min-width:160px;padding:4px 8px;border-bottom:1px solid var(--border);">Staff</th>
          <th style="position:sticky;left:160px;top:0;background:var(--navy);z-index:6;min-width:60px;padding:4px 8px;border-bottom:1px solid var(--border);">Shift</th>
          <th style="position:sticky;top:0;background:var(--navy);z-index:6;padding:4px 6px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text3);">#</th>
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
        <span style="font-size:11px;font-family:'IBM Plex Mono',monospace;color:var(--text3);">${n.ts}</span>
        <button class="move-btn remove-btn" style="font-size:11px;padding:1px 6px;" onclick="deleteEmpNote('${safeN}',${idx})" title="Delete note">✕</button>
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
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:11px;width:24px;">#</th>
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:11px;">Name</th>
        <th style="text-align:center;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:11px;width:50px;">Total</th>
        <th style="padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text3);font-size:11px;">Last Date</th>
      </tr></thead>
      <tbody>${entries.map(([name, cnt], i) => {
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
        return `<tr style="${i%2?'background:rgba(255,255,255,0.02)':''}">
          <td style="padding:4px 8px;text-align:center;">${medal}</td>
          <td style="padding:4px 8px;font-weight:${i<3?'700':'400'};">${name}</td>
          <td style="padding:4px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;font-weight:700;color:${color};">${cnt}</td>
          <td style="padding:4px 8px;font-size:11px;color:var(--text3);font-family:'IBM Plex Mono',monospace;">${lastDate[name]||''}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // ── Role-filtered leaderboard at top of panel (dropdown-driven) ──
  if (roleLbEl) {
    const selectedRole = document.getElementById('fs-role-select')?.value || 'RN';
    roleLbEl.innerHTML = `
      <div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px;">${selectedRole} — Most Floats</div>
        ${leaderboard(selectedRole,'Float',roleColors[selectedRole])}
      </div>
      <div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px;">${selectedRole} — Most Sitters</div>
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
              <td style="padding:4px 8px;"><span style="background:${roleBg[r.role]||'rgba(100,100,100,0.1)'};color:${roleColors[r.role]||'var(--text2)'};font-size:11px;font-weight:700;padding:1px 5px;border-radius:3px;">${r.role}</span></td>
              <td style="padding:4px 8px;font-size:11px;color:var(--text2);">${r.shift}</td>
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