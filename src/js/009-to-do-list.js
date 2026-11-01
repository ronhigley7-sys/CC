
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
        <span style="font-size:11px;color:var(--text3);">${doneCount}/${totalCount} done</span>
        ${freqWeight>0?`<span style="font-size:11px;background:rgba(255,255,255,0.06);border-radius:4px;padding:1px 6px;color:var(--text3);">⚖ ${freqWeight} pts pending</span>`:''}
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
        ${item.category?`<span style="font-size:11px;background:rgba(255,255,255,0.07);border-radius:3px;padding:1px 5px;color:var(--text3);">${item.category}</span>`:''}
        <span style="font-size:11px;color:${starCol};" title="Priority: ${w}/5">${stars}</span>
        <span style="font-size:11px;color:var(--text3);">Due ${item.dueDate ? new Date(item.dueDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : dueLabel}</span>
        ${(!done && item.dueDate && item.dueDate < todoDateKey())?`<span style="font-size:11px;color:var(--red2);font-weight:800;">OVERDUE</span>`:''}
        ${done?`<span style="font-size:11px;color:var(--green2);">✓ Completed</span>`:''}
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
          style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:2px 8px 2px 4px;cursor:pointer;font-size:11px;color:var(--white);white-space:nowrap;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          <span style="width:18px;height:18px;border-radius:50%;background:${jobCol};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</span>
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
              <div style="font-size:11px;font-weight:700;color:${cell.accent};line-height:1.2;">${cell.label}</div>
              <div style="font-size:11px;color:var(--text3);">${cellStaff.length} staff</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;flex:1;align-content:flex-start;" onclick="event.stopPropagation()">
            ${chips || '<div style="font-size:11px;color:var(--text3);font-style:italic;padding:4px 0;">Click to assign</div>'}
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
          style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:12px;padding:2px 8px 2px 4px;cursor:pointer;font-size:11px;color:var(--text2);"
          onmouseover="this.style.borderColor=\'var(--accent2)\'" onmouseout="this.style.borderColor=\'var(--border)\'">
          <span style="width:18px;height:18px;border-radius:50%;background:${jobCol};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</span>
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
    '<div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Development Strategies</div>' +
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
    const scoreHtml = `<div style="font-size:11px;color:var(--text3);margin-top:2px;display:flex;flex-wrap:wrap;gap:4px;">
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
      <span style="width:22px;height:22px;border-radius:50%;background:${jobCol};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--navy);flex-shrink:0;margin-top:1px;">${initials}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:600;color:${inCell?'var(--white)':'var(--text2)'};">
          ${s.name.split(',')[0]}, ${s.name.split(',')[1]||''}${s.job==='LPN'?' <span style="font-size:11px;color:var(--purple2);">LPN</span>':''}
          ${inCell?'<span style="font-size:11px;color:var(--green2);margin-left:4px;">✓</span>':''}
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
          <div style="font-size:11px;color:var(--text3);">${t.label}s — ${yr}</div>
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
        const fromAbs = e.fromAbsence ? ' <span style="font-size:11px;color:var(--text3);">(from absence log)</span>' : '';
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:6px 10px;white-space:nowrap;">
            <span style="background:${t.bg};border:1px solid ${t.border};border-radius:4px;padding:2px 7px;font-size:11px;color:${t.color};">${t.icon} ${t.label}</span>
          </td>
          <td style="padding:6px 10px;font-size:11px;color:var(--text2);">${dateLabel}</td>
          <td style="padding:6px 10px;font-size:11px;color:var(--text3);">${e.note||'—'}${fromAbs}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap;">
            ${type === 'writeups' && !e.fromAbsence ? `<button onclick="toggleWriteupTalked('${s.name.replace(/'/g,"\\'")}',${e.ts})"
              style="background:${e.talked?'rgba(22,163,74,0.15)':'rgba(245,158,11,0.15)'};border:1px solid ${e.talked?'var(--green2)':'var(--amber2)'};color:${e.talked?'var(--green2)':'var(--amber2)'};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:8px;"
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
      return `<span style="background:${t.bg};border:1px solid ${t.border};border-radius:10px;padding:1px 8px;font-size:11px;color:${t.color};">${t.icon} ${count} ${t.label}${count>1?'s':''}</span>`;
    }).filter(Boolean).join('');

    return `<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.04);border-bottom:1px solid var(--border);">
        <div style="width:32px;height:32px;border-radius:50%;background:${jobCol};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--navy);flex-shrink:0;">${initials}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:var(--white);">${s.name}</div>
          <div style="font-size:11px;color:${jobCol};">${s.job}</div>
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
            <span style="font-size:11px;color:${rCol};font-weight:700;">${iv.role}</span>
            <span style="font-size:11px;color:var(--text3);">${dateStr}</span>
          </div>
        </div>
        ${pct !== null ? `<span style="font-size:11px;font-weight:700;color:${rec.color};">${pct}%</span>` : ''}
      </div>
      <div style="margin-top:6px;">
        <span style="font-size:11px;background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:1px 7px;color:${cfg.color};">${iv.status}</span>
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
            <div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.4;">${item.prompt}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;">
            <div style="display:flex;gap:1px;">${stars}</div>
            <div data-ivscorelabel="${id}-${item.key}" style="font-size:11px;color:${score>=4?'var(--green2)':score>=3?'var(--amber2)':score>0?'var(--red2)':'var(--text3)'};">${scoreLabel}</div>
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
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px;font-weight:600;">Section notes:</div>
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
          <button onclick="openInterviewModal('${id}')" style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:4px;color:var(--text2);cursor:pointer;">✎ Edit</button>
          <button onclick="deleteInterview('${id}')" style="font-size:11px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:var(--red2);cursor:pointer;">Delete</button>
        </div>
      </div>
    </div>

    <!-- Score summary -->
    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;text-align:center;">
        <div id="iv-score-total-${id}" style="font-size:22px;font-weight:700;color:var(--white);">${tot !== null ? tot + ' / ' + ivScoreMax(iv) : '— / ' + ivScoreMax(iv)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">Total Score</div>
      </div>
      <div style="flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;text-align:center;">
        <div id="iv-pct-${id}" style="font-size:22px;font-weight:700;color:${pct!==null?rec.color:'var(--text3)'};">${pct !== null ? pct + '%' : '—'}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">Score %</div>
      </div>
      <div style="flex:2;min-width:160px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div id="iv-rec-${id}" style="font-size:16px;font-weight:700;color:${rec.color};">${rec.label}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">Recommendation</div>
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
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Energy & Presence</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${['Confident','Nervous','Engaged','Reserved','Professional','Enthusiastic'].map(t=>{
              const sel=(iv.impressions||{}).energy===t;
              return `<button onclick="saveIvImpression('${id}','energy','${t}')" style="font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid;cursor:pointer;${sel?'background:rgba(46,125,209,0.2);border-color:var(--accent2);color:var(--accent2);':'background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:var(--text3);'}">${t}</button>`;
            }).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Culture Fit</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${['Strong fit','Good fit','Uncertain','Concerns'].map(t=>{
              const sel=(iv.impressions||{}).culture===t;
              const col=t==='Strong fit'?'var(--green2)':t==='Good fit'?'var(--accent2)':t==='Uncertain'?'var(--amber2)':'var(--red2)';
              return `<button onclick="saveIvImpression('${id}','culture','${t}')" style="font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid;cursor:pointer;${sel?`background:rgba(0,0,0,0.2);border-color:${col};color:${col};`:'background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:var(--text3);'}">${t}</button>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Red Flags (check all that apply)</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${['Attendance concerns','Vague answers','Job-hopping','Negative about past employers','Unrealistic expectations','Disengaged','Overqualified'].map(flag=>{
            const checked=((iv.impressions||{}).redFlags||[]).includes(flag);
            return `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid;${checked?'background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.4);color:var(--red2);':'background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:var(--text3);'}">
              <input type="checkbox" ${checked?'checked':''} onchange="saveIvRedFlag('${id}','${flag}',this.checked)" style="accent-color:var(--red2);"> ${flag}
            </label>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Rubric -->
    <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Interview Rubric — score each area 1-5</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:14px;">1 = Poor &nbsp;·&nbsp; 2 = Below Average &nbsp;·&nbsp; 3 = Average &nbsp;·&nbsp; 4 = Good &nbsp;·&nbsp; 5 = Excellent</div>
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