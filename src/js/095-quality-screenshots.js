/* ───────────────────────────────────────────────────────────────────────────
   Quality tab: add data from Epic screenshots (BCMA scanning + Post-PRN pain reassessment)
   Paste (Ctrl+V) / drop / pick screenshots → in-browser OCR → editable preview → save.

   Understands 4 screenshot types (any mix, any order; a list belongs to the staff in the
   summary screenshot that comes before it):
     scanSummary  "Detailed View" BCMA: Compliant / Non-Compliant / All BCMA Admin Details by month
     painSummary  "Detailed View" Post-PRN: Timely / Untimely / All Reassessment Details
     scanList     Medication list with Patient/Med Scanned? columns (each row = a missed scan)
     painList     Medication list with Reassess Time / Has Timely Reassessment? (each row = a miss)

   Stored on state.qualityData[staff]['YYYY-MM']:
     scans/scanTotal, pain/painTotal   (same fields the table already uses)
     scanMiss{id:{m,f,t,w}}            m=drug, f=full name, t=admin time, w=P|M|B (patient/med/both)
     painMiss{id:{m,f,t,mins,filed}}
   Maps (not arrays) keyed by time+name, so re-adding the same screenshot never double counts.
   Only drug names/times are kept, never the image and never patient identifiers.
   ─────────────────────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';

  var MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var MON_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ═════════════════════════ PARSER (pure, no DOM) ═════════════════════════ */

  function bb(w) { var b = w.bbox || {}; return { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }; }
  function cx(w) { var b = bb(w); return (b.x0 + b.x1) / 2; }
  function sortX(ws) { return ws.slice().sort(function (a, b) { return bb(a).x0 - bb(b).x0; }); }
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.floor(s.length / 2)]; }

  function classify(lines) {
    var t = lines.map(function (l) { return l.text; }).join('\n').toLowerCase();
    if (/reassess\s*time/.test(t) || (/administration\s*time/.test(t) && /reassess/.test(t))) return 'painList';
    if (/reassessment\s+details/.test(t)) return 'painSummary';
    if (/admin(istration)?\s+details/.test(t) || /bcma/.test(t)) return 'scanSummary';
    if (/due\s*time/.test(t) || /unscanned/.test(t) || /med\s+scanned/.test(t)) return 'scanList';
    return 'unknown';
  }

  /* "Brittany Rafferty, RN"  ->  { raw:'Brittany Rafferty', last:'Rafferty', first:'Brittany', role:'RN' } */
  function parseStaff(lines) {
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].text.match(/([A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+)*)\s*[,.]\s*(RN|LPN|CA|UC)\b/);
      if (!m) continue;
      var toks = m[1].split(/\s+/);
      if (toks.length >= 3 && /^[A-Z]{2}$/.test(toks[0])) toks.shift();          // avatar initials "BR"
      if (toks.length < 2) continue;
      return { raw: toks.join(' '), first: toks[0], last: toks[toks.length - 1], role: m[2] };
    }
    return null;
  }

  /* header words (Jan..Dec, MTD, YTD, 2024...) with x centres */
  function headerCols(lines) {
    var best = [];
    lines.forEach(function (l) {
      var cols = [];
      (l.words || []).forEach(function (w) {
        var t = w.text.replace(/[^A-Za-z0-9]/g, '');
        var lo = t.toLowerCase();
        if (MON[lo.slice(0, 3)] && lo.length === 3) cols.push({ label: MON_NAMES[MON[lo]], x: cx(w), mon: MON[lo] });
        else if (lo === 'mtd') cols.push({ label: 'MTD', x: cx(w), mtd: true });
        else if (lo === 'ytd') cols.push({ label: 'YTD', x: cx(w), ytd: true });
        else if (/^20\d\d$/.test(t)) cols.push({ label: t, x: cx(w), year: +t });
      });
      if (cols.length > best.length) best = cols;
    });
    return best;
  }

  function rowNumbers(line) {
    var ws = sortX(line.words || []), start = 0;
    ws.forEach(function (w, i) { if (/^details?$/i.test(w.text.replace(/[^A-Za-z]/g, ''))) start = i + 1; });
    return ws.slice(start).filter(function (w) { return /^\d{1,5}$/.test(w.text); })
      .map(function (w) { return { v: +w.text, x: cx(w) }; });
  }

  function parseSummary(lines, kind) {
    var cols = headerCols(lines), rows = {};
    lines.forEach(function (l) {
      var t = l.text.toLowerCase(), key = null;
      if (kind === 'scanSummary') {
        if (/non-?\s*compliant\s+admin/.test(t)) key = 'bad';
        else if (/compliant\s+admin/.test(t)) key = 'good';
        else if (/all\s+bcma\s+admin|all\s+.*admin\s+details/.test(t)) key = 'all';
      } else {
        if (/untimely\s+reassess/.test(t)) key = 'bad';
        else if (/timely\s+reassess/.test(t)) key = 'good';
        else if (/all\s+reassess/.test(t)) key = 'all';
      }
      if (key) rows[key] = rowNumbers(l);
    });
    var out = {};
    function colFor(x) {
      var best = null, d = 1e9;
      cols.forEach(function (c) { var dd = Math.abs(c.x - x); if (dd < d) { d = dd; best = c; } });
      return best;
    }
    Object.keys(rows).forEach(function (k) {
      rows[k].forEach(function (n) {
        var c = colFor(n.x); if (!c) return;
        (out[c.label] = out[c.label] || { col: c })[k] = n.v;
      });
    });
    var res = [];
    Object.keys(out).forEach(function (label) {
      var o = out[label], good = o.good, bad = o.bad, all = o.all;
      if (all == null && good != null && bad != null) all = good + bad;
      if (good == null && all != null && bad != null) good = all - bad;
      if (good == null || all == null) return;
      var warn = (bad != null && good + bad !== all) ? 'compliant + non-compliant ≠ total — check numbers' : '';
      res.push({ label: label, mon: o.col.mon || null, mtd: !!o.col.mtd, ytd: !!o.col.ytd, year: o.col.year || null, num: good, den: all, warn: warn });
    });
    return res;
  }

  /* ── medication names ─────────────────────────────────────────────────── */
  var FORM_WORDS = /^(INJ|INJECTION|TABLET|TAB|CAPSULE|CAP|SOLN|SOLUTION|SYRINGE|WRAPPER|DROPS|EYE|IV|PIGGYBACK|INTRAVENOUS|BOLUS|SUBCUTANEOUS|ORAL|PATCH|CREAM|OINTMENT|SUSPENSION|ER|XR|SR|PF)$/;
  function cleanMed(s) {
    return String(s || '').toUpperCase().replace(/[‘’“”`]/g, '').replace(/^[^A-Z0-9(]+/, '').replace(/MGI(\d)/g, 'MG/$1')
      .replace(/\s+/g, ' ').trim();
  }
  function medBase(full) {
    var toks = cleanMed(full).replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean), out = [];
    for (var i = 0; i < toks.length; i++) {
      if (/^\d/.test(toks[i])) { if (out.length) break; else continue; }
      if (out.length && FORM_WORDS.test(toks[i])) break;
      out.push(toks[i]);
    }
    if (!out.length) out = toks.slice(0, 3);
    return out.map(function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).join(' ');
  }

  /* ── date/time ────────────────────────────────────────────────────────── */
  function toIso(dateTok, tail) {
    var d = String(dateTok).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!d) return null;
    var h = 0, mi = 0, tm = String(tail || '').match(/^\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*([AaPp])[MmIi1l]?/);
    if (tm) { h = +tm[1] % 12; mi = +tm[2]; if (/p/i.test(tm[3])) h += 12; }
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d[3] + '-' + p(+d[1]) + '-' + p(+d[2]) + 'T' + p(h) + ':' + p(mi);
  }

  function parseList(lines, kind, width) {
    var DATE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    var heights = [];
    lines.forEach(function (l) { (l.words || []).forEach(function (w) { heights.push(bb(w).y1 - bb(w).y0); }); });
    var gapMax = Math.max(2 * median(heights), 8);

    var anchors = lines.filter(function (l) { return (l.words || []).some(function (w) { return DATE.test(w.text); }); })
      .sort(function (a, b) { return a.bbox.y0 - b.bbox.y0; });
    var rows = [];

    anchors.forEach(function (a, ai) {
      var ws = sortX(a.words), di = -1;
      ws.forEach(function (w, i) { if (di < 0 && DATE.test(w.text)) di = i; });
      var yEnd = ai + 1 < anchors.length ? anchors[ai + 1].bbox.y0 - 4 : 1e9;

      /* medication name = leading words until the first big horizontal gap */
      var nameWs = [], prev = null;
      for (var i = 0; i < di; i++) {
        if (prev && bb(ws[i]).x0 - bb(prev).x1 > gapMax) break;
        nameWs.push(ws[i]); prev = ws[i];
      }
      var left = bb(ws[0]).x0, nameRight = prev ? bb(prev).x1 : left;
      var name = nameWs.map(function (w) { return w.text; });

      /* wrapped medication name (continuation lines under the anchor, same left edge) */
      var reasons = [];
      ws.slice(nameWs.length, di).forEach(function (w) { if (/unread|barcod/i.test(w.text)) reasons.push(cx(w)); });
      lines.forEach(function (l) {
        if (l === a || l.bbox.y0 <= a.bbox.y0 || l.bbox.y0 >= yEnd) return;
        var lw = sortX(l.words || []); if (!lw.length) return;
        if (Math.abs(bb(lw[0]).x0 - left) <= 2 * median(heights)) {
          var p2 = null;
          for (var j = 0; j < lw.length; j++) {
            if (p2 && bb(lw[j]).x0 - bb(p2).x1 > gapMax) break;
            if (/^(unreadable|barcode)$/i.test(lw[j].text)) break;
            name.push(lw[j].text); p2 = lw[j];
          }
        }
        lw.forEach(function (w) { if (/unread|barcod/i.test(w.text) && bb(w).x0 > nameRight + gapMax) reasons.push(cx(w)); });
      });
      ws.slice(di).forEach(function (w) { if (/unread/i.test(w.text) && bb(w).x0 > nameRight + gapMax) reasons.push(cx(w)); });

      var full = cleanMed(name.join(' ')); if (!full) return;
      var after = ws.slice(di);
      var iso = toIso(after[0].text, after.slice(1).map(function (w) { return w.text; }).join(' '));
      if (!iso) return;

      var row = { full: full, med: medBase(full), t: iso };
      var tail = after.slice(1).map(function (w) { return w.text; }).join(' ');
      if (kind === 'scanList') {
        /* patient-reason column sits left of the med-reason column (≈47% vs 65% of width) */
        var cut = (width || 1) * 0.557, p = false, m = false;
        reasons.forEach(function (x) { if (x < cut) p = true; else m = true; });
        row.who = p && m ? 'B' : m ? 'M' : p ? 'P' : '?';
      } else {
        var nums = tail.replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}\s*[:.]\s*\d{2}\s*[AaPp][MmIi1l]?/g, ' ');
        var mm = nums.match(/(\d{1,4})\s+(yes|no)\b/i);
        row.filed = /\byes\b/i.test(nums);
        row.mins = mm ? +mm[1] : null;
      }
      rows.push(row);
    });
    return rows;
  }

  /* one image → { kind, staff?, cols?, rows? } */
  function parseImage(lines, width) {
    var kind = classify(lines);
    if (kind === 'scanSummary' || kind === 'painSummary')
      return { kind: kind, staff: parseStaff(lines), cols: parseSummary(lines, kind) };
    if (kind === 'scanList' || kind === 'painList')
      return { kind: kind, rows: parseList(lines, kind, width) };
    return { kind: 'unknown' };
  }

  /* ordered images → groups, one per staff; lists join the summary that came before them */
  function buildBatch(parsed) {
    var groups = [], cur = null;
    parsed.forEach(function (p, i) {
      if (p.kind === 'unknown') return;
      if (p.kind === 'scanSummary' || p.kind === 'painSummary') {
        var same = cur && p.staff && cur.staff && cur.staff.raw === p.staff.raw;
        if (!same && !(cur && !p.staff)) { cur = { staff: p.staff, scan: [], pain: [], scanMiss: [], painMiss: [] }; groups.push(cur); }
        if (!cur) { cur = { staff: p.staff, scan: [], pain: [], scanMiss: [], painMiss: [] }; groups.push(cur); }
        if (!cur.staff && p.staff) cur.staff = p.staff;
        (p.kind === 'scanSummary' ? cur.scan : cur.pain).push.apply(p.kind === 'scanSummary' ? cur.scan : cur.pain, p.cols);
      } else {
        if (!cur) { cur = { staff: null, scan: [], pain: [], scanMiss: [], painMiss: [] }; groups.push(cur); }
        (p.kind === 'scanList' ? cur.scanMiss : cur.painMiss).push.apply(p.kind === 'scanList' ? cur.scanMiss : cur.painMiss, p.rows);
      }
    });
    return groups;
  }

  /* ═════════════════════════ AGGREGATION (shared with the table) ═════════ */

  function missCounts(q, kind) {
    var map = (q && q[kind === 'scan' ? 'scanMiss' : 'painMiss']) || {}, c = {};
    Object.keys(map).forEach(function (k) { var m = map[k].m || '?'; c[m] = (c[m] || 0) + 1; });
    return Object.keys(c).map(function (m) { return { m: m, c: c[m] }; })
      .sort(function (a, b) { return b.c - a.c || (a.m < b.m ? -1 : 1); });
  }
  function mergeCounts(list) {
    var c = {};
    list.forEach(function (arr) { arr.forEach(function (x) { c[x.m] = (c[x.m] || 0) + x.c; }); });
    return Object.keys(c).map(function (m) { return { m: m, c: c[m] }; })
      .sort(function (a, b) { return b.c - a.c || (a.m < b.m ? -1 : 1); });
  }

  var api = { classify: classify, parseImage: parseImage, buildBatch: buildBatch, parseList: parseList, parseSummary: parseSummary,
    parseStaff: parseStaff, medBase: medBase, cleanMed: cleanMed, missCounts: missCounts, mergeCounts: mergeCounts };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.ccQualShot = api;

  /* ═════════════════════════ BROWSER: OCR + UI ═══════════════════════════ */

  var TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js';
  var worker = null, workerP = null, pending = [], lastStaff = '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setStatus(msg, bad) {
    var e = document.getElementById('qshot-status'); if (!e) return;
    e.textContent = msg || ''; e.style.color = bad ? 'var(--red2)' : 'var(--text3)';
  }

  function loadTesseract() {
    if (root.Tesseract) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = TESS_URL;
      s.onload = res; s.onerror = function () { rej(new Error('Could not load the OCR engine (needs internet the first time).')); };
      document.head.appendChild(s);
    });
  }
  function getWorker() {
    if (worker) return Promise.resolve(worker);
    if (!workerP) workerP = loadTesseract().then(function () { return root.Tesseract.createWorker('eng'); })
      .then(function (w) { worker = w; return w; }).catch(function (e) { workerP = null; throw e; });
    return workerP;
  }

  /* 2x upscale + grayscale + threshold: removes the tinted highlight rows that otherwise hide text from OCR */
  function prep(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2;
        var g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high';
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        var d = g.getImageData(0, 0, c.width, c.height), p = d.data;
        for (var i = 0; i < p.length; i += 4) { var v = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) > 150 ? 255 : 0; p[i] = p[i + 1] = p[i + 2] = v; }
        g.putImageData(d, 0, 0); URL.revokeObjectURL(url); res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Could not read image')); };
      img.src = url;
    });
  }
  function flatten(data) {
    var out = [];
    (data.blocks || []).forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) {
      out.push({ text: (l.text || '').trim(), bbox: l.bbox, words: (l.words || []).map(function (w) { return { text: w.text, bbox: w.bbox }; }) });
    }); }); });
    return out;
  }

  async function ocrFiles(files) {
    var w = await getWorker(), parsed = [], skipped = 0;
    for (var i = 0; i < files.length; i++) {
      setStatus('Reading screenshot ' + (i + 1) + ' of ' + files.length + '…');
      var c = await prep(files[i]);
      var r = await w.recognize(c, {}, { blocks: true });
      var p = parseImage(flatten(r.data), c.width);
      if (p.kind === 'unknown') skipped++;
      parsed.push(p);
    }
    return { parsed: parsed, skipped: skipped };
  }

  async function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(function (f) { return /^image\//.test(f.type); });
    if (!files.length) { setStatus('No image found — paste or drop a screenshot.', true); return; }
    try {
      var r = await ocrFiles(files);
      var groups = buildBatch(r.parsed);
      if (!groups.length) { setStatus('Could not recognize those screenshots (expected the Epic Detailed View or medication list).', true); return; }
      setStatus(r.skipped ? r.skipped + ' screenshot(s) not recognized and skipped.' : '');
      openPreview(groups);
    } catch (e) { setStatus(e.message || String(e), true); }
  }

  /* ── staff matching ───────────────────────────────────────────────────── */
  function qualStaff() { return (typeof MASTER_STAFF !== 'undefined' ? MASTER_STAFF : []).filter(function (s) { return s.job === 'RN' || s.job === 'LPN'; }); }
  function matchStaff(st) {
    if (!st) return '';
    try { var m = (typeof fuzzyMatchStaff === 'function') && fuzzyMatchStaff(st.last + ', ' + st.first); if (m) return m; } catch (e) {}
    return '';
  }

  /* ── preview modal ────────────────────────────────────────────────────── */
  var inp = 'background:var(--slate);border:1px solid var(--border);color:var(--white);border-radius:4px;padding:2px 4px;font-size:11px;';
  function monthOptions(sel) {
    var now = new Date(), o = '<option value="">— don\'t save counts —</option>';
    for (var i = 0; i < 18; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1), k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      o += '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + MON_NAMES[d.getMonth() + 1] + ' ' + d.getFullYear() + '</option>';
    }
    return o;
  }
  function defaultMonthKey(c) {
    var now = new Date(), yr = now.getFullYear(), p = function (n) { return ('0' + n).slice(-2); };
    if (c.mtd) return yr + '-' + p(now.getMonth() + 1);
    if (c.mon) { var y = yr; if (c.mon > now.getMonth() + 1) y--; return y + '-' + p(c.mon); }
    return '';   /* YTD / year columns can't be placed in a single month */
  }
  function countRows(list, gi, kind, labelNum, labelDen) {
    if (!list.length) return '<div style="color:var(--text3);font-size:11px;">None in screenshots</div>';
    var ytdNote = list.some(function (c) { return c.ytd || c.year; })
      ? '<div style="font-size:11px;color:var(--amber2);margin:0 0 4px;">YTD can\'t be split by month — pick the month to save it to, or set Epic to a single month. Left blank, only the drug lists are saved.</div>' : '';
    return ytdNote + '<table style="border-collapse:collapse;font-size:11px;"><tr style="color:var(--text3);"><th style="text-align:left;padding:2px 8px;">Column</th><th>' + labelNum + '</th><th>' + labelDen + '</th><th style="text-align:left;padding:2px 8px;">Save to month</th></tr>' +
      list.map(function (c, ci) {
        return '<tr><td style="padding:2px 8px;font-weight:700;">' + esc(c.label) + (c.warn ? ' <span title="' + esc(c.warn) + '" style="color:var(--amber2);">⚠</span>' : '') + '</td>' +
          '<td style="text-align:center;"><input type="number" min="0" data-g="' + gi + '" data-k="' + kind + '" data-i="' + ci + '" data-f="num" value="' + c.num + '" style="' + inp + 'width:60px;"></td>' +
          '<td style="text-align:center;"><input type="number" min="0" data-g="' + gi + '" data-k="' + kind + '" data-i="' + ci + '" data-f="den" value="' + c.den + '" style="' + inp + 'width:60px;"></td>' +
          '<td style="padding:2px 8px;"><select data-g="' + gi + '" data-k="' + kind + '" data-i="' + ci + '" data-f="month" style="' + inp + '">' + monthOptions(defaultMonthKey(c)) + '</select></td></tr>';
      }).join('') + '</table>';
  }
  function missRows(list, gi, kind) {
    if (!list.length) return '<div style="color:var(--text3);font-size:11px;">None in screenshots</div>';
    var whoSel = function (v, i) {
      return '<select data-g="' + gi + '" data-k="' + kind + '" data-i="' + i + '" data-f="who" style="' + inp + '">' +
        [['P', 'Patient'], ['M', 'Med'], ['B', 'Both'], ['?', '?']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    };
    return '<table style="border-collapse:collapse;font-size:11px;width:100%;"><tr style="color:var(--text3);text-align:left;"><th></th><th>Medication (edit if OCR misread)</th><th>Admin time</th><th>' + (kind === 'scanMiss' ? 'Not scanned' : 'Mins to reassess') + '</th></tr>' +
      list.map(function (r, i) {
        return '<tr style="border-top:1px solid rgba(255,255,255,0.05);"><td><input type="checkbox" checked data-g="' + gi + '" data-k="' + kind + '" data-i="' + i + '" data-f="use"></td>' +
          '<td style="padding:2px 6px;"><input type="text" data-g="' + gi + '" data-k="' + kind + '" data-i="' + i + '" data-f="full" value="' + esc(r.full) + '" style="' + inp + 'width:100%;min-width:300px;"></td>' +
          '<td style="padding:2px 6px;white-space:nowrap;">' + esc(r.t.replace('T', ' ')) + '</td>' +
          '<td style="padding:2px 6px;">' + (kind === 'scanMiss' ? whoSel(r.who, i) : (r.mins != null ? r.mins + ' min' : '<span style="color:var(--red2);">never reassessed</span>')) + '</td></tr>';
      }).join('') + '</table>';
  }

  function openPreview(groups) {
    var m = document.getElementById('qshot-modal');
    if (!m) { m = document.createElement('div'); m.id = 'qshot-modal'; document.body.appendChild(m); }
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;overflow-y:auto;';
    var staff = qualStaff();
    m.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;width:96%;max-width:980px;margin:16px auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="font-size:15px;font-weight:700;color:var(--white);">📸 Review screenshot data</div><button onclick="ccQualShot.closePreview()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="font-size:11px;color:var(--text3);margin-bottom:12px;">Check the numbers and drug names (OCR can misread), then save. Nothing is stored until you click Save.</div>' +
      groups.map(function (g, gi) {
        var auto = matchStaff(g.staff) || (g.staff ? '' : lastStaff);
        return '<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px;">' +
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;"><label style="font-size:11px;color:var(--text3);">Staff:</label>' +
          '<select id="qshot-staff-' + gi + '" style="' + inp + 'min-width:220px;padding:5px 8px;"><option value="">— choose staff —</option>' +
          staff.map(function (s) { return '<option value="' + esc(s.name) + '"' + (s.name === auto ? ' selected' : '') + '>' + esc(s.name) + ' (' + s.job + ')</option>'; }).join('') + '</select>' +
          (g.staff ? '<span style="font-size:11px;color:' + (auto ? 'var(--green2)' : 'var(--amber2)') + ';">Epic says: ' + esc(g.staff.raw) + ', ' + esc(g.staff.role) + (auto ? '' : ' — not matched, pick from the list') + '</span>' : '<span style="font-size:11px;color:var(--amber2);">No staff name in screenshots — pick from the list</span>') + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;"><div><div style="font-size:12px;font-weight:700;color:var(--accent2);margin-bottom:4px;">💊 BCMA scanning (scanned / total)</div>' + countRows(g.scan, gi, 'scan', 'Scanned', 'Total meds') + '</div>' +
          '<div><div style="font-size:12px;font-weight:700;color:var(--amber2);margin-bottom:4px;">💔 Pain reassessment (timely / total)</div>' + countRows(g.pain, gi, 'pain', 'Timely', 'Total opps') + '</div></div>' +
          '<div style="font-size:12px;font-weight:700;color:var(--accent2);margin:12px 0 4px;">💊 Missed scans (' + g.scanMiss.length + ')</div>' + missRows(g.scanMiss, gi, 'scanMiss') +
          '<div style="font-size:12px;font-weight:700;color:var(--amber2);margin:12px 0 4px;">💔 Missed / late reassessments (' + g.painMiss.length + ')</div>' + missRows(g.painMiss, gi, 'painMiss') + '</div>';
      }).join('') +
      '<div style="display:flex;justify-content:flex-end;gap:8px;"><button class="btn btn-ghost btn-sm" onclick="ccQualShot.closePreview()">Cancel</button><button class="btn btn-primary" onclick="ccQualShot.save()">💾 Save</button></div></div>';
    m._groups = groups;
  }
  function closePreview() { var m = document.getElementById('qshot-modal'); if (m) m.style.display = 'none'; }

  function field(gi, kind, i, f) { return document.querySelector('[data-g="' + gi + '"][data-k="' + kind + '"][data-i="' + i + '"][data-f="' + f + '"]'); }

  function save() {
    var m = document.getElementById('qshot-modal'); if (!m || !m._groups) return;
    var groups = m._groups, report = [], blocked = false;
    groups.forEach(function (g, gi) { if (!document.getElementById('qshot-staff-' + gi).value) blocked = true; });
    if (blocked) { alert('Choose a staff member for each group first.'); return; }

    groups.forEach(function (g, gi) {
      var name = document.getElementById('qshot-staff-' + gi).value; lastStaff = name;
      state.qualityData = state.qualityData || {};
      var mk = function (key) {
        state.qualityData[name] = state.qualityData[name] || {};
        return state.qualityData[name][key] = state.qualityData[name][key] || { scans: 0, scanTotal: 0, pain: 0, painTotal: 0, transfusions: 0, txNum: 0, txDen: 0 };
      };
      var counts = 0, scanN = 0, painN = 0;
      g.scan.forEach(function (c, ci) {
        var key = field(gi, 'scan', ci, 'month').value; if (!key) return;
        var q = mk(key); q.scans = +field(gi, 'scan', ci, 'num').value || 0; q.scanTotal = +field(gi, 'scan', ci, 'den').value || 0; counts++;
      });
      g.pain.forEach(function (c, ci) {
        var key = field(gi, 'pain', ci, 'month').value; if (!key) return;
        var q = mk(key); q.pain = +field(gi, 'pain', ci, 'num').value || 0; q.painTotal = +field(gi, 'pain', ci, 'den').value || 0; counts++;
      });
      g.scanMiss.forEach(function (r, i) {
        if (!field(gi, 'scanMiss', i, 'use').checked) return;
        var full = cleanMed(field(gi, 'scanMiss', i, 'full').value), q = mk(r.t.slice(0, 7));
        q.scanMiss = q.scanMiss || {};
        q.scanMiss[r.t + '|' + full] = { m: medBase(full), f: full, t: r.t, w: field(gi, 'scanMiss', i, 'who').value }; scanN++;
      });
      g.painMiss.forEach(function (r, i) {
        if (!field(gi, 'painMiss', i, 'use').checked) return;
        var full = cleanMed(field(gi, 'painMiss', i, 'full').value), q = mk(r.t.slice(0, 7));
        q.painMiss = q.painMiss || {};
        q.painMiss[r.t + '|' + full] = { m: medBase(full), f: full, t: r.t, mins: r.mins, filed: !!r.filed }; painN++;
      });
      report.push(name.split(',')[0] + ': ' + counts + ' month figure(s), ' + scanN + ' missed scan(s), ' + painN + ' missed reassessment(s)');
    });
    try { persistSave(); } catch (e) { console.error(e); }
    try { showSaveBanner('💾 Saved from screenshots — ' + report.join(' · ')); } catch (e) {}
    closePreview();
    if (typeof renderQualityTab === 'function') renderQualityTab();
  }

  /* ── intake card on the Quality tab ───────────────────────────────────── */
  function init() {
    var host = document.getElementById('qual-shot-card');
    if (!host || host.dataset.ready) return;
    host.dataset.ready = '1';
    host.innerHTML = '<div id="qshot-drop" tabindex="0" style="border:2px dashed var(--border);border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;cursor:pointer;outline:none;">' +
      '<div style="font-size:20px;">📸</div><div style="flex:1;min-width:220px;"><div style="font-size:12px;font-weight:700;color:var(--white);">Add data from Epic screenshots</div>' +
      '<div style="font-size:11px;color:var(--text3);">Paste (Ctrl+V), drop, or click to choose — BCMA &amp; Post-PRN Detailed View plus the medication lists. Drop them together, summary first.</div>' +
      '<div id="qshot-status" style="font-size:11px;margin-top:3px;"></div></div>' +
      '<button class="btn btn-primary btn-sm" type="button" id="qshot-pick">Choose screenshots…</button>' +
      '<input type="file" id="qshot-file" accept="image/*" multiple style="display:none;"></div>';
    var drop = document.getElementById('qshot-drop'), file = document.getElementById('qshot-file');
    document.getElementById('qshot-pick').onclick = function (e) { e.stopPropagation(); file.click(); };
    drop.onclick = function () { file.click(); };
    file.onchange = function () { handleFiles(file.files); file.value = ''; };
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.style.borderColor = 'var(--accent2)'; }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.style.borderColor = 'var(--border)'; }); });
    drop.addEventListener('drop', function (e) { handleFiles(e.dataTransfer.files); });
  }

  /* paste works anywhere on the Quality tab; images pasted one at a time are collected for 1.5 s then read together */
  document.addEventListener('paste', function (e) {
    var panel = document.getElementById('panel-quality');
    if (!panel || panel.style.display === 'none' || !panel.offsetParent) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && !(e.clipboardData && Array.prototype.some.call(e.clipboardData.items || [], function (i) { return /^image\//.test(i.type); }))) return;
    var imgs = [];
    Array.prototype.forEach.call((e.clipboardData && e.clipboardData.items) || [], function (it) { if (/^image\//.test(it.type)) { var f = it.getAsFile(); if (f) imgs.push(f); } });
    if (!imgs.length) return;
    e.preventDefault();
    pending = pending.concat(imgs); setStatus(pending.length + ' screenshot(s) pasted — paste more or wait…');
    clearTimeout(init._t);
    init._t = setTimeout(function () { var f = pending; pending = []; handleFiles(f); }, 1500);
  });

  api.init = init; api.save = save; api.closePreview = closePreview; api.handleFiles = handleFiles;
})(typeof window !== 'undefined' ? window : globalThis);
