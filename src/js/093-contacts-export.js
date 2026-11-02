/* ═══ Directory → phone contacts (vCard) ═══
 * A web page can't write to a phone's contacts directly, so this builds a .vcf file.
 * On a phone: tap the button → share sheet / downloaded file → "Add to Contacts" (adds all in one go).
 * "New" = staff added to the Directory after this device first loaded this feature and not exported yet.
 * Sent-list is per device (it tracks what went to THIS phone's contacts). */
(function () {
  'use strict';
  var KEY = '_ccContactsSent';
  function sentSet() { try { return new Set(JSON.parse(localStorage.getItem(KEY) || 'null') || []); } catch (e) { return new Set(); } }
  function saveSent(set) { try { localStorage.setItem(KEY, JSON.stringify(Array.from(set))); } catch (e) {} }
  function digits(p) { return String(p || '').replace(/\D/g, ''); }
  function hasPhone(n) { return digits((state.phones || {})[n]).length >= 10; }
  function esc(t) { return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;'); }
  function pretty(p) { var d = digits(p); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(p); }

  function init() {   // first run on this device: everyone already in the Directory counts as "already handled"
    if (localStorage.getItem(KEY) === null) saveSent(new Set((state.customStaff || []).map(function (s) { return s.name; })));
  }
  function newStaff() {
    var sent = sentSet(), removed = new Set((state.removedStaff || []).map(function (r) { return r.name || r; }));
    return (state.customStaff || []).filter(function (s) { return !sent.has(s.name) && !removed.has(s.name) && hasPhone(s.name); });
  }
  function allStaff() { return (MASTER_STAFF || []).filter(function (s) { return hasPhone(s.name); }); }

  function card(s) {
    var p = String(s.name).split(','), last = (p[0] || '').trim(), first = p.slice(1).join(',').trim();
    var job = s.job || '';
    var l = ['BEGIN:VCARD', 'VERSION:3.0',
      'N:' + esc(last) + ';' + esc(first) + ';;;',
      'FN:' + esc(first ? first + ' ' + last : last),
      'ORG:' + esc('Arnot Ogden 3B/3C'),
      job ? 'TITLE:' + esc(job) : '',
      'TEL;TYPE=CELL:' + pretty(state.phones[s.name]),
      (state.emails || {})[s.name] ? 'EMAIL;TYPE=INTERNET:' + esc(state.emails[s.name]) : '',
      'NOTE:' + esc('3B/3C staff' + (job ? ' - ' + job : '')),
      'END:VCARD'];
    return l.filter(Boolean).join('\r\n');
  }
  function build(list) { return list.map(card).join('\r\n') + '\r\n'; }

  async function send(list, fname) {
    if (!list.length) { try { showSaveBanner('No staff with phone numbers to export'); } catch (e) {} return false; }
    var text = build(list), file;
    try { file = new File([text], fname, { type: 'text/vcard' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Staff contacts' }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/vcard' })); a.download = fname;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return true;
  }

  window.ccExportNewContacts = async function () {
    var list = newStaff();
    if (!list.length) { try { showSaveBanner('📇 No new staff with phone numbers to add'); } catch (e) {} return; }
    if (await send(list, 'new-staff-contacts.vcf')) {
      var sent = sentSet(); list.forEach(function (s) { sent.add(s.name); }); saveSent(sent);
      try { showSaveBanner('📇 ' + list.length + ' new contact' + (list.length === 1 ? '' : 's') + ' ready — open the file to add to your phone'); } catch (e) {}
      refresh();
    }
  };
  window.ccExportAllContacts = async function () {
    var list = allStaff();
    if (await send(list, 'all-staff-contacts.vcf')) {
      var sent = sentSet(); list.forEach(function (s) { sent.add(s.name); }); saveSent(sent); refresh();
    }
  };
  window.ccContacts = { build: build, card: card, newStaff: newStaff, allStaff: allStaff };

  function refresh() {
    var bar = document.querySelector('#panel-directory .section-header .flex-row'); if (!bar) return;
    var b = document.getElementById('cc-contacts-new');
    if (!b) {
      b = document.createElement('button'); b.id = 'cc-contacts-new'; b.className = 'btn btn-ghost btn-sm'; b.onclick = window.ccExportNewContacts;
      var all = document.createElement('button'); all.id = 'cc-contacts-all'; all.className = 'btn btn-ghost btn-sm'; all.textContent = '📇 All'; all.title = 'Export every staff member with a phone number as a .vcf'; all.onclick = window.ccExportAllContacts;
      bar.insertBefore(all, bar.firstChild); bar.insertBefore(b, bar.firstChild);
    }
    var n = newStaff().length;
    b.textContent = '📇 New → Contacts' + (n ? ' (' + n + ')' : '');
    b.title = 'Download new Directory staff as a contact file; open it on your phone to add them';
    b.style.color = n ? 'var(--green2)' : '';
  }
  function arm() { init(); refresh(); setInterval(function () { if (!document.hidden) refresh(); }, 4000); }
  if (document.readyState === 'complete') setTimeout(arm, 2500); else window.addEventListener('load', function () { setTimeout(arm, 2500); });
})();
