
// ════════════════════════════════════
//  PRINT STAFFING SHEET
// ════════════════════════════════════

function showPrintMenu() {
  const m = document.getElementById('print-menu');
  if (!m) return;
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
  if (m.style.display === 'block') {
    setTimeout(() => document.addEventListener('click', _closePrintMenu, { once:true }), 0);
  }
}
function _closePrintMenu(e) {
  if (e.target.closest && e.target.closest('#print-menu')) return;
  hidePrintMenu();
}
function hidePrintMenu() {
  const m = document.getElementById('print-menu'); if (m) m.style.display = 'none';
}

// ════════════════════════════════════
//  HUDDLE TAB
// ════════════════════════════════════

const HUDDLE_LS_KEY = '_3bHuddleData';

function huddleAutoSave() {
  const data = huddleGetData();
  try { localStorage.setItem(HUDDLE_LS_KEY, JSON.stringify(data)); } catch(e) {}
}

function huddleGetData() {
  return {
    week:          document.getElementById('hud-week')?.value || '',
    date:          document.getElementById('hud-date')?.value || '',
    cnoTitle:      document.getElementById('hud-cno-title')?.value || '',
    cnoContent:    document.getElementById('hud-cno-content')?.value || '',
    announcements: document.getElementById('hud-announcements')?.value || '',
    auditLink:     document.getElementById('hud-audit-link')?.value || '',
    unit:          document.getElementById('hud-unit')?.value || '',
    recognitions:  document.getElementById('hud-recognitions')?.value || '',
  };
}

function huddleSetData(data) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('hud-week', data.week);
  set('hud-date', data.date);
  set('hud-cno-title', data.cnoTitle);
  set('hud-cno-content', data.cnoContent);
  set('hud-announcements', data.announcements);
  set('hud-audit-link', data.auditLink);
  set('hud-unit', data.unit);
  set('hud-recognitions', data.recognitions);
}

function huddleLoadSaved() {
  try {
    const saved = localStorage.getItem(HUDDLE_LS_KEY);
    if (saved) huddleSetData(JSON.parse(saved));
  } catch(e) {}
}

function huddleClear() {
  if (!confirm('Clear all huddle fields?')) return;
  huddleSetData({});
  try { localStorage.removeItem(HUDDLE_LS_KEY); } catch(e) {}
}

// Parse uploaded DOCX text via mammoth CDN
function huddleParseUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const status = document.getElementById('hud-upload-status');
  if (status) status.textContent = '⏳ Reading...';

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      if (typeof mammoth !== 'undefined') {
        const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
        const text = result.value || '';
        if (!text.trim()) { if (status) status.textContent = '⚠ Empty — check file'; return; }
        huddleParseText(text);
        if (status) status.textContent = '✅ Loaded — review fields above';
      } else {
        // mammoth not yet loaded — retry once after 1 second
        if (status) status.textContent = '⏳ Loading parser...';
        setTimeout(function() { huddleParseUpload(input); }, 1000);
      }
    } catch(err) {
      console.error('Huddle upload error:', err);
      if (status) status.textContent = '⚠ Parse error — paste content manually';
    }
  };
  reader.readAsArrayBuffer(file);
}

