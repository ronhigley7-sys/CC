"""Smoke test for the Command Center build: loads index.html offline and checks the basics."""
import sys, pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
path = root / "index.html"
size = path.stat().st_size
errors, checks = [], []
checks.append(("index.html is not empty/truncated (>1 MB)", size > 1_000_000))

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.on("pageerror", lambda e: errors.append(str(e)))
    # offline: only file:// allowed, so Supabase/CDN calls are blocked and must fail gracefully
    page.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file:") else r.abort())
    page.goto(path.as_uri())
    page.wait_for_timeout(5000)
    checks.append(("header renders", page.locator("header").first.is_visible()))
    # Home is hidden by design: app starts on the last-used tab, else Board
    checks.append(("starts on Board (Home hidden)", page.locator("#panel-board.active").count() == 1))
    checks.append(("home tab hidden from nav", not any(e.is_visible() for e in page.locator('.tab[data-panel="home"]').all())))
    checks.append(("home panel still renders (hidden)", page.locator("#mgr-kpi-grid .mgr-kpi").count() >= 5))
    checks.append(("home 'More' section present", page.locator("#cc-home-more").count() == 1))
    checks.append(("competency due data function present", page.evaluate("typeof getCompetencyDueData === 'function'")))
    checks.append(("nav has 40+ tabs", page.locator("[data-panel]").count() >= 40))
    checks.append(("sync v2 loaded", page.evaluate("typeof ccSync !== 'undefined' && ccSync.version === 'sync-v2'")))
    checks.append(("no twilio left", page.locator("#twilio-sid").count() == 0))
    # merge engine unit checks
    r = page.evaluate("""() => {
      const m = ccSync.merge, o = [];
      const base = {a: {x: 1}, list: [{id: 1, v: 'a'}], gone: 5};
      const A = {a: {x: 1, y: 2}, list: [{id: 1, v: 'a'}, {id: 2, v: 'A'}], gone: 5};
      const B = {a: {x: 1, z: 3}, list: [{id: 1, v: 'b'}, {id: 3, v: 'B'}]};
      const r = m(base, A, B);
      o.push(r.a.y === 2 && r.a.z === 3);                 // both sides' new keys kept
      o.push(r.list.length === 3 && r.list.find(i => i.id === 1).v === 'b'); // keyed array merge
      o.push(!('gone' in r));                              // other side deleted unchanged key
      return o;
    }""")
    for name, ok in zip(["merge: nested keys", "merge: keyed arrays", "merge: deletes"], r):
        checks.append((name, ok))
    browser.close()

for name, ok in checks:
    print(("PASS" if ok else "FAIL") + ": " + name)
for e in errors:
    print("JS ERROR:", e)
print("checks:", len(checks), "errors:", len(errors))
sys.exit(1 if errors or not all(ok for _, ok in checks) else 0)
