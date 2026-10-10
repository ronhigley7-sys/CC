"""Smoke test: load index.html, open every panel, fail on any JS error."""
import sys, pathlib
from playwright.sync_api import sync_playwright
path = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1400, 'height': 900})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
    pg.add_init_script("sessionStorage.setItem('_ccPinUntil', String(Date.now()+3600000))")
    pg.goto(path.as_uri()); pg.wait_for_timeout(1500)
    ids = pg.evaluate("Array.from(document.querySelectorAll('[data-panel]')).map(e=>e.dataset.panel).filter((v,i,a)=>a.indexOf(v)===i)")
    for i in ids:
        pg.evaluate("id=>{var el=document.querySelector('[data-panel=\"'+id+'\"]'); switchTab(el)}", i); pg.wait_for_timeout(120)
    b.close()
print('panels:', len(ids), 'errors:', len(errs))
for e in errs: print(' -', e)
sys.exit(1 if errs or len(ids) < 30 else 0)
