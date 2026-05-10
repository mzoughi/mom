(function(){
'use strict';
var thisq = window.ctThisq;
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
// Resistor network: 7 nodes, 10 resistors, 1 battery (10V).
// Nodes: N1 (top-left, batt+), N2 (top, between R10 & R8),
//        N3 (central top junction), N4 (top-right, between R2 & R3),
//        N5 (bottom-right), N6 (bottom-mid, under R5),
//        N7 (bottom, under R9; battery − rail).
components: [
// === Top wire: N1 — R10 — N2 — R8 — N3 — R2 — N4 ===
{ id:'R10', kind:'resistor', value:2, a:'N1', b:'N2', label:'R\u2081\u2080',
geom: { x1:90,  y1:30,  x2:270, y2:30 } },
{ id:'R8',  kind:'resistor', value:2, a:'N2', b:'N3', label:'R\u2088',
geom: { x1:330, y1:30,  x2:510, y2:30 } },
{ id:'R2',  kind:'resistor', value:1, a:'N3', b:'N4', label:'R\u2082',
geom: { x1:570, y1:30,  x2:790, y2:30 } },
// === Right vertical: N4 — R3 — N5 ===
{ id:'R3',  kind:'resistor', value:3, a:'N4', b:'N5', label:'R\u2083',
geom: { x1:820, y1:60,  x2:820, y2:440 } },
// === Bottom wire: N5 — R1 — N6 — R6 — N7 ===
{ id:'R1',  kind:'resistor', value:4, a:'N6', b:'N5', label:'R\u2081',
geom: { x1:570, y1:470, x2:790, y2:470 } },
{ id:'R6',  kind:'resistor', value:1, a:'N7', b:'N6', label:'R\u2086',
geom: { x1:330, y1:470, x2:510, y2:470 } },
// === Internal verticals ===
// R9: from N2 (top) down to N7 (bottom)
{ id:'R9',  kind:'resistor', value:4, a:'N2', b:'N7', label:'R\u2089',
geom: { x1:300, y1:60,  x2:300, y2:440 } },
// R5: from N3 (top) down to N6 (bottom)
{ id:'R5',  kind:'resistor', value:6, a:'N3', b:'N6', label:'R\u2085',
geom: { x1:540, y1:60,  x2:540, y2:440 } },
// === Diagonals ===
// R7: slopes from near N3 (top) down-and-left to N7 (bottom)
{ id:'R7',  kind:'resistor', value:4, a:'N3', b:'N7', label:'R\u2087',
geom: { x1:510, y1:60,  x2:330, y2:440 } },
// R4: slopes from near N3 (top) down-and-right to N5 (bottom-right)
{ id:'R4',  kind:'resistor', value:4, a:'N3', b:'N5', label:'R\u2084',
geom: { x1:570, y1:60,  x2:790, y2:440 } },
// === Battery: vertical on the left, between N1 and N7 ===
{ id:'E',   kind:'battery',  value:10, a:'N1', b:'N7', label:'E',
geom: { x1:60,  y1:140, x2:60,  y2:360 } }
]
};
}
if (!S.circuit) S.circuit = makeInitialCircuit();
if (!S.selected) S.selected = [];
/* =========================================================
 TOPOLOGY HELPERS (same as Example 1)
========================================================= */
function nodeDegree(node) {
var canon = buildNodeCanon();
var target = canon(node);
var d = 0;
S.circuit.components.forEach(function(c){
if (c.kind === 'wire' || c.kind === 'absorbed') return;
if (canon(c.a) === target) d++;
if (canon(c.b) === target) d++;
});
return d;
}
function getById(id) {
for (var i=0; i<S.circuit.components.length; i++) {
if (S.circuit.components[i].id === id) return S.circuit.components[i];
}
return null;
}
/* ========================================================================
 SERIES/PARALLEL DETECTION — uses the loop-matroid definition:
- Two components are in series iff every simple cycle containing one
 also contains the other (and there exists at least one such cycle).
- Two components are in parallel iff there is a simple cycle of size 2
 consisting of exactly those two components.
 Implementation: enumerate simple cycles in the multigraph defined by the
 current components. For each pair the user picks, scan the cycle list.
 Algorithm:
1. Build adjacency list from S.circuit.components.
2. Enumerate cycles using DFS. We treat each component as an edge.
To find all simple cycles (up to direction): for each edge (u,v,id),
temporarily delete it, find all simple paths from v back to u, then
re-add the edge — each such path plus the edge is a cycle.
3. Deduplicate by canonicalizing (sorted set of edge ids).
======================================================================== */
/* Build a node-canonicalization map for wires: any wire connects its two
 endpoints into a single equivalence class. This is needed because after a
 merge, the "absorbed" component becomes a wire and its two endpoints
 should be treated as the same node for series/parallel detection. */
