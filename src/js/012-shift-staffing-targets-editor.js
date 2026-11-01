

// ════════════════════════════════════
//  SHIFT STAFFING TARGETS EDITOR
// ════════════════════════════════════

const SHIFT_TARGET_GROUPS = [
  {
    label: '🩺 RN / LPN Shifts', color: 'var(--accent2)',
    shifts: [
      { key:'0700-1500', label:'Day (0700–1500)',        roles:['RN','LPN'] },
      { key:'1500-1900', label:'Eve Early (1500–1900)',  roles:['RN','LPN'] },
      { key:'1900-0700', label:'Night (1900–0700)',      roles:['RN','LPN'] },
    ]
  },
  {
    label: '🏥 Clinical Assistant Shifts', color: 'var(--teal2)',
    shifts: [
      { key:'0630-1430', label:'CA Day (0630–1430)',       roles:['CA'] },
      { key:'1430-1830', label:'CA Eve Early (1430–1830)', roles:['CA'] },
      { key:'1830-2230', label:'CA Eve Late (1830–2230)',  roles:['CA'] },
      { key:'2230-0630', label:'CA Night (2230–0630)',     roles:['CA'] },
      { key:'0630-1830', label:'CA Long Day (0630–1830)',  roles:['CA'] },
      { key:'1430-0300', label:'CA Long Eve (1430–0300)',  roles:['CA'] },
      { key:'1830-0630', label:'CA Long Night (1830–0630)',roles:['CA'] },
    ]
  },
  {
    label: '📋 Unit Clerk Shifts', color: 'var(--amber2)',
    shifts: [
      { key:'0700-1500_uc', label:'UC Day (0700–1500)',   roles:['UC'] },
      { key:'1500-2300',    label:'UC Eve (1500–2300)',   roles:['UC'] },
      { key:'2300-0700',    label:'UC Night (2300–0700)', roles:['UC'] },
    ]
  },
];

const ROLE_COLORS = { RN:'var(--accent2)', LPN:'var(--purple2)', CA:'var(--teal2)', UC:'var(--amber2)' };

