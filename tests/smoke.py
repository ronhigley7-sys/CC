"""Smoke test for the current CC recovery interface."""
import sys
import pathlib
from playwright.sync_api import sync_playwright

path = pathlib.Path(__file__).resolve().parent.parent / "index.html"
errors = []
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith("file:") else route.abort())
    page.goto(path.as_uri())
    checks.append(("charge board visible", page.locator("#board").is_visible()))
    checks.append(("staffing fields rendered", page.locator("#staff input").count() >= 3))
    checks.append(("patient slots rendered", page.locator("#patients tr").count() >= 10))
    page.get_by_role("button", name="Code Team", exact=True).click()
    checks.append(("code team opens", page.locator("#code").is_visible()))
    checks.append(("code roles rendered", page.locator("#codefields input").count() == 5))
    page.get_by_role("button", name="Schedule", exact=True).click()
    checks.append(("schedule placeholder opens", page.locator("#links").is_visible()))
    page.get_by_role("button", name="Charge Board", exact=True).click()
    checks.append(("charge board reopens", page.locator("#board").is_visible()))
    browser.close()
for name, ok in checks:
    print(("PASS" if ok else "FAIL") + ": " + name)
for error in errors:
    print("JS ERROR:", error)
print("checks:", len(checks), "errors:", len(errors))
sys.exit(1 if errors or not all(ok for _, ok in checks) else 0)
