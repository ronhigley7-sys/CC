
function fqaSafeOpen(){
  var p=document.getElementById('fqa-safe-panel');
  if(p) p.style.display='block';
}
function fqaSafeClose(){
  var p=document.getElementById('fqa-safe-panel');
  if(p) p.style.display='none';
}
function fqaSafeGo(panel){
  fqaSafeClose();
  var el=document.querySelector('[data-panel="'+panel+'"]');
  if(el && typeof switchTab==='function') switchTab(el);
}
function fqaSafeCallIn(){
  fqaSafeClose();
  if(typeof openCallInPanel==='function') openCallInPanel();
  else if(typeof openCallInModal==='function') openCallInModal();
}

function mgrHandoffKey(){return '3b3c_manager_handoffs_v1';}
function mgrLoadHandoffs(){try{const x=JSON.parse(localStorage.getItem(mgrHandoffKey())||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function mgrSaveHandoffs(arr){try{localStorage.setItem(mgrHandoffKey(),JSON.stringify(arr.slice(-30)));}catch(e){}}

function mgrCurrentHandoffData(){
  const dateKey=state.activeBoardDate || (state.dates||[])[0];
  const cov=mgrCoverage(dateKey), calls=mgrCallinsForDate(dateKey), aw=siAgencyWorkforce(), ot=siUkgovertime();
  const cs=mgrCoverageSummary(cov), pulse=mgrTaskPulseData(), exc=mgrLoadExceptions().filter(x=>x.status!=='resolved');
  const q=mgrQualityPulseData(), goals=state.unitGoals2026||{}, vac=mgrVacancySummary();

  const issues=[];
  if(cs.shortRN) issues.push(`RN coverage gap: ${cs.shortRN}`);
  if(cs.shortLPN) issues.push(`LPN coverage gap: ${cs.shortLPN}`);
  if(cs.shortCA) issues.push(`CA coverage gap: ${cs.shortCA}`);
  if(calls) issues.push(`Call-ins: ${calls}`);
  if(pulse.overdue) issues.push(`Overdue manager tasks: ${pulse.overdue}`);
  if(q.month.painPct!==null && q.month.painPct<Number(goals.painPct||95)) issues.push(`Pain below goal: ${q.month.painPct}%`);
  if(q.month.scanPct!==null && q.month.scanPct<Number(goals.scanTarget||95)) issues.push(`BCMA below goal: ${q.month.scanPct}%`);
  if(vac.hasBudget && vac.open>0) issues.push(`Permanent vacancy: ${vac.open} FTE`);

  return {
    dateKey,
    staffing:`${cs.windowsAtGoal}/${cs.totalWindows} windows at 6 RN / 1 LPN / 4 CA`,
    calls,
    agencyPct:aw.pct,
    agencyCount:aw.agency.length,
    otHours:ot.rows.length?ot.total:0,
    otPayPeriod:ot.payPeriod||'',
    overdue:pulse.overdue,
    dueToday:pulse.today,
    activeExceptions:exc,
    issues
  };
}
function renderManagerHandoff(){
  const d=mgrCurrentHandoffData();
  const summary=document.getElementById('mgr-handoff-summary');
  const carry=document.getElementById('mgr-handoff-carry');
  const history=document.getElementById('mgr-handoff-history');
  if(!summary||!carry||!history)return;

  summary.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:6px;">
    ${mgrTile('Staffing',d.staffing,`${d.calls} call-in${d.calls===1?'':'s'}`,d.issues.some(x=>x.includes('coverage gap'))?'mgr-status-bad':'mgr-status-good','board','👥')}
    ${mgrTile('Agency',`${d.agencyPct}%`,`${d.agencyCount} agency staff`,d.agencyPct>=25?'mgr-status-warn':'mgr-status-good','directory','🧳')}
    ${mgrTile('UKG OT',`${d.otHours.toFixed(1)}h`,d.otPayPeriod||'Latest import',d.otHours>0?'mgr-status-warn':'mgr-status-good','overtime','⏱')}
    ${mgrTile('Overdue',d.overdue,'Manager tasks',d.overdue?'mgr-status-bad':'mgr-status-good','todo','⏰')}
    ${mgrTile('Exceptions',d.activeExceptions.length,'Unresolved',d.activeExceptions.length?'mgr-status-warn':'mgr-status-good','home','📥')}
  </div>`;

  const items=[
    ...d.issues.map((x,i)=>({id:'issue_'+i,text:x})),
    ...d.activeExceptions.slice(0,8).map(x=>({id:x.id,text:`${x.type}: ${x.title} — ${x.detail}`}))
  ];
  carry.innerHTML=items.length ? items.map((x,i)=>`
    <label style="display:flex;align-items:flex-start;gap:6px;padding:6px 7px;border:1px solid var(--border);border-radius:6px;background:var(--card2);font-size:9px;color:var(--text2);">
      <input type="checkbox" class="mgr-handoff-check" value="${encodeURIComponent(x.text)}" checked style="margin-top:2px;">
      <span>${x.text}</span>
    </label>`).join('') : '<div class="risk-all-clear" style="padding:8px 10px;">✅ Nothing critical to carry forward.</div>';

  const arr=mgrLoadHandoffs().slice().reverse().slice(0,5);
  history.innerHTML=arr.length ? arr.map(h=>`
    <div style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;">
      <div style="font-size:9px;font-weight:800;color:var(--white);">${new Date(h.savedAt).toLocaleString()}</div>
      <div style="font-size:8px;color:var(--text3);margin-top:2px;">${h.items.length} carry-forward item${h.items.length===1?'':'s'}${h.note?' · note saved':''}</div>
    </div>`).join('') : '<div style="font-size:9px;color:var(--text3);">No saved handoffs yet.</div>';
}
function openManagerHandoff(){
  const m=document.getElementById('mgr-handoff-modal');
  if(!m)return;
  m.style.display='flex';
  renderManagerHandoff();
}
function closeManagerHandoff(){const m=document.getElementById('mgr-handoff-modal');if(m)m.style.display='none';}

function collectManagerHandoff(){
  const d=mgrCurrentHandoffData();
  const checks=[...document.querySelectorAll('.mgr-handoff-check:checked')];
  const items=checks.map(c=>decodeURIComponent(c.value));
  const note=(document.getElementById('mgr-handoff-note')?.value||'').trim();
  return {...d,items,note,savedAt:new Date().toISOString()};
}
function managerHandoffText(){
  const h=collectManagerHandoff();
  const lines=[
    '3B/3C Manager Handoff',
    `Date: ${h.dateKey||new Date().toLocaleDateString()}`,
    `Staffing: ${h.staffing}`,
    `Call-ins: ${h.calls}`,
    `Agency mix: ${h.agencyPct}% (${h.agencyCount} agency staff)`,
    `UKG OT: ${h.otHours.toFixed(1)} hours${h.otPayPeriod?' — '+h.otPayPeriod:''}`,
    `Overdue manager tasks: ${h.overdue}`,
    '',
    'Carry Forward:',
    ...(h.items.length?h.items.map((x,i)=>`${i+1}. ${x}`):['None']),
    '',
    `Manager Note: ${h.note||'None'}`
  ];
  return lines.join('\n');
}
function saveManagerHandoff(){
  const h=collectManagerHandoff();
  const arr=mgrLoadHandoffs();
  arr.push(h);mgrSaveHandoffs(arr);
  renderManagerHandoff();
  if(typeof showSaveBanner==='function') showSaveBanner('💾 Manager handoff saved');
}
function copyManagerHandoff(){
  const txt=managerHandoffText();
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Handoff copied'));}
  else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Handoff copied');}
}
function printManagerHandoff(){
  const txt=managerHandoffText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const w=window.open('','_blank','width=800,height=900');
  if(!w)return alert('Please allow pop-ups to print the handoff.');
  w.document.write(`<html><head><title>3B/3C Manager Handoff</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Manager Handoff</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

function mgrHuddleBriefKey(){return '3b3c_manager_huddle_briefs_v1';}
function mgrLoadHuddleBriefs(){try{const x=JSON.parse(localStorage.getItem(mgrHuddleBriefKey())||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function mgrSaveHuddleBriefs(arr){try{localStorage.setItem(mgrHuddleBriefKey(),JSON.stringify(arr.slice(-30)));}catch(e){}}

function mgrCurrentHuddleData(){
  const dateKey=state.activeBoardDate || (state.dates||[])[0];
  const cov=mgrCoverage(dateKey);
  const calls=mgrCallinsForDate(dateKey);
  const agencyScheduled=siAgencyPeople(dateKey).length;
  const aw=siAgencyWorkforce();
  const ot=siUkgovertime();
  const q=mgrQualityPulseData(), goals=state.unitGoals2026||{};
  const task=mgrTaskPulseData();
  const vac=mgrVacancySummary();
  const certs=mgrCertDueCount(30);
  const coach=mgrCoachingFollowupCount();
  const actions=mgrDailyActionItems(dateKey,cov,calls,agencyScheduled,mgrTodoCount());

  const watches=[];
  if(task.overdue) watches.push(`${task.overdue} overdue manager task${task.overdue===1?'':'s'}`);
  if(certs) watches.push(`${certs} certification${certs===1?'':'s'} due ≤30 days`);
  if(coach) watches.push(`${coach} coaching follow-up${coach===1?'':'s'} due`);
  if(vac.hasBudget && vac.open>0) watches.push(`${vac.open} permanent FTE vacancy`);
  if(ot.rows.length && ot.total>0) watches.push(`${ot.total.toFixed(1)} UKG OT hours`);
  if(q.month.painPct!==null && q.month.painPct<Number(goals.painPct||95)) watches.push(`Pain reassessment ${q.month.painPct}%`);
  if(q.month.scanPct!==null && q.month.scanPct<Number(goals.scanTarget||95)) watches.push(`BCMA ${q.month.scanPct}%`);

  return {
    dateKey,cov,calls,agencyScheduled,
    agencyPct:aw.pct,agencyWorkforce:aw.agency.length,
    otHours:ot.rows.length?ot.total:0,otPayPeriod:ot.payPeriod||'',
    pain:q.month.painPct,bcma:q.month.scanPct,
    task,vac,certs,coach,actions,watches
  };
}
function renderMorningHuddleBrief(){
  const d=mgrCurrentHuddleData();
  const summary=document.getElementById('mgr-huddle-brief-summary');
  const actions=document.getElementById('mgr-huddle-actions');
  const watch=document.getElementById('mgr-huddle-watch');
  const history=document.getElementById('mgr-huddle-history');
  if(!summary||!actions||!watch||!history)return;

  const cov=mgrCoverageSummary(d.cov);
  const gaps=cov.shortRN+cov.shortLPN+cov.shortCA;
  summary.innerHTML=`<div style="display:grid;grid-template-columns:repeat(6,minmax(115px,1fr));gap:6px;">
    ${mgrTile('Staffing',gaps?`${gaps} gaps`:'At goal',`${cov.windowsAtGoal}/${cov.totalWindows} windows`,gaps?'mgr-status-bad':'mgr-status-good','board','👥')}
    ${mgrTile('Call-ins',d.calls,d.calls?'Coverage review':'None',d.calls?'mgr-status-bad':'mgr-status-good','board','📵')}
    ${mgrTile('Agency',`${d.agencyPct}%`,`${d.agencyWorkforce} agency staff`,d.agencyPct>=25?'mgr-status-warn':'mgr-status-good','directory','🧳')}
    ${mgrTile('UKG OT',`${d.otHours.toFixed(1)}h`,d.otPayPeriod||'Latest import',d.otHours>0?'mgr-status-warn':'mgr-status-good','overtime','⏱')}
    ${mgrTile('Pain',d.pain===null?'No data':`${d.pain}%`,'Current month',d.pain!==null&&d.pain<95?'mgr-status-bad':'mgr-status-good','qualityintel','💔')}
    ${mgrTile('BCMA',d.bcma===null?'No data':`${d.bcma}%`,'Current month',d.bcma!==null&&d.bcma<95?'mgr-status-bad':'mgr-status-good','qualityintel','💊')}
  </div>`;

  actions.innerHTML=d.actions.length?d.actions.slice(0,5).map((a,i)=>`
    <div onclick="mgrPriorityOpen('${a.panel}')" style="cursor:pointer;padding:6px 7px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;">
      <div style="font-size:9px;font-weight:800;color:${i===0?'var(--red2)':'var(--white)'};">${i+1}. ${a.icon} ${a.title}</div>
      <div style="font-size:8px;color:var(--text3);margin-top:2px;">${a.detail}</div>
    </div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No urgent actions.</div>';

  watch.innerHTML=d.watches.length?d.watches.map(x=>`
    <div style="padding:6px 7px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;font-size:9px;color:var(--text2);">⚠️ ${x}</div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No watch items.</div>';

  const arr=mgrLoadHuddleBriefs().slice().reverse().slice(0,5);
  history.innerHTML=arr.length?arr.map(h=>`
    <div style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;">
      <div style="font-size:9px;font-weight:800;color:var(--white);">${new Date(h.savedAt).toLocaleString()}</div>
      <div style="font-size:8px;color:var(--text3);margin-top:2px;">${h.actions.length} action${h.actions.length===1?'':'s'} · ${h.watches.length} watch item${h.watches.length===1?'':'s'}</div>
    </div>`).join(''):'<div style="font-size:9px;color:var(--text3);">No saved huddle briefs yet.</div>';
}
function openMorningHuddleBrief(){
  const m=document.getElementById('mgr-huddle-brief-modal');if(!m)return;
  m.style.display='flex';renderMorningHuddleBrief();
}
function closeMorningHuddleBrief(){const m=document.getElementById('mgr-huddle-brief-modal');if(m)m.style.display='none';}

function collectMorningHuddleBrief(){
  const d=mgrCurrentHuddleData();
  return {...d,note:(document.getElementById('mgr-huddle-note')?.value||'').trim(),savedAt:new Date().toISOString()};
}
function morningHuddleBriefText(){
  const h=collectMorningHuddleBrief();
  const cov=mgrCoverageSummary(h.cov);
  const lines=[
    '3B/3C Daily Manager Brief',
    `Date: ${h.dateKey||new Date().toLocaleDateString()}`,
    '',
    `Staffing: ${cov.windowsAtGoal}/${cov.totalWindows} windows at goal (6 RN / 1 LPN / 4 CA)`,
    `Call-ins: ${h.calls}`,
    `Agency mix: ${h.agencyPct}% (${h.agencyWorkforce} agency staff)`,
    `UKG OT: ${h.otHours.toFixed(1)} hours${h.otPayPeriod?' — '+h.otPayPeriod:''}`,
    `Pain: ${h.pain===null?'No data':h.pain+'%'}`,
    `BCMA: ${h.bcma===null?'No data':h.bcma+'%'}`,
    '',
    'Top Actions:',
    ...(h.actions.length?h.actions.map((a,i)=>`${i+1}. ${a.title} — ${a.detail}`):['None']),
    '',
    'Watch Items:',
    ...(h.watches.length?h.watches.map((w,i)=>`${i+1}. ${w}`):['None']),
    '',
    `Huddle Notes: ${h.note||'None'}`
  ];
  return lines.join('\n');
}
function saveMorningHuddleBrief(){
  const h=collectMorningHuddleBrief();
  const arr=mgrLoadHuddleBriefs();arr.push(h);mgrSaveHuddleBriefs(arr);
  renderMorningHuddleBrief();
  if(typeof showSaveBanner==='function')showSaveBanner('💾 Morning huddle brief saved');
}
function copyMorningHuddleBrief(){
  const txt=morningHuddleBriefText();
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Huddle brief copied'));}
  else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Huddle brief copied');}
}
function printMorningHuddleBrief(){
  const txt=morningHuddleBriefText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const w=window.open('','_blank','width=800,height=900');
  if(!w)return alert('Please allow pop-ups to print the huddle brief.');
  w.document.write(`<html><head><title>3B/3C Daily Manager Brief</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Daily Manager Brief</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

function mgrWeeklyReviewKey(){return '3b3c_manager_weekly_reviews_v1';}
function mgrLoadWeeklyReviews(){try{const x=JSON.parse(localStorage.getItem(mgrWeeklyReviewKey())||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function mgrSaveWeeklyReviews(arr){try{localStorage.setItem(mgrWeeklyReviewKey(),JSON.stringify(arr.slice(-26)));}catch(e){}}

function mgrDateKeyOffset(days){
  const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function mgrWeeklyBoardStats(){
  let windows=0, windowsAtGoal=0, rnGaps=0, lpnGaps=0, caGaps=0, callins=0;
  for(let i=-6;i<=0;i++){
    const dateKey=mgrDateKeyOffset(i);
    const cov=mgrCoverage(dateKey);
    if(cov && cov.length){
      const s=mgrCoverageSummary(cov);
      windows += s.totalWindows;
      windowsAtGoal += s.windowsAtGoal;
      rnGaps += s.shortRN;
      lpnGaps += s.shortLPN;
      caGaps += s.shortCA;
    }
    callins += mgrCallinsForDate(dateKey)||0;
  }
  return {windows,windowsAtGoal,rnGaps,lpnGaps,caGaps,callins};
}
function mgrWeeklyTaskStats(){
  const today=todoDateKey();
  const seven=new Date(today+'T12:00:00'); seven.setDate(seven.getDate()-6);
  const sevenKey=seven.toISOString().slice(0,10);
  const list=state.todoList||[];
  let completed=0;
  list.forEach(t=>{
    if(t.done && typeof t.done==='object'){
      Object.keys(t.done).forEach(k=>{if(k>=sevenKey && k<=today && t.done[k]) completed++;});
    }
  });
  const pulse=mgrTaskPulseData();
  return {completed,open:pulse.open,overdue:pulse.overdue,dueToday:pulse.today};
}
function mgrWeeklyExceptionStats(){
  const arr=mgrLoadExceptions();
  const now=Date.now(), cutoff=now-(7*86400000);
  return {
    active:arr.filter(x=>x.status!=='resolved').length,
    critical:arr.filter(x=>x.status!=='resolved'&&x.severity==='critical').length,
    resolved7:arr.filter(x=>x.status==='resolved'&&x.resolvedAt&&new Date(x.resolvedAt).getTime()>=cutoff).length
  };
}
function mgrCurrentWeeklyReview(){
  const board=mgrWeeklyBoardStats(), task=mgrWeeklyTaskStats(), ex=mgrWeeklyExceptionStats();
  const aw=siAgencyWorkforce(), ot=siUkgovertime(), vac=mgrVacancySummary(), q=mgrQualityPulseData(), goals=state.unitGoals2026||{};
  const certs=mgrCertDueCount(30), coach=mgrCoachingFollowupCount();

  const wins=[], risks=[];
  if(board.windows && board.windowsAtGoal===board.windows) wins.push('All tracked staffing windows met minimum staffing.');
  if(!board.callins) wins.push('No call-ins logged in the last 7 days.');
  if(task.completed) wins.push(`${task.completed} manager task completion${task.completed===1?'':'s'} recorded.`);
  if(ex.resolved7) wins.push(`${ex.resolved7} manager exception${ex.resolved7===1?'':'s'} resolved.`);
  if(q.month.painPct!==null && q.month.painPct>=Number(goals.painPct||95)) wins.push(`Pain reassessment at/above goal: ${q.month.painPct}%.`);
  if(q.month.scanPct!==null && q.month.scanPct>=Number(goals.scanTarget||95)) wins.push(`BCMA at/above goal: ${q.month.scanPct}%.`);

  const totalGaps=board.rnGaps+board.lpnGaps+board.caGaps;
  if(totalGaps) risks.push(`${totalGaps} staffing gap unit${totalGaps===1?'':'s'} across the last 7 days.`);
  if(board.callins) risks.push(`${board.callins} call-in${board.callins===1?'':'s'} logged in the last 7 days.`);
  if(task.overdue) risks.push(`${task.overdue} overdue manager task${task.overdue===1?'':'s'}.`);
  if(ex.critical) risks.push(`${ex.critical} critical unresolved exception${ex.critical===1?'':'s'}.`);
  if(vac.hasBudget && vac.open>0) risks.push(`${vac.open} permanent FTE vacancy.`);
  if(aw.pct>=25) risks.push(`Agency mix remains elevated at ${aw.pct}%.`);
  if(ot.rows.length && ot.total>0) risks.push(`${ot.total.toFixed(1)} UKG OT hours in latest imported pay period.`);
  if(q.month.painPct!==null && q.month.painPct<Number(goals.painPct||95)) risks.push(`Pain reassessment below goal: ${q.month.painPct}%.`);
  if(q.month.scanPct!==null && q.month.scanPct<Number(goals.scanTarget||95)) risks.push(`BCMA below goal: ${q.month.scanPct}%.`);
  if(certs) risks.push(`${certs} certification${certs===1?'':'s'} due within 30 days.`);
  if(coach) risks.push(`${coach} coaching follow-up${coach===1?'':'s'} due.`);

  return {board,task,ex,aw,ot,vac,q,goals,certs,coach,wins,risks};
}
function renderWeeklyManagerReview(){
  const d=mgrCurrentWeeklyReview();
  const s=document.getElementById('mgr-weekly-review-summary'), w=document.getElementById('mgr-weekly-wins'), r=document.getElementById('mgr-weekly-risks'), h=document.getElementById('mgr-weekly-history');
  if(!s||!w||!r||!h)return;

  const staffingPct=d.board.windows?Math.round(d.board.windowsAtGoal/d.board.windows*100):0;
  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(6,minmax(115px,1fr));gap:6px;">
    ${mgrTile('Staffing Goal',d.board.windows?`${staffingPct}%`:'No data',`${d.board.windowsAtGoal}/${d.board.windows} windows`,staffingPct<100?'mgr-status-warn':'mgr-status-good','board','👥')}
    ${mgrTile('Call-ins',d.board.callins,'Last 7 days',d.board.callins?'mgr-status-warn':'mgr-status-good','board','📵')}
    ${mgrTile('Agency',`${d.aw.pct}%`,`${d.aw.agency.length} agency staff`,d.aw.pct>=25?'mgr-status-warn':'mgr-status-good','directory','🧳')}
    ${mgrTile('UKG OT',`${d.ot.rows.length?d.ot.total.toFixed(1):'0.0'}h`,d.ot.payPeriod||'Latest import',d.ot.total>0?'mgr-status-warn':'mgr-status-good','overtime','⏱')}
    ${mgrTile('Vacancy',d.vac.hasBudget?`${d.vac.open} FTE`:'—',d.vac.hasBudget?'Permanent open FTE':'Budget missing',d.vac.open>0?'mgr-status-warn':'mgr-status-good','vacancy','📉')}
    ${mgrTile('Exceptions',d.ex.active,`${d.ex.resolved7} resolved this week`,d.ex.critical?'mgr-status-bad':d.ex.active?'mgr-status-warn':'mgr-status-good','home','📥')}
  </div>`;

  w.innerHTML=d.wins.length?d.wins.map(x=>`<div style="padding:6px 7px;border:1px solid rgba(37,168,104,.25);border-radius:6px;background:rgba(37,168,104,.06);margin-bottom:5px;font-size:9px;color:var(--green2);">✅ ${x}</div>`).join(''):'<div style="font-size:9px;color:var(--text3);">No wins automatically identified yet.</div>';
  r.innerHTML=d.risks.length?d.risks.map(x=>`<div style="padding:6px 7px;border:1px solid rgba(245,158,11,.25);border-radius:6px;background:rgba(245,158,11,.06);margin-bottom:5px;font-size:9px;color:var(--amber2);">⚠️ ${x}</div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No major risks identified.</div>';

  const arr=mgrLoadWeeklyReviews().slice().reverse().slice(0,5);
  h.innerHTML=arr.length?arr.map(x=>`<div style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;"><div style="font-size:9px;font-weight:800;color:var(--white);">${new Date(x.savedAt).toLocaleString()}</div><div style="font-size:8px;color:var(--text3);margin-top:2px;">${x.wins.length} wins · ${x.risks.length} risks${x.note?' · leadership note':''}</div></div>`).join(''):'<div style="font-size:9px;color:var(--text3);">No saved weekly reviews yet.</div>';
}
function openWeeklyManagerReview(){
  const m=document.getElementById('mgr-weekly-review-modal');if(!m)return;
  m.style.display='flex';renderWeeklyManagerReview();
}
function closeWeeklyManagerReview(){const m=document.getElementById('mgr-weekly-review-modal');if(m)m.style.display='none';}

function collectWeeklyManagerReview(){
  const d=mgrCurrentWeeklyReview();
  return {...d,note:(document.getElementById('mgr-weekly-note')?.value||'').trim(),next:(document.getElementById('mgr-weekly-next')?.value||'').trim(),savedAt:new Date().toISOString()};
}
function weeklyManagerReviewText(){
  const d=collectWeeklyManagerReview();
  const staffingPct=d.board.windows?Math.round(d.board.windowsAtGoal/d.board.windows*100):0;
  return [
    '3B/3C Weekly Manager Review',
    `Week ending: ${new Date().toLocaleDateString()}`,
    '',
    `Staffing windows at goal: ${d.board.windowsAtGoal}/${d.board.windows} (${staffingPct}%)`,
    `RN gap units: ${d.board.rnGaps}`,
    `LPN gap units: ${d.board.lpnGaps}`,
    `CA gap units: ${d.board.caGaps}`,
    `Call-ins: ${d.board.callins}`,
    `Agency mix: ${d.aw.pct}% (${d.aw.agency.length} agency staff)`,
    `UKG OT: ${d.ot.rows.length?d.ot.total.toFixed(1):'0.0'} hours${d.ot.payPeriod?' — '+d.ot.payPeriod:''}`,
    `Permanent vacancy: ${d.vac.hasBudget?d.vac.open+' FTE':'Budget not entered'}`,
    `Open manager tasks: ${d.task.open}`,
    `Overdue manager tasks: ${d.task.overdue}`,
    `Active exceptions: ${d.ex.active}`,
    `Resolved exceptions this week: ${d.ex.resolved7}`,
    '',
    'Wins / Progress:',
    ...(d.wins.length?d.wins.map((x,i)=>`${i+1}. ${x}`):['None identified']),
    '',
    'Risks / Focus:',
    ...(d.risks.length?d.risks.map((x,i)=>`${i+1}. ${x}`):['None identified']),
    '',
    `Leadership Notes: ${d.note||'None'}`,
    '',
    `Next Week Priorities: ${d.next||'None'}`
  ].join('\n');
}
function saveWeeklyManagerReview(){
  const d=collectWeeklyManagerReview();
  const arr=mgrLoadWeeklyReviews();arr.push(d);mgrSaveWeeklyReviews(arr);
  renderWeeklyManagerReview();
  if(typeof showSaveBanner==='function')showSaveBanner('💾 Weekly manager review saved');
}
function copyWeeklyManagerReview(){
  const txt=weeklyManagerReviewText();
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Weekly review copied'));}
  else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Weekly review copied');}
}
function printWeeklyManagerReview(){
  const txt=weeklyManagerReviewText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const w=window.open('','_blank','width=850,height=950');
  if(!w)return alert('Please allow pop-ups to print the weekly review.');
  w.document.write(`<html><head><title>3B/3C Weekly Manager Review</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Weekly Manager Review</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

function mgrMonthlyScorecardKey(){return '3b3c_monthly_leadership_scorecards_v1';}
function mgrLoadMonthlyScorecards(){try{const x=JSON.parse(localStorage.getItem(mgrMonthlyScorecardKey())||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function mgrSaveMonthlyScorecards(arr){try{localStorage.setItem(mgrMonthlyScorecardKey(),JSON.stringify(arr.slice(-18)));}catch(e){}}

function mgrMonthlyBoardStats(){
  let windows=0,atGoal=0,rnGaps=0,lpnGaps=0,caGaps=0,callins=0,daysWithData=0;
  for(let i=-29;i<=0;i++){
    const dateKey=mgrDateKeyOffset(i);
    const cov=mgrCoverage(dateKey);
    if(cov && cov.length){
      const s=mgrCoverageSummary(cov);
      if(s.totalWindows){daysWithData++; windows+=s.totalWindows; atGoal+=s.windowsAtGoal; rnGaps+=s.shortRN; lpnGaps+=s.shortLPN; caGaps+=s.shortCA;}
    }
    callins += mgrCallinsForDate(dateKey)||0;
  }
  return {windows,atGoal,rnGaps,lpnGaps,caGaps,callins,daysWithData};
}
function mgrMonthlyTaskStats(){
  const today=todoDateKey();
  const start=new Date(today+'T12:00:00');start.setDate(start.getDate()-29);
  const startKey=start.toISOString().slice(0,10);
  let completed=0;
  (state.todoList||[]).forEach(t=>{
    if(t.done&&typeof t.done==='object') Object.keys(t.done).forEach(k=>{if(k>=startKey&&k<=today&&t.done[k])completed++;});
  });
  const pulse=mgrTaskPulseData();
  return {completed,open:pulse.open,overdue:pulse.overdue};
}
function mgrMonthlyExceptionStats(){
  const cutoff=Date.now()-(30*86400000),arr=mgrLoadExceptions();
  return {
    active:arr.filter(x=>x.status!=='resolved').length,
    critical:arr.filter(x=>x.status!=='resolved'&&x.severity==='critical').length,
    resolved30:arr.filter(x=>x.status==='resolved'&&x.resolvedAt&&new Date(x.resolvedAt).getTime()>=cutoff).length,
    created30:arr.filter(x=>x.created&&new Date(x.created).getTime()>=cutoff).length
  };
}
function mgrMonthlyTrendDirection(role){
  const arr=mgrLoadTrendSnapshots().slice().sort((a,b)=>a.month.localeCompare(b.month));
  if(arr.length<2)return 'No prior month';
  const a=arr[arr.length-2]?.roles?.[role]?.vacancyPct;
  const b=arr[arr.length-1]?.roles?.[role]?.vacancyPct;
  if(a===null||a===undefined||b===null||b===undefined)return 'No comparison';
  if(Math.abs(b-a)<0.1)return '→ Stable';
  return b<a?`↓ Improving ${Math.abs(b-a).toFixed(1)} pts`:`↑ Worsening ${Math.abs(b-a).toFixed(1)} pts`;
}
function mgrCurrentMonthlyScorecard(){
  const board=mgrMonthlyBoardStats(),task=mgrMonthlyTaskStats(),ex=mgrMonthlyExceptionStats();
  const aw=siAgencyWorkforce(),ot=siUkgovertime(),vac=mgrVacancySummary(),roles=mgrVacancyRoleData(),q=mgrQualityPulseData(),goals=state.unitGoals2026||{};
  const certs=mgrCertDueCount(30),coach=mgrCoachingFollowupCount();
  const staffingPct=board.windows?Math.round(board.atGoal/board.windows*100):null;

  const wins=[],risks=[];
  if(staffingPct!==null && staffingPct>=95)wins.push(`Staffing minimum achieved in ${staffingPct}% of tracked coverage windows.`);
  if(task.completed)wins.push(`${task.completed} manager task completion${task.completed===1?'':'s'} recorded in the last 30 days.`);
  if(ex.resolved30)wins.push(`${ex.resolved30} manager exception${ex.resolved30===1?'':'s'} resolved.`);
  if(q.month.painPct!==null&&q.month.painPct>=Number(goals.painPct||95))wins.push(`Pain reassessment at/above target: ${q.month.painPct}%.`);
  if(q.month.scanPct!==null&&q.month.scanPct>=Number(goals.scanTarget||95))wins.push(`BCMA at/above target: ${q.month.scanPct}%.`);
  if(aw.pct<20)wins.push(`Agency mix controlled at ${aw.pct}%.`);

  const gaps=board.rnGaps+board.lpnGaps+board.caGaps;
  if(gaps)risks.push(`${gaps} staffing gap unit${gaps===1?'':'s'} across tracked 30-day coverage windows.`);
  if(board.callins)risks.push(`${board.callins} call-in${board.callins===1?'':'s'} in the last 30 days.`);
  if(task.overdue)risks.push(`${task.overdue} overdue manager task${task.overdue===1?'':'s'}.`);
  if(ex.critical)risks.push(`${ex.critical} critical unresolved exception${ex.critical===1?'':'s'}.`);
  if(vac.hasBudget&&vac.open>0)risks.push(`${vac.open} permanent FTE vacancy.`);
  if(aw.pct>=25)risks.push(`Agency mix elevated at ${aw.pct}%.`);
  if(ot.rows.length&&ot.total>0)risks.push(`${ot.total.toFixed(1)} UKG OT hours in latest imported pay period.`);
  if(q.month.painPct!==null&&q.month.painPct<Number(goals.painPct||95))risks.push(`Pain reassessment below target: ${q.month.painPct}%.`);
  if(q.month.scanPct!==null&&q.month.scanPct<Number(goals.scanTarget||95))risks.push(`BCMA below target: ${q.month.scanPct}%.`);
  if(certs)risks.push(`${certs} certification${certs===1?'':'s'} due within 30 days.`);
  if(coach)risks.push(`${coach} coaching follow-up${coach===1?'':'s'} due.`);

  return {board,task,ex,aw,ot,vac,roles,q,goals,certs,coach,staffingPct,wins,risks};
}
function renderMonthlyLeadershipScorecard(){
  const d=mgrCurrentMonthlyScorecard();
  const s=document.getElementById('mgr-monthly-scorecard-summary'),wf=document.getElementById('mgr-monthly-workforce'),tr=document.getElementById('mgr-monthly-trends'),w=document.getElementById('mgr-monthly-wins'),r=document.getElementById('mgr-monthly-risks'),h=document.getElementById('mgr-monthly-history');
  if(!s||!wf||!tr||!w||!r||!h)return;

  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(6,minmax(115px,1fr));gap:6px;">
    ${mgrTile('Staffing Goal',d.staffingPct===null?'No data':`${d.staffingPct}%`,`${d.board.daysWithData} days tracked`,d.staffingPct!==null&&d.staffingPct<95?'mgr-status-warn':'mgr-status-good','board','👥')}
    ${mgrTile('Call-ins',d.board.callins,'Last 30 days',d.board.callins?'mgr-status-warn':'mgr-status-good','board','📵')}
    ${mgrTile('Agency',`${d.aw.pct}%`,`${d.aw.agency.length} agency staff`,d.aw.pct>=25?'mgr-status-warn':'mgr-status-good','directory','🧳')}
    ${mgrTile('UKG OT',`${d.ot.rows.length?d.ot.total.toFixed(1):'0.0'}h`,d.ot.payPeriod||'Latest import',d.ot.total>0?'mgr-status-warn':'mgr-status-good','overtime','⏱')}
    ${mgrTile('Vacancy',d.vac.hasBudget?`${d.vac.open} FTE`:'—',d.vac.hasBudget?'Permanent open FTE':'Budget missing',d.vac.open>0?'mgr-status-warn':'mgr-status-good','vacancy','📉')}
    ${mgrTile('Execution',d.task.completed,`${d.ex.resolved30} exceptions resolved`,d.task.overdue?'mgr-status-warn':'mgr-status-good','todo','✅')}
  </div>`;

  wf.innerHTML=`<div style="overflow:auto;"><table class="data-table" style="width:100%;"><thead><tr><th>Position</th><th>Budget</th><th>Permanent</th><th>Agency</th><th>Vacant</th><th>Vacancy %</th></tr></thead><tbody>
    ${d.roles.map(x=>`<tr><td style="font-weight:800;">${x.role}</td><td>${x.budget.toFixed(1)}</td><td>${x.permanentFilled.toFixed(1)}</td><td>${x.agencyFTE.toFixed(1)}</td><td>${x.vacant.toFixed(1)}</td><td style="font-weight:800;color:${x.pct>=15?'var(--red2)':x.pct>=8?'var(--amber2)':'var(--green2)'};">${x.pct===null?'—':x.pct.toFixed(1)+'%'}</td></tr>`).join('')}
  </tbody></table></div>`;

  tr.innerHTML=['RN','LPN','CA'].map(role=>{
    const row=d.roles.find(x=>x.role===role)||{};
    return `<div style="padding:7px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;gap:8px;"><strong style="color:var(--white);">${role} Vacancy</strong><span style="font-size:10px;font-weight:800;">${row.pct===null?'—':row.pct.toFixed(1)+'%'}</span></div>
      <div style="font-size:8px;color:var(--text3);margin-top:2px;">${mgrMonthlyTrendDirection(role)}</div>
    </div>`;
  }).join('')+`
    <div style="padding:7px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);">
      <div style="display:flex;justify-content:space-between;"><strong>Agency Mix</strong><span style="font-weight:800;color:${d.aw.pct>=25?'var(--amber2)':'var(--green2)'};">${d.aw.pct}%</span></div>
      <div style="font-size:8px;color:var(--text3);margin-top:2px;">${d.aw.agency.length} agency of ${d.aw.all.length} RN/LPN/CA staff</div>
    </div>`;

  w.innerHTML=d.wins.length?d.wins.map(x=>`<div style="padding:6px 7px;border:1px solid rgba(37,168,104,.25);border-radius:6px;background:rgba(37,168,104,.06);margin-bottom:5px;font-size:9px;color:var(--green2);">✅ ${x}</div>`).join(''):'<div style="font-size:9px;color:var(--text3);">No wins automatically identified yet.</div>';
  r.innerHTML=d.risks.length?d.risks.map(x=>`<div style="padding:6px 7px;border:1px solid rgba(245,158,11,.25);border-radius:6px;background:rgba(245,158,11,.06);margin-bottom:5px;font-size:9px;color:var(--amber2);">⚠️ ${x}</div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No major risks identified.</div>';

  const arr=mgrLoadMonthlyScorecards().slice().reverse().slice(0,5);
  h.innerHTML=arr.length?arr.map(x=>`<div style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;"><div style="font-size:9px;font-weight:800;color:var(--white);">${new Date(x.savedAt).toLocaleString()}</div><div style="font-size:8px;color:var(--text3);margin-top:2px;">${x.wins.length} wins · ${x.risks.length} risks${x.note?' · narrative saved':''}</div></div>`).join(''):'<div style="font-size:9px;color:var(--text3);">No saved monthly scorecards yet.</div>';
}
function openMonthlyLeadershipScorecard(){
  const m=document.getElementById('mgr-monthly-scorecard-modal');if(!m)return;
  m.style.display='flex';renderMonthlyLeadershipScorecard();
}
function closeMonthlyLeadershipScorecard(){const m=document.getElementById('mgr-monthly-scorecard-modal');if(m)m.style.display='none';}

function collectMonthlyLeadershipScorecard(){
  const d=mgrCurrentMonthlyScorecard();
  return {...d,note:(document.getElementById('mgr-monthly-note')?.value||'').trim(),next:(document.getElementById('mgr-monthly-next')?.value||'').trim(),savedAt:new Date().toISOString()};
}
function monthlyLeadershipScorecardText(){
  const d=collectMonthlyLeadershipScorecard();
  return [
    '3B/3C Monthly Leadership Scorecard',
    `Month ending: ${new Date().toLocaleDateString()}`,
    '',
    `Staffing windows at goal: ${d.board.atGoal}/${d.board.windows}${d.staffingPct===null?'':` (${d.staffingPct}%)`}`,
    `Days with staffing data: ${d.board.daysWithData}`,
    `RN gap units: ${d.board.rnGaps}`,
    `LPN gap units: ${d.board.lpnGaps}`,
    `CA gap units: ${d.board.caGaps}`,
    `Call-ins: ${d.board.callins}`,
    `Agency mix: ${d.aw.pct}% (${d.aw.agency.length} agency staff)`,
    `UKG OT: ${d.ot.rows.length?d.ot.total.toFixed(1):'0.0'} hours${d.ot.payPeriod?' — '+d.ot.payPeriod:''}`,
    `Permanent vacancy: ${d.vac.hasBudget?d.vac.open+' FTE':'Budget not entered'}`,
    `Manager tasks completed: ${d.task.completed}`,
    `Manager tasks open: ${d.task.open}`,
    `Manager tasks overdue: ${d.task.overdue}`,
    `Exceptions resolved: ${d.ex.resolved30}`,
    `Exceptions active: ${d.ex.active}`,
    `Pain reassessment: ${d.q.month.painPct===null?'No data':d.q.month.painPct+'%'}`,
    `BCMA: ${d.q.month.scanPct===null?'No data':d.q.month.scanPct+'%'}`,
    '',
    'Vacancy by Position:',
    ...d.roles.map(x=>`${x.role}: ${x.vacant.toFixed(1)} vacant FTE / ${x.budget.toFixed(1)} budgeted (${x.pct===null?'—':x.pct.toFixed(1)+'%'}) · Agency ${x.agencyFTE.toFixed(1)} FTE`),
    '',
    'Wins / Accomplishments:',
    ...(d.wins.length?d.wins.map((x,i)=>`${i+1}. ${x}`):['None identified']),
    '',
    'Risks / Escalation:',
    ...(d.risks.length?d.risks.map((x,i)=>`${i+1}. ${x}`):['None identified']),
    '',
    `Leadership Narrative: ${d.note||'None'}`,
    '',
    `Next-Month Priorities: ${d.next||'None'}`
  ].join('\n');
}
function saveMonthlyLeadershipScorecard(){
  const d=collectMonthlyLeadershipScorecard();
  const arr=mgrLoadMonthlyScorecards();arr.push(d);mgrSaveMonthlyScorecards(arr);
  renderMonthlyLeadershipScorecard();
  if(typeof showSaveBanner==='function')showSaveBanner('💾 Monthly scorecard saved');
}
function copyMonthlyLeadershipScorecard(){
  const txt=monthlyLeadershipScorecardText();
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Monthly scorecard copied'));}
  else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Monthly scorecard copied');}
}
function printMonthlyLeadershipScorecard(){
  const txt=monthlyLeadershipScorecardText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const w=window.open('','_blank','width=900,height=1000');
  if(!w)return alert('Please allow pop-ups to print the monthly scorecard.');
  w.document.write(`<html><head><title>3B/3C Monthly Leadership Scorecard</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Monthly Leadership Scorecard</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

function mgrImprovementKey(){return '3b3c_improvement_plans_v1';}
function mgrLoadImprovementPlans(){try{const x=JSON.parse(localStorage.getItem(mgrImprovementKey())||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function mgrSaveImprovementPlans(arr){try{localStorage.setItem(mgrImprovementKey(),JSON.stringify(arr.slice(-100)));}catch(e){}}

function mgrImprovementSuggestions(){
  const d=mgrCurrentMonthlyScorecard();
  const s=[];
  if(d.staffingPct!==null && d.staffingPct<95) s.push({problem:`Staffing minimum attainment ${d.staffingPct}%`,goal:'Achieve ≥95% of tracked coverage windows at 6 RN / 1 LPN / 4 CA minimum.',actions:'Review recurring gaps by time window; use coverage finder; reduce avoidable call-in exposure; escalate unresolved vacancies.'});
  if(d.board.callins>0) s.push({problem:`${d.board.callins} call-ins in the last 30 days`,goal:'Reduce avoidable call-in volume and improve same-shift coverage response.',actions:'Review call-in patterns; coach attendance concerns; verify PSL/UPT process; use coverage finder for replacement.'});
  if(d.aw.pct>=25) s.push({problem:`Agency mix ${d.aw.pct}%`,goal:'Reduce agency dependence while maintaining safe staffing.',actions:'Prioritize permanent recruitment; review contract end dates; convert appropriate travelers; monitor agency FTE monthly.'});
  if(d.vac.hasBudget && d.vac.open>0) s.push({problem:`${d.vac.open} permanent FTE vacancy`,goal:'Reduce permanent vacancy by targeted recruiting and retention actions.',actions:'Break vacancy down by RN/LPN/CA; review candidates weekly; monitor orientation pipeline; align agency exits with permanent starts.'});
  if(d.ot.rows.length && d.ot.total>0) s.push({problem:`${d.ot.total.toFixed(1)} UKG OT hours`,goal:'Reduce avoidable overtime without creating staffing gaps.',actions:'Review highest OT users; identify open-shift drivers; balance schedule; use permanent/PRN coverage before agency or OT when appropriate.'});
  if(d.q.month.painPct!==null && d.q.month.painPct<Number(d.goals.painPct||95)) s.push({problem:`Pain reassessment ${d.q.month.painPct}%`,goal:`Achieve and sustain ≥${Number(d.goals.painPct||95)}% pain reassessment compliance.`,actions:'Audit misses; provide real-time coaching; review documentation workflow; trend by nurse/shift and reinforce expectations.'});
  if(d.q.month.scanPct!==null && d.q.month.scanPct<Number(d.goals.scanTarget||95)) s.push({problem:`BCMA ${d.q.month.scanPct}%`,goal:`Achieve and sustain ≥${Number(d.goals.scanTarget||95)}% BCMA compliance.`,actions:'Review scan misses; identify workflow barriers; coach repeat misses; trend by nurse/shift.'});
  if(d.task.overdue>0) s.push({problem:`${d.task.overdue} overdue manager tasks`,goal:'Eliminate overdue manager follow-up and maintain timely closure.',actions:'Prioritize overdue items daily; assign owners; set realistic due dates; close or reschedule stale tasks.'});
  if(d.ex.critical>0) s.push({problem:`${d.ex.critical} critical unresolved exceptions`,goal:'Resolve critical exceptions within defined leadership response time.',actions:'Acknowledge each exception; assign owner; document action; close only after verification.'});
  if(d.certs>0) s.push({problem:`${d.certs} certifications due within 30 days`,goal:'Maintain 100% required certification compliance.',actions:'Notify staff; schedule renewal; verify completion; update certification dates.'});
  return s;
}
function populateImprovementPlan(problem,goal,actions){
  document.getElementById('mgr-ip-id').value='';
  document.getElementById('mgr-ip-problem').value=problem||'';
  document.getElementById('mgr-ip-goal').value=goal||'';
  document.getElementById('mgr-ip-actions').value=actions||'';
  const due=new Date();due.setDate(due.getDate()+30);
  document.getElementById('mgr-ip-due').value=due.toISOString().slice(0,10);
  document.getElementById('mgr-ip-status').value='Open';
  document.getElementById('mgr-ip-followup').value='';
}
function clearImprovementPlanForm(){
  ['mgr-ip-id','mgr-ip-problem','mgr-ip-owner','mgr-ip-due','mgr-ip-goal','mgr-ip-actions','mgr-ip-followup'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('mgr-ip-status').value='Open';
}
function saveImprovementPlan(){
  const problem=document.getElementById('mgr-ip-problem').value.trim();
  if(!problem)return alert('Enter the problem / gap.');
  const id=document.getElementById('mgr-ip-id').value||('ip_'+Date.now());
  let arr=mgrLoadImprovementPlans();
  const obj={id,problem,owner:document.getElementById('mgr-ip-owner').value.trim(),due:document.getElementById('mgr-ip-due').value,status:document.getElementById('mgr-ip-status').value,goal:document.getElementById('mgr-ip-goal').value.trim(),actions:document.getElementById('mgr-ip-actions').value.trim(),followup:document.getElementById('mgr-ip-followup').value.trim(),updated:new Date().toISOString()};
  const i=arr.findIndex(x=>x.id===id);if(i>=0)arr[i]=obj;else arr.push(obj);
  mgrSaveImprovementPlans(arr);clearImprovementPlanForm();renderImprovementPlanBuilder();
  if(typeof showSaveBanner==='function')showSaveBanner('💾 Improvement plan saved');
}
function editImprovementPlan(id){
  const x=mgrLoadImprovementPlans().find(p=>p.id===id);if(!x)return;
  document.getElementById('mgr-ip-id').value=x.id;
  document.getElementById('mgr-ip-problem').value=x.problem||'';
  document.getElementById('mgr-ip-owner').value=x.owner||'';
  document.getElementById('mgr-ip-due').value=x.due||'';
  document.getElementById('mgr-ip-status').value=x.status||'Open';
  document.getElementById('mgr-ip-goal').value=x.goal||'';
  document.getElementById('mgr-ip-actions').value=x.actions||'';
  document.getElementById('mgr-ip-followup').value=x.followup||'';
}
function deleteImprovementPlan(id){
  if(!confirm('Delete this improvement plan?'))return;
  mgrSaveImprovementPlans(mgrLoadImprovementPlans().filter(x=>x.id!==id));renderImprovementPlanBuilder();
}
function renderImprovementPlanBuilder(){
  const sug=document.getElementById('mgr-improvement-suggestions'),list=document.getElementById('mgr-improvement-list');if(!sug||!list)return;
  const suggestions=mgrImprovementSuggestions();
  sug.innerHTML=suggestions.length?`<div style="font-size:10px;font-weight:800;color:var(--accent2);margin-bottom:6px;">Suggested Improvement Plans from Current Data</div><div style="display:flex;gap:6px;flex-wrap:wrap;">${suggestions.map((x,i)=>`<button class="btn btn-ghost btn-sm" onclick='populateImprovementPlan(${JSON.stringify(x.problem)},${JSON.stringify(x.goal)},${JSON.stringify(x.actions)})'>+ ${x.problem}</button>`).join('')}</div>`:'<div class="risk-all-clear" style="padding:8px 10px;">✅ No improvement-plan triggers detected from current scorecard data.</div>';

  const arr=mgrLoadImprovementPlans().sort((a,b)=>(a.status==='Complete'?1:0)-(b.status==='Complete'?1:0)||(a.due||'9999').localeCompare(b.due||'9999'));
  if(!arr.length){list.innerHTML='<div style="font-size:9px;color:var(--text3);">No improvement plans saved yet.</div>';return;}
  list.innerHTML=`<div style="display:flex;flex-direction:column;gap:6px;">${arr.map(x=>{
    const overdue=x.status!=='Complete'&&x.due&&x.due<todoDateKey();
    return `<div style="border:1px solid ${overdue?'rgba(230,57,70,.45)':'var(--border)'};border-radius:7px;background:var(--card2);padding:8px 9px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="min-width:0;"><div style="font-size:10px;font-weight:800;color:var(--white);">${x.problem}</div><div style="font-size:8px;color:var(--text3);margin-top:2px;">Owner: ${x.owner||'Unassigned'} · Due: ${x.due||'No date'} · <span style="color:${x.status==='Complete'?'var(--green2)':overdue?'var(--red2)':'var(--amber2)'};font-weight:800;">${overdue?'OVERDUE · ':''}${x.status}</span></div></div>
        <div style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="editImprovementPlan('${x.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteImprovementPlan('${x.id}')">Delete</button></div>
      </div>
      ${x.goal?`<div style="font-size:9px;color:var(--text2);margin-top:6px;"><strong>Goal:</strong> ${x.goal}</div>`:''}
      ${x.actions?`<div style="font-size:9px;color:var(--text2);margin-top:4px;"><strong>Actions:</strong> ${x.actions}</div>`:''}
      ${x.followup?`<div style="font-size:9px;color:var(--text3);margin-top:4px;"><strong>Follow-Up:</strong> ${x.followup}</div>`:''}
    </div>`;
  }).join('')}</div>`;
}
function openImprovementPlanBuilder(){const m=document.getElementById('mgr-improvement-modal');if(!m)return;m.style.display='flex';renderImprovementPlanBuilder();}
function closeImprovementPlanBuilder(){const m=document.getElementById('mgr-improvement-modal');if(m)m.style.display='none';}
function improvementPlansText(){
  const arr=mgrLoadImprovementPlans();
  return ['3B/3C Improvement Plans','',...arr.map((x,i)=>`${i+1}. ${x.problem}\nOwner: ${x.owner||'Unassigned'} | Due: ${x.due||'No date'} | Status: ${x.status}\nGoal: ${x.goal||'—'}\nActions: ${x.actions||'—'}\nFollow-Up: ${x.followup||'—'}\n`)].join('\n');
}
function copyImprovementPlans(){const txt=improvementPlansText();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Improvement plans copied'));}else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Improvement plans copied');}}
function printImprovementPlans(){const txt=improvementPlansText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const w=window.open('','_blank','width=900,height=1000');if(!w)return alert('Please allow pop-ups to print.');w.document.write(`<html><head><title>3B/3C Improvement Plans</title><style>body{font-family:Arial;padding:32px}pre{white-space:pre-wrap;line-height:1.6;font-family:Arial;font-size:13px}</style></head><body><h1>3B/3C Improvement Plans</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();}

function mgrAgencyPlannerKey(){return '3b3c_agency_recruitment_plan_v1';}
function mgrLoadAgencyPlanner(){
  try{
    const x=JSON.parse(localStorage.getItem(mgrAgencyPlannerKey())||'{"hires":[]}');
    if(!x || typeof x!=='object') return {hires:[]};
    if(!Array.isArray(x.hires)) x.hires=[];
    return x;
  }catch(e){return {hires:[]};}
}
function mgrSaveAgencyPlanner(x){
  try{localStorage.setItem(mgrAgencyPlannerKey(),JSON.stringify(x));}catch(e){}
}
function addAgencyPlannerHire(){
  const role=prompt('Position (RN, LPN, or CA):','RN');
  if(role===null)return;
  const r=String(role).trim().toUpperCase();
  if(!['RN','LPN','CA'].includes(r))return alert('Enter RN, LPN, or CA.');
  const fteRaw=prompt('Planned hire FTE:','0.9');
  if(fteRaw===null)return;
  const fte=parseFloat(fteRaw);
  if(!Number.isFinite(fte)||fte<=0)return alert('Enter a valid FTE.');
  const start=prompt('Expected start date (YYYY-MM-DD):',new Date(Date.now()+30*86400000).toISOString().slice(0,10));
  if(start===null)return;
  const name=prompt('Candidate / hire name (optional):','')||'';
  const plan=mgrLoadAgencyPlanner();
  plan.hires.push({id:'hire_'+Date.now(),role:r,fte:Math.round(fte*100)/100,start:start.trim(),name:name.trim()});
  mgrSaveAgencyPlanner(plan);
  renderAgencyRecruitmentPlanner();
}
function deleteAgencyPlannerHire(id){
  const plan=mgrLoadAgencyPlanner();
  plan.hires=plan.hires.filter(x=>x.id!==id);
  mgrSaveAgencyPlanner(plan);
  renderAgencyRecruitmentPlanner();
}
function mgrPlannerHiresBy(role,days){
  const now=new Date(); now.setHours(12,0,0,0);
  const cutoff=new Date(now); cutoff.setDate(cutoff.getDate()+days);
  return mgrLoadAgencyPlanner().hires
    .filter(x=>x.role===role && x.start && new Date(x.start+'T12:00:00')<=cutoff)
    .reduce((s,x)=>s+(Number(x.fte)||0),0);
}
function mgrAgencyExpiresBy(role,days){
  const now=new Date(); now.setHours(12,0,0,0);
  const cutoff=new Date(now); cutoff.setDate(cutoff.getDate()+days);
  return mgrRoleStaff(role).filter(x=>x.agency && x.end && new Date(x.end+'T12:00:00')<=cutoff && new Date(x.end+'T12:00:00')>=now)
    .reduce((s,x)=>s+(Number(x.fte)||0),0);
}
function mgrAgencyPlannerForecast(role,days){
  const row=mgrVacancyRoleData().find(x=>x.role===role);
  if(!row)return null;
  const hires=mgrPlannerHiresBy(role,days);
  const agencyExp=mgrAgencyExpiresBy(role,days);
  const permanentProjected=row.permanentFilled+hires;
  const agencyProjected=Math.max(0,row.agencyFTE-agencyExp);
  const totalProjected=permanentProjected+agencyProjected;
  const gap=Math.max(0,row.budget-totalProjected);
  const permanentGap=Math.max(0,row.budget-permanentProjected);
  return {role,days,budget:row.budget,permanentProjected,agencyProjected,totalProjected,gap,permanentGap,hires,agencyExp};
}
function mgrAgencyPlannerStatus(f){
  if(!f || !f.budget)return {text:'No budget',color:'var(--text3)'};
  if(f.gap>0)return {text:`${f.gap.toFixed(1)} FTE uncovered`,color:'var(--red2)'};
  if(f.permanentGap>0)return {text:`Covered, ${f.permanentGap.toFixed(1)} FTE still agency-dependent`,color:'var(--amber2)'};
  return {text:'Fully permanent-covered',color:'var(--green2)'};
}
function renderAgencyRecruitmentPlanner(){
  const sum=document.getElementById('mgr-agency-planner-summary'),hiresEl=document.getElementById('mgr-agency-planner-hires'),fc=document.getElementById('mgr-agency-planner-forecast'),contracts=document.getElementById('mgr-agency-planner-contracts');
  if(!sum||!hiresEl||!fc||!contracts)return;

  const vac=mgrVacancySummary(),aw=siAgencyWorkforce(),plan=mgrLoadAgencyPlanner();
  const agencyFTE=mgrVacancyRoleData().reduce((s,r)=>s+r.agencyFTE,0);
  const plannedFTE=plan.hires.reduce((s,h)=>s+(Number(h.fte)||0),0);
  const exp90=['RN','LPN','CA'].reduce((s,r)=>s+mgrAgencyExpiresBy(r,90),0);

  sum.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:6px;">
    ${mgrTile('Permanent Vacancy',vac.hasBudget?`${vac.open} FTE`:'—','Current permanent gap',vac.open>0?'mgr-status-warn':'mgr-status-good','vacancy','📉')}
    ${mgrTile('Agency FTE',`${agencyFTE.toFixed(1)}`,'Current agency coverage',agencyFTE>0?'mgr-status-warn':'mgr-status-good','directory','🧳')}
    ${mgrTile('Agency Mix',`${aw.pct}%`,`${aw.agency.length} agency staff`,aw.pct>=25?'mgr-status-warn':'mgr-status-good','directory','👥')}
    ${mgrTile('Planned Hires',`${plannedFTE.toFixed(1)} FTE`,`${plan.hires.length} planned hire${plan.hires.length===1?'':'s'}`,plannedFTE?'mgr-status-good':'','home','➕')}
    ${mgrTile('Agency Ending ≤90d',`${exp90.toFixed(1)} FTE`,'Contract exit exposure',exp90?'mgr-status-warn':'mgr-status-good','directory','📅')}
  </div>`;

  hiresEl.innerHTML=plan.hires.length?`<div style="overflow:auto;"><table class="data-table"><thead><tr><th>Position</th><th>Name</th><th>FTE</th><th>Expected Start</th><th></th></tr></thead><tbody>${plan.hires.sort((a,b)=>(a.start||'').localeCompare(b.start||'')).map(h=>`<tr><td style="font-weight:800;">${h.role}</td><td>${h.name||'—'}</td><td>${Number(h.fte).toFixed(2)}</td><td>${h.start||'—'}</td><td><button class="btn btn-danger btn-sm" onclick="deleteAgencyPlannerHire('${h.id}')">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<div style="font-size:9px;color:var(--text3);">No planned permanent hires entered.</div>';

  const roles=['RN','LPN','CA'], periods=[30,60,90];
  fc.innerHTML=`<div style="overflow:auto;"><table class="data-table" style="width:100%;"><thead><tr><th>Position</th>${periods.map(d=>`<th>${d} Days</th>`).join('')}</tr></thead><tbody>
    ${roles.map(role=>`<tr><td style="font-weight:800;">${role}</td>${periods.map(days=>{const f=mgrAgencyPlannerForecast(role,days),st=mgrAgencyPlannerStatus(f);return `<td><div style="font-weight:800;color:${st.color};">${st.text}</div><div style="font-size:8px;color:var(--text3);margin-top:2px;">Permanent ${f.permanentProjected.toFixed(1)} · Agency ${f.agencyProjected.toFixed(1)} · Hires +${f.hires.toFixed(1)}</div></td>`;}).join('')}</tr>`).join('')}
  </tbody></table></div>`;

  const agencyRows=['RN','LPN','CA'].flatMap(role=>mgrRoleStaff(role).filter(x=>x.agency).map(x=>({...x,role,days:mgrDaysUntil(x.end)}))).sort((a,b)=>(a.days??9999)-(b.days??9999));
  contracts.innerHTML=agencyRows.length?`<div style="overflow:auto;"><table class="data-table"><thead><tr><th>Position</th><th>Agency Staff</th><th>FTE</th><th>End Date</th><th>Days Left</th><th>Replacement Coverage</th></tr></thead><tbody>${agencyRows.map(x=>{
    const days=x.days===null?null:Math.max(0,x.days);
    const period=days===null?90:days<=30?30:days<=60?60:90;
    const f=mgrAgencyPlannerForecast(x.role,period);
    const enough=(mgrPlannerHiresBy(x.role,period)>=Number(x.fte||0)) || (f && f.gap<=0 && f.permanentGap<=0);
    return `<tr><td style="font-weight:800;">${x.role}</td><td>${x.name}</td><td>${Number(x.fte||0).toFixed(2)}</td><td>${x.end||'—'}</td><td style="font-weight:800;color:${days!==null&&days<=30?'var(--red2)':days!==null&&days<=60?'var(--amber2)':'var(--text2)'};">${days===null?'—':days}</td><td style="font-weight:800;color:${enough?'var(--green2)':'var(--red2)'};">${enough?'Likely covered':'Replacement gap'}</td></tr>`;
  }).join('')}</tbody></table></div>`:'<div class="risk-all-clear" style="padding:8px 10px;">✅ No agency contracts identified.</div>';
}
function openAgencyRecruitmentPlanner(){const m=document.getElementById('mgr-agency-planner-modal');if(!m)return;m.style.display='flex';renderAgencyRecruitmentPlanner();}
function closeAgencyRecruitmentPlanner(){const m=document.getElementById('mgr-agency-planner-modal');if(m)m.style.display='none';}
function agencyPlannerText(){
  const roles=['RN','LPN','CA'],plan=mgrLoadAgencyPlanner();
  const lines=['3B/3C Agency Exit & Recruitment Planner',`Date: ${new Date().toLocaleDateString()}`,'','Planned Permanent Hires:'];
  lines.push(...(plan.hires.length?plan.hires.map((h,i)=>`${i+1}. ${h.role} — ${h.name||'Unnamed'} — ${Number(h.fte).toFixed(2)} FTE — start ${h.start||'TBD'}`):['None']));
  lines.push('','30 / 60 / 90-Day Forecast:');
  roles.forEach(role=>{
    [30,60,90].forEach(days=>{
      const f=mgrAgencyPlannerForecast(role,days),st=mgrAgencyPlannerStatus(f);
      lines.push(`${role} ${days}d: ${st.text} | Permanent ${f.permanentProjected.toFixed(1)} | Agency ${f.agencyProjected.toFixed(1)} | Budget ${f.budget.toFixed(1)}`);
    });
  });
  return lines.join('\n');
}
function copyAgencyPlanner(){const txt=agencyPlannerText();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Agency/recruitment plan copied'));}else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Agency/recruitment plan copied');}}
function printAgencyPlanner(){const txt=agencyPlannerText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const w=window.open('','_blank','width=900,height=1000');if(!w)return alert('Please allow pop-ups to print.');w.document.write(`<html><head><title>Agency Exit & Recruitment Planner</title><style>body{font-family:Arial;padding:32px}pre{white-space:pre-wrap;line-height:1.6;font-family:Arial;font-size:13px}</style></head><body><h1>3B/3C Agency Exit & Recruitment Planner</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();}

function mgrRecruitPipelineKey(){return '3b3c_recruitment_pipeline_v1';}
function mgrLoadRecruitPipeline(){try{const x=JSON.parse(localStorage.getItem(mgrRecruitPipelineKey())||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function mgrSaveRecruitPipeline(arr){try{localStorage.setItem(mgrRecruitPipelineKey(),JSON.stringify(arr.slice(-150)));}catch(e){}}

function clearRecruitPipelineForm(){
  ['mgr-rp-id','mgr-rp-name','mgr-rp-start','mgr-rp-orient-end','mgr-rp-owner','mgr-rp-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('mgr-rp-role').value='RN';
  document.getElementById('mgr-rp-fte').value='0.9';
  document.getElementById('mgr-rp-stage').value='Candidate';
}
function saveRecruitPipelineItem(){
  const name=(document.getElementById('mgr-rp-name').value||'').trim();
  if(!name)return alert('Enter candidate / new hire name.');
  const id=document.getElementById('mgr-rp-id').value||('rp_'+Date.now());
  const item={
    id,name,
    role:document.getElementById('mgr-rp-role').value,
    fte:Number(document.getElementById('mgr-rp-fte').value)||0,
    stage:document.getElementById('mgr-rp-stage').value,
    start:document.getElementById('mgr-rp-start').value||'',
    orientEnd:document.getElementById('mgr-rp-orient-end').value||'',
    owner:(document.getElementById('mgr-rp-owner').value||'').trim(),
    notes:(document.getElementById('mgr-rp-notes').value||'').trim(),
    updated:new Date().toISOString()
  };
  let arr=mgrLoadRecruitPipeline();
  const idx=arr.findIndex(x=>x.id===id); if(idx>=0)arr[idx]=item; else arr.push(item);
  mgrSaveRecruitPipeline(arr);
  clearRecruitPipelineForm();renderRecruitmentPipeline();
  if(typeof showSaveBanner==='function')showSaveBanner('💾 Recruitment pipeline updated');
}
function editRecruitPipelineItem(id){
  const x=mgrLoadRecruitPipeline().find(i=>i.id===id);if(!x)return;
  document.getElementById('mgr-rp-id').value=x.id;
  document.getElementById('mgr-rp-name').value=x.name||'';
  document.getElementById('mgr-rp-role').value=x.role||'RN';
  document.getElementById('mgr-rp-fte').value=x.fte||0;
  document.getElementById('mgr-rp-stage').value=x.stage||'Candidate';
  document.getElementById('mgr-rp-start').value=x.start||'';
  document.getElementById('mgr-rp-orient-end').value=x.orientEnd||'';
  document.getElementById('mgr-rp-owner').value=x.owner||'';
  document.getElementById('mgr-rp-notes').value=x.notes||'';
}
function deleteRecruitPipelineItem(id){
  if(!confirm('Remove this candidate / new hire from the pipeline?'))return;
  mgrSaveRecruitPipeline(mgrLoadRecruitPipeline().filter(x=>x.id!==id));renderRecruitmentPipeline();
}
function mgrRecruitFTEBy(days,productiveOnly=false){
  const now=new Date();now.setHours(12,0,0,0);
  const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()+days);
  const activeStages=['Accepted','Started','Orientation','Productive'];
  const by={RN:0,LPN:0,CA:0};
  mgrLoadRecruitPipeline().forEach(x=>{
    if(!activeStages.includes(x.stage))return;
    const targetDate=productiveOnly?(x.orientEnd||x.start):x.start;
    if(!targetDate)return;
    const dt=new Date(targetDate+'T12:00:00');if(isNaN(dt)||dt>cutoff)return;
    if(productiveOnly && x.stage==='Accepted' && !x.orientEnd)return;
    by[x.role]=(by[x.role]||0)+(Number(x.fte)||0);
  });
  return by;
}
function mgrRecruitForecastRole(role,days){
  const base=mgrVacancyRoleData().find(x=>x.role===role);
  const fte=mgrRecruitFTEBy(days,false)[role]||0;
  const productive=mgrRecruitFTEBy(days,true)[role]||0;
  const permProjected=(base?base.permanentFilled:0)+productive;
  const permGap=Math.max(0,(base?base.budget:0)-permProjected);
  return {role,days,fte,productive,permProjected,permGap,budget:base?base.budget:0};
}
function renderRecruitmentPipeline(){
  const s=document.getElementById('mgr-recruit-pipeline-summary'),stage=document.getElementById('mgr-recruit-stage-grid'),fc=document.getElementById('mgr-recruit-forecast'),list=document.getElementById('mgr-recruit-list');
  if(!s||!stage||!fc||!list)return;
  const arr=mgrLoadRecruitPipeline();
  const active=arr.filter(x=>!['Declined'].includes(x.stage));
  const accepted=arr.filter(x=>['Accepted','Started','Orientation','Productive'].includes(x.stage));
  const totalAcceptedFTE=accepted.reduce((a,x)=>a+(Number(x.fte)||0),0);
  const starting30=accepted.filter(x=>x.start&&mgrDaysUntil(x.start)!==null&&mgrDaysUntil(x.start)>=0&&mgrDaysUntil(x.start)<=30).reduce((a,x)=>a+(Number(x.fte)||0),0);
  const orienting=arr.filter(x=>x.stage==='Orientation').reduce((a,x)=>a+(Number(x.fte)||0),0);
  const productive=arr.filter(x=>x.stage==='Productive').reduce((a,x)=>a+(Number(x.fte)||0),0);

  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:6px;">
    ${mgrTile('Active Pipeline',active.length,'Candidates/new hires','','home','👥')}
    ${mgrTile('Accepted+',`${totalAcceptedFTE.toFixed(1)} FTE`,`${accepted.length} accepted/started`,totalAcceptedFTE?'mgr-status-good':'','home','✅')}
    ${mgrTile('Starting ≤30d',`${starting30.toFixed(1)} FTE`,'Expected starts',starting30?'mgr-status-good':'','home','📅')}
    ${mgrTile('Orientation',`${orienting.toFixed(1)} FTE`,'Currently orienting',orienting?'mgr-status-warn':'','orientation','🎓')}
    ${mgrTile('Productive',`${productive.toFixed(1)} FTE`,'Pipeline marked productive',productive?'mgr-status-good':'','home','🟢')}
  </div>`;

  const stages=['Candidate','Interview','Offer','Accepted','Started','Orientation','Productive','Declined'];
  stage.innerHTML=`<div style="display:grid;grid-template-columns:repeat(8,minmax(90px,1fr));gap:5px;">${stages.map(st=>{
    const rows=arr.filter(x=>x.stage===st),fte=rows.reduce((a,x)=>a+(Number(x.fte)||0),0);
    return `<div style="padding:7px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);text-align:center;"><div style="font-size:8px;color:var(--text3);font-weight:800;text-transform:uppercase;">${st}</div><div style="font-size:14px;font-weight:800;color:var(--white);margin-top:3px;">${rows.length}</div><div style="font-size:8px;color:var(--text3);">${fte.toFixed(1)} FTE</div></div>`;
  }).join('')}</div>`;

  const roles=['RN','LPN','CA'];
  fc.innerHTML=`<div style="overflow:auto;"><table class="data-table" style="width:100%;"><thead><tr><th>Position</th><th>30 Days</th><th>60 Days</th><th>90 Days</th></tr></thead><tbody>${roles.map(role=>`<tr><td style="font-weight:800;">${role}</td>${[30,60,90].map(days=>{const f=mgrRecruitForecastRole(role,days);return `<td><div style="font-weight:800;color:${f.permGap>0?'var(--amber2)':'var(--green2)'};">${f.productive.toFixed(1)} productive FTE coming online</div><div style="font-size:8px;color:var(--text3);margin-top:2px;">Projected permanent ${f.permProjected.toFixed(1)} / ${f.budget.toFixed(1)} budget · gap ${f.permGap.toFixed(1)}</div></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;

  list.innerHTML=arr.length?`<div style="overflow:auto;"><table class="data-table"><thead><tr><th>Name</th><th>Role</th><th>FTE</th><th>Stage</th><th>Start</th><th>Orientation End</th><th>Owner</th><th>Notes</th><th></th></tr></thead><tbody>${arr.sort((a,b)=>(a.start||'9999').localeCompare(b.start||'9999')).map(x=>`<tr><td style="font-weight:800;">${x.name}</td><td>${x.role}</td><td>${Number(x.fte||0).toFixed(2)}</td><td>${x.stage}</td><td>${x.start||'—'}</td><td>${x.orientEnd||'—'}</td><td>${x.owner||'—'}</td><td>${x.notes||'—'}</td><td><div style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="editRecruitPipelineItem('${x.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteRecruitPipelineItem('${x.id}')">Remove</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div style="font-size:9px;color:var(--text3);">No candidates or new hires tracked yet.</div>';
}
function openRecruitmentPipeline(){const m=document.getElementById('mgr-recruit-pipeline-modal');if(!m)return;m.style.display='flex';renderRecruitmentPipeline();}
function closeRecruitmentPipeline(){const m=document.getElementById('mgr-recruit-pipeline-modal');if(m)m.style.display='none';}
function recruitmentPipelineText(){
  const arr=mgrLoadRecruitPipeline();
  return ['3B/3C Recruitment & Onboarding Pipeline',`Date: ${new Date().toLocaleDateString()}`,'',...(arr.length?arr.map((x,i)=>`${i+1}. ${x.name} — ${x.role} ${Number(x.fte||0).toFixed(2)} FTE — ${x.stage} — start ${x.start||'TBD'} — orientation end ${x.orientEnd||'TBD'} — owner ${x.owner||'Unassigned'}${x.notes?' — '+x.notes:''}`):['No pipeline entries'])].join('\n');
}
function copyRecruitmentPipeline(){const txt=recruitmentPipelineText();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Recruitment pipeline copied'));}else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Recruitment pipeline copied');}}
function printRecruitmentPipeline(){const txt=recruitmentPipelineText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const w=window.open('','_blank','width=900,height=1000');if(!w)return alert('Please allow pop-ups to print.');w.document.write(`<html><head><title>Recruitment & Onboarding Pipeline</title><style>body{font-family:Arial;padding:32px}pre{white-space:pre-wrap;line-height:1.6;font-family:Arial;font-size:13px}</style></head><body><h1>3B/3C Recruitment & Onboarding Pipeline</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();}

function mgrOrientationCapacityKey(){return '3b3c_orientation_capacity_v1';}
function mgrLoadOrientationCapacity(){try{const x=JSON.parse(localStorage.getItem(mgrOrientationCapacityKey())||'{"assignments":[]}');if(!x||typeof x!=='object')return{assignments:[]};if(!Array.isArray(x.assignments))x.assignments=[];return x;}catch(e){return{assignments:[]};}}
function mgrSaveOrientationCapacity(x){try{localStorage.setItem(mgrOrientationCapacityKey(),JSON.stringify(x));}catch(e){}}

function mgrOrientationCandidates(){
  return mgrLoadRecruitPipeline().filter(x=>['Accepted','Started','Orientation'].includes(x.stage));
}
function mgrPreceptorPool(role){
  return (MASTER_STAFF||[]).filter(s=>{
    const job=String(s.job||s.role||'').toUpperCase();
    return job===role && !siIsAgency(s.name);
  }).map(s=>s.name).sort();
}
function addOrientationAssignment(){
  const candidates=mgrOrientationCandidates();
  if(!candidates.length)return alert('No Accepted / Started / Orientation hires are in the recruitment pipeline.');
  const names=candidates.map((x,i)=>`${i+1}. ${x.name} (${x.role})`).join('\n');
  const pick=prompt(`Select new hire by number:\n${names}`,'1');
  if(pick===null)return;
  const idx=parseInt(pick,10)-1;
  const hire=candidates[idx];
  if(!hire)return alert('Invalid selection.');
  const pool=mgrPreceptorPool(hire.role);
  const preceptor=prompt(`Enter preceptor name for ${hire.name}.\nSuggested permanent ${hire.role} staff:\n${pool.slice(0,20).join(', ')}`,'');
  if(preceptor===null)return;
  const start=prompt('Orientation start date:',hire.start||new Date().toISOString().slice(0,10));
  if(start===null)return;
  const end=prompt('Orientation end date:',hire.orientEnd||'');
  if(end===null)return;
  const shift=prompt('Primary shift (Day / Night / Mixed):','Day')||'';
  const plan=mgrLoadOrientationCapacity();
  const existing=plan.assignments.find(x=>x.hireId===hire.id);
  const obj={id:existing?existing.id:'oa_'+Date.now(),hireId:hire.id,name:hire.name,role:hire.role,fte:Number(hire.fte)||0,preceptor:preceptor.trim(),start:start.trim(),end:end.trim(),shift:shift.trim(),status:'Active'};
  if(existing)Object.assign(existing,obj);else plan.assignments.push(obj);
  mgrSaveOrientationCapacity(plan);renderOrientationCapacityPlanner();
}
function editOrientationAssignment(id){
  const plan=mgrLoadOrientationCapacity(),x=plan.assignments.find(a=>a.id===id);if(!x)return;
  const preceptor=prompt('Preceptor:',x.preceptor||'');if(preceptor===null)return;
  const start=prompt('Orientation start:',x.start||'');if(start===null)return;
  const end=prompt('Orientation end:',x.end||'');if(end===null)return;
  const shift=prompt('Primary shift:',x.shift||'Day');if(shift===null)return;
  x.preceptor=preceptor.trim();x.start=start.trim();x.end=end.trim();x.shift=shift.trim();
  mgrSaveOrientationCapacity(plan);renderOrientationCapacityPlanner();
}
function completeOrientationAssignment(id){
  const plan=mgrLoadOrientationCapacity(),x=plan.assignments.find(a=>a.id===id);if(!x)return;
  x.status='Complete';x.completedAt=new Date().toISOString();
  mgrSaveOrientationCapacity(plan);renderOrientationCapacityPlanner();
}
function deleteOrientationAssignment(id){
  if(!confirm('Remove this orientation assignment?'))return;
  const plan=mgrLoadOrientationCapacity();plan.assignments=plan.assignments.filter(x=>x.id!==id);mgrSaveOrientationCapacity(plan);renderOrientationCapacityPlanner();
}
function mgrOrientationActiveOn(dateKey){
  const d=new Date(dateKey+'T12:00:00');
  return mgrLoadOrientationCapacity().assignments.filter(x=>{
    if(x.status==='Complete')return false;
    const s=x.start?new Date(x.start+'T12:00:00'):null,e=x.end?new Date(x.end+'T12:00:00'):null;
    return (!s||d>=s)&&(!e||d<=e);
  });
}
function mgrOrientationFTEBy(days){
  const now=new Date();now.setHours(12,0,0,0);const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()+days);
  const by={RN:0,LPN:0,CA:0};
  mgrLoadOrientationCapacity().assignments.forEach(x=>{
    const e=x.end?new Date(x.end+'T12:00:00'):null;
    if(x.status==='Complete' || (e && e<=cutoff))by[x.role]=(by[x.role]||0)+(Number(x.fte)||0);
  });
  return by;
}
function renderOrientationCapacityPlanner(){
  const s=document.getElementById('mgr-orientation-capacity-summary'),a=document.getElementById('mgr-orientation-assignments'),l=document.getElementById('mgr-orientation-load'),p=document.getElementById('mgr-orientation-productive');
  if(!s||!a||!l||!p)return;
  const plan=mgrLoadOrientationCapacity(),active=plan.assignments.filter(x=>x.status!=='Complete'),uniquePreceptors=new Set(active.map(x=>x.preceptor).filter(Boolean));
  const ending30=active.filter(x=>x.end&&mgrDaysUntil(x.end)!==null&&mgrDaysUntil(x.end)>=0&&mgrDaysUntil(x.end)<=30);
  const missing=active.filter(x=>!x.preceptor).length;

  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:6px;">
    ${mgrTile('Active Orientations',active.length,'New hires orienting',active.length?'mgr-status-warn':'mgr-status-good','orientation','🎓')}
    ${mgrTile('Preceptors Used',uniquePreceptors.size,'Unique active preceptors','','home','👩‍🏫')}
    ${mgrTile('No Preceptor',missing,'Assignment needed',missing?'mgr-status-bad':'mgr-status-good','home','⚠️')}
    ${mgrTile('Finishing ≤30d',ending30.length,'Approaching productive status',ending30.length?'mgr-status-good':'','home','🟢')}
    ${mgrTile('Orientation FTE',`${active.reduce((q,x)=>q+(Number(x.fte)||0),0).toFixed(1)}`,'FTE currently orienting','','home','👥')}
  </div>`;

  a.innerHTML=plan.assignments.length?`<div style="overflow:auto;"><table class="data-table"><thead><tr><th>New Hire</th><th>Role</th><th>FTE</th><th>Preceptor</th><th>Shift</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead><tbody>${plan.assignments.sort((x,y)=>(x.start||'9999').localeCompare(y.start||'9999')).map(x=>`<tr><td style="font-weight:800;">${x.name}</td><td>${x.role}</td><td>${Number(x.fte||0).toFixed(2)}</td><td>${x.preceptor||'<span style="color:var(--red2);">Unassigned</span>'}</td><td>${x.shift||'—'}</td><td>${x.start||'—'}</td><td>${x.end||'—'}</td><td style="font-weight:800;color:${x.status==='Complete'?'var(--green2)':'var(--amber2)'};">${x.status}</td><td><div style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="editOrientationAssignment('${x.id}')">Edit</button>${x.status!=='Complete'?`<button class="btn btn-success btn-sm" onclick="completeOrientationAssignment('${x.id}')">Complete</button>`:''}<button class="btn btn-danger btn-sm" onclick="deleteOrientationAssignment('${x.id}')">Remove</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div style="font-size:9px;color:var(--text3);">No preceptor assignments yet.</div>';

  const periods=[0,7,14,30,60,90];
  l.innerHTML=`<div style="display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:6px;">${periods.map(days=>{
    const d=new Date();d.setDate(d.getDate()+days);const key=d.toISOString().slice(0,10),rows=mgrOrientationActiveOn(key),fte=rows.reduce((q,x)=>q+(Number(x.fte)||0),0);
    return `<div style="padding:8px;border:1px solid var(--border);border-radius:7px;background:var(--card2);text-align:center;"><div style="font-size:8px;color:var(--text3);font-weight:800;">${days===0?'TODAY':'+'+days+' DAYS'}</div><div style="font-size:16px;font-weight:800;color:${rows.length>=4?'var(--red2)':rows.length>=2?'var(--amber2)':'var(--green2)'};margin-top:3px;">${rows.length}</div><div style="font-size:8px;color:var(--text3);">${fte.toFixed(1)} FTE orienting</div></div>`;
  }).join('')}</div>`;

  p.innerHTML=`<div style="overflow:auto;"><table class="data-table" style="width:100%;"><thead><tr><th>Position</th><th>30 Days</th><th>60 Days</th><th>90 Days</th></tr></thead><tbody>${['RN','LPN','CA'].map(role=>`<tr><td style="font-weight:800;">${role}</td>${[30,60,90].map(days=>{const by=mgrOrientationFTEBy(days);return `<td><strong style="color:var(--green2);">${(by[role]||0).toFixed(1)} FTE</strong><div style="font-size:8px;color:var(--text3);margin-top:2px;">Expected productive by ${days}d</div></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function openOrientationCapacityPlanner(){const m=document.getElementById('mgr-orientation-capacity-modal');if(!m)return;m.style.display='flex';renderOrientationCapacityPlanner();}
function closeOrientationCapacityPlanner(){const m=document.getElementById('mgr-orientation-capacity-modal');if(m)m.style.display='none';}
function orientationCapacityText(){
  const plan=mgrLoadOrientationCapacity(),lines=['3B/3C Orientation & Preceptor Capacity',`Date: ${new Date().toLocaleDateString()}`,''];
  lines.push(...(plan.assignments.length?plan.assignments.map((x,i)=>`${i+1}. ${x.name} — ${x.role} ${Number(x.fte||0).toFixed(2)} FTE — Preceptor: ${x.preceptor||'UNASSIGNED'} — ${x.shift||'—'} — ${x.start||'TBD'} to ${x.end||'TBD'} — ${x.status}`):['No assignments']));
  lines.push('','Productive FTE Forecast:');
  [30,60,90].forEach(days=>{const by=mgrOrientationFTEBy(days);lines.push(`${days}d: RN ${(by.RN||0).toFixed(1)} | LPN ${(by.LPN||0).toFixed(1)} | CA ${(by.CA||0).toFixed(1)}`);});
  return lines.join('\n');
}
function copyOrientationCapacity(){const txt=orientationCapacityText();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Orientation capacity copied'));}else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Orientation capacity copied');}}
function printOrientationCapacity(){const txt=orientationCapacityText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const w=window.open('','_blank','width=900,height=1000');if(!w)return alert('Please allow pop-ups to print.');w.document.write(`<html><head><title>Orientation & Preceptor Capacity</title><style>body{font-family:Arial;padding:32px}pre{white-space:pre-wrap;line-height:1.6;font-family:Arial;font-size:13px}</style></head><body><h1>3B/3C Orientation & Preceptor Capacity</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();}

function mgrRetentionKey(){return '3b3c_retention_actions_v1';}
function mgrLoadRetentionActions(){try{const x=JSON.parse(localStorage.getItem(mgrRetentionKey())||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function mgrSaveRetentionActions(arr){try{localStorage.setItem(mgrRetentionKey(),JSON.stringify(arr.slice(-100)));}catch(e){}}

function mgrRoleRetentionRisk(role){
  const vac=mgrVacancyRoleData().find(x=>x.role===role);
  const staff=mgrRoleStaff(role);
  const agency=staff.filter(x=>x.agency);
  const permanent=staff.filter(x=>!x.agency);
  const ot=siUkgovertime();
  const otNames=new Set((ot.rows||[]).filter(x=>(Number(x.ot)||0)>0).map(x=>x.name||x.employee||x.employeeName).filter(Boolean));
  const otCount=permanent.filter(x=>otNames.has(x.name)).length;
  const agencyPct=staff.length?Math.round(agency.length/staff.length*100):0;
  let score=0;
  if(vac && vac.pct!==null) score += Math.min(40, vac.pct*1.5);
  score += Math.min(25, agencyPct*0.8);
  score += Math.min(20, otCount*4);
  const exp60=agency.filter(x=>{const d=mgrDaysUntil(x.end);return d!==null&&d>=0&&d<=60;}).length;
  score += Math.min(15, exp60*5);
  score=Math.round(Math.min(100,score));
  const level=score>=70?'High':score>=40?'Moderate':'Low';
  return {role,score,level,vacancyPct:vac?.pct,agencyPct,permanent:permanent.length,agency:agency.length,otCount,exp60};
}
function mgrRetentionWatchItems(){
  const items=[];
  ['RN','LPN','CA'].forEach(role=>{
    const r=mgrRoleRetentionRisk(role);
    if(r.level==='High')items.push(`${role}: high workforce risk (${r.score}/100)`);
    else if(r.level==='Moderate')items.push(`${role}: moderate workforce risk (${r.score}/100)`);
    if(r.exp60)items.push(`${role}: ${r.exp60} agency contract${r.exp60===1?'':'s'} ending ≤60 days`);
    if(r.otCount)items.push(`${role}: ${r.otCount} permanent staff with imported UKG OT`);
  });
  const task=mgrTaskPulseData();
  if(task.overdue)items.push(`${task.overdue} overdue manager follow-up${task.overdue===1?'':'s'}`);
  const coach=mgrCoachingFollowupCount();
  if(coach)items.push(`${coach} coaching follow-up${coach===1?'':'s'} due`);
  return items;
}
function addRetentionAction(){
  const role=prompt('Position / focus (RN, LPN, CA, or Unit):','RN');
  if(role===null)return;
  const action=prompt('Retention action:','Stay interview / recognition / schedule review / development plan');
  if(action===null||!action.trim())return;
  const owner=prompt('Owner:','Nurse Manager')||'';
  const due=prompt('Due date (YYYY-MM-DD):',new Date(Date.now()+14*86400000).toISOString().slice(0,10));
  if(due===null)return;
  const arr=mgrLoadRetentionActions();
  arr.push({id:'ra_'+Date.now(),role:role.trim(),action:action.trim(),owner:owner.trim(),due:due.trim(),status:'Open',created:new Date().toISOString()});
  mgrSaveRetentionActions(arr);renderRetentionRiskPlanner();
}
function updateRetentionAction(id,status){
  const arr=mgrLoadRetentionActions(),x=arr.find(a=>a.id===id);if(!x)return;
  x.status=status;mgrSaveRetentionActions(arr);renderRetentionRiskPlanner();
}
function deleteRetentionAction(id){
  if(!confirm('Delete this retention action?'))return;
  mgrSaveRetentionActions(mgrLoadRetentionActions().filter(x=>x.id!==id));renderRetentionRiskPlanner();
}
function renderRetentionRiskPlanner(){
  const s=document.getElementById('mgr-retention-summary'),rr=document.getElementById('mgr-retention-role-risk'),a=document.getElementById('mgr-retention-actions'),w=document.getElementById('mgr-retention-watch');
  if(!s||!rr||!a||!w)return;
  const roles=['RN','LPN','CA'].map(mgrRoleRetentionRisk);
  const high=roles.filter(x=>x.level==='High').length,moderate=roles.filter(x=>x.level==='Moderate').length;
  const actions=mgrLoadRetentionActions(),open=actions.filter(x=>x.status!=='Complete').length,overdue=actions.filter(x=>x.status!=='Complete'&&x.due&&x.due<todoDateKey()).length;
  const avg=Math.round(roles.reduce((q,x)=>q+x.score,0)/roles.length);

  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:6px;">
    ${mgrTile('Overall Risk',`${avg}/100`,avg>=70?'High':avg>=40?'Moderate':'Low',avg>=70?'mgr-status-bad':avg>=40?'mgr-status-warn':'mgr-status-good','home','🧠')}
    ${mgrTile('High-Risk Roles',high,high?'Needs retention focus':'None high risk',high?'mgr-status-bad':'mgr-status-good','home','🚨')}
    ${mgrTile('Moderate Roles',moderate,'Watch closely',moderate?'mgr-status-warn':'mgr-status-good','home','⚠️')}
    ${mgrTile('Open Actions',open,'Retention follow-up',open?'mgr-status-warn':'mgr-status-good','home','🎯')}
    ${mgrTile('Overdue Actions',overdue,'Past due',overdue?'mgr-status-bad':'mgr-status-good','home','⏰')}
  </div>`;

  rr.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:8px;">${roles.map(x=>{
    const color=x.level==='High'?'var(--red2)':x.level==='Moderate'?'var(--amber2)':'var(--green2)';
    return `<div style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--card2);">
      <div style="display:flex;justify-content:space-between;"><strong style="color:var(--white);">${x.role}</strong><span style="font-weight:800;color:${color};">${x.level} · ${x.score}/100</span></div>
      <div style="height:7px;background:rgba(255,255,255,.08);border-radius:8px;overflow:hidden;margin:7px 0;"><div style="height:100%;width:${x.score}%;background:${color};"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:9px;color:var(--text3);">
        <span>Vacancy</span><strong style="text-align:right;color:var(--text2);">${x.vacancyPct===null||x.vacancyPct===undefined?'—':x.vacancyPct.toFixed(1)+'%'}</strong>
        <span>Agency mix</span><strong style="text-align:right;color:var(--text2);">${x.agencyPct}%</strong>
        <span>Permanent staff</span><strong style="text-align:right;color:var(--text2);">${x.permanent}</strong>
        <span>UKG OT staff</span><strong style="text-align:right;color:var(--text2);">${x.otCount}</strong>
        <span>Agency ending ≤60d</span><strong style="text-align:right;color:${x.exp60?'var(--amber2)':'var(--text2)'};">${x.exp60}</strong>
      </div>
    </div>`;
  }).join('')}</div>`;

  a.innerHTML=actions.length?`<div style="overflow:auto;"><table class="data-table"><thead><tr><th>Focus</th><th>Action</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${actions.sort((x,y)=>(x.status==='Complete'?1:0)-(y.status==='Complete'?1:0)||(x.due||'9999').localeCompare(y.due||'9999')).map(x=>{
    const overdue=x.status!=='Complete'&&x.due&&x.due<todoDateKey();
    return `<tr><td style="font-weight:800;">${x.role}</td><td>${x.action}</td><td>${x.owner||'—'}</td><td style="color:${overdue?'var(--red2)':'var(--text2)'};font-weight:${overdue?'800':'400'};">${x.due||'—'}${overdue?' · OVERDUE':''}</td><td>${x.status}</td><td><div style="display:flex;gap:4px;">${x.status!=='Complete'?`<button class="btn btn-success btn-sm" onclick="updateRetentionAction('${x.id}','Complete')">Complete</button>`:''}<button class="btn btn-danger btn-sm" onclick="deleteRetentionAction('${x.id}')">Remove</button></div></td></tr>`;
  }).join('')}</tbody></table></div>`:'<div style="font-size:9px;color:var(--text3);">No retention actions saved yet.</div>';

  const watch=mgrRetentionWatchItems();
  w.innerHTML=watch.length?watch.map(x=>`<div style="padding:6px 7px;border:1px solid rgba(245,158,11,.25);border-radius:6px;background:rgba(245,158,11,.06);margin-bottom:5px;font-size:9px;color:var(--amber2);">⚠️ ${x}</div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No major workforce retention watch items.</div>';
}
function openRetentionRiskPlanner(){const m=document.getElementById('mgr-retention-risk-modal');if(!m)return;m.style.display='flex';renderRetentionRiskPlanner();}
function closeRetentionRiskPlanner(){const m=document.getElementById('mgr-retention-risk-modal');if(m)m.style.display='none';}
function retentionRiskText(){
  const roles=['RN','LPN','CA'].map(mgrRoleRetentionRisk),actions=mgrLoadRetentionActions(),watch=mgrRetentionWatchItems();
  return ['3B/3C Retention & Workforce Risk',`Date: ${new Date().toLocaleDateString()}`,'','Role Risk:',...roles.map(x=>`${x.role}: ${x.level} (${x.score}/100) | Vacancy ${x.vacancyPct===null||x.vacancyPct===undefined?'—':x.vacancyPct.toFixed(1)+'%'} | Agency ${x.agencyPct}% | OT staff ${x.otCount}`),'','Retention Actions:',...(actions.length?actions.map((x,i)=>`${i+1}. ${x.role} — ${x.action} — Owner ${x.owner||'Unassigned'} — Due ${x.due||'TBD'} — ${x.status}`):['None']),'','Watch Items:',...(watch.length?watch.map((x,i)=>`${i+1}. ${x}`):['None'])].join('\n');
}
function copyRetentionRisk(){const txt=retentionRiskText();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>showSaveBanner('📋 Retention risk copied'));}else{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();showSaveBanner('📋 Retention risk copied');}}
function printRetentionRisk(){const txt=retentionRiskText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const w=window.open('','_blank','width=900,height=1000');if(!w)return alert('Please allow pop-ups to print.');w.document.write(`<html><head><title>Retention & Workforce Risk</title><style>body{font-family:Arial;padding:32px}pre{white-space:pre-wrap;line-height:1.6;font-family:Arial;font-size:13px}
/* FINAL V1 POLISH */
#mgr-priority-brief-card,#mgr-task-pulse-card,#mgr-daily-action-card,#mgr-data-health-card,#mgr-exception-card{border-radius:8px!important;}
@media(max-width:1100px){
  .mgr-kpi-grid{grid-template-columns:repeat(3,minmax(140px,1fr))!important;}
}
@media(max-width:760px){
  .mgr-kpi-grid{grid-template-columns:repeat(2,minmax(130px,1fr))!important;}
  .card{padding:10px!important;}
  #fqa-safe-panel{right:6px!important;top:85px!important;width:250px!important;max-height:80vh!important;overflow:auto!important;}
}
@media(max-width:520px){
  .mgr-kpi-grid{grid-template-columns:1fr!important;}
  #fqa-safe-panel{width:225px!important;}
}
</style></head><body><h1>3B/3C Retention & Workforce Risk</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();}

function toggleMoreManagerTools(){
  const el=document.getElementById('fqa-more-tools'); if(!el)return;
  el.style.display=el.style.display==='grid'?'none':'grid';
}
function mgrStatusBadge(status){
  const map={critical:['CRITICAL','var(--red2)'],warning:['WATCH','var(--amber2)'],good:['GOOD','var(--green2)'],info:['INFO','var(--accent2)']};
  return map[status]||map.info;
}
function mgrExecutiveCNOData(){
  const dateKey=state.activeBoardDate || (state.dates||[])[0];
  const cov=mgrCoverage(dateKey), cs=mgrCoverageSummary(cov), calls=mgrCallinsForDate(dateKey);
  const aw=siAgencyWorkforce(), ot=siUkgovertime(), vac=mgrVacancySummary(), roles=mgrVacancyRoleData();
  const q=mgrQualityPulseData(), goals=state.unitGoals2026||{}, task=mgrTaskPulseData();
  const ex=mgrLoadExceptions().filter(x=>x.status!=='resolved');
  const recruit=mgrLoadRecruitPipeline(), orient=mgrLoadOrientationCapacity();
  const focus=[];
  if(cs.shortRN+cs.shortLPN+cs.shortCA)focus.push(`Staffing gaps today: RN ${cs.shortRN}, LPN ${cs.shortLPN}, CA ${cs.shortCA}.`);
  if(calls)focus.push(`${calls} active call-in${calls===1?'':'s'} requiring coverage review.`);
  if(vac.hasBudget&&vac.open>0)focus.push(`${vac.open} permanent FTE vacancy.`);
  if(aw.pct>=25)focus.push(`Agency mix elevated at ${aw.pct}%.`);
  if(ot.rows.length&&ot.total>0)focus.push(`${ot.total.toFixed(1)} UKG OT hours in latest imported pay period.`);
  if(q.month.painPct!==null&&q.month.painPct<Number(goals.painPct||95))focus.push(`Pain reassessment below goal at ${q.month.painPct}%.`);
  if(q.month.scanPct!==null&&q.month.scanPct<Number(goals.scanTarget||95))focus.push(`BCMA below goal at ${q.month.scanPct}%.`);
  if(task.overdue)focus.push(`${task.overdue} overdue manager task${task.overdue===1?'':'s'}.`);
  if(ex.length)focus.push(`${ex.length} unresolved manager exception${ex.length===1?'':'s'}.`);
  return {dateKey,cov,cs,calls,aw,ot,vac,roles,q,goals,task,ex,recruit,orient,focus};
}
function renderExecutiveCNODashboard(){
  const d=mgrExecutiveCNOData();
  const s=document.getElementById('mgr-exec-cno-summary'),w=document.getElementById('mgr-exec-cno-workforce'),q=document.getElementById('mgr-exec-cno-quality'),f=document.getElementById('mgr-exec-cno-focus');
  if(!s||!w||!q||!f)return;
  const gaps=d.cs.shortRN+d.cs.shortLPN+d.cs.shortCA;
  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(6,minmax(115px,1fr));gap:6px;">
    ${mgrTile('Staffing',gaps?`${gaps} gaps`:'At goal',`${d.cs.windowsAtGoal}/${d.cs.totalWindows} windows`,gaps?'mgr-status-bad':'mgr-status-good','board','👥')}
    ${mgrTile('Call-ins',d.calls,'Current selected date',d.calls?'mgr-status-bad':'mgr-status-good','board','📵')}
    ${mgrTile('Agency',`${d.aw.pct}%`,`${d.aw.agency.length}/${d.aw.all.length} workforce`,d.aw.pct>=25?'mgr-status-warn':'mgr-status-good','directory','🧳')}
    ${mgrTile('UKG OT',`${d.ot.rows.length?d.ot.total.toFixed(1):'0.0'}h`,d.ot.payPeriod||'Latest import',d.ot.total>0?'mgr-status-warn':'mgr-status-good','overtime','⏱')}
    ${mgrTile('Vacancy',d.vac.hasBudget?`${d.vac.open} FTE`:'—','Permanent open FTE',d.vac.open>0?'mgr-status-warn':'mgr-status-good','vacancy','📉')}
    ${mgrTile('Exceptions',d.ex.length,'Unresolved',d.ex.some(x=>x.severity==='critical')?'mgr-status-bad':d.ex.length?'mgr-status-warn':'mgr-status-good','home','📥')}
  </div>`;
  w.innerHTML=`<div style="overflow:auto;"><table class="data-table" style="width:100%;"><thead><tr><th>Role</th><th>Budget</th><th>Permanent</th><th>Agency</th><th>Vacant</th><th>Vacancy %</th></tr></thead><tbody>${d.roles.map(r=>`<tr><td style="font-weight:800;">${r.role}</td><td>${r.budget.toFixed(1)}</td><td>${r.permanentFilled.toFixed(1)}</td><td>${r.agencyFTE.toFixed(1)}</td><td>${r.vacant.toFixed(1)}</td><td style="font-weight:800;color:${r.pct>=15?'var(--red2)':r.pct>=8?'var(--amber2)':'var(--green2)'};">${r.pct===null?'—':r.pct.toFixed(1)+'%'}</td></tr>`).join('')}</tbody></table></div>`;
  const pain=d.q.month.painPct,bcma=d.q.month.scanPct;
  q.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    ${mgrTile('Pain Reassessment',pain===null?'No data':`${pain}%`,`Goal ≥${Number(d.goals.painPct||95)}%`,pain!==null&&pain<Number(d.goals.painPct||95)?'mgr-status-bad':pain===null?'':'mgr-status-good','qualityintel','💔')}
    ${mgrTile('BCMA',bcma===null?'No data':`${bcma}%`,`Goal ≥${Number(d.goals.scanTarget||95)}%`,bcma!==null&&bcma<Number(d.goals.scanTarget||95)?'mgr-status-bad':bcma===null?'':'mgr-status-good','qualityintel','💊')}
    ${mgrTile('Overdue Tasks',d.task.overdue,'Manager follow-up',d.task.overdue?'mgr-status-bad':'mgr-status-good','todo','⏰')}
    ${mgrTile('Pipeline',d.recruit.filter(x=>!['Declined'].includes(x.stage)).length,'Candidates/new hires','','home','👥')}
  </div>`;
  f.innerHTML=d.focus.length?d.focus.map(x=>`<div style="padding:7px 8px;border:1px solid rgba(245,158,11,.25);border-radius:6px;background:rgba(245,158,11,.06);margin-bottom:5px;font-size:9px;color:var(--amber2);">⚠️ ${x}</div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No major leadership focus items detected.</div>';
}
function openExecutiveCNODashboard(){const m=document.getElementById('mgr-exec-cno-modal');if(!m)return;m.style.display='flex';renderExecutiveCNODashboard();}
function closeExecutiveCNODashboard(){const m=document.getElementById('mgr-exec-cno-modal');if(m)m.style.display='none';}
function executiveCNOText(){
  const d=mgrExecutiveCNOData();
  return ['3B/3C Executive / CNO Dashboard',`Date: ${d.dateKey||new Date().toLocaleDateString()}`,'',
    `Staffing: ${d.cs.windowsAtGoal}/${d.cs.totalWindows} windows at goal; gaps RN ${d.cs.shortRN}, LPN ${d.cs.shortLPN}, CA ${d.cs.shortCA}`,
    `Call-ins: ${d.calls}`,`Agency mix: ${d.aw.pct}% (${d.aw.agency.length}/${d.aw.all.length})`,
    `UKG OT: ${d.ot.rows.length?d.ot.total.toFixed(1):'0.0'} hours${d.ot.payPeriod?' — '+d.ot.payPeriod:''}`,
    `Permanent vacancy: ${d.vac.hasBudget?d.vac.open+' FTE':'Budget not entered'}`,
    `Pain: ${d.q.month.painPct===null?'No data':d.q.month.painPct+'%'}`,`BCMA: ${d.q.month.scanPct===null?'No data':d.q.month.scanPct+'%'}`,
    `Overdue manager tasks: ${d.task.overdue}`,`Unresolved exceptions: ${d.ex.length}`,'','Leadership Focus:',...(d.focus.length?d.focus.map((x,i)=>`${i+1}. ${x}`):['None'])].join('\n');
}
function copyExecutiveCNO(){const t=executiveCNOText();navigator.clipboard?.writeText(t).then(()=>showSaveBanner('📋 Executive dashboard copied'));}
function printExecutiveCNO(){const txt=executiveCNOText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const w=window.open('','_blank','width=900,height=1000');if(!w)return;w.document.write(`<html><body style="font-family:Arial;padding:32px"><h1>3B/3C Executive / CNO Dashboard</h1><pre style="white-space:pre-wrap;font-family:Arial;line-height:1.6">${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();}

function mgrAlertsData(){
  const c=mgrCurrentExceptionCandidates();
  const roleAgency=['RN','LPN','CA'].flatMap(role=>mgrRoleStaff(role).filter(x=>x.agency).map(x=>({role,...x,days:mgrDaysUntil(x.end)})));
  roleAgency.filter(x=>x.days!==null&&x.days>=0&&x.days<=60).forEach(x=>c.push({id:'contract_'+x.name,type:'Agency',severity:x.days<=30?'critical':'warning',title:`${x.role} agency contract ending`,detail:`${x.name} · ${x.end} · ${x.days} days remaining`,panel:'directory'}));
  const orient=mgrLoadOrientationCapacity().assignments.filter(x=>x.status!=='Complete'&&!x.preceptor);
  orient.forEach(x=>c.push({id:'preceptor_'+x.id,type:'Orientation',severity:'warning',title:'Preceptor assignment needed',detail:`${x.name} (${x.role})`,panel:'orientation'}));
  return c;
}
function renderAlertsCenter(){
  const s=document.getElementById('mgr-alerts-summary'),l=document.getElementById('mgr-alerts-list');if(!s||!l)return;
  const a=mgrAlertsData(),critical=a.filter(x=>x.severity==='critical').length,warning=a.filter(x=>x.severity==='warning').length;
  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:6px;">${mgrTile('Critical',critical,'Immediate action',critical?'mgr-status-bad':'mgr-status-good','home','🔴')}${mgrTile('Watch',warning,'Needs review',warning?'mgr-status-warn':'mgr-status-good','home','🟡')}${mgrTile('Total Alerts',a.length,'Current conditions',a.length?'mgr-status-warn':'mgr-status-good','home','🚨')}${mgrTile('Open Exceptions',mgrLoadExceptions().filter(x=>x.status!=='resolved').length,'Tracked exceptions','','home','📥')}</div>`;
  l.innerHTML=a.length?`<div style="display:flex;flex-direction:column;gap:5px;">${a.sort((x,y)=>(x.severity==='critical'?0:1)-(y.severity==='critical'?0:1)).map(x=>{const b=mgrStatusBadge(x.severity);return `<div onclick="mgrPriorityOpen('${x.panel}')" style="cursor:pointer;display:grid;grid-template-columns:90px 1fr 90px;gap:8px;align-items:center;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--card2);"><div style="font-size:8px;font-weight:800;color:${b[1]};">${b[0]}</div><div><div style="font-size:10px;font-weight:800;color:var(--white);">${x.title}</div><div style="font-size:8px;color:var(--text3);">${x.detail}</div></div><div style="font-size:8px;color:var(--accent2);text-align:right;">OPEN →</div></div>`;}).join('')}</div>`:'<div class="risk-all-clear" style="padding:8px 10px;">✅ No active alerts.</div>';
}
function openAlertsCenter(){const m=document.getElementById('mgr-alerts-center-modal');if(!m)return;m.style.display='flex';renderAlertsCenter();}
function closeAlertsCenter(){const m=document.getElementById('mgr-alerts-center-modal');if(m)m.style.display='none';}

function mgrDataImportRows(){
  const rows=mgrDataHealthRows();
  const map={
    'Staffing Board':{action:'board',update:'Staffing Board / UKG Staffing import'},
    'UKG Overtime':{action:'overtime',update:'Staff → Overtime → paste UKG OT report'},
    'Quality KPI':{action:'qualityintel',update:'Quality → KPI / monthly quality data'},
    'Vacancy / FTE':{action:'vacancy',update:'Budget / Vacancy + Directory FTE'},
    'Agency Roster':{action:'directory',update:'Directory → Agency checkbox / contract dates'},
    'Certifications':{action:'education',update:'Education / Certifications'}
  };
  return rows.map(r=>({...r,...(map[r.label]||{})}));
}
function renderDataImportCenter(){
  const s=document.getElementById('mgr-data-import-summary'),l=document.getElementById('mgr-data-import-list');if(!s||!l)return;
  const rows=mgrDataImportRows(),good=rows.filter(x=>x.status==='good').length,warn=rows.filter(x=>x.status==='warn').length,bad=rows.filter(x=>x.status==='bad').length;
  s.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:6px;">${mgrTile('Healthy',good,'Sources ready',good?'mgr-status-good':'','home','🟢')}${mgrTile('Review',warn,'Needs attention',warn?'mgr-status-warn':'mgr-status-good','home','🟡')}${mgrTile('Missing',bad,'Critical gaps',bad?'mgr-status-bad':'mgr-status-good','home','🔴')}${mgrTile('Sources',rows.length,'Dashboard feeds','','home','🔄')}</div>`;
  l.innerHTML=`<div style="display:flex;flex-direction:column;gap:6px;">${rows.map(r=>{const b=mgrStatusBadge(r.status==='bad'?'critical':r.status==='warn'?'warning':'good');return `<div style="display:grid;grid-template-columns:120px 1fr 1.4fr 90px;gap:8px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:7px;background:var(--card2);"><div style="font-size:9px;font-weight:800;color:${b[1]};">${r.label}</div><div><div style="font-size:9px;color:var(--white);font-weight:800;">${r.value}</div><div style="font-size:8px;color:var(--text3);">${r.detail}</div></div><div style="font-size:8px;color:var(--text2);">${r.update||''}</div><button class="btn btn-ghost btn-sm" onclick="closeDataImportCenter();mgrPriorityOpen('${r.action||r.panel}')">Update →</button></div>`;}).join('')}</div>`;
}
function openDataImportCenter(){const m=document.getElementById('mgr-data-import-modal');if(!m)return;m.style.display='flex';renderDataImportCenter();}
function closeDataImportCenter(){const m=document.getElementById('mgr-data-import-modal');if(m)m.style.display='none';}
