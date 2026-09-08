
// If this is a staff variance link, hide everything until the variance
// overlay itself is ready — prevents any flash of the unit dashboard.
if (new URLSearchParams(location.search).get('vf')) {
  document.documentElement.style.visibility = 'hidden';
  setTimeout(function(){ document.documentElement.style.visibility = 'visible'; }, 8000);
  window.addEventListener('error', function(ev) {
    document.documentElement.style.visibility = 'visible';
    if (document.getElementById('staff-variance-overlay') || document.getElementById('vf-fatal-error')) return;
    var div = document.createElement('div');
    div.id = 'vf-fatal-error';
    div.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#f0f4f8;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Segoe UI,Arial,sans-serif;';
    div.innerHTML = '<div style="background:#fff;border-radius:12px;padding:24px;max-width:460px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1);">' +
      '<div style="font-size:32px;margin-bottom:10px;">⚠️</div>' +
      '<div style="font-size:14px;color:#333;">This page hit an error loading your report: ' +
      (ev && ev.message ? String(ev.message).replace(/[<>&]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];}) : 'unknown error') +
      '<br><br>Please screenshot this and send it to your manager.</div></div>';
    document.body.appendChild(div);
  });
}

// ════════════════════════════════════════════════════════════════
// RN ADMISSION ORDER — staffing printouts
// Updated 2026-09-08
// • Full RN admission order for Day and Night.
// • Agency RNs remain first in the logic.
// • Any RN assigned to 3C (including 3C charge) is excluded.
// • Admission order prints at the BOTTOM of the staffing sheet.
// • Print sizing stays readable and only shrinks if truly necessary.
// ════════════════════════════════════════════════════════════════
(function () {
  const INSTALLED_FLAG = '__ccAdmissionOrderInstalled';

  function uniqNames(arr) {
    const seen = new Set();
    return (arr || []).map(x => x && x.name).filter(Boolean).filter(n => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  }

  function dateMinusOne(dateKey) {
    const d = new Date(dateKey + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function shiftKeysFor(shiftName) {
    return shiftName === 'DAY' ? ['0700-1500', '1500-1900'] : ['1900-0700'];
  }

  function assignedTo3C(dateKey, shiftName, name) {
    if (typeof state === 'undefined' || !name) return false;
    const staff3C = state.staff3C || {};
    const charge3C = state.charge3C || {};

    return shiftKeysFor(shiftName).some(sk => {
      const key = dateKey + '|' + sk;
      if (charge3C[key] === name) return true;
      const triad = staff3C[key] || {};
      return Object.keys(triad).some(roleKey => triad[roleKey] === name);
    });
  }

  function eligibleRNs(dateKey, shiftName) {
    if (typeof state === 'undefined') return [];
    const p = (state.placements || {})[dateKey] || {};
    const rows = shiftName === 'DAY'
      ? [...(p['0700-1500'] || []), ...(p['1500-1900'] || [])]
      : [...(p['1900-0700'] || [])];
    const allRNs = uniqNames(rows.filter(x => x && x.role === 'RN'));
    return allRNs.filter(name => !assignedTo3C(dateKey, shiftName, name));
  }

  function isAgency(name) {
    if (typeof state === 'undefined') return false;
    return ((state.agencyDates || {})[name] || {}).isAgency === true;
  }

  function isOrientee(name) {
    return !!((typeof state !== 'undefined' && state.empOrientation) || {})[name];
  }

  function isCharge(dateKey, shiftName, name) {
    if (typeof state === 'undefined') return false;
    return shiftKeysFor(shiftName).some(sk =>
      (state.chargeNurses || {})[dateKey + '|' + sk] === name
    );
  }

  function firstHistory(shiftName) {
    const h = (typeof state !== 'undefined' && state.admissionOrder) ? state.admissionOrder : {};
    const out = {};
    Object.keys(h).sort().forEach(d => {
      const order = h[d] && h[d][shiftName];
      const n = Array.isArray(order) ? order[0] : '';
      if (!n) return;
      if (!out[n]) out[n] = { count: 0, last: '' };
      out[n].count += 1;
      if (d > out[n].last) out[n].last = d;
    });
    return out;
  }

  function rotateGroup(names, dateKey, shiftName, avoidYesterdayFirst) {
    if (!names.length) return [];
    const hist = firstHistory(shiftName);
    const yesterday = dateMinusOne(dateKey);
    const prevOrder = (state.admissionOrder || {})[yesterday] && (state.admissionOrder || {})[yesterday][shiftName];
    const prevFirst = Array.isArray(prevOrder) ? prevOrder[0] : '';

    return [...names].sort((a, b) => {
      if (avoidYesterdayFirst && names.length > 1) {
        const ap = a === prevFirst ? 1 : 0;
        const bp = b === prevFirst ? 1 : 0;
        if (ap !== bp) return ap - bp;
      }
      const ac = isCharge(dateKey, shiftName, a) ? 1 : 0;
      const bc = isCharge(dateKey, shiftName, b) ? 1 : 0;
      if (ac !== bc) return ac - bc;
      const ah = hist[a] || { count: 0, last: '' };
      const bh = hist[b] || { count: 0, last: '' };
      if (ah.count !== bh.count) return ah.count - bh.count;
      if (ah.last !== bh.last) return (ah.last || '').localeCompare(bh.last || '');
      return a.localeCompare(b);
    });
  }

  function buildAdmissionOrder(dateKey, shiftName) {
    if (typeof state === 'undefined') return [];
    state.admissionOrder = state.admissionOrder || {};
    state.admissionOrder[dateKey] = state.admissionOrder[dateKey] || {};

    const all = eligibleRNs(dateKey, shiftName);
    if (!all.length) {
      state.admissionOrder[dateKey][shiftName] = [];
      return [];
    }

    const saved = state.admissionOrder[dateKey][shiftName];
    if (Array.isArray(saved) && saved.length === all.length &&
        saved.every(n => all.includes(n)) && all.every(n => saved.includes(n))) {
      return saved;
    }

    const agency = all.filter(isAgency);
    const staff = all.filter(n => !isAgency(n));
    const agencyIndependent = agency.filter(n => !isOrientee(n));
    const staffIndependent = staff.filter(n => !isOrientee(n));
    const staffOrientee = staff.filter(isOrientee);

    let order = [];
    if (agency.length) {
      const agPool = agencyIndependent.length ? agencyIndependent : agency;
      const agLeadOrder = rotateGroup(agPool, dateKey, shiftName, true);
      const leader = agLeadOrder[0];
      order.push(leader);
      const remainingAgency = agency.filter(n => n !== leader);
      order.push(...rotateGroup(remainingAgency.filter(n => !isOrientee(n)), dateKey, shiftName, false));
      order.push(...rotateGroup(remainingAgency.filter(isOrientee), dateKey, shiftName, false));
    }

    order.push(...rotateGroup(staffIndependent, dateKey, shiftName, agency.length === 0));
    order.push(...rotateGroup(staffOrientee, dateKey, shiftName, false));

    order = uniqNames(order.map(name => ({ name })));
    all.forEach(n => { if (!order.includes(n)) order.push(n); });

    state.admissionOrder[dateKey][shiftName] = order;
    state.firstAdmission = state.firstAdmission || {};
    state.firstAdmission[dateKey] = state.firstAdmission[dateKey] || {};
    state.firstAdmission[dateKey][shiftName] = order[0] || '';

    try {
      if (typeof persistSave === 'function') persistSave();
      else localStorage.setItem('_3bTracker', JSON.stringify(state));
    } catch (e) { console.warn('Admission Order save:', e); }

    return order;
  }

  function orderCell(order) {
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    if (!order.length) return '<div style="padding:5px;color:#6b7280;font-style:italic;font-size:9pt;">No eligible 3B RN assigned</div>';

    return order.map((name, i) => {
      const badge = isAgency(name)
        ? ' <span style="font-size:7pt;font-weight:800;color:#7c2d12;background:#ffedd5;border:1px solid #fdba74;padding:0 3px;border-radius:2px;">AGENCY</span>'
        : '';
      const firstStyle = i === 0 ? 'font-weight:800;color:#0f4c81;background:#e0f2fe;' : '';
      const suffix = i===0?'st':i===1?'nd':i===2?'rd':'th';
      return `<div style="display:flex;align-items:center;gap:4px;padding:3px 5px;border-bottom:1px solid #dbe5ef;font-size:9pt;line-height:1.12;${firstStyle}"><span style="width:25px;font-weight:800;">${i + 1}${suffix}</span><span>${esc(name)}${badge}</span></div>`;
    }).join('');
  }

  function assignmentHtml(dateKey) {
    const day = buildAdmissionOrder(dateKey, 'DAY');
    const night = buildAdmissionOrder(dateKey, 'NIGHT');
    return `<div class="first-admission-print" style="margin:7px 0 0;padding:6px 8px;border:1.5px solid #0f4c81;border-radius:4px;background:#f8fbff;page-break-inside:avoid;">
      <div style="font-size:10pt;font-weight:800;text-transform:uppercase;letter-spacing:.35px;color:#0f4c81;margin-bottom:4px;">RN Admission Order</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <th style="width:50%;border:1px solid #9fbad0;padding:3px 5px;background:#eef6ff;font-size:9pt;">☀ Day Shift</th>
          <th style="width:50%;border:1px solid #9fbad0;padding:3px 5px;background:#eef6ff;font-size:9pt;">🌙 Night Shift</th>
        </tr>
        <tr>
          <td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">${orderCell(day)}</td>
          <td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">${orderCell(night)}</td>
        </tr>
      </table>
    </div>`;
  }

  function compactPrintCss() {
    return `<style id="cc-one-page-print-fix">
      @page { size: letter portrait !important; margin: .22in .28in !important; }
      @media print {
        html,body { margin:0 !important; padding:0 !important; }
        .ps-page { padding:0 !important; margin:0 auto !important; max-width:none !important; width:100% !important; min-height:0 !important; height:auto !important; }
        .ps-title { font-size:18pt !important; margin:0 0 2px !important; line-height:1.05 !important; }
        .ps-date { font-size:10pt !important; margin:0 0 6px !important; line-height:1.05 !important; }
        .ps-section-label { font-size:10pt !important; margin:5px 0 2px !important; padding-bottom:2px !important; border-bottom-width:1px !important; line-height:1.08 !important; }
        .ps-table { margin-bottom:2px !important; }
        .ps-table th { font-size:9pt !important; padding:3px 4px !important; line-height:1.08 !important; }
        .ps-table td { font-size:9.3pt !important; padding:3px 4px !important; line-height:1.12 !important; }
        .ps-notes-label { font-size:8pt !important; }
        .ps-notes-text { font-size:8.5pt !important; line-height:1.12 !important; }
        .ps-footer { font-size:7.5pt !important; margin-top:5px !important; padding-top:3px !important; }
        .first-admission-print { margin-top:6px !important; margin-bottom:0 !important; }
      }
    </style>`;
  }

  function fitOnePageScript() {
    return `<script id="cc-fit-one-page">
      (function(){
        function fit(){
          try{
            var page=document.querySelector('.ps-page')||document.body;
            document.documentElement.style.zoom='1';
            document.body.style.zoom='1';
            var dpi=96;
            var printableHeight=(11-.50)*dpi;
            var rect=page.getBoundingClientRect();
            var h=rect.height;
            if(h>printableHeight){
              var scale=Math.max(.82,Math.min(1,printableHeight/h));
              document.body.style.zoom=String(scale);
            }
          }catch(e){}
        }
        window.addEventListener('load',function(){
          fit();
          setTimeout(function(){fit();window.print();},120);
        });
      })();
    <\/script>`;
  }

  function injectAtBottom(html, inject) {
    if (/<div class=["']ps-footer["']/.test(html)) {
      return { html: html.replace(/(<div class=["']ps-footer["'][^>]*>)/, inject + '$1'), injected: true };
    }
    if (/<\/body>/i.test(html)) {
      return { html: html.replace(/<\/body>/i, inject + '</body>'), injected: true };
    }
    // document.write may be called in chunks. Do NOT inject into an early chunk;
    // wait until the footer or final body chunk is written.
    return { html: html, injected: false };
  }

  function wrapPrintFunction(fnName) {
    const original = window[fnName];
    if (typeof original !== 'function' || original.__admissionOrderWrapped) return false;

    const wrapped = function () {
      const dateKey = (typeof state !== 'undefined' && state.activeBoardDate) || '';
      const inject = dateKey ? assignmentHtml(dateKey) : '';
      const realOpen = window.open;
      const forceOnePage = fnName === 'printNursingServices';

      window.open = function () {
        const child = realOpen.apply(window, arguments);
        if (!child || !inject) return child;

        try {
          const realWrite = child.document.write.bind(child.document);
          let admissionInjected = false;

          child.document.write = function (html) {
            if (typeof html === 'string') {
              if (!admissionInjected && !html.includes('first-admission-print')) {
                const placed = injectAtBottom(html, inject);
                html = placed.html;
                admissionInjected = placed.injected;
              }

              if (forceOnePage) {
                html = html.replace('</head>', compactPrintCss() + '</head>');
                html = html.replace(/<script>window\.onload=function\(\)\{window\.print\(\);\}<\\\/script>/,
                  fitOnePageScript());
              }
            }
            return realWrite(html);
          };
        } catch (e) { console.warn('Admission Order print injection:', e); }

        return child;
      };

      let result;
      try { result = original.apply(this, arguments); }
      catch (e) { window.open = realOpen; throw e; }

      if (result && typeof result.then === 'function') {
        return result.finally(() => { window.open = realOpen; });
      }

      window.open = realOpen;
      return result;
    };

    wrapped.__admissionOrderWrapped = true;
    wrapped.__admissionOrderOriginal = original;
    window[fnName] = wrapped;
    try { eval(fnName + ' = window[fnName]'); } catch (e) {}
    return true;
  }

  function install() {
    if (window[INSTALLED_FLAG]) return;
    const a = wrapPrintFunction('printNursingServices');
    const b = wrapPrintFunction('printStaffingSheet');
    if (a || b) window[INSTALLED_FLAG] = true;
  }

  window.addEventListener('load', function () {
    let tries = 0;
    const timer = setInterval(function () {
      install();
      tries += 1;
      if (window[INSTALLED_FLAG] || tries > 40) clearInterval(timer);
    }, 250);
  });
})();
