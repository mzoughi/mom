(function(){
'use strict';
var thisq = window.ctThisq;
var rootElId = 'ct4Root' + thisq;
var stateKey = 'ctState4_' + thisq;
/* =========================================================
 STATE
========================================================= */
if (!window[stateKey]) {
window[stateKey] = {
a11y: { lm:false, nr:true, hc:false, fs:0 },
circuit: null,
branches: null,        // copy of Stage 3's branches with directions
// For each resistor: { id, label, branchIdx, correctHV, userHV, color }
// correctHV = node name of the high-V end (computed from current direction)
// userHV    = node name the user clicked (or null if unset)
resistors: [],
hasError: false,
hasShownBatteryNote: false  // Hint pedagogy: "for batteries, polarity is built-in"
};
}
var S = window[stateKey];
/* =========================================================
 INIT FROM PRIOR STAGES
========================================================= */
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
var simplified = window['ctStage1Simplified_' + thisq];
var s3 = window['ctState3_' + thisq];
if (!simplified || !simplified.components) {
// Fallback: same simplified circuit
simplified = stage1FallbackForTesting();
}
if (!(s3 && s3.branches && s3.branches.length > 0)) {
return { ok:false, reason:'Complete Stage 3 first \u2014 each branch needs a current direction before resistor polarities can be marked.' };
}
var allDirected = s3.branches.every(function(b){ return b.direction === 'set' && b.fromNode && b.toNode; });
if (!allDirected) {
return { ok:false, reason:'Complete Stage 3 first \u2014 some branches still need a current direction.' };
}
S.circuit = {
components: simplified.components.map(function(c){ return Object.assign({}, c); })
};
S.displayComponents = (simplified.displayComponents || simplified.components).map(function(c){
return Object.assign({}, c);
});
S.branches = s3.branches.map(function(b){
return {
id: b.id, label: b.label, color: b.color,
ids: new Set(b.ids),
comps: S.circuit.components.filter(function(c){ return b.ids.has(c.id); }),
fromNode: b.fromNode, toNode: b.toNode,
endpoints: b.endpoints
};
});
// Build the resistors list, computing the correct high-V terminal for each
S.resistors = [];
S.branches.forEach(function(branch, bIdx){
var path = orderBranchPath(branch.comps, branch.fromNode, branch.toNode);
if (!path) return;
branch.comps.forEach(function(c){
if (c.kind !== 'resistor') return;
var step = path.find(function(s){ return s.comp.id === c.id; });
if (!step) return;
S.resistors.push({
id: c.id,
label: c.label,
branchIdx: bIdx,
color: branch.color,
correctHV: step.enterNode,
userHV: null
});
});
});
return { ok:true };
}
// Walk a branch from fromNode to toNode, returning the ordered list of components
function orderBranchPath(comps, fromNode, toNode) {
var visited = new Set();
var path = [];
var cur = fromNode;
while (cur !== toNode) {
var next = null;
for (var i=0; i<comps.length; i++) {
var c = comps[i];
if (visited.has(c.id)) continue;
if (c.a === cur || c.b === cur) { next = c; break; }
}
if (!next) return null;
visited.add(next.id);
var exitNode = (next.a === cur) ? next.b : next.a;
path.push({ comp: next, enterNode: cur, exitNode: exitNode });
cur = exitNode;
}
return path;
}
/* =========================================================
 LAYOUT (geom-based for the bridge)
========================================================= */
function layout() {
return { L: { width: 540, height: 340 } };
}
function nodePos() {
return {
A:  { x:380, y:30  },
B:  { x:580, y:30  },
CD: { x:380, y:470 },
E:  { x:60,  y:300 },
G:  { x:380, y:200 },
H:  { x:580, y:200 }
};
}
function getById(id) {
return S.circuit.components.find(function(c){return c.id === id;});
}
/* For each branch, compute geometry for the current arrow placement.
 The midpoint comes from the branch's actual component positions (not the
 abstract endpoint midpoint), so parallel branches don't collide. */
function branchGeometry(branch) {
var pos = nodePos();
var ep1 = branch.endpoints[0], ep2 = branch.endpoints[1];
var p1 = pos[ep1], p2 = pos[ep2];
var sumX = 0, sumY = 0, n = 0;
branch.comps.forEach(function(c){
sumX += (c.geom.x1 + c.geom.x2) / 2;
sumY += (c.geom.y1 + c.geom.y2) / 2;
n++;
});
var mx = n > 0 ? sumX / n : (p1.x + p2.x) / 2;
var my = n > 0 ? sumY / n : (p1.y + p2.y) / 2;
var dx = p2.x - p1.x, dy = p2.y - p1.y;
var len = Math.sqrt(dx*dx + dy*dy);
if (len > 0) { dx /= len; dy /= len; }
return {
midX: mx, midY: my,
dx: dx, dy: dy, length: len,
ep1: ep1, ep2: ep2, ep1Pos: p1, ep2Pos: p2
};
}
/* For a resistor body, click zones at each terminal.
 Returns { ep1Zone, ep2Zone, ep1Node, ep2Node, body coords... }
 ep1Node = the resistor terminal closer to (x1,y1) in the geom; ep2Node = closer to (x2,y2).
*/
function resistorTerminalZones(comp) {
var x1 = comp.geom.x1, y1 = comp.geom.y1, x2 = comp.geom.x2, y2 = comp.geom.y2;
var mx = (x1+x2)/2, my = (y1+y2)/2;
var dx = x2-x1, dy = y2-y1;
var len = Math.sqrt(dx*dx + dy*dy);
var ux = dx/len, uy = dy/len;
// The resistor's two endpoints in the geom:
//   end1 = (x1,y1) — corresponds to whichever node (a or b) lives at this position
//   end2 = (x2,y2) — the other terminal
// We need to map (x1,y1)->actual node name based on the topology.
// Convention used in our circuit: c.geom is drawn from c.a to c.b OR from one end to the other;
// we don't know which. So look up the node at each end via nodePos().
var pos = nodePos();
var ep1Node = nodeNearestPosition(comp, x1, y1);
var ep2Node = nodeNearestPosition(comp, x2, y2);
// Click zone: half the body length from the midpoint toward each endpoint.
var zoneSize = 28;
var zoneOffset = 16;
var z1cx = mx - ux*zoneOffset, z1cy = my - uy*zoneOffset;
var z2cx = mx + ux*zoneOffset, z2cy = my + uy*zoneOffset;
return {
ep1Zone: { cx: z1cx, cy: z1cy, w: zoneSize, h: zoneSize },
ep2Zone: { cx: z2cx, cy: z2cy, w: zoneSize, h: zoneSize },
ep1Node: ep1Node, ep2Node: ep2Node,
midX: mx, midY: my, dx: ux, dy: uy, length: len
};
}
/* For a component's terminal at screen position (x,y), find which of c.a or c.b it represents.
 We use the geom convention: (geom.x1,geom.y1) corresponds to comp.a; (geom.x2,geom.y2)
 corresponds to comp.b. This is more reliable than geometric distance to nodePos(),
 because some "nodes" (like the A bus or CD rail) span multiple x positions. */
function nodeNearestPosition(comp, x, y) {
var dx1 = comp.geom.x1 - x, dy1 = comp.geom.y1 - y;
var dx2 = comp.geom.x2 - x, dy2 = comp.geom.y2 - y;
var d2_1 = dx1*dx1 + dy1*dy1;
var d2_2 = dx2*dx2 + dy2*dy2;
return d2_1 < d2_2 ? comp.a : comp.b;
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
var svg = document.getElementById('ct4Svg' + thisq);
if (!svg) return;
while (svg.firstChild) svg.removeChild(svg.firstChild);
var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
t.textContent = 'Simplified circuit with currents and resistor polarities';
var d = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
d.textContent = describeCircuit();
svg.appendChild(t); svg.appendChild(d);
drawSkeletonWires(svg);
var displayList = S.displayComponents || S.circuit.components;
displayList.forEach(function(c){
drawComponent(svg, c);
});
svg.appendChild(svgEl('circle', { cx:380, cy:30, r:3.5, 'class':'ct4node' }));
svg.appendChild(svgEl('circle', { cx:580, cy:30, r:3.5, 'class':'ct4node' }));
[{x:60, y:470}, {x:380, y:470}, {x:580, y:470}, {x:820, y:470}].forEach(function(p){
svg.appendChild(svgEl('circle', { cx:p.x, cy:p.y, r:3.5, 'class':'ct4node' }));
});
S.branches.forEach(function(b){ drawCurrentArrow(svg, b); });
S.resistors.forEach(function(r){ drawResistorOverlay(svg, r); });
}
function drawSkeletonWires(svg) {
// Top horizontal rail
svg.appendChild(svgEl('line', {x1:60,  y1:30,  x2:90,  y2:30,  'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:290, y1:30,  x2:380, y2:30,  'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:380, y1:30,  x2:410, y2:30,  'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:550, y1:30,  x2:580, y2:30,  'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:580, y1:30,  x2:610, y2:30,  'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:770, y1:30,  x2:820, y2:30,  'class':'ct4wire'}));
// Right vertical
svg.appendChild(svgEl('line', {x1:820, y1:30,  x2:820, y2:470, 'class':'ct4wire'}));
// Bottom horizontal rail
svg.appendChild(svgEl('line', {x1:60,  y1:470, x2:820, y2:470, 'class':'ct4wire'}));
// Left vertical
svg.appendChild(svgEl('line', {x1:60,  y1:30,  x2:60,  y2:360, 'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:60,  y1:440, x2:60,  y2:470, 'class':'ct4wire'}));
// R7-E2 stack
svg.appendChild(svgEl('line', {x1:380, y1:30,  x2:380, y2:90,  'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:380, y1:190, x2:380, y2:210, 'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:380, y1:330, x2:380, y2:470, 'class':'ct4wire'}));
// R4-E1 stack
svg.appendChild(svgEl('line', {x1:580, y1:30,  x2:580, y2:90,  'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:580, y1:190, x2:580, y2:210, 'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:580, y1:330, x2:580, y2:470, 'class':'ct4wire'}));
}
function drawComponent(svg, c) {
if (c.kind === 'absorbed') return;
if (c.kind === 'wire') {
svg.appendChild(svgEl('line', {
x1: c.geom.x1, y1: c.geom.y1, x2: c.geom.x2, y2: c.geom.y2,
'class':'ct4wire'
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
svg.appendChild(svgEl('line', {x1:x1, y1:y1, x2:bodyLeftX, y2:bodyLeftY, 'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:bodyRightX, y1:bodyRightY, x2:x2, y2:y2, 'class':'ct4wire'}));
svg.appendChild(svgEl('rect', {
x:-halfLen, y:-bodyW/2, width:bodyLen, height:bodyW, rx:3, ry:3,
transform: transform, 'class':'ct4comp'
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
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ct4label'}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+18, 'class':'ct4val'}, fmt(c.value) + ' \u03a9'));
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
// Determine which screen end is the positive terminal (c.a).
// c.a's screen position: nodePos()[c.a].
var pos = nodePos();
var aPos = pos[c.a];
// Check whether c.a is closer to (x1,y1) or (x2,y2)
var aIsAtEnd1 = aPos ? ((aPos.x-x1)*(aPos.x-x1) + (aPos.y-y1)*(aPos.y-y1)
< (aPos.x-x2)*(aPos.x-x2) + (aPos.y-y2)*(aPos.y-y2)) : true;
// Long plate goes on the side closer to c.a (positive)
var longCx, longCy, shortCx, shortCy;
if (aIsAtEnd1) {
longCx = mx - ux*plateGapHalf; longCy = my - uy*plateGapHalf;
shortCx = mx + ux*plateGapHalf; shortCy = my + uy*plateGapHalf;
} else {
longCx = mx + ux*plateGapHalf; longCy = my + uy*plateGapHalf;
shortCx = mx - ux*plateGapHalf; shortCy = my - uy*plateGapHalf;
}
var lp1x = longCx + px*longLen/2,  lp1y = longCy + py*longLen/2;
var lp2x = longCx - px*longLen/2,  lp2y = longCy - py*longLen/2;
var sp1x = shortCx + px*shortLen/2, sp1y = shortCy + py*shortLen/2;
var sp2x = shortCx - px*shortLen/2, sp2y = shortCy - py*shortLen/2;
var leadStartX = aIsAtEnd1 ? x1 : x1, leadStartY = aIsAtEnd1 ? y1 : y1;
var leadEndX = aIsAtEnd1 ? x2 : x2,    leadEndY = aIsAtEnd1 ? y2 : y2;
svg.appendChild(svgEl('line', {x1:leadStartX, y1:leadStartY, x2:longCx, y2:longCy, 'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:lp1x, y1:lp1y, x2:lp2x, y2:lp2y, 'class':'ct4wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:sp1x, y1:sp1y, x2:sp2x, y2:sp2y, 'class':'ct4wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:shortCx, y1:shortCy, x2:leadEndX, y2:leadEndY, 'class':'ct4wire'}));
var pxL = px, pyL = py;
if (pxL * (mx-440) + pyL * (my-250) < 0) { pxL = -pxL; pyL = -pyL; }
var labOff = 22;
var labX = mx + pxL*labOff, labY = my + pyL*labOff;
svg.appendChild(svgEl('text', {x:labX, y:labY-2, 'class':'ct4label'}, c.label));
svg.appendChild(svgEl('text', {x:labX, y:labY+18, 'class':'ct4val'}, c.value + ' V'));
}
function drawBatteryHorizontal(svg, c, cx, cy) {
// E1: c.a=n1 is the positive plate. n1 is at (270, 60), accessed through the right side.
var longLen = 26, shortLen = 14;
var plateGapHalf = 4;
var longX = cx + plateGapHalf;
var shortX = cx - plateGapHalf;
svg.appendChild(svgEl('line', {x1:cx-30, y1:cy, x2:shortX, y2:cy, 'class':'ct4wire'}));
svg.appendChild(svgEl('line', {x1:shortX, y1:cy-shortLen/2, x2:shortX, y2:cy+shortLen/2, 'class':'ct4wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX,  y1:cy-longLen/2,  x2:longX,  y2:cy+longLen/2,  'class':'ct4wire', 'stroke-width':2.5}));
svg.appendChild(svgEl('line', {x1:longX, y1:cy, x2:cx+30, y2:cy, 'class':'ct4wire'}));
svg.appendChild(svgEl('text', {x:cx, y:cy-longLen/2-6, 'class':'ct4label'}, c.label));
svg.appendChild(svgEl('text', {x:cx, y:cy+longLen/2+14, 'class':'ct4val'}, c.value + ' V'));
}
function drawCurrentArrow(svg, branch) {
var color = branch.color || '#00d4ff';
// Find the outer component touching fromNode (whose body axis the arrow follows)
var fromComp = null;
branch.comps.forEach(function(c){
if (c.a === branch.fromNode || c.b === branch.fromNode) fromComp = c;
});
if (!fromComp) fromComp = branch.comps[0];
// Direction along fromComp's body, fromNode → other end
var fromEndX, fromEndY, toEndX, toEndY;
if (fromComp.a === branch.fromNode) {
fromEndX = fromComp.geom.x1; fromEndY = fromComp.geom.y1;
toEndX = fromComp.geom.x2; toEndY = fromComp.geom.y2;
} else {
fromEndX = fromComp.geom.x2; fromEndY = fromComp.geom.y2;
toEndX = fromComp.geom.x1; toEndY = fromComp.geom.y1;
}
var dx = toEndX - fromEndX, dy = toEndY - fromEndY;
var len = Math.sqrt(dx*dx + dy*dy);
if (len === 0) return;
var ux = dx/len, uy = dy/len;
var arrowMidX = (fromComp.geom.x1 + fromComp.geom.x2) / 2;
var arrowMidY = (fromComp.geom.y1 + fromComp.geom.y2) / 2;
var px = -uy, py = ux;
if (arrowMidY < 50) { px = 0; py = 1; }
else if (arrowMidY > 440) { px = 0; py = -1; }
else {
if (px * (arrowMidX - 440) + py * (arrowMidY - 250) < 0) { px = -px; py = -py; }
}
var arrowOffset = 22;
var ax = arrowMidX + px*arrowOffset, ay = arrowMidY + py*arrowOffset;
var shaftLen = 28, headLen = 6, headHalfW = 4;
var tailX = ax - ux*shaftLen/2, tailY = ay - uy*shaftLen/2;
var headX = ax + ux*shaftLen/2, headY = ay + uy*shaftLen/2;
svg.appendChild(svgEl('line', {
x1: tailX, y1: tailY,
x2: headX - ux*headLen*0.6, y2: headY - uy*headLen*0.6,
'class':'ct4arrow', stroke: color
}));
var hx1 = headX - ux*headLen + px*headHalfW;
var hy1 = headY - uy*headLen + py*headHalfW;
var hx2 = headX - ux*headLen - px*headHalfW;
var hy2 = headY - uy*headLen - py*headHalfW;
svg.appendChild(svgEl('polygon', {
points: headX+','+headY+' '+hx1+','+hy1+' '+hx2+','+hy2,
'class':'ct4arrowhead', fill: color
}));
var labOff = 12;
svg.appendChild(svgEl('text', {
x: tailX + px*labOff - ux*4, y: tailY + py*labOff - uy*4 + 4,
'class':'ct4currlabel', 'text-anchor':'middle', fill: color
}, branch.label));
}
function drawResistorOverlay(svg, rEntry) {
var comp = getById(rEntry.id);
if (!comp) return;
var zones = resistorTerminalZones(comp);
// Zone 1: toward ep1Node
var z1 = zones.ep1Zone;
var rect1 = svgEl('rect', {
x: z1.cx - z1.w/2, y: z1.cy - z1.h/2, width: z1.w, height: z1.h,
'class': 'ct4zone',
tabindex: 0, role: 'button',
'data-rid': rEntry.id, 'data-ep': zones.ep1Node,
'aria-label': 'Mark ' + zones.ep1Node + ' end of ' + comp.label + ' as high voltage'
});
attachZoneHandlers(rect1, rEntry, zones.ep1Node);
svg.appendChild(rect1);
var z2 = zones.ep2Zone;
var rect2 = svgEl('rect', {
x: z2.cx - z2.w/2, y: z2.cy - z2.h/2, width: z2.w, height: z2.h,
'class': 'ct4zone',
tabindex: 0, role: 'button',
'data-rid': rEntry.id, 'data-ep': zones.ep2Node,
'aria-label': 'Mark ' + zones.ep2Node + ' end of ' + comp.label + ' as high voltage'
});
attachZoneHandlers(rect2, rEntry, zones.ep2Node);
svg.appendChild(rect2);
// Draw "+" at the marked terminal
if (rEntry.userHV) {
// Place the + at the actual component terminal, not at the abstract node position.
// For "CD", the canonical position is (380, 470), but R3's CD-side terminal
// is actually at (770, 30) — using pos[node] would put the + far from the resistor.
var markedAtEp1 = (rEntry.userHV === zones.ep1Node);
var markPos = markedAtEp1
? { x: comp.geom.x1, y: comp.geom.y1 }
: { x: comp.geom.x2, y: comp.geom.y2 };
// Place the "+" inset toward the body midpoint by ~20px (so it sits near the resistor body
// but on the marked end's side).
var ux = zones.dx, uy = zones.dy;
// Direction from terminal toward body center
var towardCenterX = zones.midX, towardCenterY = zones.midY;
var dxc = towardCenterX - markPos.x, dyc = towardCenterY - markPos.y;
var lc = Math.sqrt(dxc*dxc + dyc*dyc);
if (lc > 0) {
var insetDist = Math.min(28, lc * 0.4);
var symX = markPos.x + (dxc/lc) * insetDist;
var symY = markPos.y + (dyc/lc) * insetDist;
// Then nudge perpendicular to the body so it doesn't sit ON the wire.
// For top-row resistors push DOWN; bottom-row push UP; otherwise away from center.
var px2 = -uy, py2 = ux;
if (zones.midY < 50) { px2 = 0; py2 = 1; }
else if (zones.midY > 440) { px2 = 0; py2 = -1; }
else {
if (px2 * (zones.midX-440) + py2 * (zones.midY-250) < 0) { px2 = -px2; py2 = -py2; }
}
symX += px2 * 8;
symY += py2 * 8;
svg.appendChild(svgEl('text', {
x: symX, y: symY, 'class': 'ct4plus'
}, '+'));
}
}
}
function attachZoneHandlers(el, rEntry, towardNode) {
el.addEventListener('click', function(){ markHighV(rEntry, towardNode); });
el.addEventListener('keydown', function(ev){
if (ev.key === 'Enter' || ev.key === ' ') {
ev.preventDefault();
markHighV(rEntry, towardNode);
}
});
}
/* =========================================================
 CLICK HANDLER
========================================================= */
function markHighV(rEntry, clickedNode) {
var comp = getById(rEntry.id);
// Toggle: if already marked at this terminal, clear.
if (rEntry.userHV === clickedNode) {
rEntry.userHV = null;
setFeedback('Polarity cleared for ' + comp.label + '.', 'info');
announce('Polarity cleared for ' + comp.label + '.');
refreshUI();
return;
}
if (clickedNode !== rEntry.correctHV) {
var branch = S.branches[rEntry.branchIdx];
setFeedback(
'<strong>Not the high-voltage end.</strong> '
+ 'In ' + comp.label + ', conventional current enters from the '
+ rEntry.correctHV + ' side (where ' + branch.label + ' flows in). '
+ 'The terminal where current ENTERS the resistor is at higher potential. '
+ 'Try clicking the other end.',
'bad');
announce('Incorrect. The high-voltage end is where current enters the resistor.');
return;
}
rEntry.userHV = clickedNode;
setFeedback(
'<strong>Correct \u2014 ' + comp.label + ' high-V end is at ' + clickedNode + '.</strong> '
+ 'Conventional current enters here, so this terminal is at higher potential. '
+ 'Through a resistor, V drops in the direction of current flow (V = IR).',
'good');
announce(comp.label + ' high-V end set at ' + clickedNode + '.');
refreshUI();
}
/* =========================================================
 UI
========================================================= */
function refreshUI() {
render();
updateList();
updateButtons();
updateProgress();
}
function updateList() {
var div = document.getElementById('ct4List' + thisq);
if (!div) return;
if (S.resistors.length === 0) {
div.innerHTML = '<span style="color:#7a8aaa;font-style:italic;">No resistors.</span>';
return;
}
div.innerHTML = S.resistors.map(function(r){
var statusCls = r.userHV ? 'ct4statset' : 'ct4statunset';
var statusText = r.userHV ? 'Marked' : 'Unset';
return '<div class="ct4item'+'">'
+ '<span class="ct4itemlabel'+'">'+r.label+'</span>'
+ '<span class="ct4itemstatus'+' '+statusCls+'">'+statusText+'</span>'
+ '</div>';
}).join('');
}
function updateButtons() {
var btn = document.getElementById('ct4BtnReset' + thisq);
if (btn) btn.disabled = !S.resistors.some(function(r){ return r.userHV; });
}
function updateProgress() {
var note = document.getElementById('ct4Prog' + thisq);
if (!note) return;
var unset = S.resistors.filter(function(r){ return !r.userHV; });
if (unset.length === 0) {
note.textContent = 'All ' + S.resistors.length + ' resistor polarities marked.';
checkComplete();
} else {
note.textContent = unset.length + ' resistor' + (unset.length===1?'':'s') + ' still unmarked';
}
}
function checkComplete() {
var allSet = S.resistors.length > 0 && S.resistors.every(function(r){ return !!r.userHV; });
if (!allSet) return;
var banner = document.getElementById('ct4Comp' + thisq);
if (!banner) return;
if (banner.classList.contains('ct4show')) return;
banner.classList.add('ct4show');
var msg = 'All resistor polarities marked. The high-voltage end of each resistor is where its branch current enters. (Battery polarities are inherent: the long plate is the positive terminal.)';
banner.innerHTML = ''
+ '<div class="ct4compmsg' + '">\u2713 ' + msg + '</div>'
+ '<button type="button" class="ct4btn' + ' ct4btnnext' + '" id="ct4BtnNext' + thisq + '">'
+ 'Continue to Stage 5 \u2192</button>';
var nextBtn = document.getElementById('ct4BtnNext' + thisq);
if (nextBtn) {
nextBtn.addEventListener('click', function(){
var ev = new CustomEvent('ctStageComplete', { detail:{ stage:4, thisq:thisq } });
document.dispatchEvent(ev);
var hook = window['ctOnStageComplete_' + thisq];
if (typeof hook === 'function') hook(4);
announce('Advancing to Stage 5: writing equations.');
});
}
announce(msg);
}
function resetMarkings() {
S.resistors.forEach(function(r){ r.userHV = null; });
var banner = document.getElementById('ct4Comp' + thisq);
if (banner) banner.classList.remove('ct4show');
setFeedback('All polarity marks cleared.', 'info');
announce('All polarity marks cleared.');
refreshUI();
}
function setFeedback(msg, tone) {
var fb = document.getElementById('ct4Fb' + thisq);
if (!fb) return;
fb.className = 'ct4fb' + (tone === 'good' ? ' ct4fbgood' : tone === 'bad' ? ' ct4fbbad' : tone === 'info' ? ' ct4fbinfo' : '');
fb.innerHTML = msg;
}
function announce(msg) {
var live = document.getElementById('ct4Live' + thisq);
var nar  = document.getElementById('ct4Nar' + thisq);
if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
if (nar && S.a11y.nr) nar.textContent = msg;
}
function fmt(v) {
if (v == null) return '';
if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
return v.toFixed(2).replace(/\.?0+$/,'');
}
function describeCircuit() {
return S.circuit.components.length + ' components, ' + S.resistors.length + ' resistors to mark.';
}
/* =========================================================
 ACCESSIBILITY
========================================================= */
function applyA11y() {
var root = document.getElementById(rootElId).querySelector('.ct4root');
if (!root) return;
root.classList.toggle('ct4lm', S.a11y.lm);
root.classList.toggle('ct4hc', S.a11y.hc);
var fontSizes = ['14px','16px','19px'];
root.style.setProperty('--ct4fs', fontSizes[S.a11y.fs]);
setBtn('ct4BtnLM', S.a11y.lm, 'LIGHT MODE');
setBtn('ct4BtnNR', S.a11y.nr, 'NARRATION', true);
setBtn('ct4BtnHC', S.a11y.hc, 'HIGH CONTRAST');
setBtn('ct4BtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);
var nar = document.getElementById('ct4Nar' + thisq);
if (nar) nar.classList.toggle('ct4narshow', S.a11y.nr);
}
function setBtn(idBase, on, label, withSuffix) {
var b = document.getElementById(idBase + thisq);
if (!b) return;
b.classList.toggle('ct4a11yon', on);
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
+ '<div class="ct4root' + '" role="region" aria-label="Resistor polarity tutorial">'
+ '  <div class="ct4a11y' + '" role="toolbar" aria-label="Display options">'
+ '    <button type="button" class="ct4a11ybtn' + '" id="ct4BtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
+ '    <button type="button" class="ct4a11ybtn' + ' ct4a11yon' + '" id="ct4BtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
+ '    <button type="button" class="ct4a11ybtn' + '" id="ct4BtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
+ '    <button type="button" class="ct4a11ybtn' + '" id="ct4BtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
+ '  </div>'
+ '  <div id="ct4Nar' + thisq + '" class="ct4narbar' + ' ct4narshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
+ '  <h3 class="ct4title' + '">Example 3 — Stage 4: Resistor Polarities</h3>'
+ '  <div class="ct4subtitle' + '">Mark the high-voltage end of each resistor by clicking the terminal where the current enters. Battery polarities are already shown by the long (+) and short (\u2212) plates.</div>'
+ '  <div class="ct4stagebar' + '" role="navigation" aria-label="Tutorial stages">'
+ '    <span class="ct4pill' + ' ct4pilldone' + '">1. Simplify \u2713</span>'
+ '    <span class="ct4pill' + ' ct4pilldone' + '">2. Branches \u0026 Loops \u2713</span>'
+ '    <span class="ct4pill' + ' ct4pilldone' + '">3. Currents \u2713</span>'
+ '    <span class="ct4pill' + ' ct4pillactive' + '">4. Polarities</span>'
+ '    <span class="ct4pill' + '">5. Equations</span>'
+ '  </div>'
+ '  <div class="ct4layout' + '">'
+ '    <div class="ct4canvasWrap' + thisq + '">'
+ '      <div class="ct4hint' + '">For each resistor, click the half where the branch current enters \u2014 that is the high-voltage end. Click the same end again to clear.</div>'
+ '      <svg class="ct4svg' + '" id="ct4Svg' + thisq + '" viewBox="0 0 880 510" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Simplified circuit"></svg>'
+ '      <div class="ct4complete' + '" id="ct4Comp' + thisq + '" role="status"></div>'
+ '    </div>'
+ '    <aside class="ct4side' + '">'
+ '      <div>'
+ '        <h2 class="ct4sideh' + '">Resistors</h2>'
+ '        <div class="ct4list' + '" id="ct4List' + thisq + '" aria-live="polite"></div>'
+ '      </div>'
+ '      <div>'
+ '        <h2 class="ct4sideh' + '">Feedback</h2>'
+ '        <div class="ct4fb' + '" id="ct4Fb' + thisq + '">Click the half of a resistor where the branch current enters to mark it as the high-voltage (+) end.</div>'
+ '      </div>'
+ '      <div class="ct4btnrow' + '">'
+ '        <button type="button" class="ct4btn' + '" id="ct4BtnReset' + thisq + '" disabled>Clear All Marks</button>'
+ '      </div>'
+ '      <div class="ct4progress' + '" id="ct4Prog' + thisq + '"></div>'
+ '    </aside>'
+ '  </div>'
+ '  <span class="ct4sr' + '" id="ct4Live' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
+ '</div>';
root.innerHTML = html;
document.getElementById('ct4BtnReset' + thisq).addEventListener('click', resetMarkings);
document.getElementById('ct4BtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
document.getElementById('ct4BtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
document.getElementById('ct4BtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
document.getElementById('ct4BtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
}
function buildErrorDOM(reason) {
var root = document.getElementById(rootElId);
root.innerHTML = ''
+ '<div class="ct4root' + '">'
+ '  <h3 class="ct4title' + '">Example 3 — Stage 4: Resistor Polarities</h3>'
+ '  <div class="ct4error' + '">'
+ '    <strong>Cannot start Stage 4.</strong><br>' + reason
+ '  </div>'
+ '</div>';
}
/* =========================================================
 INIT
========================================================= */
function init() {
var res = loadFromPriorStages();
if (!res.ok) { S.hasError = true; buildErrorDOM(res.reason); return; }
S.hasError = false;
buildDOM();
applyA11y();
refreshUI();
var msg = 'Stage 4 ready. Mark the high-voltage end of each of the ' + S.resistors.length + ' resistor' + (S.resistors.length===1?'':'s') + '. The high-V end is where current enters the resistor.';
announce(msg);
}
function reload() {
S.resistors = []; S.branches = null; S.circuit = null; S.hasError = false;
init();
}
document.addEventListener('ctStageComplete', function(e){
if (e.detail && e.detail.thisq === thisq) {
if (e.detail.stage === 1 && e.detail.simplifiedCircuit) {
window['ctStage1Simplified_' + thisq] = e.detail.simplifiedCircuit;
}
if (e.detail.stage === 3) {
setTimeout(reload, 0);
}
}
});
if (document.getElementById(rootElId)) init();
else document.addEventListener('DOMContentLoaded', init);
})();
