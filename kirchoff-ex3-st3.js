(function(){
'use strict';
var thisq = window.ctThisq;
var rootElId = 'ct3Root' + thisq;
var stateKey = 'ctState3_' + thisq;
/* =========================================================
 STATE
========================================================= */
if (!window[stateKey]) {
window[stateKey] = {
a11y: { lm:false, nr:true, hc:false, fs:0 },
circuit: null,           // copy of Stage 1's simplified circuit
branches: [],            // [{ id, label('I1'), color, ids:Set,
 //    locked:bool, direction: 'forward'|'reverse'|null,
 //    fromNode, toNode  (when direction set) }]
hasError: false
};
}
var S = window[stateKey];
/* =========================================================
 INIT FROM PRIOR STAGES
========================================================= */
// Stage 3's fallback: same simplified-circuit components as Stage 2's fallback,
// for use when running Stage 3 in isolation (testing).
function stage1FallbackForTesting() {
return {
components: [
{ id:'R8', kind:'resistor', value:4, a:'E', b:'A',
label:'R\u2088\u208a\u2089\u2225\u2081\u2080\u208a\u2081\u2081',
geom: { x1:90, y1:30, x2:290, y2:30 } },
{ id:'R5', kind:'resistor', value:6, a:'A', b:'B',
label:'R\u2085\u208a\u2086',
geom: { x1:410, y1:30, x2:550, y2:30 } },
{ id:'R3', kind:'resistor', value:6, a:'B', b:'CD',
label:'R\u2083\u208a\u2081\u208a\u2082',
geom: { x1:610, y1:30, x2:770, y2:30 } },
{ id:'R7', kind:'resistor', value:2, a:'A', b:'G', label:'R\u2087',
geom: { x1:380, y1:90, x2:380, y2:190 } },
{ id:'R4', kind:'resistor', value:4, a:'B', b:'H', label:'R\u2084',
geom: { x1:580, y1:90, x2:580, y2:190 } },
{ id:'E1', kind:'battery', value:12, a:'H', b:'CD', label:'E\u2081',
geom: { x1:580, y1:210, x2:580, y2:330 } },
{ id:'E2', kind:'battery', value:6, a:'CD', b:'G', label:'E\u2082',
geom: { x1:380, y1:330, x2:380, y2:210 } },
{ id:'E3', kind:'battery', value:9, a:'E', b:'CD', label:'E\u2083',
geom: { x1:60, y1:360, x2:60, y2:440 } }
],
displayComponents: [
{ id:'R8', kind:'resistor', value:4, a:'F', b:'A',
label:'R\u2088\u208a\u2089\u2225\u2081\u2080\u208a\u2081\u2081',
geom: { x1:90, y1:30, x2:290, y2:30 } },
{ id:'R5', kind:'resistor', value:6, a:'A', b:'B', label:'R\u2085\u208a\u2086',
geom: { x1:410, y1:30, x2:550, y2:30 } },
{ id:'R3', kind:'resistor', value:6, a:'B', b:'J', label:'R\u2083\u208a\u2081\u208a\u2082',
geom: { x1:610, y1:30, x2:770, y2:30 } },
{ id:'R1', kind:'wire', a:'J', b:'K', geom: { x1:820, y1:90, x2:820, y2:330 } },
{ id:'R2', kind:'wire', a:'C', b:'K', geom: { x1:650, y1:470, x2:790, y2:470 } },
{ id:'R6', kind:'wire', a:'C', b:'D', geom: { x1:550, y1:470, x2:410, y2:470 } },
{ id:'R11', kind:'wire', a:'D', b:'X', geom: { x1:350, y1:470, x2:140, y2:470 } },
{ id:'R9', kind:'wire', a:'E', b:'F', geom: { x1:60, y1:150, x2:60, y2:270 } },
{ id:'R10', kind:'absorbed', a:'A', b:'E', geom: { x1:380, y1:30, x2:60, y2:300 } },
{ id:'R7', kind:'resistor', value:2, a:'A', b:'G', label:'R\u2087',
geom: { x1:380, y1:90, x2:380, y2:190 } },
{ id:'R4', kind:'resistor', value:4, a:'B', b:'H', label:'R\u2084',
geom: { x1:580, y1:90, x2:580, y2:190 } },
{ id:'E1', kind:'battery', value:12, a:'H', b:'C', label:'E\u2081',
geom: { x1:580, y1:210, x2:580, y2:330 } },
{ id:'E2', kind:'battery', value:6, a:'D', b:'G', label:'E\u2082',
geom: { x1:380, y1:330, x2:380, y2:210 } },
{ id:'E3', kind:'battery', value:9, a:'E', b:'X', label:'E\u2083',
geom: { x1:60, y1:360, x2:60, y2:440 } }
]
};
}
function loadFromPriorStages() {
// For Example 3: read from window['ctStage1Simplified_<thisq>'] which is set
// by Stage 1's completion event handler. Falls back to a built-in default for testing.
var simplified = window['ctStage1Simplified_' + thisq];
var s2 = window['ctState2_' + thisq];
if (!simplified || !simplified.components) {
// Use the same fallback that Stage 2 uses (Example 3's simplified circuit)
simplified = stage1FallbackForTesting();
}
if (!(s2 && s2.foundBranches && s2.foundBranches.length > 0)) {
return { ok:false, reason:'Complete Stage 2 first \u2014 the branches must be identified before assigning current directions.' };
}
// Copy circuit (logical components for branch detection)
S.circuit = {
components: simplified.components.map(function(c){ return Object.assign({}, c); })
};
// Stash displayComponents for visual rendering (full schematic with wires)
S.displayComponents = (simplified.displayComponents || simplified.components).map(function(c){
return Object.assign({}, c);
});
// Build branches list. Each Stage 2 entry: { ids:Set, color }
// We need to derive endpoints (fromNode/toNode) and label them I1, I2, ...
// Order branches left-to-right by minimum column index of their components.
var sortedB = s2.foundBranches.slice().map(function(b, i){
var comps = S.circuit.components.filter(function(c){ return b.ids.has(c.id); });
var minCol = Math.min.apply(null, comps.map(function(c){ return c.col != null ? c.col : 99; }));
return { src:b, comps:comps, minCol:minCol, origIdx:i };
}).sort(function(a,b){
if (a.minCol !== b.minCol) return a.minCol - b.minCol;
return a.origIdx - b.origIdx;
});
S.branches = sortedB.map(function(item, i) {
var endpoints = findBranchEndpoints(item.comps);
// Determine if this branch contains a battery, and if so, what the
// CONVENTIONAL-correct direction is (so we can validate the student's choice later).
// Conventional current in the external circuit flows TOWARD the positive
// terminal of the battery (outside the battery, current returns into +).
// Wait, actually: conventional current flows OUT of + terminal externally,
// around the external loop, and INTO the - terminal. Inside this single
// branch, the battery's + terminal IS one of the endpoints (a junction node);
// the external path of this branch runs from the - terminal (internal node)
// through the resistor(s) to the OTHER junction node. Then conventional
// current flows: out of + (= junction we'll call EpPos) -> through the
// EXTERNAL circuit (other branches) -> back into the OTHER endpoint (EpNeg)
// -> through the resistor(s) of this branch UPWARD -> into the - terminal
// -> through the battery internally to + -> back out at EpPos.
//
// So WITHIN this branch, conventional current flows from EpNeg toward EpPos.
// EpPos is the endpoint connected to the battery's + terminal (bat.a).
var bat = item.comps.find(function(c){ return c.kind === 'battery'; });
var correctFromNode = null, correctToNode = null;
if (bat) {
// Find which endpoint is on the "positive side" of the battery.
// Walk from bat.a (positive terminal node) outward, NOT through the battery itself.
// Since bat.a may itself be an endpoint (a junction), the walk terminates immediately
// at bat.a. That endpoint is the one ATTACHED to + -> conventional current flows
// INTO this endpoint from outside the branch, and IN THIS BRANCH it flows
// from the OTHER endpoint TOWARD this endpoint.
var posSideEndpoint = traceBranchFrom(item.comps, bat.a, bat.id, endpoints);
if (posSideEndpoint) {
correctToNode = posSideEndpoint;                                  // toward +
correctFromNode = (correctToNode === endpoints[0]) ? endpoints[1] : endpoints[0];
}
}
return {
id: 'B' + i,
label: 'I' + subscript(i+1),
color: item.src.color,
ids: new Set(item.src.ids),
comps: item.comps,
endpoints: endpoints,
// No more pre-set/locked behavior. All branches start unset.
// For battery branches we keep correctFromNode/correctToNode so we can
// validate the student's choice when they click.
locked: false,
direction: null,
fromNode: null,
toNode: null,
hasBattery: !!bat,
battery: bat || null,
correctFromNode: correctFromNode,
correctToNode: correctToNode
};
});
return { ok:true };
}
function subscript(n) {
var subs = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
return String(n).split('').map(function(ch){ return subs[+ch]; }).join('');
}
function findBranchEndpoints(comps) {
var deg = {};
comps.forEach(function(c){ deg[c.a] = (deg[c.a]||0)+1; deg[c.b] = (deg[c.b]||0)+1; });
var eps = [];
Object.keys(deg).forEach(function(n){ if (deg[n] === 1) eps.push(n); });
return eps;
}
/* Walk through a branch starting from a node, following components, until reaching
 an endpoint. Used to figure out which endpoint a battery's positive terminal "leads to".
 We start from `startNode`, take the component identified by `startCompId`'s OTHER terminal
 as the next node, then keep walking. */
function traceBranchFrom(comps, startNode, startCompId, endpoints) {
// The startNode is one terminal of startComp. We want to walk AWAY from startCompId,
// i.e. start from startNode and find any other component (not startCompId) that touches it.
var visited = new Set();
visited.add(startCompId);
var cur = startNode;
while (endpoints.indexOf(cur) < 0) {
var nextComp = comps.find(function(c){
return !visited.has(c.id) && (c.a === cur || c.b === cur);
});
if (!nextComp) return null;
visited.add(nextComp.id);
cur = (nextComp.a === cur) ? nextComp.b : nextComp.a;
}
return cur;
}
/* =========================================================
 LAYOUT (geom-based for the bridge — uses each comp's c.geom)
========================================================= */
function layout() {
return { L: { width: 540, height: 340 } };
}
function nodePos() {
return {
F: { x:60,  y:30  },
A: { x:380, y:30  },
B: { x:580, y:30  },
J: { x:820, y:30  },
K: { x:820, y:470 },
C: { x:580, y:470 },
D: { x:380, y:470 },
X: { x:60,  y:470 },
CD: { x:380, y:470 },
E: { x:60,  y:300 },
G: { x:380, y:200 },
H: { x:580, y:200 }
};
}
/* Compute the rendering geometry for a branch's click zones and arrow.
 For each branch endpoint (ep1, ep2), find the COMPONENT in the branch
 that connects directly to that endpoint, then place the click zone at
 that component's end pointing toward the endpoint.
 For the ARROW, use the midpoint of the rendered components and a direction
 derived from the branch's "outer" component pointing along its own body. */
function branchGeometry(branch, info) {
var ep1 = branch.endpoints[0], ep2 = branch.endpoints[1];
var pos = nodePos();
var p1 = pos[ep1], p2 = pos[ep2];
// Find the components in the branch that touch ep1 and ep2 respectively.
var outerEp1 = null, outerEp2 = null;
branch.comps.forEach(function(c){
if (c.a === ep1 || c.b === ep1) outerEp1 = c;
if (c.a === ep2 || c.b === ep2) outerEp2 = c;
});
// Fallbacks
if (!outerEp1) outerEp1 = branch.comps[0];
if (!outerEp2) outerEp2 = branch.comps[branch.comps.length - 1];
// For each outer component, determine which end of its geom points toward
// its junction endpoint. We use position-based lookup against the displayComp's
// original a/b, so it works even when the geom convention (x1,y1)↔a is reversed.
function endTowardJunction(comp, junctionNode) {
var pos = nodePos();
// Find the displayComp with same id (preserves original pre-canonicalization a/b)
var disp = null;
if (S.displayComponents) {
for (var i = 0; i < S.displayComponents.length; i++) {
if (S.displayComponents[i].id === comp.id) { disp = S.displayComponents[i]; break; }
}
}
// Determine which terminal (x1,y1 or x2,y2) corresponds to junctionNode.
// junctionNode is canonical (e.g., 'A', 'CD'). The terminal closer to ANY
// visual point of the junction's group is the right one.
// We compare distances of (x1,y1) and (x2,y2) to pos[disp.a] and pos[disp.b]
// (or pos[comp.a]/pos[comp.b] as fallback).
var aName = disp ? disp.a : comp.a;
var bName = disp ? disp.b : comp.b;
var pa = pos[aName], pb = pos[bName];
// Determine: does (x1,y1) correspond to aName or bName?
var x1ToA;
if (pa && pb) {
var d2_x1_a = (pa.x - comp.geom.x1) * (pa.x - comp.geom.x1) + (pa.y - comp.geom.y1) * (pa.y - comp.geom.y1);
var d2_x1_b = (pb.x - comp.geom.x1) * (pb.x - comp.geom.x1) + (pb.y - comp.geom.y1) * (pb.y - comp.geom.y1);
x1ToA = d2_x1_a < d2_x1_b;
} else {
// Fallback: use convention (x1,y1)↔a
x1ToA = true;
}
// Logical comp.a corresponds to display disp.a (same end), so:
var compAEnd = x1ToA ? { x: comp.geom.x1, y: comp.geom.y1 } : { x: comp.geom.x2, y: comp.geom.y2 };
var compBEnd = x1ToA ? { x: comp.geom.x2, y: comp.geom.y2 } : { x: comp.geom.x1, y: comp.geom.y1 };
return comp.a === junctionNode ? compAEnd : compBEnd;
}
var ep1End = endTowardJunction(outerEp1, ep1);
var ep2End = endTowardJunction(outerEp2, ep2);
// Branch midpoint: average of all comp midpoints
var sumX = 0, sumY = 0, n = 0;
branch.comps.forEach(function(c){
sumX += (c.geom.x1 + c.geom.x2) / 2;
sumY += (c.geom.y1 + c.geom.y2) / 2;
n++;
});
var mx = n > 0 ? sumX / n : (p1.x + p2.x) / 2;
var my = n > 0 ? sumY / n : (p1.y + p2.y) / 2;
// Direction unit vector: from ep1End to ep2End (i.e., along the rendered branch)
var dx = ep2End.x - ep1End.x, dy = ep2End.y - ep1End.y;
var len = Math.sqrt(dx*dx + dy*dy);
if (len > 0) { dx /= len; dy /= len; }
// Click zones: each ZONE is centered at the corresponding outer-component's end
// point (slightly inset from the very tip).
var zoneSize = 36;
// The "toward ep1" zone is at outerEp1's body, near its ep1 terminal.
// Same robust lookup as endTowardJunction.
function zoneAtComp(comp, towardJunction) {
var endPt = endTowardJunction(comp, towardJunction);
var midx = (comp.geom.x1 + comp.geom.x2) / 2;
var midy = (comp.geom.y1 + comp.geom.y2) / 2;
// Zone is between midpoint and end, biased ~60% of the way to end.
return {
cx: midx + (endPt.x - midx) * 0.6,
cy: midy + (endPt.y - midy) * 0.6,
w: zoneSize * 2, h: zoneSize * 2
};
}
return {
midX: mx, midY: my,
zoneToEp1: zoneAtComp(outerEp1, ep1),
zoneToEp2: zoneAtComp(outerEp2, ep2),
ep1: ep1, ep2: ep2,
ep1Pos: p1, ep2Pos: p2,
dx: dx, dy: dy, length: len
};
}
/* =========================================================
 RENDER
========================================================= */
function svgEl(tag, attrs, text) {
var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
for (var k in attrs) el.setAttribute(k, attrs[k]);
if (text != null) el.textContent = text;
return el;
}
function render() {
var svg = document.getElementById('ct3Svg' + thisq);
if (!svg) return;
while (svg.firstChild) svg.removeChild(svg.firstChild);
var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
t.textContent = 'Simplified circuit with branch currents';
var d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
d.textContent = describeCircuit();
svg.appendChild(t); svg.appendChild(d);
drawSkeletonWires(svg);
// Use the FULL displayed components if available (includes wires + absorbed
// markers from Stage 1), else fall back to the logical components.
var displayList = S.displayComponents || S.circuit.components;
displayList.forEach(function(c){
drawComponent(svg, c);
});
// Junction dots
svg.appendChild(svgEl('circle', { cx:380, cy:30, r:3.5, 'class':'ct3node' }));
svg.appendChild(svgEl('circle', { cx:580, cy:30, r:3.5, 'class':'ct3node' }));
[{x:60, y:470}, {x:380, y:470}, {x:580, y:470}, {x:820, y:470}].forEach(function(p){
svg.appendChild(svgEl('circle', { cx:p.x, cy:p.y, r:3.5, 'class':'ct3node' }));
});
var info = layout();
S.branches.forEach(function(b){ drawBranchOverlay(svg, b, info); });
}
function drawSkeletonWires(svg) {
// Stage 1's exact wire layout. Active components are drawn separately.
// Top horizontal rail
svg.appendChild(svgEl('line', {x1:60,  y1:30,  x2:90,  y2:30,  'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:290, y1:30,  x2:380, y2:30,  'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:380, y1:30,  x2:410, y2:30,  'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:550, y1:30,  x2:580, y2:30,  'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:580, y1:30,  x2:610, y2:30,  'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:770, y1:30,  x2:820, y2:30,  'class':'ct3wire'}));
// Right vertical (R1 was wire)
svg.appendChild(svgEl('line', {x1:820, y1:30,  x2:820, y2:470, 'class':'ct3wire'}));
// Bottom horizontal rail
svg.appendChild(svgEl('line', {x1:60,  y1:470, x2:820, y2:470, 'class':'ct3wire'}));
// Left vertical: F → R9(wire) → E → E3 → X
svg.appendChild(svgEl('line', {x1:60,  y1:30,  x2:60,  y2:360, 'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:60,  y1:440, x2:60,  y2:470, 'class':'ct3wire'}));
// R7-E2 stack
svg.appendChild(svgEl('line', {x1:380, y1:30,  x2:380, y2:90,  'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:380, y1:190, x2:380, y2:210, 'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:380, y1:330, x2:380, y2:470, 'class':'ct3wire'}));
// R4-E1 stack
svg.appendChild(svgEl('line', {x1:580, y1:30,  x2:580, y2:90,  'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:580, y1:190, x2:580, y2:210, 'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:580, y1:330, x2:580, y2:470, 'class':'ct3wire'}));
}
function getById(id) {
return S.circuit.components.find(function(c){return c.id===id;});
}
function drawComponent(svg, c) {
if (c.kind === 'absorbed') return;  // parallel-merged; not drawn
if (c.kind === 'wire') {
svg.appendChild(svgEl('line', {
x1: c.geom.x1, y1: c.geom.y1, x2: c.geom.x2, y2: c.geom.y2,
'class':'ct3wire'
}));
return;
}
if (c.kind === 'battery') drawBatteryDiagonal(svg, c);
else drawResistor(svg, c);
}
function drawResistor(svg, c) {
var x1 = c.geom.x1, y1 = c.geom.y1, x2 = c.geom.x2, y2 = c.geom.y2;
var mx = (x1+x2)/2, my = (y1+y2)/2;
var dx = x2-x1, dy = y2-y1;
var len = Math.sqrt(dx*dx + dy*dy);
var ang = Math.atan2(dy, dx) * 180 / Math.PI;
var bodyLen = 36, bodyW = 14;
var halfLen = bodyLen/2;
var transform = 'translate(' + mx + ',' + my + ') rotate(' + ang + ')';
var ux = dx/len, uy = dy/len;
var bodyLeftX = mx - ux*halfLen, bodyLeftY = my - uy*halfLen;
var bodyRightX = mx + ux*halfLen, bodyRightY = my + uy*halfLen;
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:bodyLeftX, y2:bodyLeftY, 'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:bodyRightX, y1:bodyRightY, x2:x2, y2:y2, 'class':'ct3wire'}));
svg.appendChild(svgEl('rect', {
x:-halfLen, y:-bodyW/2, width:bodyLen, height:bodyW, rx:3, ry:3,
transform: transform, 'class':'ct3comp'
}));
var px = -uy, py = ux;
var isHorizontal = Math.abs(dy) < Math.abs(dx) * 0.3;
if (isHorizontal) {
if (my > 440) { px = 0; py = -1; }
else { px = 0; py = 1; }
} else {
if (px * (mx-440) + py * (my-250) < 0) { px = -px; py = -py; }
}
var labOff = 28;
var labX = mx + px*labOff, labY = my + py*labOff;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ct3label'}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+18, 'class':'ct3val'}, fmt(c.value) + ' \u03a9'));
}
function drawBatteryDiagonal(svg, c) {
var x1 = c.geom.x1, y1 = c.geom.y1, x2 = c.geom.x2, y2 = c.geom.y2;
var mx = (x1+x2)/2, my = (y1+y2)/2;
var dx = x2-x1, dy = y2-y1;
var len = Math.sqrt(dx*dx + dy*dy);
var ux = dx/len, uy = dy/len;
var px = -uy, py = ux;
var longLen = 24, shortLen = 14;
var plateGapHalf = 4;
var longCx = mx - ux*plateGapHalf, longCy = my - uy*plateGapHalf;
var shortCx = mx + ux*plateGapHalf, shortCy = my + uy*plateGapHalf;
var lp1x = longCx + px*longLen/2,  lp1y = longCy + py*longLen/2;
var lp2x = longCx - px*longLen/2,  lp2y = longCy - py*longLen/2;
var sp1x = shortCx + px*shortLen/2, sp1y = shortCy + py*shortLen/2;
var sp2x = shortCx - px*shortLen/2, sp2y = shortCy - py*shortLen/2;
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:longCx, y2:longCy, 'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:lp1x, y1:lp1y, x2:lp2x, y2:lp2y, 'class':'ct3wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:sp1x, y1:sp1y, x2:sp2x, y2:sp2y, 'class':'ct3wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:shortCx, y1:shortCy, x2:x2, y2:y2, 'class':'ct3wire'}));
var pxL = px, pyL = py;
if (pxL * (mx-440) + pyL * (my-250) < 0) { pxL = -pxL; pyL = -pyL; }
var labOff = 22;
var labX = mx + pxL*labOff, labY = my + pyL*labOff;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ct3label'}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+18, 'class':'ct3val'}, c.value + ' V'));
}
function drawBatteryHorizontal(svg, c, cx, cy) {
// E1: c.a=n1 (positive). On screen, we go from left to right; the long plate
// (positive) goes on the right side (toward n1).
var longLen = 26, shortLen = 14;
var plateGapHalf = 4;
var longX = cx + plateGapHalf;
var shortX = cx - plateGapHalf;
svg.appendChild(svgEl('line', {x1:cx-30, y1:cy, x2:shortX, y2:cy, 'class':'ct3wire'}));
svg.appendChild(svgEl('line', {x1:shortX, y1:cy-shortLen/2, x2:shortX, y2:cy+shortLen/2, 'class':'ct3wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX,  y1:cy-longLen/2,  x2:longX,  y2:cy+longLen/2,  'class':'ct3wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX, y1:cy, x2:cx+30, y2:cy, 'class':'ct3wire'}));
svg.appendChild(svgEl('text', {x:cx, y:cy-longLen/2-6, 'class':'ct3label'}, c.label));
svg.appendChild(svgEl('text', {x:cx, y:cy+longLen/2+14, 'class':'ct3val'}, c.value + ' V'));
}
/* =========================================================
 BRANCH OVERLAYS (click zones + arrows)
 Two zones per branch: each is a rect closer to one of the branch's
 endpoints. Clicking a zone sets the current direction toward that endpoint.
========================================================= */
function drawBranchOverlay(svg, branch, info) {
var geom = branchGeometry(branch, info);
// Zone 1: toward endpoint 1
var z1 = geom.zoneToEp1;
var rect1 = svgEl('rect', {
x: z1.cx - z1.w/2, y: z1.cy - z1.h/2, width: z1.w, height: z1.h,
'class': 'ct3zone',
tabindex: 0, role: 'button',
'data-bid': branch.id, 'data-ep': geom.ep1,
'aria-label': 'Set ' + branch.label + ' direction toward ' + geom.ep1
});
attachZoneHandlers(rect1, branch, geom.ep1);
svg.appendChild(rect1);
// Zone 2: toward endpoint 2
var z2 = geom.zoneToEp2;
var rect2 = svgEl('rect', {
x: z2.cx - z2.w/2, y: z2.cy - z2.h/2, width: z2.w, height: z2.h,
'class': 'ct3zone',
tabindex: 0, role: 'button',
'data-bid': branch.id, 'data-ep': geom.ep2,
'aria-label': 'Set ' + branch.label + ' direction toward ' + geom.ep2
});
attachZoneHandlers(rect2, branch, geom.ep2);
svg.appendChild(rect2);
// Current arrow
if (branch.direction) {
drawCurrentArrow(svg, branch, geom);
} else {
drawDirectionPlaceholder(svg, branch, geom);
}
}
/* Draw the current arrow: oriented along the LOCAL wire direction at the
 branch's drawing midpoint, pointing from fromNode toward toNode.
 Placed perpendicular-offset away from the wire. */
function drawCurrentArrow(svg, branch, geom) {
var color = branch.color || '#00d4ff';
// Find the outer component (closest to fromNode) to align arrow with its body.
var fromComp = null;
branch.comps.forEach(function(c){
if (c.a === branch.fromNode || c.b === branch.fromNode) fromComp = c;
});
if (!fromComp) fromComp = branch.comps[0];
// Determine which end of fromComp's geom corresponds to fromNode (using
// position-based lookup, since the (x1,y1)↔a convention is not always true).
var pos = nodePos();
var disp = null;
if (S.displayComponents) {
for (var i = 0; i < S.displayComponents.length; i++) {
if (S.displayComponents[i].id === fromComp.id) { disp = S.displayComponents[i]; break; }
}
}
var aName = disp ? disp.a : fromComp.a;
var bName = disp ? disp.b : fromComp.b;
var pa = pos[aName], pb = pos[bName];
var x1ToA = true;
if (pa && pb) {
var d2_x1_a = (pa.x - fromComp.geom.x1) * (pa.x - fromComp.geom.x1) + (pa.y - fromComp.geom.y1) * (pa.y - fromComp.geom.y1);
var d2_x1_b = (pb.x - fromComp.geom.x1) * (pb.x - fromComp.geom.x1) + (pb.y - fromComp.geom.y1) * (pb.y - fromComp.geom.y1);
x1ToA = d2_x1_a < d2_x1_b;
}
// Logical fromComp.a corresponds to display disp.a (same end)
var aEndX = x1ToA ? fromComp.geom.x1 : fromComp.geom.x2;
var aEndY = x1ToA ? fromComp.geom.y1 : fromComp.geom.y2;
var bEndX = x1ToA ? fromComp.geom.x2 : fromComp.geom.x1;
var bEndY = x1ToA ? fromComp.geom.y2 : fromComp.geom.y1;
var fromEndX, fromEndY, toEndX, toEndY;
if (fromComp.a === branch.fromNode) {
fromEndX = aEndX; fromEndY = aEndY;
toEndX = bEndX; toEndY = bEndY;
} else {
fromEndX = bEndX; fromEndY = bEndY;
toEndX = aEndX; toEndY = aEndY;
}
var dx = toEndX - fromEndX, dy = toEndY - fromEndY;
var len = Math.sqrt(dx*dx + dy*dy);
if (len === 0) return;
var ux = dx/len, uy = dy/len;
// Position arrow at the midpoint of fromComp (the outer component)
var arrowMidX = (fromComp.geom.x1 + fromComp.geom.x2) / 2;
var arrowMidY = (fromComp.geom.y1 + fromComp.geom.y2) / 2;
// Perpendicular for offset (push arrow off the body so it doesn't overlap)
var px = -uy, py = ux;
if (arrowMidY < 50) { px = 0; py = 1; }
else if (arrowMidY > 440) { px = 0; py = -1; }
else {
var dxFromCenter = arrowMidX - 440, dyFromCenter = arrowMidY - 250;
if (px * dxFromCenter + py * dyFromCenter < 0) { px = -px; py = -py; }
}
var arrowOffset = 22;
var ax = arrowMidX + px*arrowOffset, ay = arrowMidY + py*arrowOffset;
var shaftLen = 32, headLen = 7, headHalfW = 5;
var tailX = ax - ux*shaftLen/2, tailY = ay - uy*shaftLen/2;
var headX = ax + ux*shaftLen/2, headY = ay + uy*shaftLen/2;
svg.appendChild(svgEl('line', {
x1: tailX, y1: tailY,
x2: headX - ux*headLen*0.6, y2: headY - uy*headLen*0.6,
'class':'ct3arrow', stroke: color
}));
var hx1 = headX - ux*headLen + px*headHalfW;
var hy1 = headY - uy*headLen + py*headHalfW;
var hx2 = headX - ux*headLen - px*headHalfW;
var hy2 = headY - uy*headLen - py*headHalfW;
svg.appendChild(svgEl('polygon', {
points: headX+','+headY+' '+hx1+','+hy1+' '+hx2+','+hy2,
'class':'ct3arrowhead', fill: color
}));
var labOff = 14;
svg.appendChild(svgEl('text', {
x: tailX + px*labOff - ux*4, y: tailY + py*labOff - uy*4 + 4,
'class':'ct3currlabel', 'text-anchor':'middle', fill: color
}, branch.label));
}
function drawDirectionPlaceholder(svg, branch, geom) {
// Position placeholder at the branch's midpoint, perpendicular to its
// outer component's body. Uses the same rule as drawCurrentArrow.
var firstComp = branch.comps[0];
if (!firstComp) return;
var dx = firstComp.geom.x2 - firstComp.geom.x1;
var dy = firstComp.geom.y2 - firstComp.geom.y1;
var len = Math.sqrt(dx*dx + dy*dy);
if (len === 0) return;
var ux = dx/len, uy = dy/len;
var px = -uy, py = ux;
var midX = (firstComp.geom.x1 + firstComp.geom.x2) / 2;
var midY = (firstComp.geom.y1 + firstComp.geom.y2) / 2;
if (midY < 50) { px = 0; py = 1; }
else if (midY > 440) { px = 0; py = -1; }
else {
if (px * (midX - 440) + py * (midY - 250) < 0) { px = -px; py = -py; }
}
var off = 22;
var x = midX + px*off, y = midY + py*off;
svg.appendChild(svgEl('text', {
x: x, y: y + 4, 'class': 'ct3currlabel', 'text-anchor': 'middle',
fill: branch.color || '#7a8aaa'
}, branch.label + ' = ?'));
}
function attachZoneHandlers(el, branch, towardEp) {
el.addEventListener('click', function(){ setDirectionFromClick(branch, towardEp); });
el.addEventListener('keydown', function(ev){
if (ev.key === 'Enter' || ev.key === ' ') {
ev.preventDefault();
setDirectionFromClick(branch, towardEp);
}
});
}
function setDirectionFromClick(branch, clickedTowardEp) {
var otherEp = branch.endpoints[0] === clickedTowardEp ? branch.endpoints[1] : branch.endpoints[0];
// Toggle: if already pointing toward the clicked endpoint, clear it.
if (branch.direction && branch.toNode === clickedTowardEp) {
branch.direction = null;
branch.fromNode = null;
branch.toNode = null;
setFeedback('Direction cleared for ' + flatLabel(branch.label) + '.', 'info');
announce('Direction cleared for ' + flatLabel(branch.label) + '.');
refreshUI();
return;
}
// For battery branches, validate against the conventional rule.
if (branch.hasBattery && branch.correctToNode) {
if (clickedTowardEp !== branch.correctToNode) {
var batLabel = branch.battery ? branch.battery.label : 'the battery';
setFeedback(
'<strong>Not the conventional direction.</strong> '
+ 'For a branch containing a battery (' + batLabel + '), conventional current flows '
+ 'OUT of the positive (long-plate) terminal externally, which means within this '
+ 'branch it flows toward the endpoint connected to the positive terminal. '
+ 'Try clicking the other half.',
'bad');
announce('Incorrect. Conventional current must flow out of the positive terminal of '
+ (branch.battery ? flatLabel(branch.battery.label) : 'the battery') + '.');
return;
}
branch.direction = 'set';
branch.fromNode = otherEp;
branch.toNode = clickedTowardEp;
setFeedback(
'<strong>Correct \u2014 ' + flatLabel(branch.label) + ' set toward ' + clickedTowardEp + '.</strong> '
+ 'Conventional current flows out of the positive terminal of '
+ (branch.battery ? branch.battery.label : 'the battery') + '.',
'good');
announce(flatLabel(branch.label) + ' set toward ' + clickedTowardEp + '. Correct conventional direction.');
refreshUI();
return;
}
// Resistor-only branch: any direction acceptable
branch.direction = 'set';
branch.fromNode = otherEp;
branch.toNode = clickedTowardEp;
setFeedback(
'Set ' + flatLabel(branch.label) + ' pointing toward ' + clickedTowardEp + '. '
+ '(For a resistor-only branch you\u2019re free to choose either direction; '
+ 'if your guess is wrong, the math in Stage 5 will produce a negative current.)',
'good');
announce(flatLabel(branch.label) + ' set toward ' + clickedTowardEp + '.');
refreshUI();
}
function flatLabel(lab) {
// Convert "I₁" -> "I 1" for narration
return lab.replace(/[\u2080-\u2089]/g, function(ch){ return ' ' + (ch.charCodeAt(0) - 0x2080); });
}
/* =========================================================
 SIDE PANEL
========================================================= */
function refreshUI() {
render();
updateBranchList();
updateButtons();
updateProgress();
}
function updateBranchList() {
var div = document.getElementById('ct3List' + thisq);
if (!div) return;
if (S.branches.length === 0) {
div.innerHTML = '<span style="color:#7a8aaa;font-style:italic;">No branches.</span>';
return;
}
div.innerHTML = S.branches.map(function(b){
var statusCls, statusText;
if (b.direction) { statusCls = 'ct3statset'; statusText = 'Set'; }
else { statusCls = 'ct3statunset'; statusText = 'Unset'; }
var compLabels = b.comps.map(function(c){return c.label;}).join(', ');
var note = b.hasBattery ? ' <span style="color:#7a8aaa;font-size:10px;">(battery)</span>' : '';
return '<div class="ct3branch'+'">'
+ '<span class="ct3branchswatch'+'" style="background:'+b.color+';"></span>'
+ '<span class="ct3branchlabel'+'">'+b.label+': '+compLabels+note+'</span>'
+ '<span class="ct3branchstatus'+' '+statusCls+'">'+statusText+'</span>'
+ '</div>';
}).join('');
}
function updateButtons() {
var btn = document.getElementById('ct3BtnReset' + thisq);
if (btn) btn.disabled = !S.branches.some(function(b){ return b.direction; });
}
function updateProgress() {
var note = document.getElementById('ct3Prog' + thisq);
if (!note) return;
var unset = S.branches.filter(function(b){ return !b.direction; });
if (unset.length === 0) {
note.textContent = 'All ' + S.branches.length + ' branch currents assigned.';
checkComplete();
} else {
note.textContent = unset.length + ' branch' + (unset.length===1?'':'es') + ' still need direction';
}
}
function checkComplete() {
var allSet = S.branches.length > 0 && S.branches.every(function(b){ return !!b.direction; });
if (!allSet) return;
var banner = document.getElementById('ct3Comp' + thisq);
if (!banner) return;
if (banner.classList.contains('ct3show')) return; // already shown
banner.classList.add('ct3show');
var msg = 'All branch currents assigned. Each resistor has a current direction; each battery branch follows the convention that current exits the positive terminal externally.';
banner.innerHTML = ''
+ '<div class="ct3compmsg' + '">\u2713 ' + msg + '</div>'
+ '<button type="button" class="ct3btn' + ' ct3btnnext' + '" id="ct3BtnNext' + thisq + '">'
+ 'Continue to Stage 4 \u2192</button>';
var nextBtn = document.getElementById('ct3BtnNext' + thisq);
if (nextBtn) {
nextBtn.addEventListener('click', function(){
var ev = new CustomEvent('ctStageComplete', { detail:{ stage:3, thisq:thisq } });
document.dispatchEvent(ev);
var hook = window['ctOnStageComplete_' + thisq];
if (typeof hook === 'function') hook(3);
announce('Advancing to Stage 4: polarity assignment.');
});
}
announce(msg);
}
function resetUserDirections() {
S.branches.forEach(function(b){
b.direction = null; b.fromNode = null; b.toNode = null;
});
var banner = document.getElementById('ct3Comp' + thisq);
if (banner) banner.classList.remove('ct3show');
setFeedback('All directions cleared.', 'info');
announce('All directions cleared.');
refreshUI();
}
function setFeedback(msg, tone) {
var fb = document.getElementById('ct3Fb' + thisq);
if (!fb) return;
fb.className = 'ct3fb' + (tone === 'good' ? ' ct3fbgood' : tone === 'bad' ? ' ct3fbbad' : tone === 'info' ? ' ct3fbinfo' : '');
fb.innerHTML = msg;
}
function announce(msg) {
var live = document.getElementById('ct3Live' + thisq);
var nar  = document.getElementById('ct3Nar' + thisq);
if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
if (nar && S.a11y.nr) nar.textContent = msg;
}
function fmt(v) {
if (v == null) return '';
if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
return v.toFixed(2).replace(/\.?0+$/,'');
}
function describeCircuit() {
return 'Simplified circuit with ' + S.branches.length + ' branches.';
}
/* =========================================================
 ACCESSIBILITY TOOLBAR
========================================================= */
function applyA11y() {
var root = document.getElementById(rootElId).querySelector('.ct3root');
if (!root) return;
root.classList.toggle('ct3lm', S.a11y.lm);
root.classList.toggle('ct3hc', S.a11y.hc);
var fontSizes = ['14px','16px','19px'];
root.style.setProperty('--ct3fs', fontSizes[S.a11y.fs]);
setBtn('ct3BtnLM', S.a11y.lm, 'LIGHT MODE');
setBtn('ct3BtnNR', S.a11y.nr, 'NARRATION', true);
setBtn('ct3BtnHC', S.a11y.hc, 'HIGH CONTRAST');
setBtn('ct3BtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);
var nar = document.getElementById('ct3Nar' + thisq);
if (nar) nar.classList.toggle('ct3narshow', S.a11y.nr);
}
function setBtn(idBase, on, label, withSuffix) {
var b = document.getElementById(idBase + thisq);
if (!b) return;
b.classList.toggle('ct3a11yon', on);
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
+ '<div class="ct3root' + '" role="region" aria-label="Current direction tutorial">'
+ '  <div class="ct3a11y' + '" role="toolbar" aria-label="Display options">'
+ '    <button type="button" class="ct3a11ybtn' + '" id="ct3BtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
+ '    <button type="button" class="ct3a11ybtn' + ' ct3a11yon' + '" id="ct3BtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
+ '    <button type="button" class="ct3a11ybtn' + '" id="ct3BtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
+ '    <button type="button" class="ct3a11ybtn' + '" id="ct3BtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
+ '  </div>'
+ '  <div id="ct3Nar' + thisq + '" class="ct3narbar' + ' ct3narshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
+ '  <h3 class="ct3title' + '">Example 3 — Stage 3: Current Directions</h3>'
+ '  <div class="ct3subtitle' + '">Assign a current direction to each branch. For branches with a battery, you must use the conventional direction (out of the positive terminal externally).</div>'
+ '  <div class="ct3stagebar' + '" role="navigation" aria-label="Tutorial stages">'
+ '    <span class="ct3pill' + ' ct3pilldone' + '">1. Simplify \u2713</span>'
+ '    <span class="ct3pill' + ' ct3pilldone' + '">2. Branches \u0026 Loops \u2713</span>'
+ '    <span class="ct3pill' + ' ct3pillactive' + '">3. Currents</span>'
+ '    <span class="ct3pill' + '">4. Polarities</span>'
+ '    <span class="ct3pill' + '">5. Equations</span>'
+ '  </div>'
+ '  <div class="ct3layout' + '">'
+ '    <div class="ct3canvasWrap' + thisq + '">'
+ '      <div class="ct3hint' + '">For each branch, click the half toward which the current should flow. For branches with a battery, the conventional direction is out of the positive (long-plate) terminal externally. Click the same half again to clear.</div>'
+ '      <svg class="ct3svg' + '" id="ct3Svg' + thisq + '" viewBox="0 0 880 510" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Simplified circuit"></svg>'
+ '      <div class="ct3complete' + '" id="ct3Comp' + thisq + '" role="status"></div>'
+ '    </div>'
+ '    <aside class="ct3side' + '">'
+ '      <div>'
+ '        <h2 class="ct3sideh' + '">Branch Currents</h2>'
+ '        <div class="ct3branchlist' + '" id="ct3List' + thisq + '" aria-live="polite"></div>'
+ '      </div>'
+ '      <div>'
+ '        <h2 class="ct3sideh' + '">Feedback</h2>'
+ '        <div class="ct3fb' + '" id="ct3Fb' + thisq + '">Click a branch (the half toward which the current should flow) to set its direction. Branches with a battery must follow the conventional direction.</div>'
+ '      </div>'
+ '      <div class="ct3btnrow' + '">'
+ '        <button type="button" class="ct3btn' + '" id="ct3BtnReset' + thisq + '" disabled>Clear All Directions</button>'
+ '      </div>'
+ '      <div class="ct3progress' + '" id="ct3Prog' + thisq + '"></div>'
+ '    </aside>'
+ '  </div>'
+ '  <span class="ct3sr' + '" id="ct3Live' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
+ '</div>';
root.innerHTML = html;
document.getElementById('ct3BtnReset' + thisq).addEventListener('click', resetUserDirections);
document.getElementById('ct3BtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
document.getElementById('ct3BtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
document.getElementById('ct3BtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
document.getElementById('ct3BtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
}
function buildErrorDOM(reason) {
var root = document.getElementById(rootElId);
root.innerHTML = ''
+ '<div class="ct3root' + '">'
+ '  <h3 class="ct3title' + '">Example 3 — Stage 3: Current Directions</h3>'
+ '  <div class="ct3error' + '">'
+ '    <strong>Cannot start Stage 3.</strong><br>' + reason
+ '  </div>'
+ '</div>';
}
/* =========================================================
 INIT
========================================================= */
function init() {
var res = loadFromPriorStages();
if (!res.ok) {
S.hasError = true;
buildErrorDOM(res.reason);
return;
}
S.hasError = false;
buildDOM();
applyA11y();
refreshUI();
var unsetCount = S.branches.filter(function(b){ return !b.direction; }).length;
var batCount = S.branches.filter(function(b){ return b.hasBattery; }).length;
var msg = 'Stage 3 ready. Choose a current direction for each of ' + S.branches.length + ' branches.';
if (batCount > 0) {
msg += ' ' + batCount + ' branch' + (batCount===1?'':'es') + ' contain a battery and must use the conventional direction (out of the positive terminal).';
}
announce(msg);
}
function reload() {
// Clear current state and re-init
S.branches = [];
S.circuit = null;
S.hasError = false;
init();
}
// Listen for Stage 1's and Stage 2's completion to refresh.
document.addEventListener('ctStageComplete', function(e){
if (e.detail && e.detail.thisq === thisq) {
if (e.detail.stage === 1 && e.detail.simplifiedCircuit) {
window['ctStage1Simplified_' + thisq] = e.detail.simplifiedCircuit;
}
if (e.detail.stage === 2) {
setTimeout(reload, 0);
}
}
});
if (document.getElementById(rootElId)) {
init();
} else {
document.addEventListener('DOMContentLoaded', init);
}
})();
