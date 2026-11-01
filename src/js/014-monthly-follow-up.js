

// ════════════════════════════════════
//  MONTHLY FOLLOW-UP (People > Monthly Follow-Up)
//  Flags RN/LPN staff below monthly BCMA scan (>95%) and/or pain
//  reassessment (>=80%) targets, and tracks a monthly follow-up record.
// ════════════════════════════════════

const MFU_SCAN_TARGET = 95; // must be > this to pass
const MFU_PAIN_TARGET = 80; // must be >= this to pass
const MFU_PLATO_TARGET = 90; // must be >= this to pass

function getMonthlyQuality(name, monthKey) {
  const q = ((state.qualityData[name] || {})[monthKey]) || {};
  const scanPct = q.scanTotal > 0 ? Math.round((q.scans || 0) / q.scanTotal * 100) : null;
  const painPct = q.painTotal > 0 ? Math.round((q.pain  || 0) / q.painTotal * 100) : null;
  return { scanPct, painPct };
}

function initMonthlyFollowUp() {
  const monthInput = document.getElementById('mfu-month');
  if (monthInput && !monthInput.value) {
    const now = new Date();
    monthInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  }
  renderMonthlyFollowUp();
}

function getFallRoundStatsForMonth(name, monthKey) {
  const recs = (state.fallRoundData || []).filter(r => {
    if (!roundStaffNames(r).includes(name)) return false;
    const d = parseUSDate(r.date);
    if (!d) return false;
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return k === monthKey;
  });
  const total = recs.length;
  const compliantCount = recs.filter(r => r.compliant).length;
  const pct = total > 0 ? Math.round(compliantCount / total * 100) : null;
  const missedCounts = {};
  FALL_ROUND_ITEMS.forEach(it => missedCounts[it.key] = 0);
  recs.forEach(r => FALL_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') missedCounts[it.key]++; }));
  const missedList = FALL_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:missedCounts[it.key] })).filter(m => m.count > 0).sort((a, b) => b.count - a.count);
  return { total, compliantCount, pct, missedList };
}

