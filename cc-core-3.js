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
  if(sumEl){const counts={};Object.keys(INC_LOG_TYPE_CFG).forEach(k=>counts[k]=0);list.forEach(r=>{if(counts[r.type]!==undefined)counts[r.type]++;});const openCount=list.filter(r=>r.status==='Open').length;sumEl.innerHTML=`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px 16px;"><div style="font-size:20px;font-weight:700;color:var(--red2);">${openCount}</div><div style="font-size:10px;color:var(--text3);">Open Reports</div></div>`+Object.entries(INC_LOG_TYPE_CFG).filter(([k])=>counts[k]>0).map(([k,c])=>`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px 14px;"><div style="font-size:16px;font-weight:700;color:${c.color};">${c.icon} ${counts[k]}</div><div style="font-size:10px;color:var(--text3);">${k}</div></div>`).join('');}
  const tEl=document.getElementById('inclog-table');if(!tEl)return;
  if(!list.length){tEl.innerHTML='<div style="text-align:center;padding:50px;color:var(--text3);"><div style="font-size:32px;margin-bottom:10px;">📁</div><div style="font-size:13px;color:var(--white);">No incident reports logged</div></div>';return;}
  tEl.innerHTML='<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(r=>{const c=INC_LOG_TYPE_CFG[r.type]||INC_LOG_TYPE_CFG.Other;const sc=INC_STATUS_CFG[r.status]||INC_STATUS_CFG.Open;const dateStr=r.date?new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'-';return`<div style="background:rgba(255,255,255,0.03);border:1px solid ${c.border};border-radius:8px;padding:12px 14px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;"><div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;"><span style="font-size:13px;">${c.icon}</span><span style="font-size:13px;font-weight:700;color:${c.color};">${r.type}</span><span style="font-size:9px;background:${sc.b};color:${sc.c};padding:1px 8px;border-radius:8px;font-weight:600;">${r.status}</span>${r.rlNumber?`<span style="font-size:10px;color:var(--text3);font-family:'IBM Plex Mono',monospace;">${r.rlNumber}</span>`:''}<span style="font-size:10px;color:var(--text3);">${dateStr} ${r.time||''}</span></div><div style="display:flex;gap:12px;font-size:10px;color:var(--text3);flex-wrap:wrap;">${r.room?`<span>Room ${r.room}</span>`:''} ${r.severity?`<span style="color:${INC_SEV_COLOR[r.severity]||'var(--text3)'};">SAC ${r.severity}</span>`:''} ${r.staff?`<span>Staff: ${ehStaffLink(r.staff)}</span>`:''}</div>${r.notes?`<div style="font-size:11px;color:var(--text2);margin-top:5px;">${r.notes}</div>`:''} ${r.followUp?`<div style="font-size:10px;color:var(--teal2);margin-top:4px;">↳ ${r.followUp}</div>`:''}</div><div style="display:flex;gap:4px;flex-shrink:0;"><button onclick="openIncLogModal('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button><button onclick="deleteIncLogEntry('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></div></div></div>`;}).join('')+'</div>';
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
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">Log census + staff on duty each shift — feeds the daily HPPD in real time</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button onclick="hppdCkChangeDate(-1)" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;padding:4px 9px;color:var(--text2);font-size:12px;cursor:pointer;">◀</button>
          <input type="date" value="${dateKey}" onchange="hppdCkSetDate(this.value)"
            style="background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:4px 8px;color:var(--white);font-size:12px;outline:none;">
          <button onclick="hppdCkChangeDate(1)" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;padding:4px 9px;color:var(--text2);font-size:12px;cursor:pointer;">▶</button>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">${dateStr}</div>
      <div style="display:grid;grid-template-columns:110px 1fr 1fr 90px 32px;gap:8px;padding:0 0 6px;border-bottom:1px solid var(--border);">
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;">Block</div>
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;">Census</div>
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;">Staff on Duty</div>
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;text-align:right;">HPPD</div>
        <div></div>
      </div>
      ${rows}
      <div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:6px;display:flex;gap:20px;flex-wrap:wrap;align-items:center;">
        <div><div style="font-size:10px;color:var(--text3);">Blocks Logged</div><div style="font-size:16px;font-weight:700;color:var(--white);">${agg.blocksLogged} / 6</div></div>
        <div><div style="font-size:10px;color:var(--text3);">Avg Census</div><div style="font-size:16px;font-weight:700;color:var(--white);">${agg.avgCensus||'—'}</div></div>
        <div><div style="font-size:10px;color:var(--text3);">Total Staffed Hours</div><div style="font-size:16px;font-weight:700;color:var(--accent2);">${agg.totalHours||'—'}</div></div>
        <div><div style="font-size:10px;color:var(--text3);">Running HPPD</div><div style="font-size:16px;font-weight:700;color:${agg.runningHppd?(over?'var(--red2)':'var(--green2)'):'var(--text3)'};">${agg.runningHppd??'—'}</div></div>
        <div><div style="font-size:10px;color:var(--text3);">Target</div><div style="font-size:16px;font-weight:700;color:var(--text2);">${target}</div></div>
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
  tEl.innerHTML='<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:8px;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:rgba(255,255,255,0.05);"><th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--text3);">Date</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);">Census</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--amber2);">☀️ Day</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent2);">🌆 Eve1</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--purple2);">🌆 Eve2</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--teal2);">🌙 Night</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent2);">Total Hrs</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);">HPPD</th><th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--text3);">Target</th><th style="padding:8px 10px;"></th></tr></thead><tbody>'+
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
  if(sumEl){sumEl.innerHTML=Object.entries(EQ_STATUS_CFG).map(([k,c])=>{const cnt=(state.equipmentLog||[]).filter(r=>r.status===k).length;return`<div style="background:${c.bg};border:1px solid ${c.b};border-radius:8px;padding:10px 16px;"><div style="font-size:20px;font-weight:700;color:${c.c};">${cnt}</div><div style="font-size:10px;color:var(--text3);">${k}</div></div>`;}).join('');}
  const tEl=document.getElementById('eq-table');if(!tEl)return;
  if(!list.length){tEl.innerHTML='<div style="text-align:center;padding:50px;color:var(--text3);"><div style="font-size:32px;margin-bottom:10px;">🔧</div><div style="font-size:13px;color:var(--white);">No equipment issues logged</div><button onclick="openEqModal()" class="btn btn-primary" style="font-size:12px;margin-top:12px;">+ Log First Issue</button></div>';return;}
  tEl.innerHTML='<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(r=>{const sc=EQ_STATUS_CFG[r.status]||EQ_STATUS_CFG.Open;const dateStr=r.reportedDate?new Date(r.reportedDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';return`<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-left:3px solid ${sc.c};border-radius:8px;padding:12px 14px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;"><div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;"><span style="font-size:13px;font-weight:700;color:var(--white);">🔧 ${r.item}</span><span style="background:${sc.bg};color:${sc.c};font-size:9px;font-weight:700;padding:1px 8px;border-radius:8px;">${r.status}</span>${r.location?`<span style="font-size:10px;color:var(--text3);">${r.location}</span>`:''} ${r.workOrder?`<span style="font-size:10px;color:var(--text3);font-family:'IBM Plex Mono',monospace;">WO: ${r.workOrder}</span>`:''}</div><div style="font-size:10px;color:var(--text3);margin-bottom:4px;">${r.reportedBy?'Reported by '+r.reportedBy:''}${dateStr?' · '+dateStr:''}</div>${r.issue?`<div style="font-size:11px;color:var(--text2);">${r.issue}</div>`:''} ${r.notes?`<div style="font-size:10px;color:var(--teal2);margin-top:4px;">↳ ${r.notes}</div>`:''}</div><div style="display:flex;gap:4px;flex-shrink:0;"><button onclick="openEqModal('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button><button onclick="deleteEqEntry('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button></div></div></div>`;}).join('')+'</div>';
}

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
          <div style="font-size:9px;font-weight:700;color:${isRelevant?col:'var(--text3)'};">${role}</div>
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
          style="margin-left:auto;font-size:9px;padding:2px 7px;background:none;border:1px solid var(--border);border-radius:3px;color:var(--text3);cursor:pointer;white-space:nowrap;"
          title="Reset this shift to default">↺</button>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:${group.color};padding:6px 10px 4px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px;">
        ${group.label}
        <span style="font-size:9px;color:var(--text3);font-weight:400;">— set minimum required per shift</span>
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
        <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;padding:8px;max-height:100px;overflow-y:auto;font-size:10px;color:var(--text2);margin-bottom:14px;font-family:'IBM Plex Mono',monospace;">
          ${emails.join('; ')}
        </div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:14px;">Clicking "Open in Outlook" will open your email client with the recipients and message pre-filled. Review before sending.</div>
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
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;">💡 To save as PDF: click Print Certificate → in the print dialog select "Save as PDF" as the printer.</div>
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
      ${done && doneDate ? `<span style="font-size:9px;color:var(--text3);">${new Date(doneDate + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>` : ''}
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
        <button onclick="printAgencyOriSheet('${safeN}')" style="font-size:10px;padding:3px 8px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:var(--purple2);cursor:pointer;" title="Print Orientation Sheet">📋 Ori Sheet</button>
        <button onclick="sendOriSheet('${safeN}')" style="font-size:10px;padding:3px 8px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:4px;color:var(--green2);cursor:pointer;" title="Send orientation sheet link via text or copy link">📱 Send</button>
        <button onclick="printOriManager('${safeN}')" style="font-size:10px;padding:3px 8px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:4px;color:var(--accent2);cursor:pointer;">🖨 Print</button>
        <button onclick="openOrientationModal('${safeN}')" style="font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
        <button onclick="deleteOrientee('${safeN}')" style="font-size:10px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--accent2);">${weeksCompleted}/${od.totalWeeks}</div>
        <div style="font-size:10px;color:var(--text3);">Weeks Passed</div>
        <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;margin-top:8px;"><div style="height:4px;background:var(--accent2);width:${pct}%;border-radius:2px;"></div></div>
      </div>
      <div style="flex:1;min-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${Object.values(od.milestones || {}).filter(Boolean).length}/${milestones.length}</div>
        <div style="font-size:10px;color:var(--text3);">Milestones</div>
      </div>
      <div style="flex:2;min-width:180px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Off-Orientation Date</div>
        <input type="date" value="${od.offDate || ''}" onchange="saveOriField('${safeN}','offDate',this.value)"
          style="background:transparent;border:none;color:var(--green2);font-size:16px;font-weight:700;outline:none;width:100%;">
        <div style="font-size:9px;color:var(--text3);margin-top:2px;">Set when formally released</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">📋 Weekly Goals — click any goal to edit</div>
          <button onclick="resetOriGoals('${od.role}')" style="font-size:9px;padding:2px 7px;background:none;border:1px solid var(--border);border-radius:3px;color:var(--text3);cursor:pointer;">↺ Reset</button>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">✓ = Passed &nbsp;·&nbsp; ↺ = Remediation &nbsp;·&nbsp; Edit goal text inline</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:rgba(255,255,255,0.04);">
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;">Wk</th>
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;">Goal (editable)</th>
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);">Status</th>
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;">Notes</th>
            </tr></thead>
            <tbody>${weekRows}</tbody>
          </table>
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:12px;font-weight:700;color:var(--white);">🏁 Milestones</div>
          <button onclick="addOriMilestonePrompt()" style="font-size:9px;padding:2px 7px;background:rgba(79,163,232,0.1);border:1px solid rgba(79,163,232,0.3);border-radius:3px;color:var(--accent2);cursor:pointer;">+ Add</button>
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
        <div style="font-size:12px;font-weight:700;color:var(--white);">📅 Manager Meeting Log <span style="font-size:10px;color:var(--text3);font-weight:400;">(every 2 weeks for first 3 months)</span></div>
        <button onclick="addOriMeetingLog('${safeN}')" style="font-size:10px;padding:4px 10px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:5px;color:var(--accent2);cursor:pointer;">+ Add Meeting</button>
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
            <div style="font-size:10px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">📆 Scheduled Meeting Dates</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
              ${scheduledDates.map((dt, i) => {
                const isLogged = logged[i];
                return `<div style="font-size:10px;padding:3px 6px;border-radius:4px;background:${isLogged ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)'};border:1px solid ${isLogged ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'};color:${isLogged ? 'var(--green2)' : 'var(--text2)'};">
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
            <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">ACHIEVEMENTS</div>
              <div style="font-size:11px;color:var(--text2);">${log.achievements || '—'}</div></div>
            <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">CONCERNS / SUPPORT NEEDED</div>
              <div style="font-size:11px;color:var(--text2);">${log.concerns || '—'}</div></div>
            <div style="grid-column:1/-1;"><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">FOLLOW UP</div>
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
            + '<button onclick="openCheckinModal(\'' + safeN2 + '\',' + days + ')" style="font-size:9px;padding:2px 8px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:4px;color:var(--accent2);cursor:pointer;">' + (done?'Edit':'Fill Out') + '</button>'
            + '<button onclick="print3060(\'' + safeN2 + '\',' + days + ')" style="font-size:9px;padding:2px 8px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">🖨</button>'
            + '</div></div>'
            + '<div style="font-size:10px;color:var(--text3);">Target: ' + targetDt + '</div>'
            + (done ? '<div style="font-size:10px;color:var(--green2);margin-top:2px;">Completed: ' + ci.completedDate + '</div>' : '')
            + (ci.summary ? '<div style="font-size:10px;color:var(--text2);margin-top:4px;font-style:italic;">' + ci.summary.slice(0,80) + (ci.summary.length>80?'…':'') + '</div>' : '')
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
      + '<div style="font-size:10px;font-weight:600;color:var(--text3);margin-bottom:3px;">' + (i+1) + '. ' + q + '</div>'
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
    + '<div style="font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;">Or copy link to share manually</div>'
    + '<div style="display:flex;gap:6px;">'
    + '<input id="ori-link-input" value="' + sheetUrl + '" readonly style="flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:5px;padding:6px 8px;color:var(--text2);font-size:10px;font-family:monospace;outline:none;">'
    + '<button onclick="navigator.clipboard.writeText(\'' + sheetUrl.replace(/'/g,"\\'") + '\').then(()=>{this.textContent=\'✓ Copied!\';setTimeout(()=>this.textContent=\'Copy\',2000)});" style="padding:6px 12px;background:rgba(46,125,209,0.15);border:1px solid rgba(46,125,209,0.4);border-radius:5px;color:var(--accent2);font-size:11px;cursor:pointer;">Copy</button>'
    + '</div>'
    + '<div style="margin-top:14px;font-size:10px;color:var(--text3);">Staff member opens the link, fills out the sheet, signs it digitally, and submits — it saves automatically to their Directory file.</div>'
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
    ${od.notes ? `<h2>📋 Preceptor Notes</h2><div style="border:1px solid #ddd;border-radius:5px;padding:10px;font-size:11px;white-space:pre-wrap;">${od.notes}</div>` : ''}
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

// ════════════════════════════════════
//  ONBOARDING / OFFBOARDING
// ════════════════════════════════════

const OB_CHECKLISTS_DEFAULT = {
  onboarding: {
    HR: [
      'Offer letter signed and returned',
      'I-9 and employment eligibility verified',
      'Direct deposit / payroll setup',
      'Benefits enrollment completed (30-day window)',
      'Employee handbook acknowledged',
      'HIPAA confidentiality agreement signed',
      'Background check cleared',
      'Parking/badge/ID issued',
    ],
    IT: [
      'Network login and password created',
      'EMR / Epic access granted and tested',
      'Email account set up',
      'Timekeeping system (UKG) access confirmed',
      'Unit printer and scanner access',
      'Pyxis / medication dispensing access',
    ],
    Clinical: [
      'Unit tour with charge nurse',
      'Emergency equipment locations reviewed (crash cart, fire exits)',
      'Nurse call system training',
      'Fall prevention protocol reviewed',
      'Isolation precautions / PPE locations',
      'Chain of command / escalation process',
      'Shift handoff / SBAR review',
      'First scheduled shift confirmed with preceptor',
    ],
  },
  offboarding: {
    Admin: [
      'ELT submission',
      'Einstein/I-Solved submission',
    ],
    HR: [
      'Resignation / separation letter received',
      'Final paycheck and PTO payout processed',
      'Benefits termination date confirmed (COBRA notice sent)',
      'Exit interview scheduled / completed',
      'References policy reviewed with employee',
    ],
    IT: [
      'Network and email access deactivated',
      'EMR / Epic access removed',
      'UKG access removed',
      'Pyxis / medication dispensing access removed',
      'Hospital-issued devices returned',
    ],
    Clinical: [
      'Keys, badge, and parking pass returned',
      'Locker emptied and cleared',
      'Outstanding patient care tasks transitioned',
      'Schedule removed and replacement coverage arranged',
      'Final performance documentation completed',
      'Staff notified as appropriate',
    ],
  },
};

// Get checklist for specific employee — custom if set, else defaults
function getObChecklist(name, type) {
  const custom = ((state.onboarding[name] || state.offboarding[name] || {}).customChecklist || {})[type];
  return custom || OB_CHECKLISTS_DEFAULT[type];
}

// Save a custom item edit
function saveObItem(name, obType, section, idx, newText) {
  const store = obType === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].customChecklist) store[name].customChecklist = {};
  if (!store[name].customChecklist[obType]) {
    store[name].customChecklist[obType] = {};
    // Copy defaults
    Object.entries(OB_CHECKLISTS_DEFAULT[obType]).forEach(([sec, items]) => {
      store[name].customChecklist[obType][sec] = [...items];
    });
  }
  if (!store[name].customChecklist[obType][section]) {
    store[name].customChecklist[obType][section] = [...(OB_CHECKLISTS_DEFAULT[obType][section] || [])];
  }
  store[name].customChecklist[obType][section][idx] = newText;
  persistSave();
}

function addObItem(name, obType, section) {
  const text = prompt('Enter new checklist item:');
  if (!text || !text.trim()) return;
  const store = obType === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].customChecklist) store[name].customChecklist = {};
  if (!store[name].customChecklist[obType]) {
    store[name].customChecklist[obType] = {};
    Object.entries(OB_CHECKLISTS_DEFAULT[obType]).forEach(([sec, items]) => {
      store[name].customChecklist[obType][sec] = [...items];
    });
  }
  if (!store[name].customChecklist[obType][section]) {
    store[name].customChecklist[obType][section] = [...(OB_CHECKLISTS_DEFAULT[obType][section] || [])];
  }
  store[name].customChecklist[obType][section].push(text.trim());
  persistSave();
  renderOnboarding();
}

function deleteObItem(name, obType, section, idx) {
  const store = obType === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].customChecklist) store[name].customChecklist = {};
  if (!store[name].customChecklist[obType]) {
    store[name].customChecklist[obType] = {};
    Object.entries(OB_CHECKLISTS_DEFAULT[obType]).forEach(([sec, items]) => {
      store[name].customChecklist[obType][sec] = [...items];
    });
  }
  if (!store[name].customChecklist[obType][section]) {
    store[name].customChecklist[obType][section] = [...(OB_CHECKLISTS_DEFAULT[obType][section] || [])];
  }
  store[name].customChecklist[obType][section].splice(idx, 1);
  // Remove the done entry too
  const fullKey = section + '|' + idx;
  persistSave();
  renderOnboarding();
}

function syncOnboardingToOrientation() {
  if (!state.onboarding) return;
  const names = Object.keys(state.onboarding);
  if (!names.length) { showSaveBanner('No onboarding staff to sync'); return; }

  let added = 0, skipped = 0;

  names.forEach(name => {
    const ob  = state.onboarding[name];
    // Skip offboarded/completed entries
    if (!ob || ob.offDate) { skipped++; return; }

    if (!state.orientation) state.orientation = {};

    // Create orientation record if doesn't exist
    if (!state.orientation[name]) {
      const role = ob.role || 'RN';
      const startDate = ob.startDate || new Date().toISOString().split('T')[0];
      const isAgencyNw = !!(state.agencyDates && state.agencyDates[name]?.isAgency);
      const oriRole    = isAgencyNw ? 'Agency RN' : role;
      const defaultWk  = isAgencyNw ? 1 : (role === 'CA') ? 6 : 12;
      const targetDt   = new Date(startDate + 'T12:00:00');
      targetDt.setDate(targetDt.getDate() + (isAgencyNw ? 3 : defaultWk * 7));

      state.orientation[name] = {
        preceptor:  ob.buddy || '',
        buddy:      ob.buddy || '',
        buddyLater: !ob.buddy,
        startDate,
        targetDate: targetDt.toISOString().split('T')[0],
        offDate:    '',
        role:       oriRole,
        totalWeeks: defaultWk,
        weeks:      {},
        milestones: {},
        notes:      ob.notes || '',
        profile:    { food:'', movie:'', hobbies:'', proudOf:'', perfectDay:'' },
        meetingLogs: [],
      };
      added++;
    } else {
      // Update buddy/preceptor if not yet set
      const od = state.orientation[name];
      if (!od.preceptor && ob.buddy) { od.preceptor = ob.buddy; od.buddy = ob.buddy; od.buddyLater = false; }
      skipped++;
    }
  });

  persistSave();
  showSaveBanner(`🎓 Synced: ${added} added to Orientation${skipped ? `, ${skipped} already exist` : ''}`);
  if (added > 0) showToast(`${added} staff moved to Orientation tab`);
}

function initOnboarding() {
  const dl  = document.getElementById('ob-staff-dl');
  const bdl = document.getElementById('ob-buddy-dl');
  if (dl)  dl.innerHTML  = MASTER_STAFF.map(s => `<option value="${s.name}">`).join('');
  if (bdl) bdl.innerHTML = MASTER_STAFF.filter(s => s.job === 'RN' || s.job === 'LPN').map(s => `<option value="${s.name}">`).join('');
  const d = document.getElementById('ob-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
  // Auto-sync onboarding → orientation silently on load
  if (state.onboarding && Object.keys(state.onboarding).length) syncOnboardingToOrientation();
  if (document.getElementById('panel-onboarding')?.style.display !== 'none') renderOnboarding();
}

function openObModal(name, type) {
  type = type || document.getElementById('ob-view')?.value || 'onboarding';
  const m = document.getElementById('ob-modal'); if (!m) return;
  m.style.display = 'flex';
  document.getElementById('ob-edit-name').value = name || '';
  document.getElementById('ob-edit-type').value = type;
  document.getElementById('ob-modal-title').textContent = (name ? 'Edit' : 'Add') + ' — ' + (type === 'onboarding' ? 'Onboarding' : 'Offboarding');
  const isOff = type === 'offboarding';
  document.getElementById('ob-date-label').textContent  = isOff ? 'Last Day' : 'Start Date';
  document.getElementById('ob-buddy-wrap').style.display  = isOff ? 'none' : 'block';
  document.getElementById('ob-reason-wrap').style.display = isOff ? 'block' : 'none';
  if (name) {
    const rec = (isOff ? state.offboarding : state.onboarding)[name] || {};
    document.getElementById('ob-name').value    = name;
    document.getElementById('ob-role').value    = rec.role  || 'RN';
    document.getElementById('ob-date').value    = isOff ? (rec.lastDay || '') : (rec.startDate || '');
    document.getElementById('ob-buddy').value   = rec.buddy || '';
    document.getElementById('ob-reason').value  = rec.reason || 'Resignation';
    document.getElementById('ob-notes').value   = rec.notes || '';
  } else {
    ['ob-name','ob-buddy','ob-notes'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    document.getElementById('ob-date').value   = new Date().toISOString().split('T')[0];
  }
}

function closeObModal() { const m = document.getElementById('ob-modal'); if (m) m.style.display = 'none'; }

function saveObEntry() {
  const name = (document.getElementById('ob-name')?.value || '').trim();
  if (!name) { alert('Enter a name.'); return; }
  const type = document.getElementById('ob-edit-type')?.value || 'onboarding';
  const isOff = type === 'offboarding';
  const entry = {
    role:      document.getElementById('ob-role')?.value    || 'RN',
    notes:     document.getElementById('ob-notes')?.value   || '',
    ...(isOff
      ? { lastDay: document.getElementById('ob-date')?.value || '', reason: document.getElementById('ob-reason')?.value || '' }
      : { startDate: document.getElementById('ob-date')?.value || '', buddy: document.getElementById('ob-buddy')?.value || '' }),
  };
  const store = isOff ? state.offboarding : state.onboarding;
  if (!store[name]) entry.done = {};
  store[name] = Object.assign(store[name] || { done:{} }, entry);
  persistSave(); closeObModal(); renderOnboarding();
}

function toggleObCheck(name, type, section, key) {
  const store = type === 'offboarding' ? state.offboarding : state.onboarding;
  if (!store[name]) return;
  if (!store[name].done) store[name].done = {};
  const fullKey = section + '|' + key;
  if (store[name].done[fullKey]) delete store[name].done[fullKey];
  else store[name].done[fullKey] = new Date().toISOString().split('T')[0];
  persistSave(); renderOnboarding();
}

function deleteObEntry(name, type) {
  if (!confirm('Remove ' + name + ' from ' + type + '?')) return;
  const store = type === 'offboarding' ? state.offboarding : state.onboarding;
  delete store[name]; persistSave(); renderOnboarding();
}

function renderOnboarding() {
  const type = document.getElementById('ob-view')?.value || 'onboarding';
  const store = type === 'offboarding' ? (state.offboarding || {}) : (state.onboarding || {});
  // Checklist is fetched per-employee inside the loop
  const isOff = type === 'offboarding';
  const el = document.getElementById('ob-list'); if (!el) return;

  if (!Object.keys(store).length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text3);">
      <div style="font-size:36px;margin-bottom:12px;">${isOff ? '🚪' : '🟢'}</div>
      <div style="font-size:13px;color:var(--white);margin-bottom:6px;">No ${type} records</div>
      <button onclick="openObModal()" class="btn btn-primary" style="font-size:12px;margin-top:8px;">+ Add Employee</button>
    </div>`; return;
  }

  el.innerHTML = Object.entries(store).map(([name, rec]) => {
    const rCol = IV_ROLE_COLOR[rec.role] || 'var(--text2)';
    const initials = name.split(',').map(p => p.trim()[0] || '').join('');
    const dateLabel = isOff ? rec.lastDay : rec.startDate;
    const dateStr = dateLabel ? new Date(dateLabel + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';

    // Count completed items — use per-employee checklist
    const empChecklist = getObChecklist(name, type);
    const done = rec.done || {};
    const totalItems = Object.values(empChecklist).flat().length;
    const doneCount  = Object.keys(done).length;
    const pct = totalItems ? Math.round(doneCount / totalItems * 100) : 0;

    const sections = Object.entries(empChecklist).map(([section, items]) => {
      const sColor = { Admin:'var(--purple2)', HR:'var(--amber2)', IT:'var(--teal2)', Clinical:'var(--accent2)' }[section] || 'var(--text2)';
      const safeN = name.replace(/'/g, "\\'");
      const rows = items.map((item, idx) => {
        const key  = section + '|' + item;
        const isDone = !!done[key];
        const dDate  = done[key] ? new Date(done[key] + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
        return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);group">
          <input type="checkbox" ${isDone ? 'checked' : ''}
            onchange="toggleObCheck('${safeN}','${type}','${section}','${item.replace(/'/g,"\\'")}',this)"
            style="width:14px;height:14px;cursor:pointer;accent-color:var(--green2);flex-shrink:0;">
          <input type="text" value="${item.replace(/"/g,'&quot;')}"
            onblur="saveObItem('${safeN}','${type}','${section}',${idx},this.value);renderOnboarding();"
            style="flex:1;background:transparent;border:none;border-bottom:1px dashed rgba(255,255,255,${isDone?'0.05':'0.12'});color:${isDone?'var(--text3)':'var(--text2)'};font-size:11px;outline:none;padding:1px 3px;${isDone?'text-decoration:line-through;':''}">
          ${isDone ? `<span style="font-size:9px;color:var(--green2);white-space:nowrap;">✓ ${dDate}</span>` : ''}
          <button onclick="deleteObItem('${safeN}','${type}','${section}',${idx})" style="background:none;border:none;color:rgba(255,255,255,0.12);cursor:pointer;font-size:10px;padding:0 2px;flex-shrink:0;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='rgba(255,255,255,0.12)'" title="Remove item">✕</button>
        </div>`;
      }).join('');
      const sectionDone = items.filter(i => !!done[section + '|' + i]).length;
      return `<div style="flex:1;min-width:220px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:10px;font-weight:700;color:${sColor};text-transform:uppercase;letter-spacing:.4px;">${section} (${sectionDone}/${items.length})</div>
          <button onclick="addObItem('${safeN}','${type}','${section}')" style="font-size:9px;padding:1px 6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:3px;color:var(--text3);cursor:pointer;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">+ Add</button>
        </div>
        ${rows}
      </div>`;
    }).join('');

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,0.04);border-bottom:1px solid var(--border);">
        <div style="width:38px;height:38px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${name}</div>
          <div style="font-size:10px;color:${rCol};">${rec.role}${isOff && rec.reason ? ' · ' + rec.reason : ''}${!isOff && rec.buddy ? ' · Buddy: ' + rec.buddy.split(',')[0] : ''} · ${isOff ? 'Last Day' : 'Start'}: ${dateStr}</div>
        </div>
        <div style="text-align:center;margin-right:8px;">
          <div style="font-size:16px;font-weight:700;color:${pct===100?'var(--green2)':'var(--accent2)'};">${pct}%</div>
          <div style="font-size:9px;color:var(--text3);">${doneCount}/${totalItems}</div>
        </div>
        <button onclick="openObModal('${name.replace(/'/g,"\\'")}','${type}')" style="font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎</button>
        ${!isOff && state.orientation && state.orientation[name.replace(/'/g,"\\'")] ? `<button onclick="switchTab('orientation');setTimeout(()=>renderOrientationDetail('${name.replace(/'/g,"\\'")}'),100)" style="font-size:10px;padding:3px 8px;background:rgba(46,125,209,0.12);border:1px solid rgba(46,125,209,0.35);border-radius:4px;color:var(--accent2);cursor:pointer;" title="View orientation tracker">🎓</button>` : ''}
        <button onclick="deleteObEntry('${name.replace(/'/g,"\\'")}','${type}')" style="font-size:10px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;gap:16px;padding:14px 16px;flex-wrap:wrap;">${sections}</div>
      ${rec.notes ? `<div style="padding:8px 16px 12px;font-size:11px;color:var(--text3);border-top:1px solid rgba(255,255,255,0.05);">📝 ${rec.notes}</div>` : ''}
    </div>`;
  }).join('');
}

// ════════════════════════════════════
//  COACHING TAB
// ════════════════════════════════════

const COACH_AREA_CFG = {
  Attendance:    { icon:'📅', color:'var(--amber2)',  threshold: (d) => d.callouts >= 3 || d.tardies >= 3 },
  Falls:         { icon:'🚶', color:'var(--red2)',    threshold: (d) => d.falls > 0 },
  HAPI:          { icon:'🩹', color:'var(--red2)',    threshold: (d) => d.hapIs > 0 },
  Scanning:      { icon:'💊', color:'var(--accent2)', threshold: (d) => d.scanPct !== null && d.scanPct < 95 },
  Pain:          { icon:'💔', color:'var(--purple2)', threshold: (d) => d.painPct !== null && d.painPct < 90 },
  PLATO:         { icon:'🔄', color:'var(--teal2)',   threshold: (d) => d.platoPct !== null && d.platoPct < 90 },
  Documentation: { icon:'📝', color:'var(--text2)',   threshold: () => false },
  Communication: { icon:'🗣', color:'var(--teal2)',   threshold: () => false },
  Conduct:       { icon:'⚠️', color:'var(--amber2)',  threshold: () => false },
  Clinical:      { icon:'🩺', color:'var(--green2)',  threshold: () => false },
  Other:         { icon:'📋', color:'var(--text3)',   threshold: () => false },
};

function initCoaching() {
  const yrSel = document.getElementById('coach-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    for (let y = cur - 1; y <= cur + 1; y++) {
      const o = document.createElement('option'); o.value = y; o.textContent = y;
      if (y === cur) o.selected = true; yrSel.appendChild(o);
    }
  }
  if (document.getElementById('panel-coaching')?.style.display !== 'none') renderCoaching();
}

// ════════════════════════════════════
//  FALL ROUNDING COMPLIANCE (PLATO)
//  state.fallRoundData: array of per-round observations pasted in from the
//  unit's fall-rounding audit sheet — { id, staff, date, compliant, items:{...}, notes }
// ════════════════════════════════════

const FALL_ROUND_ITEMS = [
  { key:'signIn',       label:'Sign In Place' },
  { key:'lightOn',      label:'Light On' },
  { key:'bracelet',     label:'Fall Bracelet On' },
  { key:'footwear',     label:'Non-Skid Footwear' },
  { key:'clutterFree',  label:'Clutter-Free Room' },
  { key:'alarmOn',      label:'Bed/Chair Alarm On' },
  { key:'callLight',    label:'Call Light Within Reach' },
  { key:'bedLowLocked', label:'Bed Low & Locked' },
  { key:'gaitBelt',     label:'Gait Belt in Room' },
  { key:'ambAid',       label:'Ambulation Aid Available' },
  { key:'nearStation',  label:'Near Nurses Station' },
];

function parseUSDate(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, mo, da, yr] = m;
  if (yr.length === 2) yr = '20' + yr;
  const d = new Date(parseInt(yr), parseInt(mo) - 1, parseInt(da), 12);
  return isNaN(d.getTime()) ? null : d;
}

// Parses tab-delimited text pasted directly from Excel (header row required,
// column order doesn't matter — matched by header text).
function parseFallRoundPaste(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const findCol = (...patterns) => header.findIndex(h => patterns.some(p => h.includes(p)));
  const idx = {
    staff:        findCol('staff'),
    staff2:       findCol('second nurse assigned', 'second nurse'),
    ca:           findCol('ca / pct', 'ca/pct', 'ca / pct / ema', 'pct / ema assigned', 'ca pct ema'),
    compliance:   findCol('fall complian', 'complian'),
    date:         findCol('date'),
    signIn:       findCol('sign in'),
    lightOn:      findCol('light on', 'light'),
    bracelet:     findCol('bracelet'),
    footwear:     findCol('footwear'),
    clutterFree:  findCol('clutter'),
    alarmOn:      findCol('alarm'),
    callLight:    findCol('call light'),
    bedLowLocked: findCol('bed low'),
    gaitBelt:     findCol('gait belt'),
    ambAid:       findCol('ambulation'),
    nearStation:  findCol('near nurse', 'nurses station'),
  };
  // Notes/comment column: last non-empty header cell that isn't already matched above
  const matchedIdx = new Set(Object.values(idx).filter(i => i >= 0));
  let notesIdx = -1;
  for (let i = header.length - 1; i >= 0; i--) { if (!matchedIdx.has(i)) { notesIdx = i; break; } }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const staff = idx.staff >= 0 ? (cells[idx.staff] || '').trim() : '';
    if (!staff) continue;
    const complianceRaw = idx.compliance >= 0 ? (cells[idx.compliance] || '').trim().toLowerCase() : '';
    const compliant = complianceRaw.startsWith('compliant');
    const items = {};
    FALL_ROUND_ITEMS.forEach(it => { items[it.key] = idx[it.key] >= 0 ? (cells[idx[it.key]] || '').trim() : ''; });
    rows.push({
      id: 'fr_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
      staff,
      staff2: idx.staff2 >= 0 ? (cells[idx.staff2] || '').trim() : '',
      ca: idx.ca >= 0 ? (cells[idx.ca] || '').trim() : '',
      date: idx.date >= 0 ? (cells[idx.date] || '').trim() : '',
      compliant,
      items,
      notes: notesIdx >= 0 ? (cells[notesIdx] || '').trim() : '',
    });
  }
  return rows;
}

// All staff jointly assigned to a round (primary, second nurse, CA/PCT/EMA) share
// accountability for that round's compliance outcome. Raw names are resolved through
// state.staffNameMap (built via the Unmatched Names review panel below) so typos and
// role-suffix variants in the source export ("Kelly Dean RN" → "Kelly Dean") map
// correctly to the directory without editing the underlying imported rows.
function roundStaffNames(r) {
  const map = state.staffNameMap || {};
  return [r.staff, r.staff2, r.ca].filter(Boolean).map(n => map[n] || n);
}

// Simple Levenshtein distance for name-similarity suggestions.
function levenshtein(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]);
    }
  }
  return d[m][n];
}

// Best-guess directory match for a raw (unmatched) name, e.g. "Kelly Dean RN" → "Kelly Dean",
// "Jessica Alexendar" → "Jessica Alexander". Returns top 2 candidates with a similarity score.
function suggestStaffMatch(rawName) {
  const norm = s => s.toLowerCase().replace(/\b(rn|lpn|ca|pct|ema)\b\.?/g, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  const rawNorm = norm(rawName);
  const scored = MASTER_STAFF.map(s => {
    const candNorm = norm(s.name);
    if (candNorm === rawNorm) return { name: s.name, score: 100 };
    const dist = levenshtein(rawNorm, candNorm);
    const maxLen = Math.max(rawNorm.length, candNorm.length) || 1;
    const startsWith = candNorm.startsWith(rawNorm) || rawNorm.startsWith(candNorm);
    let score = Math.round((1 - dist / maxLen) * 100);
    if (startsWith) score = Math.max(score, 85);
    return { name: s.name, score };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).filter(s => s.score >= 50);
}

// Collects every raw staff/staff2/ca name across both PLATO round datasets that isn't
// already a directory name, isn't already mapped, and hasn't been dismissed as "not staff."
function getUnmatchedRoundNames() {
  const map = state.staffNameMap || {};
  const ignored = new Set(state.staffNameIgnored || []);
  const dirNames = new Set(MASTER_STAFF.map(s => s.name));
  const counts = {};
  [...(state.fallRoundData || []), ...(state.hapiRoundData || [])].forEach(r => {
    [r.staff, r.staff2, r.ca].filter(Boolean).forEach(raw => {
      if (dirNames.has(raw) || map[raw] || ignored.has(raw)) return;
      counts[raw] = (counts[raw] || 0) + 1;
    });
  });
  return Object.keys(counts).map(raw => ({
    raw, count: counts[raw], suggestions: suggestStaffMatch(raw),
  })).sort((a, b) => b.count - a.count);
}

function confirmStaffNameMatch(rawName, canonicalName) {
  if (!state.staffNameMap) state.staffNameMap = {};
  state.staffNameMap[rawName] = canonicalName;
  persistSave();
  renderFallRounding(); renderHapiRounding();
  showSaveBanner(`💾 Mapped "${rawName}" → ${canonicalName}`);
}

function ignoreStaffNameMatch(rawName) {
  if (!state.staffNameIgnored) state.staffNameIgnored = [];
  state.staffNameIgnored.push(rawName);
  persistSave();
  renderFallRounding(); renderHapiRounding();
}

function renderUnmatchedNamesPanel(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const unmatched = getUnmatchedRoundNames();
  if (!unmatched.length) { el.innerHTML = ''; return; }
  const allStaffSorted = MASTER_STAFF.map(s => s.name).slice().sort();
  el.innerHTML = `
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:8px;">⚠ ${unmatched.length} Name${unmatched.length===1?'':'s'} Not Matching the Staff Directory</div>
      ${unmatched.map(u => {
        const suggestedNames = new Set(u.suggestions.map(s => s.name));
        const selId = 'unmatch-sel-' + btoa(unescape(encodeURIComponent(u.raw))).replace(/[^a-zA-Z0-9]/g, '');
        return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:1px solid rgba(245,158,11,0.15);">
          <div style="flex:1;min-width:140px;font-size:12px;color:var(--white);">"${u.raw}" <span style="color:var(--text3);">(${u.count} round${u.count===1?'':'s'})</span></div>
          <select id="${selId}" style="background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:3px 6px;color:var(--white);font-size:11px;outline:none;max-width:220px;">
            ${u.suggestions.length ? `<optgroup label="Suggested">${u.suggestions.map(s => `<option value="${s.name.replace(/"/g,'&quot;')}">${s.name} (${s.score}% match)</option>`).join('')}</optgroup>` : ''}
            <optgroup label="All Staff">${allStaffSorted.filter(n => !suggestedNames.has(n)).map(n => `<option value="${n.replace(/"/g,'&quot;')}">${n}</option>`).join('')}</optgroup>
          </select>
          <button onclick="confirmStaffNameMatch('${u.raw.replace(/'/g,"\\'")}', document.getElementById('${selId}').value)"
            style="font-size:11px;padding:4px 10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:5px;color:var(--green2);cursor:pointer;">✓ Confirm</button>
          <button onclick="ignoreStaffNameMatch('${u.raw.replace(/'/g,"\\'")}')"
            style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:5px;color:var(--text3);cursor:pointer;">Not Staff — Dismiss</button>
        </div>`;
      }).join('')}
    </div>`;
}

const HAPI_ROUND_ITEMS = [
  { key:'foamMepilex',    label:'Foam/Mepilex in Place' },
  { key:'heelOffload',    label:'Heel Offloading' },
  { key:'heelOffloadDev', label:'Heel Offloading Device' },
  { key:'hob30',          label:'HOB </= 30 Degrees' },
  { key:'posMatchClock',  label:'Position Matches Clock' },
  { key:'sacrumOffload',  label:'Sacrum Offloaded' },
  { key:'offloadDevice',  label:'Offloading Device' },
  { key:'waffleCushion',  label:'Waffle Cushion' },
  { key:'specialtyBed',   label:'Specialty Bed' },
];

// Parses tab-delimited text pasted directly from Excel (header row required,
// column order doesn't matter — matched by header text). Mirrors parseFallRoundPaste.
function parseHapiRoundPaste(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const findCol = (...patterns) => header.findIndex(h => patterns.some(p => h.includes(p)));
  const findColExcl = (excludeIdx, ...patterns) => header.findIndex((h, i) => i !== excludeIdx && patterns.some(p => h.includes(p)));
  const heelOffloadDevIdx = findCol('heel offloading device');
  const specialtyBedTypeIdx = findCol('what specialty');
  const staff2Idx = findCol('second nurse assigned', 'second nurse');
  const idx = {
    staff:          findColExcl(staff2Idx, 'staff', 'nurse assigned'),
    staff2:         staff2Idx,
    ca:             findCol('ca / pct', 'ca/pct', 'ca / pct / ema', 'pct / ema assigned', 'ca pct ema'),
    compliance:     findCol('hapi complian', 'complian'),
    date:           findCol('date'),
    foamMepilex:    findCol('foam', 'mepilex'),
    heelOffload:    findColExcl(heelOffloadDevIdx, 'heel offload'),
    heelOffloadDev: heelOffloadDevIdx,
    hob30:          findCol('hob'),
    posMatchClock:  findCol('position', 'match'),
    sacrumOffload:  findCol('sacrum'),
    offloadDevice:  findCol('offloading device'),
    waffleCushion:  findCol('waffle'),
    specialtyBed:   findColExcl(specialtyBedTypeIdx, 'specialty bed'),
  };
  // "What specialty bed?" is a free-text type column, not a Yes/No item — deliberately excluded from HAPI_ROUND_ITEMS matching
  const matchedIdx = new Set(Object.values(idx).filter(i => i >= 0));
  let notesIdx = -1;
  for (let i = header.length - 1; i >= 0; i--) { if (!matchedIdx.has(i)) { notesIdx = i; break; } }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const staff = idx.staff >= 0 ? (cells[idx.staff] || '').trim() : '';
    if (!staff) continue;
    const complianceRaw = idx.compliance >= 0 ? (cells[idx.compliance] || '').trim().toLowerCase() : '';
    const compliant = complianceRaw.startsWith('compliant');
    const items = {};
    HAPI_ROUND_ITEMS.forEach(it => { items[it.key] = idx[it.key] >= 0 ? (cells[idx[it.key]] || '').trim() : ''; });
    rows.push({
      id: 'hr_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
      staff,
      staff2: idx.staff2 >= 0 ? (cells[idx.staff2] || '').trim() : '',
      ca: idx.ca >= 0 ? (cells[idx.ca] || '').trim() : '',
      date: idx.date >= 0 ? (cells[idx.date] || '').trim() : '',
      compliant,
      items,
      notes: notesIdx >= 0 ? (cells[notesIdx] || '').trim() : '',
    });
  }
  return rows;
}

// "No" is a genuine miss; "N/A" / "Pt Refused" / blank are excluded from the denominator
// rather than counted against compliance — mirrors how HAPI PLATO items work clinically
// (e.g. heel offloading N/A for a patient who is up in a chair).
function getHapiRoundStats(name, yr) {
  const recs = (state.hapiRoundData || []).filter(r => {
    if (!roundStaffNames(r).includes(name)) return false;
    if (!yr) return true;
    const d = parseUSDate(r.date);
    return d ? d.getFullYear() === yr : true;
  });
  const total = recs.length;
  const compliantCount = recs.filter(r => r.compliant).length;
  const pct = total > 0 ? Math.round(compliantCount / total * 100) : null;
  const missedCounts = {};
  HAPI_ROUND_ITEMS.forEach(it => missedCounts[it.key] = 0);
  recs.forEach(r => HAPI_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') missedCounts[it.key]++; }));
  const missedList = HAPI_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:missedCounts[it.key] })).filter(m => m.count > 0).sort((a, b) => b.count - a.count);
  return { total, compliantCount, pct, missedList, recs };
}