function huddleParseText(text) {
  // Helper: set value AND fire input event so oninput handlers trigger
  function setField(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val || '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Try to extract the date range from the title line
  const dateMatch = text.match(/Daily Safety Shift Huddle[:\s]+([^\n]+)/i);
  if (dateMatch) setField('hud-cno-title', 'Daily Safety Shift Huddle: ' + dateMatch[1].trim());

  // Week range from title
  const weekMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*[\u2013\-]\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (weekMatch) setField('hud-week', weekMatch[1] + ' \u2013 ' + weekMatch[2]);

  // Extract CNO content block (between the huddle title and "Arnot Health Weekly")
  const cnoMatch = text.match(/Daily Safety Shift Huddle[^\n]*\n([\s\S]*?)(?:Arnot Health Weekly|$)/i);
  if (cnoMatch) setField('hud-cno-content', cnoMatch[1].replace(/^\s+|\s+$/g, ''));

  // Extract announcements block
  const annMatch = text.match(/Arnot Health Weekly Announcements\s*([\s\S]*?)(?:Unit\/Department|$)/i);
  if (annMatch) setField('hud-announcements', annMatch[1].replace(/^\s+|\s+$/g, ''));

  // Extract audit link
  const linkMatch = text.match(/https?:\/\/[^\s\n]+smartsheet[^\s\n]*/i);
  if (linkMatch) setField('hud-audit-link', linkMatch[0].trim());

  // Extract unit announcements
  const unitMatch = text.match(/Unit\/Department Announcements\s*([\s\S]*?)(?:Recognitions|$)/i);
  if (unitMatch) setField('hud-unit', unitMatch[1].replace(/^\s+|\s+$/g, ''));

  // Extract recognitions
  const recMatch = text.match(/Recognitions[^\n]*\n([\s\S]*?)(?:End on|$)/i);
  if (recMatch) setField('hud-recognitions', recMatch[1].replace(/^\s+|\s+$/g, ''));

  // Force a final save with all updated values
  huddleAutoSave();
}
function printHuddle() {
  // Always flush live DOM values to localStorage first, then read back from DOM
  huddleAutoSave();
  const d = huddleGetData();
  const printedAt = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  // ── Pull live board data ──────────────────────────────────────
  const dateKey = state.activeBoardDate;
  const shifts  = dateKey ? (state.placements[dateKey] || {}) : {};
  function gs(shift, role) { return (shifts[shift]||[]).filter(p=>p.role===role); }

  // Census
  const cDay   = (state.census && state.census.day)   || '';
  const cEve   = (state.census && state.census.eve)   || '';
  const cNight = (state.census && state.census.night) || '';

  // Staffing counts
  const rnD = gs('0700-1500','RN'), rnE = gs('1500-1900','RN'), rnN = gs('1900-0700','RN');
  const lpnD= gs('0700-1500','LPN'),lpnE= gs('1500-1900','LPN'),lpnN= gs('1900-0700','LPN');
  const caD = gs('0630-1430','CA'), caE1= gs('1430-1830','CA'), caE2= gs('1830-2230','CA'), caN= gs('2230-0630','CA');
  const orientD = rnD.filter(p=>state.empOrientation[p.name]).length + lpnD.filter(p=>state.empOrientation[p.name]).length;
  const orientE = rnE.filter(p=>state.empOrientation[p.name]).length + lpnE.filter(p=>state.empOrientation[p.name]).length;
  const orientN = rnN.filter(p=>state.empOrientation[p.name]).length + lpnN.filter(p=>state.empOrientation[p.name]).length;
  const caTotal = (shift) => gs('0630-1430','CA').concat(gs('1430-1830','CA')).concat(gs('1830-2230','CA')).concat(gs('2230-0630','CA'));
  const caDayCount  = caD.length + caE1.length;
  const caNightCount= caE2.length + caN.length;

  // Charge nurses
  const chargeDay   = dateKey ? (state.chargeNurses[dateKey+'|0700-1500'] || '') : '';
  const chargeEve   = dateKey ? (state.chargeNurses[dateKey+'|1500-1900'] || '') : '';
  const chargeNight = dateKey ? (state.chargeNurses[dateKey+'|1900-0700'] || '') : '';
  const chgShort = n => n ? n.split(',')[0].trim() : '';

  // Sitters from float board
  const floatData = window._floatSummary || {};
  const sittersToday = Object.keys(floatData).filter(name => {
    const d2 = floatData[name];
    return d2 && (d2.sitter || d2.lastSitter);
  }).length;

  // Within-grid check (ratio: RN 1:5 day, 1:6 night)
  const withinGridDay   = cDay   ? (rnD.length  >= Math.ceil(parseInt(cDay)  /5))  : null;
  const withinGridEve   = cEve   ? (rnE.length  >= Math.ceil(parseInt(cEve)  /6))  : null;
  const withinGridNight = cNight ? (rnN.length  >= Math.ceil(parseInt(cNight)/6))  : null;
  const gridY = (v) => v === null ? '' : (v ? '<strong>Y</strong>' : 'Y');
  const gridN = (v) => v === null ? '' : (v ? 'N' : '<strong style="color:#c00">N</strong>');

  // Date label
  const dateLabel = dateKey
    ? new Date(dateKey+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
    : '';
  const weekOf = d.week || (dateKey ? dateKey : '');

  // ── Determine week start so we can build one form page per day (7 days) ──
  let weekStartDate;
  const wkMatch = (d.week || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (wkMatch) {
    weekStartDate = new Date(parseInt(wkMatch[3]), parseInt(wkMatch[1]) - 1, parseInt(wkMatch[2]));
  } else if (dateKey) {
    weekStartDate = new Date(dateKey + 'T12:00:00');
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
  } else {
    weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
  }
  const weekDayLabels = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(weekStartDate);
    dt.setDate(weekStartDate.getDate() + i);
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  });

  // Format CNO content: numbered items with sub-bullets, Q&A answers bolded
  function formatCNOContent(raw) {
    if (!raw) return '';
    return raw.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="margin:5px 0;"></div>';
      // Numbered topic header
      if (/^\d+\./.test(trimmed)) {
        return `<div style="font-weight:700;margin-top:10px;margin-bottom:3px;">${trimmed}</div>`;
      }
      // Answer line
      if (/^Answer:/i.test(trimmed)) {
        return `<div style="margin-left:20px;margin-bottom:3px;"><strong>${trimmed}</strong></div>`;
      }
      // Sub-bullet (leading spaces or dash/bullet)
      if (/^[-•]/.test(trimmed) || /^\s/.test(line)) {
        return `<div style="margin-left:20px;margin-bottom:2px;">• ${trimmed.replace(/^[-•]\s*/,'')}</div>`;
      }
      return `<div style="margin-bottom:2px;">${trimmed}</div>`;
    }).join('');
  }

  // Format announcements list
  function formatAnnouncements(raw) {
    if (!raw) return '';
    return raw.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^(Regulatory Tip|See this week)/i.test(trimmed)) {
        return `<div style="margin-top:8px;font-weight:700;">${trimmed}</div>`;
      }
      return `<div style="margin-bottom:2px;">• ${trimmed.replace(/^[-•]\s*/,'')}</div>`;
    }).filter(Boolean).join('');
  }

  const auditLinkHtml = d.auditLink
    ? `<div style="margin-top:6px;font-weight:700;font-size:9pt;">Audit Link: <span style="color:#1d4ed8;">${d.auditLink}</span></div>` : '';

  // Build one huddle form page (page 2 layout) per calendar day of the week
  function buildHuddleFormPage(lbl) {
    return `
  <!-- ══ HUDDLE FORM (one per day, ${lbl}) ══ -->
  <div class="page page-break frm">

    <!-- Header -->
    <div class="frm-header">
      <div>
        <div class="frm-logo">Arnot<span>Health</span></div>
        <div class="frm-logo-sub">It's what we do</div>
      </div>
      <div class="frm-title-box"><em>Med/Surg Huddle Form</em></div>
    </div>

    <!-- Week / Date / Leaders -->
    <div class="frm-week">
      <span>WEEK OF: <span style="font-weight:700;">${weekOf || '___________________'}</span></span>
      <span style="margin-left:30px;">DATE: <span style="font-weight:700;">${lbl}</span></span>
    </div>
    <div class="frm-leaders" style="margin-bottom:6px;">
      <div class="frm-leader-box" style="margin-right:20px;"><span class="frm-leader-label">Huddle Leader am</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      <div class="frm-leader-box"><span class="frm-leader-label">Huddle Leader pm</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
    </div>

    <!-- Main form table -->
    <table>

      <!-- Status of the Team header -->
      <tr><td colspan="10" class="frm-section-hdr">
        <strong>Status of the Team</strong> <em>(Scheduling/Staffing/Census/Share a positive observation from prior day, staff questions, comments, concerns)</em>
      </td></tr>

      <!-- Census + Staffing row -->
      <tr>
        <td colspan="10" style="padding:0;vertical-align:top;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>

              <!-- CENSUS: 45% -->
              <td style="width:45%;vertical-align:top;padding:0;border:none;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:4px 8px;font-size:10pt;font-weight:700;text-align:left;width:38%;"></td>
                    <td style="border:none;padding:4px 0;font-size:10pt;font-weight:700;text-align:center;width:20%;">DAY</td>
                    <td style="border:none;padding:4px 0;font-size:10pt;font-weight:700;text-align:center;width:20%;">EVE</td>
                    <td style="border:none;padding:4px 0;font-size:10pt;font-weight:700;text-align:center;width:22%;">NIGHT</td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">CENSUS</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">PEND ADM</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">POTENTIAL D/C</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">WRITTEN D/C</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">POST OP</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">INMATES</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">AMA HOLD</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                </table>
              </td>

              <!-- COMMENTS: 15% slim -->
              <td style="width:15%;vertical-align:top;padding:4px 6px;border-left:1px solid #ccc;border-right:1px solid #ccc;">
                <div style="font-size:7pt;font-weight:700;margin-bottom:3px;">Comments:</div>
              </td>

              <!-- STAFFING: 40% -->
              <td style="width:40%;vertical-align:top;padding:0;border:none;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:4px 8px;font-size:10pt;font-weight:700;text-align:left;width:38%;">Staffing</td>
                    <td style="border:none;padding:4px 0;font-size:10pt;font-weight:700;text-align:center;width:20%;">DAY</td>
                    <td style="border:none;padding:4px 0;font-size:10pt;font-weight:700;text-align:center;width:20%;">EVE</td>
                    <td style="border:none;padding:4px 0;font-size:10pt;font-weight:700;text-align:center;width:22%;">NIGHT</td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">RN</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">LPN</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">ORIENT</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">CA</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">SITTERS</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#ffffff;">
                    <td style="border:none;padding:3px 8px;font-size:10pt;font-weight:700;text-align:left;">CHARGE</td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                    <td style="border:1px solid #999;height:28px;"></td>
                  </tr>
                  <tr style="background:#dce6f1;">
                    <td style="border:none;padding:3px 8px;font-size:9.5pt;font-weight:700;text-align:left;">Staffing within grid</td>
                    <td style="border:none;padding:3px 0;font-size:10pt;font-weight:700;text-align:center;"><strong>Y</strong>&nbsp;N</td>
                    <td style="border:none;padding:3px 0;font-size:10pt;font-weight:700;text-align:center;"><strong>Y</strong>&nbsp;N</td>
                    <td style="border:none;padding:3px 0;font-size:10pt;font-weight:700;text-align:center;"><strong>Y</strong>&nbsp;N</td>
                  </tr>
                </table>
              </td>

            </tr>
          </table>
        </td>
      </tr>

<!-- Status of the Patient header -->
      <tr><td colspan="10" class="frm-section-hdr">
        <strong>Status of the Patient</strong> <em>(discharges, safety concerns, identify patients who may present safety concerns)</em>
      </td></tr>

      <!-- Patient detail row -->
      <tr>
        <td colspan="5" style="vertical-align:top;font-size:10pt;line-height:2.0;padding:6px 8px;">
          <div>SITTERS: room <span class="frm-blank" style="width:40px;"></span> REASON: <span class="frm-blank" style="width:100px;"></span> LEVEL: <span class="frm-blank" style="width:35px;"></span></div>
          <div style="padding-left:58px;">room <span class="frm-blank" style="width:40px;"></span> REASON: <span class="frm-blank" style="width:100px;"></span> LEVEL: <span class="frm-blank" style="width:35px;"></span></div>
          <div>BH Buddy <span class="frm-blank" style="width:210px;"></span></div>
          <div>RESTRAINTS: room <span class="frm-blank" style="width:35px;"></span> TYPE: <span class="frm-blank" style="width:90px;"></span> DATE: <span class="frm-blank" style="width:70px;"></span></div>
          <div style="padding-left:92px;">room <span class="frm-blank" style="width:35px;"></span> TYPE: <span class="frm-blank" style="width:90px;"></span> DATE: <span class="frm-blank" style="width:70px;"></span></div>
          <div>ISOLATION: room: <span class="frm-blank" style="width:35px;"></span> REASON <span class="frm-blank" style="width:110px;"></span></div>
          <div style="padding-left:78px;">room: <span class="frm-blank" style="width:35px;"></span> REASON <span class="frm-blank" style="width:110px;"></span></div>
          <div style="padding-left:78px;">room: <span class="frm-blank" style="width:35px;"></span> REASON <span class="frm-blank" style="width:110px;"></span></div>
          <div style="padding-left:78px;">room: <span class="frm-blank" style="width:35px;"></span> REASON <span class="frm-blank" style="width:110px;"></span></div>
          <div>ALL VALUABLES COMPLETE? <span class="frm-blank" style="width:110px;"></span></div>
          <div>FALLS: <span class="frm-blank" style="width:35px;"></span> # of days since last fall <span class="frm-blank" style="width:110px;"></span></div>
          <div>HAPIs: <span class="frm-blank" style="width:90px;"></span> Special skin issues: <span class="frm-blank" style="width:110px;"></span></div>
        </td>
        <td colspan="5" style="vertical-align:top;font-size:10pt;padding:6px 8px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f0f0f0;">
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">LINES</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">ROOM</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">TYPE</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">REASON</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">CHGs?</th>
            </tr>
            ${Array(5).fill('<tr>' + '<td style="padding:8px 5px;border:1px solid #ccc;vertical-align:middle;text-align:center;"></td>'.repeat(5) + '</tr>').join('')}
          </table>
          <div style="margin-top:8px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f0f0f0;">
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">FOLEY</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">ROOM</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">DATE</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">REASON</th>
              <th style="padding:4px 5px;border:1px solid #999;text-align:left;font-size:9.5pt;">CHGs?</th>
            </tr>
            ${Array(5).fill('<tr>' + '<td style="padding:8px 5px;border:1px solid #ccc;vertical-align:middle;text-align:center;"></td>'.repeat(5) + '</tr>').join('')}
          </table>
          </div>
        </td>
      </tr>

      <!-- Patient Concerns -->
      <tr>
        <td colspan="10" style="font-size:10pt;padding:6px 10px;">
          <strong style="color:#c00000;">Patient Concerns:</strong> <em>(Any sitters, falls, rapids, codes, AMA, or on End of Life Care?)</em>
          <div style="min-height:38px;"></div>
        </td>
      </tr>

      <!-- Status of Environment -->
      <tr><td colspan="10" class="frm-section-hdr">
        <strong>Status of the Environment</strong> <em>(identify technology barriers, equipment concerns, loaned out equipment, shift concerns)</em>
      </td></tr>
      <tr>
        <td colspan="10" style="padding:8px 10px;"><div style="min-height:40px;"></div></td>
      </tr>

      <!-- Reminders / Check Daily / Next Shift -->
      <tr>
        <td colspan="4" class="frm-reminder-col">
          <strong>Reminders….</strong><br>
          ☐ Foam in/out<br>
          ☐ <em>Bedside</em> shift report, Update whiteboard<br>
          ☐ <em>Purposeful</em> hourly rounding<br>
          ☐ Ensure patients have call bell within reach
        </td>
        <td colspan="3" class="frm-reminder-col">
          <strong>Check Daily:</strong><br>
          ☐ Glucometer (QC, Vials Dated)<br>
          ☐ Pyxis Discrepancies Fixed<br>
          ☐ Code Cart Checked and Plugged in
        </td>
        <td colspan="3" class="frm-reminder-col">
          ☐ Assignment for next shift done<br>
          ☐ Check Temp/Humidity in clean utility<br>
          &nbsp;&nbsp;(Notify Facilities if temp &gt;76 or Humidity &gt;60%)
        </td>
      </tr>

    </table>

    <!-- Signatures -->
    <div style="display:flex;gap:40px;margin-top:18px;font-size:10pt;">
      <div>
        <div class="sig-line"></div><br>
        AM Huddle Leader Signature
      </div>
      <div>
        <div class="sig-line" style="width:150px;"></div><br>
        Date and time
      </div>
      <div>
        <div class="sig-line"></div><br>
        PM Huddle Leader Signature
      </div>
      <div>
        <div class="sig-line" style="width:150px;"></div><br>
        Date and time
      </div>
    </div>

    <div class="frm-attest" style="margin-top:10px;">
      By signing, you attest that all information was reviewed during the shift huddle and was determined to be accurate.
    </div>

  </div>`;
  }
  // Build the "Huddle" report page (page 1 layout), one per day, labeled with that day's date
  function buildHuddleReportPage(lbl, isFirst) {
    return `
  <!-- ══ HUDDLE REPORT (one per day, ${lbl}) ══ -->
  <div class="page${isFirst ? '' : ' page-break'}">
    <div class="rpt-header">
      <div>
        <div class="rpt-logo">Arnot<span>Health</span></div>
        <div style="font-size:8pt;color:#555;font-style:italic;">It's what we do</div>
      </div>
      <div style="text-align:right;">
        <div class="rpt-title">Huddle</div>
        <div style="font-size:9pt;font-weight:700;margin-top:2px;">${lbl}</div>
      </div>
    </div>

    <table class="rpt-section">
      <!-- Reminders & Announcements header -->
      <tr><td colspan="2" class="rpt-header-bar">Reminders &amp; Announcements</td></tr>

      <!-- CNO Section -->
      <tr>
        <td class="rpt-label">Chief Nursing Officer &amp; Nursing Operations</td>
        <td class="rpt-content">
          <div style="font-size:11pt;font-weight:700;margin-bottom:8px;">${d.cnoTitle || 'Daily Safety Shift Huddle'}</div>
          ${formatCNOContent(d.cnoContent)}
        </td>
      </tr>

      <!-- Arnot Health Weekly -->
      <tr>
        <td class="rpt-label">Arnot Health Weekly Announcements</td>
        <td class="rpt-content">
          ${formatAnnouncements(d.announcements)}
          ${auditLinkHtml}
        </td>
      </tr>

      <!-- Unit / Department -->
      <tr>
        <td class="rpt-label">Unit/Department Announcements</td>
        <td class="rpt-content" style="min-height:50px;">
          ${(d.unit || '').split('\n').map(l=>l.trim()).filter(Boolean).map(function(l){return '<div style="margin-bottom:2px;">'+l+'</div>';}).join('') || '&nbsp;'}
        </td>
      </tr>

      <!-- Recognitions -->
      <tr>
        <td colspan="2" class="rpt-recognitions-bar">
          Recognitions/Compliments/What is going well<br>
          <span style="font-weight:400;font-size:8.5pt;font-style:italic;">(Patient comments should be read aloud every Tuesday during am and pm huddles)</span>
        </td>
      </tr>
      <tr>
        <td colspan="2" class="rpt-content" style="min-height:40px;padding:8px 12px;">
          ${(d.recognitions || '').split('\n').map(l=>l.trim()).filter(Boolean).map(function(l){return '<div style="margin-bottom:2px;">'+l+'</div>';}).join('') || '&nbsp;'}
        </td>
      </tr>

      <!-- End bar -->
      <tr><td colspan="2" class="rpt-end-bar">End on a positive note and thank everyone for being present.</td></tr>
    </table>

    <div style="font-size:7.5pt;color:#888;text-align:right;margin-top:6px;">Printed: ${printedAt}</div>
  </div>`;
  }

  // Pair a Huddle report page with its Med/Surg Huddle Form page for each day of the week
  const huddleFormPagesHtml = weekDayLabels.map(function(lbl, i) {
    return buildHuddleReportPage(lbl, i === 0) + buildHuddleFormPage(lbl);
  }).join('');

  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups and try again.'); return; }

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>3B Huddle — ${d.week || 'Weekly'}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:10pt; color:#111; background:#fff; }

    /* ── PAGE 1: HUDDLE REPORT (front) ── */
    .page { width:100%; max-width:900px; margin:0 auto; padding:18px 24px 14px; }
    .page-break { page-break-before:always; }

    /* Report styles */
    .rpt-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
    .rpt-logo { font-size:22pt; font-style:italic; font-weight:700; }
    .rpt-logo span { font-weight:400; }
    .rpt-title { font-size:20pt; font-style:italic; font-weight:700; text-align:right; }
    .rpt-section { border:1px solid #999; border-collapse:collapse; width:100%; margin-bottom:0; }
    .rpt-section td { border:1px solid #999; padding:7px 10px; vertical-align:top; }
    .rpt-label { width:130px; font-size:9pt; color:#555; vertical-align:top; padding-top:9px; }
    .rpt-header-bar { background:#4472c4; color:#fff; font-weight:700; font-size:10pt; padding:5px 10px; }
    .rpt-recognitions-bar { background:#4472c4; color:#fff; font-weight:700; font-size:10pt; padding:5px 10px; text-align:center; }
    .rpt-end-bar { background:#4472c4; color:#fff; font-weight:700; font-size:10pt; padding:5px 10px; text-align:center; }
    .rpt-content { font-size:9.5pt; line-height:1.45; }

    /* ── PAGE 2: HUDDLE FORM (back) — fills full letter page ── */
    .frm { font-size:10.5pt; }
    .frm-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
    .frm-logo { font-size:17pt; font-style:italic; font-weight:700; }
    .frm-logo span { font-weight:400; }
    .frm-logo-sub { font-size:9.5pt; color:#555; }
    .frm-title-box { border:2px solid #111; padding:6px 22px; font-size:19pt; font-style:italic; font-weight:700; }
    .frm-week { display:flex; gap:30px; font-size:10.5pt; margin-bottom:7px; }
    .frm-leaders { display:flex; gap:0; margin-bottom:0; font-size:10.5pt; }
    .frm-leader-box { border:1px solid #999; padding:5px 12px; flex:1; }
    .frm-leader-label { font-style:italic; }
    .frm table { border-collapse:collapse; width:100%; }
    .frm td, .frm th { border:1px solid #999; padding:5px 7px; font-size:10pt; vertical-align:middle; text-align:center; }
    .frm-section-hdr { background:#dce6f1; font-weight:700; font-size:10.5pt; font-style:italic; padding:5px 8px; }
    .frm-lbl { font-weight:700; font-size:10pt; padding:3px 5px; white-space:nowrap; text-align:left; }
    .frm-blank { min-height:18px; border-bottom:1px solid #888; display:inline-block; width:90px; }
    .frm-blank-lg { min-height:18px; border-bottom:1px solid #888; display:inline-block; width:160px; }
    .frm-reminder-col { font-size:9.5pt; vertical-align:top; padding:7px 9px; line-height:1.7; }
    .sig-line { border-top:1px solid #111; margin-top:18px; display:inline-block; width:230px; font-size:9.5pt; }
    .frm-attest { font-size:9.5pt; color:#555; font-style:italic; }

    @media print {
      @page { size:letter portrait; margin:0.35in 0.35in; }
      body { font-size:10.5pt; }
      .page { padding:0; max-width:100%; }
      .no-print { display:none !important; }
    }
  </style>
  </head><body>

  ${huddleFormPagesHtml}

  <script>window.onload = function() { window.print(); }<\/script>
  </body></html>`);
  w.document.close();
}

// huddleLoadSaved called directly from nav onclick

const DAILY_EDU_CATEGORIES = [
  { key:"falls", label:"Fall Prevention", kpi:"falls",
    topics:[
      { title:"Bed alarm & non-negotiables review", time:"5 min",
        points:[
          "Bed/chair alarms must be on and tested at the start of every shift for all identified fall-risk patients.",
          "Review the 'purposeful rounding' expectation: q1h checks for high fall-risk patients, q2h for standard.",
          "Reminder: two-person assist patients must never be left ambulating with one caregiver, even 'just to the bathroom.'",
          "Discuss any near-miss falls from this week without naming the patient — what almost happened and what caught it."
        ], ref:"Policy: Fall Prevention & Purposeful Rounding, Arnot Health Nursing Policy Manual" },
      { title:"Post-fall huddle expectations", time:"5 min",
        points:[
          "Any fall requires an immediate bedside huddle with the RN, CA, and charge nurse before end of shift.",
          "Post-fall vitals and neuro checks per protocol — review the timing grid.",
          "Documentation must include what the patient was doing, footwear, and environment at time of fall.",
          "This is a learning tool, not a blame exercise — the goal is closing the gap that let it happen."
        ], ref:"Policy: Post-Fall Management Protocol" },
      { title:"PLATO Rounds — Fall Prevention Goals", time:"5 min",
        points:[
          "Fall-risk score is verified and current in PLATO for every patient before rounds start — not carried over from admission.",
          "Non-negotiables (bed alarm on, call light in reach, bed low/locked) are checked and marked complete in PLATO each round.",
          "Any patient flagged high-risk in PLATO gets the q1h round frequency — confirm the schedule matches the flag.",
          "Close out today's PLATO fall goal as a team: what's still open, and who owns closing it before shift change?"
        ], ref:"PLATO Rounds — Fall Prevention Goal Set" }
    ]},
  { key:"skin", label:"Skin / Wound Care", kpi:"hapi",
    topics:[
      { title:"Braden scale & repositioning basics", time:"5 min",
        points:[
          "Braden score should be reassessed every shift and with any condition change — not just admission.",
          "Q2h repositioning applies to anyone Braden ≤18, documented with turn clock if available.",
          "Heels off the bed for all immobile patients — pillow under calves, not under the heel itself.",
          "Any new redness that doesn't blanch within 30 minutes gets reported to the RN immediately."
        ], ref:"Policy: Pressure Injury Prevention & Skin Integrity" },
      { title:"Incontinence-associated skin damage", time:"5 min",
        points:[
          "Barrier cream applied after every incontinence episode, not just at scheduled care times.",
          "Distinguish IAD from a pressure injury — location and shape are the tell (perianal/diffuse vs. bony prominence).",
          "Timely brief changes reduce both HAPI risk and odor-related patient experience complaints."
        ], ref:"Policy: Skin Integrity Program" },
      { title:"PLATO Rounds — HAPI Prevention Goals", time:"5 min",
        points:[
          "Braden score and skin assessment are current in PLATO for every patient — verify, don't assume yesterday's entry still holds.",
          "Turn/reposition goal in PLATO is checked off at the actual time of the turn, not batched at the end of shift.",
          "Any stage 1 redness or new finding gets photographed and logged per the PLATO skin module the same shift it's found.",
          "Review today's open PLATO HAPI goals as a team — which patients need a closer look before end of shift?"
        ], ref:"PLATO Rounds — HAPI Prevention Goal Set" }
    ]},
  { key:"infection", label:"Infection Prevention", kpi:null,
    topics:[
      { title:"CAUTI reduction — foley necessity review", time:"5 min",
        points:[
          "Every foley catheter needs a documented, active indication — 'incontinence' alone is not one.",
          "Nursing-driven removal protocol: if criteria aren't met on rounds, RN can discontinue without a new order.",
          "Perineal care with foleys is a twice-daily minimum, more with incontinence episodes.",
          "Review today's foley list as a team — anyone who can come out today?"
        ], ref:"Policy: CAUTI Prevention / Nurse-Driven Foley Removal Protocol" },
      { title:"Hand hygiene — the moments that get missed", time:"5 min",
        points:[
          "The most commonly missed moment is after touching the patient's environment, not the patient.",
          "Alcohol rub is sufficient except C. diff and some outbreak precautions, which require soap and water.",
          "Foam in, foam out — every room, every time, even for a 30-second check-in."
        ], ref:"Policy: Hand Hygiene Compliance Program" }
    ]},
  { key:"restraint", label:"Restraint & Least Restrictive Care", kpi:null,
    topics:[
      { title:"Least restrictive alternatives before restraint", time:"5 min",
        points:[
          "Document at least one attempted alternative (sitter, reorientation, family presence) before restraint use.",
          "Restraint orders are time-limited and require face-to-face reassessment — know your renewal window.",
          "Q1h or q2h documentation of circulation, skin, and behavior is not optional charting — it's the safety check."
        ], ref:"Policy: Restraint & Seclusion Use" }
    ]},
  { key:"documentation", label:"Documentation & Compliance", kpi:null,
    topics:[
      { title:"Charting by exception vs. required elements", time:"5 min",
        points:[
          "Assessments, I&Os, and safety checks are never 'by exception' — they need a timestamped entry every time.",
          "Late entries should be labeled as such and reflect the actual time the care occurred, not charting time.",
          "A quick end-of-shift chart check catches most gaps before they become a compliance finding."
        ], ref:"Policy: Nursing Documentation Standards" },
      { title:"I&O documentation every shift", time:"5 min",
        points:[
          "Intake and output are documented every shift for every patient with an active order — not just for patients on strict I&O.",
          "Include all sources: IV fluids, PO intake, tube feeds, drains, emesis, and urine — a partial I&O misrepresents fluid balance.",
          "Trends matter more than a single number — a shift-to-shift climb or drop is what triggers a call to the provider.",
          "Missed or estimated I&O should be flagged as such, not charted as if it were measured."
        ], ref:"Policy: Intake & Output Monitoring" }
    ]},
  { key:"experience", label:"Patient Experience", kpi:"experience",
    topics:[
      { title:"Hourly rounding & the 4 P's", time:"5 min",
        points:[
          "Pain, Position, Potty, Possessions — hit all four on every rounding pass, not just pain.",
          "Whiteboards updated every shift: name, goal for the day, and next expected event.",
          "Closing the loop matters more than the round itself — tell the patient when you'll be back, and be back."
        ], ref:"Best practice: AIDET / Hourly Rounding Standard" },
      { title:"Welcome, introduction & education standards", time:"5 min",
        points:[
          "Every interaction opens with a professional introduction and 'How can I help you?' — not just on admission, every time you enter the room.",
          "Welcome the patient and family to the floor at admission or transfer: orient them to the unit, call light, and what to expect.",
          "Offer patient education throughout the stay, not only at discharge — diagnosis, meds, and what today's plan looks like.",
          "Whiteboards updated every shift with name, care team, goal for the day, and next expected event."
        ], ref:"Best practice: AIDET & Patient Experience Standard" }
    ]},
  { key:"teamwork", label:"Teamwork & Staff Safety", kpi:null,
    topics:[
      { title:"SBAR & closed-loop communication", time:"5 min",
        points:[
          "Situation, Background, Assessment, Recommendation — use it for any handoff or provider call.",
          "Closed-loop: repeat back critical orders and confirm before acting, especially with verbal orders.",
          "If something feels off, say so — a two-second pause beats a preventable escalation."
        ], ref:"Best practice: TeamSTEPPS Communication Tools" },
      { title:"Body mechanics & safe patient handling", time:"5 min",
        points:[
          "Use lift equipment for any patient who cannot bear weight — no manual lifts, no exceptions.",
          "Ask for a second set of hands before you need it, not after you're already committed to the move.",
          "Report near-miss injuries to yourself too — they're how we catch a bad pattern early."
        ], ref:"Policy: Safe Patient Handling & Mobility" }
    ]},
  { key:"stroke", label:"Stroke", kpi:null,
    topics:[
      { title:"BE-FAST & last known well", time:"5 min",
        points:[
          "Balance, Eyes, Face, Arm, Speech, Time — run through BE-FAST on any acute neuro change, not just admission.",
          "'Last known well' time is the single most important number you can give the provider — confirm it, don't estimate it.",
          "Stroke alerts need vitals, blood glucose, and a focused neuro exam ready before the team arrives.",
          "Dysphagia screen before anything by mouth — even water — until it's cleared."
        ], ref:"Policy: Acute Stroke Response Protocol" },
      { title:"Post-tPA / thrombectomy monitoring", time:"5 min",
        points:[
          "Neuro checks and vitals follow a strict frequency grid post-tPA — know where in the timeline your patient is.",
          "Blood pressure parameters are tighter after thrombolytics — report out-of-range readings immediately, don't wait for the next round.",
          "Watch groin/access site closely after thrombectomy for bleeding or hematoma.",
          "Any new headache, vomiting, or neuro decline post-treatment is a call-now, not a chart-and-monitor."
        ], ref:"Policy: Post-Thrombolytic / Post-Thrombectomy Care" }
    ]},
  { key:"transfusion", label:"Blood Transfusion", kpi:null,
    topics:[
      { title:"Transfusion verification & the first 15 minutes", time:"5 min",
        points:[
          "Two-RN independent verification at the bedside — patient identifiers, unit number, and blood type all cross-checked.",
          "Baseline vitals before hanging, then repeat at 15 minutes — this window is when most reactions show up.",
          "Never run blood with anything but normal saline in the line.",
          "Know the 4-hour hang-time limit and don't let a unit run past it."
        ], ref:"Policy: Blood Product Administration" },
      { title:"Recognizing a transfusion reaction", time:"5 min",
        points:[
          "Stop the transfusion first, keep the line open with saline, then notify the provider and blood bank.",
          "Fever, chills, hives, back pain, or hypotension shortly after starting are the classic reaction signs.",
          "Save the bag and tubing — blood bank needs them back for workup.",
          "Document reaction timing precisely; it drives what workup gets ordered."
        ], ref:"Policy: Transfusion Reaction Management" }
    ]},
  { key:"chesttube", label:"Chest Tube", kpi:null,
    topics:[
      { title:"Chest tube system checks", time:"5 min",
        points:[
          "Check for tidaling in the water seal chamber with respirations — its absence can mean a kink, clot, or lung re-expansion.",
          "Continuous bubbling in the water seal chamber (not intermittent) suggests an air leak — trace the tubing before assuming it's the pleura.",
          "Keep the drainage system below chest level at all times, and never clamp a chest tube without a specific order.",
          "Mark and time drainage output on the chamber each shift so trends are visible at a glance."
        ], ref:"Policy: Chest Tube Management" },
      { title:"What to do if a chest tube dislodges", time:"5 min",
        points:[
          "If the tube comes out of the chest: cover the site immediately with an occlusive dressing taped on three sides, call for help.",
          "If the tubing disconnects from the drainage unit: submerge the tube end in sterile water/saline while help arrives — don't clamp.",
          "Reassure the patient and monitor respiratory status closely until the provider evaluates.",
          "Know where your emergency chest tube supplies are kept on the unit before you need them."
        ], ref:"Policy: Chest Tube Emergency Management" }
    ]},
  { key:"heparin", label:"Heparin", kpi:null,
    topics:[
      { title:"Heparin drip safety checks", time:"5 min",
        points:[
          "Weight-based dosing and independent double-check at initiation and with every rate change — no exceptions.",
          "Know your unit's PTT/anti-Xa draw schedule and don't let a level run overdue.",
          "Watch for bleeding signs at every assessment: gums, urine, stool, IV sites, and mentation changes.",
          "Have protamine sulfate reversal information on hand and know where it's stored."
        ], ref:"Policy: Anticoagulation / Heparin Infusion Protocol" },
      { title:"Subcutaneous heparin & injection technique", time:"5 min",
        points:[
          "Rotate injection sites and use the abdominal 'safe zone,' avoiding 2 inches around the umbilicus.",
          "Don't aspirate or massage the site afterward — it increases bruising and doesn't change absorption.",
          "Confirm platelet count trend before administering — early HIT can show up as an unexplained drop.",
          "Hold and call the provider for any active bleeding or a platelet count that's trending down sharply."
        ], ref:"Policy: Subcutaneous Anticoagulant Administration" }
    ]},
  { key:"vitals", label:"Vital Signs", kpi:null,
    topics:[
      { title:"Vital sign frequency & escalation", time:"5 min",
        points:[
          "Confirm you know the ordered frequency for every patient — 'routine' isn't the same on every unit or acuity level.",
          "A single abnormal vital deserves a recheck before it gets charted and moved past — don't let outliers slide.",
          "Know your early warning score triggers and what response they require (rapid response, provider notification).",
          "Manual vitals should confirm any automated reading that looks inconsistent with how the patient looks.",
          "Critical vital sign values are reported to the nurse immediately, in person or by phone — never left for the next chart check."
        ], ref:"Policy: Vital Sign Monitoring & Early Warning Score" },
      { title:"Orthostatic vitals — doing them right", time:"5 min",
        points:[
          "Lying, sitting, and standing readings each need a full 1–2 minute wait before measuring, not an instant reading.",
          "Stop and support the patient immediately if dizziness or a significant BP drop occurs — don't push through to finish the set.",
          "A positive orthostatic result matters for fall risk scoring — update the care plan, not just the chart."
        ], ref:"Policy: Orthostatic Vital Sign Assessment" }
    ]},
  { key:"rounding", label:"Purposeful Rounding", kpi:null,
    topics:[
      { title:"The purposeful rounding checklist", time:"5 min",
        points:[
          "Every round covers pain, position, potty, and possessions — skipping one defeats the purpose of the round.",
          "Update the whiteboard at every round: goal for the day, next event, and who's coming back and when.",
          "Tell the patient exactly when you'll return — and be back at that time, even for a quick check.",
          "Rounding frequency follows fall-risk and acuity, not a flat schedule for the whole unit."
        ], ref:"Policy: Purposeful Rounding Standard" }
    ]},
  { key:"ambulation", label:"Ambulate Patients", kpi:null,
    topics:[
      { title:"Safe ambulation & mobility assessment", time:"5 min",
        points:[
          "Check the most recent mobility/fall-risk assessment before ambulating — don't assume yesterday's level still applies.",
          "Gait belt on for anyone below independent status, and know your unit's two-person-assist criteria.",
          "Orthostatic dizziness on standing means sit the patient back down and reassess before continuing.",
          "Early and frequent ambulation reduces deconditioning, falls risk long-term, and length of stay — it's not just a task to check off.",
          "Ambulate every shift per the mobility care plan — a single walk on day one doesn't cover the whole stay."
        ], ref:"Policy: Progressive Mobility Program" }
    ]},
  { key:"newideas", label:"New Ideas / General", kpi:null,
    topics:[
      { title:"Open floor: process improvement idea of the week", time:"5 min",
        points:[
          "Ask the team: what's one small thing that would make today easier or safer?",
          "Capture it — even a minor workflow fix is worth bringing to Practice Council.",
          "Close by naming one thing the unit did well this week."
        ], ref:"Unit-driven — no formal policy reference" }
    ]}
];

// ════════════════════════════════════════════════════
//  DAILY HUDDLE EDUCATION — 5-min talking points
//  Auto-suggests a focus category from real unit data
//  (unit falls this month, PLATO fall/HAPI rounding %,
//  latest Press Ganey overall) and saves today's pick
//  into state.dailyEduLog so it prints on the Manager Report.
// ════════════════════════════════════════════════════

let _deSelectedCat = null;
let _deSelectedTopicIdx = null;
let _deRecommendedKeys = [];

function dailyEduTodayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function dailyEduUnitFallsThisMonth() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  return (state.unitFalls || []).filter(f => {
    const d = new Date((f.date||'') + 'T12:00:00');
    return !isNaN(d) && d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

function dailyEduUnitHapiThisMonth() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  let n = 0;
  Object.values(state.staffIncidents || {}).forEach(si => {
    (si.hapis || []).forEach(h => {
      const d = new Date((h.date||'') + 'T12:00:00');
      if (!isNaN(d) && d.getFullYear() === y && d.getMonth() === m) n++;
    });
  });
  return n;
}

function dailyEduPlatoStats(dataArr, items) {
  const yr = new Date().getFullYear();
  const recs = (dataArr || []).filter(r => {
    const d = parseUSDate(r.date);
    return d ? d.getFullYear() === yr : true;
  });
  if (!recs.length) return null;
  const compliant = recs.filter(r => r.compliant).length;
  const missedCounts = {};
  items.forEach(it => missedCounts[it.key] = 0);
  recs.forEach(r => items.forEach(it => { if ((r.items[it.key] || '').toLowerCase() === 'no') missedCounts[it.key]++; }));
  const top = items.map(it => ({ label: it.label, count: missedCounts[it.key] })).sort((a,b) => b.count - a.count)[0];
  return { pct: Math.round(compliant / recs.length * 100), topMissed: (top && top.count > 0) ? top.label : null, total: recs.length };
}

function dailyEduPlatoFall() { return dailyEduPlatoStats(state.fallRoundData, FALL_ROUND_ITEMS); }
function dailyEduPlatoHapi() { return dailyEduPlatoStats(state.hapiRoundData, HAPI_ROUND_ITEMS); }

function dailyEduPressGaneyOverall() {
  const months = Object.keys(state.pressGaney || {}).sort();
  if (!months.length) return null;
  const latest = state.pressGaney[months[months.length - 1]];
  return (latest && latest.overall != null && latest.overall !== '') ? Number(latest.overall) : null;
}

function dailyEduSuggest() {
  const falls = dailyEduUnitFallsThisMonth();
  const hapiCount = dailyEduUnitHapiThisMonth();
  const plF = dailyEduPlatoFall();
  const plH = dailyEduPlatoHapi();
  const pg = dailyEduPressGaneyOverall();

  const scored = [];
  if (falls >= 1 || (plF && plF.pct < 90)) {
    let sev = falls >= 2 ? 3 : falls >= 1 ? 2 : 1;
    if (plF && plF.pct < 80) sev = Math.max(sev, 3);
    let note = `${falls} fall${falls !== 1 ? 's' : ''} this month`;
    if (plF) note += ` · PLATO fall rounding ${plF.pct}% (goal 90%, ${plF.total} rounds)` + (plF.topMissed ? ` · most missed: ${plF.topMissed}` : '');
    scored.push({ key:'falls', sev, note });
  }
  if (hapiCount >= 1 || (plH && plH.pct < 90)) {
    let sev = hapiCount >= 2 ? 3 : hapiCount >= 1 ? 2 : 1;
    if (plH && plH.pct < 80) sev = Math.max(sev, 3);
    let note = `${hapiCount} HAPI${hapiCount !== 1 ? 's' : ''} this month`;
    if (plH) note += ` · PLATO HAPI rounding ${plH.pct}% (goal 90%, ${plH.total} rounds)` + (plH.topMissed ? ` · most missed: ${plH.topMissed}` : '');
    scored.push({ key:'skin', sev, note });
  }
  if (pg != null && pg < 75) {
    scored.push({ key:'experience', sev: pg < 65 ? 3 : 2, note: `Latest Press Ganey overall ${pg} (goal ≥75)` });
  }

  const box = document.getElementById('de-suggestion');
  if (!box) return;
  _deRecommendedKeys = scored.map(s => s.key);

  if (!scored.length) {
    box.style.display = 'block';
    box.style.background = 'rgba(37,168,104,0.12)';
    box.style.border = '1px solid rgba(37,168,104,0.35)';
    box.innerHTML = `<span style="font-weight:700;color:var(--green2);">✓ On track</span>
      <span style="color:var(--text2);"> — no flagged KPI this month. Pick any topic below, or use "New Ideas" for an open-floor discussion.</span>`;
  } else {
    scored.sort((a,b) => b.sev - a.sev);
    const top = scored[0];
    const cat = DAILY_EDU_CATEGORIES.find(c => c.key === top.key);
    const isPriority = top.sev >= 3;
    box.style.display = 'block';
    box.style.background = isPriority ? 'rgba(179,35,24,0.12)' : 'rgba(245,158,11,0.12)';
    box.style.border = isPriority ? '1px solid rgba(179,35,24,0.35)' : '1px solid rgba(245,158,11,0.35)';
    box.innerHTML = `<span style="font-weight:700;color:${isPriority ? 'var(--red2)' : 'var(--amber2)'};">${isPriority ? '⚠ Priority' : '● Watch'}</span>
      <span style="color:var(--text2);"> — Recommended focus: <strong style="color:var(--white);">${cat.label}</strong>. ${top.note}.</span>
      ${scored.length > 1 ? `<div style="font-size:10px;color:var(--text3);margin-top:4px;">Also elevated: ${scored.slice(1).map(s => DAILY_EDU_CATEGORIES.find(c=>c.key===s.key).label).join(', ')} — see ★ tabs.</div>` : ''}`;
    _deSelectedCat = top.key;
    _deSelectedTopicIdx = null;
  }
  renderDailyEduTabs();
  renderDailyEduTopics();
  renderDailyEduPreview();
}

function renderDailyEduTabs() {
  const box = document.getElementById('de-tabs');
  if (!box) return;
  if (!_deSelectedCat) _deSelectedCat = DAILY_EDU_CATEGORIES[0].key;
  box.innerHTML = DAILY_EDU_CATEGORIES.map(cat => {
    const active = cat.key === _deSelectedCat;
    const rec = _deRecommendedKeys.includes(cat.key);
    return `<button onclick="deSelectCat('${cat.key}')"
      style="padding:6px 12px;border-radius:16px;font-size:11px;cursor:pointer;white-space:nowrap;
      background:${active ? 'var(--accent2)' : 'var(--slate)'};color:${active ? '#fff' : 'var(--text2)'};
      border:1px solid ${active ? 'var(--accent2)' : 'var(--border)'};">${cat.label}${rec ? ' ★' : ''}</button>`;
  }).join('');
}

function deSelectCat(key) {
  _deSelectedCat = key;
  _deSelectedTopicIdx = null;
  renderDailyEduTabs();
  renderDailyEduTopics();
  renderDailyEduPreview();
}

function renderDailyEduTopics() {
  const box = document.getElementById('de-topics');
  if (!box) return;
  const cat = DAILY_EDU_CATEGORIES.find(c => c.key === _deSelectedCat) || DAILY_EDU_CATEGORIES[0];
  box.innerHTML = cat.topics.map((t, i) => {
    const sel = i === _deSelectedTopicIdx;
    return `<div onclick="deSelectTopic(${i})" style="border:1px solid ${sel ? 'var(--accent2)' : 'var(--border)'};
      background:${sel ? 'rgba(46,125,209,0.12)' : 'var(--slate)'}; border-radius:6px;padding:8px 12px;
      cursor:pointer;font-size:12px;display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;color:var(--white);">
      <span style="font-weight:600;">${t.title}</span><span style="color:var(--text3);font-size:10px;white-space:nowrap;">${t.time}</span>
    </div>`;
  }).join('');
}

function deSelectTopic(i) {
  _deSelectedTopicIdx = i;
  renderDailyEduTopics();
  renderDailyEduPreview();
}

function renderDailyEduPreview() {
  const wrap = document.getElementById('de-preview-wrap');
  if (!wrap) return;
  const cat = DAILY_EDU_CATEGORIES.find(c => c.key === _deSelectedCat);
  if (!cat || _deSelectedTopicIdx == null) { wrap.style.display = 'none'; return; }
  const t = cat.topics[_deSelectedTopicIdx];
  wrap.style.display = 'block';
  document.getElementById('de-pv-title').textContent = t.title;
  document.getElementById('de-pv-meta').textContent = `${cat.label} · ${t.time}`;
  document.getElementById('de-pv-points').innerHTML = t.points.map(p => `<li>${p}</li>`).join('');
  document.getElementById('de-pv-ref').textContent = t.ref;
}

function deShuffleTopic() {
  const cat = DAILY_EDU_CATEGORIES.find(c => c.key === _deSelectedCat);
  if (!cat || cat.topics.length < 2) return;
  let next;
  do { next = Math.floor(Math.random() * cat.topics.length); } while (next === _deSelectedTopicIdx);
  _deSelectedTopicIdx = next;
  renderDailyEduTopics();
  renderDailyEduPreview();
}

function dailyEduSaveForToday() {
  const cat = DAILY_EDU_CATEGORIES.find(c => c.key === _deSelectedCat);
  if (!cat || _deSelectedTopicIdx == null) { alert('Pick a topic first.'); return; }
  const t = cat.topics[_deSelectedTopicIdx];
  if (!state.dailyEduLog) state.dailyEduLog = {};
  state.dailyEduLog[dailyEduTodayKey()] = {
    category: cat.label, title: t.title, time: t.time, points: t.points, ref: t.ref, savedAt: new Date().toISOString()
  };
  persistSave();
  const status = document.getElementById('de-save-status');
  if (status) status.textContent = `✓ Saved for today — will print on the Manager Report`;
  showSaveBanner('💾 Daily huddle topic saved for today');
}

function initDailyEduTab() {
  if (!document.getElementById('de-tabs')) return;
  dailyEduSuggest();
  const todays = (state.dailyEduLog || {})[dailyEduTodayKey()];
  const status = document.getElementById('de-save-status');
  if (todays && status) status.textContent = `✓ Today's topic saved: ${todays.title}`;
}


// ── Unit Daily Report: Staffing + Education Due + Float/Sitter ──
function printUnitDailyReport() {
  const dateKey = state.activeBoardDate;
  if (!dateKey) { alert('No staffing date loaded. Import a UKG file first.'); return; }

  const shifts  = state.placements[dateKey] || {};
  const dateObj = new Date(dateKey + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const printedAt = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const today = dateKey;

  // ── Helpers ──────────────────────────────────────────────────
  function getStaff(shift, role) { return (shifts[shift] || []).filter(p => p.role === role); }
  function nameCell(name, shift) {
    const items = state.pendingEdu[name] || [];
    const eduFlag = items.length > 0 ? ` <span style="font-size:8pt;color:#b45309;font-weight:700;">[📚${items.length}]</span>` : '';
    let orientFlag = '';
    if (state.empOrientation[name]) {
      const prec = shift && state.orientAssign && state.orientAssign[`${dateKey}|${shift}|${name}`]
        ? state.orientAssign[`${dateKey}|${shift}|${name}`].split(',')[0].trim() : '';
      orientFlag = ` <span style="font-size:7pt;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 4px;border-radius:3px;">ORIENT${prec ? ' → '+prec : ''}</span>`;
    }
    const _p = shift ? ((state.placements[dateKey]||{})[shift]||[]).find(x=>x.name===name) : null;
    return `${name}${eduFlag}${orientFlag}`;
  }
  function chargeTag(shift, name) {
    return state.chargeNurses[`${dateKey}|${shift}`] === name
      ? ' <span style="font-size:7pt;font-weight:700;color:#1d4ed8;background:#dbeafe;padding:1px 4px;border-radius:3px;white-space:nowrap;">CH</span>' : '';
  }
  function noteFor(k) { return state.notes[`${dateKey}|${k}`] || ''; }

  // ── PAGE 1: Staffing ─────────────────────────────────────────
  // UC
  const ucDay=getStaff('0700-1500','UC'), ucEve=getStaff('1500-2300','UC'), ucNight=getStaff('2300-0700','UC');
  const ucMax = Math.max(2, ucDay.length, ucEve.length, ucNight.length);
  let ucRows = '';
  for (let i=0; i<ucMax; i++) {
    ucRows += `<tr><td>${ucDay[i]   ? nameCell(ucDay[i].name,'0700-1500')   : ''}</td>
                   <td>${ucEve[i]   ? nameCell(ucEve[i].name,'1500-2300')   : ''}</td>
                   <td>${ucNight[i] ? nameCell(ucNight[i].name,'2300-0700') : ''}</td></tr>`;
  }

  // RN — 2 columns: Day (0700-1500 + 1500-1900), Night (1900-0700)
  const rnDay=getStaff('0700-1500','RN'), rnEve=getStaff('1500-1900','RN'), rnNight=getStaff('1900-0700','RN');
  const _rnSeen=new Set(); const rnDayAll=[...rnDay,...rnEve].filter(p=>{if(_rnSeen.has(p.name))return false;_rnSeen.add(p.name);return true;});
  const rnMax = Math.max(6, rnDayAll.length, rnNight.length);
  let rnRows = '';
  for (let i=0; i<rnMax; i++) {
    const d=rnDayAll[i], n=rnNight[i];
    const dShift = d && rnDay.some(x=>x.name===d.name) ? '0700-1500' : '1500-1900';
    rnRows += `<tr><td>${d ? nameCell(d.name,dShift)+chargeTag(dShift,d.name) : ''}</td>
                   <td>${n ? nameCell(n.name,'1900-0700')+chargeTag('1900-0700',n.name) : ''}</td></tr>`;
  }

  // LPN — 2 columns: Day (0700-1500 + 1500-1900), Night (1900-0700)
  const lpnDay=getStaff('0700-1500','LPN'), lpnEve=getStaff('1500-1900','LPN'), lpnNight=getStaff('1900-0700','LPN');
  const _lpnSeen=new Set(); const lpnDayAll=[...lpnDay,...lpnEve].filter(p=>{if(_lpnSeen.has(p.name))return false;_lpnSeen.add(p.name);return true;});
  const lpnMax = Math.max(2, lpnDayAll.length, lpnNight.length);
  let lpnRows = '';
  for (let i=0; i<lpnMax; i++) {
    const d=lpnDayAll[i], n=lpnNight[i];
    const dShift = d && lpnDay.some(x=>x.name===d.name) ? '0700-1500' : '1500-1900';
    lpnRows += `<tr><td>${d ? nameCell(d.name,dShift) : ''}</td>
                    <td>${n ? nameCell(n.name,'1900-0700') : ''}</td></tr>`;
  }

  // Team Nursing (3C triad) — Charge / RN 1 / RN 2 / LPN, same data as the Board's Team Nursing section
  function tnCellForKey(key) {
    const charge = state.charge3C[key] || '';
    const s3c    = state.staff3C[key]  || {};
    const parts = [];
    if (charge)  parts.push(`<div>${nameCell(charge)} <span style="font-size:7pt;font-weight:700;color:#7c3aed;">★ 3C CHARGE</span></div>`);
    if (s3c.rn1) parts.push(`<div>${nameCell(s3c.rn1)} <span style="font-size:7pt;font-weight:700;color:#1d4ed8;">RN 1</span></div>`);
    if (s3c.rn2) parts.push(`<div>${nameCell(s3c.rn2)} <span style="font-size:7pt;font-weight:700;color:#1d4ed8;">RN 2</span></div>`);
    if (s3c.lpn) parts.push(`<div>${nameCell(s3c.lpn)} <span style="font-size:7pt;font-weight:700;color:#7c3aed;">LPN</span></div>`);
    return parts.length ? parts.join('') : '<span style="color:#9ca3af;font-style:italic;">Not yet assigned</span>';
  }
  const teamRows = `<tr><td>${tnCellForKey(`${dateKey}|0700-1500`)}</td><td>${tnCellForKey(`${dateKey}|1900-0700`)}</td></tr>`;

  // CA
  const caD=getStaff('0630-1430','CA'), caE1=getStaff('1430-1830','CA'), caE2=getStaff('1830-2230','CA'), caN=getStaff('2230-0630','CA');
  const caMax = Math.max(4, caD.length, caE1.length, caE2.length, caN.length);
  function caTimeTag(p, sk) {
    if (!p) return '';
    const nm = nameCell(p.name, sk);
    // Check if this CA also spans into adjacent columns (non-standard end time)
    const inE2 = caE2.some(x=>x.name===p.name), inN = caN.some(x=>x.name===p.name);
    const inE1 = caE1.some(x=>x.name===p.name), inD = caD.some(x=>x.name===p.name);
    return nm;
  }
  let caRows = '';
  for (let i=0; i<caMax; i++) {
    caRows += `<tr><td>${caD[i]  ? caTimeTag(caD[i],'0630-1430')  : ''}</td>
                   <td>${caE1[i] ? caTimeTag(caE1[i],'1430-1830') : ''}</td>
                   <td>${caE2[i] ? caTimeTag(caE2[i],'1830-2230') : ''}</td>
                   <td>${caN[i]  ? caTimeTag(caN[i],'2230-0630')  : ''}</td></tr>`;
  }

  // Shift notes
  const notes = [
    noteFor('GENERAL') ? `<tr><td colspan="2" style="font-weight:700;">General</td><td colspan="2">${noteFor('GENERAL')}</td></tr>` : '',
    noteFor('DAY')     ? `<tr><td colspan="2" style="font-weight:700;">Day</td><td colspan="2">${noteFor('DAY')}</td></tr>` : '',
    noteFor('EVE')     ? `<tr><td colspan="2" style="font-weight:700;">Evening</td><td colspan="2">${noteFor('EVE')}</td></tr>` : '',
    noteFor('NIGHT')   ? `<tr><td colspan="2" style="font-weight:700;">Night</td><td colspan="2">${noteFor('NIGHT')}</td></tr>` : '',
  ].filter(Boolean).join('');

  // Census
  const cDay = state.census?.day || '—', cEve = state.census?.eve || '—', cNight = state.census?.night || '—';

  // ── PAGE 2: Education Due ────────────────────────────────────
  const scheduledNames = new Set(Object.values(shifts).flat().map(p => p.name));
  const allScheduled   = MASTER_STAFF.filter(s => scheduledNames.has(s.name));

  // Certs expiring/due
  function certClass(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00'), now = new Date(), diff = (d-now)/86400000;
    if (diff < 0)  return 'expired';
    if (diff < 30) return 'critical';
    if (diff < 90) return 'soon';
    return 'ok';
  }

  const CERT_FIELDS = [
    { key:'bls',     label:'BLS/CPR' },
    { key:'acls',    label:'ACLS' },
    { key:'nihss',   label:'NIHSS' },
    { key:'pivInsertion', label:'PIV Insertion' },
    { key:'bloodAdmin',   label:'Blood Admin' },
    { key:'telemetry',    label:'Telemetry' },
    { key:'ecgAcquisition', label:'12-Lead ECG' },
    { key:'tncc',    label:'TNCC' },
    { key:'cen',     label:'CEN' },
    { key:'pals',    label:'PALS' },
    ...[1,2,3,4,5].map(n => ({ key:`custom${n}_date`, label:`Custom ${n}`, labelKey:`custom${n}_label` })),
  ];

  let eduRows = '';
  let hasEduData = false;
  allScheduled.forEach(s => {
    const certs = state.certs[s.name] || {};
    const pending = state.pendingEdu[s.name] || [];
    const dueCerts = CERT_FIELDS.filter(f => {
      const dt = certs[f.key];
      const cls = certClass(dt);
      return dt && (cls === 'expired' || cls === 'critical' || cls === 'soon');
    });
    if (!dueCerts.length && !pending.length) return;
    hasEduData = true;
    const rCol = s.job === 'RN' ? '#1d4ed8' : s.job === 'LPN' ? '#7c3aed' : s.job === 'CA' ? '#0e7490' : '#374151';
    eduRows += `<tr style="background:#f8fafc;">
      <td style="font-weight:700;padding:5px 8px;border:1px solid #d1d5db;">${s.name}</td>
      <td style="padding:5px 8px;border:1px solid #d1d5db;color:${rCol};font-weight:700;">${s.job}</td>
      <td style="padding:5px 8px;border:1px solid #d1d5db;">
        ${dueCerts.map(f => {
          const dt = certs[f.key];
          const cls = certClass(dt);
          const lbl = f.labelKey ? (certs[f.labelKey] || f.label) : f.label;
          const color = cls === 'expired' ? '#dc2626' : '#d97706';
          const badge = cls === 'expired' ? 'EXPIRED' : 'EXPIRING';
          return `<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 6px;border-radius:10px;background:${cls==='expired'?'#fee2e2':'#fef3c7'};color:${color};font-size:8pt;font-weight:700;">${lbl} — ${badge} ${dt}</span>`;
        }).join('')}
        ${pending.map(item => `<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 6px;border-radius:10px;background:#dbeafe;color:#1e40af;font-size:8pt;font-weight:700;">📚 ${item}</span>`).join('')}
      </td>
    </tr>`;
  });

  if (!hasEduData) {
    eduRows = `<tr><td colspan="3" style="padding:14px;text-align:center;color:#6b7280;font-style:italic;">✅ All scheduled staff current on certifications and education</td></tr>`;
  }

  // ── PAGE 3: Float & Sitter — filtered to today's scheduled staff ──
  const floatData = window._floatSummary || {};
  // Filter float data to only staff scheduled today
  let floatNames = Object.keys(floatData).filter(name => scheduledNames.has(name));

  // Full table is listed alphabetically — "who's due" ranking now lives in the
  // Quick Reference top-3-by-role blocks below instead of a manual sort choice.
  floatNames.sort((a,b) => a.localeCompare(b));

  // ── Quick Reference: Top 2 by role (RN/LPN/CA), split by shift, for OT, Call Off, Sit, Float ──
  // Date fields are M/D/YYYY strings; missing/'—' values fall back to the
  // staff member's start date (hire date) so everyone still ranks somewhere
  // rather than being dropped from the list.
  function udrParseDate(s) {
    if (!s || s === '—') return null;
    const p = String(s).split('/');
    if (p.length !== 3) return null;
    const t = new Date(+p[2], +p[0]-1, +p[1]).getTime();
    return isNaN(t) ? null : t;
  }
  function staffRoleLookup(name) {
    const m = MASTER_STAFF.find(s => s.name === name);
    if (m) return m.job;
    return (floatData[name] || {}).role || '';
  }
  function staffIsAgency(name) {
    return !!(state.agencyDates && state.agencyDates[name] && state.agencyDates[name].isAgency);
  }
  // Which half of the day someone's scheduled shift falls in, from today's placements.
  const NIGHT_SHIFT_KEYS = ['1900-0700','1830-2230','2230-0630','1500-2300','2300-0700'];
  function shiftHalfForName(name) {
    for (const shiftKey of Object.keys(shifts)) {
      if ((shifts[shiftKey]||[]).some(p => p.name === name)) {
        return NIGHT_SHIFT_KEYS.includes(shiftKey) ? 'NIGHT' : 'DAY';
      }
    }
    return null;
  }
  const QR_ROLES  = ['RN','LPN','CA'];
  const QR_HALVES = ['DAY','NIGHT'];
  function topNByRoleHalf(list, sortFn, n) {
    const result = { DAY:{}, NIGHT:{} };
    QR_HALVES.forEach(half => {
      QR_ROLES.forEach(role => {
        result[half][role] = list.filter(x => x.role === role && x.half === half).sort(sortFn).slice(0, n);
      });
    });
    return result;
  }

  // Staff on OT — current pay period, highest OT hours first
  const qrPP = currentPayPeriod();
  const otCandidates = [];
  scheduledNames.forEach(name => {
    const entries = (state.otLog||{})[name] || [];
    const entry = entries.find(e => e.payPeriod === qrPP);
    if (entry && entry.otHrs > 0) otCandidates.push({ name, role: staffRoleLookup(name), otHrs: entry.otHrs, half: shiftHalfForName(name), phone: (state.phones && state.phones[name]) || '' });
  });
  const otTop = topNByRoleHalf(otCandidates, (a,b) => b.otHrs - a.otHrs, 2);

  // Call Off / Sit / Float — oldest date on record first (most "due").
  // If no date is on file, fall back to start date (hire date) so the person
  // still ranks instead of being excluded. filterFn can further exclude
  // ineligible staff (used for the agency call-off cooldown below).
  function buildDueList(primaryKey, altKey, filterFn) {
    const list = [];
    scheduledNames.forEach(name => {
      const d = floatData[name] || {};
      if (filterFn && !filterFn(name, d)) return;
      const raw = d[primaryKey] || d[altKey] || '';
      let ts = udrParseDate(raw);
      let display = raw;
      let neverRecorded = false;
      if (ts === null) {
        neverRecorded = true;
        const hireRaw = (state.hireDates || {})[name] || '';
        if (hireRaw) {
          const hd = new Date(hireRaw + 'T12:00:00');
          if (!isNaN(hd.getTime())) {
            ts = hd.getTime();
            display = hd.toLocaleDateString('en-US', { month:'numeric', day:'numeric', year:'numeric' }) + ' (start)';
          }
        }
      }
      if (ts !== null) list.push({ name, role: staffRoleLookup(name), ts, raw: display, isAgency: staffIsAgency(name), half: shiftHalfForName(name), neverRecorded, phone: (state.phones && state.phones[name]) || '' });
    });
    return list;
  }

  // Agency staff can only be called off once every 2 weeks — if their last
  // call-off was under 14 days before the report date, they're not eligible
  // to appear in Call Off First again yet.
  function calloffEligible(name, d) {
    if (!staffIsAgency(name)) return true;
    const lastRaw = d.lastCallOff || d.calloff || '';
    const lastTs = udrParseDate(lastRaw);
    if (lastTs === null) return true; // no record on file — eligible
    const daysSince = (dateObj.getTime() - lastTs) / 86400000;
    return daysSince >= 14;
  }

  const callOffList = buildDueList('lastCallOff', 'calloff', calloffEligible);
  const sitList      = buildDueList('lastSitter', 'sitter');
  const floatList    = buildDueList('lastFloat', 'float');

  // Priority order: (1) agency RNs always first among RNs, (2) staff with NO
  // record at all outrank staff who have an actual date on file — even an old
  // one — since "never done it" is more due than "did it a while ago", (3)
  // within either group, oldest timestamp first (start date for the never-
  // recorded group, actual date for the rest).
  const agencyRNFirstSort = (a,b) => {
    if (a.role === 'RN' && b.role === 'RN' && a.isAgency !== b.isAgency) return a.isAgency ? -1 : 1;
    if (a.neverRecorded !== b.neverRecorded) return a.neverRecorded ? -1 : 1;
    return a.ts - b.ts;
  };

  const callOffTop = topNByRoleHalf(callOffList, agencyRNFirstSort, 2);
  const sitTop      = topNByRoleHalf(sitList, agencyRNFirstSort, 2);
  const floatTop    = topNByRoleHalf(floatList, agencyRNFirstSort, 2);

  function qrHalfTableHtml(halfLabel, dataForHalf, fmt) {
    let body = '';
    for (let i=0; i<2; i++) {
      body += '<tr>' + QR_ROLES.map(role => {
        const item = dataForHalf[role][i];
        const agencyTag = item && item.isAgency ? ' <span style="color:#7c3aed;font-weight:700;">(agency)</span>' : '';
        const phoneLine = item && item.phone ? `<br><span style="color:#374151;">📞 ${item.phone}</span>` : '';
        return `<td style="padding:3px 6px;border:1px solid #d1d5db;">${item ? `${item.name}${agencyTag} <span style="color:#6b7280;">— ${fmt(item)}</span>${phoneLine}` : '<span style="color:#9ca3af;">—</span>'}</td>`;
      }).join('') + '</tr>';
    }
    return `
      <div style="flex:1;min-width:0;">
        <div style="font-size:8pt;font-weight:700;color:#374151;margin-bottom:2px;">${halfLabel}</div>
        <table style="width:100%;border-collapse:collapse;font-size:8pt;">
          <thead><tr style="background:#f0f0f0;">
            <th style="padding:3px 6px;border:1px solid #999;text-align:left;width:33.33%;">RN</th>
            <th style="padding:3px 6px;border:1px solid #999;text-align:left;width:33.33%;">LPN</th>
            <th style="padding:3px 6px;border:1px solid #999;text-align:left;width:33.33%;">CA</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }
  function qrTableHtml(icon, title, dataByHalf, fmt) {
    return `
      <div style="margin-bottom:10px;">
        <div style="font-size:9.5pt;font-weight:700;color:#111;margin-bottom:3px;">${icon} ${title}</div>
        <div style="display:flex;gap:10px;">
          ${qrHalfTableHtml('0700–1900', dataByHalf.DAY, fmt)}
          ${qrHalfTableHtml('1900–0700', dataByHalf.NIGHT, fmt)}
        </div>
      </div>`;
  }

  const quickRefHtml = `
    <div style="margin-bottom:16px;padding:10px 12px;background:#f8fafc;border:1px solid #d1d5db;border-radius:6px;">
      <div style="font-size:10.5pt;font-weight:700;color:#111;margin-bottom:8px;">⚡ Quick Reference — Top 2 by Role, by Shift</div>
      ${qrTableHtml('🕒','Staff on OT (this pay period)', otTop, item => item.otHrs.toFixed(1)+' hrs')}
      ${qrTableHtml('📵','Call Off First (agency RNs always first, then oldest call-off date)', callOffTop, item => item.raw)}
      ${qrTableHtml('🛏️','Sit First (agency RNs always first, then oldest sitter date)', sitTop, item => item.raw)}
      ${qrTableHtml('🔁','Float First (agency RNs always first, then oldest float date)', floatTop, item => item.raw)}
      <div style="font-size:7.5pt;color:#6b7280;margin-top:2px;">Dates marked (start) mean no float/sitter/call-off record was on file — that staff member's start date is shown, and they rank ahead of anyone who has an actual (even old) date on record. Agency RNs are always ranked ahead of regular RNs in every category. Agency staff who called off within the last 14 days are excluded from Call Off First.</div>
    </div>`;

  let floatHtml = '';
  if (floatNames.length) {
    const fRows = floatNames.map(name => {
      const d = floatData[name];
      // Support both field name schemas (Google Sheet CSV vs UKG parser)
      const fFloat   = d.lastFloat    || d.float   || '—';
      const fSitter  = d.lastSitter   || d.sitter  || '—';
      const fCalloff = d.lastCallOff  || d.calloff || '—';
      const fMandate = d.lastMandation|| d.mandate || '—';
      const phone = (state.phones && state.phones[name]) ? state.phones[name] : '—';
      return `<tr>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-weight:600;">${name}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${phone}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${fFloat}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${fSitter}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${fCalloff}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${fMandate}</td>
      </tr>`;
    }).join('');
    floatHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
        <thead><tr style="background:#f0f0f0;">
          <th style="padding:6px 8px;border:1px solid #999;text-align:left;">Staff Name</th>
          <th style="padding:6px 8px;border:1px solid #999;text-align:center;">Phone</th>
          <th style="padding:6px 8px;border:1px solid #999;text-align:center;">Float Date</th>
          <th style="padding:6px 8px;border:1px solid #999;text-align:center;">Sitter Date</th>
          <th style="padding:6px 8px;border:1px solid #999;text-align:center;">Call-Off Date</th>
          <th style="padding:6px 8px;border:1px solid #999;text-align:center;">Mandate</th>
        </tr></thead>
        <tbody>${fRows}</tbody>
      </table>`;
  } else if (Object.keys(floatData).length === 0) {
    floatHtml = `<p style="color:#6b7280;font-style:italic;text-align:center;padding:20px 0;">No float/sitter data loaded. Connect your Google Sheet in the Board tab.</p>`;
  } else {
    floatHtml = `<p style="color:#6b7280;font-style:italic;text-align:center;padding:20px 0;">No float/sitter records found for today's scheduled staff.</p>`;
  }

  // ── Build & open ─────────────────────────────────────────────
  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>3B Unit Daily Report — ${dateLabel}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:10pt; color:#111; background:#fff; }
    .page { padding:22px 28px 20px; max-width:900px; margin:0 auto; }
    .page-break { page-break-before:always; padding-top:22px; }
    h1  { font-size:20pt; font-weight:700; text-align:center; }
    h2  { font-size:11pt; text-align:center; color:#444; font-weight:400; margin-bottom:16px; }
    h3  { font-size:11pt; font-weight:700; margin:12px 0 5px; border-bottom:2px solid #111; padding-bottom:2px; }
    h4  { font-size:10pt; font-weight:700; margin:14px 0 5px; color:#1d4ed8; }
    .logo { text-align:right; font-size:16pt; margin-bottom:8px; }
    .logo em { font-style:italic; }
    .census-bar { display:flex; gap:24px; background:#f0f4f8; border:1px solid #d1d5db; border-radius:5px; padding:8px 16px; margin-bottom:14px; }
    .census-item { text-align:center; }
    .census-val  { font-size:18pt; font-weight:700; color:#1d4ed8; }
    .census-lbl  { font-size:8pt; color:#6b7280; text-transform:uppercase; letter-spacing:.3px; }
    .staff-table { width:100%; border-collapse:collapse; margin-bottom:6px; font-size:9.5pt; }
    .staff-table th { background:#f0f0f0; padding:5px 7px; border:1px solid #ccc; text-align:center; font-size:9pt; }
    .staff-table td { padding:5px 7px; border:1px solid #d1d5db; vertical-align:middle; text-align:center; }
    .notes-table { width:100%; border-collapse:collapse; margin-top:8px; font-size:9pt; }
    .notes-table td { padding:5px 8px; border:1px solid #d1d5db; }
    .footer { display:flex; justify-content:space-between; font-size:8pt; color:#666; margin-top:14px; padding-top:8px; border-top:1px solid #d1d5db; }
    @media print {
      @page { size:letter portrait; margin:.45in .5in; }
      body { font-size:9.5pt; }
      .page { padding:0; max-width:100%; }
      .no-print { display:none !important; }
    }
  </style>
  </head><body>

  <!-- PAGE 1: STAFFING -->
  <div class="page">
    <div class="logo">Arnot<em>Health</em></div>
    <h1>3B Tele Med Surg</h1>
    <h2>${dateLabel}</h2>

    <div class="census-bar">
      <div class="census-item"><div class="census-val">${cDay}</div><div class="census-lbl">Day Census</div></div>
      <div class="census-item"><div class="census-val">${cEve}</div><div class="census-lbl">Evening Census</div></div>
      <div class="census-item"><div class="census-val">${cNight}</div><div class="census-lbl">Night Census</div></div>
    </div>

    <h3>Unit Clerk</h3>
    <table class="staff-table">
      <thead><tr><th>Day (0700–1500)</th><th>Evening (1500–2300)</th><th>Night (2300–0700)</th></tr></thead>
      <tbody>${ucRows}</tbody>
    </table>

    <h3>RN</h3>
    <table class="staff-table">
      <thead><tr><th>Day (0700–1900)</th><th>Night (1900–0700)</th></tr></thead>
      <tbody>${rnRows}</tbody>
    </table>

    <h3>Team Nursing <span style="font-size:8pt;font-weight:400;color:#6b7280;">— 3C Triad</span></h3>
    <table class="staff-table">
      <thead><tr><th>Day (0700–1900)</th><th>Night (1900–0700)</th></tr></thead>
      <tbody>${teamRows}</tbody>
    </table>

    <h3>LPN</h3>
    <table class="staff-table">
      <thead><tr><th>Day (0700–1900)</th><th>Night (1900–0700)</th></tr></thead>
      <tbody>${lpnRows}</tbody>
    </table>

    <h3>Clinical Assistants</h3>
    <table class="staff-table">
      <thead><tr><th>0630–1430</th><th>1430–1830</th><th>1830–2230</th><th>2230–0630</th></tr></thead>
      <tbody>${caRows}</tbody>
    </table>

    ${notes ? `<h3>Shift Notes</h3><table class="notes-table"><tbody>${notes}</tbody></table>` : ''}

    <div style="font-size:8pt;color:#6b7280;margin-top:8px;">📚 = Pending education &nbsp;·&nbsp; CH = Charge RN</div>
    <div class="footer">
      <span>3B Tele Med Surg · AOMC Nursing Operations</span>
      <span>Printed: ${printedAt}</span>
    </div>
  </div>

  <!-- PAGE 2: EDUCATION DUE -->
  <div class="page page-break">
    <div class="logo">Arnot<em>Health</em></div>
    <h1>Education &amp; Certification Status</h1>
    <h2>${dateLabel} · Scheduled Staff Only</h2>

    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="padding:6px 8px;border:1px solid #999;text-align:left;width:35%;">Staff Name</th>
          <th style="padding:6px 8px;border:1px solid #999;text-align:left;width:8%;">Role</th>
          <th style="padding:6px 8px;border:1px solid #999;text-align:left;">Expiring / Due Items</th>
        </tr>
      </thead>
      <tbody>${eduRows}</tbody>
    </table>

    <div style="margin-top:14px;padding:8px 12px;background:#f0f4f8;border-radius:4px;font-size:8.5pt;color:#374151;">
      <strong>Legend:</strong>
      &nbsp; <span style="background:#fee2e2;color:#dc2626;padding:1px 7px;border-radius:8px;font-weight:700;font-size:8pt;">EXPIRED</span> Past due
      &nbsp; <span style="background:#fef3c7;color:#d97706;padding:1px 7px;border-radius:8px;font-weight:700;font-size:8pt;">EXPIRING</span> Due within 90 days
      &nbsp; <span style="background:#dbeafe;color:#1e40af;padding:1px 7px;border-radius:8px;font-weight:700;font-size:8pt;">📚 Pending</span> Education assigned
    </div>

    <div class="footer">
      <span>3B Tele Med Surg · AOMC Nursing Operations</span>
      <span>Printed: ${printedAt}</span>
    </div>
  </div>

  <!-- PAGE 3: FLOAT & SITTER -->
  <div class="page page-break">
    <div class="logo">Arnot<em>Health</em></div>
    <h1>Float &amp; Sitter Tracking</h1>
    <h2>${dateLabel}</h2>

    ${quickRefHtml}

    ${floatHtml}

    <div style="margin-top:16px;padding:8px 12px;background:#f0f4f8;border-radius:4px;font-size:8.5pt;color:#374151;">
      Data sourced from Google Sheet. Connect in Board tab → Float & Sitter section → ⚙️ Sheet Setup.
    </div>

    <div class="footer">
      <span>3B Tele Med Surg · AOMC Nursing Operations</span>
      <span>Printed: ${printedAt}</span>
    </div>
  </div>

  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ── Nursing Services: full-screen staffing-only print ──
function printNursingServices() {
  const dateKey = state.activeBoardDate;
  if (!dateKey) { alert('No staffing date loaded. Import a UKG file first.'); return; }

  const shifts   = state.placements[dateKey] || {};
  const dateObj  = new Date(dateKey + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const now = new Date();
  const printedAt = now.toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  function getStaff(shift, role) { return (shifts[shift] || []).filter(p => p.role === role); }
  function nameCell(name, shift) {
    const items = state.pendingEdu[name] || [];
    const eduFlag = items.length > 0 ? `<span class="ps-edu-flag">📚${items.length}</span>` : '';
    let orientFlag = '';
    if (state.empOrientation[name]) {
      const prec = shift && state.orientAssign && state.orientAssign[`${dateKey}|${shift}|${name}`]
        ? state.orientAssign[`${dateKey}|${shift}|${name}`].split(',')[0].trim() : '';
      orientFlag = ` <span style="font-size:7.5pt;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 5px;border-radius:3px;letter-spacing:0.2px;">ORIENT${prec ? ' → '+prec : ''}</span>`;
    }
    const _p = shift ? ((state.placements[dateKey]||{})[shift]||[]).find(x=>x.name===name) : null;
    return `${name}${eduFlag}${orientFlag}`;
  }
  function chargeTag3B(shift, name) {
    return state.chargeNurses[`${dateKey}|${shift}`] === name
      ? ' <span style="font-size:8pt;font-weight:700;color:#1d4ed8;background:#dbeafe;padding:1px 4px;border-radius:3px;">CH 3B</span>' : '';
  }
  function charge3CName(shift) { return state.charge3C[`${dateKey}|${shift}`] || ''; }
  function chargeTag3C_person(shift, name) {
    return charge3CName(shift) === name && name
      ? ' <span style="font-size:8pt;font-weight:700;color:#6d28d9;background:#ede9fe;padding:1px 4px;border-radius:3px;">CH 3C</span>' : '';
  }
  function noteFor(k) { return state.notes[`${dateKey}|${k}`] || ''; }

  // UC
  const ucDay   = getStaff('0700-1500', 'UC');
  const ucEve   = getStaff('1500-2300', 'UC');
  const ucNight = getStaff('2300-0700', 'UC');
  const ucMax   = Math.max(2, ucDay.length, ucEve.length, ucNight.length);
  let ucRows = '';
  for (let i = 0; i < ucMax; i++) {
    ucRows += `<tr>
      <td>${ucDay[i]   ? nameCell(ucDay[i].name,'0700-1500')   : ''}</td>
      <td>${ucEve[i]   ? nameCell(ucEve[i].name,'1500-2300')   : ''}</td>
      <td>${ucNight[i] ? nameCell(ucNight[i].name,'2300-0700') : ''}</td>
    </tr>`;
  }

  // RN — Day (0700-1500 + 1500-1900), Night (1900-0700)
  const rnDay   = getStaff('0700-1500', 'RN');
  const rnEve1  = getStaff('1500-1900', 'RN');
  const rnNight = getStaff('1900-0700', 'RN');
  const _rnSeen2=new Set(); const rnDayAll=[...rnDay,...rnEve1].filter(p=>{if(_rnSeen2.has(p.name))return false;_rnSeen2.add(p.name);return true;});
  const rnMax   = Math.max(6, rnDayAll.length, rnNight.length);
  let rnRows = '';
  for (let i = 0; i < rnMax; i++) {
    const dp = rnDayAll[i], np = rnNight[i];
    const dShift = dp && rnDay.some(x=>x.name===dp.name) ? '0700-1500' : '1500-1900';
    rnRows += '<tr>' +
      '<td>' + (dp ? nameCell(dp.name,dShift) + chargeTag3B(dShift,dp.name) + chargeTag3C_person(dShift,dp.name) : '') + '</td>' +
      '<td>' + (np ? nameCell(np.name,'1900-0700') + chargeTag3B('1900-0700',np.name) + chargeTag3C_person('1900-0700',np.name) : '') + '</td>' +
    '</tr>';
  }

  // LPN — Day (0700-1500 + 1500-1900), Night (1900-0700)
  const lpnDay   = getStaff('0700-1500', 'LPN');
  const lpnEve1  = getStaff('1500-1900', 'LPN');
  const lpnNight = getStaff('1900-0700', 'LPN');
  const _lpnSeen2=new Set(); const lpnDayAll=[...lpnDay,...lpnEve1].filter(p=>{if(_lpnSeen2.has(p.name))return false;_lpnSeen2.add(p.name);return true;});
  const lpnMax   = Math.max(2, lpnDayAll.length, lpnNight.length);
  let lpnRows = '';
  for (let i = 0; i < lpnMax; i++) {
    const dp = lpnDayAll[i], np = lpnNight[i];
    const dShift = dp && lpnDay.some(x=>x.name===dp.name) ? '0700-1500' : '1500-1900';
    lpnRows += '<tr>' +
      '<td>' + (dp ? nameCell(dp.name,dShift) : '') + '</td>' +
      '<td>' + (np ? nameCell(np.name,'1900-0700') : '') + '</td>' +
    '</tr>';
  }

  // Team Nursing (3C triad) — Charge / RN 1 / RN 2 / LPN
  function tnCellForKey2(key) {
    const charge = state.charge3C[key] || '';
    const s3c    = state.staff3C[key]  || {};
    const parts = [];
    if (charge)  parts.push(`<div>${nameCell(charge)} <span style="font-size:7pt;font-weight:700;color:#7c3aed;">★ 3C CHARGE</span></div>`);
    if (s3c.rn1) parts.push(`<div>${nameCell(s3c.rn1)} <span style="font-size:7pt;font-weight:700;color:#1d4ed8;">RN 1</span></div>`);
    if (s3c.rn2) parts.push(`<div>${nameCell(s3c.rn2)} <span style="font-size:7pt;font-weight:700;color:#1d4ed8;">RN 2</span></div>`);
    if (s3c.lpn) parts.push(`<div>${nameCell(s3c.lpn)} <span style="font-size:7pt;font-weight:700;color:#7c3aed;">LPN</span></div>`);
    return parts.length ? parts.join('') : '<span style="color:#9ca3af;font-style:italic;">Not yet assigned</span>';
  }
  const teamRows2 = `<tr><td>${tnCellForKey2(`${dateKey}|0700-1500`)}</td><td>${tnCellForKey2(`${dateKey}|1900-0700`)}</td></tr>`;

  // CA
  const caDay   = getStaff('0630-1430', 'CA');
  const caEve1  = getStaff('1430-1830', 'CA');
  const caEve2  = getStaff('1830-2230', 'CA');
  const caNight = getStaff('2230-0630', 'CA');
  const caMax   = Math.max(4, caDay.length, caEve1.length, caEve2.length, caNight.length);
  function caTag(p, sk) {
    if (!p) return '';
    const nm = nameCell(p.name, sk);
    // time badges removed
    return nm;
  }
  let caRows = '';
  for (let i = 0; i < caMax; i++) {
    caRows += `<tr>
      <td>${caDay[i]   ? caTag(caDay[i],'0630-1430')   : ''}</td>
      <td>${caEve1[i]  ? caTag(caEve1[i],'1430-1830')  : ''}</td>
      <td>${caEve2[i]  ? caTag(caEve2[i],'1830-2230')  : ''}</td>
      <td>${caNight[i] ? caTag(caNight[i],'2230-0630') : ''}</td>
    </tr>`;
  }

  // Notes
  const noteDay   = noteFor('DAY');
  const noteEve   = noteFor('EVE');
  const noteNight = noteFor('NIGHT');
  const noteGen   = noteFor('GENERAL');

  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups for this page and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <title>3B Nursing Services — ${dateLabel}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:11pt; color:#111; background:#fff; }
    .ps-page { width:100%; max-width:900px; margin:0 auto; padding:28px 32px 24px; }
    .ps-title { font-size:22pt; font-weight:700; text-align:center; margin-bottom:4px; }
    .ps-date  { font-size:12pt; text-align:center; color:#444; margin-bottom:20px; }
    .ps-section-label { font-size:11pt; font-weight:700; margin:14px 0 4px; border-bottom:2px solid #111; padding-bottom:2px; }
    .ps-table { width:100%; border-collapse:collapse; margin-bottom:4px; }
    .ps-table th { background:#f0f0f0; font-size:9.5pt; font-weight:700; padding:5px 8px; text-align:center; border:1px solid #ccc; }
    .ps-table td { font-size:10pt; padding:5px 8px; border:1px solid #ddd; vertical-align:middle; text-align:center; }
    .ps-edu-flag { font-size:8pt; color:#b45309; margin-left:3px; }
    .ps-notes-label { font-size:8.5pt; font-weight:700; color:#555; margin-bottom:2px; text-transform:uppercase; letter-spacing:.3px; }
    .ps-notes-text  { font-size:9.5pt; color:#333; line-height:1.4; white-space:pre-wrap; }
    .ps-footer { display:flex; justify-content:space-between; font-size:8.5pt; color:#666; margin-top:16px; padding-top:8px; border-top:1px solid #ccc; }
    @media print {
      @page { size:letter portrait; margin:0.55in 0.5in; }
      body { font-size:10.5pt; }
      .ps-page { padding:0; max-width:100%; }
      .no-print { display:none !important; }
    }
  </style>
  </head><body>
  <div class="ps-page">
    <div class="ps-title">3B Tele Med Surg</div>
    <div class="ps-date">${dateLabel}</div>

    <!-- UNIT CLERK -->
    <div class="ps-section-label">Unit Clerk</div>
    <table class="ps-table">
      <thead><tr>
        <th>Day (0700–1500)</th>
        <th>Evening (1500–2300)</th>
        <th>Night (2300–0700)</th>
      </tr></thead>
      <tbody>${ucRows}</tbody>
    </table>

    <!-- RN -->
    <div class="ps-section-label">RN</div>
    <table class="ps-table">
      <thead><tr>
        <th>☀️ Day (0700–1900)</th>
        <th>🌙 Night (1900–0700)</th>
      </tr></thead>
      <tbody>${rnRows}</tbody>
    </table>

    <!-- TEAM NURSING -->
    <div class="ps-section-label">Team Nursing <span style="font-size:9pt;font-weight:400;color:#666;">— 3C Triad</span></div>
    <table class="ps-table">
      <thead><tr>
        <th>☀️ Day (0700–1900)</th>
        <th>🌙 Night (1900–0700)</th>
      </tr></thead>
      <tbody>${teamRows2}</tbody>
    </table>

    <!-- LPN -->
    <div class="ps-section-label">LPN</div>
    <table class="ps-table">
      <thead><tr>
        <th>☀️ Day (0700–1900)</th>
        <th>🌙 Night (1900–0700)</th>
      </tr></thead>
      <tbody>${lpnRows}</tbody>
    </table>

    <!-- CLINICAL ASSISTANTS -->
    <div class="ps-section-label">Clinical Assistants</div>
    <table class="ps-table">
      <thead><tr>
        <th>0630–1430</th>
        <th>1430–1830</th>
        <th>1830–2230</th>
        <th>2230–0630</th>
      </tr></thead>
      <tbody>${caRows}</tbody>
    </table>

    <!-- NOTES -->
    ${(noteDay || noteEve || noteNight || noteGen) ? `
    <div class="ps-section-label">Shift Notes</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${noteDay   ? `<div style="flex:1;min-width:140px;"><div class="ps-notes-label">Day</div><div class="ps-notes-text">${noteDay}</div></div>` : ''}
      ${noteEve   ? `<div style="flex:1;min-width:140px;"><div class="ps-notes-label">Evening</div><div class="ps-notes-text">${noteEve}</div></div>` : ''}
      ${noteNight ? `<div style="flex:1;min-width:140px;"><div class="ps-notes-label">Night</div><div class="ps-notes-text">${noteNight}</div></div>` : ''}
      ${noteGen   ? `<div style="flex:1;min-width:140px;"><div class="ps-notes-label">General</div><div class="ps-notes-text">${noteGen}</div></div>` : ''}
    </div>` : ''}

    <div class="ps-footer">
      <span>3B Tele Med Surg · AOMC</span>
      <span>📚 = Pending Education &nbsp;·&nbsp; CH 3B / CH 3C = Charge RN</span>
      <span>Printed: ${printedAt}</span>
    </div>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ── Manager View: full board print (calls existing printStaffingSheet) ──
function printManagerView() {
  printStaffingSheet();
}

// Pending audit-finding acknowledgments — shown on the Manager Report so
// nothing sent to a staff member for sign-off gets lost. Reads directly from
// Supabase (audit_acknowledgments / audit_findings), same project the Audit
// tracker writes to.
async function buildPendingAckHtml() {
  try {
    const cfg = (typeof getSBConfig === 'function') ? getSBConfig() : null;
    if (!cfg || !cfg.enabled || !cfg.url || !cfg.key) return '';
    const r = await fetch(`${cfg.url}/rest/v1/audit_acknowledgments?select=staff_name,requested_at,audit_findings(audit_type,finding_date,unit)&status=eq.pending&order=requested_at.asc`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
    });
    if (!r.ok) return '';
    const rows = await r.json();
    if (!rows.length) return '';
    const AUDIT_LABELS = { chart:'Chart Audit', sitter:'Sitter Audit', behavioral:'Behavioral Health Audit', pain:'Pain Reassessment Audit' };
    const daysAgo = ts => Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    const rowsHtml = rows.map(row => {
      const f = row.audit_findings || {};
      const age = daysAgo(row.requested_at);
      const overdue = age >= 5;
      return `<tr>
        <td style="padding:5px 8px;border:1px solid #ddd;">${row.staff_name}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;">${AUDIT_LABELS[f.audit_type] || f.audit_type || '—'}${f.unit ? ' · '+f.unit : ''}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;">${f.finding_date || '—'}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;color:${overdue ? '#b91c1c' : '#374151'};font-weight:${overdue?'700':'400'};">${age}d${overdue ? ' ⚠' : ''}</td>
      </tr>`;
    }).join('');
    return `<div class="ps-section-label" style="margin-top:16px;">🩺 Pending Audit Acknowledgments (${rows.length})</div>
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <thead><tr style="background:#f0f0f0;">
          <th style="padding:5px 8px;border:1px solid #ccc;text-align:left;">Staff</th>
          <th style="padding:5px 8px;border:1px solid #ccc;text-align:left;">Finding</th>
          <th style="padding:5px 8px;border:1px solid #ccc;text-align:left;">Date</th>
          <th style="padding:5px 8px;border:1px solid #ccc;text-align:left;">Sent</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  } catch(e) { return ''; }
}

async function printStaffingSheet() {
  const dateKey = state.activeBoardDate;
  if (!dateKey) { alert('No staffing date loaded.'); return; }

  // Pending audit acknowledgments — fetched up front so it's ready when the
  // report string is assembled below (see audit_acknowledgments table).
  const pendingAckHtml = await buildPendingAckHtml();

  const shifts   = state.placements[dateKey] || {};
  const dateObj  = new Date(dateKey + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const printedAt = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  function getStaff(shift, role) { return (shifts[shift]||[]).filter(p=>p.role===role); }
  function chargeFor(shift) { return state.chargeNurses[`${dateKey}|${shift}`]||''; }
  function noteFor(k) { return state.notes[`${dateKey}|${k}`]||''; }
  function nameCell(name, shift) {
    const items = state.pendingEdu[name]||[];
    const eduFlag = items.length ? ` <span style="font-size:8pt;color:#b45309;">[📚${items.length}]</span>` : '';
    let orientFlag = '';
    if (state.empOrientation[name]) {
      const prec = shift && state.orientAssign && state.orientAssign[`${dateKey}|${shift}|${name}`]
        ? state.orientAssign[`${dateKey}|${shift}|${name}`].split(',')[0].trim() : '';
      orientFlag = ` <span style="font-size:7pt;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 4px;border-radius:3px;">ORIENT${prec ? ' → '+prec : ''}</span>`;
    }
    const _p = shift ? ((state.placements[dateKey]||{})[shift]||[]).find(x=>x.name===name) : null;
    return `${name}${eduFlag}${orientFlag}`;
  }
  function chargeTag3B(shift, name) {
    return state.chargeNurses[`${dateKey}|${shift}`]===name
      ? ' <span style="font-size:7pt;font-weight:700;color:#1d4ed8;background:#dbeafe;padding:1px 4px;border-radius:3px;">CH 3B</span>':'' ;
  }
  function chargeTag3C(shift, name) {
    return state.charge3C[`${dateKey}|${shift}`]===name && name
      ? ' <span style="font-size:7pt;font-weight:700;color:#6d28d9;background:#ede9fe;padding:1px 4px;border-radius:3px;">CH 3C</span>':'';
  }

  // UC rows
  const ucD=getStaff('0700-1500','UC'),ucE=getStaff('1500-2300','UC'),ucN=getStaff('2300-0700','UC');
  const ucMax=Math.max(2,ucD.length,ucE.length,ucN.length);
  let ucRows='';
  for(let i=0;i<ucMax;i++) ucRows+=`<tr><td>${ucD[i]?nameCell(ucD[i].name,'0700-1500'):''}</td><td>${ucE[i]?nameCell(ucE[i].name,'1500-2300'):''}</td><td>${ucN[i]?nameCell(ucN[i].name,'2300-0700'):''}</td></tr>`;

  // RN rows — Day (0700-1500+1500-1900), Night (1900-0700)
  const rnD=getStaff('0700-1500','RN'),rnE=getStaff('1500-1900','RN'),rnN=getStaff('1900-0700','RN');
  const rnDay=rnD;
  const _rnSeen3=new Set(); const rnDayAll=[...rnD,...rnE].filter(p=>{if(_rnSeen3.has(p.name))return false;_rnSeen3.add(p.name);return true;});
  const rnMax=Math.max(6,rnDayAll.length,rnN.length);
  let rnRows='';
  for(let i=0;i<rnMax;i++){
    const d=rnDayAll[i],n=rnN[i];
    const dSh=d&&rnD.some(x=>x.name===d.name)?'0700-1500':'1500-1900';
    rnRows+='<tr>'+
      '<td>'+(d?nameCell(d.name,dSh)+chargeTag3B(dSh,d.name)+chargeTag3C(dSh,d.name):'')+'</td>'+
      '<td>'+(n?nameCell(n.name,'1900-0700')+chargeTag3B('1900-0700',n.name)+chargeTag3C('1900-0700',n.name):'')+'</td>'+
    '</tr>';
  }

  // LPN rows — Day (0700-1500+1500-1900), Night (1900-0700)
  const lpnD=getStaff('0700-1500','LPN'),lpnE=getStaff('1500-1900','LPN'),lpnN=getStaff('1900-0700','LPN');
  const lpnDay=lpnD;
  const _lpnSeen3=new Set(); const lpnDayAll=[...lpnD,...lpnE].filter(p=>{if(_lpnSeen3.has(p.name))return false;_lpnSeen3.add(p.name);return true;});
  const lpnMax=Math.max(2,lpnDayAll.length,lpnN.length);
  let lpnRows='';
  for(let i=0;i<lpnMax;i++){
    const d=lpnDayAll[i],n=lpnN[i];
    const dSh=d&&lpnD.some(x=>x.name===d.name)?'0700-1500':'1500-1900';
    lpnRows+='<tr>'+
      '<td>'+(d?nameCell(d.name,dSh):'')+'</td>'+
      '<td>'+(n?nameCell(n.name,'1900-0700'):'')+'</td>'+
    '</tr>';
  }

  // CA rows
  const caD=getStaff('0630-1430','CA'),caE1=getStaff('1430-1830','CA'),caE2=getStaff('1830-2230','CA'),caN=getStaff('2230-0630','CA');
  const caMax=Math.max(4,caD.length,caE1.length,caE2.length,caN.length);
  function caTagM(p,sk){
    if(!p)return'';
    const nm=nameCell(p.name,sk);
    // time badges removed
    return nm;
  }
  let caRows='';
  for(let i=0;i<caMax;i++) caRows+=`<tr><td>${caD[i]?caTagM(caD[i],'0630-1430'):''}</td><td>${caE1[i]?caTagM(caE1[i],'1430-1830'):''}</td><td>${caE2[i]?caTagM(caE2[i],'1830-2230'):''}</td><td>${caN[i]?caTagM(caN[i],'2230-0630'):''}</td></tr>`;

  const noteDay=noteFor('DAY'),noteEve=noteFor('EVE'),noteNight=noteFor('NIGHT'),noteGen=noteFor('GENERAL');

  // Cert alerts
  const CERT_FIELDS2=[
    {key:'bls',label:'BLS/CPR'},{key:'acls',label:'ACLS'},{key:'nihss',label:'NIHSS'},
    {key:'pivInsertion',label:'PIV'},{key:'bloodAdmin',label:'Blood Admin'},
    {key:'telemetry',label:'Telemetry'},{key:'ecgAcquisition',label:'12-Lead ECG'},
    {key:'tncc',label:'TNCC'},{key:'cen',label:'CEN'},{key:'pals',label:'PALS'},
    ...[1,2,3,4,5].map(n=>({key:`custom${n}_date`,label:`Custom ${n}`,lKey:`custom${n}_label`}))
  ];
  function certCls(dt){
    if(!dt) return '';
    const d=new Date(dt+'T12:00:00'),diff=(d-new Date())/86400000;
    return diff<0?'expired':diff<30?'critical':diff<90?'soon':'ok';
  }

  // Cert/Edu/Sign — ALL staff with issues (not just scheduled)
  const allStaffArr = MASTER_STAFF.filter(s => ['RN','LPN','CA','UC'].includes(s.job)).sort((a,b)=>a.name.localeCompare(b.name));

  // Certifications expiring within 30 days or expired — ALL staff
  let certRows='',hasCerts=false;
  allStaffArr.forEach(s => {
    const certs=state.certs[s.name]||{};
    const due=CERT_FIELDS2.filter(f=>{const c=certCls(certs[f.key]);return c==='expired'||c==='critical';});
    if(!due.length)return;
    hasCerts=true;
    const rCol=s.job==='RN'?'#1d4ed8':s.job==='LPN'?'#7c3aed':s.job==='CA'?'#0e7490':'#374151';
    due.forEach(f=>{
      const dt=certs[f.key],c=certCls(dt);
      const lbl=f.lKey?(certs[f.lKey]||f.label):f.label;
      const expStr=new Date(dt+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      const st=c==='expired'?'<b style="color:#b91c1c">EXPIRED</b>':'<b style="color:#b91c1c">Due &lt;30d</b>';
      certRows+=`<tr><td style="padding:5px 7px;border:1px solid #d1d5db;font-weight:600">${s.name}</td><td style="padding:5px 7px;border:1px solid #d1d5db;color:${rCol};font-weight:700">${s.job}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${lbl}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${expStr}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${st}</td></tr>`;
    });
  });
  if(!hasCerts) certRows='<tr><td colspan="5" style="padding:12px;text-align:center;color:#16a34a;font-style:italic">✅ No certifications expired or expiring within 30 days</td></tr>';

  // Education rows — ONLY staff scheduled TODAY with pending education
  const scheduledNamesSet = new Set(Object.values(shifts).flat().map(p => p.name));
  let eduRows='',hasEdu=false;
  allStaffArr.forEach(s => {
    if (!scheduledNamesSet.has(s.name)) return; // skip if not working today
    const pending=state.pendingEdu[s.name]||[];
    if(!pending.length)return;
    hasEdu=true;
    const rCol=s.job==='RN'?'#1d4ed8':s.job==='LPN'?'#7c3aed':s.job==='CA'?'#0e7490':'#374151';
    eduRows+=`<tr><td style="padding:5px 7px;border:1px solid #d1d5db;font-weight:600">${s.name}</td><td style="padding:5px 7px;border:1px solid #d1d5db;color:${rCol};font-weight:700">${s.job}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${pending.map(e=>`<span style="background:#dbeafe;color:#1e40af;padding:1px 7px;border-radius:8px;font-size:8pt;font-weight:700;margin-right:3px">${e}</span>`).join('')}</td></tr>`;
  });
  if(!hasEdu) eduRows='<tr><td colspan="3" style="padding:12px;text-align:center;color:#16a34a;font-style:italic">✅ No pending education for staff scheduled today</td></tr>';

  // CA Competency — ONLY CAs scheduled TODAY who have not completed a required competency validation this year
  const compYr = new Date().getFullYear();
  let compRows='',hasComp=false;
  allStaffArr.filter(s=>s.job==='CA').forEach(s => {
    if (!scheduledNamesSet.has(s.name)) return; // skip if not working today
    const skills = (typeof allCompSkills==='function') ? allCompSkills('CA') : (COMP_SKILLS.CA||[]);
    const incomplete = skills.filter(sk => {
      const v = ((state.competency||{})[s.name]||{})[sk.key];
      return !(v && v.passed && v.yr === compYr);
    });
    if(!incomplete.length)return;
    hasComp=true;
    compRows+=`<tr><td style="padding:5px 7px;border:1px solid #d1d5db;font-weight:600">${s.name}</td><td style="padding:5px 7px;border:1px solid #d1d5db;color:#0e7490;font-weight:700">CA</td><td style="padding:5px 7px;border:1px solid #d1d5db">${incomplete.map(sk=>`<span style="background:#fee2e2;color:#991b1b;padding:1px 7px;border-radius:8px;font-size:8pt;font-weight:700;margin-right:3px">${sk.label}</span>`).join('')}</td></tr>`;
  });
  if(!hasComp) compRows='<tr><td colspan="3" style="padding:12px;text-align:center;color:#16a34a;font-style:italic">✅ All CAs working today have completed their competencies</td></tr>';

  // Read & Sign — ALL staff with unsigned policies
  let signRows='',hasSign=false;
  const policies=(state.policies||[]).filter(p=>p.requireAck!==false);
  allStaffArr.forEach(s => {
    const myPol=policies.filter(p=>{
      if(p.roles==='ALL')return true;
      if(p.roles==='RN'&&(s.job==='RN'||s.job==='LPN'))return true;
      return p.roles===s.job;
    });
    const unsigned=myPol.filter(p=>!(p.acks||{})[s.name]);
    if(!unsigned.length)return;
    hasSign=true;
    const rCol=s.job==='RN'?'#1d4ed8':s.job==='LPN'?'#7c3aed':s.job==='CA'?'#0e7490':'#374151';
    signRows+=`<tr><td style="padding:5px 7px;border:1px solid #d1d5db;font-weight:600">${s.name}</td><td style="padding:5px 7px;border:1px solid #d1d5db;color:${rCol};font-weight:700">${s.job}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${unsigned.map(p=>`<span style="background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:8px;font-size:8pt;font-weight:700;margin-right:3px">${p.title}</span>`).join('')}</td></tr>`;
  });
  if(!hasSign) signRows='<tr><td colspan="3" style="padding:12px;text-align:center;color:#16a34a;font-style:italic">✅ All staff have signed required policies</td></tr>';

  // Agency alerts
  const agencyAlerts=[];
  const pToday=new Date();
  MASTER_STAFF.forEach(s=>{
    const ag=state.agencyDates[s.name];
    if(!ag||!ag.isAgency)return;
    const eff=ag.extensionEnd||ag.contractEnd;
    if(!eff)return;
    const exp=new Date(eff+'T12:00:00');
    const dLeft=Math.round((exp-pToday)/86400000);
    if(dLeft<=14) agencyAlerts.push({name:s.name,job:s.job,dLeft,exp,type:ag.extensionEnd?'Extension':'Contract'});
  });
  agencyAlerts.sort((a,b)=>a.dLeft-b.dLeft);
  let agencySection='';
  if(agencyAlerts.length){
    const agRows=agencyAlerts.map(a=>{
      const st=a.dLeft<0?'<b style="color:#b91c1c">EXPIRED</b>':a.dLeft===0?'<b style="color:#b91c1c">LAST DAY</b>':'<span style="color:#c2410c">'+a.dLeft+'d left</span>';
      const expStr=a.exp.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      return `<tr><td style="padding:5px 7px;border:1px solid #d1d5db;font-weight:600">${a.name}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${a.job}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${a.type}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${expStr}</td><td style="padding:5px 7px;border:1px solid #d1d5db">${st}</td></tr>`;
    }).join('');
    agencySection=`<div style="margin-top:14px"><div class="ps-section-label" style="color:#b45309;border-color:#fcd34d">📅 Agency Contracts — Ending Within 14 Days</div><table style="width:100%;border-collapse:collapse;font-size:9.5pt"><thead><tr style="background:#f0f0f0"><th style="padding:6px 8px;border:1px solid #999;text-align:left">Name</th><th style="padding:6px 8px;border:1px solid #999">Role</th><th style="padding:6px 8px;border:1px solid #999">Type</th><th style="padding:6px 8px;border:1px solid #999">End Date</th><th style="padding:6px 8px;border:1px solid #999">Status</th></tr></thead><tbody>${agRows}</tbody></table></div>`;
  }

  const html = `<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#111;background:#fff}
    .ps-page{padding:20px 28px 18px;max-width:900px;margin:0 auto}
    .ps-title{font-size:20pt;font-weight:700;text-align:center;margin-bottom:4px}
    .ps-date{font-size:11pt;text-align:center;color:#444;margin-bottom:16px}
    .ps-section-label{font-size:11pt;font-weight:700;margin:12px 0 4px;border-bottom:2px solid #111;padding-bottom:2px}
    .ps-table{width:100%;border-collapse:collapse;margin-bottom:4px}
    .ps-table th{background:#f0f0f0;padding:5px 7px;border:1px solid #ccc;text-align:left;font-size:9.5pt}
    .ps-table td{font-size:10pt;padding:5px 7px;border:1px solid #d1d5db;vertical-align:middle;text-align:center}
    .ps-footer{display:flex;justify-content:space-between;font-size:8pt;color:#666;margin-top:14px;padding-top:8px;border-top:1px solid #ccc}
    @media print{
      @page{size:letter portrait;margin:.45in .5in}
      body{font-size:9.5pt}
      #mgr-print-overlay{position:static!important;overflow:visible!important;height:auto!important;}
      #mgr-print-content{position:static!important;overflow:visible!important;}
      .ps-page{padding:0;max-width:100%;display:block;overflow:visible;}
      .ps-page[style*="page-break-before"]{page-break-before:always!important;break-before:page!important;}
    }
  </style>

  <!-- PAGE 1: STAFFING -->
  <div class="ps-page">
    <div class="ps-title">3B Tele Med Surg</div>
    <div class="ps-date">${dateLabel}</div>

    <div class="ps-section-label">Unit Clerk</div>
    <table class="ps-table"><thead><tr><th>Day (0700–1500)</th><th>Evening (1500–2300)</th><th>Night (2300–0700)</th></tr></thead><tbody>${ucRows}</tbody></table>

    <div class="ps-section-label">RN</div>
    <table class="ps-table"><thead><tr><th>☀️ Day (0700–1900)</th><th>🌙 Night (1900–0700)</th></tr></thead><tbody>${rnRows}</tbody></table>

    <div class="ps-section-label">LPN</div>
    <table class="ps-table"><thead><tr><th>☀️ Day (0700–1900)</th><th>🌙 Night (1900–0700)</th></tr></thead><tbody>${lpnRows}</tbody></table>

    <div class="ps-section-label">Clinical Assistants</div>
    <table class="ps-table"><thead><tr><th>0630–1430</th><th>1430–1830</th><th>1830–2230</th><th>2230–0630</th></tr></thead><tbody>${caRows}</tbody></table>

    <!-- Shift Totals Summary -->
    <div style="margin:12px 0 8px;padding:10px 14px;background:#f0f4f8;border:1px solid #d1d5db;border-radius:6px;">
      <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#374151;margin-bottom:7px;">Shift Staffing Totals</div>
      <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;">Role</th>
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">Day<br><span style="font-weight:400;font-size:8pt;">0700–1500</span></th>
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">Eve<br><span style="font-weight:400;font-size:8pt;">1500–1900</span></th>
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">Night<br><span style="font-weight:400;font-size:8pt;">1900–0700</span></th>
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">CA Day<br><span style="font-weight:400;font-size:8pt;">0630–1430</span></th>
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">CA Eve1<br><span style="font-weight:400;font-size:8pt;">1430–1830</span></th>
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">CA Eve2<br><span style="font-weight:400;font-size:8pt;">1830–2230</span></th>
            <th style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;">CA Night<br><span style="font-weight:400;font-size:8pt;">2230–0630</span></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;color:#1d4ed8;">RN</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${rnD.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${rnE.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${rnN.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;color:#7c3aed;">LPN</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${lpnD.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${lpnE.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${lpnN.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
          </tr>
          <tr>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:700;color:#0e7490;">CA</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;color:#9ca3af;">—</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${caD.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${caE1.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${caE2.length}</td>
            <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13pt;font-weight:700;">${caN.length}</td>
          </tr>
          <tr style="background:#1d4ed8;color:#fff;">
            <td style="padding:5px 8px;border:1px solid #1e40af;font-weight:700;">TOTAL</td>
            <td style="padding:5px 8px;border:1px solid #1e40af;text-align:center;font-size:13pt;font-weight:700;">${rnD.length+lpnD.length}</td>
            <td style="padding:5px 8px;border:1px solid #1e40af;text-align:center;font-size:13pt;font-weight:700;">${rnE.length+lpnE.length}</td>
            <td style="padding:5px 8px;border:1px solid #1e40af;text-align:center;font-size:13pt;font-weight:700;">${rnN.length+lpnN.length}</td>
            <td style="padding:5px 8px;border:1px solid #1e40af;text-align:center;font-size:13pt;font-weight:700;">${caD.length}</td>
            <td style="padding:5px 8px;border:1px solid #1e40af;text-align:center;font-size:13pt;font-weight:700;">${caE1.length}</td>
            <td style="padding:5px 8px;border:1px solid #1e40af;text-align:center;font-size:13pt;font-weight:700;">${caE2.length}</td>
            <td style="padding:5px 8px;border:1px solid #1e40af;text-align:center;font-size:13pt;font-weight:700;">${caN.length}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${(noteDay||noteEve||noteNight||noteGen)?`<div class="ps-section-label">Shift Notes</div><div style="display:flex;gap:10px;flex-wrap:wrap">${noteDay?`<div style="flex:1;min-width:140px"><b>Day</b><br>${noteDay}</div>`:''} ${noteEve?`<div style="flex:1;min-width:140px"><b>Evening</b><br>${noteEve}</div>`:''} ${noteNight?`<div style="flex:1;min-width:140px"><b>Night</b><br>${noteNight}</div>`:''} ${noteGen?`<div style="flex:1;min-width:140px"><b>General</b><br>${noteGen}</div>`:''}</div>`:''}

    ${(() => {
      const opps = (state.docOpps || {})[dateKey] || [];
      if (!opps.length) return '';
      const rows = opps.map(o =>
        `<tr>
          <td style="padding:5px 8px;border:1px solid #ddd;font-weight:600;font-size:10pt;">${o.name}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;font-size:10pt;color:#1d4ed8;">${o.category}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;font-size:10pt;">${o.note || '—'}</td>
        </tr>`).join('');
      return `<div class="ps-section-label" style="color:#1d4ed8;">📋 Documentation Opportunities</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
          <thead><tr style="background:#eff6ff;">
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:9.5pt;width:25%;">Staff</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:9.5pt;width:30%;">Category</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:9.5pt;">Details / Coaching Note</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    })()} 
    ${(()=>{
      const today = new Date();
      const cutoff = new Date(today); cutoff.setDate(cutoff.getDate()-21);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const rColorMap = {RN:'#1d4ed8',LPN:'#7c3aed',CA:'#0e7490',UC:'#374151'};
      const weekendCalls = [];
      const seen = new Set(); // deduplicate by name+date+type
      MASTER_STAFF.forEach(s=>{
        (state.absenceLog[s.name]||[]).forEach(e=>{
          if(e.date<cutoffStr) return;
          if(e.type!=='call'&&e.type!=='NCNS'&&e.type!=='sick') return;
          const d=new Date(e.date+'T12:00:00');
          const dow=d.getDay(); // 0=Sun 5=Fri 6=Sat
          if(dow!==5&&dow!==6&&dow!==0) return;
          const dupKey = `${s.name}|${e.date}|${e.type}`;
          if(seen.has(dupKey)) return; // skip duplicates
          seen.add(dupKey);
          const dayName=['Sunday','','','','','Friday','Saturday'][dow];
          const dateDisp=d.toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric',year:'2-digit'});
          weekendCalls.push({name:s.name,job:s.job,date:e.date,dateDisp,dayName,type:e.type});
        });
      });
      weekendCalls.sort((a,b)=>b.date.localeCompare(a.date));
      if(!weekendCalls.length) return '';
      const typeLabel = t => t==='NCNS'||t==='ncns'?'No Call No Show':t==='sick'?'Sick':t==='calledoff'?'Called Off':t==='tardy'?'Tardy':'Call-Out';
      const rows = weekendCalls.map(c=>`<tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;">${c.name}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;color:${rColorMap[c.job]||'#374151'};font-weight:700;text-align:center;">${c.job}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;">${c.dayName}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${c.dateDisp}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${typeLabel(c.type)}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;min-width:120px;">&nbsp;</td>
      </tr>`).join('');
      return `<div class="ps-section-label" style="color:#b45309;border-color:#fcd34d;margin-top:12px;">📅 Weekend Call-Ins — Fri / Sat / Sun (Last 3 Weeks)</div>
      <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
        <thead><tr style="background:#f0f0f0;">
          <th style="padding:5px 8px;border:1px solid #999;text-align:left;">Staff Name</th>
          <th style="padding:5px 8px;border:1px solid #999;text-align:center;width:45px;">Role</th>
          <th style="padding:5px 8px;border:1px solid #999;width:65px;">Day</th>
          <th style="padding:5px 8px;border:1px solid #999;text-align:center;width:80px;">Call-In Date</th>
          <th style="padding:5px 8px;border:1px solid #999;width:100px;">Type</th>
          <th style="padding:5px 8px;border:1px solid #999;width:120px;">Make-Up Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })()}

    <div class="ps-footer"><span>3B Tele Med Surg · AOMC</span><span>📚 = Pending Education · CH = Charge RN</span><span>Printed: ${printedAt}</span></div>
  </div>

  <!-- PAGE 2: CERTIFICATIONS, EDUCATION & READ/SIGN -->
  <div class="ps-page" style="page-break-before:always">
    <div class="ps-title" style="font-size:15pt">Certifications, Education &amp; Unsigned Policies</div>
    <div class="ps-date">Expiring within 30 days · All Staff · Printed: ${printedAt}</div>

    <div class="ps-section-label">⚠️ Certifications Expired or Expiring Within 30 Days</div>
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:14px">
      <thead><tr style="background:#f0f0f0"><th style="padding:6px 8px;border:1px solid #999;text-align:left">Name</th><th style="padding:6px 8px;border:1px solid #999;text-align:left;width:50px">Role</th><th style="padding:6px 8px;border:1px solid #999;text-align:left">Certification</th><th style="padding:6px 8px;border:1px solid #999;text-align:left;width:90px">Exp Date</th><th style="padding:6px 8px;border:1px solid #999;text-align:left;width:70px">Status</th></tr></thead>
      <tbody>${certRows}</tbody>
    </table>

    <div class="ps-section-label">📚 Pending Education — Staff Working Today</div>
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:14px">
      <thead><tr style="background:#f0f0f0"><th style="padding:6px 8px;border:1px solid #999;text-align:left">Name</th><th style="padding:6px 8px;border:1px solid #999;text-align:left;width:50px">Role</th><th style="padding:6px 8px;border:1px solid #999;text-align:left">Assigned Education</th></tr></thead>
      <tbody>${eduRows}</tbody>
    </table>

    <div class="ps-section-label">✅ CA Competency — Not Yet Completed — Staff Working Today</div>
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:14px">
      <thead><tr style="background:#f0f0f0"><th style="padding:6px 8px;border:1px solid #999;text-align:left">Name</th><th style="padding:6px 8px;border:1px solid #999;text-align:left;width:50px">Role</th><th style="padding:6px 8px;border:1px solid #999;text-align:left">Incomplete Competencies (${compYr})</th></tr></thead>
      <tbody>${compRows}</tbody>
    </table>

    <div class="ps-section-label">✍️ Read &amp; Sign — Unsigned Policies — All Staff</div>
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:14px">
      <thead><tr style="background:#f0f0f0"><th style="padding:6px 8px;border:1px solid #999;text-align:left">Name</th><th style="padding:6px 8px;border:1px solid #999;text-align:left;width:50px">Role</th><th style="padding:6px 8px;border:1px solid #999;text-align:left">Unsigned Policies</th></tr></thead>
      <tbody>${signRows}</tbody>
    </table>

    ${agencySection}

    ${buildMeetingSignaturePrintHtml(shifts)}

    ${buildAnticipatedPrintHtml()}

    ${buildWriteupPrintHtml(shifts)}

    ${buildPendingTalkPrintHtml()}

    <div class="ps-footer"><span>3B Tele Med Surg · AOMC</span><span>Scheduled staff only</span><span>Printed: ${printedAt}</span></div>
  </div>


    <!-- PAGE 3: 6-WEEK FORECAST -->
  <div class="ps-page" style="page-break-before:always">
    <div class="ps-title" style="font-size:15pt;">6-Week Staffing Forecast</div>
    <div class="ps-date">${dateLabel} · Printed: ${printedAt}</div>
    ${buildForecastPrintHtml()}
    <div class="ps-footer"><span>3B Tele Med Surg · AOMC</span><span>Contract departures + cert expirations · FTE-based vacancy</span><span>Printed: ${printedAt}</span></div>
  </div>

  <!-- ── REVIEW REMINDERS PAGE ── -->
  <div class="ps-page" style="page-break-before:always;">
    <div class="ps-title" style="font-size:15pt;">📋 Review & Check-In Reminders</div>
    <div class="ps-date">${dateLabel} · Printed: ${printedAt}</div>

    ${(() => {
      const today = new Date(); today.setHours(0,0,0,0);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));

      function daysUntil(dateStr) {
        if (!dateStr) return null;
        return Math.round((new Date(dateStr + 'T12:00:00') - today) / 86400000);
      }
      function badgeHtml(label, color, bg) {
        return '<span style="font-size:8pt;font-weight:700;color:'+color+';background:'+bg+';padding:1px 6px;border-radius:3px;margin-left:4px;">'+label+'</span>';
      }
      function statusBadge(days) {
        if (days === null) return badgeHtml('NO DATE','#92400e','#fef3c7');
        if (days < 0)     return badgeHtml('OVERDUE','#991b1b','#fee2e2');
        if (days === 0)   return badgeHtml('DUE TODAY','#991b1b','#fee2e2');
        return badgeHtml('DUE IN '+days+'D','#c2410c','#ffedd5');
      }

      // Staff working today from the loaded board
      const workingToday = new Set(Object.values(shifts).flat().map(p => p.name));
      function dueThisWeek(diff) { return diff !== null && diff <= 7; }

      // 30/60/90 check-ins — working today, due this week
      const oriRows = [];
      Object.entries(state.orientation || {}).forEach(function(entry) {
        var name = entry[0], od = entry[1];
        if (!workingToday.has(name) || !od.startDate) return;
        [30, 60, 90].forEach(function(days) {
          var ci = (od.checkins || {})[days] || {};
          if (ci.completedDate) return;
          var targetDt = new Date(od.startDate + 'T12:00:00');
          targetDt.setDate(targetDt.getDate() + days);
          var targetStr = targetDt.toISOString().split('T')[0];
          var diff = daysUntil(targetStr);
          if (!dueThisWeek(diff)) return;
          oriRows.push({ name: name, type: days+'-Day Check-In', target: targetStr, diff: diff, role: od.role||'' });
        });
      });

      // Annual reviews — working today, due this week
      const annualRows = [];
      const curYear = today.getFullYear();
      MASTER_STAFF.forEach(function(s) {
        if (!workingToday.has(s.name)) return;
        var hd = state.hireDates && state.hireDates[s.name];
        if (!hd) return;
        var rv = (state.yearReview[s.name] || {})[curYear] || {};
        if (rv.completed) return;
        var hire = new Date(hd + 'T12:00:00');
        var nextAnniv = new Date(hire); nextAnniv.setFullYear(curYear);
        if (nextAnniv < today) nextAnniv.setFullYear(curYear + 1);
        var diff = daysUntil(nextAnniv.toISOString().split('T')[0]);
        if (!dueThisWeek(diff)) return;
        var yrs = curYear - hire.getFullYear();
        annualRows.push({ name: s.name, type: 'Annual Review (Yr '+yrs+')', target: nextAnniv.toISOString().split('T')[0], diff: diff, role: s.job||'' });
      });

      const allRows = [...oriRows, ...annualRows].sort((a, b) => (a.diff ?? 999) - (b.diff ?? 999));

      if (!allRows.length) {
        return '<div style="text-align:center;padding:40px;color:#666;font-size:11pt;">No reviews or check-ins due this week for staff working today.</div>';
      }

      const tableRows = allRows.map(r => {
        const targetFmt = r.target ? new Date(r.target + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
        const rowBg = r.diff !== null && r.diff < 0 ? 'background:#fff5f5;' : r.diff !== null && r.diff <= 7 ? 'background:#fffbeb;' : '';
        return `<tr style="${rowBg}">
          <td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">${r.name}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;color:#555;">${r.role}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${r.type}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${targetFmt}${statusBadge(r.diff)}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;width:120px;"></td>
        </tr>`;
      }).join('');

      return `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead><tr style="background:#f0f0f0;">
          <th style="padding:7px 8px;border:1px solid #ccc;text-align:left;font-size:9.5pt;">Staff Name</th>
          <th style="padding:7px 8px;border:1px solid #ccc;text-align:left;font-size:9.5pt;">Role</th>
          <th style="padding:7px 8px;border:1px solid #ccc;text-align:left;font-size:9.5pt;">Review / Check-In</th>
          <th style="padding:7px 8px;border:1px solid #ccc;text-align:center;font-size:9.5pt;">Due Date</th>
          <th style="padding:7px 8px;border:1px solid #ccc;text-align:left;font-size:9.5pt;">Completed ✓</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div style="margin-top:10px;font-size:8.5pt;color:#666;">
        Staff working today with reviews or check-ins due this week ·
        <span style="background:#fee2e2;padding:1px 5px;border-radius:3px;">Red = Overdue or due today</span>
        <span style="background:#ffedd5;padding:1px 5px;border-radius:3px;margin-left:4px;">Orange = Due within 7 days</span>
      </div>`;
    })()}

    <!-- DAILY HUDDLE EDUCATION -->
    ${(() => {
      const de = (state.dailyEduLog || {})[dateKey];
      if (!de) return '';
      const pointsHtml = (de.points || []).map(p => `<li style="margin-bottom:4px;">${p}</li>`).join('');
      let signRows = '';
      for (let i = 0; i < 8; i++) signRows += `<tr><td style="padding:6px 8px;border:1px solid #ddd;">&nbsp;</td><td style="padding:6px 8px;border:1px solid #ddd;">&nbsp;</td><td style="padding:6px 8px;border:1px solid #ddd;">&nbsp;</td></tr>`;
      return `
      <div class="ps-section-label" style="margin-top:16px;">📚 Daily 5-Minute Talking Points — ${de.category}</div>
      <div style="border:1px solid #ccc;border-radius:6px;padding:10px 14px;background:#fafafa;">
        <div style="font-size:11pt;font-weight:700;margin-bottom:2px;">${de.title} <span style="font-weight:400;color:#666;font-size:9pt;">(${de.time || '5 min'})</span></div>
        <ul style="margin:8px 0 6px 18px;font-size:9.5pt;line-height:1.5;">${pointsHtml}</ul>
        ${de.ref ? `<div style="font-size:8.5pt;color:#666;font-style:italic;">${de.ref}</div>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead><tr style="background:#f0f0f0;">
          <th style="padding:6px 8px;border:1px solid #ccc;text-align:left;font-size:9pt;width:34%;">Staff Name</th>
          <th style="padding:6px 8px;border:1px solid #ccc;text-align:left;font-size:9pt;width:16%;">Role</th>
          <th style="padding:6px 8px;border:1px solid #ccc;text-align:left;font-size:9pt;">Initials / Acknowledgment</th>
        </tr></thead>
        <tbody>${signRows}</tbody>
      </table>`;
    })()}

    <!-- PENDING AUDIT ACKNOWLEDGMENTS -->
    ${pendingAckHtml}

    <div class="ps-footer"><span>3B Tele Med Surg · AOMC</span><span>Review reminders · 90-day window</span><span>Printed: ${printedAt}</span></div>
  </div>`;

  // Show in-page overlay
  const existing = document.getElementById('mgr-print-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'mgr-print-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:#fff;overflow-y:auto;';
  overlay.innerHTML = `<div class="mgr-toolbar" style="position:sticky;top:0;z-index:2;background:#f0f4f8;border-bottom:1px solid #d1d5db;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-family:Arial,sans-serif;">
    <div style="font-size:12px;color:#374151;font-weight:600;">3B Manager Report · ${dateLabel}</div>
    <div style="display:flex;gap:8px;">
      <button onclick="window.print()" style="background:#1d4ed8;color:#fff;border:none;border-radius:5px;padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer;">🖨 Print / Save PDF</button>
      <button onclick="document.getElementById('mgr-print-overlay').remove()" style="background:#ef4444;color:#fff;border:none;border-radius:5px;padding:6px 12px;font-size:12px;cursor:pointer;">✕ Close</button>
    </div>
  </div>
  <div id="mgr-print-content"></div>
  <style>@media print{#mgr-print-overlay .mgr-toolbar{display:none!important}body>*:not(#mgr-print-overlay){display:none!important}#mgr-print-overlay{position:static!important;overflow:visible!important;height:auto!important;}#mgr-print-content{position:static!important;overflow:visible!important;height:auto!important;}@page{size:letter portrait;margin:.45in .5in}}</style>`;
  document.body.appendChild(overlay);
  document.getElementById('mgr-print-content').innerHTML = html;
}

function printManagerView() {
  printStaffingSheet();
}