function renderMonthlyFollowUp() {
  const grid = document.getElementById('mfu-grid');
  const summaryEl = document.getElementById('mfu-summary');
  if (!grid) return;

  const monthKey = document.getElementById('mfu-month')?.value ||
    (() => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); })();
  const roleFilter = document.getElementById('mfu-role')?.value || 'ALL';
  const listFilter = document.getElementById('mfu-filter')?.value || 'flagged';

  let staffList = MASTER_STAFF.filter(s => (s.job === 'RN' || s.job === 'LPN') && (roleFilter === 'ALL' || s.job === roleFilter));

  if (!state.monthlyFollowUp) state.monthlyFollowUp = {};
  const monthRecords = state.monthlyFollowUp[monthKey] || {};

  const staffData = staffList.map(s => {
    const q = getMonthlyQuality(s.name, monthKey);
    const scanFail = q.scanPct !== null && q.scanPct <= MFU_SCAN_TARGET;
    const painFail = q.painPct !== null && q.painPct < MFU_PAIN_TARGET;
    const plato = getFallRoundStatsForMonth(s.name, monthKey);
    const platoFail = plato.pct !== null && plato.pct < MFU_PLATO_TARGET;
    const flagged = scanFail || painFail || platoFail;
    const record = monthRecords[s.name] || null;
    return { ...s, q, scanFail, painFail, plato, platoFail, flagged, record };
  });

  let display = staffData;
  if (listFilter === 'flagged') display = display.filter(s => s.flagged);
  if (listFilter === 'open')    display = display.filter(s => s.flagged && (!s.record || s.record.status !== 'Completed'));

  display.sort((a, b) => (Number(b.flagged) - Number(a.flagged)) || a.name.localeCompare(b.name));

  const flaggedCount   = staffData.filter(s => s.flagged).length;
  const openCount      = staffData.filter(s => s.flagged && (!s.record || s.record.status !== 'Completed')).length;
  const completedCount = staffData.filter(s => s.flagged && s.record && s.record.status === 'Completed').length;

  if (summaryEl) {
    const chip = (label, val, col) => `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 14px;">
      <div style="font-size:18px;font-weight:700;color:${col};">${val}</div>
      <div style="font-size:11px;color:var(--text3);">${label}</div>
    </div>`;
    summaryEl.innerHTML =
      chip('Below Target', flaggedCount, 'var(--red2)') +
      chip('Follow-Up Pending', openCount, 'var(--amber2)') +
      chip('Follow-Up Completed', completedCount, 'var(--green2)');
  }

  if (!display.length) { grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);">No staff match filter for this month</div>'; return; }

  const statusColors = { 'Not Started':'var(--red2)', 'Scheduled':'var(--amber2)', 'Completed':'var(--green2)' };

  grid.innerHTML = display.map(s => {
    const rCol = IV_ROLE_COLOR[s.job] || 'var(--text2)';
    const initials = s.name.split(',').map(p => p.trim()[0] || '').join('');
    const scanLabel = s.q.scanPct !== null ? s.q.scanPct + '% BAMA' : '— BAMA';
    const painLabel = s.q.painPct !== null ? s.q.painPct + '% Pain' : '— Pain';
    const platoLabel = s.plato.pct !== null ? s.plato.pct + '% PLATO' : '— PLATO';
    const pills = `
      <span title="BCMA Scanning" style="font-size:11px;font-weight:700;padding:2px 6px;border-radius:8px;${s.scanFail?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${scanLabel}</span>
      <span title="Pain Reassessment" style="font-size:11px;font-weight:700;padding:2px 6px;border-radius:8px;${s.painFail?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${painLabel}</span>
      <span title="Fall Rounding (PLATO)" style="font-size:11px;font-weight:700;padding:2px 6px;border-radius:8px;${s.platoFail?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${platoLabel}</span>`;

    const reasons = [];
    if (s.scanFail) reasons.push(`BAMA ${s.q.scanPct}% (goal &gt;${MFU_SCAN_TARGET}%)`);
    if (s.painFail) reasons.push(`Pain reassessment ${s.q.painPct}% (goal ≥${MFU_PAIN_TARGET}%)`);
    if (s.platoFail) reasons.push(`PLATO fall rounding ${s.plato.pct}% (goal ≥${MFU_PLATO_TARGET}%)${s.plato.missedList[0] ? ' — most missed: ' + s.plato.missedList[0].label : ''}`);
    const reasonHtml = reasons.length ? `<div style="font-size:11px;color:var(--red2);margin-top:6px;">⚠ ${reasons.join(' · ')}</div>` : '';

    const rec = s.record;
    const recHtml = rec ? `<div style="margin-top:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="font-size:11px;color:${statusColors[rec.status]||'var(--text3)'};background:${(statusColors[rec.status]||'var(--text3)')}22;border-radius:8px;padding:1px 6px;">${rec.status}</span>
        ${rec.date ? `<span style="font-size:11px;color:var(--text3);">${new Date(rec.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>` : ''}
      </div>
      ${rec.notes ? `<div style="font-size:11px;color:var(--text2);">${rec.notes.slice(0,160)}${rec.notes.length>160?'…':''}</div>` : ''}
    </div>` : '';

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${s.flagged?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${s.flagged?'var(--red2)':'var(--border)'};border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="width:36px;height:36px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${s.name}</div>
          <div style="font-size:11px;color:${rCol};">${s.job}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">${pills}</div>
        <button onclick="openMfuModal('${s.name.replace(/'/g,"\\'")}','${monthKey}')"
          style="font-size:11px;padding:4px 12px;background:${rec?'rgba(46,125,209,0.1)':'rgba(239,68,68,0.1)'};border:1px solid ${rec?'rgba(46,125,209,0.3)':'rgba(239,68,68,0.35)'};border-radius:5px;color:${rec?'var(--accent2)':'var(--red2)'};cursor:pointer;white-space:nowrap;">
          ${rec ? '✎ Edit Follow-Up' : '+ Follow-Up'}
        </button>
      </div>
      ${reasonHtml}
      ${recHtml}
    </div>`;
  }).join('');
}

function openMfuModal(name, monthKey) {
  const m = document.getElementById('mfu-modal'); if (!m) return;
  m.style.display = 'flex';
  document.getElementById('mfu-m-name').value  = name;
  document.getElementById('mfu-m-month').value = monthKey;
  document.getElementById('mfu-modal-title').textContent = 'Monthly Follow-Up';
  document.getElementById('mfu-modal-sub').textContent   = name + ' · ' + monthKey;
  const rec = ((state.monthlyFollowUp || {})[monthKey] || {})[name];
  document.getElementById('mfu-m-date').value   = rec?.date   || new Date().toISOString().split('T')[0];
  document.getElementById('mfu-m-status').value = rec?.status || 'Not Started';
  document.getElementById('mfu-m-notes').value  = rec?.notes  || '';
}

function closeMfuModal() { const m = document.getElementById('mfu-modal'); if (m) m.style.display = 'none'; }

function saveMfuFollowUp() {
  const name     = document.getElementById('mfu-m-name')?.value  || '';
  const monthKey = document.getElementById('mfu-m-month')?.value || '';
  if (!name || !monthKey) return;
  const record = {
    date:   document.getElementById('mfu-m-date')?.value   || '',
    status: document.getElementById('mfu-m-status')?.value || 'Not Started',
    notes:  document.getElementById('mfu-m-notes')?.value  || '',
    ts: Date.now(),
  };
  if (!state.monthlyFollowUp) state.monthlyFollowUp = {};
  if (!state.monthlyFollowUp[monthKey]) state.monthlyFollowUp[monthKey] = {};
  state.monthlyFollowUp[monthKey][name] = record;
  persistSave();
  closeMfuModal();
  renderMonthlyFollowUp();
  showSaveBanner('💾 Monthly follow-up saved for ' + name.split(',')[0]);
}


// ════════════════════════════════════
//  POLICY PDF UPLOAD & AI SUMMARIZE
// ════════════════════════════════════

let _policyUploadedText = '';

function handlePolicyUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('pol-upload-status');
  const aiBtn    = document.getElementById('pol-ai-btn');
  if (statusEl) statusEl.textContent = '⏳ Reading file...';

  const reader = new FileReader();

  if (file.name.endsWith('.pdf')) {
    // Read PDF as base64 for Claude
    reader.onload = function(e) {
      _policyUploadedText = e.target.result.split(',')[1]; // base64
      if (statusEl) statusEl.textContent = '✓ PDF ready — click Summarize';
      if (aiBtn) aiBtn.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);
  } else {
    // Plain text / doc
    reader.onload = function(e) {
      _policyUploadedText = e.target.result;
      if (statusEl) statusEl.textContent = '✓ File ready — click Summarize';
      if (aiBtn) aiBtn.style.display = 'inline-flex';
    };
    reader.readAsText(file);
  }
  input.value = '';
}

async function summarizePolicyWithAI() {
  if (!_policyUploadedText) { alert('Upload a file first.'); return; }
  const aiBtn    = document.getElementById('pol-ai-btn');
  const statusEl = document.getElementById('pol-upload-status');
  const titleEl  = document.getElementById('pol-title');
  const descEl   = document.getElementById('pol-desc');

  if (aiBtn) { aiBtn.textContent = '⏳ Summarizing...'; aiBtn.style.opacity = '0.6'; }
  if (statusEl) statusEl.textContent = 'Calling AI...';

  const title = titleEl?.value || 'this policy';
  const isPdf = _policyUploadedText.length > 200 && !_policyUploadedText.includes('\n');

  try {
    const messages = isPdf
      ? [{ role:'user', content:[
          { type:'document', source:{ type:'base64', media_type:'application/pdf', data: _policyUploadedText } },
          { type:'text', text:`Summarize this policy document for nursing staff at 3B Tele Med-Surg (AOMC). Return ONLY:\n1. A 2-3 sentence plain-language summary of what changed or what the policy covers\n2. 4-6 bullet points of key things nurses need to know or do differently\n3. Any compliance deadlines\n\nBe concise and clinical. No preamble.` }
        ]}]
      : [{ role:'user', content: `Summarize this policy for nursing staff at 3B Tele Med-Surg (AOMC):\n\n${_policyUploadedText.slice(0, 8000)}\n\nReturn ONLY:\n1. A 2-3 sentence plain-language summary\n2. 4-6 bullet points of key things nurses need to know or do differently\n3. Any deadlines or compliance dates\n\nBe concise and clinical. No preamble.` }];

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages,
      })
    });
    const data = await resp.json();
    const text = (data.content||[]).map(c=>c.text||'').join('');
    if (text && descEl) descEl.value = text;
    if (statusEl) statusEl.textContent = '✓ Summary complete — review and edit below';
    _policyUploadedText = '';
    if (aiBtn) { aiBtn.textContent = '✨ Summarize with AI'; aiBtn.style.opacity = '1'; aiBtn.style.display = 'none'; }
  } catch(err) {
    if (statusEl) statusEl.textContent = '⚠ AI failed — paste text manually';
    if (aiBtn) { aiBtn.textContent = '✨ Summarize with AI'; aiBtn.style.opacity = '1'; }
  }
}

// ════════════════════════════════════
//  READ & SIGN TAB
// ════════════════════════════════════

let _rsSignPolicyId = null;
let _rsSignName     = null;

function initReadSign() {
  // Populate staff datalist
  const dl = document.getElementById('rs-staff-dl');
  if (dl) dl.innerHTML = MASTER_STAFF.map(s => `<option value="${s.name}">`).join('');
  if (document.getElementById('panel-readsign')?.style.display !== 'none') { renderReadSign(); }
}

// ── Manager View ─────────────────────────────────────────────────
function renderReadSign() {
  const el = document.getElementById('rs-policy-list');
  if (!el) return;
  const filter = document.getElementById('rs-policy-filter')?.value || 'ALL';
  const policies = (state.policies || []).filter(p => p.requireAck !== false);

  if (!policies.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text3);">
      <div style="font-size:36px;margin-bottom:12px;">📄</div>
      <div style="font-size:13px;color:var(--white);margin-bottom:6px;">No policies yet</div>
      <div style="font-size:11px;">Add policies in the Policies tab — they'll appear here for staff sign-off.</div>
    </div>`;
    return;
  }

  const cards = policies.map(p => {
    const staff  = getPolicyStaff(p);
    const ackd   = p.acks || {};
    const done   = staff.filter(s => !!ackd[s.name]);
    const pending = staff.filter(s => !ackd[s.name]);
    const pct    = staff.length ? Math.round(done.length / staff.length * 100) : 0;
    const cfg    = POL_CAT_CFG[p.category] || POL_CAT_CFG.Policy;

    if (filter === 'PENDING'  && pending.length === 0) return '';
    if (filter === 'COMPLETE' && pct < 100)            return '';

    const barColor = pct === 100 ? 'var(--green2)' : pct >= 70 ? 'var(--accent2)' : 'var(--amber2)';

    const pendingRows = pending.slice(0, 8).map(s => {
      const col = IV_ROLE_COLOR[s.job] || 'var(--text2)';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <div>
          <span style="font-size:11px;color:var(--white);">${s.name}</span>
          <span style="font-size:11px;color:${col};margin-left:5px;">${s.job}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:11px;color:var(--amber2);">Pending</span>
          <button onclick="managerSignFor('${p.id}','${s.name.replace(/'/g,"\\'")}','${s.job}')"
            style="font-size:11px;padding:2px 7px;background:rgba(37,168,104,0.12);border:1px solid rgba(37,168,104,0.3);border-radius:3px;color:var(--green2);cursor:pointer;">
            Mark Signed
          </button>
        </div>
      </div>`;
    }).join('');

    const doneRows = done.slice(0, 5).map(s => {
      const col = IV_ROLE_COLOR[s.job] || 'var(--text2)';
      const dateStr = ackd[s.name] ? new Date(ackd[s.name] + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
        <div>
          <span style="font-size:11px;color:var(--text3);text-decoration:line-through;">${s.name}</span>
          <span style="font-size:11px;color:${col};margin-left:4px;">${s.job}</span>
        </div>
        <span style="font-size:11px;color:var(--green2);">✓ ${dateStr}</span>
      </div>`;
    }).join('');

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${pending.length>0?'rgba(245,158,11,0.3)':'rgba(37,168,104,0.3)'};border-left:3px solid ${pending.length>0?'var(--amber2)':'var(--green2)'};border-radius:10px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <span style="font-size:22px;">${cfg.icon}</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${p.title}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">${p.category} · Effective: ${p.effectiveDate || '—'} · Required: ${p.roles==='ALL'?'All Staff':p.roles}</div>
        </div>
        <div style="text-align:right;min-width:60px;">
          <div style="font-size:22px;font-weight:700;color:${barColor};">${pct}%</div>
          <div style="font-size:11px;color:var(--text3);">${done.length}/${staff.length} signed</div>
        </div>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;margin-bottom:12px;">
        <div style="height:4px;background:${barColor};width:${pct}%;border-radius:2px;transition:width .5s;"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:6px;">⏳ Pending (${pending.length})</div>
          ${pending.length ? pendingRows : '<div style="font-size:11px;color:var(--green2);">✅ All staff signed!</div>'}
          ${pending.length > 8 ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;">+${pending.length-8} more</div>` : ''}
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--green2);margin-bottom:6px;">✅ Signed (${done.length})</div>
          ${done.length ? doneRows : '<div style="font-size:11px;color:var(--text3);">None yet</div>'}
          ${done.length > 5 ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;">+${done.length-5} more</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button onclick="printSignOffSheet('${p.id}')" style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">🖨 Print Sign-Off Sheet</button>
        <button onclick="exportPolicySignoffs('${p.id}')" style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">📥 Export CSV</button>
        ${pending.length > 0 ? `<button onclick="sendPolicyToPhones('${p.id}')" style="font-size:11px;padding:4px 10px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:var(--purple2);cursor:pointer;font-weight:700;">📱 Send to Phones (${pending.length})</button>` : ''}
        ${pending.length > 0 ? `<button onclick="remindAllPending('${p.id}')" style="font-size:11px;padding:4px 10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:4px;color:var(--amber2);cursor:pointer;">📣 Remind Pending</button>` : ''}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = cards || '<div style="text-align:center;padding:40px;color:var(--text3);">No policies match filter</div>';
}

// ── Send Policy to Staff Phones ──────────────────────────────────────
function sendPolicyToPhones(policyId) {
  const p = (state.policies || []).find(x => x.id === policyId);
  if (!p) return;

  const pending = getPolicyStaff(p).filter(s => !(p.acks || {})[s.name]);
  if (!pending.length) { showSaveBanner('✅ All staff have already signed!'); return; }

  // Build the self-sign URL — points to this same HTML file with staff name pre-filled
  const baseUrl = window.location.href.split('?')[0];
  const signUrl = `${baseUrl}?rs=1&pol=${encodeURIComponent(p.id)}&title=${encodeURIComponent(p.title)}`;

  // Build SMS messages for each pending staff member
  const messages = pending.map(s => {
    const phone = (state.phones[s.name] || '').replace(/\D/g,'');
    const msg = `Hi ${s.name.split(',')[1]?.trim() || s.name.split(',')[0]} — please read and sign off on:\n\n${p.title}\n\nOpen the 3B Staff Command Center on your phone and go to Education → Read & Sign.\n\nTap your name → find "${p.title}" → tap Sign.\n\nThank you,\n3B Management`;
    return { name: s.name, job: s.job, phone, msg };
  });

  // Show modal with options
  const existing = document.getElementById('rs-send-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'rs-send-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;';

  const phoneRows = messages.map(m => {
    const hasPh = m.phone.length >= 10;
    const smsUrl = hasPh ? `sms:${m.phone}?body=${encodeURIComponent(m.msg)}` : '#';
    const rCol = IV_ROLE_COLOR[m.job] || 'var(--text2)';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);gap:8px;">
      <div>
        <span style="font-size:12px;font-weight:600;color:var(--white);">${m.name}</span>
        <span style="font-size:11px;color:${rCol};margin-left:5px;">${m.job}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${hasPh
          ? `<span style="font-size:11px;color:var(--text3);">${m.phone.replace(/(\d{3})(\d{3})(\d{4})/,'($1) $2-$3')}</span>
             <a href="${smsUrl}" style="font-size:11px;padding:3px 10px;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:var(--purple2);text-decoration:none;font-weight:700;">💬 Text</a>`
          : `<span style="font-size:11px;color:var(--red2);">No phone on file</span>`
        }
        <button onclick="managerSignFor('${policyId}','${m.name.replace(/'/g,"\\'")}','${m.job}')" style="font-size:11px;padding:3px 10px;background:rgba(37,168,104,0.12);border:1px solid rgba(37,168,104,0.3);border-radius:4px;color:var(--green2);cursor:pointer;">✓ Mark Signed</button>
      </div>
    </div>`;
  }).join('');

  const copyAll = messages.filter(m=>m.phone.length>=10).map(m=>`${m.name}: ${m.msg}`).join('\n\n---\n\n');

  modal.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;width:100%;max-width:640px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-size:15px;font-weight:700;color:var(--white);">📱 Send to Staff Phones</div>
      <button onclick="document.getElementById('rs-send-modal').remove()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;">✕</button>
    </div>
    <div style="font-size:11px;color:var(--purple2);font-weight:700;margin-bottom:4px;">${p.title}</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:14px;">${pending.length} staff need to sign</div>

    <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:8px;padding:12px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--purple2);margin-bottom:6px;">📋 How to send:</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;">
        1. Tap <b style="color:var(--purple2);">💬 Text</b> next to each staff member's name to open a pre-filled SMS<br>
        2. Staff open this app on their phone → Education → Read &amp; Sign → enter their name → sign<br>
        3. Or tap <b>✓ Mark Signed</b> to record their signature on your device (e.g. after a huddle)<br>
        4. Results update live — signed names move to the ✅ Signed column automatically
      </div>
    </div>

    <div style="max-height:320px;overflow-y:auto;margin-bottom:14px;">
      ${phoneRows}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
      <button onclick="navigator.clipboard.writeText(${JSON.stringify(copyAll)}).then(()=>showSaveBanner('📋 All messages copied!'))" style="font-size:11px;padding:5px 12px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:5px;color:var(--text2);cursor:pointer;">📋 Copy All Messages</button>
      <button onclick="document.getElementById('rs-send-modal').remove()" class="btn btn-ghost btn-sm">Close</button>
    </div>
  </div>`;

  document.body.appendChild(modal);
}

// ── Staff Self-Sign View ──────────────────────────────────────────
function openStaffSignView() {
  document.getElementById('rs-manager-view').style.display = 'none';
  document.getElementById('rs-staff-view').style.display   = 'block';
  renderStaffPolicyList();
}

function closeStaffSignView() {
  document.getElementById('rs-manager-view').style.display = 'block';
  document.getElementById('rs-staff-view').style.display   = 'none';
}

function renderStaffPolicyList() {
  const el   = document.getElementById('rs-staff-policy-list');
  const name = (document.getElementById('rs-staff-name')?.value || '').trim();
  if (!el) return;

  const policies = (state.policies || []).filter(p => p.requireAck !== false);

  if (!name) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:12px;">Enter your name above to see policies requiring your signature.</div>';
    return;
  }

  // Find matching staff
  const staffMatch = MASTER_STAFF.find(s => s.name.toLowerCase() === name.toLowerCase()) ||
                     MASTER_STAFF.find(s => s.name.toLowerCase().includes(name.toLowerCase()));

  if (!staffMatch) {
    el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--amber2);font-size:12px;">⚠ Name not found in staff list. Check spelling or ask your manager.</div>`;
    return;
  }

  // Filter to policies that apply to this staff member
  const myPolicies = policies.filter(p => {
    if (p.roles === 'ALL') return true;
    if (p.roles === 'RN' && (staffMatch.job === 'RN' || staffMatch.job === 'LPN')) return true;
    if (p.roles === staffMatch.job) return true;
    return false;
  });

  if (!myPolicies.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3);font-size:12px;">No policies currently require your signature, ${staffMatch.name.split(',')[1]?.trim() || staffMatch.name.split(',')[0]}.</div>`;
    return;
  }

  const firstName = staffMatch.name.split(',')[1]?.trim().split(' ')[0] || staffMatch.name.split(',')[0];
  const pending = myPolicies.filter(p => !(p.acks || {})[staffMatch.name]);
  const signed  = myPolicies.filter(p =>  (p.acks || {})[staffMatch.name]);

  el.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <div style="flex:1;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--amber2);">${pending.length}</div>
        <div style="font-size:11px;color:var(--text3);">Needs Signature</div>
      </div>
      <div style="flex:1;background:rgba(37,168,104,0.08);border:1px solid rgba(37,168,104,0.3);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${signed.length}</div>
        <div style="font-size:11px;color:var(--text3);">Completed</div>
      </div>
    </div>

    ${pending.length ? `
    <div style="font-size:11px;font-weight:700;color:var(--amber2);margin-bottom:8px;">⏳ Needs Your Signature</div>
    ${pending.map(p => {
      const cfg = POL_CAT_CFG[p.category] || POL_CAT_CFG.Policy;
      return `<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:14px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
          <span style="font-size:20px;">${cfg.icon}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--white);">${p.title}</div>
            <div style="font-size:11px;color:var(--text3);">${p.category} · Effective: ${p.effectiveDate || '—'}</div>
          </div>
        </div>
        ${p.description ? `<div style="font-size:11px;color:var(--text2);line-height:1.6;background:rgba(255,255,255,0.04);border-radius:6px;padding:10px;margin-bottom:10px;max-height:150px;overflow-y:auto;">${p.description}</div>` : ''}
        <button onclick="openSignModal('${p.id}','${staffMatch.name.replace(/'/g,"\\'")}')"
          style="width:100%;padding:10px;background:rgba(37,168,104,0.15);border:1px solid rgba(37,168,104,0.4);border-radius:6px;color:var(--green2);font-size:12px;font-weight:700;cursor:pointer;">
          ✍️ Read &amp; Sign This Policy
        </button>
      </div>`;
    }).join('')}` : ''}

    ${signed.length ? `
    <div style="font-size:11px;font-weight:700;color:var(--green2);margin-bottom:8px;margin-top:${pending.length?'16px':'0'};">✅ Already Signed</div>
    ${signed.map(p => {
      const cfg = POL_CAT_CFG[p.category] || POL_CAT_CFG.Policy;
      const signDate = new Date(((p.acks||{})[staffMatch.name]||Date.now().toString()) + 'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
      return `<div style="background:rgba(37,168,104,0.05);border:1px solid rgba(37,168,104,0.2);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">${cfg.icon}</span>
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--text2);">${p.title}</div>
          <div style="font-size:11px;color:var(--green2);">Signed: ${signDate}</div>
        </div>
        <span style="font-size:18px;">✅</span>
      </div>`;
    }).join('')}` : ''}
  `;
}

// ── Signature Pad ─────────────────────────────────────────────────
let _sigPadDrawing = false;
let _sigHasData    = false;

function initSigPad() {
  const canvas = document.getElementById('rs-sig-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Size canvas to its display size
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }
  resizeCanvas();

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function startDraw(e) {
    e.preventDefault();
    _sigPadDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    const hint = document.getElementById('rs-sig-hint');
    if (hint) hint.style.display = 'none';
  }

  function draw(e) {
    e.preventDefault();
    if (!_sigPadDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    _sigHasData = true;
    checkSigMatch();
  }

  function endDraw(e) {
    e.preventDefault();
    _sigPadDrawing = false;
    ctx.beginPath();
  }

  canvas.addEventListener('mousedown',  startDraw, { passive:false });
  canvas.addEventListener('mousemove',  draw,      { passive:false });
  canvas.addEventListener('mouseup',    endDraw,   { passive:false });
  canvas.addEventListener('mouseleave', endDraw,   { passive:false });
  canvas.addEventListener('touchstart', startDraw, { passive:false });
  canvas.addEventListener('touchmove',  draw,      { passive:false });
  canvas.addEventListener('touchend',   endDraw,   { passive:false });
}

function clearSigPad() {
  const canvas = document.getElementById('rs-sig-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  _sigHasData = false;
  const hint = document.getElementById('rs-sig-hint');
  if (hint) hint.style.display = 'flex';
  checkSigMatch();
}

function getSigDataUrl() {
  const canvas = document.getElementById('rs-sig-canvas');
  return canvas ? canvas.toDataURL('image/png') : null;
}

// ── Sign Modal ────────────────────────────────────────────────────
function openSignModal(policyId, staffName) {
  _rsSignPolicyId = policyId;
  _rsSignName     = staffName;
  const p = polById(policyId);
  if (!p) return;
  const m = document.getElementById('rs-sign-modal');
  if (!m) return;
  m.style.display = 'flex';
  document.getElementById('rs-modal-title').textContent = p.title;
  document.getElementById('rs-modal-sub').textContent   = `${p.category} · Effective: ${p.effectiveDate || '—'}`;
  document.getElementById('rs-modal-body').innerHTML    = p.description
    ? p.description.replace(/\n/g, '<br>')
    : '<em style="color:var(--text3);">Review this policy with your charge nurse or manager.</em>';
  const inp = document.getElementById('rs-sig-input');
  if (inp) inp.value = '';
  _sigHasData = false;
  // Show hint
  const hint = document.getElementById('rs-sig-hint');
  if (hint) hint.style.display = 'flex';
  // Init canvas after modal visible (needs layout)
  setTimeout(initSigPad, 50);
  checkSigMatch();
}

function closeSignModal() {
  const m = document.getElementById('rs-sign-modal');
  if (m) m.style.display = 'none';
  clearSigPad();
  _rsSignPolicyId = null; _rsSignName = null;
}

function checkSigMatch() {
  const inp    = document.getElementById('rs-sig-input');
  const btn    = document.getElementById('rs-sign-btn');
  const hint   = document.getElementById('rs-sig-match');
  const status = document.getElementById('rs-sig-status');
  if (!btn || !_rsSignName) return;

  const typed   = (inp?.value || '').trim().toLowerCase();
  const last    = _rsSignName.split(',')[0].trim().toLowerCase();
  const first   = (_rsSignName.split(',')[1] || '').trim().split(' ')[0].toLowerCase();
  const nameOk  = typed.length >= 2 && (typed.includes(last) || typed.includes(first));
  const ready   = _sigHasData && nameOk;

  btn.disabled         = !ready;
  btn.style.cursor     = ready ? 'pointer'       : 'not-allowed';
  btn.style.color      = ready ? 'var(--green2)' : 'var(--text3)';
  btn.style.borderColor= ready ? 'rgba(37,168,104,0.6)' : 'rgba(37,168,104,0.2)';
  btn.style.background = ready ? 'rgba(37,168,104,0.2)' : 'rgba(37,168,104,0.08)';

  if (status) {
    if (!_sigHasData && !nameOk) status.textContent = 'Draw your signature and type your name';
    else if (!_sigHasData)       status.textContent = 'Draw your signature above';
    else if (!nameOk)            status.textContent = 'Type your first or last name to confirm';
    else                         status.textContent = '✓ Ready to sign';
    status.style.color = ready ? 'var(--green2)' : 'var(--text3)';
  }
  if (hint) hint.textContent = nameOk ? `✓ ${_rsSignName.split(',')[0]}` : '';
  if (hint) hint.style.color = 'var(--green2)';
}

function submitSignature() {
  if (!_rsSignPolicyId || !_rsSignName || !_sigHasData) return;
  const p = polById(_rsSignPolicyId);
  if (!p) return;
  if (!p.acks)      p.acks = {};
  if (!p.sigImages) p.sigImages = {};
  p.acks[_rsSignName]      = new Date().toISOString().split('T')[0];
  p.sigImages[_rsSignName] = getSigDataUrl(); // store signature image
  persistSave();
  closeSignModal();
  renderStaffPolicyList();
  renderReadSign();
  renderBoardPolicyAlerts();
  showSaveBanner(`✅ ${_rsSignName.split(',')[0]} signed "${p.title}"`);
}

// Manager signs on behalf of staff (e.g. paper sign-off entered retroactively)
function managerSignFor(policyId, staffName) {
  const p = polById(policyId);
  if (!p) return;
  if (!p.acks) p.acks = {};
  p.acks[staffName] = new Date().toISOString().split('T')[0];
  persistSave();
  renderReadSign();
  renderBoardPolicyAlerts();
  showSaveBanner(`✅ Marked ${staffName.split(',')[0]} as signed`);
}

// ── Print & Export ────────────────────────────────────────────────
function printSignOffSheet(policyId) {
  const p = polById(policyId);
  if (!p) return;
  const staff   = getPolicyStaff(p);
  const ackd    = p.acks || {};
  const cfg     = POL_CAT_CFG[p.category] || POL_CAT_CFG.Policy;
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  // Sort: unsigned first, then signed
  const unsigned = staff.filter(s => !ackd[s.name]);
  const signed   = staff.filter(s =>  ackd[s.name]);
  const sorted   = [...unsigned, ...signed];

  // Build 30 rows minimum (fill with blanks if fewer staff)
  const rowCount = Math.max(30, sorted.length);
  let rows = '';
  for (let i = 0; i < rowCount; i++) {
    const s = sorted[i];
    const signDate = s && ackd[s.name]
      ? new Date(ackd[s.name] + 'T12:00:00').toLocaleDateString('en-US', { month:'numeric', day:'numeric', year:'2-digit' })
      : '';
    const nameVal = s ? s.name : '';
    const deptVal = s ? `3B · ${s.job}` : '';
    // Show drawn signature image if available, else blank signature line
    const sigImg = s && p.sigImages && p.sigImages[s.name]
      ? `<img src="${p.sigImages[s.name]}" style="height:22px;max-width:160px;vertical-align:middle;" alt="sig">`
      : '';
    rows += `<tr style="height:28px;">
      <td style="border:1px solid #999;padding:2px 4px;width:28px;font-size:9pt;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #999;padding:2px 6px;width:80px;font-size:9pt;">${signDate}</td>
      <td style="border:1px solid #999;padding:2px 6px;font-size:9pt;">${nameVal}</td>
      <td style="border:1px solid #999;padding:2px 4px;width:170px;">${sigImg}</td>
      <td style="border:1px solid #999;padding:2px 6px;width:130px;font-size:9pt;">${deptVal}</td>
      <td style="border:1px solid #999;padding:2px 6px;width:60px;font-size:9pt;text-align:center;">3B</td>
    </tr>`;
  }

  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Attendance Record — ${p.title}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:10pt; color:#111; background:#fff; padding:28px 36px; }
    .ah-logo { text-align:right; font-size:18pt; margin-bottom:10px; }
    .ah-logo em { font-style:italic; }
    .ah-title { font-size:14pt; font-weight:bold; text-align:center; margin-bottom:10px; }
    .info-table { width:100%; border-collapse:collapse; margin-bottom:14px; }
    .info-table td { border:1px solid #999; padding:4px 8px; font-size:9.5pt; vertical-align:top; }
    .info-table .label { font-size:8pt; color:#555; display:block; margin-bottom:1px; }
    .info-table .val { font-size:10pt; }
    .sign-table { width:100%; border-collapse:collapse; }
    .sign-table th { border:1px solid #999; padding:5px 6px; background:#f0f0f0; font-size:9pt; text-align:left; font-weight:bold; }
    .sign-footer { margin-top:18px; font-size:8.5pt; color:#666; display:flex; justify-content:space-between; border-top:1px solid #ccc; padding-top:8px; }
    @media print { body { padding:0; } @page { size:letter portrait; margin:.45in .5in; } }
  </style>
  </head><body>

  <!-- ArnnotHealth logo -->
  <div class="ah-logo">Arnot<em>Health</em></div>

  <div class="ah-title">Attendance Record - Meetings/Programs</div>

  <!-- Info header table (matches form format) -->
  <table class="info-table">
    <tr>
      <td colspan="4">
        <span class="label">Program/Meeting Name</span>
        <span class="val">${p.title}</span>
      </td>
    </tr>
    <tr>
      <td style="width:25%;">
        <span class="label">Location</span>
        <span class="val">3B Tele Med Surg</span>
      </td>
      <td style="width:20%;">
        <span class="label">Program Length</span>
        <span class="val">&nbsp;</span>
      </td>
      <td style="width:20%;">
        <span class="label">CEUs</span>
        <span class="val">&nbsp;</span>
      </td>
      <td style="width:20%;">
        <span class="label">Mandatory</span>
        <span class="val">YES</span>
      </td>
      <td style="width:15%;">
        <span class="label">Date</span>
        <span class="val">${dateStr}</span>
      </td>
    </tr>
  </table>

  <!-- Signature table -->
  <table class="sign-table">
    <thead>
      <tr>
        <th style="width:28px;">#</th>
        <th style="width:80px;">Date</th>
        <th>Print Last Name, First Name, Initial</th>
        <th style="width:170px;">Signature</th>
        <th style="width:130px;">Department Name</th>
        <th style="width:60px;">Dept. #</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="sign-footer">
    <span>3B Tele Med Surg · AOMC Nursing Operations · ${cfg.icon} ${p.category}</span>
    <span>Printed: ${dateStr} &nbsp;·&nbsp; ${ackd ? Object.keys(ackd).length : 0} of ${staff.length} electronically signed</span>
  </div>

  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

function exportPolicySignoffs(policyId) {
  const p = polById(policyId);
  if (!p) return;
  const staff  = getPolicyStaff(p);
  const ackd   = p.acks || {};
  let csv = 'Name,Role,Signed,Date\n';
  staff.forEach(s => {
    const signed = !!ackd[s.name];
    const date   = signed ? ackd[s.name] : '';
    csv += `"${s.name}","${s.job}","${signed ? 'Yes' : 'No'}","${date}"\n`;
  });
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `signoff_${p.title.replace(/\s+/g,'_')}.csv`;
  a.click();
}

function remindAllPending(policyId) {
  const p = polById(policyId);
  if (!p) return;
  const staff   = getPolicyStaff(p);
  const ackd    = p.acks || {};
  const pending = staff.filter(s => !ackd[s.name]);
  const emails  = pending.map(s => state.emails[s.name]).filter(Boolean);
  const names   = pending.map(s => s.name.split(',')[0]).join(', ');
  const subject = encodeURIComponent(`[3B] Action Required: Please sign "${p.title}"`);
  const body    = encodeURIComponent(
    `Please review and sign the following policy:\r\n\r\n` +
    `Policy: ${p.title}\r\n` +
    `Category: ${p.category}\r\n` +
    `Effective: ${p.effectiveDate || '—'}\r\n\r\n` +
    `${p.description || ''}\r\n\r\n` +
    `Please sign off using the 3B Staff Command Center → Read & Sign tab.\r\n\r\n` +
    `— 3B Tele Med Surg Management`
  );
  if (emails.length) {
    window.open(`mailto:${encodeURIComponent(emails.join(';'))}?subject=${subject}&body=${body}`);
  } else {
    alert(`No email addresses on file for pending staff.\n\nPending: ${names}\n\nAdd emails in the Directory tab.`);
  }
}

// ── Board Notification: unsigned policies for scheduled staff ─────
function renderBoardPolicyAlerts() {
  const el = document.getElementById('board-policy-alerts');
  if (!el) return;

  const dateKey = state.activeBoardDate;
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};
  const scheduled = new Set(Object.values(shifts).flat().map(p => p.name));
  if (!scheduled.size) { el.innerHTML = ''; return; }

  const policies = (state.policies || []).filter(p => p.requireAck !== false);
  if (!policies.length) { el.innerHTML = ''; return; }

  // Find scheduled staff who haven't signed at least one required policy
  const alerts = [];
  scheduled.forEach(name => {
    const staffObj = MASTER_STAFF.find(s => s.name === name);
    if (!staffObj) return;
    const myPolicies = policies.filter(p => {
      if (p.roles === 'ALL') return true;
      if (p.roles === 'RN' && (staffObj.job === 'RN' || staffObj.job === 'LPN')) return true;
      if (p.roles === staffObj.job) return true;
      return false;
    });
    const unsigned = myPolicies.filter(p => !(p.acks || {})[name]);
    if (unsigned.length) {
      alerts.push({ name, job: staffObj.job, unsigned });
    }
  });

  if (!alerts.length) { el.innerHTML = ''; el.style.display = 'none'; return; }

  el.style.display = 'block';
  el.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:var(--purple2);margin-bottom:8px;">
      ✍️ Unsigned Policies — Scheduled Staff
      <span style="font-size:11px;font-weight:400;color:var(--text3);margin-left:8px;">${alerts.length} staff need to sign</span>
      <a onclick="switchTab(document.querySelector('[data-panel=readsign]'))" style="font-size:11px;color:var(--accent2);cursor:pointer;margin-left:8px;text-decoration:none;">Manage →</a>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${alerts.map(a => {
        const rCol = IV_ROLE_COLOR[a.job] || 'var(--text2)';
        const last = a.name.split(',')[0];
        return `<div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:6px;padding:7px 10px;min-width:140px;">
          <div style="font-size:11px;font-weight:700;color:var(--white);">${last}</div>
          <div style="font-size:11px;color:${rCol};">${a.job}</div>
          <div style="font-size:11px;color:var(--amber2);margin-top:3px;">${a.unsigned.length} policy${a.unsigned.length>1?'s':''} unsigned</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">${a.unsigned.map(p=>p.title.slice(0,20)+(p.title.length>20?'…':'')).join(', ')}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ════════════════════════════════════
