(function(){
'use strict';
var thisq = 'q1';
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
function loadFromPriorStages() {
var s1 = window['ctState_' + thisq];
var s2 = window['ctState2_' + thisq];
if (!(s1 && s1.circuit && s1.circuit.components && s1.circuit.components.length > 0)) {
return { ok:false, reason:'Stage 1 has not been completed yet.' };
}
if (!(s2 && s2.foundBranches && s2.foundBranches.length > 0)) {
return { ok:false, reason:'Complete Stage 2 first \u2014 the branches must be identified before assigning current directions.' };
}
// Copy circuit
S.circuit = {
components: s1.circuit.components.map(function(c){ return Object.assign({}, c); })
};
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
n1:     { x:270, y:60 },
n2:     { x:130, y:175 },
n3:     { x:410, y:175 },
n4:     { x:270, y:280 },
nE2int: { x:200, y:227 }
};
}
// For a branch, compute its rendering geometry as a midpoint and
// two click zones — each zone is the half of the branch closer to one endpoint.
// Works for any orientation by using actual coordinates.
function branchGeometry(branch, info) {
// Compute the geometric midpoint of the branch by averaging its components' geoms.
// Each component has c.geom.x1/y1 and c.geom.x2/y2 — except E1 which uses the return
// wire (we'll handle it specially).
var ep1 = branch.endpoints[0], ep2 = branch.endpoints[1];
var pos = nodePos();
var p1 = pos[ep1], p2 = pos[ep2];
// Midpoint of the branch as a whole (between its two endpoints in screen space)
// For multi-component branches (like E2+R3), this is roughly the midpoint along the
// total path. For E1 in the return wire, both endpoints are n1 and n4 but the wire
// wraps around — we pick a point on the return wire's top stretch.
var mx, my;
if (branch.ids.has('E1')) {
// E1 is in the return wire; use the position where E1 is drawn (140, 30).
mx = 140; my = 30;
} else {
mx = (p1.x + p2.x) / 2;
my = (p1.y + p2.y) / 2;
}
// Click zone direction: aligned with the endpoint-to-endpoint vector.
var dx, dy, len;
if (branch.ids.has('E1')) {
// For the return wire, "click toward n1" means clicking the right half
// (x > 140), and "click toward n4" means clicking the left half (x < 140).
// Effectively horizontal for the click-zone purpose.
dx = 1; dy = 0; len = 1;
} else {
dx = p2.x - p1.x; dy = p2.y - p1.y;
len = Math.sqrt(dx*dx + dy*dy);
if (len > 0) { dx /= len; dy /= len; }
}
// Two zones: each is a rectangle around the half of the branch closer to one endpoint.
// Zone is centered at one of the quarter points along the branch, with size proportional
// to the branch length.
var zoneSize = 36; // half-width and half-height
var zoneOffset = Math.max(20, Math.min(40, len * 0.15));
var z1cx = mx - dx * zoneOffset, z1cy = my - dy * zoneOffset;
var z2cx = mx + dx * zoneOffset, z2cy = my + dy * zoneOffset;
return {
midX: mx, midY: my,
// The two zones — toward ep1 and toward ep2 respectively
zoneToEp1: { cx: z1cx, cy: z1cy, w: zoneSize*2, h: zoneSize*2 },
zoneToEp2: { cx: z2cx, cy: z2cy, w: zoneSize*2, h: zoneSize*2 },
ep1: ep1, ep2: ep2,
ep1Pos: p1, ep2Pos: p2,
// Direction unit vector (used to draw the arrow)
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
t.textContent = 'Bridge circuit with branch currents';
var d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
d.textContent = describeCircuit();
svg.appendChild(t); svg.appendChild(d);
// Return wire path (with E1)
drawReturnWirePath(svg);
// Each non-return component
S.circuit.components.forEach(function(c){
if (c.id === 'E1') return;
drawComponent(svg, c);
});
// Junction dots
var pos = nodePos();
['n1','n2','n3','n4'].forEach(function(n){
svg.appendChild(svgEl('circle', { cx:pos[n].x, cy:pos[n].y, r:3.5, 'class':'ct3node'+thisq }));
});
// Branch overlays (click zones + arrows)
var info = layout();
S.branches.forEach(function(b){ drawBranchOverlay(svg, b, info); });
}
function drawReturnWirePath(svg) {
svg.appendChild(svgEl('line', {x1:270, y1:280, x2:270, y2:310, 'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('line', {x1:270, y1:310, x2:60,  y2:310, 'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('line', {x1:60,  y1:310, x2:60,  y2:30,  'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('line', {x1:60,  y1:30,  x2:110, y2:30,  'class':'ct3wire'+thisq}));
var e1 = getById('E1');
if (e1) drawBatteryHorizontal(svg, e1, 140, 30);
svg.appendChild(svgEl('line', {x1:170, y1:30,  x2:270, y2:30,  'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('line', {x1:270, y1:30,  x2:270, y2:60,  'class':'ct3wire'+thisq}));
}
function drawComponent(svg, c) {
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
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:bodyLeftX, y2:bodyLeftY, 'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('line', {x1:bodyRightX, y1:bodyRightY, x2:x2, y2:y2, 'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('rect', {
x:-halfLen, y:-bodyW/2, width:bodyLen, height:bodyW, rx:3, ry:3,
transform: transform, 'class':'ct3comp'+thisq
}));
var px = -uy, py = ux;
if (px * (mx-270) + py * (my-175) < 0) { px = -px; py = -py; }
var labOff = 28;
var labX = mx + px*labOff, labY = my + py*labOff;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ct3label'+thisq}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+12, 'class':'ct3val'+thisq}, fmt(c.value) + ' \u03a9'));
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
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:longCx, y2:longCy, 'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('line', {x1:lp1x, y1:lp1y, x2:lp2x, y2:lp2y, 'class':'ct3wire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:sp1x, y1:sp1y, x2:sp2x, y2:sp2y, 'class':'ct3wire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:shortCx, y1:shortCy, x2:x2, y2:y2, 'class':'ct3wire'+thisq}));
var pxL = px, pyL = py;
if (pxL * (mx-270) + pyL * (my-175) < 0) { pxL = -pxL; pyL = -pyL; }
var labOff = 22;
var labX = mx + pxL*labOff, labY = my + pyL*labOff;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ct3label'+thisq}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+12, 'class':'ct3val'+thisq}, c.value + ' V'));
}
function drawBatteryHorizontal(svg, c, cx, cy) {
// E1: c.a=n1 (positive). On screen, we go from left to right; the long plate
// (positive) goes on the right side (toward n1).
var longLen = 26, shortLen = 14;
var plateGapHalf = 4;
var longX = cx + plateGapHalf;
var shortX = cx - plateGapHalf;
svg.appendChild(svgEl('line', {x1:cx-30, y1:cy, x2:shortX, y2:cy, 'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('line', {x1:shortX, y1:cy-shortLen/2, x2:shortX, y2:cy+shortLen/2, 'class':'ct3wire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX,  y1:cy-longLen/2,  x2:longX,  y2:cy+longLen/2,  'class':'ct3wire'+thisq, 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX, y1:cy, x2:cx+30, y2:cy, 'class':'ct3wire'+thisq}));
svg.appendChild(svgEl('text', {x:cx, y:cy-longLen/2-6, 'class':'ct3label'+thisq}, c.label));
svg.appendChild(svgEl('text', {x:cx, y:cy+longLen/2+14, 'class':'ct3val'+thisq}, c.value + ' V'));
}
function getById(id) {
return S.circuit.components.find(function(c){return c.id===id;});
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
'class': 'ct3zone' + thisq,
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
'class': 'ct3zone' + thisq,
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
/* Draw the current arrow: oriented along the branch direction, pointing
 from fromNode toward toNode. Placed at the branch midpoint, perpendicular
 offset so it doesn't overlap the wire. */
function drawCurrentArrow(svg, branch, geom) {
var color = branch.color || '#00d4ff';
// Direction: from fromNode to toNode
var fromPos = (branch.fromNode === geom.ep1) ? geom.ep1Pos : geom.ep2Pos;
var toPos = (branch.toNode === geom.ep1) ? geom.ep1Pos : geom.ep2Pos;
var dx = toPos.x - fromPos.x, dy = toPos.y - fromPos.y;
var len = Math.sqrt(dx*dx + dy*dy);
if (len === 0) return;
var ux = dx/len, uy = dy/len;
// Perpendicular for the offset (away from diamond center)
var px = -uy, py = ux;
var dxFromCenter = geom.midX - 270, dyFromCenter = geom.midY - 175;
if (px * dxFromCenter + py * dyFromCenter < 0) { px = -px; py = -py; }
var arrowOffset = 22; // distance from the wire
var ax = geom.midX + px*arrowOffset, ay = geom.midY + py*arrowOffset;
var shaftLen = 32, headLen = 7, headHalfW = 5;
var tailX = ax - ux*shaftLen/2, tailY = ay - uy*shaftLen/2;
var headX = ax + ux*shaftLen/2, headY = ay + uy*shaftLen/2;
// Shaft
svg.appendChild(svgEl('line', {
x1: tailX, y1: tailY,
x2: headX - ux*headLen*0.6, y2: headY - uy*headLen*0.6,
'class':'ct3arrow'+thisq, stroke: color
}));
// Head: triangle at the head tip, pointing in (ux,uy)
var hx1 = headX - ux*headLen + px*headHalfW;
var hy1 = headY - uy*headLen + py*headHalfW;
var hx2 = headX - ux*headLen - px*headHalfW;
var hy2 = headY - uy*headLen - py*headHalfW;
svg.appendChild(svgEl('polygon', {
points: headX+','+headY+' '+hx1+','+hy1+' '+hx2+','+hy2,
'class':'ct3arrowhead'+thisq, fill: color
}));
// Label, near tail, offset further perpendicular
var labOff = 14;
svg.appendChild(svgEl('text', {
x: tailX + px*labOff - ux*4, y: tailY + py*labOff - uy*4 + 4,
'class':'ct3currlabel'+thisq, 'text-anchor':'middle', fill: color
}, branch.label));
}
function drawDirectionPlaceholder(svg, branch, geom) {
// "I_x = ?" placed at the perpendicular offset from the branch midpoint,
// toward outside of the diamond.
var ux = geom.dx, uy = geom.dy;
var px = -uy, py = ux;
var dxFromCenter = geom.midX - 270, dyFromCenter = geom.midY - 175;
if (px * dxFromCenter + py * dyFromCenter < 0) { px = -px; py = -py; }
var off = 22;
var x = geom.midX + px*off, y = geom.midY + py*off;
svg.appendChild(svgEl('text', {
x: x, y: y + 4, 'class': 'ct3currlabel' + thisq, 'text-anchor': 'middle',
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
if (b.direction) { statusCls = 'ct3statset'+thisq; statusText = 'Set'; }
else { statusCls = 'ct3statunset'+thisq; statusText = 'Unset'; }
var compLabels = b.comps.map(function(c){return c.label;}).join(', ');
var note = b.hasBattery ? ' <span style="color:#7a8aaa;font-size:10px;">(battery)</span>' : '';
return '<div class="ct3branch'+thisq+'">'
+ '<span class="ct3branchswatch'+thisq+'" style="background:'+b.color+';"></span>'
+ '<span class="ct3branchlabel'+thisq+'">'+b.label+': '+compLabels+note+'</span>'
+ '<span class="ct3branchstatus'+thisq+' '+statusCls+'">'+statusText+'</span>'
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
if (banner.classList.contains('ct3show' + thisq)) return; // already shown
banner.classList.add('ct3show' + thisq);
var msg = 'All branch currents assigned. Each resistor has a current direction; each battery branch follows the convention that current exits the positive terminal externally.';
banner.innerHTML = ''
+ '<div class="ct3compmsg' + thisq + '">\u2713 ' + msg + '</div>'
+ '<button type="button" class="ct3btn' + thisq + ' ct3btnnext' + thisq + '" id="ct3BtnNext' + thisq + '">'
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
if (banner) banner.classList.remove('ct3show' + thisq);
setFeedback('All directions cleared.', 'info');
announce('All directions cleared.');
refreshUI();
}
function setFeedback(msg, tone) {
var fb = document.getElementById('ct3Fb' + thisq);
if (!fb) return;
fb.className = 'ct3fb' + thisq + (tone === 'good' ? ' ct3fbgood' + thisq : tone === 'bad' ? ' ct3fbbad' + thisq : tone === 'info' ? ' ct3fbinfo' + thisq : '');
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
var root = document.getElementById(rootElId).querySelector('.ct3root' + thisq);
if (!root) return;
root.classList.toggle('ct3lm' + thisq, S.a11y.lm);
root.classList.toggle('ct3hc' + thisq, S.a11y.hc);
var fontSizes = ['14px','16px','19px'];
root.style.setProperty('--ct3fs' + thisq, fontSizes[S.a11y.fs]);
setBtn('ct3BtnLM', S.a11y.lm, 'LIGHT MODE');
setBtn('ct3BtnNR', S.a11y.nr, 'NARRATION', true);
setBtn('ct3BtnHC', S.a11y.hc, 'HIGH CONTRAST');
setBtn('ct3BtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);
var nar = document.getElementById('ct3Nar' + thisq);
if (nar) nar.classList.toggle('ct3narshow' + thisq, S.a11y.nr);
}
function setBtn(idBase, on, label, withSuffix) {
var b = document.getElementById(idBase + thisq);
if (!b) return;
b.classList.toggle('ct3a11yon' + thisq, on);
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
+ '<div class="ct3root' + thisq + '" role="region" aria-label="Current direction tutorial">'
+ '  <div class="ct3a11y' + thisq + '" role="toolbar" aria-label="Display options">'
+ '    <button type="button" class="ct3a11ybtn' + thisq + '" id="ct3BtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
+ '    <button type="button" class="ct3a11ybtn' + thisq + ' ct3a11yon' + thisq + '" id="ct3BtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
+ '    <button type="button" class="ct3a11ybtn' + thisq + '" id="ct3BtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
+ '    <button type="button" class="ct3a11ybtn' + thisq + '" id="ct3BtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
+ '  </div>'
+ '  <div id="ct3Nar' + thisq + '" class="ct3narbar' + thisq + ' ct3narshow' + thisq + '" role="status" aria-live="polite" aria-atomic="true"></div>'
+ '  <h3 class="ct3title' + thisq + '">Example 2 — Stage 3: Current Directions (Bridge)</h3>'
+ '  <div class="ct3subtitle' + thisq + '">Assign a current direction to each branch. For branches with a battery, you must use the conventional direction (out of the positive terminal externally).</div>'
+ '  <div class="ct3stagebar' + thisq + '" role="navigation" aria-label="Tutorial stages">'
+ '    <span class="ct3pill' + thisq + ' ct3pilldone' + thisq + '">1. Simplify \u2713</span>'
+ '    <span class="ct3pill' + thisq + ' ct3pilldone' + thisq + '">2. Branches \u0026 Loops \u2713</span>'
+ '    <span class="ct3pill' + thisq + ' ct3pillactive' + thisq + '">3. Currents</span>'
+ '    <span class="ct3pill' + thisq + '">4. Polarities</span>'
+ '    <span class="ct3pill' + thisq + '">5. Equations</span>'
+ '  </div>'
+ '  <div class="ct3layout' + thisq + '">'
+ '    <div class="ct3canvasWrap' + thisq + '">'
+ '      <div class="ct3hint' + thisq + '">For each branch, click the half toward which the current should flow. For branches with a battery, the conventional direction is out of the positive (long-plate) terminal externally. Click the same half again to clear.</div>'
+ '      <svg class="ct3svg' + thisq + '" id="ct3Svg' + thisq + '" viewBox="0 0 540 340" role="img" aria-label="Bridge circuit"></svg>'
+ '      <div class="ct3complete' + thisq + '" id="ct3Comp' + thisq + '" role="status"></div>'
+ '    </div>'
+ '    <aside class="ct3side' + thisq + '">'
+ '      <div>'
+ '        <h2 class="ct3sideh' + thisq + '">Branch Currents</h2>'
+ '        <div class="ct3branchlist' + thisq + '" id="ct3List' + thisq + '" aria-live="polite"></div>'
+ '      </div>'
+ '      <div>'
+ '        <h2 class="ct3sideh' + thisq + '">Feedback</h2>'
+ '        <div class="ct3fb' + thisq + '" id="ct3Fb' + thisq + '">Click a branch (the half toward which the current should flow) to set its direction. Branches with a battery must follow the conventional direction.</div>'
+ '      </div>'
+ '      <div class="ct3btnrow' + thisq + '">'
+ '        <button type="button" class="ct3btn' + thisq + '" id="ct3BtnReset' + thisq + '" disabled>Clear All Directions</button>'
+ '      </div>'
+ '      <div class="ct3progress' + thisq + '" id="ct3Prog' + thisq + '"></div>'
+ '    </aside>'
+ '  </div>'
+ '  <span class="ct3sr' + thisq + '" id="ct3Live' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
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
+ '<div class="ct3root' + thisq + '">'
+ '  <h3 class="ct3title' + thisq + '">Example 2 — Stage 3: Current Directions (Bridge)</h3>'
+ '  <div class="ct3error' + thisq + '">'
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
// Listen for Stage 2's completion to refresh
document.addEventListener('ctStageComplete', function(e){
if (e.detail && e.detail.stage === 2 && e.detail.thisq === thisq) {
setTimeout(reload, 0);
}
});
if (document.getElementById(rootElId)) {
init();
} else {
document.addEventListener('DOMContentLoaded', init);
}
})();
