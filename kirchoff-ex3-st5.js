(function(){
'use strict';
var thisq = window.ctThisq;
var rootElId = 'ct5Root' + thisq;
var stateKey = 'ctState5_' + thisq;
/* =========================================================
 STATE
========================================================= */
if (!window[stateKey]) {
window[stateKey] = {
a11y: { lm:false, nr:true, hc:false, fs:0 },
circuit: null,
branches: null,           // [{ id, label, ids, comps, fromNode, toNode }]
loops: null,              // [{ id, ids, label }]
junctions: null,          // [nodeName]
// Term chips: [{ id, display, type:'I'|'IR'|'eps', branchLabel, compId, sign:0|+1|-1 }]
chips: [],
// Current equation being built: chips' signs
currentEqType: 'kvl',     // 'kcl' or 'kvl'
currentEqLoopIdx: 0,      // index into S.loops (only used when type='kvl')
// Confirmed equations: [{ type, loopIdx?, terms: [{chipId, sign}], coeffs, rhs }]
confirmedEqs: [],
// Computed solution
solution: null,           // { I1: number, I2: number, ... }
hasError: false
};
}
var S = window[stateKey];
/* =========================================================
 INIT
========================================================= */
function stage1FallbackForTesting() {
return {
components: [
{ id:'R8', kind:'resistor', value:4, a:'E', b:'A', label:'R\u2088\u208a\u2089\u2225\u2081\u2080\u208a\u2081\u2081',
geom: { x1:90, y1:30, x2:290, y2:30 } },
{ id:'R5', kind:'resistor', value:6, a:'A', b:'B', label:'R\u2085\u208a\u2086',
geom: { x1:410, y1:30, x2:550, y2:30 } },
{ id:'R3', kind:'resistor', value:6, a:'B', b:'CD', label:'R\u2083\u208a\u2081\u208a\u2082',
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
]
};
}
function loadFromPriorStages() {
var simplified = window['ctStage1Simplified_' + thisq];
var s2 = window['ctState2_' + thisq];
var s3 = window['ctState3_' + thisq];
var s4 = window['ctState4_' + thisq];
if (!simplified || !simplified.components) {
simplified = stage1FallbackForTesting();
}
if (!(s3 && s3.branches && s3.branches.length > 0 && s3.branches.every(function(b){return b.direction==='set';}))) {
return { ok:false, reason:'Complete Stage 3 first \u2014 each branch needs a current direction.' };
}
if (!(s4 && s4.resistors && s4.resistors.length > 0 && s4.resistors.every(function(r){return r.userHV;}))) {
return { ok:false, reason:'Complete Stage 4 first \u2014 each resistor needs its high-voltage end marked.' };
}
if (!(s2 && s2.foundLoops && s2.foundLoops.length > 0)) {
return { ok:false, reason:'Stage 2 loops are missing. Re-run Stage 2.' };
}
S.circuit = {
components: simplified.components.map(function(c){ return Object.assign({}, c); })
};
S.branches = s3.branches.map(function(b){
return {
id: b.id, label: b.label,
ids: new Set(b.ids),
comps: S.circuit.components.filter(function(c){return b.ids.has(c.id);}),
fromNode: b.fromNode, toNode: b.toNode
};
});
// Loops: take from Stage 2. We label them L1, L2, ...
S.loops = s2.foundLoops.map(function(l, i){
return {
id: 'L' + (i+1),
label: 'Loop ' + (i+1),
ids: new Set(l.ids)
};
});
S.junctions = findJunctions();
buildChips();
return { ok:true };
}
function findJunctions() {
var seen = new Set();
S.circuit.components.forEach(function(c){ seen.add(c.a); seen.add(c.b); });
var result = [];
seen.forEach(function(n){
var d = 0;
S.circuit.components.forEach(function(c){ if (c.a===n) d++; if (c.b===n) d++; });
if (d >= 3) result.push(n);
});
return result;
}
/* =========================================================
 CHIPS — the legal terms in this circuit's equations.
 For KCL: ±I_i for each branch.
 For KVL: ±I_i·R_j for each resistor (with branch's I), ±ε_k for each battery.
========================================================= */
function buildChips() {
S.chips = [];
// Current chips (for KCL)
S.branches.forEach(function(b){
S.chips.push({
id: 'I_' + b.id,
display: b.label,
type: 'I',
branchLabel: b.label,
sign: 0
});
});
// I·R chips (for KVL)
S.circuit.components.forEach(function(c){
if (c.kind === 'resistor') {
var branch = S.branches.find(function(b){return b.ids.has(c.id);});
if (!branch) return;
S.chips.push({
id: 'IR_' + c.id,
display: branch.label + c.label,
type: 'IR',
branchLabel: branch.label,
compId: c.id,
sign: 0
});
}
});
// EMF chips (for KVL)
S.circuit.components.forEach(function(c){
if (c.kind === 'battery') {
S.chips.push({
id: 'eps_' + c.id,
display: '\u03b5' + c.label.replace(/^E/, ''),  // E1 -> ε1
type: 'eps',
compId: c.id,
sign: 0
});
}
});
}
/* =========================================================
 CHIP INTERACTION: cycle 0 -> +1 -> -1 -> 0
========================================================= */
function cycleChip(chipId) {
var chip = S.chips.find(function(c){return c.id === chipId;});
if (!chip) return;
chip.sign = (chip.sign === 0) ? +1 : (chip.sign === +1) ? -1 : 0;
refreshUI();
}
function clearAllChips() {
S.chips.forEach(function(c){ c.sign = 0; });
}
/* =========================================================
 CANONICAL EQUATIONS
========================================================= */
function getById(id) { return S.circuit.components.find(function(c){return c.id===id;}); }
function orderBranchPath(branchComps, fromNode, toNode) {
var visited = new Set();
var path = [];
var cur = fromNode;
while (cur !== toNode) {
var next = null;
for (var i=0; i<branchComps.length; i++) {
var c = branchComps[i];
if (visited.has(c.id)) continue;
if (c.a === cur || c.b === cur) { next = c; break; }
}
if (!next) return null;
visited.add(next.id);
var exit = (next.a === cur) ? next.b : next.a;
path.push({ comp: next, enterNode: cur, exitNode: exit });
cur = exit;
}
return path;
}
function orderLoopWalk(loopIds, startComp, startNode) {
var compsInLoop = S.circuit.components.filter(function(c){return loopIds.has(c.id);});
var visited = new Set([startComp.id]);
var result = [{ comp: startComp,
enterNode: startNode,
exitNode: (startComp.a === startNode) ? startComp.b : startComp.a }];
var cur = result[0].exitNode;
while (visited.size < compsInLoop.length) {
var next = null;
for (var i=0; i<compsInLoop.length; i++) {
var c = compsInLoop[i];
if (visited.has(c.id)) continue;
if (c.a === cur || c.b === cur) { next = c; break; }
}
if (!next) return null;
visited.add(next.id);
var exit = (next.a === cur) ? next.b : next.a;
result.push({ comp: next, enterNode: cur, exitNode: exit });
cur = exit;
}
return result;
}
function branchOf(compId) {
return S.branches.find(function(b){return b.ids.has(compId);});
}
function canonicalKCL(junction) {
var coeffs = {};
S.branches.forEach(function(b){
if (b.toNode === junction) coeffs[b.label] = +1;
else if (b.fromNode === junction) coeffs[b.label] = -1;
});
return { coeffs: coeffs, rhs: 0 };
}
function canonicalKVL(loopIds) {
var compsInLoop = S.circuit.components.filter(function(c){return loopIds.has(c.id);});
if (compsInLoop.length === 0) return null;
var startComp = compsInLoop[0];
var walk = orderLoopWalk(loopIds, startComp, startComp.a);
if (!walk) return null;
var coeffs = {};
walk.forEach(function(step){
var c = step.comp;
var branch = branchOf(c.id);
if (c.kind === 'resistor') {
var branchComps = S.circuit.components.filter(function(x){return branch.ids.has(x.id);});
var bp = orderBranchPath(branchComps, branch.fromNode, branch.toNode);
var stepInBranch = bp.find(function(s){return s.comp.id === c.id;});
var aligned = (step.enterNode === stepInBranch.enterNode);
var sign = aligned ? -1 : +1;
coeffs[branch.label] = (coeffs[branch.label] || 0) + sign * c.value;
} else if (c.kind === 'battery') {
// c.a = positive plate, c.b = negative plate (Stage 1 convention)
var sign2 = (step.enterNode === c.b) ? +1 : -1;
var key = 'eps_' + c.id;
coeffs[key] = (coeffs[key] || 0) + sign2 * c.value;
}
});
return { coeffs: coeffs, rhs: 0 };
}
/* =========================================================
 STUDENT EQUATION VECTORIZATION
========================================================= */
function studentEqFromChips() {
var coeffs = {};
S.chips.forEach(function(chip){
if (chip.sign === 0) return;
if (chip.type === 'I') {
coeffs[chip.branchLabel] = (coeffs[chip.branchLabel] || 0) + chip.sign;
} else if (chip.type === 'IR') {
var comp = getById(chip.compId);
coeffs[chip.branchLabel] = (coeffs[chip.branchLabel] || 0) + chip.sign * comp.value;
} else if (chip.type === 'eps') {
var comp2 = getById(chip.compId);
var key = 'eps_' + chip.compId;
coeffs[key] = (coeffs[key] || 0) + chip.sign * comp2.value;
}
});
return { coeffs: coeffs, rhs: 0 };
}
/* =========================================================
 EQUIVALENCE
========================================================= */
function vectorize(eq) {
// Build a vector over [I1..In, eps_X1..eps_Xm, "1"]. Last element is -rhs.
var allKeys = [];
S.branches.forEach(function(b){ allKeys.push(b.label); });
S.circuit.components.forEach(function(c){ if (c.kind === 'battery') allKeys.push('eps_' + c.id); });
var v = allKeys.map(function(k){ return eq.coeffs[k] || 0; });
v.push(-eq.rhs);
return v;
}
function areEquivalent(eq1, eq2) {
var v1 = vectorize(eq1);
var v2 = vectorize(eq2);
var firstNonzero = -1;
for (var i=0; i<v1.length; i++) if (Math.abs(v1[i]) > 1e-9) { firstNonzero = i; break; }
if (firstNonzero < 0) {
return v2.every(function(x){return Math.abs(x) < 1e-9;});
}
if (Math.abs(v2[firstNonzero]) < 1e-9) return false;
var k = v1[firstNonzero] / v2[firstNonzero];
if (Math.abs(k) < 1e-9) return false;
for (var j=0; j<v1.length; j++) {
if (Math.abs(v1[j] - k * v2[j]) > 1e-6) return false;
}
return true;
}
/* =========================================================
 CHECK BUTTON
========================================================= */
function checkEquation() {
var stuEq = studentEqFromChips();
// Did the student select any terms?
if (Object.keys(stuEq.coeffs).every(function(k){return Math.abs(stuEq.coeffs[k]) < 1e-9;})) {
setFeedback('Select at least one term before checking.', 'info');
return;
}
var canonical = null;
var label = '';
if (S.currentEqType === 'kcl') {
// Try KCL at every junction; accept if equivalent to any one.
var matchedJunction = null;
for (var ji = 0; ji < S.junctions.length; ji++) {
var c = canonicalKCL(S.junctions[ji]);
if (areEquivalent(stuEq, c)) {
canonical = c;
matchedJunction = S.junctions[ji];
break;
}
}
if (!canonical) {
// No junction matched. Use junction[0] for a useful diagnostic.
canonical = canonicalKCL(S.junctions[0]);
label = 'KCL at any junction';
var diag = diagnoseError(stuEq, canonical);
// Also offer a hint about which junctions are available.
setFeedback('<strong>Not equivalent to KCL at any junction.</strong> '
+ diag + ' (Junctions in this circuit: ' + S.junctions.join(', ') + '.)', 'bad');
announce('Incorrect KCL. ' + diag);
return;
}
label = 'KCL at ' + matchedJunction;
} else {
var loop = S.loops[S.currentEqLoopIdx];
canonical = canonicalKVL(loop.ids);
label = 'KVL around ' + loop.label;
if (!canonical) {
setFeedback('Could not generate the canonical equation.', 'bad');
return;
}
if (!areEquivalent(stuEq, canonical)) {
var diag2 = diagnoseError(stuEq, canonical);
setFeedback('<strong>Not equivalent to ' + label + '.</strong> ' + diag2, 'bad');
announce('Incorrect equation. ' + diag2);
return;
}
}
// Check that this isn't a duplicate (or linearly dependent on existing equations).
// For our simple check: compare against canonical equations of existing eqs.
// For KCL this catches "same junction twice"; for KVL "same loop twice".
// For multiple-junction KCL we want to allow them to be added even though they're
// not all linearly independent; the auto-solve step will pick a maximal independent set.
var dup = S.confirmedEqs.find(function(e){ return areEquivalent(e.canonical, canonical); });
if (dup) {
setFeedback('You\u2019ve already confirmed an equivalent equation (' + dup.label + ').', 'info');
return;
}
// Confirm it
var rendered = renderStudentEq(stuEq);
S.confirmedEqs.push({
type: S.currentEqType,
loopIdx: S.currentEqType === 'kvl' ? S.currentEqLoopIdx : null,
label: label,
rendered: rendered,
canonical: canonical
});
setFeedback('<strong>\u2713 Correct \u2014 ' + label + ' confirmed.</strong>', 'good');
announce('Equation confirmed: ' + label + '.');
clearAllChips();
refreshUI();
tryAutoSolve();
}
function diagnoseError(stuEq, canonical) {
// Compare term-by-term
var stuKeys = Object.keys(stuEq.coeffs);
var canKeys = Object.keys(canonical.coeffs);
// Missing terms
var missing = canKeys.filter(function(k){ return !(k in stuEq.coeffs) || Math.abs(stuEq.coeffs[k]) < 1e-9; });
if (missing.length > 0) {
var displayKeys = missing.map(humanizeKey);
return 'Your equation is missing a term involving ' + displayKeys.join(' and ') + '.';
}
var extra = stuKeys.filter(function(k){ return !(k in canonical.coeffs) || Math.abs(canonical.coeffs[k]) < 1e-9; });
if (extra.length > 0) {
return 'Your equation has an extra term involving ' + extra.map(humanizeKey).join(' and ') + ' that shouldn\u2019t be there.';
}
// Both have the same keys but coefficients don't match. Check for sign error on one term.
var mismatchKeys = canKeys.filter(function(k){
// Allow scalar multiple — check ratio
return false; // we'll handle below
});
// Find the ratio of any one term, then check if other terms differ.
var refKey = canKeys[0];
var ratio = stuEq.coeffs[refKey] / canonical.coeffs[refKey];
for (var i=0; i<canKeys.length; i++) {
var k = canKeys[i];
var expectedStu = ratio * canonical.coeffs[k];
if (Math.abs(stuEq.coeffs[k] - expectedStu) > 1e-6) {
// Term k has wrong sign or coefficient
// Check if simply a sign error
if (Math.abs(stuEq.coeffs[k] + expectedStu) < 1e-6) {
return 'The sign on the ' + humanizeKey(k) + ' term is wrong.';
}
return 'The coefficient of ' + humanizeKey(k) + ' is incorrect.';
}
}
return 'The terms don\u2019t match. Re-check your sign conventions for resistors (V drops in the direction of current) and batteries (V rises from \u2212 to +).';
}
function humanizeKey(k) {
if (k.indexOf('eps_') === 0) {
var compId = k.substring(4);
var c = getById(compId);
return c ? '\u03b5' + c.label.replace(/^E/, '') : k;
}
return k; // already 'I₁' etc.
}
function renderStudentEq(stuEq) {
var parts = [];
S.chips.forEach(function(chip){
if (chip.sign === 0) return;
var sign = chip.sign > 0 ? '+' : '\u2212';
parts.push(sign + ' ' + chip.display);
});
if (parts.length === 0) return '0 = 0';
var first = parts[0];
if (first.indexOf('+ ') === 0) first = first.substring(2); // drop leading +
return [first].concat(parts.slice(1)).join(' ') + ' = 0';
}
/* =========================================================
 SOLVING — once we have enough equations
========================================================= */
function expectedEqCount() {
// For a circuit with N branches and J junctions: 1 KCL + (N - J + 1) KVL.
// Since KCL at any junction is the same equation (up to sign) for our 3-branch
// 2-junction case: 1 KCL + 2 KVL = 3 equations for 3 unknowns.
// More general: count of independent equations = N (number of branch currents).
return S.branches.length;
}
function tryAutoSolve() {
var N = S.branches.length;
var currentLabels = S.branches.map(function(b){return b.label;});
// Build all confirmed equation rows
var allRows = S.confirmedEqs.map(function(entry){
var eq = entry.canonical;
var row = currentLabels.map(function(lbl){return eq.coeffs[lbl] || 0;});
var rhsi = -eq.rhs;
Object.keys(eq.coeffs).forEach(function(k){
if (currentLabels.indexOf(k) < 0) rhsi -= eq.coeffs[k];
});
return { row: row, rhs: rhsi, entry: entry };
});
// Greedy: try adding rows one by one, only keep those that increase the rank.
var pickedA = [], pickedB = [];
for (var i = 0; i < allRows.length && pickedA.length < N; i++) {
var trialA = pickedA.concat([allRows[i].row]);
if (matrixRank(trialA) > pickedA.length) {
pickedA.push(allRows[i].row);
pickedB.push(allRows[i].rhs);
}
}
var indepCount = pickedA.length;
// Update the equations panel to indicate which equations are dependent
updateEquationDependency(allRows, pickedA);
if (indepCount < N) {
// Refresh UI so the dependency tags appear in the list
renderConfirmedEqs();
updateProgress();
return;
}
var x = solveLinear(pickedA, pickedB);
if (!x) {
setFeedback('System could not be solved. Try a different combination of equations.', 'bad');
return;
}
S.solution = {};
currentLabels.forEach(function(lbl, idx){ S.solution[lbl] = x[idx]; });
showSolution();
}
// Compute the rank of a matrix using Gaussian elimination
function matrixRank(A) {
if (A.length === 0) return 0;
var rows = A.length;
var cols = A[0].length;
var M = A.map(function(r){ return r.slice(); });
var rank = 0;
var lead = 0;
for (var r = 0; r < rows && lead < cols; r++) {
var i = r;
while (i < rows && Math.abs(M[i][lead]) < 1e-9) i++;
if (i === rows) {
lead++;
r--;
continue;
}
var tmp = M[i]; M[i] = M[r]; M[r] = tmp;
var pivot = M[r][lead];
for (var k = 0; k < cols; k++) M[r][k] /= pivot;
for (var ii = 0; ii < rows; ii++) {
if (ii !== r) {
var factor = M[ii][lead];
for (var kk = 0; kk < cols; kk++) M[ii][kk] -= factor * M[r][kk];
}
}
rank++;
lead++;
}
return rank;
}
// Mark dependent equations in the confirmed list (purely informational)
function updateEquationDependency(allRows, pickedA) {
// For each entry, mark whether its row is among the picked (independent) ones.
var pickedSet = new Set();
for (var i = 0; i < pickedA.length; i++) {
pickedSet.add(JSON.stringify(pickedA[i]));
}
S.confirmedEqs.forEach(function(entry, i){
entry.isIndependent = pickedSet.has(JSON.stringify(allRows[i].row));
});
}
function solveLinear(A, b) {
var N = A.length;
var M = A.map(function(row, i){ return row.concat(b[i]); });
for (var i=0; i<N; i++) {
var pivot = i;
for (var r=i+1; r<N; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
var tmp = M[i]; M[i] = M[pivot]; M[pivot] = tmp;
if (Math.abs(M[i][i]) < 1e-12) return null;
var div = M[i][i];
for (var c=0; c<N+1; c++) M[i][c] /= div;
for (var r2=0; r2<N; r2++) if (r2 !== i) {
var f = M[r2][i];
for (var c2=0; c2<N+1; c2++) M[r2][c2] -= f * M[i][c2];
}
}
return M.map(function(row){ return row[N]; });
}
function showSolution() {
var div = document.getElementById('ct5Solution' + thisq);
if (!div) return;
div.classList.add('ct5solshow');
var html = '<div class="ct5solhdr' + '">Solution</div><div class="ct5currents' + '">';
var anyNeg = false;
S.branches.forEach(function(b){
var v = S.solution[b.label];
var negative = v < 0;
if (negative) anyNeg = true;
var noteCls = negative ? 'ct5flipped' : 'ct5correct';
var note = negative
? '\u26a0 Negative \u2014 actual current flows opposite to your assigned arrow.'
: '\u2713 Positive \u2014 your assigned direction matches the actual flow.';
html += '<div class="ct5currbox' + '">'
+ '<div class="ct5currlbl' + '">' + b.label + '</div>'
+ '<div class="ct5currval' + '">' + v.toFixed(3) + ' A</div>'
+ '<div class="ct5currnote' + ' ' + noteCls + '">' + note + '</div>'
+ '</div>';
});
html += '</div>';
if (anyNeg) {
html += '<div style="font-size:12px;color:#a8c4f0;line-height:1.5;">'
+ 'A negative current means your initial guess for the arrow direction was the opposite of '
+ 'the actual current. The magnitude is correct; just reverse the arrow. This is exactly how '
+ 'the procedure is supposed to work \u2014 if you\u2019d picked the right direction up front, '
+ 'you\u2019d still get the same magnitude with a positive sign.</div>';
} else {
html += '<div style="font-size:12px;color:#a8c4f0;line-height:1.5;">'
+ 'All currents came out positive \u2014 your direction guesses all matched the actual flow.</div>';
}
div.innerHTML = html;
// Show completion banner with Continue button
var banner = document.getElementById('ct5Comp' + thisq);
if (banner) {
banner.classList.add('ct5show');
banner.innerHTML = ''
+ '<div class="ct5compmsg' + '">\u2713 All equations confirmed and solved.</div>'
+ '<button type="button" class="ct5btn' + ' ct5btnnext' + '" id="ct5BtnDone' + thisq + '">'
+ 'Finish \u2192</button>';
var doneBtn = document.getElementById('ct5BtnDone' + thisq);
if (doneBtn) {
doneBtn.addEventListener('click', function(){
var ev = new CustomEvent('ctStageComplete', { detail:{
stage:5, thisq:thisq, currents: S.solution
}});
document.dispatchEvent(ev);
var hook = window['ctOnStageComplete_' + thisq];
if (typeof hook === 'function') hook(5);
announce('Tutorial complete.');
});
}
}
announce('Solution computed. ' + (anyNeg ? 'Some currents were negative \u2014 directions can be reversed.' : 'All directions matched the actual currents.'));
}
/* =========================================================
 UI
========================================================= */
function refreshUI() {
renderChipGrid();
renderEqDisplay();
renderConfirmedEqs();
updateProgress();
updateButtons();
}
function renderChipGrid() {
var div = document.getElementById('ct5Chips' + thisq);
if (!div) return;
div.innerHTML = '';
// Filter chips by equation type. KCL: I-only. KVL: IR + eps.
var visible = S.chips.filter(function(chip){
if (S.currentEqType === 'kcl') return chip.type === 'I';
return chip.type !== 'I';
});
visible.forEach(function(chip){
var cls = 'ct5chip';
if (chip.sign === +1) cls += ' ct5chipplus';
else if (chip.sign === -1) cls += ' ct5chipminus';
var btn = document.createElement('button');
btn.type = 'button';
btn.className = cls;
btn.setAttribute('aria-pressed', chip.sign !== 0 ? 'true' : 'false');
btn.setAttribute('aria-label', chipAriaLabel(chip));
btn.setAttribute('data-chipid', chip.id);
var prefix = chip.sign === +1 ? '+' : chip.sign === -1 ? '\u2212' : ' ';
btn.textContent = prefix + ' ' + chip.display;
btn.addEventListener('click', function(){ cycleChip(chip.id); });
div.appendChild(btn);
});
}
function chipAriaLabel(chip) {
var s = chip.sign === +1 ? 'plus' : chip.sign === -1 ? 'minus' : 'unselected';
var name = chip.display;
return 'Term ' + name + ', currently ' + s + '. Click to cycle.';
}
function renderEqDisplay() {
var div = document.getElementById('ct5Eq' + thisq);
if (!div) return;
var hasAnyTerm = S.chips.some(function(c){return c.sign !== 0;});
if (!hasAnyTerm) {
div.innerHTML = '<span class="ct5eqempty' + '">No terms selected. Click chips to build the equation.</span>';
return;
}
div.textContent = renderStudentEq(studentEqFromChips());
}
function renderConfirmedEqs() {
var div = document.getElementById('ct5EqList' + thisq);
if (!div) return;
if (S.confirmedEqs.length === 0) {
div.innerHTML = '<span class="ct5eqempty' + '">No equations confirmed yet.</span>';
return;
}
div.innerHTML = S.confirmedEqs.map(function(e, i){
var depTag = '';
// isIndependent is set by updateEquationDependency after each tryAutoSolve.
// If undefined, we treat it as "unknown yet" (don't show a tag).
if (e.isIndependent === false) {
depTag = '<span style="color:#7a8aaa; font-style:italic; font-size:11px; margin-left:6px;">(dependent on others)</span>';
}
return '<div class="ct5eqitem' + '">'
+ '<span class="ct5eqlabel' + '">' + e.label + ':</span>'
+ '<span class="ct5eqtext' + '">' + e.rendered + '</span>'
+ depTag
+ '<button type="button" class="ct5eqremove' + '" data-eqidx="' + i + '" aria-label="Remove">\u2715</button>'
+ '</div>';
}).join('');
var rmBtns = div.querySelectorAll('.ct5eqremove');
rmBtns.forEach(function(btn){
btn.addEventListener('click', function(){
var idx = parseInt(btn.getAttribute('data-eqidx'), 10);
S.confirmedEqs.splice(idx, 1);
var solDiv = document.getElementById('ct5Solution' + thisq);
if (solDiv) solDiv.classList.remove('ct5solshow');
var banner = document.getElementById('ct5Comp' + thisq);
if (banner) banner.classList.remove('ct5show');
S.solution = null;
setFeedback('Equation removed.', 'info');
refreshUI();
});
});
}
function updateProgress() {
var note = document.getElementById('ct5Prog' + thisq);
if (!note) return;
var n = S.confirmedEqs.length;
var need = expectedEqCount();
// Count how many are linearly independent (if known)
var indep = S.confirmedEqs.filter(function(e){ return e.isIndependent !== false; }).length;
if (n === 0) {
note.textContent = '0 of ' + need + ' independent equations';
} else if (indep < need) {
var depCount = n - indep;
note.textContent = indep + ' of ' + need + ' independent equations'
+ (depCount > 0 ? ' (' + depCount + ' dependent)' : '');
} else {
note.textContent = 'All ' + need + ' independent equations confirmed';
}
}
function updateButtons() {
var clrBtn = document.getElementById('ct5BtnClear' + thisq);
if (clrBtn) clrBtn.disabled = !S.chips.some(function(c){return c.sign !== 0;});
}
function setFeedback(msg, tone) {
var fb = document.getElementById('ct5Fb' + thisq);
if (!fb) return;
fb.className = 'ct5fb' + (tone === 'good' ? ' ct5fbgood' : tone === 'bad' ? ' ct5fbbad' : tone === 'info' ? ' ct5fbinfo' : '');
fb.innerHTML = msg;
}
function announce(msg) {
var live = document.getElementById('ct5Live' + thisq);
var nar  = document.getElementById('ct5Nar' + thisq);
if (live) { live.textContent = ''; setTimeout(function(){ live.textContent = msg; }, 50); }
if (nar && S.a11y.nr) nar.textContent = msg;
}
/* =========================================================
 EQ TYPE / LOOP SELECTOR
========================================================= */
function setEqType(t) {
S.currentEqType = t;
clearAllChips();
refreshUI();
var hint = (t === 'kcl')
? 'KCL at the junction: select \u00b1I terms so that incoming currents balance outgoing currents.'
: 'KVL around ' + S.loops[S.currentEqLoopIdx].label + ': pick a walking direction, then for each component you cross add a term: \u2212I\u00b7R if walking with the current through a resistor (V drops), +I\u00b7R if against; +\u03b5 when crossing a battery from \u2212 to + (V rises).';
setFeedback(hint, 'info');
}
function setLoopIdx(i) {
S.currentEqLoopIdx = i;
if (S.currentEqType === 'kvl') setEqType('kvl');
}
/* =========================================================
 ACCESSIBILITY
========================================================= */
function applyA11y() {
var root = document.getElementById(rootElId).querySelector('.ct5root');
if (!root) return;
root.classList.toggle('ct5lm', S.a11y.lm);
root.classList.toggle('ct5hc', S.a11y.hc);
var fontSizes = ['14px','16px','19px'];
root.style.setProperty('--ct5fs', fontSizes[S.a11y.fs]);
setBtn('ct5BtnLM', S.a11y.lm, 'LIGHT MODE');
setBtn('ct5BtnNR', S.a11y.nr, 'NARRATION', true);
setBtn('ct5BtnHC', S.a11y.hc, 'HIGH CONTRAST');
setBtn('ct5BtnFS', S.a11y.fs > 0, 'FONT SIZE: ' + ['NORMAL','LARGE','XL'][S.a11y.fs]);
var nar = document.getElementById('ct5Nar' + thisq);
if (nar) nar.classList.toggle('ct5narshow', S.a11y.nr);
}
function setBtn(idBase, on, label, withSuffix) {
var b = document.getElementById(idBase + thisq);
if (!b) return;
b.classList.toggle('ct5a11yon', on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
b.textContent = withSuffix ? (label + ': ' + (on ? 'ON' : 'OFF')) : label;
}
function toggleA11y(key) {
if (key === 'fs') S.a11y.fs = (S.a11y.fs + 1) % 3;
else S.a11y[key] = !S.a11y[key];
applyA11y();
}
/* =========================================================
 DOM
========================================================= */
function buildDOM() {
var root = document.getElementById(rootElId);
var loopOptions = S.loops.map(function(l, i){
return '<option value="' + i + '">' + l.label + '</option>';
}).join('');
var html = ''
+ '<div class="ct5root' + '" role="region" aria-label="Equations builder">'
+ '  <div class="ct5a11y' + '" role="toolbar" aria-label="Display options">'
+ '    <button type="button" class="ct5a11ybtn' + '" id="ct5BtnLM' + thisq + '" aria-pressed="false">LIGHT MODE</button>'
+ '    <button type="button" class="ct5a11ybtn' + ' ct5a11yon' + '" id="ct5BtnNR' + thisq + '" aria-pressed="true">NARRATION: ON</button>'
+ '    <button type="button" class="ct5a11ybtn' + '" id="ct5BtnHC' + thisq + '" aria-pressed="false">HIGH CONTRAST</button>'
+ '    <button type="button" class="ct5a11ybtn' + '" id="ct5BtnFS' + thisq + '" aria-pressed="false">FONT SIZE: NORMAL</button>'
+ '  </div>'
+ '  <div id="ct5Nar' + thisq + '" class="ct5narbar' + ' ct5narshow' + '" role="status" aria-live="polite" aria-atomic="true"></div>'
+ '  <h3 class="ct5title' + '">Example 3 — Stage 5: Kirchhoff Equations</h3>'
+ '  <div class="ct5subtitle' + '">Build KCL and KVL equations from the term chips below. You need ' + expectedEqCount() + ' independent equations to solve for ' + S.branches.length + ' unknown currents.</div>'
+ '  <div class="ct5stagebar' + '" role="navigation" aria-label="Tutorial stages">'
+ '    <span class="ct5pill' + ' ct5pilldone' + '">1. Simplify \u2713</span>'
+ '    <span class="ct5pill' + ' ct5pilldone' + '">2. Branches \u0026 Loops \u2713</span>'
+ '    <span class="ct5pill' + ' ct5pilldone' + '">3. Currents \u2713</span>'
+ '    <span class="ct5pill' + ' ct5pilldone' + '">4. Polarities \u2713</span>'
+ '    <span class="ct5pill' + ' ct5pillactive' + '">5. Equations</span>'
+ '  </div>'
+ '  <div class="ct5builder' + '">'
+ '    <div class="ct5buildhdr' + '">'
+ '      <label for="ct5EqType' + thisq + '">Equation type:</label>'
+ '      <select id="ct5EqType' + thisq + '" class="ct5select' + '">'
+ '        <option value="kcl">KCL (junction)</option>'
+ '        <option value="kvl">KVL (loop)</option>'
+ '      </select>'
+ '      <label for="ct5LoopSel' + thisq + '">Loop:</label>'
+ '      <select id="ct5LoopSel' + thisq + '" class="ct5select' + '" disabled>'
+          loopOptions
+ '      </select>'
+ '    </div>'
+ '    <div class="ct5chipgrid' + '" id="ct5Chips' + thisq + '" role="group" aria-label="Equation terms">'
+ '    </div>'
+ '    <div class="ct5eqdisplay' + '" id="ct5Eq' + thisq + '"></div>'
+ '    <div class="ct5btnrow' + '">'
+ '      <button type="button" class="ct5btn' + ' ct5btnprimary' + '" id="ct5BtnCheck' + thisq + '">Check Equation</button>'
+ '      <button type="button" class="ct5btn' + ' ct5btndanger' + '" id="ct5BtnClear' + thisq + '" disabled>Clear Terms</button>'
+ '    </div>'
+ '  </div>'
+ '  <div class="ct5fb' + ' ct5fbinfo' + '" id="ct5Fb' + thisq + '">'
+    'Pick the equation type, then click chips to build your equation. Each chip cycles \u2002\u2003+ \u2192 \u2212 \u2192 unselected.'
+ '  </div>'
+ '  <div class="ct5eqlist' + '">'
+ '    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#7a8aaa;margin-bottom:4px;">Confirmed Equations</div>'
+ '    <div id="ct5EqList' + thisq + '"></div>'
+ '    <div class="ct5progress' + '" id="ct5Prog' + thisq + '"></div>'
+ '  </div>'
+ '  <div class="ct5solution' + '" id="ct5Solution' + thisq + '"></div>'
+ '  <div class="ct5complete' + '" id="ct5Comp' + thisq + '" role="status"></div>'
+ '  <span class="ct5sr' + '" id="ct5Live' + thisq + '" aria-live="polite" aria-atomic="true"></span>'
+ '</div>';
root.innerHTML = html;
document.getElementById('ct5EqType' + thisq).addEventListener('change', function(){
var v = this.value;
var loopSel = document.getElementById('ct5LoopSel' + thisq);
loopSel.disabled = (v !== 'kvl');
setEqType(v);
});
document.getElementById('ct5LoopSel' + thisq).addEventListener('change', function(){
setLoopIdx(parseInt(this.value, 10));
});
document.getElementById('ct5BtnCheck' + thisq).addEventListener('click', checkEquation);
document.getElementById('ct5BtnClear' + thisq).addEventListener('click', function(){
clearAllChips(); refreshUI();
});
document.getElementById('ct5BtnLM' + thisq).addEventListener('click', function(){ toggleA11y('lm'); });
document.getElementById('ct5BtnNR' + thisq).addEventListener('click', function(){ toggleA11y('nr'); });
document.getElementById('ct5BtnHC' + thisq).addEventListener('click', function(){ toggleA11y('hc'); });
document.getElementById('ct5BtnFS' + thisq).addEventListener('click', function(){ toggleA11y('fs'); });
}
function buildErrorDOM(reason) {
var root = document.getElementById(rootElId);
root.innerHTML = ''
+ '<div class="ct5root' + '">'
+ '  <h3 class="ct5title' + '">Example 3 — Stage 5: Kirchhoff Equations</h3>'
+ '  <div class="ct5error' + '">'
+ '    <strong>Cannot start Stage 5.</strong><br>' + reason
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
setEqType('kcl');
announce('Stage 5 ready. Build ' + expectedEqCount() + ' independent equations using the term chips.');
}
function reload() {
S.confirmedEqs = []; S.solution = null; S.chips = []; S.circuit = null;
S.branches = null; S.loops = null; S.junctions = null;
init();
}
document.addEventListener('ctStageComplete', function(e){
if (e.detail && e.detail.thisq === thisq) {
if (e.detail.stage === 1 && e.detail.simplifiedCircuit) {
window['ctStage1Simplified_' + thisq] = e.detail.simplifiedCircuit;
}
if (e.detail.stage === 4) {
setTimeout(reload, 0);
}
}
});
if (document.getElementById(rootElId)) init();
else document.addEventListener('DOMContentLoaded', init);
})();
