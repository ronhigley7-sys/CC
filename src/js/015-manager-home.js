



// ════════════════════════════════════
//  MANAGER HOME / DAILY COMMAND SCREEN
// ════════════════════════════════════
const MGR_MIN = { RN:6, LPN:1, CA:4 };

function mgrBoardDate() {
  const today = new Date().toISOString().split('T')[0];
  if (state.dates && state.dates.includes(today)) return today;
  return state.activeBoardDate || (state.dates && state.dates[0]) || today;
}
function mgrCallinsForDate(dateKey) {
  // Was referenced in 6 places but never defined. Delegates to the existing mgrCallInCount.
  if (typeof mgrCallInCount === 'function') return mgrCallInCount(dateKey);
  let n = 0;
  try {
    Object.keys(state.absenceLog || {}).forEach(name => {
      if ((state.absenceLog[name] || []).some(e => e && e.date === dateKey && e.type !== 'tardy')) n++;
    });
  } catch (e) {}
  return n;
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
    el.innerHTML='<div style="padding:12px;border:1px dashed var(--border);border-radius:7px;color:var(--text3);font-size:11px;">Enter budgeted RN, LPN, and CA FTE in Budget / Vacancy to calculate position-level vacancy rates.</div>';
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
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;font-size:11px;">
            <div style="color:var(--text3);">Budget FTE</div><div style="text-align:right;font-weight:800;color:var(--white);">${r.budget?r.budget.toFixed(1):'—'}</div>
            <div style="color:var(--text3);">Permanent Filled</div><div style="text-align:right;font-weight:800;color:var(--green2);">${r.budget?r.permanentFilled.toFixed(1):'—'}</div>
            <div style="color:var(--text3);">Agency FTE</div><div style="text-align:right;font-weight:800;color:var(--purple2);">${r.budget?r.agencyFTE.toFixed(1):'—'}</div>
            <div style="color:var(--text3);">Vacant FTE</div><div style="text-align:right;font-weight:800;color:${r.vacant>0?'var(--red2)':'var(--green2)'};">${r.budget?r.vacant.toFixed(1):'—'}</div>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,.06);margin-top:8px;padding-top:7px;font-size:11px;color:var(--text3);">
            Incl. agency: <strong style="color:var(--white);">${r.filledWithAgency.toFixed(1)} filled</strong> ·
            <strong style="color:${tone(r.pctWithAgency)};">${r.pctWithAgency===null?'—':r.pctWithAgency.toFixed(1)+'% vacancy'}</strong>
          </div>
        </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:7px;">
      Primary vacancy rate excludes agency: (Budget FTE − Permanent Filled FTE) ÷ Budget FTE.
      “Incl. agency” shows temporary coverage against the same budget.
    </div>`;
}
function renderManagerPeoplePulse(dateKey){const el=document.getElementById('mgr-people-pulse');if(!el)return;const aw=siAgencyWorkforce(),agencyPct=aw.pct,vac=mgrVacancySummary(),orient=mgrOrientationCount(),certs=mgrCertDueCount(30),coach=mgrCoachingFollowupCount();el.innerHTML=[mgrTile('Vacancy',vac.hasBudget?vac.open+' FTE':'—',vac.hasBudget?`${vac.filled} permanent + ${vac.agency} agency / ${vac.budget} budgeted`:'Enter budgeted FTE',vac.hasBudget?(vac.open>0?'mgr-status-warn':'mgr-status-good'):'','vacancy','💼'),mgrTile('Agency Mix',agencyPct+'%',`${aw.agency.length} agency of ${aw.all.length} RN/LPN/CA staff`,agencyPct>=25?'mgr-status-warn':aw.agency.length?'':'mgr-status-good','directory','🧳'),mgrTile('Orientation',orient,orient?'Staff currently orienting':'No active orientation',orient?'mgr-status-warn':'mgr-status-good','orientation','🎓'),mgrTile('Certs Due ≤30d',certs,certs?'Upcoming expirations':'None detected',certs?'mgr-status-warn':'mgr-status-good','education','📜'),mgrTile('Coaching Follow-Up',coach,coach?'Due/overdue follow-ups':'No due follow-ups',coach?'mgr-status-bad':'mgr-status-good','coaching','💬')].join('');}
function mgrBriefItem(p,icon,title,sub,panel){const tones={1:'var(--red2)',2:'var(--amber2)',3:'var(--accent2)'};return `<div class="mgr-attn-item" ${panel?`onclick="switchTab(document.querySelector('[data-panel=${panel}]'))" style="cursor:pointer;"`:''}><div class="mgr-attn-icon">${icon}</div><div style="flex:1;"><div class="mgr-attn-title" style="color:${tones[p]||'var(--white)'};">${title}</div><div class="mgr-attn-sub">${sub}</div></div><div style="font-size:11px;color:var(--text3);font-family:'IBM Plex Mono';">${panel?'OPEN →':''}</div></div>`;}

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
      style="flex-shrink:0;background:${exists?'rgba(37,168,104,.12)':'rgba(46,125,209,.10)'};border:1px solid ${exists?'rgba(37,168,104,.35)':'rgba(46,125,209,.30)'};color:${exists?'var(--green2)':'var(--accent2)'};border-radius:5px;padding:3px 6px;font-size:11px;font-weight:800;cursor:pointer;">
      ${exists?'✓ TASK':'+ TASK'}
    </button>`;
  };

  const chip=i=>{
    const tone=i.p===1?'var(--red2)':i.p===2?'var(--amber2)':'var(--accent2)';
    return `<div style="display:flex;align-items:center;gap:5px;padding:5px 6px;border:1px solid var(--border);border-radius:7px;background:var(--card2);min-width:175px;max-width:285px;">
      <div onclick="mgrPriorityOpen('${i.panel}')" style="cursor:pointer;display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
        <span>${i.icon}</span>
        <div style="min-width:0;">
          <div style="font-size:11px;font-weight:800;color:${tone};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.title}</div>
          <div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.sub}</div>
        </div>
      </div>
      ${taskButton(i)}
    </div>`;
  };

  el.innerHTML=`
    <div style="display:grid;grid-template-columns:minmax(300px,1.25fr) minmax(450px,3fr);gap:8px;align-items:stretch;">
      <div style="padding:8px 10px;border:1px solid rgba(179,35,24,.45);background:rgba(179,35,24,.10);border-radius:8px;display:flex;align-items:center;gap:8px;">
        <div onclick="mgrPriorityOpen('${top.panel}')" style="cursor:pointer;min-width:0;flex:1;">
          <div style="font-size:11px;color:var(--red2);font-weight:800;text-transform:uppercase;letter-spacing:.07em;">Top Priority</div>
          <div style="font-size:12px;color:var(--white);font-weight:800;margin-top:3px;">${top.icon} ${top.title}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;">${top.sub}</div>
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
    <div style="width:155px;font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${label}</div>
    <div style="flex:1;"><div style="font-size:12px;font-weight:800;color:${tone};">${value}</div>${detail?`<div style="font-size:11px;color:var(--text3);margin-top:2px;">${detail}</div>`:''}</div>
    <div style="font-size:11px;color:var(--text3);">${panel?'OPEN →':''}</div>
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
  const tile=(label,value,sub,status,panel)=>{const c=status==='bad'?'var(--red2)':status==='warn'?'var(--amber2)':status==='good'?'var(--green2)':'var(--white)';return `<div ${panel?`onclick="switchTab(document.querySelector('[data-panel=${panel}]'))"`:''} style="cursor:${panel?'pointer':'default'};background:var(--card2);border:1px solid var(--border);border-radius:7px;padding:9px 10px;min-height:64px;"><div style="font-size:11px;color:var(--text3);font-weight:800;text-transform:uppercase;letter-spacing:.05em;">${label}</div><div style="font-size:14px;font-weight:800;color:${c};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div><div style="font-size:11px;color:var(--text3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sub||''}</div></div>`;};
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
  if(nums.length<2) return '<div style="font-size:11px;color:var(--text3);">Need 2+ monthly snapshots</div>';
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
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">${t.icon} ${t.text} · Agency ${latest.agencyFTE||0} FTE</div>
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
    <div style="font-size:11px;color:var(--text3);margin-top:7px;">Forecast assumes permanent FTE stays unchanged and agency staff leave on their entered contract end dates with no replacement or extension. Monthly trend history is stored in this browser.</div>`;
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
      <div style="font-size:11px;color:${idx===0?'var(--red2)':'var(--text3)'};font-weight:800;text-transform:uppercase;">${idx===0?'Top Action':'Priority '+(idx+1)}</div>
      <div style="font-size:11px;font-weight:800;color:var(--white);margin-top:3px;">${i.icon} ${i.title}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;line-height:1.35;">${i.detail}</div>
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
    <div style="font-size:11px;color:${bad?'var(--red2)':'var(--green2)'};font-weight:800;">${bad ? bad+' missing/critical' : 'No critical data gaps'}</div>
    ${warn?`<div style="font-size:11px;color:var(--amber2);font-weight:800;">· ${warn} needs review</div>`:''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(6,minmax(140px,1fr));gap:6px;">
    ${rows.map(r=>`<div onclick="mgrPriorityOpen('${r.panel}')" style="cursor:pointer;background:var(--card2);border:1px solid var(--border);border-radius:7px;padding:7px 8px;">
      <div style="font-size:11px;color:var(--text3);font-weight:800;text-transform:uppercase;">${icon(r.status)} ${r.label}</div>
      <div style="font-size:11px;font-weight:800;color:${tone(r.status)};margin-top:3px;">${r.value}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.detail}</div>
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
        <div><div style="font-size:11px;color:${sevColor(x.severity)};font-weight:800;text-transform:uppercase;">${x.severity}</div><div style="font-size:11px;color:var(--text3);">${x.type}</div></div>
        <div onclick="mgrPriorityOpen('${x.panel}')" style="cursor:pointer;min-width:0;"><div style="font-size:11px;color:var(--white);font-weight:800;">${x.title}</div><div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${x.detail}</div></div>
        <div style="font-size:11px;color:var(--text2);">${x.owner||x.status}</div>
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
  oe.innerHTML=ot.length?`<div style="font-size:11px;color:var(--text3);margin-bottom:7px;">Latest UKG import · Pay period ${ukgOt.payPeriod} · <strong style="color:var(--white);">${ukgOt.total.toFixed(1)} total OT hours</strong></div>`+ot.slice(0,12).map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:11px;"><span><span class="tag ${x.role==='RN'?'tag-rn':x.role==='LPN'?'tag-lpn':'tag-ca'}">${x.role||'—'}</span> ${x.name}</span><strong style="color:var(--amber2);font-family:'IBM Plex Mono';">${x.hours.toFixed(1)}h</strong></div>`).join(''):'<div style="padding:12px;border:1px dashed var(--border);border-radius:6px;color:var(--text3);font-size:11px;line-height:1.5;">No UKG overtime import found. Paste the UKG overtime report in <strong style="color:var(--white);">Staff → Overtime</strong> and Staffing Intelligence will use it automatically.</div>';

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
  document.getElementById('qi-goals').innerHTML=goalRows.map(g=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:11px;"><span>${g.icon} ${g.label}</span><span style="font-family:'IBM Plex Mono';font-weight:700;color:${g.status==='bad'?'var(--red2)':g.status==='warn'?'var(--amber2)':g.status==='good'?'var(--green2)':'var(--text3)'};">${g.actual!==undefined&&g.actual!==null&&g.actual!==''?g.actual:'—'} <span style="font-size:11px;font-weight:400;">/ ${g.lower?'≤':'≥'} ${g.target}</span></span></div>`).join('');
  const metric=(icon,label,val,target,den)=>`<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;"><span>${icon} ${label}<div style="font-size:11px;color:var(--text3);margin-top:2px;">${den?'n='+den:'No denominator entered'}</div></span><strong style="font-family:'IBM Plex Mono';color:${val===null?'var(--text3)':val>=target?'var(--green2)':val>=target*.9?'var(--amber2)':'var(--red2)'};">${val===null?'—':val+'%'}</strong></div>`;
  document.getElementById('qi-month').innerHTML=metric('💊','BCMA scanning',m.scanPct,95,m.scanT)+metric('💔','Pain reassessment',m.painPct,95,m.painT)+metric('🩸','Transfusion audit compliance',m.txPct,90,m.txD)+`<div style="font-size:11px;color:var(--text3);margin-top:8px;">Source: Quality Metrics · ${m.key}. Blank means no data entered, not noncompliance.</div>`;
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