//  CALL-IN / COVERAGE FINDER
// ════════════════════════════════════

let _ciSelectedCoverage = []; // staff selected for contact

function buildAnticipatedPrintHtml() {
  const CALL_TYPES = new Set(['call','calledoff','NCNS','ncns','sick','family','other']);
  const rColorMap  = { RN:'#1d4ed8', LPN:'#7c3aed', CA:'#0e7490', UC:'#374151' };
  const DAYS_LONG  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Build one row per day for next 3 days
  const today = new Date(); today.setHours(0,0,0,0);
  let rows = '';
  let anyRisks = false;

  for (let d = 0; d < 3; d++) {
    const dayDt  = new Date(today); dayDt.setDate(today.getDate() + d);
    const dateKey = dayDt.toISOString().split('T')[0];
    const dowNum  = dayDt.getDay();
    const dowName = DAYS_LONG[dowNum];
    const dateDisp = dayDt.toLocaleDateString('en-US', { weekday:'short', month:'numeric', day:'numeric' });
    const isWE    = dowNum === 5 || dowNum === 6 || dowNum === 0;

    // Get scheduled staff for this date
    const shifts    = state.placements[dateKey] || {};
    const scheduled = new Set(Object.values(shifts).flat().map(p => p.name));

    // Score each scheduled person
    const risks = [];
    scheduled.forEach(name => {
      const log      = state.absenceLog[name] || [];
      const callouts = log.filter(e => CALL_TYPES.has(e.type));
      if (!callouts.length) return;

      const total   = callouts.length;
      const sameDow = callouts.filter(e => new Date(e.date + 'T12:00:00').getDay() === dowNum).length;
      const cutoff30 = new Date(dayDt); cutoff30.setDate(dayDt.getDate() - 30);
      const recent  = callouts.filter(e => new Date(e.date + 'T12:00:00') >= cutoff30).length;
      const score   = total + (sameDow * 3) + (recent * 2);
      if (score < 3) return;

      const staff = MASTER_STAFF.find(s => s.name === name);
      risks.push({ name, job: staff?.job || '?', total, sameDow, recent, score });
    });

    risks.sort((a,b) => b.score - a.score);

    // Print version: only show HIGH risk (score >= 12)
    const highRisks = risks.filter(r => r.score >= 12);

    if (!highRisks.length) {
      rows += `<tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:${isWE?'700':'400'};white-space:nowrap;${isWE?'color:#b45309;background:#fffbeb;':''}">${dateDisp}<br><span style="font-size:8pt;color:#9ca3af;font-weight:400;">${dowName}</span></td>
        <td colspan="5" style="padding:6px 8px;border:1px solid #d1d5db;color:#16a34a;font-style:italic;font-size:9pt;">✓ No high-risk staff scheduled</td>
      </tr>`;
      continue;
    }

    anyRisks = true;
    highRisks.forEach((r, i) => {
      const riskLabel = 'HIGH';
      const riskColor = '#b91c1c';
      const riskBg    = '#fee2e2';
      const rCol      = rColorMap[r.job] || '#374151';
      rows += `<tr style="${isWE && i===0?'border-top:2px solid #d97706;':''}">
        ${i===0 ? `<td rowspan="${highRisks.length}" style="padding:6px 8px;border:1px solid #d1d5db;font-weight:${isWE?'700':'400'};vertical-align:top;white-space:nowrap;${isWE?'color:#b45309;background:#fffbeb;':''}">${dateDisp}<br><span style="font-size:8pt;color:#9ca3af;font-weight:400;">${dowName}</span></td>` : ''}
        <td style="padding:5px 8px;border:1px solid #d1d5db;"><span style="font-size:7.5pt;font-weight:700;padding:1px 6px;border-radius:8px;background:${riskBg};color:${riskColor};">${riskLabel}</span></td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-weight:600;">${r.name}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;color:${rCol};font-weight:700;text-align:center;">${r.job}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;font-size:9pt;">${r.total} total</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:9pt;color:#6b7280;">
          ${r.sameDow > 0 ? `<span style="color:#b45309;">${r.sameDow}× ${dowName.slice(0,3)}</span>` : ''}
          ${r.recent > 0  ? `&nbsp;<span style="color:#b91c1c;">+${r.recent} recent</span>` : ''}
        </td>
      </tr>`;
    });
  }

  return `
    <div style="margin-top:16px;">
      <div class="ps-section-label" style="color:#b45309;border-color:#fcd34d;">⚠️ Anticipated Call-Ins — Next 3 Days (HIGH Risk Only)</div>
      <div style="font-size:8.5pt;color:#6b7280;margin-bottom:6px;">Based on call-out history · HIGH = score ≥ 12 (total + 3×same-weekday + 2×recent-30d) · Weekend days highlighted</div>
      <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
        <thead><tr style="background:#f0f0f0;">
          <th style="padding:5px 8px;border:1px solid #999;text-align:left;width:85px;">Date</th>
          <th style="padding:5px 8px;border:1px solid #999;text-align:left;width:55px;">Risk</th>
          <th style="padding:5px 8px;border:1px solid #999;text-align:left;">Staff Name</th>
          <th style="padding:5px 8px;border:1px solid #999;text-align:center;width:45px;">Role</th>
          <th style="padding:5px 8px;border:1px solid #999;text-align:center;width:70px;">History</th>
          <th style="padding:5px 8px;border:1px solid #999;text-align:left;width:130px;">Pattern</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildMeetingSignaturePrintHtml(shifts) {
  var yr = new Date().getFullYear();
  var allCustom = [].concat(
    (state.customCompSkills && state.customCompSkills.RN)  || [],
    (state.customCompSkills && state.customCompSkills.CA)  || [],
    (state.customCompSkills && state.customCompSkills.LPN) || []
  );
  var seen = new Set();
  var meetingSkills = allCustom.filter(function(sk) {
    if (seen.has(sk.key)) return false;
    seen.add(sk.key);
    return sk.label && sk.label.toLowerCase().indexOf('meeting') >= 0;
  });

  if (!meetingSkills.length) return '';

  var scheduledToday = new Set(Object.values(shifts).flat().map(function(p) { return p.name; }));
  var html = '';

  meetingSkills.forEach(function(sk) {
    var needToSign = MASTER_STAFF.filter(function(s) {
      if (!scheduledToday.has(s.name)) return false;
      if (!['RN','LPN','CA','UC'].includes(s.job)) return false;
      if (state.removedStaff && state.removedStaff.includes(s.name)) return false;
      var v = ((state.competency || {})[s.name] || {})[sk.key];
      return !(v && v.passed && v.yr === yr);
    }).sort(function(a,b) { return a.name.localeCompare(b.name); });

    if (!needToSign.length) return;

    var nameItems = needToSign.map(function(s) {
      return '<div style="padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:9.5pt;font-weight:600;color:#0f2040;">' + s.name + '</div>';
    }).join('');

    html += '<div style="margin-bottom:14px;">' +
      '<div class="ps-section-label" style="color:#1d4ed8;border-color:#93c5fd;">' +
        '📅 ' + sk.label + ' — Needs Signature (Working Today)' +
        '<span style="float:right;font-size:9pt;font-weight:400;color:#475569;">' + needToSign.length + ' staff not yet signed</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 16px;margin-top:8px;">' +
        nameItems +
      '</div>' +
    '</div>';
  });

  return html;
}

function buildPendingTalkPrintHtml() {
  const pending = pendingWriteupTalks();
  if (!pending.length) {
    return '<div class="ps-section-label" style="color:#16a34a;border-color:#86efac;margin-top:12px;">✅ Write-Up Conversations — Nothing pending, all staff spoken with</div>';
  }
  const staffJob = {};
  MASTER_STAFF.forEach(s => { staffJob[s.name] = s.job; });
  const rows = pending.map(p => {
    const dateFmt = new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    return '<tr style="border-bottom:1px solid #e2e8f0;">' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;font-weight:700;">' + p.name + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;">' + (staffJob[p.name]||'') + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;">' + dateFmt + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;">' + (p.note || '—') + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;width:90px;">&nbsp;</td>' +
      '</tr>';
  }).join('');
  return '<div class="ps-section-label" style="color:#b45309;border-color:#fcd34d;margin-top:12px;">🗣️ Needs Write-Up Conversation — ' + pending.length + ' Pending</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:14px">' +
    '<thead><tr style="background:#f0f0f0;">' +
    '<th style="padding:6px 8px;border:1px solid #999;text-align:left;">Name</th>' +
    '<th style="padding:6px 8px;border:1px solid #999;text-align:center;width:50px;">Role</th>' +
    '<th style="padding:6px 8px;border:1px solid #999;text-align:center;width:90px;">Date</th>' +
    '<th style="padding:6px 8px;border:1px solid #999;text-align:left;">Reason / Note</th>' +
    '<th style="padding:6px 8px;border:1px solid #999;text-align:left;">Spoken ✓</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function buildWriteupPrintHtml(shifts) {
  const yr = new Date().getFullYear();
  const TYPE_LABEL = { call:'Call-Out', calledoff:'Call-Out', sick:'Sick Call', ncns:'No Call No Show', tardy:'Tardy', family:'Family' };
  const rColorMap  = { RN:'#1d4ed8', LPN:'#7c3aed', CA:'#0e7490', UC:'#374151' };

  // Build scheduled set from every shift bucket
  const scheduledToday = new Set();
  Object.keys(shifts || {}).forEach(function(sk) {
    (shifts[sk] || []).forEach(function(p) { if (p && p.name) scheduledToday.add(p.name); });
  });

  const rows = [];
  MASTER_STAFF.forEach(s => {
    if (!scheduledToday.has(s.name)) return;
    if (!['RN','LPN','CA','UC'].includes(s.job)) return;

    const yearLog    = (state.absenceLog[s.name] || []).filter(e => new Date(e.date+'T12:00:00').getFullYear() === yr);
    if (!yearLog.length) return;

    const bankHours  = yearLog.filter(e => e.type !== 'tardy').reduce((sum,e) => sum + (e.hours||0), 0);
    const tardyCount = yearLog.filter(e => e.type === 'tardy').length;
    const ncnsCount  = yearLog.filter(e => e.type === 'ncns' || e.type === 'NCNS').length;
    const callCount  = yearLog.filter(e => e.type !== 'tardy').length;

    const reasons = [];
    if (bankHours > ANNUAL_BANK_HOURS)          reasons.push(bankHours + 'h used of ' + ANNUAL_BANK_HOURS + 'h bank');
    if (tardyCount >= TARDY_WRITEUP_COUNT)       reasons.push(tardyCount + ' tardies (limit: ' + TARDY_WRITEUP_COUNT + ')');
    if (ncnsCount > 0)                           reasons.push(ncnsCount + ' No Call No Show');
    const flaggedEntries = yearLog.filter(e => e.writeUp);
    if (flaggedEntries.length && !reasons.length) reasons.push(flaggedEntries[0].writeUpReason || 'Attendance threshold exceeded');
    if (!reasons.length) return;

    const writeUpCount = flaggedEntries.length;
    const level = ncnsCount > 0         ? 'Written Warning / Termination Review'
      : writeUpCount >= 3               ? 'Final Written Warning'
      : writeUpCount === 2              ? 'Written Warning'
      :                                   'Verbal Counseling';
    const levelColor = (ncnsCount > 0 || writeUpCount >= 3) ? '#b91c1c'
      : writeUpCount === 2              ? '#b45309' : '#1d4ed8';

    const recent = yearLog.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,3);
    rows.push({ s, bankHours, tardyCount, ncnsCount, callCount, reasons, level, levelColor, recent });
  });

  if (!rows.length) {
    return '<div class="ps-section-label" style="color:#16a34a;border-color:#86efac;margin-top:12px;">✅ Attendance Write-Ups — No staff working today are due for write-up</div>';
  }

  rows.sort((a,b) => b.bankHours - a.bankHours || b.ncnsCount - a.ncnsCount);

  var tableRows = rows.map(function(r, i) {
    var bgMain  = i % 2 === 0 ? '#fff' : '#fef2f2';
    var bgSub   = i % 2 === 0 ? '#fffbfb' : '#fef2f2';
    var hrsColor = r.bankHours > ANNUAL_BANK_HOURS ? '#b91c1c' : '#374151';
    var tardyStyle = r.tardyCount >= TARDY_WRITEUP_COUNT ? 'color:#b45309;font-weight:700;' : '';
    var ncnsStyle  = r.ncnsCount > 0 ? 'color:#b91c1c;font-weight:700;' : '';
    var recentSpans = r.recent.map(function(e) {
      return '<span style="margin-right:12px;">' + e.date + ' — ' + (TYPE_LABEL[e.type]||e.type) + (e.hours ? ' (' + e.hours + 'h)' : '') + '</span>';
    }).join('');
    return '<tr style="background:' + bgMain + ';border-bottom:1px solid #e2e8f0;">' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;font-weight:700;">' + r.s.name + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;color:' + (rColorMap[r.s.job]||'#374151') + ';font-weight:700;text-align:center;">' + r.s.job + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:' + hrsColor + ';">' + r.bankHours + 'h</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;">' + r.callCount + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;' + tardyStyle + '">' + r.tardyCount + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;' + ncnsStyle + '">' + (r.ncnsCount||'—') + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;font-size:8.5pt;color:#475569;">' + r.reasons.join(' · ') + '</td>' +
      '<td style="padding:7px 8px;border:1px solid #e2e8f0;font-weight:700;color:' + r.levelColor + ';font-size:8.5pt;">' + r.level + '</td>' +
      '</tr>' +
      '<tr style="background:' + bgSub + ';">' +
      '<td colspan="2" style="padding:3px 8px 6px;border:1px solid #e2e8f0;font-size:8pt;color:#9ca3af;font-style:italic;">Recent incidents:</td>' +
      '<td colspan="6" style="padding:3px 8px 6px;border:1px solid #e2e8f0;font-size:8pt;color:#6b7280;">' + recentSpans + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="ps-section-label" style="color:#b91c1c;border-color:#fca5a5;margin-top:14px;">' +
      '⚠️ Attendance Write-Ups Due — Staff Working Today' +
      '<span style="float:right;font-size:9pt;font-weight:400;color:#475569;">' + rows.length + ' staff · ' + yr + ' attendance year</span>' +
    '</div>' +
    '<div style="font-size:8.5pt;color:#6b7280;margin-bottom:8px;">Thresholds: ' + ANNUAL_BANK_HOURS + 'h annual bank · ' + TARDY_WRITEUP_COUNT + ' tardies · Any NCNS = automatic write-up</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:9.5pt;">' +
      '<thead><tr style="background:#f0f0f0;">' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:left;">Name</th>' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:center;width:45px;">Role</th>' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:center;width:55px;">Hrs Used</th>' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:center;width:45px;">Calls</th>' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:center;width:45px;">Tardies</th>' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:center;width:45px;">NCNS</th>' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:left;">Reason</th>' +
        '<th style="padding:6px 8px;border:1px solid #999;text-align:left;width:160px;">Discipline Level</th>' +
      '</tr></thead>' +
      '<tbody>' + tableRows + '</tbody>' +
    '</table>';
}

function renderAnticipatedCallIns() {
  const el = document.getElementById('ci-anticipated');
  if (!el) return;

  const dateKey = state.activeBoardDate;
  if (!dateKey) { el.textContent = 'No board date loaded.'; return; }

  const dateObj   = new Date(dateKey + 'T12:00:00');
  const dowNum    = dateObj.getDay(); // 0=Sun
  const dowName   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dowNum];
  const shifts    = state.placements[dateKey] || {};
  const scheduled = new Set(Object.values(shifts).flat().map(p => p.name));
  const today     = dateKey;

  // Score each scheduled staff for call-in risk
  const risks = [];
  scheduled.forEach(name => {
    const log = state.absenceLog[name] || [];
    const callouts = log.filter(e => e.type === 'call' || e.type === 'calledoff' || e.type === 'NCNS' || e.type === 'ncns' || e.type === 'sick');
    if (!callouts.length) return;

    const total = callouts.length;
    // Same day-of-week pattern
    const sameDow = callouts.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return d.getDay() === dowNum;
    }).length;
    // Last 30 days
    const cutoff30 = new Date(dateObj); cutoff30.setDate(cutoff30.getDate() - 30);
    const recent = callouts.filter(e => new Date(e.date + 'T12:00:00') >= cutoff30).length;

    // Risk score: total + weighted same-dow + recent activity
    const score = total + (sameDow * 3) + (recent * 2);
    if (score >= 3) {
      const staff = MASTER_STAFF.find(s => s.name === name);
      risks.push({ name, job: staff?.job || '?', total, sameDow, recent, score });
    }
  });

  risks.sort((a,b) => b.score - a.score);

  if (!risks.length) {
    el.innerHTML = '<span style="color:var(--green2);">✓ No high-risk call-ins anticipated based on history</span>';
    return;
  }

  el.innerHTML = risks.slice(0, 6).map(r => {
    const rCol = IV_ROLE_COLOR[r.job] || 'var(--text2)';
    const riskLevel = r.score >= 12 ? { label:'HIGH', color:'var(--red2)' }
                    : r.score >= 7  ? { label:'MED',  color:'var(--amber2)' }
                    : { label:'LOW', color:'var(--text3)' };
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:11px;font-weight:700;color:${riskLevel.color};min-width:30px;">${riskLevel.label}</span>
      <span style="font-size:11px;color:var(--white);flex:1;">${r.name}</span>
      <span style="font-size:11px;color:${rCol};">${r.job}</span>
      <span style="font-size:11px;color:var(--text3);">${r.total} CO total</span>
      ${r.sameDow > 0 ? `<span style="font-size:11px;color:var(--amber2);">${r.sameDow}× ${dowName}</span>` : ''}
      ${r.recent > 0  ? `<span style="font-size:11px;color:var(--red2);">+${r.recent} recent</span>` : ''}
    </div>`;
  }).join('') + (risks.length > 6 ? `<div style="font-size:11px;color:var(--text3);padding-top:4px;">+${risks.length-6} more at lower risk</div>` : '');
}

