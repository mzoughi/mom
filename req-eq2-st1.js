/* ── Equivalent Resistance Step-by-Step Sim ──────────────────────
External JS for MOM embedding. Suffix "EQR" used in place of
$thisq to avoid MOM template-variable parsing inside <script>.
All DOM IDs still use the literal string "EQR" as suffix.
──────────────────────────────────────────────────────────────── */
(function () {
'use strict';
/* ── Suffix token (matches IDs in the HTML snippet) ── */
var Q = 'EQR';
/* ── Helpers ── */
function $id(s) { return document.getElementById(s + Q); }
function $qs(sel) { return document.querySelector(sel); }
/* ════════════════ ACCESSIBILITY CONTROLLER ════════════════ */
var A11Y = (function () {
var ROOT = null;
var states = { hc: false, lm: false, cb: false, nr: true };
var FONTS = ['', 'er_fs1EQR', 'er_fs2EQR', 'er_fs3EQR'];
var fi = 0;
function applyClasses() {
if (!ROOT) return;
ROOT.classList.toggle('er_hcEQR', states.hc);
ROOT.classList.toggle('er_lmEQR', states.lm);
ROOT.classList.toggle('er_cbEQR', states.cb);
}
function styleBtn(id, active) {
var b = document.getElementById(id);
if (!b) return;
if (active) {
b.style.background = 'rgba(0,232,208,.12)';
b.style.borderColor = '#00e8d0';
b.style.color = '#00e8d0';
} else {
b.style.background = '#2a2e3a';
b.style.borderColor = '#404a60';
b.style.color = '#7a8aaa';
}
b.setAttribute('aria-pressed', active ? 'true' : 'false');
}
function applyNarBar() {
var nb = document.getElementById('erNarBarEQR');
if (nb) nb.style.display = states.nr ? 'block' : 'none';
var btn = document.getElementById('erBtnNREQR');
if (btn) {
btn.textContent = 'NARRATION: ' + (states.nr ? 'ON' : 'OFF');
styleBtn('erBtnNREQR', states.nr);
}
}
function apply() {
if (!ROOT) return;
applyClasses();
applyNarBar();
styleBtn('erBtnHCEQR', states.hc);
styleBtn('erBtnLMEQR', states.lm);
styleBtn('erBtnCBEQR', states.cb);
}
function col(role) {
if (!ROOT) return '#4a90d9';
return getComputedStyle(ROOT).getPropertyValue('--er-' + role).trim() || '#4a90d9';
}
return {
init: function () { ROOT = document.getElementById('eqrRootEQR'); apply(); },
toggle: function (k) {
states[k] = !states[k];
if (k === 'hc' && states.hc) states.lm = false;
if (k === 'lm' && states.lm) states.hc = false;
apply();
SIM.redraw();
},
cycleFont: function () {
if (ROOT && FONTS[fi]) ROOT.classList.remove(FONTS[fi]);
fi = (fi + 1) % FONTS.length;
if (ROOT && FONTS[fi]) ROOT.classList.add(FONTS[fi]);
},
narrate: function (msg) {
if (!states.nr) return;
var nb = document.getElementById('erNarBarEQR');
if (nb) nb.textContent = msg;
},
col: col
};
})();
/* ════════════════ TOPOLOGY HELPERS ════════════════ */
var INIT_TOPO = {
R1: ['E', 'GR'], R2: ['D', 'E'], R3: ['D', 'Dm'], R4: ['Dm', 'GR'],
R5: ['C', 'D'], R6: ['C', 'Cm'], R7: ['Cm', 'GL'],
R8: ['A', 'GL'], R9: ['A', 'GL'], R10: ['A', 'C']
};
var INIT_LABELS = {
R1: 'R\u2081', R2: 'R\u2082', R3: 'R\u2083', R4: 'R\u2084', R5: 'R\u2085',
R6: 'R\u2086', R7: 'R\u2087', R8: 'R\u2088', R9: 'R\u2089', R10: 'R\u2081\u2080'
};
function deg(node, t) {
var d = 0;
for (var k in t) if (t[k][0] === node || t[k][1] === node) d++;
return d;
}
function checkPair(a, b, t) {
var na = t[a], nb = t[b];
if (!na || !nb) return null;
if ((na[0] === nb[0] && na[1] === nb[1]) || (na[0] === nb[1] && na[1] === nb[0])) return 'parallel';
var sh = null;
for (var i = 0; i < 2; i++) if (nb.indexOf(na[i]) >= 0) { sh = na[i]; break; }
if (sh !== null && deg(sh, t) === 2) return 'series';
return null;
}
function mergeNodes(a, b, t, type) {
var na = t[a], nb = t[b];
if (type === 'parallel') return [na[0], na[1]];
var sh = null;
for (var i = 0; i < 2; i++) if (nb.indexOf(na[i]) >= 0) { sh = na[i]; break; }
return [na[0] === sh ? na[1] : na[0], nb[0] === sh ? nb[1] : nb[0]];
}
function allValid(t) {
var ids = Object.keys(t), p = [];
for (var i = 0; i < ids.length; i++)
for (var j = i + 1; j < ids.length; j++) {
var r = checkPair(ids[i], ids[j], t);
if (r) p.push({ a: ids[i], b: ids[j], type: r });
}
return p;
}
/* ════════════════ SVG LAYOUT CONSTANTS ════════════════ */
var TY = 35, BY = 168, MY;
MY = (TY + BY) / 2;
var R8X = 45, R9X = 95, CX = 200, DX = 340, EX = 460;
var AX = 70;
var BAT_LX = 200, BAT_RX = 340, BAT_Y = 186, BAT_MID = 270;
var INIT_META = {
R8:  { geom: 'V', x: R8X, y1: TY, y2: BY, ldx: -18, ldy: 0 },
R9:  { geom: 'V', x: R9X, y1: TY, y2: BY, ldx: 14,  ldy: 0 },
R10: { geom: 'H', hx1: R9X, hx2: CX, ldx: 0, ldy: -14 },
R6:  { geom: 'V', x: CX,  y1: TY, y2: MY, ldx: 14,  ldy: 0 },
R7:  { geom: 'V', x: CX,  y1: MY, y2: BY, ldx: 14,  ldy: 0 },
R5:  { geom: 'H', hx1: CX, hx2: DX, ldx: 0, ldy: -14 },
R3:  { geom: 'V', x: DX,  y1: TY, y2: MY, ldx: 14,  ldy: 0 },
R4:  { geom: 'V', x: DX,  y1: MY, y2: BY, ldx: 14,  ldy: 0 },
R2:  { geom: 'H', hx1: DX, hx2: EX, ldx: 0, ldy: -14 },
R1:  { geom: 'V', x: EX,  y1: TY, y2: BY, ldx: 14,  ldy: 0 }
};
/* ════════════════ STATE ════════════════ */
var S = { topo: {}, labels: {}, meta: {}, wireSegs: [], step: 0, totalSteps: 9, typeChosen: null, pairChosen: [], mc: 0 };
function cp(m) { var r = {}; for (var k in m) r[k] = m[k]; return r; }
/* ════════════════ MERGE METADATA ════════════════ */
function metaX(m) { return m.geom === 'V' ? m.x : (m.hx1 + m.hx2) / 2; }
function addWireSeg(x1, y1, x2, y2) {
for (var i = 0; i < S.wireSegs.length; i++) {
var w = S.wireSegs[i];
if (Math.abs(w.x1 - x1) < 1 && Math.abs(w.y1 - y1) < 1 && Math.abs(w.x2 - x2) < 1 && Math.abs(w.y2 - y2) < 1) return;
}
S.wireSegs.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
}
function mergeMeta(mA, mB, type, newNodes) {
if (type === 'series' && mA.geom === 'V' && mB.geom === 'V' && mA.x === mB.x)
return { geom: 'V', x: mA.x, y1: Math.min(mA.y1, mB.y1), y2: Math.max(mA.y2, mB.y2), ldx: mA.ldx, ldy: 0 };
if (type === 'parallel') {
var xA = metaX(mA), xB = metaX(mB);
var glSide = (newNodes[0] === 'GL' || newNodes[1] === 'GL');
var keepA = glSide ? (xA <= xB) : (xA >= xB);
var kept = keepA ? mA : mB, drp = keepA ? mB : mA;
addWireSeg(Math.min(metaX(kept), metaX(drp)), TY, Math.max(metaX(kept), metaX(drp)), TY);
return cp(kept);
}
if (type === 'series') {
if (mA.geom === 'H') { addWireSeg(mA.hx1, TY, mA.hx2, TY); return cp(mB); }
if (mB.geom === 'H') { addWireSeg(mB.hx1, TY, mB.hx2, TY); return cp(mA); }
var mkA = metaX(mA), mkB = metaX(mB);
var kVV = mkA <= mkB ? mA : mB, dVV = mkA <= mkB ? mB : mA;
addWireSeg(Math.min(metaX(kVV), metaX(dVV)), TY, Math.max(metaX(kVV), metaX(dVV)), TY);
addWireSeg(metaX(dVV), TY, metaX(dVV), BY);
return cp(kVV);
}
return cp(mA);
}
/* ════════════════ SVG DRAWING ════════════════ */
var SVGNS = 'http://www.w3.org/2000/svg';
function ns(tag, a) {
var el = document.createElementNS(SVGNS, tag);
for (var k in a) el.setAttribute(k, a[k]);
return el;
}
function wline(svg, x1, y1, x2, y2) {
if (Math.abs(x1 - x2) < 0.5 && Math.abs(y1 - y2) < 0.5) return;
svg.appendChild(ns('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: A11Y.col('wire'), 'stroke-width': '1.5' }));
}
function zigzag(svg, x1, y1, x2, y2, stroke, lbl, ldx, ldy) {
var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
if (len < 4) return;
var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
var stub = 0.18, nT = 5, tw = 6, z0 = stub * len, z1 = (1 - stub) * len, seg = (z1 - z0) / nT;
var pts = [[x1, y1], [x1 + ux * z0, y1 + uy * z0]];
for (var i = 0; i < nT; i++) {
var ta = z0 + i * seg;
pts.push([x1 + ux * (ta + seg * 0.25) + nx * tw, y1 + uy * (ta + seg * 0.25) + ny * tw]);
pts.push([x1 + ux * (ta + seg * 0.75) - nx * tw, y1 + uy * (ta + seg * 0.75) - ny * tw]);
pts.push([x1 + ux * (ta + seg), y1 + uy * (ta + seg)]);
}
pts.push([x2, y2]);
var g = ns('g', {});
g.appendChild(ns('polyline', {
points: pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '),
stroke: stroke, 'stroke-width': '2.2', fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'butt'
}));
var t = ns('text', { x: (x1 + x2) / 2 + ldx, y: (y1 + y2) / 2 + ldy, fill: stroke, 'font-size': '11', 'font-weight': '700', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
t.textContent = lbl;
g.appendChild(t);
svg.appendChild(g);
}
function mboxV(svg, x, y1, y2, stroke, shortLbl) {
var bh = 30, bw = 26, bx = x - bw / 2, by = (y1 + y2) / 2 - bh / 2;
var g = ns('g', {});
g.appendChild(ns('line', { x1: x, y1: y1, x2: x, y2: by, stroke: stroke, 'stroke-width': '1.8' }));
g.appendChild(ns('line', { x1: x, y1: by + bh, x2: x, y2: y2, stroke: stroke, 'stroke-width': '1.8' }));
g.appendChild(ns('rect', { x: bx, y: by, width: bw, height: bh, rx: '2', fill: '#071a07', stroke: stroke, 'stroke-width': '1.8' }));
var t = ns('text', { x: x + bw / 2 + 4, y: (y1 + y2) / 2, fill: stroke, 'font-size': '9', 'font-weight': '600', 'text-anchor': 'start', 'dominant-baseline': 'middle' });
t.textContent = shortLbl;
g.appendChild(t);
svg.appendChild(g);
}
function drawBattery(svg) {
var y = BAT_Y;
var p1 = BAT_MID - 18, p2 = BAT_MID - 6, p3 = BAT_MID + 6, p4 = BAT_MID + 18;
var bc = A11Y.col('battery');
wline(svg, BAT_LX, y, p1 - 2, y);
wline(svg, p2 + 2, y, p3 - 2, y);
wline(svg, p4 + 2, y, BAT_RX, y);
svg.appendChild(ns('line', { x1: p1, y1: y - 6,  x2: p1, y2: y + 6,  stroke: bc, 'stroke-width': '2' }));
svg.appendChild(ns('line', { x1: p2, y1: y - 11, x2: p2, y2: y + 11, stroke: bc, 'stroke-width': '3' }));
svg.appendChild(ns('line', { x1: p3, y1: y - 6,  x2: p3, y2: y + 6,  stroke: bc, 'stroke-width': '2' }));
svg.appendChild(ns('line', { x1: p4, y1: y - 11, x2: p4, y2: y + 11, stroke: bc, 'stroke-width': '3' }));
function bt(x, yy, txt) {
var t = ns('text', { x: x, y: yy, fill: bc, 'font-size': '11', 'font-weight': '700', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
t.textContent = txt; svg.appendChild(t);
}
bt(BAT_LX, BAT_Y - 16, '\u2212');
bt(BAT_RX, BAT_Y - 16, '+');
bt(BAT_MID, BAT_Y + 10, 'E');
}
function elemColor(id) {
if (S.pairChosen.indexOf(id) >= 0) return A11Y.col('selected');
if (id[0] === 'm') return A11Y.col('merged');
return A11Y.col('resistor');
}
function drawSVG() {
var svg = document.getElementById('erSVGEQR');
if (!svg) return;
while (svg.firstChild) svg.removeChild(svg.firstChild);
var t = S.topo, m = S.meta;
wline(svg, R8X, BY, BAT_LX, BY);
wline(svg, BAT_RX, BY, EX, BY);
wline(svg, BAT_LX, BY, BAT_LX, BAT_Y);
wline(svg, BAT_RX, BY, BAT_RX, BAT_Y);
drawBattery(svg);
wline(svg, R8X, TY, AX, TY);
if (t.R9) wline(svg, AX, TY, R9X, TY);
S.wireSegs.forEach(function (w) { wline(svg, w.x1, w.y1, w.x2, w.y2); });
if (t.R8)  zigzag(svg, R8X, TY, R8X, BY, elemColor('R8'),  'R\u2088', -18, 0);
if (t.R9)  zigzag(svg, R9X, TY, R9X, BY, elemColor('R9'),  'R\u2089',  14, 0);
if (t.R10) zigzag(svg, R9X, TY, CX,  TY, elemColor('R10'), 'R\u2081\u2080', 0, -14);
if (t.R6)  zigzag(svg, CX,  TY, CX,  MY, elemColor('R6'),  'R\u2086',  14, 0);
if (t.R7)  zigzag(svg, CX,  MY, CX,  BY, elemColor('R7'),  'R\u2087',  14, 0);
if (t.R5)  zigzag(svg, CX,  TY, DX,  TY, elemColor('R5'),  'R\u2085',   0, -14);
if (t.R3)  zigzag(svg, DX,  TY, DX,  MY, elemColor('R3'),  'R\u2083',  14, 0);
if (t.R4)  zigzag(svg, DX,  MY, DX,  BY, elemColor('R4'),  'R\u2084',  14, 0);
if (t.R2)  zigzag(svg, DX,  TY, EX,  TY, elemColor('R2'),  'R\u2082',   0, -14);
if (t.R1)  zigzag(svg, EX,  TY, EX,  BY, elemColor('R1'),  'R\u2081',  14, 0);
Object.keys(t).filter(function (k) { return k[0] === 'm'; }).forEach(function (id) {
var mt = m[id];
if (mt.geom === 'V') mboxV(svg, mt.x, mt.y1, mt.y2, elemColor(id), id);
});
var nc = A11Y.col('node');
var bc2 = A11Y.col('battery');
function dot(x, y, r) { svg.appendChild(ns('circle', { cx: x, cy: y, r: r, fill: nc })); }
function lbl(x, y, txt) {
var tl = ns('text', { x: x, y: y, fill: bc2, 'font-size': '10', 'font-weight': '700', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
tl.textContent = txt; svg.appendChild(tl);
}
dot(AX, TY, 3); lbl(AX, TY - 12, 'A');
dot(R8X, TY, 2.5);
if (t.R9) dot(R9X, TY, 2.5);
dot(CX, TY, 3); lbl(CX, TY - 12, 'C');
dot(DX, TY, 3); lbl(DX, TY - 12, 'D');
dot(EX, TY, 3); lbl(EX, TY - 12, 'E');
dot(BAT_LX, BY, 2.5);
dot(BAT_RX, BY, 2.5);
if (t.R6 && t.R7) dot(CX, MY, 2.5);
if (t.R3 && t.R4) dot(DX, MY, 2.5);
}
/* ════════════════ UI ════════════════ */
function setFb(msg, cls) {
var el = document.getElementById('erFeedbackEQR');
if (el) { el.textContent = msg; el.className = 'er_feedbackEQR' + (cls ? ' ' + cls : ''); }
}
function renderStep() {
var si = document.getElementById('erStepInfoEQR');
if (si) si.textContent = 'Step ' + (S.step + 1) + ' of ' + S.totalSteps;
setFb('', '');
S.typeChosen = null; S.pairChosen = [];
var bs = document.getElementById('erBtnSerEQR');
var bp = document.getElementById('erBtnParEQR');
if (bs) bs.className = 'er_typebtnEQR';
if (bp) bp.className = 'er_typebtnEQR';
var bc = document.getElementById('erBtnCheckEQR');
var bn = document.getElementById('erBtnNextEQR');
if (bc) bc.disabled = false;
if (bn) bn.disabled = true;
var pr = document.getElementById('erPreviewRowEQR');
if (pr) pr.style.display = 'none';
var row = document.getElementById('erPairRowEQR');
if (row) {
row.innerHTML = '<span class="er_plabelEQR">Select two elements:</span>';
Object.keys(S.topo).forEach(function (k) {
var btn = document.createElement('button');
btn.type = 'button';
btn.className = 'er_pairbtnEQR';
var l = S.labels[k] || k;
btn.textContent = l.length > 30 ? k : l;
btn.title = l;
btn.setAttribute('data-id', k);
btn.onclick = (function (id, b) { return function () { togglePair(id, b); }; })(k, btn);
row.appendChild(btn);
});
}
drawSVG();
A11Y.narrate('Step ' + (S.step + 1) + ' of ' + S.totalSteps + '. Select series or parallel, then pick two elements.');
}
function togglePair(id, btn) {
var idx = S.pairChosen.indexOf(id);
if (idx >= 0) { S.pairChosen.splice(idx, 1); btn.classList.remove('er_pselEQR'); }
else {
if (S.pairChosen.length >= 2) {
var old = S.pairChosen.shift();
var ob = document.querySelector('#eqrRootEQR .er_pairbtnEQR[data-id="' + old + '"]');
if (ob) ob.classList.remove('er_pselEQR');
}
S.pairChosen.push(id); btn.classList.add('er_pselEQR');
}
previewResult(); drawSVG();
}
function previewResult() {
var rr = document.getElementById('erPreviewRowEQR');
if (S.pairChosen.length === 2 && S.typeChosen) {
var a = S.labels[S.pairChosen[0]] || S.pairChosen[0];
var b = S.labels[S.pairChosen[1]] || S.pairChosen[1];
var ex = document.getElementById('erPreviewExprEQR');
if (ex) ex.textContent = S.typeChosen === 'series' ? '(' + a + ')+(' + b + ')' : '(' + a + ')|(' + b + ')';
if (rr) rr.style.display = 'flex';
} else {
if (rr) rr.style.display = 'none';
}
}
/* ════════════════ PUBLIC API ════════════════ */
var SIM = {};
SIM.selectType = function (tp) {
S.typeChosen = tp;
var bs = document.getElementById('erBtnSerEQR');
var bp = document.getElementById('erBtnParEQR');
if (bs) bs.className = 'er_typebtnEQR' + (tp === 'series'   ? ' er_tselEQR' : '');
if (bp) bp.className = 'er_typebtnEQR' + (tp === 'parallel' ? ' er_tselEQR' : '');
previewResult(); setFb('', '');
};
SIM.check = function () {
if (!S.typeChosen) { setFb('Select Series or Parallel first.', 'er_fbhintEQR'); return; }
if (S.pairChosen.length !== 2) { setFb('Select exactly two elements.', 'er_fbhintEQR'); return; }
var idA = S.pairChosen[0], idB = S.pairChosen[1];
var actual = checkPair(idA, idB, S.topo);
if (!actual) {
setFb('These elements cannot be combined yet — they do not share the right nodes.', 'er_fberrEQR');
flashErr(); return;
}
if (actual !== S.typeChosen) {
var why = actual === 'parallel'
? 'They share both terminal nodes: parallel, not series.'
: 'They share exactly one intermediate node with no other branches: series, not parallel.';
setFb('Valid pair, but wrong type. ' + why, 'er_fberrEQR');
var wb = document.getElementById(S.typeChosen === 'series' ? 'erBtnSerEQR' : 'erBtnParEQR');
if (wb) { wb.classList.add('er_terrEQR'); setTimeout(function () { wb.className = 'er_typebtnEQR'; S.typeChosen = null; }, 900); }
return;
}
var lblA = S.labels[idA], lblB = S.labels[idB];
var newLbl = actual === 'series' ? '(' + lblA + ')+(' + lblB + ')' : '(' + lblA + ')|(' + lblB + ')';
var newNodes = mergeNodes(idA, idB, S.topo, actual);
var newMeta = mergeMeta(S.meta[idA], S.meta[idB], actual, newNodes);
S.mc++; var newId = 'm' + S.mc;
setFb('\u2713 Correct! ' + lblA + ' and ' + lblB + ' \u2192 ' + actual + '.', 'er_fbokEQR');
A11Y.narrate('Correct. ' + newLbl);
S.pairChosen.forEach(function (id) {
var b = document.querySelector('#eqrRootEQR .er_pairbtnEQR[data-id="' + id + '"]');
if (b) b.classList.add('er_pokEQR');
});
var tbtn = document.getElementById(actual === 'series' ? 'erBtnSerEQR' : 'erBtnParEQR');
if (tbtn) tbtn.className = 'er_typebtnEQR er_tokEQR';
delete S.topo[idA];  delete S.topo[idB];
delete S.labels[idA]; delete S.labels[idB];
delete S.meta[idA];   delete S.meta[idB];
S.topo[newId]   = newNodes;
S.labels[newId] = newLbl;
S.meta[newId]   = newMeta;
addSumRow(S.step + 1, lblA, lblB, actual, newLbl);
drawSVG();
S.step++;
var bck = document.getElementById('erBtnCheckEQR');
var bnx = document.getElementById('erBtnNextEQR');
if (bck) bck.disabled = true;
if (bnx) bnx.disabled = (S.step >= S.totalSteps);
if (S.step >= S.totalSteps) {
setTimeout(function () {
var ban = document.getElementById('erBannerEQR');
if (ban) ban.style.display = 'block';
A11Y.narrate('All 9 steps complete! Network fully reduced.');
}, 400);
}
};
function flashErr() {
S.pairChosen.forEach(function (id) {
var b = document.querySelector('#eqrRootEQR .er_pairbtnEQR[data-id="' + id + '"]');
if (b) { b.classList.add('er_perrEQR'); setTimeout(function () { b.classList.remove('er_perrEQR', 'er_pselEQR'); }, 900); }
});
S.pairChosen = []; drawSVG();
}
function addSumRow(n, la, lb, type, res) {
var tb = document.getElementById('erSumBodyEQR');
if (!tb) return;
var sh = function (s) { return s.length > 28 ? s.substring(0, 26) + '\u2026' : s; };
var tr = document.createElement('tr');
tr.innerHTML = '<td>' + n + '</td><td>' + sh(la) + ' & ' + sh(lb) + '</td><td>' + type + '</td><td>' + sh(res) + '</td>';
tb.appendChild(tr);
var st = document.getElementById('erSumTableEQR');
if (st) st.style.display = 'table';
}
SIM.hint = function () {
var p = allValid(S.topo);
if (!p.length) { setFb('Network fully reduced.', 'er_fbhintEQR'); return; }
var pick = p[0];
setFb('\ud83d\udca1 Try: ' + (S.labels[pick.a] || pick.a) + ' and ' + (S.labels[pick.b] || pick.b) + ' (' + pick.type + ').', 'er_fbhintEQR');
A11Y.narrate('Hint: try ' + (S.labels[pick.a] || pick.a) + ' and ' + (S.labels[pick.b] || pick.b) + ' as ' + pick.type + '.');
};
SIM.next = function () { if (S.step < S.totalSteps) renderStep(); };
SIM.reset = function () { init(); };
SIM.redraw = function () { drawSVG(); };
/* ════════════════ BOOT ════════════════ */
function init() {
S.topo = {}; S.labels = {}; S.meta = {}; S.wireSegs = [];
S.step = 0; S.typeChosen = null; S.pairChosen = []; S.mc = 0;
for (var k in INIT_TOPO) {
S.topo[k]   = INIT_TOPO[k].slice();
S.labels[k] = INIT_LABELS[k];
S.meta[k]   = cp(INIT_META[k]);
}
var tb = document.getElementById('erSumBodyEQR');
if (tb) tb.innerHTML = '';
var st = document.getElementById('erSumTableEQR');
if (st) st.style.display = 'none';
var bn = document.getElementById('erBannerEQR');
if (bn) bn.style.display = 'none';
A11Y.init();
renderStep();
A11Y.narrate('Equivalent resistance widget ready. Select any valid series or parallel pair to begin reducing the network.');
}
/* Expose globals for inline onclick handlers in the HTML snippet */
window.eqrA11yEQR = A11Y;
window.eqrSimEQR  = SIM;
window.setTimeout(function () { init(); }, 0);
})();