function getHapiRoundLeaderboard(yr) {
  const counts = {}; HAPI_ROUND_ITEMS.forEach(it => counts[it.key] = 0);
  let total = 0;
  (state.hapiRoundData || []).forEach(r => {
    if (yr) { const d = parseUSDate(r.date); if (d && d.getFullYear() !== yr) return; }
    total++;
    HAPI_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') counts[it.key]++; });
  });
  const missed = HAPI_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:counts[it.key] })).sort((a, b) => b.count - a.count);
  return { total, missed };
}

function initHapiRounding() {
  const yrSel = document.getElementById('hr-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    let html = '<option value="ALL">All Years</option>';
    for (let y = cur; y >= cur - 3; y--) html += `<option value="${y}"${y===cur?' selected':''}>${y}</option>`;
    yrSel.innerHTML = html;
  }
  renderHapiRounding();
}

function importHapiRoundPaste() {
  const ta = document.getElementById('hr-paste');
  const statusEl = document.getElementById('hr-import-status');
  const text = ta?.value || '';
  if (!text.trim()) { if (statusEl) statusEl.textContent = 'Paste some rows first.'; return; }
  const rows = parseHapiRoundPaste(text);
  if (!rows.length) { if (statusEl) { statusEl.textContent = '⚠ No valid rows found — check that a "Staff" column is present.'; statusEl.style.color = 'var(--red2)'; } return; }
  if (!state.hapiRoundData) state.hapiRoundData = [];
  state.hapiRoundData.push(...rows);
  persistSave();
  if (ta) ta.value = '';
  if (statusEl) { statusEl.textContent = `✓ Imported ${rows.length} round${rows.length===1?'':'s'}.`; statusEl.style.color = 'var(--green2)'; }
  renderHapiRounding();
  showSaveBanner('💾 Imported ' + rows.length + ' HAPI rounding record' + (rows.length===1?'':'s'));
}

function clearHapiRoundData() {
  if (!confirm('Delete ALL imported HAPI rounding compliance data? This cannot be undone.')) return;
  state.hapiRoundData = [];
  persistSave();
  renderHapiRounding();
}

function renderHapiRounding() {
  const yrVal = document.getElementById('hr-year')?.value || String(new Date().getFullYear());
  const yr = yrVal === 'ALL' ? null : parseInt(yrVal);

  renderUnmatchedNamesPanel('hr-unmatched-names');

  const totalEl = document.getElementById('hr-total-rounds');
  const allRounds = (state.hapiRoundData || []).length;
  if (totalEl) totalEl.textContent = allRounds + ' round' + (allRounds===1?'':'s') + ' on file (all years)';

  const lb = getHapiRoundLeaderboard(yr);
  const lbEl = document.getElementById('hr-leaderboard');
  if (lbEl) {
    if (!lb.total) {
      lbEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No rounds imported for this period yet.</div>';
    } else {
      const maxCount = Math.max(1, lb.missed[0]?.count || 0);
      lbEl.innerHTML = lb.missed.filter(m => m.count > 0).slice(0, 9).map(m => {
        const pct = Math.round(m.count / lb.total * 100);
        const barW = Math.round(m.count / maxCount * 100);
        return `<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
            <span style="color:var(--white);">${m.label}</span>
            <span style="color:var(--text3);">${m.count} miss${m.count===1?'':'es'} · ${pct}% of rounds</span>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:7px;overflow:hidden;">
            <div style="background:var(--red2);height:100%;width:${barW}%;"></div>
          </div>
        </div>`;
      }).join('') || '<div style="font-size:11px;color:var(--text3);">No missed elements — 100% compliance across all audited rounds. 🎉</div>';
    }
  }

  const staffEl = document.getElementById('hr-staff-list');
  if (staffEl) {
    const names = [...new Set((state.hapiRoundData || []).flatMap(roundStaffNames))]
      .filter(name => MASTER_STAFF.some(s => s.name === name))
      .sort();
    if (!names.length) {
      staffEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No staff data yet — import rounds above.</div>';
    } else {
      const rows = names.map(name => {
        const stats = getHapiRoundStats(name, yr);
        const staffRec = MASTER_STAFF.find(s => s.name === name);
        return { name, job: staffRec?.job || '—', stats };
      }).filter(r => r.stats.total > 0).sort((a, b) => (a.stats.pct ?? 100) - (b.stats.pct ?? 100));

      staffEl.innerHTML = rows.map(r => {
        const warn = r.stats.pct !== null && r.stats.pct < 90;
        const topMissed = r.stats.missedList.slice(0, 2).map(m => m.label).join(', ');
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${warn?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${warn?'var(--red2)':'var(--border)'};border-radius:8px;padding:10px 14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--white);">${r.name}</div>
              <div style="font-size:10px;color:var(--text3);">${r.job} · ${r.stats.total} audited round${r.stats.total===1?'':'s'}</div>
            </div>
            <span style="font-size:14px;font-weight:700;padding:3px 10px;border-radius:8px;${warn?'background:rgba(239,68,68,0.12);color:var(--red2);':'background:rgba(16,185,129,0.12);color:var(--green2);'}">${r.stats.pct}%</span>
            ${r.stats.total>0 ? `<button onclick="openCoachModal('${r.name.replace(/'/g,"\\'")}','');setCoachAreaChecked('HAPIPLATO',true);"
              style="font-size:11px;padding:4px 10px;background:rgba(46,125,209,0.1);border:1px solid rgba(46,125,209,0.3);border-radius:5px;color:var(--accent2);cursor:pointer;white-space:nowrap;">→ Coach</button>` : ''}
          </div>
          ${topMissed ? `<div style="font-size:10px;color:var(--text3);margin-top:6px;">Most missed: ${topMissed}</div>` : ''}
        </div>`;
      }).join('');
    }
  }
}

function getFallRoundStats(name, yr) {
  const recs = (state.fallRoundData || []).filter(r => {
    if (!roundStaffNames(r).includes(name)) return false;
    if (!yr) return true;
    const d = parseUSDate(r.date);
    return d ? d.getFullYear() === yr : true; // keep unparsable dates rather than silently dropping them
  });
  const total = recs.length;
  const compliantCount = recs.filter(r => r.compliant).length;
  const pct = total > 0 ? Math.round(compliantCount / total * 100) : null;
  const missedCounts = {};
  FALL_ROUND_ITEMS.forEach(it => missedCounts[it.key] = 0);
  recs.forEach(r => FALL_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') missedCounts[it.key]++; }));
  const missedList = FALL_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:missedCounts[it.key] })).filter(m => m.count > 0).sort((a, b) => b.count - a.count);
  return { total, compliantCount, pct, missedList, recs };
}

function getFallRoundLeaderboard(yr) {
  const counts = {}; FALL_ROUND_ITEMS.forEach(it => counts[it.key] = 0);
  let total = 0;
  (state.fallRoundData || []).forEach(r => {
    if (yr) { const d = parseUSDate(r.date); if (d && d.getFullYear() !== yr) return; }
    total++;
    FALL_ROUND_ITEMS.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') counts[it.key]++; });
  });
  const missed = FALL_ROUND_ITEMS.map(it => ({ key:it.key, label:it.label, count:counts[it.key] })).sort((a, b) => b.count - a.count);
  return { total, missed };
}

function initFallRounding() {
  const yrSel = document.getElementById('fr-year');
  if (yrSel && !yrSel.options.length) {
    const cur = new Date().getFullYear();
    let html = '<option value="ALL">All Years</option>';
    for (let y = cur; y >= cur - 3; y--) html += `<option value="${y}"${y===cur?' selected':''}>${y}</option>`;
    yrSel.innerHTML = html;
  }
  renderFallRounding();
}

function importFallRoundPaste() {
  const ta = document.getElementById('fr-paste');
  const statusEl = document.getElementById('fr-import-status');
  const text = ta?.value || '';
  if (!text.trim()) { if (statusEl) statusEl.textContent = 'Paste some rows first.'; return; }
  const rows = parseFallRoundPaste(text);
  if (!rows.length) { if (statusEl) { statusEl.textContent = '⚠ No valid rows found — check that a "Staff" column is present.'; statusEl.style.color = 'var(--red2)'; } return; }
  if (!state.fallRoundData) state.fallRoundData = [];
  state.fallRoundData.push(...rows);
  persistSave();
  if (ta) ta.value = '';
  if (statusEl) { statusEl.textContent = `✓ Imported ${rows.length} round${rows.length===1?'':'s'}.`; statusEl.style.color = 'var(--green2)'; }
  renderFallRounding();
  showSaveBanner('💾 Imported ' + rows.length + ' fall rounding record' + (rows.length===1?'':'s'));
}

function clearFallRoundData() {
  if (!confirm('Delete ALL imported fall rounding compliance data? This cannot be undone.')) return;
  state.fallRoundData = [];
  persistSave();
  renderFallRounding();
}

function renderFallRounding() {
  const yrVal = document.getElementById('fr-year')?.value || String(new Date().getFullYear());
  const yr = yrVal === 'ALL' ? null : parseInt(yrVal);

  renderUnmatchedNamesPanel('fr-unmatched-names');

  const totalEl = document.getElementById('fr-total-rounds');
  const allRounds = (state.fallRoundData || []).length;
  if (totalEl) totalEl.textContent = allRounds + ' round' + (allRounds===1?'':'s') + ' on file (all years)';

  // Leaderboard — most missed interventions across all staff
  const lb = getFallRoundLeaderboard(yr);
  const lbEl = document.getElementById('fr-leaderboard');
  if (lbEl) {
    if (!lb.total) {
      lbEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No rounds imported for this period yet.</div>';
    } else {
      const maxCount = Math.max(1, lb.missed[0]?.count || 0);
      lbEl.innerHTML = lb.missed.filter(m => m.count > 0).slice(0, 11).map(m => {
        const pct = Math.round(m.count / lb.total * 100);
        const barW = Math.round(m.count / maxCount * 100);
        return `<div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
            <span style="color:var(--white);">${m.label}</span>
            <span style="color:var(--text3);">${m.count} miss${m.count===1?'':'es'} · ${pct}% of rounds</span>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:7px;overflow:hidden;">
            <div style="background:var(--red2);height:100%;width:${barW}%;"></div>
          </div>
        </div>`;
      }).join('') || '<div style="font-size:11px;color:var(--text3);">No missed elements — 100% compliance across all audited rounds. 🎉</div>';
    }
  }

  // Per-staff compliance list — directory staff only (excludes typos/name mismatches from the raw export)
  const staffEl = document.getElementById('fr-staff-list');
  if (staffEl) {
    const names = [...new Set((state.fallRoundData || []).flatMap(roundStaffNames))]
      .filter(name => MASTER_STAFF.some(s => s.name === name))
      .sort();
    if (!names.length) {
      staffEl.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:20px;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;">No staff data yet — import rounds above.</div>';
    } else {
      const rows = names.map(name => {
        const stats = getFallRoundStats(name, yr);
        const staffRec = MASTER_STAFF.find(s => s.name === name);
        const rCol = IV_ROLE_COLOR[staffRec?.job] || 'var(--text2)';
        return { name, job: staffRec?.job || '—', stats };
      }).filter(r => r.stats.total > 0).sort((a, b) => (a.stats.pct ?? 100) - (b.stats.pct ?? 100));

      staffEl.innerHTML = rows.map(r => {
        const warn = r.stats.pct !== null && r.stats.pct < 90;
        const topMissed = r.stats.missedList.slice(0, 2).map(m => m.label).join(', ');
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${warn?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${warn?'var(--red2)':'var(--border)'};border-radius:8px;padding:10px 14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--white);">${r.name}</div>
              <div style="font-size:10px;color:var(--text3);">${r.job} · ${r.stats.total} audited round${r.stats.total===1?'':'s'}</div>
            </div>
            <span style="font-size:14px;font-weight:700;padding:3px 10px;border-radius:8px;${warn?'background:rgba(239,68,68,0.12);color:var(--red2);':'background:rgba(16,185,129,0.12);color:var(--green2);'}">${r.stats.pct}%</span>
            ${r.stats.total>0 ? `<button onclick="openCoachModal('${r.name.replace(/'/g,"\\'")}','');setCoachAreaChecked('PLATO',true);"
              style="font-size:11px;padding:4px 10px;background:rgba(46,125,209,0.1);border:1px solid rgba(46,125,209,0.3);border-radius:5px;color:var(--accent2);cursor:pointer;white-space:nowrap;">→ Coach</button>` : ''}
          </div>
          ${topMissed ? `<div style="font-size:10px;color:var(--text3);margin-top:6px;">Most missed: ${topMissed}</div>` : ''}
        </div>`;
      }).join('');
    }
  }
}

