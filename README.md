# CC — 3B/3C Command Center

`index.html` is **generated** from `src/`. Edit the pieces, then rebuild:

    python3 build.py          # writes index.html
    python3 build.py --check  # fails if index.html != src/ (CI runs this)
    python3 tests/smoke.py    # headless load + merge-engine tests

- `src/index.template.html` — page skeleton (HTML) with `@@include …@@` markers
- `src/css/*.css`, `src/js/*.js` — styles and scripts, concatenated in order
- `src/js/090-sync-v2.js` — multi-device sync (version-checked writes + 3-way merge)

If you replace `index.html` directly (e.g. uploaded a new file), re-split it first:
`npm i --no-save acorn && node tools/split.js index.html`, then `python3 build.py --check`.
GitHub Pages only deploys when the check + smoke test pass, so an empty or stale `index.html` can't go live.
