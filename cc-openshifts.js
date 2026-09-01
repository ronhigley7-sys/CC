
(function() {

  // ── Helpers ──────────────────────────────────────────────────
  function cfg(id, def) {
    var el = document.getElementById(id);
    return el ? (parseFloat(el.value) || def) : def;
  }
  function v(id) { var el=document.getElementById(id); return el?el.value:''; }

  function fmtRole(job) {
    var c = {RN:'var(--accent2)',LPN:'var(--green2)',CA:'var(--amber2)',UC:'var(--purple2)'};
    return '<span style="font-family:monospace;font-size:10px;padding:1px 6px;border-radius:2px;background:rgba(255,255,255,0.07);color:'+(c[job]||'var(--text3)')+';">'+job+'</span>';
  }

  function card(title, val, sub, color) {
    return '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:12px 16px;flex:1;min-width:130px;">' +
      '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">'+title+'</div>' +
      '<div style="font-size:24px;font-weight:700;color:'+(color||'var(--white)')+';">'+val+'</div>' +
      '<div style="font-size:10px;color:var(--text3);margin-top:2px;">'+sub+'</div>' +
    '</div>';
  }

  function sectionHead(title) {
    return '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;">'+title+'</div>';
  }

  function chip(text, color, bg, border) {
    return '<div style="background:'+bg+';border:1px solid '+border+';border-radius:5px;padding:8px 12px;font-size:11px;color:'+color+';display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">'+text+'</div>';
  }

  // ── YTD OVERTIME (Supabase employee_overtime_ytd, from WFDA export) ──
  var _saOtYtdCache = null; // avoid re-fetching on every render tick
  function renderOtYtdSection(force) {
    var el = document.getElementById('sa-ot-ytd');
    if (!el) return;
    if (_saOtYtdCache && !force) { paintOtYtd(_saOtYtdCache); return; }

    var cfgObj = (typeof getSBConfig === 'function') ? getSBConfig() : null;
    if (!cfgObj || !cfgObj.enabled || !cfgObj.url || !cfgObj.key) {
      el.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;">' +
        sectionHead('\u{1F4C6} YTD Overtime by Employee') +
        '<div style="color:var(--text3);font-size:11px;font-style:italic;">Supabase not connected.</div></div>';
      return;
    }

    fetch(cfgObj.url + '/rest/v1/employee_overtime_ytd?select=*&order=report_end.desc,overtime_hours.desc', {
      headers: { apikey: cfgObj.key, Authorization: 'Bearer ' + cfgObj.key }
    }).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(rows){ _saOtYtdCache = rows; paintOtYtd(rows); })
      .catch(function(e){
        el.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;">' +
          sectionHead('\u{1F4C6} YTD Overtime by Employee') +
          '<div style="color:var(--red2);font-size:11px;">\u26a0\ufe0f Load failed: '+e.message+'</div></div>';
      });
  }

  function paintOtYtd(all) {
    var el = document.getElementById('sa-ot-ytd');
    if (!el) return;
    if (!all || !all.length) {
      el.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;">' +
        sectionHead('\u{1F4C6} YTD Overtime by Employee') +
        '<div style="color:var(--text3);font-size:11px;font-style:italic;">No YTD OT data imported yet.</div></div>';
      return;
    }
    var latestEnd = all[0].report_end;
    var rows = all.filter(function(r){ return r.report_end === latestEnd; })
                  .sort(function(a,b){ return (b.overtime_hours||0) - (a.overtime_hours||0); });
    var rangeLbl = rows.length ? (rows[0].report_start + ' \u2192 ' + latestEnd) : '';

    var rowsHtml = rows.map(function(r) {
      var over2pct = (r.ot_pct_of_paid || 0) > 0.02;
      var barW = Math.min(Math.round((r.overtime_hours||0) / Math.max(rows[0].overtime_hours,1) * 100), 100);
      var barColor = over2pct ? 'var(--red2)' : 'var(--green2)';
      return '<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span onclick="openEmployeeHub(\''+r.employee_name_raw.replace(/'/g,"\\'")+'\')" style="cursor:pointer;font-size:12px;font-weight:600;color:var(--white);text-decoration:underline dotted;text-underline-offset:2px;">'+r.employee_name_raw+'</span>' +
            (r.match_status !== 'matched' ? '<span style="font-size:9px;background:rgba(255,255,255,0.08);color:var(--text3);padding:1px 5px;border-radius:3px;">UNMATCHED</span>' : '') +
          '</div>' +
          '<span style="font-size:13px;font-weight:700;color:'+barColor+';">'+(r.overtime_hours||0).toFixed(1)+'h &nbsp; <span style="font-size:10px;font-weight:400;color:var(--text3);">('+((r.ot_pct_of_paid||0)*100).toFixed(1)+'% of paid)</span></span>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.06);border-radius:2px;height:4px;">' +
          '<div style="background:'+barColor+';height:4px;border-radius:2px;width:'+barW+'%;"></div>' +
        '</div>' +
      '</div>';
    }).join('');

    el.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
        sectionHead('\u{1F4C6} YTD Overtime by Employee (' + rows.length + ')') +
        '<button class="btn btn-ghost btn-sm" onclick="window._saForceOtYtd()" style="font-size:11px;padding:3px 10px;">\u21bb Refresh</button>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Synced from "WFDA Overtime Analysis - Employee" exports \u00b7 '+rangeLbl+' \u00b7 highlighted rows are &gt;2% of paid hours</div>' +
      rowsHtml +
    '</div>';
  }
  window._saForceOtYtd = function() { renderOtYtdSection(true); };

  // ── Populate dropdowns ────────────────────────────────────────
  function populateSelects() {
    var otLog = state.otLog || {};
    var ppSel = document.getElementById('sa-pp-select');
    var mSel  = document.getElementById('sa-month-select');
    if (!ppSel || !mSel) return;

    // PP dropdown — sorted newest first
    var pps = new Set();
    Object.values(otLog).forEach(function(entries) {
      (entries||[]).forEach(function(e) { if(e.payPeriod) pps.add(e.payPeriod); });
    });
    var ppArr = Array.from(pps).sort().reverse();
    if (!ppArr.length) ppArr = [typeof currentPayPeriod === 'function' ? currentPayPeriod() : ''];
    var prevPP = ppSel.value;
    ppSel.innerHTML = ppArr.map(function(p) {
      var d = new Date(p+'T12:00:00');
      var lbl = isNaN(d) ? p : 'PP '+d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});
      return '<option value="'+p+'">'+lbl+'</option>';
    }).join('');
    if (prevPP && ppArr.includes(prevPP)) ppSel.value = prevPP;

    // Month dropdown — from productivity data, sorted newest first
    var prod = state.productivity || {};
    var months = new Set();
    Object.keys(prod).forEach(function(k) { if(k && prod[k].census) months.add(k.slice(0,7)); });
    var moArr = Array.from(months).sort().reverse();

    // If no HPPD data, still show months around the selected PP
    if (!moArr.length) {
      var ppDate = new Date((ppSel.value||'')+'T12:00:00');
      if (!isNaN(ppDate)) {
        moArr = [ppDate.getFullYear()+'-'+String(ppDate.getMonth()+1).padStart(2,'0')];
      } else {
        var now = new Date();
        moArr = [now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')];
      }
    }

    // Auto-select month matching selected PP
    var selPP = ppSel.value;
    var bestMo = moArr[0];
    if (selPP) {
      var ppD = new Date(selPP+'T12:00:00');
      if (!isNaN(ppD)) {
        var ppMo = ppD.getFullYear()+'-'+String(ppD.getMonth()+1).padStart(2,'0');
        if (moArr.includes(ppMo)) bestMo = ppMo;
        // Also try previous month (PP can span 2 months)
        var ppPrevMo = ppD.getFullYear()+'-'+String(ppD.getMonth()).padStart(2,'0');
        if (!moArr.includes(ppMo) && moArr.includes(ppPrevMo)) bestMo = ppPrevMo;
      }
    }

    var prevMo = mSel.value;
    mSel.innerHTML = moArr.map(function(m) {
      var d = new Date(m+'-01T12:00:00');
      var lbl = isNaN(d) ? m : d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      var sel = (prevMo ? m===prevMo : m===bestMo) ? ' selected' : '';
      return '<option value="'+m+'"'+sel+'>'+lbl+'</option>';
    }).join('');
    if (!prevMo) mSel.value = bestMo;
  }

  // ── Main render ───────────────────────────────────────────────
  window.sa_render = function() {
    populateSelects(); // ensure dropdowns are current before reading values
    var pp       = v('sa-pp-select');
    var monthKey = v('sa-month-select');
    var otLog    = state.otLog    || {};
    var prod     = state.productivity || {};
    var otThresh = cfg('sa-ot-thresh', 4);
    var rnDay    = cfg('sa-rn-day',    5);
    var rnNight  = cfg('sa-rn-night',  6);
    var teamDay  = cfg('sa-team-day',  8);
    var teamNight= cfg('sa-team-night',10);

    // ── OT Staff for selected PP ──────────────────────────────
    var otStaff = [];
    var totalOT = 0;
    MASTER_STAFF.forEach(function(s) {
      var entries = otLog[s.name] || [];
      var entry   = entries.find(function(e){ return e.payPeriod===pp; });
      if (entry && entry.otHrs > 0) {
        otStaff.push({ name:s.name, job:s.job, hrs:entry.otHrs, notes:entry.notes||'' });
        totalOT += entry.otHrs;
      }
    });
    otStaff.sort(function(a,b){ return b.hrs - a.hrs; });

    var highOT   = otStaff.filter(function(s){ return s.hrs >= otThresh; });
    // Repeat OT: staff with OT in 2+ pay periods (sorted chronologically distinct)
    var repeatOT = [];
    MASTER_STAFF.forEach(function(s) {
      var entries = (otLog[s.name]||[]).filter(function(e){ return e.otHrs > 0; });
      // Sort by payPeriod date
      entries.sort(function(a,b){ return (a.payPeriod||'').localeCompare(b.payPeriod||''); });
      // Deduplicate same PP
      var uniq = [];
      entries.forEach(function(e){ if(!uniq.length || uniq[uniq.length-1].payPeriod !== e.payPeriod) uniq.push(e); });
      if (uniq.length >= 2) {
        var ppList = uniq.map(function(e){
          var d = new Date((e.payPeriod||'')+'T12:00:00');
          return isNaN(d) ? e.payPeriod : d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
        }).slice(0,3).join(', ');
        repeatOT.push({ name:s.name, job:s.job, count:uniq.length,
          totalHrs: uniq.reduce(function(a,e){return a+e.otHrs;},0), pps:ppList });
      }
    });
    repeatOT.sort(function(a,b){ return b.totalHrs - a.totalHrs; });

    // ── HPPD / Census data for selected month ────────────────
    var moparts = (monthKey||'').split('-').map(Number);
    var yr = moparts[0], mo = moparts[1];
    var daysInMonth = yr && mo ? new Date(yr,mo,0).getDate() : 0;
    var dayKeys = [];
    for (var i=1; i<=daysInMonth; i++) dayKeys.push(yr+'-'+String(mo).padStart(2,'0')+'-'+String(i).padStart(2,'0'));
    var dayData = dayKeys.map(function(k){ return Object.assign({date:k}, prod[k]||{}); }).filter(function(e){ return e.census; });

    var avgCensus     = dayData.length ? Math.round(dayData.reduce(function(s,e){return s+(e.census||0);},0)/dayData.length*10)/10 : null;
    var avgDayStaff   = dayData.length ? Math.round(dayData.reduce(function(s,e){return s+(e.shiftDay||0);},0)/dayData.length*10)/10 : null;
    var avgNightStaff = dayData.length ? Math.round(dayData.reduce(function(s,e){return s+(e.shiftNight||0);},0)/dayData.length*10)/10 : null;
    var avgTotalStaff = dayData.length ? Math.round(dayData.reduce(function(s,e){return s+(e.shiftDay||0)+(e.shiftEve1||0)+(e.shiftNight||0);},0)/dayData.length*10)/10 : null;

    // Ratio compliance per day
    var dayRatioBreach = 0, nightRatioBreach = 0, teamDayBreach = 0, teamNightBreach = 0;
    dayData.forEach(function(e) {
      var dayRN  = e.shiftDay   || 0;
      var ngtRN  = e.shiftNight || 0;
      var adc    = e.census     || 0;
      if (!adc) return;
      // Estimate RN-only from total staff (rough: assume 60% RN on days, 70% nights)
      // Better: use actual ratio if we have it
      if (dayRN > 0  && (adc / dayRN)  > rnDay)    dayRatioBreach++;
      if (ngtRN > 0  && (adc / ngtRN)  > rnNight)  nightRatioBreach++;
      if (dayRN > 0  && (adc / dayRN)  > teamDay)  teamDayBreach++;
      if (ngtRN > 0  && (adc / ngtRN)  > teamNight)teamNightBreach++;
    });

    // ── SUMMARY CARDS ─────────────────────────────────────────
    var sumEl = document.getElementById('sa-summary-cards');
    if (sumEl) {
      var ppDate = pp ? new Date(pp+'T12:00:00') : null;
      var ppEnd  = ppDate ? new Date(ppDate) : null;
      if (ppEnd) ppEnd.setDate(ppDate.getDate()+13);
      var ppLbl  = ppDate && !isNaN(ppDate) ? ppDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' \u2013 '+ppEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : pp;

      sumEl.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;width:100%;">' +
        card('OT Staff This PP', otStaff.length, ppLbl, otStaff.length > 10 ? 'var(--red2)' : 'var(--amber2)') +
        card('Total OT Hours', totalOT.toFixed(1), 'this pay period', totalOT > 200 ? 'var(--red2)' : 'var(--accent2)') +
        card('Repeat OT Staff', repeatOT.length, '2+ pay periods', repeatOT.length > 5 ? 'var(--red2)' : 'var(--text2)') +
        card('Avg Daily Census', avgCensus !== null ? avgCensus : '—', monthKey ? monthKey : 'no data', 'var(--white)') +
        card('Day Ratio Breach', dayRatioBreach, 'days >1:'+rnDay+' RN', dayRatioBreach > 3 ? 'var(--red2)' : dayRatioBreach > 0 ? 'var(--amber2)' : 'var(--green2)') +
        card('Night Ratio Breach', nightRatioBreach, 'nights >1:'+rnNight+' RN', nightRatioBreach > 3 ? 'var(--red2)' : nightRatioBreach > 0 ? 'var(--amber2)' : 'var(--green2)') +
      '</div>';
    }

    // ── OT REDUCTION IDEAS ────────────────────────────────────
    var ideasEl = document.getElementById('sa-ot-ideas');
    if (ideasEl) {
      var ideas = [];

      if (repeatOT.length > 0) {
        var top3 = repeatOT.slice(0,3).map(function(s){ return s.name.split(',')[0]+' ('+s.count+' PPs, '+s.totalHrs.toFixed(0)+'h total)'; }).join(', ');
        ideas.push({ icon:'\u26a0\ufe0f', color:'var(--red2)', bg:'rgba(179,35,24,0.1)', border:'rgba(179,35,24,0.3)',
          text:'<strong>Chronic OT risk:</strong> '+top3+' have OT in multiple pay periods. Consider schedule restructuring, hiring a per-diem to cover their recurring gaps, or adjusting their FTE.' });
      }

      if (otStaff.length > 0) {
        var rnOT = otStaff.filter(function(s){return s.job==='RN';});
        var caOT = otStaff.filter(function(s){return s.job==='CA';});
        if (caOT.length > 2) ideas.push({ icon:'\u2702\ufe0f', color:'var(--amber2)', bg:'rgba(180,83,9,0.1)', border:'rgba(245,158,11,0.3)',
          text:'<strong>CA overtime ('+caOT.length+' staff):</strong> CA OT is often avoidable. Review whether call-outs are being covered by CA OT vs per-diem float pool. Adding 1-2 per-diem CAs could eliminate most of this.' });
        if (rnOT.length > 5) ideas.push({ icon:'\u{1F3E5}', color:'var(--accent2)', bg:'rgba(46,125,209,0.1)', border:'rgba(46,125,209,0.3)',
          text:'<strong>RN overtime ('+rnOT.length+' RNs):</strong> High RN OT count suggests chronic understaffing or call-out backfill pattern. Target: reduce by scheduling one extra float RN on historically high-OT shifts.' });
      }

      if (avgCensus !== null && avgDayStaff !== null) {
        var impliedRatio = Math.round(avgCensus / avgDayStaff * 10) / 10;
        if (impliedRatio < rnDay - 1) {
          var excessStaff = Math.round((avgDayStaff - avgCensus / rnDay) * 10) / 10;
          ideas.push({ icon:'\u{1F4CA}', color:'var(--green2)', bg:'rgba(26,122,74,0.1)', border:'rgba(37,168,104,0.3)',
            text:'<strong>Potential overstaff on days:</strong> Avg census '+avgCensus+' with avg '+avgDayStaff+' day staff = '+impliedRatio+':1 ratio \u2014 below your '+rnDay+':1 target. Estimated '+excessStaff+' staff/day above ratio minimum. Reducing 1 staff on lower-census days could cut OT need.' });
        }
      }

      if (dayRatioBreach === 0 && nightRatioBreach === 0 && otStaff.length > 5) {
        ideas.push({ icon:'\u{1F4A1}', color:'var(--purple2)', bg:'rgba(91,33,182,0.1)', border:'rgba(139,92,246,0.3)',
          text:'<strong>Ratios compliant but OT still high:</strong> OT may be driven by call-outs rather than scheduling gaps. Check call-out frequency in the Float & Sitter tracker to identify highest-callout staff for coaching.' });
      }

      if (ideas.length === 0) {
        ideas.push({ icon:'\u2713', color:'var(--green2)', bg:'rgba(26,122,74,0.08)', border:'rgba(37,168,104,0.25)',
          text:'No significant OT reduction flags for this pay period. Continue monitoring ratio compliance daily.' });
      }

      ideasEl.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;">' +
        sectionHead('\u{1F4A1} OT Reduction Opportunities') +
        ideas.map(function(d){ return chip('<span style="flex-shrink:0;font-size:13px;">'+d.icon+'</span><span>'+d.text+'</span>', d.color, d.bg, d.border); }).join('') +
        '</div>';
    }

    // ── OT STAFF LIST ─────────────────────────────────────────
    var otListEl = document.getElementById('sa-ot-list');
    if (otListEl) {
      var html = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;height:100%;">' +
        sectionHead('\u23f1 OT Staff This Pay Period ('+otStaff.length+')');

      if (!otStaff.length) {
        html += '<div style="color:var(--text3);font-size:11px;font-style:italic;">No OT data for this pay period. Import from UKG in the Staff \u2192 Overtime tab.</div>';
      } else {
        // Repeat OT badge
        var repeatNames = new Set(repeatOT.map(function(s){return s.name;}));
        html += '<div style="margin-bottom:8px;">' +
          otStaff.map(function(s,i) {
            var isRepeat = repeatNames.has(s.name) && repeatOT.find(function(r){return r.name===s.name;}) && repeatOT.find(function(r){return r.name===s.name;}).count >= 2;
            var isHigh   = s.hrs >= otThresh * 2;
            var barW     = Math.min(Math.round(s.hrs / Math.max(otStaff[0].hrs,1) * 100), 100);
            var barColor = isHigh ? 'var(--red2)' : s.hrs >= otThresh ? 'var(--amber2)' : 'var(--green2)';
            return '<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">' +
                '<div style="display:flex;align-items:center;gap:6px;">' +
                  fmtRole(s.job) +
                  '<span onclick="openEmployeeHub(\''+s.name.replace(/'/g,"\\'")+'\')" style="cursor:pointer;color:var(--white);font-size:12px;font-weight:600;text-decoration:underline dotted;text-underline-offset:2px;">'+s.name+'</span>' +
                  (isRepeat ? '<span style="font-size:9px;background:rgba(179,35,24,0.25);color:var(--red2);padding:1px 5px;border-radius:3px;">REPEAT</span>' : '') +
                '</div>' +
                '<span style="font-size:13px;font-weight:700;color:'+barColor+';">'+s.hrs.toFixed(1)+'h</span>' +
              '</div>' +
              '<div style="background:rgba(255,255,255,0.06);border-radius:2px;height:4px;">' +
                '<div style="background:'+barColor+';height:4px;border-radius:2px;width:'+barW+'%;"></div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      }

      // Repeat OT table
      if (repeatOT.length > 0) {
        html += '<div style="margin-top:12px;">' + sectionHead('REPEAT OT (\u22652 Pay Periods)') +
          repeatOT.slice(0,8).map(function(s) {
            return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;">' +
              '<div>'+fmtRole(s.job)+' <span onclick="openEmployeeHub(\''+s.name.replace(/'/g,"\\'")+'\')" style="cursor:pointer;color:var(--white);font-weight:600;text-decoration:underline dotted;text-underline-offset:2px;">'+s.name+'</span></div>' +
              '<div style="font-family:monospace;font-size:11px;color:var(--red2);">'+s.count+' PPs &nbsp; '+s.totalHrs.toFixed(0)+'h total</div>' +
            '</div>';
          }).join('') + '</div>';
      }

      html += '</div>';
      otListEl.innerHTML = html;
    }

    // ── YTD OVERTIME (Supabase employee_overtime_ytd, from WFDA export) ──
    renderOtYtdSection();

    // ── RATIO COMPLIANCE ─────────────────────────────────────
    var ratioEl = document.getElementById('sa-ratio-panel');
    if (ratioEl) {
      var html2 = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;">' +
        sectionHead('RATIO COMPLIANCE \u2014 ' + (monthKey||''));

      if (!dayData.length) {
        html2 += '<div style="color:var(--text3);font-size:11px;font-style:italic;">No HPPD data for this month. Import in Analytics \u2192 Productivity.</div>';
      } else {
        // Summary ratio stats
        html2 += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">';
        var ratioStat = function(lbl, breach, total, target) {
          var pct = total > 0 ? Math.round(breach/total*100) : 0;
          var clr = breach === 0 ? 'var(--green2)' : breach <= 3 ? 'var(--amber2)' : 'var(--red2)';
          return '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:5px;padding:8px 10px;">' +
            '<div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;">'+lbl+'</div>' +
            '<div style="font-size:18px;font-weight:700;color:'+clr+';">'+breach+' <span style="font-size:10px;font-weight:400;color:var(--text3);">of '+total+' days</span></div>' +
            '<div style="font-size:9px;color:var(--text3);">target 1:'+target+'</div>' +
          '</div>';
        };
        html2 += ratioStat('Day RN Breach', dayRatioBreach, dayData.length, rnDay);
        html2 += ratioStat('Night RN Breach', nightRatioBreach, dayData.length, rnNight);
        html2 += ratioStat('Day Team Breach', teamDayBreach, dayData.length, teamDay);
        html2 += ratioStat('Night Team Breach', teamNightBreach, dayData.length, teamNight);
        html2 += '</div>';

        // Daily ratio table
        html2 += '<div style="overflow-x:auto;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:10px;">' +
          '<thead><tr style="background:rgba(255,255,255,0.05);">' +
            '<th style="padding:5px 6px;text-align:left;color:var(--text3);">Date</th>' +
            '<th style="padding:5px 6px;text-align:right;color:var(--text3);">ADC</th>' +
            '<th style="padding:5px 6px;text-align:right;color:var(--amber2);">Day Stf</th>' +
            '<th style="padding:5px 6px;text-align:right;color:var(--amber2);">Ratio</th>' +
            '<th style="padding:5px 6px;text-align:right;color:var(--teal2);">Ngt Stf</th>' +
            '<th style="padding:5px 6px;text-align:right;color:var(--teal2);">Ratio</th>' +
          '</tr></thead><tbody>' +
          dayData.map(function(e) {
            var dayStf  = e.shiftDay   || 0;
            var ngtStf  = e.shiftNight || 0;
            var adc     = e.census     || 0;
            var dayR    = dayStf  > 0 ? Math.round(adc/dayStf*10)/10  : null;
            var ngtR    = ngtStf  > 0 ? Math.round(adc/ngtStf*10)/10  : null;
            var dayOK   = dayR === null || dayR <= rnDay;
            var ngtOK   = ngtR === null || ngtR <= rnNight;
            var dt      = new Date(e.date+'T12:00:00');
            var dtStr   = isNaN(dt) ? e.date : dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
            var rowBg   = (!dayOK || !ngtOK) ? 'background:rgba(179,35,24,0.08);' : '';
            return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);'+rowBg+'">' +
              '<td style="padding:5px 6px;color:var(--white);">'+dtStr+'</td>' +
              '<td style="padding:5px 6px;text-align:right;color:var(--text2);font-weight:600;">'+adc+'</td>' +
              '<td style="padding:5px 6px;text-align:right;color:var(--amber2);">'+(dayStf||'—')+'</td>' +
              '<td style="padding:5px 6px;text-align:right;font-weight:700;color:'+(dayOK?'var(--green2)':'var(--red2)')+';">'+(dayR!==null?dayR+':1':'—')+'</td>' +
              '<td style="padding:5px 6px;text-align:right;color:var(--teal2);">'+(ngtStf||'—')+'</td>' +
              '<td style="padding:5px 6px;text-align:right;font-weight:700;color:'+(ngtOK?'var(--green2)':'var(--red2)')+';">'+(ngtR!==null?ngtR+':1':'—')+'</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>';
      }
      html2 += '</div>';
      ratioEl.innerHTML = html2;
    }

    // ── CENSUS TREND ──────────────────────────────────────────
    var censusEl = document.getElementById('sa-census-trend');
    if (censusEl && dayData.length) {
      var maxC = Math.max.apply(null, dayData.map(function(e){return e.census||0;}));
      var minC = Math.min.apply(null, dayData.filter(function(e){return e.census;}).map(function(e){return e.census;}));
      var html3 = '<div style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;">' +
        sectionHead('AVERAGE DAILY CENSUS TREND \u2014 ' + (monthKey||'')) +
        '<div style="font-size:10px;color:var(--text3);margin-bottom:10px;">Census range: '+minC+'\u2013'+maxC+' &nbsp;&middot;&nbsp; Avg: '+(avgCensus||'—')+' &nbsp;&middot;&nbsp; Required day staff at 1:'+rnDay+': ~'+Math.ceil((avgCensus||0)/rnDay)+' RNs &nbsp;&middot;&nbsp; Required night staff at 1:'+rnNight+': ~'+Math.ceil((avgCensus||0)/rnNight)+' RNs</div>' +
        '<div style="display:flex;align-items:flex-end;gap:3px;height:80px;overflow-x:auto;">';
      dayData.forEach(function(e) {
        if (!e.census) return;
        var h = maxC > 0 ? Math.round(e.census/maxC*70) : 0;
        var dt = new Date(e.date+'T12:00:00');
        var lbl = isNaN(dt) ? '' : dt.getDate();
        var col = e.census > avgCensus*1.1 ? 'var(--red2)' : e.census < avgCensus*0.9 ? 'var(--green2)' : 'var(--accent2)';
        html3 += '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">' +
          '<div style="font-size:9px;color:var(--text3);">'+e.census+'</div>' +
          '<div style="width:18px;height:'+h+'px;background:'+col+';border-radius:2px 2px 0 0;" title="'+e.date+': ADC '+e.census+'"></div>' +
          '<div style="font-size:8px;color:var(--text3);">'+lbl+'</div>' +
        '</div>';
      });
      html3 += '</div>' +
        '<div style="display:flex;gap:14px;margin-top:8px;flex-wrap:wrap;">' +
          '<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text3);"><div style="width:10px;height:10px;background:var(--red2);border-radius:2px;"></div>Above avg (+10%)</div>' +
          '<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text3);"><div style="width:10px;height:10px;background:var(--accent2);border-radius:2px;"></div>Within range</div>' +
          '<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text3);"><div style="width:10px;height:10px;background:var(--green2);border-radius:2px;"></div>Below avg (-10%)</div>' +
        '</div>' +
      '</div>';
      censusEl.innerHTML = html3;
    } else if (censusEl) {
      censusEl.innerHTML = '';
    }
  };

  // Sync month to match selected PP
  window.sa_syncMonth = function() {
    var ppSel = document.getElementById('sa-pp-select');
    var mSel  = document.getElementById('sa-month-select');
    if (!ppSel || !mSel || !ppSel.value) return;
    var ppDate = new Date(ppSel.value+'T12:00:00');
    if (isNaN(ppDate)) return;
    var ppMo = ppDate.getFullYear()+'-'+String(ppDate.getMonth()+1).padStart(2,'0');
    // Try this month and previous month (PP spans 2 weeks)
    for (var i=0;i<mSel.options.length;i++) {
      if (mSel.options[i].value === ppMo) { mSel.value = ppMo; sa_render(); return; }
    }
    // Try prev month
    var prev = new Date(ppDate); prev.setMonth(prev.getMonth()-1);
    var prevMo = prev.getFullYear()+'-'+String(prev.getMonth()+1).padStart(2,'0');
    for (var j=0;j<mSel.options.length;j++) {
      if (mSel.options[j].value === prevMo) { mSel.value = prevMo; sa_render(); return; }
    }
    sa_render(); // fallback
  };

  // Auto-init when tab becomes visible
  var _sa_wasHidden = true;
  function _sa_poll() {
    var panel = document.getElementById('panel-staffanalysis');
    if (!panel) return;
    var hidden = panel.style.display === 'none' || panel.style.display === '';
    if (!hidden && _sa_wasHidden) {
      _sa_wasHidden = false;
      populateSelects();
      sa_render();
    } else if (hidden) {
      _sa_wasHidden = true;
    }
  }
  setInterval(_sa_poll, 300);

})();

// ══════════════════════════════════════════════════════════════════
// SHARED HELPERS — Staffing Balance & Open Shifts
// ══════════════════════════════════════════════════════════════════
(function() {
  var RN_DAY  = ['0700-1500'], RN_NGT  = ['1900-0700'];
  var CA_DAY  = ['0630-1430'], CA_NGT  = ['2230-0630','1830-0630'];

  window._sbShiftType = function(sk, role) {
    var r = (role||'').toUpperCase();
    if (r==='CA'||r==='UC') {
      if (CA_DAY.indexOf(sk)>=0) return 'day';
      if (CA_NGT.indexOf(sk)>=0) return 'night';
      return 'eve';
    }
    if (RN_DAY.indexOf(sk)>=0) return 'day';
    if (RN_NGT.indexOf(sk)>=0) return 'night';
    return 'eve';
  };
  window._sbFmtDate = function(iso) {
    var d = new Date(iso+'T12:00:00');
    return isNaN(d)?iso:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  };
  window._sbDOW = function(iso) {
    var d = new Date(iso+'T12:00:00');
    return isNaN(d)?'':['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  };
  window._sbGetTargets = function() {
    return {
      rnDay: parseInt((document.getElementById('sb-tgt-rn-day')||{}).value)||6,
      rnNgt: parseInt((document.getElementById('sb-tgt-rn-ngt')||{}).value)||5,
      caDay: parseInt((document.getElementById('sb-tgt-ca-day')||{}).value)||4,
      caNgt: parseInt((document.getElementById('sb-tgt-ca-ngt')||{}).value)||3,
    };
  };
  window._sbBuildDayData = function(roleFilter) {
    var dates = (state.dates||[]).slice().sort();
    var dd = {};
    dates.forEach(function(dt) {
      dd[dt] = { day:{rnlpn:[],ca:[]}, night:{rnlpn:[],ca:[]} };
      var pl = (state.placements||{})[dt]||{};
      Object.keys(pl).forEach(function(sk) {
        (pl[sk]||[]).forEach(function(p) {
          var r=(p.role||'').toUpperCase();
          if(['NURSE MGR','ASSIST NU RSE MGR','ASSIST NURSE MGR'].indexOf(r)>=0) return;
          var grp=(r==='CA'||r==='UC')?'ca':'rnlpn';
          if(roleFilter==='CA'&&grp!=='ca') return;
          if((roleFilter==='RN'||roleFilter==='LPN')&&grp!=='rnlpn') return;
          if(roleFilter==='RNLPN'&&grp!=='rnlpn') return;
          var st=window._sbShiftType(sk,r);
          if(st==='eve') return;
          dd[dt][st][grp].push({name:p.name,role:r,shiftKey:sk});
        });
      });
    });
    return dd;
  };
  window._sbStatus = function(dt, dd, tgts) {
    var d=dd[dt];
    var rnD=d.day.rnlpn.length, rnN=d.night.rnlpn.length;
    var caD=d.day.ca.length,    caN=d.night.ca.length;
    return {
      rnD:rnD,rnN:rnN,caD:caD,caN:caN,
      overRnD:Math.max(0,rnD-tgts.rnDay), underRnD:Math.max(0,tgts.rnDay-rnD),
      overRnN:Math.max(0,rnN-tgts.rnNgt), underRnN:Math.max(0,tgts.rnNgt-rnN),
      overCaD:Math.max(0,caD-tgts.caDay), underCaD:Math.max(0,tgts.caDay-caD),
      overCaN:Math.max(0,caN-tgts.caNgt), underCaN:Math.max(0,tgts.caNgt-caN),
    };
  };
})();

// ══════════════════════════════════════════════════════════════════
// STAFFING BALANCE OPTIMIZER
// ══════════════════════════════════════════════════════════════════
(function() {
  window.sbRender = function() {
    var panel=document.getElementById('panel-staffbalance');
    if(!panel||panel.style.display==='none') return;
    var roleFilter=(document.getElementById('sb-role-filter')||{}).value||'ALL';
    var tgts=window._sbGetTargets();
    var dates=(state.dates||[]).slice().sort();
    var noDataEl=document.getElementById('sb-nodata');
    var mainEl=document.getElementById('sb-main-content');
    var summEl=document.getElementById('sb-summary-row');
    var hmEl=document.getElementById('sb-heatmap-panel');
    var sgEl=document.getElementById('sb-suggestions-panel');
    var usEl=document.getElementById('sb-understaffed-panel');
    if(!dates.length){noDataEl.style.display='block';mainEl.style.display='none';summEl.innerHTML='';return;}
    noDataEl.style.display='none';mainEl.style.display='block';
    var dd=window._sbBuildDayData(roleFilter);
    function status(dt){return window._sbStatus(dt,dd,tgts);}
    var totOD=0,totON=0,totUD=0,totUN=0;
    dates.forEach(function(dt){var s=status(dt);totOD+=s.overRnD+s.overCaD;totON+=s.overRnN+s.overCaN;totUD+=s.underRnD+s.underCaD;totUN+=s.underRnN+s.underCaN;});
    function card(ic,lb,v,c,s){return '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">'+ic+' '+lb+'</div><div style="font-size:26px;font-weight:700;color:'+c+';">'+v+'</div><div style="font-size:10px;color:var(--text3);margin-top:2px;">'+s+'</div></div>';}
    if(summEl)summEl.innerHTML=card('☀️','Over — Days',totOD,'var(--red2)','excess · day')+card('🌙','Over — Nights',totON,'var(--red2)','excess · night')+card('☀️','Under — Days',totUD,'var(--amber2)','shortfall · day')+card('🌙','Under — Nights',totUN,'var(--amber2)','shortfall · night');
    if(hmEl){
      var showRn=roleFilter!=='CA', showCa=roleFilter!=='RN'&&roleFilter!=='LPN';
      var hm='<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px;"><div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:12px;">📅 Staff Count — All Imported Days</div><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:rgba(255,255,255,0.05);"><th style="padding:7px 8px;text-align:left;color:var(--text3);min-width:120px;">Date</th>';
      if(showRn){hm+='<th style="padding:7px 10px;text-align:center;color:var(--accent2);">☀️ RN/LPN Day</th><th style="padding:7px 10px;text-align:center;color:var(--teal2);">🌙 RN/LPN Night</th>';}
      if(showCa){hm+='<th style="padding:7px 10px;text-align:center;color:var(--amber2);">☀️ CA Day</th><th style="padding:7px 10px;text-align:center;color:var(--purple2);">🌙 CA Night</th>';}
      hm+='</tr></thead><tbody>';
      function cell(count,target){var d=count-target,style,tag;if(d>0){style='background:rgba(230,57,70,0.18);color:var(--red2);font-weight:700;';tag=' <span style="font-size:9px;">+'+d+'</span>';}else if(d===0){style='background:rgba(37,168,104,0.12);color:var(--green2);font-weight:700;';tag=' <span style="font-size:9px;opacity:.5;">✓</span>';}else if(count>0){style='background:rgba(245,158,11,0.12);color:var(--amber2);font-weight:600;';tag=' <span style="font-size:9px;">'+d+'</span>';}else{style='color:var(--text3);';tag='';}return'<td style="padding:7px 10px;text-align:center;'+style+'">'+count+tag+'</td>';}
      dates.forEach(function(dt){var s=status(dt),dow=window._sbDOW(dt),isWE=dow==='Sat'||dow==='Sun'||dow==='Fri';var rb=isWE?'background:rgba(255,255,255,0.025);':'';if(s.overRnD||s.overRnN||s.overCaD||s.overCaN)rb='background:rgba(230,57,70,0.05);';hm+='<tr style="border-bottom:1px solid rgba(255,255,255,0.04);'+rb+'"><td style="padding:7px 8px;white-space:nowrap;"><span style="font-weight:600;color:'+(isWE?'var(--amber2)':'var(--white)')+';">'+dow+'</span> <span style="font-size:10px;color:var(--text3);">'+window._sbFmtDate(dt).replace(/^\w+, /,'')+'</span></td>';if(showRn){hm+=cell(s.rnD,tgts.rnDay);hm+=cell(s.rnN,tgts.rnNgt);}if(showCa){hm+=cell(s.caD,tgts.caDay);hm+=cell(s.caN,tgts.caNgt);}hm+='</tr>';});
      hm+='</tbody></table></div></div>';hmEl.innerHTML=hm;
    }
    if(sgEl){
      var suggestions=[];
      dates.forEach(function(srcDt){
        var s=status(srcDt);
        function suggest(over,roster,sl,rl,ic,col,uk){if(over<=0)return;var dests=dates.filter(function(dt){return dt!==srcDt&&status(dt)[uk]>0;});if(!dests.length)return;suggestions.push({srcDt:srcDt,srcLabel:window._sbFmtDate(srcDt),overCount:over,toMove:roster.slice(0,over),dests:dests,shiftLabel:sl,roleLabel:rl,icon:ic,color:col,underKey:uk});}
        if(roleFilter!=='CA'){suggest(s.overRnD,dd[srcDt].day.rnlpn,'Day','RN/LPN','☀️','var(--accent2)','underRnD');suggest(s.overRnN,dd[srcDt].night.rnlpn,'Night','RN/LPN','🌙','var(--teal2)','underRnN');}
        if(roleFilter!=='RN'&&roleFilter!=='LPN'){suggest(s.overCaD,dd[srcDt].day.ca,'Day','CA','☀️','var(--amber2)','underCaD');suggest(s.overCaN,dd[srcDt].night.ca,'Night','CA','🌙','var(--purple2)','underCaN');}
      });
      var sg='<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px;"><div style="font-size:12px;font-weight:700;color:var(--white);margin-bottom:12px;">💡 Rebalancing Suggestions</div>';
      if(!suggestions.length){sg+='<div style="color:var(--green2);font-size:12px;padding:24px 0;text-align:center;">✅ No rebalanceable overstaff detected.</div>';}
      else{suggestions.forEach(function(s){var dc=s.dests.map(function(dt){var sh=status(dt)[s.underKey];return'<span style="display:inline-block;background:rgba(37,168,104,0.15);color:var(--green2);padding:2px 8px;border-radius:12px;font-weight:700;font-size:10px;margin:2px;">'+window._sbFmtDate(dt)+' <span style="opacity:.7;">(−'+sh+')</span></span>';}).join('');var destLabels=s.dests.map(function(dt){return window._sbFmtDate(dt);}).join(', ');sg+='<div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-left:3px solid '+s.color+';border-radius:6px;padding:10px 12px;margin-bottom:9px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span>'+s.icon+'</span><span style="font-size:12px;font-weight:700;color:var(--white);">'+s.srcLabel+' — '+s.shiftLabel+' '+s.roleLabel+'</span><span style="font-size:10px;background:rgba(230,57,70,0.2);color:var(--red2);padding:1px 7px;border-radius:10px;font-weight:700;">+'+s.overCount+' over</span></div><div style="margin-bottom:9px;"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">Consider moving:</div>'+s.toMove.map(function(p){var jc=p.role==='RN'?'var(--accent2)':p.role==='LPN'?'var(--purple2)':'var(--teal2)';var safeName=p.name.replace(/'/g,"\\'");var safeSrc=s.srcLabel.replace(/'/g,"\\'");var safeShift=s.shiftLabel.replace(/'/g,"\\'");var safeRole=s.roleLabel.replace(/'/g,"\\'");var safeDests=destLabels.replace(/'/g,"\\'");var hasPhone=!!(state.phones&&state.phones[p.name]);var smsBtn=hasPhone?'<button class="sms-text-btn" title="Text switch request" onclick="sbSendSwitchSMS(\''+safeName+'\',\''+safeSrc+'\',\''+safeShift+'\',\''+safeRole+'\',\''+safeDests+'\')" style="padding:2px 6px;font-size:10px;">💬</button>':'<button class="sms-text-btn no-phone" disabled title="Add phone number first" style="padding:2px 6px;font-size:10px;">💬</button>';return'<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="font-size:9px;font-weight:700;font-family:monospace;background:rgba(255,255,255,0.08);color:'+jc+';padding:1px 5px;border-radius:3px;">'+p.role+'</span><span style="font-size:12px;font-weight:600;color:var(--white);">'+p.name+'</span>'+smsBtn+'<span style="font-size:9px;color:var(--text3);margin-left:auto;font-family:monospace;">'+p.shiftKey+'</span></div>';}).join('')+'</div><div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">To (same '+s.shiftLabel.toLowerCase()+' shift):</div><div style="display:flex;flex-wrap:wrap;gap:3px;">'+dc+'</div></div></div>';});}
      sg+='</div>';sgEl.innerHTML=sg;
    }
    if(usEl){
      var items=[];
      dates.forEach(function(dt){var s=status(dt),row=[];function hasOver(uk){return dates.some(function(d2){return d2!==dt&&status(d2)[uk.replace('under','over')]>0;});}if(s.underRnD&&!hasOver('underRnD')&&roleFilter!=='CA')row.push('☀️ RN/LPN short '+s.underRnD);if(s.underRnN&&!hasOver('underRnN')&&roleFilter!=='CA')row.push('🌙 RN/LPN short '+s.underRnN);if(s.underCaD&&!hasOver('underCaD')&&roleFilter!=='RN'&&roleFilter!=='LPN')row.push('☀️ CA short '+s.underCaD);if(s.underCaN&&!hasOver('underCaN')&&roleFilter!=='RN'&&roleFilter!=='LPN')row.push('🌙 CA short '+s.underCaN);if(row.length)items.push({dt:dt,rows:row});});
      if(!items.length){usEl.innerHTML='';return;}
      var us='<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px;"><div style="font-size:12px;font-weight:700;color:var(--amber2);margin-bottom:10px;">⚠️ Understaffed — No Donor (Agency/OT)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;">';
      items.forEach(function(item){var dow=window._sbDOW(item.dt),isWE=dow==='Sat'||dow==='Sun'||dow==='Fri';us+='<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:6px;padding:8px 10px;"><div style="font-size:11px;font-weight:700;color:'+(isWE?'var(--amber2)':'var(--white)')+';">'+window._sbFmtDate(item.dt)+'</div>'+item.rows.map(function(r){return'<div style="font-size:11px;color:var(--text2);margin-top:3px;">'+r+'</div>';}).join('')+'</div>';});
      us+='</div></div>';usEl.innerHTML=us;
    }
  };
  window.sbSendSwitchSMS = function(name, srcLabel, shiftLabel, roleLabel, destLabels) {
    var phone = (state.phones||{})[name] || '';
    if (!phone) { alert('No phone number on file for ' + name + '. Add it in the Phone column first.'); return; }
    var msg = 'Hi ' + name + ', staffing balance check for ' + srcLabel + ' (' + shiftLabel + ' ' + roleLabel + ') — we\'re over on that day. Would you be able to switch to ' + destLabels + ' instead (same shift type)? Let me know. — Unit 3B';
    openSMSOrCopy(phone.replace(/\D/g,''), msg);
  };
  window.sbPrint = function() {
    var roleFilter=(document.getElementById('sb-role-filter')||{}).value||'ALL';
    var tgts=window._sbGetTargets();
    var dates=(state.dates||[]).slice().sort();
    if(!dates.length){alert('No UKG data imported yet.');return;}
    var dd=window._sbBuildDayData(roleFilter);
    function status(dt){return window._sbStatus(dt,dd,tgts);}
    var printed=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    var dateFrom=window._sbFmtDate(dates[0]), dateTo=window._sbFmtDate(dates[dates.length-1]);
    var roleLabel=roleFilter==='ALL'?'All Roles':roleFilter==='RNLPN'?'RN & LPN':roleFilter;

    var suggestions=[];
    dates.forEach(function(srcDt){
      var s=status(srcDt);
      function suggest(over,roster,sl,rl,ic,uk){if(over<=0)return;var dests=dates.filter(function(dt){return dt!==srcDt&&status(dt)[uk]>0;});if(!dests.length)return;suggestions.push({srcDt:srcDt,srcLabel:window._sbFmtDate(srcDt),overCount:over,toMove:roster.slice(0,over),dests:dests,shiftLabel:sl,roleLabel:rl,icon:ic,underKey:uk});}
      if(roleFilter!=='CA'){suggest(s.overRnD,dd[srcDt].day.rnlpn,'Day','RN/LPN','☀️','underRnD');suggest(s.overRnN,dd[srcDt].night.rnlpn,'Night','RN/LPN','🌙','underRnN');}
      if(roleFilter!=='RN'&&roleFilter!=='LPN'){suggest(s.overCaD,dd[srcDt].day.ca,'Day','CA','☀️','underCaD');suggest(s.overCaN,dd[srcDt].night.ca,'Night','CA','🌙','underCaN');}
    });

    var usItems=[];
    dates.forEach(function(dt){
      var s=status(dt),row=[];
      function hasOver(uk){return dates.some(function(d2){return d2!==dt&&status(d2)[uk.replace('under','over')]>0;});}
      if(s.underRnD&&!hasOver('underRnD')&&roleFilter!=='CA')row.push('☀️ RN/LPN short '+s.underRnD);
      if(s.underRnN&&!hasOver('underRnN')&&roleFilter!=='CA')row.push('🌙 RN/LPN short '+s.underRnN);
      if(s.underCaD&&!hasOver('underCaD')&&roleFilter!=='RN'&&roleFilter!=='LPN')row.push('☀️ CA short '+s.underCaD);
      if(s.underCaN&&!hasOver('underCaN')&&roleFilter!=='RN'&&roleFilter!=='LPN')row.push('🌙 CA short '+s.underCaN);
      if(row.length)usItems.push({dt:dt,rows:row});
    });

    var html='<div id="sb-print-target" style="font-family:\'IBM Plex Sans\',Arial,sans-serif;color:#0a1628;background:#fff;padding:0;">';
    html+='<div style="border-bottom:3px solid #1a4480;padding-bottom:14px;margin-bottom:20px;">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">'+
        '<div>'+
          '<div style="font-size:22px;font-weight:700;color:#1a4480;">3B Tele Med Surg — Staffing Balance Suggestions</div>'+
          '<div style="font-size:12px;color:#475569;margin-top:3px;">Arnot Ogden Medical Center &nbsp;·&nbsp; Unit 3B &nbsp;·&nbsp; '+roleLabel+' &nbsp;·&nbsp; Printed: '+printed+'</div>'+
        '</div>'+
        '<div style="text-align:right;">'+
          '<div style="font-size:13px;font-weight:600;color:#1a4480;">'+dateFrom+' – '+dateTo+'</div>'+
          '<div style="font-size:11px;color:#64748b;">'+dates.length+' day(s)</div>'+
        '</div>'+
      '</div></div>';

    html+='<div style="font-size:13px;font-weight:700;color:#1a4480;border-left:4px solid #1a4480;padding-left:10px;margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px;">💡 Rebalancing Suggestions</div>';
    if(!suggestions.length){
      html+='<div style="padding:14px 0;font-size:12px;color:#16a34a;font-weight:600;">✅ No rebalanceable overstaff detected for this period.</div>';
    } else {
      suggestions.forEach(function(s){
        html+='<div style="border:1px solid #e2e8f0;border-left:4px solid #1a4480;border-radius:8px;padding:10px 14px;margin-bottom:14px;page-break-inside:avoid;">';
        html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'+
          '<span style="font-size:13px;font-weight:700;color:#0f2040;">'+s.icon+' '+s.srcLabel+' — '+s.shiftLabel+' '+s.roleLabel+'</span>'+
          '<span style="font-size:10px;background:#fee2e2;color:#b32318;padding:2px 9px;border-radius:10px;font-weight:700;">+'+s.overCount+' over</span>'+
        '</div>';
        html+='<div style="margin-bottom:9px;">'+
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">Consider moving:</div>';
        s.toMove.forEach(function(p){
          html+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;">'+
            '<span style="font-size:9px;font-weight:700;font-family:monospace;background:#f1f5f9;color:#1a4480;padding:1px 6px;border-radius:3px;">'+p.role+'</span>'+
            '<span style="font-size:12px;font-weight:600;color:#0f2040;">'+p.name+'</span>'+
            '<span style="font-size:9px;color:#94a3b8;margin-left:auto;font-family:monospace;">'+p.shiftKey+'</span>'+
            '<span style="font-size:9px;color:#94a3b8;">☐ moved</span>'+
          '</div>';
        });
        html+='</div>';
        html+='<div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">To (same '+s.shiftLabel.toLowerCase()+' shift — pick one):</div><div style="display:flex;flex-wrap:wrap;gap:5px;">';
        s.dests.forEach(function(dt){
          var sh=status(dt)[s.underKey];
          html+='<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;padding:3px 9px;border-radius:12px;font-weight:700;font-size:10px;">'+window._sbFmtDate(dt)+' <span style="opacity:.7;">(−'+sh+')</span></span>';
        });
        html+='</div></div>';
        html+='</div>';
      });
    }

    if(usItems.length){
      html+='<div style="page-break-before:always;font-size:13px;font-weight:700;color:#b45309;border-left:4px solid #b45309;padding-left:10px;margin:20px 0 14px;text-transform:uppercase;letter-spacing:.5px;">⚠️ Understaffed — No Donor Available (Agency/OT)</div>';
      html+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">';
      usItems.forEach(function(item){
        html+='<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;">'+
          '<div style="font-size:12px;font-weight:700;color:#0f2040;">'+window._sbFmtDate(item.dt)+'</div>'+
          item.rows.map(function(r){return '<div style="font-size:11px;color:#475569;margin-top:3px;">'+r+'</div>';}).join('')+
        '</div>';
      });
      html+='</div>';
    }

    html+='<div style="margin-top:24px;padding-top:12px;border-top:2px solid #1a4480;display:flex;justify-content:space-between;font-size:10px;color:#64748b;">'+
      '<span>3B Tele Med Surg · Arnot Ogden Medical Center</span>'+
      '<span>Targets: RN/LPN Day '+tgts.rnDay+' · Night '+tgts.rnNgt+' · CA Day '+tgts.caDay+' · Night '+tgts.caNgt+'</span>'+
      '<span>'+printed+'</span></div>';
    html+='</div>';

    var win=window.open('','_blank','width=1000,height=700');
    win.document.write('<!DOCTYPE html><html><head><title>Staffing Balance Suggestions — 3B</title>'+
      '<style>body{font-family:"IBM Plex Sans",Arial,sans-serif;margin:24px 32px;color:#0a1628;background:#fff;font-size:12px;}'+
      '@page{margin:18mm 14mm;size:letter;}'+
      '@media print{body{margin:0;padding:0;}}'+
      '</style></head><body>');
    win.document.write(html);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function(){win.print();},350);
  };

  var _sb_h=true;
  setInterval(function(){var p=document.getElementById('panel-staffbalance');if(!p)return;var h=p.style.display==='none'||p.style.display==='';if(!h&&_sb_h){_sb_h=false;sbRender();}else if(h){_sb_h=true;}},300);
})();

// ══════════════════════════════════════════════════════════════════
// OPEN SHIFTS REPORT
// ══════════════════════════════════════════════════════════════════
(function() {
  var _osRole = 'ALL'; // current role filter

  // Button styling
  var BTN_COLORS = {
    ALL:   { bg:'var(--accent2)',  border:'var(--accent2)'  },
    RN:    { bg:'#1a4480',        border:'#1a4480'          },
    LPN:   { bg:'#5b21b6',        border:'#5b21b6'          },
    RNLPN: { bg:'#0e4f8a',        border:'#0e4f8a'          },
    CA:    { bg:'#b45309',        border:'#b45309'          },
  };

  window.osSetRole = function(role) {
    _osRole = role;
    // Update button styles
    ['ALL','RN','LPN','RNLPN','CA'].forEach(function(r) {
      var btn = document.getElementById('os-btn-'+r);
      if (!btn) return;
      var active = r === role;
      var col = BTN_COLORS[r] || BTN_COLORS.ALL;
      btn.style.background = active ? col.bg : 'transparent';
      btn.style.borderColor = active ? col.border : 'var(--border)';
      btn.style.color       = active ? '#fff' : 'var(--text2)';
    });
    osRender();
  };

  window.osRender = function() {
    var panel  = document.getElementById('panel-openshifts');
    if (!panel || panel.style.display==='none') return;
    var tgts   = window._sbGetTargets();
    var dates  = (state.dates||[]).slice().sort();
    var noData = document.getElementById('os-nodata');
    var report = document.getElementById('os-report');
    if (!dates.length) { noData.style.display='block'; report.innerHTML=''; return; }
    noData.style.display = 'none';

    var role   = _osRole; // 'ALL','RN','LPN','RNLPN','CA'
    var printed  = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    var dateFrom = window._sbFmtDate(dates[0]);
    var dateTo   = window._sbFmtDate(dates[dates.length-1]);

    // Role label for header
    var roleLabel = role==='ALL'?'All Positions':role==='RNLPN'?'RN & LPN':role;

    // Build sections to show
    var sections = [];
    if (role==='ALL'||role==='RN'||role==='LPN'||role==='RNLPN') {
      sections.push({ label:'RN / LPN — Day Shift (0700–1500)',   type:'day',   grp:'rnlpn', tgt:tgts.rnDay, icon:'☀️', hdrBg:'#1a4480' });
      sections.push({ label:'RN / LPN — Night Shift (1900–0700)', type:'night', grp:'rnlpn', tgt:tgts.rnNgt, icon:'🌙', hdrBg:'#0e7490' });
    }
    if (role==='ALL'||role==='CA') {
      sections.push({ label:'Clinical Assistant (CA) — Day Shift (0630–1430)',   type:'day',   grp:'ca', tgt:tgts.caDay, icon:'☀️', hdrBg:'#b45309' });
      sections.push({ label:'Clinical Assistant (CA) — Night Shift (2230–0630)', type:'night', grp:'ca', tgt:tgts.caNgt, icon:'🌙', hdrBg:'#5b21b6' });
    }

    // Per-date filled counts
    function getCounts(dt) {
      var pl = (state.placements||{})[dt]||{}, rnD=0,rnN=0,caD=0,caN=0;
      Object.keys(pl).forEach(function(sk){
        (pl[sk]||[]).forEach(function(p){
          var r=(p.role||'').toUpperCase();
          if(['NURSE MGR','ASSIST NU RSE MGR','ASSIST NURSE MGR'].indexOf(r)>=0) return;
          var st=window._sbShiftType(sk,r);
          if(st==='eve') return;
          if((r==='RN'||r==='LPN')&&st==='day')   rnD++;
          if((r==='RN'||r==='LPN')&&st==='night') rnN++;
          if(r==='CA'&&st==='day')                 caD++;
          if(r==='CA'&&st==='night')               caN++;
        });
      });
      return { rnD:rnD,rnN:rnN,caD:caD,caN:caN,
        openRnD:Math.max(0,tgts.rnDay-rnD), openRnN:Math.max(0,tgts.rnNgt-rnN),
        openCaD:Math.max(0,tgts.caDay-caD), openCaN:Math.max(0,tgts.caNgt-caN) };
    }

    // Build filled staff lists for daily detail
    function getStaff(dt) {
      var pl=(state.placements||{})[dt]||{},rnD=[],rnN=[],caD=[],caN=[];
      Object.keys(pl).forEach(function(sk){
        (pl[sk]||[]).forEach(function(p){
          var r=(p.role||'').toUpperCase();
          if(['NURSE MGR','ASSIST NU RSE MGR','ASSIST NURSE MGR'].indexOf(r)>=0) return;
          // Filter by selected role
          if(role==='RN'&&r!=='RN') return;
          if(role==='LPN'&&r!=='LPN') return;
          if(role==='RNLPN'&&r!=='RN'&&r!=='LPN') return;
          if(role==='CA'&&r!=='CA') return;
          var st=window._sbShiftType(sk,r);
          if(st==='eve') return;
          if((r==='RN'||r==='LPN')&&st==='day')   rnD.push({name:p.name,role:r});
          if((r==='RN'||r==='LPN')&&st==='night') rnN.push({name:p.name,role:r});
          if(r==='CA'&&st==='day')                 caD.push({name:p.name,role:r});
          if(r==='CA'&&st==='night')               caN.push({name:p.name,role:r});
        });
      });
      return {rnD:rnD,rnN:rnN,caD:caD,caN:caN};
    }

    // ── Build HTML ────────────────────────────────────────────────
    var html = '<div id="os-print-target" style="font-family:\'IBM Plex Sans\',Arial,sans-serif;color:#0a1628;background:#fff;padding:0;">';

    // Report header
    html += '<div style="border-bottom:3px solid #1a4480;padding-bottom:14px;margin-bottom:20px;">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">'+
        '<div>'+
          '<div style="font-size:22px;font-weight:700;color:#1a4480;">3B Tele Med Surg — Open Shift Report</div>'+
          '<div style="font-size:12px;color:#475569;margin-top:3px;">Arnot Ogden Medical Center &nbsp;·&nbsp; Unit 3B &nbsp;·&nbsp; '+roleLabel+' &nbsp;·&nbsp; Printed: '+printed+'</div>'+
        '</div>'+
        '<div style="text-align:right;">'+
          '<div style="font-size:13px;font-weight:600;color:#1a4480;">'+dateFrom+' – '+dateTo+'</div>'+
          '<div style="font-size:11px;color:#64748b;">'+dates.length+' day(s)</div>'+
        '</div>'+
      '</div></div>';

    // ── Section 1: Summary by position ────────────────────────────
    html += '<div style="margin-bottom:28px;">';
    html += '<div style="font-size:13px;font-weight:700;color:#1a4480;border-left:4px solid #1a4480;padding-left:10px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;">Open Shifts by Position</div>';

    sections.forEach(function(sec) {
      var hasAny = dates.some(function(dt) {
        var c = getCounts(dt);
        return sec.grp==='rnlpn'
          ? (sec.type==='day' ? c.openRnD : c.openRnN) > 0
          : (sec.type==='day' ? c.openCaD : c.openCaN) > 0;
      });

      html += '<div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">';
      html += '<div style="background:'+sec.hdrBg+';color:#fff;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;">'+
        '<div style="font-size:12px;font-weight:700;">'+sec.icon+' '+sec.label+'</div>'+
        '<div style="font-size:11px;opacity:.85;">Target: '+sec.tgt+'/shift</div>'+
      '</div>';

      if (!hasAny) {
        html += '<div style="padding:10px 14px;font-size:12px;color:#64748b;font-style:italic;">✅ No open shifts for this position/shift during the selected period.</div>';
      } else {
        html += '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f1f5f9;">'+
          '<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;border-bottom:1px solid #e2e8f0;">Date</th>'+
          '<th style="padding:7px 12px;text-align:center;color:#475569;font-weight:700;border-bottom:1px solid #e2e8f0;">Filled</th>'+
          '<th style="padding:7px 12px;text-align:center;color:#475569;font-weight:700;border-bottom:1px solid #e2e8f0;">Target</th>'+
          '<th style="padding:7px 12px;text-align:center;color:#b32318;font-weight:700;border-bottom:1px solid #e2e8f0;">Open</th>'+
          '<th style="padding:7px 12px;text-align:left;color:#475569;font-weight:700;border-bottom:1px solid #e2e8f0;">Write-In</th>'+
        '</tr></thead><tbody>';

        var alt=false;
        dates.forEach(function(dt) {
          var c = getCounts(dt);
          var filled = sec.grp==='rnlpn' ? (sec.type==='day'?c.rnD:c.rnN) : (sec.type==='day'?c.caD:c.caN);
          var open   = sec.grp==='rnlpn' ? (sec.type==='day'?c.openRnD:c.openRnN) : (sec.type==='day'?c.openCaD:c.openCaN);
          if (open<=0) return;
          var dow=window._sbDOW(dt), isWE=dow==='Sat'||dow==='Sun'||dow==='Fri';
          var rowBg=isWE?'#fefce8':(alt?'#f8fafc':'#fff'); alt=!alt;
          var slots='';
          for(var i=0;i<open;i++) slots+='<div style="border-bottom:1px solid #e2e8f0;margin-top:4px;height:18px;min-width:180px;"></div>';
          html += '<tr style="background:'+rowBg+';border-bottom:1px solid #e2e8f0;">'+
            '<td style="padding:9px 12px;font-weight:600;color:'+(isWE?'#b45309':'#0f2040')+';">'+window._sbFmtDate(dt)+(isWE?' <span style="font-size:10px;color:#b45309;font-weight:400;">[WE]</span>':'')+'</td>'+
            '<td style="padding:9px 12px;text-align:center;color:#475569;">'+filled+'</td>'+
            '<td style="padding:9px 12px;text-align:center;color:#475569;">'+sec.tgt+'</td>'+
            '<td style="padding:9px 12px;text-align:center;"><span style="background:#fee2e2;color:#b32318;font-weight:700;font-size:13px;padding:2px 10px;border-radius:12px;">'+open+'</span></td>'+
            '<td style="padding:9px 12px;">'+slots+'</td>'+
          '</tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
    });
    html += '</div>'; // end section 1

    // ── Section 2: Daily detail ────────────────────────────────────
    html += '<div style="page-break-before:always;">';
    html += '<div style="font-size:13px;font-weight:700;color:#1a4480;border-left:4px solid #1a4480;padding-left:10px;margin-bottom:16px;text-transform:uppercase;letter-spacing:.5px;">Daily Detail — '+roleLabel+'</div>';

    dates.forEach(function(dt) {
      var dow=window._sbDOW(dt), isWE=dow==='Sat'||dow==='Sun'||dow==='Fri';
      var c=getCounts(dt), st=getStaff(dt);

      var showRnlpn = role!=='CA';
      var showCa    = role!=='RN'&&role!=='LPN'&&role!=='RNLPN';

      var openRnD = showRnlpn ? c.openRnD : 0;
      var openRnN = showRnlpn ? c.openRnN : 0;
      var openCaD = showCa    ? c.openCaD : 0;
      var openCaN = showCa    ? c.openCaN : 0;
      var totalOpen = openRnD+openRnN+openCaD+openCaN;

      html += '<div style="border:1px solid '+(isWE?'#fcd34d':'#cbd5e1')+';border-radius:8px;margin-bottom:14px;overflow:hidden;border-left:4px solid '+(totalOpen>0?'#b32318':'#16a34a')+';">';
      html += '<div style="background:'+(isWE?'#fef9c3':'#f8fafc')+';padding:9px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;">'+
        '<div style="font-size:13px;font-weight:700;color:'+(isWE?'#b45309':'#1a4480')+';">'+window._sbFmtDate(dt)+'</div>'+
        '<div style="font-size:11px;color:'+(totalOpen>0?'#b32318':'#16a34a')+';font-weight:700;">'+(totalOpen>0?totalOpen+' OPEN SHIFT'+(totalOpen>1?'S':''):'✅ FULLY STAFFED')+'</div>'+
      '</div>';

      function shiftCol(title, filledArr, openCt, tgt, borderRight) {
        var c2='<div style="padding:10px 14px;'+(borderRight?'border-right:1px solid #e2e8f0;':'')+'">';
        c2+='<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:8px;">'+title+' <span style="font-weight:400;color:#94a3b8;">('+filledArr.length+'/'+tgt+')</span></div>';
        filledArr.forEach(function(p){var rc=p.role==='RN'?'#1a4480':p.role==='LPN'?'#5b21b6':'#0e7490';c2+='<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:9px;font-weight:700;color:'+rc+';background:'+rc+'18;padding:1px 5px;border-radius:3px;min-width:28px;text-align:center;">'+p.role+'</span><span style="font-size:11px;color:#0f2040;">'+p.name+'</span></div>';});
        for(var i=0;i<openCt;i++)c2+='<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #fee2e2;background:#fff5f5;"><span style="font-size:9px;font-weight:700;color:#b32318;background:#fee2e2;padding:1px 5px;border-radius:3px;min-width:28px;text-align:center;">OPEN</span><div style="flex:1;border-bottom:1px solid #fca5a5;height:16px;"></div></div>';
        c2+='</div>';return c2;
      }

      if (showRnlpn) {
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">';
        html += shiftCol('☀️ Day — RN/LPN', st.rnD, openRnD, tgts.rnDay, true);
        html += shiftCol('🌙 Night — RN/LPN', st.rnN, openRnN, tgts.rnNgt, false);
        html += '</div>';
      }
      if (showCa) {
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;'+(showRnlpn?'border-top:1px solid #e2e8f0;background:#fafbff;':'')+'">';
        html += shiftCol('☀️ Day — CA', st.caD, openCaD, tgts.caDay, true);
        html += shiftCol('🌙 Night — CA', st.caN, openCaN, tgts.caNgt, false);
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    // Footer
    html += '<div style="margin-top:24px;padding-top:12px;border-top:2px solid #1a4480;display:flex;justify-content:space-between;font-size:10px;color:#64748b;">'+
      '<span>3B Tele Med Surg · Arnot Ogden Medical Center</span>'+
      '<span>Targets: RN/LPN Day '+tgts.rnDay+' · Night '+tgts.rnNgt+' · CA Day '+tgts.caDay+' · Night '+tgts.caNgt+'</span>'+
      '<span>'+printed+'</span></div>';
    html += '</div>';
    report.innerHTML = html;
  };

  window.osPrint = function() {
    osRender();
    var content = document.getElementById('os-print-target');
    if (!content) return;
    var win = window.open('','_blank','width=1000,height=700');
    win.document.write('<!DOCTYPE html><html><head><title>Open Shift Report — 3B</title>'+
      '<style>body{font-family:"IBM Plex Sans",Arial,sans-serif;margin:24px 32px;color:#0a1628;background:#fff;font-size:12px;}'+
      'table{border-collapse:collapse;width:100%;}th,td{padding:7px 10px;}'+
      '@page{margin:18mm 14mm;size:letter;}'+
      '@media print{body{margin:0;padding:0;}.no-print{display:none!important;}}'+
      `
#mgr-priority-brief-card{margin-top:0;}
@media(max-width:900px){
  #mgr-morning-brief > div{grid-template-columns:1fr !important;}
}

@media(max-width:1100px){
  #mgr-daily-action-plan > div{grid-template-columns:repeat(2,minmax(180px,1fr)) !important;}
}
@media(max-width:650px){
  #mgr-daily-action-plan > div{grid-template-columns:1fr !important;}
}

@media(max-width:1200px){
  #mgr-data-health > div:last-child{grid-template-columns:repeat(3,minmax(150px,1fr)) !important;}
}
@media(max-width:650px){
  #mgr-data-health > div:last-child{grid-template-columns:1fr !important;}
}

@media(max-width:1000px){
  #mgr-exception-summary > div{grid-template-columns:repeat(3,minmax(120px,1fr)) !important;}
  #mgr-exception-details > div > div{grid-template-columns:80px 1fr !important;}
  #mgr-exception-details > div > div > div:nth-child(3),
  #mgr-exception-details > div > div > div:nth-child(4){grid-column:2;}
}
</style></head><body>`);
    win.document.write(content.outerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function(){win.print();},350);
  };

  // Auto-init when tab becomes visible + set initial button state
  var _os_h=true;
  setInterval(function(){
    var p=document.getElementById('panel-openshifts');if(!p)return;
    var h=p.style.display==='none'||p.style.display==='';
    if(!h&&_os_h){_os_h=false;osSetRole(_osRole);osRender();}else if(h){_os_h=true;}
  },300);

})();