function getStaffMetrics(name, job, yr) {
  const log = (state.absenceLog[name] || []).filter(e => new Date(e.date + 'T12:00:00').getFullYear() === yr);
  const callouts = log.filter(e => e.type !== 'tardy' && e.type !== 'TARDY').length;
  const tardies  = log.filter(e => e.type === 'tardy'  || e.type === 'TARDY').length;
  const writeUps = log.filter(e => e.writeUp).length;
  let scanPct = null, painPct = null;
  if (job === 'RN' || job === 'LPN') {
    let tS = 0, tST = 0, tP = 0, tPT = 0;
    for (let mo = 1; mo <= 12; mo++) {
      const k = yr + '-' + String(mo).padStart(2, '0');
      const q = ((state.qualityData[name] || {})[k]) || {};
      tS += q.scans || 0; tST += q.scanTotal || 0;
      tP += q.pain  || 0; tPT += q.painTotal || 0;
    }
    if (tST > 0) scanPct = Math.round(tS / tST * 100);
    if (tPT > 0) painPct = Math.round(tP / tPT * 100);
  }
  const si = (state.staffIncidents || {})[name] || {};
  const filterYr = arr => (arr || []).filter(e => new Date(e.date + 'T12:00:00').getFullYear() === yr);
  const falls = filterYr(si.falls).length;
  const hapIs = filterYr(si.hapis).length;

  const fr = getFallRoundStats(name, yr);
  const platoPct = fr.pct;
  const platoTopMissed = fr.missedList[0] ? fr.missedList[0].label : '';
  const platoRounds = fr.total;

  const hr = getHapiRoundStats(name, yr);
  const hapiPlatoPct = hr.pct;
  const hapiPlatoTopMissed = hr.missedList[0] ? hr.missedList[0].label : '';
  const hapiPlatoRounds = hr.total;

  return { callouts, tardies, writeUps, scanPct, painPct, falls, hapIs, platoPct, platoTopMissed, platoRounds, hapiPlatoPct, hapiPlatoTopMissed, hapiPlatoRounds };
}

function getStaffFlags(metrics, job) {
  const flags = [];
  if (metrics.callouts >= 3)  flags.push({ area:'Attendance', reason: `${metrics.callouts} call-outs YTD` });
  if (metrics.tardies  >= 3)  flags.push({ area:'Attendance', reason: `${metrics.tardies} tardies YTD` });
  if (metrics.falls    >  0)  flags.push({ area:'Falls',      reason: `${metrics.falls} patient fall${metrics.falls > 1 ? 's' : ''} logged` });
  if (metrics.hapIs    >  0)  flags.push({ area:'HAPI',       reason: `${metrics.hapIs} HAPI${metrics.hapIs > 1 ? 's' : ''} logged` });
  if ((job === 'RN' || job === 'LPN') && metrics.scanPct !== null && metrics.scanPct < 95)
    flags.push({ area:'Scanning', reason: `Scan compliance ${metrics.scanPct}% (goal 95%)` });
  if ((job === 'RN' || job === 'LPN') && metrics.painPct !== null && metrics.painPct < 90)
    flags.push({ area:'Pain', reason: `Pain reassessment ${metrics.painPct}% (goal 90%)` });
  if (metrics.platoPct !== null && metrics.platoPct < 90)
    flags.push({ area:'PLATO', reason: `Fall rounding compliance ${metrics.platoPct}% (goal 90%)${metrics.platoTopMissed ? ' — most missed: ' + metrics.platoTopMissed : ''}` });
  if (metrics.hapiPlatoPct !== null && metrics.hapiPlatoPct < 90)
    flags.push({ area:'HAPIPLATO', reason: `HAPI prevention rounding compliance ${metrics.hapiPlatoPct}% (goal 90%)${metrics.hapiPlatoTopMissed ? ' — most missed: ' + metrics.hapiPlatoTopMissed : ''}` });
  return flags;
}

function toggleAreaPill(chk) {
  const pill = chk.closest('.coach-area-pill');
  if (pill) pill.classList.toggle('checked', chk.checked);
}

function setCoachAreaChecked(area, checked) {
  const chk = document.getElementById('coach-area-' + area);
  if (chk) { chk.checked = checked; toggleAreaPill(chk); }
}

function getCheckedCoachAreas() {
  return Array.from(document.querySelectorAll('.coach-area-chk:checked')).map(c => c.value);
}

// Suggested observation/action-plan text per coaching area, informed by the
// staff member's current metrics where relevant. Used by the "💡 Suggest"
// button in the coaching modal — never auto-applied without a click.
const COACH_AREA_SUGGESTIONS = {
  Attendance:    { observation: m => `Attendance record shows ${m.callouts} call-out${m.callouts===1?'':'s'} and ${m.tardies} tardy occurrence${m.tardies===1?'':'s'} year-to-date.`,
                   plan: `Reviewed attendance policy and trigger points together. Employee will notify charge/manager per policy timeframe for any future absence. Re-check attendance record in 30 days.` },
  Falls:         { observation: m => `${m.falls} patient fall${m.falls===1?'':'s'} logged under this staff member's care this year.`,
                   plan: `Reviewed fall risk assessment and hourly rounding expectations. Re-education on bed alarm and fall precautions completed. Will follow up on next assigned high-risk patient.` },
  HAPI:          { observation: m => `${m.hapIs} hospital-acquired pressure injury event${m.hapIs===1?'':'s'} logged this year.`,
                   plan: `Reviewed skin assessment and turning/repositioning protocol. Re-education on Braden scale documentation and skin rounds provided.` },
  Scanning:      { observation: m => `BCMA scanning compliance at ${m.scanPct!==null?m.scanPct+'%':'no data on file'} against the unit goal of 95%.`,
                   plan: `Reviewed 5 rights / 2 identifier scanning workflow and discussed barriers to bedside scanning. Will re-audit scan log next month.` },
  Pain:          { observation: m => `Pain reassessment compliance at ${m.painPct!==null?m.painPct+'%':'no data on file'} against the unit goal of 90%.`,
                   plan: `Reviewed 30/60-minute post-intervention reassessment requirement and documentation timing in Epic. Will re-check compliance at next audit cycle.` },
  PLATO:         { observation: m => `Fall rounding (PLATO) compliance at ${m.platoPct!==null?m.platoPct+'%':'no data on file'} against the unit goal of 90% across ${m.platoRounds||0} audited round${m.platoRounds===1?'':'s'} this year.${m.platoTopMissed?' Most frequently missed element: '+m.platoTopMissed+'.':''}`,
                   plan: `Reviewed hourly rounding expectations and the specific fall-prevention elements most often missed on audit. Will re-audit rounds next cycle.` },
  HAPIPLATO:     { observation: m => `HAPI prevention rounding (PLATO) compliance at ${m.hapiPlatoPct!==null?m.hapiPlatoPct+'%':'no data on file'} against the unit goal of 90% across ${m.hapiPlatoRounds||0} audited round${m.hapiPlatoRounds===1?'':'s'} this year.${m.hapiPlatoTopMissed?' Most frequently missed element: '+m.hapiPlatoTopMissed+'.':''}`,
                   plan: `Reviewed pressure-injury prevention rounding expectations (offloading, positioning, HOB, specialty surfaces) and the elements most often missed on audit. Will re-audit rounds next cycle.` },
  Transfusion:   { observation: () => `Blood transfusion process deviation identified.`,
                   plan: `Reviewed two-person verification and transfusion monitoring requirements. Re-education completed.` },
  Documentation: { observation: () => `Documentation gaps identified during chart review.`,
                   plan: `Reviewed charting expectations and timeliness standards. Will spot-check documentation over the next two weeks.` },
  Communication: { observation: () => `Communication concern identified (handoff, team, or patient/family interaction).`,
                   plan: `Reviewed SBAR/handoff expectations and professional communication standards. Will observe next shift handoff.` },
  Conduct:       { observation: m => `${m.writeUps>0?m.writeUps+' write-up'+(m.writeUps===1?'':'s')+' on file. ':''}Professional conduct concern discussed.`,
                   plan: `Reviewed expectations outlined in policy. Employee acknowledged understanding. Progressive discipline steps explained if pattern continues.` },
  Clinical:      { observation: () => `Clinical performance concern identified.`,
                   plan: `Reviewed clinical expectations and available competency resources. Scheduled skills validation/precepting as needed.` },
  Other:         { observation: () => `Performance concern discussed.`,
                   plan: `Expectations reviewed and agreed upon together. Follow-up scheduled to reassess.` },
};

function applyCoachSuggestions() {
  const areas = getCheckedCoachAreas();
  if (!areas.length) { alert('Select at least one coaching area first.'); return; }
  const name = document.getElementById('coach-m-name')?.value || '';
  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || 'RN';
  const yr  = parseInt(document.getElementById('coach-year')?.value) || new Date().getFullYear();
  const metrics = getStaffMetrics(name, job, yr);
  const obsLines = [], planLines = [];
  areas.forEach(a => {
    const cfg = COACH_AREA_SUGGESTIONS[a] || COACH_AREA_SUGGESTIONS.Other;
    obsLines.push(typeof cfg.observation === 'function' ? cfg.observation(metrics) : cfg.observation);
    planLines.push(typeof cfg.plan === 'function' ? cfg.plan(metrics) : cfg.plan);
  });
  const notesEl = document.getElementById('coach-m-notes');
  const planEl  = document.getElementById('coach-m-plan');
  if (notesEl) notesEl.value = obsLines.join(' ');
  if (planEl)  planEl.value  = [...new Set(planLines)].join(' ');
}

function populateCoachAreaMetrics(name, job, yr) {
  const metrics = getStaffMetrics(name, job, yr);
  const yrEl = document.getElementById('coach-m-kpi-year');
  if (yrEl) yrEl.textContent = yr + (yr === new Date().getFullYear() ? ' (YTD)' : '');

  let txCount = 0;
  for (let mo = 1; mo <= 12; mo++) {
    const k = yr + '-' + String(mo).padStart(2, '0');
    const q = ((state.qualityData[name] || {})[k]) || {};
    txCount += q.transfusions || 0;
  }

  const set = (area, text, cls) => {
    const el = document.getElementById('coach-area-metric-' + area);
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('warn', 'ok');
    if (cls) el.classList.add(cls);
  };

  set('Attendance', `${metrics.callouts}CO · ${metrics.tardies}T`, (metrics.callouts >= 3 || metrics.tardies >= 3) ? 'warn' : 'ok');
  set('Falls', `${metrics.falls} YTD`, metrics.falls > 0 ? 'warn' : 'ok');
  set('HAPI',  `${metrics.hapIs} YTD`, metrics.hapIs > 0 ? 'warn' : 'ok');
  if (job === 'RN' || job === 'LPN') {
    set('Scanning', metrics.scanPct !== null ? metrics.scanPct + '%' : '—', metrics.scanPct !== null ? (metrics.scanPct < 95 ? 'warn' : 'ok') : '');
    set('Pain',     metrics.painPct !== null ? metrics.painPct + '%' : '—', metrics.painPct !== null ? (metrics.painPct < 90 ? 'warn' : 'ok') : '');
  } else {
    set('Scanning', '', ''); set('Pain', '', '');
  }
  set('Transfusion', txCount > 0 ? txCount + ' YTD' : '', '');
  set('Conduct', metrics.writeUps > 0 ? metrics.writeUps + ' write-up' + (metrics.writeUps === 1 ? '' : 's') : '', metrics.writeUps > 0 ? 'warn' : '');
  set('PLATO', metrics.platoPct !== null ? metrics.platoPct + '% (' + metrics.platoRounds + ' rounds)' : '—', metrics.platoPct !== null ? (metrics.platoPct < 90 ? 'warn' : 'ok') : '');
  set('HAPIPLATO', metrics.hapiPlatoPct !== null ? metrics.hapiPlatoPct + '% (' + metrics.hapiPlatoRounds + ' rounds)' : '—', metrics.hapiPlatoPct !== null ? (metrics.hapiPlatoPct < 90 ? 'warn' : 'ok') : '');
  // Documentation, Communication, Clinical, Other have no single quantifiable KPI tracked — left blank
  set('Documentation', ''); set('Communication', ''); set('Clinical', ''); set('Other', '');
}

function openCoachModal(name, existingId) {
  const m = document.getElementById('coach-modal'); if (!m) return;
  m.style.display = 'flex';
  document.getElementById('coach-m-name').value = name;
  document.getElementById('coach-m-id').value   = existingId || '';
  document.getElementById('coach-modal-title').textContent = existingId ? 'Edit Coaching Session' : 'Add Coaching Session';
  document.getElementById('coach-modal-sub').textContent   = name;
  document.querySelectorAll('.coach-area-chk').forEach(c => setCoachAreaChecked(c.value, false));

  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || 'RN';
  let yr = parseInt(document.getElementById('coach-year')?.value) || new Date().getFullYear();

  if (existingId) {
    const session = ((state.coaching || {})[name] || []).find(s => s.id === existingId);
    if (session) {
      if (session.date) { const dYr = new Date(session.date + 'T12:00:00').getFullYear(); if (!isNaN(dYr)) yr = dYr; }
      populateCoachAreaMetrics(name, job, yr);
      document.getElementById('coach-m-date').value    = session.date    || '';
      const areas = (session.areas && session.areas.length) ? session.areas : (session.area ? [session.area] : ['Attendance']);
      areas.forEach(a => setCoachAreaChecked(a, true));
      document.getElementById('coach-m-notes').value   = session.notes   || '';
      document.getElementById('coach-m-plan').value    = session.plan    || '';
      document.getElementById('coach-m-followup').value= session.followUp|| '';
      document.getElementById('coach-m-status').value  = session.status  || 'Active';
      return;
    }
  }
  populateCoachAreaMetrics(name, job, yr);
  document.getElementById('coach-m-date').value    = new Date().toISOString().split('T')[0];
  document.getElementById('coach-m-followup').value = '';
  ['coach-m-notes','coach-m-plan'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
}

function closeCoachModal() { const m = document.getElementById('coach-modal'); if (m) m.style.display = 'none'; }

function saveCoachSession() {
  const name = document.getElementById('coach-m-name')?.value || '';
  if (!name) return;
  const editId = document.getElementById('coach-m-id')?.value || '';
  let areas = getCheckedCoachAreas();
  if (!areas.length) areas = ['Other'];
  const session = {
    id:       editId || 'coach_' + Date.now(),
    date:     document.getElementById('coach-m-date')?.value    || '',
    areas:    areas,
    area:     areas[0], // kept for backward compatibility with older records/readers
    notes:    document.getElementById('coach-m-notes')?.value   || '',
    plan:     document.getElementById('coach-m-plan')?.value    || '',
    followUp: document.getElementById('coach-m-followup')?.value|| '',
    status:   document.getElementById('coach-m-status')?.value  || 'Active',
    ts: Date.now(),
  };
  if (!state.coaching) state.coaching = {};
  if (!state.coaching[name]) state.coaching[name] = [];
  if (editId) {
    const idx = state.coaching[name].findIndex(s => s.id === editId);
    if (idx >= 0) state.coaching[name][idx] = session; else state.coaching[name].unshift(session);
  } else {
    state.coaching[name].unshift(session);
  }
  persistSave(); closeCoachModal(); renderCoaching();
}

function deleteCoachSession(name, id) {
  if (!confirm('Delete this coaching session?')) return;
  state.coaching[name] = (state.coaching[name] || []).filter(s => s.id !== id);
  persistSave(); renderCoaching();
}

const COACH_PRINT_STYLES = '@page{size:letter;margin:0.85in}'
  + 'body{font-family:Arial,sans-serif;font-size:11px;color:#222;margin:0}'
  + '.hb{background:#1e3a5f;color:white;padding:14px 20px;border-radius:6px;margin-bottom:18px}'
  + '.hb h1{font-size:18px;margin:0 0 2px}.hb .sub{font-size:11px;opacity:.75}'
  + '.ig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px}'
  + '.ib{border:1px solid #ddd;border-radius:5px;padding:8px 12px}'
  + '.ib .l{font-size:9px;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-bottom:2px}'
  + '.ib .v{font-size:13px;font-weight:700;color:#1e3a5f}'
  + 'h2{font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin:16px 0 10px;text-transform:uppercase;letter-spacing:.04em}'
  + '.box{border:1px solid #ddd;border-radius:5px;padding:10px 12px;font-size:11px;color:#333;min-height:44px;white-space:pre-wrap;margin-bottom:14px;}'
  + '.sr{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}'
  + '.sb .l{font-size:9px;text-transform:uppercase;color:#888;margin-bottom:4px}'
  + '.sb .ln{border-bottom:1px solid #555;height:28px}'
  + '@media print{.np{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

function coachPrintDate(v) {
  return v ? new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—';
}

// Print the coaching session currently open in the modal (including unsaved edits)
function printCoachSession() {
  const name = document.getElementById('coach-m-name')?.value || '';
  if (!name) return;
  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || '';
  const areas    = getCheckedCoachAreas();
  const dateVal  = document.getElementById('coach-m-date')?.value || '';
  const status   = document.getElementById('coach-m-status')?.value || '';
  const followUp = document.getElementById('coach-m-followup')?.value || '';
  const notes = (document.getElementById('coach-m-notes')?.value || '').replace(/</g, '&lt;');
  const plan  = (document.getElementById('coach-m-plan')?.value  || '').replace(/</g, '&lt;');

  const areaRows = areas.length ? areas.map(a => {
    const cfg = COACH_AREA_CFG[a] || COACH_AREA_CFG.Other;
    const metricEl = document.getElementById('coach-area-metric-' + a);
    const metricTxt = metricEl ? metricEl.textContent.trim() : '';
    return '<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #ddd;border-radius:5px;padding:7px 10px;margin-bottom:6px;">'
      + '<span style="font-size:12px;font-weight:700;color:#1e3a5f;">' + cfg.icon + ' ' + a + '</span>'
      + (metricTxt ? '<span style="font-size:11px;color:#555;">' + metricTxt + '</span>' : '')
      + '</div>';
  }).join('') : '<div style="font-size:11px;color:#888;">No areas selected</div>';

  const html = '<!DOCTYPE html><html><head><title>Coaching Session — ' + name + '</title><style>' + COACH_PRINT_STYLES + '</style></head><body>'
    + '<div class="np" style="text-align:center;padding:10px;background:#f0f4f8;margin-bottom:16px;">'
    + '<button onclick="window.print()" style="padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Print / Save PDF</button></div>'
    + '<div class="hb"><h1>Staff Coaching Session</h1><div class="sub">3B Tele Med-Surg / 3C · Arnot Ogden Medical Center</div></div>'
    + '<div class="ig">'
    + '<div class="ib"><div class="l">Staff Name</div><div class="v">' + name + '</div></div>'
    + '<div class="ib"><div class="l">Role</div><div class="v">' + (job || '—') + '</div></div>'
    + '<div class="ib"><div class="l">Session Date</div><div class="v">' + coachPrintDate(dateVal) + '</div></div>'
    + '<div class="ib"><div class="l">Status</div><div class="v">' + (status || '—') + '</div></div>'
    + '<div class="ib"><div class="l">Follow-Up Date</div><div class="v">' + coachPrintDate(followUp) + '</div></div>'
    + '<div class="ib"><div class="l">Printed</div><div class="v">' + new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + '</div></div>'
    + '</div>'
    + '<h2>Coaching Area(s)</h2>' + areaRows
    + '<h2>Observation / Notes</h2><div class="box">' + (notes || '—') + '</div>'
    + '<h2>Action Plan / Expectation Set</h2><div class="box">' + (plan || '—') + '</div>'
    + '<div class="sr">'
    + '<div class="sb"><div class="l">Leader Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Leader Signature / Date</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Employee Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Employee Signature / Date</div><div class="ln"></div></div>'
    + '</div></body></html>';

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// Print a staff member's full logged coaching history
function printCoachHistory(name) {
  const staffRec = MASTER_STAFF.find(s => s.name === name);
  const job = staffRec?.job || '';
  const sessions = ((state.coaching || {})[name] || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const rows = sessions.length ? sessions.map(sess => {
    const sessAreas = (sess.areas && sess.areas.length) ? sess.areas : (sess.area ? [sess.area] : ['Other']);
    const areaLabel = sessAreas.map(a => (COACH_AREA_CFG[a] || COACH_AREA_CFG.Other).icon + ' ' + a).join(', ');
    return '<div style="border:1px solid #ddd;border-radius:6px;padding:10px 12px;margin-bottom:10px;break-inside:avoid;">'
      + '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px;">'
      + '<span style="font-size:12px;font-weight:700;color:#1e3a5f;">' + areaLabel + '</span>'
      + '<span style="font-size:10px;color:#555;">' + coachPrintDate(sess.date) + (sess.status ? ' · ' + sess.status : '') + '</span>'
      + '</div>'
      + (sess.notes ? '<div style="font-size:10px;color:#333;margin-bottom:4px;"><strong>Observation:</strong> ' + sess.notes.replace(/</g, '&lt;') + '</div>' : '')
      + (sess.plan  ? '<div style="font-size:10px;color:#333;margin-bottom:4px;"><strong>Action Plan:</strong> ' + sess.plan.replace(/</g, '&lt;') + '</div>' : '')
      + (sess.followUp ? '<div style="font-size:9px;color:#888;">Follow-up: ' + coachPrintDate(sess.followUp) + '</div>' : '')
      + '</div>';
  }).join('') : '<div style="font-size:11px;color:#888;">No coaching sessions logged.</div>';

  const html = '<!DOCTYPE html><html><head><title>Coaching History — ' + name + '</title><style>' + COACH_PRINT_STYLES + '</style></head><body>'
    + '<div class="np" style="text-align:center;padding:10px;background:#f0f4f8;margin-bottom:16px;">'
    + '<button onclick="window.print()" style="padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Print / Save PDF</button></div>'
    + '<div class="hb"><h1>Coaching History</h1><div class="sub">3B Tele Med-Surg / 3C · Arnot Ogden Medical Center</div></div>'
    + '<div class="ig">'
    + '<div class="ib"><div class="l">Staff Name</div><div class="v">' + name + '</div></div>'
    + '<div class="ib"><div class="l">Role</div><div class="v">' + (job || '—') + '</div></div>'
    + '<div class="ib"><div class="l">Sessions on File</div><div class="v">' + sessions.length + '</div></div>'
    + '</div>'
    + '<h2>Session Log</h2>' + rows
    + '<div class="sr">'
    + '<div class="sb"><div class="l">Leader Name (Print)</div><div class="ln"></div></div>'
    + '<div class="sb"><div class="l">Leader Signature / Date</div><div class="ln"></div></div>'
    + '</div></body></html>';

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// Build auto-suggestions from all available data across tabs
function buildCoachingSuggestions(name, job, yr, metrics) {
  const suggestions = [];

  // Quality tab — scan and pain (already in flags if below threshold but suggest milder warnings too)
  if ((job === 'RN' || job === 'LPN') && metrics.scanPct !== null && metrics.scanPct >= 95 && metrics.scanPct < 98) {
    suggestions.push({ area:'Scanning', icon:'💊', reason:`Scan rate ${metrics.scanPct}% — near goal (95%). Reinforce before it dips.` });
  }
  if ((job === 'RN' || job === 'LPN') && metrics.painPct !== null && metrics.painPct >= 90 && metrics.painPct < 93) {
    suggestions.push({ area:'Pain', icon:'💔', reason:`Pain reassessment ${metrics.painPct}% — just above goal (90%). Monitor closely.` });
  }
  if (metrics.platoPct !== null && metrics.platoPct >= 90 && metrics.platoPct < 93) {
    suggestions.push({ area:'PLATO', icon:'🔄', reason:`Fall rounding compliance ${metrics.platoPct}% — just above goal (90%).${metrics.platoTopMissed ? ' Most frequently missed: ' + metrics.platoTopMissed + '.' : ''}` });
  }

  // Incidents tab — missed barcode scans or pain reassessment events logged
  const si = (state.staffIncidents || {})[name] || {};
  const filterYr = arr => (arr || []).filter(e => new Date(e.date+'T12:00:00').getFullYear() === yr);
  const scannEvents = filterYr(si.scanning).length;
  const painEvents  = filterYr(si.painReassess).length;
  if (scannEvents > 0) suggestions.push({ area:'Scanning', icon:'💊', reason:`${scannEvents} missed scan event${scannEvents>1?'s':''} logged in Incidents tab.` });
  if (painEvents  > 0) suggestions.push({ area:'Pain',     icon:'💔', reason:`${painEvents} pain reassessment event${painEvents>1?'s':''} logged in Incidents tab.` });

  // Absence tab — single callout or tardy before threshold
  if (metrics.callouts === 2) suggestions.push({ area:'Attendance', icon:'📅', reason:`2 call-outs YTD — proactive conversation before triggering attendance policy.` });
  if (metrics.tardies  === 2) suggestions.push({ area:'Attendance', icon:'📅', reason:`2 tardies YTD — early coaching before pattern escalates.` });

  // Write-ups from absence log
  const writeUps = (state.absenceLog[name] || []).filter(e => e.writeUp && new Date(e.date+'T12:00:00').getFullYear()===yr).length;
  if (writeUps > 0) suggestions.push({ area:'Conduct', icon:'✍️', reason:`${writeUps} write-up${writeUps>1?'s':''} on file — follow-up coaching conversation recommended.` });

  // Competency tab — staff with incomplete competencies
  const compSkills = allCompSkills(job==='CA'?'CA':'RN');
  const incomplete = compSkills.filter(sk => {
    const v = ((state.competency||{})[name]||{})[sk.key];
    return !(v && v.passed && v.yr === yr);
  });
  if (incomplete.length > 0) {
    const critCerts = incomplete.filter(s => s.section === 'Certifications');
    if (critCerts.length > 0) suggestions.push({ area:'Clinical', icon:'🩺', reason:`${critCerts.length} cert${critCerts.length>1?'s':''} not yet validated: ${critCerts.map(s=>s.label).slice(0,2).join(', ')}${critCerts.length>2?'…':''}` });
  }

  // Recognition — positive note: high recognition can surface high performers worth developing
  const recCount = (state.recognition||[]).filter(r=>r.name===name && new Date((r.date||'2000-01-01')+'T12:00:00').getFullYear()===yr).length;
  if (recCount >= 3) suggestions.push({ area:'Clinical', icon:'🏆', reason:`${recCount} recognitions this year — consider for preceptor, charge, or leadership development.` });

  // Orientation flag — if still on orientation, coaching may be orientation-driven
  if (state.empOrientation && state.empOrientation[name]) {
    suggestions.push({ area:'Clinical', icon:'🎓', reason:`Currently on orientation — weekly preceptor coaching check-in recommended.` });
  }

  // Coaching sessions — if last active session is old (>60 days) and status was "Active"
  const sessions = (state.coaching||{})[name]||[];
  const lastActive = sessions.filter(s=>s.status==='Active').sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (lastActive) {
    const daysSince = Math.round((new Date()-new Date(lastActive.date+'T12:00:00'))/86400000);
    if (daysSince > 60) suggestions.push({ area:lastActive.area, icon:'🔔', reason:`Active coaching plan (${lastActive.area}) — ${daysSince} days since last session. Follow-up overdue.` });
  }

  // Deduplicate by area
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.area+s.reason)) return false;
    seen.add(s.area+s.reason); return true;
  });
}