function renderCiAgencyAlerts() {
  const el   = document.getElementById('ci-agency-alerts');
  const card = document.getElementById('ci-agency-card');
  if (!el || !card) return;

  const dateKey = state.activeBoardDate;
  const today   = dateKey ? new Date(dateKey + 'T12:00:00') : new Date();
  const alerts  = [];

  MASTER_STAFF.forEach(s => {
    const ag = state.agencyDates[s.name];
    if (!ag || !ag.isAgency) return;
    const effectiveEnd = ag.extensionEnd || ag.contractEnd;
    if (!effectiveEnd) return;
    const exp = new Date(effectiveEnd + 'T12:00:00');
    const daysLeft = Math.round((exp - today) / 86400000);
    if (daysLeft <= 7) { // within 7 days
      alerts.push({ name: s.name, job: s.job, daysLeft, exp, type: ag.extensionEnd ? 'Extension' : 'Contract' });
    }
  });

  if (!alerts.length) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  el.innerHTML = alerts.sort((a,b) => a.daysLeft - b.daysLeft).map(a => {
    const rCol = IV_ROLE_COLOR[a.job] || 'var(--text2)';
    const col  = a.daysLeft <= 0 ? 'var(--red2)' : a.daysLeft <= 2 ? 'var(--red2)' : 'var(--amber2)';
    const label = a.daysLeft < 0  ? 'EXPIRED' :
                  a.daysLeft === 0 ? 'LAST DAY TODAY' :
                  `${a.daysLeft}d remaining`;
    const dateStr = a.exp.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:11px;font-weight:700;color:${col};min-width:100px;">${label}</span>
      <span style="font-size:11px;color:var(--white);flex:1;">${a.name}</span>
      <span style="font-size:11px;color:${rCol};">${a.job}</span>
      <span style="font-size:11px;color:var(--text3);">${a.type} ends ${dateStr}</span>
    </div>`;
  }).join('');
}

function openCallInPanel() {
  const panel = document.getElementById('callin-panel');
  if (!panel) return;
  panel.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Populate staff datalist
  const dl = document.getElementById('ci-staff-dl');
  if (dl) dl.innerHTML = MASTER_STAFF.map(s => `<option value="${s.name}">`).join('');

  // Set date label
  const dateKey = state.activeBoardDate;
  const lbl = document.getElementById('ci-date-label');
  if (lbl && dateKey) {
    const d = new Date(dateKey + 'T12:00:00');
    lbl.textContent = 'Board date: ' + d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  }

  _ciSelectedCoverage = [];
  renderCiMessageCard();
  renderCiTodayLog();
  renderAnticipatedCallIns();
  renderCiAgencyAlerts();
  findCoverage();
}

function closeCallInPanel() {
  const panel = document.getElementById('callin-panel');
  if (panel) panel.style.display = 'none';
  document.body.style.overflow = '';
  updateCallInSummary();
}

function onCiCallerInput() {
  const name = document.getElementById('ci-caller-name')?.value?.trim();
  if (!name) return;
  const staff = MASTER_STAFF.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (staff) {
    // Auto-fill role
    const roleEl = document.getElementById('ci-caller-role');
    if (roleEl) roleEl.value = staff.job;
    // Auto-fill shift based on usual schedule
    const pref = state.empShifts[staff.name];
    const shiftEl = document.getElementById('ci-caller-shift');
    if (shiftEl && pref) {
      if (pref === 'DAY')   shiftEl.value = staff.job === 'CA' ? '0630-1430' : '0700-1500';
      if (pref === 'EVE')   shiftEl.value = staff.job === 'CA' ? '1430-1830' : '1500-1900';
      if (pref === 'NIGHT') shiftEl.value = staff.job === 'CA' ? '2230-0630' : '1900-0700';
    }
    // Auto-fill message
    autoFillCiMessage();
  }
  findCoverage();
}

function logCallInAndFind() {
  const name   = document.getElementById('ci-caller-name')?.value?.trim();
  const reason = document.getElementById('ci-reason')?.value  || 'call';
  const note   = document.getElementById('ci-note')?.value    || '';
  const shift  = document.getElementById('ci-caller-shift')?.value || '';

  if (name) {
    // Log to absence tab
    const today = new Date().toISOString().split('T')[0];
    if (!state.absenceLog[name]) state.absenceLog[name] = [];
    const alreadyLogged = state.absenceLog[name].some(e => e.date === today && e.type === reason);
    if (!alreadyLogged) {
      state.absenceLog[name].push({
        date: today, type: reason,
        note: `Call-In: ${shift}${note ? ' — ' + note : ''}`,
        writeUp: false, ts: Date.now()
      });
      persistSave();
    }
    showSaveBanner(`📵 ${name.split(',')[0]} logged as ${reason === 'call' ? 'call-out' : reason}`);
  }
  autoFillCiMessage();
  findCoverage();
  renderCiTodayLog();
  updateCallInSummary();
}

function findCoverage() {
  const role  = document.getElementById('ci-caller-role')?.value  || 'RN';
  const shift = document.getElementById('ci-caller-shift')?.value || '0700-1500';
  const sort  = document.getElementById('ci-coverage-sort')?.value || 'best';
  const el    = document.getElementById('ci-coverage-list');
  if (!el) return;

  // Pay filters
  const filterEligible = document.getElementById('ci-pay-eligible')?.checked || false;
  const filterGuar     = document.getElementById('ci-pay-guar')?.checked     || false;
  const filterHighInc  = document.getElementById('ci-pay-highInc')?.checked  || false;
  const filterHighCA   = document.getElementById('ci-pay-highCA')?.checked   || false;
  const anyPayFilter   = filterEligible || filterGuar || filterHighInc || filterHighCA;

  // Show/hide CA High Pay filter based on role
  const payFiltersEl = document.getElementById('ci-pay-filters');
  if (payFiltersEl) {
    const isCA = role === 'CA';
    // Show relevant filters
    ['ci-pay-eligible','ci-pay-guar','ci-pay-highInc'].forEach(id => {
      const lbl = document.getElementById(id)?.closest('label');
      if (lbl) lbl.style.display = (isCA) ? 'none' : 'flex';
    });
    const caLbl = document.getElementById('ci-pay-highCA')?.closest('label');
    if (caLbl) caLbl.style.display = isCA ? 'flex' : 'none';
  }

  const dateKey = state.activeBoardDate;
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};
  const today   = new Date().toISOString().split('T')[0];

  const scheduledToday = new Set(Object.values(shifts).flat().map(p => p.name));
  const calledOutToday = new Set(
    Object.entries(state.absenceLog).filter(([, log]) =>
      log.some(e => e.date === today && (e.type === 'call' || e.type === 'calledoff' || e.type === 'NCNS' || e.type === 'ncns' || e.type === 'sick'))
    ).map(([name]) => name)
  );

  let candidates = MASTER_STAFF.filter(s => {
    if (s.job !== role) return false;
    if (calledOutToday.has(s.name)) return false;
    // Pay filter
    if (anyPayFilter) {
      if (filterEligible && state.empPayEligible[s.name]) return true;
      if (filterGuar     && state.empPayGuarHigh[s.name]) return true;
      if (filterHighInc  && state.empPayHighInc[s.name])  return true;
      if (filterHighCA   && state.empPayHighCA[s.name])   return true;
      return false; // no matching pay flag
    }
    return true;
  });

  candidates = candidates.map(s => {
    const absences   = (state.absenceLog[s.name] || []);
    const yr         = new Date().getFullYear();
    const callouts   = absences.filter(e => new Date(e.date+'T12:00:00').getFullYear() === yr && e.type !== 'tardy').length;
    const usualShift = state.empShifts[s.name] || '';
    const isScheduled = scheduledToday.has(s.name);
    const hasPhone   = !!(state.phones[s.name]);
    const hasEmail   = !!(state.emails[s.name]);

    // Pay flags
    const payEligible = !!(state.empPayEligible[s.name]);
    const payGuar     = !!(state.empPayGuarHigh[s.name]);
    const payHighInc  = !!(state.empPayHighInc[s.name]);
    const payHighCA   = !!(state.empPayHighCA[s.name]);

    let shiftScore = 0;
    if (usualShift === 'DAY'   && (shift === '0700-1500' || shift === '0630-1430')) shiftScore = 3;
    if (usualShift === 'EVE'   && (shift === '1500-1900' || shift === '1430-1830' || shift === '1830-2230')) shiftScore = 3;
    if (usualShift === 'NIGHT' && (shift === '1900-0700' || shift === '2230-0630')) shiftScore = 3;
    if (usualShift === 'BOTH') shiftScore = 2;

    const score = shiftScore * 10 + (10 - Math.min(callouts, 10)) + (hasPhone ? 2 : 0);
    return { ...s, callouts, usualShift, isScheduled, hasPhone, hasEmail, score, payEligible, payGuar, payHighInc, payHighCA };
  });

  if (sort === 'best')     candidates.sort((a,b) => b.score - a.score);
  if (sort === 'alpha')    candidates.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === 'calloffs') candidates.sort((a,b) => a.callouts - b.callouts);

  if (!candidates.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text3);">No ${role} staff match${anyPayFilter ? ' selected pay filters' : ''}</div>`;
    return;
  }

  const rCol = IV_ROLE_COLOR[role] || 'var(--text2)';

  el.innerHTML = candidates.map(c => {
    const isSelected = _ciSelectedCoverage.find(x => x.name === c.name);
    const shiftLabel = { DAY:'☀️ Day', EVE:'🌆 Eve', NIGHT:'🌙 Night', BOTH:'⚡ Flex', '':'—' }[c.usualShift] || c.usualShift;
    const safe = c.name.replace(/'/g, "\\'");

    // Pay badges
    const payBadges = [
      c.payEligible ? `<span style="font-size:11px;padding:1px 6px;border-radius:8px;background:rgba(37,168,104,0.15);border:1px solid rgba(37,168,104,0.35);color:var(--green2);font-weight:700;">💵 Elig</span>` : '',
      c.payGuar     ? `<span style="font-size:11px;padding:1px 6px;border-radius:8px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);color:var(--amber2);font-weight:700;">💰 Guar</span>` : '',
      c.payHighInc  ? `<span style="font-size:11px;padding:1px 6px;border-radius:8px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.35);color:var(--purple2);font-weight:700;">🏆 Hi+Inc</span>` : '',
      c.payHighCA   ? `<span style="font-size:11px;padding:1px 6px;border-radius:8px;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3);color:var(--teal2);font-weight:700;">💵 Hi Pay</span>` : '',
    ].filter(Boolean).join('');

    // Pay toggle checkboxes on the card
    const isRNLPN = c.job === 'RN' || c.job === 'LPN';
    const isCA    = c.job === 'CA';
    const payToggles = isRNLPN ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:5px;margin-top:6px;">
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:var(--green2);" title="Eligible Pay">
          <input type="checkbox" ${c.payEligible?'checked':''} onchange="togglePayFlag('${safe}','empPayEligible',this.checked);findCoverage()" style="accent-color:var(--green2);cursor:pointer;width:13px;height:13px;">
          💵 Eligible
        </label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:var(--amber2);" title="Guaranteed High Pay">
          <input type="checkbox" ${c.payGuar?'checked':''} onchange="togglePayFlag('${safe}','empPayGuarHigh',this.checked);findCoverage()" style="accent-color:var(--amber2);cursor:pointer;width:13px;height:13px;">
          💰 Guar. High
        </label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:var(--purple2);" title="High Pay + Incentive">
          <input type="checkbox" ${c.payHighInc?'checked':''} onchange="togglePayFlag('${safe}','empPayHighInc',this.checked);findCoverage()" style="accent-color:var(--purple2);cursor:pointer;width:13px;height:13px;">
          🏆 Hi + Inc
        </label>
      </div>` : isCA ? `
      <div style="display:flex;gap:8px;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:5px;margin-top:6px;">
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:var(--teal2);" title="High Pay">
          <input type="checkbox" ${c.payHighCA?'checked':''} onchange="togglePayFlag('${safe}','empPayHighCA',this.checked);findCoverage()" style="accent-color:var(--teal2);cursor:pointer;width:13px;height:13px;">
          💵 High Pay
        </label>
      </div>` : '';

    return `<div style="border-radius:8px;margin-bottom:8px;border:1px solid ${isSelected?'rgba(37,168,104,0.5)':'rgba(255,255,255,0.07)'};background:${isSelected?'rgba(37,168,104,0.08)':'rgba(255,255,255,0.03)'};overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;padding:9px 10px;">
        <div style="width:34px;height:34px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--navy);flex-shrink:0;">
          ${c.name.split(',').map(p=>p.trim()[0]||'').join('')}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">${c.name}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px;align-items:center;">
            <span style="font-size:11px;color:${rCol};">${c.job}</span>
            <span style="font-size:11px;color:var(--text3);">${shiftLabel}</span>
            ${c.callouts > 0 ? `<span style="font-size:11px;color:var(--amber2);">${c.callouts} CO</span>` : ''}
            ${c.isScheduled ? `<span style="font-size:11px;background:rgba(245,158,11,0.15);color:var(--amber2);border-radius:8px;padding:0 5px;">Scheduled</span>` : ''}
            ${c.hasPhone ? `<span style="font-size:11px;color:var(--green2);">📱</span>` : ''}
            ${c.hasEmail ? `<span style="font-size:11px;color:var(--accent2);">✉</span>` : ''}
            ${payBadges}
          </div>
          ${c.hasPhone ? `<div style="font-size:11px;color:var(--text3);margin-top:2px;">${state.phones[c.name]}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
          <button onclick="toggleCiSelect('${safe}')"
            style="font-size:11px;padding:5px 10px;border-radius:4px;border:1px solid;cursor:pointer;font-weight:700;white-space:nowrap;
            ${isSelected ? 'background:rgba(37,168,104,0.2);border-color:rgba(37,168,104,0.5);color:var(--green2);' : 'background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.2);color:var(--text2);'}">
            ${isSelected ? '✓ Selected' : '+ Select'}
          </button>
          ${c.hasPhone ? `<button onclick="callNow('${(state.phones[c.name]||'').replace(/\D/g,'')}')"
            style="font-size:11px;padding:4px 10px;border-radius:4px;border:1px solid rgba(37,168,104,0.3);background:rgba(37,168,104,0.08);color:var(--green2);cursor:pointer;">
            📞 Call
          </button>` : ''}
        </div>
      </div>
      ${payToggles}
    </div>`;
  }).join('');
}
function toggleCiSelect(name) {
  const idx = _ciSelectedCoverage.findIndex(x => x.name === name);
  if (idx >= 0) {
    _ciSelectedCoverage.splice(idx, 1);
  } else {
    const staff = MASTER_STAFF.find(s => s.name === name);
    _ciSelectedCoverage.push({
      name,
      phone: state.phones[name] || '',
      email: state.emails[name] || '',
      job:   staff?.job || ''
    });
  }
  renderCiMessageCard();
  findCoverage(); // re-render to update selected state
}

function callNow(phone) {
  if (phone) window.location.href = `tel:+1${phone}`;
}

function autoFillCiMessage() {
  const ta      = document.getElementById('ci-message-text');
  const name    = document.getElementById('ci-caller-name')?.value?.trim() || '';
  const shift   = document.getElementById('ci-caller-shift')?.value || '';
  const role    = document.getElementById('ci-caller-role')?.value  || 'RN';
  const dateKey = state.activeBoardDate;
  const dateStr = dateKey
    ? new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'numeric', day:'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday:'short', month:'numeric', day:'numeric' });
  const callerLast = name ? name.split(',')[0] : 'a staff member';

  // Build pay rate line for the first selected staff (or generic)
  let payLine = '';
  if (_ciSelectedCoverage.length === 1) {
    const s = _ciSelectedCoverage[0];
    const lines = [];
    // All staff: High Pay
    const hasHighCA   = !!(state.empPayHighCA[s.name]);
    const hasElig     = !!(state.empPayEligible[s.name]);
    const hasGuar     = !!(state.empPayGuarHigh[s.name]);
    const hasHighInc  = !!(state.empPayHighInc[s.name]);
    const isRNLPN = s.job === 'RN' || s.job === 'LPN';
    const isCA    = s.job === 'CA';

    if (isCA && hasHighCA)    lines.push('💵 High Pay');
    if (isCA && !hasHighCA)   lines.push('💵 High Pay');  // all staff eligible
    if (isRNLPN && hasElig)   lines.push('💵 Eligible Pay');
    if (isRNLPN && hasGuar)   lines.push('💰 Guaranteed High Pay');
    if (isRNLPN && hasHighInc) lines.push('🏆 High Pay + Incentive');
    if (isRNLPN && !hasElig && !hasGuar && !hasHighInc) lines.push('💵 High Pay');

    if (lines.length) payLine = `\nPay rate: ${lines.join(' · ')}`;
  } else if (_ciSelectedCoverage.length > 1) {
    payLine = '\nPay rate: See your eligibility (High Pay available for this shift)';
  } else {
    payLine = '\nPay rate: High Pay available for this shift';
  }

  if (ta) ta.value =
`Hi, this is 3B Tele Med Surg at AOMC.

${callerLast} has called out for the ${shift} shift on ${dateStr}. We have an open ${role} position and are looking for coverage.${payLine}

Are you available? Please call or text back as soon as possible.

Thank you,
3B Nursing Management
AOMC`;
}

function renderCiMessageCard() {
  const card = document.getElementById('ci-message-card');
  const sel  = document.getElementById('ci-selected-staff');
  if (!card || !sel) return;
  card.style.display = _ciSelectedCoverage.length ? 'block' : 'none';
  sel.innerHTML = _ciSelectedCoverage.map(s => {
    const rCol = IV_ROLE_COLOR[s.job] || 'var(--text2)';
    return `<div style="display:flex;align-items:center;gap:5px;background:rgba(37,168,104,0.1);border:1px solid rgba(37,168,104,0.3);border-radius:16px;padding:4px 10px;font-size:11px;color:var(--white);">
      <span style="color:${rCol};">●</span> ${s.name.split(',')[0]}
      ${s.phone ? `<span style="font-size:11px;color:var(--green2);">📱</span>` : ''}
      ${s.email ? `<span style="font-size:11px;color:var(--accent2);">✉</span>` : ''}
      <button onclick="toggleCiSelect('${s.name.replace(/'/g,"\\'")}') " style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:0 2px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>
    </div>`;
  }).join('');
  autoFillCiMessage();
}

function sendCoverageText() {
  const msg  = document.getElementById('ci-message-text')?.value || '';
  const phones = _ciSelectedCoverage.map(s => s.phone).filter(Boolean);
  if (!phones.length) { alert('No phone numbers on file for selected staff. Add in Directory tab.'); return; }
  // SMS to first selected (can't batch SMS via tel:)
  const num = phones[0].replace(/\D/g,'');
  window.location.href = `sms:+1${num}?body=${encodeURIComponent(msg)}`;
}

function sendCoverageEmail() {
  const msg    = document.getElementById('ci-message-text')?.value || '';
  const emails = _ciSelectedCoverage.map(s => s.email).filter(Boolean);
  const shift  = document.getElementById('ci-caller-shift')?.value || '';
  const dateKey = state.activeBoardDate;
  const dateStr = dateKey
    ? new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })
    : new Date().toLocaleDateString('en-US', { month:'short', day:'numeric' });
  const subject = encodeURIComponent(`[3B] Open Shift ${shift} — ${dateStr}`);
  const body    = encodeURIComponent(msg);
  if (!emails.length) { alert('No email addresses on file. Add in Directory tab.'); return; }
  window.location.href = `mailto:${encodeURIComponent(emails.join(';'))}?subject=${subject}&body=${body}`;
}

function copyCallInMessage() {
  const msg = document.getElementById('ci-message-text')?.value || '';
  if (navigator.clipboard) navigator.clipboard.writeText(msg).then(() => showSaveBanner('📋 Message copied'));
  else { const ta = document.createElement('textarea'); ta.value = msg; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); showSaveBanner('📋 Copied'); }
}