function buildNodeCanon() {
var parent = {};
function find(x) {
if (parent[x] === undefined) parent[x] = x;
while (parent[x] !== x) { parent[x] = parent[parent[x]] || x; x = parent[x]; }
return x;
}
function union(x, y) {
var rx = find(x), ry = find(y);
if (rx !== ry) parent[rx] = ry;
}
S.circuit.components.forEach(function(c){
if (c.kind === 'absorbed') return;
find(c.a); find(c.b);
});
S.circuit.components.forEach(function(c){
if (c.kind === 'wire') union(c.a, c.b);
});
return find;
}
function buildAdjacency() {
var canon = buildNodeCanon();
var adj = {};
S.circuit.components.forEach(function(c){
if (c.kind === 'wire' || c.kind === 'absorbed') return;
var a = canon(c.a), b = canon(c.b);
if (a === b) return; // self-loop after contraction
if (!adj[a]) adj[a] = [];
if (!adj[b]) adj[b] = [];
adj[a].push({ to:b, edgeId:c.id });
adj[b].push({ to:a, edgeId:c.id });
});
return adj;
}
function enumerateSimpleCycles() {
var adj = buildAdjacency();
var canon = buildNodeCanon();
var cycles = [];
var seen = {};
var components = S.circuit.components.filter(function(c){
return c.kind !== 'wire' && c.kind !== 'absorbed';
});
components.forEach(function(startEdge){
var u = canon(startEdge.a), v = canon(startEdge.b), eid = startEdge.id;
if (u === v) return; // shouldn't happen since adjacency skips them
var paths = [];
var visitedNodes = {};
visitedNodes[v] = true;
function dfs(currentNode, edgesUsed, nodesUsed) {
var neighbors = adj[currentNode] || [];
for (var i = 0; i < neighbors.length; i++) {
var n = neighbors[i];
if (n.edgeId === eid) continue;
if (edgesUsed.indexOf(n.edgeId) >= 0) continue;
if (n.to === u && currentNode !== u) {
paths.push(edgesUsed.concat([n.edgeId]));
continue;
}
if (nodesUsed[n.to]) continue;
nodesUsed[n.to] = true;
dfs(n.to, edgesUsed.concat([n.edgeId]), nodesUsed);
delete nodesUsed[n.to];
}
}
dfs(v, [], visitedNodes);
paths.forEach(function(p){
var cycleEdges = p.concat([eid]);
var sortedKey = cycleEdges.slice().sort().join(',');
if (!seen[sortedKey]) {
seen[sortedKey] = true;
var s = {};
cycleEdges.forEach(function(e){ s[e] = true; });
cycles.push(s);
}
});
});
return cycles;
}
/* Two components are in series iff every cycle containing one contains the other.
 We scan the enumerated cycle list. */