function renderCoaching() {
  const roleFilter = document.getElementById('coach-role')?.value  || 'ALL';
  const yr         = parseInt(document.getElementById('coach-year')?.value) || new Date().getFullYear();
  const statusFilt = document.getElementById('coach-filter')?.value || 'ALL';
  const el = document.getElementById('coach-grid'); if (!el) return;

  let staffList = MASTER_STAFF.filter(s => roleFilter === 'ALL' || s.job === roleFilter);

  const staffData = staffList.map(s => {
    const metrics = getStaffMetrics(s.name, s.job, yr);
    const flags   = getStaffFlags(metrics, s.job);
    const sessions = (state.coaching || {})[s.name] || [];
    // Build auto-suggestions from all available data
    const suggestions = buildCoachingSuggestions(s.name, s.job, yr, metrics);
    return { ...s, metrics, flags, sessions, suggestions };
  });

  let display = staffData;
  if (statusFilt === 'needs')   display = display.filter(s => s.flags.length > 0 || s.suggestions.length > 0);
  if (statusFilt === 'coached') display = display.filter(s => s.sessions.length > 0);

  display.sort((a, b) => (b.flags.length + b.suggestions.length) - (a.flags.length + a.suggestions.length) || a.name.localeCompare(b.name));

  if (!display.length) { el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);">No staff match filter</div>'; return; }

  const statusColors = { Active:'var(--red2)', Improving:'var(--amber2)', Resolved:'var(--green2)' };

  el.innerHTML = display.map(s => {
    const rCol = IV_ROLE_COLOR[s.job] || 'var(--text2)';
    const initials = s.name.split(',').map(p => p.trim()[0] || '').join('');
    const m = s.metrics;
    const hasIssues = s.flags.length > 0 || s.suggestions.length > 0;

    const metricPills = [
      { label:`${m.callouts}CO`, warn:m.callouts>=3, title:'Call-outs' },
      { label:`${m.tardies}T`,   warn:m.tardies>=3,  title:'Tardies'   },
      { label:`${m.falls}F`,     warn:m.falls>0,     title:'Falls'     },
      { label:`${m.hapIs}H`,     warn:m.hapIs>0,     title:'HAPIs'     },
      ...(s.job==='RN'||s.job==='LPN' ? [
        { label:m.scanPct!==null?m.scanPct+'%S':'—S', warn:m.scanPct!==null&&m.scanPct<95, title:'Med Scanning' },
        { label:m.painPct!==null?m.painPct+'%P':'—P', warn:m.painPct!==null&&m.painPct<90, title:'Pain Reassess' },
      ] : []),
      ...(m.platoPct!==null ? [
        { label:m.platoPct+'%R', warn:m.platoPct<90, title:'Fall Rounding (PLATO) — '+m.platoRounds+' audited rounds' },
      ] : []),
    ].map(p => `<span title="${p.title}" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;${p.warn?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${p.label}</span>`).join('');

    const flagsHtml = s.flags.length > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
      ${s.flags.map(f => {
        const cfg = COACH_AREA_CFG[f.area] || COACH_AREA_CFG.Other;
        return `<span style="font-size:10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:5px;padding:2px 8px;color:var(--red2);">${cfg.icon} ${f.area}: ${f.reason}</span>`;
      }).join('')}
    </div>` : '';

    // Auto-suggestions (yellow, less severe than red flags)
    const suggestHtml = s.suggestions.length > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
      <span style="font-size:9px;color:var(--text3);align-self:center;">💡 Suggested:</span>
      ${s.suggestions.map(sg => `<button onclick="openCoachModal('${s.name.replace(/'/g,"\\'")}','');setCoachAreaChecked('${sg.area}',true);document.getElementById('coach-m-notes').value='${sg.reason.replace(/'/g,"\\'")}'"
        style="font-size:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:5px;padding:2px 8px;color:var(--amber2);cursor:pointer;" title="Click to open coaching session pre-filled">
        ${sg.icon} ${sg.area}
      </button>`).join('')}
    </div>` : '';

    const sessionsHtml = s.sessions.length > 0 ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
      ${s.sessions.slice(0, 3).map(sess => {
        const sessAreas = (sess.areas && sess.areas.length) ? sess.areas : (sess.area ? [sess.area] : ['Other']);
        const areaBadges = sessAreas.map(a => {
          const c = COACH_AREA_CFG[a] || COACH_AREA_CFG.Other;
          return `<span style="font-size:11px;" title="${a}">${c.icon}</span><span style="font-size:11px;font-weight:700;color:var(--white);">${a}</span>`;
        }).join('<span style="color:var(--text3);font-size:10px;">·</span>');
        const sc  = statusColors[sess.status] || 'var(--text3)';
        const dateStr = sess.date ? new Date(sess.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:4px;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              ${areaBadges}
              <span style="font-size:9px;color:${sc};background:${sc}22;border-radius:8px;padding:1px 6px;">${sess.status}</span>
              <span style="font-size:10px;color:var(--text3);">${dateStr}</span>
            </div>
            <div style="display:flex;gap:4px;">
              <button onclick="openCoachModal('${s.name.replace(/'/g,"\\'")}','${sess.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--white)'" onmouseout="this.style.color='var(--text3)'">✎</button>
              <button onclick="deleteCoachSession('${s.name.replace(/'/g,"\\'")}','${sess.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--red2)'" onmouseout="this.style.color='var(--text3)'">✕</button>
            </div>
          </div>
          ${sess.notes ? `<div style="font-size:10px;color:var(--text2);margin-bottom:3px;">${sess.notes.slice(0,120)}${sess.notes.length>120?'…':''}</div>` : ''}
          ${sess.plan  ? `<div style="font-size:10px;color:var(--teal2);">→ ${sess.plan.slice(0,100)}${sess.plan.length>100?'…':''}</div>` : ''}
          ${sess.followUp ? `<div style="font-size:9px;color:var(--text3);margin-top:2px;">Follow-up: ${sess.followUp}</div>` : ''}
        </div>`;
      }).join('')}
      ${s.sessions.length > 3 ? `<div style="font-size:10px;color:var(--text3);text-align:center;">${s.sessions.length - 3} more session${s.sessions.length-3>1?'s':''}</div>` : ''}
    </div>` : '';

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${hasIssues?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${s.flags.length>0?'var(--red2)':s.suggestions.length>0?'var(--amber2)':'var(--border)'};border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="width:36px;height:36px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${s.name}</div>
          <div style="font-size:10px;color:${rCol};">${s.job}${s.sessions.length>0?` · ${s.sessions.length} session${s.sessions.length>1?'s':''} logged`:''}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">${metricPills}</div>
        <button onclick="openCoachModal('${s.name.replace(/'/g,"\\'")}','')"
          style="font-size:11px;padding:4px 12px;background:${s.flags.length?'rgba(239,68,68,0.1)':'rgba(46,125,209,0.1)'};border:1px solid ${s.flags.length?'rgba(239,68,68,0.35)':'rgba(46,125,209,0.3)'};border-radius:5px;color:${s.flags.length?'var(--red2)':'var(--accent2)'};cursor:pointer;white-space:nowrap;">
          ${s.sessions.length ? '+ Session' : '+ Coach'}
        </button>
        ${s.sessions.length > 0 ? `<button onclick="printCoachHistory('${s.name.replace(/'/g,"\\'")}')" title="Print full coaching history"
          style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:5px;color:var(--text2);cursor:pointer;white-space:nowrap;">🖨</button>` : ''}
      </div>
      ${flagsHtml}
      ${suggestHtml}
      ${sessionsHtml}
    </div>`;
  }).join('');
}

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
      <div style="font-size:10px;color:var(--text3);">${label}</div>
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
      <span title="BCMA Scanning" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;${s.scanFail?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${scanLabel}</span>
      <span title="Pain Reassessment" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;${s.painFail?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${painLabel}</span>
      <span title="Fall Rounding (PLATO)" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;${s.platoFail?'background:rgba(239,68,68,0.12);color:var(--red2);border:1px solid rgba(239,68,68,0.3);':'background:rgba(255,255,255,0.05);color:var(--text3);border:1px solid rgba(255,255,255,0.08);'}">${platoLabel}</span>`;

    const reasons = [];
    if (s.scanFail) reasons.push(`BAMA ${s.q.scanPct}% (goal &gt;${MFU_SCAN_TARGET}%)`);
    if (s.painFail) reasons.push(`Pain reassessment ${s.q.painPct}% (goal ≥${MFU_PAIN_TARGET}%)`);
    if (s.platoFail) reasons.push(`PLATO fall rounding ${s.plato.pct}% (goal ≥${MFU_PLATO_TARGET}%)${s.plato.missedList[0] ? ' — most missed: ' + s.plato.missedList[0].label : ''}`);
    const reasonHtml = reasons.length ? `<div style="font-size:10px;color:var(--red2);margin-top:6px;">⚠ ${reasons.join(' · ')}</div>` : '';

    const rec = s.record;
    const recHtml = rec ? `<div style="margin-top:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="font-size:9px;color:${statusColors[rec.status]||'var(--text3)'};background:${(statusColors[rec.status]||'var(--text3)')}22;border-radius:8px;padding:1px 6px;">${rec.status}</span>
        ${rec.date ? `<span style="font-size:10px;color:var(--text3);">${new Date(rec.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>` : ''}
      </div>
      ${rec.notes ? `<div style="font-size:10px;color:var(--text2);">${rec.notes.slice(0,160)}${rec.notes.length>160?'…':''}</div>` : ''}
    </div>` : '';

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${s.flagged?'rgba(239,68,68,0.3)':'var(--border)'};border-left:3px solid ${s.flagged?'var(--red2)':'var(--border)'};border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="width:36px;height:36px;border-radius:50%;background:${rCol};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${s.name}</div>
          <div style="font-size:10px;color:${rCol};">${s.job}</div>
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
          <span style="font-size:9px;color:${col};margin-left:5px;">${s.job}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:9px;color:var(--amber2);">Pending</span>
          <button onclick="managerSignFor('${p.id}','${s.name.replace(/'/g,"\\'")}','${s.job}')"
            style="font-size:9px;padding:2px 7px;background:rgba(37,168,104,0.12);border:1px solid rgba(37,168,104,0.3);border-radius:3px;color:var(--green2);cursor:pointer;">
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
          <span style="font-size:10px;color:var(--text3);text-decoration:line-through;">${s.name}</span>
          <span style="font-size:9px;color:${col};margin-left:4px;">${s.job}</span>
        </div>
        <span style="font-size:9px;color:var(--green2);">✓ ${dateStr}</span>
      </div>`;
    }).join('');

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${pending.length>0?'rgba(245,158,11,0.3)':'rgba(37,168,104,0.3)'};border-left:3px solid ${pending.length>0?'var(--amber2)':'var(--green2)'};border-radius:10px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <span style="font-size:22px;">${cfg.icon}</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${p.title}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">${p.category} · Effective: ${p.effectiveDate || '—'} · Required: ${p.roles==='ALL'?'All Staff':p.roles}</div>
        </div>
        <div style="text-align:right;min-width:60px;">
          <div style="font-size:22px;font-weight:700;color:${barColor};">${pct}%</div>
          <div style="font-size:9px;color:var(--text3);">${done.length}/${staff.length} signed</div>
        </div>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;margin-bottom:12px;">
        <div style="height:4px;background:${barColor};width:${pct}%;border-radius:2px;transition:width .5s;"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--amber2);margin-bottom:6px;">⏳ Pending (${pending.length})</div>
          ${pending.length ? pendingRows : '<div style="font-size:10px;color:var(--green2);">✅ All staff signed!</div>'}
          ${pending.length > 8 ? `<div style="font-size:9px;color:var(--text3);margin-top:4px;">+${pending.length-8} more</div>` : ''}
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--green2);margin-bottom:6px;">✅ Signed (${done.length})</div>
          ${done.length ? doneRows : '<div style="font-size:10px;color:var(--text3);">None yet</div>'}
          ${done.length > 5 ? `<div style="font-size:9px;color:var(--text3);margin-top:4px;">+${done.length-5} more</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button onclick="printSignOffSheet('${p.id}')" style="font-size:10px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">🖨 Print Sign-Off Sheet</button>
        <button onclick="exportPolicySignoffs('${p.id}')" style="font-size:10px;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">📥 Export CSV</button>
        ${pending.length > 0 ? `<button onclick="sendPolicyToPhones('${p.id}')" style="font-size:10px;padding:4px 10px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:var(--purple2);cursor:pointer;font-weight:700;">📱 Send to Phones (${pending.length})</button>` : ''}
        ${pending.length > 0 ? `<button onclick="remindAllPending('${p.id}')" style="font-size:10px;padding:4px 10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:4px;color:var(--amber2);cursor:pointer;">📣 Remind Pending</button>` : ''}
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
        <span style="font-size:9px;color:${rCol};margin-left:5px;">${m.job}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${hasPh
          ? `<span style="font-size:10px;color:var(--text3);">${m.phone.replace(/(\d{3})(\d{3})(\d{4})/,'($1) $2-$3')}</span>
             <a href="${smsUrl}" style="font-size:10px;padding:3px 10px;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:var(--purple2);text-decoration:none;font-weight:700;">💬 Text</a>`
          : `<span style="font-size:10px;color:var(--red2);">No phone on file</span>`
        }
        <button onclick="managerSignFor('${policyId}','${m.name.replace(/'/g,"\\'")}','${m.job}')" style="font-size:10px;padding:3px 10px;background:rgba(37,168,104,0.12);border:1px solid rgba(37,168,104,0.3);border-radius:4px;color:var(--green2);cursor:pointer;">✓ Mark Signed</button>
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
    <div style="font-size:10px;color:var(--text3);margin-bottom:14px;">${pending.length} staff need to sign</div>

    <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:8px;padding:12px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--purple2);margin-bottom:6px;">📋 How to send:</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.8;">
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
      <button onclick="navigator.clipboard.writeText(${JSON.stringify(copyAll)}).then(()=>showSaveBanner('📋 All messages copied!'))" style="font-size:10px;padding:5px 12px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:5px;color:var(--text2);cursor:pointer;">📋 Copy All Messages</button>
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
        <div style="font-size:10px;color:var(--text3);">Needs Signature</div>
      </div>
      <div style="flex:1;background:rgba(37,168,104,0.08);border:1px solid rgba(37,168,104,0.3);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:var(--green2);">${signed.length}</div>
        <div style="font-size:10px;color:var(--text3);">Completed</div>
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
            <div style="font-size:10px;color:var(--text3);">${p.category} · Effective: ${p.effectiveDate || '—'}</div>
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
          <div style="font-size:10px;color:var(--green2);">Signed: ${signDate}</div>
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
      <span style="font-size:10px;font-weight:400;color:var(--text3);margin-left:8px;">${alerts.length} staff need to sign</span>
      <a onclick="switchTab(document.querySelector('[data-panel=readsign]'))" style="font-size:10px;color:var(--accent2);cursor:pointer;margin-left:8px;text-decoration:none;">Manage →</a>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${alerts.map(a => {
        const rCol = IV_ROLE_COLOR[a.job] || 'var(--text2)';
        const last = a.name.split(',')[0];
        return `<div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:6px;padding:7px 10px;min-width:140px;">
          <div style="font-size:11px;font-weight:700;color:var(--white);">${last}</div>
          <div style="font-size:9px;color:${rCol};">${a.job}</div>
          <div style="font-size:9px;color:var(--amber2);margin-top:3px;">${a.unsigned.length} policy${a.unsigned.length>1?'s':''} unsigned</div>
          <div style="font-size:8px;color:var(--text3);margin-top:2px;">${a.unsigned.map(p=>p.title.slice(0,20)+(p.title.length>20?'…':'')).join(', ')}</div>
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
      <span style="font-size:9px;font-weight:700;color:${riskLevel.color};min-width:30px;">${riskLevel.label}</span>
      <span style="font-size:11px;color:var(--white);flex:1;">${r.name}</span>
      <span style="font-size:9px;color:${rCol};">${r.job}</span>
      <span style="font-size:9px;color:var(--text3);">${r.total} CO total</span>
      ${r.sameDow > 0 ? `<span style="font-size:9px;color:var(--amber2);">${r.sameDow}× ${dowName}</span>` : ''}
      ${r.recent > 0  ? `<span style="font-size:9px;color:var(--red2);">+${r.recent} recent</span>` : ''}
    </div>`;
  }).join('') + (risks.length > 6 ? `<div style="font-size:10px;color:var(--text3);padding-top:4px;">+${risks.length-6} more at lower risk</div>` : '');
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
      <span style="font-size:9px;font-weight:700;color:${col};min-width:100px;">${label}</span>
      <span style="font-size:11px;color:var(--white);flex:1;">${a.name}</span>
      <span style="font-size:9px;color:${rCol};">${a.job}</span>
      <span style="font-size:9px;color:var(--text3);">${a.type} ends ${dateStr}</span>
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
      c.payEligible ? `<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(37,168,104,0.15);border:1px solid rgba(37,168,104,0.35);color:var(--green2);font-weight:700;">💵 Elig</span>` : '',
      c.payGuar     ? `<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);color:var(--amber2);font-weight:700;">💰 Guar</span>` : '',
      c.payHighInc  ? `<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.35);color:var(--purple2);font-weight:700;">🏆 Hi+Inc</span>` : '',
      c.payHighCA   ? `<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3);color:var(--teal2);font-weight:700;">💵 Hi Pay</span>` : '',
    ].filter(Boolean).join('');

    // Pay toggle checkboxes on the card
    const isRNLPN = c.job === 'RN' || c.job === 'LPN';
    const isCA    = c.job === 'CA';
    const payToggles = isRNLPN ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:5px;margin-top:6px;">
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;color:var(--green2);" title="Eligible Pay">
          <input type="checkbox" ${c.payEligible?'checked':''} onchange="togglePayFlag('${safe}','empPayEligible',this.checked);findCoverage()" style="accent-color:var(--green2);cursor:pointer;width:13px;height:13px;">
          💵 Eligible
        </label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;color:var(--amber2);" title="Guaranteed High Pay">
          <input type="checkbox" ${c.payGuar?'checked':''} onchange="togglePayFlag('${safe}','empPayGuarHigh',this.checked);findCoverage()" style="accent-color:var(--amber2);cursor:pointer;width:13px;height:13px;">
          💰 Guar. High
        </label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;color:var(--purple2);" title="High Pay + Incentive">
          <input type="checkbox" ${c.payHighInc?'checked':''} onchange="togglePayFlag('${safe}','empPayHighInc',this.checked);findCoverage()" style="accent-color:var(--purple2);cursor:pointer;width:13px;height:13px;">
          🏆 Hi + Inc
        </label>
      </div>` : isCA ? `
      <div style="display:flex;gap:8px;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:5px;margin-top:6px;">
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;color:var(--teal2);" title="High Pay">
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
            <span style="font-size:9px;color:${rCol};">${c.job}</span>
            <span style="font-size:9px;color:var(--text3);">${shiftLabel}</span>
            ${c.callouts > 0 ? `<span style="font-size:9px;color:var(--amber2);">${c.callouts} CO</span>` : ''}
            ${c.isScheduled ? `<span style="font-size:9px;background:rgba(245,158,11,0.15);color:var(--amber2);border-radius:8px;padding:0 5px;">Scheduled</span>` : ''}
            ${c.hasPhone ? `<span style="font-size:9px;color:var(--green2);">📱</span>` : ''}
            ${c.hasEmail ? `<span style="font-size:9px;color:var(--accent2);">✉</span>` : ''}
            ${payBadges}
          </div>
          ${c.hasPhone ? `<div style="font-size:10px;color:var(--text3);margin-top:2px;">${state.phones[c.name]}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
          <button onclick="toggleCiSelect('${safe}')"
            style="font-size:10px;padding:5px 10px;border-radius:4px;border:1px solid;cursor:pointer;font-weight:700;white-space:nowrap;
            ${isSelected ? 'background:rgba(37,168,104,0.2);border-color:rgba(37,168,104,0.5);color:var(--green2);' : 'background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.2);color:var(--text2);'}">
            ${isSelected ? '✓ Selected' : '+ Select'}
          </button>
          ${c.hasPhone ? `<button onclick="callNow('${(state.phones[c.name]||'').replace(/\D/g,'')}')"
            style="font-size:10px;padding:4px 10px;border-radius:4px;border:1px solid rgba(37,168,104,0.3);background:rgba(37,168,104,0.08);color:var(--green2);cursor:pointer;">
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
      ${s.phone ? `<span style="font-size:10px;color:var(--green2);">📱</span>` : ''}
      ${s.email ? `<span style="font-size:10px;color:var(--accent2);">✉</span>` : ''}
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
      <span style="font-size:10px;font-weight:700;color:${rCol};min-width:28px;">${l.job}</span>
      <span style="font-size:11px;color:var(--white);flex:1;">${l.name}</span>
      <span style="font-size:10px;color:${col};font-weight:700;">${typeLabel[l.type] || l.type}</span>
      ${l.note ? `<span style="font-size:10px;color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.note}</span>` : ''}
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
  const tabs   = document.getElementById('tabs');
  const census = document.getElementById('census-bar');
  const header = document.querySelector('header');
  const headerH = (header  ? header.offsetHeight  : 0);
  const censusH = (census  ? census.offsetHeight  : 0);
  const tabsH   = (tabs    ? tabs.offsetHeight     : 0);
  const total   = headerH + censusH + tabsH;
  document.documentElement.style.setProperty('--sticky-top', total + 'px');
}



// ════════════════════════════════════
//  MANAGER HOME / DAILY COMMAND SCREEN
// ════════════════════════════════════
const MGR_MIN = { RN:6, LPN:1, CA:4 };

function mgrBoardDate() {
  const today = new Date().toISOString().split('T')[0];
  if (state.dates && state.dates.includes(today)) return today;
  return state.activeBoardDate || (state.dates && state.dates[0]) || today;
}
function mgrShiftPeople(dateKey, shiftKey, role) {
  const arr = ((state.placements||{})[dateKey]||{})[shiftKey] || [];
  return arr.filter(p => p.role === role).length;
}
function mgrCoverage(dateKey) {
  const c=(shift,role)=>mgrShiftPeople(dateKey,shift,role);
  // CA extended shifts contribute when they overlap a core CA window.
  return [
    {label:'Day', time:'0700–1430', RN:c('0700-1500','RN'), LPN:c('0700-1500','LPN'), CA:c('0630-1430','CA')+c('0630-1830','CA')},
    {label:'Eve Early', time:'1430–1830', RN:c('1500-1900','RN'), LPN:c('1500-1900','LPN'), CA:c('1430-1830','CA')+c('0630-1830','CA')+c('1430-0300','CA')},
    {label:'Eve Late', time:'1830–2230', RN:c('1900-0700','RN'), LPN:c('1900-0700','LPN'), CA:c('1830-2230','CA')+c('1430-0300','CA')+c('1830-0630','CA')},
    {label:'Night', time:'2230–0630', RN:c('1900-0700','RN'), LPN:c('1900-0700','LPN'), CA:c('2230-0630','CA')+c('1430-0300','CA')+c('1830-0630','CA')},
  ];
}
function mgrCurrentWindowIndex() {
  const n=new Date(), m=n.getHours()*60+n.getMinutes();
  if (m>=420 && m<870) return 0;      // 0700-1430
  if (m>=870 && m<1110) return 1;     // 1430-1830
  if (m>=1110 && m<1350) return 2;    // 1830-2230
  return 3;
}
function mgrCallInCount(dateKey) {
  let count=0;
  (MASTER_STAFF||[]).forEach(s=>{
    if (((state.absenceLog||{})[s.name]||[]).some(e=>e.date===dateKey && e.type!=='tardy')) count++;
  });
  return count;
}
function mgrAgencyCount(dateKey) {
  const names=new Set();
  const shifts=((state.placements||{})[dateKey]||{});
  Object.values(shifts).forEach(arr=>(arr||[]).forEach(p=>{
    const ms=(MASTER_STAFF||[]).find(s=>s.name===p.name);
    if (ms && (ms.agency || ms.isAgency || ms.type==='Agency')) names.add(p.name);
  }));
  return names.size;
}
function mgrPendingCompetencyCount() {
  try {
    const comp = state.competencies || state.competencyData || {};
    let n=0;
    Object.values(comp).forEach(v=>{
      if (Array.isArray(v)) n += v.filter(x=>!(x.complete||x.completed||x.done)).length;
      else if (v && typeof v==='object') Object.values(v).forEach(x=>{ if (x===false || (x&&typeof x==='object' && !(x.complete||x.completed||x.done))) n++; });
    });
    return n;
  } catch(e){ return 0; }
}
function mgrTodoCount() {
  const list=Array.isArray(state.todoList)?state.todoList:[];
  const today=new Date().toISOString().slice(0,10);
  return list.filter(x=>!(x.archived||x.status==='Complete'||x.done===true||x.complete===true||x.completed===true||(x.done&&typeof x.done==='object'&&x.done[today]))).length;
}
function mgrTile(label,value,sub,cls,panel,icon) {
  return `<div class="mgr-kpi ${cls||''}" ${panel?`onclick="switchTab(document.querySelector('[data-panel=${panel}]'))"`:''}>
    <div class="mgr-kpi-label">${icon||''} ${label}</div><div class="mgr-kpi-value">${value}</div><div class="mgr-kpi-sub">${sub||''}</div></div>`;
}
function mgrLatestPressGaneyOverall() {
  const months = Object.keys(state.pressGaney || {}).sort();
  if (!months.length) return { value:null, month:null };
  for (let i=months.length-1; i>=0; i--) {
    const row = (state.pressGaney || {})[months[i]] || {};
    if (row.overall !== undefined && row.overall !== null && row.overall !== '' && !isNaN(Number(row.overall))) {
      return { value:Number(row.overall), month:months[i] };
    }
  }
  return { value:null, month:null };
}
function mgrQualityPulseData() {
  const m = qiCurrentMonth();
  const goals = state.unitGoals2026 || {};
  const yr = new Date().getFullYear();
  const falls = (state.unitFalls || []).filter(f => {
    const d = new Date((f.date || '') + 'T12:00:00');
    return !isNaN(d) && d.getFullYear() === yr;
  }).length;
  let hapis = 0;
  Object.values(state.staffIncidents || {}).forEach(si => {
    (si.hapis || []).forEach(e => { if (String(e.date || '').startsWith(String(yr))) hapis++; });
  });
  const careRaw = goals.actual_carePlanPct;
  const care = (careRaw !== undefined && careRaw !== null && careRaw !== '' && !isNaN(Number(careRaw))) ? Number(careRaw) : null;
  const pg = mgrLatestPressGaneyOverall();
  return { month:m, falls, hapis, care, pg };
}
function renderManagerQualityPulse() {
  const el = document.getElementById('mgr-quality-pulse');
  if (!el) return;
  const q = mgrQualityPulseData();
  const goals = state.unitGoals2026 || {};
  const painTarget = Number(goals.painPct || 95);
  const scanTarget = Number(goals.scanTarget || 95);
  const fallsTarget = Number(goals.falls || 30);
  const hapiTarget = Number(goals.hapi || 9);
  const careTarget = Number(goals.carePlanPct || 100);
  const pgTarget = Number(goals.pgHospital || 73.34);
  const cls = s => s === 'bad' ? 'mgr-status-bad' : s === 'warn' ? 'mgr-status-warn' : s === 'good' ? 'mgr-status-good' : '';
  const monthLabel = q.month && q.month.key ? q.month.key : 'current month';
  const pgMonth = q.pg.month || 'latest period';
  el.innerHTML = [
    mgrTile('Pain Reassessment', q.month.painPct===null?'—':q.month.painPct+'%', q.month.painPct===null?'No data entered':`Target ≥ ${painTarget}% · ${monthLabel}`, cls(qiStatus(q.month.painPct,painTarget,false)), 'quality', '💔'),
    mgrTile('BCMA', q.month.scanPct===null?'—':q.month.scanPct+'%', q.month.scanPct===null?'No data entered':`Target ≥ ${scanTarget}% · ${monthLabel}`, cls(qiStatus(q.month.scanPct,scanTarget,false)), 'quality', '💊'),
    mgrTile('Falls YTD', q.falls, `Target ≤ ${fallsTarget} / year`, cls(qiStatus(q.falls,fallsTarget,true)), 'qualityintel', '🚶'),
    mgrTile('HAPI YTD', q.hapis, `Target ≤ ${hapiTarget} / year`, cls(qiStatus(q.hapis,hapiTarget,true)), 'qualityintel', '🩹'),
    mgrTile('Care Plans', q.care===null?'—':q.care+'%', q.care===null?'No unit result entered':`Target ≥ ${careTarget}%`, cls(qiStatus(q.care,careTarget,false)), 'quality', '📋'),
    mgrTile('Press Ganey', q.pg.value===null?'—':q.pg.value+'%', q.pg.value===null?'No Press Ganey result entered':`Target ≥ ${pgTarget}% · ${pgMonth}`, cls(qiStatus(q.pg.value,pgTarget,false)), 'quality', '⭐')
  ].join('');
}

function mgrCertDueCount(days=30){const now=new Date();now.setHours(0,0,0,0);let n=0;Object.entries(state.certs||{}).forEach(([name,row])=>{if(!(MASTER_STAFF||[]).some(s=>s.name===name))return;Object.values(row||{}).forEach(v=>{if(!v||typeof v!=='string')return;const d=new Date(v+'T12:00:00');if(isNaN(d))return;const diff=Math.ceil((d-now)/86400000);if(diff>=0&&diff<=days)n++;});});return n;}
function mgrOrientationCount(){const names=new Set();Object.entries(state.empOrientation||{}).forEach(([n,v])=>{if(v)names.add(n);});Object.entries(state.orientation||{}).forEach(([n,v])=>{if(v&&!v.offDate)names.add(n);});return names.size;}
function mgrCoachingFollowupCount(){const today=new Date().toISOString().slice(0,10);let n=0;Object.values(state.coaching||{}).forEach(arr=>(arr||[]).forEach(s=>{if(s&&s.followUp&&s.followUp<=today&&!['complete','closed'].includes(String(s.status||'').toLowerCase()))n++;}));return n;}
function mgrVacancyRoleData(){
  const rows=[];
  [['RN','rn'],['LPN','lpn'],['CA','ca']].forEach(([role,prefix])=>{
    const budget=Number((state.vacancyBudgets||{})[`${prefix}-total`])||0;
    let permanentFilled=0, agencyFTE=0;

    (MASTER_STAFF||[]).forEach(s=>{
      // MASTER_STAFF uses .job (RN / LPN / CA), not .role.
      if(String(s.job||s.role||'').toUpperCase()!==role) return;

      // FTE is maintained in Directory as state.empFTE[name].
      // If a roster record has an explicit FTE, use it as fallback.
      const raw=(state.empFTE||{})[s.name];
      let fte=parseFloat(raw);
      if(!Number.isFinite(fte) || fte<=0){
        fte=parseFloat(s.fte);
      }
      if(!Number.isFinite(fte) || fte<=0){
        // Do not invent an FTE when no FTE is entered.
        fte=0;
      }

      if(siIsAgency(s.name)) agencyFTE += fte;
      else permanentFilled += fte;
    });

    permanentFilled=Math.round(permanentFilled*10)/10;
    agencyFTE=Math.round(agencyFTE*10)/10;
    const filledWithAgency=Math.round((permanentFilled+agencyFTE)*10)/10;
    const vacant=Math.round(Math.max(0,budget-permanentFilled)*10)/10;
    const vacantWithAgency=Math.round(Math.max(0,budget-filledWithAgency)*10)/10;
    const pct=budget>0?Math.round((vacant/budget*100)*10)/10:null;
    const pctWithAgency=budget>0?Math.round((vacantWithAgency/budget*100)*10)/10:null;

    rows.push({
      role,budget,
      filled:permanentFilled,
      permanentFilled,
      agencyFTE,
      filledWithAgency,
      vacant,
      vacantWithAgency,
      pct,
      pctWithAgency
    });
  });
  return rows;
}
function mgrVacancySummary(){
  const rows=mgrVacancyRoleData();
  const valid=rows.filter(r=>r.budget>0);
  const budget=valid.reduce((s,r)=>s+r.budget,0);
  const filled=valid.reduce((s,r)=>s+r.permanentFilled,0);
  const agency=valid.reduce((s,r)=>s+r.agencyFTE,0);
  const filledWithAgency=filled+agency;
  const open=valid.reduce((s,r)=>s+r.vacant,0);
  const openWithAgency=valid.reduce((s,r)=>s+r.vacantWithAgency,0);
  return {
    hasBudget:valid.length>0,
    budget:Math.round(budget*10)/10,
    filled:Math.round(filled*10)/10,
    agency:Math.round(agency*10)/10,
    filledWithAgency:Math.round(filledWithAgency*10)/10,
    open:Math.round(open*10)/10,
    openWithAgency:Math.round(openWithAgency*10)/10,
    rows
  };
}
function mgrRoleStaff(role){
  return (MASTER_STAFF||[]).filter(s=>String(s.job||s.role||'').toUpperCase()===role).map(s=>{
    let fte=parseFloat((state.empFTE||{})[s.name]); if(!Number.isFinite(fte)||fte<=0){fte=parseFloat(s.fte);if(!Number.isFinite(fte)||fte<=0)fte=0;}
    const ag=(state.agencyDates||{})[s.name]||{};
    return {name:s.name,fte,agency:siIsAgency(s.name),start:ag.start||'',end:ag.end||'',ext:ag.ext||'',id:ag.id||''};
  }).sort((a,b)=>Number(b.agency)-Number(a.agency)||a.name.localeCompare(b.name));
}
function mgrDaysUntil(ds){if(!ds)return null;const d=new Date(ds+'T12:00:00'),now=new Date();now.setHours(12,0,0,0);if(isNaN(d))return null;return Math.ceil((d-now)/86400000);}
function openMgrRoleModal(role){
  const modal=document.getElementById('mgr-role-modal'),body=document.getElementById('mgr-role-body'),title=document.getElementById('mgr-role-title');if(!modal||!body)return;
  const r=mgrVacancyRoleData().find(x=>x.role===role),staff=mgrRoleStaff(role),perm=staff.filter(x=>!x.agency),agency=staff.filter(x=>x.agency);
  title.textContent=`${role} Position Intelligence`;
  const ending=agency.filter(x=>{const d=mgrDaysUntil(x.end);return d!==null&&d>=0&&d<=60;});
  body.innerHTML=`<div class="mgr-kpi-grid" style="margin-bottom:12px;">${mgrTile('Budget FTE',r?r.budget.toFixed(1):'—','Approved/budgeted','','vacancy','💼')}${mgrTile('Permanent Filled',r?r.permanentFilled.toFixed(1):'—',`${perm.length} permanent staff`,r&&r.vacant>0?'mgr-status-warn':'mgr-status-good','directory','👤')}${mgrTile('Agency FTE',r?r.agencyFTE.toFixed(1):'—',`${agency.length} agency staff`,agency.length?'mgr-status-warn':'mgr-status-good','directory','🧳')}${mgrTile('Permanent Vacancy',r?r.vacant.toFixed(1)+' FTE':'—',r&&r.pct!==null?r.pct.toFixed(1)+'% vacancy':'No budget',r&&r.vacant>0?'mgr-status-bad':'mgr-status-good','vacancy','📉')}${mgrTile('Contracts ≤60d',ending.length,ending.length?'Agency contracts ending soon':'None ending soon',ending.length?'mgr-status-warn':'mgr-status-good','directory','📅')}</div>
  <div class="card" style="margin-bottom:10px;"><div class="card-title" style="margin-bottom:8px;">Permanent ${role} Staff</div>${perm.length?`<table class="data-table"><thead><tr><th>Employee</th><th>FTE</th></tr></thead><tbody>${perm.map(x=>`<tr><td>${x.name}</td><td>${x.fte?x.fte.toFixed(2):'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">No permanent staff identified.</div>'}</div>
  <div class="card"><div class="card-title" style="margin-bottom:8px;">Agency ${role} Coverage</div>${agency.length?`<table class="data-table"><thead><tr><th>Employee</th><th>FTE</th><th>Start</th><th>End</th><th>Days Remaining</th><th>Contract ID</th></tr></thead><tbody>${agency.map(x=>{const d=mgrDaysUntil(x.end);return `<tr><td>${x.name}</td><td>${x.fte?x.fte.toFixed(2):'—'}</td><td>${x.start||'—'}</td><td>${x.end||'—'}</td><td style="color:${d!==null&&d<=30?'var(--red2)':d!==null&&d<=60?'var(--amber2)':'var(--text2)'};font-weight:700;">${d===null?'—':d<0?'Ended':d}</td><td>${x.id||'—'}</td></tr>`;}).join('')}</tbody></table>`:'<div class="empty-state">No agency staff identified.</div>'}</div>`;
  modal.style.display='flex';
}
function closeMgrRoleModal(){const m=document.getElementById('mgr-role-modal');if(m)m.style.display='none';}

function renderManagerVacancyByRole(){
  const el=document.getElementById('mgr-vacancy-by-role'); if(!el) return;
  const rows=mgrVacancyRoleData();
  const valid=rows.filter(r=>r.budget>0);
  if(!valid.length){
    el.innerHTML='<div style="padding:12px;border:1px dashed var(--border);border-radius:7px;color:var(--text3);font-size:10px;">Enter budgeted RN, LPN, and CA FTE in Budget / Vacancy to calculate position-level vacancy rates.</div>';
    return;
  }

  const tone=p=>p===null?'var(--text3)':p>=15?'var(--red2)':p>=8?'var(--amber2)':'var(--green2)';
  const roleColor={RN:'var(--accent2)',LPN:'var(--purple2)',CA:'var(--teal2)'};

  el.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:9px;">
      ${rows.map(r=>`
        <div onclick="openMgrRoleModal('${r.role}')"
          style="cursor:pointer;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:11px 12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-size:13px;font-weight:800;color:${roleColor[r.role]};">${r.role}</div>
            <div style="font-size:16px;font-weight:800;color:${tone(r.pct)};">${r.pct===null?'—':r.pct.toFixed(1)+'%'}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;font-size:10px;">
            <div style="color:var(--text3);">Budget FTE</div><div style="text-align:right;font-weight:800;color:var(--white);">${r.budget?r.budget.toFixed(1):'—'}</div>
            <div style="color:var(--text3);">Permanent Filled</div><div style="text-align:right;font-weight:800;color:var(--green2);">${r.budget?r.permanentFilled.toFixed(1):'—'}</div>
            <div style="color:var(--text3);">Agency FTE</div><div style="text-align:right;font-weight:800;color:var(--purple2);">${r.budget?r.agencyFTE.toFixed(1):'—'}</div>
            <div style="color:var(--text3);">Vacant FTE</div><div style="text-align:right;font-weight:800;color:${r.vacant>0?'var(--red2)':'var(--green2)'};">${r.budget?r.vacant.toFixed(1):'—'}</div>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,.06);margin-top:8px;padding-top:7px;font-size:9px;color:var(--text3);">
            Incl. agency: <strong style="color:var(--white);">${r.filledWithAgency.toFixed(1)} filled</strong> ·
            <strong style="color:${tone(r.pctWithAgency)};">${r.pctWithAgency===null?'—':r.pctWithAgency.toFixed(1)+'% vacancy'}</strong>
          </div>
        </div>`).join('')}
    </div>
    <div style="font-size:9px;color:var(--text3);margin-top:7px;">
      Primary vacancy rate excludes agency: (Budget FTE − Permanent Filled FTE) ÷ Budget FTE.
      “Incl. agency” shows temporary coverage against the same budget.
    </div>`;
}
function renderManagerPeoplePulse(dateKey){const el=document.getElementById('mgr-people-pulse');if(!el)return;const aw=siAgencyWorkforce(),agencyPct=aw.pct,vac=mgrVacancySummary(),orient=mgrOrientationCount(),certs=mgrCertDueCount(30),coach=mgrCoachingFollowupCount();el.innerHTML=[mgrTile('Vacancy',vac.hasBudget?vac.open+' FTE':'—',vac.hasBudget?`${vac.filled} permanent + ${vac.agency} agency / ${vac.budget} budgeted`:'Enter budgeted FTE',vac.hasBudget?(vac.open>0?'mgr-status-warn':'mgr-status-good'):'','vacancy','💼'),mgrTile('Agency Mix',agencyPct+'%',`${aw.agency.length} agency of ${aw.all.length} RN/LPN/CA staff`,agencyPct>=25?'mgr-status-warn':aw.agency.length?'':'mgr-status-good','directory','🧳'),mgrTile('Orientation',orient,orient?'Staff currently orienting':'No active orientation',orient?'mgr-status-warn':'mgr-status-good','orientation','🎓'),mgrTile('Certs Due ≤30d',certs,certs?'Upcoming expirations':'None detected',certs?'mgr-status-warn':'mgr-status-good','education','📜'),mgrTile('Coaching Follow-Up',coach,coach?'Due/overdue follow-ups':'No due follow-ups',coach?'mgr-status-bad':'mgr-status-good','coaching','💬')].join('');}
function mgrBriefItem(p,icon,title,sub,panel){const tones={1:'var(--red2)',2:'var(--amber2)',3:'var(--accent2)'};return `<div class="mgr-attn-item" ${panel?`onclick="switchTab(document.querySelector('[data-panel=${panel}]'))" style="cursor:pointer;"`:''}><div class="mgr-attn-icon">${icon}</div><div style="flex:1;"><div class="mgr-attn-title" style="color:${tones[p]||'var(--white)'};">${title}</div><div class="mgr-attn-sub">${sub}</div></div><div style="font-size:9px;color:var(--text3);font-family:'IBM Plex Mono';">${panel?'OPEN →':''}</div></div>`;}

function mgrPriorityTaskKey(item){
  return 'priority:' + String(item.panel||'general') + ':' + String(item.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,80);
}
function mgrPriorityTaskExists(item){
  const key=mgrPriorityTaskKey(item);
  return (state.todoList||[]).some(t=>t.sourceKey===key && !isTodoDone(t));
}
function mgrAddPriorityTask(item){
  if(!state.todoList) state.todoList=[];
  const key=mgrPriorityTaskKey(item);
  const existing=state.todoList.find(t=>t.sourceKey===key && !isTodoDone(t));
  if(existing){
    if(typeof showSaveBanner==='function') showSaveBanner('✅ Follow-up already on Manager To-Do');
    return;
  }
  const weight=item.p===1?5:item.p===2?4:3;
  const categoryMap={
    board:'Staffing', qualityintel:'Quality', quality:'Quality',
    overtime:'Staffing', education:'Education', coaching:'People',
    staffintel:'Staffing', vacancy:'Workforce', todo:'Manager'
  };
  const due=new Date(); due.setDate(due.getDate() + (item.p===1?0:item.p===2?3:7));
  const dueDate=due.toISOString().slice(0,10);
  state.todoList.push({
    id:'todo_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    text:`Follow up: ${item.title}${item.sub?' — '+item.sub:''}`,
    freq:'daily',
    weight,
    category:categoryMap[item.panel]||'Manager Follow-Up',
    dueDate,
    done:{},
    created:Date.now(),
    sourceKey:key
  });
  persistSave();
  if(typeof renderTodo==='function') renderTodo();
  renderManagerHome();
  if(typeof showSaveBanner==='function') showSaveBanner('✅ Added to Manager To-Do');
}
function mgrPriorityOpen(panel){
  const el=document.querySelector('[data-panel="'+panel+'"]');
  if(el && typeof switchTab==='function') switchTab(el);
}
function renderMorningManagerBrief(dateKey,cov,calls,agency,todos){
  const el=document.getElementById('mgr-morning-brief'); if(!el)return;
  const items=[];

  ['RN','LPN','CA'].forEach(role=>{
    const misses=cov.filter(x=>x[role]<MGR_MIN[role]);
    if(misses.length){
      const maxShort=Math.max(...misses.map(x=>MGR_MIN[role]-x[role]));
      const labels=misses.map(x=>x.label).join(' · ');
      items.push({p:1,icon:'🚨',title:`${role} short ${maxShort} across ${misses.length} coverage window${misses.length===1?'':'s'}`,sub:labels,panel:'board'});
    }
  });

  if(calls) items.push({p:1,icon:'📵',title:`${calls} call-in${calls===1?'':'s'}`,sub:'Coverage review needed',panel:'board'});

  const q=mgrQualityPulseData(), goals=state.unitGoals2026||{};
  if(q.month.painPct!==null && q.month.painPct<Number(goals.painPct||95))
    items.push({p:1,icon:'💔',title:`Pain ${q.month.painPct}%`,sub:`Goal ≥${Number(goals.painPct||95)}%`,panel:'qualityintel'});
  if(q.month.scanPct!==null && q.month.scanPct<Number(goals.scanTarget||95))
    items.push({p:1,icon:'💊',title:`BCMA ${q.month.scanPct}%`,sub:`Goal ≥${Number(goals.scanTarget||95)}%`,panel:'qualityintel'});

  const ot=siUkgovertime();
  if(ot.rows.length) items.push({p:2,icon:'⏱',title:`UKG OT ${ot.total.toFixed(1)}h`,sub:`${ot.rows.length} employee${ot.rows.length===1?'':'s'}`,panel:'overtime'});

  const certs=mgrCertDueCount(30);
  if(certs) items.push({p:2,icon:'📜',title:`${certs} cert${certs===1?'':'s'} due`,sub:'≤30 days',panel:'education'});

  const coach=mgrCoachingFollowupCount();
  if(coach) items.push({p:2,icon:'💬',title:`${coach} coaching`,sub:'Follow-up due',panel:'coaching'});

  if(agency) items.push({p:3,icon:'🧳',title:`${agency} agency scheduled`,sub:'Review utilization',panel:'staffintel'});
  if(todos) items.push({p:3,icon:'✅',title:`${todos} manager tasks`,sub:'Open follow-ups',panel:'todo'});

  items.sort((a,b)=>a.p-b.p);

  if(!items.length){
    el.innerHTML='<div class="risk-all-clear" style="padding:8px 10px;">✅ No priority exceptions detected.</div>';
    return;
  }

  const top=items[0];

  const taskButton=i=>{
    const exists=mgrPriorityTaskExists(i);
    const encoded=encodeURIComponent(JSON.stringify(i));
    return `<button onclick="event.stopPropagation();mgrAddPriorityTask(JSON.parse(decodeURIComponent('${encoded}')))"
      title="${exists?'Already on Manager To-Do':'Add to Manager To-Do'}"
      style="flex-shrink:0;background:${exists?'rgba(37,168,104,.12)':'rgba(46,125,209,.10)'};border:1px solid ${exists?'rgba(37,168,104,.35)':'rgba(46,125,209,.30)'};color:${exists?'var(--green2)':'var(--accent2)'};border-radius:5px;padding:3px 6px;font-size:8px;font-weight:800;cursor:pointer;">
      ${exists?'✓ TASK':'+ TASK'}
    </button>`;
  };

  const chip=i=>{
    const tone=i.p===1?'var(--red2)':i.p===2?'var(--amber2)':'var(--accent2)';
    return `<div style="display:flex;align-items:center;gap:5px;padding:5px 6px;border:1px solid var(--border);border-radius:7px;background:var(--card2);min-width:175px;max-width:285px;">
      <div onclick="mgrPriorityOpen('${i.panel}')" style="cursor:pointer;display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
        <span>${i.icon}</span>
        <div style="min-width:0;">
          <div style="font-size:10px;font-weight:800;color:${tone};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.title}</div>
          <div style="font-size:8px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.sub}</div>
        </div>
      </div>
      ${taskButton(i)}
    </div>`;
  };

  el.innerHTML=`
    <div style="display:grid;grid-template-columns:minmax(300px,1.25fr) minmax(450px,3fr);gap:8px;align-items:stretch;">
      <div style="padding:8px 10px;border:1px solid rgba(179,35,24,.45);background:rgba(179,35,24,.10);border-radius:8px;display:flex;align-items:center;gap:8px;">
        <div onclick="mgrPriorityOpen('${top.panel}')" style="cursor:pointer;min-width:0;flex:1;">
          <div style="font-size:8px;color:var(--red2);font-weight:800;text-transform:uppercase;letter-spacing:.07em;">Top Priority</div>
          <div style="font-size:12px;color:var(--white);font-weight:800;margin-top:3px;">${top.icon} ${top.title}</div>
          <div style="font-size:9px;color:var(--text2);margin-top:2px;">${top.sub}</div>
        </div>
        ${taskButton(top)}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-content:flex-start;">
        ${items.slice(1,7).map(chip).join('')}
      </div>
    </div>`;
}

function mgrCoverageSummary(cov){
  let shortRN=0,shortLPN=0,shortCA=0,windowsAtGoal=0;
  cov.forEach(x=>{
    shortRN += Math.max(0,MGR_MIN.RN-x.RN);
    shortLPN += Math.max(0,MGR_MIN.LPN-x.LPN);
    shortCA += Math.max(0,MGR_MIN.CA-x.CA);
    if(x.RN>=MGR_MIN.RN && x.LPN>=MGR_MIN.LPN && x.CA>=MGR_MIN.CA) windowsAtGoal++;
  });
  return {shortRN,shortLPN,shortCA,windowsAtGoal,totalWindows:cov.length};
}
function mgrExecRow(label,value,status='',panel='',detail=''){
  const tone=status==='bad'?'var(--red2)':status==='warn'?'var(--amber2)':status==='good'?'var(--green2)':'var(--white)';
  return `<div ${panel?`onclick="switchTab(document.querySelector('[data-panel=${panel}]'))" style="cursor:pointer;"`:''} class="mgr-attn-item">
    <div style="width:155px;font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${label}</div>
    <div style="flex:1;"><div style="font-size:12px;font-weight:800;color:${tone};">${value}</div>${detail?`<div style="font-size:9px;color:var(--text3);margin-top:2px;">${detail}</div>`:''}</div>
    <div style="font-size:9px;color:var(--text3);">${panel?'OPEN →':''}</div>
  </div>`;
}
function buildExecutiveSnapshot(dateKey,cov,calls,agency,todos){
  const cs=mgrCoverageSummary(cov), people=siScheduledPeople(dateKey), agencyPct=people.length?Math.round(agency/people.length*100):0;
  const ot=siUkgovertime(), q=mgrQualityPulseData(), goals=state.unitGoals2026||{}, certs=mgrCertDueCount(30), coach=mgrCoachingFollowupCount(), vac=mgrVacancySummary();
  const rows=[];
  const gaps=cs.shortRN+cs.shortLPN+cs.shortCA;
  rows.push(mgrExecRow('Staffing', gaps?`${gaps} coverage gap${gaps===1?'':'s'}`:`${cs.windowsAtGoal}/${cs.totalWindows} windows at goal`,gaps?'bad':'good','staffintel',`Minimum: 6 RN · 1 LPN · 4 CA around the clock`));
  rows.push(mgrExecRow('Agency',`${agencyPct}%`,agencyPct>=25?'warn':agency?'':'good','staffintel',`${agency} agency of ${people.length} scheduled staff`));
  rows.push(mgrExecRow('UKG Overtime',ot.rows.length?`${ot.total.toFixed(1)} hrs`:'No imported OT',ot.total>0?'warn':'good','overtime',ot.rows.length?`${ot.rows.length} employee${ot.rows.length===1?'':'s'} · ${ot.payPeriod||'latest pay period'}`:'Import current UKG OT report'));
  rows.push(mgrExecRow('Call-ins',calls?String(calls):'0',calls?'bad':'good','board',calls?'Coverage review required':'No current call-ins logged'));
  const pain=q.month.painPct, bcma=q.month.scanPct;
  rows.push(mgrExecRow('Pain Reassessment',pain===null?'No data':`${pain}%`,pain===null?'':pain<Number(goals.painPct||95)?'bad':'good','qualityintel',`Target ≥ ${Number(goals.painPct||95)}%`));
  rows.push(mgrExecRow('BCMA',bcma===null?'No data':`${bcma}%`,bcma===null?'':bcma<Number(goals.scanTarget||95)?'bad':'good','qualityintel',`Target ≥ ${Number(goals.scanTarget||95)}%`));
  rows.push(mgrExecRow('Vacancy',vac.hasBudget?`${vac.open} FTE open`:'Budget not entered',vac.hasBudget&&vac.open>0?'warn':vac.hasBudget?'good':'','vacancy',vac.hasBudget?`${vac.filled} filled / ${vac.budget} budgeted`:''));  
  rows.push(mgrExecRow('People Follow-up',`${certs} certs · ${coach} coaching`,certs||coach?'warn':'good','education',`${certs} certification(s) due ≤30d · ${coach} coaching follow-up(s)`));
  rows.push(mgrExecRow('Manager Tasks',String(todos),todos?'warn':'good','todo',todos?'Open manager work items':'No open manager tasks'));
  return rows.join('');
}
function renderExecutiveSnapshot(dateKey,cov,calls,agency,todos){
  const el=document.getElementById('mgr-exec-snapshot'); if(!el) return;
  const cs=mgrCoverageSummary(cov), people=siScheduledPeople(dateKey), aw=siAgencyWorkforce(), ot=siUkgovertime(), q=mgrQualityPulseData(), goals=state.unitGoals2026||{}, certs=mgrCertDueCount(30), coach=mgrCoachingFollowupCount(), vac=mgrVacancySummary();
  const gaps=cs.shortRN+cs.shortLPN+cs.shortCA;
  const pain=q.month.painPct, bcma=q.month.scanPct;
  const tile=(label,value,sub,status,panel)=>{const c=status==='bad'?'var(--red2)':status==='warn'?'var(--amber2)':status==='good'?'var(--green2)':'var(--white)';return `<div ${panel?`onclick="switchTab(document.querySelector('[data-panel=${panel}]'))"`:''} style="cursor:${panel?'pointer':'default'};background:var(--card2);border:1px solid var(--border);border-radius:7px;padding:9px 10px;min-height:64px;"><div style="font-size:8px;color:var(--text3);font-weight:800;text-transform:uppercase;letter-spacing:.05em;">${label}</div><div style="font-size:14px;font-weight:800;color:${c};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div><div style="font-size:8px;color:var(--text3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sub||''}</div></div>`;};
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(145px,1fr));gap:7px;">${[
    tile('Staffing',gaps?`${gaps} gaps`:'At goal',`${cs.windowsAtGoal}/${cs.totalWindows} windows`,gaps?'bad':'good','staffintel'),
    tile('Agency',`${aw.pct}%`,`${aw.agency.length} of ${aw.all.length} workforce`,aw.pct>=25?'warn':'good','directory'),
    tile('UKG OT',ot.rows.length?`${ot.total.toFixed(1)} hrs`:'No import',ot.payPeriod||'Latest pay period',ot.total>0?'warn':'good','overtime'),
    tile('Call-ins',String(calls),calls?'Coverage review':'None logged',calls?'bad':'good','board'),
    tile('Vacancy',vac.hasBudget?`${vac.open} FTE`:'—',vac.hasBudget?`${vac.filled}/${vac.budget} permanent`:'Budget not entered',vac.open>0?'warn':'good','vacancy'),
    tile('Pain',pain===null?'No data':`${pain}%`,`Goal ≥${Number(goals.painPct||95)}%`,pain===null?'':pain<Number(goals.painPct||95)?'bad':'good','qualityintel'),
    tile('BCMA',bcma===null?'No data':`${bcma}%`,`Goal ≥${Number(goals.scanTarget||95)}%`,bcma===null?'':bcma<Number(goals.scanTarget||95)?'bad':'good','qualityintel'),
    tile('Certs ≤30d',String(certs),certs?'Review expirations':'None due',certs?'warn':'good','education'),
    tile('Coaching',String(coach),coach?'Follow-up due':'None due',coach?'warn':'good','coaching'),
    tile('Manager Tasks',String(todos),todos?'Open follow-ups':'None open',todos?'warn':'good','todo')
  ].join('')}</div>`;
}
function executiveSnapshotText(){
  const dateKey=state.activeBoardDate || (state.dates||[])[0];
  const cov=mgrCoverage(dateKey), calls=mgrCallinsForDate(dateKey), agency=siAgencyPeople(dateKey).length, todos=mgrTodoCount();
  const cs=mgrCoverageSummary(cov), people=siScheduledPeople(dateKey), ot=siUkgovertime(), q=mgrQualityPulseData(), vac=mgrVacancySummary();
  const agencyPct=people.length?Math.round(agency/people.length*100):0;
  return [
    `3B/3C Weekly Executive Snapshot`,
    `Date: ${dateKey||new Date().toLocaleDateString()}`,
    `Staffing: ${cs.windowsAtGoal}/${cs.totalWindows} windows at 6 RN / 1 LPN / 4 CA minimum`,
    `Coverage gaps: RN ${cs.shortRN}, LPN ${cs.shortLPN}, CA ${cs.shortCA}`,
    `Call-ins: ${calls}`,
    `Agency: ${agency} staff (${agencyPct}%)`,
    `UKG OT: ${ot.rows.length?ot.total.toFixed(1)+' hrs':'No current import'}${ot.payPeriod?' — '+ot.payPeriod:''}`,
    `Pain reassessment: ${q.month.painPct===null?'No data':q.month.painPct+'%'}`,
    `BCMA: ${q.month.scanPct===null?'No data':q.month.scanPct+'%'}`,
    `Vacancy: ${vac.hasBudget?vac.open+' FTE open':'Budget not entered'}`,
    `Certifications due ≤30 days: ${mgrCertDueCount(30)}`,
    `Coaching follow-ups due: ${mgrCoachingFollowupCount()}`,
    `Manager tasks open: ${todos}`
  ].join('\n');
}
function copyExecutiveSnapshot(){
  const txt=executiveSnapshotText();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Executive snapshot copied'));
  } else {
    const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showSaveBanner('📋 Executive snapshot copied');
  }
}
function printExecutiveSnapshot(){
  const txt=executiveSnapshotText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const w=window.open('','_blank','width=800,height=900');
  if(!w)return alert('Please allow pop-ups to print the executive snapshot.');
  w.document.write(`<html><head><title>3B/3C Weekly Executive Snapshot</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px;margin-bottom:18px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.65;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Weekly Executive Snapshot</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}


function mgrTrendKey(){ return '3b3c_mgr_trend_snapshots_v1'; }
function mgrLoadTrendSnapshots(){
  try { const x=JSON.parse(localStorage.getItem(mgrTrendKey())||'[]'); return Array.isArray(x)?x:[]; } catch(e){ return []; }
}
function mgrCurrentTrendSnapshot(){
  const rows=mgrVacancyRoleData();
  const workforce=siAgencyWorkforce();
  const month=new Date().toISOString().slice(0,7);
  const snap={month,ts:new Date().toISOString(),roles:{},agencyHeadcount:workforce.agency.length,totalHeadcount:workforce.all.length,agencyPct:workforce.pct};
  rows.forEach(r=>{
    const roleStaff=mgrRoleStaff(r.role), roleAgency=roleStaff.filter(x=>x.agency), roleTotal=roleStaff.length;
    snap.roles[r.role]={
      budget:r.budget,
      permanentFilled:r.permanentFilled,
      agencyFTE:r.agencyFTE,
      vacancyFTE:r.vacant,
      vacancyPct:r.pct,
      agencyHeadcount:roleAgency.length,
      totalHeadcount:roleTotal,
      agencyPct:roleTotal?Math.round(roleAgency.length/roleTotal*1000)/10:0
    };
  });
  return snap;
}
function mgrSaveTrendSnapshot(force=false){
  const snap=mgrCurrentTrendSnapshot();
  let arr=mgrLoadTrendSnapshots();
  const idx=arr.findIndex(x=>x.month===snap.month);
  if(idx>=0){
    if(force || true) arr[idx]=snap;
  } else arr.push(snap);
  arr=arr.sort((a,b)=>a.month.localeCompare(b.month)).slice(-24);
  try { localStorage.setItem(mgrTrendKey(),JSON.stringify(arr)); } catch(e){}
  if(force && typeof showSaveBanner==='function') showSaveBanner('💾 Monthly staffing snapshot saved');
  renderMgrTrends();
}
function mgrTrendArrow(curr,prev,lowerIsBetter=true){
  if(curr===null||curr===undefined||prev===null||prev===undefined) return {icon:'—',text:'No comparison',cls:''};
  const d=Math.round((curr-prev)*10)/10;
  if(Math.abs(d)<0.1) return {icon:'→',text:'Stable',cls:''};
  const improved=lowerIsBetter?d<0:d>0;
  return {icon:d<0?'↓':'↑',text:`${Math.abs(d).toFixed(1)} pt ${improved?'improving':'worsening'}`,cls:improved?'mgr-status-good':'mgr-status-warn'};
}
function mgrForecastRole(role,days){
  const current=mgrVacancyRoleData().find(r=>r.role===role);
  const staff=mgrRoleStaff(role);
  const expiringFTE=staff.filter(x=>x.agency).reduce((sum,x)=>{
    const d=mgrDaysUntil(x.end);
    return sum + ((d!==null && d>=0 && d<=days)?(Number(x.fte)||0):0);
  },0);
  const agencyNow=current?current.agencyFTE:0;
  const agencyRemaining=Math.max(0,agencyNow-expiringFTE);
  const filledWithAgency=(current?current.permanentFilled:0)+agencyRemaining;
  const gap=Math.max(0,(current?current.budget:0)-filledWithAgency);
  const pct=current&&current.budget>0?Math.round(gap/current.budget*1000)/10:null;
  return {role,days,expiringFTE:Math.round(expiringFTE*10)/10,agencyRemaining:Math.round(agencyRemaining*10)/10,filledWithAgency:Math.round(filledWithAgency*10)/10,gap:Math.round(gap*10)/10,pct};
}
function mgrSparkline(values,width=170,height=38){
  const clean=values.map(v=>Number.isFinite(v)?v:null);
  const nums=clean.filter(v=>v!==null);
  if(nums.length<2) return '<div style="font-size:9px;color:var(--text3);">Need 2+ monthly snapshots</div>';
  const min=Math.min(...nums), max=Math.max(...nums), range=(max-min)||1;
  const pts=clean.map((v,i)=>{
    if(v===null)return null;
    const x=(i/(clean.length-1))*width;
    const y=height-4-((v-min)/range)*(height-8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).filter(Boolean).join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="trend"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/><line x1="0" y1="${height-2}" x2="${width}" y2="${height-2}" stroke="rgba(255,255,255,.12)" stroke-width="1"/></svg>`;
}
function renderMgrTrends(){
  const sum=document.getElementById('mgr-trend-summary'),body=document.getElementById('mgr-trend-body'); if(!sum||!body) return;
  const curr=mgrCurrentTrendSnapshot();
  let arr=mgrLoadTrendSnapshots();
  const idx=arr.findIndex(x=>x.month===curr.month);
  if(idx>=0) arr[idx]=curr; else arr.push(curr);
  arr=arr.sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
  const prev=arr.length>=2?arr[arr.length-2]:null;

  const rnTrend=mgrTrendArrow(curr.roles.RN?.vacancyPct,prev?.roles?.RN?.vacancyPct,true);
  const agTrend=mgrTrendArrow(curr.agencyPct,prev?.agencyPct,true);
  const totalVac=['RN','LPN','CA'].reduce((s,r)=>s+(curr.roles[r]?.vacancyFTE||0),0);
  const contracts60=['RN','LPN','CA'].reduce((s,r)=>s+mgrForecastRole(r,60).expiringFTE,0);

  sum.innerHTML=[
    mgrTile('RN Vacancy',curr.roles.RN?.vacancyPct===null?'—':`${curr.roles.RN.vacancyPct}%`,rnTrend.icon+' '+rnTrend.text,rnTrend.cls,'vacancy','🩺'),
    mgrTile('Agency Mix',`${curr.agencyPct}%`,agTrend.icon+' '+agTrend.text,agTrend.cls,'directory','🧳'),
    mgrTile('Permanent Vacancy',`${Math.round(totalVac*10)/10} FTE`,'RN + LPN + CA',totalVac>0?'mgr-status-warn':'mgr-status-good','vacancy','📉'),
    mgrTile('Agency Ending ≤60d',`${Math.round(contracts60*10)/10} FTE`,contracts60?'Potential future gap':'No known expirations',contracts60?'mgr-status-warn':'mgr-status-good','directory','📅')
  ].join('');

  const roles=['RN','LPN','CA'];
  const roleColor={RN:'var(--accent2)',LPN:'var(--purple2)',CA:'var(--teal2)'};
  const trendCards=roles.map(role=>{
    const vals=arr.map(x=>x.roles?.[role]?.vacancyPct);
    const latest=curr.roles[role]||{};
    const p=prev?.roles?.[role]?.vacancyPct;
    const t=mgrTrendArrow(latest.vacancyPct,p,true);
    return `<div style="background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:11px;">
      <div style="display:flex;justify-content:space-between;align-items:center;"><strong style="color:${roleColor[role]};">${role}</strong><span style="font-weight:800;color:${latest.vacancyPct>=15?'var(--red2)':latest.vacancyPct>=8?'var(--amber2)':'var(--green2)'};">${latest.vacancyPct===null?'—':latest.vacancyPct.toFixed(1)+'%'}</span></div>
      <div style="margin-top:5px;color:${roleColor[role]};">${mgrSparkline(vals)}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:3px;">${t.icon} ${t.text} · Agency ${latest.agencyFTE||0} FTE</div>
    </div>`;
  }).join('');

  const forecastRows=roles.map(role=>{
    const f30=mgrForecastRole(role,30),f60=mgrForecastRole(role,60),f90=mgrForecastRole(role,90);
    const fmt=f=>`${f.gap.toFixed(1)} FTE${f.pct===null?'':` (${f.pct.toFixed(1)}%)`}`;
    return `<tr><td style="font-weight:800;color:${roleColor[role]};padding:9px 12px;">${role}</td><td style="padding:9px 16px;text-align:center;white-space:nowrap;">${fmt(f30)}</td><td style="padding:9px 16px;text-align:center;white-space:nowrap;">${fmt(f60)}</td><td style="padding:9px 16px;text-align:center;white-space:nowrap;">${fmt(f90)}</td><td style="padding:9px 16px;text-align:center;white-space:nowrap;">${f90.expiringFTE.toFixed(1)} FTE</td></tr>`;
  }).join('');

  body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:9px;margin-bottom:12px;">${trendCards}</div>
    <div style="font-size:11px;font-weight:800;color:var(--accent2);margin-bottom:7px;">🔭 30 / 60 / 90-Day Staffing Forecast</div>
    <div style="overflow:auto;border:1px solid var(--border);border-radius:8px;padding:4px 8px;">
      <table class="data-table" style="margin:0;width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0 4px;">
        <colgroup><col style="width:12%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:28%"></colgroup>
        <thead><tr><th style="padding:8px 12px;text-align:left;">Position</th><th style="padding:8px 16px;text-align:center;">30 Days</th><th style="padding:8px 16px;text-align:center;">60 Days</th><th style="padding:8px 16px;text-align:center;">90 Days</th><th style="padding:8px 16px;text-align:center;">Agency FTE Ending ≤90d</th></tr></thead>
        <tbody>${forecastRows}</tbody>
      </table>
    </div>
    <div style="font-size:9px;color:var(--text3);margin-top:7px;">Forecast assumes permanent FTE stays unchanged and agency staff leave on their entered contract end dates with no replacement or extension. Monthly trend history is stored in this browser.</div>`;
}
function mgrTaskPulseData(){
  const today=todoDateKey(), now=new Date(today+'T12:00:00'), weekEnd=new Date(now);weekEnd.setDate(weekEnd.getDate()+7);const weekEndKey=weekEnd.toISOString().slice(0,10);const open=(state.todoList||[]).filter(t=>!isTodoDone(t));return{open:open.length,overdue:open.filter(t=>t.dueDate&&t.dueDate<today).length,today:open.filter(t=>t.dueDate===today).length,week:open.filter(t=>t.dueDate&&t.dueDate>today&&t.dueDate<=weekEndKey).length,high:open.filter(t=>(Number(t.weight)||0)>=4).length};
}
function renderManagerTaskPulse(){
  const el=document.getElementById('mgr-task-pulse');if(!el)return;const d=mgrTaskPulseData();el.innerHTML=[mgrTile('Overdue',d.overdue,d.overdue?'Needs action':'None overdue',d.overdue?'mgr-status-bad':'mgr-status-good','todo','🚨'),mgrTile('Due Today',d.today,d.today?'Due today':'Nothing due today',d.today?'mgr-status-warn':'mgr-status-good','todo','📅'),mgrTile('Next 7 Days',d.week,d.week?'Upcoming work':'No dated tasks',d.week?'mgr-status-warn':'mgr-status-good','todo','🗓'),mgrTile('High Priority',d.high,'Priority 4–5',d.high?'mgr-status-warn':'mgr-status-good','todo','⭐'),mgrTile('Open Total',d.open,'All open tasks',d.open?'':'mgr-status-good','todo','✅')].join('');
}


function mgrDailyActionItems(dateKey,cov,calls,agency,todos){
  const actions=[];

  ['RN','LPN','CA'].forEach(role=>{
    const misses=cov.filter(x=>x[role]<MGR_MIN[role]);
    if(misses.length){
      const maxShort=Math.max(...misses.map(x=>MGR_MIN[role]-x[role]));
      actions.push({
        score:100 + misses.length*5 + maxShort*3,
        icon:'🚨',
        title:`Resolve ${role} staffing shortage`,
        detail:`Short ${maxShort} across ${misses.length} coverage window${misses.length===1?'':'s'}: ${misses.map(x=>x.label).join(', ')}`,
        panel:'board'
      });
    }
  });

  if(calls){
    actions.push({score:98,icon:'📵',title:`Resolve ${calls} call-in${calls===1?'':'s'}`,detail:'Review coverage finder and open shifts.',panel:'board'});
  }

  const pulse=mgrTaskPulseData();
  if(pulse.overdue){
    actions.push({score:96,icon:'⏰',title:`Address ${pulse.overdue} overdue manager task${pulse.overdue===1?'':'s'}`,detail:'Open Manager To-Do and close or reschedule overdue follow-ups.',panel:'todo'});
  }
  if(pulse.today){
    actions.push({score:92,icon:'📅',title:`Complete ${pulse.today} task${pulse.today===1?'':'s'} due today`,detail:'Prioritize today’s dated follow-ups.',panel:'todo'});
  }

  const q=mgrQualityPulseData(), goals=state.unitGoals2026||{};
  if(q.month.painPct!==null && q.month.painPct<Number(goals.painPct||95)){
    actions.push({score:95,icon:'💔',title:'Pain reassessment follow-up',detail:`Current ${q.month.painPct}% vs goal ≥${Number(goals.painPct||95)}%.`,panel:'qualityintel'});
  }
  if(q.month.scanPct!==null && q.month.scanPct<Number(goals.scanTarget||95)){
    actions.push({score:94,icon:'💊',title:'BCMA follow-up',detail:`Current ${q.month.scanPct}% vs goal ≥${Number(goals.scanTarget||95)}%.`,panel:'qualityintel'});
  }

  const ot=siUkgovertime();
  if(ot.rows.length && ot.total>0){
    actions.push({score:78,icon:'⏱',title:'Review UKG overtime exposure',detail:`${ot.total.toFixed(1)} OT hours across ${ot.rows.length} employee${ot.rows.length===1?'':'s'}.`,panel:'overtime'});
  }

  const certs=mgrCertDueCount(30);
  if(certs){
    actions.push({score:74,icon:'📜',title:`Review ${certs} certification${certs===1?'':'s'} due ≤30 days`,detail:'Plan renewals before expiration.',panel:'education'});
  }

  const coach=mgrCoachingFollowupCount();
  if(coach){
    actions.push({score:72,icon:'💬',title:`Complete ${coach} coaching follow-up${coach===1?'':'s'}`,detail:'Review open coaching plans.',panel:'coaching'});
  }

  const health=mgrDataHealthRows();
  const criticalHealth=health.filter(r=>r.status==='bad');
  if(criticalHealth.length){
    actions.push({score:88,icon:'🩺',title:`Fix ${criticalHealth.length} data gap${criticalHealth.length===1?'':'s'}`,detail:criticalHealth.map(x=>x.label).join(', '),panel:criticalHealth[0].panel||'home'});
  }

  const vac=mgrVacancySummary();
  if(vac.hasBudget && vac.open>0){
    actions.push({score:68,icon:'📉',title:'Review permanent vacancy',detail:`${vac.open} FTE open against ${vac.budget} budgeted FTE.`,panel:'vacancy'});
  }

  if(agency){
    actions.push({score:60,icon:'🧳',title:'Review agency utilization',detail:`${agency} agency staff scheduled on selected date.`,panel:'staffintel'});
  }

  return actions.sort((a,b)=>b.score-a.score).slice(0,5);
}
function renderDailyManagerPlan(dateKey,cov,calls,agency,todos){
  const el=document.getElementById('mgr-daily-action-plan'); if(!el)return;
  const items=mgrDailyActionItems(dateKey,cov,calls,agency,todos);
  if(!items.length){
    el.innerHTML='<div class="risk-all-clear" style="padding:8px 10px;">✅ No urgent manager actions detected.</div>';
    return;
  }
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:6px;">
    ${items.map((i,idx)=>`<div onclick="mgrPriorityOpen('${i.panel}')" style="cursor:pointer;background:var(--card2);border:1px solid ${idx===0?'rgba(230,57,70,.45)':'var(--border)'};border-radius:7px;padding:8px 9px;min-height:72px;">
      <div style="font-size:8px;color:${idx===0?'var(--red2)':'var(--text3)'};font-weight:800;text-transform:uppercase;">${idx===0?'Top Action':'Priority '+(idx+1)}</div>
      <div style="font-size:10px;font-weight:800;color:var(--white);margin-top:3px;">${i.icon} ${i.title}</div>
      <div style="font-size:8px;color:var(--text3);margin-top:3px;line-height:1.35;">${i.detail}</div>
    </div>`).join('')}
  </div>`;
}
function dailyManagerPlanText(){
  const dateKey=state.activeBoardDate || (state.dates||[])[0];
  const cov=mgrCoverage(dateKey), calls=mgrCallinsForDate(dateKey), agency=siAgencyPeople(dateKey).length, todos=mgrTodoCount();
  const items=mgrDailyActionItems(dateKey,cov,calls,agency,todos);
  return ['3B/3C Daily Manager Action Plan',`Date: ${dateKey||new Date().toLocaleDateString()}`,'',...items.map((i,idx)=>`${idx+1}. ${i.title} — ${i.detail}`)].join('\n');
}
function copyDailyManagerPlan(){
  const txt=dailyManagerPlanText();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Daily action plan copied'));
  } else {
    const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showSaveBanner('📋 Daily action plan copied');
  }
}
function printDailyManagerPlan(){
  const txt=dailyManagerPlanText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const w=window.open('','_blank','width=800,height=900');
  if(!w)return alert('Please allow pop-ups to print the Daily Manager Action Plan.');
  w.document.write(`<html><head><title>3B/3C Daily Manager Action Plan</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Daily Manager Action Plan</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}


function mgrDateDiffDays(dateStr){
  if(!dateStr) return null;
  const d=new Date(dateStr); if(isNaN(d)) return null;
  const now=new Date();
  return Math.floor((now-d)/86400000);
}
function mgrDataHealthRows(){
  const rows=[];

  // Staffing Board — current selected board date and placements present.
  const boardDate=state.activeBoardDate || (state.dates||[])[0] || '';
  const placements=boardDate ? ((state.placements||{})[boardDate]||{}) : {};
  const boardCount=Object.values(placements).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);
  rows.push({
    label:'Staffing Board',
    status:boardDate && boardCount ? 'good' : 'bad',
    value:boardDate ? `${boardCount} assignments` : 'No board date',
    detail:boardDate || 'Load/import staffing',
    panel:'board'
  });

  // UKG OT — latest pay period import.
  const ot=siUkgovertime();
  rows.push({
    label:'UKG Overtime',
    status:ot.rows.length ? 'good' : 'warn',
    value:ot.rows.length ? `${ot.total.toFixed(1)} hrs` : 'No current import',
    detail:ot.payPeriod ? `Pay period ${ot.payPeriod}` : 'Import UKG OT report',
    panel:'overtime'
  });

  // Quality — current month data completeness.
  const q=mgrQualityPulseData();
  const qCount=[q.month.painPct,q.month.scanPct].filter(v=>v!==null).length;
  rows.push({
    label:'Quality KPI',
    status:qCount===2 ? 'good' : qCount===1 ? 'warn' : 'bad',
    value:qCount===2 ? 'Current' : `${qCount}/2 core KPIs`,
    detail:qCount===2 ? 'Pain + BCMA available' : 'Pain/BCMA data incomplete',
    panel:'qualityintel'
  });

  // Vacancy — budget entered and FTE data available.
  const vac=mgrVacancySummary();
  const roleRows=mgrVacancyRoleData();
  const ftePopulated=roleRows.filter(r=>r.budget>0 && (r.permanentFilled>0 || r.agencyFTE>0)).length;
  rows.push({
    label:'Vacancy / FTE',
    status:vac.hasBudget && ftePopulated ? 'good' : vac.hasBudget ? 'warn' : 'bad',
    value:vac.hasBudget ? `${vac.open} FTE open` : 'Budget missing',
    detail:vac.hasBudget ? `${ftePopulated}/3 roles with filled FTE` : 'Enter budgeted FTE',
    panel:'vacancy'
  });

  // Agency — Directory flags.
  const aw=siAgencyWorkforce();
  rows.push({
    label:'Agency Roster',
    status:aw.all.length ? 'good' : 'warn',
    value:aw.all.length ? `${aw.agency.length} agency` : 'No roster',
    detail:aw.all.length ? `${aw.all.length} RN/LPN/CA staff reviewed` : 'Directory data missing',
    panel:'directory'
  });

  // Certifications
  const certEntries=Object.values(state.certs||{}).filter(v=>v&&typeof v==='object').length;
  rows.push({
    label:'Certifications',
    status:certEntries ? 'good' : 'warn',
    value:certEntries ? `${certEntries} staff tracked` : 'No cert data',
    detail:certEntries ? `${mgrCertDueCount(30)} due ≤30d` : 'Enter/import certifications',
    panel:'education'
  });

  return rows;
}
function renderManagerDataHealth(){
  const el=document.getElementById('mgr-data-health'); if(!el)return;
  const rows=mgrDataHealthRows();
  const bad=rows.filter(r=>r.status==='bad').length, warn=rows.filter(r=>r.status==='warn').length;
  const tone=s=>s==='bad'?'var(--red2)':s==='warn'?'var(--amber2)':'var(--green2)';
  const icon=s=>s==='bad'?'🔴':s==='warn'?'🟡':'🟢';

  el.innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px;">
    <div style="font-size:9px;color:${bad?'var(--red2)':'var(--green2)'};font-weight:800;">${bad ? bad+' missing/critical' : 'No critical data gaps'}</div>
    ${warn?`<div style="font-size:9px;color:var(--amber2);font-weight:800;">· ${warn} needs review</div>`:''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(6,minmax(140px,1fr));gap:6px;">
    ${rows.map(r=>`<div onclick="mgrPriorityOpen('${r.panel}')" style="cursor:pointer;background:var(--card2);border:1px solid var(--border);border-radius:7px;padding:7px 8px;">
      <div style="font-size:8px;color:var(--text3);font-weight:800;text-transform:uppercase;">${icon(r.status)} ${r.label}</div>
      <div style="font-size:10px;font-weight:800;color:${tone(r.status)};margin-top:3px;">${r.value}</div>
      <div style="font-size:8px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.detail}</div>
    </div>`).join('')}
  </div>`;
}

function mgrExceptionKey(){ return '3b3c_manager_exceptions_v1'; }
function mgrLoadExceptions(){
  try { const x=JSON.parse(localStorage.getItem(mgrExceptionKey())||'[]'); return Array.isArray(x)?x:[]; } catch(e){ return []; }
}
function mgrSaveExceptions(arr){
  try { localStorage.setItem(mgrExceptionKey(),JSON.stringify(arr.slice(-250))); } catch(e){}
}
function mgrExceptionId(type,title){
  return (type+':'+title).toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,120);
}
function mgrCurrentExceptionCandidates(){
  const dateKey=state.activeBoardDate || (state.dates||[])[0];
  const cov=mgrCoverage(dateKey), calls=mgrCallinsForDate(dateKey), agency=siAgencyPeople(dateKey).length;
  const out=[];

  ['RN','LPN','CA'].forEach(role=>{
    const misses=cov.filter(x=>x[role]<MGR_MIN[role]);
    if(misses.length){
      const maxShort=Math.max(...misses.map(x=>MGR_MIN[role]-x[role]));
      out.push({type:'Staffing',severity:'critical',title:`${role} staffing shortage`,detail:`Short ${maxShort} across ${misses.length} coverage window${misses.length===1?'':'s'}`,panel:'board'});
    }
  });

  if(calls) out.push({type:'Staffing',severity:'critical',title:`${calls} active call-in${calls===1?'':'s'}`,detail:'Coverage review required',panel:'board'});

  const q=mgrQualityPulseData(), goals=state.unitGoals2026||{};
  if(q.month.painPct!==null && q.month.painPct<Number(goals.painPct||95))
    out.push({type:'Quality',severity:'critical',title:'Pain reassessment below goal',detail:`${q.month.painPct}% vs goal ≥${Number(goals.painPct||95)}%`,panel:'qualityintel'});
  if(q.month.scanPct!==null && q.month.scanPct<Number(goals.scanTarget||95))
    out.push({type:'Quality',severity:'critical',title:'BCMA below goal',detail:`${q.month.scanPct}% vs goal ≥${Number(goals.scanTarget||95)}%`,panel:'qualityintel'});

  const task=mgrTaskPulseData();
  if(task.overdue) out.push({type:'Follow-Up',severity:'critical',title:`${task.overdue} overdue manager task${task.overdue===1?'':'s'}`,detail:'Manager To-Do aging exception',panel:'todo'});

  const ot=siUkgovertime();
  if(ot.rows.length && ot.total>0)
    out.push({type:'Workforce',severity:'warning',title:'UKG overtime exposure',detail:`${ot.total.toFixed(1)} hours across ${ot.rows.length} employee${ot.rows.length===1?'':'s'}`,panel:'overtime'});

  const certs=mgrCertDueCount(30);
  if(certs) out.push({type:'Education',severity:'warning',title:`${certs} certification${certs===1?'':'s'} due ≤30 days`,detail:'Renewal follow-up needed',panel:'education'});

  const coach=mgrCoachingFollowupCount();
  if(coach) out.push({type:'People',severity:'warning',title:`${coach} coaching follow-up${coach===1?'':'s'} due`,detail:'Open coaching plan follow-up',panel:'coaching'});

  mgrDataHealthRows().filter(r=>r.status==='bad').forEach(r=>{
    out.push({type:'Data',severity:'warning',title:`${r.label} data gap`,detail:r.detail,panel:r.panel});
  });

  const vac=mgrVacancySummary();
  if(vac.hasBudget && vac.open>0)
    out.push({type:'Workforce',severity:'info',title:'Permanent vacancy',detail:`${vac.open} FTE open against ${vac.budget} budgeted`,panel:'vacancy'});

  return out.map(x=>({...x,id:mgrExceptionId(x.type,x.title)}));
}
function captureCurrentManagerExceptions(showBanner=false){
  const now=new Date().toISOString(), candidates=mgrCurrentExceptionCandidates();
  let arr=mgrLoadExceptions();
  candidates.forEach(c=>{
    const existing=arr.find(x=>x.id===c.id && x.status!=='resolved');
    if(existing){
      existing.lastSeen=now; existing.detail=c.detail; existing.panel=c.panel; existing.severity=c.severity;
    } else {
      arr.push({...c,status:'open',owner:'',created:now,lastSeen:now,resolvedAt:''});
    }
  });
  mgrSaveExceptions(arr);
  renderManagerExceptions();
  if(showBanner && typeof showSaveBanner==='function') showSaveBanner('📥 Current exceptions captured');
}
function mgrSetExceptionStatus(id,status){
  const arr=mgrLoadExceptions(), x=arr.find(e=>e.id===id && e.status!=='resolved');
  if(!x) return;
  x.status=status;
  if(status==='resolved') x.resolvedAt=new Date().toISOString();
  mgrSaveExceptions(arr); renderManagerExceptions();
}
function mgrAssignException(id){
  const arr=mgrLoadExceptions(), x=arr.find(e=>e.id===id && e.status!=='resolved');
  if(!x) return;
  const owner=prompt('Assign exception to:',x.owner||'');
  if(owner===null) return;
  x.owner=owner.trim(); x.status=x.owner?'assigned':'open';
  mgrSaveExceptions(arr); renderManagerExceptions();
}
function toggleManagerExceptionDetails(){
  const el=document.getElementById('mgr-exception-details'); if(!el)return;
  el.style.display=el.style.display==='none'?'block':'none';
}
function renderManagerExceptions(){
  const s=document.getElementById('mgr-exception-summary'), d=document.getElementById('mgr-exception-details'); if(!s||!d)return;
  const arr=mgrLoadExceptions();
  const active=arr.filter(x=>x.status!=='resolved');
  const counts={
    open:active.filter(x=>x.status==='open').length,
    ack:active.filter(x=>x.status==='acknowledged').length,
    assigned:active.filter(x=>x.status==='assigned').length,
    critical:active.filter(x=>x.severity==='critical').length,
    resolved:arr.filter(x=>x.status==='resolved').length
  };
  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:6px;">
    ${mgrTile('Critical',counts.critical,counts.critical?'Needs action':'None',counts.critical?'mgr-status-bad':'mgr-status-good','home','🚨')}
    ${mgrTile('Open',counts.open,'Unacknowledged',counts.open?'mgr-status-warn':'mgr-status-good','home','📥')}
    ${mgrTile('Acknowledged',counts.ack,'Being reviewed',counts.ack?'':'mgr-status-good','home','👁')}
    ${mgrTile('Assigned',counts.assigned,'Delegated',counts.assigned?'':'mgr-status-good','home','👤')}
    ${mgrTile('Resolved',counts.resolved,'History',counts.resolved?'mgr-status-good':'','home','✅')}
  </div>`;

  if(!active.length){
    d.innerHTML='<div class="risk-all-clear" style="padding:8px 10px;">✅ No active exceptions.</div>';
    return;
  }

  const sevColor=x=>x==='critical'?'var(--red2)':x==='warning'?'var(--amber2)':'var(--accent2)';
  d.innerHTML=`<div style="display:flex;flex-direction:column;gap:5px;">
    ${active.sort((a,b)=>(a.severity==='critical'?0:1)-(b.severity==='critical'?0:1)||a.created.localeCompare(b.created)).map(x=>`
      <div style="display:grid;grid-template-columns:90px 1fr 110px 250px;gap:8px;align-items:center;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--card2);">
        <div><div style="font-size:8px;color:${sevColor(x.severity)};font-weight:800;text-transform:uppercase;">${x.severity}</div><div style="font-size:8px;color:var(--text3);">${x.type}</div></div>
        <div onclick="mgrPriorityOpen('${x.panel}')" style="cursor:pointer;min-width:0;"><div style="font-size:10px;color:var(--white);font-weight:800;">${x.title}</div><div style="font-size:8px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${x.detail}</div></div>
        <div style="font-size:9px;color:var(--text2);">${x.owner||x.status}</div>
        <div style="display:flex;gap:4px;justify-content:flex-end;">
          ${x.status==='open'?`<button class="btn btn-ghost btn-sm" onclick="mgrSetExceptionStatus('${x.id}','acknowledged')">Acknowledge</button>`:''}
          <button class="btn btn-ghost btn-sm" onclick="mgrAssignException('${x.id}')">Assign</button>
          <button class="btn btn-success btn-sm" onclick="mgrSetExceptionStatus('${x.id}','resolved')">Resolve</button>
        </div>
      </div>`).join('')}
  </div>`;
}
function renderManagerHome() {
  const grid=document.getElementById('mgr-kpi-grid');
  if(!grid) return;
  const dateKey=mgrBoardDate();
  const cov=mgrCoverage(dateKey), cur=cov[mgrCurrentWindowIndex()];
  const censusEl=document.getElementById('census-day');
  const census=Number(censusEl?.value||0);
  const calls=mgrCallInCount(dateKey), agency=mgrAgencyCount(dateKey), comps=mgrPendingCompetencyCount(), todos=mgrTodoCount();
  const fdate=new Date(dateKey+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const dateEl=document.getElementById('mgr-home-date'); if(dateEl) dateEl.textContent=`${fdate} · Daily operational picture`;
  const cls=(got,need)=>got<need?'mgr-status-bad':'mgr-status-good';
  grid.innerHTML=[
    mgrTile('Census',census||'—',census?'Current day census':'Enter census above','',null,'📋'),
    mgrTile('RN Coverage',`${cur.RN} / 6`,cur.RN<6?`SHORT ${6-cur.RN} · ${cur.label}`:`Minimum met · ${cur.label}`,cls(cur.RN,6),'board','🩺'),
    mgrTile('LPN Coverage',`${cur.LPN} / 1`,cur.LPN<1?'SHORT 1':`Minimum met · ${cur.label}`,cls(cur.LPN,1),'board','💜'),
    mgrTile('CA Coverage',`${cur.CA} / 4`,cur.CA<4?`SHORT ${4-cur.CA} · ${cur.label}`:`Minimum met · ${cur.label}`,cls(cur.CA,4),'board','🏥'),
    mgrTile('Call-Ins',calls,calls?`${calls} logged for selected date`:'None logged',calls?'mgr-status-bad':'mgr-status-good','board','📵'),
    mgrTile('Manager Tasks',todos,todos?'Open follow-ups':'No open tasks',todos?'mgr-status-warn':'mgr-status-good','todo','✅')
  ].join('');

  const w=document.getElementById('mgr-window-grid');
  if(w) w.innerHTML=cov.map(x=>{
    const line=(r,n)=>`<div class="mgr-role-line"><span>${r}</span><span class="${x[r]<n?'mgr-short':'mgr-met'}">${x[r]} / ${n}${x[r]<n?' · SHORT '+(n-x[r]):' ✓'}</span></div>`;
    return `<div class="mgr-window"><div class="mgr-window-title">${x.label}<br><span style="font-weight:400;color:var(--text3);">${x.time}</span></div>${line('RN',6)}${line('LPN',1)}${line('CA',4)}</div>`;
  }).join('');

  const att=[];
  cov.forEach(x=>['RN','LPN','CA'].forEach(r=>{ const n=MGR_MIN[r]; if(x[r]<n) att.push({icon:'🚨',title:`${x.label}: ${r} short by ${n-x[r]}`,sub:`${x[r]} scheduled · ${n} required continuously`}); }));
  if(calls) att.push({icon:'📵',title:`${calls} call-in${calls===1?'':'s'} logged`,sub:'Review coverage finder and open shifts.'});
  if(comps) att.push({icon:'🎓',title:`${comps} competency item${comps===1?'':'s'} pending`,sub:'Review Education / Competency for due items.'});
  if(agency) att.push({icon:'🧳',title:`${agency} agency staff scheduled`,sub:'Included in current staffing; monitor agency utilization.'});
  if(todos) att.push({icon:'✅',title:`${todos} manager task${todos===1?'':'s'} open`,sub:'Review Manager To-Do follow-ups.'});
  const a=document.getElementById('mgr-attention-list');
  if(a) a.innerHTML=att.length?att.slice(0,12).map(i=>`<div class="mgr-attn-item"><div class="mgr-attn-icon">${i.icon}</div><div><div class="mgr-attn-title">${i.title}</div><div class="mgr-attn-sub">${i.sub}</div></div></div>`).join(''):'<div class="risk-all-clear">✅ No immediate staffing or manager alerts detected for this view.</div>';
  renderManagerTaskPulse();
  renderDailyManagerPlan(dateKey,cov,calls,agency,todos);
  renderManagerDataHealth();
  captureCurrentManagerExceptions(false);
  renderManagerExceptions();
  renderManagerPeoplePulse(dateKey);
  renderManagerVacancyByRole();
  mgrSaveTrendSnapshot(false);
  renderMgrTrends();
  renderMorningManagerBrief(dateKey,cov,calls,agency,todos);
  renderExecutiveSnapshot(dateKey,cov,calls,agency,todos);
  renderManagerQualityPulse();
}


function siShiftHours(shiftKey) {
  const m=String(shiftKey||'').match(/(\d{4})-(\d{4})/);
  if(!m) return 8;
  const mins=v=>parseInt(v.slice(0,2),10)*60+parseInt(v.slice(2),10);
  let a=mins(m[1]), b=mins(m[2]); if(b<=a) b+=1440;
  return Math.max(0,(b-a)/60);
}
function siDateRange(dateKey) {
  const base=new Date(dateKey+'T12:00:00'), day=base.getDay();
  const start=new Date(base); start.setDate(base.getDate()-day);
  const out=[]; for(let i=0;i<7;i++){ const d=new Date(start); d.setDate(start.getDate()+i); out.push(d.toISOString().slice(0,10)); }
  return out;
}
function siScheduledPeople(dateKey) {
  const seen=new Map(), pl=(state.placements||{})[dateKey]||{};
  Object.values(pl).forEach(arr=>(arr||[]).forEach(p=>{
    const role=String(p.role||'').toUpperCase();
    if(!['RN','LPN','CA'].includes(role)) return;
    if(!seen.has(p.name)) seen.set(p.name,{name:p.name,role});
  }));
  return [...seen.values()];
}
function siIsAgency(name) {
  const ag=(state.agencyDates||{})[name]||{};
  const ms=(MASTER_STAFF||[]).find(x=>x.name===name)||{};
  return !!(ag.isAgency||ms.agency||ms.isAgency||ms.type==='Agency');
}
function siAgencyPeople(dateKey) {
  // Scheduled agency staff for the selected Board date (coverage view).
  return siScheduledPeople(dateKey).filter(p=>siIsAgency(p.name));
}
function siAgencyWorkforce() {
  // Workforce agency mix comes from the Directory Agency checkbox, not today's Board.
  // This matches state.agencyDates[name].isAgency used by toggleAgency().
  const all=(MASTER_STAFF||[]).filter(s=>['RN','LPN','CA'].includes(String(s.job||s.role||'').toUpperCase()));
  const agency=all.filter(s=>siIsAgency(s.name));
  return {all,agency,pct:all.length?Math.round(agency.length/all.length*100):0};
}
function siUkgovertime() {
  const log=state.otLog||{};
  const ukgRows=[];
  Object.entries(log).forEach(([name,entries])=>{
    (entries||[]).forEach(e=>{
      const notes=String(e.notes||'');
      if(notes.toLowerCase().includes('imported from ukg') && (parseFloat(e.otHrs)||0)>0){
        const ms=(MASTER_STAFF||[]).find(x=>x.name===name)||{};
        ukgRows.push({name,role:String(ms.job||ms.role||'').toUpperCase(),payPeriod:e.payPeriod||'',hours:parseFloat(e.otHrs)||0,notes});
      }
    });
  });
  if(!ukgRows.length) return {payPeriod:'',rows:[],total:0};
  const payPeriod=ukgRows.map(r=>r.payPeriod).filter(Boolean).sort().reverse()[0]||'';
  const rows=ukgRows.filter(r=>r.payPeriod===payPeriod).sort((a,b)=>b.hours-a.hours);
  return {payPeriod,rows,total:rows.reduce((n,r)=>n+r.hours,0)};
}
function renderStaffingIntelligence() {
  const summary=document.getElementById('si-summary'); if(!summary) return;
  const dt=mgrBoardDate(), cov=mgrCoverage(dt), people=siScheduledPeople(dt), agency=siAgencyPeople(dt), ukgOt=siUkgovertime(), ot=ukgOt.rows;
  let open=0, shortageWindows=0;
  cov.forEach(x=>{ let bad=false; ['RN','LPN','CA'].forEach(r=>{ const d=Math.max(0,MGR_MIN[r]-x[r]); open+=d; if(d) bad=true; }); if(bad) shortageWindows++; });
  const agencyPct=people.length?Math.round(agency.length/people.length*100):0;
  const score=Math.max(0,Math.round(100-(open/(cov.length*(MGR_MIN.RN+MGR_MIN.LPN+MGR_MIN.CA))*100)));
  summary.innerHTML=[
    mgrTile('Coverage Score',score+'%',open?open+' role-slots below minimum':'All windows meet minimum',open?'mgr-status-bad':'mgr-status-good',null,'🎯'),
    mgrTile('Coverage Gaps',open,shortageWindows?shortageWindows+' of '+cov.length+' windows affected':'No gaps detected',open?'mgr-status-bad':'mgr-status-good','board','🚨'),
    mgrTile('Agency Mix',agencyPct+'%',agency.length+' of '+people.length+' scheduled staff',agencyPct>=25?'mgr-status-warn':'','directory','🧳'),
    mgrTile('UKG Overtime',ot.length,ukgOt.payPeriod?(ukgOt.total.toFixed(1)+'h · PP '+ukgOt.payPeriod):'No UKG OT import found',ot.length?'mgr-status-warn':'','overtime','⏱')
  ].join('');

  const gaps=[];
  cov.forEach(x=>['RN','LPN','CA'].forEach(r=>{ const d=MGR_MIN[r]-x[r]; if(d>0) gaps.push({x,r,d}); }));
  const ge=document.getElementById('si-gaps');
  ge.innerHTML=gaps.length?gaps.map(g=>`<div class="mgr-attn-item"><div class="mgr-attn-icon">🚨</div><div><div class="mgr-attn-title">${g.x.label} · ${g.r} short ${g.d}</div><div class="mgr-attn-sub">${g.x[g.r]} scheduled · ${MGR_MIN[g.r]} required · ${g.x.time}</div></div></div>`).join(''):'<div class="risk-all-clear">✅ All four coverage windows meet 6 RN + 1 LPN + 4 CA.</div>';

  const we=document.getElementById('si-windows');
  we.innerHTML=cov.map(x=>{ const line=(r,n)=>`<div class="mgr-role-line"><span>${r}</span><span class="${x[r]<n?'mgr-short':'mgr-met'}">${x[r]} / ${n}${x[r]<n?' · SHORT '+(n-x[r]):' ✓'}</span></div>`; return `<div class="mgr-window"><div class="mgr-window-title">${x.label}<br><span style="font-weight:400;color:var(--text3);">${x.time}</span></div>${line('RN',6)}${line('LPN',1)}${line('CA',4)}</div>`; }).join('');

  const ae=document.getElementById('si-agency');
  ae.innerHTML=agency.length?`<div style="display:flex;align-items:end;gap:12px;margin-bottom:10px;"><div style="font-family:'IBM Plex Mono';font-size:28px;font-weight:700;color:var(--purple2);">${agencyPct}%</div><div style="font-size:11px;color:var(--text2);padding-bottom:4px;">${agency.length} agency / ${people.length} scheduled RN/LPN/CA</div></div>`+agency.map(p=>`<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:11px;"><span class="tag ${p.role==='RN'?'tag-rn':p.role==='LPN'?'tag-lpn':'tag-ca'}">${p.role}</span> ${p.name}</div>`).join(''):'<div class="risk-all-clear">✅ No agency staff detected on the selected Board date.</div>';

  const oe=document.getElementById('si-ot');
  oe.innerHTML=ot.length?`<div style="font-size:10px;color:var(--text3);margin-bottom:7px;">Latest UKG import · Pay period ${ukgOt.payPeriod} · <strong style="color:var(--white);">${ukgOt.total.toFixed(1)} total OT hours</strong></div>`+ot.slice(0,12).map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:11px;"><span><span class="tag ${x.role==='RN'?'tag-rn':x.role==='LPN'?'tag-lpn':'tag-ca'}">${x.role||'—'}</span> ${x.name}</span><strong style="color:var(--amber2);font-family:'IBM Plex Mono';">${x.hours.toFixed(1)}h</strong></div>`).join(''):'<div style="padding:12px;border:1px dashed var(--border);border-radius:6px;color:var(--text3);font-size:11px;line-height:1.5;">No UKG overtime import found. Paste the UKG overtime report in <strong style="color:var(--white);">Staff → Overtime</strong> and Staffing Intelligence will use it automatically.</div>';

  const re=document.getElementById('si-recommendation');
  let rec='Current Board staffing meets the hard minimum across all four coverage windows.';
  let tone='risk-all-clear';
  if(open){ const worst=cov.map(x=>({x,miss:['RN','LPN','CA'].reduce((n,r)=>n+Math.max(0,MGR_MIN[r]-x[r]),0)})).sort((a,b)=>b.miss-a.miss)[0]; rec=`Prioritize ${worst.x.label} (${worst.x.time}). It has ${worst.miss} uncovered role-slot${worst.miss===1?'':'s'}. Use the Call-In / Coverage Finder before adding avoidable overtime or agency coverage.`; tone='risk-flag crit'; }
  else if(ot.length){ rec=`Minimum staffing is covered. The latest UKG import (${ukgOt.payPeriod}) shows ${ot.length} staff member${ot.length===1?'':'s'} with ${ukgOt.total.toFixed(1)} total overtime hours. Review the highest OT users before adding additional premium shifts.`; tone='risk-flag warn'; }
  else if(agencyPct>=25){ rec=`Minimum staffing is covered, but agency represents ${agencyPct}% of today's scheduled RN/LPN/CA workforce. Review upcoming vacancies and replacement opportunities.`; tone='risk-flag warn'; }
  re.innerHTML=`<div class="${tone}">${tone==='risk-all-clear'?'✅':'💡'} ${rec}</div>`;
}

function qiCurrentMonth() {
  const d=new Date(), key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const staff=(MASTER_STAFF||[]).filter(x=>x.job==='RN'||x.job==='LPN');
  let scans=0,scanT=0,pain=0,painT=0,txN=0,txD=0;
  staff.forEach(x=>{const q=((state.qualityData||{})[x.name]||{})[key]||{}; scans+=+q.scans||0;scanT+=+q.scanTotal||0;pain+=+q.pain||0;painT+=+q.painTotal||0;txN+=+q.txNum||0;txD+=+q.txDen||0;});
  return {key,scanPct:scanT?Math.round(scans/scanT*100):null,painPct:painT?Math.round(pain/painT*100):null,txPct:txD?Math.round(txN/txD*100):null,scanT,painT,txD};
}
function qiStatus(actual,target,lower){ if(actual===null||actual===undefined||actual==='') return 'none'; const a=+actual; if(lower) return a<=target?'good':a<=target*1.2?'warn':'bad'; return a>=target?'good':a>=target*.9?'warn':'bad'; }
function renderQualityIntelligence(){
  const se=document.getElementById('qi-summary'); if(!se)return;
  const m=qiCurrentMonth(), goals=state.unitGoals2026||{}, yr=new Date().getFullYear();
  const falls=(state.unitFalls||[]).filter(f=>{const d=new Date((f.date||'')+'T12:00:00');return !isNaN(d)&&d.getFullYear()===yr;}).length;
  let hapis=0, staffFlags=0; Object.values(state.staffIncidents||{}).forEach(si=>{(si.hapis||[]).forEach(e=>{if(String(e.date||'').startsWith(String(yr)))hapis++}); ['scanning','painReassess','missedTx'].forEach(k=>staffFlags+=(si[k]||[]).filter(e=>!e.date||String(e.date).startsWith(String(yr))).length);});
  const goalRows=UNIT_GOALS_2026.filter(g=>!['rnTurnover','lpnCaTurnover'].includes(g.key)).map(g=>{let a=goals['actual_'+g.key]; if(g.key==='falls' && (a===''||a==null))a=falls; if(g.key==='hapi'&&(a===''||a==null))a=hapis; if(g.key==='painPct'&&(a===''||a==null)&&m.painPct!==null)a=m.painPct; return {...g,actual:a,status:qiStatus(a,g.target,g.lower)};});
  const out=goalRows.filter(g=>g.status==='bad').length, warn=goalRows.filter(g=>g.status==='warn').length;
  const cls=x=>x==='bad'?'mgr-status-bad':x==='warn'?'mgr-status-warn':x==='good'?'mgr-status-good':'';
  se.innerHTML=[mgrTile('Pain Reassessment',m.painPct===null?'—':m.painPct+'%',m.painT?m.painT+' opportunities this month':'No current-month data',cls(qiStatus(m.painPct,95,false)),'quality','💔'),mgrTile('BCMA Scanning',m.scanPct===null?'—':m.scanPct+'%',m.scanT?m.scanT+' medication opportunities':'No current-month data',cls(qiStatus(m.scanPct,95,false)),'quality','💊'),mgrTile('Falls YTD',falls,'Goal ≤ 30/year',cls(qiStatus(falls,30,true)),'quality','🚶'),mgrTile('HAPI YTD',hapis,'Goal ≤ 9/year',cls(qiStatus(hapis,9,true)),'incidents','🩹')].join('');
  const alerts=[]; goalRows.forEach(g=>{if(g.status==='bad'||g.status==='warn')alerts.push({sev:g.status,title:g.label+' '+(g.actual??'—')+' '+g.unit,sub:'Target '+(g.lower?'≤ ':'≥ ')+g.target+' '+g.unit});}); if(staffFlags)alerts.push({sev:'warn',title:staffFlags+' staff quality flag'+(staffFlags===1?'':'s')+' YTD',sub:'Scanning, pain reassessment, or missed-transfusion flags logged in Incidents'});
  document.getElementById('qi-alerts').innerHTML=alerts.length?alerts.sort((a,b)=>a.sev==='bad'?-1:1).map(a=>`<div class="mgr-attn-item"><div class="mgr-attn-icon">${a.sev==='bad'?'🚨':'⚠️'}</div><div><div class="mgr-attn-title">${a.title}</div><div class="mgr-attn-sub">${a.sub}</div></div></div>`).join(''):'<div class="risk-all-clear">✅ No quality goal exceptions detected from entered data.</div>';
  document.getElementById('qi-goals').innerHTML=goalRows.map(g=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:11px;"><span>${g.icon} ${g.label}</span><span style="font-family:'IBM Plex Mono';font-weight:700;color:${g.status==='bad'?'var(--red2)':g.status==='warn'?'var(--amber2)':g.status==='good'?'var(--green2)':'var(--text3)'};">${g.actual!==undefined&&g.actual!==null&&g.actual!==''?g.actual:'—'} <span style="font-size:9px;font-weight:400;">/ ${g.lower?'≤':'≥'} ${g.target}</span></span></div>`).join('');
  const metric=(icon,label,val,target,den)=>`<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;"><span>${icon} ${label}<div style="font-size:9px;color:var(--text3);margin-top:2px;">${den?'n='+den:'No denominator entered'}</div></span><strong style="font-family:'IBM Plex Mono';color:${val===null?'var(--text3)':val>=target?'var(--green2)':val>=target*.9?'var(--amber2)':'var(--red2)'};">${val===null?'—':val+'%'}</strong></div>`;
  document.getElementById('qi-month').innerHTML=metric('💊','BCMA scanning',m.scanPct,95,m.scanT)+metric('💔','Pain reassessment',m.painPct,95,m.painT)+metric('🩸','Transfusion audit compliance',m.txPct,90,m.txD)+`<div style="font-size:9px;color:var(--text3);margin-top:8px;">Source: Quality Metrics · ${m.key}. Blank means no data entered, not noncompliance.</div>`;
  document.getElementById('qi-events').innerHTML=`<div class="grid-3"><div class="stat-chip"><div class="stat-num" style="color:${falls?'var(--amber2)':'var(--green2)'}">${falls}</div><div class="stat-label">Falls YTD</div></div><div class="stat-chip"><div class="stat-num" style="color:${hapis?'var(--amber2)':'var(--green2)'}">${hapis}</div><div class="stat-label">HAPI YTD</div></div><div class="stat-chip"><div class="stat-num" style="color:${staffFlags?'var(--amber2)':'var(--green2)'}">${staffFlags}</div><div class="stat-label">Quality Flags</div></div></div>`;
  let priority='Quality data entered is currently within target ranges.'; let tone='risk-all-clear'; const bad=alerts.find(a=>a.sev==='bad')||alerts[0]; if(bad){priority=`Focus first on ${bad.title}. ${bad.sub}. Open the source tracker, validate the data, and document the follow-up/action plan.`;tone=bad.sev==='bad'?'risk-flag crit':'risk-flag warn';} else if(m.scanPct===null||m.painPct===null){priority='Current-month quality data is incomplete. Enter or import BCMA and pain reassessment data before interpreting compliance.';tone='risk-flag warn';}
  document.getElementById('qi-priority').innerHTML=`<div class="${tone}">${tone==='risk-all-clear'?'✅':'💡'} ${priority}</div>`;
}

function initAll() {
  initBoard();
  renderManagerHome();
  renderStaffingIntelligence();
  renderQualityIntelligence();
  initCharge();
  renderDirectory();
  renderEducation();
  initNotes();
  buildStaffDatalist();
  renderRisk();
  updateBackupSummary();
  renderTrackingGrid();
  loadVacancyBudgets();
  renderRemovedStaff();
  renderOpenShifts();
  renderSetScheduleGrid();
  renderBlockedDays();
  renderVacationList();
  migrateVacationData();
  populateVacStaffSelect();
  initAbsenceTab();
  initQualityYears();
  initStrokeYears();
  initTodo();
  initNineBox();
  initIncidents();
  initInterview();
  initOrientation();
  initOnboarding();
  initCoaching();
  initReadSign();
  renderBoardPolicyAlerts();
  updateCallInSummary();
  renderWeekendSummary('board-weekend-summary');
  initTwilioUI();
  // Restore comp collapse state
  if (isCompCollapsed()) toggleCompCollapse(true);
  if (isCompNoneDue()) applyCompNoneDue(true);
  initCompetency();
  initRecognition();
  initPolicies();
  initBroadcast();
  initRrtLog();
  initOtTab();
  initIncLog();
  initProductivity();
  initEquipmentLog();
  renderShiftTargets();
  // Manager Home is the default landing screen.
  setTimeout(() => {
    const homeTab = document.querySelector('[data-panel="home"]');
    if (homeTab) switchTab(homeTab);
  }, 0);
}


// ── Recovered Data Seed ──
// Baked-in data from localStorage recovery — will not overwrite existing saved data
const SEED_DATA = {
  "phones": {
    "Arnold, Carly E": "607-228-0689",
    "Banks, Breonica N": "",
    "Bantin, Trinity H": "607-378-7126",
    "Barnhart, Adriana C": "607-731-8955",
    "Batario, John Richard Craig": "",
    "Christiansen, Deanna M": "607-425-0913",
    "Cook, Mark": "607-426-2771",
    "Delacruz, Alysson": "510-637-8124",
    "Donohoe, Nicola": "607-425-2629",
    "Fitzgerald, Kimberly A": "607-738-2426",
    "Gray, Catima": "",
    "Handsom, Jenifer": "607-425-8828",
    "Hoff, Lorraine": "607-857-0787",
    "Holmes, Elizabeth N": "607-207-4562",
    "Hunter, Tyree": "607-857-2350",
    "Kathan, Jenna L": "",
    "King, Travonne J": "607-742-7645",
    "Mansour, Ryma N": "607-425-5794",
    "Morton, Madison A": "",
    "Mosher, Cassie L": "607-483-9387",
    "Pierce, Wesley J": "607-267-7944",
    "Porter, Alannah R": "570-529-7281",
    "Riedl, Sarah E": "607-346-4590",
    "Satterlee, Morgan M": "607-415-7530",
    "Schilling, Saria M": "607-238-6298",
    "Stoyle, Carmella": "330-221-4993",
    "VanAlstine, Alexa M": "607-329-3336",
    "Fox, Laura S": "256-283-2648",
    "Kelly, Lindsey N": "607-731-9078",
    "Shafer, Wayne A": "607-592-0909",
    "Stebbins, Danielle L": "570-529-4347",
    "Alexander, Jessica L": "570-423-0367",
    "Barringer, Heather": "315-225-5240",
    "Burkhart, Danielle M": "607-857-6079",
    "Cannon, Kelly": "814-366-4406",
    "Caswell, Kaleigh": "607-227-9208",
    "Chaves Garcia, Tabata": "518-680-2624",
    "Cole, Curtiss K": "607-346-0594",
    "Condame, Robin E": "215-808-4593",
    "Comiso, Deejay": "",
    "Dean, Kelly L": "607-481-3076",
    "Dibble, Martha": "814-331-5324",
    "Diederich, Sherry L": "",
    "Fombe, Rose": "585-729-7888",
    "Goree, Kadian O": "914-843-8262",
    "Hanyon, Sean": "315-879-1331",
    "Hatala, Carrie A": "607-426-2120",
    "Hunsinger, Jennifer J": "570-886-6086",
    "Johnson, Alyssa": "570-419-0186",
    "Jones, Samantha F": "",
    "Kitching, Jill": "607-846-5496",
    "Knight, Robin V": "814-249-2612",
    "Muller, Laurel A": "607-259-5672",
    "Murphy, Stephanie": "304-416-9530",
    "Quinlan, Meghan M": "607-382-9865",
    "Robenson, Jean-Pierre": "267-591-5254",
    "Robinson, Miranda J": "607-382-2952",
    "San Li, Jin": "778-990-8399",
    "Thomas, Jamie": "315-247-9365",
    "Tye, Amber M": "712-249-8365",
    "Walker, Katie L": "607-398-4478",
    "Wingler, Matthew": "585-606-8114",
    "Ron Higley": "716-378-7104"
  },
  "emails": {
    "Arnold, Carly E": "",
    "Bantin, Trinity H": "",
    "Barnhart, Adriana C": "",
    "Christiansen, Deanna M": "",
    "Cook, Mark": "",
    "Donohoe, Nicola": "",
    "Holmes, Elizabeth N": "",
    "Hunter, Tyree": "",
    "Mosher, Cassie L": "",
    "Pierce, Wesley J": "",
    "Satterlee, Morgan M": "",
    "Hunsinger, Jennifer J": "",
    "Muller, Laurel A": ""
  },
  "birthdays": {},
  "anniversaries": {},
  "notes": {},
  "chargeNurses": {},
  "certs": {
    "Goree, Kadian O": {
      "ACLS": "6/30/27",
      "BLS": "6/30/27",
      "NIHSS": "8/19/26"
    },
    "Alexander, Jessica L": {
      "ACLS": "8/31/26",
      "BLS": "6/3026",
      "NIHSS": "6/26/26",
      "License": "12/31/27"
    },
    "Armstrong, Katelyn N": {
      "BLS": "2/28/28"
    },
    "Arnold, Carly E": {
      "BLS": "12/31/27"
    },
    "Bantin, Trinity H": {
      "BLS": "2/28/27"
    },
    "Barnhart, Adriana C": {
      "BLS": "3/31/27"
    },
    "Barringer, Heather": {
      "ACLS": "3/31/28",
      "BLS": "1/31/28",
      "NIHSS": "4/29/26"
    },
    "Burkhart, Danielle M": {
      "ACLS": "4/30/27",
      "BLS": "4/30/27",
      "NIHSS": "2/17/26",
      "License": ""
    },
    "Cannon, Kelly": {
      "ACLS": "2/28/27",
      "BLS": "6/30/26",
      "NIHSS": "2/28/28"
    },
    "Caswell, Kaleigh": {
      "ACLS": "1/31/28",
      "BLS": "7/31/26",
      "NIHSS": "8/22/27"
    },
    "Chaves Garcia, Tabata": {
      "ACLS": "3/31/28",
      "BLS": "1/31/28",
      "NIHSS": "4/4/27"
    },
    "Christiansen, Deanna M": {
      "ACLS": "",
      "BLS": "7/31/27"
    },
    "Cole, Curtiss K": {
      "ACLS": "12/31/27",
      "BLS": "12/31/27",
      "NIHSS": "3/9/28"
    },
    "Condame, Robin E": {
      "ACLS": "6/30/27",
      "BLS": "6/30/27",
      "NIHSS": "7/25/27"
    },
    "Cook, Mark": {
      "BLS": "11/19/26"
    },
    "Dean, Kelly L": {
      "ACLS": "",
      "BLS": "3/31/27",
      "NIHSS": "9/11/26"
    },
    "Delacruz, Alysson": {
      "ACLS": "",
      "BLS": "9/30/26"
    },
    "Dibble, Martha": {
      "ACLS": "9/30/27",
      "BLS": "3/31/28",
      "NIHSS": "2/25/27"
    },
    "Donohoe, Nicola": {
      "BLS": "11/30/26"
    },
    "Fitzgerald, Kimberly A": {
      "BLS": "4/30/27"
    },
    "Fombe, Rose": {
      "ACLS": "5/31/27",
      "BLS": "1/31/28",
      "NIHSS": "2/4/27"
    },
    "Fox, Laura S": {
      "BLS": "12/31/26"
    },
    "Handsom, Jenifer": {
      "BLS": "3/3128"
    },
    "Hanyon, Sean": {
      "ACLS": "6/30/27",
      "BLS": "1/31/27",
      "NIHSS": "6/30/27"
    },
    "Hatala, Carrie A": {
      "ACLS": "10/31/26",
      "BLS": "10/31/26",
      "NIHSS": "8/5/27"
    },
    "Hoff, Lorraine": {
      "BLS": "7/31/26"
    },
    "Holmes, Elizabeth N": {
      "BLS": "7/31/27"
    },
    "Hunsinger, Jennifer J": {
      "ACLS": "12/31/26",
      "BLS": "12/31/26",
      "NIHSS": "6/12/27"
    },
    "Hunter, Tyree": {
      "BLS": "7/31/26"
    },
    "Johnson, Alyssa": {
      "ACLS": "1/31/28",
      "BLS": "6/30/27",
      "NIHSS": "1/28/27"
    },
    "Kathan, Jenna L": {
      "BLS": "6/30/27"
    },
    "Kelly, Lindsey N": {
      "BLS": "10/31/27"
    },
    "King, Lakya": {
      "BLS": "4/30/28"
    },
    "King, Travonne J": {
      "BLS": "5/31/27"
    },
    "Kitching, Jill": {
      "ACLS": "6/30/26",
      "BLS": "6/30/26",
      "NIHSS": "2/24/27"
    },
    "Knight, Robin V": {
      "BLS": "7/31/27"
    },
    "Mansour, Ryma N": {
      "BLS": "5/31/27"
    },
    "Morton, Madison A": {
      "BLS": "4/30/28"
    },
    "Mosher, Cassie L": {
      "BLS": "7/31/27"
    },
    "Muller, Laurel A": {
      "ACLS": "6/30/27",
      "BLS": "7/31/27",
      "NIHSS": "5/8/26"
    },
    "Murphy, Stephanie": {
      "ACLS": "2/28/28",
      "BLS": "9/30/26",
      "NIHSS": "5/27/27"
    },
    "Pierce, Wesley J": {
      "BLS": "4/30/28"
    },
    "Porter, Alannah R": {
      "BLS": "1/31/27"
    },
    "Quinlan, Meghan M": {
      "ACLS": "1/31/27",
      "BLS": "3/31/27",
      "NIHSS": "8/24/26"
    },
    "Riedl, Sarah E": {
      "BLS": "11/30/27"
    },
    "Robenson, Jean-Pierre": {
      "ACLS": "9/30/27",
      "BLS": "10/31/27",
      "NIHSS": "1/23/28"
    },
    "Robinson, Miranda J": {
      "ACLS": "7/31/26",
      "BLS": "7/31/26",
      "NIHSS": "2/23/28"
    },
    "San Li, Jin": {
      "ACLS": "2/28/28",
      "BLS": "9/30/27",
      "NIHSS": "2/10/28"
    },
    "Satterlee, Morgan M": {
      "BLS": "10/31/26"
    },
    "Schilling, Saria M": {
      "BLS": "2/28/28"
    },
    "Shafer, Wayne A": {
      "BLS": "3/31/27"
    },
    "Stebbins, Danielle L": {
      "BLS": "10/31/26"
    },
    "Thomas, Jamie": {
      "ACLS": "12/31/26",
      "BLS": "9/30/26",
      "NIHSS": "5/16/26"
    },
    "Tye, Amber M": {
      "ACLS": "229/28",
      "BLS": "10/31/27",
      "NIHSS": "1/15/27"
    },
    "VanAlstine, Alexa M": {
      "BLS": "10/31/26"
    },
    "Walker, Katie L": {
      "BLS": "7/31/27",
      "NIHSS": "3/25/28"
    },
    "Wingler, Matthew": {
      "ACLS": "2/28/28",
      "BLS": "6/30/26",
      "NIHSS": "1/26/26"
    }
  },
  "pendingEdu": {},
  "customStaff": [],
  "agencyDates": {}
};

function seedDataIfEmpty() {
  try {
    const existing = localStorage.getItem(LS_KEY);

    // Helper: merge seed into state, seed wins for missing entries only
    function mergeSeed() {
      // Phones: fill any missing
      Object.entries(SEED_DATA.phones || {}).forEach(([k,v]) => {
        if (v && !state.phones[k]) state.phones[k] = v;
      });
      // Certs: fill any missing records or fields
      Object.entries(SEED_DATA.certs || {}).forEach(([name, certObj]) => {
        if (!state.certs[name]) {
          state.certs[name] = certObj;
        } else {
          Object.entries(certObj).forEach(([field, val]) => {
            if (val && !state.certs[name][field]) state.certs[name][field] = val;
          });
        }
      });
      // Custom staff
      if ((!state.customStaff || !state.customStaff.length) && SEED_DATA.customStaff?.length) {
        state.customStaff = SEED_DATA.customStaff;
      }
    }

    if (!existing) {
      // No existing data at all — full restore from seed
      Object.assign(state.phones,        SEED_DATA.phones        || {});
      Object.assign(state.emails,        SEED_DATA.emails        || {});
      Object.assign(state.birthdays,     SEED_DATA.birthdays     || {});
      Object.assign(state.anniversaries, SEED_DATA.anniversaries || {});
      Object.assign(state.notes,         SEED_DATA.notes         || {});
      Object.assign(state.chargeNurses,  SEED_DATA.chargeNurses  || {});
      Object.assign(state.charge3C,      SEED_DATA.charge3C      || {});
      Object.assign(state.certs,         SEED_DATA.certs         || {});
      Object.assign(state.pendingEdu,    SEED_DATA.pendingEdu    || {});
      if (SEED_DATA.customStaff?.length) state.customStaff = SEED_DATA.customStaff;
      if (SEED_DATA.agencyDates) Object.assign(state.agencyDates, SEED_DATA.agencyDates);
      persistSave();
      showSaveBanner('✓ Your data has been restored from backup');
    } else {
      // Merge — fill gaps without overwriting user entries
      const before = JSON.stringify({p: state.phones, c: state.certs});
      mergeSeed();
      const after = JSON.stringify({p: state.phones, c: state.certs});
      if (before !== after) {
        persistSave();
        showSaveBanner('✓ Missing data restored from backup');
      }
    }
  } catch(e) { console.warn('Seed failed:', e); }
}

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

const FLOAT_SHEET_CSV_DEFAULT = 'https://docs.google.com/spreadsheets/d/1Wj8wwrMl1k3rk-rui4Vyo97jA_ybwxYd-6c9gNbaURc/export?format=csv&gid=0';
function getFloatSheetUrl() {
  return localStorage.getItem('_floatSheetUrl') || FLOAT_SHEET_CSV_DEFAULT;
}

function showFloatSheetSetup() {
  const cur = localStorage.getItem('_floatSheetUrl') || '';
  const existing = document.getElementById('float-sheet-modal');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'float-sheet-modal';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center;';
  div.onclick = e => { if(e.target===div) div.remove(); };
  div.innerHTML = `
    <div style="background:var(--navy);border:1px solid var(--border);border-radius:12px;padding:24px;width:520px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
      <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px;">📊 Google Sheet — Float / Sitter Dates</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:16px;">Auto-fetches on load · refreshes every 5 min · must be set to "Anyone with link can view"</div>

      <div style="background:rgba(46,125,209,0.08);border:1px solid rgba(46,125,209,0.25);border-radius:8px;padding:12px;margin-bottom:14px;font-size:11px;color:var(--text2);line-height:1.7;">
        <strong style="color:var(--accent2);">To share your Google Sheet:</strong><br>
        1. Open the sheet → tap <strong>Share</strong><br>
        2. Change access to <strong>"Anyone with the link"</strong> → <strong>Viewer</strong><br>
        3. Copy the share link and paste it below
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Google Sheet URL (share link or export URL)</div>
        <input id="float-sheet-url-input" type="text" value="${cur}"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:7px 9px;color:var(--white);font-size:11px;outline:none;box-sizing:border-box;">
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Column mapping — which column has each field? (A=1, B=2, C=3...)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">Staff Name col</div>
            <input id="fcol-name" type="number" min="1" max="30" value="${localStorage.getItem('_fCol_name')||'1'}"
              style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 7px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>
          <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">Float Date col</div>
            <input id="fcol-float" type="number" min="1" max="30" value="${localStorage.getItem('_fCol_float')||'2'}"
              style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 7px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>
          <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">Sitter Date col</div>
            <input id="fcol-sitter" type="number" min="1" max="30" value="${localStorage.getItem('_fCol_sitter')||'3'}"
              style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 7px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>
          <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">Call-Off Date col</div>
            <input id="fcol-calloff" type="number" min="1" max="30" value="${localStorage.getItem('_fCol_calloff')||'4'}"
              style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 7px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>
          <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">Mandate col (opt)</div>
            <input id="fcol-mandate" type="number" min="0" max="30" value="${localStorage.getItem('_fCol_mandate')||'5'}"
              style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 7px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>
          <div><div style="font-size:9px;color:var(--text3);margin-bottom:2px;">Header rows to skip</div>
            <input id="fcol-skip" type="number" min="0" max="5" value="${localStorage.getItem('_fCol_skip')||'1'}"
              style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:4px;padding:5px 7px;color:var(--white);font-size:12px;outline:none;box-sizing:border-box;"></div>
        </div>
      </div>

      <div id="float-sheet-test-result" style="font-size:11px;min-height:18px;margin-bottom:12px;"></div>

      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
        <button onclick="document.getElementById('float-sheet-modal').remove()" style="background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:5px;padding:6px 14px;color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>
        <button onclick="testFloatSheetUrl()" style="background:rgba(46,125,209,0.12);border:1px solid rgba(46,125,209,0.35);border-radius:5px;padding:6px 14px;color:var(--accent2);font-size:12px;cursor:pointer;">🔍 Test</button>
        <button onclick="saveFloatSheetConfig()" class="btn btn-primary" style="font-size:12px;padding:6px 18px;">💾 Save & Load</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function testFloatSheetUrl() {
  const raw = document.getElementById('float-sheet-url-input')?.value?.trim();
  const res = document.getElementById('float-sheet-test-result');
  if (!raw) { if(res) res.innerHTML='<span style="color:var(--red2);">Enter a URL first.</span>'; return; }
  const url = normalizeSheetUrl(raw);
  if(res) res.innerHTML='<span style="color:var(--accent2);">Testing...</span>';
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const r = await fetch(proxyUrl);
    if (r.ok) {
      const text = await r.text();
      const lines = text.split('\n').filter(l=>l.trim()).length;
      if(res) res.innerHTML=`<span style="color:var(--green2);">✅ Accessible — ${lines} rows found. Looks good!</span>`;
    } else {
      if(res) res.innerHTML=`<span style="color:var(--red2);">❌ Could not fetch — is the sheet set to "Anyone with link"?</span>`;
    }
  } catch(e) {
    if(res) res.innerHTML=`<span style="color:var(--red2);">❌ Network error — check the URL.</span>`;
  }
}

function normalizeSheetUrl(raw) {
  // Convert share URL to CSV export URL
  if (raw.includes('/export?format=csv')) return raw;
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    const gidMatch = raw.match(/[#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
  }
  return raw;
}

function saveFloatSheetConfig() {
  const raw = document.getElementById('float-sheet-url-input')?.value?.trim();
  if (!raw) return;
  const url = normalizeSheetUrl(raw);
  localStorage.setItem('_floatSheetUrl',    url);
  localStorage.setItem('_fCol_name',    document.getElementById('fcol-name')?.value    || '1');
  localStorage.setItem('_fCol_float',   document.getElementById('fcol-float')?.value   || '2');
  localStorage.setItem('_fCol_sitter',  document.getElementById('fcol-sitter')?.value  || '3');
  localStorage.setItem('_fCol_calloff', document.getElementById('fcol-calloff')?.value || '4');
  localStorage.setItem('_fCol_mandate', document.getElementById('fcol-mandate')?.value || '5');
  localStorage.setItem('_fCol_skip',    document.getElementById('fcol-skip')?.value     || '1');
  document.getElementById('float-sheet-modal')?.remove();
  loadFloatSheet();
  showSaveBanner('📊 Sheet config saved — loading data...');
}



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
async function loadFloatSheet() {
  sheetLoadStatus = 'loading';
  renderTrackingGrid();

  const SHEET_URL = getFloatSheetUrl();
  const skip     = parseInt(localStorage.getItem('_fCol_skip')    || '1');
  const colName  = parseInt(localStorage.getItem('_fCol_name')    || '1') - 1;
  const colFloat = parseInt(localStorage.getItem('_fCol_float')   || '2') - 1;
  const colSitter= parseInt(localStorage.getItem('_fCol_sitter')  || '3') - 1;
  const colOff   = parseInt(localStorage.getItem('_fCol_calloff') || '4') - 1;
  const colMand  = parseInt(localStorage.getItem('_fCol_mandate') || '5') - 1;

  const attempts = [
    SHEET_URL,
    `https://corsproxy.io/?${encodeURIComponent(SHEET_URL)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(SHEET_URL)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(SHEET_URL)}`,
  ];

  let text = null;
  for (const url of attempts) {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (resp.ok) {
        text = await resp.text();
        if (text && text.length > 50) break;
      }
    } catch(e) { /* try next */ }
  }

  if (!text) {
    sheetLoadStatus = 'error';
    renderTrackingGrid();
    return;
  }

  function parseCSV(csv) {
    const rows = [];
    const csvLines = csv.split('\n');
    for (const line of csvLines) {
      if (!line.trim()) continue;
      const cols = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if ((ch === ',' || ch === '\t') && !inQ) { cols.push(cur); cur = ''; }
        else cur += ch;
      }
      cols.push(cur);
      rows.push(cols.map(c => c.trim().replace(/^"|"$/g, '')));
    }
    return rows;
  }

  const parsed = parseCSV(text);
  sheetRows = parsed.slice(skip).filter(r => r.length > colName && r[colName]);

  // Build name-keyed lookup for the tracking grid
  if (!window._floatSummary) window._floatSummary = {};
  sheetRows.forEach(r => {
    const name = r[colName] || '';
    if (!name) return;
    window._floatSummary[name] = {
      float:   colFloat  >= 0 ? (r[colFloat]  || '') : '',
      sitter:  colSitter >= 0 ? (r[colSitter] || '') : '',
      calloff: colOff    >= 0 ? (r[colOff]    || '') : '',
      mandate: colMand   >= 0 ? (r[colMand]   || '') : '',
    };
  });

  sheetLoadStatus = 'loaded';
  renderTrackingGrid();
  showSaveBanner(`✓ Float sheet loaded — ${sheetRows.length} staff records`);
}

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
        <span>⚠ Could not reach Float Response sheet — showing scheduled staff for manual entry.</span>
        <button class="btn btn-ghost btn-sm" onclick="loadFloatSheet()">↻ Retry</button>
      </div>
      ${buildManualGrid()}`;
    return;
  }
  if (sheetLoadStatus === 'idle') {
    el.innerHTML = `<div class="card" style="text-align:center;padding:20px;color:var(--text2);">
      <button class="btn btn-primary" onclick="loadFloatSheet()">📊 Load Float Response Sheet</button>
    </div>`;
    return;
  }

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
      <button class="btn btn-ghost btn-sm" onclick="loadFloatSheet()" title="Reload from Google Sheet">↻ Refresh</button>
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