function renderShiftTargets() {
  const el = document.getElementById('shift-targets-grid');
  if (!el) return;
  const reqs = getRiskReqs();

  el.innerHTML = SHIFT_TARGET_GROUPS.map(group => {
    const rows = group.shifts.map(sh => {
      const cur = reqs[sh.key] || {};
      const roleInputs = ['RN','LPN','CA','UC'].map(role => {
        const isRelevant = sh.roles.includes(role);
        const val = cur[role] !== undefined ? cur[role] : (RISK_REQS_DEFAULT[sh.key]?.[role] ?? 0);
        const col = ROLE_COLORS[role];
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:52px;">
          <div style="font-size:11px;font-weight:700;color:${isRelevant?col:'var(--text3)'};">${role}</div>
          <input type="number" min="0" max="20"
            value="${val}"
            data-shift="${sh.key}" data-role="${role}"
            onchange="onShiftTargetChange(this)"
            style="width:44px;text-align:center;background:${isRelevant?'var(--slate)':'rgba(255,255,255,0.03)'};border:1px solid ${isRelevant?'var(--border)':'rgba(255,255,255,0.06)'};border-radius:4px;padding:4px 0;color:${isRelevant?'var(--white)':'var(--text3)'};font-size:13px;font-weight:700;outline:none;${!isRelevant?'pointer-events:none;':''}"
            ${!isRelevant?'tabindex="-1"':''}
          >
        </div>`;
      }).join('');

      return `<div style="display:flex;align-items:center;gap:12px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.04);">
        <div style="min-width:180px;font-size:11px;color:var(--text2);">${sh.label}</div>
        <div style="display:flex;gap:10px;align-items:flex-end;">${roleInputs}</div>
        <button onclick="resetSingleShift('${sh.key}')"
          style="margin-left:auto;font-size:11px;padding:2px 7px;background:none;border:1px solid var(--border);border-radius:3px;color:var(--text3);cursor:pointer;white-space:nowrap;"
          title="Reset this shift to default">↺</button>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:${group.color};padding:6px 10px 4px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px;">
        ${group.label}
        <span style="font-size:11px;color:var(--text3);font-weight:400;">— set minimum required per shift</span>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

function onShiftTargetChange(input) {
  const shift = input.dataset.shift;
  const role  = input.dataset.role;
  const val   = parseInt(input.value) || 0;
  if (!state.shiftTargets) state.shiftTargets = {};
  if (!state.shiftTargets[shift]) {
    state.shiftTargets[shift] = Object.assign({}, RISK_REQS_DEFAULT[shift] || {});
  }
  state.shiftTargets[shift][role] = val;
  // Live visual feedback
  input.style.borderColor = val !== (RISK_REQS_DEFAULT[shift]?.[role] ?? 0)
    ? 'var(--amber2)' : 'var(--border)';
}

function saveShiftTargets() {
  persistSave();
  // Refresh risk and board
  renderRisk();
  renderBoardCertAlerts();
  showSaveBanner('✅ Staffing targets saved');
}

function resetShiftTargets() {
  if (!confirm('Reset ALL shift targets to system defaults?')) return;
  state.shiftTargets = {};
  persistSave();
  renderShiftTargets();
  renderRisk();
  showSaveBanner('↺ Targets reset to defaults');
}

function resetSingleShift(shiftKey) {
  if (!state.shiftTargets) state.shiftTargets = {};
  delete state.shiftTargets[shiftKey];
  persistSave();
  renderShiftTargets();
  renderRisk();
}

// ════════════════════════════════════
//  BROADCAST SHARE & EXPORT
// ════════════════════════════════════

function copyBroadcastToClipboard(id) {
  const m = id ? bcById(id) : null;
  let subject, body, type, audience, author, deadline;
  if (m) {
    subject = m.subject; body = m.body; type = m.type;
    audience = m.audience; author = m.postedBy; deadline = m.deadline;
  } else {
    subject  = document.getElementById('bc-subject')?.value || '';
    body     = document.getElementById('bc-body')?.value    || '';
    type     = document.getElementById('bc-type')?.value    || 'General';
    audience = document.getElementById('bc-audience')?.value|| 'All Staff';
    author   = document.getElementById('bc-author')?.value  || 'Manager';
    deadline = document.getElementById('bc-deadline')?.value|| '';
  }
  const cfg = BC_TYPE_CFG[type] || BC_TYPE_CFG.General;
  const dateStr = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const deadlineStr = deadline
    ? `\n⏰ Action Required By: ${new Date(deadline+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`
    : '';
  const text = `${cfg.icon} ${subject}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3B Tele Med Surg · AOMC Nursing Operations
${dateStr} · Posted by: ${author} · Audience: ${audience}${deadlineStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${body}

—
3B Tele Med Surg · AOMC Nursing Operations`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showSaveBanner('📋 Copied to clipboard — paste into Teams, Outlook, or text');
    }).catch(() => _fallbackCopy(text));
  } else {
    _fallbackCopy(text);
  }
}

function _fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showSaveBanner('📋 Copied to clipboard'); }
  catch(e) { alert('Copy failed — please select and copy manually.'); }
  document.body.removeChild(ta);
}

function emailBroadcast(id) {
  const m = id ? bcById(id) : null;
  let subject, body, type, audience, author, deadline;
  if (m) {
    subject = m.subject; body = m.body; type = m.type;
    audience = m.audience; author = m.postedBy; deadline = m.deadline;
  } else {
    subject  = document.getElementById('bc-subject')?.value || '';
    body     = document.getElementById('bc-body')?.value    || '';
    type     = document.getElementById('bc-type')?.value    || 'General';
    audience = document.getElementById('bc-audience')?.value|| 'All Staff';
    author   = document.getElementById('bc-author')?.value  || 'Manager';
    deadline = document.getElementById('bc-deadline')?.value|| '';
  }

  // Collect email addresses from directory based on audience
  const staffList = getMsgAudienceStaff(m || { audience });
  const emails = staffList
    .map(s => state.emails[s.name])
    .filter(Boolean);

  const cfg = BC_TYPE_CFG[type] || BC_TYPE_CFG.General;
  const dateStr = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const deadlineStr = deadline
    ? `\r\n\r\n⏰ Action Required By: ${new Date(deadline+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`
    : '';

  const mailSubject = encodeURIComponent(`[3B] ${subject}`);
  const mailBody = encodeURIComponent(
    `${cfg.icon} ${subject}\r\n` +
    `3B Tele Med Surg · AOMC · ${dateStr} · Posted by: ${author}\r\n` +
    `─────────────────────────────────${deadlineStr}\r\n\r\n` +
    `${body}\r\n\r\n` +
    `—\r\n3B Tele Med Surg · AOMC Nursing Operations`
  );

  // Show modal with email info
  const hasEmails = emails.length > 0;
  const noEmailCount = staffList.length - emails.length;

  const modal = document.createElement('div');
  modal.id = 'email-share-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:4000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:24px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px;">📧 Email Broadcast</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:16px;">${subject}</div>

      ${hasEmails ? `
        <div style="background:rgba(37,168,104,0.1);border:1px solid rgba(37,168,104,0.3);border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--green2);">
          ✓ ${emails.length} email address${emails.length>1?'es':''} found in Directory for "${audience}"
          ${noEmailCount > 0 ? `<br><span style="color:var(--amber2);">⚠ ${noEmailCount} staff have no email on file</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">Recipients:</div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;padding:8px;max-height:100px;overflow-y:auto;font-size:11px;color:var(--text2);margin-bottom:14px;font-family:'IBM Plex Mono',monospace;">
          ${emails.join('; ')}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px;">Clicking "Open in Outlook" will open your email client with the recipients and message pre-filled. Review before sending.</div>
      ` : `
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:var(--amber2);">
          ⚠ No email addresses found for "${audience}" in Directory.<br>
          <span style="color:var(--text2);">Add staff emails in the Directory tab first.</span>
        </div>
      `}

      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('email-share-modal').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>
        ${hasEmails ? `<a href="mailto:${encodeURIComponent(emails.join(';'))}?subject=${mailSubject}&body=${mailBody}"
          onclick="document.getElementById('email-share-modal').remove()"
          style="background:var(--accent);border:none;border-radius:5px;padding:6px 16px;color:var(--white);font-size:12px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
          📧 Open in Outlook
        </a>` : ''}
        <button onclick="copyBroadcastToClipboard('${id||''}');document.getElementById('email-share-modal').remove()"
          style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">
          📋 Copy Instead
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ════════════════════════════════════
//  RECOGNITION PRINT & SHARE
// ════════════════════════════════════

function copyRecognitionToClipboard(id) {
  const r = (state.recognition||[]).find(x=>x.id===id);
  if (!r) return;
  const t = REC_TYPES[r.type] || REC_TYPES.Other;
  const dateStr = r.date ? new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '';
  const text = `${t.icon} ${t.label.toUpperCase()}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${r.name}\n3B Tele Med Surg · AOMC Nursing Operations\n${dateStr}\n` +
    (r.submittedBy ? `Recognized by: ${r.submittedBy}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    (r.description || '') + '\n\n' +
    `— 3B Tele Med Surg Management Team`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showSaveBanner('📋 Recognition copied — paste into Teams or email'));
  } else { _fallbackCopy(text); }
}

function emailRecognition(id) {
  const r = (state.recognition||[]).find(x=>x.id===id);
  if (!r) return;
  const t = REC_TYPES[r.type] || REC_TYPES.Other;
  const staffEmail = state.emails[r.name] || '';
  const dateStr = r.date ? new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '';

  const mailSubject = encodeURIComponent(`${t.icon} ${t.label} — ${r.name.split(',')[0]}`);
  const mailBody = encodeURIComponent(
    `${t.icon} ${t.label.toUpperCase()}\r\n` +
    `─────────────────────────────────\r\n` +
    `Congratulations, ${r.name.split(',')[1]||r.name.split(',')[0]}!\r\n\r\n` +
    `${r.description||''}\r\n\r\n` +
    `${r.submittedBy?'Recognized by: '+r.submittedBy+'\r\n':''}` +
    `Date: ${dateStr}\r\n\r\n` +
    `— 3B Tele Med Surg Management Team\r\nAOMC Nursing Operations`
  );

  const to = encodeURIComponent(staffEmail);
  const href = staffEmail
    ? `mailto:${to}?subject=${mailSubject}&body=${mailBody}`
    : `mailto:?subject=${mailSubject}&body=${mailBody}`;

  const modal = document.createElement('div');
  modal.id = 'rec-email-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:4000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:24px;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px;">${t.icon} Share Recognition</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:16px;">${r.name}</div>
      ${staffEmail
        ? `<div style="font-size:11px;color:var(--green2);margin-bottom:14px;">✓ Email on file: ${staffEmail}</div>`
        : `<div style="font-size:11px;color:var(--amber2);margin-bottom:14px;">⚠ No email on file for this staff member — you can still open Outlook and add a recipient manually.</div>`
      }
      <div style="display:flex;gap:8px;flex-direction:column;margin-bottom:16px;">
        <a href="${href}" onclick="document.getElementById('rec-email-modal').remove()"
          style="display:flex;align-items:center;justify-content:center;gap:8px;background:var(--accent);border-radius:6px;padding:9px 16px;color:var(--white);text-decoration:none;font-size:12px;font-weight:600;">
          📧 Open in Outlook (send to ${r.name.split(',')[0]})
        </a>
        <button onclick="printRecognitionCertificate('${id}');document.getElementById('rec-email-modal').remove()"
          style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:6px;padding:9px 16px;color:var(--white);font-size:12px;font-weight:600;cursor:pointer;">
          🖨 Print Certificate (PDF-ready)
        </button>
        <button onclick="copyRecognitionToClipboard('${id}');document.getElementById('rec-email-modal').remove()"
          style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:6px;padding:9px 16px;color:var(--white);font-size:12px;font-weight:600;cursor:pointer;">
          📋 Copy to Clipboard (paste into Teams)
        </button>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px;">💡 To save as PDF: click Print Certificate → in the print dialog select "Save as PDF" as the printer.</div>
      <div style="text-align:right;">
        <button onclick="document.getElementById('rec-email-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:5px;padding:5px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function printRecognitionCertificate(id) {
  const r = (state.recognition||[]).find(x=>x.id===id);
  if (!r) return;
  const t = REC_TYPES[r.type] || REC_TYPES.Other;
  const dateStr = r.date ? new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const firstName = (r.name.split(',')[1]||'').trim().split(' ')[0] || r.name.split(',')[0];
  const fullName  = r.name;

  const typeColors = {
    DAISY:      { bg:'#fffbeb', accent:'#b8860b', light:'#fef3c7' },
    EOM:        { bg:'#f0fdf4', accent:'#15803d', light:'#dcfce7' },
    Compliment: { bg:'#eff6ff', accent:'#1d4ed8', light:'#dbeafe' },
    Director:   { bg:'#faf5ff', accent:'#7c3aed', light:'#ede9fe' },
    Peer:       { bg:'#f0fdfa', accent:'#0f766e', light:'#ccfbf1' },
    Other:      { bg:'#f8fafc', accent:'#1a4480', light:'#e2e8f0' },
  };
  const col = typeColors[r.type] || typeColors.Other;

  const w = window.open('','_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Recognition — ${fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Open+Sans:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Open Sans',Arial,sans-serif; background:#fff; color:#1a1a1a; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
    .cert { width:720px; max-width:100%; border:2px solid ${col.accent}; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .cert-header { background:${col.accent}; color:#fff; padding:28px 36px 22px; text-align:center; }
    .cert-header .org { font-size:10pt; opacity:0.8; letter-spacing:1px; text-transform:uppercase; margin-bottom:6px; }
    .cert-header .type-label { font-size:22pt; font-family:'Playfair Display',serif; font-weight:700; letter-spacing:-0.5px; }
    .cert-header .icon { font-size:40px; margin-bottom:6px; display:block; }
    .cert-body { background:${col.bg}; padding:36px 48px; text-align:center; }
    .cert-body .presented { font-size:9pt; color:#666; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px; }
    .cert-body .name { font-family:'Playfair Display',serif; font-size:32pt; color:${col.accent}; margin-bottom:4px; line-height:1.2; }
    .cert-body .role { font-size:10pt; color:#666; margin-bottom:28px; }
    .cert-body .desc-box { background:${col.light}; border-left:4px solid ${col.accent}; border-radius:6px; padding:16px 20px; text-align:left; margin-bottom:24px; font-size:11pt; line-height:1.6; color:#333; }
    .cert-body .meta { font-size:9pt; color:#888; margin-bottom:8px; }
    .cert-footer { border-top:1px solid ${col.accent}; padding:20px 48px; display:flex; justify-content:space-between; align-items:flex-end; background:#fff; }
    .sig-block { text-align:center; flex:1; }
    .sig-line { border-bottom:1.5px solid #333; height:36px; margin-bottom:4px; }
    .sig-label { font-size:8pt; color:#666; }
    .cert-date { text-align:right; font-size:9pt; color:#888; }
    @media print { body { padding:0; display:block; } .cert { box-shadow:none; border-radius:0; width:100%; } }
    @page { size:landscape; margin:0.4in; }
  </style></head><body>
  <div class="cert">
    <div class="cert-header">
      <div class="org">3B Tele Med Surg · AOMC Nursing Operations</div>
      <span class="icon">${t.icon}</span>
      <div class="type-label">${t.label}</div>
    </div>
    <div class="cert-body">
      <div class="presented">This certificate is proudly presented to</div>
      <div class="name">${firstName}</div>
      <div class="role">${fullName}${r.type==='DAISY'?' · RN, 3B Tele Med Surg':''}</div>
      ${r.description ? `<div class="desc-box">${r.description.replace(/\n/g,'<br>')}</div>` : ''}
      ${r.submittedBy ? `<div class="meta">Recognized by: <strong>${r.submittedBy}</strong></div>` : ''}
      <div class="meta">${dateStr}</div>
    </div>
    <div class="cert-footer">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Unit Manager</div>
      </div>
      <div style="flex:0.3;"></div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Director of Nursing</div>
      </div>
    </div>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

function printRecognitionReport() {
  const yr = parseInt(document.getElementById('rec-filter-year')?.value) || new Date().getFullYear();
  const list = (state.recognition||[])
    .filter(r => new Date((r.date||'2000-01-01')+'T12:00:00').getFullYear() === yr)
    .sort((a,b) => (b.date||'').localeCompare(a.date||''));

  if (!list.length) { alert('No recognitions logged for '+yr+'.'); return; }

  // Leaderboard
  const counts = {};
  list.forEach(r => { counts[r.name] = (counts[r.name]||0)+1; });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const medals = ['🥇','🥈','🥉'];

  const rows = list.map(r => {
    const t = REC_TYPES[r.type] || REC_TYPES.Other;
    const dateStr = r.date ? new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
    return `<tr>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;">${dateStr}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;font-weight:600;">${r.name}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;">${t.icon} ${t.label}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;font-size:9pt;color:#555;">${r.description||'—'}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;color:#777;font-size:9pt;">${r.submittedBy||'—'}</td>
    </tr>`;
  }).join('');

  const lbRows = top.slice(0,10).map(([name,count],i) =>
    `<tr><td style="padding:5px 12px;border-bottom:1px solid #eee;">${medals[i]||''} ${i+1}</td><td style="padding:5px 12px;border-bottom:1px solid #eee;font-weight:600;">${name}</td><td style="padding:5px 12px;border-bottom:1px solid #eee;">${count} recognition${count>1?'s':''}</td></tr>`
  ).join('');

  const w = window.open('','_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Staff Recognition Report ${yr}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:10pt;color:#111;padding:32px;max-width:900px;margin:0 auto;}
    h1{font-size:18pt;margin-bottom:4px;color:#1a4480;} h2{font-size:12pt;margin:20px 0 8px;background:#1a4480;color:#fff;padding:5px 12px;}
    table{width:100%;border-collapse:collapse;} th{background:#f0f4fa;padding:7px 12px;text-align:left;font-size:9pt;border-bottom:2px solid #dde;}
    .stat{display:inline-block;background:#f0f4fa;border-radius:6px;padding:10px 20px;margin:4px;text-align:center;}
    .stat-num{font-size:22pt;font-weight:700;color:#1a4480;} .stat-lbl{font-size:8pt;color:#555;}
    @media print{body{padding:0;} @page{size:letter;margin:0.5in;}}
  </style></head><body>
  <h1>🏆 Staff Recognition Report — ${yr}</h1>
  <div style="font-size:9pt;color:#555;margin-bottom:16px;">3B Tele Med Surg · AOMC Nursing Operations · Printed ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
  <div style="margin-bottom:16px;">
    <div class="stat"><div class="stat-num">${list.length}</div><div class="stat-lbl">Total Recognitions</div></div>
    <div class="stat"><div class="stat-num">${Object.keys(counts).length}</div><div class="stat-lbl">Staff Recognized</div></div>
    ${Object.entries(REC_TYPES).map(([k,t])=>{const c=list.filter(r=>r.type===k).length;return c>0?`<div class="stat"><div class="stat-num">${c}</div><div class="stat-lbl">${t.icon} ${t.label}</div></div>`:'';}).join('')}
  </div>
  <h2>Top Recognized Staff</h2>
  <table><thead><tr><th>Rank</th><th>Name</th><th>Count</th></tr></thead><tbody>${lbRows}</tbody></table>
  <h2>All Recognitions</h2>
  <table><thead><tr><th>Date</th><th>Staff Member</th><th>Type</th><th>Description</th><th>Submitted By</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:24px;font-size:8pt;color:#888;">3B Tele Med Surg · AOMC · Printed ${new Date().toLocaleString()}</div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ════════════════════════════════════
//  ORIENTATION — EDITABLE MILESTONES & WEEK GOALS
// ════════════════════════════════════

// Merged milestone list = built-in + custom
function allOriMilestones() {
  return [...ORI_MILESTONES, ...(state.customOriMilestones || [])];
}

// Merged week goals = custom if set, else built-in default
function getOriGoals(role) {
  const custom = (state.customOriGoals || {})[role];
  if (custom && custom.length) return custom;
  return ORI_WEEK_GOALS[role] || ORI_WEEK_GOALS.RN;
}

// Override renderOrientationDetail to use editable milestones/goals
const _origRenderOrientationDetail = renderOrientationDetail;
function renderOrientationDetail(name) {
  _oriActiveName = name;
  renderOrientationList();
  const dp = document.getElementById('ori-detail');
  if (!dp) return;
  const od = oriData(name);
  const rCol = IV_ROLE_COLOR[od.role] || 'var(--text2)';
  const weekGoals = getOriGoals(od.role);
  const weeksCompleted = Object.values(od.weeks || {}).filter(w => w.passed === true).length;
  const pct = od.totalWeeks ? Math.round(weeksCompleted / od.totalWeeks * 100) : 0;
  const startStr  = od.startDate  ? new Date(od.startDate  + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
  const targetStr = od.targetDate ? new Date(od.targetDate + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
  const safeN = name.replace(/'/g, "\\'");
  const milestones = allOriMilestones();

  const weekRows = Array.from({ length: od.totalWeeks }, (_, i) => {
    const wk = i + 1;
    const wd = (od.weeks || {})[wk] || {};
    const goal = weekGoals[i] || 'Review week objectives with preceptor.';
    const passed = wd.passed === true;
    const failed = wd.passed === false;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:7px 10px;font-size:11px;font-weight:700;color:var(--accent2);white-space:nowrap;">${od.role === 'Agency RN' ? `Day ${wk}` : `Wk ${wk}`}</td>
      <td style="padding:7px 10px;">
        <input type="text" value="${goal.replace(/"/g,'&quot;')}"
          onblur="saveOriGoal('${od.role}',${i},this.value)"
          style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:4px;padding:3px 6px;color:var(--white);font-size:11px;outline:none;">
      </td>
      <td style="padding:7px 10px;white-space:nowrap;">
        <label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;margin-right:8px;font-size:11px;">
          <input type="radio" name="ori-wk-${wk}" value="pass" ${passed ? 'checked' : ''} onchange="saveOriWeek('${safeN}',${wk},'passed',true)" style="accent-color:var(--green2);">
          <span style="color:var(--green2);">✓</span></label>
        <label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;font-size:11px;">
          <input type="radio" name="ori-wk-${wk}" value="remediate" ${failed ? 'checked' : ''} onchange="saveOriWeek('${safeN}',${wk},'passed',false)" style="accent-color:var(--red2);">
          <span style="color:var(--red2);">↺</span></label>
      </td>
      <td style="padding:7px 10px;">
        <input type="text" value="${(wd.notes || '').replace(/"/g,'&quot;')}" placeholder="Notes..."
          onblur="saveOriWeek('${safeN}',${wk},'notes',this.value)"
          style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:4px;padding:3px 6px;color:var(--white);font-size:11px;outline:none;">
      </td>
    </tr>`;
  }).join('');

  const msHtml = milestones.map((ms, idx) => {
    const done = !!((od.milestones || {})[ms.key]);
    const doneDate = (od.milestones || {})[ms.key];
    const isCustom = idx >= ORI_MILESTONES.length;
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <input type="checkbox" ${done ? 'checked' : ''} onchange="saveOriMilestone('${safeN}','${ms.key}',this.checked)"
        style="width:16px;height:16px;cursor:pointer;accent-color:var(--green2);flex-shrink:0;">
      <span style="flex:1;font-size:11px;color:${done ? 'var(--green2)' : 'var(--text2)'};${done ? 'text-decoration:line-through;' : ''}">${ms.label}</span>
      ${isCustom ? `<button onclick="deleteOriMilestone('${ms.key}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;" title="Remove" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>` : ''}
      ${done && doneDate ? `<span style="font-size:11px;color:var(--text3);">${new Date(doneDate + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>` : ''}
    </div>`;
  }).join('');

  dp.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border);">
      <div style="width:44px;height:44px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--navy);flex-shrink:0;">${name.split(',').map(p => p.trim()[0] || '').join('')}</div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:700;color:var(--white);">${name}</div>
        <div style="font-size:11px;color:var(--text3);">🎓 ${od.role} · Preceptor: ${od.preceptor || 'Not assigned'} · Buddy: ${od.buddyLater ? '<span style="color:var(--amber2);">Assign Later</span>' : (od.buddy || '<span style="color:var(--red2);">None</span>')} · Start: ${startStr} · Target: ${targetStr}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="printAgencyOriSheet('${safeN}')" style="font-size:11px;padding:3px 8px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:var(--purple2);cursor:pointer;" title="Print Orientation Sheet">📋 Ori Sheet</button>
        <button onclick="sendOriSheet('${safeN}')" style="font-size:11px;padding:3px 8px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:4px;color:var(--green2);cursor:pointer;" title="Send orientation sheet link via text or copy link">📱 Send</button>
        <button onclick="printOriManager('${safeN}')" style="font-size:11px;padding:3px 8px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:4px;color:var(--accent2);cursor:pointer;">🖨 Print</button>
        <button onclick="openOrientationModal('${safeN}')" style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
        <button onclick="deleteOrientee('${safeN}')" style="font-size:11px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${weeksCompleted}/${od.totalWeeks}</div>
        <div style="font-size:11px;color:var(--text3);">Weeks Passed</div>
        <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;margin-top:8px;"><div style="height:4px;background:var(--accent2);width:${pct}%;border-radius:2px;"></div></div>
      </div>
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${Object.values(od.milestones || {}).filter(Boolean).length}/${milestones.length}</div>
        <div style="font-size:11px;color:var(--text3);">Milestones</div>
      </div>
      <div style="flex:2;min-width:180px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Off-Orientation Date</div>
        <input type="date" value="${od.offDate || ''}" onchange="saveOriField('${safeN}','offDate',this.value)"
          style="background:transparent;border:none;color:var(--green2);font-size:16px;font-weight:700;outline:none;width:100%;">
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">Set when formally released</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">📋 Weekly Goals — click any goal to edit</div>
          <button onclick="resetOriGoals('${od.role}')" style="font-size:11px;padding:2px 7px;background:none;border:1px solid var(--border);border-radius:3px;color:var(--text3);cursor:pointer;">↺ Reset</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">✓ = Passed &nbsp;·&nbsp; ↺ = Remediation &nbsp;·&nbsp; Edit goal text inline</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:rgba(255,255,255,0.04);">
              <th style="padding:6px 10px;font-size:11px;color:var(--text3);text-align:left;">Wk</th>
              <th style="padding:6px 10px;font-size:11px;color:var(--text3);text-align:left;">Goal (editable)</th>
              <th style="padding:6px 10px;font-size:11px;color:var(--text3);">Status</th>
              <th style="padding:6px 10px;font-size:11px;color:var(--text3);text-align:left;">Notes</th>
            </tr></thead>
            <tbody>${weekRows}</tbody>
          </table>
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">🏁 Milestones</div>
          <button onclick="addOriMilestonePrompt()" style="font-size:11px;padding:2px 7px;background:rgba(79,163,232,0.1);border:1px solid rgba(79,163,232,0.3);border-radius:3px;color:var(--accent2);cursor:pointer;">+ Add</button>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:10px;">${msHtml}</div>
        <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:6px;">📝 Preceptor Notes</div>
        <textarea onblur="saveOriNote('${safeN}',this.value)" rows="6"
          style="width:100%;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--white);font-size:11px;font-family:'IBM Plex Sans',sans-serif;resize:vertical;outline:none;box-sizing:border-box;"
          placeholder="Observations, strengths, areas for growth, remediation plans...">${od.notes || ''}</textarea>
      </div>
    </div>

    <!-- ── Meeting Log ── -->
    <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:700;color:var(--white);">📅 Manager Meeting Log <span style="font-size:11px;color:var(--text3);font-weight:400;">(every 2 weeks for first 3 months)</span></div>
        <button onclick="addOriMeetingLog('${safeN}')" style="font-size:11px;padding:4px 10px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:5px;color:var(--accent2);cursor:pointer;">+ Add Meeting</button>
      </div>
      ${(() => {
        // Auto-generate scheduled dates if start date exists
        let schedHtml = '';
        if (od.startDate) {
          const scheduledDates = [];
          for (let i = 1; i <= 6; i++) {
            const d = new Date(od.startDate + 'T12:00:00');
            d.setDate(d.getDate() + i * 14);
            scheduledDates.push(d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }));
          }
          const logged = od.meetingLogs || [];
          schedHtml = `<div style="background:rgba(46,125,209,0.06);border:1px solid rgba(46,125,209,0.2);border-radius:6px;padding:8px 12px;margin-bottom:10px;">
            <div style="font-size:11px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">📆 Scheduled Meeting Dates</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
              ${scheduledDates.map((dt, i) => {
                const isLogged = logged[i];
                return `<div style="font-size:11px;padding:3px 6px;border-radius:4px;background:${isLogged ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)'};border:1px solid ${isLogged ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'};color:${isLogged ? 'var(--green2)' : 'var(--text2)'};">
                  <span style="font-weight:700;">Mtg ${i+1}</span> ${isLogged ? '✓ ' : ''}${dt}
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }
        return schedHtml;
      })()}
      ${(od.meetingLogs||[]).length === 0
        ? `<div style="text-align:center;padding:20px;color:var(--text3);font-size:11px;">No meetings logged yet — add first meeting above</div>`
        : (od.meetingLogs||[]).map((log, li) => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:7px;padding:10px 12px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:11px;font-weight:700;color:var(--accent2);">Meeting ${li+1} — ${log.date || '—'}</span>
            <button onclick="deleteOriMeetingLog('${safeN}',${li})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;" title="Delete log" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><div style="font-size:11px;color:var(--text3);margin-bottom:2px;">ACHIEVEMENTS</div>
              <div style="font-size:11px;color:var(--text2);">${log.achievements || '—'}</div></div>
            <div><div style="font-size:11px;color:var(--text3);margin-bottom:2px;">CONCERNS / SUPPORT NEEDED</div>
              <div style="font-size:11px;color:var(--text2);">${log.concerns || '—'}</div></div>
            <div style="grid-column:1/-1;"><div style="font-size:11px;color:var(--text3);margin-bottom:2px;">FOLLOW UP</div>
              <div style="font-size:11px;color:var(--text2);">${log.followUp || '—'}</div></div>
          </div>
        </div>`).join('')
      }
    </div>

    <!-- ── 30/60/90 Day Check-Ins ── -->
    <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px;">
      <div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:12px;">✅ 30 / 60 / 90-Day Check-Ins</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${[30,60,90].map(days => {
          const ci = (od.checkins || {})[days] || {};
          const targetDt = od.startDate ? (() => {
            const d = new Date(od.startDate + 'T12:00:00');
            d.setDate(d.getDate() + days);
            return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
          })() : '—';
          const done = !!ci.completedDate;
          const safeN2 = safeN;
          return '<div style="flex:1;min-width:200px;background:rgba(255,255,255,0.03);border:1px solid ' + (done?'rgba(34,197,94,0.35)':'var(--border)') + ';border-radius:8px;padding:12px;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
            + '<div style="font-size:12px;font-weight:700;color:' + (done?'var(--green2)':'var(--white)') + ';">' + (done?'✓ ':'') + days + '-Day Check-In</div>'
            + '<div style="display:flex;gap:4px;">'
            + '<button onclick="openCheckinModal(\'' + safeN2 + '\',' + days + ')" style="font-size:11px;padding:2px 8px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:4px;color:var(--accent2);cursor:pointer;">' + (done?'Edit':'Fill Out') + '</button>'
            + '<button onclick="print3060(\'' + safeN2 + '\',' + days + ')" style="font-size:11px;padding:2px 8px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">🖨</button>'
            + '</div></div>'
            + '<div style="font-size:11px;color:var(--text3);">Target: ' + targetDt + '</div>'
            + (done ? '<div style="font-size:11px;color:var(--green2);margin-top:2px;">Completed: ' + ci.completedDate + '</div>' : '')
            + (ci.summary ? '<div style="font-size:11px;color:var(--text2);margin-top:4px;font-style:italic;">' + ci.summary.slice(0,80) + (ci.summary.length>80?'…':'') + '</div>' : '')
            + '</div>';
        }).join('')}
      </div>
    </div>`;
}

const CHECKIN_QUESTIONS = {
  30: [
    'Describe your experience so far in your new role. Is it what you expected?',
    'How have you felt welcomed by your new team and colleagues?',
    'Do you feel you have the necessary information, tools, and resources to perform your job effectively? If not, what additional support would help?',
    'What challenges are you currently facing where you need additional support?',
    'How do you like to receive feedback and recognition?',
    'Do you feel you have a good understanding of your role within the organization/department?',
    'How is your experience going with your preceptor or trainer so far?',
    'How comfortable do you feel reaching out for help or clarification when needed?',
    'Do you feel you are receiving sufficient feedback and support to help you succeed in your role?',
    'Are you finding the Onboarding Plan helpful in assisting you to meet various milestones for the job?',
    'Is there anything else that we have not asked that you would like to share?',
    'Now that you have had time to acclimate to your role, do you feel the responsibilities, schedule, and expectations were communicated clearly and accurately during the interview and onboarding process?',
  ],
  60: [
    'Are you feeling fully integrated and welcomed by your team? Please provide some examples. Are there any team members you would like to recognize?',
    'What parts of the role do you find most and least enjoyable? Is this related to training, resources, or other factors?',
    'Do you feel you have the information, tools, and resources to perform your job successfully? If not, what additional support would be most helpful?',
    'Are you experiencing any challenges in particular that I can help you with?',
    'Have you received enough feedback and guidance from me or others to grow in your role? Please provide examples.',
    'Do you feel you have a solid understanding of your role within the department?',
    'What specific training courses or skill areas do you feel you need to develop further to be successful?',
    'Do you feel comfortable asking for help and sharing ideas?',
    'What can I do to support your success?',
    'Is there anything else that we have not asked that you would like to share?',
  ],
  90: [
    'Do you feel your onboarding process has been successful? What improvements can be made to help new employees be more successful?',
    'Is there anyone who stands out as being supportive and helpful during your onboarding that I may recognize?',
    'How is your current workload? Is it manageable?',
    'What other tools and resources do you need to be effective?',
    'What processes or tasks feel inefficient or unclear? What recommendations do you have on improving them?',
    'What aspects of my leadership have been most helpful to you?',
    'Is there anything I could do differently to better support you?',
    'Do you feel you are receiving sufficient one-on-one time with your leader to support your onboarding?',
    'Are there any roadblocks I can help remove for you?',
    'What feedback do you have for me?',
    'What skills or areas would you like to develop further?',
    'Are there projects or experiences you would like to be involved in?',
    'Do you feel you are growing in your role? Why or why not?',
    'How would you describe the team dynamic?',
    'What is one thing we could do to improve team collaboration?',
    'What has been your biggest win or accomplishment in the last 90 days?',
    'Is there anything you wish you had known sooner?',
    'What can I do to make your work experience more positive?',
    'Is there anything else that we have not asked that you would like to share?',
  ],
};

function openCheckinModal(name, days) {
  var od = oriData(name);
  if (!od.checkins) od.checkins = { 30:{}, 60:{}, 90:{} };
  var ci = od.checkins[days] || {};
  var safeN = name.replace(/'/g, "\\'");
  var qs = CHECKIN_QUESTIONS[days] || [];
  var existing = document.getElementById('checkin-overlay');
  if (existing) existing.remove();

  var fieldsHtml = qs.map(function(q, i) {
    var val = ((ci.responses || {})[i] || '').replace(/</g, '&lt;');
    return '<div style="margin-bottom:10px;">'
      + '<div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:3px;">' + (i+1) + '. ' + q + '</div>'
      + '<textarea id="ci-q-' + i + '" rows="2" style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:5px;padding:6px 8px;color:var(--white);font-size:11px;resize:vertical;outline:none;box-sizing:border-box;" placeholder="Response...">' + val + '</textarea>'
      + '</div>';
  }).join('');

  var ov = document.createElement('div');
  ov.id = 'checkin-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:5000;display:flex;align-items:center;justify-content:center;';

  var saveCall = "saveCheckin('" + safeN + "'," + days + "," + qs.length + ");this.closest('#checkin-overlay').remove();";
  var closeCall = "this.closest('#checkin-overlay').remove()";

  ov.innerHTML =
    '<div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:22px;width:620px;max-width:96vw;max-height:88vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.5);">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
    + '<div><div style="font-size:14px;font-weight:700;color:var(--white);">' + days + '-Day Check-In</div>'
    + '<div style="font-size:11px;color:var(--text3);">' + name + '</div></div>'
    + '<button onclick="document.getElementById(\'checkin-overlay\').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;">&#x2715;</button></div>'
    + '<div style="margin-bottom:10px;"><div class="form-label" style="margin-bottom:3px;">Date Completed</div>'
    + '<input type="date" id="ci-date" value="' + (ci.completedDate || new Date().toISOString().split('T')[0]) + '" style="background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;"></div>'
    + '<div style="max-height:50vh;overflow-y:auto;padding-right:4px;">' + fieldsHtml + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">'
    + '<button onclick="document.getElementById(\'checkin-overlay\').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>'
    + '<button onclick="' + saveCall.replace(/"/g, '&quot;') + '" class="btn btn-primary" style="font-size:12px;padding:6px 18px;">Save Check-In</button>'
    + '</div></div>';

  document.body.appendChild(ov);
}

function saveCheckin(name, days, qCount) {
  var od = oriData(name);
  if (!od.checkins) od.checkins = { 30:{}, 60:{}, 90:{} };
  var responses = {};
  for (var i = 0; i < qCount; i++) {
    var el = document.getElementById('ci-q-' + i);
    if (el && el.value.trim()) responses[i] = el.value.trim();
  }
  var completedDate = document.getElementById('ci-date') ? document.getElementById('ci-date').value : new Date().toISOString().split('T')[0];
  var firstResponse = Object.values(responses)[0] || '';
  od.checkins[days] = { completedDate: completedDate, responses: responses, summary: firstResponse.slice(0, 120) };
  persistSave();
  showSaveBanner('\u2705 ' + days + '-Day check-in saved');
  renderOrientationDetail(name);
}

function print3060(name, days) {
  var od = oriData(name);
  var ci = (od.checkins || {})[days] || {};
  var qs = CHECKIN_QUESTIONS[days] || [];
  var targetDt = od.startDate ? (function() {
    var d = new Date(od.startDate + 'T12:00:00'); d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  })() : 'Not set';

  var qaHtml = qs.map(function(q, i) {
    var resp = ((ci.responses || {})[i] || '').replace(/</g, '&lt;');
    return '<div style="margin-bottom:14px;break-inside:avoid;">'
      + '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:6px;background:#e8f0fe;padding:5px 8px;border-radius:4px;">' + (i+1) + '. ' + q + '</div>'
      + (resp
        ? '<div style="font-size:11px;color:#333;padding:7px 10px;background:#f8f9fa;border-left:3px solid #1e3a5f;border-radius:0 4px 4px 0;">' + resp + '</div>'
        : '<div style="border-bottom:1px solid #ccc;height:22px;margin-bottom:3px;"></div><div style="border-bottom:1px solid #ccc;height:22px;"></div>')
      + '</div>';
  }).join('');

  var styles = '@page{size:letter;margin:0.85in}'
    + 'body{font-family:Arial,sans-serif;font-size:11px;color:#222;margin:0}'
    + '.hb{background:#1e3a5f;color:white;padding:14px 20px;border-radius:6px;margin-bottom:18px}'
    + '.hb h1{font-size:18px;margin:0 0 2px}.hb .sub{font-size:11px;opacity:.75}'
    + '.ig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px}'
    + '.ib{border:1px solid #ddd;border-radius:5px;padding:8px 12px}'
    + '.ib .l{font-size:9px;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-bottom:2px}'
    + '.ib .v{font-size:13px;font-weight:700;color:#1e3a5f}'
    + 'h2{font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin:16px 0 10px;text-transform:uppercase;letter-spacing:.04em}'
    + '.alert{background:#fff8e1;border:1px solid #f0c040;border-radius:5px;padding:8px 12px;font-size:10px;margin-bottom:14px}'
    + '.sr{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}'
    + '.sb .l{font-size:9px;text-transform:uppercase;color:#888;margin-bottom:4px}'
    + '.sb .ln{border-bottom:1px solid #555;height:28px}'
    + '@media print{.np{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

  var html = '<!DOCTYPE html><html><head>'
    + '<title>' + days + '-Day Check-In \u2014 ' + name + '</title>'
    + '<style>' + styles + '</style></head><body>'
    + '<div class="np" style="text-align:center;padding:10px;background:#f0f4f8;margin-bottom:16px;">'
    + '<button onclick="window.print()" style="padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">\uD83D\uDDA8 Print / Save PDF</button></div>'
    + '<div class="hb"><h1>' + days + '-Day Check-In</h1><div class="sub">3B Tele Med-Surg \u00b7 Arnot Ogden Medical Center</div></div>'
    + '<div class="ig">'
    + '<div class="ib"><div class="l">Staff Name</div><div class="v">' + name + '</div></div>'
    + '<div class="ib"><div class="l">Role</div><div class="v">' + (od.role || '\u2014') + '</div></div>'
    + '<div class="ib"><div class="l">Start Date</div><div class="v">' + (od.startDate || '\u2014') + '</div></div>'
    + '<div class="ib"><div class="l">Target Date</div><div class="v">' + targetDt + '</div></div>'
    + '<div class="ib"><div class="l">Preceptor</div><div class="v">' + (od.preceptor || '\u2014') + '</div></div>'
    + '<div class="ib"><div class="l">Date Completed</div><div class="v">' + (ci.completedDate || '___________') + '</div></div>'
    + '</div>'
    + '<div class="alert">These topic areas can help leaders assess whether the onboarding process has been successful and identify opportunities for improvement. After each milestone check-in, please connect with your HR Business Partner to discuss any insights or feedback.</div>'
    + '<h2>' + days + '-Day Check-In Questions</h2>'
    + qaHtml
    + '<div class="sr">'
    + '<div class="sb"><div class="l">Leader Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Leader Signature</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Team Member Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Team Member Signature</div><div class="ln"></div></div>'
    + '</div></body></html>';

  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}


function addOriMeetingLog(name) {
  const safeN = name.replace(/'/g,"\\'");
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:4000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--navy);border:1px solid var(--border);border-radius:10px;padding:22px;width:440px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:14px;">📅 Add Meeting Log — ${name}</div>
      <div style="display:grid;gap:10px;">
        <div><div class="form-label" style="margin-bottom:3px;">Meeting Date</div>
          <input type="date" id="ml-date" value="${new Date().toISOString().split('T')[0]}" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>
        <div><div class="form-label" style="margin-bottom:3px;">Achievements for the Week</div>
          <textarea id="ml-achievements" rows="3" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;resize:vertical;box-sizing:border-box;" placeholder="Progress, wins, competencies completed..."></textarea></div>
        <div><div class="form-label" style="margin-bottom:3px;">Concerns / Additional Support Needed</div>
          <textarea id="ml-concerns" rows="3" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;resize:vertical;box-sizing:border-box;" placeholder="Challenges, remediation needs..."></textarea></div>
        <div><div class="form-label" style="margin-bottom:3px;">Follow Up</div>
          <textarea id="ml-followup" rows="2" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--white);font-size:12px;outline:none;resize:vertical;box-sizing:border-box;" placeholder="Action items, deadlines..."></textarea></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>
        <button onclick="
          const od = oriData('${safeN}');
          od.meetingLogs.push({
            date: document.getElementById('ml-date').value,
            achievements: document.getElementById('ml-achievements').value,
            concerns: document.getElementById('ml-concerns').value,
            followUp: document.getElementById('ml-followup').value
          });
          persistSave();
          this.closest('div[style*=fixed]').remove();
          renderOrientationDetail('${safeN}');
        " class="btn btn-primary" style="font-size:12px;padding:6px 18px;">Save Log</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function deleteOriMeetingLog(name, idx) {
  if (!confirm('Delete this meeting log?')) return;
  const od = oriData(name);
  od.meetingLogs.splice(idx, 1);
  persistSave();
  renderOrientationDetail(name);
}

// ── Orientation Sheet: Send + Import ─────────────────────────────
const ORI_SHEET_BASE = 'https://ronhigley7-sys.github.io/orientation-shett';
const ORI_SHEET_SB_KEY = 'ori_sheets'; // Supabase tracker_state key

async function loadOriSheets() {
  // Pull completed ori sheets from Supabase into state.oriSheets
  if (!state.oriSheets) state.oriSheets = {};
  try {
    const cfg = getSBConfig();
    const url = (cfg.enabled && cfg.url) ? cfg.url : 'https://xnsdvdfceflmagfhpycw.supabase.co';
    const key = (cfg.enabled && cfg.key) ? cfg.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhuc2R2ZGZjZWZsbWFnZmhweWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTk1NjgsImV4cCI6MjA5NDk5NTU2OH0.UzKZQj4BLxPpH_OCwQR8LyDUeP9YlKn5UtXRFUFaYKA';
    const r = await fetch(`${url}/rest/v1/tracker_state?key=eq.${ORI_SHEET_SB_KEY}&select=value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (r.ok) {
      const rows = await r.json();
      if (rows?.length && rows[0].value) {
        state.oriSheets = JSON.parse(rows[0].value);
      }
    }
  } catch(e) { /* silent */ }
}

async function saveOriSheet(name, sheetData) {
  if (!state.oriSheets) state.oriSheets = {};
  state.oriSheets[name] = { ...sheetData, receivedAt: new Date().toISOString() };
  // Save to empProfile for directory display
  if (!state.empProfile) state.empProfile = {};
  if (!state.empProfile[name]) state.empProfile[name] = {};
  state.empProfile[name].oriSheetSigned = true;
  state.empProfile[name].oriSheetDate = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  state.empProfile[name].oriSheetData = sheetData;
  persistSave();
  // Push to Supabase
  try {
    const cfg = getSBConfig();
    const url = (cfg.enabled && cfg.url) ? cfg.url : 'https://xnsdvdfceflmagfhpycw.supabase.co';
    const key = (cfg.enabled && cfg.key) ? cfg.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhuc2R2ZGZjZWZsbWFnZmhweWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTk1NjgsImV4cCI6MjA5NDk5NTU2OH0.UzKZQj4BLxPpH_OCwQR8LyDUeP9YlKn5UtXRFUFaYKA';
    await fetch(`${url}/rest/v1/tracker_state`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: ORI_SHEET_SB_KEY, value: JSON.stringify(state.oriSheets), updated_at: new Date().toISOString() })
    });
  } catch(e) { /* silent */ }
  showSaveBanner(`📋 Ori sheet signed by ${name} — saved to Directory`);
  showToast(`Signed sheet received from ${name.split(',')[0]}`);
  renderDirectory();
}

function sendOriSheet(name) {
  const od  = oriData(name);
  const payload = {
    name,
    role:       od.role       || 'RN',
    startDate:  od.startDate  || '',
    preceptor:  od.preceptor  || '',
    buddy:      od.buddy      || '',
    ccUrl:      window.location.href.split('?')[0],
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const sheetUrl = ORI_SHEET_BASE + '?data=' + encoded;

  const phone = (state.phones || {})[name] || '';
  const firstName = name.split(',')[1]?.trim() || name;
  const msg = `Hi ${firstName}! Please complete and sign your orientation sheet: ${sheetUrl}`;

  // Show modal with both options
  const existing = document.getElementById('ori-send-overlay');
  if (existing) existing.remove();
  const ov = document.createElement('div');
  ov.id = 'ori-send-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;';
  const safeN = name.replace(/'/g, "\\'");
  ov.innerHTML =
    '<div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:24px;width:480px;max-width:95vw;box-shadow:0 24px 64px rgba(0,0,0,0.5);">'
    + '<div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px;">📱 Send Orientation Sheet</div>'
    + '<div style="font-size:11px;color:var(--text3);margin-bottom:16px;">' + name + '</div>'
    + (phone
      ? '<button onclick="openSMSOrCopy(\'' + phone.replace(/\D/g,'') + '\',\'' + msg.replace(/'/g,"\\'") + '\');this.closest(\'#ori-send-overlay\').remove();" style="width:100%;padding:10px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:7px;color:var(--green2);font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px;">📲 Text to ' + phone + '</button>'
      : '<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--amber2);margin-bottom:10px;">No phone number on file — add one in the Directory first</div>')
    + '<div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;">Or copy link to share manually</div>'
    + '<div style="display:flex;gap:6px;">'
    + '<input id="ori-link-input" value="' + sheetUrl + '" readonly style="flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:5px;padding:6px 8px;color:var(--text2);font-size:11px;font-family:monospace;outline:none;">'
    + '<button onclick="navigator.clipboard.writeText(\'' + sheetUrl.replace(/'/g,"\\'") + '\').then(()=>{this.textContent=\'✓ Copied!\';setTimeout(()=>this.textContent=\'Copy\',2000)});" style="padding:6px 12px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:5px;color:var(--accent2);font-size:11px;cursor:pointer;">Copy</button>'
    + '</div>'
    + '<div style="margin-top:14px;font-size:11px;color:var(--text3);">Staff member opens the link, fills out the sheet, signs it digitally, and submits — it saves automatically to their Directory file.</div>'
    + '<div style="display:flex;justify-content:flex-end;margin-top:14px;">'
    + '<button onclick="this.closest(\'#ori-send-overlay\').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Close</button>'
    + '</div></div>';
  document.body.appendChild(ov);
}

// Check URL for oriSheet import on load
(function checkOriSheetImport() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('importOriSheet');
  if (!raw) return;
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!decoded.name) return;
    const doImport = () => {
      saveOriSheet(decoded.name, decoded);
      window.history.replaceState({}, '', window.location.pathname);
    };
    setTimeout(doImport, 1500);
  } catch(e) { console.warn('oriSheet import error:', e); }
})();

function printAgencyOriSheet(name) {
  const od    = oriData(name);
  const role  = od.role || 'RN';
  const isCA  = role === 'CA';
  const today = od.startDate
    ? new Date(od.startDate + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
    : new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  const checkRow = (label) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;">${label}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;font-size:14px;width:60px;">☐</td>
      <td style="padding:6px 8px;border:1px solid #ccc;width:70px;"></td>
    </tr>`;

  const sheetTitle    = isCA ? 'Clinical Assistant (CA) Unit Orientation Sheet' : 'Agency RN Unit Orientation Sheet';
  const sheetSubject  = isCA ? 'Inpatient Nursing Assistant' : 'Agency Registered Nurse';
  const nameLabel     = isCA ? 'CA Name' : 'Agency Nurse Name';

  const practiceRows  = isCA ? [
    ['Report to Charge Nurse',           'At start of every shift and whenever you need guidance'],
    ['Call Light Response',              'Answer within 3 rings; address patient need or relay to RN immediately'],
    ['Hourly Rounding',                  'Round every hour; document using P-S-T-P (Pain, Safety, Toileting, Position)'],
    ['ADLs / Personal Care',             'Assist with bathing, grooming, dressing, oral care, and toileting per care plan'],
    ['Vital Signs',                      'Collect per assigned schedule; report abnormals to RN immediately'],
    ['Blood Glucose Monitoring',         'Perform fingerstick per schedule; report results to RN before patient eats'],
    ['Bed Mobility & Repositioning',     'Reposition minimum every 2 hours; document; use lift equipment as indicated'],
    ['Ambulation Assistance',            'Assist with early ambulation when appropriate; use gait belt; call RN first'],
    ['Fall Prevention',                  'Bed low, brakes locked, alarms on, call light in reach at all times'],
    ['Isolation / PPE',                  'Don full PPE before entering isolation rooms; doff properly at exit'],
    ['Specimen Collection',              'Collect urine, stool, or other specimens per RN instruction; label correctly'],
    ['Foley Catheter Care',              'Provide peri-care; keep bag below bladder; report output concerns to RN'],
    ['Skin Integrity Observation',       'Report redness, breakdown, or wounds to RN immediately; never massage reddened areas'],
    ['I&O Documentation',               'Record all intake and output accurately in EMR per assignment'],
    ['Communication with RN',           'Report changes in patient condition, complaints, or unusual findings immediately'],
    ['Equipment Location & Use',         'Know location of lifts, gait belts, wheelchairs, commodes, and VS equipment'],
    ['Teamwork & Delegation',            'Clarify delegated tasks; complete in timely manner; update RN on status'],
  ] : [
    ['Report to Charge Nurse',           'Start of every shift and as concerns arise'],
    ['Bedside Shift Report',             'Required for all handoffs'],
    ['Hourly Rounding',                  'Document using P-S-T-P (Pain, Safety, Toileting, Position)'],
    ['Medication Administration',        'Barcode scanning required for every medication'],
    ['Fall Prevention',                  'Bed low, brakes on, alarms as indicated, call light in reach'],
    ['Escalation',                       'Notify charge + provider for change in condition'],
    ['Pain Assessment & Reassessment',   'Assess on admission, per policy, reassess after intervention'],
    ['Turning & Repositioning',          'Minimum every 2 hours or per patient condition; document'],
    ['Blood Transfusion Policy',         'Verify with 2 RNs; follow facility transfusion and monitoring standards'],
    ['Pyxis Access',                     'Log in under your own credentials; never share access'],
    ['Glucometer Access',                'Ensure login and QC steps completed before use'],
  ];

  const checklistItems = isCA ? [
    'Introduced to charge nurse, RNs, and team',
    'Reviewed scope of practice and chain of command (CA → RN → Charge)',
    'Located supply room, clean utility, and soiled utility',
    'Located vital sign equipment (BP cuffs, thermometers, pulse oximeters)',
    'Located glucometer and confirmed login and QC knowledge',
    'Located lift equipment, gait belts, wheelchairs, and commodes',
    'Reviewed call light response procedure',
    'Reviewed hourly rounding and P-S-T-P documentation',
    'Reviewed ADL assistance expectations (bathing, grooming, oral care, toileting)',
    'Reviewed bed mobility and repositioning expectations (every 2 hours)',
    'Reviewed ambulation assistance procedure and gait belt use',
    'Reviewed fall prevention bundle (bed low, brakes, alarms, call light)',
    'Reviewed isolation precautions and PPE donning/doffing',
    'Reviewed vital signs collection schedule and abnormal reporting',
    'Reviewed blood glucose monitoring and result reporting to RN',
    'Reviewed foley catheter care and output documentation',
    'Reviewed skin integrity observation and reporting procedure',
    'Reviewed intake and output (I&O) documentation in EMR',
    'Reviewed specimen collection labeling and process',
    'Reviewed escalation — when and how to notify RN',
    'Confirmed EMR access and documentation training completed',
    'Received patient assignment and reviewed care plans with RN',
  ] : [
    'Introduced to charge nurse and team',
    'Received patient assignment safely and appropriately',
    'Reviewed unit communication routines (huddles, reporting)',
    'Located supply room and medication room',
    'Located clean and soiled utilities',
    'Reviewed crash cart location and process',
    'Reviewed locking medication & controlled substance process',
    'Reviewed tele & monitor communication expectations',
    'Reviewed admission/discharge workflow',
    'Reviewed hourly rounding documentation workflow',
    'Reviewed fall prevention & sitter protocols',
    'Reviewed escalation chain (Charge → Provider → House Supervisor)',
    'Confirmed charting access + barcode scanner working',
    'Confirmed Pyxis access and login working',
    'Confirmed glucometer access and QC knowledge',
    'Reviewed break coverage plan',
    'Reviewed pain assessment & reassessment workflow',
    'Reviewed turning & repositioning expectations',
    'Reviewed blood product administration and monitoring policy',
    'Participated in bedside rounds with care team',
  ];

  const html = `<!DOCTYPE html><html><head><title>${sheetTitle} — ${name}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 0; }
    h1 { font-size: 18px; color: #1e3a5f; margin: 4px 0 2px; }
    h2 { font-size: 12px; font-weight: 700; color: #1e3a5f; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 3px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 14px; }
    .header-left .sub { font-size: 11px; color: #555; margin-top: 2px; }
    .field-row { display: flex; gap: 20px; margin-bottom: 8px; }
    .field { flex: 1; }
    .field-label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.04em; }
    .field-val { border-bottom: 1px solid #555; padding: 2px 0; font-size: 12px; font-weight: 600; min-height: 18px; }
    .field-blank { border-bottom: 1px solid #aaa; padding: 2px 0; min-height: 18px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
    td { vertical-align: middle; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px; }
    .sig-block .label { font-size: 9px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
    .sig-block .line { border-bottom: 1px solid #555; height: 28px; }
    @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>

  <div class="no-print" style="text-align:center;padding:12px;background:#f0f4f8;margin-bottom:0;">
    <button onclick="window.print()" style="padding:8px 24px;background:#1e3a5f;color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Print / Save as PDF</button>
    <span style="margin-left:14px;font-size:11px;color:#555;">Print → Save as PDF to share, then upload signed copy to their file in CC</span>
  </div>

  <div class="header">
    <div class="header-left">
      <div style="font-size:10px;font-weight:700;color:#1e3a5f;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">3B/3C Stroke Telemetry</div>
      <h1>${sheetTitle}</h1>
      <div class="sub">Arnot Ogden Medical Center · AOMC Nursing Operations · ${sheetSubject}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#888;">
      <div>Generated: ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
    </div>
  </div>

  <div class="field-row">
    <div class="field"><div class="field-label">${nameLabel}</div><div class="field-val">${name}</div></div>
    <div class="field"><div class="field-label">Date / Start Date</div><div class="field-val">${today}</div></div>
    <div class="field"><div class="field-label">Preceptor / Trainer</div><div class="field-val">${od.preceptor || ''}</div></div>
  </div>
  <div class="field-row">
    <div class="field"><div class="field-label">Unit</div><div class="field-val">3B/3C Stroke Telemetry</div></div>
    <div class="field"><div class="field-label">Onboarding Buddy</div><div class="field-val">${od.buddy || (od.buddyLater ? 'To Be Assigned' : '')}</div></div>
    <div class="field"><div class="field-label">Role</div><div class="field-val">${role}</div></div>
  </div>

  <h2>Unit Overview</h2>
  <div class="two-col">
    <div>
      <div style="margin-bottom:5px;"><span style="font-weight:600;">Patient Population:</span> ${isCA ? 'Medical-Surgical / Telemetry — Inpatient' : 'General Medical-Surgical / Telemetry'}</div>
      <div style="margin-bottom:5px;"><span style="font-weight:600;">${isCA ? 'CA:Patient Ratio:' : 'RN:Patient Ratio:'}</span><div class="field-blank" style="display:inline-block;min-width:80px;">&nbsp;</div></div>
      <div style="margin-bottom:5px;"><span style="font-weight:600;">Break Coverage:</span><div class="field-blank"></div></div>
    </div>
    <div>
      <div style="margin-bottom:5px;"><span style="font-weight:600;">${isCA ? 'RN Supervisor for Shift:' : 'Admission/Discharge Workflow:'}</span><div class="field-blank"></div></div>
      <div style="margin-bottom:5px;"><span style="font-weight:600;">Charge Nurse:</span><div class="field-blank"></div></div>
    </div>
  </div>

  <h2>Unit Layout</h2>
  <div class="two-col" style="margin-bottom:10px;">
    ${(isCA
      ? ['Supply Room','Clean Utility','Soiled Utility','Vital Sign Equipment (BP, Thermometer, SpO2)','Glucometer Location','Lift Equipment / Gait Belts','Wheelchairs / Commodes','Linen & Personal Care Supplies']
      : ['Supply Room','Medication Room / Pyxis','Clean Utility','Soiled Utility','Vital Sign Equipment','Pumps / Tubing / Lines']
    ).map(loc => `<div style="margin-bottom:5px;"><span style="font-weight:600;">${loc}:</span><div class="field-blank"></div></div>`).join('')}
  </div>

  <h2>Practice Expectations</h2>
  <table>
    <thead><tr><th>Task / Expectation</th><th>Standard</th></tr></thead>
    <tbody>
      ${practiceRows.map(([t,e]) =>
        `<tr><td style="padding:5px 8px;border:1px solid #ddd;font-weight:600;font-size:11px;width:40%;">${t}</td>
             <td style="padding:5px 8px;border:1px solid #ddd;font-size:11px;">${e}</td></tr>`
      ).join('')}
    </tbody>
  </table>

  <h2>${isCA ? 'CA' : 'Orientation'} Checklist</h2>
  <table>
    <thead><tr><th style="width:70%;">Item</th><th style="width:60px;text-align:center;">Done?</th><th style="width:70px;">Initials</th></tr></thead>
    <tbody>${checklistItems.map(item => checkRow(item)).join('')}</tbody>
  </table>

  <div class="sig-row">
    <div class="sig-block"><div class="label">${isCA ? 'CA' : 'Staff'} Signature</div><div class="line"></div></div>
    <div class="sig-block"><div class="label">${isCA ? 'RN / Charge Nurse' : 'Charge Nurse'} Signature</div><div class="line"></div></div>
    <div class="sig-block"><div class="label">Date</div><div class="line"></div></div>
  </div>

  <div style="margin-top:16px;font-size:9px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:6px;">
    3B/3C Stroke Telemetry · AOMC · After signing, upload this document to the staff member&#x2019;s file in the Command Center
  </div>

  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function printOriManager(name) {
  const od = oriData(name);
  const p  = (state.empProfile || {})[name] || od.profile || {};
  const startDate = od.startDate ? new Date(od.startDate + 'T12:00:00') : null;

  // Generate bi-weekly meeting schedule for 3 months (6 meetings)
  const meetingSchedule = [];
  if (startDate) {
    for (let i = 1; i <= 6; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i * 14);
      meetingSchedule.push(d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }));
    }
  }

  // 30/60/90 day dates
  const milestoneCheckins = [30, 60, 90].map(days => {
    if (!startDate) return { label: `${days}-Day`, date: '—' };
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    return { label: `${days}-Day Check-In`, date: d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) };
  });

  const meetingLogsHtml = (od.meetingLogs || []).map((log, i) => `
    <div style="break-inside:avoid;margin-bottom:12px;border:1px solid #ccc;border-radius:6px;padding:10px;">
      <div style="font-weight:700;font-size:12px;color:#1e3a5f;margin-bottom:6px;">Meeting ${i+1} — ${log.date || '—'}</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f9f9f9;width:33%;font-weight:600;">Achievements</td>
            <td style="padding:4px 6px;border:1px solid #ddd;">${log.achievements || ''}</td></tr>
        <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f9f9f9;font-weight:600;">Concerns / Support</td>
            <td style="padding:4px 6px;border:1px solid #ddd;">${log.concerns || ''}</td></tr>
        <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f9f9f9;font-weight:600;">Follow Up</td>
            <td style="padding:4px 6px;border:1px solid #ddd;">${log.followUp || ''}</td></tr>
      </table>
    </div>`).join('');

  const scheduleRows = meetingSchedule.map((dt, i) => {
    const logged = (od.meetingLogs || [])[i];
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-size:11px;">${i+1}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;">${dt}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;">${logged ? '✓ ' + logged.date : ''}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;height:28px;"></td>
    </tr>`;
  }).join('');

  const checkinRows = milestoneCheckins.map(c => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;font-size:11px;">${c.label}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:11px;">${c.date}</td>
      <td style="padding:8px;border:1px solid #ddd;height:30px;"></td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Onboarding Manager Print — ${name}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; margin: 0; padding: 0; }
    .page { padding: 28px 32px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; color: #1e3a5f; margin: 0 0 2px; }
    h2 { font-size: 14px; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; margin: 18px 0 10px; }
    h3 { font-size: 12px; color: #444; margin: 10px 0 4px; }
    .header-band { background: #1e3a5f; color: white; padding: 14px 20px; margin-bottom: 20px; border-radius: 6px; }
    .header-band .sub { font-size: 12px; opacity: 0.75; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-box { border: 1px solid #ddd; border-radius: 5px; padding: 8px 12px; }
    .info-box .label { font-size: 9px; text-transform: uppercase; color: #888; margin-bottom: 2px; letter-spacing: 0.04em; }
    .info-box .val { font-size: 13px; font-weight: 700; color: #1e3a5f; }
    .alert-box { background: #fff8e1; border: 1px solid #f0c040; border-radius: 5px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #1e3a5f; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
    @media print { .no-print { display:none; } body { -webkit-print-color-adjust: exact; } }
    .profile-box { border: 1px solid #ddd; border-radius: 6px; padding: 14px; margin-bottom: 14px; }
    .profile-field { margin-bottom: 10px; }
    .profile-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.04em; }
    .profile-val { font-size: 12px; border-bottom: 1px solid #ddd; padding-bottom: 4px; min-height: 20px; margin-top: 2px; }
    .scan-note { background: #e8f4fd; border: 1px solid #90caf9; border-radius: 5px; padding: 8px 12px; font-size: 11px; margin-top: 10px; }
  </style></head><body>
  <div class="page">
    <div class="no-print" style="text-align:center;margin-bottom:16px;">
      <button onclick="window.print()" style="padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;">🖨 Print This Page</button>
    </div>

    <div class="header-band">
      <div style="font-size:20px;font-weight:700;">${name}</div>
      <div class="sub">3B Tele Med-Surg · Manager Onboarding Record · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
    </div>

    <div class="info-grid">
      <div class="info-box"><div class="label">Role</div><div class="val">${od.role}</div></div>
      <div class="info-box"><div class="label">Start Date</div><div class="val">${od.startDate || '—'}</div></div>
      <div class="info-box"><div class="label">Target Off-Orientation</div><div class="val">${od.targetDate || '—'}</div></div>
      <div class="info-box"><div class="label">Preceptor / Trainer</div><div class="val">${od.preceptor || '—'}</div></div>
      <div class="info-box"><div class="label">Onboarding Buddy</div><div class="val" style="color:${od.buddy ? '#1e3a5f' : '#e53935'};">${od.buddy || (od.buddyLater ? 'To Be Assigned' : '⚠ Not Assigned')}</div></div>
      <div class="info-box"><div class="label">Orientation</div><div class="val">${od.role === 'Agency RN' ? '3 Days (2 Education + 1 Floor)' : od.totalWeeks + ' Weeks'}</div></div>
    </div>

    <!-- New Team Member Profile -->
    <h2>👤 New Team Member Profile</h2>
    <div class="profile-box">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="profile-field"><div class="profile-label">Favorite Food / Snack</div><div class="profile-val">${p.food || ''}</div></div>
        <div class="profile-field"><div class="profile-label">Favorite Movie / Show</div><div class="profile-val">${p.movie || ''}</div></div>
        <div class="profile-field"><div class="profile-label">Favorite Hobbies</div><div class="profile-val">${p.hobbies || ''}</div></div>
        <div class="profile-field"><div class="profile-label">Something They're Proud Of</div><div class="profile-val">${p.proudOf || ''}</div></div>
        <div class="profile-field" style="grid-column:1/-1;"><div class="profile-label">Their Idea of a Perfect Day</div><div class="profile-val">${p.perfectDay || ''}</div></div>
      </div>
      <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px;border-top:1px solid #eee;padding-top:12px;">
        <div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.04em;">Staff Member Signature</div>
          <div style="border-bottom:1px solid #555;height:30px;margin-top:8px;"></div></div>
        <div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.04em;">Date Signed</div>
          <div style="border-bottom:1px solid #555;height:30px;margin-top:8px;"></div></div>
      </div>
      <div class="scan-note">📄 Have staff member complete and sign this section. Scan or photograph the signed page and upload to the staff member's record in the CC under their name.</div>
    </div>

    <!-- Meeting Schedule / Orientation Timeline -->
    ${od.role === 'Agency RN' ? `
    <h2>📅 Agency RN Orientation Timeline</h2>
    <div class="alert-box">Agency RN orientation is 3 days: 2 days education + 1 day floor orientation. Use the Ori Sheet (📋) for the floor day checklist.</div>
    <table style="margin-bottom:16px;">
      <thead><tr><th style="width:60px;">Day</th><th>Focus</th><th>Date</th><th>Completed By</th></tr></thead>
      <tbody>
        <tr><td style="padding:6px 8px;border:1px solid #ddd;">Day 1</td><td style="padding:6px 8px;border:1px solid #ddd;">Education — Hospital policies, safety, EMR/Epic, HIPAA, chain of command, codes, fire safety</td><td style="padding:6px 8px;border:1px solid #ddd;">${startDate ? new Date(startDate.getTime()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td><td style="padding:6px 8px;border:1px solid #ddd;height:28px;"></td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #ddd;">Day 2</td><td style="padding:6px 8px;border:1px solid #ddd;">Education — Telemetry, fall prevention, HAPI, med admin policy, Pyxis, glucometer, documentation</td><td style="padding:6px 8px;border:1px solid #ddd;">${startDate ? new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td><td style="padding:6px 8px;border:1px solid #ddd;"></td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #ddd;">Day 3</td><td style="padding:6px 8px;border:1px solid #ddd;">Floor orientation — Unit tour, team intro, Pyxis confirmed, shadow preceptor, cleared for independent practice</td><td style="padding:6px 8px;border:1px solid #ddd;">${startDate ? new Date(startDate.getTime() + 2*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td><td style="padding:6px 8px;border:1px solid #ddd;"></td></tr>
      </tbody>
    </table>` : `
    <h2>📅 Bi-Weekly Manager Meeting Schedule (First 3 Months)</h2>
    <div class="alert-box">⚠ Meetings should occur every two weeks for the first three months of orientation. Document outcomes in the meeting log below.</div>
    <table style="margin-bottom:16px;">
      <thead><tr><th style="width:60px;">#</th><th>Scheduled Date</th><th>Actual Date Held</th><th>Manager Initials</th></tr></thead>
      <tbody>${scheduleRows || '<tr><td colspan="4" style="padding:8px;color:#888;text-align:center;">No start date set — edit orientee to generate schedule</td></tr>'}</tbody>
    </table>

    <!-- 30/60/90 Check-Ins -->
    <h2>✅ 30 / 60 / 90-Day Check-In Reminders</h2>
    <table style="margin-bottom:16px;">
      <thead><tr><th>Milestone</th><th>Target Date</th><th>Completed Date / Notes</th></tr></thead>
      <tbody>${checkinRows}</tbody>
    </table>`}

    <!-- Meeting Logs -->
    <h2>📝 Meeting Log Entries</h2>
    ${meetingLogsHtml || '<div style="color:#888;font-size:11px;padding:10px 0;">No meetings logged yet.</div>'}

    <!-- Notes -->
    ${od.notes ? `<h2>📋 Preceptor Notes</h2><div style="border:1px solid #ddd;border-radius:5px;padding:10px;font-size:11px;white-space:pre-wrap;">${ccEsc(od.notes)}</div>` : ''}
  </div>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function saveOriGoal(role, weekIdx, val) {
  if (!state.customOriGoals) state.customOriGoals = {};
  if (!state.customOriGoals[role]) state.customOriGoals[role] = [...(ORI_WEEK_GOALS[role] || ORI_WEEK_GOALS.RN)];
  state.customOriGoals[role][weekIdx] = val;
  persistSave();
}

function resetOriGoals(role) {
  if (!confirm('Reset all week goals for ' + role + ' to defaults?')) return;
  if (state.customOriGoals) delete state.customOriGoals[role];
  persistSave();
  if (_oriActiveName) renderOrientationDetail(_oriActiveName);
}

function addOriMilestonePrompt() {
  const label = prompt('Enter new milestone label:');
  if (!label || !label.trim()) return;
  const key = 'custom_' + Date.now();
  if (!state.customOriMilestones) state.customOriMilestones = [];
  state.customOriMilestones.push({ key, label: label.trim() });
  persistSave();
  if (_oriActiveName) renderOrientationDetail(_oriActiveName);
}

function deleteOriMilestone(key) {
  if (!confirm('Remove this milestone?')) return;
  state.customOriMilestones = (state.customOriMilestones || []).filter(m => m.key !== key);
  persistSave();
  if (_oriActiveName) renderOrientationDetail(_oriActiveName);
}