function renderCiTodayLog() {
  const el    = document.getElementById('ci-today-log');
  if (!el) return;
  const today = new Date().toISOString().split('T')[0];
  const logs  = [];
  MASTER_STAFF.forEach(s => {
    (state.absenceLog[s.name] || []).filter(e => e.date === today).forEach(e => {
      logs.push({ name: s.name, job: s.job, type: e.type, note: e.note || '' });
    });
  });
  if (!logs.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:11px;">No call-ins logged today.</div>';
    return;
  }
  const typeLabel = { call:'Call-Out', calledoff:'Called Off', tardy:'Tardy', NCNS:'No Call No Show', ncns:'No Call No Show', sick:'Sick', family:'Family Emergency', other:'Other' };
  const typeColor = { call:'var(--red2)', calledoff:'var(--red2)', tardy:'var(--amber2)', NCNS:'var(--red2)', ncns:'var(--red2)', sick:'var(--amber2)', family:'var(--amber2)', other:'var(--text3)' };
  el.innerHTML = logs.map(l => {
    const rCol = IV_ROLE_COLOR[l.job] || 'var(--text2)';
    const col  = typeColor[l.type] || 'var(--text3)';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:11px;font-weight:700;color:${rCol};min-width:28px;">${l.job}</span>
      <span style="font-size:11px;color:var(--white);flex:1;">${l.name}</span>
      <span style="font-size:11px;color:${col};font-weight:700;">${typeLabel[l.type] || l.type}</span>
      ${l.note ? `<span style="font-size:11px;color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ccEsc(l.note)}</span>` : ''}
    </div>`;
  }).join('');
}

function updateCallInSummary() {
  const el    = document.getElementById('callin-summary');
  if (!el) return;
  const today = new Date().toISOString().split('T')[0];
  let count = 0;
  MASTER_STAFF.forEach(s => {
    if ((state.absenceLog[s.name] || []).some(e => e.date === today && e.type !== 'tardy')) count++;
  });
  el.textContent = count > 0 ? `${count} call-in${count > 1 ? 's' : ''} logged today` : '';
  el.style.color = count > 0 ? 'var(--red2)' : 'var(--text3)';
}

// ── Sticky header offset — update on load and resize ──
function updateStickyTop() {
  if (window.ccMeasure) { window.ccMeasure(); return; }
  const tabs   = document.getElementById('tabs');
  const census = document.getElementById('census-bar');
  const header = document.querySelector('header');
  const headerH = (header  ? header.offsetHeight  : 0);
  const censusH = (census  ? census.offsetHeight  : 0);
  const tabsH   = (tabs    ? tabs.offsetHeight     : 0);
  const total   = headerH + censusH + tabsH;
  document.documentElement.style.setProperty('--sticky-top', total + 'px');
}