
// If this is a staff variance link, hide everything until the variance
// overlay itself is ready — prevents any flash of the unit dashboard.
if (new URLSearchParams(location.search).get('vf')) {
  document.documentElement.style.visibility = 'hidden';
  setTimeout(function(){ document.documentElement.style.visibility = 'visible'; }, 8000); // safety fallback
  // Surface any uncaught error instead of leaving a silent blank screen.
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
// • Prints the FULL RN admission order for Day and Night.
// • Agency RNs ALWAYS lead the admission order.
// • If multiple agency RNs are working, the first agency RN rotates fairly.
// • Day and Night rotations are tracked independently.
// • Reprinting the same date preserves the saved order.
// • Orientees are placed after independently practicing RNs when possible.
// ════════════════════════════════════════════════════════════════
(function () {
  const INSTALLED_FLAG = '__ccAdmissionOrderInstalled';

  function uniqNames(arr) {
    const seen = new Set();
    return (arr || []).map(x => x && x.name).filter(Boolean).filter(n => {
      if (seen.has(n)) return false;
      seen.add(n); return true;
    });
  }

  function dateMinusOne(dateKey) {
    const d = new Date(dateKey + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function eligibleRNs(dateKey, shiftName) {
    if (typeof state === 'undefined') return [];
    const p = (state.placements || {})[dateKey] || {};
    let rows = [];
    if (shiftName === 'DAY') rows = [...(p['0700-1500'] || []), ...(p['1500-1900'] || [])];
    else rows = [...(p['1900-0700'] || [])];
    return uniqNames(rows.filter(x => x && x.role === 'RN'));
  }

  function isAgency(name) {
    if (typeof state === 'undefined') return false;
    const a = (state.agencyDates || {})[name] || {};
    return a.isAgency === true;
  }

  function isOrientee(name) {
    return !!((typeof state !== 'undefined' && state.empOrientation) || {})[name];
  }

  function isCharge(dateKey, shiftName, name) {
    if (typeof state === 'undefined') return false;
    const shiftKeys = shiftName === 'DAY' ? ['0700-1500', '1500-1900'] : ['1900-0700'];
    return shiftKeys.some(sk =>
      (state.chargeNurses || {})[dateKey + '|' + sk] === name ||
      (state.charge3C || {})[dateKey + '|' + sk] === name
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

    const sorted = [...names].sort((a, b) => {
      if (avoidYesterdayFirst && names.length > 1) {
        const ap = a === prevFirst ? 1 : 0;
        const bp = b === prevFirst ? 1 : 0;
        if (ap !== bp) return ap - bp;
      }
      // Prefer non-charge RNs inside the same agency/non-agency tier.
      const ac = isCharge(dateKey, shiftName, a) ? 1 : 0;
      const bc = isCharge(dateKey, shiftName, b) ? 1 : 0;
      if (ac !== bc) return ac - bc;
      const ah = hist[a] || { count: 0, last: '' };
      const bh = hist[b] || { count: 0, last: '' };
      if (ah.count !== bh.count) return ah.count - bh.count;
      if (ah.last !== bh.last) return (ah.last || '').localeCompare(bh.last || '');
      return a.localeCompare(b);
    });
    return sorted;
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

    // Preserve a saved order if it still contains exactly today's eligible RNs.
    const saved = state.admissionOrder[dateKey][shiftName];
    if (Array.isArray(saved) && saved.length === all.length &&
        saved.every(n => all.includes(n)) && all.every(n => saved.includes(n))) {
      return saved;
    }

    // Agency ALWAYS goes first. Within agency, rotate who leads when more than one works.
    const agency = all.filter(isAgency);
    const staff = all.filter(n => !isAgency(n));

    const agencyIndependent = agency.filter(n => !isOrientee(n));
    const agencyOrientee = agency.filter(isOrientee);
    const staffIndependent = staff.filter(n => !isOrientee(n));
    const staffOrientee = staff.filter(isOrientee);

    let order = [];
    if (agency.length) {
      // If any agency RN works, first admission must be agency.
      const agPool = agencyIndependent.length ? agencyIndependent : agency;
      const agLeadOrder = rotateGroup(agPool, dateKey, shiftName, true);
      const leader = agLeadOrder[0];
      order.push(leader);
      // Remaining agency RNs stay ahead of all non-agency RNs.
      const remainingAgency = agency.filter(n => n !== leader);
      order.push(...rotateGroup(remainingAgency.filter(n => !isOrientee(n)), dateKey, shiftName, false));
      order.push(...rotateGroup(remainingAgency.filter(isOrientee), dateKey, shiftName, false));
    }

    order.push(...rotateGroup(staffIndependent, dateKey, shiftName, agency.length === 0));
    order.push(...rotateGroup(staffOrientee, dateKey, shiftName, false));

    // Safety: no duplicates and include every eligible RN exactly once.
    order = uniqNames(order.map(name => ({ name })));
    all.forEach(n => { if (!order.includes(n)) order.push(n); });

    state.admissionOrder[dateKey][shiftName] = order;
    // Backward compatibility for the earlier firstAdmission field.
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
    if (!order.length) return '<div style="padding:6px;color:#6b7280;font-style:italic;">No eligible RN assigned</div>';
    return order.map((name, i) => {
      const agency = isAgency(name);
      const badge = agency ? ' <span style="font-size:7pt;font-weight:800;color:#7c2d12;background:#ffedd5;border:1px solid #fdba74;padding:1px 4px;border-radius:3px;">AGENCY</span>' : '';
      const firstStyle = i === 0 ? 'font-weight:800;color:#0f4c81;background:#e0f2fe;' : '';
      return `<div style="display:flex;align-items:center;gap:5px;padding:4px 6px;border-bottom:1px solid #dbe5ef;${firstStyle}"><span style="width:25px;font-weight:800;">${i + 1}${i===0?'st':i===1?'nd':i===2?'rd':'th'}</span><span>${esc(name)}${badge}</span></div>`;
    }).join('');
  }

  function assignmentHtml(dateKey) {
    const day = buildAdmissionOrder(dateKey, 'DAY');
    const night = buildAdmissionOrder(dateKey, 'NIGHT');
    return `<div class="first-admission-print" style="margin:0 0 12px;padding:9px 12px;border:2px solid #0f4c81;border-radius:6px;background:#f8fbff;page-break-inside:avoid;">
      <div style="font-size:10pt;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#0f4c81;margin-bottom:6px;">RN Admission Order</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <th style="width:50%;border:1px solid #9fbad0;padding:5px 8px;background:#eef6ff;">☀ Day Shift — Admission Order</th>
          <th style="width:50%;border:1px solid #9fbad0;padding:5px 8px;background:#eef6ff;">🌙 Night Shift — Admission Order</th>
        </tr>
        <tr>
          <td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">${orderCell(day)}</td>
          <td style="border:1px solid #9fbad0;vertical-align:top;padding:0;">${orderCell(night)}</td>
        </tr>
      </table>
      <div style="font-size:7.5pt;color:#6b7280;margin-top:5px;">Agency RNs are placed first in the admission rotation. Day and Night are tracked separately.</div>
    </div>`;
  }

  function wrapPrintFunction(fnName) {
    const original = window[fnName];
    if (typeof original !== 'function' || original.__admissionOrderWrapped) return false;

    const wrapped = function () {
      const dateKey = (typeof state !== 'undefined' && state.activeBoardDate) || '';
      const inject = dateKey ? assignmentHtml(dateKey) : '';
      const realOpen = window.open;

      window.open = function () {
        const child = realOpen.apply(window, arguments);
        if (!child || !inject) return child;
        try {
          const realWrite = child.document.write.bind(child.document);
          child.document.write = function (html) {
            if (typeof html === 'string' && !html.includes('first-admission-print')) {
              html = html.replace(/(<div class=["']ps-date["'][^>]*>.*?<\/div>)/s, '$1' + inject);
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
