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

// Admission rotation + 3C CA assignment patch.
(function(){
  var s=document.createElement('script');
  s.src='cc-admission-rotation.js?v=20260908-2024';
  s.async=false;
  document.head.appendChild(s);
})();

// UKG Attendance Review. Loads as a separate module so the large command-center
// index does not need to be replaced for attendance updates.
(function(){
  var s=document.createElement('script');
  s.src='cc-attendance.js?v=20260908-2117';
  s.async=false;
  document.head.appendChild(s);
})();
