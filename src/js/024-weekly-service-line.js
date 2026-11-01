
/* Weekly service line live view patch (2026-10-06)
   Pulls current Command Center data from Supabase and renders the director-ready
   weekly view from the same live sources used by the dashboard. */
(function(){
  const GOALS = { bcma: 95, pain: 95, handMonthly: 200, handWeekly: 50, platoDaily: 5, platoWeekly: 35, platoCompliance: 95 };
  const LOOKBACK_DAYS = 6;
  const FORWARD_DAYS = 13;
  let weeklySnapshotText = '';
  let lastWeeklyPayload = null;
  const staffPlatoCache = {};

  function esc(v){ return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function setHTML(id,html){ const el=document.getElementById(id); if(el) el.innerHTML=html; }
  function setText(id,text){ const el=document.getElementById(id); if(el) el.textContent=text; }
  function num(v){ const n=Number(String(v ?? '').replace(/[%,$]/g,'')); return Number.isFinite(n) ? n : 0; }
  function pct(n,d){ n=num(n); d=num(d); return d>0 ? Math.round((n/d)*100) : null; }
  function fmtPct(n,d){ const p=pct(n,d); return p===null ? '--' : p + '%'; }
  function fmtDate(d){ if(!d) return '--'; const x=parseAnyDate(d); return x ? x.toLocaleDateString('en-US',{month:'numeric',day:'numeric'}) : String(d); }
  function today(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
  function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function iso(d){ return d.toISOString().slice(0,10); }
  function monthKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  function monthStart(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function monthEnd(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
  function shortName(n){ return String(n||'').replace(/\s+/g,' ').trim(); }
  function keyName(n){
    const raw=shortName(n).toLowerCase().replace(/[^a-z,\s]/g,' ').replace(/\s+/g,' ').trim();
    if(!raw) return '';
    if(raw.includes(',')){
      const [last, rest]=raw.split(',');
      const first=(rest||'').trim().split(' ')[0] || '';
      return `${first} ${last.trim()}`.trim();
    }
    const parts=raw.split(' ').filter(Boolean);
    if(parts.length>=2) return `${parts[0]} ${parts[parts.length-1]}`;
    return raw;
  }
  function samePerson(a,b){
    const ka=keyName(a), kb=keyName(b);
    if(!ka || !kb) return false;
    return ka===kb || ka.includes(kb) || kb.includes(ka);
  }
  function nameForDisplay(raw){
    const s=shortName(raw);
    if(!s.includes(',')) return s;
    const [last, rest]=s.split(',');
    const first=(rest||'').trim().split(/\s+/)[0] || '';
    return `${first} ${last.trim()}`.trim() || s;
  }
  function parseAnyDate(v){
    if(!v) return null;
    if(v instanceof Date && !Number.isNaN(v.getTime())) return v;
    const s=String(v).trim();
    const isoMatch=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2])-1, Number(isoMatch[3]));
    const us=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if(us){
      let y=Number(us[3]); if(y<100) y+=2000;
      return new Date(y, Number(us[1])-1, Number(us[2]));
    }
    const d=new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function betweenDates(value,start,end){
    const d=parseAnyDate(value); if(!d) return false;
    d.setHours(0,0,0,0);
    return d>=start && d<=end;
  }
  function supabaseConfig(){
    try {
      if(typeof getSBConfig === 'function'){
        const cfg=getSBConfig();
        if(cfg && cfg.enabled && cfg.url && cfg.key) return cfg;
      }
    } catch(e){}
    return {};
  }
  function restBase(){
    const cfg=supabaseConfig();
    if(cfg.url) return cfg.url;
    try { if (typeof FSM_SB_URL !== 'undefined') return FSM_SB_URL; } catch(e){}
    return '';
  }
  function restHeaders(){
    const cfg=supabaseConfig();
    let key=cfg.key || '';
    if(!key){ try { if (typeof FSM_SB_KEY !== 'undefined') key=FSM_SB_KEY; } catch(e){} }
    return { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' };
  }
  async function fetchRest(path){
    const base=restBase();
    if(!base) throw new Error('Supabase URL missing');
    const res=await fetch(`${base}/rest/v1/${path}`, { headers:restHeaders() });
    if(!res.ok) throw new Error(`${path.split('?')[0]} ${res.status}`);
    return res.json();
  }
  function settledValue(result, fallback){
    if(result.status==='fulfilled') return result.value;
    console.warn('Weekly live pull failed:', result.reason);
    return fallback;
  }
  function currentAppState(){
    try { if(typeof state === 'object' && state) return state; } catch(e){}
    try { if(typeof window.state === 'object' && window.state) return window.state; } catch(e){}
    return {};
  }
  function hasData(v){
    if(Array.isArray(v)) return v.length > 0;
    if(v && typeof v === 'object') return Object.keys(v).length > 0;
    return v !== undefined && v !== null && v !== '';
  }
  function mergeAppState(remote){
    const local=currentAppState();
    const primary=(remote && typeof remote==='object') ? remote : {};
    const out=Object.assign({}, local, primary);
    ['placements','dates','absenceLog','agencyDates','vacancyBudgets','empShifts','removedStaff','fallRoundData','hapiRoundData','staffNameMap','qualityData'].forEach(k=>{
      if(!hasData(primary[k]) && hasData(local[k])) out[k]=local[k];
    });
    return out;
  }
  function globalArray(name){
    if(name==='MASTER_STAFF'){ try { if(Array.isArray(MASTER_STAFF)) return MASTER_STAFF; } catch(e){} }
    if(name==='CC_BASE_STAFF'){ try { if(Array.isArray(CC_BASE_STAFF)) return CC_BASE_STAFF; } catch(e){} }
    return Array.isArray(window[name]) ? window[name] : [];
  }
  function platoUnitFilter(){
    return 'or=(unit.ilike.*3B*,unit.ilike.*3C*,nurse_home_unit.ilike.*3B*,nurse_home_unit.ilike.*3C*,second_nurse_unit.ilike.*3B*,second_nurse_unit.ilike.*3C*,ca_unit.ilike.*3B*,ca_unit.ilike.*3C*)';
  }

  async function loadWeeklyLive(){
    const end=today(), start=addDays(end,-LOOKBACK_DAYS), forwardEnd=addDays(end,FORWARD_DAYS);
    const key=monthKey(end), mStart=monthStart(end), mEnd=monthEnd(end);
    const platoSelect='unit,nurse_home_unit,second_nurse_unit,ca_unit,observation_date,staff_name,second_nurse,ca_name,hapi_compliance,fall_compliance,medication_compliance,total_rounds,completed_rounds,compliance_pct';
    const unitFilter=platoUnitFilter();
    const pulls=await Promise.allSettled([
      fetchRest('tracker_state?key=eq.app_state&select=value,updated_at&limit=1'),
      fetchRest(`floor3_kpi?select=unit,month_key,kpi_data,updated_at&unit=in.(3B,3C)&month_key=eq.${key}`),
      fetchRest(`plato_observations?select=${platoSelect}&${unitFilter}&observation_date=gte.${iso(start)}&observation_date=lte.${iso(end)}&order=observation_date.desc&limit=2000`),
      fetchRest(`plato_observations?select=${platoSelect}&${unitFilter}&observation_date=gte.${iso(mStart)}&observation_date=lte.${iso(mEnd)}&order=observation_date.desc&limit=3000`),
      fetchRest('employee_directory_roster?select=display_name,role,status&status=eq.active&limit=500')
    ]);
    const stateRows=settledValue(pulls[0],[]);
    const appRow=stateRows[0] || {};
    let appState=appRow.value || {};
    if(typeof appState==='string'){
      try { appState=JSON.parse(appState); } catch(e){ appState={}; }
    }
    appState=mergeAppState(appState);
    let platoWeek=settledValue(pulls[2],[]);
    let platoMonth=settledValue(pulls[3],[]);
    const localWeek=localPlatoRows(appState,start,end);
    const localMonth=localPlatoRows(appState,mStart,mEnd);
    if(!platoWeek.length && localWeek.length) platoWeek=localWeek;
    if(!platoMonth.length && localMonth.length) platoMonth=localMonth;
    const platoSource=platoWeek.length
      ? (settledValue(pulls[2],[]).length ? 'plato_observations' : 'Command Center PLATO imports')
      : 'none';
    return {
      appState,
      appUpdatedAt: appRow.updated_at || '',
      kpiRows: settledValue(pulls[1],[]),
      platoWeek,
      platoMonth,
      platoSource,
      rosterRows: settledValue(pulls[4],[]),
      start,
      end,
      forwardEnd,
      monthKey: key
    };
  }

  function combineKpi(rows){
    const out={ updatedAt:'' };
    rows.forEach(r=>{
      const data=r.kpi_data || {};
      Object.entries(data).forEach(([k,v])=>{
        if(/source|synced/i.test(k)){ out[k]=v; return; }
        if(typeof v==='number' || /^-?\d+(\.\d+)?$/.test(String(v||''))) out[k]=(num(out[k])+num(v));
        else if(out[k]===undefined) out[k]=v;
      });
      if(r.updated_at && (!out.updatedAt || r.updated_at>out.updatedAt)) out.updatedAt=r.updated_at;
    });
    return out;
  }
  function firstNumber(obj, keys){
    for(const k of keys){ if(obj[k]!==undefined && obj[k]!==null && obj[k]!=='') return num(obj[k]); }
    return 0;
  }
  function qualityMetrics(rows){
    const k=combineKpi(rows);
    const bcmaNum=firstNumber(k,['bcmaNum','bcmaMet','scanNum','scanMet']);
    const bcmaDen=firstNumber(k,['bcmaDen','bcmaTotal','scanDen','scanTotal']);
    const painNum=firstNumber(k,['painNum','painReassessmentNum','painMet']);
    const painDen=firstNumber(k,['painDen','painReassessmentDen','painTotal','painAudits']);
    const hand=firstNumber(k,['handHygieneAudits','hhAudits','hand']);
    return { raw:k, bcmaNum, bcmaDen, painNum, painDen, hand, updatedAt:k.updatedAt };
  }
  function qualityMetricsWithFallback(rows, appState){
    const q=qualityMetrics(rows);
    if((q.bcmaDen && q.painDen) || !appState || !appState.qualityData) return q;
    const local=currentMonthQuality(appState);
    if(!q.bcmaDen && local.scanDen){ q.bcmaNum=local.scanNum; q.bcmaDen=local.scanDen; }
    if(!q.painDen && local.painDen){ q.painNum=local.painNum; q.painDen=local.painDen; }
    return q;
  }
  function currentMonthQuality(appState){
    const key=monthKey(today());
    const staff=globalArray('MASTER_STAFF').filter(x=>x.job==='RN'||x.job==='LPN');
    let scanNum=0, scanDen=0, painNum=0, painDen=0;
    staff.forEach(s=>{
      const row=((appState.qualityData||{})[s.name]||{})[key]||{};
      scanNum += num(row.scans); scanDen += num(row.scanTotal);
      painNum += num(row.pain);  painDen += num(row.painTotal);
    });
    return { scanNum, scanDen, painNum, painDen };
  }
  function complianceState(value,target){
    if(value===null) return 'warn';
    if(value>=target) return 'good';
    if(value>=target-5) return 'warn';
    return 'bad';
  }
  function metricRow(label,value,detail,state){
    const color=state==='good'?'var(--green2)':state==='bad'?'var(--red2)':'var(--amber2)';
    return `<tr><td>${esc(label)}</td><td style="font-weight:800;color:${color};">${esc(value)}</td><td>${esc(detail)}</td></tr>`;
  }
  function renderQualityLive(q, monthKeyValue){
    const bcmaPct=pct(q.bcmaNum,q.bcmaDen);
    const painPct=pct(q.painNum,q.painDen);
    const handState=q.hand>=GOALS.handWeekly ? 'good' : (q.hand>0 ? 'warn' : 'bad');
    const rows=[
      metricRow('BCMA scanning', q.bcmaDen?fmtPct(q.bcmaNum,q.bcmaDen):'No live data', q.bcmaDen?`${q.bcmaNum}/${q.bcmaDen} · goal >${GOALS.bcma}%`:`${monthKeyValue} row is missing bcmaNum/bcmaDen`, complianceState(bcmaPct,GOALS.bcma)),
      metricRow('Hand hygiene', `${q.hand}/${GOALS.handMonthly}`, `MTD audits · weekly pace ${GOALS.handWeekly}`, handState),
      metricRow('Pain reassessment', q.painDen?fmtPct(q.painNum,q.painDen):'No live data', q.painDen?`${q.painNum}/${q.painDen} · goal >=${GOALS.pain}%`:`${monthKeyValue} row is missing pain numerator/denominator`, complianceState(painPct,GOALS.pain))
    ].join('');
    return `<table style="width:100%;border-collapse:collapse;"><thead><tr><th>Measure</th><th>Live</th><th>Need / Goal</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="font-size:9px;color:var(--text3);margin-top:6px;">Source: floor3_kpi for 3B/3C · ${q.updatedAt ? 'updated '+esc(new Date(q.updatedAt).toLocaleString()) : 'no timestamp'}</div>`;
  }

  function isCompliant(v){
    const s=String(v||'').trim().toLowerCase();
    if(!s) return null;
    if(/not|non|no|fail|miss|incomplete/.test(s)) return false;
    if(/compliant|yes|met|pass|complete/.test(s)) return true;
    return null;
  }
  function staffOnRow(row){
    const people=[];
    if(row.staff_name) people.push({name:row.staff_name, role:row.staff_role || 'RN'});
    if(row.second_nurse) people.push({name:row.second_nurse, role:row.second_nurse_role || 'RN'});
    if(row.ca_name) people.push({name:row.ca_name, role:row.ca_role || 'CA'});
    return people.filter(p=>shortName(p.name));
  }
  function addPattern(map, person, type){
    const key=keyName(person.name);
    if(!key) return;
    if(!map[key]) map[key]={name:nameForDisplay(person.name), role:person.role, count:0, type};
    map[key].count++;
    if(person.role && !map[key].role) map[key].role=person.role;
  }
  function analyzePlato(rows){
    const hapi={met:0,total:0,miss:0,patterns:{}};
    const fall={met:0,total:0,miss:0,patterns:{}};
    let totalRounds=0, completedRounds=0;
    rows.forEach(row=>{
      const rowTotal=num(row.total_rounds) || 1;
      totalRounds += rowTotal;
      completedRounds += num(row.completed_rounds);
      const h=isCompliant(row.hapi_compliance);
      const f=isCompliant(row.fall_compliance);
      if(h!==null){ hapi.total++; if(h) hapi.met++; else { hapi.miss++; staffOnRow(row).forEach(p=>addPattern(hapi.patterns,p,'HAPI')); } }
      if(f!==null){ fall.total++; if(f) fall.met++; else { fall.miss++; staffOnRow(row).forEach(p=>addPattern(fall.patterns,p,'Falls')); } }
    });
    hapi.pct=pct(hapi.met,hapi.total);
    fall.pct=pct(fall.met,fall.total);
    const patternRows=kind=>Object.values(kind.patterns).filter(x=>x.count>=2).sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name));
    return { rows:rows.length, totalRounds, completedRounds, hapi, fall, hapiPatterns:patternRows(hapi), fallPatterns:patternRows(fall) };
  }
  function mappedRoundName(appState, raw){
    const name=shortName(raw);
    if(!name) return '';
    return (appState.staffNameMap && appState.staffNameMap[name]) || name;
  }
  function roleForRoundName(appState, roster, name, fallback){
    const rec=(roster||[]).find(r=>samePerson(r.name,name));
    return (rec && (rec.role||rec.job)) || fallback;
  }
  function localPlatoRows(appState,start,end){
    const roster=rosterFromLive(appState, []);
    const rows=[];
    const addRow=(r,kind)=>{
      if(!betweenDates(r.date,start,end)) return;
      const primary=mappedRoundName(appState,r.staff);
      const second=mappedRoundName(appState,r.staff2);
      const ca=mappedRoundName(appState,r.ca);
      const d=parseAnyDate(r.date);
      const compliant=!!r.compliant;
      rows.push({
        unit:'3B/3C',
        observation_date:d ? iso(d) : r.date,
        staff_name:primary,
        second_nurse:second,
        ca_name:ca,
        staff_role:roleForRoundName(appState,roster,primary,'RN'),
        second_nurse_role:roleForRoundName(appState,roster,second,'RN'),
        ca_role:roleForRoundName(appState,roster,ca,'CA'),
        hapi_compliance:kind==='hapi' ? (compliant?'Compliant':'Non-compliant') : '',
        fall_compliance:kind==='fall' ? (compliant?'Compliant':'Non-compliant') : '',
        medication_compliance:'',
        total_rounds:1,
        completed_rounds:compliant ? 1 : 0,
        _localKind:kind
      });
    };
    (appState.hapiRoundData || []).forEach(r=>addRow(r,'hapi'));
    (appState.fallRoundData || []).forEach(r=>addRow(r,'fall'));
    return rows;
  }
  function patternHtml(rows, empty){
    if(!rows.length) return `<div style="font-size:11px;color:var(--green2);">${esc(empty)}</div>`;
    return `<table style="width:100%;border-collapse:collapse;margin-top:5px;"><thead><tr><th>Staff</th><th>Role</th><th>Misses</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.role||'')}</td><td style="color:var(--red2);font-weight:800;">${r.count}</td></tr>`).join('')}</tbody></table>`;
  }
  function renderPlatoLive(a, start, end){
    const roundsState=a.rows>=GOALS.platoWeekly ? 'good' : (a.rows>=GOALS.platoWeekly-5 ? 'warn' : 'bad');
    const hState=complianceState(a.hapi.pct,GOALS.platoCompliance);
    const fState=complianceState(a.fall.pct,GOALS.platoCompliance);
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;">
        ${smallKpi('Rounds this week', `${a.rows}/${GOALS.platoWeekly}`, `${GOALS.platoDaily}/day · HAPI ${a.hapi.total}, Falls ${a.fall.total}`, roundsState)}
        ${smallKpi('HAPI compliance', a.hapi.pct===null?'--':a.hapi.pct+'%', `${a.hapi.met}/${a.hapi.total}`, hState)}
        ${smallKpi('Falls compliance', a.fall.pct===null?'--':a.fall.pct+'%', `${a.fall.met}/${a.fall.total}`, fState)}
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">Window: ${fmtDate(start)}-${fmtDate(end)} · rounding elements completed ${a.completedRounds}/${a.totalRounds || '--'}.</div>
      <div style="font-size:11px;font-weight:800;color:var(--white);margin-top:6px;">HAPI noncompliance pattern</div>
      ${patternHtml(a.hapiPatterns,'No HAPI staff pattern at 2+ weekly misses.')}
      <div style="font-size:11px;font-weight:800;color:var(--white);margin-top:8px;">Falls noncompliance pattern</div>
      ${patternHtml(a.fallPatterns,'No falls staff pattern at 2+ weekly misses.')}`;
  }
  function smallKpi(label,value,sub,state){
    const cls=state==='good'?'mgr-status-good':state==='bad'?'mgr-status-bad':'mgr-status-warn';
    return `<div class="mgr-kpi ${cls}" style="min-width:0;margin:0;"><div class="mgr-kpi-label">${esc(label)}</div><div class="mgr-kpi-value">${esc(value)}</div><div class="mgr-kpi-sub">${esc(sub)}</div></div>`;
  }

  function rosterFromLive(appState, rosterRows){
    let rows=[];
    if(Array.isArray(rosterRows) && rosterRows.length){
      rows=rosterRows.map(r=>({name:r.display_name||r.name||'', role:r.role||r.job||'', status:r.status||'active'}));
    } else if(globalArray('MASTER_STAFF').length){
      rows=globalArray('MASTER_STAFF').map(r=>({name:r.name||r.display_name||'', role:r.job||r.role||'', status:r.status||'active'}));
    } else if(globalArray('CC_BASE_STAFF').length){
      rows=globalArray('CC_BASE_STAFF').map(r=>({name:r.name||'', role:r.job||r.role||'', status:'active'}));
    }
    const removed=appState.removedStaff || {};
    const removedKeys=new Set(Array.isArray(removed) ? removed.map(keyName) : Object.keys(removed).map(keyName));
    return rows.filter(r=>r.name && !removedKeys.has(keyName(r.name)) && !/^(UC|NM)$/i.test(r.role||''));
  }
  function isAgency(appState,name){
    const ag=appState.agencyDates || {};
    return Object.entries(ag).some(([n,v])=>v && v.isAgency && samePerson(n,name));
  }
  function vacancySummary(appState, rosterRows){
    const roster=rosterFromLive(appState, rosterRows);
    const permanent=roster.filter(r=>!isAgency(appState,r.name));
    const b=appState.vacancyBudgets || {};
    const countRole=role=>permanent.filter(r=>String(r.role||'').toUpperCase()===role).length;
    const rnBudget=num(b['rn-total'] ?? b.rnTotal ?? 0), caBudget=num(b['ca-total'] ?? b.caTotal ?? 0);
    const rnFilled=countRole('RN'), caFilled=countRole('CA');
    const calc=(budget,filled)=>({budget,filled,vacant:budget-filled,pct:budget>0?Math.round(Math.max(0,budget-filled)/budget*100):null});
    return { rn:calc(rnBudget,rnFilled), ca:calc(caBudget,caFilled), roster };
  }
  function roleCount(list, role){
    return (Array.isArray(list)?list:[]).filter(p=>{
      const r=String(p.role||'').toUpperCase();
      if(role==='RN') return r==='RN' || r==='LPN';
      if(role==='CA') return r==='CA';
      return false;
    }).length;
  }
  function riskTarget(appState, block, role, fallback){
    try {
      if(typeof getRiskReqs === 'function'){
        const reqs=getRiskReqs();
        if(reqs && reqs[block] && Number.isFinite(Number(reqs[block][role]))) return num(reqs[block][role]);
      }
    } catch(e){}
    const saved=appState.shiftTargets && appState.shiftTargets[block] && appState.shiftTargets[block][role];
    if(saved!==undefined && saved!==null && saved!=='') return num(saved);
    return fallback;
  }
  function censusTargets(appState){
    const domVal=id=>num(document.getElementById(id)?.value || 0);
    const c=appState.census || {};
    const day=num(c.day || c.Day || domVal('census-day'));
    const night=num(c.night || c.Night || domVal('census-night'));
    return {
      rnDay: day ? Math.max(1, Math.ceil(day / 5)) : null,
      rnNight: night ? Math.max(1, Math.ceil(night / 6)) : null
    };
  }
  function scheduleGaps(appState,start,end){
    const placements=appState.placements || {};
    const census=censusTargets(appState);
    const targets=[
      {block:'0700-1500', label:'RN/LPN Day 0700-1500', role:'RN', target:census.rnDay || riskTarget(appState,'0700-1500','RN',6)},
      {block:'1900-0700', label:'RN/LPN Night 1900-0700', role:'RN', target:census.rnNight || riskTarget(appState,'1900-0700','RN',6)},
      {block:'0630-1430', label:'CA Day 0630-1430', role:'CA', target:riskTarget(appState,'0630-1430','CA',4)},
      {block:'1430-1830', label:'CA Eve 1430-1830', role:'CA', target:riskTarget(appState,'1430-1830','CA',4)},
      {block:'1830-2230', label:'CA Eve 1830-2230', role:'CA', target:riskTarget(appState,'1830-2230','CA',4)},
      {block:'2230-0630', label:'CA Night 2230-0630', role:'CA', target:riskTarget(appState,'2230-0630','CA',4)}
    ];
    const loaded=[], gaps=[];
    for(let d=new Date(start); d<=end; d=addDays(d,1)){
      const k=iso(d), day=placements[k];
      if(!day) continue;
      loaded.push(k);
      targets.forEach(t=>{
        const count=roleCount(day[t.block], t.role);
        if(count<t.target) gaps.push({date:k, label:t.label, count, target:t.target, short:t.target-count});
      });
    }
    return { loaded, gaps };
  }
  function renderStaffingLive(v,gaps,start,end){
    const rnState=v.rn.vacant>0 ? 'bad' : (v.rn.vacant<0 ? 'warn' : 'good');
    const caState=v.ca.vacant>0 ? 'bad' : (v.ca.vacant<0 ? 'warn' : 'good');
    const gapRows=gaps.gaps.slice(0,10).map(g=>`<tr><td>${fmtDate(g.date)}</td><td>${esc(g.label)}</td><td>${g.count}/${g.target}</td><td style="color:var(--red2);font-weight:800;">-${g.short}</td></tr>`).join('');
    const gapText=!gaps.loaded.length
      ? `<div style="font-size:11px;color:var(--amber2);">No Board placements loaded for ${fmtDate(start)}-${fmtDate(end)}.</div>`
      : (gapRows ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;"><thead><tr><th>Date</th><th>Block</th><th>Have/Need</th><th>Gap</th></tr></thead><tbody>${gapRows}</tbody></table>` : `<div style="font-size:11px;color:var(--green2);margin-top:8px;">No RN/CA gaps on loaded schedule dates.</div>`);
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        ${smallKpi('RN vacancy', `${Math.max(0,v.rn.vacant)} open`, `${v.rn.filled}/${v.rn.budget} filled · ${v.rn.pct ?? '--'}%`, rnState)}
        ${smallKpi('CA vacancy', v.ca.vacant<0?`${Math.abs(v.ca.vacant)} over`:`${Math.max(0,v.ca.vacant)} open`, `${v.ca.filled}/${v.ca.budget} filled · ${v.ca.pct ?? '--'}%`, caState)}
      </div>${gapText}`;
  }
  function replacementValue(rec, keys){
    for(const k of keys){ if(rec && rec[k]!==undefined && rec[k]!==null && rec[k]!=='') return rec[k]; }
    return 'Not tracked';
  }
  function agencyWatch(appState,start,end){
    const ag=appState.agencyDates || {}, shifts=appState.empShifts || {};
    const rows=[];
    Object.entries(ag).forEach(([name,rec])=>{
      if(!rec || !rec.isAgency) return;
      const startDate=rec.contractStart || rec.startDate || rec.start || '';
      const endDate=rec.extensionEnd || rec.contractEnd || rec.endDate || rec.end || '';
      const inbound=betweenDates(startDate,start,end);
      const leaving=betweenDates(endDate,start,end);
      if(!inbound && !leaving) return;
      rows.push({
        type: inbound ? 'Inbound' : 'Leaving',
        name,
        shift: rec.shift || shifts[name] || '',
        start: startDate,
        end: endDate,
        requested: replacementValue(rec,['replacementRequested','replacement_requested','replacementRequest','requested']),
        confirmed: replacementValue(rec,['replacementConfirmed','replacement_confirmed','replacementInbound','replacement','confirmed'])
      });
    });
    rows.sort((a,b)=>String(a.end||a.start).localeCompare(String(b.end||b.start)));
    return rows;
  }
  function renderAgencyLive(rows,start,end){
    if(!rows.length) return `<div style="font-size:11px;color:var(--green2);">No agency RN inbound or leaving ${fmtDate(start)}-${fmtDate(end)}.</div>`;
    return `<table style="width:100%;border-collapse:collapse;"><thead><tr><th>Type</th><th>Name</th><th>Shift</th><th>Start</th><th>End</th><th>Req.</th><th>Confirmed</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.type)}</td><td>${esc(nameForDisplay(r.name))}</td><td>${esc(r.shift||'--')}</td><td>${esc(fmtDate(r.start))}</td><td>${esc(fmtDate(r.end))}</td><td>${esc(r.requested)}</td><td>${esc(r.confirmed)}</td></tr>`).join('')}</tbody></table>`;
  }
  function absenceWatch(appState,start,end){
    const out=[];
    Object.entries(appState.absenceLog || {}).forEach(([name,items])=>{
      (Array.isArray(items)?items:[]).forEach(item=>{
        if(!betweenDates(item.date,start,end)) return;
        out.push({name, date:item.date, type:item.type || 'absence', hours:item.hours, writeUp:!!item.writeUp, reason:item.writeUpReason || item.reason || item.note || ''});
      });
    });
    out.sort((a,b)=>String(a.date).localeCompare(String(b.date)) || a.name.localeCompare(b.name));
    return out;
  }
  function renderPeopleLive(rows,start,end){
    if(!rows.length) return `<div style="font-size:11px;color:var(--green2);">No absences or write-ups entered for ${fmtDate(start)}-${fmtDate(end)}.</div>`;
    return `<table style="width:100%;border-collapse:collapse;"><thead><tr><th>Date</th><th>Staff</th><th>Type</th><th>Hours</th><th>Write-up</th><th>Reason / Note</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(fmtDate(r.date))}</td><td>${esc(nameForDisplay(r.name))}</td><td>${esc(r.type)}</td><td>${esc(r.hours ?? '')}</td><td style="color:${r.writeUp?'var(--red2)':'var(--text3)'};font-weight:${r.writeUp?'800':'400'};">${r.writeUp?'Yes':'No'}</td><td>${esc(r.reason||'')}</td></tr>`).join('')}</tbody></table>`;
  }
  function list(items){
    return `<ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.55;">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  function buildWinsRisks(q,plato,vac,gaps,agency,absences){
    const wins=[], risks=[];
    const bcmaPct=pct(q.bcmaNum,q.bcmaDen), painPct=pct(q.painNum,q.painDen);
    if(q.hand>=GOALS.handWeekly) wins.push(`Hand hygiene has ${q.hand} audits toward 200 monthly.`);
    else risks.push(`Hand hygiene is at ${q.hand}/${GOALS.handMonthly}; weekly pace needed is ${GOALS.handWeekly}.`);
    if(painPct!==null && painPct>=GOALS.pain) wins.push(`Pain reassessment is at ${painPct}% (${q.painNum}/${q.painDen}).`);
    else risks.push(painPct===null ? 'Pain reassessment live numerator/denominator is missing.' : `Pain reassessment is below goal at ${painPct}%.`);
    if(bcmaPct!==null && bcmaPct>=GOALS.bcma) wins.push(`BCMA is at ${bcmaPct}%, above the >${GOALS.bcma}% goal.`);
    else risks.push(bcmaPct===null ? 'BCMA live numerator/denominator is missing for the selected month.' : `BCMA is below goal at ${bcmaPct}%.`);
    if(plato.rows>=GOALS.platoWeekly) wins.push(`PLATO volume met goal with ${plato.rows}/${GOALS.platoWeekly} rounds.`);
    else risks.push(`PLATO volume is ${plato.rows}/${GOALS.platoWeekly}; goal is ${GOALS.platoDaily}/day.`);
    if((plato.hapi.pct ?? 0)>=GOALS.platoCompliance) wins.push(`HAPI PLATO compliance is ${plato.hapi.pct}%.`);
    else risks.push(`HAPI PLATO compliance is ${plato.hapi.pct ?? '--'}% with ${plato.hapiPatterns.length} staff pattern(s).`);
    if((plato.fall.pct ?? 0)>=GOALS.platoCompliance) wins.push(`Falls PLATO compliance is ${plato.fall.pct}%.`);
    else risks.push(`Falls PLATO compliance is ${plato.fall.pct ?? '--'}% with ${plato.fallPatterns.length} staff pattern(s).`);
    if(vac.rn.vacant<=0) wins.push(`RN permanent staffing is at/above budget (${vac.rn.filled}/${vac.rn.budget}).`);
    else risks.push(`RN vacancy: ${vac.rn.vacant} open of ${vac.rn.budget} budgeted.`);
    if(vac.ca.vacant<=0) wins.push(`CA permanent staffing is at/above budget (${vac.ca.filled}/${vac.ca.budget}).`);
    else risks.push(`CA vacancy: ${vac.ca.vacant} open of ${vac.ca.budget} budgeted.`);
    if(gaps.gaps.length) risks.push(`${gaps.gaps.length} RN/CA schedule gap(s) found on loaded dates.`);
    if(agency.some(r=>r.type==='Leaving')) risks.push(`${agency.filter(r=>r.type==='Leaving').length} agency RN(s) leaving in the next 2 weeks.`);
    if(absences.some(r=>r.writeUp)) risks.push(`${absences.filter(r=>r.writeUp).length} absence write-up(s) entered this week.`);
    if(!risks.length) risks.push('No major risk surfaced from the live weekly data.');
    if(!wins.length) wins.push('Live data is loaded; no green item is above threshold yet.');
    return {wins, risks};
  }
  function buildSnapshotText(payload){
    const {q, plato, vac, gaps, agency, absences, wr, rangeText}=payload;
    const lines=[
      `3B/3C Weekly Service Line Update (${rangeText})`,
      '',
      `BCMA: ${q.bcmaDen?fmtPct(q.bcmaNum,q.bcmaDen)+' ('+q.bcmaNum+'/'+q.bcmaDen+')':'No live data'}; goal >${GOALS.bcma}%`,
      `Hand hygiene: ${q.hand}/${GOALS.handMonthly} monthly; weekly pace ${GOALS.handWeekly}`,
      `Pain reassessment: ${q.painDen?fmtPct(q.painNum,q.painDen)+' ('+q.painNum+'/'+q.painDen+')':'No live data'}; goal >=${GOALS.pain}%`,
      `PLATO rounds: ${plato.rows}/${GOALS.platoWeekly}; HAPI ${plato.hapi.pct ?? '--'}% (${plato.hapi.met}/${plato.hapi.total}); Falls ${plato.fall.pct ?? '--'}% (${plato.fall.met}/${plato.fall.total})`,
      `RN vacancy: ${Math.max(0,vac.rn.vacant)} open (${vac.rn.filled}/${vac.rn.budget} filled). CA vacancy: ${vac.ca.vacant<0?Math.abs(vac.ca.vacant)+' over':Math.max(0,vac.ca.vacant)+' open'} (${vac.ca.filled}/${vac.ca.budget} filled).`,
      `Schedule gaps on loaded dates: ${gaps.gaps.length}`,
      `Agency RN two-week watch: ${agency.length ? agency.map(r=>`${r.type} ${nameForDisplay(r.name)} ${fmtDate(r.start)}-${fmtDate(r.end)} replacement confirmed: ${r.confirmed}`).join('; ') : 'none'}`,
      `Absences/write-ups: ${absences.length ? absences.map(r=>`${fmtDate(r.date)} ${nameForDisplay(r.name)} ${r.type}${r.writeUp?' write-up':''}`).join('; ') : 'none entered'}`,
      '',
      'Wins / Progress:',
      ...wr.wins.map(x=>`- ${x}`),
      '',
      'Risks / Focus:',
      ...wr.risks.map(x=>`- ${x}`)
    ];
    const note=document.getElementById('mgr-weekly-note')?.value.trim();
    const next=document.getElementById('mgr-weekly-next')?.value.trim();
    if(note) lines.push('', 'Leadership notes:', note);
    if(next) lines.push('', 'Next week priorities:', next);
    return lines.join('\n');
  }

  async function renderWeeklyManagerReview(){
    const modal=document.getElementById('mgr-weekly-review-modal');
    if(modal) modal.style.display='flex';
    setHTML('mgr-weekly-review-summary', smallKpi('Live Pull','Loading','Command Center data','warn'));
    setText('mgr-weekly-live-status','Pulling live staffing, KPI, PLATO, agency, and absence data...');
    try{
      const live=await loadWeeklyLive();
      const q=qualityMetricsWithFallback(live.kpiRows, live.appState);
      const plato=analyzePlato(live.platoWeek);
      const vac=vacancySummary(live.appState, live.rosterRows);
      const gaps=scheduleGaps(live.appState, live.end, live.forwardEnd);
      const agency=agencyWatch(live.appState, live.end, live.forwardEnd);
      const absences=absenceWatch(live.appState, live.start, live.end);
      const wr=buildWinsRisks(q,plato,vac,gaps,agency,absences);
      const rangeText=`${fmtDate(live.start)}-${fmtDate(live.end)}`;
      lastWeeklyPayload={q,plato,vac,gaps,agency,absences,wr,rangeText, live};
      weeklySnapshotText=buildSnapshotText(lastWeeklyPayload);
      setHTML('mgr-weekly-review-summary',
        smallKpi('Week',rangeText,'Last 7 days','good')+
        smallKpi('Live Rows',`${live.platoWeek.length} PLATO`,`${live.kpiRows.length} KPI unit row(s) · ${live.platoSource}`,'good')+
        smallKpi('Schedule Load',`${gaps.loaded.length} date(s)`,`Next 2 weeks checked`,'warn'));
      setText('mgr-weekly-live-status',`Live from Command Center. App state updated ${live.appUpdatedAt ? new Date(live.appUpdatedAt).toLocaleString() : 'unknown'}; KPI updated ${q.updatedAt ? new Date(q.updatedAt).toLocaleString() : 'unknown'}.`);
      setHTML('mgr-weekly-quality', renderQualityLive(q, live.monthKey));
      setHTML('mgr-weekly-plato', renderPlatoLive(plato, live.start, live.end));
      setHTML('mgr-weekly-staffing', renderStaffingLive(vac,gaps,live.end,live.forwardEnd));
      setHTML('mgr-weekly-agency', renderAgencyLive(agency,live.end,live.forwardEnd));
      setHTML('mgr-weekly-people', renderPeopleLive(absences,live.start,live.end));
      setHTML('mgr-weekly-wins', list(wr.wins));
      setHTML('mgr-weekly-risks', list(wr.risks));
      renderWeeklyHistory(live.appState);
    } catch(e) {
      console.error(e);
      setHTML('mgr-weekly-review-summary', smallKpi('Live Pull','Error',e.message || 'Could not load','bad'));
      setText('mgr-weekly-live-status','Unable to pull live view. Check connection and Supabase access.');
    }
  }

  function renderWeeklyHistory(appState){
    const hist=(appState.weeklyServiceLineUpdates || appState.weeklyManagerReviews || []).slice(0,5);
    setHTML('mgr-weekly-history', hist.length ? hist.map(x=>`<div style="font-size:11px;border-bottom:1px solid var(--border);padding:6px 0;"><b>${esc(x.range || x.key || '')}</b> · ${esc((x.date||'').slice(0,10))}<br>${esc(x.note || '')}</div>`).join('') : '<div style="font-size:11px;color:var(--text3);">No saved weekly service line updates yet.</div>');
  }
  function weeklyPrintHtml(){
    if(lastWeeklyPayload) weeklySnapshotText=buildSnapshotText(lastWeeklyPayload);
    const html=id=>document.getElementById(id)?.innerHTML || '<div class="muted">No data loaded.</div>';
    const text=id=>document.getElementById(id)?.textContent || '';
    const note=document.getElementById('mgr-weekly-note')?.value.trim() || '';
    const next=document.getElementById('mgr-weekly-next')?.value.trim() || '';
    const printed=new Date().toLocaleString();
    const range=lastWeeklyPayload?.rangeText || '';
    return `<!doctype html><html><head><title>3B/3C Weekly Service Line Update</title>
      <style>
        :root{--white:#111827;--text2:#334155;--text3:#64748b;--green2:#047857;--red2:#b91c1c;--amber2:#b45309;--accent2:#1d4ed8;--border:#cbd5e1;--card:#fff;--card2:#f8fafc;--slate:#f1f5f9;}
        *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#111827;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        h1{font-size:22px;margin:0;color:#0f2f57;}h2{font-size:13px;margin:0 0 8px;color:#0f2f57;text-transform:uppercase;letter-spacing:.04em;}
        .sub{font-size:11px;color:#64748b;margin-top:3px}.status{font-size:10px;color:#475569;margin:8px 0 12px;}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0 12px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}.full{grid-column:1/-1}
        section{border:1px solid #cbd5e1;border-radius:8px;padding:10px;background:#fff;break-inside:avoid;margin-bottom:10px;}
        .mgr-kpi{border:1px solid #cbd5e1;border-radius:8px;padding:9px;background:#f8fafc;min-width:0;}
        .mgr-kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:700;}
        .mgr-kpi-value{font-size:22px;line-height:1.15;font-weight:800;color:#111827;margin-top:4px;}
        .mgr-kpi-sub{font-size:9px;color:#475569;margin-top:3px;line-height:1.35;}
        .mgr-status-good{border-color:#86efac;background:#f0fdf4}.mgr-status-warn{border-color:#fbbf24;background:#fffbeb}.mgr-status-bad{border-color:#fca5a5;background:#fef2f2}
        table{width:100%;border-collapse:collapse;font-size:10px;}th{text-align:left;background:#e2e8f0;color:#334155;padding:5px;border:1px solid #cbd5e1;}td{padding:5px;border:1px solid #e2e8f0;vertical-align:top;}
        ul{margin:0;padding-left:16px;font-size:11px;line-height:1.45}.notes{white-space:pre-wrap;font-size:11px;line-height:1.45;border:1px solid #e2e8f0;background:#f8fafc;border-radius:6px;padding:8px;min-height:32px;}
        .muted{font-size:11px;color:#64748b}.no-print{display:flex;gap:8px;justify-content:flex-end;margin-bottom:14px;}
        button{border:0;border-radius:6px;background:#1d4ed8;color:white;padding:8px 14px;font-weight:700;cursor:pointer;}
        @page{size:letter portrait;margin:.45in;}@media print{body{padding:0}.no-print{display:none!important}section{box-shadow:none}}
      </style></head><body>
      <div class="no-print"><button onclick="window.print()">Print</button></div>
      <header><h1>3B/3C Weekly Service Line Update</h1><div class="sub">${esc(range)} · Printed ${esc(printed)}</div></header>
      <div class="summary">${html('mgr-weekly-review-summary')}</div>
      <div class="status">${esc(text('mgr-weekly-live-status'))}</div>
      <div class="grid">
        <section><h2>Live Quality Snapshot</h2>${html('mgr-weekly-quality')}</section>
        <section><h2>PLATO Rounds</h2>${html('mgr-weekly-plato')}</section>
        <section><h2>RN / CA Staffing Gaps</h2>${html('mgr-weekly-staffing')}</section>
        <section><h2>Agency RN Two-Week Watch</h2>${html('mgr-weekly-agency')}</section>
        <section class="full"><h2>Absences / Write-Ups</h2>${html('mgr-weekly-people')}</section>
        <section><h2>Wins / Progress</h2>${html('mgr-weekly-wins')}</section>
        <section><h2>Risks / Focus</h2>${html('mgr-weekly-risks')}</section>
        <section><h2>Leadership Notes</h2><div class="notes">${esc(note || 'None entered.')}</div></section>
        <section><h2>Next Week Priorities</h2><div class="notes">${esc(next || 'None entered.')}</div></section>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print();},120);};<\/script></body></html>`;
  }
  window.openWeeklyManagerReview = function(){ renderWeeklyManagerReview(); };
  window.closeWeeklyManagerReview = function(){ const m=document.getElementById('mgr-weekly-review-modal'); if(m) m.style.display='none'; };
  window.copyWeeklyManagerReview = function(){
    if(lastWeeklyPayload) weeklySnapshotText=buildSnapshotText(lastWeeklyPayload);
    navigator.clipboard?.writeText(weeklySnapshotText || document.getElementById('mgr-weekly-review-modal')?.innerText || '');
    if(typeof showSaveBanner==='function') showSaveBanner('Weekly service line update copied');
  };
  window.printWeeklyManagerReview = function(){
    const w=window.open('','_blank','width=950,height=1050');
    if(!w){ alert('Please allow pop-ups to print the weekly service line update.'); return; }
    w.document.open();
    w.document.write(weeklyPrintHtml());
    w.document.close();
  };
  window.saveWeeklyManagerReview = function(){
    if(lastWeeklyPayload) weeklySnapshotText=buildSnapshotText(lastWeeklyPayload);
    const app=currentAppState();
    app.weeklyServiceLineUpdates=Array.isArray(app.weeklyServiceLineUpdates) ? app.weeklyServiceLineUpdates : [];
    app.weeklyServiceLineUpdates.unshift({date:new Date().toISOString(), range:lastWeeklyPayload?.rangeText || '', note:document.getElementById('mgr-weekly-note')?.value || '', next:document.getElementById('mgr-weekly-next')?.value || '', text:weeklySnapshotText});
    app.weeklyServiceLineUpdates=app.weeklyServiceLineUpdates.slice(0,10);
    try { if(typeof persistSave==='function') persistSave(); } catch(e){}
    renderWeeklyHistory(app);
    if(typeof showSaveBanner==='function') showSaveBanner('Weekly service line update saved');
  };

  function staffMonthlyAgg(rows, name){
    const byMonth={};
    rows.forEach(row=>{
      if(!staffOnRow(row).some(p=>samePerson(p.name,name))) return;
      const d=parseAnyDate(row.observation_date); if(!d) return;
      const key=monthKey(d);
      const b=byMonth[key] || (byMonth[key]={hapi:{met:0,total:0,miss:0}, fall:{met:0,total:0,miss:0}, med:{met:0,total:0,miss:0}});
      [['hapi','hapi_compliance'],['fall','fall_compliance'],['med','medication_compliance']].forEach(([kind,field])=>{
        const c=isCompliant(row[field]);
        if(c===null) return;
        b[kind].total++;
        if(c) b[kind].met++; else b[kind].miss++;
      });
    });
    return byMonth;
  }
  function mostMissed(bucket){
    const misses=[
      ['HAPI',bucket.hapi.miss],
      ['Falls',bucket.fall.miss],
      ['Medication',bucket.med.miss]
    ].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
    return misses.length ? `${misses[0][0]} (${misses[0][1]})` : 'None';
  }
  async function fetchPlatoSince(startISO){
    const key='since:'+startISO;
    if(staffPlatoCache[key]) return staffPlatoCache[key];
    const platoSelect='unit,nurse_home_unit,second_nurse_unit,ca_unit,observation_date,staff_name,second_nurse,ca_name,hapi_compliance,fall_compliance,medication_compliance,total_rounds,completed_rounds,compliance_pct';
    let rows=[];
    try {
      rows=await fetchRest(`plato_observations?select=${platoSelect}&${platoUnitFilter()}&observation_date=gte.${startISO}&order=observation_date.desc&limit=5000`);
    } catch(e) {
      console.warn(e);
    }
    if(!rows.length) rows=localPlatoRows(currentAppState(), parseAnyDate(startISO), today());
    staffPlatoCache[key]=rows;
    return rows;
  }
  window.renderEmployeePlatoLive = async function(name, targetId='emp-plato-live'){
    const target=document.getElementById(targetId);
    if(!target || !name) return;
    target.innerHTML='<div style="font-size:11px;color:var(--text3);">Loading live PLATO results...</div>';
    try{
      const now=today();
      const start=new Date(now.getFullYear(), now.getMonth()-11, 1);
      const rows=await fetchPlatoSince(iso(start));
      const agg=staffMonthlyAgg(rows,name);
      const keys=Object.keys(agg).sort().reverse();
      if(!keys.length){ target.innerHTML='<div style="font-size:11px;color:var(--text3);">No live PLATO rounds found for this staff member in the last 12 months.</div>'; return; }
      target.innerHTML=`<table style="width:100%;border-collapse:collapse;"><thead><tr><th>Month</th><th>HAPI</th><th>Falls</th><th>What They Miss Most</th></tr></thead><tbody>${keys.map(k=>{
        const b=agg[k];
        return `<tr><td>${esc(k)}</td><td>${esc(fmtPct(b.hapi.met,b.hapi.total))} <span style="color:var(--text3);font-size:9px;">${b.hapi.met}/${b.hapi.total}</span></td><td>${esc(fmtPct(b.fall.met,b.fall.total))} <span style="color:var(--text3);font-size:9px;">${b.fall.met}/${b.fall.total}</span></td><td>${esc(mostMissed(b))}</td></tr>`;
      }).join('')}</tbody></table>`;
    } catch(e){
      console.warn(e);
      target.innerHTML='<div style="font-size:11px;color:var(--red2);">Could not load live PLATO results.</div>';
    }
  };
  function installStaffPlatoPanel(){
    const modal=document.getElementById('emp-notes-modal');
    if(!modal || document.getElementById('emp-plato-live-card')) return;
    const anchor=document.getElementById('emp-notes-input')?.parentElement;
    const card=document.createElement('div');
    card.id='emp-plato-live-card';
    card.className='card';
    card.style.cssText='margin:0 0 12px;padding:10px;';
    card.innerHTML='<div class="card-title" style="margin-bottom:7px;">Live PLATO by Month</div><div id="emp-plato-live" style="font-size:11px;color:var(--text2);">Open a staff member to load monthly PLATO results.</div>';
    if(anchor) anchor.parentElement.insertBefore(card, anchor);
    const title=document.getElementById('emp-notes-title');
    const readName=()=>{
      const txt=title?.textContent || '';
      return txt.replace(/^.*Notes\s*[-:]\s*/i,'').replace(/^.*for\s+/i,'').trim();
    };
    if(title){
      let last='';
      new MutationObserver(()=>{
        const n=readName();
        if(n && n!==last){ last=n; window.renderEmployeePlatoLive(n); }
      }).observe(title,{childList:true,subtree:true,characterData:true});
    }
    const prev=window.openEmpNotes;
    if(typeof prev==='function' && !prev._platoWrapped){
      window.openEmpNotes=function(name){
        const ret=prev.apply(this,arguments);
        setTimeout(()=>window.renderEmployeePlatoLive(name || readName()),150);
        return ret;
      };
      window.openEmpNotes._platoWrapped=true;
    }
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(installStaffPlatoPanel,350));
})();
