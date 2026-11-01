

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


function toggleStaffAgencyFields(prefix) {
  document.getElementById(prefix+'-agency-dates').style.display = document.getElementById(prefix+'-agency').checked ? 'flex' : 'none';
}
function loadStaffDetails(prefix, name) {
  const ag = state.agencyDates[name] || {};
  const values = {phone:state.phones[name], email:state.emails[name], 'contract-number':ag.contractNum, hire:state.hireDates[name], birthday:state.birthdays[name], shift:state.empShifts[name], fte:state.empFTE[name], 'contract-start':ag.contractStart, 'contract-end':ag.contractEnd};
  Object.entries(values).forEach(([key,val]) => document.getElementById(prefix+'-'+key).value = val || '');
  document.getElementById(prefix+'-agency').checked = !!ag.isAgency;
  toggleStaffAgencyFields(prefix);
}
function saveStaffDetails(prefix, name) {
  const value = key => document.getElementById(prefix+'-'+key).value.trim();
  const birthday = value('birthday');
  if (birthday && !/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(birthday)) { alert('Enter birthday as MM/DD.'); return false; }
  const isAgency = document.getElementById(prefix+'-agency').checked;
  const start = value('contract-start'), end = value('contract-end');
  if (isAgency && start && end && end < start) { alert('Agency end date must be on or after the start date.'); return false; }
  state.phones[name] = value('phone'); state.emails[name] = value('email'); state.hireDates[name] = value('hire');
  state.birthdays[name] = birthday; state.empShifts[name] = value('shift'); state.empFTE[name] = value('fte');
  const ag = state.agencyDates[name] = {...(state.agencyDates[name] || {}), isAgency};
  if (isAgency) { ag.contractStart = start; ag.contractEnd = end; ag.contractNum = value('contract-number'); }
  else ['contractStart','contractEnd','extensionEnd'].forEach(key => delete ag[key]);
  state.empOrientation[name] = true;
  return true;
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

  if (!saveStaffDetails('new-emp', name)) return;
  state.customStaff.push({ name, job });
  rebuildMasterStaff();

  // ── Auto-add to Orientation tab ──────────────────────────────
  if (!state.orientation) state.orientation = {};
  if (!state.orientation[name]) {
    const today      = new Date().toISOString().split('T')[0];
    const isAgencyNw = !!(state.agencyDates && state.agencyDates[name]?.isAgency);
    const oriRole    = isAgencyNw ? 'Agency RN' : job;
    const defaultWk  = isAgencyNw ? 3 : (job === 'CA') ? 6 : 12;
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
  loadStaffDetails('new-emp', '');
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
        ? `<span style="font-size:11px;background:rgba(239,68,68,0.15);color:var(--red2);border-radius:4px;padding:1px 4px;margin-left:3px;">${cls==='missing'?'MISSING':cls==='critical'?'EXPIRED/DUE':'SOON'}</span>`
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
          ${bdaySoon  ? `<span style="font-size:11px;color:var(--purple2);">🎂 Birthday Soon</span>` : ''}
          ${annivSoon ? `<span style="font-size:11px;color:var(--amber2);">🏅 Anniversary Soon</span>` : ''}
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
          ${(state.certDisplayMode==='dueNow') ? '<span style="font-size:11px;background:rgba(239,68,68,0.15);color:var(--red2);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:1px 7px;margin-left:6px;font-weight:700;">⚠ Due Now / Expiring</span>' : ''}
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
               ? '<span style="font-size:11px;background:rgba(239,68,68,0.15);color:var(--red2);border-radius:4px;padding:1px 4px;margin-left:3px;">'+(cls==='critical'?'DUE':'SOON')+'</span>'
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
    return '<div><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">' + f[1] + '</div>'
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
    + '<button onclick="openProfileForm(\'' + safeN + '\');this.closest(\'#emp-profile-overlay\').remove();" style="font-size:11px;padding:4px 10px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:5px;color:var(--purple2);cursor:pointer;">Staff Form</button>'
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