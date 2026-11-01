/* ═══ SYNC V2 — safe multi-device / multi-user sync for tracker_state.app_state ═══
 * Replaces the blind "last write wins" save with:
 *   1. a per-device id (same username on phone + PC no longer ignores the other device)
 *   2. an atomic, version-checked write (PATCH ... WHERE updated_at = last-seen)
 *   3. a 3-way merge (last synced copy / this device / cloud) when another device saved first
 * Loaded after the main app script; overrides persistSave, sbPush, sbPoll, initSPSync.
 */
var CC_SYNC_VERSION = 'sync-v2';
(function () {
  'use strict';
  var DEV_KEY = '_ccDeviceId', BASE_KEY = '_ccSyncBase', REV_KEY = '_ccSyncRev';
  var saving = false, again = false;

  function deviceId() {
    var d = localStorage.getItem(DEV_KEY);
    if (!d) { d = Math.random().toString(36).slice(2, 8); localStorage.setItem(DEV_KEY, d); }
    return d;
  }

  /* ── canonical compare (key order independent) ── */
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v) === undefined ? 'null' : JSON.stringify(v);
  }
  function eq(a, b) { return a === b || canon(a) === canon(b); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function keyOf(x) {
    if (!isObj(x)) return null;
    if (x.id !== undefined && x.id !== null) return 'id:' + x.id;
    if (x.name !== undefined && x.name !== null) return 'n:' + x.name;
    return null;
  }
  function uniqueKeyed(arr) {
    var seen = {};
    for (var i = 0; i < arr.length; i++) { var k = keyOf(arr[i]); if (k === null || seen[k]) return false; seen[k] = 1; }
    return true;
  }

  /* ── 3-way merge. base = last synced copy, local = this device, remote = cloud ── */
  function merge(base, local, remote) {
    if (eq(local, remote)) return local;
    if (eq(local, base)) return remote;      // only the cloud changed
    if (eq(remote, base)) return local;      // only this device changed
    if (isObj(local) && isObj(remote)) {
      var b = isObj(base) ? base : {}, out = {}, keys = {};
      Object.keys(local).concat(Object.keys(remote), Object.keys(b)).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) {
        var inL = k in local && local[k] !== undefined, inR = k in remote && remote[k] !== undefined, inB = k in b;
        if (inL && inR) out[k] = merge(b[k], local[k], remote[k]);
        else if (inL) { if (inB && eq(b[k], local[k])) return; out[k] = local[k]; }       // other device deleted it
        else if (inR) { if (inB && eq(b[k], remote[k])) return; out[k] = remote[k]; }     // this device deleted it
      });
      return out;
    }
    if (Array.isArray(local) && Array.isArray(remote)) {
      var bArr = Array.isArray(base) ? base : [];
      if ((local.length || remote.length) && uniqueKeyed(local) && uniqueKeyed(remote)) {
        var mb = {}, ml = {}, mr = {}, res = [], seen = {};
        bArr.forEach(function (x) { var k = keyOf(x); if (k !== null) mb[k] = x; });
        local.forEach(function (x) { ml[keyOf(x)] = x; });
        remote.forEach(function (x) { mr[keyOf(x)] = x; });
        local.concat(remote).forEach(function (x) {
          var k = keyOf(x); if (seen[k]) return; seen[k] = 1;
          var inL = k in ml, inR = k in mr, inB = k in mb;
          if (inL && inR) res.push(merge(mb[k], ml[k], mr[k]));
          else if (inL) { if (inB && eq(mb[k], ml[k])) return; res.push(ml[k]); }
          else { if (inB && eq(mb[k], mr[k])) return; res.push(mr[k]); }
        });
        return res;
      }
      var allStr = local.concat(remote).every(function (x) { return typeof x === 'string'; });
      if (allStr) {
        var sb = {}, sl = {}, sr = {}, out2 = [], s2 = {};
        bArr.forEach(function (x) { sb[x] = 1; }); local.forEach(function (x) { sl[x] = 1; }); remote.forEach(function (x) { sr[x] = 1; });
        local.concat(remote).forEach(function (x) {
          if (s2[x]) return; s2[x] = 1;
          if (x in sl && x in sr) out2.push(x); else if (!(x in sb)) out2.push(x);
        });
        return out2;
      }
    }
    return local;   // true conflict on the same value: this device's in-flight edit wins
  }

  /* ── REST helpers ── */
  function hdr(cfg, extra) {
    var h = { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function ready() {
    var cfg = getSBConfig();
    return (cfg.enabled && cfg.url && cfg.key) ? cfg : null;
  }
  async function getRemote(cfg) {
    var r = await fetch(cfg.url + '/rest/v1/tracker_state?key=eq.app_state&select=value,updated_at,updated_by', { headers: hdr(cfg) });
    if (!r.ok) throw new Error('GET ' + r.status);
    var rows = await r.json();
    return (rows && rows.length && rows[0].value) ? rows[0] : null;
  }
  function getBase() { try { return JSON.parse(localStorage.getItem(BASE_KEY) || 'null'); } catch (e) { return null; } }
  function remember(valueStr, updatedAt) {
    try { localStorage.setItem(BASE_KEY, valueStr); localStorage.setItem(REV_KEY, updatedAt); localStorage.setItem('_3bTrackerTs', String(new Date(updatedAt).getTime())); } catch (e) {}
  }
  function ensureId() { try { if (_sbUserId && _sbUserId.indexOf('#') < 0) _sbUserId = _sbUserId + '#' + deviceId(); } catch (e) {} }
  function who(by) { return String(by || '').replace(/#.*$/, '') || 'another device'; }

  function rerender() {
    try { rebuildMasterStaff(); } catch (e) {}
    try {
      var ap = document.querySelector('.tab-panel.active');
      if (ap) { var pid = ap.id.replace('panel-', ''), fn = window['render' + pid.charAt(0).toUpperCase() + pid.slice(1)]; if (typeof fn === 'function') fn(); }
    } catch (e) {}
    try { renderBoard(); } catch (e) {}
    try { if (typeof renderDirectory === 'function') renderDirectory(); } catch (e) {}
  }

  /* ── identity ── */
  window.initSPSync = async function initSPSync() {
    var cfg = ready();
    if (!cfg) { updateSyncBadge(); return; }
    _sbUserId = (cfg.username || 'User') + '#' + deviceId();
    await sbConnect(cfg);
  };

  /* ── SAVE ── */
  window.persistSave = async function persistSave() {
    if (saving) { again = true; return; }
    saving = true;
    try {
      do {
        again = false;
        await saveOnce();
      } while (again);
    } finally { saving = false; }
  };

  async function saveOnce() {
    var data;
    try { data = buildSavePayload(); } catch (e) { console.warn('persistSave payload failed', e); return; }
    var cfg = ready();
    if (!(cfg && _sbConnected)) {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      if (!cfg && !window._sbWarnShown) { window._sbWarnShown = true; showSaveBanner('⚠ Supabase not connected — data saved locally only (not shared between devices)'); }
      return;
    }
    ensureId();
    _sbSaving = true;
    try {
      var merged = false;
      for (var attempt = 0; attempt < 5; attempt++) {
        var rev = localStorage.getItem(REV_KEY);
        if (!rev) {   // first save on this device: learn the cloud version and fold it in
          var first = await getRemote(cfg);
          if (first) {
            data = merge(getBase() || {}, data, JSON.parse(first.value)); merged = true;
            rev = first.updated_at; localStorage.setItem(REV_KEY, rev);
          }
        }
        var body = { value: JSON.stringify(data), updated_at: new Date().toISOString(), updated_by: _sbUserId };
        var r;
        if (rev) {
          r = await fetch(cfg.url + '/rest/v1/tracker_state?key=eq.app_state&updated_at=eq.' + encodeURIComponent(rev),
            { method: 'PATCH', headers: hdr(cfg, { Prefer: 'return=representation' }), body: JSON.stringify(body) });
        } else {
          body.key = 'app_state';
          r = await fetch(cfg.url + '/rest/v1/tracker_state',
            { method: 'POST', headers: hdr(cfg, { Prefer: 'return=representation' }), body: JSON.stringify(body) });
        }
        if (!r.ok) {
          if (!rev && r.status === 409) { localStorage.removeItem(REV_KEY); continue; }
          throw new Error('write ' + r.status);
        }
        var rows = await r.json();
        if (rows && rows.length) {                         // success
          remember(body.value, rows[0].updated_at);
          localStorage.setItem(LS_KEY, body.value);
          localStorage.removeItem('_sbPendingSync');
          if (merged) { try { Object.assign(state, data); rerender(); } catch (e) {} showSaveBanner('☁️ Merged changes from your other device before saving'); }
          updateSyncBadge(true);
          return;
        }
        // 0 rows updated → someone saved after we last synced: merge and retry
        var remote = await getRemote(cfg);
        if (!remote) { localStorage.removeItem(REV_KEY); continue; }
        data = merge(getBase() || {}, data, JSON.parse(remote.value)); merged = true;
        localStorage.setItem(REV_KEY, remote.updated_at);
      }
      throw new Error('too many conflicts');
    } catch (e) {
      console.warn('Cloud save failed:', e);
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e2) {}
      localStorage.setItem('_sbPendingSync', '1');
      showSaveBanner('⚠ Cloud save failed — saved on this device, will retry');
    } finally { _sbSaving = false; }
  }

  window.sbPush = async function sbPush() { await window.persistSave(); };

  /* ── POLL ── */
  window.sbPoll = async function sbPoll() {
    var cfg = ready();
    if (!cfg || saving) return;
    ensureId();
    try {
      if (localStorage.getItem('_sbPendingSync') === '1') { await window.persistSave(); return; }
      var row = await getRemote(cfg);
      if (!row) return;
      var rev = localStorage.getItem(REV_KEY);
      if (row.updated_at === rev) return;                  // nothing new
      var remote = JSON.parse(row.value), base = getBase(), local = buildSavePayload();
      var dirty = base ? !eq(local, base) : true;          // no base yet = treat as dirty (additive merge)
      var next = base ? (dirty ? merge(base, local, remote) : remote) : merge({}, local, remote);
      if (typeof window.ccRemoteApplied === 'function') { try { window.ccRemoteApplied(remote, row.updated_by); } catch (e) {} }
      Object.assign(state, next);
      remember(row.value, row.updated_at);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (e) {}
      rerender();
      if (row.updated_by !== _sbUserId) showSyncToast(who(row.updated_by));
      if (dirty) window.persistSave();            // push the merged result back up
    } catch (e) { /* offline — try again next poll */ }
  };

  window.ccSync = { merge: merge, version: CC_SYNC_VERSION, deviceId: deviceId };
})();
