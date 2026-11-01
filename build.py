#!/usr/bin/env python3
"""Assemble index.html from src/. No dependencies.
   python3 build.py            -> writes index.html
   python3 build.py --check    -> exits 1 if committed index.html != build output
"""
import re, sys, pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
tpl = (src / 'index.template.html').read_text(encoding='utf-8')
tpl = tpl.replace('\n@@part@@\n', '')   # chunks of one script are concatenated exactly
def inc(m):
    return (src / m.group(1)).read_text(encoding='utf-8')
html = re.sub(r'@@include ([^@]+)@@', inc, tpl)
if len(html) < 100_000 or '</html>' not in html:
    sys.exit('BUILD ERROR: output looks empty/truncated (%d bytes)' % len(html))
out = root / 'index.html'
if '--check' in sys.argv:
    cur = out.read_text(encoding='utf-8') if out.exists() else ''
    if cur != html:
        sys.exit('DRIFT: index.html does not match src/. Edit src/ then run `python3 build.py`, '
                 'or run `node tools/split.js index.html` if you replaced index.html directly.')
    print('ok: index.html matches src/ (%d bytes)' % len(html)); sys.exit(0)
out.write_text(html, encoding='utf-8', newline='')
print('built index.html (%d bytes)' % len(html))
