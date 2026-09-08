
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
// FIRST ADMISSION ROTATION — staffing printouts
// Added 2026-09-08
// Tracks Day and Night independently. Reprints keep the same assignment.
// If another eligible RN is available, yesterday's First Admission RN is
// excluded so no RN receives First Admission on consecutive calendar days.
// ════════════════════════════════════════════════════════════════
(function () {
  const INSTALLED_FLAG = '__ccFirstAdmissionRotationInstalled';

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
    if (shiftName === 'DAY') {
      rows = [...(p['0700-1500'] || []), ...(p['1500-1900'] || [])];
    } else {
      rows = [...(p['1900-0700'] || [])];
    }
    let names = uniqNames(rows.filter(x => x && x.role === 'RN'));
    // Orientees do not receive the first-admission assignment when another RN is available.
    const nonOrient = names.filter(n => !(state.empOrientation || {})[n]);
    if (nonOrient.length) names = nonOrient;
    return names;
  }

  function isCharge(dateKey, shiftName, name) {
    if (typeof state === 'undefined') return false;
    const shiftKeys = shiftName === 'DAY' ? ['0700-1500', '1500-1900'] : ['1900-0700'];
    return shiftKeys.some(sk =>
      (state.chargeNurses || {})[dateKey + '|' + sk] === name ||
      (state.charge3C || {})[dateKey + '|' + sk] === name
    );
  }

  function historyFor(shiftName) {
    const h = (typeof state !== 'undefined' && state.firstAdmission) ? state.firstAdmission : {};
    const out = {};
    Object.keys(h).sort().forEach(d => {
      const n = h[d] && h[d][shiftName];
      if (!n) return;
      if (!out[n]) out[n] = { count: 0, last: '' };
      out[n].count += 1;
      if (d > out[n].last) out[n].last = d;
    });
    return out;
  }

  function chooseFirstAdmission(dateKey, shiftName) {
    if (typeof state === 'undefined') return '';
    state.firstAdmission = state.firstAdmission || {};
    state.firstAdmission[dateKey] = state.firstAdmission[dateKey] || {};

    let candidates = eligibleRNs(dateKey, shiftName);
    if (!candidates.length) {
      state.firstAdmission[dateKey][shiftName] = '';
      return '';
    }

    // Preserve today's saved assignment if that RN is still eligible.
    const saved = state.firstAdmission[dateKey][shiftName];
    if (saved && candidates.includes(saved)) return saved;

    // Never repeat yesterday when another eligible RN is present.
    const yesterday = dateMinusOne(dateKey);
    const prev = state.firstAdmission[yesterday] && state.firstAdmission[yesterday][shiftName];
    if (prev && candidates.length > 1) {
      const withoutPrev = candidates.filter(n => n !== prev);
      if (withoutPrev.length) candidates = withoutPrev;
    }

    const hist = historyFor(shiftName);
    candidates.sort((a, b) => {
      // Prefer a non-charge RN when possible, then the RN with the fewest prior
      // first admissions, then the one who has gone the longest without one.
      const ca = isCharge(dateKey, shiftName, a) ? 1 : 0;
      const cb = isCharge(dateKey, shiftName, b) ? 1 : 0;
      if (ca !== cb) return ca - cb;
      const ha = hist[a] || { count: 0, last: '' };
      const hb = hist[b] || { count: 0, last: '' };
      if (ha.count !== hb.count) return ha.count - hb.count;
      if (ha.last !== hb.last) return (ha.last || '').localeCompare(hb.last || '');
      return a.localeCompare(b);
    });

    const chosen = candidates[0] || '';
    state.firstAdmission[dateKey][shiftName] = chosen;
    try {
      if (typeof persistSave === 'function') persistSave();
      else localStorage.setItem('_3bTracker', JSON.stringify(state));
    } catch (e) { console.warn('First Admission save:', e); }
    return chosen;
  }

  function assignmentHtml(dateKey) {
    const day = chooseFirstAdmission(dateKey, 'DAY');
    const night = chooseFirstAdmission(dateKey, 'NIGHT');
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return `<div class="first-admission-print" style="margin:0 0 12px;padding:9px 12px;border:2px solid #0f4c81;border-radius:6px;background:#eef6ff;page-break-inside:avoid;">
      <div style="font-size:10pt;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#0f4c81;margin-bottom:6px;">First Admission Rotation</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <td style="width:50%;border:1px solid #9fbad0;padding:7px 9px;text-align:center;"><div style="font-size:8pt;font-weight:700;color:#4b5563;text-transform:uppercase;">☀ Day Shift — First Admission</div><div style="font-size:11pt;font-weight:800;margin-top:3px;">${day ? esc(day) : 'No eligible RN assigned'}</div></td>
          <td style="width:50%;border:1px solid #9fbad0;padding:7px 9px;text-align:center;"><div style="font-size:8pt;font-weight:700;color:#4b5563;text-transform:uppercase;">🌙 Night Shift — First Admission</div><div style="font-size:11pt;font-weight:800;margin-top:3px;">${night ? esc(night) : 'No eligible RN assigned'}</div></td>
        </tr>
      </table>
    </div>`;
  }

  function wrapPrintFunction(fnName) {
    const original = window[fnName];
    if (typeof original !== 'function' || original.__firstAdmissionWrapped) return false;

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
              // Insert immediately after the printed date on both Nursing Services
              // and Manager staffing sheets.
              html = html.replace(/(<div class=["']ps-date["'][^>]*>.*?<\/div>)/s, '$1' + inject);
            }
            return realWrite(html);
          };
        } catch (e) { console.warn('First Admission print injection:', e); }
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
    wrapped.__firstAdmissionWrapped = true;
    wrapped.__firstAdmissionOriginal = original;
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

  // cc-init.js loads before the large core scripts, so install after those
  // functions become available.
  window.addEventListener('load', function () {
    let tries = 0;
    const timer = setInterval(function () {
      install();
      tries += 1;
      if (window[INSTALLED_FLAG] || tries > 40) clearInterval(timer);
    }, 250);
  });
})();
