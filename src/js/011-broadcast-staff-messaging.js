

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
        style="font-size:11px;padding:3px 10px;background:${cfg.bg};border:1px solid ${cfg.border};border-radius:10px;color:${cfg.color};cursor:pointer;white-space:nowrap;">${cfg.icon} ${t.label}</button>`;
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
          <div style="font-size:11px;color:var(--text3);margin-top:1px;">${dateStr} · ${m.audience}</div>
          ${hasDeadline ? `<div style="font-size:11px;color:${overdue?'var(--red2)':'var(--amber2)'};">${overdue?'⚠ OVERDUE':'⏰ Due'}: ${new Date(m.deadline+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>` : ''}
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
            <div style="flex:1;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
              <div style="height:3px;background:${pct===100?'var(--green2)':'var(--accent2)'};width:${pct}%;border-radius:2px;"></div>
            </div>
            <span style="font-size:11px;color:var(--text3);">${readCount}/${staff.length} read</span>
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
      <span style="font-size:11px;color:${jobCol};">${s.job}</span>
      ${done?`<span style="font-size:11px;color:var(--green2);">✓ ${ts}</span>`:`<span style="font-size:11px;color:var(--text3);">Pending</span>`}
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
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--text3);">
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
        <div style="font-size:11px;color:var(--text3);">Read Receipt</div>
      </div>
      <div style="flex:1;min-width:90px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${readCount}</div>
        <div style="font-size:11px;color:var(--text3);">Acknowledged</div>
      </div>
      <div style="flex:1;min-width:90px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:${notRead.length>0?'var(--amber2)':'var(--green2)'};">${notRead.length}</div>
        <div style="font-size:11px;color:var(--text3);">Pending</div>
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
        <div style="font-size:11px;color:var(--text3);">${dateStr} · ${m.audience}${overdue?' · <span style="color:var(--red2);">⚠ OVERDUE</span>':''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:11px;font-weight:700;color:${pct===100?'var(--green2)':'var(--text3)'};">${pct}%</div>
        <div style="font-size:11px;color:var(--text3);">read</div>
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
  if(sumEl){const counts={};Object.keys(RRT_TYPE_CFG).forEach(k=>counts[k]=0);list.forEach(r=>{if(counts[r.type]!==undefined)counts[r.type]++;});sumEl.innerHTML=Object.entries(RRT_TYPE_CFG).map(([k,c])=>`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">${c.icon}</span><div><div style="font-size:20px;font-weight:700;color:${c.color};">${counts[k]}</div><div style="font-size:11px;color:var(--text3);">${k}</div></div></div>`).join('');}
  const tEl=document.getElementById('rrt-table');if(!tEl)return;
  if(!list.length){tEl.innerHTML='<div style="text-align:center;padding:50px;color:var(--text3);"><div style="font-size:32px;margin-bottom:10px;">🚨</div><div style="font-size:13px;color:var(--white);">No events logged</div></div>';return;}
  tEl.innerHTML='<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(r=>{const c=RRT_TYPE_CFG[r.type]||RRT_TYPE_CFG.Other;const dateStr=r.date?new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'-';return`<div style="background:rgba(255,255,255,0.03);border:1px solid ${c.border};border-left:3px solid ${c.color};border-radius:8px;padding:12px 14px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;"><div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-size:13px;">${c.icon}</span><span style="font-size:13px;font-weight:700;color:${c.color};">${r.type}</span><span style="font-size:11px;color:var(--text3);">${dateStr} ${r.time||''}</span>${r.room?`<span style="font-size:11px;color:var(--text3);">Room ${r.room}</span>`:''}</div><div style="font-size:11px;color:var(--text2);">${r.outcome?'Outcome: <strong>'+r.outcome+'</strong>':''} ${r.debrief?'<span style="color:var(--green2);margin-left:8px;">✓ Debriefed</span>':''}</div>${r.responders?`<div style="font-size:11px;color:var(--text3);margin-top:2px;">Responders: ${r.responders}</div>`:''} ${r.notes?`<div style="font-size:11px;color:var(--text3);margin-top:4px;">${ccEsc(r.notes)}</div>`:''}</div><div style="display:flex;gap:4px;flex-shrink:0;"><button onclick="openRrtModal('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button><button onclick="deleteRrtEvent('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></div></div></div>`;}).join('')+'</div>';
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
  tEl.innerHTML='<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(255,255,255,0.05);"><th style="padding:10px;text-align:left;font-size:11px;color:var(--text3);">Staff</th><th style="padding:10px;text-align:left;font-size:11px;color:var(--text3);">Role</th><th style="padding:10px;text-align:right;font-size:11px;color:var(--text3);">Regular Hrs</th><th style="padding:10px;text-align:right;font-size:11px;color:var(--text3);">OT Hrs</th><th style="padding:10px;text-align:left;font-size:11px;color:var(--text3);">Type</th><th style="padding:10px;text-align:left;font-size:11px;color:var(--text3);">Approved</th><th style="padding:10px;text-align:left;font-size:11px;color:var(--text3);">Notes</th><th style="padding:10px;"></th></tr></thead><tbody>'+rows.map(r=>{const rCol=IV_ROLE_COLOR[r.job]||'var(--text2)';return`<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:10px;font-size:12px;font-weight:600;color:var(--white);">${r.name}</td><td style="padding:10px;font-size:11px;color:${rCol};">${r.job}</td><td style="padding:10px;text-align:right;font-size:12px;color:var(--text2);">${r.entry.regularHrs}</td><td style="padding:10px;text-align:right;font-size:13px;font-weight:700;color:var(--red2);">${r.entry.otHrs}</td><td style="padding:10px;font-size:11px;color:var(--text2);">${r.entry.premiumType}</td><td style="padding:10px;">${r.entry.approved?'<span style="color:var(--green2);font-size:11px;">✓ Yes</span>':'<span style="color:var(--text3);font-size:11px;">Pending</span>'}</td><td style="padding:10px;font-size:11px;color:var(--text3);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.entry.notes||'—'}</td><td style="padding:10px;"><button onclick="deleteOtEntry('${r.name.replace(/'/g,"\\'")}','${r.entry.payPeriod}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></td></tr>`;}).join('')+'</tbody></table></div>';
}

// ════════════════════════════════════
//  INCIDENT REPORT LOG
// ════════════════════════════════════
const INC_LOG_TYPE_CFG={
  'Fall':      {icon:'🚶',color:'var(--amber2)', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.35)'},
  'Medication':{icon:'💊',color:'var(--red2)',   bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.4)'},
  'HAPI':      {icon:'🩹',color:'var(--purple2)',bg:'rgba(139,92,246,0.1)',border:'rgba(139,92,246,0.35)'},
  'Elopement': {icon:'🚪',color:'var(--accent2)',bg:'rgba(79,163,232,0.1)',border:'rgba(79,163,232,0.3)'},
  'Complaint': {icon:'💬',color:'var(--teal2)',  bg:'rgba(6,182,212,0.08)', border:'rgba(6,182,212,0.3)'},
  'Equipment': {icon:'⚙️',color:'var(--text2)', bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.1)'},
  'Other':     {icon:'📋',color:'var(--text3)', bg:'rgba(255,255,255,0.03)',border:'rgba(255,255,255,0.08)'},
};
const INC_SEV_COLOR={'1 - Near Miss':'var(--text3)','2 - No Harm':'var(--green2)','3 - Minor Harm':'var(--amber2)','4 - Moderate Harm':'var(--red2)','5 - Serious Harm / Sentinel':'var(--red2)'};
const INC_STATUS_CFG={'Open':{c:'var(--red2)',b:'rgba(239,68,68,0.12)'},'Under Review':{c:'var(--amber2)',b:'rgba(245,158,11,0.12)'},'Closed':{c:'var(--green2)',b:'rgba(37,168,104,0.12)'}};

function initIncLog(){
  const yrSel=document.getElementById('inc-log-year');
  if(yrSel&&!yrSel.options.length){const cur=new Date().getFullYear();for(let y=cur-1;y<=cur+1;y++){const o=document.createElement('option');o.value=y;o.textContent=y;if(y===cur)o.selected=true;yrSel.appendChild(o);}}
  const dl=document.getElementById('il-staff-dl');if(dl)dl.innerHTML=MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
  renderIncLog();
}

function openIncLogModal(id){
  const m=document.getElementById('inclog-modal');if(!m)return;m.style.display='flex';
  document.getElementById('il-edit-id').value=id||'';
  if(id){const e=(state.incidentReports||[]).find(r=>r.id===id);if(e){document.getElementById('il-date').value=e.date||'';document.getElementById('il-time').value=e.time||'';document.getElementById('il-room').value=e.room||'';document.getElementById('il-type').value=e.type||'Fall';document.getElementById('il-severity').value=e.severity||'2 - No Harm';document.getElementById('il-rl').value=e.rlNumber||'';document.getElementById('il-status').value=e.status||'Open';document.getElementById('il-patient').value=e.patient||'';document.getElementById('il-staff').value=e.staff||'';document.getElementById('il-notes').value=e.notes||'';document.getElementById('il-followup').value=e.followUp||'';return;}}
  const now=new Date();document.getElementById('il-date').value=now.toISOString().split('T')[0];document.getElementById('il-time').value=now.toTimeString().slice(0,5);
  ['il-room','il-rl','il-patient','il-staff','il-notes','il-followup'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
}
function closeIncLogModal(){const m=document.getElementById('inclog-modal');if(m)m.style.display='none';}

function saveIncLogEntry(){
  const editId=document.getElementById('il-edit-id')?.value||'';
  const entry={id:editId||'inc_'+Date.now(),date:document.getElementById('il-date')?.value||'',time:document.getElementById('il-time')?.value||'',room:document.getElementById('il-room')?.value||'',type:document.getElementById('il-type')?.value||'Fall',severity:document.getElementById('il-severity')?.value||'2 - No Harm',rlNumber:document.getElementById('il-rl')?.value||'',status:document.getElementById('il-status')?.value||'Open',patient:document.getElementById('il-patient')?.value||'',staff:document.getElementById('il-staff')?.value||'',notes:document.getElementById('il-notes')?.value||'',followUp:document.getElementById('il-followup')?.value||'',ts:Date.now()};
  if(!state.incidentReports)state.incidentReports=[];
  if(editId){const i=state.incidentReports.findIndex(r=>r.id===editId);if(i>=0)state.incidentReports[i]=entry;else state.incidentReports.unshift(entry);}
  else state.incidentReports.unshift(entry);
  persistSave();closeIncLogModal();renderIncLog();
}

function deleteIncLogEntry(id){if(!confirm('Delete this incident report?'))return;state.incidentReports=(state.incidentReports||[]).filter(r=>r.id!==id);persistSave();renderIncLog();}

function renderIncLog(){
  const yr=parseInt(document.getElementById('inc-log-year')?.value)||new Date().getFullYear();
  const typeF=document.getElementById('inc-log-type')?.value||'ALL';
  const statusF=document.getElementById('inc-log-status')?.value||'ALL';
  let list=(state.incidentReports||[]).filter(r=>new Date((r.date||'2000-01-01')+'T12:00:00').getFullYear()===yr);
  if(typeF!=='ALL')list=list.filter(r=>r.type===typeF);
  if(statusF!=='ALL')list=list.filter(r=>r.status===statusF);
  list=list.slice().sort((a,b)=>b.ts-a.ts);
  const sumEl=document.getElementById('inclog-summary');
  if(sumEl){const counts={};Object.keys(INC_LOG_TYPE_CFG).forEach(k=>counts[k]=0);list.forEach(r=>{if(counts[r.type]!==undefined)counts[r.type]++;});const openCount=list.filter(r=>r.status==='Open').length;sumEl.innerHTML=`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px 16px;"><div style="font-size:20px;font-weight:700;color:var(--red2);">${openCount}</div><div style="font-size:11px;color:var(--text3);">Open Reports</div></div>`+Object.entries(INC_LOG_TYPE_CFG).filter(([k])=>counts[k]>0).map(([k,c])=>`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px 14px;"><div style="font-size:16px;font-weight:700;color:${c.color};">${c.icon} ${counts[k]}</div><div style="font-size:11px;color:var(--text3);">${k}</div></div>`).join('');}
  const tEl=document.getElementById('inclog-table');if(!tEl)return;
  if(!list.length){tEl.innerHTML='<div style="text-align:center;padding:50px;color:var(--text3);"><div style="font-size:32px;margin-bottom:10px;">📁</div><div style="font-size:13px;color:var(--white);">No incident reports logged</div></div>';return;}
  tEl.innerHTML='<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(r=>{const c=INC_LOG_TYPE_CFG[r.type]||INC_LOG_TYPE_CFG.Other;const sc=INC_STATUS_CFG[r.status]||INC_STATUS_CFG.Open;const dateStr=r.date?new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'-';return`<div style="background:rgba(255,255,255,0.03);border:1px solid ${c.border};border-radius:8px;padding:12px 14px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;"><div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;"><span style="font-size:13px;">${c.icon}</span><span style="font-size:13px;font-weight:700;color:${c.color};">${r.type}</span><span style="font-size:11px;background:${sc.b};color:${sc.c};padding:1px 8px;border-radius:8px;font-weight:600;">${r.status}</span>${r.rlNumber?`<span style="font-size:11px;color:var(--text3);font-family:'IBM Plex Mono',monospace;">${r.rlNumber}</span>`:''}<span style="font-size:11px;color:var(--text3);">${dateStr} ${r.time||''}</span></div><div style="display:flex;gap:12px;font-size:11px;color:var(--text3);flex-wrap:wrap;">${r.room?`<span>Room ${r.room}</span>`:''} ${r.severity?`<span style="color:${INC_SEV_COLOR[r.severity]||'var(--text3)'};">SAC ${r.severity}</span>`:''} ${r.staff?`<span>Staff: ${ehStaffLink(r.staff)}</span>`:''}</div>${r.notes?`<div style="font-size:11px;color:var(--text2);margin-top:5px;">${ccEsc(r.notes)}</div>`:''} ${r.followUp?`<div style="font-size:11px;color:var(--teal2);margin-top:4px;">↳ ${r.followUp}</div>`:''}</div><div style="display:flex;gap:4px;flex-shrink:0;"><button onclick="openIncLogModal('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button><button onclick="deleteIncLogEntry('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></div></div></div>`;}).join('')+'</div>';
}

// ════════════════════════════════════
//  PRODUCTIVITY / HPPD
// ════════════════════════════════════
function initProductivity(){
  const mSel=document.getElementById('prod-month');
  if(mSel&&!mSel.options.length){const now=new Date();for(let i=-3;i<=3;i++){const d=new Date(now.getFullYear(),now.getMonth()+i,1);const val=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const o=document.createElement('option');o.value=val;o.textContent=d.toLocaleDateString('en-US',{month:'long',year:'numeric'});if(i===0)o.selected=true;mSel.appendChild(o);}}
  const d=document.getElementById('prod-date');if(d&&!d.value)d.value=new Date().toISOString().split('T')[0];
  const t=document.getElementById('prod-target');if(t&&!t.value)t.value='7.5';
  renderHppdCheckins();
  renderProductivity();
}

// ── 4-Hour Staffing & Census Check-Ins ──────────────────────────
// Fixed hospital check-in blocks. Each block covers the 4 hours starting at that time.
// Matches the app's existing shift structure: Day (8h), Eve1 (4h), Eve2 (4h), Night (8h).
const HPPD_CK_BLOCKS = [
  { key:'0700', label:'0700 – 1500', icon:'☀️', hours:8, name:'Day' },
  { key:'1500', label:'1500 – 1900', icon:'🌆', hours:4, name:'Eve1' },
  { key:'1900', label:'1900 – 2300', icon:'🌆', hours:4, name:'Eve2' },
  { key:'2300', label:'2300 – 0700', icon:'🌙', hours:8, name:'Night' },
];
let _hppdCkDate = new Date().toISOString().split('T')[0];

function hppdCkChangeDate(delta){
  const d = new Date(_hppdCkDate + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  _hppdCkDate = d.toISOString().split('T')[0];
  renderHppdCheckins();
}

function hppdCkSetDate(dateKey){
  if (dateKey) _hppdCkDate = dateKey;
  renderHppdCheckins();
}

// Aggregate a date's logged check-ins into totals used to drive the daily HPPD record.
function hppdCkAggregate(dateKey){
  const day = (state.hppdCheckins || {})[dateKey] || {};
  const logged = HPPD_CK_BLOCKS
    .map(b => ({ ...b, entry: day[b.key] }))
    .filter(b => b.entry && (b.entry.census || b.entry.staff));
  const totalHours  = logged.reduce((s,b) => s + ((b.entry.staff||0) * b.hours), 0);
  const avgCensus   = logged.length ? Math.round(logged.reduce((s,b) => s + (b.entry.census||0), 0) / logged.length * 10) / 10 : 0;
  const runningHppd = avgCensus ? Math.round(totalHours / avgCensus * 100) / 100 : null;
  return { logged, totalHours, avgCensus, runningHppd, blocksLogged: logged.length };
}

function saveHppdCheckin(dateKey, blockKey, field, rawVal){
  if (!state.hppdCheckins) state.hppdCheckins = {};
  if (!state.hppdCheckins[dateKey]) state.hppdCheckins[dateKey] = {};
  if (!state.hppdCheckins[dateKey][blockKey]) state.hppdCheckins[dateKey][blockKey] = {};
  const entry = state.hppdCheckins[dateKey][blockKey];
  if (field === 'notes') {
    entry.notes = rawVal || '';
  } else {
    const val = parseFloat(rawVal);
    entry[field] = isNaN(val) ? 0 : val;
  }
  entry.savedAt = new Date().toISOString();
  hppdCkSyncToDaily(dateKey);
  persistSave();
  renderHppdCheckins();
  renderProductivity();
}

function deleteHppdCheckin(dateKey, blockKey){
  if (!(state.hppdCheckins||{})[dateKey]) return;
  delete state.hppdCheckins[dateKey][blockKey];
  hppdCkSyncToDaily(dateKey);
  persistSave();
  renderHppdCheckins();
  renderProductivity();
}

// Push the running totals from check-ins into the existing daily productivity
// record so the monthly HPPD table/summary reflect the real-time entries.
function hppdCkSyncToDaily(dateKey){
  const agg = hppdCkAggregate(dateKey);
  if (!state.productivity) state.productivity = {};
  const existing = state.productivity[dateKey] || {};
  if (!agg.blocksLogged) {
    // No check-ins logged for this date — leave any manually-entered daily record alone.
    return;
  }
  state.productivity[dateKey] = {
    ...existing,
    census: agg.avgCensus,
    productiveHrs: agg.totalHours,
    targetHppd: existing.targetHppd || 7.5,
    fromCheckins: true,
  };
}

function renderHppdCheckins(){
  const card = document.getElementById('hppd-checkin-card');
  if (!card) return;
  const dateKey = _hppdCkDate;
  const day = (state.hppdCheckins || {})[dateKey] || {};
  const agg = hppdCkAggregate(dateKey);
  const target = (state.productivity||{})[dateKey]?.targetHppd || 7.5;
  const dateStr = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  const over = agg.runningHppd !== null && agg.runningHppd > target;

  const rows = HPPD_CK_BLOCKS.map(b => {
    const e = day[b.key] || {};
    const intervalHppd = (e.census && e.staff) ? Math.round((e.staff*b.hours) / e.census * 100) / 100 : null;
    const hasData = e.census || e.staff;
    return `<div style="display:grid;grid-template-columns:110px 1fr 1fr 90px 32px;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div style="font-size:11px;color:var(--text2);font-weight:600;">${b.icon} ${b.label}</div>
      <input type="number" min="0" max="30" placeholder="Census" value="${e.census||''}"
        onchange="saveHppdCheckin('${dateKey}','${b.key}','census',this.value)"
        style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;">
      <input type="number" min="0" max="30" step="0.5" placeholder="Staff on duty" value="${e.staff||''}"
        onchange="saveHppdCheckin('${dateKey}','${b.key}','staff',this.value)"
        style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;">
      <div style="font-size:12px;font-weight:700;text-align:right;color:${intervalHppd?(intervalHppd>target?'var(--red2)':'var(--green2)'):'var(--text3)'};">${intervalHppd ?? '—'}</div>
      <div style="text-align:center;">${hasData?`<button onclick="deleteHppdCheckin('${dateKey}','${b.key}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>`:''}</div>
    </div>`;
  }).join('');

  card.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px 16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--white);">⏱️ Shift Staffing & Census Check-Ins</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">Log census + staff on duty each shift — feeds the daily HPPD in real time</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button onclick="hppdCkChangeDate(-1)" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;padding:4px 9px;color:var(--text2);font-size:12px;cursor:pointer;">◀</button>
          <input type="date" value="${dateKey}" onchange="hppdCkSetDate(this.value)"
            style="background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:4px 8px;color:var(--white);font-size:12px;outline:none;">
          <button onclick="hppdCkChangeDate(1)" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;padding:4px 9px;color:var(--text2);font-size:12px;cursor:pointer;">▶</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">${dateStr}</div>
      <div style="display:grid;grid-template-columns:110px 1fr 1fr 90px 32px;gap:8px;padding:0 0 6px;border-bottom:1px solid var(--border);">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;">Block</div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;">Census</div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;">Staff on Duty</div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;text-align:right;">HPPD</div>
        <div></div>
      </div>
      ${rows}
      <div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:6px;display:flex;gap:20px;flex-wrap:wrap;align-items:center;">
        <div><div style="font-size:11px;color:var(--text3);">Blocks Logged</div><div style="font-size:16px;font-weight:700;color:var(--white);">${agg.blocksLogged} / 6</div></div>
        <div><div style="font-size:11px;color:var(--text3);">Avg Census</div><div style="font-size:16px;font-weight:700;color:var(--white);">${agg.avgCensus||'—'}</div></div>
        <div><div style="font-size:11px;color:var(--text3);">Total Staffed Hours</div><div style="font-size:16px;font-weight:700;color:var(--accent2);">${agg.totalHours||'—'}</div></div>
        <div><div style="font-size:11px;color:var(--text3);">Running HPPD</div><div style="font-size:16px;font-weight:700;color:${agg.runningHppd?(over?'var(--red2)':'var(--green2)'):'var(--text3)'};">${agg.runningHppd??'—'}</div></div>
        <div><div style="font-size:11px;color:var(--text3);">Target</div><div style="font-size:16px;font-weight:700;color:var(--text2);">${target}</div></div>
      </div>
    </div>`;
}

function openProdModal(dateKey){
  const m=document.getElementById('prod-modal');if(!m)return;m.style.display='flex';
  document.getElementById('prod-edit-date').value=dateKey||'';
  if(dateKey){
    const e=(state.productivity||{})[dateKey]||{};
    document.getElementById('prod-date').value=dateKey;
    document.getElementById('prod-census').value=e.census||'';
    document.getElementById('prod-target').value=e.targetHppd||7.5;
    document.getElementById('prod-shift-day').value=e.shiftDay||'';
    document.getElementById('prod-shift-eve1').value=e.shiftEve1||'';
    document.getElementById('prod-shift-eve2').value=e.shiftEve2||'';
    document.getElementById('prod-shift-night').value=e.shiftNight||'';
    document.getElementById('prod-copy-night').checked=!!e.copyNight;
    document.getElementById('prod-notes').value=e.notes||'';
  } else {
    document.getElementById('prod-date').value=new Date().toISOString().split('T')[0];
    ['prod-census','prod-shift-day','prod-shift-eve1','prod-shift-eve2','prod-shift-night','prod-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    document.getElementById('prod-target').value='7.5';
    document.getElementById('prod-copy-night').checked=false;
  }
  updateProdTotal();
}
function closeProdModal(){const m=document.getElementById('prod-modal');if(m)m.style.display='none';}

function onEve2Change(){
  const eve2=parseFloat(document.getElementById('prod-shift-eve2')?.value)||0;
  const copy=document.getElementById('prod-copy-night')?.checked;
  if(copy){const n=document.getElementById('prod-shift-night');if(n)n.value=eve2||'';}
  updateProdTotal();
}

function updateProdTotal(){
  const day  =parseFloat(document.getElementById('prod-shift-day')?.value)||0;
  const eve1 =parseFloat(document.getElementById('prod-shift-eve1')?.value)||0;
  const eve2 =parseFloat(document.getElementById('prod-shift-eve2')?.value)||0;
  const night=parseFloat(document.getElementById('prod-shift-night')?.value)||0;
  const total=day+eve1+eve2+night;
  const el=document.getElementById('prod-total-display');
  if(el)el.textContent=total>0?total.toFixed(1)+' hrs':'—';
}

function saveProdEntry(){
  const dateKey=document.getElementById('prod-date')?.value||new Date().toISOString().split('T')[0];
  const shiftDay  =parseFloat(document.getElementById('prod-shift-day')?.value)||0;
  const shiftEve1 =parseFloat(document.getElementById('prod-shift-eve1')?.value)||0;
  const shiftEve2 =parseFloat(document.getElementById('prod-shift-eve2')?.value)||0;
  const shiftNight=parseFloat(document.getElementById('prod-shift-night')?.value)||0;
  const copyNight =document.getElementById('prod-copy-night')?.checked||false;
  const totalProd =shiftDay+shiftEve1+shiftEve2+shiftNight;
  const entry={
    census:parseFloat(document.getElementById('prod-census')?.value)||0,
    productiveHrs:totalProd,
    shiftDay, shiftEve1, shiftEve2, shiftNight, copyNight,
    targetHppd:parseFloat(document.getElementById('prod-target')?.value)||7.5,
    notes:document.getElementById('prod-notes')?.value||''
  };
  if(!state.productivity)state.productivity={};state.productivity[dateKey]=entry;
  persistSave();closeProdModal();renderProductivity();
}

function deleteProdEntry(dateKey){if(!confirm('Delete this day?'))return;delete state.productivity[dateKey];persistSave();renderProductivity();}

function renderProductivity(){
  const monthKey=document.getElementById('prod-month')?.value||(new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'));
  const [yr,mo]=monthKey.split('-').map(Number);
  const daysInMonth=new Date(yr,mo,0).getDate();
  const days=Array.from({length:daysInMonth},(_,i)=>yr+'-'+String(mo).padStart(2,'0')+'-'+String(i+1).padStart(2,'0'));
  const entries=days.map(d=>({date:d,...((state.productivity||{})[d]||{})}));
  const withData=entries.filter(e=>e.census||e.productiveHrs);
  const avgCensus=withData.length?Math.round(withData.reduce((s,e)=>s+(e.census||0),0)/withData.length*10)/10:0;
  const totalProd=withData.reduce((s,e)=>s+(e.productiveHrs||0),0);
  const avgHppd=withData.length&&avgCensus?Math.round(totalProd/withData.reduce((s,e)=>s+(e.census||0),0)*100)/100:null;
  const targetHppd=withData.length?withData.reduce((s,e)=>s+(e.targetHppd||7.5),0)/withData.length:7.5;
  const sumEl=document.getElementById('prod-summary');
  if(sumEl){sumEl.innerHTML=`<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;display:flex;gap:20px;flex-wrap:wrap;align-items:center;"><div><div style="font-size:11px;color:var(--text3);">Avg Census</div><div style="font-size:22px;font-weight:700;color:var(--white);">${avgCensus}</div></div><div><div style="font-size:11px;color:var(--text3);">Productive Hours (MTD)</div><div style="font-size:22px;font-weight:700;color:var(--accent2);">${totalProd.toFixed(1)}</div></div><div><div style="font-size:11px;color:var(--text3);">Avg HPPD</div><div style="font-size:22px;font-weight:700;color:${avgHppd&&avgHppd>targetHppd?'var(--red2)':avgHppd?'var(--green2)':'var(--text3)'};">${avgHppd||'—'}</div></div><div><div style="font-size:11px;color:var(--text3);">Target HPPD</div><div style="font-size:22px;font-weight:700;color:var(--text2);">${targetHppd.toFixed(1)}</div></div><div><div style="font-size:11px;color:var(--text3);">Days Logged</div><div style="font-size:22px;font-weight:700;color:var(--text2);">${withData.length}/${daysInMonth}</div></div></div>`;}
  const tEl=document.getElementById('prod-table');if(!tEl)return;
  tEl.innerHTML='<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:8px;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(255,255,255,0.05);"><th style="padding:8px 10px;text-align:left;font-size:11px;color:var(--text3);">Date</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text3);">Census</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--amber2);">☀️ Day</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--accent2);">🌆 Eve1</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--purple2);">🌆 Eve2</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--teal2);">🌙 Night</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--accent2);">Total Hrs</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text3);">HPPD</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text3);">Target</th><th style="padding:8px 10px;"></th></tr></thead><tbody>'+
  entries.map(e=>{const hasData=e.census||e.productiveHrs;const hppd=e.census&&e.productiveHrs?Math.round(e.productiveHrs/e.census*100)/100:null;const target=e.targetHppd||7.5;const over=hppd&&hppd>target;const dateStr=new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  return`<tr style="border-bottom:1px solid rgba(255,255,255,0.04);${!hasData?'opacity:0.4':''}"><td style="padding:8px 10px;font-size:11px;color:var(--white);">${dateStr}</td><td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text2);">${e.census||'—'}</td><td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--amber2);">${e.shiftDay||'—'}</td><td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--accent2);">${e.shiftEve1||'—'}</td><td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--purple2);">${e.shiftEve2||'—'}</td><td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--teal2);">${e.shiftNight||'—'}</td><td style="padding:8px 10px;text-align:right;font-size:12px;font-weight:600;color:var(--accent2);">${e.productiveHrs||'—'}</td><td style="padding:8px 10px;text-align:right;font-size:12px;font-weight:700;color:${hppd?over?'var(--red2)':'var(--green2)':'var(--text3)'};">${hppd||'—'}</td><td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text3);">${target}</td><td style="padding:8px 10px;white-space:nowrap;"><button onclick="openProdModal('${e.date}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--text3)'">${hasData?'✎':'+'}</button>${hasData?`<button onclick="deleteProdEntry('${e.date}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>`:''}</td></tr>`;}).join('')+'</tbody></table></div>';
}

// ════════════════════════════════════
//  EQUIPMENT / MAINTENANCE LOG
// ════════════════════════════════════
const EQ_STATUS_CFG={'Open':{c:'var(--red2)',bg:'rgba(239,68,68,0.1)',b:'rgba(239,68,68,0.4)'},'In Progress':{c:'var(--amber2)',bg:'rgba(245,158,11,0.1)',b:'rgba(245,158,11,0.4)'},'Resolved':{c:'var(--green2)',bg:'rgba(37,168,104,0.1)',b:'rgba(37,168,104,0.3)'}};

function initEquipmentLog(){
  const dl=document.getElementById('eq-staff-dl');if(dl)dl.innerHTML=MASTER_STAFF.map(s=>`<option value="${s.name}">`).join('');
  const d=document.getElementById('eq-date');if(d&&!d.value)d.value=new Date().toISOString().split('T')[0];
  renderEquipmentLog();
}

function openEqModal(id){
  const m=document.getElementById('eq-modal');if(!m)return;m.style.display='flex';
  document.getElementById('eq-edit-id').value=id||'';
  if(id){const e=(state.equipmentLog||[]).find(r=>r.id===id);if(e){document.getElementById('eq-item').value=e.item||'IV Pump';document.getElementById('eq-location').value=e.location||'';document.getElementById('eq-by').value=e.reportedBy||'';document.getElementById('eq-date').value=e.reportedDate||'';document.getElementById('eq-wo').value=e.workOrder||'';document.getElementById('eq-status').value=e.status||'Open';document.getElementById('eq-issue').value=e.issue||'';document.getElementById('eq-notes').value=e.notes||'';return;}}
  ['eq-location','eq-by','eq-wo','eq-issue','eq-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('eq-date').value=new Date().toISOString().split('T')[0];
}
function closeEqModal(){const m=document.getElementById('eq-modal');if(m)m.style.display='none';}

function saveEqEntry(){
  const editId=document.getElementById('eq-edit-id')?.value||'';
  const entry={id:editId||'eq_'+Date.now(),item:document.getElementById('eq-item')?.value||'',location:document.getElementById('eq-location')?.value||'',reportedBy:document.getElementById('eq-by')?.value||'',reportedDate:document.getElementById('eq-date')?.value||'',workOrder:document.getElementById('eq-wo')?.value||'',status:document.getElementById('eq-status')?.value||'Open',issue:document.getElementById('eq-issue')?.value||'',notes:document.getElementById('eq-notes')?.value||'',ts:Date.now()};
  if(!state.equipmentLog)state.equipmentLog=[];
  if(editId){const i=state.equipmentLog.findIndex(r=>r.id===editId);if(i>=0)state.equipmentLog[i]=entry;else state.equipmentLog.unshift(entry);}
  else state.equipmentLog.unshift(entry);
  persistSave();closeEqModal();renderEquipmentLog();
}

function deleteEqEntry(id){if(!confirm('Delete this entry?'))return;state.equipmentLog=(state.equipmentLog||[]).filter(r=>r.id!==id);persistSave();renderEquipmentLog();}

function renderEquipmentLog(){
  const statusF=document.getElementById('eq-status-filter')?.value||'ALL';
  let list=(state.equipmentLog||[]).slice();if(statusF!=='ALL')list=list.filter(r=>r.status===statusF);
  list.sort((a,b)=>{const ord={'Open':0,'In Progress':1,'Resolved':2};return (ord[a.status]||0)-(ord[b.status]||0)||b.ts-a.ts;});
  const openCount=(state.equipmentLog||[]).filter(r=>r.status==='Open').length;
  const inProgCount=(state.equipmentLog||[]).filter(r=>r.status==='In Progress').length;
  const sumEl=document.getElementById('eq-summary');
  if(sumEl){sumEl.innerHTML=Object.entries(EQ_STATUS_CFG).map(([k,c])=>{const cnt=(state.equipmentLog||[]).filter(r=>r.status===k).length;return`<div style="background:${c.bg};border:1px solid ${c.b};border-radius:8px;padding:10px 16px;"><div style="font-size:20px;font-weight:700;color:${c.c};">${cnt}</div><div style="font-size:11px;color:var(--text3);">${k}</div></div>`;}).join('');}
  const tEl=document.getElementById('eq-table');if(!tEl)return;
  if(!list.length){tEl.innerHTML='<div style="text-align:center;padding:50px;color:var(--text3);"><div style="font-size:32px;margin-bottom:10px;">🔧</div><div style="font-size:13px;color:var(--white);">No equipment issues logged</div><button onclick="openEqModal()" class="btn btn-primary" style="font-size:12px;margin-top:12px;">+ Log First Issue</button></div>';return;}
  tEl.innerHTML='<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(r=>{const sc=EQ_STATUS_CFG[r.status]||EQ_STATUS_CFG.Open;const dateStr=r.reportedDate?new Date(r.reportedDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';return`<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-left:3px solid ${sc.c};border-radius:8px;padding:12px 14px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;"><div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;"><span style="font-size:13px;font-weight:700;color:var(--white);">🔧 ${r.item}</span><span style="background:${sc.bg};color:${sc.c};font-size:11px;font-weight:700;padding:1px 8px;border-radius:8px;">${r.status}</span>${r.location?`<span style="font-size:11px;color:var(--text3);">${r.location}</span>`:''} ${r.workOrder?`<span style="font-size:11px;color:var(--text3);font-family:'IBM Plex Mono',monospace;">WO: ${r.workOrder}</span>`:''}</div><div style="font-size:11px;color:var(--text3);margin-bottom:4px;">${r.reportedBy?'Reported by '+r.reportedBy:''}${dateStr?' · '+dateStr:''}</div>${r.issue?`<div style="font-size:11px;color:var(--text2);">${r.issue}</div>`:''} ${r.notes?`<div style="font-size:11px;color:var(--teal2);margin-top:4px;">↳ ${ccEsc(r.notes)}</div>`:''}</div><div style="display:flex;gap:4px;flex-shrink:0;"><button onclick="openEqModal('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button><button onclick="deleteEqEntry('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></div></div></div>`;}).join('')+'</div>';
}