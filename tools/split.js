#!/usr/bin/env node
/* One-time / re-runnable splitter: index.html -> src/ (template + css/ + js/).
 * Lossless: `python3 build.py` reproduces the input byte-for-byte.
 * Needs acorn:  npm i --no-save acorn   Usage: node tools/split.js [input.html]
 */
const fs = require('fs'), path = require('path'), acorn = require('acorn');
const input = process.argv[2] || 'index.html';
const html = fs.readFileSync(input, 'utf8');
const out = 'src';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'css'), { recursive: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
let n = 0;
const pad = (i) => String(i).padStart(3, '0');
const slug = (t) => (t || 'part').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'part';
const CHUNK = 70000, MAX = 140000;
let tpl = '', last = 0, cssN = 0;
const re = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
let m;
function jsChunks(code) {
  if (code.length < CHUNK * 1.5) return [code];
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 'latest', allowReturnOutsideFunction: true }); }
  catch (e) { console.warn('parse failed, keeping whole:', e.message); return [code]; }
  const cuts = [0]; let prevEnd = 0;
  ast.body.forEach((st, i) => {
    const gap = code.slice(prevEnd, st.start);
    const banner = /[═=]{5,}|-{8,}/.test(gap);
    const size = prevEnd - cuts[cuts.length - 1];
    if (i > 0 && ((size >= CHUNK && banner) || size >= MAX)) cuts.push(prevEnd);
    prevEnd = st.end;
  });
  cuts.push(code.length);
  const parts = []; for (let i = 0; i < cuts.length - 1; i++) parts.push(code.slice(cuts[i], cuts[i + 1]));
  return parts;
}
while ((m = re.exec(html))) {
  const tag = m[1].toLowerCase(), attrs = m[2], body = m[3];
  const isJs = tag === 'script' && !/\bsrc=/.test(attrs) && (!/\btype=/.test(attrs) || /type=["']?(text\/javascript|module)/i.test(attrs));
  const isCss = tag === 'style';
  if (!isJs && !isCss) continue;
  if (!body.trim()) continue;
  const bodyStart = m.index + m[0].indexOf('>') + 1;
  tpl += html.slice(last, bodyStart);
  if (isCss) {
    const f = `css/${pad(++cssN)}-style.css`;
    fs.writeFileSync(path.join(out, f), body);
    tpl += `@@include ${f}@@`;
  } else {
    const parts = jsChunks(body);
    const incs = parts.map((p) => {
      n++;
      const first = (p.match(/\/[*/]\s*[═=\-\s]*([A-Za-z0-9][^\n═]{3,50})/) || p.match(/function\s+([A-Za-z0-9_]+)/) || [])[1];
      const f = `js/${pad(n)}-${slug(first)}.js`;
      fs.writeFileSync(path.join(out, f), p);
      return `@@include ${f}@@`;
    });
    tpl += incs.join('\n@@part@@\n');
  }
  last = bodyStart + body.length;
}
tpl += html.slice(last);
fs.writeFileSync(path.join(out, 'index.template.html'), tpl);
console.log('template bytes', tpl.length, 'css files', cssN, 'js files', n);