function checkSeries(c1, c2) {
if (c1.kind !== 'resistor' || c2.kind !== 'resistor') {
return { ok:false, reason:'Only two resistors can be combined. Batteries cannot be merged.' };
}
if (c1.id === c2.id) return { ok:false, reason:'Choose two different resistors.' };
var cycles = enumerateSimpleCycles();
var anyContainingEither = false;
for (var i = 0; i < cycles.length; i++) {
var hasC1 = !!cycles[i][c1.id];
var hasC2 = !!cycles[i][c2.id];
if (hasC1 || hasC2) anyContainingEither = true;
if (hasC1 !== hasC2) {
// Found a cycle containing one but not the other
return { ok:false, reason:'There is a loop through one of these resistors that does not pass through the other. They are not in series.' };
}
}
if (!anyContainingEither) {
return { ok:false, reason:'These resistors don\u2019t share any loop.' };
}
return { ok:true };
}
/* Two components are in parallel iff there's a simple cycle consisting of
 exactly those two components. */
function checkParallel(c1, c2) {
if (c1.kind !== 'resistor' || c2.kind !== 'resistor') {
return { ok:false, reason:'Only two resistors can be combined. Batteries cannot be merged.' };
}
if (c1.id === c2.id) return { ok:false, reason:'Choose two different resistors.' };
var cycles = enumerateSimpleCycles();
for (var i = 0; i < cycles.length; i++) {
var keys = Object.keys(cycles[i]);
if (keys.length === 2 && cycles[i][c1.id] && cycles[i][c2.id]) {
return { ok:true };
}
}
return { ok:false, reason:'There is no loop containing only these two components, so they are not in parallel.' };
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
// Node positions in the SVG (used for drawing wires and junction dots)
function nodePos() {
return {
N1: { x:60,  y:30  },   // top-left, battery +
N2: { x:300, y:30  },   // between R10 and R8 (top of R9)
N3: { x:540, y:30  },   // central top junction (R8, R7, R5, R4, R2)
N4: { x:820, y:30  },   // top-right corner (top of R3)
N5: { x:820, y:470 },   // bottom-right corner (bottom of R3, right of R1, bottom of R4)
N6: { x:540, y:470 },   // bottom-mid (bottom of R5, left of R1, right of R6)
N7: { x:300, y:470 },   // bottom-left junction (bottom of R9, R7, left of R6, battery -)
N8: { x:60,  y:470 }    // bottom-left corner (battery -)
};
}
function render() {
var svg = document.getElementById('ctSvg' + thisq);
if (!svg) return;
while (svg.firstChild) svg.removeChild(svg.firstChild);
var t = document.createElementNS('http://www.w3.org/2000/svg','title');
t.textContent = 'Resistor network: 10 resistors, 1 battery';
var d = document.createElementNS('http://www.w3.org/2000/svg','desc');
d.textContent = describeCircuit();
svg.appendChild(t); svg.appendChild(d);
// Draw connecting wires between component endpoints (the "skeleton" of the circuit).
drawSkeletonWires(svg);
// Draw each component
S.circuit.components.forEach(function(c){
drawComponent(svg, c);
});
// Junction dots (only at degree-3+ junctions in the current state)
var pos = nodePos();
['N1','N2','N3','N4','N5','N6','N7','N8'].forEach(function(n){
if (pos[n] && nodeDegree(n) >= 3) {
svg.appendChild(svgEl('circle', { cx:pos[n].x, cy:pos[n].y, r:3.5, 'class':'ctnode' }));
}
});
}
/* Draw the wire segments that connect adjacent component terminals.
 Each component's geom gives x1/y1 and x2/y2; the renderer draws short leads from
 the actual node position to the body endpoint of each component, then the body itself. */
function drawSkeletonWires(svg) {
var pos = nodePos();
var w = function(x1,y1,x2,y2){
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:x2, y2:y2, 'class':'ctwire'}));
};
// === Top horizontal rail: N1 → R10 → N2 → R8 → N3 → R2 → N4 ===
w(pos.N1.x, pos.N1.y, 90, 30);     // N1 to R10 left
w(270, 30, pos.N2.x, pos.N2.y);    // R10 right to N2
w(pos.N2.x, pos.N2.y, 330, 30);    // N2 to R8 left
w(510, 30, pos.N3.x, pos.N3.y);    // R8 right to N3
w(pos.N3.x, pos.N3.y, 570, 30);    // N3 to R2 left
w(790, 30, pos.N4.x, pos.N4.y);    // R2 right to N4
// === Right vertical: N4 → R3 → N5 ===
w(pos.N4.x, pos.N4.y, 820, 60);    // N4 to R3 top
w(820, 440, pos.N5.x, pos.N5.y);   // R3 bottom to N5
// === Bottom horizontal rail: N5 → R1 → N6 → R6 → N7 → N8 ===
w(pos.N5.x, pos.N5.y, 790, 470);   // N5 to R1 right
w(570, 470, pos.N6.x, pos.N6.y);   // R1 left to N6
w(pos.N6.x, pos.N6.y, 510, 470);   // N6 to R6 right
w(330, 470, pos.N7.x, pos.N7.y);   // R6 left to N7
w(pos.N7.x, pos.N7.y, pos.N8.x, pos.N8.y); // N7 to N8 (battery − rail)
// === Left vertical: N1 → battery → N8 ===
w(pos.N1.x, pos.N1.y, 60, 140);    // N1 to battery top
w(60, 360, pos.N8.x, pos.N8.y);    // battery bottom to N8
// === Internal verticals ===
// R9: from N2 down to N7
w(pos.N2.x, pos.N2.y, 300, 60);    // N2 to R9 top
w(300, 440, pos.N7.x, pos.N7.y);   // R9 bottom to N7
// R5: from N3 down to N6
w(pos.N3.x, pos.N3.y, 540, 60);    // N3 to R5 top
w(540, 440, pos.N6.x, pos.N6.y);   // R5 bottom to N6
// === Diagonals ===
// R7: from N3 (top) down-and-left to N7 (bottom)
w(pos.N3.x, pos.N3.y, 510, 60);    // N3 to R7 top (short lead)
w(330, 440, pos.N7.x, pos.N7.y);   // R7 bottom to N7
// R4: from N3 (top) down-and-right to N5 (bottom-right)
w(pos.N3.x, pos.N3.y, 570, 60);    // N3 to R4 top (short lead)
w(790, 440, pos.N5.x, pos.N5.y);   // R4 bottom to N5
}
function drawComponent(svg, c) {
if (c.kind === 'absorbed') return; // merged via parallel; just disappears
if (c.kind === 'wire') {
// Component was merged via series; draw a straight line at its old position.
svg.appendChild(svgEl('line', {
x1: c.geom.x1, y1: c.geom.y1, x2: c.geom.x2, y2: c.geom.y2,
'class':'ctwire'
}));
return;
}
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
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:bodyLeftX, y2:bodyLeftY, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:bodyRightX, y1:bodyRightY, x2:x2, y2:y2, 'class':'ctwire'}));
var sel = S.selected.indexOf(c.id) >= 0;
var rect = svgEl('rect', {
x:bodyX, y:bodyY, width:bodyLen, height:bodyW, rx:3, ry:3,
transform: transform,
'class': 'ctcomp' + (sel ? ' ctcompsel' : ''),
'data-id': c.id, tabindex:0, role:'button',
'aria-label': describeComponent(c) + (sel ? ', selected' : ''),
'aria-pressed': sel ? 'true' : 'false'
});
attachHandlers(rect, c);
svg.appendChild(rect);
// Labels — positioned to the side of the body, perpendicular to its axis.
// Horizontal resistors (|dy| < |dx|): label goes BELOW the body (or ABOVE if
// the body is in the lower half of the canvas, to keep the label on-screen).
// Vertical/oblique resistors: label goes to the side, away from layout center.
var px = -uy, py = ux; // perpendicular unit vector
var labOffsetMagnitude = 28;
var isHorizontal = Math.abs(dy) < Math.abs(dx) * 0.3; // mostly horizontal
if (isHorizontal) {
// Horizontal: label below, unless near the bottom (y > 440) where label must go up
if (my > 440) { px = 0; py = -1; }
else { px = 0; py = 1; }
} else {
// Interior — push away from layout center
var cxRef = 440, cyRef = 250;
var dxFromCenter = mx - cxRef, dyFromCenter = my - cyRef;
var dot = px * dxFromCenter + py * dyFromCenter;
if (dot < 0) { px = -px; py = -py; }
}
var labX = mx + px * labOffsetMagnitude;
var labY = my + py * labOffsetMagnitude;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ctlabel'}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+18, 'class':'ctval'}, fmt(c.value) + ' \u03a9'));
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
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:longCx, y2:longCy, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:lp1x, y1:lp1y, x2:lp2x, y2:lp2y, 'class':'ctwire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:sp1x, y1:sp1y, x2:sp2x, y2:sp2y, 'class':'ctwire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:shortCx, y1:shortCy, x2:x2, y2:y2, 'class':'ctwire'}));
// Label, offset perpendicular toward outside
var labOff = 22;
var dxFromCenter = mx - 440, dyFromCenter = my - 250;
var dot = px * dxFromCenter + py * dyFromCenter;
var pxL = px, pyL = py;
if (dot < 0) { pxL = -px; pyL = -py; }
var labX = mx + pxL*labOff, labY = my + pyL*labOff;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ctlabel'}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+18, 'class':'ctval'}, c.value + ' V'));
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
svg.appendChild(svgEl('line', {x1:cx-30, y1:cy, x2:shortX, y2:cy, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:shortX, y1:cy-shortLen/2, x2:shortX, y2:cy+shortLen/2, 'class':'ctwire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX,  y1:cy-longLen/2,  x2:longX,  y2:cy+longLen/2,  'class':'ctwire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX, y1:cy, x2:cx+30, y2:cy, 'class':'ctwire'}));
// Label below
svg.appendChild(svgEl('text', {x:cx, y:cy-longLen/2-6, 'class':'ctlabel'}, c.label));
svg.appendChild(svgEl('text', {x:cx, y:cy+longLen/2+14, 'class':'ctval'}, c.value + ' V'));
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
if (c.kind === 'wire') {
// Wires are merge artifacts; not selectable.
announce('That position is now a wire (already merged). Pick a different resistor.');
setFeedback('That spot is now a wire from a previous merge.', 'info');
return;
}
if (!S.lastClickLabels) S.lastClickLabels = [];
var idx = S.selected.indexOf(id);
if (idx >= 0) {
S.selected.splice(idx, 1);
S.lastClickLabels.splice(idx, 1);
}
else {
if (S.selected.length >= 2) {
S.selected.shift();
S.lastClickLabels.shift();
}
S.selected.push(id);
S.lastClickLabels.push(c.label);
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
div.innerHTML = '<span class="ctempty' + '">Click two resistors\u2026</span>';
return;
}
div.innerHTML = S.selected.map(function(id){
var c = getById(id);
return '<div class="ctseitem' + '">' + c.label + ' = ' + fmt(c.value) + ' \u03a9</div>';
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
fb.className = 'ctfb' + (tone === 'good' ? ' ctfbgood' : tone === 'bad' ? ' ctfbbad' : tone === 'info' ? ' ctfbinfo' : '');
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
// Apply the series merge: keep c1, replace c2 with a wire.
// The merged component has value c1.value + c2.value and a new label that
// shows the addition (e.g., "R8+R9").
var newVal = c1.value + c2.value;
var newLabel = c1.label + '+' + c2.label;
// Strip "+R..." chains for readability if needed; for now just concatenate.
c1.value = newVal;
c1.label = newLabel;
// Replace c2 with a wire: in our model, change kind to 'wire' (no longer
// selectable, drawn as a straight line at its old position).
c2.kind = 'wire';
// Wires keep their geom for drawing the line, but lose interactivity.
setFeedback('<strong>Correct \u2014 these are in series.</strong>'
+ '<div class="ctformula' + '">'
+ 'R = ' + S.lastClickLabels[0] + ' + ' + S.lastClickLabels[1]
+ ' = ' + fmt(c1.value - c2.value) + ' + ' + fmt(c2.value)
+ ' = ' + fmt(newVal) + ' \u03a9 \u2192 labeled ' + newLabel
+ '</div>', 'good');
announce('Series merge: ' + S.lastClickLabels[0] + ' + ' + S.lastClickLabels[1]
+ ' = ' + fmt(newVal) + ' ohms.');
S.selected = [];
S.lastClickLabels = [];
S.mergesPerformed = (S.mergesPerformed || 0) + 1;
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
// Decide which component to KEEP (and which to absorb).
// Default: keep c1 (the first-clicked).
// Exception: if one is oblique (neither horizontal nor vertical) and the other
// is axis-aligned, ALWAYS keep the axis-aligned one. This prevents the merged
// resistor from being drawn diagonally, which is visually awkward.
function isOblique(c) {
var ddx = Math.abs(c.geom.x2 - c.geom.x1);
var ddy = Math.abs(c.geom.y2 - c.geom.y1);
// Axis-aligned if dy << dx (horizontal) or dx << dy (vertical). Oblique otherwise.
var minAxis = Math.min(ddx, ddy);
var maxAxis = Math.max(ddx, ddy);
return minAxis > maxAxis * 0.2; // tilted by more than ~11° from axis
}
var kept = c1, absorbed = c2;
var keptLabel = S.lastClickLabels[0], absorbedLabel = S.lastClickLabels[1];
if (isOblique(c1) && !isOblique(c2)) {
kept = c2; absorbed = c1;
keptLabel = S.lastClickLabels[1]; absorbedLabel = S.lastClickLabels[0];
}
var oldVKept = kept.value, oldVAbsorbed = absorbed.value;
var newVal = (kept.value * absorbed.value) / (kept.value + absorbed.value);
var newLabel = kept.label + '\u2225' + absorbed.label;
kept.value = newVal;
kept.label = newLabel;
// Absorbed component: just disappears (parallel merge — wire would short the kept).
absorbed.kind = 'absorbed';
var formula = '(' + keptLabel + ' \u00d7 ' + absorbedLabel + ') / ('
+ keptLabel + ' + ' + absorbedLabel + ') = ('
+ fmt(oldVKept) + ' \u00d7 ' + fmt(oldVAbsorbed) + ') / ('
+ fmt(oldVKept) + ' + ' + fmt(oldVAbsorbed)
+ ') = ' + fmt(newVal) + ' \u03a9 \u2192 labeled ' + newLabel;
setFeedback('<strong>Correct \u2014 these are in parallel.</strong>'
+ '<div class="ctformula' + '">R = ' + formula + '</div>', 'good');
announce('Parallel merge: ' + fmt(newVal) + ' ohms.');
S.selected = [];
S.lastClickLabels = [];
S.mergesPerformed = (S.mergesPerformed || 0) + 1;
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
document.getElementById('ctComp' + thisq).classList.remove('ctshow');
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
/* This project doesn't need a complex simplifiedCircuit handoff between stages.
 Each stage uses its own circuit definition (Stage 2 has R4 as wire from start;
 Stage 3 has R1 absorbed from start). When Stage 1 finishes, it just dispatches
 the final R_eq, I, and P values via ctStageComplete for downstream display. */
function checkComplete() {
if (!isIrreducible()) return;
// Find the single remaining resistor (or determine R_eq from what's left)
var resistors = S.circuit.components.filter(function(c){return c.kind==='resistor';});
var batteries = S.circuit.components.filter(function(c){return c.kind==='battery';});
if (resistors.length !== 1) {
// Can't be reduced further but multiple resistors remain — irreducible bridge etc.
// This shouldn't happen for our project but handle gracefully.
var banner0 = document.getElementById('ctComp' + thisq);
banner0.classList.add('ctshow');
banner0.innerHTML = ''
+ '<div class="ctcompmsg' + '">No more series or parallel reductions possible, but '
+ resistors.length + ' resistors remain. This network cannot be simplified by series/parallel alone.</div>';
return;
}
var Req = resistors[0].value;
var V = (batteries.length > 0) ? batteries[0].value : 10;
var I = V / Req;
var P = V * I;
var banner = document.getElementById('ctComp' + thisq);
banner.classList.add('ctshow');
var nMerges = S.mergesPerformed || 0;
banner.innerHTML = ''
+ '<div class="ctcompmsg' + '">'
+ '\u2713 Network reduced to a single resistor in ' + nMerges + ' merge'
+ (nMerges === 1 ? '' : 's') + '.'
+ '</div>'
+ '<div class="ctresults' + '">'
+ '<div class="ctresultline' + '">'
+ '<span class="ctresultlabel' + '">R<sub>eq</sub></span>'
+ '<span class="ctresultval' + '">' + fmt(Req) + ' \u03a9</span>'
+ '</div>'
+ '<div class="ctresultline' + '">'
+ '<span class="ctresultlabel' + '">I</span>'
+ '<span class="ctresultval' + '">= V / R<sub>eq</sub> = ' + fmt(V) + ' / ' + fmt(Req)
+ ' = ' + fmt(I) + ' A</span>'
+ '</div>'
+ '<div class="ctresultline' + '">'
+ '<span class="ctresultlabel' + '">P</span>'
+ '<span class="ctresultval' + '">= V \u00b7 I = ' + fmt(V) + ' \u00b7 ' + fmt(I)
+ ' = ' + fmt(P) + ' W</span>'
+ '</div>'
+ '</div>'
+ '<button type="button" class="ctbtn' + ' ctbtnnext' + '" id="ctBtnNext' + thisq + '">'
+ 'Continue to Stage 2 \u2192</button>';
var nextBtn = document.getElementById('ctBtnNext' + thisq);
if (nextBtn) {
nextBtn.addEventListener('click', function(){
var ev = new CustomEvent('ctStageComplete', {
detail:{ stage:1, thisq:thisq, Req:Req, I:I, P:P, V:V }
});
document.dispatchEvent(ev);
var hook = window['ctOnStageComplete_' + thisq];
if (typeof hook === 'function') hook(1);
announce('Advancing to Stage 2.');
});
}
announce('Network reduced. R equivalent equals ' + fmt(Req) + ' ohms. Current is ' + fmt(I) + ' amperes. Power is ' + fmt(P) + ' watts.');
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
var root = document.getElementById(rootElId).querySelector('.ctroot');
if (!root) return;
root.classList.toggle('ctlm', S.a11y.lm);
root.classList.toggle('cthc', S.a11y.hc);
var fontSizes = ['14px','16px','19px'];
root.style.setProperty('--ctfs', fontSizes[S.a11y.fs]);
setBtn('ctBtnLM', S.a11y.lm, 'LIGHT MODE');
setBtn('ctBtnNR', S.a11y.nr, 'NARRATION', true);
setBtn('ctBtnHC', S.a11y.hc, 'HIGH CONTRAST');
setBtn('ctBtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);
var nar = document.getElementById('ctNar' + thisq);
if (nar) nar.classList.toggle('ctnarshow', S.a11y.nr);
}
function setBtn(idBase, on, label, withSuffix) {
var b = document.getElementById(idBase + thisq);
if (!b) return;
b.classList.toggle('cta11yon', on);
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
+ '<div class="ctroot' + '" role="region" aria-label="Bridge circuit simplification tutorial">'
+ '  <div class="cta11y' + '" role="toolbar" aria-label="Display options">'
+ '    <button type="button" class="cta11ybtn' + '" id="ctBtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
+ '    <button type="button" class="cta11ybtn' + ' cta11yon' + '" id="ctBtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
+ '    <button type="button" class="cta11ybtn' + '" id="ctBtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
+ '    <button type="button" class="cta11ybtn' + '" id="ctBtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
+ '  </div>'
+ '  <div id="ctNar' + thisq + '" class="ctnarbar' + ' ctnarshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
+ '  <h3 class="cttitle' + '">Equivalent Resistance \u2014 Stage 1: Full Network</h3>'
+ '  <div class="ctsubtitle' + '">This network has 10 resistors and a 10\u00a0V battery. Use series and parallel reductions to simplify it down to a single equivalent resistor, then read off R\u208c\u2098.</div>'
+ '  <div class="ctstagebar' + '" role="navigation" aria-label="Tutorial stages">'
+ '    <span class="ctpill' + ' ctpillactive' + '">1. Full Network</span>'
+ '    <span class="ctpill' + '">2. R\u2084 Shorted</span>'
+ '    <span class="ctpill' + '">3. R\u2081 Open (Capacitor)</span>'
+ '  </div>'
+ '  <div class="ctlayout' + '">'
+ '    <div class="ctcanvasWrap' + thisq + '">'
+ '      <div class="cthint' + '">Click two resistors and choose Series or Parallel. Repeat until only one resistor remains \u2014 that\u2019s R<sub>eq</sub>.</div>'
+ '      <svg class="ctsvg' + '" id="ctSvg' + thisq + '" viewBox="0 0 880 510" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Resistor network with 10 resistors and 1 battery"></svg>'
+ '      <div class="ctcomplete' + '" id="ctComp' + thisq + '" role="status"></div>'
+ '    </div>'
+ '    <aside class="ctside' + '" aria-label="Simplification controls">'
+ '      <div>'
+ '        <h2 class="ctsideh' + '">Selected</h2>'
+ '        <div class="ctselist' + '" id="ctSel' + thisq + '" aria-live="polite"></div>'
+ '      </div>'
+ '      <div>'
+ '        <h2 class="ctsideh' + '">Operation</h2>'
+ '        <div class="ctbtnrow' + '">'
+ '          <button type="button" class="ctbtn' + '" id="ctBtnSer' + thisq + '" disabled>Series</button>'
+ '          <button type="button" class="ctbtn' + '" id="ctBtnPar' + thisq + '" disabled>Parallel</button>'
+ '        </div>'
+ '      </div>'
+ '      <div>'
+ '        <h2 class="ctsideh' + '">Feedback</h2>'
+ '        <div class="ctfb' + '" id="ctFb' + thisq + '">Find pairs of resistors in series or parallel and merge them. Keep going until only one resistor remains \u2014 that\u2019s the equivalent resistance.</div>'
+ '      </div>'
+ '      <div class="ctbtnrow' + '">'
+ '        <button type="button" class="ctbtn' + ' ctbtndanger' + '" id="ctBtnClr' + thisq + '">Clear</button>'
+ '        <button type="button" class="ctbtn' + '" id="ctBtnRst' + thisq + '">Reset</button>'
+ '      </div>'
+ '      <div class="ctprogress' + '" id="ctProg' + thisq + '"></div>'
+ '    </aside>'
+ '  </div>'
+ '  <span class="ctsr' + '" id="ctLive' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
+ '</div>';
root.innerHTML = html;
document.getElementById('ctBtnSer' + thisq).addEventListener('click', trySeries);
document.getElementById('ctBtnPar' + thisq).addEventListener('click', tryParallel);
document.getElementById('ctBtnClr' + thisq).addEventListener('click', clearSelection);
document.getElementById('ctBtnRst' + thisq).addEventListener('click', resetCircuit);
document.getElementById('ctBtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
document.getElementById('ctBtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
document.getElementById('ctBtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
document.getElementById('ctBtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
}
function init() {
buildDOM();
applyA11y();
refreshUI();
announce('Stage 1 ready. This is a 10-resistor network with a 10 volt battery. Find series and parallel pairs to simplify it down to a single equivalent resistor.');
}
if (document.getElementById(rootElId)) init();
else document.addEventListener('DOMContentLoaded', init);
})();
