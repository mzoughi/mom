/* =====================================================================
   NEWTON'S SECOND LAW TUTORIAL — STAGE 2: N2L IN VECTOR FORM
   Students choose the direction of a, build the vector sum of the
   forces from tiles (with misconception distractors) and pick the RHS.
   ===================================================================== */
(function(){
'use strict';
var NT = window.NTCore; if (!NT) return;
var thisq = window.ntThisq, N = 2;
var id = NT.ids(thisq, N);
var stKey = 'ntSt2_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, inputs:{}, msg:{} };
var S = window[stKey];
var sh = NT.shared(thisq);

var A_VEC = '<span class="ntsym ntvec" aria-hidden="true"><span class="ntb">a</span></span>';
var RHS_OPTS = [ ['ma','m a\u20D7'], ['zero','0\u20D7 (zero vector)'], ['mas','m a (no arrow)'], ['mg','m g\u20D7'] ];
var RHS_HTML = { ma:'<i>m</i>' + A_VEC, zero:'<span class="ntsym ntvec"><span class="ntb">0</span></span>', mas:'<i>m a</i>', mg:'<i>m</i><span class="ntsym ntvec"><span class="ntb">g</span></span>' };

function inp(i){ if (!S.inputs[i]) S.inputs[i] = { sel:[], rhs:'', acc:'' }; return S.inputs[i]; }

/* tiles for situation i (fixed, mixed order) */
function tiles(i){
  var Sit = NT.SITS[i], list = [];
  Sit.forces.forEach(function(f){ list.push('v:' + f.slot); });
  Sit.distract.forEach(function(d){ list.push(d); });
  var out = [], seed = 7 + i*3;                 /* deterministic shuffle */
  while (list.length){ seed = (seed * 31 + 11) % 97; out.push(list.splice(seed % list.length, 1)[0]); }
  return out;
}
function tileInfo(i, t){
  var p = t.split(':'), kind = p[0], slot = p[1];
  if (kind === 'v')   { var k = NT.slotKey(thisq, i, slot); return { h:NT.symH(k, true), s:NT.symSpeak(k, true), neg:false }; }
  if (kind === 'neg') { k = NT.slotKey(thisq, i, slot); return { h:'\u2212' + NT.symH(k, true), s:'minus ' + NT.symSpeak(k, true), neg:true }; }
  if (kind === 'mag') { k = NT.slotKey(thisq, i, slot); return { h:NT.symH(k, false), s:NT.symSpeak(k, false) + ', magnitude only, no arrow', neg:false }; }
  if (kind === 'ma')  return { h:'<i>m</i>' + A_VEC, s:'m times vector a', neg:false };
  if (kind === 'net') return { h:NT.symH('net', true), s:'vector F sub net', neg:false };
  if (kind === 'cent')return { h:NT.symH('cent', true), s:'vector F sub c, centripetal', neg:false };
  return { h:t, s:t, neg:false };
}

/* ---------- rendering ---------- */
function render(){
  var i = S.cur, Sit = NT.SITS[i], I = inp(i), done = sh.sits[i].done[1];
  NT.renderTabsScene(thisq, N, i);
  var accOpts = '<option value="">\u2014 choose \u2014</option>';
  Sit.accel.opts.forEach(function(o){ accOpts += '<option value="' + o.id + '"' + (I.acc === o.id ? ' selected' : '') + '>' + o.t + '</option>'; });
  var rhsOpts = '<option value="">\u2014 choose \u2014</option>';
  RHS_OPTS.forEach(function(o){ rhsOpts += '<option value="' + o[0] + '"' + (I.rhs === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
  var tl = '';
  tiles(i).forEach(function(t){
    var info = tileInfo(i, t), on = I.sel.indexOf(t) >= 0;
    tl += '<button type="button" class="nttile" data-t="' + t + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + NT.esc(info.s) + '"' + (done ? ' disabled' : '') + '>' + info.h + '</button>';
  });
  var remind = Sit.forces.map(function(f){ var k = NT.slotKey(thisq, i, f.slot); return NT.symH(k, false) + ' (' + NT.FORCES[k].name.toLowerCase() + ')'; }).join(', ');
  var W = document.getElementById(id('Work'));
  W.innerHTML = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Write Newton\u2019s second law as a vector equation</h4>'
    + '<p class="ntinstr">The vector sum of <b>all</b> forces on the object equals <i>m</i>' + A_VEC + '. Decide where ' + A_VEC + ' points, build the sum, then choose the right side.</p>'
    + '<p class="ntremind">Forces from Stage 1: ' + remind + '.</p>'
    + '<div class="ntfield"><label for="' + id('Acc') + '">1. Direction of ' + A_VEC + '<span class="ntsr">vector a</span>:</label>'
    + '<select id="' + id('Acc') + '"' + (done ? ' disabled' : '') + '>' + accOpts + '</select></div>'
    + '<div><div class="ntfield" style="margin-bottom:6px"><b>2. Terms for the left side</b> <span class="ntinstr">(select to add, select again to remove)</span></div>'
    + '<div class="nttiles" role="group" aria-label="Terms for the left side">' + tl + '</div></div>'
    + '<div><div class="ntfield" style="margin-bottom:6px"><b>3. Your equation</b></div>'
    + '<div class="nteq" id="' + id('Eq') + '"></div></div>'
    + '<div class="ntbtnrow">'
    + '<button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check my equation</button>'
    + '<button type="button" class="ntbtn" id="' + id('Reset') + '"' + (done ? ' disabled' : '') + '>Clear</button>'
    + '</div>'
    + '<div class="ntfb" id="' + id('Fb') + '"></div>';
  drawEq();
  bind();
  if (done) showSuccess(false);
  else if (S.msg[i]) setFb(S.msg[i].html, S.msg[i].tone);
  else setFb('Build the equation, then select <b>Check my equation</b>.', '');
  if (NT.allDone(thisq, N)) completeBanner();
}
function drawEq(){
  var i = S.cur, I = inp(i), done = sh.sits[i].done[1], eq = document.getElementById(id('Eq'));
  var lhs = '', speak = '';
  I.sel.forEach(function(t, k){
    var info = tileInfo(i, t);
    if (k > 0 && !info.neg) lhs += '<span class="ntop">+</span>';
    lhs += info.h; speak += (k > 0 && !info.neg ? ' plus ' : ' ') + info.s;
  });
  if (!lhs) lhs = '<span class="nteqempty">add terms above</span>';
  var rOpts = '<option value="">?</option>';
  RHS_OPTS.forEach(function(o){ rOpts += '<option value="' + o[0] + '"' + (I.rhs === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
  eq.innerHTML = lhs + '<span class="ntop">=</span>'
    + '<label class="ntsr" for="' + id('Rhs') + '">Right side of the equation</label>'
    + '<select id="' + id('Rhs') + '"' + (done ? ' disabled' : '') + '>' + rOpts + '</select>'
    + '<span class="ntsr">Equation so far: ' + (speak || 'empty') + ' equals ' + (I.rhs ? RHS_OPTS.filter(function(o){ return o[0]===I.rhs; })[0][1] : 'not chosen') + '</span>';
  document.getElementById(id('Rhs')).addEventListener('change', function(){ inp(S.cur).rhs = this.value; drawEq(); });
}
function bind(){
  var W = document.getElementById(id('Work'));
  var tb = W.querySelectorAll('.nttile');
  for (var k=0;k<tb.length;k++) tb[k].addEventListener('click', function(){
    var I = inp(S.cur), t = this.getAttribute('data-t'), at = I.sel.indexOf(t);
    if (at >= 0) I.sel.splice(at, 1); else I.sel.push(t);
    this.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
    drawEq();
    NT.announce(thisq, N, tileInfo(S.cur, t).s + (at >= 0 ? ' removed from' : ' added to') + ' the left side.');
  });
  document.getElementById(id('Acc')).addEventListener('change', function(){ inp(S.cur).acc = this.value; });
  document.getElementById(id('Check')).addEventListener('click', check);
  document.getElementById(id('Reset')).addEventListener('click', function(){
    S.inputs[S.cur] = { sel:[], rhs:'', acc:'' }; S.msg[S.cur] = null; render(); NT.announce(thisq, N, 'Equation cleared.');
  });
}
function setFb(html, tone){
  var fb = document.getElementById(id('Fb'));
  fb.className = 'ntfb' + (tone ? ' ntfb' + tone : '');
  fb.innerHTML = NT.vecify(html);
}

/* ---------- checking ---------- */
function check(){
  var i = S.cur, Sit = NT.SITS[i], I = inp(i), issues = [];
  sh.sits[i].tries[1]++;
  if (!I.acc) issues.push('<b>Direction of a\u20D7:</b> choose where the acceleration points.');
  else if (I.acc !== Sit.accel.correct) issues.push('<b>Direction of a\u20D7:</b> ' + Sit.accel.fb[I.acc]);
  var covered = {};
  I.sel.forEach(function(t){
    var p = t.split(':'), kind = p[0], slot = p[1];
    if (kind === 'v') { covered[slot] = 1; return; }
    var k = slot ? NT.slotKey(thisq, i, slot) : null, nm = k ? NT.symH(k, true) : '';
    if (kind === 'neg') { covered[slot] = 1; issues.push('<b>No minus signs in the vector sum.</b> ' + nm + ' already points in its own direction; a minus sign would reverse it. In vector form every force is <i>added</i>.'); }
    else if (kind === 'mag') { covered[slot] = 1; issues.push('<b>' + NT.symH(k, false) + ' has no arrow:</b> that is a magnitude, a positive number. Every term in the vector equation must be a vector.'); }
    else if (kind === 'ma') issues.push('<b><i>m</i>a\u20D7 is not a force.</b> It is what the sum of the forces equals, so it belongs on the right side only.');
    else if (kind === 'net') issues.push('<b>F\u20D7<sub>net</sub>:</b> ' + NT.FORCES.net.why);
    else if (kind === 'cent') issues.push('<b>F\u20D7<sub>c</sub>:</b> ' + NT.FORCES.cent.why);
  });
  Sit.forces.forEach(function(f){
    if (!covered[f.slot]) issues.push('<b>Missing term:</b> ' + NT.symH(NT.slotKey(thisq, i, f.slot), true) + ' acts on the object, so it belongs in the sum.');
  });
  var want = Sit.accel.rhs;
  if (!I.rhs) issues.push('<b>Right side:</b> choose what the sum of the forces equals.');
  else if (I.rhs !== want){
    var m = { mas:'The left side is a vector, so the right side must be a vector too.',
              mg:'<i>m</i>g\u20D7 is the weight, already in the sum as F\u20D7<sub>g</sub>. The right side is mass times acceleration.',
              zero:'Use 0\u20D7 only when a\u20D7 = 0\u20D7. This object is accelerating.',
              ma:'<i>m</i>a\u20D7 is always true, but here a\u20D7 = 0\u20D7, so simplify the right side to 0\u20D7.' };
    issues.push('<b>Right side:</b> ' + m[I.rhs]);
  }
  if (!issues.length){
    sh.sits[i].done[1] = true; S.msg[i] = null; NT.report(thisq);
    render(); showSuccess(true); return;
  }
  var html = '<span class="ntfbhead">Not yet \u2014 ' + issues.length + (issues.length === 1 ? ' thing' : ' things') + ' to fix:</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  S.msg[i] = { html:html, tone:'bad' };
  setFb(html, 'bad');
  NT.announce(thisq, N, 'Not yet. ' + issues[0]);
}
function finalEq(i){
  var Sit = NT.SITS[i];
  return Sit.forces.map(function(f){ return NT.symH(NT.slotKey(thisq, i, f.slot), true); }).join('<span class="ntop">+</span>')
    + '<span class="ntop">=</span>' + RHS_HTML[Sit.accel.rhs];
}
function showSuccess(say){
  var i = S.cur, Sit = NT.SITS[i];
  setFb('<span class="ntfbhead">Correct.</span><div class="nteq" style="margin:6px 0">' + finalEq(i) + '</div>' + Sit.wrap2 + NT.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next'));
  if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say){
    NT.announce(thisq, N, 'Correct. ' + Sit.wrap2);
    if (NT.allDone(thisq, N)) { completeBanner(); var b = document.getElementById(id('Cont')); if (b) b.focus(); }
  }
}
function completeBanner(){
  NT.showStageComplete(thisq, N, 'You wrote Newton\u2019s second law in vector form for all five situations. Next, draw each free-body diagram; the simulation will check the directions.');
}
function goTo(i){
  S.cur = i; render(); NT.focusHeading(thisq, N);
  NT.announce(thisq, N, 'Situation ' + (i+1) + ': ' + NT.SITS[i].title + '.');
}

NT.mount(thisq, N, 'nt2Root' + thisq, {
  label:'Newton\u2019s second law tutorial, stage 2: vector form of Newton\u2019s second law',
  subtitle:'For each situation, write the sum of the force vectors equal to m times the acceleration vector.',
  render:render,
  onTab:goTo,
  onShow:function(){ NT.announce(thisq, N, 'Stage 2 ready. Situation ' + (S.cur+1) + ': ' + NT.SITS[S.cur].title + '.'); }
});
})();
