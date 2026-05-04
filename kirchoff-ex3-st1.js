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
// Original Example 3 circuit: 11 resistors and 3 batteries.
// Junctions are A (top-mid-left), B (top-mid-right), C (bottom-right),
// D (bottom-mid), E (left-mid). Several degree-2 corner/internal nodes
// (F, J, K, X, G, H) are absorbed into branches.
components: [
// Top horizontal: R8, R5, R3
{ id:'R8',  kind:'resistor', value:2,   a:'F', b:'A', label:'R\u2088',
geom: { x1:90,  y1:30,  x2:290, y2:30 } },
{ id:'R5',  kind:'resistor', value:2,   a:'A', b:'B', label:'R\u2085',
geom: { x1:410, y1:30,  x2:550, y2:30 } },
{ id:'R3',  kind:'resistor', value:1,   a:'B', b:'J', label:'R\u2083',
geom: { x1:610, y1:30,  x2:770, y2:30 } },
// Right vertical: R1
{ id:'R1',  kind:'resistor', value:2,   a:'J', b:'K', label:'R\u2081',
geom: { x1:820, y1:90,  x2:820, y2:330 } },
// Bottom horizontal (right to left): R2, R6, R11
{ id:'R2',  kind:'resistor', value:3,   a:'C', b:'K', label:'R\u2082',
geom: { x1:650, y1:470, x2:790, y2:470 } },
{ id:'R6',  kind:'resistor', value:4,   a:'C', b:'D', label:'R\u2086',
geom: { x1:550, y1:470, x2:410, y2:470 } },
{ id:'R11', kind:'resistor', value:1,   a:'D', b:'X', label:'R\u2081\u2081',
geom: { x1:350, y1:470, x2:140, y2:470 } },
// Left vertical: R9
{ id:'R9',  kind:'resistor', value:3,   a:'E', b:'F', label:'R\u2089',
geom: { x1:60,  y1:150, x2:60,  y2:270 } },
// Diagonal: R10 from A down-left to E
{ id:'R10', kind:'resistor', value:7.5, a:'A', b:'E', label:'R\u2081\u2080',
geom: { x1:380, y1:30,  x2:60,  y2:300 } },
// Vertical stacks between A↔D and B↔C:
// A → R7 → G → E2 → D  (E2: + at D side, − at G side)
{ id:'R7',  kind:'resistor', value:2,   a:'A', b:'G', label:'R\u2087',
geom: { x1:380, y1:90,  x2:380, y2:190 } },
{ id:'E2',  kind:'battery',  value:6,   a:'D', b:'G', label:'E\u2082',
geom: { x1:380, y1:330, x2:380, y2:210 } },
// B → R4 → H → E1 → C  (E1: + at H side, − at C side)
{ id:'R4',  kind:'resistor', value:4,   a:'B', b:'H', label:'R\u2084',
geom: { x1:580, y1:90,  x2:580, y2:190 } },
{ id:'E1',  kind:'battery',  value:12,  a:'H', b:'C', label:'E\u2081',
geom: { x1:580, y1:210, x2:580, y2:330 } },
// E3: + at E (top), − at X (bottom)
{ id:'E3',  kind:'battery',  value:9,   a:'E', b:'X', label:'E\u2083',
geom: { x1:60,  y1:360, x2:60,  y2:440 } }
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
F: { x:60,  y:30  },   // top-left corner (degree 2)
A: { x:380, y:30  },   // top junction
B: { x:580, y:30  },   // top junction
J: { x:820, y:30  },   // top-right corner (degree 2)
K: { x:820, y:470 },   // bottom-right corner (degree 2)
C: { x:580, y:470 },   // bottom-right junction
D: { x:380, y:470 },   // bottom-mid junction
X: { x:60,  y:470 },   // bottom-left corner (degree 2)
E: { x:60,  y:300 },   // left-mid junction
G: { x:380, y:200 },   // R7-E2 internal node (degree 2)
H: { x:580, y:200 }    // R4-E1 internal node (degree 2)
};
}
function render() {
var svg = document.getElementById('ctSvg' + thisq);
if (!svg) return;
while (svg.firstChild) svg.removeChild(svg.firstChild);
var t = document.createElementNS('http://www.w3.org/2000/svg','title');
t.textContent = 'Original 11-resistor 3-battery circuit';
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
['A','B','C','D','E'].forEach(function(n){
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
// Top horizontal rail: F → R8 → A → R5 → B → R3 → J
svg.appendChild(svgEl('line', {x1:pos.F.x, y1:pos.F.y, x2:90,  y2:30,  'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:290, y1:30, x2:pos.A.x, y2:pos.A.y, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:pos.A.x, y1:pos.A.y, x2:410, y2:30, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:550, y1:30, x2:pos.B.x, y2:pos.B.y, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:pos.B.x, y1:pos.B.y, x2:610, y2:30, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:770, y1:30, x2:pos.J.x, y2:pos.J.y, 'class':'ctwire'}));
// Right vertical: J → R1 → K
svg.appendChild(svgEl('line', {x1:pos.J.x, y1:pos.J.y, x2:820, y2:90, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:820, y1:330, x2:pos.K.x, y2:pos.K.y, 'class':'ctwire'}));
// Bottom horizontal rail: K → R2 → C → R6 → D → R11 → X
svg.appendChild(svgEl('line', {x1:pos.K.x, y1:pos.K.y, x2:790, y2:470, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:650, y1:470, x2:pos.C.x, y2:pos.C.y, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:pos.C.x, y1:pos.C.y, x2:550, y2:470, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:410, y1:470, x2:pos.D.x, y2:pos.D.y, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:pos.D.x, y1:pos.D.y, x2:350, y2:470, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:140, y1:470, x2:pos.X.x, y2:pos.X.y, 'class':'ctwire'}));
// Left vertical: F → R9 → E → E3 → X
svg.appendChild(svgEl('line', {x1:pos.F.x, y1:pos.F.y, x2:60, y2:150, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:60, y1:270, x2:pos.E.x, y2:pos.E.y, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:pos.E.x, y1:pos.E.y, x2:60, y2:360, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:60, y1:440, x2:pos.X.x, y2:pos.X.y, 'class':'ctwire'}));
// R7-E2 stack (A-G-D)
svg.appendChild(svgEl('line', {x1:pos.A.x, y1:pos.A.y, x2:380, y2:90, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:380, y1:190, x2:pos.G.x, y2:pos.G.y, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:pos.G.x, y1:pos.G.y, x2:380, y2:210, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:380, y1:330, x2:pos.D.x, y2:pos.D.y, 'class':'ctwire'}));
// R4-E1 stack (B-H-C)
svg.appendChild(svgEl('line', {x1:pos.B.x, y1:pos.B.y, x2:580, y2:90, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:580, y1:190, x2:pos.H.x, y2:pos.H.y, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:pos.H.x, y1:pos.H.y, x2:580, y2:210, 'class':'ctwire'}));
svg.appendChild(svgEl('line', {x1:580, y1:330, x2:pos.C.x, y2:pos.C.y, 'class':'ctwire'}));
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
// Labels — positioned to the side of the body, perpendicular to its axis
// Choose offset direction perpendicular to the body line (rotate axis by 90 deg)
var px = -uy, py = ux; // perpendicular unit vector
var labOffsetMagnitude = 28;
// For arms going down-and-out from n1, push labels toward the outside.
// For our specific layout, choose offset that pushes labels away from center (270,175).
var cxRef = 440, cyRef = 250;
var dxFromCenter = mx - cxRef, dyFromCenter = my - cyRef;
// If dot product (px,py) . (dxFromCenter,dyFromCenter) is negative, flip.
var dot = px * dxFromCenter + py * dyFromCenter;
if (dot < 0) { px = -px; py = -py; }
var labX = mx + px * labOffsetMagnitude;
var labY = my + py * labOffsetMagnitude;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ctlabel'}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+12, 'class':'ctval'}, fmt(c.value) + ' \u03a9'));
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
svg.appendChild(svgEl('text', {x:labX, y:labY+12, 'class':'ctval'}, c.value + ' V'));
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
var oldV1 = c1.value, oldV2 = c2.value;
var newVal = (c1.value * c2.value) / (c1.value + c2.value);
var newLabel = c1.label + '\u2225' + c2.label;
c1.value = newVal;
c1.label = newLabel;
// For PARALLEL merges, the absorbed component is removed entirely (not a wire,
// because a wire would short the kept resistor). It just disappears visually.
c2.kind = 'absorbed';
var formula = '(' + S.lastClickLabels[0] + ' \u00d7 ' + S.lastClickLabels[1] + ') / ('
+ S.lastClickLabels[0] + ' + ' + S.lastClickLabels[1] + ') = ('
+ fmt(oldV1) + ' \u00d7 ' + fmt(oldV2) + ') / (' + fmt(oldV1) + ' + ' + fmt(oldV2)
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
/* Build the simplified circuit data structure that Stages 2-5 will consume.
 This represents the 5-branch / 3-junction reduction:
- Junctions: A (top), B (bottom-right), CD (bottom-left, merged C+D)
- Branch 1 (A↔CD): single resistor R_{891011} + battery E3
- Branch 2 (A↔B):  single resistor R_{56}
- Branch 3 (B↔CD): single resistor R_{312}
- Branch 4 (B↔CD): R4 + E1 (E1's + at B side)
- Branch 5 (A↔CD): R7 + E2 (E2's + at CD side)
 The new circuit uses fresh node names (n_A, n_B, n_CD) and fresh component
 IDs (e1, e3, R56, R312, R7, R4, e2 for batteries; resistors keep original
 names where possible).
 Layout uses the triangle:
A  (270, 50)
CD (130, 280)
B  (410, 280)
*/
function buildSimplifiedCircuit() {
// Find each merged-resistor's value by looking at the current circuit.
// R8 was merged with R9 then R10 then R11 → final value 4Ω, label "R8+R9‖R10+R11"
//   We just read it from the kept component (whichever R8/R10 was kept
//   throughout the merges).
function val(id) {
var c = getById(id);
return c ? c.value : null;
}
function lbl(id) {
var c = getById(id);
return c ? c.label : null;
}
// The "kept" component from merge 1 might be R8 or R9. Let's find which
// resistor in the current state has a nonzero value AND has a label that
// resulted from merging.
function findMerged(originalIds) {
// The merged component is whichever original-id is still kind=='resistor'.
for (var i = 0; i < originalIds.length; i++) {
var c = getById(originalIds[i]);
if (c && c.kind === 'resistor') return c;
}
return null;
}
var merged_891011 = findMerged(['R8','R9','R10','R11']);
var merged_312 = findMerged(['R3','R1','R2']);
var merged_56 = findMerged(['R5','R6']);
// Simplified circuit layout (triangle):
var pos = {
n_A:  { x:270, y:50  },
n_B:  { x:410, y:280 },
n_CD: { x:130, y:280 }
};
// Compute geom for branches with two components in series (the battery branches):
//   Br1: A → R_{891011} → midA → E3 → CD. Place R_{891011} on left arm of triangle.
//   Br4: B → R4 → midB → E1 → CD (across bottom)... no wait Br4 is B↔CD: R4+E1.
//   Br5: A → R7 → midR7 → E2 → CD on the right arm? No — Br5 is A↔CD with R7+E2.
//   And Br4 is B↔CD with R4+E1; that's parallel to Br3 (B↔CD with R_{312}).
// Let me redesign the layout more carefully:
// - Br1 (A↔CD via R_891011 + E3) uses the LEFT arm of triangle (A → CD)
//   - upper half: R_{891011}
//   - lower half: E3 (+ at A side)
// - Br2 (A↔B via R_56) uses the right arm
// - Br3 (B↔CD via R_312) uses the bottom edge
// - Br4 (B↔CD via R4+E1) needs a SECOND parallel path between B and CD
//   - draw it slightly below Br3 (curving below)
// - Br5 (A↔CD via R7+E2) needs a SECOND parallel path between A and CD
//   - draw it slightly inside the triangle
// For now, give simple straight-line geoms; Stage 2's renderer can handle.
return {
junctions: ['n_A', 'n_B', 'n_CD'],
components: [
// Br1: R_891011 + E3 (left vertical at x=140)
// We keep ID 'R8' since that's the kept-component throughout the merge chain.
{ id:'R8', kind:'resistor', value: val(merged_891011 ? merged_891011.id : 'R8'),
a:'n_A', b:'n_Br1m',
label: lbl(merged_891011 ? merged_891011.id : 'R8') || 'R\u2088\u208a\u2089\u2225\u2081\u2080\u208a\u2081\u2081',
geom: { x1:140, y1:90, x2:140, y2:200 } },
{ id:'E3', kind:'battery', value:9, a:'n_Br1m', b:'n_CD', label:'E\u2083',
geom: { x1:140, y1:230, x2:140, y2:330 } },
// Br5: R7 + E2 (middle vertical at x=300)
{ id:'R7', kind:'resistor', value:2, a:'n_A', b:'n_Br5m', label:'R\u2087',
geom: { x1:300, y1:90, x2:300, y2:200 } },
{ id:'E2', kind:'battery', value:6, a:'n_CD', b:'n_Br5m', label:'E\u2082',
geom: { x1:300, y1:330, x2:300, y2:230 } },
// Br2: R_56 (right vertical at x=520, A↔B)
{ id:'R5', kind:'resistor', value: val(merged_56 ? merged_56.id : 'R5'),
a:'n_A', b:'n_B',
label: lbl(merged_56 ? merged_56.id : 'R5') || 'R\u2085\u208a\u2086',
geom: { x1:520, y1:90, x2:520, y2:330 } },
// Br3: R_312 (bottom edge between CD and B)
{ id:'R3', kind:'resistor', value: val(merged_312 ? merged_312.id : 'R3'),
a:'n_B', b:'n_CD',
label: lbl(merged_312 ? merged_312.id : 'R3') || 'R\u2083\u208a\u2081\u208a\u2082',
geom: { x1:480, y1:360, x2:120, y2:360 } },
// Br4: R4 + E1 (lower arch below the bottom rail)
{ id:'R4', kind:'resistor', value:4, a:'n_B', b:'n_Br4m', label:'R\u2084',
geom: { x1:480, y1:430, x2:340, y2:430 } },
{ id:'E1', kind:'battery', value:12, a:'n_Br4m', b:'n_CD', label:'E\u2081',
geom: { x1:300, y1:430, x2:120, y2:430 } }
]
};
}
function checkComplete() {
if (isIrreducible()) {
var banner = document.getElementById('ctComp' + thisq);
banner.classList.add('ctshow');
var nMerges = S.mergesPerformed || 0;
var msg = 'All series and parallel reductions are done (' + nMerges + ' merges). The simplified circuit has 5 branches and 3 supplies between 3 junctions \u2014 ready for Kirchhoff\u2019s rules.';
banner.innerHTML = ''
+ '<div class="ctcompmsg' + '">\u2713 ' + msg + '</div>'
+ '<button type="button" class="ctbtn' + ' ctbtnnext' + '" id="ctBtnNext' + thisq + '">'
+ 'Continue to Stage 2 \u2192</button>';
var nextBtn = document.getElementById('ctBtnNext' + thisq);
if (nextBtn) {
nextBtn.addEventListener('click', function(){
var simplified = buildSimplifiedCircuit();
var ev = new CustomEvent('ctStageComplete', {
detail:{ stage:1, thisq:thisq, simplifiedCircuit: simplified }
});
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
+ '  <h3 class="cttitle' + '">Example 3 \u2014 Stage 1: Simplification (11 Resistors)</h3>'
+ '  <div class="ctsubtitle' + '">This circuit has 11 resistors and 3 batteries. Apply 5 simplification steps before moving on. Some series pairs may not look adjacent in the drawing!</div>'
+ '  <div class="ctstagebar' + '" role="navigation" aria-label="Tutorial stages">'
+ '    <span class="ctpill' + ' ctpillactive' + '">1. Simplify</span>'
+ '    <span class="ctpill' + '">2. Branches \u0026 Loops</span>'
+ '    <span class="ctpill' + '">3. Currents</span>'
+ '    <span class="ctpill' + '">4. Polarities</span>'
+ '    <span class="ctpill' + '">5. Equations</span>'
+ '  </div>'
+ '  <div class="ctlayout' + '">'
+ '    <div class="ctcanvasWrap' + thisq + '">'
+ '      <div class="cthint' + '">Click two resistors and choose Series or Parallel. If you can\u2019t find any valid reductions, click \u201CDeclare Irreducible\u201D to confirm and move on.</div>'
+ '      <svg class="ctsvg' + '" id="ctSvg' + thisq + '" viewBox="0 0 880 510" role="img" aria-label="Original 11-resistor 3-battery circuit"></svg>'
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
+ '        <div class="ctfb' + '" id="ctFb' + thisq + '">Try to find any pair of resistors in series or parallel. If you can\u2019t, declare the circuit irreducible.</div>'
+ '      </div>'
+ '      <div class="ctbtnrow' + '">'
+ '        <button type="button" class="ctbtn' + ' ctbtndanger' + '" id="ctBtnClr' + thisq + '">Clear</button>'
+ '        <button type="button" class="ctbtn' + '" id="ctBtnRst' + thisq + '">Reset</button>'
+ '      </div>'
+ '      <div class="ctbtnrow' + '">'
+ '        <button type="button" class="ctbtn' + ' ctbtnlearn' + '" id="ctBtnIrr' + thisq + '">Declare Irreducible</button>'
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
