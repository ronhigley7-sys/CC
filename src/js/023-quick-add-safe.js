
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
    <label style="display:flex;align-items:flex-start;gap:6px;padding:6px 7px;border:1px solid var(--border);border-radius:6px;background:var(--card2);font-size:11px;color:var(--text2);">
      <input type="checkbox" class="mgr-handoff-check" value="${encodeURIComponent(x.text)}" checked style="margin-top:2px;">
      <span>${x.text}</span>
    </label>`).join('') : '<div class="risk-all-clear" style="padding:8px 10px;">✅ Nothing critical to carry forward.</div>';

  const arr=mgrLoadHandoffs().slice().reverse().slice(0,5);
  history.innerHTML=arr.length ? arr.map(h=>`
    <div style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;">
      <div style="font-size:11px;font-weight:800;color:var(--white);">${new Date(h.savedAt).toLocaleString()}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px;">${h.items.length} carry-forward item${h.items.length===1?'':'s'}${h.note?' · note saved':''}</div>
    </div>`).join('') : '<div style="font-size:11px;color:var(--text3);">No saved handoffs yet.</div>';
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
      <div style="font-size:11px;font-weight:800;color:${i===0?'var(--red2)':'var(--white)'};">${i+1}. ${a.icon} ${a.title}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px;">${a.detail}</div>
    </div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No urgent actions.</div>';

  watch.innerHTML=d.watches.length?d.watches.map(x=>`
    <div style="padding:6px 7px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;font-size:11px;color:var(--text2);">⚠️ ${x}</div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No watch items.</div>';

  const arr=mgrLoadHuddleBriefs().slice().reverse().slice(0,5);
  history.innerHTML=arr.length?arr.map(h=>`
    <div style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;">
      <div style="font-size:11px;font-weight:800;color:var(--white);">${new Date(h.savedAt).toLocaleString()}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px;">${h.actions.length} action${h.actions.length===1?'':'s'} · ${h.watches.length} watch item${h.watches.length===1?'':'s'}</div>
    </div>`).join(''):'<div style="font-size:11px;color:var(--text3);">No saved huddle briefs yet.</div>';
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
    '3B/3C Morning Huddle Brief',
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
  w.document.write(`<html><head><title>3B/3C Morning Huddle Brief</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Morning Huddle Brief</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
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

  w.innerHTML=d.wins.length?d.wins.map(x=>`<div style="padding:6px 7px;border:1px solid rgba(37,168,104,.25);border-radius:6px;background:rgba(37,168,104,.06);margin-bottom:5px;font-size:11px;color:var(--green2);">✅ ${x}</div>`).join(''):'<div style="font-size:11px;color:var(--text3);">No wins automatically identified yet.</div>';
  r.innerHTML=d.risks.length?d.risks.map(x=>`<div style="padding:6px 7px;border:1px solid rgba(245,158,11,.25);border-radius:6px;background:rgba(245,158,11,.06);margin-bottom:5px;font-size:11px;color:var(--amber2);">⚠️ ${x}</div>`).join(''):'<div class="risk-all-clear" style="padding:8px 10px;">✅ No major risks identified.</div>';

  const arr=mgrLoadWeeklyReviews().slice().reverse().slice(0,5);
  h.innerHTML=arr.length?arr.map(x=>`<div style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card2);margin-bottom:5px;"><div style="font-size:11px;font-weight:800;color:var(--white);">${new Date(x.savedAt).toLocaleString()}</div><div style="font-size:11px;color:var(--text3);margin-top:2px;">${x.wins.length} wins · ${x.risks.length} risks${x.note?' · leadership note':''}</div></div>`).join(''):'<div style="font-size:11px;color:var(--text3);">No saved weekly reviews yet.</div>';
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
    '3B/3C Weekly Service Line Update',
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
  w.document.write(`<html><head><title>3B/3C Weekly Service Line Update</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}pre{font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7;font-size:13px;border:1px solid #ccc;padding:18px;border-radius:8px}</style></head><body><h1>3B/3C Weekly Service Line Update</h1><pre>${txt}</pre><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}
