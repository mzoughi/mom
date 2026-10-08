/* =====================================================================
   TWO-BODY TUTORIAL — STAGE 2: N2L IN VECTOR FORM, PER BLOCK
   For each block: direction of its acceleration, the vector sum of the
   forces ON it, and the right side. Then the links between the blocks.
   ===================================================================== */
(function(){
'use strict';
var TB = window.TBCore; if (!TB) return;
var thisq = window.tbThisq, N = 2;
var id = TB.ids(thisq, N);
var stKey = 'tbSt2_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, inp:{}, msg:{} };
var S = window[stKey];
var sh = TB.shared(thisq);

function aVec(b){ return '<span class="ntsym ntvec" aria-hidden="true"><span class="ntb">a</span><sub>' + b + '</sub></span>'; }
var RHS = [ ['m1a1','m\u2081a\u20D7\u2081', '<i>m</i><sub>1</sub>' + aVec(1)], ['m2a2','m\u2082a\u20D7\u2082', '<i>m</i><sub>2</sub>' + aVec(2)],
            ['sys','(m\u2081 + m\u2082)a\u20D7', '(<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)<span class="ntsym ntvec"><span class="ntb">a</span></span>'], ['zero','0\u20D7', '<span class="ntsym ntvec"><span class="ntb">0</span></span>'] ];
function rhsHTML(k){ for (var j=0;j<RHS.length;j++) if (RHS[j][0]===k) return RHS[j][2]; return '?'; }
function rhsText(k){ for (var j=0;j<RHS.length;j++) if (RHS[j][0]===k) return RHS[j][1]; return 'not chosen'; }

function inp(i){
  if (!S.inp[i]) S.inp[i] = { 1:{ sel:[], acc:'', rhs:'' }, 2:{ sel:[], acc:'', rhs:'' }, links:{} };
  return S.inp[i];
}
function tiles(i, b){
  var list = TB.bodyForces(i, b).map(function(f){ return 'v:' + f.slot; }).concat(TB.SITS[i].distract[b]);
  var out = [], seed = 5 + i*7 + b*3;
  while (list.length){ seed = (seed * 31 + 11) % 97; out.push(list.splice(seed % list.length, 1)[0]); }
  return out;
}
function tileInfo(b, t){
  var p = t.split(':'), kind = p[0], k = p[1];
  if (kind === 'v')     return { h:TB.symH(k, true), s:TB.symSpeak(k, true), neg:false };
  if (kind === 'neg')   return { h:'\u2212' + TB.symH(k, true), s:'minus ' + TB.symSpeak(k, true), neg:true };
  if (kind === 'mag')   return { h:TB.symH(k, false), s:TB.symSpeak(k, false) + ', magnitude only, no arrow', neg:false };
  if (kind === 'other') return { h:TB.symH(k, true), s:TB.symSpeak(k, true), neg:false };
  if (kind === 'ma')    return { h:'<i>m</i><sub>' + b + '</sub>' + aVec(b), s:'m ' + b + ' times vector a ' + b, neg:false };
  if (kind === 'net')   return { h:TB.symH('net', true), s:'vector F sub net', neg:false };
  return { h:t, s:t, neg:false };
}

/* ---------- rendering ---------- */
function bodyCard(i, b, done){
  var Sit = TB.SITS[i], I = inp(i)[b], A = Sit.accel[b];
  var ao = '<option value="">\u2014 choose \u2014</option>';
  A.opts.forEach(function(o){ ao += '<option value="' + o.id + '"' + (I.acc === o.id ? ' selected' : '') + '>' + o.t + '</option>'; });
  var tl = '';
  tiles(i, b).forEach(function(t){
    var info = tileInfo(b, t), on = I.sel.indexOf(t) >= 0;
    tl += '<button type="button" class="nttile" data-b="' + b + '" data-t="' + t + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + TB.esc(info.s) + '"' + (done ? ' disabled' : '') + '>' + info.h + '</button>';
  });
  return '<div class="tbbody" role="group" aria-labelledby="' + id('BH' + b) + '">'
    + '<div class="tbbodyh" id="' + id('BH' + b) + '"><span class="tbbodytag">' + b + '</span> Block ' + b + '</div>'
    + '<div class="ntfield"><label for="' + id('Acc' + b) + '">Direction of ' + aVec(b) + '<span class="ntsr">vector a ' + b + '</span>:</label>'
    + '<select id="' + id('Acc' + b) + '" data-acc="' + b + '"' + (done ? ' disabled' : '') + '>' + ao + '</select></div>'
    + '<div class="nttiles" role="group" aria-label="Terms for block ' + b + '\u2019s left side">' + tl + '</div>'
    + '<div class="nteq" id="' + id('Eq' + b) + '"></div></div>';
}
function render(){
  var i = S.cur, Sit = TB.SITS[i], done = sh.sits[i].done[1], L = inp(i).links;
  TB.renderTabsScene(thisq, N, i);
  var links = '';
  Sit.links.forEach(function(q, qi){
    var o = '<option value="">\u2014 choose \u2014</option>';
    q.opts.forEach(function(x){ o += '<option value="' + x.id + '"' + (L[qi] === x.id ? ' selected' : '') + '>' + x.t + '</option>'; });
    links += '<div class="tblink"><label for="' + id('Ln' + qi) + '">' + q.q + '</label><select id="' + id('Ln' + qi) + '" data-link="' + qi + '"' + (done ? ' disabled' : '') + '>' + o + '</select></div>';
  });
  var W = document.getElementById(id('Work'));
  W.innerHTML = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Write Newton\u2019s second law for each block</h4>'
    + '<p class="ntinstr">One vector equation per block. Each one sums only the forces acting <b>on that block</b> and sets the sum equal to that block\u2019s mass times its own acceleration. Select tiles to add or remove them.</p>'
    + bodyCard(i, 1, done) + bodyCard(i, 2, done)
    + '<fieldset class="tblinks"><legend>Connect the blocks</legend>' + links + '</fieldset>'
    + '<div class="ntbtnrow"><button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check my equations</button>'
    + '<button type="button" class="ntbtn" id="' + id('Reset') + '"' + (done ? ' disabled' : '') + '>Clear</button></div>'
    + '<div class="ntfb" id="' + id('Fb') + '"></div>';
  drawEq(1); drawEq(2);
  if (!W.getAttribute('data-bound')) { W.setAttribute('data-bound', '1'); delegate(W); }
  document.getElementById(id('Check')).addEventListener('click', check);
  document.getElementById(id('Reset')).addEventListener('click', function(){
    S.inp[S.cur] = null; S.msg[S.cur] = null; render(); TB.announce(thisq, N, 'Cleared.');
  });
  if (done) showSuccess(false);
  else if (S.msg[i]) setFb(S.msg[i].html, S.msg[i].tone);
  else setFb('Build both equations, answer the two connection questions, then select <b>Check my equations</b>.', '');
  if (TB.allDone(thisq, N)) completeBanner();
}
function drawEq(b){
  var i = S.cur, I = inp(i)[b], done = sh.sits[i].done[1], eq = document.getElementById(id('Eq' + b));
  var lhs = '', speak = '';
  I.sel.forEach(function(t, k){
    var info = tileInfo(b, t);
    if (k > 0 && !info.neg) lhs += '<span class="ntop">+</span>';
    lhs += info.h; speak += (k > 0 && !info.neg ? ' plus ' : ' ') + info.s;
  });
  if (!lhs) lhs = '<span class="nteqempty">add terms above</span>';
  var o = '<option value="">?</option>';
  RHS.forEach(function(r){ o += '<option value="' + r[0] + '"' + (I.rhs === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; });
  eq.innerHTML = lhs + '<span class="ntop">=</span><label class="ntsr" for="' + id('Rhs' + b) + '">Right side for block ' + b + '</label>'
    + '<select id="' + id('Rhs' + b) + '" data-rhs="' + b + '"' + (done ? ' disabled' : '') + '>' + o + '</select>'
    + '<span class="ntsr">Block ' + b + ' equation so far: ' + (speak || 'empty') + ' equals ' + rhsText(I.rhs) + '</span>';
}
function delegate(W){
  W.addEventListener('click', function(e){
    var t = e.target.closest ? e.target.closest('.nttile') : null; if (!t || t.disabled) return;
    var b = parseInt(t.getAttribute('data-b'), 10), key = t.getAttribute('data-t'), I = inp(S.cur)[b], at = I.sel.indexOf(key);
    if (at >= 0) I.sel.splice(at, 1); else I.sel.push(key);
    t.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
    drawEq(b);
    TB.announce(thisq, N, tileInfo(b, key).s + (at >= 0 ? ' removed from' : ' added to') + ' block ' + b + '\u2019s equation.');
  });
  W.addEventListener('change', function(e){
    var t = e.target, I = inp(S.cur);
    if (t.getAttribute('data-acc')) I[t.getAttribute('data-acc')].acc = t.value;
    else if (t.getAttribute('data-rhs')) { var b = t.getAttribute('data-rhs'); I[b].rhs = t.value; drawEq(parseInt(b, 10)); }
    else if (t.getAttribute('data-link')) I.links[t.getAttribute('data-link')] = t.value;
  });
}
function setFb(html, tone){ TB.setFb(document.getElementById(id('Fb')), html, tone); }

/* ---------- checking ---------- */
function checkBody(i, b, issues){
  var Sit = TB.SITS[i], I = inp(i)[b], A = Sit.accel[b], tag = '<b>Block ' + b + ':</b> ', other = b === 1 ? 2 : 1, covered = {};
  if (!I.acc) issues.push(tag + 'choose the direction of its acceleration.');
  else if (I.acc !== A.correct) issues.push(tag + A.fb[I.acc]);
  I.sel.forEach(function(t){
    var p = t.split(':'), kind = p[0], k = p[1];
    if (kind === 'v') { covered[k] = 1; return; }
    if (kind === 'neg') { covered[k] = 1; issues.push(tag + 'no minus signs in a vector sum. ' + TB.symH(k, true) + ' already points in its own direction; every force vector is <i>added</i>.'); }
    else if (kind === 'mag') { covered[k] = 1; issues.push(tag + TB.symH(k, false) + ' has no arrow: it is a magnitude. Every term in a vector equation must be a vector.'); }
    else if (kind === 'other') issues.push(tag + TB.symH(k, true) + ' acts on block ' + other + ', not on block ' + b + '. This equation includes only forces exerted <b>on</b> block ' + b + '.'
        + (TB.LBL[k].type === 'grav' ? ' Block ' + other + '\u2019s weight affects block ' + b + ' only through the forces that touch block ' + b + ' (a string, or a contact surface).' : ''));
    else if (kind === 'ma') issues.push(tag + '<i>m</i>a\u20D7 is not a force. It is what the sum of the forces equals, so it belongs on the right side only.');
    else if (kind === 'net') issues.push(tag + TB.TYPES.net.why);
  });
  var miss = TB.bodyForces(i, b).filter(function(f){ return !covered[f.slot]; });
  if (miss.length) issues.push(tag + '<b>missing ' + (miss.length === 1 ? 'term' : 'terms') + ':</b> ' + miss.map(function(f){ return TB.symH(f.slot, true); }).join(', ') + (miss.length === 1 ? ' acts' : ' act') + ' on block ' + b + ', so ' + (miss.length === 1 ? 'it belongs' : 'they belong') + ' in its sum.');
  var want = 'm' + b + 'a' + b;
  if (!I.rhs) issues.push(tag + 'choose the right side.');
  else if (I.rhs !== want) {
    var m = I.rhs === 'sys' ? '(<i>m</i><sub>1</sub> + <i>m</i><sub>2</sub>)a\u20D7 belongs to the two blocks treated as one system; then the forces between them would cancel and not appear. Here you are writing the law for block ' + b + ' alone: use its own mass and acceleration.'
          : I.rhs === 'zero' ? 'Block ' + b + ' is speeding up, so the right side is not zero.'
          : 'Use block ' + b + '\u2019s own mass and acceleration: <i>m</i><sub>' + b + '</sub>a\u20D7<sub>' + b + '</sub>.';
    issues.push(tag + m);
  }
}
function check(){
  var i = S.cur, Sit = TB.SITS[i], L = inp(i).links, issues = [];
  sh.sits[i].tries[1]++;
  checkBody(i, 1, issues); checkBody(i, 2, issues);
  Sit.links.forEach(function(q, qi){
    if (!L[qi]) issues.push('<b>Connections:</b> answer \u201C' + q.q + '\u201D');
    else if (L[qi] !== q.correct) issues.push('<b>Connections:</b> ' + q.fb[L[qi]]);
  });
  if (!issues.length) {
    sh.sits[i].done[1] = true; S.msg[i] = null; TB.report(thisq);
    render(); showSuccess(true); return;
  }
  var html = '<span class="ntfbhead">Not yet \u2014 ' + issues.length + (issues.length === 1 ? ' thing' : ' things') + ' to fix:</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  S.msg[i] = { html:html, tone:'bad' };
  setFb(html, 'bad');
  TB.announce(thisq, N, 'Not yet. ' + issues[0]);
}
function finalEq(i, b){
  return TB.bodyForces(i, b).map(function(f){ return TB.symH(f.slot, true); }).join('<span class="ntop">+</span>') + '<span class="ntop">=</span>' + rhsHTML('m' + b + 'a' + b);
}
function showSuccess(say){
  var i = S.cur, Sit = TB.SITS[i];
  setFb('<span class="ntfbhead">Correct.</span><div class="nteq" style="margin:6px 0">' + finalEq(i, 1) + '</div><div class="nteq" style="margin:6px 0">' + finalEq(i, 2) + '</div>'
    + Sit.wrap2 + TB.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next')); if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say) {
    TB.announce(thisq, N, 'Correct. ' + Sit.wrap2);
    if (TB.allDone(thisq, N)) { completeBanner(); var c = document.getElementById(id('Cont')); if (c) c.focus(); }
  }
}
function completeBanner(){
  TB.showStageComplete(thisq, N, 'You wrote and linked the two vector equations for all five systems. Next, draw a free-body diagram for each block.');
}
function goTo(i){ S.cur = i; render(); TB.focusHeading(thisq, N); TB.announce(thisq, N, 'Situation ' + (i+1) + ': ' + TB.SITS[i].title + '.'); }

TB.mount(thisq, N, 'tb2Root' + thisq, {
  label:'Two-body tutorial, stage 2: Newton\u2019s second law in vector form',
  subtitle:'Write one vector equation per block, then state how the two blocks are linked.',
  render:render, onTab:goTo,
  onShow:function(){ TB.announce(thisq, N, 'Stage 2 ready. Situation ' + (S.cur+1) + ': ' + TB.SITS[S.cur].title + '.'); }
});
})();
