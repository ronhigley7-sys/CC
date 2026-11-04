/* ═══ Phone → my phone ═══
 * Whenever an employee phone number is added or changed (Add Employee, staff details, quick phone edit),
 * email that contact as a .vcf to Ron's Gmail via the `send-contact-vcard` edge function.
 * Open the email on the phone → tap the attachment → Add to Contacts. */
(function () {
  'use strict';
  function digits(p) { return String(p || '').replace(/\D/g, ''); }
  function jobOf(name) {
    try { var s = (MASTER_STAFF || []).find(function (x) { return x.name === name; }); return (s && s.job) || ''; } catch (e) { return ''; }
  }
  function cfg() {
    try { var c = getSBConfig(); if (c && c.url && c.key) return c; } catch (e) {}
    return typeof SB_DEFAULT_CONFIG !== 'undefined' ? SB_DEFAULT_CONFIG : null;
  }
  function banner(m) { try { showSaveBanner(m); } catch (e) {} }
  async function sendContact(name, isNew) {
    var phone = (state.phones || {})[name];
    var c = cfg();
    if (!c || digits(phone).length < 10) return;
    try {
      var r = await fetch(c.url + '/functions/v1/send-contact-vcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: c.key, Authorization: 'Bearer ' + c.key },
        body: JSON.stringify({ name: name, phone: phone, email: (state.emails || {})[name] || '', job: jobOf(name), isNew: !!isNew })
      });
      banner(r.ok ? '📲 Contact emailed to your phone' : '⚠ Contact email failed');
    } catch (e) { banner('⚠ Contact email failed'); }
  }
  function arm() {
    if (typeof saveStaffDetails === 'function') {
      var origDetails = saveStaffDetails;
      window.saveStaffDetails = saveStaffDetails = function (prefix, name) {
        var before = digits((state.phones || {})[name]);
        var ok = origDetails.apply(this, arguments);
        if (ok) {
          var after = digits((state.phones || {})[name]);
          if (after && after !== before) sendContact(name, !before);
        }
        return ok;
      };
    }
    if (typeof savePhone === 'function') {
      var origPhone = savePhone;
      window.savePhone = savePhone = function (name, val) {
        var before = digits((state.phones || {})[name]);
        var res = origPhone.apply(this, arguments);
        var after = digits(val);
        if (after && after !== before) sendContact(name, !before);
        return res;
      };
    }
  }
  if (document.readyState === 'complete') setTimeout(arm, 3000); else window.addEventListener('load', function () { setTimeout(arm, 3000); });
})();
