function renderEducation() {
  const search     = (document.getElementById('edu-search')?.value||'').toLowerCase();
  const roleFilter = state.eduRole;
  const list       = document.getElementById('edu-list');
  const statsDiv   = document.getElementById('edu-stats');
  const expReport  = document.getElementById('exp-report');
  const today      = new Date();

  // Show/hide exp report vs staff list
  const isExpReport = roleFilter === 'EXP_REPORT';
  if (list)      list.style.display      = isExpReport ? 'none' : 'block';
  if (expReport) expReport.style.display = isExpReport ? 'block' : 'none';

  if (isExpReport) {
    renderExpReport();
    statsDiv.innerHTML = '';
    return;
  }

  const allStaff = MASTER_STAFF.filter(s=>s.job!=='NURSE MGR').map(s => {
    const items = getEduItems(s.name);
    const certs = state.certs[s.name] || {};
    const certExpiring = CERT_FIELDS.some(f => {
      const cls = certClass(certs[f]);
      return cls === 'critical' || cls === 'soon';
    }) || [1,2,3,4,5].some(n => {
      const cls = certClass(certs[`custom${n}_date`]);
      return cls === 'critical' || cls === 'soon';
    });
    return {
      ...s, items, certs, certExpiring,
      bday:  state.birthdays[s.name]  || '',
      anniv: state.anniversaries[s.name] || '',
      agency: state.agencyDates[s.name] || {},
    };
  });

  const totalPending = allStaff.reduce((a,s)=>a+s.items.length,0);
  const staffPending = allStaff.filter(s=>s.items.length>0).length;
  const staffClear   = allStaff.filter(s=>s.items.length===0).length;
  const certExpCount = allStaff.filter(s=>s.certExpiring).length;

  statsDiv.innerHTML = `
    <div class="stat-chip"><div class="stat-num" style="color:var(--red2)">${totalPending}</div><div class="stat-label">Pending Items</div></div>
    <div class="stat-chip"><div class="stat-num" style="color:var(--amber2)">${staffPending}</div><div class="stat-label">Staff w/ Pending</div></div>
    <div class="stat-chip"><div class="stat-num" style="color:var(--green2)">${staffClear}</div><div class="stat-label">Edu Clear</div></div>
    <div class="stat-chip"><div class="stat-num" style="color:var(--red2)">${certExpCount}</div><div class="stat-label">Cert Expiring</div></div>
  `;

  let filtered = allStaff;
  if      (roleFilter === 'PENDING')  filtered = filtered.filter(s=>s.items.length>0);
  else if (roleFilter === 'CERT_EXP') filtered = filtered.filter(s=>s.certExpiring);
  else if (roleFilter !== 'ALL')      filtered = filtered.filter(s=>s.job===roleFilter);
  if (search) filtered = filtered.filter(s=>
    s.name.toLowerCase().includes(search) ||
    s.items.some(i=>i.toLowerCase().includes(search)) ||
    CERT_FIELDS.some(f=>(s.certs[f]||'').toLowerCase().includes(search))
  );

  filtered.sort((a,b) => (b.items.length + (b.certExpiring?100:0)) - (a.items.length + (a.certExpiring?100:0)));

  function daySoon(mmdd, days=30) {
    if (!mmdd) return false;
    const [m,d] = mmdd.split('/').map(Number);
    const next = new Date(today.getFullYear(), m-1, d);
    if (next < today) next.setFullYear(today.getFullYear()+1);
    return (next - today) / 86400000 <= days;
  }

  list.innerHTML = filtered.map(s => {
    const cnt        = s.items.length;
    const cntCls     = cnt >= 8 ? 'high' : cnt >= 4 ? 'med' : cnt > 0 ? 'low' : 'low';
    const bdaySoon   = daySoon(s.bday);
    const annivSoon  = daySoon(s.anniv);
    const hasPhone   = !!(state.phones[s.name]);
    const hasEmail   = !!(state.emails[s.name]);

    // Cert status badges — mode-aware
    const certMode = state.certDisplayMode || 'expDate';
    const certBadgesHtml = CERT_FIELDS.map(f => {
      const val = s.certs[f] || '';
      const cls = certClass(val);
      const lbl = val ? certLabel(val) : 'Not set';
      // In dueNow mode: only show badges that need attention
      if (certMode === 'dueNow' && cls === 'ok') return '';
      return `<span class="cert-badge ${cls}" title="${f}: ${val||'not entered'}">${f} ${cls==='ok'?'✓':cls==='missing'?'—':lbl}</span>`;
    }).join('') + [1,2,3,4,5].map(n => {
      const label = s.certs[`custom${n}_label`] || '';
      const val   = s.certs[`custom${n}_date`]  || '';
      if (!label && !val) return '';
      const cls = certClass(val);
      const lbl = val ? certLabel(val) : 'Not set';
      const displayName = label || `Custom ${n}`;
      if (certMode === 'dueNow' && cls === 'ok') return '';
      return `<span class="cert-badge ${cls}" title="${displayName}: ${val||'not entered'}">${displayName} ${cls==='ok'?'✓':cls==='missing'?'—':lbl}</span>`;
    }).join('') + [1,2,3,4,5].map(n => {
      const label = s.certs[`custom${n}_label`] || '';
      const val   = s.certs[`custom${n}_date`]  || '';
      if (!label && !val) return '';
      const cls = certClass(val);
      const lbl = val ? certLabel(val) : 'Not set';
      const displayName = label || `Custom ${n}`;
      if (certMode === 'dueNow' && cls === 'ok') return '';
      return `<span class="cert-badge ${cls}" title="${displayName}: ${val||'not entered'}">${displayName} ${cls==='ok'?'✓':cls==='missing'?'—':lbl}</span>`;
    }).join('');

    // Cert input fields — always show all for editing, but highlight by mode
    const certFieldsHtml = CERT_FIELDS.map(f => {
      const val = s.certs[f] || '';
      const cls = val ? certClass(val) : '';
      const inputCls = cls ? `cert-input exp-${cls}` : 'cert-input';
      const sn = s.name.replace(/'/g,"\\'");
      const needsAttn = cls === 'critical' || cls === 'missing' || cls === 'soon';
      const dueLabelHtml = certMode === 'dueNow' && needsAttn
        ? `<span style="font-size:8px;background:rgba(239,68,68,0.15);color:var(--red2);border-radius:4px;padding:1px 4px;margin-left:3px;">${cls==='missing'?'MISSING':cls==='critical'?'EXPIRED/DUE':'SOON'}</span>`
        : '';
      return `<div class="cert-cell">
        <div class="cert-label">${f} Exp.${dueLabelHtml}</div>
        <input type="text" class="${inputCls}" value="${val}" placeholder="MM/DD/YYYY"
          oninput="saveCert('${sn}','${f}',this.value);updateCertInputStyle(this,'${sn}','${f}')"
          onblur="saveCert('${sn}','${f}',this.value)"
          onkeydown="if(event.key==='Enter')saveCert('${sn}','${f}',this.value)">
      </div>`;
    }).join('');

    // Agency contract fields — any role can be agency staff
    const agencyHtml = (() => {
      const ag = s.agency || {};
      const bs = ag.blockSchedule || {};
      const safeName = s.name.replace(/'/g, "\\'");
      return `
        <div style="margin-bottom:12px;padding:10px 12px;background:rgba(91,33,182,0.07);border:1px solid rgba(91,33,182,0.2);border-radius:6px;">
          <div class="form-label" style="margin-bottom:8px;color:var(--purple2);">🏥 Agency / Contract</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div class="cert-cell">
              <div class="cert-label">Contract Start</div>
              <input type="text" class="cert-input" value="${ag.contractStart||''}" placeholder="MM/DD/YYYY"
                oninput="saveAgency('${safeName}','contractStart',this.value)"
                onblur="saveAgency('${safeName}','contractStart',this.value)"
                onkeydown="if(event.key==='Enter')saveAgency('${safeName}','contractStart',this.value)">
            </div>
            <div class="cert-cell">
              <div class="cert-label">Contract End</div>
              <input type="text" class="cert-input ${ag.contractEnd ? 'exp-'+certClass(ag.contractEnd) : ''}"
                value="${ag.contractEnd||''}" placeholder="MM/DD/YYYY"
                oninput="saveAgency('${safeName}','contractEnd',this.value);updateAgencyInputStyle(this,'${safeName}','contractEnd')"
                onblur="saveAgency('${safeName}','contractEnd',this.value)"
                onkeydown="if(event.key==='Enter')saveAgency('${safeName}','contractEnd',this.value)">
            </div>
            <div class="cert-cell">
              <div class="cert-label">Extension End</div>
              <input type="text" class="cert-input ${ag.extensionEnd ? 'exp-'+certClass(ag.extensionEnd) : ''}"
                value="${ag.extensionEnd||''}" placeholder="MM/DD/YYYY"
                oninput="saveAgency('${safeName}','extensionEnd',this.value);updateAgencyInputStyle(this,'${safeName}','extensionEnd')"
                onblur="saveAgency('${safeName}','extensionEnd',this.value)"
                onkeydown="if(event.key==='Enter')saveAgency('${safeName}','extensionEnd',this.value)">
            </div>
          </div>
        </div>`;
    })();

    const itemsHtml = cnt > 0
      ? s.items.map(i=>`<div class="edu-item"><div class="edu-item-dot"></div>${i}</div>`).join('')
      : '<div style="color:var(--green2);font-size:12px;font-weight:600;">✓ All clear</div>';

    const notifyDisabled = (!hasPhone && !hasEmail) ? 'style="opacity:0.4;cursor:not-allowed"' : '';
    const notifyTitle    = (!hasPhone && !hasEmail) ? 'title="Add phone or email in Directory first"' : '';

    return `<div class="edu-card">
      <div class="edu-card-header" onclick="toggleEduCard(this)">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span class="edu-name">${s.name}</span>
          <span class="tag tag-${s.job.toLowerCase()}">${s.job}</span>
          ${bdaySoon  ? `<span style="font-size:10px;color:var(--purple2);">🎂 Birthday Soon</span>` : ''}
          ${annivSoon ? `<span style="font-size:10px;color:var(--amber2);">🏅 Anniversary Soon</span>` : ''}
        </div>
        <div class="edu-meta">
          ${s.certExpiring ? `<span class="cert-badge critical" style="margin-right:4px;">⚠ Cert</span>` : ''}
          <span class="edu-count ${cntCls}">${cnt} pending</span>
          <span style="color:var(--text3);font-size:12px;">▾</span>
        </div>
      </div>
      <div class="edu-body">
        <!-- Notify bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);">
          <span style="font-size:11px;color:var(--text2);">
            📞 ${hasPhone ? state.phones[s.name] : '<em style="color:var(--text3)">No phone</em>'}
            &nbsp;·&nbsp;
            ✉️ ${hasEmail ? state.emails[s.name] : '<em style="color:var(--text3)">No email</em>'}
          </span>
          <button class="notify-btn" onclick="openNotifyModal('${s.name}')" ${notifyDisabled} ${notifyTitle}>📬 Notify</button>
        </div>

        <!-- Agency (RN only) -->
        ${agencyHtml}

        <!-- Certifications -->
        <div class="form-label" style="margin-bottom:6px;">🏥 Certifications, License &amp; Annual Evals
          ${(state.certDisplayMode==='dueNow') ? '<span style="font-size:9px;background:rgba(239,68,68,0.15);color:var(--red2);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:1px 7px;margin-left:6px;font-weight:700;">⚠ Due Now / Expiring</span>' : ''}
        </div>
        <div class="cert-status-row">${certBadgesHtml}</div>
        <div class="cert-grid" style="margin-bottom:8px;">${certFieldsHtml}</div>

         <!-- Custom certs (5 user-defined) -->
         <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
           ${[1,2,3,4,5].map(n => {
             const labelKey = 'custom'+n+'_label';
             const dateKey  = 'custom'+n+'_date';
             const lbl  = s.certs[labelKey] || '';
             const dt   = s.certs[dateKey]  || '';
             const cls  = dt ? certClass(dt) : '';
             const inputCls = cls ? 'cert-input exp-'+cls : 'cert-input';
             const sn = s.name.replace(/'/g,"\\'");
             const needsAttnC = cls === 'critical' || cls === 'soon';
             const isBlank = !lbl && !dt;
             // In dueNow mode: skip blank slots and OK slots
             if (certMode === 'dueNow' && (isBlank || (!needsAttnC && cls !== ''))) return '';
             const borderColor = certMode === 'dueNow' && needsAttnC
               ? (cls === 'critical' ? 'rgba(239,68,68,0.6)' : 'rgba(245,158,11,0.5)')
               : 'var(--border)';
             const dueLblC = certMode === 'dueNow' && needsAttnC
               ? '<span style="font-size:8px;background:rgba(239,68,68,0.15);color:var(--red2);border-radius:4px;padding:1px 4px;margin-left:3px;">'+(cls==='critical'?'DUE':'SOON')+'</span>'
               : '';
             return '<div style="background:rgba(255,255,255,0.03);border:1px solid '+borderColor+';border-radius:6px;padding:8px;">'+
               '<div class="cert-label" style="margin-bottom:5px;">➕ Extra Cert/Class '+n+dueLblC+'</div>'+
               '<input type="text" placeholder="Name (e.g. TNCC, Telemetry)" value="'+lbl+'" '+
                 'style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:4px 7px;color:var(--white);font-size:11px;outline:none;margin-bottom:4px;box-sizing:border-box;" '+
                 'oninput="saveCert(\''+sn+'\',\''+labelKey+'\',this.value)" '+
                 'onblur="saveCert(\''+sn+'\',\''+labelKey+'\',this.value)" '+
                 'onkeydown="if(event.key===\'Enter\')saveCert(\''+sn+'\',\''+labelKey+'\',this.value)">'+
               '<input type="text" placeholder="Exp MM/DD/YYYY" value="'+dt+'" class="'+inputCls+'" '+
                 'oninput="saveCert(\''+sn+'\',\''+dateKey+'\',this.value);updateCertInputStyle(this,\''+sn+'\',\''+dateKey+'\')" '+
                 'onblur="saveCert(\''+sn+'\',\''+dateKey+'\',this.value)" '+
                 'onkeydown="if(event.key===\'Enter\')saveCert(\''+sn+'\',\''+dateKey+'\',this.value)">'+
             '</div>';
           }).join('')}
           ${certMode === 'dueNow' ? '' : ''}
         </div>

        <!-- Birthday / Anniversary -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <div class="form-label" style="margin-bottom:4px;">🎂 Birthday (MM/DD)</div>
            <input type="text" class="bday-input ${bdaySoon?'birthday-soon':''}" value="${s.bday}" placeholder="MM/DD"
              onblur="saveBday('${s.name}',this.value)"
              style="width:100%;border:1px solid var(--border);border-radius:4px;padding:4px 8px;background:var(--slate);color:var(--white);font-family:'IBM Plex Mono',monospace;font-size:11px;outline:none;">
          </div>
          <div>
            <div class="form-label" style="margin-bottom:4px;">🏅 Hire Anniversary (MM/DD/YYYY)</div>
            <input type="text" class="anniv-input ${annivSoon?'anniv-soon':''}" value="${s.anniv}" placeholder="MM/DD/YYYY"
              onblur="saveAnniv('${s.name}',this.value)"
              style="width:100%;border:1px solid var(--border);border-radius:4px;padding:4px 8px;background:var(--slate);color:var(--white);font-family:'IBM Plex Mono',monospace;font-size:11px;outline:none;">
          </div>
        </div>

        <!-- Pending items -->
        <div class="form-label" style="margin-bottom:6px;">📚 Pending Learning Items</div>
        ${itemsHtml}
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--text3);text-align:center;padding:30px;">No staff match current filter.</div>';
}

// ── Expiration Report ──
function renderExpReport() {
  const el = document.getElementById('exp-report');
  if (!el) return;

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear  = today.getFullYear();
  const nextMonth = thisMonth === 11 ? 0 : thisMonth + 1;
  const nextYear  = thisMonth === 11 ? thisYear + 1 : thisYear;

  const monthName = (m, y) => new Date(y, m, 1).toLocaleDateString('en-US', {month:'long', year:'numeric'});

  function parseDate(str) {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length < 3) return null;
    const d = new Date(`${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`);
    return isNaN(d) ? null : d;
  }

  function inMonth(dateStr, m, y) {
    const d = parseDate(dateStr);
    if (!d) return false;
    return d.getMonth() === m && d.getFullYear() === y;
  }

  // Collect all cert + agency expiration events
  const events = [];
  MASTER_STAFF.filter(s => s.job !== 'NURSE MGR').forEach(s => {
    const certs = state.certs[s.name] || {};
    CERT_FIELDS.forEach(field => {
      const val = certs[field];
      if (val) events.push({ name: s.name, job: s.job, type: field, date: val, dateObj: parseDate(val) });
    });
    // Agency contract/extension end dates (RN only)
    if (s.job === 'RN') {
      const ag = state.agencyDates[s.name] || {};
      if (ag.contractEnd)  events.push({ name: s.name, job: s.job, type: 'Contract End',   date: ag.contractEnd,  dateObj: parseDate(ag.contractEnd)  });
      if (ag.extensionEnd) events.push({ name: s.name, job: s.job, type: 'Extension End',  date: ag.extensionEnd, dateObj: parseDate(ag.extensionEnd) });
    }
  });

  function buildMonthTable(m, y) {
    const monthEvents = events.filter(e => inMonth(e.date, m, y));
    monthEvents.sort((a, b) => a.dateObj - b.dateObj);

    const roleColors = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)', UC:'var(--green2)' };
    const roleBg     = { RN:'rgba(46,125,209,0.15)', LPN:'rgba(91,33,182,0.15)', CA:'rgba(14,116,144,0.15)', UC:'rgba(26,122,74,0.15)' };
    const typeColor  = { ACLS:'var(--red2)', BLS:'var(--amber2)', NIHSS:'var(--purple2)', License:'var(--teal2)', HealthEval:'var(--green2)', FitTest:'var(--accent2)',
                         'Contract End':'var(--red2)', 'Extension End':'var(--amber2)' };

    if (monthEvents.length === 0) {
      return `<div style="color:var(--text3);font-size:12px;padding:14px;font-style:italic;">No expirations this month.</div>`;
    }

    return `<table class="dir-table" style="width:100%;">
      <thead><tr>
        <th>Name</th><th>Role</th><th>Type</th><th>Expiration Date</th><th>Days</th>
      </tr></thead>
      <tbody>
        ${monthEvents.map(e => {
          const days = e.dateObj ? Math.round((e.dateObj - today) / 86400000) : null;
          const dayStr = days === null ? '—' : days < 0 ? `<span style="color:var(--red2);font-weight:700;">Expired ${Math.abs(days)}d ago</span>`
            : days === 0 ? `<span style="color:var(--red2);font-weight:700;">Today!</span>`
            : `<span style="color:${days<=30?'var(--red2)':'var(--amber2)'};font-weight:600;">${days}d</span>`;
          return `<tr>
            <td style="font-weight:600;">${e.name}</td>
            <td><span class="tag" style="background:${roleBg[e.job]||'rgba(100,116,139,0.15)'};color:${roleColors[e.job]||'var(--text2)'};">${e.job}</span></td>
            <td><span style="font-size:11px;font-weight:700;color:${typeColor[e.type]||'var(--text2)'};">${e.type}</span></td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;">${e.date}</td>
            <td>${dayStr}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  el.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:3px;">📅 Certification Expiration Report</div>
      <div style="font-size:11px;color:var(--text2);">ACLS · BLS · NIHSS · License · Health Eval · Fit Test · Agency Contract/Extension — current & next month</div>
    </div>

    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">
        <span class="card-title" style="color:var(--amber2);">📆 ${monthName(thisMonth, thisYear)}</span>
        <span style="font-size:11px;color:var(--text3);">Current Month</span>
      </div>
      ${buildMonthTable(thisMonth, thisYear)}
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title" style="color:var(--accent2);">📆 ${monthName(nextMonth, nextYear)}</span>
        <span style="font-size:11px;color:var(--text3);">Next Month</span>
      </div>
      ${buildMonthTable(nextMonth, nextYear)}
    </div>
  `;
}

function saveAgency(name, field, val) {
  if (!state.agencyDates[name]) state.agencyDates[name] = {};
  // Don't save if value hasn't changed (avoids constant saves while typing)
  if (state.agencyDates[name][field] === val) return;
  state.agencyDates[name][field] = val;
  persistSave();
  // Debounce the banner to avoid flicker while typing
  clearTimeout(saveAgency._timer);
  saveAgency._timer = setTimeout(() => {
    showSaveBanner(`💾 Agency ${field.replace(/([A-Z])/g,' $1').toLowerCase()} saved`);
  }, 600);
}

function saveAgencyBlock(name, field, val) {
  if (!state.agencyDates[name]) state.agencyDates[name] = {};
  if (!state.agencyDates[name].blockSchedule) state.agencyDates[name].blockSchedule = { enabled:false, on:7, off:7, startDate:'' };
  if (state.agencyDates[name].blockSchedule[field] === val) return;
  state.agencyDates[name].blockSchedule[field] = val;
  persistSave();
  renderDirectory();
  renderEducation();
  clearTimeout(saveAgencyBlock._timer);
  saveAgencyBlock._timer = setTimeout(() => {
    showSaveBanner(`💾 Block scheduling ${field} saved for ${name.split(',')[0]}`);
  }, 600);
}

function updateAgencyInputStyle(el, name, field) {
  const val = el.value;
  el.className = 'cert-input';
  if (val) {
    const cls = certClass(val);
    if (cls !== 'missing') el.classList.add('exp-' + cls);
  }
}

function toggleEduCard(header) {
  const body = header.nextElementSibling;
  body.classList.toggle('open');
  const chevron = header.querySelector('.edu-meta span:last-child');
  if (chevron) chevron.textContent = body.classList.contains('open') ? '▴' : '▾';
}
function expandAllEdu() {
  document.querySelectorAll('.edu-body').forEach(b=>b.classList.add('open'));
  document.querySelectorAll('.edu-card-header .edu-meta span:last-child').forEach(s=>s.textContent='▴');
}
function saveBday(name, val) { state.birthdays[name] = val; persistSave(); }
function saveAnniv(name, val) { state.anniversaries[name] = val; persistSave(); }
function saveHireDate(name, val) { if (!state.hireDates) state.hireDates = {}; state.hireDates[name] = val; persistSave(); }

// ── Staff Profile (New Team Member Profile) ────────────────────
// ════════════════════════════════════════════════════════════════
//  EMPLOYEE HUB — one-click 360° view pulling this person's data
//  from every tab (contact info, OT, absences, incidents, coaching,
//  competency, recognition, notes, etc). Opened by clicking a staff
//  member's name anywhere it's wired up (Directory, OT tabs, ...).
// ════════════════════════════════════════════════════════════════
function ehEsc(s) { return String(s == null ? '' : s).replace(/'/g, "\\'"); }
function ehHtmlEsc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Wraps a staff name in a clickable Employee Hub link only if it's an exact
// match to a known staff member — used for free-text fields (incident "Staff:"
// field, comment mentions) where the text may not be a clean name.
function ehStaffLink(nameStr) {
  const raw = String(nameStr || '').trim();
  if (!raw) return '';
  const hit = MASTER_STAFF.find(s => s.name === raw);
  if (!hit) return ehHtmlEsc(raw);
  return `<span onclick="openEmployeeHub('${ehEsc(raw)}')" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px;">${ehHtmlEsc(raw)}</span>`;
}

function ehSection(title, bodyHtml, emptyLabel) {
  const body = bodyHtml && bodyHtml.trim() ? bodyHtml : `<div style="color:var(--text3);font-size:11px;font-style:italic;">${emptyLabel || 'Nothing on file.'}</div>`;
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;margin-bottom:10px;">
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">${title}</div>
    ${body}
  </div>`;
}

function ehRow(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:12px;">
    <span style="color:var(--text3);">${label}</span><span style="color:var(--white);font-weight:600;text-align:right;">${value}</span>
  </div>`;
}

function ehList(items) {
  return items.map(i => `<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;color:var(--text2);">${i}</div>`).join('');
}

async function openEmployeeHub(name) {
  const existing = document.getElementById('emp-hub-overlay');
  if (existing) existing.remove();

  const staffRec = MASTER_STAFF.find(s => s.name === name) || {};
  const job = staffRec.job || '';
  const safe = ehEsc(name);

  const overlay = document.createElement('div');
  overlay.id = 'emp-hub-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:6000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:30px 16px;';
  overlay.innerHTML = `<div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:22px;width:820px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:18px;font-weight:700;color:var(--white);">${ehHtmlEsc(name)}</div>
        ${job ? `<span class="tag tag-${job.toLowerCase()}">${job}</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost btn-sm" onclick="openEmpProfile('${safe}')" title="Getting-to-know-you profile">👤 Personal</button>
        <button onclick="this.closest('#emp-hub-overlay').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:20px;line-height:1;">×</button>
      </div>
    </div>
    <div id="emp-hub-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="grid-column:1/-1;color:var(--text3);font-size:12px;">Loading…</div>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  // ── Gather everything synchronous from local state ──────────────
  const phone     = state.phones?.[name] || '';
  const email     = state.emails?.[name] || '';
  const birthday  = state.birthdays?.[name] || '';
  const anniv     = state.anniversaries?.[name] || '';
  const hireDate  = state.hireDates?.[name] || '';
  const fte       = state.empFTE?.[name] || '';
  const shiftPref = state.empShifts?.[name] || '';
  const weekend   = state.empWeekend?.[name] || '';
  const is48      = !!state.emp48hr?.[name];
  const isPrecept = !!state.empPreceptor?.[name];
  const isAgency  = !!state.agencyDates?.[name]?.isAgency;
  const agencyRec = state.agencyDates?.[name] || {};
  const caHours   = state.empCAHours?.[name] || '';
  const certs     = state.certs?.[name] || {};

  const contactHtml =
    ehRow('Role', job) +
    ehRow('Phone', phone) +
    ehRow('Email', email) +
    ehRow('Hire Date', hireDate) +
    ehRow('Birthday', birthday) +
    ehRow('Anniversary', anniv) +
    ehRow('FTE', fte) +
    ehRow('Shift Pref', shiftPref) +
    ehRow('Weekend Rotation', weekend) +
    ehRow('48-hr Approved', is48 ? 'Yes' : '') +
    ehRow('Certified Preceptor', isPrecept ? 'Yes' : '') +
    (job === 'CA' ? ehRow('CA Hours', caHours) : '') +
    (isAgency ? ehRow('Agency', 'Yes' + (agencyRec.contractNum ? ' (#'+agencyRec.contractNum+')' : '')) : '');

  const certLines = Object.entries(certs).filter(([,v]) => v).map(([k,v]) => ehRow(k, v)).join('');

  // Pay-period OT log
  const otEntries = (state.otLog?.[name] || []).slice().sort((a,b)=> (b.payPeriod||'').localeCompare(a.payPeriod||''));
  const totalOtLog = otEntries.reduce((s,e)=> s + (parseFloat(e.otHrs)||0), 0);
  const otHtml = otEntries.length
    ? `<div style="margin-bottom:6px;font-size:11px;color:var(--text3);">Total logged: <strong style="color:var(--white);">${totalOtLog.toFixed(1)}h</strong> across ${otEntries.length} pay period(s)</div>` +
      ehList(otEntries.slice(0,6).map(e => `${e.payPeriod || '—'} · <strong style="color:${e.otHrs>=8?'var(--red2)':'var(--amber2)'};">${(e.otHrs||0).toFixed(1)}h OT</strong>${e.premiumType?' · '+e.premiumType:''}${e.approved?' · ✓ approved':''}${e.notes?' — '+ehHtmlEsc(e.notes):''}`))
    : '';

  // Absences
  const absEntries = (state.absenceLog?.[name] || []).slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const totalAbsHrs = absEntries.reduce((s,e)=> s + (parseFloat(e.hours)||0), 0);
  const absHtml = absEntries.length
    ? `<div style="margin-bottom:6px;font-size:11px;color:var(--text3);">Total: <strong style="color:var(--white);">${totalAbsHrs.toFixed(1)}h</strong> across ${absEntries.length} occurrence(s)</div>` +
      ehList(absEntries.slice(0,6).map(e => `${e.date||'—'} · ${e.type||'—'} · ${(e.hours||0)}h${e.writeUp?' · <span style="color:var(--red2);">Write-up</span>':''}${e.note?' — '+ehHtmlEsc(e.note):''}`))
    : '';

  // Variance log
  const varEntries = (state.varianceLog?.[name] || []).slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const varHtml = varEntries.length
    ? ehList(varEntries.slice(0,6).map(e => `${e.date||'—'} ${e.time||''} · ${e.type||'—'}${e.correction?' · '+ehHtmlEsc(e.correction):''}${e.notes?' — '+ehHtmlEsc(e.notes):''}`))
    : '';

  // Float / Sitter totals (from float summary sheet, if loaded this session)
  const floatSummaryEntry = (window._floatSummary || {})[name];
  const totalFloats  = floatSummaryEntry ? (floatSummaryEntry.floatCount   || 0) : null;
  const totalSitters = floatSummaryEntry ? (floatSummaryEntry.sitterCount  || 0) : null;
  const floatSitterHtml = floatSummaryEntry
    ? ehRow('Total Floats', totalFloats) + ehRow('Total Sits', totalSitters)
    : '';

  // Staff incidents (falls / HAPIs / missed tx)
  const si = state.staffIncidents?.[name] || {};
  const siCounts = ['falls','hapis','missedTx'].map(k => `${k}: <strong style="color:var(--white);">${(si[k]||[]).length}</strong>`).join(' &nbsp;·&nbsp; ');
  const siRecent = [].concat(
    (si.falls||[]).map(e=>({...e,cat:'Fall'})),
    (si.hapis||[]).map(e=>({...e,cat:'HAPI'})),
    (si.missedTx||[]).map(e=>({...e,cat:'Missed Tx'}))
  ).sort((a,b)=> (b.date||'').localeCompare(a.date||'')).slice(0,6);
  const siHtml = (siRecent.length ? `<div style="margin-bottom:6px;font-size:11px;color:var(--text3);">${siCounts}</div>` + ehList(siRecent.map(e => `${e.date||'—'} · ${e.cat}${e.note?' — '+ehHtmlEsc(e.note):''}`)) : '');

  // Formal incident reports mentioning this staff member
  const incMentions = (state.incidentReports||[]).filter(r => (r.staff||'').includes(name)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
  const incHtml = incMentions.length ? ehList(incMentions.map(r => `${r.date||'—'} · ${r.type||'—'} · ${r.severity||''}${r.status?' · '+r.status:''}`)) : '';

  // Recognition
  const recogEntries = (state.recognition||[]).filter(r => r.name === name).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
  const recogHtml = recogEntries.length ? ehList(recogEntries.map(r => `${r.date||'—'} · ${r.type||'Recognition'}${r.description?' — '+ehHtmlEsc(r.description):''}`)) : '';

  // Coaching
  const coachEntries = (state.coaching?.[name] || []).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const coachHtml = coachEntries.length ? ehList(coachEntries.slice(0,6).map(c => `${c.date||'—'} · ${c.area||'—'}${c.status?' · '+c.status:''}${c.notes?' — '+ehHtmlEsc(c.notes):''}`)) : '';

  // Competency
  const compRec = state.competency?.[name] || {};
  const compKeys = Object.keys(compRec);
  const compPassed = compKeys.filter(k => compRec[k]?.passed).length;
  const compHtml = compKeys.length ? `<div style="font-size:12px;color:var(--white);"><strong>${compPassed}</strong> / ${compKeys.length} skills validated</div>` : '';

  // Orientation / onboarding / offboarding
  const ori = state.orientation?.[name];
  const onb = state.onboarding?.[name];
  const offb = state.offboarding?.[name];
  const statusHtml =
    (ori ? ehRow('Orientation Preceptor', ori.preceptor) + ehRow('Ori Start', ori.startDate) + ehRow('Ori Target Off', ori.targetDate) : '') +
    (onb ? ehRow('Onboarding Start', onb.startDate) + ehRow('Onboarding Buddy', onb.buddy) : '') +
    (offb ? ehRow('Last Day', offb.lastDay) + ehRow('Offboard Reason', offb.reason) : '');

  // Nine-box + year review
  const nb = state.nineBox?.[name];
  const nbHtml = nb ? ehRow('9-Box', `Performance ${nb.perf||'—'} / Potential ${nb.potential||'—'}`) : '';
  const yrEntries = state.yearReview?.[name] || {};
  const yrYears = Object.keys(yrEntries).sort().reverse();
  const yrHtml = yrYears.length ? ehList(yrYears.slice(0,3).map(y => `${y}${yrEntries[y].strengths?' · Strengths: '+ehHtmlEsc(yrEntries[y].strengths):''}${yrEntries[y].opportunities?' · Opportunities: '+ehHtmlEsc(yrEntries[y].opportunities):''}`)) : '';

  // Manager notes
  const noteEntries = (state.empNotes?.[name] || []).slice().sort((a,b)=>(b.ts||0)-(a.ts||0));
  const notesHtml = noteEntries.length ? ehList(noteEntries.slice(0,6).map(n => `${n.ts ? new Date(n.ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'} — ${ehHtmlEsc(n.text)}`)) : '';

  const body = document.getElementById('emp-hub-body');
  if (body) {
    body.innerHTML =
      ehSection('📇 Contact &amp; Employment', contactHtml) +
      ehSection('🎓 Certifications', certLines) +
      ehSection('⏱ Overtime (Pay-Period Log)', otHtml, 'No OT logged.') +
      ehSection('🗓 Absences', absHtml, 'No absences on file.') +
      ehSection('⚠️ Variance Log', varHtml, 'No variance entries.') +
      ehSection('🚌 Float / Sitter', floatSitterHtml, 'No float/sitter data loaded.') +
      ehSection('📌 Falls / HAPI / Missed Tx', siHtml, 'No flagged incidents.') +
      ehSection('📁 Formal Incident Reports', incHtml, 'No incident reports.') +
      ehSection('🌟 Recognition', recogHtml, 'No recognition entries.') +
      ehSection('🗣 Coaching', coachHtml, 'No coaching notes.') +
      ehSection('✅ Competency', compHtml, 'No competency records.') +
      ehSection('📋 Orientation / Onboarding / Offboarding', statusHtml, 'Nothing on file.') +
      ehSection('🎯 9-Box &amp; Year Review', nbHtml + yrHtml, 'No 9-box or review on file.') +
      `<div style="grid-column:1/-1;">${ehSection('📝 Manager Notes', notesHtml, 'No notes on file.')}</div>` +
      `<div id="emp-hub-ytd-ot" style="grid-column:1/-1;">${ehSection('📆 YTD Overtime (WFDA Export)', '<div style="color:var(--text3);font-size:11px;">Loading…</div>')}</div>` +
      `<div id="emp-hub-audit" style="grid-column:1/-1;">${ehSection('🩺 Chart / Unit Audit Findings', '<div style="color:var(--text3);font-size:11px;">Loading…</div>')}</div>` +
      `<div id="emp-hub-ack" style="grid-column:1/-1;">${ehSection('✍️ Audit Acknowledgments', '<div style="color:var(--text3);font-size:11px;">Loading…</div>')}</div>`;
  }

  // ── Async: YTD OT from Supabase (employee_overtime_ytd), joined by name ──
  try {
    const cfgObj = (typeof getSBConfig === 'function') ? getSBConfig() : null;
    const ytdEl = document.getElementById('emp-hub-ytd-ot');
    if (cfgObj && cfgObj.enabled && cfgObj.url && cfgObj.key && ytdEl) {
      const r = await fetch(`${cfgObj.url}/rest/v1/employee_overtime_ytd?select=*&employee_name_raw=eq.${encodeURIComponent(name)}&order=report_end.desc&limit=1`, {
        headers: { apikey: cfgObj.key, Authorization: `Bearer ${cfgObj.key}` }
      });
      if (r.ok) {
        const rows = await r.json();
        const row = rows[0];
        const html = row
          ? ehRow('Period', `${row.report_start} → ${row.report_end}`) +
            ehRow('OT Hours', `${(row.overtime_hours||0).toFixed(1)}h (${((row.ot_pct_of_paid||0)*100).toFixed(1)}% of paid)`) +
            ehRow('Scheduled OT', row.scheduled_overtime_hours != null ? `${row.scheduled_overtime_hours.toFixed(1)}h` : '—')
          : '';
        ytdEl.innerHTML = ehSection('📆 YTD Overtime (WFDA Export)', html, 'No YTD OT export data for this name.');
      } else {
        ytdEl.innerHTML = ehSection('📆 YTD Overtime (WFDA Export)', '', 'Supabase load failed.');
      }
    }
  } catch(e) { /* silent — local-state sections already rendered */ }

  // ── Async: Chart/Unit Audit findings (audit_findings table, synced from
  //    the standalone Audit tracker), matched by staff name in the tagged array ──
  try {
    const cfgObj2 = (typeof getSBConfig === 'function') ? getSBConfig() : null;
    const auditEl = document.getElementById('emp-hub-audit');
    if (cfgObj2 && cfgObj2.enabled && cfgObj2.url && cfgObj2.key && auditEl) {
      const r2 = await fetch(`${cfgObj2.url}/rest/v1/audit_findings?select=*&staff_names=cs.${encodeURIComponent(JSON.stringify([name]))}&order=finding_date.desc&limit=8`, {
        headers: { apikey: cfgObj2.key, Authorization: `Bearer ${cfgObj2.key}` }
      });
      if (r2.ok) {
        const rows2 = await r2.json();
        const AUDIT_LABELS = { chart:'Chart Audit', sitter:'Sitter Audit', behavioral:'Behavioral Health Audit', pain:'Pain Reassessment Audit' };
        const html2 = rows2.length
          ? `<div style="margin-bottom:6px;font-size:11px;color:var(--text3);">${rows2.length} finding(s) tagged to this person &middot; patient details stay in the Audit tracker, not shown here</div>` +
            ehList(rows2.map(f => `${f.finding_date||'—'} · ${AUDIT_LABELS[f.audit_type]||f.audit_type||'—'}${f.unit?' · '+f.unit:''}${f.status?' · '+f.status:''}${(f.tags&&f.tags.length)?' · '+f.tags.join(', '):''}`))
          : '';
        auditEl.innerHTML = ehSection('🩺 Chart / Unit Audit Findings', html2, 'No audit findings tagged to this name.');
      } else {
        auditEl.innerHTML = ehSection('🩺 Chart / Unit Audit Findings', '', 'Supabase load failed.');
      }
    }
  } catch(e) { /* silent — local-state sections already rendered */ }

  // ── Async: Audit acknowledgment requests/responses for this staff member ──
  try {
    const cfgObj3 = (typeof getSBConfig === 'function') ? getSBConfig() : null;
    const ackEl = document.getElementById('emp-hub-ack');
    if (cfgObj3 && cfgObj3.enabled && cfgObj3.url && cfgObj3.key && ackEl) {
      const r3 = await fetch(`${cfgObj3.url}/rest/v1/audit_acknowledgments?select=*,audit_findings(audit_type,finding_date,unit)&staff_name=eq.${encodeURIComponent(name)}&order=requested_at.desc&limit=8`, {
        headers: { apikey: cfgObj3.key, Authorization: `Bearer ${cfgObj3.key}` }
      });
      if (r3.ok) {
        const rows3 = await r3.json();
        const AUDIT_LABELS2 = { chart:'Chart Audit', sitter:'Sitter Audit', behavioral:'Behavioral Health Audit', pain:'Pain Reassessment Audit' };
        const html3 = rows3.length
          ? ehList(rows3.map(a => {
              const f = a.audit_findings || {};
              const label = `${f.finding_date||'—'} · ${AUDIT_LABELS2[f.audit_type]||f.audit_type||'—'}${f.unit?' · '+f.unit:''}`;
              if (a.status === 'acknowledged') {
                return `${label} — <span style="color:var(--green2);">✓ Signed ${a.signed_name?'by '+ehHtmlEsc(a.signed_name):''} ${a.signed_at?new Date(a.signed_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):''}</span>${a.comment?'<br><span style="color:var(--text3);">Comment: '+ehHtmlEsc(a.comment)+'</span>':''}`;
              }
              const daysOut = Math.floor((Date.now() - new Date(a.requested_at).getTime())/86400000);
              return `${label} — <span style="color:${daysOut>=5?'var(--red2)':'var(--amber2)'};">⏳ Pending (${daysOut}d)</span>`;
            }))
          : '';
        ackEl.innerHTML = ehSection('✍️ Audit Acknowledgments', html3, 'No acknowledgment requests on file.');
      } else {
        ackEl.innerHTML = ehSection('✍️ Audit Acknowledgments', '', 'Supabase load failed.');
      }
    }
  } catch(e) { /* silent — local-state sections already rendered */ }
}

function openEmpProfile(name) {
  if (!state.empProfile) state.empProfile = {};
  const p = state.empProfile[name] || {};
  const existing = document.getElementById('emp-profile-overlay');
  if (existing) existing.remove();
  const safeN = name.replace(/'/g, "\\'");
  const fields = [
    ['ep-food',    'Favorite Food / Candy / Snack',                p.food         || ''],
    ['ep-movie',   'Favorite Movie / Show',                        p.movie        || ''],
    ['ep-hobbies', 'Favorite Hobbies',                             p.hobbies      || ''],
    ['ep-proud',   'Something They Are Proud Of',                  p.proudOf      || ''],
    ['ep-grew',    'What They Wanted to Be When They Grew Up',     p.grewUp       || ''],
    ['ep-desert',  '3 Items They Would Take to a Deserted Island', p.desertIsland || ''],
    ['ep-perfect', 'Their Idea of a Perfect Day',                  p.perfectDay   || ''],
  ];
  const statusHtml = p.signedDate
    ? '<div style="color:var(--green2);padding:8px 12px;margin-bottom:12px;font-size:11px;border-radius:6px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);">✓ Profile completed — ' + p.signedDate + (p.oriSheetSigned ? ' &nbsp;|&nbsp; 📋 Ori Sheet signed ' + p.oriSheetDate : '') + '</div>'
    : '<div style="color:var(--amber2);padding:8px 12px;margin-bottom:12px;font-size:11px;border-radius:6px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);">'
      + (p.oriSheetSigned ? '✓ Ori Sheet signed ' + p.oriSheetDate + ' — ' : '')
      + 'Profile not yet completed — use Staff Form to send a fillable link</div>';
  const fieldsHtml = fields.map(function(f) {
    return '<div><div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">' + f[1] + '</div>'
      + '<input id="' + f[0] + '" value="' + f[2].replace(/"/g,'&quot;') + '" placeholder="---" '
      + 'style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:5px;padding:6px 10px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>';
  }).join('');
  const overlay = document.createElement('div');
  overlay.id = 'emp-profile-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:24px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
    + '<div><div style="font-size:14px;font-weight:700;color:var(--white);">New Team Member Profile</div>'
    + '<div style="font-size:11px;color:var(--text3);">' + name + '</div></div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="openProfileForm(\'' + safeN + '\');this.closest(\'#emp-profile-overlay\').remove();" style="font-size:10px;padding:4px 10px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:5px;color:var(--purple2);cursor:pointer;">Staff Form</button>'
    + '<button onclick="this.closest(\'#emp-profile-overlay\').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;">X</button>'
    + '</div></div>'
    + statusHtml
    + '<div style="display:grid;gap:10px;">' + fieldsHtml + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">'
    + '<button onclick="this.closest(\'#emp-profile-overlay\').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>'
    + '<button onclick="saveEmpProfile(\'' + safeN + '\');this.closest(\'#emp-profile-overlay\').remove();" class="btn btn-primary" style="font-size:12px;padding:6px 18px;">Save Profile</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
}

function saveEmpProfile(name, data) {
  if (!state.empProfile) state.empProfile = {};
  if (data) {
    // Called from URL import (staff-filled form)
    state.empProfile[name] = { ...data, signedDate: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) };
  } else {
    // Called from in-app editor
    state.empProfile[name] = {
      food:         document.getElementById('ep-food')?.value   || '',
      movie:        document.getElementById('ep-movie')?.value  || '',
      hobbies:      document.getElementById('ep-hobbies')?.value|| '',
      proudOf:      document.getElementById('ep-proud')?.value  || '',
      perfectDay:   document.getElementById('ep-perfect')?.value|| '',
      grewUp:       document.getElementById('ep-grew')?.value   || '',
      desertIsland: document.getElementById('ep-desert')?.value || '',
      signedDate: (state.empProfile[name]?.signedDate) || '',
    };
  }
  persistSave();
  showSaveBanner('👤 Profile saved');
  renderDirectory();
}

function openProfileForm(name) {
  const ccUrl = window.location.href.split('?')[0];
  const safeNameJson = JSON.stringify(name);
  const scriptOpen  = '<scr' + 'ipt>';
  const scriptClose = '<\/sc' + 'ript>';

  const formHtml = [
    '<!DOCTYPE html><html><head>',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>New Team Member Profile \u2014 ' + name + '<\/title>',
    '<style>',
    '* { box-sizing: border-box; }',
    'body { font-family: Segoe UI, Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }',
    '.card { background: white; border-radius: 12px; padding: 28px; max-width: 580px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }',
    '.header { border-bottom: 3px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 22px; }',
    'h1 { font-size: 22px; color: #1e3a5f; margin: 0 0 4px; }',
    '.sub { font-size: 12px; color: #666; }',
    '.emp-name { font-size: 16px; font-weight: 700; color: #1e3a5f; background: #e8f0fe; border-radius: 6px; padding: 8px 14px; margin-bottom: 20px; }',
    'label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-bottom: 4px; margin-top: 14px; }',
    'input, textarea { width: 100%; padding: 10px 12px; border: 1.5px solid #ddd; border-radius: 7px; font-size: 14px; font-family: inherit; outline: none; }',
    'input:focus, textarea:focus { border-color: #1e3a5f; }',
    'textarea { resize: vertical; min-height: 60px; }',
    'button[type=submit] { width: 100%; margin-top: 24px; padding: 13px; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }',
    '.success { display:none; text-align:center; padding: 30px 20px; }',
    '.import-link { display:inline-block; margin-top:14px; padding:10px 20px; background:#1e3a5f; color:white; border-radius:7px; text-decoration:none; font-weight:700; font-size:13px; }',
    '.copy-btn { display:inline-block; margin-top:8px; padding:8px 16px; background:#eee; color:#333; border:none; border-radius:6px; font-size:12px; cursor:pointer; }',
    '<\/style><\/head><body>',
    '<div class="card" id="form-card">',
    '<div class="header"><h1>New Team Member Profile<\/h1><div class="sub">3B\/3C Stroke Telemetry \u00b7 Arnot Ogden Medical Center<\/div><\/div>',
    '<div class="emp-name">\ud83d\udc64 ' + name + '<\/div>',
    '<p style="font-size:13px;color:#555;margin-top:0;">Welcome to the team! Please fill out this short profile so we can get to know you better.<\/p>',
    '<form id="profile-form">',
    '<label>Favorite Food \/ Candy \/ Snack<\/label><input name="food" placeholder="e.g. Sour Patch Kids, coffee..." autocomplete="off">',
    '<label>Favorite Movie or Show<\/label><input name="movie" placeholder="e.g. The Office, Top Gun..." autocomplete="off">',
    '<label>Favorite Hobbies<\/label><textarea name="hobbies" placeholder="e.g. Hiking, reading, cooking..."><\/textarea>',
    '<label>Something You Are Proud Of<\/label><textarea name="proudOf" placeholder="Personal or professional \u2014 anything goes!"><\/textarea>',
    '<label>What Did You Want to Be When You Grew Up?<\/label><input name="grewUp" placeholder="e.g. Astronaut, veterinarian..." autocomplete="off">',
    '<label>3 Items You Would Take to a Deserted Island<\/label><textarea name="desertIsland" placeholder="1. ___ 2. ___ 3. ___"><\/textarea>',
    '<label>Your Idea of a Perfect Day<\/label><textarea name="perfectDay" placeholder="Describe your perfect day..."><\/textarea>',
    '<button type="submit">\u2705 Submit My Profile<\/button>',
    '<\/form><\/div>',
    '<div class="success" id="success-card">',
    '<div class="card">',
    '<div style="font-size:48px;margin-bottom:10px;">\ud83c\udf89<\/div>',
    '<h2>Profile Submitted!<\/h2>',
    '<p style="color:#555;font-size:14px;">Thank you! Send the link below to your manager.<\/p>',
    '<a id="import-link" class="import-link" href="#">\ud83d\udccb Open in Command Center<\/a><br>',
    '<button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById(\'import-link\').href);this.textContent=\'\u2713 Copied!\'">Copy Link<\/button>',
    '<\/div><\/div>',
    scriptOpen,
    'document.getElementById(\'profile-form\').onsubmit = function(e) {',
    '  e.preventDefault();',
    '  var fd = new FormData(this);',
    '  var data = {};',
    '  fd.forEach(function(v,k){ data[k]=v; });',
    '  var payload = JSON.stringify({ name: ' + safeNameJson + ', profile: data });',
    '  var encoded = btoa(unescape(encodeURIComponent(payload)));',
    '  document.getElementById(\'import-link\').href = \'' + ccUrl + '?importProfile=\' + encoded;',
    '  document.getElementById(\'form-card\').style.display = \'none\';',
    '  document.getElementById(\'success-card\').style.display = \'block\';',
    '};',
    scriptClose,
    '<\/body><\/html>'
  ].join('\n');

  const w = window.open('', '_blank');
  w.document.write(formHtml);
  w.document.close();
}

// On page load — check URL for importProfile param
(function checkProfileImport() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('importProfile');
  if (!raw) return;
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!decoded.name || !decoded.profile) return;
    // Wait for state to load then import
    const doImport = () => {
      if (!state.empProfile) state.empProfile = {};
      saveEmpProfile(decoded.name, decoded.profile);
      showSaveBanner(`👤 Profile imported for ${decoded.name}`);
      showToast(`Profile for ${decoded.name} saved to directory`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    };
    // Delay to let state load first
    setTimeout(doImport, 1500);
  } catch(e) { console.warn('Profile import error:', e); }
})();

// ══════════════════════════════════════════
// STAFF-FACING VARIANCE STATEMENT/SIGNATURE VIEW
// Triggered when a staff member opens a ?vf=<ts> link generated by
// "Send to Staff for Statement/Signature". Fetches only the small snapshot
// staged for that ts (never the full app state, which can be large and slow
// on a weak signal) and shows a full-screen form on top of this same live
// app — no separate hosted page, so it always renders correctly.
// On submit, the response is staged in Supabase (key: varresp_<ts>) for the
// manager to pull in later via "Check for Staff Responses" in the Variance tab.
// ══════════════════════════════════════════
(function checkStaffVarianceLink() {
  if (!new URLSearchParams(window.location.search).get('vf')) return;
  // Deferred: getSBConfig()/SB_DEFAULT_CONFIG are declared further down in
  // this same script, so calling them synchronously at this point in the
  // top-to-bottom run would hit them before they're initialized. Running
  // after this tick guarantees the whole script has finished first.
  setTimeout(runCheckStaffVarianceLink, 0);
})();
function runCheckStaffVarianceLink() {
  const params = new URLSearchParams(window.location.search);
  const vfParam = params.get('vf');
  if (!vfParam) return;
  const ts = Number(vfParam);
  if (!ts) { showStaffVarianceError('This link looks incomplete — ask your manager to resend it.'); return; }

  const cfg = getSBConfig();
  fetch(`${cfg.url}/rest/v1/tracker_state?key=eq.varform_${ts}&select=value`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
  })
  .then(async r => {
    if (!r.ok) { const t = await r.text().catch(()=> ''); throw new Error('HTTP ' + r.status + (t ? ' — ' + t.slice(0,200) : '')); }
    return r.json();
  })
  .then(rows => {
    if (!rows || !rows.length || !rows[0].value) { showStaffVarianceError('Could not load this report (no data found for this link). Ask your manager to resend it.'); return; }
    let entry;
    try { entry = JSON.parse(rows[0].value); }
    catch(e) { showStaffVarianceError('This report link is damaged (bad data). Ask your manager to resend it.'); return; }
    try { renderStaffVarianceOverlay(entry.name, ts, entry); }
    catch(e) { showStaffVarianceError('This report could not be displayed (' + (e.message || 'unknown error') + '). Ask your manager to resend it.'); }
  })
  .catch(e => showStaffVarianceError('Could not connect (' + (e.message || 'unknown error') + '). Check your signal and reopen the link.'));
}

function showStaffVarianceError(msg) {
  document.documentElement.style.visibility = 'visible';
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f0f4f8;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Segoe UI,Arial,sans-serif;';
  div.innerHTML = `<div style="background:#fff;border-radius:12px;padding:24px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
    <div style="font-size:14px;color:#333;">${msg}</div>
  </div>`;
  document.body.appendChild(div);
}

function renderStaffVarianceOverlay(name, ts, entry) {
  document.documentElement.style.visibility = 'visible';
  const initItems = [];
  Object.entries(VAR_CP_LABELS).forEach(([k,label]) => { if (entry.cpChecks && entry.cpChecks[k]) initItems.push({key:'cp_'+k, label}); });
  Object.entries(VAR_PAIN_LABELS).forEach(([k,label]) => { if (entry.painChecks && entry.painChecks[k]) initItems.push({key:'pr_'+k, label}); });
  Object.entries(VAR_TX_LABELS).forEach(([k,label]) => { if (entry.txChecks && entry.txChecks[k]) initItems.push({key:'tx_'+k, label}); });

  const displayDate = entry.date ? new Date(entry.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '—';
  const typesHtml = (entry.types && entry.types.length) ? entry.types.map(t => `<span style="display:inline-block;border:1px solid #1e3a5f;color:#1e3a5f;border-radius:4px;padding:1px 8px;font-size:11px;margin:2px 4px 2px 0;">${t}</span>`).join('') : '<span style="color:#999;">Not specified</span>';

  const overlay = document.createElement('div');
  overlay.id = 'staff-variance-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f0f4f8;overflow:auto;padding:16px;font-family:Segoe UI,Arial,sans-serif;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:22px;max-width:600px;margin:0 auto;box-shadow:0 4px 20px rgba(0,0,0,0.08);" id="svo-form-card">
      <div style="border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:18px;">
        <h1 style="font-size:19px;color:#1e3a5f;margin:0 0 4px;">Performance Variance Report</h1>
        <div style="font-size:12px;color:#666;">3B/3C Tele Med Surg · Arnot Ogden Medical Center</div>
      </div>
      <div style="background:#f4f7fb;border:1px solid #dbe4f0;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#333;margin-bottom:18px;">
        <div style="margin-bottom:4px;"><strong>Staff Member:</strong> ${name}</div>
        <div style="margin-bottom:4px;"><strong>Date:</strong> ${displayDate}${entry.time ? ' · ' + entry.time : ''}</div>
        <div style="margin-bottom:4px;"><strong>Variance Type:</strong> ${typesHtml}</div>
        ${entry.correction ? `<div style="margin-top:6px;"><strong>Plan for Correction:</strong> ${entry.correction.replace(/\n/g,'<br>')}</div>` : ''}
      </div>
      <p style="font-size:13px;color:#555;margin-top:0;">Please review the above, add your statement, initial each item below, and sign.</p>
      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#555;margin-bottom:6px;margin-top:18px;">Your Statement / Explanation</label>
      <textarea id="svo-stmt" placeholder="Enter your statement or explanation..." style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:14px;font-family:inherit;min-height:80px;resize:vertical;box-sizing:border-box;"></textarea>
      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#555;margin-bottom:6px;margin-top:18px;">Initial Each Item</label>
      <div id="svo-init-list">
        ${initItems.length ? initItems.map(it => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #eee;">
            <span style="font-size:12.5px;color:#333;flex:1;">${it.label}</span>
            <input class="svo-init-box" maxlength="4" data-key="${it.key}" placeholder="Initials" style="width:60px;text-align:center;padding:6px 4px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;font-weight:700;text-transform:uppercase;">
          </div>`).join('') : '<div style="font-size:12px;color:#888;">No itemized requirements flagged on this report.</div>'}
      </div>
      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#555;margin-bottom:6px;margin-top:18px;">Signature</label>
      <div style="border:1.5px solid #ddd;border-radius:8px;background:#fff;touch-action:none;"><canvas id="svo-sig" style="width:100%;height:150px;display:block;border-radius:8px;"></canvas></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
        <span style="font-size:11px;color:#888;">Sign with your finger or mouse</span>
        <button type="button" id="svo-clear-sig" style="background:none;border:none;color:#1e3a5f;font-size:12px;font-weight:700;cursor:pointer;">Clear</button>
      </div>
      <div id="svo-err" style="color:#c0392b;font-size:12px;margin-top:8px;display:none;">Please complete your statement, all initials, and your signature.</div>
      <button type="button" id="svo-submit" style="width:100%;margin-top:22px;padding:14px;background:#1e3a5f;color:white;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;">✅ Submit Statement &amp; Signature</button>
    </div>
    <div style="display:none;text-align:center;padding:30px 20px;" id="svo-success-card">
      <div style="background:#fff;border-radius:12px;padding:22px;max-width:600px;margin:0 auto;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="font-size:44px;margin-bottom:10px;">✅</div>
        <h2 style="margin:0 0 8px;color:#1e3a5f;">Submitted!</h2>
        <p style="color:#555;font-size:13px;" id="svo-signed-msg"></p>
        <p style="color:#888;font-size:12px;">You can close this page now.</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Signature pad
  const canvas = document.getElementById('svo-sig');
  const ctx = canvas.getContext('2d');
  function resizeSig(){ const r = canvas.getBoundingClientRect(); canvas.width = r.width; canvas.height = r.height; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e3a5f'; }
  resizeSig();
  window.addEventListener('resize', resizeSig);
  let drawing = false, hasInk = false, last = null;
  function sigPos(e){ const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  function sigStart(e){ e.preventDefault(); drawing = true; last = sigPos(e); }
  function sigMove(e){ if(!drawing) return; e.preventDefault(); const p = sigPos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last = p; hasInk = true; }
  function sigEnd(){ drawing = false; }
  canvas.addEventListener('mousedown', sigStart); canvas.addEventListener('mousemove', sigMove); window.addEventListener('mouseup', sigEnd);
  canvas.addEventListener('touchstart', sigStart, {passive:false}); canvas.addEventListener('touchmove', sigMove, {passive:false}); canvas.addEventListener('touchend', sigEnd);
  document.getElementById('svo-clear-sig').onclick = () => { ctx.clearRect(0,0,canvas.width,canvas.height); hasInk = false; };

  document.getElementById('svo-submit').onclick = async function() {
    const stmt = document.getElementById('svo-stmt').value.trim();
    const initials = {};
    let allFilled = true;
    document.querySelectorAll('.svo-init-box').forEach(box => {
      const val = box.value.trim();
      if (!val) allFilled = false;
      initials[box.dataset.key] = val;
    });
    if (!stmt || !allFilled || !hasInk) {
      document.getElementById('svo-err').style.display = 'block';
      return;
    }
    this.disabled = true;
    this.textContent = 'Submitting…';
    const signedAt = new Date();
    const payload = { name, ts, statement: stmt, initials, signature: canvas.toDataURL('image/png'), signedAt: signedAt.toISOString() };
    const cfg = getSBConfig();
    try {
      await fetch(`${cfg.url}/rest/v1/tracker_state`, {
        method: 'POST',
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: 'varresp_' + ts, value: JSON.stringify(payload), updated_at: signedAt.toISOString() })
      });
    } catch(e) {
      document.getElementById('svo-err').textContent = 'Could not submit — check your signal and try again.';
      document.getElementById('svo-err').style.display = 'block';
      this.disabled = false;
      this.textContent = '✅ Submit Statement & Signature';
      return;
    }
    document.getElementById('svo-signed-msg').textContent = 'Signed ' + signedAt.toLocaleString() + '.';
    document.getElementById('svo-form-card').style.display = 'none';
    document.getElementById('svo-success-card').style.display = 'block';
  };
}

// Manager side: pull in any staff responses staged in Supabase since they last checked
async function checkStaffVarianceResponses() {
  const cfg = getSBConfig();
  showSaveBanner('🔄 Checking for staff responses…');
  try {
    const r = await fetch(`${cfg.url}/rest/v1/tracker_state?key=like.varresp_*&select=key,value`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    });
    const rows = r.ok ? await r.json() : [];
    let imported = 0;
    for (const row of rows) {
      let decoded;
      try { decoded = JSON.parse(row.value); } catch(e) { continue; }
      if (!decoded.name || !decoded.ts) continue;
      const log = state.varianceLog[decoded.name];
      const entry = log && log.find(e => e.ts === decoded.ts);
      if (entry) {
        entry.staffStatement = decoded.statement || '';
        entry.staffInitials  = decoded.initials  || {};
        entry.staffSignature = decoded.signature || '';
        entry.staffSignedAt  = decoded.signedAt  || '';
        imported++;
      }
      fetch(`${cfg.url}/rest/v1/tracker_state?key=eq.${encodeURIComponent(row.key)}`, {
        method: 'DELETE',
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
      }).catch(()=>{});
      fetch(`${cfg.url}/rest/v1/tracker_state?key=eq.${encodeURIComponent('varform_' + decoded.ts)}`, {
        method: 'DELETE',
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
      }).catch(()=>{});
    }
    if (imported) { persistSave(); renderVarHistory(); showSaveBanner(`✍️ Imported ${imported} staff response(s)`); }
    else showSaveBanner('No new staff responses found.');
  } catch(e) {
    showSaveBanner('⚠️ Could not check for staff responses');
  }
}

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
      const endNorm   = isNonStd ? computeEndTime(startNorm, shiftHours(shift)) : null;

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
          <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text3);margin-left:10px;">${dateKey}</span>
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
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.03em;">${name}</div>
        <div style="font-size:16px;font-weight:700;color:${over ? 'var(--red2)' : 'var(--green2)'};">${fmt(row.actuals)}</div>
        <div style="font-size:10px;color:var(--text3);">Budget ${fmt(row.budget)} · ${pct(row.pct_variance)} var</div>
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
          <td style="padding:5px 8px;color:var(--white);"><span onclick="openEmployeeHub('${r.employee_name_raw.replace(/'/g,"\\'")}')" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px;">${r.employee_name_raw}</span>${r.match_status !== 'matched' ? ' <span style="color:var(--text3);font-size:9px;">(unmatched)</span>' : ''}</td>
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
      <div style="font-size:10px;color:var(--text3);margin-bottom:16px;">Free real-time sync · Multiple users · No IT approval needed</div>

      <div style="background:rgba(46,125,209,0.08);border:1px solid rgba(46,125,209,0.25);border-radius:8px;padding:14px;margin-bottom:16px;font-size:11px;line-height:1.8;color:var(--text2);">
        <strong style="color:var(--accent2);">One-time setup (5 minutes):</strong><br>
        1. Go to <a href="https://supabase.com" target="_blank" style="color:var(--accent2);">supabase.com</a> → Sign up free (no credit card)<br>
        2. Click <strong>New Project</strong> → name it <strong>3b-tracker</strong> → pick any password → Create<br>
        3. Wait ~1 min for project to spin up, then go to <strong>SQL Editor</strong> (left sidebar)<br>
        4. Paste and run this query:<br>
        <div style="background:rgba(0,0,0,0.3);border-radius:4px;padding:8px;margin:6px 0;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--green2);cursor:pointer;" onclick="navigator.clipboard.writeText(this.textContent.trim()).then(()=>showSaveBanner('📋 SQL copied'))">
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
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px;">Your Name / Identifier (shown to other users)</div>
          <input id="sb-username" type="text" value="${cfg.username||''}" placeholder="e.g. Ron H"
            style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px;">Supabase Project URL</div>
          <input id="sb-url" type="text" value="${cfg.url||''}" placeholder="https://xxxxxxxxxxxx.supabase.co"
            style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px;">Supabase Anon Public Key</div>
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
    _sbSaveTimer = setInterval(sbPoll, 8000);

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

// ════════════════════════════════════════════════════════════
//  TWILIO SMS INTEGRATION
// ════════════════════════════════════════════════════════════

function saveTwilioConfig() {
  state.twilioConfig = {
    accountSid:  document.getElementById('twilio-sid')?.value.trim()   || '',
    authToken:   document.getElementById('twilio-token')?.value.trim() || '',
    fromNumber:  document.getElementById('twilio-from')?.value.trim()  || '',
  };
  // Also persist directly to localStorage so it survives even before Supabase syncs
  try { localStorage.setItem('_twilioConfig', JSON.stringify(state.twilioConfig)); } catch(e) {}
  persistSave();
  updateTwilioStatusBadge();
}

function initTwilioUI() {
  if (!state.twilioConfig || !state.twilioConfig.accountSid) {
    // Try localStorage backup first
    try {
      const local = JSON.parse(localStorage.getItem('_twilioConfig') || '{}');
      if (local.accountSid) state.twilioConfig = local;
    } catch(e) {}
  }
  if (!state.twilioConfig) state.twilioConfig = { accountSid:'', authToken:'', fromNumber:'' };
  const cfg = state.twilioConfig;
  const sid   = document.getElementById('twilio-sid');
  const token = document.getElementById('twilio-token');
  const from  = document.getElementById('twilio-from');
  if (sid)   sid.value   = cfg.accountSid  || '';
  if (token) token.value = cfg.authToken   || '';
  if (from)  from.value  = cfg.fromNumber  || '';
  updateTwilioStatusBadge();
}

function updateTwilioStatusBadge() {
  const el  = document.getElementById('twilio-status-badge');
  if (!el) return;
  const cfg = state.twilioConfig || {};
  const ok  = cfg.accountSid && cfg.authToken && cfg.fromNumber;
  el.innerHTML = ok
    ? '<span style="color:var(--green2);font-weight:700;">✓ Configured</span>'
    : '<span style="color:var(--text3);">Not configured</span>';
}

async function twilioSendSMS(to, body) {
  const cfg = state.twilioConfig || {};
  if (!cfg.accountSid || !cfg.authToken || !cfg.fromNumber) {
    throw new Error('Twilio not configured — enter Account SID, Auth Token, and From Number first.');
  }
  const phone = to.replace(/\D/g,'');
  if (phone.length < 10) throw new Error(`Invalid phone number: ${to}`);
  const toE164 = phone.startsWith('1') ? '+'+phone : '+1'+phone;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: toE164, From: cfg.fromNumber, Body: body });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${cfg.accountSid}:${cfg.authToken}`),
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || `Twilio error ${resp.status}`);
  return data.sid;
}

async function testTwilioConnection() {
  const badge = document.getElementById('twilio-status-badge');
  if (badge) badge.innerHTML = '<span style="color:var(--text3);">Testing...</span>';
  const cfg = state.twilioConfig || {};
  if (!cfg.accountSid || !cfg.authToken) {
    alert('Enter Account SID and Auth Token first.');
    updateTwilioStatusBadge();
    return;
  }
  try {
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}.json`;
    const resp = await fetch(url, {
      headers: { 'Authorization': 'Basic ' + btoa(`${cfg.accountSid}:${cfg.authToken}`) }
    });
    const data = await resp.json();
    if (resp.ok) {
      if (badge) badge.innerHTML = '<span style="color:var(--green2);font-weight:700;">✓ Connected — ' + (data.friendly_name||cfg.accountSid) + '</span>';
      showSaveBanner('✅ Twilio connected!');
    } else {
      throw new Error(data.message || 'Auth failed');
    }
  } catch(e) {
    if (badge) badge.innerHTML = '<span style="color:var(--red2);">✗ ' + e.message + '</span>';
    alert('Twilio test failed: ' + e.message);
  }
}

function twilioLog(msg) {
  const el = document.getElementById('twilio-send-log');
  if (!el) return;
  const ts = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  el.innerHTML = `<div>${ts} — ${msg}</div>` + el.innerHTML;
}

// ── Open Shifts ──────────────────────────────────────────────────────
// ── Recipient Picker Modal ──────────────────────────────────────────
// Opens a modal with checkboxes before sending any Twilio SMS
// recipients: [{ name, job, phone, preview }]  — preview = the message they'll get
// onSend: async function(selectedRecipients) — called when user confirms

function openTwilioRecipientPicker(title, recipients, onSend) {
  const existing = document.getElementById('twilio-picker-modal');
  if (existing) existing.remove();

  if (!recipients.length) {
    showSaveBanner('✅ No eligible recipients found');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'twilio-picker-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9999;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:16px;';

  const rColorMap = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)', UC:'var(--text2)' };

  const rows = recipients.map((r, i) => {
    const rCol  = rColorMap[r.job] || 'var(--text2)';
    const phone = r.phone ? r.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : '';
    return `<div class="tpick-row" style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <input type="checkbox" class="tpick-cb" data-idx="${i}" checked
        style="width:16px;height:16px;accent-color:var(--purple2);cursor:pointer;flex-shrink:0;margin-top:2px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
          <span style="font-size:12px;font-weight:700;color:var(--white);">${r.name}</span>
          <span style="font-size:9px;font-weight:700;color:${rCol};border:1px solid currentColor;padding:1px 5px;border-radius:3px;">${r.job}</span>
          <span style="font-size:10px;color:var(--text3);">${phone}</span>
        </div>
        ${r.preview ? `<div style="font-size:9.5px;color:var(--text3);background:rgba(255,255,255,0.04);border-radius:5px;padding:6px 8px;white-space:pre-wrap;max-height:80px;overflow-y:auto;line-height:1.5;">${r.preview}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  modal.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;width:100%;max-width:640px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-size:15px;font-weight:700;color:var(--white);">📱 ${title}</div>
      <button onclick="document.getElementById('twilio-picker-modal').remove()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;line-height:1;">✕</button>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:12px;">${recipients.length} recipients — uncheck anyone you don't want to include</div>

    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
      <button onclick="document.querySelectorAll('.tpick-cb').forEach(c=>c.checked=true);updateTPickCount()" class="btn btn-ghost btn-sm" style="font-size:10px;">✓ Select All</button>
      <button onclick="document.querySelectorAll('.tpick-cb').forEach(c=>c.checked=false);updateTPickCount()" class="btn btn-ghost btn-sm" style="font-size:10px;">✗ Deselect All</button>
      <span id="tpick-count" style="font-size:10px;color:var(--accent2);align-self:center;margin-left:4px;">${recipients.length} selected</span>
    </div>

    <div style="max-height:50vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:0 12px;">
      ${rows}
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
      <button onclick="document.getElementById('twilio-picker-modal').remove()" class="btn btn-ghost btn-sm">Cancel</button>
      <button onclick="confirmTwilioSend()" class="btn btn-primary" style="background:rgba(139,92,246,0.3);border-color:rgba(139,92,246,0.5);color:var(--purple2);">📤 Send SMS</button>
    </div>
  </div>`;

  // Store recipients + callback on window for confirmTwilioSend
  window._twilioPending = { recipients, onSend };

  // Wire checkboxes to update count
  modal.querySelectorAll('.tpick-cb').forEach(cb => {
    cb.addEventListener('change', updateTPickCount);
  });

  document.body.appendChild(modal);
  updateTPickCount();
}

function updateTPickCount() {
  const checked = document.querySelectorAll('.tpick-cb:checked').length;
  const el = document.getElementById('tpick-count');
  if (el) el.textContent = `${checked} selected`;
}

async function confirmTwilioSend() {
  const modal = document.getElementById('twilio-picker-modal');
  const { recipients, onSend } = window._twilioPending || {};
  if (!recipients || !onSend) return;

  const selected = [];
  document.querySelectorAll('.tpick-cb').forEach((cb, i) => {
    if (cb.checked) selected.push(recipients[i]);
  });

  if (!selected.length) { alert('Select at least one recipient.'); return; }

  // Close modal and send
  if (modal) modal.remove();

  const btn = document.querySelector('#twilio-send-log');
  twilioLog(`Sending to ${selected.length} selected recipients...`);
  await onSend(selected);
}

// ── Open Shifts ──────────────────────────────────────────────────────
async function twilioSendOpenShifts() {
  const dateKey = state.activeBoardDate;
  if (!dateKey) { alert('No board date loaded.'); return; }
  const shifts  = state.placements[dateKey] || {};
  const dateStr = new Date(dateKey+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  const budgets  = state.vacancyBudgets || {};
  const openLines = [];
  ['RN','LPN','CA'].forEach(role => {
    const bud = parseFloat(budgets[`${role.toLowerCase()}-total`]) || 0;
    if (!bud) return;
    const filled = getStaffOnShift(role, shifts).total;
    const open   = Math.round((bud - filled) * 10) / 10;
    if (open > 0) openLines.push(`${role}: ${open} FTE open`);
  });

  if (!openLines.length) { showSaveBanner('✅ No open shifts to notify about'); return; }

  const msgBody = `3B Tele Med Surg — Open Shifts\n${dateStr}\n\n${openLines.join('\n')}\n\nAre you available? Reply or call the unit.\n\nAOMC 3B Management`;

  const scheduledNames = new Set(Object.values(shifts).flat().map(p=>p.name));
  const candidates = MASTER_STAFF.filter(s => !scheduledNames.has(s.name) && (state.phones?.[s.name]||'').replace(/\D/g,'').length >= 10);

  if (!candidates.length) { alert('No off-duty staff with phone numbers found.'); return; }

  const recipients = candidates.map(s => ({
    name: s.name, job: s.job,
    phone: (state.phones?.[s.name]||'').replace(/\D/g,''),
    preview: msgBody,
    msgBody,
  }));

  openTwilioRecipientPicker('Open Shift Alerts', recipients, async (selected) => {
    let sent=0, failed=0;
    for (const r of selected) {
      try { await twilioSendSMS(r.phone, r.msgBody); sent++; }
      catch(e) { failed++; twilioLog(`✗ ${r.name}: ${e.message}`); }
    }
    twilioLog(`✅ Open shifts: ${sent} sent, ${failed} failed`);
    showSaveBanner(`📱 Open shift SMS: ${sent} sent`);
  });
}

// ── Education Overdue ────────────────────────────────────────────────
async function twilioSendEducationOverdue() {
  const candidates = MASTER_STAFF.filter(s => {
    const pending = state.pendingEdu[s.name] || [];
    const phone   = (state.phones?.[s.name]||'').replace(/\D/g,'');
    return pending.length > 0 && phone.length >= 10;
  });

  if (!candidates.length) { showSaveBanner('✅ No staff with overdue education and a phone number'); return; }

  const recipients = candidates.map(s => {
    const items = state.pendingEdu[s.name] || [];
    const fname = s.name.split(',')[1]?.trim() || s.name.split(',')[0];
    const msgBody = `Hi ${fname} — 3B Tele Med Surg reminder:\n\nYou have ${items.length} pending education item${items.length!==1?'s':''}:\n${items.slice(0,3).map(i=>`• ${i}`).join('\n')}${items.length>3?`\n• ...and ${items.length-3} more`:''}\n\nPlease complete in HealthStream.\n\nAOMC 3B Management`;
    return { name: s.name, job: s.job, phone: (state.phones?.[s.name]||'').replace(/\D/g,''), preview: msgBody, msgBody };
  });

  openTwilioRecipientPicker('Education Overdue Reminders', recipients, async (selected) => {
    let sent=0, failed=0;
    for (const r of selected) {
      try { await twilioSendSMS(r.phone, r.msgBody); sent++; }
      catch(e) { failed++; twilioLog(`✗ ${r.name}: ${e.message}`); }
    }
    twilioLog(`✅ Education: ${sent} sent, ${failed} failed`);
    showSaveBanner(`📱 Education SMS: ${sent} sent`);
  });
}

// ── Policy Sign-Off Reminders ────────────────────────────────────────
async function twilioSendPolicyReminders() {
  const policies = (state.policies || []).filter(p => p.requireAck !== false);
  if (!policies.length) { showSaveBanner('No policies configured'); return; }

  const pendingMap = {};
  policies.forEach(p => {
    getPolicyStaff(p).forEach(s => {
      if (!(p.acks||{})[s.name]) {
        if (!pendingMap[s.name]) pendingMap[s.name] = { staff: s, pols: [] };
        pendingMap[s.name].pols.push(p.title);
      }
    });
  });

  const candidates = Object.values(pendingMap).filter(({ staff }) =>
    (state.phones?.[staff.name]||'').replace(/\D/g,'').length >= 10
  );

  if (!candidates.length) { alert('No staff with unsigned policies and phone numbers.'); return; }

  const recipients = candidates.map(({ staff, pols }) => {
    const fname = staff.name.split(',')[1]?.trim() || staff.name.split(',')[0];
    const msgBody = `Hi ${fname} — 3B Tele Med Surg reminder:\n\nPlease sign off on ${pols.length} polic${pols.length!==1?'ies':'y'}:\n${pols.slice(0,3).map(t=>`• ${t}`).join('\n')}${pols.length>3?`\n• ...and ${pols.length-3} more`:''}\n\nOpen the 3B Staff Command Center → Education → Read & Sign.\n\nAOMC 3B Management`;
    return { name: staff.name, job: staff.job, phone: (state.phones?.[staff.name]||'').replace(/\D/g,''), preview: msgBody, msgBody };
  });

  openTwilioRecipientPicker('Policy Sign-Off Reminders', recipients, async (selected) => {
    let sent=0, failed=0;
    for (const r of selected) {
      try { await twilioSendSMS(r.phone, r.msgBody); sent++; }
      catch(e) { failed++; twilioLog(`✗ ${r.name}: ${e.message}`); }
    }
    twilioLog(`✅ Policy reminders: ${sent} sent, ${failed} failed`);
    showSaveBanner(`📱 Policy SMS: ${sent} sent`);
  });
}

// ── Cert Expiring Alerts ─────────────────────────────────────────────
async function twilioSendCertExpiring() {
  const CERT_FIELDS = [
    {key:'bls',label:'BLS/CPR'},{key:'acls',label:'ACLS'},{key:'nihss',label:'NIHSS'},
    {key:'pivInsertion',label:'PIV Insertion'},{key:'bloodAdmin',label:'Blood Admin'},
    {key:'telemetry',label:'Telemetry'},{key:'ecgAcquisition',label:'12-Lead ECG'},
    {key:'tncc',label:'TNCC'},{key:'cen',label:'CEN'},{key:'pals',label:'PALS'},
  ];
  const now = new Date();
  function daysLeft(dt) { if (!dt) return 999; return Math.round((new Date(dt+'T12:00:00') - now) / 86400000); }

  const candidates = MASTER_STAFF.filter(s => {
    const certs = state.certs[s.name] || {};
    const phone = (state.phones?.[s.name]||'').replace(/\D/g,'');
    return CERT_FIELDS.some(f => daysLeft(certs[f.key]) < 30) && phone.length >= 10;
  });

  if (!candidates.length) { showSaveBanner('✅ No certifications expiring within 30 days'); return; }

  const recipients = candidates.map(s => {
    const certs = state.certs[s.name] || {};
    const due   = CERT_FIELDS.filter(f => daysLeft(certs[f.key]) < 30).map(f => {
      const d = daysLeft(certs[f.key]);
      return `• ${f.label}: ${d < 0 ? 'EXPIRED' : d+'d remaining'} (${certs[f.key]})`;
    });
    const fname = s.name.split(',')[1]?.trim() || s.name.split(',')[0];
    const msgBody = `Hi ${fname} — 3B Tele Med Surg:\n\nCertification${due.length!==1?'s':''} needing attention:\n${due.join('\n')}\n\nPlease renew as soon as possible.\n\nAOMC 3B Management`;
    return { name: s.name, job: s.job, phone: (state.phones?.[s.name]||'').replace(/\D/g,''), preview: msgBody, msgBody };
  });

  openTwilioRecipientPicker('Cert Expiration Alerts', recipients, async (selected) => {
    let sent=0, failed=0;
    for (const r of selected) {
      try { await twilioSendSMS(r.phone, r.msgBody); sent++; }
      catch(e) { failed++; twilioLog(`✗ ${r.name}: ${e.message}`); }
    }
    twilioLog(`✅ Cert alerts: ${sent} sent, ${failed} failed`);
    showSaveBanner(`📱 Cert expiration SMS: ${sent} sent`);
  });
}

// // Replace per-staff SMS button with Twilio if configured
async function sendSMSToStaff(phone, body) {
  const cfg = state.twilioConfig || {};
  if (cfg.accountSid && cfg.authToken && cfg.fromNumber) {
    return twilioSendSMS(phone, body);
  }
  // Fallback: SMS app or copy
  openSMSOrCopy(phone, body);
}

function initTwilioTab() {
  if (document.getElementById('panel-import')?.style.display !== 'none') initTwilioUI();
}

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
      <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px;">${label}</div>
      <div style="font-size:22px;font-weight:700;color:rgba(${col},1);">${ytd}</div>
      <div style="font-size:9px;color:var(--text3);">YTD</div>
      <div style="font-size:14px;font-weight:600;color:rgba(${col},0.8);margin-top:4px;">${d30}</div>
      <div style="font-size:9px;color:var(--text3);">Last 30d</div>
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
          <span style="font-size:10px;color:var(--text3);">${g.label}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px;">
          <input type="number" value="${actual!==undefined?actual:''}" placeholder="—"
            style="width:60px;background:var(--slate);border:1px solid var(--border);color:${status};border-radius:4px;padding:3px 5px;font-size:12px;font-weight:700;outline:none;"
            onchange="saveGoalActual('${g.key}',this.value)">
          <span style="font-size:9px;color:var(--text3);">/ ${target} ${g.unit}</span>
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
        <div style="font-size:9px;color:var(--text3);">YTD Falls</div>
        <div style="font-size:9px;color:${ytd.length<=30?'var(--green2)':'var(--red2)'};">Target: ≤30</div>
      </div>
      <div class="card" style="padding:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--amber2);">${ytd.filter(f=>f.category==='injury').length}</div>
        <div style="font-size:9px;color:var(--text3);">With Injury</div>
      </div>
      <div class="card" style="padding:10px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${ytd.filter(f=>f.category==='repeat').length}</div>
        <div style="font-size:9px;color:var(--text3);">Repeat Falls</div>
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
          <td style="padding:5px 8px;"><span style="font-size:9px;padding:1px 6px;border-radius:8px;background:${f.category==='injury'?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.08)'};">${f.category||'no injury'}</span></td>
          <td style="padding:5px 8px;color:var(--text3);">${f.desc||''}</td>
          <td style="padding:5px 8px;"><button onclick="deleteFall(${falls.indexOf(f)})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;">✕</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : '<div style="color:var(--text3);font-style:italic;font-size:11px;">No falls logged this year</div>'}

    <!-- Add fall modal inline -->
    <div id="fall-modal" style="display:none;margin-top:14px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:14px;">
      <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:10px;">Log Patient Fall</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div><label style="font-size:9px;color:var(--text3);">Date</label><input type="date" id="fall-date" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;"></div>
        <div><label style="font-size:9px;color:var(--text3);">Room</label><input type="text" id="fall-room" placeholder="Room #" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;"></div>
        <div><label style="font-size:9px;color:var(--text3);">Primary Nurse</label>
          <select id="fall-staff" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;">
            <option value="">— Select staff —</option>
            ${MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN').map(s=>`<option value="${s.name}">${s.name} (${s.job})</option>`).join('')}
          </select>
        </div>
        <div><label style="font-size:9px;color:var(--text3);">Category</label>
          <select id="fall-cat" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:5px;font-size:11px;outline:none;">
            <option value="no injury">No Injury</option>
            <option value="injury">With Injury</option>
            <option value="repeat">Repeat Fall</option>
            <option value="near miss">Near Miss</option>
          </select>
        </div>
        <div style="grid-column:1/-1;"><label style="font-size:9px;color:var(--text3);">Description / Actions Taken</label>
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
              <div style="font-size:10px;color:var(--text3);">${m.attendees?.length||0} attendees</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button onclick="openUPCMeetingModal(${i})" class="btn btn-ghost btn-sm" style="font-size:9px;">✏️ Edit</button>
              <button onclick="deleteUPCMeeting(${i})" class="btn btn-ghost btn-sm" style="font-size:9px;color:var(--red2);">✕</button>
            </div>
          </div>
          ${m.attendees?.length ? `<div style="font-size:10px;color:var(--text3);margin-bottom:6px;">Attendees: ${m.attendees.join(', ')}</div>` : ''}
          ${m.goals?.length ? `<div style="margin-bottom:6px;"><div style="font-size:9px;color:var(--accent2);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Goals</div>${m.goals.map(g=>`<div style="font-size:11px;color:var(--white);">• ${g}</div>`).join('')}</div>` : ''}
          ${m.notes ? `<div style="margin-bottom:6px;"><div style="font-size:9px;color:var(--amber2);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Meeting Notes</div><div style="font-size:11px;color:var(--text2);white-space:pre-wrap;">${m.notes}</div></div>` : ''}
          ${m.outcomes?.length ? `<div><div style="font-size:9px;color:var(--green2);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Outcomes / Action Items</div>${m.outcomes.map(o=>`<div style="font-size:11px;color:var(--white);">✓ ${o}</div>`).join('')}</div>` : ''}
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
          <div><label style="font-size:9px;color:var(--text3);">Meeting Date</label>
            <input type="date" id="upc-date" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;">
          </div>
          <div><label style="font-size:9px;color:var(--text3);">Attendees (comma-separated names)</label>
            <input type="text" id="upc-attendees" placeholder="Smith, John; Jones, Mary..." style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;">
          </div>
          <div><label style="font-size:9px;color:var(--text3);">Goals (one per line)</label>
            <textarea id="upc-goals" rows="3" placeholder="Goal 1&#10;Goal 2" style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;resize:vertical;"></textarea>
          </div>
          <div><label style="font-size:9px;color:var(--text3);">Meeting Notes</label>
            <textarea id="upc-notes" rows="4" placeholder="Discussion points, decisions..." style="width:100%;background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:6px;font-size:12px;outline:none;resize:vertical;"></textarea>
          </div>
          <div><label style="font-size:9px;color:var(--text3);">Outcomes / Action Items (one per line)</label>
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
        <td style="padding:5px 8px;font-size:10px;color:var(--text3);white-space:nowrap;">${label}</td>
        <td style="padding:5px 8px;font-size:10px;color:${fri!=='—'?'var(--white)':'var(--text3)'};">${fri}</td>
        <td style="padding:5px 8px;font-size:10px;color:${sat!=='—'?'var(--white)':'var(--text3)'};">${sat}</td>
        <td style="padding:5px 8px;font-size:10px;color:${sun!=='—'?'var(--white)':'var(--text3)'};">${sun}</td>
      </tr>`;
    }).join('');

    const note = (state.weekendSummary||{})[friKey] || {};
    return `<div class="card" style="padding:14px;margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:10px;">📅 Weekend of ${friStr}–${sunStr}</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:rgba(255,255,255,0.04);">
          <th style="padding:5px 8px;text-align:left;font-size:9px;color:var(--text3);">Shift</th>
          <th style="padding:5px 8px;text-align:left;font-size:9px;color:${wk.fri.getDay()===5?'var(--amber2)':'var(--text3)'};">Fri ${friStr}</th>
          <th style="padding:5px 8px;text-align:left;font-size:9px;color:var(--amber2);">Sat ${satStr}</th>
          <th style="padding:5px 8px;text-align:left;font-size:9px;color:var(--amber2);">Sun ${sunStr}</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div style="margin-top:10px;">
        <div style="font-size:9px;color:var(--text3);margin-bottom:3px;">Weekend Notes / Incidents</div>
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
    el.innerHTML = `<button onclick="showSPSetup()" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:5px;padding:4px 10px;color:var(--text3);font-size:10px;cursor:pointer;">☁️ Sync Off</button>`;
  } else if (_sbConnected) {
    const by = cfg.username || 'you';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:5px;cursor:pointer;" onclick="showSPSetup()">
      <span style="width:7px;height:7px;border-radius:50%;background:${justSaved?'#22c55e':'#3b82f6'};display:inline-block;box-shadow:0 0 6px ${justSaved?'#22c55e':'#3b82f6'};flex-shrink:0;"></span>
      <span style="font-size:10px;color:${justSaved?'var(--green2)':'var(--accent2)'};">☁️ ${justSaved?'Saved · '+by:'Synced'} ${lastTime?'· '+lastTime:''}</span>
    </div>`;
  } else {
    el.innerHTML = `<button onclick="showSPSetup()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:5px;padding:4px 10px;color:var(--red2);font-size:10px;cursor:pointer;">☁️ Offline — reconnect</button>`;
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
    chargeNurses: state.chargeNurses, charge3C: state.charge3C, staff3C: state.staff3C,
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
    twilioConfig: state.twilioConfig || {},
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
const CC_BUILD = '2026-08-28-sync-guard';
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
    if (has('twilioConfig'))   state.twilioConfig   = data.twilioConfig   || {accountSid:'',authToken:'',fromNumber:''};
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
      <div style="font-size:10px;color:var(--text3);margin-top:1px;">${c.label}</div>
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
removeStaff = function(dateKey, shift, idx, role) {
  if (!state.placements[dateKey]) return;
  const arr = (state.placements[dateKey][shift]||[]).filter(p=>p.role===role);
  const target = arr[idx];
  if (!target) return;
  const fullArr = state.placements[dateKey][shift];
  let removed = false;
  state.placements[dateKey][shift] = fullArr.filter((p) => {
    if (!removed && p.role===role && p.name===target.name) { removed=true; return false; }
    return true;
  });
  renderBoard();
  renderDirectory();
  persistSave();
};

// ════════════════════════════════════
//  TO-DO LIST
// ════════════════════════════════════

const TODO_FREQ_LABEL  = { daily:'Daily', weekly:'Weekly', monthly:'Monthly' };
const TODO_FREQ_COLOR  = { daily:'var(--accent2)', weekly:'var(--purple2)', monthly:'var(--teal2)' };
const TODO_FREQ_ORDER  = { daily:0, weekly:1, monthly:2 };
const TODO_WEIGHT_COLOR= ['','var(--text3)','var(--amber2)','var(--amber2)','var(--red2)','var(--red2)'];
let _todoFilter = 'all';

function todoDateKey() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}
function todoWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(week).padStart(2,'0');
}
function todoMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function todoPeriodKey(freq) {
  if (freq === 'daily')   return todoDateKey();
  if (freq === 'weekly')  return todoWeekKey();
  if (freq === 'monthly') return todoMonthKey();
  return todoDateKey();
}
function isTodoDone(item) {
  return !!(item.done && item.done[todoPeriodKey(item.freq)]);
}

function renderTodo() {
  const sections = { daily:[], weekly:[], monthly:[] };
  (state.todoList || []).forEach(item => {
    if (sections[item.freq]) sections[item.freq].push(item);
  });

  // Sort each section: undone first, then by weight desc, then alpha
  Object.keys(sections).forEach(freq => {
    sections[freq].sort((a,b) => {
      const aDone = isTodoDone(a) ? 1 : 0;
      const bDone = isTodoDone(b) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.text.localeCompare(b.text);
    });
  });

  const totalItems = (state.todoList||[]).length;
  const doneItems  = (state.todoList||[]).filter(isTodoDone).length;

  // Progress bar
  const pct = totalItems > 0 ? Math.round(doneItems/totalItems*100) : 0;
  const bar = document.getElementById('todo-progress-bar');
  const lbl = document.getElementById('todo-progress-label');
  if (bar) bar.style.width = pct + '%';
  if (bar) bar.style.background = pct===100 ? 'var(--green2)' : pct>=50 ? 'var(--amber2)' : 'var(--accent2)';
  if (lbl) lbl.textContent = doneItems + '/' + totalItems + ' done';

  // Filter buttons active state
  ['all','daily','weekly','monthly','pending'].forEach(f => {
    const btn = document.getElementById('todo-filter-'+f);
    if (!btn) return;
    btn.style.background = _todoFilter === f ? '' : 'rgba(255,255,255,0.07)';
    btn.className = _todoFilter === f ? 'btn btn-primary' : 'btn';
  });

  // Weighted score display
  const totalWeight = (state.todoList||[]).reduce((s,i) => s + (isTodoDone(i)?0:i.weight), 0);

  // Render each frequency section
  ['daily','weekly','monthly'].forEach(freq => {
    const el = document.getElementById('todo-'+freq+'-section');
    if (!el) return;

    let items = sections[freq];
    if (_todoFilter === 'pending') items = items.filter(i => !isTodoDone(i));
    else if (_todoFilter !== 'all' && _todoFilter !== freq) { el.innerHTML=''; return; }

    if (!items.length && _todoFilter !== 'all') { el.innerHTML=''; return; }

    const doneCount = sections[freq].filter(isTodoDone).length;
    const totalCount = sections[freq].length;
    const freqWeight = sections[freq].filter(i=>!isTodoDone(i)).reduce((s,i)=>s+i.weight,0);

    el.innerHTML = `
      <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${TODO_FREQ_COLOR[freq]};">${TODO_FREQ_LABEL[freq]}</span>
        <span style="font-size:10px;color:var(--text3);">${doneCount}/${totalCount} done</span>
        ${freqWeight>0?`<span style="font-size:9px;background:rgba(255,255,255,0.06);border-radius:4px;padding:1px 6px;color:var(--text3);">⚖ ${freqWeight} pts pending</span>`:''}
        <div style="flex:1;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
          <div style="height:3px;background:${TODO_FREQ_COLOR[freq]};border-radius:2px;width:${totalCount>0?Math.round(doneCount/totalCount*100):0}%;transition:width 0.3s;"></div>
        </div>
      </div>
      ${items.length === 0 ? '<div style="color:var(--text3);font-size:11px;padding:10px 0;">No items</div>' :
        '<div style="display:flex;flex-direction:column;gap:6px;">' +
        items.map(item => renderTodoItem(item)).join('') +
        '</div>'
      }
    `;
  });

  // Empty state
  const emptyEl = document.getElementById('todo-empty-state');
  if (emptyEl) emptyEl.style.display = totalItems === 0 ? 'block' : 'none';
}

function renderTodoItem(item) {
  const done     = isTodoDone(item);
  const w        = item.weight || 1;
  const stars    = '★'.repeat(w) + '☆'.repeat(5-w);
  const starCol  = TODO_WEIGHT_COLOR[w] || 'var(--text3)';
  const freqCol  = TODO_FREQ_COLOR[item.freq];
  const dueLabel = item.freq === 'daily' ? 'today' : item.freq === 'weekly' ? 'this week' : 'this month';

  return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:${done?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)'};border:1px solid ${done?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.1)'};border-left:3px solid ${done?'rgba(255,255,255,0.1)':freqCol};border-radius:6px;transition:all 0.2s;opacity:${done?'0.6':'1'};">
    <input type="checkbox" ${done?'checked':''} onchange="toggleTodoDone('${item.id}')"
      style="margin-top:2px;width:16px;height:16px;cursor:pointer;accent-color:var(--green2);flex-shrink:0;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:12px;font-weight:600;color:${done?'var(--text3)':'var(--white)'};text-decoration:${done?'line-through':'none'};word-break:break-word;">${item.text}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
        ${item.category?`<span style="font-size:9px;background:rgba(255,255,255,0.07);border-radius:3px;padding:1px 5px;color:var(--text3);">${item.category}</span>`:''}
        <span style="font-size:10px;color:${starCol};" title="Priority: ${w}/5">${stars}</span>
        <span style="font-size:9px;color:var(--text3);">Due ${item.dueDate ? new Date(item.dueDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : dueLabel}</span>
        ${(!done && item.dueDate && item.dueDate < todoDateKey())?`<span style="font-size:9px;color:var(--red2);font-weight:800;">OVERDUE</span>`:''}
        ${done?`<span style="font-size:9px;color:var(--green2);">✓ Completed</span>`:''}
      </div>
    </div>
    <div style="display:flex;gap:4px;flex-shrink:0;">
      <button onclick="editTodoItem('${item.id}')" title="Edit" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:3px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button>
      <button onclick="deleteTodoItem('${item.id}')" title="Delete" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:3px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>
    </div>
  </div>`;
}

function setTodoFilter(f) {
  _todoFilter = f;
  renderTodo();
}

function toggleTodoDone(id) {
  const item = (state.todoList||[]).find(i=>i.id===id);
  if (!item) return;
  if (!item.done) item.done = {};
  const key = todoPeriodKey(item.freq);
  if (item.done[key]) delete item.done[key];
  else item.done[key] = Date.now();
  persistSave();
  renderTodo();
}

function deleteTodoItem(id) {
  if (!confirm('Delete this to-do item?')) return;
  state.todoList = (state.todoList||[]).filter(i=>i.id!==id);
  persistSave();
  renderTodo();
}

function openTodoModal(id) {
  const modal = document.getElementById('todo-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('todo-edit-id').value = id || '';
  document.getElementById('todo-modal-title').textContent = id ? 'Edit To-Do Item' : 'Add To-Do Item';

  if (id) {
    const item = (state.todoList||[]).find(i=>i.id===id);
    if (item) {
      document.getElementById('todo-text').value = item.text || '';
      document.getElementById('todo-freq').value = item.freq || 'daily';
      document.getElementById('todo-weight').value = item.weight || 3;
      document.getElementById('todo-category').value = item.category || '';
      document.getElementById('todo-due-date').value = item.dueDate || '';
      setTodoWeight(item.weight || 3);
    }
  } else {
    document.getElementById('todo-text').value = '';
    document.getElementById('todo-freq').value = 'daily';
    document.getElementById('todo-category').value = '';
    document.getElementById('todo-due-date').value = '';
    setTodoWeight(3);
  }
  setTimeout(()=>{ const t=document.getElementById('todo-text'); if(t)t.focus(); }, 50);
}

function editTodoItem(id) { openTodoModal(id); }

function closeTodoModal() {
  const modal = document.getElementById('todo-modal');
  if (modal) modal.style.display = 'none';
}

function setTodoWeight(n) {
  document.getElementById('todo-weight').value = n;
  document.querySelectorAll('#todo-weight-stars span').forEach(s => {
    const w = parseInt(s.dataset.w);
    s.style.color = w <= n ? (n >= 4 ? 'var(--red2)' : 'var(--amber2)') : 'var(--text3)';
  });
}

function saveTodoItem() {
  const text = (document.getElementById('todo-text').value || '').trim();
  if (!text) { alert('Please enter a task description.'); return; }
  const freq     = document.getElementById('todo-freq').value || 'daily';
  const weight   = parseInt(document.getElementById('todo-weight').value) || 3;
  const category = (document.getElementById('todo-category').value || '').trim();
  const dueDate = document.getElementById('todo-due-date')?.value || '';
  const editId   = document.getElementById('todo-edit-id').value;

  if (!state.todoList) state.todoList = [];

  if (editId) {
    const item = state.todoList.find(i=>i.id===editId);
    if (item) { item.text=text; item.freq=freq; item.weight=weight; item.category=category; item.dueDate=dueDate; }
  } else {
    state.todoList.push({
      id: 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      text, freq, weight, category, dueDate,
      done: {},
      created: Date.now()
    });
  }
  persistSave();
  closeTodoModal();
  renderTodo();
}

function resetTodoToday() {
  if (!confirm('Reset all completions for today? (Weekly/monthly completions are not affected)')) return;
  const key = todoDateKey();
  (state.todoList||[]).forEach(item => { if (item.done && item.done[key]) delete item.done[key]; });
  persistSave();
  renderTodo();
}

function seedDefaultTodos() {
  if ((state.todoList||[]).length > 0) return; // don't overwrite
  const defaults = [
    // Daily
    { text:'Review staffing ratios and adjust board for current census', freq:'daily', weight:5, category:'Staffing' },
    { text:'Complete morning huddle and document key talking points', freq:'daily', weight:4, category:'Communication' },
    { text:'Check float pool availability and pending call-outs', freq:'daily', weight:5, category:'Staffing' },
    { text:'Round on all patients — verify safety checks and comfort rounds', freq:'daily', weight:5, category:'Safety' },
    { text:'Review new orders and ensure RN assignments are appropriate', freq:'daily', weight:4, category:'Clinical' },
    { text:'Verify open shift coverage and contact on-call if needed', freq:'daily', weight:4, category:'Staffing' },
    { text:'Check bed board and coordinate with charge for admissions/discharges', freq:'daily', weight:3, category:'Operations' },
    // Weekly
    { text:'Review pending education items and follow up with staff', freq:'weekly', weight:4, category:'Compliance' },
    { text:'Check expiring certifications — BLS, ACLS, NIHSS, Health Eval, Fit Test', freq:'weekly', weight:5, category:'Compliance' },
    { text:'Review schedule for upcoming week — identify gaps and fill open shifts', freq:'weekly', weight:5, category:'Staffing' },
    { text:'Submit payroll corrections and review time punches', freq:'weekly', weight:4, category:'Operations' },
    { text:'Follow up on any open variances or incident reports', freq:'weekly', weight:4, category:'Safety' },
    { text:'Review unit quality metrics — falls, HAPIs, scan compliance, pain reassessment', freq:'weekly', weight:3, category:'Quality' },
    { text:'Connect 1:1 with any staff member on a performance improvement plan', freq:'weekly', weight:3, category:'HR' },
    // Monthly
    { text:'Complete monthly unit budget review and reconcile supply costs', freq:'monthly', weight:4, category:'Budget' },
    { text:'Review and update staff annual evaluations — goals and progress', freq:'monthly', weight:4, category:'HR' },
    { text:'Submit monthly nursing hours and overtime report to director', freq:'monthly', weight:5, category:'Operations' },
    { text:'Review Press Ganey scores and develop action items', freq:'monthly', weight:4, category:'Quality' },
    { text:'Conduct monthly staff meeting — review KPIs, concerns, recognition', freq:'monthly', weight:4, category:'Communication' },
    { text:'Check agency contract end dates and renewal timelines', freq:'monthly', weight:3, category:'Staffing' },
    { text:'Review and update unit-specific policies or protocols if due', freq:'monthly', weight:2, category:'Compliance' },
  ];
  state.todoList = defaults.map((d,i) => ({
    ...d, id:'todo_default_'+i, done:{}, created: Date.now()-i*1000
  }));
  persistSave();
}

function initTodo() {
  seedDefaultTodos();
  renderTodo();
}

// ════════════════════════════════════
//  9-BOX TALENT MATRIX
// ════════════════════════════════════

// Grid layout: row=potential (3=high top, 1=low bottom), col=perf (1=low left, 3=high right)
// Cell [potential][perf]
const NINEBOX_CELLS = {
  '3-1': {
    label: 'Rough Diamond',
    icon: '💎',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.4)',
    accent: 'var(--amber2)',
    rnStrategies: [
      'Pair with a strong charge RN mentor for structured skill-building',
      'Identify specific clinical gaps (charting accuracy, prioritization) and create a 60-day improvement plan',
      'Assign lower-acuity patients initially; gradually increase complexity as confidence grows',
      'Schedule monthly 1:1 check-ins focused on clinical competency milestones',
      'Explore external training: ACLS, TNCC, or specialty certifications to build confidence',
    ],
    caStrategies: [
      'Pair with a high-performing CA as a day-shift buddy for hands-on guidance',
      'Set clear, measurable expectations: rounding frequency, response times, patient-assist techniques',
      'Review time management and task prioritization with a structured daily assignment checklist',
      'Celebrate small wins to build engagement and confidence',
      'Assess for learning barriers (literacy, language) and provide appropriate support resources',
    ],
  },
  '3-2': {
    label: 'High Potential',
    icon: '🚀',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.4)',
    accent: 'var(--green2)',
    rnStrategies: [
      'Fast-track for charge nurse or preceptor role — schedule charge shifts with oversight',
      'Involve in unit-based quality improvement or shared governance committees',
      'Sponsor enrollment in leadership development programs or BSN completion if applicable',
      'Assign a high-acuity or complex patient population to accelerate clinical mastery',
      'Create a formal development plan with 6-month and 1-year milestones toward promotion',
    ],
    caStrategies: [
      'Consider for lead CA or senior CA role on their primary shift',
      'Assign as orientation buddy for new CA hires — builds leadership and accountability',
      'Cross-train to additional areas (telemetry observation, 3C coverage, sitter assignments)',
      'Discuss career ladder: LPN school, patient care tech advancement, or health unit coordinator',
      'Recognize consistently at huddles and in annual review to reinforce engagement',
    ],
  },
  '3-3': {
    label: 'Star Performer',
    icon: '⭐',
    bg: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.6)',
    accent: 'var(--green2)',
    rnStrategies: [
      'Designate as unit champion (falls, HAPI prevention, stroke, scan compliance)',
      'Offer charge nurse, preceptor, or clinical educator opportunities',
      'Submit for hospital-wide recognition programs (DAISY Award, Employee of the Month)',
      'Involve in interviewing and selecting new RN candidates',
      'Discuss long-term career path: NP school, nurse manager pipeline, quality coordinator',
    ],
    caStrategies: [
      'Recognize formally — DAISY equivalent, unit bulletin board feature, director letter',
      'Assign most complex patient care tasks and charge CA responsibilities',
      'Involve in CA onboarding — develop their skills as a trainer and role model',
      'Discuss advancement: HUC certification, LPN program sponsorship, or shift lead role',
      'Use their feedback to refine CA workflows, rounding protocols, and assignment templates',
    ],
  },
  '2-1': {
    label: 'Inconsistent Player',
    icon: '🔄',
    bg: 'rgba(139,92,246,0.10)',
    border: 'rgba(139,92,246,0.35)',
    accent: 'var(--purple2)',
    rnStrategies: [
      'Conduct a candid 1:1 to understand root cause: personal, clinical, or engagement factors',
      'Set a 30/60/90-day performance improvement plan with specific measurable goals',
      'Monitor attendance, punctuality, and documentation completion weekly',
      'Pair with a supportive but structured preceptor for targeted skill refreshing',
      'Revisit unit expectations and individual role clarity — ensure alignment on standards',
    ],
    caStrategies: [
      'Schedule a non-punitive conversation to identify barriers: transportation, motivation, workload clarity',
      'Clarify assignment expectations in writing and review daily until consistency improves',
      'Track attendance and rounding completion for 30 days; review trends with employee',
      'Connect with Employee Assistance Program (EAP) if personal issues are contributing',
      'Set check-in schedule: weekly supervisor touchpoint for 60 days',
    ],
  },
  '2-2': {
    label: 'Core Contributor',
    icon: '💪',
    bg: 'rgba(30,41,59,0.6)',
    border: 'rgba(255,255,255,0.15)',
    accent: 'var(--accent2)',
    rnStrategies: [
      'Recognize reliability and consistency at huddle and in annual review',
      'Offer stretch assignments: float shifts, complex patients, or orientation support',
      'Discuss what would increase engagement — schedule preferences, unit projects, learning goals',
      'Encourage pursuit of specialty certification (PCCN, Med-Surg RN-BC)',
      'Ensure workload is equitable — consistent performers often carry hidden extra burden',
    ],
    caStrategies: [
      'Acknowledge dependability publicly and in writing — these staff anchor the unit culture',
      'Offer preferred scheduling or shift input as a retention lever',
      'Identify one growth area to focus on this quarter: new skill, additional cross-training, or soft skill',
      'Invite input on unit processes — experienced steady performers often have the best workflow insights',
      'Discuss long-term satisfaction: what would keep them thriving here for another 2-3 years?',
    ],
  },
  '2-3': {
    label: 'High Performer',
    icon: '🏅',
    bg: 'rgba(79,163,232,0.12)',
    border: 'rgba(79,163,232,0.4)',
    accent: 'var(--accent2)',
    rnStrategies: [
      'Formalize preceptor or charge nurse role if not already designated',
      'Nominate for hospital-based clinical ladder advancement',
      'Involve in policy review or evidence-based practice initiatives',
      'Use their expertise to mentor newer staff on documentation, prioritization, and clinical reasoning',
      'Ensure compensation and scheduling reflect their contribution — risk of lateral departure is real',
    ],
    caStrategies: [
      'Leverage for complex assignments: 1:1 sitter, post-op monitoring, or high-acuity CA support',
      'Recognize at department level — share their performance data with director',
      'Discuss advancement pathway if they have not already: LPN or HUC programs, shift lead',
      'Cross-train to maximize flexibility and keep them engaged with variety',
      'Be proactive about retention conversations — these staff are often recruited away',
    ],
  },
  '1-1': {
    label: 'Under Performer',
    icon: '⚠️',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.4)',
    accent: 'var(--red2)',
    rnStrategies: [
      'Initiate formal Performance Improvement Plan (PIP) with HR involvement',
      'Document all competency concerns, attendance issues, and corrective conversations',
      'Assess for patient safety implications — consider temporary assignment adjustment if needed',
      'Identify if issue is skill (trainable) or will (motivational) — plan differs for each',
      'Set a clear decision timeline: measurable improvement by X date or escalation to next step',
    ],
    caStrategies: [
      'Meet with HR to review corrective action options and documentation requirements',
      'Clearly document specific performance deficiencies with dates, times, and observed behaviors',
      'Determine if this is a training gap (provide support) or conduct issue (follow discipline policy)',
      'Set a 30-day intensive improvement plan with weekly supervisor check-ins',
      'Protect team morale — peers notice underperformance; consistent standards matter',
    ],
  },
  '1-2': {
    label: 'Solid Performer',
    icon: '✅',
    bg: 'rgba(6,182,212,0.10)',
    border: 'rgba(6,182,212,0.3)',
    accent: 'var(--teal2)',
    rnStrategies: [
      'Affirm their value — solid performers at this stage often underestimate their own growth',
      'Offer targeted clinical development: specialty cert, additional unit exposure, or committee work',
      'Explore what motivates them: schedule stability, skill growth, or recognition',
      'Position as a reliable resource for newer staff without overloading them',
      'Discuss a 1-year goal that slightly stretches their current comfort zone',
    ],
    caStrategies: [
      'Acknowledge their reliability and consistency in formal and informal settings',
      'Offer expanded responsibilities: float assignments, new-hire buddy, or shift lead support',
      'Ask them what would make the job more engaging or rewarding',
      'Keep an eye for potential upward movement — some solid performers become stars with encouragement',
      'Ensure they feel seen and appreciated; quiet consistent workers risk quiet quitting if overlooked',
    ],
  },
  '1-3': {
    label: 'Seasoned Expert',
    icon: '🔑',
    bg: 'rgba(79,163,232,0.08)',
    border: 'rgba(79,163,232,0.3)',
    accent: 'var(--accent2)',
    rnStrategies: [
      'Leverage expertise as a unit knowledge base — involve in onboarding curriculum and skills days',
      'Have a frank, respectful conversation about future career direction and retirement timeline',
      'Protect against disengagement — offer meaningful work: charge coverage, QI project, policy review',
      'Explore knowledge-transfer opportunities: formal preceptorship, written protocols, simulation',
      'Be thoughtful about scheduling: these staff may have unique needs that deserve flexible accommodation',
    ],
    caStrategies: [
      'Honor their institutional knowledge — involve them in new CA orientation as subject matter experts',
      'Discuss retirement planning horizon openly; begin cross-training others to absorb critical tasks',
      'Avoid over-relying on them to fill gaps — protect from burnout given their likely long tenure',
      'Recognize longevity formally: years of service acknowledgment, reference letter, or leadership shout-out',
      'Explore a phased workload reduction if appropriate to retain them longer at reduced capacity',
    ],
  },
};

// Map perf(1-3) + potential(1-3) to cell key
function nineBoxKey(perf, potential) { return potential + '-' + perf; }

// Get role filter
function nineBoxRole() {
  const sel = document.getElementById('ninebox-role-filter');
  return sel ? sel.value : 'RN';
}

// Staff eligible for current view
function nineBoxStaff() {
  const role = nineBoxRole();
  return MASTER_STAFF.filter(s => role === 'RN' ? (s.job === 'RN' || s.job === 'LPN') : s.job === 'CA');
}

function renderNineBox() {
  const grid = document.getElementById('ninebox-grid');
  const unassigned = document.getElementById('ninebox-unassigned');
  if (!grid || !unassigned) return;

  const nb = state.nineBox || {};
  const role = nineBoxRole();
  const staffList = nineBoxStaff();
  const assignedNames = new Set(
    staffList.filter(s => nb[s.name] && nb[s.name].perf && nb[s.name].potential).map(s => s.name)
  );

  // Render grid: 3 rows (potential 3→1 top to bottom) × 3 cols (perf 1→3)
  let gridHtml = '';
  for (let pot = 3; pot >= 1; pot--) {
    for (let perf = 1; perf <= 3; perf++) {
      const key = nineBoxKey(perf, pot);
      const cell = NINEBOX_CELLS[key];
      const cellStaff = staffList.filter(s => {
        const p = nb[s.name];
        return p && p.perf === perf && p.potential === pot;
      });

      const chips = cellStaff.map(s => {
        const initials = s.name.split(',').map(p=>p.trim()[0]||'').join('');
        const jobCol = s.job==='RN'?'var(--accent2)':s.job==='LPN'?'var(--purple2)':'var(--teal2)';
        const isAuto = nb[s.name] && nb[s.name].auto;
        const dbg = nb[s.name] && nb[s.name].debug;
        const tooltip = dbg
          ? `${s.name} | Perf:${dbg.perfRaw} Pot:${dbg.potScore} | Attend:${dbg.attendScore} Qual:${dbg.qualScore} Inc:${dbg.incidentScore||'—'} | Callouts:${dbg.callouts} WU:${dbg.writeUps} | Falls:${dbg.staffFalls||0} HAPIs:${dbg.staffHAPIs||0} MissedTx:${dbg.staffMissedTx||0} | Scan:${dbg.scanPct!==null?dbg.scanPct+'%':'—'} Pain:${dbg.painPct!==null?dbg.painPct+'%':'—'}`
          : s.name + ' — click to move/remove';
        return `<span onclick="nineBoxMoveStaff('${s.name.replace(/'/g,"\\'")}',${perf},${pot})"
          title="${tooltip}"
          style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:2px 8px 2px 4px;cursor:pointer;font-size:10px;color:var(--white);white-space:nowrap;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          <span style="width:18px;height:18px;border-radius:50%;background:${jobCol};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</span>
          ${s.name.split(',')[0]}${isAuto?'<span style="font-size:7px;color:var(--text3);margin-left:2px;">⚡</span>':''}
        </span>`;
      }).join('');

      gridHtml += `
        <div onclick="openNineBoxModal(${perf},${pot})"
          style="background:${cell.bg};border:1px solid ${cell.border};border-radius:8px;padding:10px;cursor:pointer;display:flex;flex-direction:column;gap:6px;transition:border-color 0.15s;position:relative;overflow:hidden;"
          onmouseover="this.style.borderColor='${cell.accent}'" onmouseout="this.style.borderColor='${cell.border}'">
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:14px;">${cell.icon}</span>
            <div>
              <div style="font-size:10px;font-weight:700;color:${cell.accent};line-height:1.2;">${cell.label}</div>
              <div style="font-size:9px;color:var(--text3);">${cellStaff.length} staff</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;flex:1;align-content:flex-start;" onclick="event.stopPropagation()">
            ${chips || '<div style="font-size:9px;color:var(--text3);font-style:italic;padding:4px 0;">Click to assign</div>'}
          </div>
        </div>`;
    }
  }
  grid.innerHTML = gridHtml;

  // Unassigned pool
  const unassignedStaff = staffList.filter(s => !assignedNames.has(s.name));
  unassigned.innerHTML = unassignedStaff.length === 0
    ? '<span style="font-size:11px;color:var(--green2);">✓ All staff assigned</span>'
    : unassignedStaff.map(s => {
        const jobCol = s.job==='RN'?'var(--accent2)':s.job==='LPN'?'var(--purple2)':'var(--teal2)';
        const initials = s.name.split(',').map(p=>p.trim()[0]||'').join('');
        return `<span onclick="nineBoxQuickAssign('${s.name.replace(/'/g,"\\'")}',this)"
          title="Click to quick-assign ${s.name}"
          style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:12px;padding:2px 8px 2px 4px;cursor:pointer;font-size:10px;color:var(--text2);"
          onmouseover="this.style.borderColor=\'var(--accent2)\'" onmouseout="this.style.borderColor=\'var(--border)\'">
          <span style="width:18px;height:18px;border-radius:50%;background:${jobCol};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</span>
          ${s.name.split(',')[0]}${s.job==='LPN'?' (LPN)':''}
        </span>`;
      }).join('');
}

let _nineBoxModalPerf = 2, _nineBoxModalPot = 2;

function openNineBoxModal(perf, pot) {
  _nineBoxModalPerf = perf;
  _nineBoxModalPot = pot;
  const key = nineBoxKey(perf, pot);
  const cell = NINEBOX_CELLS[key];
  const role = nineBoxRole();
  const nb = state.nineBox || {};
  const staffList = nineBoxStaff();
  const strategies = role === 'RN' ? cell.rnStrategies : cell.caStrategies;

  document.getElementById('ninebox-modal-title').textContent = cell.icon + ' ' + cell.label;
  document.getElementById('ninebox-modal-subtitle').textContent =
    'Performance: ' + ['','Low','Moderate','High'][perf] + ' · Potential: ' + ['','Low','Moderate','High'][pot];

  document.getElementById('ninebox-modal-strategy').innerHTML =
    '<div style="font-size:10px;font-weight:700;color:var(--accent2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Development Strategies</div>' +
    strategies.map(s => `<div style="display:flex;gap:6px;margin-bottom:5px;"><span style="color:var(--accent2);flex-shrink:0;">→</span><span>${s}</span></div>`).join('');

  // Staff chips — show all role-eligible staff, highlight those currently in this cell
  const yr = (document.getElementById('ninebox-yr') || {value: new Date().getFullYear()}).value || new Date().getFullYear();
  const staffHtml = staffList.map(s => {
    const p = nb[s.name];
    const inCell = p && p.perf === perf && p.potential === pot;
    const jobCol = s.job==='RN'?'var(--accent2)':s.job==='LPN'?'var(--purple2)':'var(--teal2)';
    const initials = s.name.split(',').map(x=>x.trim()[0]||'').join('');
    const score = nineBoxScoreStaff(s.name, s.job, parseInt(yr));
    const d = score.debug;
    const scanStr  = d.scanPct  !== null ? d.scanPct+'%'  : '—';
    const painStr  = d.painPct  !== null ? d.painPct+'%'  : '—';
    const txStr    = d.txPct    !== null ? d.txPct+'%'    : '—';
    const scoreHtml = `<div style="font-size:9px;color:var(--text3);margin-top:2px;display:flex;flex-wrap:wrap;gap:4px;">
      <span title="Attendance score">📅${d.attendScore}</span>
      <span title="Quality score">💉${d.qualScore}</span>
      <span title="Callouts">⛔${d.callouts}co</span>
      ${d.writeUps>0?`<span style="color:var(--red2);">✍${d.writeUps}wu</span>`:''}
      ${d.scanPct!==null?`<span>Scan:${scanStr}</span>`:''}
      ${d.painPct!==null?`<span>Pain:${painStr}</span>`:''}
      ${d.txPct!==null?`<span>Tx:${txStr}</span>`:''}
      <span title="Current auto-score">→P${score.perf}/Pt${score.potential}</span>
    </div>`;
    return `<div onclick="nineBoxToggle('${s.name.replace(/'/g,"\\'")}',${perf},${pot},this)"
      style="display:flex;align-items:flex-start;gap:6px;border-radius:7px;padding:5px 8px;cursor:pointer;border:1px solid;transition:all 0.15s;margin-bottom:4px;
      ${inCell
        ? `background:${cell.bg};border-color:${cell.accent};`
        : 'background:rgba(255,255,255,0.03);border-color:var(--border);'}">
      <span style="width:22px;height:22px;border-radius:50%;background:${jobCol};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--navy);flex-shrink:0;margin-top:1px;">${initials}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:600;color:${inCell?'var(--white)':'var(--text2)'};">
          ${s.name.split(',')[0]}, ${s.name.split(',')[1]||''}${s.job==='LPN'?' <span style="font-size:9px;color:var(--purple2);">LPN</span>':''}
          ${inCell?'<span style="font-size:10px;color:var(--green2);margin-left:4px;">✓</span>':''}
        </div>
        ${scoreHtml}
      </div>
    </div>`;
  }).join('');

  document.getElementById('ninebox-modal-staff').innerHTML = staffHtml;
  document.getElementById('ninebox-modal').style.display = 'flex';
}

function closeNineBoxModal() {
  document.getElementById('ninebox-modal').style.display = 'none';
  renderNineBox();
}

function nineBoxToggle(name, perf, pot, el) {
  if (!state.nineBox) state.nineBox = {};
  const p = state.nineBox[name];
  const inCell = p && p.perf === perf && p.potential === pot;
  if (inCell) {
    delete state.nineBox[name];
  } else {
    // Manual override — clear auto flag so ⚡ badge goes away
    state.nineBox[name] = { perf, potential: pot, auto: false };
  }
  persistSave();
  openNineBoxModal(perf, pot);
}

function nineBoxMoveStaff(name, perf, pot) {
  // Clicking a chip on the grid: open modal for that cell so they can move/remove
  openNineBoxModal(perf, pot);
}

function nineBoxQuickAssign(name) {
  // Opens the core performer cell (2,2) by default for quick assign
  openNineBoxModal(2, 2);
}

function nineBoxClearAll() {
  const role = nineBoxRole();
  const staffList = nineBoxStaff();
  if (!confirm('Clear all ' + (role==='RN'?'RN/LPN':'CA') + ' placements from the 9-box?')) return;
  if (!state.nineBox) state.nineBox = {};
  staffList.forEach(s => delete state.nineBox[s.name]);
  persistSave();
  renderNineBox();
}

// ── 9-Box Auto-Score Engine ──

function nineBoxScoreStaff(name, job, yr) {
  yr = yr || new Date().getFullYear();

  // ── ATTENDANCE ──
  const log = (state.absenceLog[name] || []).filter(e =>
    new Date(e.date + 'T12:00:00').getFullYear() === yr
  );
  const callouts  = log.filter(e => e.type !== 'tardy' && e.type !== 'TARDY').length;
  const tardies   = log.filter(e => e.type === 'tardy' || e.type === 'TARDY').length;
  const writeUps  = log.filter(e => e.writeUp).length;

  // ── QUALITY METRICS (RN/LPN only — CAs don't have scan/pain/tx data) ──
  let scanPct = null, painPct = null, txPct = null;
  if (job === 'RN' || job === 'LPN') {
    let tS = 0, tST = 0, tP = 0, tPT = 0, tTx = 0, tTxD = 0;
    for (let m = 1; m <= 12; m++) {
      const key = yr + '-' + String(m).padStart(2, '0');
      const q = (state.qualityData[name] || {})[key] || {};
      tS  += q.scans       || 0; tST += q.scanTotal  || 0;
      tP  += q.pain        || 0; tPT += q.painTotal  || 0;
      tTx += q.transfusions|| 0; tTxD+= q.txDen      || 0;
    }
    if (tST  > 0) scanPct = Math.round(tS  / tST  * 100);
    if (tPT  > 0) painPct = Math.round(tP  / tPT  * 100);
    if (tTxD > 0) txPct   = Math.round(tTx / tTxD * 100);
  }

  // PLATO fall & HAPI prevention rounding compliance — now captures RN/LPN (primary/second
  // nurse) AND CA/PCT/EMA staff, since rounds are jointly attributed to everyone assigned
  const frStats = getFallRoundStats(name, yr);
  const hrStats = getHapiRoundStats(name, yr);
  const platoFallPct = frStats.pct;
  const platoHapiPct = hrStats.pct;

  // ── PER-STAFF INCIDENTS (falls, HAPIs, missed transfusions) ──
  const si = ((state.staffIncidents || {})[name]) || {};
  const filterIncByYr = (arr) => (arr || []).filter(e =>
    new Date(e.date+'T12:00:00').getFullYear() === yr
  );
  const staffFalls    = filterIncByYr(si.falls).length;
  const staffHAPIs    = filterIncByYr(si.hapis).length;
  const staffMissedTx = filterIncByYr(si.missedTx).length;
  const staffWU       = filterIncByYr(si.writeups).length + writeUps; // manual + absence-derived

  // ── UNIT-LEVEL FALLS & HAPIs (fallback when no per-staff data exists) ──
  let totFalls = 0, totHAPIs = 0;
  for (let m = 1; m <= 12; m++) {
    const key = yr + '-' + String(m).padStart(2, '0');
    const sk = state.strokeKPI[key] || {};
    totFalls += parseInt(sk.falls) || 0;
    totHAPIs += parseInt(sk.hapis) || 0;
  }
  // Use per-staff data when available; fall back to shared unit-level metric
  const hasPerStaffIncidents = staffFalls > 0 || staffHAPIs > 0 || staffMissedTx > 0;
  const effectiveFalls    = hasPerStaffIncidents ? staffFalls    : 0;
  const effectiveHAPIs    = hasPerStaffIncidents ? staffHAPIs    : 0;

  // ── SCORE: PERFORMANCE (weighted 0-100 → mapped to 1-3) ──
  // Attendance component (35% weight)
  let attendScore = 100;
  attendScore -= callouts  * 12;
  attendScore -= tardies   *  5;
  attendScore -= writeUps  * 20;
  attendScore = Math.max(0, Math.min(100, attendScore));

  // Quality component (RN/LPN: scan/pain/tx + PLATO rounding; CA: PLATO rounding only, else neutral 70)
  let qualScore = 70;
  const platoGoal = 90;
  if (job === 'RN' || job === 'LPN') {
    const goals = state.unitGoals || {};
    const scanGoal = goals.scanTarget || 95;
    const painGoal = goals.painTarget || 90;
    const txGoal   = 95;
    let q = 0, qCount = 0;
    if (scanPct  !== null) { q += Math.min(100, (scanPct  / scanGoal) * 100); qCount++; }
    if (painPct  !== null) { q += Math.min(100, (painPct  / painGoal) * 100); qCount++; }
    if (txPct    !== null) { q += Math.min(100, (txPct    / txGoal)   * 100); qCount++; }
    if (platoFallPct !== null) { q += Math.min(100, (platoFallPct / platoGoal) * 100); qCount++; }
    if (platoHapiPct !== null) { q += Math.min(100, (platoHapiPct / platoGoal) * 100); qCount++; }
    qualScore = qCount > 0 ? q / qCount : 70;
    // Missed transfusion penalty (per-staff)
    if (staffMissedTx > 0) qualScore = Math.max(0, qualScore - staffMissedTx * 10);
  } else if (job === 'CA') {
    // CAs don't have scan/pain/tx data, but do participate in PLATO rounds
    let q = 0, qCount = 0;
    if (platoFallPct !== null) { q += Math.min(100, (platoFallPct / platoGoal) * 100); qCount++; }
    if (platoHapiPct !== null) { q += Math.min(100, (platoHapiPct / platoGoal) * 100); qCount++; }
    qualScore = qCount > 0 ? q / qCount : 70;
  }

  // Per-staff incident penalty (25% weight)
  let incidentScore = 100;
  incidentScore -= effectiveFalls    * 15;  // -15 pts per patient fall
  incidentScore -= effectiveHAPIs    * 20;  // -20 pts per HAPI (more serious)
  incidentScore -= staffMissedTx     * 10;  // -10 pts per missed transfusion
  incidentScore -= staffWU           * 15;  // -15 pts per write-up (total)
  incidentScore = Math.max(0, Math.min(100, incidentScore));

  // Unit-level safety context if no per-staff data (shared penalty, smaller weight)
  const unitSafetyPenalty = hasPerStaffIncidents ? 0 :
    (totFalls >= 5 ? 10 : totFalls >= 3 ? 5 : 0) +
    (totHAPIs >= 3 ? 10 : totHAPIs >= 1 ? 5 : 0);
  const unitSafetyScore = Math.max(0, 100 - unitSafetyPenalty);

  const perfRaw = hasPerStaffIncidents
    ? (attendScore * 0.35) + (qualScore * 0.40) + (incidentScore * 0.25)
    : (attendScore * 0.40) + (qualScore * 0.45) + (unitSafetyScore * 0.15);
  const perf = perfRaw >= 80 ? 3 : perfRaw >= 55 ? 2 : 1;

  // ── SCORE: POTENTIAL (weighted 0-100 → mapped to 1-3) ──
  // Indicators: low callouts, no write-ups, certs current, improving trend
  let potScore = 70; // start neutral

  // Attendance reliability boosts potential
  if (callouts === 0) potScore += 20;
  else if (callouts <= 2) potScore += 10;
  else if (callouts >= 6) potScore -= 20;

  if (writeUps === 0 && staffWU === 0) potScore += 10;
  else potScore -= staffWU * 15;

  // Cert compliance (having all certs current signals professionalism)
  const certs = state.certs[name] || {};
  const certKeys = ['BLS', 'ACLS', 'NIHSS', 'License', 'HealthEval', 'FitTest'];
  const validCerts = certKeys.filter(k => {
    if (!certs[k]) return false;
    const exp = parseDate(certs[k]);
    return exp && exp > new Date();
  });
  const relevantCerts = job === 'RN'
    ? certKeys.filter(k => k !== 'NIHSS' || true) // all apply
    : ['BLS', 'HealthEval', 'FitTest'];
  const certRatio = relevantCerts.length > 0
    ? validCerts.filter(k => relevantCerts.includes(k)).length / relevantCerts.length
    : 0.5;
  potScore += (certRatio - 0.5) * 20; // ±10 pts

  // Custom cert compliance
  [1,2,3,4,5].forEach(n => {
    const lbl = certs['custom'+n+'_label'];
    const dt  = certs['custom'+n+'_date'];
    if (lbl && dt) {
      const exp = parseDate(dt);
      if (exp && exp > new Date()) potScore += 3;
      else if (exp) potScore -= 5;
    }
  });

  potScore = Math.max(0, Math.min(100, potScore));
  const potential = potScore >= 75 ? 3 : potScore >= 45 ? 2 : 1;

  return {
    perf, potential,
    debug: {
      attendScore: Math.round(attendScore),
      qualScore:   Math.round(qualScore),
      incidentScore: Math.round(incidentScore),
      perfRaw:     Math.round(perfRaw),
      potScore:    Math.round(potScore),
      callouts, tardies, writeUps: staffWU,
      scanPct, painPct, txPct,
      staffFalls, staffHAPIs, staffMissedTx,
      totFalls, totHAPIs,
      platoFallPct, platoHapiPct,
      certRatio:   Math.round(certRatio * 100),
    }
  };
}

function nineBoxAutoAssign(role, yr) {
  role = role || nineBoxRole();
  yr   = yr   || new Date().getFullYear();
  const staffList = MASTER_STAFF.filter(s =>
    role === 'RN' ? (s.job === 'RN' || s.job === 'LPN') : s.job === 'CA'
  );
  if (!state.nineBox) state.nineBox = {};
  staffList.forEach(s => {
    const score = nineBoxScoreStaff(s.name, s.job, yr);
    state.nineBox[s.name] = { perf: score.perf, potential: score.potential, auto: true, debug: score.debug };
  });
  persistSave();
  renderNineBox();
}

function initNineBox() {
  // Populate year dropdown (current year ± 2)
  const yrSel = document.getElementById('ninebox-yr');
  if (yrSel && yrSel.options.length === 0) {
    const curYr = new Date().getFullYear();
    for (let y = curYr - 1; y <= curYr + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      if (y === curYr) opt.selected = true;
      yrSel.appendChild(opt);
    }
  }
  // Auto-assign both role groups on first load if nothing saved yet
  const hasData = Object.keys(state.nineBox || {}).length > 0;
  if (!hasData) {
    nineBoxAutoAssign('RN');
    nineBoxAutoAssign('CA');
  }
  if (document.getElementById('panel-ninebox')?.style.display !== 'none') renderNineBox();
}

// ════════════════════════════════════
//  STAFF INCIDENT TRACKER
// ════════════════════════════════════

const INC_TYPES = {
  falls:       { label:'Patient Fall',        icon:'🚶', color:'var(--amber2)',  bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.35)' },
  hapis:       { label:'HAPI',                icon:'🩹', color:'var(--red2)',    bg:'rgba(239,68,68,0.10)',   border:'rgba(239,68,68,0.35)'  },
  missedTx:    { label:'Missed Transfusion',  icon:'🩸', color:'var(--purple2)', bg:'rgba(139,92,246,0.10)', border:'rgba(139,92,246,0.35)' },
  scanning:    { label:'Missed Barcode Scan', icon:'💊', color:'var(--accent2)', bg:'rgba(79,163,232,0.10)', border:'rgba(79,163,232,0.3)'  },
  painReassess:{ label:'Pain Reassessment',   icon:'💔', color:'var(--teal2)',   bg:'rgba(6,182,212,0.08)',  border:'rgba(6,182,212,0.3)'   },
  writeups:    { label:'Write-Up',            icon:'✍️', color:'var(--amber2)', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.2)'  },
};

function incidentYear() {
  const el = document.getElementById('inc-year-filter');
  return el ? parseInt(el.value) || new Date().getFullYear() : new Date().getFullYear();
}

function staffIncidentData(name) {
  if (!state.staffIncidents) state.staffIncidents = {};
  if (!state.staffIncidents[name]) state.staffIncidents[name] = { falls:[], hapis:[], missedTx:[], scanning:[], painReassess:[], writeups:[] };
  return state.staffIncidents[name];
}

function incidentCountYTD(name, type) {
  const yr = incidentYear();
  const data = (state.staffIncidents || {})[name];
  if (!data || !data[type]) return 0;
  return data[type].filter(e => new Date(e.date + 'T12:00:00').getFullYear() === yr).length;
}

// Manual write-ups only (automated absence-log write-ups excluded from this tracker)
function writeupCountYTD(name) {
  return incidentCountYTD(name, 'writeups');
}

function initIncidents() {
  // Populate year dropdown
  const yrSel = document.getElementById('inc-year-filter');
  if (yrSel && yrSel.options.length === 0) {
    const cur = new Date().getFullYear();
    for (let y = cur - 1; y <= cur + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      if (y === cur) opt.selected = true;
      yrSel.appendChild(opt);
    }
  }
  // Set default date to today
  const dateEl = document.getElementById('inc-date');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];

  // Populate staff datalist
  const dl = document.getElementById('inc-staff-list');
  if (dl) {
    dl.innerHTML = MASTER_STAFF.map(s => `<option value="${s.name}">`).join('');
  }
  // Only render if the incidents panel is currently visible
  if (document.getElementById('panel-incidents')?.style.display !== 'none') {
    renderIncidents();
  }
}

function logIncident() {
  const name = document.getElementById('inc-name')?.value?.trim();
  const type = document.getElementById('inc-type')?.value;
  const date = document.getElementById('inc-date')?.value;
  const note = (document.getElementById('inc-note')?.value || '').trim();

  if (!name) { alert('Please enter a staff member name.'); return; }
  if (!date) { alert('Please select a date.'); return; }
  if (!MASTER_STAFF.find(s => s.name === name) && !state.customStaff.find(s => s.name === name)) {
    if (!confirm(`"${name}" is not in the directory. Log anyway?`)) return;
  }

  const data = staffIncidentData(name);
  data[type].push({ date, note, ts: Date.now(), talked: false });
  data[type].sort((a, b) => b.date.localeCompare(a.date));

  // Clear form fields (keep name/type/date for rapid multi-logging)
  const noteEl = document.getElementById('inc-note');
  if (noteEl) noteEl.value = '';

  persistSave();
  renderIncidents();
}

function deleteIncident(name, type, ts) {
  if (!state.staffIncidents?.[name]?.[type]) return;
  state.staffIncidents[name][type] = state.staffIncidents[name][type].filter(e => e.ts !== ts);
  persistSave();
  renderIncidents();
}

// Toggle "spoken with employee" flag on a write-up entry
function toggleWriteupTalked(name, ts) {
  const entry = (state.staffIncidents?.[name]?.writeups || []).find(e => e.ts === ts);
  if (!entry) return;
  entry.talked = !entry.talked;
  persistSave();
  renderIncidents();
}

// All manual write-ups across all staff that the manager has not yet marked as discussed
function pendingWriteupTalks() {
  const out = [];
  Object.entries(state.staffIncidents || {}).forEach(([name, data]) => {
    (data.writeups || []).forEach(e => {
      if (!e.talked) out.push({ name, date: e.date, note: e.note, ts: e.ts });
    });
  });
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function renderIncidents() {
  const roleFilter = (document.getElementById('inc-role-filter')?.value) || 'ALL';
  const typeFilter = (document.getElementById('inc-type-filter')?.value) || 'ALL';
  const yr         = incidentYear();

  // Filter staff
  let staffList = MASTER_STAFF.slice();
  if (roleFilter === 'RN') staffList = staffList.filter(s => s.job === 'RN' || s.job === 'LPN');
  else if (roleFilter === 'CA') staffList = staffList.filter(s => s.job === 'CA');

  // Build per-staff incident counts for the selected year
  const staffData = staffList.map(s => {
    const si = (state.staffIncidents || {})[s.name] || {};
    const filterByYr = (arr) => (arr || []).filter(e => new Date(e.date+'T12:00:00').getFullYear() === yr);
    const falls    = filterByYr(si.falls);
    const hapis    = filterByYr(si.hapis);
    const missedTx = filterByYr(si.missedTx);
    const scanning = filterByYr(si.scanning);
    const painReassess = filterByYr(si.painReassess);
    const manualWU = filterByYr(si.writeups);
    const allWU    = manualWU.slice().sort((a, b) => b.date.localeCompare(a.date));

    return { ...s, falls, hapis, missedTx, scanning, painReassess, writeups: allWU,
      total: falls.length + hapis.length + missedTx.length + scanning.length + painReassess.length + allWU.length };
  });

  // Summary bar
  const sumEl = document.getElementById('inc-summary');
  if (sumEl) {
    const totals = { falls:0, hapis:0, missedTx:0, writeups:0 };
    staffData.forEach(s => {
      totals.falls    += s.falls.length;
      totals.hapis    += s.hapis.length;
      totals.missedTx += s.missedTx.length;
      totals.writeups += s.writeups.length;
    });
    sumEl.innerHTML = Object.entries(INC_TYPES).map(([k, t]) =>
      `<div style="display:flex;align-items:center;gap:8px;background:${t.bg};border:1px solid ${t.border};border-radius:6px;padding:8px 14px;">
        <span style="font-size:18px;">${t.icon}</span>
        <div>
          <div style="font-size:20px;font-weight:700;color:${t.color};line-height:1;">${totals[k]}</div>
          <div style="font-size:10px;color:var(--text3);">${t.label}s — ${yr}</div>
        </div>
      </div>`
    ).join('');
  }

  // Filter to staff with incidents if a type filter is active
  let displayStaff = staffData;
  if (typeFilter !== 'ALL') {
    displayStaff = displayStaff.filter(s => s[typeFilter].length > 0);
  } else {
    displayStaff = displayStaff.filter(s => s.total > 0);
  }
  displayStaff.sort((a, b) => b.total - a.total);

  const tableEl = document.getElementById('inc-table');
  if (!tableEl) return;

  if (displayStaff.length === 0) {
    tableEl.innerHTML = `<div style="text-align:center;padding:50px;color:var(--text3);">
      <div style="font-size:32px;margin-bottom:10px;">✅</div>
      <div style="font-size:13px;color:var(--white);margin-bottom:4px;">No incidents logged${typeFilter !== 'ALL' ? ' for ' + INC_TYPES[typeFilter].label : ''}</div>
      <div style="font-size:11px;">Use the form above to log a fall, HAPI, missed transfusion, or write-up.</div>
    </div>`;
    return;
  }

  const typesToShow = typeFilter === 'ALL'
    ? ['falls','hapis','missedTx','scanning','painReassess','writeups']
    : [typeFilter];

  tableEl.innerHTML = displayStaff.map(s => {
    const jobCol = s.job==='RN'?'var(--accent2)':s.job==='LPN'?'var(--purple2)':s.job==='CA'?'var(--teal2)':'var(--text3)';
    const initials = s.name.split(',').map(p=>p.trim()[0]||'').join('');

    const incidentRows = typesToShow.map(type => {
      const t = INC_TYPES[type];
      const incidents = s[type];
      if (!incidents.length) return '';
      return incidents.map(e => {
        const dateLabel = new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        const fromAbs = e.fromAbsence ? ' <span style="font-size:9px;color:var(--text3);">(from absence log)</span>' : '';
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:6px 10px;white-space:nowrap;">
            <span style="background:${t.bg};border:1px solid ${t.border};border-radius:4px;padding:2px 7px;font-size:10px;color:${t.color};">${t.icon} ${t.label}</span>
          </td>
          <td style="padding:6px 10px;font-size:11px;color:var(--text2);">${dateLabel}</td>
          <td style="padding:6px 10px;font-size:11px;color:var(--text3);">${e.note||'—'}${fromAbs}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap;">
            ${type === 'writeups' && !e.fromAbsence ? `<button onclick="toggleWriteupTalked('${s.name.replace(/'/g,"\\'")}',${e.ts})"
              style="background:${e.talked?'rgba(22,163,74,0.15)':'rgba(245,158,11,0.15)'};border:1px solid ${e.talked?'var(--green2)':'var(--amber2)'};color:${e.talked?'var(--green2)':'var(--amber2)'};border-radius:4px;padding:2px 8px;font-size:9px;font-weight:700;cursor:pointer;margin-right:8px;"
              title="Toggle whether you've spoken with this employee about the write-up">${e.talked?'✓ Discussed':'⏳ Needs Talk'}</button>` : ''}
            ${!e.fromAbsence ? `<button onclick="deleteIncident('${s.name.replace(/'/g,"\\'")}','${type}',${e.ts})"
              style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;" title="Remove"
              onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>` : ''}
          </td>
        </tr>`;
      }).join('');
    }).join('');

    const badges = typesToShow.map(type => {
      const count = s[type].length;
      if (!count) return '';
      const t = INC_TYPES[type];
      return `<span style="background:${t.bg};border:1px solid ${t.border};border-radius:10px;padding:1px 8px;font-size:10px;color:${t.color};">${t.icon} ${count} ${t.label}${count>1?'s':''}</span>`;
    }).filter(Boolean).join('');

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.04);border-bottom:1px solid var(--border);">
        <div style="width:32px;height:32px;border-radius:50%;background:${jobCol};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${s.name}</div>
          <div style="font-size:10px;color:${jobCol};">${s.job}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${badges}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${incidentRows}</tbody>
      </table>
    </div>`;
  }).join('');
}

// ════════════════════════════════════
//  INTERVIEW TAB
// ════════════════════════════════════

const IV_STATUS_CFG = {
  'Scheduled':      { color:'var(--accent2)',  bg:'rgba(79,163,232,0.12)',  border:'rgba(79,163,232,0.35)'  },
  'Completed':      { color:'var(--amber2)',   bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)'  },
  'Offer Extended': { color:'var(--purple2)',  bg:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.35)'  },
  'Hired':          { color:'var(--green2)',   bg:'rgba(37,168,104,0.15)', border:'rgba(37,168,104,0.4)'   },
  'Not Selected':   { color:'var(--text3)',    bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.1)'  },
};

const IV_ROLE_COLOR = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)', UC:'var(--amber2)', Other:'var(--text2)' };

// Rubric categories — scored 1-5 per question. Role-specific question sets for
// RN / LPN / CA (3B Tele Med-Surg / Stroke Telemetry, 3C flex/triad). Falls back
// to IV_RUBRIC_DEFAULT for UC / Other candidates.
const IV_RUBRIC_BY_ROLE = {
  RN: [
    {
      section: 'Clinical Competency',
      icon: '🩺',
      items: [
        { key:'rn_prioritization',      label:'Prioritization & Triage',            prompt:'Walk me through how you would prioritize care for a 5-patient assignment if two patients are due for meds, one is a new stroke rule-out just back from CT, and one call light has been on for 5 minutes.' },
        { key:'rn_stroke_scale',        label:'NIHSS / Stroke Assessment',          prompt:'What are the key components of an NIH Stroke Scale assessment, and how often would you reassess a patient in the acute post-stroke window?' },
        { key:'rn_telemetry',           label:'Cardiac Telemetry Knowledge',        prompt:'Describe your experience with cardiac telemetry monitoring — what rhythm changes would prompt you to notify the provider immediately?' },
        { key:'rn_fall_risk',           label:'Fall Risk Intervention',             prompt:'A patient on your unit is a fall risk and has attempted to get up unassisted twice this shift. Walk me through your interventions.' },
        { key:'rn_med_safety',          label:'Medication Safety & Reconciliation', prompt:'How do you approach medication reconciliation and double-checks for high-alert medications (e.g., anticoagulants, insulin)?' },
        { key:'rn_deterioration',       label:'Recognizing Deterioration',          prompt:'Tell me about a time you identified early signs of patient deterioration. What did you do, and what was the outcome?' },
        { key:'rn_tpa',                 label:'tPA / Thrombolytic Protocol',        prompt:'What is your experience with thrombolytic (tPA) administration or post-tPA monitoring protocols?' },
        { key:'rn_order_discrepancy',   label:'Clinical Judgment vs. Orders',       prompt:'How do you handle a discrepancy between a physician\'s order and what you believe is clinically appropriate for the patient?' },
      ],
    },
    {
      section: 'Communication & Teamwork',
      icon: '🤝',
      items: [
        { key:'rn_delegation',          label:'Delegation to LPN / CA',             prompt:'Describe how you delegate tasks to LPNs and CAs on your team. How do you decide what to delegate?' },
        { key:'rn_feedback',            label:'Giving Feedback',                    prompt:'Tell me about a time you had to give an LPN or CA feedback about their performance. How did you approach it?' },
        { key:'rn_handoff',             label:'Handoff Communication',              prompt:'How do you communicate handoff information to the oncoming shift to ensure continuity of care?' },
        { key:'rn_disagreement',        label:'Handling Disagreement',              prompt:'Describe a time you disagreed with a charge nurse or manager about a staffing or patient care decision. How did you handle it?' },
        { key:'rn_rapid_response',      label:'Composure in Emergencies',           prompt:'How do you stay calm and organized during a rapid response or code on the unit?' },
      ],
    },
    {
      section: 'Culture Fit & Motivation',
      icon: '⭐',
      items: [
        { key:'rn_unit_interest',       label:'Interest in the Unit',               prompt:'Why are you interested in working on a Tele Med-Surg / Stroke Telemetry unit specifically?' },
        { key:'rn_teamwork_def',        label:'Definition of Teamwork',             prompt:'What does good teamwork look like to you on a busy inpatient unit?' },
        { key:'rn_above_beyond',        label:'Above & Beyond Example',             prompt:'Tell me about a time you went above and beyond for a patient or family.' },
        { key:'rn_emotional_resilience',label:'Emotional Resilience',               prompt:'How do you handle the emotional toll of caring for critically ill or rapidly declining patients?' },
        { key:'rn_career_goals',        label:'Career Trajectory',                  prompt:'Where do you see your nursing career in the next 2–3 years?' },
      ],
    },
  ],
  LPN: [
    {
      section: 'Clinical Competency',
      icon: '🩺',
      items: [
        { key:'lpn_med_admin',          label:'Medication Administration Process',  prompt:'Under an RN\'s supervision, walk me through your process for administering scheduled oral medications to a group of patients.' },
        { key:'lpn_scope',              label:'Scope of Practice Awareness',        prompt:'What is your understanding of the scope-of-practice differences between an LPN and an RN on a telemetry unit, particularly around IV push medications and blood product administration?' },
        { key:'lpn_deterioration',      label:'Recognizing & Escalating Deterioration', prompt:'How would you recognize and respond to signs of patient deterioration (e.g., change in mental status, abnormal vital signs) and who would you notify first?' },
        { key:'lpn_wound_care',         label:'Wound / Ostomy Care Experience',     prompt:'Describe your experience with wound care, dressing changes, or ostomy care.' },
        { key:'lpn_documentation',      label:'I/O, Vitals, Glucose Documentation', prompt:'What is your process for documenting intake/output, vital signs, and blood glucose results accurately and on time?' },
        { key:'lpn_telemetry',          label:'Telemetry Alarm Awareness',          prompt:'Have you worked with patients on cardiac telemetry monitors before? What would you do if you noticed an alarm you didn\'t recognize?' },
      ],
    },
    {
      section: 'Communication & Teamwork',
      icon: '🤝',
      items: [
        { key:'lpn_escalation',         label:'Escalating to RN',                   prompt:'Tell me about a time you had to escalate a concern about a patient to the RN. How did that conversation go?' },
        { key:'lpn_prioritization',     label:'Task Prioritization',                prompt:'How do you prioritize your task list when caring for multiple patients with competing needs?' },
        { key:'lpn_ca_partnership',     label:'Partnership with CA',                prompt:'Describe a time you worked closely with a Care Associate to complete patient care tasks. How did you communicate?' },
        { key:'lpn_scope_boundary',     label:'Recognizing Scope Boundaries',       prompt:'How do you handle being asked to do something you\'re not sure is within your scope of practice?' },
      ],
    },
    {
      section: 'Culture Fit & Motivation',
      icon: '⭐',
      items: [
        { key:'lpn_unit_interest',      label:'Interest in the Unit',               prompt:'What draws you to working on a Med-Surg / Stroke Telemetry unit?' },
        { key:'lpn_pace',               label:'Handling Fast Pace',                 prompt:'How do you handle a fast-paced shift with frequent interruptions?' },
        { key:'lpn_feedback_receptivity',label:'Receptiveness to Feedback',         prompt:'Tell me about a time you received constructive feedback. How did you respond?' },
        { key:'lpn_career_goals',       label:'Career Goals',                       prompt:'What are your long-term career goals in nursing?' },
      ],
    },
  ],
  CA: [
    {
      section: 'Clinical Competency',
      icon: '🩺',
      items: [
        { key:'ca_vitals',              label:'Vital Signs & Documentation',        prompt:'Walk me through how you would take and document a full set of vital signs, and what results would you report to the nurse right away.' },
        { key:'ca_adls',                label:'ADL Assistance Experience',          prompt:'Describe your experience assisting patients with activities of daily living (bathing, toileting, mobility, feeding).' },
        { key:'ca_change_condition',    label:'Recognizing Condition Change',       prompt:'What would you do if you noticed a change in a patient\'s condition — for example, they seemed more confused or short of breath than earlier in the shift?' },
        { key:'ca_fall_risk',           label:'Fall Risk Mobility Assistance',      prompt:'How do you safely assist a fall-risk patient with ambulation or transfers?' },
        { key:'ca_poc_testing',         label:'Point-of-Care Testing / Specimens',  prompt:'What is your experience with blood glucose checks (point-of-care testing) or specimen collection?' },
        { key:'ca_task_organization',   label:'Task Organization Across Patients',  prompt:'How do you keep track of tasks for multiple patients across a shift (rounding, vitals, intake/output)?' },
      ],
    },
    {
      section: 'Communication & Teamwork',
      icon: '🤝',
      items: [
        { key:'ca_reporting',           label:'Reporting Concerns to Nurse',        prompt:'Tell me about a time you noticed something concerning with a patient and reported it to the nurse. What happened?' },
        { key:'ca_communication_pulled',label:'Communicating When Pulled Thin',     prompt:'How do you communicate with the RN or LPN when you\'re pulled in multiple directions at once?' },
        { key:'ca_helping_coworkers',   label:'Helping Overwhelmed Coworkers',      prompt:'Describe a time you helped a coworker who was overwhelmed during a shift.' },
        { key:'ca_difficult_patient',   label:'De-escalating Upset Patients/Families', prompt:'How would you handle a patient or family member who is upset or verbally frustrated with you?' },
      ],
    },
    {
      section: 'Culture Fit & Motivation',
      icon: '⭐',
      items: [
        { key:'ca_unit_interest',       label:'Interest in the Unit / Role',        prompt:'Why are you interested in working as a Care Associate on a Med-Surg / Stroke Telemetry unit?' },
        { key:'ca_customer_service',    label:'Customer Service Philosophy',        prompt:'What does excellent customer service look like when caring for patients and families?' },
        { key:'ca_composure',           label:'Staying Organized Under Pressure',   prompt:'How do you stay organized and calm when the unit is busy or short-staffed?' },
        { key:'ca_growth_plans',        label:'Growth & Certification Plans',       prompt:'Where do you see yourself growing within healthcare — do you have plans to pursue further certification or nursing school?' },
      ],
    },
  ],
};

// Fallback rubric for UC / Other candidates (kept generic — not role-specific)
const IV_RUBRIC_DEFAULT = [
  {
    section: 'Clinical Competency',
    icon: '🩺',
    items: [
      { key:'clinical_knowledge',    label:'Clinical Knowledge',         prompt:'Demonstrated understanding of med-surg / telemetry concepts, medications, procedures relevant to 3B.' },
      { key:'critical_thinking',     label:'Critical Thinking',          prompt:'Ability to prioritize, recognize deterioration, and respond appropriately under pressure. Provide a clinical scenario example.' },
      { key:'documentation',         label:'Documentation & Charting',   prompt:'Understanding of timely and accurate charting, MAR compliance, scanning practices.' },
      { key:'patient_safety',        label:'Patient Safety Culture',     prompt:'Knowledge of fall prevention, HAPI prevention, medication safety (5 Rights), infection control.' },
    ],
  },
  {
    section: 'Communication & Teamwork',
    icon: '🤝',
    items: [
      { key:'communication',         label:'Communication Skills',       prompt:'Clarity, professionalism, AIDET awareness. How do they communicate with patients, families, and colleagues?' },
      { key:'teamwork',              label:'Teamwork & Collaboration',   prompt:'Examples of working with charge nurses, techs, physicians. Willingness to float or help others.' },
      { key:'conflict_resolution',   label:'Conflict Resolution',        prompt:'How have they handled disagreements with colleagues or difficult family members?' },
    ],
  },
  {
    section: 'Professionalism & Reliability',
    icon: '⭐',
    items: [
      { key:'attendance_reliability',label:'Attendance & Reliability',   prompt:'Previous attendance record, call-out pattern, punctuality. Ask directly about any gaps.' },
      { key:'adaptability',          label:'Adaptability & Flexibility', prompt:'Experience with changing assignments, float, night/weekend rotation, census fluctuations.' },
      { key:'initiative',            label:'Initiative & Accountability',prompt:'Examples of going above and beyond, owning mistakes, advocating for patients or process improvement.' },
    ],
  },
];

function ivRubricFor(role) {
  return IV_RUBRIC_BY_ROLE[role] || IV_RUBRIC_DEFAULT;
}

let _ivActiveId = null;

function ivById(id) { return (state.interviews || []).find(i => i.id === id); }

function ivScoreTotal(iv) {
  if (!iv.scores) return null;
  const vals = Object.values(iv.scores).filter(v => v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0);
}

function ivScoreMax(iv) {
  const rubric = ivRubricFor(iv && iv.role);
  return rubric.reduce((s, sec) => s + sec.items.length * 5, 0);
}

function ivScorePct(iv) {
  const t = ivScoreTotal(iv);
  if (t === null) return null;
  return Math.round(t / ivScoreMax(iv) * 100);
}

function ivRecommendation(pct) {
  if (pct === null) return { label:'Not scored', color:'var(--text3)' };
  if (pct >= 85)   return { label:'Strong Hire', color:'var(--green2)' };
  if (pct >= 70)   return { label:'Recommend', color:'var(--accent2)' };
  if (pct >= 55)   return { label:'Consider', color:'var(--amber2)' };
  return { label:'Do Not Hire', color:'var(--red2)' };
}

function initInterview() {
  const dateEl = document.getElementById('iv-date');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
  if (document.getElementById('panel-interview')?.style.display !== 'none') renderInterviewList();
}

function openInterviewModal(id) {
  const modal = document.getElementById('iv-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('iv-edit-id').value = id || '';
  document.getElementById('iv-modal-title').textContent = id ? 'Edit Candidate' : 'New Candidate';

  if (id) {
    const iv = ivById(id);
    if (iv) {
      document.getElementById('iv-cname').value       = iv.name        || '';
      document.getElementById('iv-role').value        = iv.role        || 'RN';
      document.getElementById('iv-date').value        = iv.date        || '';
      document.getElementById('iv-interviewer').value = iv.interviewer || '';
      document.getElementById('iv-status').value      = iv.status      || 'Scheduled';
      document.getElementById('iv-exp').value         = iv.experience  || '';
      document.getElementById('iv-contact').value     = iv.contact     || '';
    }
  } else {
    document.getElementById('iv-cname').value       = '';
    document.getElementById('iv-role').value        = 'RN';
    document.getElementById('iv-date').value        = new Date().toISOString().split('T')[0];
    document.getElementById('iv-interviewer').value = '';
    document.getElementById('iv-status').value      = 'Scheduled';
    document.getElementById('iv-exp').value         = '';
    document.getElementById('iv-contact').value     = '';
  }
  setTimeout(() => { const el = document.getElementById('iv-cname'); if (el) el.focus(); }, 50);
}

function closeInterviewModal() {
  const modal = document.getElementById('iv-modal');
  if (modal) modal.style.display = 'none';
}

function saveInterviewCandidate() {
  const name = (document.getElementById('iv-cname')?.value || '').trim();
  if (!name) { alert('Please enter a candidate name.'); return; }

  const role        = document.getElementById('iv-role')?.value        || 'RN';
  const date        = document.getElementById('iv-date')?.value        || '';
  const interviewer = document.getElementById('iv-interviewer')?.value || '';
  const status      = document.getElementById('iv-status')?.value      || 'Scheduled';
  const experience  = document.getElementById('iv-exp')?.value         || '';
  const contact     = document.getElementById('iv-contact')?.value     || '';
  const editId      = document.getElementById('iv-edit-id')?.value     || '';

  if (!state.interviews) state.interviews = [];

  if (editId) {
    const iv = ivById(editId);
    if (iv) { Object.assign(iv, { name, role, date, interviewer, status, experience, contact }); }
  } else {
    const newIv = {
      id: 'iv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name, role, date, interviewer, status, experience, contact,
      scores: {},
      notes: {},       // { sectionKey: freetext }
      generalNotes: '',
      created: Date.now(),
    };
    state.interviews.unshift(newIv);
    _ivActiveId = newIv.id;
  }

  persistSave();
  closeInterviewModal();
  renderInterviewList();
  if (_ivActiveId) renderInterviewDetail(_ivActiveId);
}

function deleteInterview(id) {
  if (!confirm('Delete this candidate record? This cannot be undone.')) return;
  state.interviews = (state.interviews || []).filter(i => i.id !== id);
  if (_ivActiveId === id) {
    _ivActiveId = null;
    const dp = document.getElementById('iv-detail-panel');
    if (dp) dp.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text3);">
      <div style="font-size:40px;margin-bottom:12px;">🧑‍💼</div>
      <div style="font-size:14px;font-weight:600;color:var(--white);margin-bottom:6px;">Select a candidate</div>
    </div>`;
  }
  persistSave();
  renderInterviewList();
}

function renderInterviewList() {
  const el = document.getElementById('iv-candidate-list');
  if (!el) return;

  const roleF   = document.getElementById('iv-role-filter')?.value   || 'ALL';
  const statusF = document.getElementById('iv-status-filter')?.value || 'ALL';

  let list = (state.interviews || []).slice();
  if (roleF   !== 'ALL') list = list.filter(iv => iv.role   === roleF);
  if (statusF !== 'ALL') list = list.filter(iv => iv.status === statusF);
  list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!list.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px 10px;color:var(--text3);font-size:11px;">No candidates match filters</div>`;
    return;
  }

  el.innerHTML = list.map(iv => {
    const cfg    = IV_STATUS_CFG[iv.status] || IV_STATUS_CFG['Scheduled'];
    const rCol   = IV_ROLE_COLOR[iv.role]   || 'var(--text2)';
    const isAct  = iv.id === _ivActiveId;
    const pct    = ivScorePct(iv);
    const rec    = ivRecommendation(pct);
    const initials = iv.name.split(',').map(p => p.trim()[0] || '?').join('').slice(0, 2);
    const dateStr  = iv.date ? new Date(iv.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';

    return `<div onclick="renderInterviewDetail('${iv.id}')"
      style="padding:10px 10px;margin-bottom:4px;border-radius:6px;cursor:pointer;border:1px solid;transition:all 0.15s;
      ${isAct
        ? 'background:rgba(46,125,209,0.15);border-color:var(--accent2);'
        : 'background:rgba(255,255,255,0.03);border-color:transparent;'}">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:32px;height:32px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${iv.name}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:2px;flex-wrap:wrap;">
            <span style="font-size:9px;color:${rCol};font-weight:700;">${iv.role}</span>
            <span style="font-size:9px;color:var(--text3);">${dateStr}</span>
          </div>
        </div>
        ${pct !== null ? `<span style="font-size:11px;font-weight:700;color:${rec.color};">${pct}%</span>` : ''}
      </div>
      <div style="margin-top:6px;">
        <span style="font-size:9px;background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:1px 7px;color:${cfg.color};">${iv.status}</span>
      </div>
    </div>`;
  }).join('');
}

function saveIvScore(id, key, val) {
  const iv = ivById(id);
  if (!iv) return;
  if (!iv.scores) iv.scores = {};
  iv.scores[key] = parseInt(val) || 0;
  persistSave();
  // Update star colors + label immediately so the click visually sticks
  ivStarOut(id, key, iv.scores[key]);
  const scoreLabel = ['','Poor','Below Avg','Average','Good','Excellent'][iv.scores[key]] || '';
  const labelEl = document.querySelector(`[data-ivscorelabel="${id}-${key}"]`);
  if (labelEl) {
    labelEl.textContent = scoreLabel;
    labelEl.style.color = iv.scores[key] >= 4 ? 'var(--green2)' : iv.scores[key] >= 3 ? 'var(--amber2)' : iv.scores[key] > 0 ? 'var(--red2)' : 'var(--text3)';
  }
  // Update totals live
  const pct = ivScorePct(iv);
  const rec = ivRecommendation(pct);
  const totEl = document.getElementById('iv-score-total-' + id);
  if (totEl) totEl.textContent = (ivScoreTotal(iv) || 0) + ' / ' + ivScoreMax(iv);
  const recEl = document.getElementById('iv-rec-' + id);
  if (recEl) { recEl.textContent = rec.label; recEl.style.color = rec.color; }
  const pctEl = document.getElementById('iv-pct-' + id);
  if (pctEl) { pctEl.textContent = pct !== null ? pct + '%' : '—'; pctEl.style.color = pct !== null ? rec.color : 'var(--text3)'; }
  renderInterviewList();
}

function saveIvNote(id, key, val) {
  const iv = ivById(id);
  if (!iv) return;
  if (!iv.notes) iv.notes = {};
  iv.notes[key] = val;
  persistSave();
}

function saveIvGeneralNote(id, val) {
  const iv = ivById(id);
  if (!iv) return;
  iv.generalNotes = val;
  persistSave();
}

function saveIvImpression(id, key, val) {
  const iv = ivById(id);
  if (!iv) return;
  if (!iv.impressions) iv.impressions = {};
  iv.impressions[key] = val;
  persistSave();
  renderMessageDetail && null; // just persist, no full re-render needed
  // re-render detail to reflect button state
  renderInterviewDetail(id);
}

function saveIvRedFlag(id, flag, checked) {
  const iv = ivById(id);
  if (!iv) return;
  if (!iv.impressions) iv.impressions = {};
  if (!iv.impressions.redFlags) iv.impressions.redFlags = [];
  if (checked) {
    if (!iv.impressions.redFlags.includes(flag)) iv.impressions.redFlags.push(flag);
  } else {
    iv.impressions.redFlags = iv.impressions.redFlags.filter(f => f !== flag);
  }
  persistSave();
}

function saveIvField(id, field, val) {
  const iv = ivById(id);
  if (!iv) return;
  iv[field] = val;
  persistSave();
  renderInterviewList();
}

function renderInterviewDetail(id) {
  _ivActiveId = id;
  renderInterviewList();

  const iv = ivById(id);
  const dp = document.getElementById('iv-detail-panel');
  if (!dp || !iv) return;

  const cfg  = IV_STATUS_CFG[iv.status] || IV_STATUS_CFG['Scheduled'];
  const rCol = IV_ROLE_COLOR[iv.role]   || 'var(--text2)';
  const pct  = ivScorePct(iv);
  const rec  = ivRecommendation(pct);
  const tot  = ivScoreTotal(iv);
  const initials = iv.name.split(',').map(p => p.trim()[0] || '?').join('').slice(0, 2);
  const dateStr  = iv.date ? new Date(iv.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : 'No date set';
  const safeId   = id.replace(/[^a-zA-Z0-9_]/g, '_');

  // Build rubric sections (role-specific: RN / LPN / CA, default fallback for UC/Other)
  const rubricHtml = ivRubricFor(iv.role).map(sec => {
    const sectionNote = (iv.notes || {})[sec.icon] || '';
    const itemsHtml = sec.items.map(item => {
      const score = (iv.scores || {})[item.key] || 0;
      const stars  = [1,2,3,4,5].map(n => {
        const active = n <= score;
        const col = score >= 4 ? 'var(--green2)' : score >= 3 ? 'var(--amber2)' : score > 0 ? 'var(--red2)' : 'var(--text3)';
        return `<span onclick="saveIvScore('${id}','${item.key}',${n})"
          style="font-size:18px;cursor:pointer;color:${active?col:'var(--border)'};transition:color 0.1s;user-select:none;"
          onmouseover="ivStarHover('${id}','${item.key}',${n})" onmouseout="ivStarOut('${id}','${item.key}',${score})"
          data-ivstar="${id}-${item.key}-${n}">★</span>`;
      }).join('');
      const scoreLabel = ['','Poor','Below Avg','Average','Good','Excellent'][score] || '';
      return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:4px;">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--white);">${item.label}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;line-height:1.4;">${item.prompt}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;">
            <div style="display:flex;gap:1px;">${stars}</div>
            <div data-ivscorelabel="${id}-${item.key}" style="font-size:9px;color:${score>=4?'var(--green2)':score>=3?'var(--amber2)':score>0?'var(--red2)':'var(--text3)'};">${scoreLabel}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;overflow:hidden;">
      <div style="padding:10px 14px;background:rgba(255,255,255,0.04);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">${sec.icon}</span>
        <span style="font-size:12px;font-weight:700;color:var(--white);">${sec.section}</span>
      </div>
      <div style="padding:2px 14px 6px;">${itemsHtml}</div>
      <div style="padding:8px 14px 12px;">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:600;">Section notes:</div>
        <textarea onblur="saveIvNote('${id}','${sec.icon}',this.value)" rows="2"
          style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:11px;font-family:'IBM Plex Sans',sans-serif;resize:vertical;outline:none;box-sizing:border-box;"
          placeholder="Notes for ${sec.section}...">${sectionNote}</textarea>
      </div>
    </div>`;
  }).join('');

  dp.innerHTML = `
    <!-- Candidate header -->
    <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="width:48px;height:48px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:18px;font-weight:700;color:var(--white);margin-bottom:4px;">${iv.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:11px;color:${rCol};font-weight:700;">${iv.role}</span>
          ${iv.experience ? `<span style="font-size:11px;color:var(--text3);">${iv.experience} yr${iv.experience==1?'':'s'} exp</span>` : ''}
          <span style="font-size:11px;color:var(--text3);">📅 ${dateStr}</span>
          ${iv.interviewer ? `<span style="font-size:11px;color:var(--text3);">👤 ${iv.interviewer}</span>` : ''}
          ${iv.contact ? `<span style="font-size:11px;color:var(--text3);">📞 ${iv.contact}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
        <select onchange="saveIvField('${id}','status',this.value)"
          style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:5px;padding:4px 8px;color:${cfg.color};font-size:11px;font-weight:700;outline:none;cursor:pointer;">
          ${Object.keys(IV_STATUS_CFG).map(s => `<option value="${s}" ${iv.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <div style="display:flex;gap:6px;">
          <button onclick="openInterviewModal('${id}')" style="font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
          <button onclick="deleteInterview('${id}')" style="font-size:10px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
        </div>
      </div>
    </div>

    <!-- Score summary -->
    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;text-align:center;">
        <div id="iv-score-total-${id}" style="font-size:22px;font-weight:700;color:var(--white);">${tot !== null ? tot + ' / ' + ivScoreMax(iv) : '— / ' + ivScoreMax(iv)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px;">Total Score</div>
      </div>
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;text-align:center;">
        <div id="iv-pct-${id}" style="font-size:22px;font-weight:700;color:${pct!==null?rec.color:'var(--text3)'};">${pct !== null ? pct + '%' : '—'}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px;">Score %</div>
      </div>
      <div style="flex:2;min-width:160px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div id="iv-rec-${id}" style="font-size:16px;font-weight:700;color:${rec.color};">${rec.label}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px;">Recommendation</div>
        <div style="width:100%;height:4px;background:rgba(255,255,255,0.07);border-radius:2px;margin-top:8px;overflow:hidden;">
          <div style="height:4px;background:${rec.color};border-radius:2px;width:${pct !== null ? pct : 0}%;transition:width 0.3s;"></div>
        </div>
      </div>
    </div>

    <!-- Initial Impressions -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:8px;">💡 First Impressions & Gut Feel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Energy & Presence</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${['Confident','Nervous','Engaged','Reserved','Professional','Enthusiastic'].map(t=>{
              const sel=(iv.impressions||{}).energy===t;
              return `<button onclick="saveIvImpression('${id}','energy','${t}')" style="font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid;cursor:pointer;${sel?'background:rgba(46,125,209,0.2);border-color:var(--accent2);color:var(--accent2);':'background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:var(--text3);'}">${t}</button>`;
            }).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Culture Fit</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${['Strong fit','Good fit','Uncertain','Concerns'].map(t=>{
              const sel=(iv.impressions||{}).culture===t;
              const col=t==='Strong fit'?'var(--green2)':t==='Good fit'?'var(--accent2)':t==='Uncertain'?'var(--amber2)':'var(--red2)';
              return `<button onclick="saveIvImpression('${id}','culture','${t}')" style="font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid;cursor:pointer;${sel?`background:rgba(0,0,0,0.2);border-color:${col};color:${col};`:'background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:var(--text3);'}">${t}</button>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Red Flags (check all that apply)</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${['Attendance concerns','Vague answers','Job-hopping','Negative about past employers','Unrealistic expectations','Disengaged','Overqualified'].map(flag=>{
            const checked=((iv.impressions||{}).redFlags||[]).includes(flag);
            return `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid;${checked?'background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.4);color:var(--red2);':'background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:var(--text3);'}">
              <input type="checkbox" ${checked?'checked':''} onchange="saveIvRedFlag('${id}','${flag}',this.checked)" style="accent-color:var(--red2);"> ${flag}
            </label>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Rubric -->
    <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Interview Rubric — score each area 1-5</div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:14px;">1 = Poor &nbsp;·&nbsp; 2 = Below Average &nbsp;·&nbsp; 3 = Average &nbsp;·&nbsp; 4 = Good &nbsp;·&nbsp; 5 = Excellent</div>
    ${rubricHtml}

    <!-- General notes -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:10px;">📝 General Interview Notes</div>
      <textarea onblur="saveIvGeneralNote('${id}',this.value)" rows="8"
        style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:10px 12px;color:var(--white);font-size:12px;font-family:'IBM Plex Sans',sans-serif;resize:vertical;outline:none;line-height:1.6;box-sizing:border-box;"
        placeholder="Overall impressions, specific examples shared, red flags noticed, follow-up questions, references to check, offer considerations...">${iv.generalNotes || ''}</textarea>
    </div>

    <!-- Hire / reject bar -->
    <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);">
      <button onclick="saveIvField('${id}','status','Not Selected');renderInterviewDetail('${id}')" style="padding:7px 18px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);border-radius:5px;color:var(--red2);font-size:12px;cursor:pointer;font-weight:600;">✕ Not Selected</button>
      <button onclick="saveIvField('${id}','status','Offer Extended');renderInterviewDetail('${id}')" style="padding:7px 18px;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.35);border-radius:5px;color:var(--purple2);font-size:12px;cursor:pointer;font-weight:600;">📨 Extend Offer</button>
      <button onclick="saveIvField('${id}','status','Hired');renderInterviewDetail('${id}')" style="padding:7px 18px;background:rgba(37,168,104,0.15);border:1px solid rgba(37,168,104,0.4);border-radius:5px;color:var(--green2);font-size:12px;cursor:pointer;font-weight:600;">✓ Mark Hired</button>
    </div>
  `;
}

// Star hover helpers
function ivStarHover(id, key, hoverN) {
  [1,2,3,4,5].forEach(n => {
    const el = document.querySelector(`[data-ivstar="${id}-${key}-${n}"]`);
    if (!el) return;
    const active = n <= hoverN;
    const col = hoverN >= 4 ? 'var(--green2)' : hoverN >= 3 ? 'var(--amber2)' : 'var(--red2)';
    el.style.color = active ? col : 'var(--border)';
  });
}

function ivStarOut(id, key, currentScore) {
  // Always trust the live saved score over any stale value passed in from render time
  const iv = ivById(id);
  const liveScore = iv && iv.scores ? (iv.scores[key] || 0) : (currentScore || 0);
  [1,2,3,4,5].forEach(n => {
    const el = document.querySelector(`[data-ivstar="${id}-${key}-${n}"]`);
    if (!el) return;
    const active = n <= liveScore;
    const col = liveScore >= 4 ? 'var(--green2)' : liveScore >= 3 ? 'var(--amber2)' : liveScore > 0 ? 'var(--red2)' : 'var(--text3)';
    el.style.color = active ? col : 'var(--border)';
  });
}

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
        <div style="width:30px;height:30px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name.split(',')[0]}</div>
          <div style="font-size:9px;color:var(--text3);">${od.role} · ${od.preceptor ? od.preceptor.split(',')[0] : 'No preceptor'}</div>
        </div>
        <span style="font-size:10px;font-weight:700;color:${statusCol};">${statusLabel}</span>
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
      ${done && doneDate ? `<span style="font-size:9px;color:var(--text3);">${new Date(doneDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>` : ''}
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
        <button onclick="openOrientationModal('${safeN}')" style="font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
        <button onclick="deleteOrientee('${safeN}')" style="font-size:10px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${weeksCompleted}/${od.totalWeeks}</div>
        <div style="font-size:10px;color:var(--text3);">Weeks Passed</div>
        <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;margin-top:8px;"><div style="height:4px;background:var(--accent2);width:${pct}%;border-radius:2px;"></div></div>
      </div>
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${Object.values(od.milestones||{}).filter(Boolean).length}/${ORI_MILESTONES.length}</div>
        <div style="font-size:10px;color:var(--text3);">Milestones</div>
      </div>
      <div style="flex:2;min-width:180px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Off-Orientation Date</div>
        <input type="date" value="${od.offDate||''}" onchange="saveOriField('${safeN}','offDate',this.value)"
          style="background:transparent;border:none;color:var(--green2);font-size:16px;font-weight:700;outline:none;width:100%;">
        <div style="font-size:9px;color:var(--text3);margin-top:2px;">Set when formally released</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:8px;">📋 Weekly Progress</div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">✓ = Passed &nbsp;·&nbsp; ↺ = Needs Remediation</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:rgba(255,255,255,0.04);">
              <th style="padding:7px 10px;font-size:10px;color:var(--text3);text-align:left;">Wk</th>
              <th style="padding:7px 10px;font-size:10px;color:var(--text3);text-align:left;">Goal / Focus Area</th>
              <th style="padding:7px 10px;font-size:10px;color:var(--text3);">Status</th>
              <th style="padding:7px 10px;font-size:10px;color:var(--text3);text-align:left;">Notes</th>
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
    { key:'bedside_report', label:'Bedside Shift Report',      section:'Communication', checklist:[
      'Knock and ask permission to enter',
      'Call the patient by name, explain bedside shift report is happening, invite their participation; if visitors are present, ask if OK to discuss or should they step out',
      'Introduce oncoming CA — "manage up" (e.g. "this is your aide, and she will take great care of you today")',
      'Oncoming aide updates whiteboard thoroughly, including what matters & PLATO checklist',
      'Check ID band; include patient in conversation ("Can you verify your name and DOB for safety?")',
      'Check for foleys, purewicks, attends & drains',
      'Verify code status, fall & skin risk, diet',
      'Safety checks: fall precautions (alarms, bed cords, bracelets, bed low, nonskid footwear) and/or skin precautions (mepilex, heels offloaded, wedges, cushion); call bell, gait belt, suction in place',
      'Discuss plan and concerns — ask the patient',
      'Note any labs still needed, blood sugar checks, mobility status, void/BM',
      'Last reposition (if needed)',
      'Skin issues',
      'Goals, tests, and consults for the day',
      'Ask the patient if there is anything else they would like to discuss, or anything else the CA should know',
      'Thank the patient; oncoming CA gives an estimate of when they will be back for hourly rounding/VS',
      'If patient is confused, bedside rounding still takes place (discuss sensitive info before entering); if sleeping, do not wake but go in together, update board, and check patient; in isolation, one CA may garb and go in while the other stands just inside the door',
      'Documented shift report also completed by the off-going nurse',
    ] },
  ],
};

let _compModalName = '', _compModalKey = '';

function toggleCaCompReference() {
  const body  = document.getElementById('comp-ca-reference-body');
  const caret = document.getElementById('comp-ca-reference-caret');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (caret) caret.textContent = open ? '▸ Show' : '▾ Hide';
}

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

function openCompModal(name, key, label, role) {
  _compModalName = name; _compModalKey = key;
  const m = document.getElementById('comp-modal');
  if (m) m.style.display = 'flex';
  document.getElementById('comp-modal-title').textContent = 'Validate: ' + label;
  document.getElementById('comp-modal-sub').textContent   = name;
  const clWrap  = document.getElementById('comp-m-checklist');
  const clItems = document.getElementById('comp-m-checklist-items');
  const skillDef = (typeof allCompSkills==='function' && role)
    ? allCompSkills(role).find(s=>s.key===key)
    : (COMP_SKILLS.RN||[]).concat(COMP_SKILLS.CA||[]).find(s=>s.key===key);
  if (clWrap && clItems) {
    if (skillDef && skillDef.checklist && skillDef.checklist.length) {
      clItems.innerHTML = skillDef.checklist.map(item=>`<li style="margin-bottom:3px;">${item}</li>`).join('');
      clWrap.style.display = 'block';
    } else {
      clItems.innerHTML = '';
      clWrap.style.display = 'none';
    }
  }
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
          <div style="font-size:10px;color:var(--text3);">${doneCells} / ${totalCells} validations done</div></div>
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

  const headerCols = skills.map(sk => `<th style="padding:6px 8px;font-size:9px;font-weight:700;color:var(--text3);text-align:center;min-width:60px;white-space:nowrap;border-left:1px solid rgba(255,255,255,0.05);">${sk.label.replace(' ','<br>')}</th>`).join('');

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
        <div style="font-size:9px;color:${rCol};">${s.job} · ${staffDone}/${skills.length} · ${staffPct}%</div>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  tableEl.innerHTML = `<div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;">
    <table style="width:100%;border-collapse:collapse;min-width:600px;">
      <thead style="position:sticky;top:var(--sticky-top);z-index:10;background:var(--card);">
        <tr style="background:var(--navy2);">
          <th style="padding:8px 10px;font-size:10px;color:var(--text3);text-align:left;position:sticky;left:0;background:var(--navy2);z-index:3;min-width:130px;">Staff</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="margin-top:8px;font-size:10px;color:var(--text3);">✓ = Passed &nbsp;·&nbsp; ↺ = Needs Remediation &nbsp;·&nbsp; — = Not yet validated &nbsp;·&nbsp; Click any cell to validate</div>`;
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
          <div style="font-size:10px;color:var(--text3);">${count} recognition${count>1?'s':''}</div></div>
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
          <span style="background:${t.bg};border:1px solid ${t.border};border-radius:8px;padding:1px 8px;font-size:10px;color:${t.color};">${t.icon} ${t.label}</span>
          <span style="font-size:10px;color:var(--text3);">${dateStr}</span>
          ${r.submittedBy ? `<span style="font-size:10px;color:var(--text3);">from ${r.submittedBy}</span>` : ''}
        </div>
        ${r.description ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-top:4px;">${r.description}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button onclick="emailRecognition('${r.id}')" style="background:none;border:1px solid var(--border);border-radius:4px;padding:2px 7px;color:var(--accent2);cursor:pointer;font-size:10px;" title="Share / Print / Email">📤 Share</button>
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

  const caRefEl = document.getElementById('comp-ca-reference');
  if (caRefEl) caRefEl.style.display = (roleFilter === 'CA') ? 'block' : 'none';

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
          <div style="font-size:10px;color:var(--text3);">${doneCells} / ${totalCells} validations · ${skills.length} skills (${customCount} custom)</div></div>
        <div style="flex:1;min-width:100px;height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
          <div style="height:6px;background:${compPct>=80?'var(--green2)':compPct>=50?'var(--amber2)':'var(--red2)'};width:${compPct}%;border-radius:3px;"></div>
        </div>
      </div>
      ${customCount > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span style="font-size:10px;color:var(--text3);font-weight:600;">Custom skills:</span>
        ${((state.customCompSkills||{})[roleFilter]||[]).map(sk=>
          `<span style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:10px;padding:2px 8px;font-size:10px;color:var(--purple2);display:inline-flex;align-items:center;gap:4px;">
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
    return `<th style="padding:6px 8px;font-size:9px;font-weight:700;color:${isCustom?'var(--purple2)':'var(--text3)'};text-align:center;min-width:60px;white-space:normal;border-left:1px solid rgba(255,255,255,0.05);max-width:80px;">
      ${sk.label.replace(/\s+/g,' ').split(' ').join('<br>')}
      <br><span onclick="removeCompSkill('${roleFilter}','${sk.key}')" style="font-size:8px;cursor:pointer;color:rgba(255,255,255,0.2);" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='rgba(255,255,255,0.2)'" title="Remove skill">✕</span>
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
        <span onclick="openCompModal('${s.name.replace(/'/g,"\\'")}','${sk.key}','${sk.label}','${roleFilter}')"
          title="${tip}" style="font-size:13px;cursor:pointer;color:${col};font-weight:700;">${status}</span></td>`;
    }).join('');
    const staffDone = skills.filter(sk=>{const v=((state.competency||{})[s.name]||{})[sk.key];return v&&v.passed&&v.yr===yr;}).length;
    const staffPct  = skills.length ? Math.round(staffDone/skills.length*100) : 0;
    const incomplete = skills.length - staffDone;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:8px 10px;white-space:nowrap;position:sticky;left:0;background:var(--card);z-index:1;">
        <div style="font-size:11px;font-weight:700;color:var(--white);">${s.name.split(',')[0]}</div>
        <div style="font-size:9px;color:${rCol};">${s.job} · ${staffDone}/${skills.length}${incomplete>0?` · <span style="color:var(--amber2);">${incomplete} pending</span>`:' <span style="color:var(--green2);">✓ complete</span>'}</div>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  tableEl.innerHTML = `<div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;">
    <table style="width:100%;border-collapse:collapse;min-width:600px;">
      <thead style="position:sticky;top:var(--sticky-top);z-index:10;background:var(--card);">
        <tr style="background:var(--navy2);">
          <th style="padding:8px 10px;font-size:10px;color:var(--text3);text-align:left;position:sticky;left:0;background:var(--navy2);z-index:3;min-width:130px;">Staff</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="margin-top:8px;font-size:10px;color:var(--text3);">✓ Passed &nbsp;·&nbsp; ↺ Needs Remediation &nbsp;·&nbsp; — Not yet validated &nbsp;·&nbsp; Click any cell to validate · Purple = custom skill</div>`;
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
        <div style="font-size:10px;font-weight:700;color:var(--white);">${a.name.split(',')[0]}</div>
        <div style="font-size:9px;color:${jobCol};margin-bottom:4px;">${a.job}</div>
        <div style="font-size:9px;color:${topColor};font-weight:600;">${a.pending.length} pending</div>
        <div style="font-size:9px;color:var(--text3);margin-top:2px;">${a.pending.slice(0,3).map(s=>s.label).join(', ')}${a.pending.length>3?'…':''}</div>
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
          <div style="font-size:9px;color:${cfg.color};margin-top:1px;">${p.category}${dateStr?' · '+dateStr:''}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:5px;">
            <div style="flex:1;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
              <div style="height:3px;background:${pct===100?'var(--green2)':pct>0?'var(--amber2)':'var(--text3)'};width:${pct}%;border-radius:2px;"></div>
            </div>
            <span style="font-size:9px;color:${pct===100?'var(--green2)':'var(--text3)'};">${ackCount}/${staff.length}</span>
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
        <span style="font-size:9px;color:${jobCol};margin-left:6px;">${s.job}</span>
      </div>
      ${isDone
        ? `<span style="font-size:9px;color:var(--green2);">✓ ${ackDate}</span>`
        : `<div style="display:flex;gap:4px;align-items:center;">
            <span style="font-size:9px;color:var(--amber2);">Pending</span>
            ${smsLink ? `<a href="${smsLink}" style="font-size:9px;padding:2px 7px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.35);border-radius:4px;color:var(--purple2);text-decoration:none;font-weight:700;">💬</a>` : ''}
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
        <button onclick="openPolicyModal('${id}')" style="font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
        <button onclick="deletePolicy('${id}')" style="font-size:10px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
      </div>
    </div>

    ${p.description ? `<div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-left:3px solid var(--purple2);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;color:var(--purple2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;">✨ Summary / Key Points</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.75;white-space:pre-wrap;">${p.description}</div>
    </div>` : ''}


    <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:${pct===100?'var(--green2)':'var(--accent2)'};">${pct}%</div>
        <div style="font-size:10px;color:var(--text3);">Acknowledged</div>
      </div>
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${ackCount}</div>
        <div style="font-size:10px;color:var(--text3);">Signed Off</div>
      </div>
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:${pending.length>0?'var(--amber2)':'var(--green2)'};">${pending.length}</div>
        <div style="font-size:10px;color:var(--text3);">Pending</div>
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

// ════════════════════════════════════
//  BROADCAST / STAFF MESSAGING
// ════════════════════════════════════

const BC_TYPE_CFG = {
  Announcement: { icon:'📣', color:'var(--accent2)',  bg:'rgba(79,163,232,0.12)',  border:'rgba(79,163,232,0.4)'  },
  Urgent:       { icon:'🚨', color:'var(--red2)',     bg:'rgba(239,68,68,0.12)',   border:'rgba(239,68,68,0.5)'   },
  Reminder:     { icon:'⏰', color:'var(--amber2)',   bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.4)'  },
  Schedule:     { icon:'📅', color:'var(--teal2)',    bg:'rgba(6,182,212,0.10)',   border:'rgba(6,182,212,0.35)'  },
  Recognition:  { icon:'🏆', color:'var(--green2)',   bg:'rgba(37,168,104,0.12)', border:'rgba(37,168,104,0.4)'  },
  Policy:       { icon:'📋', color:'var(--purple2)',  bg:'rgba(139,92,246,0.10)', border:'rgba(139,92,246,0.35)' },
  General:      { icon:'💬', color:'var(--text2)',    bg:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.15)' },
};

const BC_TEMPLATES = [
  { label:'Huddle Reminder',    type:'Reminder',     audience:'All Staff',  subject:'Shift Huddle – Today',
    body:'📋 Reminder: Shift huddle will be held at the nurses station at the start of your shift.\n\nTopics:\n• Census update and patient acuity\n• Staffing assignments and open shifts\n• Safety alerts and quality reminders\n• Shout-outs and recognitions\n\nPlease plan to attend. See charge nurse if you have questions.' },
  { label:'Call-Out Protocol',  type:'Reminder',     audience:'All Staff',  subject:'Call-Out Reminder – Follow Proper Protocol',
    body:'⚠️ Reminder of our call-out procedure:\n\n1. Call the unit directly at least 2 hours before your shift\n2. Speak with the charge nurse or leave a voicemail — do NOT text only\n3. Note: excessive call-outs may result in corrective action per hospital policy\n4. If you are ill, please do not return until symptom-free per infection control policy\n\nThank you for your cooperation and commitment to the team.' },
  { label:'Mandatory Education', type:'Policy',      audience:'All Staff',  subject:'Mandatory Education Due – Action Required',
    body:'📚 Action Required: The following mandatory education is due.\n\nPlease complete by the deadline noted below:\n• [Module Name] – Due: [Date]\n• [Module Name] – Due: [Date]\n\nLog in to [system] to complete. Contact your educator if you have questions.\n\n⚠️ Failure to complete may affect scheduling and require a corrective action conversation.' },
  { label:'Staffing Update',    type:'Schedule',     audience:'All Staff',  subject:'Staffing Update – Schedule Change',
    body:'📅 Staffing Update:\n\nDue to [census change / call-out / unit need], the following schedule adjustment is in effect:\n\n• Date/Shift: [Date, Time]\n• Change: [Description]\n\nPlease review your assignment with the charge nurse. Contact the manager with any questions or concerns.\n\nThank you for your flexibility.' },
  { label:'Safety Alert',       type:'Urgent',       audience:'All Staff',  subject:'⚠️ Safety Alert – Immediate Attention Required',
    body:'🚨 SAFETY ALERT\n\nThis message requires your immediate attention.\n\n[Describe the safety issue, equipment concern, or urgent clinical update]\n\nAction required:\n1. [Step 1]\n2. [Step 2]\n3. Notify charge nurse immediately if you observe [describe]\n\nThis information is time-sensitive. Please read and acknowledge receipt.' },
  { label:'Great Job Shoutout', type:'Recognition',  audience:'All Staff',  subject:'Team Recognition – Outstanding Work',
    body:'🏆 Shout-out to our incredible team!\n\n[Staff name(s)] deserves special recognition for [specific behavior/achievement].\n\nThis is exactly the kind of care, teamwork, and dedication that makes 3B Tele Med Surg exceptional. Thank you for going above and beyond for our patients and each other.\n\nKeep up the amazing work! 🌟' },
  { label:'Policy Update',      type:'Policy',       audience:'All Staff',  subject:'Policy Update – Please Read and Acknowledge',
    body:'📋 Policy/Procedure Update\n\nEffective [Date], the following policy has been updated:\n\nPolicy: [Policy Name]\nKey Changes:\n• [Change 1]\n• [Change 2]\n• [Change 3]\n\nPlease review the full policy in [location/system]. If you have questions, speak with your charge nurse or manager.\n\n✅ Acknowledgment is required. Please sign the attached sign-off sheet or mark as read in the Broadcast tab.' },
  { label:'Meeting Notice',     type:'Announcement', audience:'All Staff',  subject:'Staff Meeting – Save the Date',
    body:'📅 Staff Meeting Notice\n\nDate: [Date]\nTime: [Time]\nLocation: [Location / Zoom Link]\n\nAgenda:\n• Unit updates and announcements\n• Quality metrics review\n• Policy and procedure updates\n• Q&A / open forum\n\nAttendance is encouraged. For those unable to attend, meeting notes will be posted in the Broadcast tab. Please notify the manager if you have agenda items to add.' },
];

let _bcActiveId = null;

function bcById(id) { return (state.messages||[]).find(m=>m.id===id); }

function initBroadcast() {
  // Populate templates
  const tplEl = document.getElementById('bc-templates');
  if (tplEl) {
    tplEl.innerHTML = BC_TEMPLATES.map((t,i) => {
      const cfg = BC_TYPE_CFG[t.type] || BC_TYPE_CFG.General;
      return `<button onclick="applyBcTemplate(${i})"
        style="font-size:10px;padding:3px 10px;background:${cfg.bg};border:1px solid ${cfg.border};border-radius:10px;color:${cfg.color};cursor:pointer;white-space:nowrap;">${cfg.icon} ${t.label}</button>`;
    }).join('');
  }
  renderBroadcastList();
  renderBoardMessages();
}

function applyBcTemplate(idx) {
  const t = BC_TEMPLATES[idx];
  if (!t) return;
  const typeEl = document.getElementById('bc-type');
  const audEl  = document.getElementById('bc-audience');
  const subjEl = document.getElementById('bc-subject');
  const bodyEl = document.getElementById('bc-body');
  if (typeEl) typeEl.value = t.type;
  if (audEl)  audEl.value  = t.audience;
  if (subjEl) subjEl.value = t.subject;
  if (bodyEl) bodyEl.value = t.body;
  showBcCompose();
}

function openBroadcastCompose() {
  _bcActiveId = null;
  showBcCompose();
  renderBroadcastList();
}

function showBcCompose() {
  const comp = document.getElementById('bc-compose');
  const det  = document.getElementById('bc-msg-detail');
  if (comp) comp.style.display = 'block';
  if (det)  det.style.display  = 'none';
}

function showBcDetail() {
  const comp = document.getElementById('bc-compose');
  const det  = document.getElementById('bc-msg-detail');
  if (comp) comp.style.display = 'none';
  if (det)  det.style.display  = 'block';
}

function postMessage() {
  const subject  = (document.getElementById('bc-subject')?.value || '').trim();
  const body     = (document.getElementById('bc-body')?.value    || '').trim();
  const type     = document.getElementById('bc-type')?.value     || 'General';
  const audience = document.getElementById('bc-audience')?.value || 'All Staff';
  const author   = (document.getElementById('bc-author')?.value  || '').trim() || 'Manager';
  const deadline = document.getElementById('bc-deadline')?.value || '';
  const pinned   = document.getElementById('bc-pin')?.checked    || false;

  if (!subject) { alert('Please enter a subject line.'); return; }
  if (!body)    { alert('Please write a message body.'); return; }

  if (!state.messages) state.messages = [];
  const msg = {
    id:       'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    subject, body, type, audience,
    postedBy: author,
    postedAt: new Date().toISOString(),
    deadline, pinned,
    reads:    {},
    created:  Date.now(),
  };
  state.messages.unshift(msg);
  persistSave();

  // Clear form
  ['bc-subject','bc-body','bc-deadline'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
  const pin = document.getElementById('bc-pin'); if (pin) pin.checked = false;

  renderBroadcastList();
  renderBoardMessages();
  // Open the new message detail
  _bcActiveId = msg.id;
  renderBroadcastList();
  renderMessageDetail(msg.id);
}

function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  state.messages = (state.messages||[]).filter(m=>m.id!==id);
  if (_bcActiveId === id) {
    _bcActiveId = null;
    showBcCompose();
  }
  persistSave();
  renderBroadcastList();
  renderBoardMessages();
}

function togglePin(id) {
  const m = bcById(id);
  if (!m) return;
  m.pinned = !m.pinned;
  persistSave();
  renderBroadcastList();
  renderMessageDetail(id);
  renderBoardMessages();
}

function markRead(msgId, staffName) {
  const m = bcById(msgId);
  if (!m) return;
  if (!m.reads) m.reads = {};
  if (m.reads[staffName]) delete m.reads[staffName];
  else m.reads[staffName] = Date.now();
  persistSave();
  renderMessageDetail(msgId);
  renderBroadcastList();
}

function markAllRead(msgId) {
  const m = bcById(msgId);
  if (!m) return;
  if (!m.reads) m.reads = {};
  const ts = Date.now();
  getMsgAudienceStaff(m).forEach(s => { if (!m.reads[s.name]) m.reads[s.name] = ts; });
  persistSave();
  renderMessageDetail(msgId);
  renderBroadcastList();
}

function getMsgAudienceStaff(m) {
  if (!m.audience || m.audience === 'All Staff') return MASTER_STAFF;
  if (m.audience === 'RN/LPN') return MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN');
  if (m.audience === 'CA')     return MASTER_STAFF.filter(s=>s.job==='CA');
  if (m.audience === 'Charge') return MASTER_STAFF.filter(s=>s.job==='RN'||s.job==='LPN');
  return MASTER_STAFF;
}

function renderBroadcastList() {
  const el = document.getElementById('bc-list');
  if (!el) return;
  const typeF = document.getElementById('bc-type-filter')?.value || 'ALL';
  const audF  = document.getElementById('bc-aud-filter')?.value  || 'ALL';

  let list = (state.messages||[]).slice();
  if (typeF !== 'ALL') list = list.filter(m=>m.type===typeF);
  if (audF  !== 'ALL') list = list.filter(m=>m.audience===audF);

  // Pinned first, then by date desc
  list.sort((a,b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.created - a.created;
  });

  if (!list.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px 10px;color:var(--text3);font-size:11px;">No messages yet.<br>Compose your first message →</div>`;
    return;
  }

  el.innerHTML = list.map(m => {
    const cfg = BC_TYPE_CFG[m.type] || BC_TYPE_CFG.General;
    const staff = getMsgAudienceStaff(m);
    const readCount = Object.keys(m.reads||{}).length;
    const pct = staff.length ? Math.round(readCount/staff.length*100) : 0;
    const isAct = m.id === _bcActiveId;
    const dateStr = new Date(m.postedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const hasDeadline = !!m.deadline;
    const deadlineDate = hasDeadline ? new Date(m.deadline+'T12:00:00') : null;
    const overdue = deadlineDate && deadlineDate < new Date();

    return `<div onclick="renderMessageDetail('${m.id}')"
      style="padding:10px;margin-bottom:4px;border-radius:6px;cursor:pointer;border:1px solid;transition:all 0.15s;
      ${isAct?'background:rgba(46,125,209,0.15);border-color:var(--accent2);':'background:rgba(255,255,255,0.03);border-color:transparent;'}">
      <div style="display:flex;align-items:flex-start;gap:6px;">
        <span style="font-size:14px;flex-shrink:0;">${m.pinned?'📌':cfg.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.subject}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:1px;">${dateStr} · ${m.audience}</div>
          ${hasDeadline ? `<div style="font-size:9px;color:${overdue?'var(--red2)':'var(--amber2)'};">${overdue?'⚠ OVERDUE':'⏰ Due'}: ${new Date(m.deadline+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>` : ''}
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
            <div style="flex:1;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
              <div style="height:3px;background:${pct===100?'var(--green2)':'var(--accent2)'};width:${pct}%;border-radius:2px;"></div>
            </div>
            <span style="font-size:8px;color:var(--text3);">${readCount}/${staff.length} read</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderMessageDetail(id) {
  _bcActiveId = id;
  renderBroadcastList();
  showBcDetail();

  const m = bcById(id);
  const el = document.getElementById('bc-msg-detail');
  if (!el || !m) return;

  const cfg = BC_TYPE_CFG[m.type] || BC_TYPE_CFG.General;
  const staff = getMsgAudienceStaff(m);
  const readCount = Object.keys(m.reads||{}).length;
  const pct = staff.length ? Math.round(readCount/staff.length*100) : 0;
  const dateStr = new Date(m.postedAt).toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const hasDeadline = !!m.deadline;
  const overdue = hasDeadline && new Date(m.deadline+'T12:00:00') < new Date();

  const notRead = staff.filter(s=>!(m.reads||{})[s.name]);
  const hasRead = staff.filter(s=> !!(m.reads||{})[s.name]);

  const staffRow = (s, done) => {
    const jobCol = IV_ROLE_COLOR[s.job]||'var(--text2)';
    const ts = done && m.reads[s.name] ? new Date(m.reads[s.name]).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <input type="checkbox" ${done?'checked':''} onchange="markRead('${id}','${s.name.replace(/'/g,"\\'")}',this)"
        style="width:15px;height:15px;cursor:pointer;accent-color:var(--green2);flex-shrink:0;">
      <span style="flex:1;font-size:11px;color:${done?'var(--text2)':'var(--white)'};">${s.name}</span>
      <span style="font-size:9px;color:${jobCol};">${s.job}</span>
      ${done?`<span style="font-size:9px;color:var(--green2);">✓ ${ts}</span>`:`<span style="font-size:9px;color:var(--text3);">Pending</span>`}
    </div>`;
  };

  // Format body with line breaks
  const formattedBody = (m.body||'').replace(/\n/g,'<br>');

  el.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border);">
      <span style="font-size:28px;flex-shrink:0;">${cfg.icon}</span>
      <div style="flex:1;">
        <div style="font-size:17px;font-weight:700;color:var(--white);margin-bottom:4px;">${m.subject}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--text3);">
          <span style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:1px 8px;color:${cfg.color};">${cfg.icon} ${m.type}</span>
          <span>👥 ${m.audience}</span>
          <span>👤 ${m.postedBy}</span>
          <span>🕐 ${dateStr}</span>
          ${m.pinned?'<span style="color:var(--amber2);">📌 Pinned</span>':''}
          ${hasDeadline?`<span style="color:${overdue?'var(--red2)':'var(--amber2)'};">${overdue?'⚠ OVERDUE':'⏰ Action by'}: ${new Date(m.deadline+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>`:''}
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button onclick="togglePin('${id}')" title="${m.pinned?'Unpin':'Pin'}" style="background:none;border:1px solid var(--border);border-radius:4px;padding:3px 7px;color:var(--amber2);cursor:pointer;font-size:11px;">${m.pinned?'📌 Pinned':'📌 Pin'}</button>
        <button onclick="copyBroadcastToClipboard('${id}')" title="Copy to clipboard" style="background:none;border:1px solid var(--border);border-radius:4px;padding:3px 7px;color:var(--teal2);cursor:pointer;font-size:11px;">📋 Copy</button>
        <button onclick="emailBroadcast('${id}')" title="Email to staff" style="background:none;border:1px solid var(--border);border-radius:4px;padding:3px 7px;color:var(--accent2);cursor:pointer;font-size:11px;">📧 Email</button>
        <button onclick="printSingleMessage('${id}')" title="Print / Save as PDF" style="background:none;border:1px solid var(--border);border-radius:4px;padding:3px 7px;color:var(--text2);cursor:pointer;font-size:11px;">🖨 Print/PDF</button>
        <button onclick="openBroadcastCompose()" title="Compose New" style="background:none;border:1px solid var(--border);border-radius:4px;padding:3px 7px;color:var(--accent2);cursor:pointer;font-size:11px;">+ New</button>
        <button onclick="deleteMessage('${id}')" title="Delete" style="background:none;border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:3px 7px;color:var(--red2);cursor:pointer;font-size:11px;">✕</button>
      </div>
    </div>

    <!-- Message body -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-left:3px solid ${cfg.color};border-radius:8px;padding:16px 18px;margin-bottom:18px;font-size:12px;color:var(--text);line-height:1.7;">${formattedBody}</div>

    <!-- Read tracking -->
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:${pct===100?'var(--green2)':'var(--accent2)'};">${pct}%</div>
        <div style="font-size:10px;color:var(--text3);">Read Receipt</div>
      </div>
      <div style="flex:1;min-width:90px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${readCount}</div>
        <div style="font-size:10px;color:var(--text3);">Acknowledged</div>
      </div>
      <div style="flex:1;min-width:90px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:${notRead.length>0?'var(--amber2)':'var(--green2)'};">${notRead.length}</div>
        <div style="font-size:10px;color:var(--text3);">Pending</div>
      </div>
      <div style="display:flex;align-items:center;">
        <button onclick="markAllRead('${id}')" style="padding:8px 14px;background:rgba(37,168,104,0.15);border:1px solid rgba(37,168,104,0.4);border-radius:6px;color:var(--green2);font-size:11px;font-weight:700;cursor:pointer;">✓ Mark All Read</button>
      </div>
    </div>

    <!-- Staff read columns -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:8px;">⏳ Pending (${notRead.length})</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 12px;max-height:350px;overflow-y:auto;">
          ${notRead.length ? notRead.map(s=>staffRow(s,false)).join('') : '<div style="font-size:11px;color:var(--green2);padding:8px 0;">All acknowledged ✓</div>'}
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--green2);margin-bottom:8px;">✓ Read (${hasRead.length})</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 12px;max-height:350px;overflow-y:auto;">
          ${hasRead.length ? hasRead.map(s=>staffRow(s,true)).join('') : '<div style="font-size:11px;color:var(--text3);padding:8px 0;">None yet</div>'}
        </div>
      </div>
    </div>`;
}

function renderBoardMessages() {
  const el = document.getElementById('board-messages-list');
  if (!el) return;
  const msgs = (state.messages||[]).slice()
    .sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || b.created-a.created)
    .slice(0,5);
  if (!msgs.length) {
    el.innerHTML = '<span style="color:var(--text3);font-size:11px;">No messages posted yet.</span>';
    return;
  }
  el.innerHTML = msgs.map(m => {
    const cfg = BC_TYPE_CFG[m.type] || BC_TYPE_CFG.General;
    const staff = getMsgAudienceStaff(m);
    const readCount = Object.keys(m.reads||{}).length;
    const pct = staff.length ? Math.round(readCount/staff.length*100) : 0;
    const dateStr = new Date(m.postedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const overdue = m.deadline && new Date(m.deadline+'T12:00:00') < new Date();
    return `<div onclick="switchTab(document.querySelector('[data-panel=broadcast]'));setTimeout(()=>renderMessageDetail('${m.id}'),100);"
      style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;" title="Click to open">
      <span style="font-size:16px;flex-shrink:0;">${m.pinned?'📌':cfg.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.subject}</div>
        <div style="font-size:9px;color:var(--text3);">${dateStr} · ${m.audience}${overdue?' · <span style="color:var(--red2);">⚠ OVERDUE</span>':''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:10px;font-weight:700;color:${pct===100?'var(--green2)':'var(--text3)'};">${pct}%</div>
        <div style="font-size:9px;color:var(--text3);">read</div>
      </div>
    </div>`;
  }).join('');
}

function printBulletin() {
  const type     = document.getElementById('bc-type')?.value     || 'General';
  const audience = document.getElementById('bc-audience')?.value || 'All Staff';
  const author   = document.getElementById('bc-author')?.value   || 'Manager';
  const subject  = document.getElementById('bc-subject')?.value  || '(No Subject)';
  const body     = document.getElementById('bc-body')?.value     || '';
  const deadline = document.getElementById('bc-deadline')?.value || '';
  const cfg = BC_TYPE_CFG[type] || BC_TYPE_CFG.General;
  _printBulletinHtml(subject, body, type, audience, author, deadline, cfg, getMsgAudienceStaff({audience}));
}

function printSingleMessage(id) {
  const m = bcById(id);
  if (!m) return;
  const cfg = BC_TYPE_CFG[m.type] || BC_TYPE_CFG.General;
  _printBulletinHtml(m.subject, m.body, m.type, m.audience, m.postedBy, m.deadline, cfg, getMsgAudienceStaff(m));
}

function _printBulletinHtml(subject, body, type, audience, author, deadline, cfg, staff) {
  const dateStr = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const formattedBody = body.replace(/\n/g,'<br>');
  const signRows = staff.map(s=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.name}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.job}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;width:140px;"></td><td style="padding:8px 12px;border-bottom:1px solid #eee;width:100px;"></td></tr>`).join('');
  const w = window.open('','_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>3B Staff Bulletin</title>
  <style>body{font-family:Arial,sans-serif;margin:0;padding:0;color:#111;}
  .header{background:#1a4480;color:#fff;padding:16px 24px;}
  .meta{display:flex;gap:20px;font-size:11px;margin-top:6px;opacity:0.85;}
  .badge{display:inline-block;background:rgba(255,255,255,0.2);border-radius:8px;padding:2px 10px;font-size:11px;}
  .body-box{margin:20px 24px;padding:16px;border-left:4px solid #1a4480;background:#f8faff;font-size:13px;line-height:1.7;}
  .deadline{margin:12px 24px;padding:10px 16px;background:#fff3cd;border-left:4px solid #f0a500;font-size:12px;}
  .signoff{margin:20px 24px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th{background:#f0f4fa;padding:8px 12px;text-align:left;border-bottom:2px solid #dde;}
  @media print{.no-print{display:none;}}</style></head><body>
  <div class="header">
    <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">3B Tele Med Surg · AOMC Nursing Operations · ${dateStr}</div>
    <div style="font-size:20px;font-weight:700;">${cfg.icon} ${subject}</div>
    <div class="meta">
      <span class="badge">${type}</span>
      <span>Audience: ${audience}</span>
      <span>Posted by: ${author}</span>
    </div>
  </div>
  ${deadline?`<div class="deadline">⏰ <strong>Action Required By:</strong> ${new Date(deadline+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>`:''}
  <div class="body-box">${formattedBody}</div>
  <div class="signoff">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;border-bottom:2px solid #1a4480;padding-bottom:6px;">Staff Sign-Off / Read Receipt</div>
    <table>
      <thead><tr><th>Name</th><th>Role</th><th>Signature / Initials</th><th>Date</th></tr></thead>
      <tbody>${signRows}</tbody>
    </table>
  </div>
  <div style="margin:20px 24px;font-size:10px;color:#888;">Printed: ${new Date().toLocaleString()} · 3B Tele Med Surg · AOMC</div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ════════════════════════════════════
//  RRT / CODE LOG
// ════════════════════════════════════
const RRT_TYPE_CFG = {
  'RRT':         { icon:'🟡', color:'var(--amber2)',  bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.4)'  },
  'Code Blue':   { icon:'🔴', color:'var(--red2)',    bg:'rgba(239,68,68,0.12)',   border:'rgba(239,68,68,0.5)'   },
  'Stroke Code': { icon:'🟣', color:'var(--purple2)', bg:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.4)'  },
  'STEMI':       { icon:'🟠', color:'var(--accent2)', bg:'rgba(79,163,232,0.12)', border:'rgba(79,163,232,0.4)'  },
  'Other':       { icon:'⚪', color:'var(--text2)',   bg:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.15)' },
};

function initRrtLog() {
  const yrSel = document.getElementById('rrt-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    for (let y=cur-1;y<=cur+1;y++){const o=document.createElement('option');o.value=y;o.textContent=y;if(y===cur)o.selected=true;yrSel.appendChild(o);}
  }
  renderRrtLog();
}

function openRrtModal(id) {
  const m=document.getElementById('rrt-modal'); if(!m)return; m.style.display='flex';
  document.getElementById('rrt-edit-id').value=id||'';
  if(id){const e=(state.rrtLog||[]).find(r=>r.id===id);if(e){document.getElementById('rrt-date').value=e.date||'';document.getElementById('rrt-time').value=e.time||'';document.getElementById('rrt-room').value=e.room||'';document.getElementById('rrt-type').value=e.type||'RRT';document.getElementById('rrt-patient').value=e.patient||'';document.getElementById('rrt-responders').value=e.responders||'';document.getElementById('rrt-outcome').value=e.outcome||'';document.getElementById('rrt-debrief').checked=!!e.debrief;document.getElementById('rrt-notes').value=e.notes||'';}}
  else{const now=new Date();document.getElementById('rrt-date').value=now.toISOString().split('T')[0];document.getElementById('rrt-time').value=now.toTimeString().slice(0,5);['rrt-room','rrt-patient','rrt-responders','rrt-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('rrt-debrief').checked=false;}
}
function closeRrtModal(){const m=document.getElementById('rrt-modal');if(m)m.style.display='none';}

function saveRrtEvent(){
  const editId=document.getElementById('rrt-edit-id')?.value||'';
  const entry={id:editId||'rrt_'+Date.now(),date:document.getElementById('rrt-date')?.value||'',time:document.getElementById('rrt-time')?.value||'',room:document.getElementById('rrt-room')?.value||'',type:document.getElementById('rrt-type')?.value||'RRT',patient:document.getElementById('rrt-patient')?.value||'',responders:document.getElementById('rrt-responders')?.value||'',outcome:document.getElementById('rrt-outcome')?.value||'',debrief:document.getElementById('rrt-debrief')?.checked||false,notes:document.getElementById('rrt-notes')?.value||'',ts:Date.now()};
  if(!state.rrtLog)state.rrtLog=[];
  if(editId){const i=state.rrtLog.findIndex(r=>r.id===editId);if(i>=0)state.rrtLog[i]=entry;else state.rrtLog.unshift(entry);}
  else state.rrtLog.unshift(entry);
  persistSave();closeRrtModal();renderRrtLog();
}

function deleteRrtEvent(id){if(!confirm('Delete this event?'))return;state.rrtLog=(state.rrtLog||[]).filter(r=>r.id!==id);persistSave();renderRrtLog();}

function renderRrtLog(){
  const yr=parseInt(document.getElementById('rrt-year')?.value)||new Date().getFullYear();
  const typeF=document.getElementById('rrt-type-filter')?.value||'ALL';
  let list=(state.rrtLog||[]).filter(r=>new Date((r.date||'2000-01-01')+'T12:00:00').getFullYear()===yr);
  if(typeF!=='ALL')list=list.filter(r=>r.type===typeF);
  list=list.slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const sumEl=document.getElementById('rrt-summary');
  if(sumEl){const counts={};Object.keys(RRT_TYPE_CFG).forEach(k=>counts[k]=0);list.forEach(r=>{if(counts[r.type]!==undefined)counts[r.type]++;});sumEl.innerHTML=Object.entries(RRT_TYPE_CFG).map(([k,c])=>`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">${c.icon}</span><div><div style="font-size:20px;font-weight:700;color:${c.color};">${counts[k]}</div><div style="font-size:10px;color:var(--text3);">${k}</div></div></div>`).join('');}
  const tEl=document.getElementById('rrt-table');if(!tEl)return;
  if(!list.length){tEl.innerHTML='<div style="text-align:center;padding:50px;color:var(--text3);"><div style="font-size:32px;margin-bottom:10px;">🚨</div><div style="font-size:13px;color:var(--white);">No events logged</div></div>';return;}
  tEl.innerHTML='<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(r=>{const c=RRT_TYPE_CFG[r.type]||RRT_TYPE_CFG.Other;const dateStr=r.date?new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'-';return`<div style="background:rgba(255,255,255,0.03);border:1px solid ${c.border};border-left:3px solid ${c.color};border-radius:8px;padding:12px 14px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;"><div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-size:13px;">${c.icon}</span><span style="font-size:13px;font-weight:700;color:${c.color};">${r.type}</span><span style="font-size:11px;color:var(--text3);">${dateStr} ${r.time||''}</span>${r.room?`<span style="font-size:11px;color:var(--text3);">Room ${r.room}</span>`:''}</div><div style="font-size:11px;color:var(--text2);">${r.outcome?'Outcome: <strong>'+r.outcome+'</strong>':''} ${r.debrief?'<span style="color:var(--green2);margin-left:8px;">✓ Debriefed</span>':''}</div>${r.responders?`<div style="font-size:10px;color:var(--text3);margin-top:2px;">Responders: ${r.responders}</div>`:''} ${r.notes?`<div style="font-size:10px;color:var(--text3);margin-top:4px;">${r.notes}</div>`:''}</div><div style="display:flex;gap:4px;flex-shrink:0;"><button onclick="openRrtModal('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button><button onclick="deleteRrtEvent('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></div></div></div>`;}).join('')+'</div>';
}

// ════════════════════════════════════
//  OVERTIME TRACKER
// ════════════════════════════════════
function currentPayPeriod(){
  const d=new Date();const anchor=new Date('2026-01-04');// biweekly anchor
  const days=Math.floor((d-anchor)/86400000);const ppNum=Math.floor(days/14);
  const ppStart=new Date(anchor);ppStart.setDate(anchor.getDate()+ppNum*14);
  return ppStart.toISOString().split('T')[0];
}

function initOtTab(){
  const ppSel=document.getElementById('ot-pp-filter');
  if(ppSel&&!ppSel.options.length){
    const cur=currentPayPeriod();
    const d=new Date('2026-01-04');
    for(let i=0;i<26;i++){const o=document.createElement('option');o.value=d.toISOString().split('T')[0];o.textContent='PP '+d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+(i===0?' (current)':'');if(d.toISOString().split('T')[0]===cur)o.selected=true;ppSel.appendChild(o);d.setDate(d.getDate()+14);}
  }
  const dl=document.getElementById('ot-staff-dl');
  if(dl)dl.innerHTML=MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
  const ppIn=document.getElementById('ot-pp');if(ppIn&&!ppIn.value)ppIn.value=currentPayPeriod();
  renderOtTab();
}

function openOtModal(key){
  const m=document.getElementById('ot-modal');if(!m)return;m.style.display='flex';
  document.getElementById('ot-edit-key').value=key||'';
  if(key){const[name,pp]=key.split('||');const e=((state.otLog||{})[name]||[]).find(r=>r.payPeriod===pp);if(e){document.getElementById('ot-name').value=name;document.getElementById('ot-pp').value=pp;document.getElementById('ot-reg').value=e.regularHrs||'';document.getElementById('ot-hrs').value=e.otHrs||'';document.getElementById('ot-type').value=e.premiumType||'OT';document.getElementById('ot-approved').checked=!!e.approved;document.getElementById('ot-notes').value=e.notes||'';return;}}
  ['ot-name','ot-reg','ot-hrs','ot-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('ot-pp').value=currentPayPeriod();
  document.getElementById('ot-approved').checked=false;
}
function closeOtModal(){const m=document.getElementById('ot-modal');if(m)m.style.display='none';}

function saveOtEntry(){
  const name=(document.getElementById('ot-name')?.value||'').trim();if(!name){alert('Enter staff name.');return;}
  const pp=document.getElementById('ot-pp')?.value||currentPayPeriod();
  const entry={payPeriod:pp,regularHrs:parseFloat(document.getElementById('ot-reg')?.value)||0,otHrs:parseFloat(document.getElementById('ot-hrs')?.value)||0,premiumType:document.getElementById('ot-type')?.value||'OT',approved:document.getElementById('ot-approved')?.checked||false,notes:document.getElementById('ot-notes')?.value||''};
  if(!state.otLog)state.otLog={};if(!state.otLog[name])state.otLog[name]=[];
  const idx=state.otLog[name].findIndex(r=>r.payPeriod===pp);
  if(idx>=0)state.otLog[name][idx]=entry;else state.otLog[name].unshift(entry);
  persistSave();closeOtModal();renderOtTab();
}

function deleteOtEntry(name,pp){if(!confirm('Delete this OT entry?'))return;if(!state.otLog?.[name])return;state.otLog[name]=state.otLog[name].filter(r=>r.payPeriod!==pp);persistSave();renderOtTab();}

function renderOtTab(){
  const pp=document.getElementById('ot-pp-filter')?.value||currentPayPeriod();
  const roleF=document.getElementById('ot-role-filter')?.value||'ALL';
  let staffList=MASTER_STAFF.filter(s=>roleF==='ALL'||s.job===roleF);
  const rows=[];let totalOt=0,totalReg=0;
  staffList.forEach(s=>{const entries=(state.otLog||{})[s.name]||[];const entry=entries.find(e=>e.payPeriod===pp);if(entry&&entry.otHrs>0){totalOt+=entry.otHrs;totalReg+=entry.regularHrs;rows.push({...s,entry});}});
  rows.sort((a,b)=>b.entry.otHrs-a.entry.otHrs);
  const sumEl=document.getElementById('ot-summary');
  if(sumEl){const ppDate=new Date(pp+'T12:00:00');const ppEnd=new Date(ppDate);ppEnd.setDate(ppDate.getDate()+13);const ppLabel=ppDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+ppEnd.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});sumEl.innerHTML=`<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 18px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;"><div><div style="font-size:11px;color:var(--text3);">Pay Period</div><div style="font-size:13px;font-weight:700;color:var(--white);">${ppLabel}</div></div><div><div style="font-size:11px;color:var(--text3);">Total OT Hours</div><div style="font-size:22px;font-weight:700;color:var(--red2);">${totalOt.toFixed(1)}</div></div><div><div style="font-size:11px;color:var(--text3);">Staff with OT</div><div style="font-size:22px;font-weight:700;color:var(--amber2);">${rows.length}</div></div></div>`;}
  const tEl=document.getElementById('ot-table');if(!tEl)return;
  if(!rows.length){tEl.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);">No overtime logged for this pay period.</div>';return;}
  tEl.innerHTML='<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(255,255,255,0.05);"><th style="padding:10px;text-align:left;font-size:10px;color:var(--text3);">Staff</th><th style="padding:10px;text-align:left;font-size:10px;color:var(--text3);">Role</th><th style="padding:10px;text-align:right;font-size:10px;color:var(--text3);">Regular Hrs</th><th style="padding:10px;text-align:right;font-size:10px;color:var(--text3);">OT Hrs</th><th style="padding:10px;text-align:left;font-size:10px;color:var(--text3);">Type</th><th style="padding:10px;text-align:left;font-size:10px;color:var(--text3);">Approved</th><th style="padding:10px;text-align:left;font-size:10px;color:var(--text3);">Notes</th><th style="padding:10px;"></th></tr></thead><tbody>'+rows.map(r=>{const rCol=IV_ROLE_COLOR[r.job]||'var(--text2)';return`<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:10px;font-size:12px;font-weight:600;color:var(--white);">${r.name}</td><td style="padding:10px;font-size:11px;color:${rCol};">${r.job}</td><td style="padding:10px;text-align:right;font-size:12px;color:var(--text2);">${r.entry.regularHrs}</td><td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:var(--red2);">${r.entry.otHrs}</td><td style="padding:10px;font-size:11px;color:var(--text2);">${r.entry.premiumType}</td><td style="padding:10px;">${r.entry.approved?'<span style="color:var(--green2);font-size:11px;">✓ Yes</span>':'<span style="color:var(--text3);font-size:11px;">Pending</span>'}</td><td style="padding:10px;font-size:10px;color:var(--text3);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.entry.notes||'—'}</td><td style="padding:10px;"><button onclick="deleteOtEntry('${r.name.replace(/'/g,"\\'")}','${r.entry.payPeriod}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></td></tr>`;}).join('')+'</tbody></table></div>';
}

