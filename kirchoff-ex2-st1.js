(function(){
'use strict';
var thisq = 'q1';
var rootElId = 'ctRoot' + thisq;
var stateKey = 'ctState_' + thisq;
/* =========================================================
 PER-INSTANCE STATE
========================================================= */
if (!window[stateKey]) {
window[stateKey] = {
a11y: { lm:false, nr:true, hc:false, fs:0 }
};
}
var S = window[stateKey];
/* =========================================================
 CIRCUIT MODEL — Bridge for Example 2
 Components (with x,y coords for the diamond layout):
n1 (top junction)
/  \
R1   R2
 /      \
n2 -R5- n3
 \      /
E2,R3   R4
 \    /
n4 (bottom junction)
 |        |
 +--------+ (return wire, with E1 in the top stretch)
 We use explicit (x,y) coordinates per component so the renderer
 doesn't need to assume any ladder/column topology.
========================================================= */
function makeInitialCircuit() {
return {
nextId: 100,
mergeCount: 0,
// Each component has x1/y1 and x2/y2 coordinates AND its terminals (a,b).
// The renderer uses these to draw the body and any leads.
components: [
// R1 from n1 to n2 (top-left arm)
{ id:'R1', kind:'resistor', value:2, a:'n1', b:'n2', label:'R\u2081',
geom: { kind:'arm', x1:270, y1:60, x2:130, y2:175, orient:'diagonal' } },
// R2 from n1 to n3 (top-right arm)
{ id:'R2', kind:'resistor', value:4, a:'n1', b:'n3', label:'R\u2082',
geom: { kind:'arm', x1:270, y1:60, x2:410, y2:175, orient:'diagonal' } },
// R5 from n2 to n3 (bridge)
{ id:'R5', kind:'resistor', value:5, a:'n2', b:'n3', label:'R\u2085',
geom: { kind:'arm', x1:130, y1:175, x2:410, y2:175, orient:'horizontal' } },
// E2 from n2 to nE2int (in series with R3)
{ id:'E2', kind:'battery', value:6, a:'n2', b:'nE2int', label:'E\u2082',
geom: { kind:'arm', x1:130, y1:175, x2:200, y2:227, orient:'diagonal-bottom-left-half' } },
// R3 from nE2int to n4
{ id:'R3', kind:'resistor', value:3, a:'nE2int', b:'n4', label:'R\u2083',
geom: { kind:'arm', x1:200, y1:227, x2:270, y2:280, orient:'diagonal-bottom-left-half' } },
// R4 from n3 to n4 (bottom-right arm)
{ id:'R4', kind:'resistor', value:6, a:'n3', b:'n4', label:'R\u2084',
geom: { kind:'arm', x1:410, y1:175, x2:270, y2:280, orient:'diagonal' } },
// E1 in the return wire from n4 -> external -> n1.
// For drawing: the return wire wraps around left-bottom-top.
// E1 sits in the top horizontal stretch.
{ id:'E1', kind:'battery', value:12, a:'n1', b:'n4', label:'E\u2081',
geom: { kind:'return-wire-horizontal', x1:270, y1:30, x2:270, y2:30, midX:140 } }
]
};
}
if (!S.circuit) S.circuit = makeInitialCircuit();
if (!S.selected) S.selected = [];
/* =========================================================
 TOPOLOGY HELPERS (same as Example 1)
========================================================= */
function nodeDegree(node) {
var d = 0;
S.circuit.components.forEach(function(c){
if (c.a === node) d++;
if (c.b === node) d++;
});
return d;
}
function getById(id) {
for (var i=0; i<S.circuit.components.length; i++) {
if (S.circuit.components[i].id === id) return S.circuit.components[i];
}
return null;
}
function checkSeries(c1, c2) {
if (c1.kind !== 'resistor' || c2.kind !== 'resistor') {
return { ok:false, reason:'Only two resistors can be combined. The battery stays in place.' };
}
var shared = null;
if (c1.a === c2.a || c1.a === c2.b) shared = c1.a;
if (c1.b === c2.a || c1.b === c2.b) shared = c1.b;
if (!shared) return { ok:false, reason:'These two resistors do not share a node.' };
var deg = nodeDegree(shared);
if (deg !== 2) {
return { ok:false, reason:'The shared node also connects to other components (degree ' + deg + '). For series, only the two chosen resistors should meet there.' };
}
return { ok:true, sharedNode: shared };
}
function checkParallel(c1, c2) {
if (c1.kind !== 'resistor' || c2.kind !== 'resistor') {
return { ok:false, reason:'Only two resistors can be combined. The battery stays in place.' };
}
var same = ((c1.a === c2.a && c1.b === c2.b) || (c1.a === c2.b && c1.b === c2.a));
if (!same) return { ok:false, reason:'These resistors don\u2019t share both endpoints, so they aren\u2019t in parallel.' };
return { ok:true };
}
/* =========================================================
 MERGE HELPERS (rarely used in this irreducible circuit, but
 the code path exists for consistency with Example 1)
========================================================= */
function subscript(n) {
var subs = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
return String(n).split('').map(function(ch){return subs[+ch];}).join('');
}
function newReqLabel() {
S.circuit.mergeCount++;
return 'R\u2091' + subscript(S.circuit.mergeCount);
}
function fmt(v) {
if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
return v.toFixed(2).replace(/\.?0+$/,'');
}
/* =========================================================
 RENDER — custom for the bridge layout
========================================================= */
function svgEl(tag, attrs, text) {
var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
for (var k in attrs) el.setAttribute(k, attrs[k]);
if (text != null) el.textContent = text;
return el;
}
// Node positions in the SVG (used for nodes & junction dots)
function nodePos() {
return {
n1:     { x:270, y:60 },
n2:     { x:130, y:175 },
n3:     { x:410, y:175 },
n4:     { x:270, y:280 },
nE2int: { x:200, y:227 }   // mid-point of bottom-left arm (between E2 and R3)
};
}
function render() {
var svg = document.getElementById('ctSvg' + thisq);
if (!svg) return;
while (svg.firstChild) svg.removeChild(svg.firstChild);
var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
t.textContent = 'Bridge circuit';
var d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
d.textContent = describeCircuit();
svg.appendChild(t); svg.appendChild(d);
// === Draw the return wire (wraps around left-bottom and top) ===
// Path: n4 (270,280) -> (270,310) down -> (60,310) left -> (60,30) up -> (270,30) right -> n1 (270,60) down
// E1 sits on the top stretch, between (60,30) and (270,30). Place E1 body around x=140.
drawReturnWirePath(svg);
// === Draw each non-return component in place ===
S.circuit.components.forEach(function(c){
if (c.id === 'E1') return; // drawn as part of return wire
drawComponent(svg, c);
});
// === Junction dots ===
var pos = nodePos();
['n1','n2','n3','n4'].forEach(function(n){
if (nodeDegree(n) >= 3) {
svg.appendChild(svgEl('circle', { cx:pos[n].x, cy:pos[n].y, r:3.5, 'class':'ctnode'+thisq }));
}
});
}
function drawReturnWirePath(svg) {
// The return wire path with E1 in the top horizontal stretch.
// Segments:
//   n4 (270,280) → (270,310) → (60,310) → (60,30) → (110,30)  [left side of E1]
//   E1 body: (110,30) ... (170,30)
//   (170,30) → (270,30) → n1 (270,60)
var L = 'class="ctwire' + thisq + '"';
// Down from n4
svg.appendChild(svgEl('line', {x1:270, y1:280, x2:270, y2:310, 'class':'ctwire'+thisq}));
// Left across bottom
svg.appendChild(svgEl('line', {x1:270, y1:310, x2:60, y2:310, 'class':'ctwire'+thisq}));
// Up the left side
svg.appendChild(svgEl('line', {x1:60, y1:310, x2:60, y2:30, 'class':'ctwire'+thisq}));
// Across the top to E1's left lead
svg.appendChild(svgEl('line', {x1:60, y1:30, x2:110, y2:30, 'class':'ctwire'+thisq}));
// E1: battery symbol horizontal at y=30, plates around x=140
drawBatteryHorizontal(svg, getById('E1'), 140, 30);
// From E1's right lead to n1
svg.appendChild(svgEl('line', {x1:170, y1:30, x2:270, y2:30, 'class':'ctwire'+thisq}));
// Down to n1
svg.appendChild(svgEl('line', {x1:270, y1:30, x2:270, y2:60, 'class':'ctwire'+thisq}));
}
function drawComponent(svg, c) {
if (c.kind === 'battery') drawBatteryDiagonal(svg, c);
else drawResistor(svg, c);
}
function drawResistor(svg, c) {
// Resistors are drawn as rectangles aligned along the line from (x1,y1) to (x2,y2).
// Compute midpoint and angle.
var x1 = c.geom.x1, y1 = c.geom.y1, x2 = c.geom.x2, y2 = c.geom.y2;
var mx = (x1+x2)/2, my = (y1+y2)/2;
var dx = x2-x1, dy = y2-y1;
var len = Math.sqrt(dx*dx + dy*dy);
var ang = Math.atan2(dy, dx) * 180 / Math.PI;
var bodyLen = 36, bodyW = 14;
var halfLen = bodyLen/2;
// Body rect — drawn in component-local coords then rotated/translated
var bodyX = -halfLen, bodyY = -bodyW/2;
// The rect needs a rotation transform around the midpoint
var transform = 'translate(' + mx + ',' + my + ') rotate(' + ang + ')';
// Lead lines: from (x1,y1) to the body's left edge, and from body's right edge to (x2,y2)
// In component-local coords, leads go from (-len/2, 0) to (-halfLen, 0) and (halfLen, 0) to (len/2, 0).
// Easier to just compute the absolute endpoints of the body in world coords:
var ux = dx/len, uy = dy/len;
var bodyLeftX = mx - ux*halfLen, bodyLeftY = my - uy*halfLen;
var bodyRightX = mx + ux*halfLen, bodyRightY = my + uy*halfLen;
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:bodyLeftX, y2:bodyLeftY, 'class':'ctwire'+thisq}));
svg.appendChild(svgEl('line', {x1:bodyRightX, y1:bodyRightY, x2:x2, y2:y2, 'class':'ctwire'+thisq}));
var sel = S.selected.indexOf(c.id) >= 0;
var rect = svgEl('rect', {
x:bodyX, y:bodyY, width:bodyLen, height:bodyW, rx:3, ry:3,
transform: transform,
'class': 'ctcomp' + thisq + (sel ? ' ctcompsel' + thisq : ''),
'data-id': c.id, tabindex:0, role:'button',
'aria-label': describeComponent(c) + (sel ? ', selected' : ''),
'aria-pressed': sel ? 'true' : 'false'
});
attachHandlers(rect, c);
svg.appendChild(rect);
// Labels — positioned to the side of the body, perpendicular to its axis
// Choose offset direction perpendicular to the body line (rotate axis by 90 deg)
var px = -uy, py = ux; // perpendicular unit vector
var labOffsetMagnitude = 28;
// For arms going down-and-out from n1, push labels toward the outside.
// For our specific layout, choose offset that pushes labels away from center (270,175).
var cxRef = 270, cyRef = 175;
var dxFromCenter = mx - cxRef, dyFromCenter = my - cyRef;
// If dot product (px,py) . (dxFromCenter,dyFromCenter) is negative, flip.
var dot = px * dxFromCenter + py * dyFromCenter;
if (dot < 0) { px = -px; py = -py; }
var labX = mx + px * labOffsetMagnitude;
var labY = my + py * labOffsetMagnitude;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ctlabel'+thisq}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+12, 'class':'ctval'+thisq}, fmt(c.value) + ' \u03a9'));
}
function drawBatteryDiagonal(svg, c) {
// Diagonal battery (E2 in bottom-left arm). Draw plates perpendicular to the wire.
var x1 = c.geom.x1, y1 = c.geom.y1, x2 = c.geom.x2, y2 = c.geom.y2;
var mx = (x1+x2)/2, my = (y1+y2)/2;
var dx = x2-x1, dy = y2-y1;
var len = Math.sqrt(dx*dx + dy*dy);
var ux = dx/len, uy = dy/len;
var px = -uy, py = ux; // perpendicular
var longLen = 24, shortLen = 14;
// Long plate represents +; short plate represents -.
// c.a = positive, c.b = negative. Position long plate closer to c.a (x1,y1).
var plateGapHalf = 4;
// Long plate at (mx,my) - ux*plateGapHalf  (closer to c.a)
var longCx = mx - ux*plateGapHalf;
var longCy = my - uy*plateGapHalf;
var shortCx = mx + ux*plateGapHalf;
var shortCy = my + uy*plateGapHalf;
// Plate endpoints (perpendicular to wire)
var lp1x = longCx + px*longLen/2,  lp1y = longCy + py*longLen/2;
var lp2x = longCx - px*longLen/2,  lp2y = longCy - py*longLen/2;
var sp1x = shortCx + px*shortLen/2, sp1y = shortCy + py*shortLen/2;
var sp2x = shortCx - px*shortLen/2, sp2y = shortCy - py*shortLen/2;
// Leads from (x1,y1) to long plate, and from short plate to (x2,y2)
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:longCx, y2:longCy, 'class':'ctwire'+thisq}));
svg.appendChild(svgEl('line', {x1:lp1x, y1:lp1y, x2:lp2x, y2:lp2y, 'class':'ctwire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:sp1x, y1:sp1y, x2:sp2x, y2:sp2y, 'class':'ctwire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:shortCx, y1:shortCy, x2:x2, y2:y2, 'class':'ctwire'+thisq}));
// Label, offset perpendicular toward outside
var labOff = 22;
var dxFromCenter = mx - 270, dyFromCenter = my - 175;
var dot = px * dxFromCenter + py * dyFromCenter;
var pxL = px, pyL = py;
if (dot < 0) { pxL = -px; pyL = -py; }
var labX = mx + pxL*labOff, labY = my + pyL*labOff;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ctlabel'+thisq}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+12, 'class':'ctval'+thisq}, c.value + ' V'));
}
function drawBatteryHorizontal(svg, c, cx, cy) {
// Horizontal battery in the return wire (E1). Plates vertical, drawn around (cx,cy).
// c.a=positive (left side, toward n1 which is right of this position) - WAIT.
// E1 has a=n1, b=n4. n1 is the upper junction, n4 is the lower. Return wire path:
//   start at n4 (bottom), go around left/top, end at n1 (top-right).
// E1 sits in the top stretch, with leads from (110,30) and going to (170,30).
// Within E1: which side is +? c.a=n1 means the positive plate is on the side
// closer to n1 (the right side of E1's drawing).
var longLen = 26, shortLen = 14;
var plateGapHalf = 4;
// Right side (toward n1) gets the long plate (positive)
var longX = cx + plateGapHalf;
var shortX = cx - plateGapHalf;
// Leads
svg.appendChild(svgEl('line', {x1:cx-30, y1:cy, x2:shortX, y2:cy, 'class':'ctwire'+thisq}));
svg.appendChild(svgEl('line', {x1:shortX, y1:cy-shortLen/2, x2:shortX, y2:cy+shortLen/2, 'class':'ctwire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX,  y1:cy-longLen/2,  x2:longX,  y2:cy+longLen/2,  'class':'ctwire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX, y1:cy, x2:cx+30, y2:cy, 'class':'ctwire'+thisq}));
// Label below
svg.appendChild(svgEl('text', {x:cx, y:cy-longLen/2-6, 'class':'ctlabel'+thisq}, c.label));
svg.appendChild(svgEl('text', {x:cx, y:cy+longLen/2+14, 'class':'ctval'+thisq}, c.value + ' V'));
}
function attachHandlers(el, c) {
el.addEventListener('click', function(){ toggleSelection(c.id); });
el.addEventListener('keydown', function(ev){
if (ev.key === 'Enter' || ev.key === ' ') {
ev.preventDefault();
toggleSelection(c.id);
} else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
ev.preventDefault();
focusNeighbor(c.id, +1);
} else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
ev.preventDefault();
focusNeighbor(c.id, -1);
}
});
}
function focusNeighbor(id, dir) {
var resistors = S.circuit.components.filter(function(c){return c.kind==='resistor';});
if (resistors.length === 0) return;
var idx = -1;
for (var i=0; i<resistors.length; i++) if (resistors[i].id === id) { idx = i; break; }
var n = resistors.length;
var newIdx = ((idx + dir) % n + n) % n;
var nextId = resistors[newIdx].id;
setTimeout(function(){
var el = document.querySelector('[data-id="' + nextId + '"]');
if (el) el.focus();
}, 0);
}
function describeComponent(c) {
if (c.kind === 'battery') return 'Battery ' + c.label + ', ' + c.value + ' volts';
return 'Resistor ' + c.label + ', ' + fmt(c.value) + ' ohms';
}
function describeCircuit() {
var R = S.circuit.components.filter(function(c){return c.kind==='resistor';});
var B = S.circuit.components.filter(function(c){return c.kind==='battery';});
return 'Bridge circuit: ' + B.length + ' batteries and ' + R.length + ' resistors.';
}
/* =========================================================
 SELECTION + UI
========================================================= */
function toggleSelection(id) {
var c = getById(id);
if (!c) return;
if (c.kind === 'battery') {
announce('The battery cannot be combined. Select two resistors.');
setFeedback('The battery cannot be combined with another component. Select two resistors.', 'bad');
return;
}
var idx = S.selected.indexOf(id);
if (idx >= 0) S.selected.splice(idx, 1);
else {
if (S.selected.length >= 2) S.selected.shift();
S.selected.push(id);
}
refreshUI();
}
function refreshUI() {
render();
updateSelectedList();
updateButtons();
updateProgress();
}
function updateSelectedList() {
var div = document.getElementById('ctSel' + thisq);
if (S.selected.length === 0) {
div.innerHTML = '<span class="ctempty' + thisq + '">Click two resistors\u2026</span>';
return;
}
div.innerHTML = S.selected.map(function(id){
var c = getById(id);
return '<div class="ctseitem' + thisq + '">' + c.label + ' = ' + fmt(c.value) + ' \u03a9</div>';
}).join('');
}
function updateButtons() {
var canTry = S.selected.length === 2;
document.getElementById('ctBtnSer' + thisq).disabled = !canTry;
document.getElementById('ctBtnPar' + thisq).disabled = !canTry;
}
function updateProgress() {
var nR = S.circuit.components.filter(function(c){return c.kind==='resistor';}).length;
var note = document.getElementById('ctProg' + thisq);
if (note) note.textContent = nR + ' resistors in circuit';
}
function setFeedback(msg, tone) {
var fb = document.getElementById('ctFb' + thisq);
fb.className = 'ctfb' + thisq + (tone === 'good' ? ' ctfbgood' + thisq : tone === 'bad' ? ' ctfbbad' + thisq : tone === 'info' ? ' ctfbinfo' + thisq : '');
fb.innerHTML = msg;
}
function announce(msg) {
var live = document.getElementById('ctLive' + thisq);
var nar  = document.getElementById('ctNar' + thisq);
if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
if (nar && S.a11y.nr) nar.textContent = msg;
}
/* =========================================================
 OPERATIONS — same logic as Example 1 but rarely succeeds here
========================================================= */
function trySeries() {
if (S.selected.length !== 2) return;
var c1 = getById(S.selected[0]), c2 = getById(S.selected[1]);
var res = checkSeries(c1, c2);
if (!res.ok) {
setFeedback('<strong>Not in series.</strong> ' + res.reason, 'bad');
announce('Incorrect. ' + res.reason);
return;
}
// Theoretically shouldn't happen for the bridge, but handle correctly anyway.
var newId = 'R' + (S.circuit.nextId++);
var newVal = c1.value + c2.value;
var n1 = c1.a === res.sharedNode ? c1.b : c1.a;
var n2 = c2.a === res.sharedNode ? c2.b : c2.a;
S.circuit.components = S.circuit.components.filter(function(c){return c.id!==c1.id&&c.id!==c2.id;});
S.circuit.components.push({
id:newId, kind:'resistor', value:newVal, a:n1, b:n2,
label:newReqLabel(),
// Place merged resistor at the midpoint of the two originals
geom: { kind:'arm', x1:c1.geom.x1, y1:c1.geom.y1, x2:c2.geom.x2, y2:c2.geom.y2, orient:'diagonal' }
});
setFeedback('<strong>Correct \u2014 these are in series.</strong><div class="ctformula' + thisq + '">R = ' + c1.label + ' + ' + c2.label + ' = ' + c1.value + ' + ' + c2.value + ' = ' + fmt(newVal) + ' \u03a9</div>', 'good');
announce('Series merge: ' + c1.label + ' + ' + c2.label + ' = ' + fmt(newVal) + ' ohms.');
S.selected = [];
refreshUI();
checkComplete();
}
function tryParallel() {
if (S.selected.length !== 2) return;
var c1 = getById(S.selected[0]), c2 = getById(S.selected[1]);
var res = checkParallel(c1, c2);
if (!res.ok) {
setFeedback('<strong>Not in parallel.</strong> ' + res.reason, 'bad');
announce('Incorrect. ' + res.reason);
return;
}
var newId = 'R' + (S.circuit.nextId++);
var newVal = (c1.value * c2.value) / (c1.value + c2.value);
S.circuit.components = S.circuit.components.filter(function(c){return c.id!==c1.id&&c.id!==c2.id;});
S.circuit.components.push({
id:newId, kind:'resistor', value:newVal, a:c1.a, b:c1.b,
label:newReqLabel(),
geom: c1.geom // approximate
});
var formula = '(' + c1.label + ' \u00d7 ' + c2.label + ') / (' + c1.label + ' + ' + c2.label + ')'
+ ' = (' + c1.value + ' \u00d7 ' + c2.value + ') / (' + c1.value + ' + ' + c2.value + ')'
+ ' = ' + fmt(newVal) + ' \u03a9';
setFeedback('<strong>Correct \u2014 these are in parallel.</strong><div class="ctformula' + thisq + '">R = ' + formula + '</div>', 'good');
announce('Parallel merge: ' + fmt(newVal) + ' ohms.');
S.selected = [];
refreshUI();
checkComplete();
}
function clearSelection() {
S.selected = [];
setFeedback('Selection cleared.');
refreshUI();
}
function resetCircuit() {
S.circuit = makeInitialCircuit();
S.selected = [];
document.getElementById('ctComp' + thisq).classList.remove('ctshow' + thisq);
setFeedback('Circuit reset.');
refreshUI();
}
/* =========================================================
 IRREDUCIBLE-DETECTION (the pedagogical payoff)
========================================================= */
function isIrreducible() {
var R = S.circuit.components.filter(function(c){return c.kind==='resistor';});
for (var i=0; i<R.length; i++) {
for (var j=i+1; j<R.length; j++) {
if (checkSeries(R[i], R[j]).ok) return false;
if (checkParallel(R[i], R[j]).ok) return false;
}
}
return true;
}
function checkComplete() {
if (isIrreducible()) {
var banner = document.getElementById('ctComp' + thisq);
banner.classList.add('ctshow' + thisq);
var R = S.circuit.components.filter(function(c){return c.kind==='resistor';});
var msg = 'No further series or parallel reductions are possible. This is a bridge circuit, which is irreducible by series/parallel \u2014 Kirchhoff\u2019s rules are required.';
banner.innerHTML = ''
+ '<div class="ctcompmsg' + thisq + '">\u2713 ' + msg + '</div>'
+ '<button type="button" class="ctbtn' + thisq + ' ctbtnnext' + thisq + '" id="ctBtnNext' + thisq + '">'
+ 'Continue to Stage 2 \u2192</button>';
var nextBtn = document.getElementById('ctBtnNext' + thisq);
if (nextBtn) {
nextBtn.addEventListener('click', function(){
var ev = new CustomEvent('ctStageComplete', { detail:{ stage:1, thisq:thisq } });
document.dispatchEvent(ev);
var hook = window['ctOnStageComplete_' + thisq];
if (typeof hook === 'function') hook(1);
announce('Advancing to Stage 2.');
});
}
announce(msg);
}
}
// Manual "I think this is irreducible" button — same effect as auto-detection but
// the student declares it. We'll show this if no reductions have been made for a while.
function declareIrreducible() {
if (!isIrreducible()) {
setFeedback('Actually, the circuit can still be simplified! Look more carefully \u2014 are there any series or parallel pairs?', 'bad');
announce('There are still possible reductions. Look again.');
return;
}
checkComplete();
}
/* =========================================================
 ACCESSIBILITY
========================================================= */
function applyA11y() {
var root = document.getElementById(rootElId).querySelector('.ctroot' + thisq);
if (!root) return;
root.classList.toggle('ctlm' + thisq, S.a11y.lm);
root.classList.toggle('cthc' + thisq, S.a11y.hc);
var fontSizes = ['14px','16px','19px'];
root.style.setProperty('--ctfs' + thisq, fontSizes[S.a11y.fs]);
setBtn('ctBtnLM', S.a11y.lm, 'LIGHT MODE');
setBtn('ctBtnNR', S.a11y.nr, 'NARRATION', true);
setBtn('ctBtnHC', S.a11y.hc, 'HIGH CONTRAST');
setBtn('ctBtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);
var nar = document.getElementById('ctNar' + thisq);
if (nar) nar.classList.toggle('ctnarshow' + thisq, S.a11y.nr);
}
function setBtn(idBase, on, label, withSuffix) {
var b = document.getElementById(idBase + thisq);
if (!b) return;
b.classList.toggle('cta11yon' + thisq, on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
b.textContent = withSuffix ? (label + ': ' + (on ? 'ON' : 'OFF')) : label;
}
function toggleA11y(key) {
if (key === 'fs') S.a11y.fs = (S.a11y.fs + 1) % 3;
else S.a11y[key] = !S.a11y[key];
applyA11y();
render();
}
/* =========================================================
 DOM
========================================================= */
function buildDOM() {
var root = document.getElementById(rootElId);
var html = ''
+ '<div class="ctroot' + thisq + '" role="region" aria-label="Bridge circuit simplification tutorial">'
+ '  <div class="cta11y' + thisq + '" role="toolbar" aria-label="Display options">'
+ '    <button type="button" class="cta11ybtn' + thisq + '" id="ctBtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
+ '    <button type="button" class="cta11ybtn' + thisq + ' cta11yon' + thisq + '" id="ctBtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
+ '    <button type="button" class="cta11ybtn' + thisq + '" id="ctBtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
+ '    <button type="button" class="cta11ybtn' + thisq + '" id="ctBtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
+ '  </div>'
+ '  <div id="ctNar' + thisq + '" class="ctnarbar' + thisq + ' ctnarshow' + thisq + '" role="status" aria-live="polite" aria-atomic="true"></div>'
+ '  <h3 class="cttitle' + thisq + '">Example 2 \u2014 Stage 1: Simplification (Bridge Circuit)</h3>'
+ '  <div class="ctsubtitle' + thisq + '">Try to simplify this bridge circuit. Some circuits can\u2019t be reduced by series or parallel combinations \u2014 see if this is one of them.</div>'
+ '  <div class="ctstagebar' + thisq + '" role="navigation" aria-label="Tutorial stages">'
+ '    <span class="ctpill' + thisq + ' ctpillactive' + thisq + '">1. Simplify</span>'
+ '    <span class="ctpill' + thisq + '">2. Branches \u0026 Loops</span>'
+ '    <span class="ctpill' + thisq + '">3. Currents</span>'
+ '    <span class="ctpill' + thisq + '">4. Polarities</span>'
+ '    <span class="ctpill' + thisq + '">5. Equations</span>'
+ '  </div>'
+ '  <div class="ctlayout' + thisq + '">'
+ '    <div class="ctcanvasWrap' + thisq + '">'
+ '      <div class="cthint' + thisq + '">Click two resistors and choose Series or Parallel. If you can\u2019t find any valid reductions, click \u201CDeclare Irreducible\u201D to confirm and move on.</div>'
+ '      <svg class="ctsvg' + thisq + '" id="ctSvg' + thisq + '" viewBox="0 0 540 340" role="img" aria-label="Bridge circuit"></svg>'
+ '      <div class="ctcomplete' + thisq + '" id="ctComp' + thisq + '" role="status"></div>'
+ '    </div>'
+ '    <aside class="ctside' + thisq + '" aria-label="Simplification controls">'
+ '      <div>'
+ '        <h2 class="ctsideh' + thisq + '">Selected</h2>'
+ '        <div class="ctselist' + thisq + '" id="ctSel' + thisq + '" aria-live="polite"></div>'
+ '      </div>'
+ '      <div>'
+ '        <h2 class="ctsideh' + thisq + '">Operation</h2>'
+ '        <div class="ctbtnrow' + thisq + '">'
+ '          <button type="button" class="ctbtn' + thisq + '" id="ctBtnSer' + thisq + '" disabled>Series</button>'
+ '          <button type="button" class="ctbtn' + thisq + '" id="ctBtnPar' + thisq + '" disabled>Parallel</button>'
+ '        </div>'
+ '      </div>'
+ '      <div>'
+ '        <h2 class="ctsideh' + thisq + '">Feedback</h2>'
+ '        <div class="ctfb' + thisq + '" id="ctFb' + thisq + '">Try to find any pair of resistors in series or parallel. If you can\u2019t, declare the circuit irreducible.</div>'
+ '      </div>'
+ '      <div class="ctbtnrow' + thisq + '">'
+ '        <button type="button" class="ctbtn' + thisq + ' ctbtndanger' + thisq + '" id="ctBtnClr' + thisq + '">Clear</button>'
+ '        <button type="button" class="ctbtn' + thisq + '" id="ctBtnRst' + thisq + '">Reset</button>'
+ '      </div>'
+ '      <div class="ctbtnrow' + thisq + '">'
+ '        <button type="button" class="ctbtn' + thisq + ' ctbtnlearn' + thisq + '" id="ctBtnIrr' + thisq + '">Declare Irreducible</button>'
+ '      </div>'
+ '      <div class="ctprogress' + thisq + '" id="ctProg' + thisq + '"></div>'
+ '    </aside>'
+ '  </div>'
+ '  <span class="ctsr' + thisq + '" id="ctLive' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
+ '</div>';
root.innerHTML = html;
document.getElementById('ctBtnSer' + thisq).addEventListener('click', trySeries);
document.getElementById('ctBtnPar' + thisq).addEventListener('click', tryParallel);
document.getElementById('ctBtnClr' + thisq).addEventListener('click', clearSelection);
document.getElementById('ctBtnRst' + thisq).addEventListener('click', resetCircuit);
document.getElementById('ctBtnIrr' + thisq).addEventListener('click', declareIrreducible);
document.getElementById('ctBtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
document.getElementById('ctBtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
document.getElementById('ctBtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
document.getElementById('ctBtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
}
function init() {
buildDOM();
applyA11y();
refreshUI();
announce('Stage 1 ready. This is a bridge circuit. Try to simplify it; if no reductions are possible, declare it irreducible.');
}
if (document.getElementById(rootElId)) init();
else document.addEventListener('DOMContentLoaded', init);
})();