// Combined RN/CA admission rotation and 3C CA assignment patch
(function () {
  const RN_DAY = ['0700-1500', '1500-1900'];
  const RN_NIGHT = ['1900-0700'];
  const CA_SHIFTS = [
    { key: '0630-1430', label: 'Day 0630–1430' },
    { key: '1430-1830', label: 'Eve 1 1430–1830' },
    { key: '1830-2230', label: 'Eve 2 1830–2230' },
    { key: '2230-0630', label: 'Night 2230–0630' }
  ];
  const CA_ROTATION_KEY = '_ccCaAdmissionOrderV1';

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function uniqNames(rows) {
    const seen = new Set();
    return (rows || []).map(x => x && x.name ? x.name : x).filter(Boolean).filter(name => {
      if (seen.has(name)) return false;
      seen.add(name); return true;
    });
  }
  function previousDate(dateKey) {
    const d = new Date(dateKey + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
  }
  function placementRows(dateKey, shiftKeys) {
    const placements = (state.placements || {})[dateKey] || {};
    return shiftKeys.flatMap(key => placements[key] || []);
  }
  function isAgency(name) { return !!(((state.agencyDates || {})[name] || {}).isAgency); }
  function isOrientee(name) { return !!((state.empOrientation || {})[name]); }
  function sortRotation(names, history, previousFirst, chargeCheck) {
    return [...names].sort((a, b) => {
      if (names.length > 1) {
        const ap = a === previousFirst ? 1 : 0, bp = b === previousFirst ? 1 : 0;
        if (ap !== bp) return ap - bp;
      }
      if (chargeCheck) {
        const ac = chargeCheck(a) ? 1 : 0, bc = chargeCheck(b) ? 1 : 0;
        if (ac !== bc) return ac - bc;
      }
      const ah = history[a] || { count: 0, last: '' }, bh = history[b] || { count: 0, last: '' };
      if (ah.count !== bh.count) return ah.count - bh.count;
      if (ah.last !== bh.last) return (ah.last || '').localeCompare(bh.last || '');
      return a.localeCompare(b);
    });
  }

  function rnShiftKeys(shiftName) { return shiftName === 'DAY' ? RN_DAY : RN_NIGHT; }
  function rnAssigned3C(dateKey, shiftName, name) {
    return rnShiftKeys(shiftName).some(shiftKey => {
      const key = dateKey + '|' + shiftKey;
      if ((state.charge3C || {})[key] === name) return true;
      const assignment = (state.staff3C || {})[key] || {};
      return Object.keys(assignment).some(role => assignment[role] === name);
    });
  }
  function eligibleRNs(dateKey, shiftName) {
    return uniqNames(placementRows(dateKey, rnShiftKeys(shiftName)).filter(x => x && x.role === 'RN')).filter(name => !rnAssigned3C(dateKey, shiftName, name));
  }
  function rnHistory(shiftName) {
    const history = {}, saved = state.admissionOrder || {};
    Object.keys(saved).sort().forEach(dateKey => {
      const order = saved[dateKey] && saved[dateKey][shiftName], first = Array.isArray(order) ? order[0] : '';
      if (!first) return;
      if (!history[first]) history[first] = { count: 0, last: '' };
      history[first].count += 1; if (dateKey > history[first].last) history[first].last = dateKey;
    });
    return history;
  }
  function rnIsCharge(dateKey, shiftName, name) {
    return rnShiftKeys(shiftName).some(shiftKey => (state.chargeNurses || {})[dateKey + '|' + shiftKey] === name);
  }
  function buildRNOrder(dateKey, shiftName) {
    state.admissionOrder = state.admissionOrder || {}; state.admissionOrder[dateKey] = state.admissionOrder[dateKey] || {};
    const all = eligibleRNs(dateKey, shiftName), saved = state.admissionOrder[dateKey][shiftName];
    if (Array.isArray(saved) && saved.length === all.length && saved.every(n => all.includes(n)) && all.every(n => saved.includes(n))) return saved;
    const history = rnHistory(shiftName), prior = ((state.admissionOrder[previousDate(dateKey)] || {})[shiftName]) || [], priorFirst = prior[0] || '';
    const agency = all.filter(isAgency), regular = all.filter(n => !isAgency(n)), chargeCheck = name => rnIsCharge(dateKey, shiftName, name);
    let order = [];
    if (agency.length) {
      const independent = agency.filter(n => !isOrientee(n)), leadPool = independent.length ? independent : agency;
      const lead = sortRotation(leadPool, history, priorFirst, chargeCheck)[0];
      if (lead) order.push(lead);
      order.push(...sortRotation(agency.filter(n => n !== lead && !isOrientee(n)), history, '', chargeCheck));
      order.push(...sortRotation(agency.filter(n => n !== lead && isOrientee(n)), history, '', chargeCheck));
    }
    order.push(...sortRotation(regular.filter(n => !isOrientee(n)), history, agency.length ? '' : priorFirst, chargeCheck));
    order.push(...sortRotation(regular.filter(isOrientee), history, '', chargeCheck));
    order = uniqNames(order); all.forEach(name => { if (!order.includes(name)) order.push(name); });
    state.admissionOrder[dateKey][shiftName] = order;
    state.firstAdmission = state.firstAdmission || {}; state.firstAdmission[dateKey] = state.firstAdmission[dateKey] || {}; state.firstAdmission[dateKey][shiftName] = order[0] || '';
    try { if (typeof persistSave === 'function') persistSave(); } catch (e) {}
    return order;
  }

  function loadCARotation() { try { return JSON.parse(localStorage.getItem(CA_ROTATION_KEY) || '{}'); } catch (e) { return {}; } }
  function saveCARotation(value) { try { localStorage.setItem(CA_ROTATION_KEY, JSON.stringify(value)); } catch (e) {} }
  function caAssigned3C(dateKey, shiftKey, name) { return (((state.staff3C || {})[dateKey + '|' + shiftKey] || {}).ca) === name; }
  function eligibleCAs(dateKey, shiftKey) {
    return uniqNames(placementRows(dateKey, [shiftKey]).filter(x => x && x.role === 'CA')).filter(name => !caAssigned3C(dateKey, shiftKey, name));
  }
  function caHistory(shiftKey, store) {
    const history = {};
    Object.keys(store).sort().forEach(dateKey => {
      const order = store[dateKey] && store[dateKey][shiftKey], first = Array.isArray(order) ? order[0] : '';
      if (!first) return;
      if (!history[first]) history[first] = { count: 0, last: '' };
      history[first].count += 1; if (dateKey > history[first].last) history[first].last = dateKey;
    });
    return history;
  }
  function buildCAOrder(dateKey, shiftKey) {
    const store = loadCARotation(); store[dateKey] = store[dateKey] || {};
    const all = eligibleCAs(dateKey, shiftKey), saved = store[dateKey][shiftKey];
    if (Array.isArray(saved) && saved.length === all.length && saved.every(n => all.includes(n)) && all.every(n => saved.includes(n))) return saved;
    const history = caHistory(shiftKey, store), prior = ((store[previousDate(dateKey)] || {})[shiftKey]) || [], priorFirst = prior[0] || '';
    const agency = all.filter(isAgency), regular = all.filter(n => !isAgency(n)); let order = [];
    if (agency.length) {
      const independent = agency.filter(n => !isOrientee(n)), leadPool = independent.length ? independent : agency;
      const lead = sortRotation(leadPool, history, priorFirst)[0];
      if (lead) order.push(lead);
      order.push(...sortRotation(agency.filter(n => n !== lead && !isOrientee(n)), history, ''));
      order.push(...sortRotation(agency.filter(n => n !== lead && isOrientee(n)), history, ''));
    }
    order.push(...sortRotation(regular.filter(n => !isOrientee(n)), history, agency.length ? '' : priorFirst));
    order.push(...sortRotation(regular.filter(isOrientee), history, ''));
    order = uniqNames(order); all.forEach(name => { if (!order.includes(name)) order.push(name); });
    store[dateKey][shiftKey] = order; saveCARotation(store); return order;
  }

  function orderList(order, emptyText) {
    if (!order.length) return '<div style="padding:4px;color:#6b7280;font-style:italic;font-size:8.5pt;">' + emptyText + '</div>';
    return order.map((name, i) => {
      const suffix = i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th';
      const badge = isAgency(name) ? ' <span style="font-size:6.5pt;font-weight:800;color:#7c2d12;background:#ffedd5;border:1px solid #fdba74;padding:0 3px;border-radius:2px;">AGENCY</span>' : '';
      return '<div style="padding:2px 4px;border-bottom:1px solid #dbe5ef;font-size:8.5pt;line-height:1.1;' + (i === 0 ? 'font-weight:800;color:#0f4c81;background:#e0f2fe;' : '') + '"><b style="display:inline-block;width:24px;">' + (i + 1) + suffix + '</b>' + esc(name) + badge + '</div>';
    }).join('');
  }
  function rnPrintBlock(dateKey) {
    const day = buildRNOrder(dateKey, 'DAY'), night = buildRNOrder(dateKey, 'NIGHT');
    return '<div class="first-admission-print" style="margin:7px 0 0;padding:6px 8px;border:1.5px solid #0f4c81;border-radius:4px;background:#f8fbff;page-break-inside:avoid;"><div style="font-size:10pt;font-weight:800;text-transform:uppercase;color:#0f4c81;margin-bottom:4px;">RN Admission Order</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr><th style="width:50%;border:1px solid #9fbad0;padding:3px;background:#eef6ff;font-size:9pt;">☀ Day Shift</th><th style="width:50%;border:1px solid #9fbad0;padding:3px;background:#eef6ff;font-size:9pt;">🌙 Night Shift</th></tr><tr><td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">' + orderList(day, 'No eligible 3B RN assigned') + '</td><td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">' + orderList(night, 'No eligible 3B RN assigned') + '</td></tr></table></div>';
  }
  function caPrintBlock(dateKey) {
    const orders = CA_SHIFTS.map(shift => buildCAOrder(dateKey, shift.key));
    return '<div class="ca-admission-print" style="margin:6px 0 0;padding:6px 8px;border:1.5px solid #0e7490;border-radius:4px;background:#f5fcfd;page-break-inside:avoid;"><div style="font-size:10pt;font-weight:800;text-transform:uppercase;color:#0e7490;margin-bottom:4px;">CA Admission Order</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' + CA_SHIFTS.map(shift => '<th style="border:1px solid #8cc7d1;padding:3px 2px;background:#ecfeff;font-size:8pt;">' + shift.label + '</th>').join('') + '</tr><tr>' + orders.map(order => '<td style="border:1px solid #8cc7d1;vertical-align:top;padding:0;">' + orderList(order, 'No eligible CA') + '</td>').join('') + '</tr></table></div>';
  }
  function printCss() {
    return '<style id="cc-one-page-print-fix">@page{size:letter portrait!important;margin:.22in .28in!important}@media print{html,body{margin:0!important;padding:0!important}.ps-page{padding:0!important;margin:0 auto!important;max-width:none!important;width:100%!important;min-height:0!important;height:auto!important}.ps-title{font-size:18pt!important;margin:0 0 2px!important;line-height:1.05!important}.ps-date{font-size:10pt!important;margin:0 0 6px!important;line-height:1.05!important}.ps-section-label{font-size:10pt!important;margin:5px 0 2px!important;padding-bottom:2px!important}.ps-table{margin-bottom:2px!important}.ps-table th{font-size:9pt!important;padding:3px 4px!important}.ps-table td{font-size:9.3pt!important;padding:3px 4px!important}.ps-footer{font-size:7.5pt!important;margin-top:5px!important;padding-top:3px!important}.first-admission-print,.ca-admission-print{margin-top:6px!important}}</style>';
  }
  function fitPrintScript() {
    return '<script id="cc-fit-one-page">(function(){function fit(){try{var p=document.querySelector(".ps-page")||document.body;document.body.style.zoom="1";var h=p.getBoundingClientRect().height,max=(11-.50)*96;if(h>max)document.body.style.zoom=String(Math.max(.78,Math.min(1,max/h)));}catch(e){}}window.addEventListener("load",function(){fit();setTimeout(function(){fit();window.print();},120);});})();<\/script>';
  }
  function injectBottom(html, block) {
    if (/<div class=["']ps-footer["']/.test(html)) return { html: html.replace(/(<div class=["']ps-footer["'][^>]*>)/, block + '$1'), done: true };
    if (/<\/body>/i.test(html)) return { html: html.replace(/<\/body>/i, block + '</body>'), done: true };
    return { html, done: false };
  }
  function wrapPrintFunction(fnName) {
    const original = window[fnName];
    if (typeof original !== 'function' || original.__ccRotationV2) return;
    const wrapped = function () {
      const dateKey = state.activeBoardDate || '', block = dateKey ? rnPrintBlock(dateKey) + caPrintBlock(dateKey) : '', realOpen = window.open;
      window.open = function () {
        const child = realOpen.apply(window, arguments); if (!child || !block) return child;
        try {
          const realWrite = child.document.write.bind(child.document); let injected = false;
          child.document.write = function (html) {
            if (typeof html === 'string') {
              if (!injected && !html.includes('ca-admission-print')) { const placed = injectBottom(html, block); html = placed.html; injected = placed.done; }
              if (fnName === 'printNursingServices') {
                html = html.replace('</head>', printCss() + '</head>');
                html = html.replace(/<script>window\.onload=function\(\)\{window\.print\(\);\}<\/script>/, fitPrintScript());
              }
            }
            return realWrite(html);
          };
        } catch (e) { console.warn('Admission rotation print patch:', e); }
        return child;
      };
      let result;
      try { result = original.apply(this, arguments); } catch (e) { window.open = realOpen; throw e; }
      if (result && typeof result.then === 'function') return result.finally(() => { window.open = realOpen; });
      window.open = realOpen; return result;
    };
    wrapped.__ccRotationV2 = true; window[fnName] = wrapped;
    try { eval(fnName + ' = window[fnName]'); } catch (e) {}
  }

  function scheduledCAs(dateKey, shiftKey) { return uniqNames(placementRows(dateKey, [shiftKey]).filter(x => x && x.role === 'CA')); }
  function save3CCA(shiftKey, name) {
    const dateKey = state.activeChargeDate || state.activeBoardDate; if (!dateKey) return;
    state.staff3C = state.staff3C || {}; const key = dateKey + '|' + shiftKey; state.staff3C[key] = state.staff3C[key] || {};
    if (name) state.staff3C[key].ca = name; else delete state.staff3C[key].ca;
    try { if (typeof persistSave === 'function') persistSave(); } catch (e) {}
    render3CCA();
  }
  window.save3CCA = save3CCA;
  function render3CCA() {
    const chargeHost = document.getElementById('charge-assignments'); if (!chargeHost || typeof state === 'undefined') return;
    let card = document.getElementById('cc-ca-3c-assign');
    if (!card) { card = document.createElement('div'); card.id = 'cc-ca-3c-assign'; card.className = 'card'; card.style.marginTop = '12px'; chargeHost.parentNode.insertBefore(card, chargeHost.nextSibling); }
    const dateKey = state.activeChargeDate || state.activeBoardDate || '';
    card.innerHTML = '<div class="card-header"><div><div class="card-title">🩺 3C Clinical Assistant Assignment</div><div style="font-size:11px;color:var(--text2);margin-top:2px;">Assign the CA covering 3C for each CA shift. The assigned 3C CA is automatically removed from that shift’s CA admission rotation.</div></div></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">' + CA_SHIFTS.map(shift => {
      const key = dateKey + '|' + shift.key, selected = (((state.staff3C || {})[key] || {}).ca) || '', options = scheduledCAs(dateKey, shift.key);
      if (selected && !options.includes(selected)) options.push(selected);
      return '<div><div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:4px;">' + shift.label + '</div><select onchange="save3CCA(\'' + shift.key + '\',this.value)" style="width:100%;background:var(--slate);border:1px solid var(--border);border-radius:5px;color:var(--white);padding:7px;font-size:11px;"><option value="">— Not assigned —</option>' + options.map(name => '<option value="' + esc(name) + '" ' + (name === selected ? 'selected' : '') + '>' + esc(name) + '</option>').join('') + '</select></div>';
    }).join('') + '</div>';
  }
  function hookChargeRender() {
    const original = window.renderChargeAssignments;
    if (typeof original === 'function' && !original.__ccCA3C) {
      const wrapped = function () { const result = original.apply(this, arguments); setTimeout(render3CCA, 0); return result; };
      wrapped.__ccCA3C = true; window.renderChargeAssignments = wrapped;
      try { eval('renderChargeAssignments = window.renderChargeAssignments'); } catch (e) {}
    }
    render3CCA();
  }
  function install() {
    if (typeof state === 'undefined') return;
    wrapPrintFunction('printNursingServices'); wrapPrintFunction('printStaffingSheet'); hookChargeRender();
  }
  let tries = 0;
  const timer = setInterval(function () { install(); tries += 1; if (tries > 40) clearInterval(timer); }, 250);
})();