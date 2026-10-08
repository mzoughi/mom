/* =====================================================================
   TWO-BODY TUTORIAL — STAGE 1: IDENTIFY THE FORCES ON EACH BLOCK
   Students add rows (force type + agent) for block 1 and for block 2.
   ===================================================================== */
(function(){
'use strict';
var TB = window.TBCore; if (!TB) return;
var thisq = window.tbThisq, N = 1, MAXR = 7;
var id = TB.ids(thisq, N);
var stKey = 'tbSt1_' + thisq;
if (!window[stKey]) window[stKey] = { cur:0, rows:{}, bad:{}, msg:{} };
var S = window[stKey];
var sh = TB.shared(thisq);

var GRAV_OTHER = 'Gravity on a block is always exerted by Earth. The other block\u2019s weight acts on the other block; where two blocks touch, they push on each other with contact forces (normal force and friction).';
var PULLEY = 'The pulley only changes the direction of the string. The string is what pulls on the block.';

function rows(i, b){
  if (!S.rows[i]) S.rows[i] = { 1:[], 2:[] };
  return S.rows[i][b];
}

/* ---------- rendering ---------- */
function bodyCard(i, b, done){
  var R = rows(i, b), bad = (S.bad[i] && S.bad[i][b]) || {};
  var h = '<div class="tbbody" role="group" aria-labelledby="' + id('BH' + b) + '">'
    + '<div class="tbbodyh" id="' + id('BH' + b) + '"><span class="tbbodytag">' + b + '</span> Forces on block ' + b + '</div>'
    + '<div class="tbrows">';
  if (!R.length) h += '<p class="tbempty">No forces yet. Select \u201CAdd a force on block ' + b + '\u201D.</p>';
  R.forEach(function(r, k){
    var lab = 'force ' + (k+1) + ' on block ' + b;
    var to = '<option value="">\u2014 type of force \u2014</option>';
    TB.TYPE_ORDER.forEach(function(t){ to += '<option value="' + t + '"' + (r.type === t ? ' selected' : '') + '>' + TB.TYPES[t].name + '</option>'; });
    var ao = '<option value="">\u2014 exerted by \u2014</option>';
    TB.AGENTS.forEach(function(a){ ao += '<option value="' + a.id + '"' + (r.agent === a.id ? ' selected' : '') + '>' + a.t + '</option>'; });
    var dis = done ? ' disabled' : '';
    h += '<div class="tbrow' + (bad[k] ? ' tbrowbad' : '') + '">'
      + '<select data-b="' + b + '" data-k="' + k + '" data-f="type" aria-label="Type of ' + lab + '"' + dis + '>' + to + '</select>'
      + '<select data-b="' + b + '" data-k="' + k + '" data-f="agent" aria-label="Who exerts ' + lab + '"' + dis + '>' + ao + '</select>'
      + (bad[k] ? '<span class="ntmark ntmarkbad" aria-hidden="true">\u2717</span><span class="ntsr">needs another look</span>' : '')
      + (done ? '<span class="ntmark ntmarkok" aria-hidden="true">\u2713</span>' : '<button type="button" class="ntbtn" data-rm="' + b + ':' + k + '" aria-label="Remove ' + lab + '">\u2715</button>')
      + '</div>';
  });
  h += '</div>';
  if (!done) h += '<div class="ntbtnrow"><button type="button" class="ntbtn" data-add="' + b + '">Add a force on block ' + b + '</button></div>';
  return h + '</div>';
}
function render(){
  var i = S.cur, done = sh.sits[i].done[0];
  TB.renderTabsScene(thisq, N, i);
  var W = document.getElementById(id('Work'));
  W.innerHTML = '<h4 class="ntworkh" id="' + id('WorkH') + '" tabindex="-1">Which forces act on each block?</h4>'
    + '<p class="ntinstr">Treat each block separately. For every force <b>on</b> that block, choose its type and the object that exerts it. Ask: what touches this block, and what pulls on it without touching?</p>'
    + bodyCard(i, 1, done) + bodyCard(i, 2, done)
    + '<div class="ntbtnrow">'
    + '<button type="button" class="ntbtn ntbtnmain" id="' + id('Check') + '"' + (done ? ' disabled' : '') + '>Check my forces</button>'
    + '<button type="button" class="ntbtn" id="' + id('Hint') + '"' + (done ? ' disabled' : '') + '>Hint</button>'
    + '<button type="button" class="ntbtn" id="' + id('Reset') + '"' + (done ? ' disabled' : '') + '>Clear</button></div>'
    + '<div class="ntfb" id="' + id('Fb') + '"></div>';
  bind();
  if (done) showSuccess(false);
  else if (S.msg[i]) setFb(S.msg[i].html, S.msg[i].tone);
  else setFb('List the forces on both blocks, then select <b>Check my forces</b>.', '');
  if (TB.allDone(thisq, N)) completeBanner();
}
function setFb(html, tone){ TB.setFb(document.getElementById(id('Fb')), html, tone); }
function bind(){
  var W = document.getElementById(id('Work'));
  if (!W.getAttribute('data-bound')) { W.setAttribute('data-bound', '1'); delegate(W); }
  document.getElementById(id('Check')).addEventListener('click', check);
  document.getElementById(id('Hint')).addEventListener('click', hint);
  document.getElementById(id('Reset')).addEventListener('click', function(){
    S.rows[S.cur] = { 1:[], 2:[] }; S.bad[S.cur] = null; S.msg[S.cur] = null; render(); TB.announce(thisq, N, 'All rows cleared.');
  });
}
function delegate(W){
  W.addEventListener('change', function(e){
    var t = e.target; if (!t.getAttribute('data-f')) return;
    var r = rows(S.cur, parseInt(t.getAttribute('data-b'), 10))[parseInt(t.getAttribute('data-k'), 10)];
    r[t.getAttribute('data-f')] = t.value;
  });
  W.addEventListener('click', function(e){
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    var add = t.getAttribute('data-add'), rm = t.getAttribute('data-rm');
    if (add) {
      var b = parseInt(add, 10), R = rows(S.cur, b);
      if (R.length >= MAXR) { TB.announce(thisq, N, 'Block ' + b + ' already has ' + MAXR + ' rows.'); return; }
      R.push({ type:'', agent:'' }); render();
      var sels = W.querySelectorAll('select[data-b="' + b + '"][data-f="type"]'); if (sels.length) sels[sels.length-1].focus();
      TB.announce(thisq, N, 'New force row on block ' + b + '. Choose its type and who exerts it.');
    } else if (rm) {
      var p = rm.split(':'); rows(S.cur, parseInt(p[0], 10)).splice(parseInt(p[1], 10), 1);
      if (S.bad[S.cur]) S.bad[S.cur] = null;
      render(); TB.announce(thisq, N, 'Force removed from block ' + p[0] + '.');
    }
  });
}
function hint(){
    var i = S.cur, n1 = TB.bodyForces(i, 1).length, n2 = TB.bodyForces(i, 2).length;
    var m = 'Start with the long-range force on each block (Earth). Then trace the outline of each block and list everything touching it: a string, a surface, the other block, a person. Each contact can push, pull, or rub. Block 1 has <b>' + n1 + '</b> forces and block 2 has <b>' + n2 + '</b>.';
    setFb(m, 'info'); TB.announce(thisq, N, m);
}

/* ---------- checking ---------- */
function checkBody(i, b, issues, bad){
  var Sit = TB.SITS[i], R = rows(i, b), req = TB.bodyForces(i, b), used = {}, tag = '<b>Block ' + b + ':</b> ';
  R.forEach(function(r, k){
    if (!r.type || !r.agent) { issues.push(tag + 'row ' + (k+1) + ' needs both a type and an agent.'); bad[k] = 1; return; }
    var T = TB.TYPES[r.type], nm = T.name.toLowerCase();
    if (!T.real) { issues.push(tag + T.why); bad[k] = 1; return; }
    if (r.agent === 'b' + b) { issues.push(tag + 'a block cannot exert a force on itself. Which other object exerts this ' + nm + '?'); bad[k] = 1; return; }
    for (var j=0;j<req.length;j++){
      var f = req[j];
      if (!used[f.slot] && f.types.indexOf(r.type) >= 0 && f.agents.indexOf(r.agent) >= 0) { used[f.slot] = 1; return; }
    }
    var special = Sit.agentMsg[b + ':' + r.type + ':' + r.agent];
    if (special) { issues.push(tag + special); bad[k] = 1; return; }
    var sameType = req.filter(function(f){ return f.types.indexOf(r.type) >= 0; });
    var sameBoth = sameType.filter(function(f){ return f.agents.indexOf(r.agent) >= 0; });
    if (sameBoth.length) { issues.push(tag + 'you listed the ' + nm + ' by ' + TB.agentText(r.agent).toLowerCase() + ' twice. Each interaction gives one force on this block.'); bad[k] = 1; return; }
    if (sameType.length) {
      var m = r.type === 'grav' ? GRAV_OTHER : (r.type === 'ten' && r.agent === 'pulley') ? PULLEY
            : 'there is a ' + nm + ' on block ' + b + ', but check who exerts it. Which object is actually in contact and doing this?';
      issues.push(tag + m); bad[k] = 1; return;
    }
    issues.push(tag + (Sit.absent[b + ':' + r.type] || 'no ' + nm + ' acts on this block. Ask: which object would be exerting it?'));
    bad[k] = 1;
  });
  var miss = req.filter(function(f){ return !used[f.slot]; });
  if (miss.length >= 3) issues.push(tag + '<b>' + miss.length + ' forces are still missing.</b> Go around block ' + b + '\u2019s outline: what touches it (strings, surfaces, the other block, a person)? Then add Earth\u2019s pull. Hint gives the total count.');
  else miss.forEach(function(f){ issues.push(tag + '<b>a force is missing.</b> ' + f.miss); });
}
function check(){
  var i = S.cur, issues = [], bad = { 1:{}, 2:{} };
  sh.sits[i].tries[0]++;
  checkBody(i, 1, issues, bad[1]);
  checkBody(i, 2, issues, bad[2]);
  S.bad[i] = bad;
  if (!issues.length) {
    sh.sits[i].done[0] = true; S.msg[i] = null; TB.report(thisq);
    render(); showSuccess(true); return;
  }
  var html = '<span class="ntfbhead">Not yet \u2014 ' + issues.length + (issues.length === 1 ? ' thing' : ' things') + ' to fix:</span><ul><li>' + issues.join('</li><li>') + '</li></ul>';
  S.msg[i] = { html:html, tone:'bad' };
  render();
  TB.announce(thisq, N, 'Not yet. ' + issues[0]);
}
function showSuccess(say){
  var i = S.cur, Sit = TB.SITS[i];
  function list(b){
    return TB.bodyForces(i, b).map(function(f){ return TB.symH(f.slot, true) + ' (' + TB.LBL[f.slot].name + ')'; }).join(', ');
  }
  setFb('<span class="ntfbhead">Correct.</span> ' + Sit.wrap1
    + '<div class="ntwrapnote">From here on, the forces carry these labels.<br><b>Block 1:</b> ' + list(1) + '.<br><b>Block 2:</b> ' + list(2) + '.</div>'
    + TB.nextButtonHTML(thisq, N, i), 'good');
  var nb = document.getElementById(id('Next')); if (nb) nb.addEventListener('click', function(){ goTo(i + 1); });
  if (say) {
    TB.announce(thisq, N, 'Correct. ' + Sit.wrap1);
    if (TB.allDone(thisq, N)) { completeBanner(); var c = document.getElementById(id('Cont')); if (c) c.focus(); }
  }
}
function completeBanner(){
  TB.showStageComplete(thisq, N, 'You identified the forces on both blocks in all five situations. Next, write Newton\u2019s second law for each block as a vector equation, and link the two blocks.');
}
function goTo(i){
  S.cur = i; render(); TB.focusHeading(thisq, N);
  TB.announce(thisq, N, 'Situation ' + (i+1) + ': ' + TB.SITS[i].title + '.');
}

TB.mount(thisq, N, 'tbRoot' + thisq, {
  label:'Two-body tutorial, stage 1: identify the forces',
  subtitle:'Five two-block systems, from simplest to most complex. For each block, list every force acting on it and the object that exerts it.',
  render:render, onTab:goTo
});
setTimeout(function(){ TB.announce(thisq, N, 'Stage 1 ready. Situation ' + (S.cur+1) + ': ' + TB.SITS[S.cur].title + '. Add the forces on each block.'); }, 300);
})();
